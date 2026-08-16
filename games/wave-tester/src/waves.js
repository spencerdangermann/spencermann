import * as THREE from "three";

export const GRAVITY = 9.81;
export const MAX_WAVES = 8;

/**
 * Deterministic phase offsets so a given sea state always looks identical
 * between reloads. Values are arbitrary but well spread over [0, 2pi).
 */
const PHASE_TABLE = [0.0, 2.399, 4.712, 1.047, 3.665, 5.759, 0.628, 2.827];

/**
 * A directional sea built from a handful of summed Gerstner waves.
 *
 * The same displacement is evaluated in two places: on the GPU for the ocean
 * mesh, and on the CPU for anything that floats. Keeping one source of truth
 * here is what stops boats from sinking through crests.
 */
export class WaveField {
  constructor() {
    this.params = {
      windSpeed: 9,
      windDirection: 35,
      directionSpread: 42,
      layerCount: 6,
      heightScale: 1,
      wavelengthScale: 1,
      choppiness: 0.72,
      speedScale: 1,
      // Lets steepness exceed the classic Gerstner limit so crests can fold and crash.
      breakStrength: 0.65,
      // Solitary tsunami pulse — off unless a preset / trigger enables it.
      tsunami: false,
      tsunamiAmplitude: 32,
      tsunamiWidth: 80,
      tsunamiSpeed: 26,
      tsunamiOrigin: -620,
    };

    this.layers = [];
    this.tsunamiDir = new THREE.Vector2(1, 0);

    // Packed for the shader: xy = direction, z = amplitude, w = wave number.
    this.uniformA = Array.from({ length: MAX_WAVES }, () => new THREE.Vector4());
    // Packed for the shader: x = angular frequency, y = phase, z = steepness.
    this.uniformB = Array.from({ length: MAX_WAVES }, () => new THREE.Vector4());

    this.rebuild();
  }

  /**
   * Regenerates the wave layers from the wind parameters using a
   * Pierson-Moskowitz-flavoured distribution: one dominant swell plus
   * progressively shorter, smaller harmonics fanned around the wind heading.
   */
  rebuild() {
    const p = this.params;
    const count = Math.max(1, Math.min(MAX_WAVES, Math.round(p.layerCount)));

    // Fully developed sea: peak wavelength and significant height both scale
    // with the square of wind speed.
    const peakWavelength = THREE.MathUtils.clamp(0.62 * p.windSpeed ** 2, 3, 240) * p.wavelengthScale;
    const significantHeight = 0.0246 * p.windSpeed ** 2 * p.heightScale;

    const weights = [];
    let weightEnergy = 0;
    for (let i = 0; i < count; i++) {
      const w = 0.74 ** i;
      weights.push(w);
      weightEnergy += w * w;
    }

    // Hs = 4 * sqrt(variance), and a sum of sinusoids has variance sum(a^2)/2.
    const amplitudeScale = significantHeight / (2 * Math.SQRT2 * Math.sqrt(weightEnergy));

    const windAngle = THREE.MathUtils.degToRad(p.windDirection);
    const spread = THREE.MathUtils.degToRad(p.directionSpread);

    this.layers.length = 0;

    for (let i = 0; i < count; i++) {
      const wavelength = Math.max(0.6, peakWavelength * 0.58 ** i);
      const amplitude = Math.max(1e-4, amplitudeScale * weights[i]);
      const k = (2 * Math.PI) / wavelength;

      // Golden-angle sampling fans the layers across the spread without
      // clustering, which reads as a natural short-crested sea.
      const angle = windAngle + spread * Math.sin(i * 2.39996);

      // Deep-water dispersion relation.
      const omega = Math.sqrt(GRAVITY * k) * p.speedScale;

      // Choppiness above ~1 plus breakStrength lets shorter layers fold past
      // the classic Gerstner limit, which is what makes crests crash.
      const steepness =
        ((p.choppiness * (1 + p.breakStrength * 0.35)) / count) / (k * amplitude);

      this.layers.push({
        dirX: Math.cos(angle),
        dirZ: Math.sin(angle),
        amplitude,
        wavelength,
        k,
        omega,
        steepness,
        phase: PHASE_TABLE[i % PHASE_TABLE.length],
      });
    }

    for (let i = 0; i < MAX_WAVES; i++) {
      const layer = this.layers[i];
      if (layer) {
        this.uniformA[i].set(layer.dirX, layer.dirZ, layer.amplitude, layer.k);
        this.uniformB[i].set(layer.omega, layer.phase, layer.steepness, 0);
      } else {
        this.uniformA[i].set(0, 0, 0, 0);
        this.uniformB[i].set(0, 0, 0, 0);
      }
    }

    this.tsunamiDir.set(Math.cos(windAngle), Math.sin(windAngle));
  }

  /**
   * Restart the solitary pulse so it approaches `from` along the wind.
   * `distance` is how far upwind of that point the crest starts.
   */
  triggerTsunami(time = 0, distance = 200, fromX = 0, fromZ = 0) {
    this.params.tsunami = true;
    if (!(this.params.tsunamiAmplitude > 0)) this.params.tsunamiAmplitude = 38;
    if (!(this.params.tsunamiWidth > 0)) this.params.tsunamiWidth = 70;
    if (!(this.params.tsunamiSpeed > 0)) this.params.tsunamiSpeed = 28;

    const windAngle = THREE.MathUtils.degToRad(this.params.windDirection);
    this.tsunamiDir.set(Math.cos(windAngle), Math.sin(windAngle));

    // Peak at current time sits `distance` metres upwind of the focus point.
    const along =
      this.tsunamiDir.x * fromX + this.tsunamiDir.y * fromZ;
    this.params.tsunamiOrigin =
      along - distance - this.params.tsunamiSpeed * time;
  }

  get waveCount() {
    return this.layers.length;
  }

  /** Significant wave height in metres — the classic sea-state metric. */
  get significantHeight() {
    let energy = 0;
    for (const layer of this.layers) energy += layer.amplitude * layer.amplitude;
    const sea = 2 * Math.SQRT2 * Math.sqrt(energy);
    if (this.params.tsunami) {
      return Math.max(sea, this.params.tsunamiAmplitude * 0.85);
    }
    return sea;
  }

  get crestSpeed() {
    if (this.params.tsunami) return this.params.tsunamiSpeed;
    if (!this.layers.length) return 0;
    const layer = this.layers[0];
    return layer.omega / layer.k;
  }

  get dominantWavelength() {
    if (this.params.tsunami) return this.params.tsunamiWidth * 4.5;
    return this.layers.length ? this.layers[0].wavelength : 0;
  }

  /**
   * Solitary tsunami pulse: height ~ A sech^2((x - ct)/W).
   * Returns height, horizontal shove, and slope terms for normals/foam.
   */
  tsunamiAt(x, z, time, out = { height: 0, dx: 0, dz: 0, slope: 0, foam: 0 }) {
    if (!this.params.tsunami || this.params.tsunamiAmplitude <= 0) {
      out.height = 0;
      out.dx = 0;
      out.dz = 0;
      out.slope = 0;
      out.foam = 0;
      return out;
    }

    const dirX = this.tsunamiDir.x;
    const dirZ = this.tsunamiDir.y;
    const width = Math.max(8, this.params.tsunamiWidth);
    const amp = this.params.tsunamiAmplitude;
    const xi =
      (dirX * x + dirZ * z - this.params.tsunamiOrigin - this.params.tsunamiSpeed * time) /
      width;

    // sech(x) = 2 / (e^x + e^-x), stable for large |x|.
    const ax = Math.abs(xi);
    const sech =
      ax > 20 ? 0 : 2 / (Math.exp(xi) + Math.exp(-xi));
    const sech2 = sech * sech;
    const tanh = ax > 20 ? Math.sign(xi) : Math.sinh(xi) * sech;
    const height = amp * sech2;
    // Front face steepens: shove water forward on the rising flank.
    const slope = (-2 * amp * sech2 * tanh) / width;
    const shove = height * 0.22;

    out.height = height;
    out.dx = dirX * shove;
    out.dz = dirZ * shove;
    out.slope = slope;
    out.foam = THREE.MathUtils.smoothstep(height, amp * 0.35, amp * 0.85);
    return out;
  }

  /**
   * Gerstner displacement for a grid point. Note this is the offset applied to
   * a point that *starts* at (x, z) — the resulting surface point lands
   * somewhere else horizontally, which is what gives crests their sharp peaks.
   */
  displacement(x, z, time, target = new THREE.Vector3()) {
    let dx = 0;
    let dy = 0;
    let dz = 0;

    for (const layer of this.layers) {
      const phase = layer.k * (layer.dirX * x + layer.dirZ * z) - layer.omega * time + layer.phase;
      const c = Math.cos(phase);
      const qa = layer.steepness * layer.amplitude;
      dx += qa * layer.dirX * c;
      dz += qa * layer.dirZ * c;
      dy += layer.amplitude * Math.sin(phase);
    }

    const tsunami = this.tsunamiAt(x, z, time, _tsunamiScratch);
    dx += tsunami.dx;
    dz += tsunami.dz;
    dy += tsunami.height;

    return target.set(dx, dy, dz);
  }

  /** Analytic surface normal at a grid point. */
  normal(x, z, time, target = new THREE.Vector3()) {
    let bx = 1;
    let by = 0;
    let bz = 0;
    let tx = 0;
    let ty = 0;
    let tz = 1;

    for (const layer of this.layers) {
      const phase = layer.k * (layer.dirX * x + layer.dirZ * z) - layer.omega * time + layer.phase;
      const c = Math.cos(phase);
      const s = Math.sin(phase);
      const qak = layer.steepness * layer.amplitude * layer.k;
      const ak = layer.amplitude * layer.k;

      bx -= qak * layer.dirX * layer.dirX * s;
      by += ak * layer.dirX * c;
      bz -= qak * layer.dirX * layer.dirZ * s;

      tx -= qak * layer.dirX * layer.dirZ * s;
      ty += ak * layer.dirZ * c;
      tz -= qak * layer.dirZ * layer.dirZ * s;
    }

    const tsunami = this.tsunamiAt(x, z, time, _tsunamiScratch);
    if (tsunami.height > 0) {
      const dirX = this.tsunamiDir.x;
      const dirZ = this.tsunamiDir.y;
      by += tsunami.slope * dirX;
      ty += tsunami.slope * dirZ;
    }

    return target.set(ty * bz - tz * by, tz * bx - tx * bz, tx * by - ty * bx).normalize();
  }

  /**
   * Fold factor at a grid point — near 1 the crest is about to break.
   */
  foldAt(x, z, time) {
    let fold = 0;
    for (const layer of this.layers) {
      const phase =
        layer.k * (layer.dirX * x + layer.dirZ * z) - layer.omega * time + layer.phase;
      fold += layer.steepness * layer.amplitude * layer.k * Math.sin(phase);
    }
    const tsunami = this.tsunamiAt(x, z, time, _tsunamiScratch);
    fold += tsunami.foam * 0.85;
    return fold;
  }

  surfaceAt(worldX, worldZ, time, out = { height: 0, normal: new THREE.Vector3(), fold: 0 }) {
    let sx = worldX;
    let sz = worldZ;

    for (let i = 0; i < 5; i++) {
      const d = this.displacement(sx, sz, time, _scratch);
      sx = worldX - d.x;
      sz = worldZ - d.z;
    }

    const d = this.displacement(sx, sz, time, _scratch);
    let height = d.y;
    const fold = this.foldAt(sx, sz, time);
    const tsunami = this.tsunamiAt(sx, sz, time, _tsunamiScratch);

    // Match the GPU crash: overfolded crests tip forward and dump height.
    const breakStrength = this.params.breakStrength;
    this.normal(sx, sz, time, out.normal);
    if (breakStrength > 0 && fold > 0.45) {
      const crash = THREE.MathUtils.smoothstep(fold, 0.45, 1.05) * breakStrength;
      const windAngle = THREE.MathUtils.degToRad(this.params.windDirection);
      height -= crash * Math.max(0.4, this.significantHeight * 0.12);
      out.normal.x += Math.cos(windAngle) * crash * 0.55;
      out.normal.z += Math.sin(windAngle) * crash * 0.55;
      out.normal.normalize();
    }

    // Tsunami face adds a strong forward shove signal for vehicles.
    if (tsunami.height > 1) {
      out.normal.x -= this.tsunamiDir.x * tsunami.foam * 0.65;
      out.normal.z -= this.tsunamiDir.y * tsunami.foam * 0.65;
      out.normal.normalize();
    }

    out.height = height;
    out.fold = fold;
    return out;
  }
}

const _scratch = new THREE.Vector3();
const _tsunamiScratch = { height: 0, dx: 0, dz: 0, slope: 0, foam: 0 };

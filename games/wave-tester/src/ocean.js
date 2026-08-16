import * as THREE from "three";
import { MAX_WAVES } from "./waves.js";

/**
 * Builds a radial grid centred on the origin: dense near the middle, coarse
 * toward the rim. The mesh follows the camera, so detail always lands where
 * the viewer is looking while a single draw call still reaches the horizon.
 */
function createRadialGrid(radius, rings, spokes, falloff) {
  const positions = [0, 0, 0];
  const normals = [0, 1, 0];
  const uvs = [0, 0];
  const indices = [];

  for (let j = 1; j <= rings; j++) {
    const r = radius * Math.pow(j / rings, falloff);
    for (let i = 0; i < spokes; i++) {
      const angle = (i / spokes) * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      positions.push(x, 0, z);
      normals.push(0, 1, 0);
      uvs.push(x, z);
    }
  }

  // Fan filling the centre hole.
  for (let i = 0; i < spokes; i++) {
    indices.push(0, 1 + ((i + 1) % spokes), 1 + i);
  }

  // Quad strips between consecutive rings.
  for (let j = 1; j < rings; j++) {
    const inner = 1 + (j - 1) * spokes;
    const outer = 1 + j * spokes;
    for (let i = 0; i < spokes; i++) {
      const i2 = (i + 1) % spokes;
      const a = inner + i;
      const b = inner + i2;
      const c = outer + i2;
      const d = outer + i;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // The grid is displaced beyond its authored bounds and follows the camera,
  // so give it a bound generous enough that nothing culls it early.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 2);
  return geometry;
}

const VERTEX_HEAD = /* glsl */ `
#define MAX_WAVES ${MAX_WAVES}
uniform vec4 uWaveA[MAX_WAVES];
uniform vec4 uWaveB[MAX_WAVES];
uniform int uWaveCount;
uniform float uTime;
uniform vec2 uWakePosition;
uniform vec2 uWakeDirection;
uniform float uWakeStrength;
uniform float uWakeLength;
uniform float uBreakStrength;
uniform float uTsunamiAmp;
uniform float uTsunamiWidth;
uniform float uTsunamiSpeed;
uniform float uTsunamiOrigin;
uniform vec2 uTsunamiDir;
varying float vWaveHeight;
varying float vFoamFactor;
varying float vWakeFoam;
varying float vBreakFoam;
varying vec2 vWakeCoord;
varying vec3 vSurfacePos;
`;

const VERTEX_GERSTNER = /* glsl */ `
vec3 waveBase = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
vec2 wavePoint = waveBase.xz;

vec3 waveOffset = vec3( 0.0 );
vec3 waveTanX = vec3( 1.0, 0.0, 0.0 );
vec3 waveTanZ = vec3( 0.0, 0.0, 1.0 );
float waveFold = 0.0;
vec2 waveDirAccum = vec2( 0.0 );

for ( int i = 0; i < MAX_WAVES; i ++ ) {

  if ( i >= uWaveCount ) break;

  vec2 dir = uWaveA[ i ].xy;
  float amplitude = uWaveA[ i ].z;
  float k = uWaveA[ i ].w;
  float omega = uWaveB[ i ].x;
  float steepness = uWaveB[ i ].z;

  float theta = k * dot( dir, wavePoint ) - omega * uTime + uWaveB[ i ].y;
  float c = cos( theta );
  float s = sin( theta );

  float qa = steepness * amplitude;
  float qak = qa * k;
  float ak = amplitude * k;

  waveOffset.x += qa * dir.x * c;
  waveOffset.z += qa * dir.y * c;
  waveOffset.y += amplitude * s;

  waveTanX.x -= qak * dir.x * dir.x * s;
  waveTanX.y += ak * dir.x * c;
  waveTanX.z -= qak * dir.x * dir.y * s;

  waveTanZ.x -= qak * dir.x * dir.y * s;
  waveTanZ.y += ak * dir.y * c;
  waveTanZ.z -= qak * dir.y * dir.y * s;

  waveFold += qak * s;
  waveDirAccum += dir * amplitude;

}

// Solitary tsunami: A * sech^2( (dir·x - origin - c t) / W )
if ( uTsunamiAmp > 0.01 ) {
  float tXi = ( dot( uTsunamiDir, wavePoint ) - uTsunamiOrigin - uTsunamiSpeed * uTime ) / max( uTsunamiWidth, 1.0 );
  float tExp = exp( clamp( tXi, -20.0, 20.0 ) );
  float tSech = 2.0 / ( tExp + 1.0 / tExp );
  float tSech2 = tSech * tSech;
  float tTanh = ( tExp - 1.0 / tExp ) / ( tExp + 1.0 / tExp );
  float tHeight = uTsunamiAmp * tSech2;
  float tSlope = ( -2.0 * uTsunamiAmp * tSech2 * tTanh ) / max( uTsunamiWidth, 1.0 );
  float tShove = tHeight * 0.22;

  waveOffset.xz += uTsunamiDir * tShove;
  waveOffset.y += tHeight;
  waveTanX.y += tSlope * uTsunamiDir.x;
  waveTanZ.y += tSlope * uTsunamiDir.y;
  waveFold += smoothstep( uTsunamiAmp * 0.35, uTsunamiAmp * 0.85, tHeight ) * 0.9;
  waveDirAccum += uTsunamiDir * tHeight;
}

// Overfolded crests crash: tip forward along the wave travel direction and
// dump height into whitewater instead of staying as a smooth peak.
float crash = smoothstep( 0.48, 1.05, waveFold ) * uBreakStrength;
vec2 crashDir = length( waveDirAccum ) > 0.0001
  ? normalize( waveDirAccum )
  : vec2( 1.0, 0.0 );
waveOffset.xz += crashDir * crash * ( 0.9 + waveOffset.y * 0.12 );
waveOffset.y -= crash * ( 0.55 + abs( waveOffset.y ) * 0.18 );
vBreakFoam = crash;

// A Kelvin-style ship wake. "back" is distance behind the stern and "side"
// is distance from the centreline. The 0.36 ratio is close to the classic
// 19.47 degree Kelvin wake half-angle.
vec2 wakeRel = wavePoint - uWakePosition;
float wakeBack = -dot( wakeRel, uWakeDirection );
vec2 wakePerp = vec2( -uWakeDirection.y, uWakeDirection.x );
float wakeSide = dot( wakeRel, wakePerp );
float wakeWidth = 1.2 + max( wakeBack, 0.0 ) * 0.36;
float wakeWedge = 1.0 - smoothstep(
  wakeWidth - 1.3,
  wakeWidth + 1.3,
  abs( wakeSide )
);
float wakeTrail = smoothstep( 0.5, 4.0, wakeBack );
wakeTrail *= 1.0 - smoothstep( uWakeLength * 0.72, uWakeLength, wakeBack );
wakeTrail *= wakeWedge;

float wakeFade = exp( -max( wakeBack, 0.0 ) / max( uWakeLength * 0.55, 1.0 ) );
float transverseWake = sin( wakeBack * 0.82 - uTime * 2.25 );
float divergentWake = sin(
  wakeBack * 0.48 + abs( wakeSide ) * 1.42 - uTime * 1.7
);
float centreWash = exp( -abs( wakeSide ) * 0.42 ) *
  sin( wakeBack * 1.65 - uTime * 3.1 );
float wakeHeight = (
  transverseWake * 0.34 +
  divergentWake * 0.52 +
  centreWash * 0.14
) * wakeTrail * wakeFade * uWakeStrength;

waveOffset.y += wakeHeight;
vWakeCoord = vec2( wakeBack, wakeSide );
vWakeFoam = wakeTrail * wakeFade * uWakeStrength;

vec3 objectNormal = normalize( cross( waveTanZ, waveTanX ) );
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uDeepColor;
uniform vec3 uCrestColor;
uniform vec3 uFoamColor;
uniform float uCrestLevel;
uniform float uFoamStart;
uniform float uFoamEnd;
uniform float uRippleStrength;
uniform float uDetailScale;
uniform float uDetailStrength;
uniform float uFoamDetail;
uniform vec2 uWindDirection;
uniform float uWakeStrength;
uniform float uTime;
varying float vWaveHeight;
varying float vFoamFactor;
varying float vWakeFoam;
varying float vBreakFoam;
varying vec2 vWakeCoord;
varying vec3 vSurfacePos;

float oceanHash( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}

float oceanNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( oceanHash( i ), oceanHash( i + vec2( 1.0, 0.0 ) ), f.x ),
    mix( oceanHash( i + vec2( 0.0, 1.0 ) ), oceanHash( i + vec2( 1.0 ) ), f.x ),
    f.y
  );
}

float oceanFbm( vec2 p ) {
  float value = 0.0;
  value += oceanNoise( p ) * 0.55;
  p = mat2( 1.62, 1.17, -1.17, 1.62 ) * p;
  value += oceanNoise( p ) * 0.28;
  p = mat2( 1.74, -1.09, 1.09, 1.74 ) * p;
  value += oceanNoise( p ) * 0.17;
  return value;
}
`;

const FRAGMENT_COLOR = /* glsl */ `
float crest = smoothstep( -uCrestLevel, uCrestLevel, vWaveHeight );
vec2 detailUv = vSurfacePos.xz * uDetailScale;
vec2 crossWind = vec2( -uWindDirection.y, uWindDirection.x );

// Several moving noise bands break the perfectly smooth shader surface into
// patches, current lines and small capillary ripples.
float broadDetail = oceanFbm(
  detailUv * 0.38 + uWindDirection * uTime * 0.055
);
float fineDetail = oceanFbm(
  detailUv * 1.7 - crossWind * uTime * 0.11
);
float currentLines = sin(
  dot( detailUv, crossWind ) * 2.4 +
  broadDetail * 7.0 -
  uTime * 0.7
) * 0.5 + 0.5;

float baseFoam = smoothstep( uFoamStart, uFoamEnd, vFoamFactor );
float foamBreakup = smoothstep(
  0.28,
  0.72,
  broadDetail * 0.66 + fineDetail * 0.34
);
float foam = baseFoam * mix( 1.0, foamBreakup, uFoamDetail );

// Thin wind streaks survive just behind larger crests.
float streaks = smoothstep( 0.76, 0.94, currentLines * broadDetail );
streaks *= smoothstep( uFoamStart * 0.45, uFoamEnd, vFoamFactor );
foam = clamp( foam + streaks * uFoamDetail * 0.38, 0.0, 1.0 );

// Propeller wash stays bright near the centreline while the two diverging
// shoulders form broken feathered lines along the Kelvin wedge.
float wakeCentre = exp( -abs( vWakeCoord.y ) * 0.65 );
float wakeShoulder = 1.0 - smoothstep(
  0.0,
  1.4,
  abs( abs( vWakeCoord.y ) - max( vWakeCoord.x, 0.0 ) * 0.36 )
);
float wakeBreakup = oceanFbm(
  vec2( vWakeCoord.x * 0.18 - uTime * 0.45, vWakeCoord.y * 0.7 )
);
float wakeFoam = vWakeFoam * ( wakeCentre * 0.72 + wakeShoulder * 0.8 );
wakeFoam *= smoothstep( 0.18, 0.68, wakeBreakup );
foam = clamp( foam + wakeFoam, 0.0, 1.0 );

// Crashing crests dump bright broken whitewater that trails just behind the tip.
float crashFoam = vBreakFoam * smoothstep( 0.12, 0.55, foamBreakup );
crashFoam *= 0.55 + 0.45 * oceanFbm( detailUv * 2.8 - uWindDirection * uTime * 0.8 );
foam = clamp( foam + crashFoam, 0.0, 1.0 );

// Crests catch more light than troughs, faking the subsurface glow you get
// looking through the thin water at the top of a wave.
vec3 waterTint = mix( uDeepColor, uCrestColor, crest * crest );
float mottling = ( broadDetail - 0.5 ) * 0.16 * uDetailStrength;
waterTint *= 1.0 + mottling;
waterTint += uCrestColor * fineDetail * 0.025 * uDetailStrength;
// Breaking crests go milky and bright before fully becoming foam.
waterTint = mix( waterTint, uFoamColor * 0.85 + uCrestColor * 0.15, crashFoam * 0.55 );
diffuseColor.rgb *= waterTint;
diffuseColor.rgb = mix( diffuseColor.rgb, uFoamColor, foam );
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
vec2 roughUv = vSurfacePos.xz * uDetailScale;
float roughNoise = oceanFbm( roughUv * 1.4 + uTime * 0.025 );
float foamRough = max(
  smoothstep( uFoamStart, uFoamEnd, vFoamFactor ),
  vBreakFoam
);
roughnessFactor += ( roughNoise - 0.5 ) * 0.06 * uDetailStrength;
roughnessFactor = mix( roughnessFactor, 0.95, foamRough );
roughnessFactor = clamp( roughnessFactor, 0.18, 1.0 );
`;

// Cheap high-frequency chop the vertex grid is far too coarse to resolve.
// The ripple is derived from world position, so it has to be rotated into
// view space before it can be added to the shading normal.
const FRAGMENT_NORMAL = /* glsl */ `
float rippleX = vSurfacePos.x;
float rippleZ = vSurfacePos.z;
float rippleA = sin( rippleX * 1.7 + rippleZ * 0.9 + uTime * 2.1 );
float rippleB = sin( rippleX * -1.1 + rippleZ * 2.3 + uTime * 1.7 );
float rippleC = sin( rippleX * 3.1 - rippleZ * 2.7 + uTime * 3.3 );
float rippleD = sin( rippleX * 5.7 + rippleZ * 4.1 - uTime * 4.7 );
float rippleE = sin( rippleX * -8.3 + rippleZ * 6.2 + uTime * 5.9 );
float tinyNoise = oceanNoise(
  vSurfacePos.xz * uDetailScale * 4.0 +
  uWindDirection * uTime * 0.4
) - 0.5;
float wakeRipple = sin(
  vWakeCoord.x * 1.25 + abs( vWakeCoord.y ) * 1.8 - uTime * 2.4
) * vWakeFoam;
vec3 rippleWorld = vec3(
  ( rippleA + rippleC * 0.5 + rippleD * 0.24 + rippleE * 0.12 + tinyNoise * 0.8 * uDetailStrength + wakeRipple * 0.7 ) * uRippleStrength,
  0.0,
  ( rippleB + rippleC * 0.5 - rippleD * 0.2 + rippleE * 0.15 - tinyNoise * 0.65 * uDetailStrength - wakeRipple * 0.55 ) * uRippleStrength
);
normal = normalize( normal + ( viewMatrix * vec4( rippleWorld, 0.0 ) ).xyz );
`;

export class Ocean {
  constructor(waveField, { radius = 950, rings = 210, spokes = 256, falloff = 2.5 } = {}) {
    this.waveField = waveField;

    this.uniforms = {
      uWaveA: { value: waveField.uniformA },
      uWaveB: { value: waveField.uniformB },
      uWaveCount: { value: waveField.waveCount },
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x0a2740) },
      uCrestColor: { value: new THREE.Color(0x2f9fb8) },
      uFoamColor: { value: new THREE.Color(0xe8f6ff) },
      uCrestLevel: { value: 1 },
      uFoamStart: { value: 0.5 },
      uFoamEnd: { value: 0.9 },
      uRippleStrength: { value: 0.02 },
      uDetailScale: { value: 0.32 },
      uDetailStrength: { value: 0.85 },
      uFoamDetail: { value: 0.78 },
      uWindDirection: { value: new THREE.Vector2(1, 0) },
      uWakePosition: { value: new THREE.Vector2() },
      uWakeDirection: { value: new THREE.Vector2(1, 0) },
      uWakeStrength: { value: 0.7 },
      uWakeLength: { value: 90 },
      uBreakStrength: { value: 0.65 },
      uTsunamiAmp: { value: 0 },
      uTsunamiWidth: { value: 80 },
      uTsunamiSpeed: { value: 26 },
      uTsunamiOrigin: { value: -620 },
      uTsunamiDir: { value: new THREE.Vector2(1, 0) },
    };

    this.settings = {
      foamAmount: 0.55,
      rippleStrength: 0.02,
      detailScale: 0.32,
      detailStrength: 0.7,
      foamDetail: 0.78,
      wakeStrength: 0.7,
      wakeLength: 90,
      breakStrength: 0.65,
      roughness: 0.32,
      wireframe: false,
    };
    this.wake = {
      position: new THREE.Vector2(),
      direction: new THREE.Vector2(1, 0),
      strength: 0,
      length: 90,
    };

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: this.settings.roughness,
      metalness: 0,
      envMapIntensity: 0.55,
    });

    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${VERTEX_HEAD}`)
        .replace("#include <beginnormal_vertex>", VERTEX_GERSTNER)
        .replace(
          "#include <begin_vertex>",
          /* glsl */ `
          vec3 transformed = position + waveOffset;
          vWaveHeight = waveOffset.y;
          vFoamFactor = waveFold;
          vSurfacePos = waveBase + waveOffset;
          // vBreakFoam already set in the Gerstner block.
          `
        );

      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${FRAGMENT_HEAD}`)
        .replace("#include <color_fragment>", `#include <color_fragment>\n${FRAGMENT_COLOR}`)
        .replace(
          "#include <roughnessmap_fragment>",
          `#include <roughnessmap_fragment>\n${FRAGMENT_ROUGHNESS}`
        )
        .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>\n${FRAGMENT_NORMAL}`);
    };

    this.material = material;
    this.mesh = new THREE.Mesh(createRadialGrid(radius, rings, spokes, falloff), material);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = false;
    this.mesh.renderOrder = 0;

    this.syncToWaveField();
  }

  /** Pushes freshly rebuilt wave layers and derived look settings to the GPU. */
  syncToWaveField() {
    const u = this.uniforms;
    u.uWaveCount.value = this.waveField.waveCount;
    u.uCrestLevel.value = Math.max(0.15, this.waveField.significantHeight * 0.45);

    // Foam appears as the fold factor nears the choppiness budget, so the
    // thresholds have to track choppiness rather than sit at fixed values.
    const budget = Math.max(0.05, this.waveField.params.choppiness);
    const bite = THREE.MathUtils.clamp(this.settings.foamAmount, 0, 1);
    u.uFoamStart.value = budget * (1 - bite * 0.85);
    u.uFoamEnd.value = budget * (1 - bite * 0.35) + 0.02;
    u.uRippleStrength.value = this.settings.rippleStrength;
    u.uDetailScale.value = this.settings.detailScale;
    u.uDetailStrength.value = this.settings.detailStrength;
    u.uFoamDetail.value = this.settings.foamDetail;
    u.uBreakStrength.value = this.settings.breakStrength;
    this.waveField.params.breakStrength = this.settings.breakStrength;
    const dominantWave = this.waveField.layers[0];
    if (dominantWave) {
      u.uWindDirection.value.set(dominantWave.dirX, dominantWave.dirZ);
    }

    const p = this.waveField.params;
    if (p.tsunami) {
      u.uTsunamiAmp.value = p.tsunamiAmplitude;
      u.uTsunamiWidth.value = p.tsunamiWidth;
      u.uTsunamiSpeed.value = p.tsunamiSpeed;
      u.uTsunamiOrigin.value = p.tsunamiOrigin;
      u.uTsunamiDir.value.copy(this.waveField.tsunamiDir);
    } else {
      u.uTsunamiAmp.value = 0;
    }

    this.material.roughness = this.settings.roughness;
    this.material.wireframe = this.settings.wireframe;
  }

  setWake(position, heading, speed, sternOffset = 1.5) {
    const directionX = Math.cos(heading);
    const directionZ = -Math.sin(heading);
    // Origin is at the craft centre; emit the wake from the stern nozzle.
    this.uniforms.uWakePosition.value.set(
      position.x - directionX * sternOffset,
      position.z - directionZ * sternOffset
    );
    this.uniforms.uWakeDirection.value.set(directionX, directionZ);
    const strength =
      this.settings.wakeStrength * THREE.MathUtils.clamp(speed / 10, 0, 2.2);
    this.uniforms.uWakeStrength.value = strength;
    this.uniforms.uWakeLength.value = this.settings.wakeLength * (0.7 + Math.min(speed, 30) / 40);

    this.wake.position.copy(this.uniforms.uWakePosition.value);
    this.wake.direction.set(directionX, directionZ);
    this.wake.strength = strength;
    this.wake.length = this.settings.wakeLength;
  }

  wakeHeightAt(x, z, time) {
    const wake = this.wake;
    if (wake.strength <= 0.0001) return 0;

    const relX = x - wake.position.x;
    const relZ = z - wake.position.y;
    const back = -(relX * wake.direction.x + relZ * wake.direction.y);
    if (back <= 0.5 || back >= wake.length) return 0;

    const side = relX * -wake.direction.y + relZ * wake.direction.x;
    const width = 1.2 + back * 0.36;
    const edge = THREE.MathUtils.smoothstep(width + 1.3 - Math.abs(side), 0, 2.6);
    const start = THREE.MathUtils.smoothstep(back, 0.5, 4);
    const end = 1 - THREE.MathUtils.smoothstep(back, wake.length * 0.72, wake.length);
    const trail = edge * start * end;
    const fade = Math.exp(-back / Math.max(wake.length * 0.55, 1));

    const transverse = Math.sin(back * 0.82 - time * 2.25);
    const divergent = Math.sin(back * 0.48 + Math.abs(side) * 1.42 - time * 1.7);
    const centre =
      Math.exp(-Math.abs(side) * 0.42) *
      Math.sin(back * 1.65 - time * 3.1);

    return (
      (transverse * 0.34 + divergent * 0.52 + centre * 0.14) *
      trail *
      fade *
      wake.strength
    );
  }

  sampleWake(x, z, time, out = { height: 0, normal: new THREE.Vector3() }) {
    const epsilon = 0.35;
    const height = this.wakeHeightAt(x, z, time);
    const dx =
      (this.wakeHeightAt(x + epsilon, z, time) -
        this.wakeHeightAt(x - epsilon, z, time)) /
      (epsilon * 2);
    const dz =
      (this.wakeHeightAt(x, z + epsilon, time) -
        this.wakeHeightAt(x, z - epsilon, time)) /
      (epsilon * 2);

    out.height = height;
    out.normal.set(-dx, 1, -dz).normalize();
    return out;
  }

  update(time, camera) {
    this.uniforms.uTime.value = time;
    // Keep the dense centre of the grid under the viewer.
    this.mesh.position.set(camera.position.x, 0, camera.position.z);

    // Keep tsunami uniforms live so a freshly triggered pulse always shows.
    const p = this.waveField.params;
    if (p.tsunami) {
      this.uniforms.uTsunamiAmp.value = p.tsunamiAmplitude;
      this.uniforms.uTsunamiWidth.value = p.tsunamiWidth;
      this.uniforms.uTsunamiSpeed.value = p.tsunamiSpeed;
      this.uniforms.uTsunamiOrigin.value = p.tsunamiOrigin;
      this.uniforms.uTsunamiDir.value.copy(this.waveField.tsunamiDir);
    } else {
      this.uniforms.uTsunamiAmp.value = 0;
    }
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

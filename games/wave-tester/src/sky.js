import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";

/**
 * Atmospheric sky dome plus a matching sun light. The sky is also baked into
 * an environment map so the ocean reflects whatever the horizon is doing.
 */
export class SkyRig {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.params = {
      elevation: 14,
      azimuth: 152,
      turbidity: 6.5,
      rayleigh: 2.4,
      mieCoefficient: 0.006,
      mieDirectionalG: 0.82,
      exposure: 0.45,
    };

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);

    this.sunDirection = new THREE.Vector3();

    this.sunLight = new THREE.DirectionalLight(0xfff2dd, 2.6);
    scene.add(this.sunLight);

    // Bounce light from sky above and dark water below keeps troughs readable.
    this.fillLight = new THREE.HemisphereLight(0x9fd4ff, 0x07131f, 0.55);
    scene.add(this.fillLight);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.renderTarget = null;
    this.bakeQueued = false;

    this.update();
  }

  update() {
    const p = this.params;
    const uniforms = this.sky.material.uniforms;
    uniforms.turbidity.value = p.turbidity;
    uniforms.rayleigh.value = p.rayleigh;
    uniforms.mieCoefficient.value = p.mieCoefficient;
    uniforms.mieDirectionalG.value = p.mieDirectionalG;

    const phi = THREE.MathUtils.degToRad(90 - p.elevation);
    const theta = THREE.MathUtils.degToRad(p.azimuth);
    this.sunDirection.setFromSphericalCoords(1, phi, theta);
    uniforms.sunPosition.value.copy(this.sunDirection);

    this.sunLight.position.copy(this.sunDirection).multiplyScalar(2000);

    // Low sun means warmer, dimmer, redder light.
    const altitude = THREE.MathUtils.clamp(p.elevation / 45, 0, 1);
    this.sunLight.intensity = 0.35 + altitude * 2.6;
    this.sunLight.color.setHSL(0.09 - altitude * 0.05, 0.55 - altitude * 0.42, 0.55 + altitude * 0.2);

    this.renderer.toneMappingExposure = p.exposure;

    this.refreshEnvironment();
  }

  /**
   * Re-bakes the sky into the scene environment map. Dragging a sun slider
   * fires this far faster than it needs to run, so requests are coalesced
   * down to one bake per frame.
   */
  refreshEnvironment() {
    if (this.bakeQueued) return;
    this.bakeQueued = true;

    requestAnimationFrame(() => {
      this.bakeQueued = false;
      if (this.renderTarget) this.renderTarget.dispose();

      this.envScene.add(this.sky);
      this.renderTarget = this.pmrem.fromScene(this.envScene);
      this.scene.add(this.sky);

      this.scene.environment = this.renderTarget.texture;
    });
  }

  /** Approximate colour of the sky at the horizon, for matching fog. */
  horizonColor(target = new THREE.Color()) {
    const altitude = THREE.MathUtils.clamp(this.params.elevation / 45, 0, 1);
    return target.setHSL(0.56 - altitude * 0.02, 0.42 - altitude * 0.12, 0.32 + altitude * 0.34);
  }

  dispose() {
    if (this.renderTarget) this.renderTarget.dispose();
    this.pmrem.dispose();
  }
}

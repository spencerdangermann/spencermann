import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import { WaveField } from "./waves.js";
import { Ocean } from "./ocean.js";
import { SkyRig } from "./sky.js";
import { FloatingFleet } from "./floaters.js";
import { Hud } from "./hud.js";
import { createUI } from "./ui.js";
import { PRESETS } from "./presets.js";

const CAMERA_MODES = ["Orbit", "Chase boat", "On deck", "Sea level"];
const DEFAULT_PRESET = 2;

const canvas = document.getElementById("scene");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.3, 20000);
camera.position.set(-38, 18, 42);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 420;
// Stop the orbit camera dropping below the waterline, where there is nothing.
controls.maxPolarAngle = Math.PI * 0.495;
controls.target.set(0, 2, 0);

const waveField = new WaveField();
const ocean = new Ocean(waveField);
scene.add(ocean.mesh);

const skyRig = new SkyRig(scene, renderer);
const fleet = new FloatingFleet(scene);
const hud = new Hud();

const state = {
  presetName: PRESETS[DEFAULT_PRESET].name,
  cameraMode: CAMERA_MODES[0],
  timeScale: 1,
  paused: false,
  showFloaters: true,
  fogDensity: 0.0016,
};

let ui = null;
let applyingPreset = false;

function onSkyChange() {
  skyRig.update();
  scene.fog = state.fogDensity > 0 ? new THREE.FogExp2(skyRig.horizonColor(), state.fogDensity) : null;
}

function onWaveChange() {
  waveField.params.breakStrength = ocean.settings.breakStrength;
  waveField.rebuild();
  ocean.syncToWaveField();

  // Any hand tweak means the sea no longer matches the named preset.
  if (!applyingPreset && state.presetName !== "Custom") {
    state.presetName = "Custom";
    ui?.refresh();
  }
}

function spawnTsunami() {
  applyingPreset = true;
  waveField.params.tsunami = false;
  const preset = PRESETS.find((p) => p.name === "Tsunami");
  if (preset) {
    Object.assign(waveField.params, preset.wave);
    Object.assign(ocean.settings, preset.look);
  } else {
    waveField.params.tsunami = true;
    waveField.params.tsunamiAmplitude = 42;
    waveField.params.tsunamiWidth = 55;
    waveField.params.tsunamiSpeed = 30;
  }

  state.presetName = "Tsunami";
  const focus = fleet.boat?.position ?? camera.position;
  const now = typeof simulationTime === "number" ? simulationTime : 0;
  // Close enough to see immediately, far enough to watch it roll in.
  waveField.triggerTsunami(now, 160, focus.x, focus.z);
  onWaveChange();
  applyingPreset = false;
  hud.reset();
  ui?.refresh();
}

function applyPreset(index) {
  const preset = PRESETS[index];
  if (!preset) return;

  if (preset.name === "Tsunami") {
    spawnTsunami();
    return;
  }

  applyingPreset = true;
  // Clear the solitary pulse unless this preset explicitly enables it.
  waveField.params.tsunami = false;
  Object.assign(waveField.params, preset.wave);
  Object.assign(ocean.settings, preset.look);
  state.presetName = preset.name;
  onWaveChange();
  applyingPreset = false;

  hud.reset();
  ui?.refresh();
}

ui = createUI({
  waveField,
  ocean,
  skyRig,
  fleet,
  state,
  cameraModes: CAMERA_MODES,
  applyPreset,
  onWaveChange,
  onSkyChange,
});

applyPreset(DEFAULT_PRESET);
onSkyChange();

// --- Camera rigs -----------------------------------------------------------

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const desiredPosition = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const lookTarget = new THREE.Vector3(0, 2, 0);
const surfaceProbe = { height: 0, normal: new THREE.Vector3() };

let activeCameraMode = state.cameraMode;
const savedOrbit = { position: camera.position.clone(), target: controls.target.clone() };

function updateCamera(mode, time, delta) {
  if (mode !== activeCameraMode) {
    if (activeCameraMode === "Orbit") {
      savedOrbit.position.copy(camera.position);
      savedOrbit.target.copy(controls.target);
    } else if (mode === "Orbit") {
      camera.position.copy(savedOrbit.position);
      controls.target.copy(savedOrbit.target);
    }
    activeCameraMode = mode;
  }

  const smooth = 1 - Math.exp(-4 * delta);

  if (mode === "Orbit") {
    controls.enabled = true;
    controls.update();
    return;
  }

  controls.enabled = false;

  if (mode === "Chase boat") {
    const boat = fleet.boat;
    desiredPosition.set(-12, 5.5, 0).applyAxisAngle(Y_AXIS, boat.rotation.y).add(boat.position);
    camera.position.lerp(desiredPosition, smooth);
    desiredTarget.copy(boat.position).addScaledVector(Y_AXIS, 1.2);
    lookTarget.lerp(desiredTarget, smooth);
    camera.lookAt(lookTarget);
    return;
  }

  if (mode === "On deck") {
    const boat = fleet.boat;
    const seat = fleet.cameraSeat;
    const look = fleet.cameraLook;
    camera.position.copy(boat.localToWorld(desiredPosition.set(seat.x, seat.y, seat.z)));
    camera.lookAt(boat.localToWorld(lookTarget.set(look.x, look.y, look.z)));
    return;
  }

  // Sea level: eye height just above the water, looking back into the wind.
  waveField.surfaceAt(0, 0, time, surfaceProbe);
  const heading = THREE.MathUtils.degToRad(waveField.params.windDirection);
  camera.position.set(Math.cos(heading) * -14, surfaceProbe.height + 1.7, Math.sin(heading) * -14);
  camera.lookAt(lookTarget.set(0, surfaceProbe.height + 1.4, 0));
}

// --- Keyboard --------------------------------------------------------------

let uiHidden = false;
const pressedKeys = new Set();

let simulationTime = 0;
let firstFrame = true;

window.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement
  ) {
    return;
  }

  const key = event.key.toLowerCase();
  pressedKeys.add(key);

  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    fleet.settings.autoDrive = false;
    ui.refresh();
  }

  if (key >= "1" && key <= "9") {
    applyPreset(Number(key) - 1);
    return;
  }

  if (key === "t") {
    spawnTsunami();
    return;
  }

  if (key === "c") {
    const next = (CAMERA_MODES.indexOf(state.cameraMode) + 1) % CAMERA_MODES.length;
    state.cameraMode = CAMERA_MODES[next];
    ui.refresh();
  } else if (key === " ") {
    event.preventDefault();
    // Space is the jump boost — pause moved to P.
  } else if (key === "p") {
    state.paused = !state.paused;
    ui.refresh();
  } else if (key === "h") {
    uiHidden = !uiHidden;
    hud.toggle();
    if (uiHidden) ui.gui.hide();
    else ui.gui.show();
  } else if (key === "r") {
    simulationTime = 0;
    hud.reset();
  }
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => pressedKeys.clear());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Loop ------------------------------------------------------------------

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);
  if (!state.paused) simulationTime += delta * state.timeScale;

  const throttle =
    (pressedKeys.has("w") || pressedKeys.has("arrowup") ? 1 : 0) -
    (pressedKeys.has("s") || pressedKeys.has("arrowdown") ? 1 : 0);
  const steer =
    (pressedKeys.has("d") || pressedKeys.has("arrowright") ? 1 : 0) -
    (pressedKeys.has("a") || pressedKeys.has("arrowleft") ? 1 : 0);
  fleet.setInput(throttle, steer);

  if (state.showFloaters) {
    const jumpPressed = pressedKeys.has(" ") || pressedKeys.has("space");
    fleet.update(waveField, ocean, simulationTime, delta, jumpPressed);
  }
  const wake = fleet.getWakeState();
  ocean.setWake(
    wake.position,
    wake.heading,
    state.showFloaters ? wake.speed : 0,
    wake.sternOffset
  );
  updateCamera(state.cameraMode, simulationTime, delta);
  // Runs after the camera so the dense part of the grid lands where we look.
  ocean.update(simulationTime, camera);

  waveField.surfaceAt(0, 0, simulationTime, surfaceProbe);
  hud.update(waveField, surfaceProbe.height, delta, state.presetName);

  renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    const loading = document.getElementById("loading");
    loading.classList.add("done");
    setTimeout(() => loading.remove(), 600);
  }
}

animate();

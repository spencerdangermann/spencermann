import GUI from "lil-gui";
import { PRESETS } from "./presets.js";
import { MAX_WAVES } from "./waves.js";

export function createUI(app) {
  const gui = new GUI({ title: "Wave Controls", width: 288 });

  const seaStates = ["Custom", ...PRESETS.map((p) => p.name)];
  gui
    .add(app.state, "presetName", seaStates)
    .name("Sea state")
    .onChange((name) => {
      const index = PRESETS.findIndex((p) => p.name === name);
      if (index >= 0) app.applyPreset(index);
    });

  const wind = gui.addFolder("Wind");
  const params = app.waveField.params;
  wind.add(params, "windSpeed", 0.5, 34, 0.1).name("Speed (m/s)").onChange(app.onWaveChange);
  wind.add(params, "windDirection", 0, 360, 1).name("Heading (deg)").onChange(app.onWaveChange);
  wind.add(params, "directionSpread", 0, 90, 1).name("Spread (deg)").onChange(app.onWaveChange);
  wind.add(params, "layerCount", 1, MAX_WAVES, 1).name("Wave layers").onChange(app.onWaveChange);

  const shape = gui.addFolder("Wave shape");
  shape.add(params, "heightScale", 0, 3, 0.01).name("Height x").onChange(app.onWaveChange);
  shape.add(params, "wavelengthScale", 0.2, 4, 0.01).name("Wavelength x").onChange(app.onWaveChange);
  shape.add(params, "choppiness", 0, 1.35, 0.01).name("Choppiness").onChange(app.onWaveChange);
  shape.add(params, "speedScale", 0.1, 2.5, 0.01).name("Speed x").onChange(app.onWaveChange);

  const water = gui.addFolder("Water");
  const look = app.ocean.settings;
  water.add(look, "foamAmount", 0, 1, 0.01).name("Foam").onChange(app.onWaveChange);
  water.add(look, "rippleStrength", 0, 0.15, 0.001).name("Surface ripple").onChange(app.onWaveChange);
  water.add(look, "detailStrength", 0, 2, 0.01).name("Fine detail").onChange(app.onWaveChange);
  water.add(look, "detailScale", 0.08, 1.2, 0.01).name("Detail scale").onChange(app.onWaveChange);
  water.add(look, "foamDetail", 0, 1, 0.01).name("Foam breakup").onChange(app.onWaveChange);
  water.add(look, "breakStrength", 0, 1.5, 0.01).name("Wave crash").onChange(app.onWaveChange);
  water.add(look, "wakeStrength", 0, 1.5, 0.01).name("Wake strength");
  water.add(look, "wakeLength", 20, 180, 1).name("Wake length");
  water.add(look, "roughness", 0.15, 0.7, 0.005).name("Roughness").onChange(app.onWaveChange);

  const colors = {
    deep: `#${app.ocean.uniforms.uDeepColor.value.getHexString()}`,
    crest: `#${app.ocean.uniforms.uCrestColor.value.getHexString()}`,
    foam: `#${app.ocean.uniforms.uFoamColor.value.getHexString()}`,
  };
  water.addColor(colors, "deep").name("Deep colour").onChange((v) => app.ocean.uniforms.uDeepColor.value.set(v));
  water.addColor(colors, "crest").name("Crest colour").onChange((v) => app.ocean.uniforms.uCrestColor.value.set(v));
  water.addColor(colors, "foam").name("Foam colour").onChange((v) => app.ocean.uniforms.uFoamColor.value.set(v));
  water.add(look, "wireframe").name("Show wireframe").onChange(app.onWaveChange);
  water.close();

  const boat = gui.addFolder("Jet ski");
  boat.add(app.fleet.settings, "autoDrive").name("Auto drive");
  boat.add(app.fleet.settings, "boatSpeed", 0, 80, 0.1).name("Target speed");
  boat.add(app.fleet.settings, "enginePower", 1, 55, 0.1).name("Engine power");
  boat.add(app.fleet.settings, "jumpBoost", 0.4, 2.5, 0.05).name("Jump boost");
  boat.add(app.fleet.settings, "showNpcs").name("NPC boats").onChange((v) => app.fleet.setNpcsVisible(v));
  boat.close();

  const sky = gui.addFolder("Sun & sky");
  const skyParams = app.skyRig.params;
  sky.add(skyParams, "elevation", -3, 80, 0.1).name("Sun elevation").onChange(app.onSkyChange);
  sky.add(skyParams, "azimuth", 0, 360, 1).name("Sun azimuth").onChange(app.onSkyChange);
  sky.add(skyParams, "turbidity", 0.5, 20, 0.1).name("Haze").onChange(app.onSkyChange);
  sky.add(skyParams, "rayleigh", 0, 5, 0.05).name("Sky scatter").onChange(app.onSkyChange);
  sky.add(skyParams, "exposure", 0.1, 1.2, 0.01).name("Exposure").onChange(app.onSkyChange);
  sky.close();

  const view = gui.addFolder("View");
  view.add(app.state, "cameraMode", app.cameraModes).name("Camera");
  view.add(app.state, "timeScale", 0, 3, 0.01).name("Time scale");
  view.add(app.state, "paused").name("Pause");
  view.add(app.state, "showFloaters").name("Show objects").onChange((v) => app.fleet.setVisible(v));
  view.add(app.state, "fogDensity", 0, 0.006, 0.0001).name("Haze density").onChange(app.onSkyChange);

  const refresh = () => {
    for (const controller of gui.controllersRecursive()) controller.updateDisplay();
  };

  return { gui, refresh };
}

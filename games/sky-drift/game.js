(() => {
  if (typeof THREE === "undefined") {
    document.body.innerHTML =
      '<p style="color:#eef4f8;font-family:sans-serif;padding:2rem">Could not load Three.js. Check your network, then reopen index.html.</p>';
    return;
  }

  const root = document.getElementById("game-root");
  const hud = document.getElementById("hud");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");
  const scoreEl = document.getElementById("score");
  const killsEl = document.getElementById("kills");
  const scrapEl = document.getElementById("scrap");
  const alliesAliveEl = document.getElementById("allies-alive");
  const menuScrapEl = document.getElementById("menu-scrap");
  const upgradeList = document.getElementById("upgrade-list");
  const bestEl = document.getElementById("best");
  const altBar = document.getElementById("alt-bar");
  const spdBar = document.getElementById("spd-bar");
  const hpBar = document.getElementById("hp-bar");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayMsg = document.getElementById("overlay-msg");
  const picker = document.getElementById("plane-picker");
  const grokBanner = document.getElementById("grok-banner");
  const viewBtn = document.getElementById("view-btn");
  const cockpit = document.getElementById("cockpit");

  const PLANES = [
    {
      name: "Sparrow",
      meta: "Nimble",
      colors: { body: 0xe8eef2, wing: 0xc5d0d8, accent: 0xe8a04a, canopy: 0x2a4a62 },
      handling: 1.35,
      thrust: 0.95,
    },
    {
      name: "Falcon",
      meta: "Balanced",
      colors: { body: 0xd4a574, wing: 0xb8895c, accent: 0x3d6b8c, canopy: 0x1a2834 },
      handling: 1.0,
      thrust: 1.05,
    },
    {
      name: "Comet",
      meta: "Fast",
      colors: { body: 0x6eb8d8, wing: 0x4a90b0, accent: 0xf0d878, canopy: 0x102030 },
      handling: 0.85,
      thrust: 1.28,
    },
  ];

  let selectedPlane = 1;
  let best = Number(localStorage.getItem("sky-drift-3d-best") || 0);
  bestEl.textContent = String(best);

  const sensSlider = document.getElementById("sens-slider");
  const sensLabel = document.getElementById("sens-label");
  const hudSensSlider = document.getElementById("hud-sens-slider");
  const hudSensLabel = document.getElementById("hud-sens-label");
  let mouseSensitivity = Number(localStorage.getItem("sky-drift-mouse-sens") || 40);

  function setSensitivity(value) {
    mouseSensitivity = Math.max(10, Math.min(100, Number(value) || 40));
    localStorage.setItem("sky-drift-mouse-sens", String(mouseSensitivity));
    sensSlider.value = String(mouseSensitivity);
    hudSensSlider.value = String(mouseSensitivity);
    sensLabel.textContent = `${mouseSensitivity}%`;
    hudSensLabel.textContent = `${mouseSensitivity}%`;
  }

  function sensFactor() {
    // 40% ≈ previous default feel; scales mouse aim + ground steer
    return mouseSensitivity / 100;
  }

  setSensitivity(mouseSensitivity);
  sensSlider.addEventListener("input", () => setSensitivity(sensSlider.value));
  hudSensSlider.addEventListener("input", () => setSensitivity(hudSensSlider.value));

  const keys = new Set();
  let state = "menu";
  let score = 0;
  let kills = 0;
  let scrap = Number(localStorage.getItem("sky-drift-scrap") || 35);
  let teamUpgrades = (() => {
    try {
      return Object.assign(
        { slots: 1, armor: 0, guns: 0, skill: 0, speed: 0 },
        JSON.parse(localStorage.getItem("sky-drift-team") || "{}")
      );
    } catch (e) {
      return { slots: 1, armor: 0, guns: 0, skill: 0, speed: 0 };
    }
  })();
  let playerUpgrades = (() => {
    try {
      return Object.assign(
        { hull: 0, guns: 0, engine: 0, avionics: 0 },
        JSON.parse(localStorage.getItem("sky-drift-plane") || "{}")
      );
    } catch (e) {
      return { hull: 0, guns: 0, engine: 0, avionics: 0 };
    }
  })();

  const PLANE_TIERS = [
    { name: "Mk.I Scout", need: 0, handling: 0, thrust: 0, scale: 1, variant: 0 },
    { name: "Mk.II Interceptor", need: 3, handling: 0.1, thrust: 0.12, scale: 1.04, variant: 1 },
    { name: "Mk.III Vanguard", need: 7, handling: 0.18, thrust: 0.24, scale: 1.08, variant: 2 },
    { name: "Mk.IV Razor", need: 12, handling: 0.28, thrust: 0.38, scale: 1.12, variant: 3 },
    { name: "Mk.V Apex Phantom", need: 18, handling: 0.4, thrust: 0.55, scale: 1.18, variant: 4 },
  ];

  function playerUpgradeTotal() {
    return (
      (playerUpgrades.hull | 0) +
      (playerUpgrades.guns | 0) +
      (playerUpgrades.engine | 0) +
      (playerUpgrades.avionics | 0)
    );
  }

  function getPlaneTier() {
    const total = playerUpgradeTotal();
    let tier = PLANE_TIERS[0];
    for (const t of PLANE_TIERS) {
      if (total >= t.need) tier = t;
    }
    return tier;
  }

  function getPlayerLoadout() {
    const paint = PLANES[selectedPlane];
    const tier = getPlaneTier();
    const hull = playerUpgrades.hull | 0;
    const guns = playerUpgrades.guns | 0;
    const engine = playerUpgrades.engine | 0;
    const avionics = playerUpgrades.avionics | 0;
    return {
      paint,
      tier,
      name: `${paint.name} ${tier.name}`,
      colors: paint.colors,
      handling: paint.handling + tier.handling + avionics * 0.06,
      thrust: paint.thrust + tier.thrust + engine * 0.08,
      maxHp: 100 + hull * 18 + tier.variant * 8,
      damage: 12 + guns * 3.5 + tier.variant * 2,
      fireRate: Math.max(0.055, 0.1 - guns * 0.007 - tier.variant * 0.004),
      scale: tier.scale,
      variant: tier.variant,
    };
  }

  let allyRespawnTimer = 0;
  let boost = 0;
  let playerHp = 100;
  let fireCooldown = 0;
  let firing = false;
  let grokTauntTimer = 0;
  let firstPerson = localStorage.getItem("sky-drift-fp") === "1";


  const clock = new THREE.Clock();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7eb8d8);
  scene.fog = new THREE.Fog(0xa8cce0, 220, 980);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  root.appendChild(renderer.domElement);

  // Lights + layered sky
  const ambient = new THREE.AmbientLight(0xb8d4e8, 0.42);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xa8d4f0, 0x3a6840, 0.62);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d8, 1.12);
  sun.position.set(120, 220, 80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 900;
  sun.shadow.camera.left = -280;
  sun.shadow.camera.right = 280;
  sun.shadow.camera.top = 280;
  sun.shadow.camera.bottom = -280;
  sun.shadow.bias = -0.00015;
  scene.add(sun);
  scene.add(sun.target);

  const fill = new THREE.DirectionalLight(0x7eb0d8, 0.28);
  fill.position.set(-90, 60, -120);
  scene.add(fill);

  // Gradient skydome (zenith → horizon → soft ground haze)
  const skyUniforms = {
    uTop: { value: new THREE.Color(0x3a7eb8) },
    uMid: { value: new THREE.Color(0x7eb8d8) },
    uHorizon: { value: new THREE.Color(0xc8dde8) },
    uGround: { value: new THREE.Color(0x6a9080) },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = clip.xyww;
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uHorizon;
      uniform vec3 uGround;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col;
        if (h > 0.0) {
          float t = pow(h, 0.65);
          col = mix(uHorizon, uMid, smoothstep(0.0, 0.35, h));
          col = mix(col, uTop, smoothstep(0.2, 1.0, t));
        } else {
          col = mix(uHorizon, uGround, smoothstep(0.0, -0.55, h));
        }
        // Soft sun glow smear toward light
        float sunGlow = pow(max(dot(normalize(vDir), normalize(vec3(0.45, 0.55, 0.3))), 0.0), 12.0);
        col += vec3(1.0, 0.92, 0.75) * sunGlow * 0.35;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 20), skyMat);
  skyDome.frustumCulled = false;
  scene.add(skyDome);
  scene.background = new THREE.Color(0x7eb8d8);
  scene.fog = new THREE.Fog(0xa8cce0, 220, 980);

  // Sun disc + corona
  const sunGroup = new THREE.Group();
  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(26, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe8b0, fog: false })
  );
  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(48, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffd090,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      fog: false,
    })
  );
  const sunBloom = new THREE.Mesh(
    new THREE.SphereGeometry(78, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffc878,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      fog: false,
    })
  );
  sunGroup.add(sunMesh, sunCorona, sunBloom);
  scene.add(sunGroup);

  // Infinite terrain — denser mesh, multi-octave landforms
  const TERRAIN_SIZE = 2000;
  const TERRAIN_SEGS = 140;
  const TERRAIN_SNAP = 28;
  const terrainGeo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGS, TERRAIN_SEGS);
  terrainGeo.rotateX(-Math.PI / 2);
  const terrainPos = terrainGeo.attributes.position;
  const terrainBaseX = new Float32Array(terrainPos.count);
  const terrainBaseZ = new Float32Array(terrainPos.count);
  for (let i = 0; i < terrainPos.count; i++) {
    terrainBaseX[i] = terrainPos.getX(i);
    terrainBaseZ[i] = terrainPos.getZ(i);
  }

  let terrainAnchorX = 0;
  let terrainAnchorZ = 0;
  let worldOffsetX = 0;
  let worldOffsetZ = 0;

  function hash2(x, z) {
    const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  // Lakes where seabed dips below WATER_Y — Gerstner sea from wave-tester
  const WATER_Y = 1.5;
  const MAX_WAVES = 6;
  const WAVE_G = 9.81;
  let waterTime = 0;
  const waveLayers = [];
  const waveUniformA = [];
  const waveUniformB = [];
  const PHASE_TABLE = [0.0, 2.399, 4.712, 1.047, 3.665, 5.759];

  function rebuildWaveLayers() {
    waveLayers.length = 0;
    const windSpeed = 8.5;
    const windDir = (35 * Math.PI) / 180;
    const spread = (48 * Math.PI) / 180;
    const peakWl = Math.min(90, Math.max(8, 0.55 * windSpeed * windSpeed));
    const sigH = 0.022 * windSpeed * windSpeed * 0.85;
    const weights = [];
    let wEnergy = 0;
    for (let i = 0; i < MAX_WAVES; i++) {
      const w = Math.pow(0.74, i);
      weights.push(w);
      wEnergy += w * w;
    }
    const ampScale = sigH / (2 * Math.SQRT2 * Math.sqrt(wEnergy));
    const chop = 0.78;
    const breakStr = 0.55;
    for (let i = 0; i < MAX_WAVES; i++) {
      const wavelength = Math.max(1.2, peakWl * Math.pow(0.58, i));
      const amplitude = Math.max(0.02, ampScale * weights[i]);
      const k = (Math.PI * 2) / wavelength;
      const angle = windDir + spread * Math.sin(i * 2.39996);
      const omega = Math.sqrt(WAVE_G * k);
      const steepness = (chop * (1 + breakStr * 0.35)) / MAX_WAVES / (k * amplitude);
      waveLayers.push({
        dirX: Math.cos(angle),
        dirZ: Math.sin(angle),
        amplitude,
        k,
        omega,
        steepness,
        phase: PHASE_TABLE[i],
      });
    }
    for (let i = 0; i < MAX_WAVES; i++) {
      const L = waveLayers[i];
      if (!waveUniformA[i]) {
        waveUniformA[i] = new THREE.Vector4();
        waveUniformB[i] = new THREE.Vector4();
      }
      waveUniformA[i].set(L.dirX, L.dirZ, L.amplitude, L.k);
      waveUniformB[i].set(L.omega, L.phase, L.steepness, 0);
    }
  }
  rebuildWaveLayers();

  function sampleWaveHeight(x, z, time) {
    const wx = x + worldOffsetX;
    const wz = z + worldOffsetZ;
    let dy = 0;
    let fold = 0;
    for (const L of waveLayers) {
      const theta = L.k * (L.dirX * wx + L.dirZ * wz) - L.omega * time + L.phase;
      dy += L.amplitude * Math.sin(theta);
      fold += L.steepness * L.amplitude * L.k * Math.sin(theta);
    }
    if (fold > 0.45) {
      const crash = THREE.MathUtils.clamp((fold - 0.45) / 0.6, 0, 1) * 0.55;
      dy -= crash * 0.7;
    }
    return dy;
  }

  function bedHeight(x, z) {
    const wx = x + worldOffsetX;
    const wz = z + worldOffsetZ;
    const continent =
      Math.sin(wx * 0.0022) * 22 +
      Math.cos(wz * 0.0019) * 18 +
      Math.sin((wx + wz) * 0.0014) * 26;
    const hills =
      Math.sin(wx * 0.008) * 14 +
      Math.cos(wz * 0.0075) * 12 +
      Math.sin(wx * 0.011 + wz * 0.009) * 10;
    const ridge = Math.sin(wx * 0.0045 + Math.cos(wz * 0.0035) * 2.2) * 20;
    const detail =
      Math.sin(wx * 0.028) * Math.cos(wz * 0.025) * 4.5 +
      Math.sin(wx * 0.055 + wz * 0.04) * 2.2 +
      Math.sin(wx * 0.09) * Math.cos(wz * 0.08) * 1.1;
    const peakGate = Math.max(0, Math.sin(wx * 0.0031) * Math.cos(wz * 0.0027));
    const peaks = peakGate * peakGate * 38;
    // Wide, deep lake basins
    const basinA = -Math.max(0, Math.sin(wx * 0.0048 + 1.7) * Math.cos(wz * 0.0042 + 0.9) - 0.28) * 42;
    const basinB = -Math.max(0, Math.sin(wx * 0.0032 + 4.1) * Math.cos(wz * 0.0055 + 2.3) - 0.35) * 34;
    const basinC = -Math.max(0, Math.sin(wx * 0.0065 + 0.4) * Math.cos(wz * 0.003 + 5.1) - 0.4) * 26;
    return continent + hills + ridge + detail + peaks + basinA + basinB + basinC;
  }

  function terrainHeight(x, z) {
    return bedHeight(x, z);
  }

  function isOverWater(x, z) {
    return bedHeight(x, z) < WATER_Y - 0.35;
  }

  function surfaceHeight(x, z) {
    const bed = bedHeight(x, z);
    if (bed < WATER_Y) {
      return WATER_Y + sampleWaveHeight(x, z, waterTime);
    }
    return bed;
  }

  function findLakeNear(cx, cz, maxDist) {
    for (let r = 40; r < maxDist; r += 35) {
      for (let a = 0; a < Math.PI * 2; a += 0.45) {
        const x = cx + Math.cos(a) * r;
        const z = cz + Math.sin(a) * r;
        if (isOverWater(x, z) && bedHeight(x, z) < WATER_Y - 4) return { x, z };
      }
    }
    return null;
  }

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 0.94,
    metalness: 0.04,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);

  function rebuildTerrain(cx, cz) {
    terrainAnchorX = cx;
    terrainAnchorZ = cz;
    const colors = terrainGeo.attributes.color
      ? terrainGeo.attributes.color
      : new THREE.BufferAttribute(new Float32Array(terrainPos.count * 3), 3);
    for (let i = 0; i < terrainPos.count; i++) {
      const lx = terrainBaseX[i] + cx;
      const lz = terrainBaseZ[i] + cz;
      const h = bedHeight(lx, lz);
      terrainPos.setXYZ(i, terrainBaseX[i], h, terrainBaseZ[i]);

      const moisture = (Math.sin(lx * 0.012 + 2) * Math.cos(lz * 0.01) + 1) * 0.5;
      const rockNoise = (Math.sin(lx * 0.04) * Math.cos(lz * 0.038) + 1) * 0.5;
      const patch = hash2(Math.floor(lx / 18), Math.floor(lz / 18));
      let r, g, b;
      if (h < WATER_Y) {
        const depth = THREE.MathUtils.clamp((WATER_Y - h) / 28, 0, 1);
        r = 0.28 - depth * 0.16 + patch * 0.04;
        g = 0.26 - depth * 0.12 + patch * 0.03;
        b = 0.18 - depth * 0.06;
      } else if (h < WATER_Y + 3.5) {
        r = 0.22 + patch * 0.06;
        g = 0.34 + moisture * 0.1;
        b = 0.2 + moisture * 0.08;
      } else if (h < 8) {
        r = 0.16 + patch * 0.06;
        g = 0.38 + moisture * 0.18 + patch * 0.05;
        b = 0.12 + moisture * 0.04;
      } else if (h < 28) {
        const dry = rockNoise * 0.35 + (1 - moisture) * 0.25;
        r = 0.22 + dry * 0.28 + patch * 0.05;
        g = 0.36 + moisture * 0.12 - dry * 0.1;
        b = 0.12 + dry * 0.04;
      } else if (h < 48) {
        r = 0.32 + rockNoise * 0.22;
        g = 0.3 + rockNoise * 0.1;
        b = 0.24 + rockNoise * 0.08;
      } else {
        const snow = THREE.MathUtils.clamp((h - 48) / 25, 0, 1);
        r = 0.4 + snow * 0.45;
        g = 0.38 + snow * 0.45;
        b = 0.34 + snow * 0.5;
      }
      const trail = Math.abs(Math.sin(lx * 0.018 + lz * 0.007));
      if (trail > 0.92 && h > WATER_Y + 1 && h < 32) {
        r = Math.min(1, r + 0.18);
        g = Math.min(1, g + 0.08);
        b = Math.min(1, b + 0.02);
      }
      colors.setXYZ(i, r, g, b);
    }
    terrainPos.needsUpdate = true;
    if (!terrainGeo.attributes.color) terrainGeo.setAttribute("color", colors);
    else colors.needsUpdate = true;
    terrainGeo.computeVertexNormals();
    terrain.position.set(cx, 0, cz);
  }
  rebuildTerrain(0, 0);

  function createRadialWaterGrid(radius, rings, spokes, falloff) {
    const positions = [0, 0, 0];
    const indices = [];
    for (let j = 1; j <= rings; j++) {
      const rad = radius * Math.pow(j / rings, falloff);
      for (let i = 0; i < spokes; i++) {
        const ang = (i / spokes) * Math.PI * 2;
        positions.push(Math.cos(ang) * rad, 0, Math.sin(ang) * rad);
      }
    }
    for (let i = 0; i < spokes; i++) {
      indices.push(0, 1 + ((i + 1) % spokes), 1 + i);
    }
    for (let j = 1; j < rings; j++) {
      const inner = 1 + (j - 1) * spokes;
      const outer = 1 + j * spokes;
      for (let i = 0; i < spokes; i++) {
        const i2 = (i + 1) % spokes;
        indices.push(inner + i, inner + i2, outer + i2, inner + i, outer + i2, outer + i);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), radius * 2);
    return geo;
  }

  const waterUniforms = {
    uTime: { value: 0 },
    uWaveA: { value: waveUniformA },
    uWaveB: { value: waveUniformB },
    uWaveCount: { value: MAX_WAVES },
    uBreakStrength: { value: 0.55 },
    uDeep: { value: new THREE.Color(0x062a45) },
    uCrest: { value: new THREE.Color(0x2f9fb8) },
    uFoam: { value: new THREE.Color(0xe8f6ff) },
    uSky: { value: new THREE.Color(0x8ebed4) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.75, 0.3).normalize() },
    uWindDir: { value: new THREE.Vector2(Math.cos(0.61), Math.sin(0.61)) },
    uWakePos: { value: new THREE.Vector2() },
    uWakeDir: { value: new THREE.Vector2(0, -1) },
    uWakeStrength: { value: 0 },
    uWakeLength: { value: 110 },
    uWaterLevel: { value: WATER_Y },
  };

  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    vertexShader: `
      #define MAX_WAVES 6
      uniform vec4 uWaveA[MAX_WAVES];
      uniform vec4 uWaveB[MAX_WAVES];
      uniform int uWaveCount;
      uniform float uTime;
      uniform float uBreakStrength;
      uniform float uWaterLevel;
      uniform vec2 uWakePos;
      uniform vec2 uWakeDir;
      uniform float uWakeStrength;
      uniform float uWakeLength;
      varying vec3 vWorld;
      varying vec3 vNorm;
      varying float vHeight;
      varying float vFold;
      varying float vBreak;
      varying float vWake;
      varying vec2 vWakeCoord;
      void main() {
        vec3 base = (modelMatrix * vec4(position, 1.0)).xyz;
        vec2 p = base.xz;
        vec3 offset = vec3(0.0);
        vec3 tanX = vec3(1.0, 0.0, 0.0);
        vec3 tanZ = vec3(0.0, 0.0, 1.0);
        float fold = 0.0;
        vec2 dirAcc = vec2(0.0);
        for (int i = 0; i < MAX_WAVES; i++) {
          if (i >= uWaveCount) break;
          vec2 dir = uWaveA[i].xy;
          float amp = uWaveA[i].z;
          float k = uWaveA[i].w;
          float omega = uWaveB[i].x;
          float steep = uWaveB[i].z;
          float theta = k * dot(dir, p) - omega * uTime + uWaveB[i].y;
          float c = cos(theta);
          float s = sin(theta);
          float qa = steep * amp;
          float qak = qa * k;
          float ak = amp * k;
          offset.x += qa * dir.x * c;
          offset.z += qa * dir.y * c;
          offset.y += amp * s;
          tanX.x -= qak * dir.x * dir.x * s;
          tanX.y += ak * dir.x * c;
          tanX.z -= qak * dir.x * dir.y * s;
          tanZ.x -= qak * dir.x * dir.y * s;
          tanZ.y += ak * dir.y * c;
          tanZ.z -= qak * dir.y * dir.y * s;
          fold += qak * s;
          dirAcc += dir * amp;
        }
        float crash = smoothstep(0.48, 1.05, fold) * uBreakStrength;
        vec2 cdir = length(dirAcc) > 0.0001 ? normalize(dirAcc) : vec2(1.0, 0.0);
        offset.xz += cdir * crash * (0.9 + offset.y * 0.12);
        offset.y -= crash * (0.55 + abs(offset.y) * 0.18);
        vBreak = crash;

        vec2 wakeRel = p - uWakePos;
        float wakeBack = -dot(wakeRel, uWakeDir);
        vec2 wakePerp = vec2(-uWakeDir.y, uWakeDir.x);
        float wakeSide = dot(wakeRel, wakePerp);
        float wakeWidth = 1.4 + max(wakeBack, 0.0) * 0.36;
        float wakeWedge = 1.0 - smoothstep(wakeWidth - 1.4, wakeWidth + 1.4, abs(wakeSide));
        float wakeTrail = smoothstep(0.4, 3.5, wakeBack);
        wakeTrail *= 1.0 - smoothstep(uWakeLength * 0.7, uWakeLength, wakeBack);
        wakeTrail *= wakeWedge;
        float wakeFade = exp(-max(wakeBack, 0.0) / max(uWakeLength * 0.55, 1.0));
        float wakeH = (
          sin(wakeBack * 0.82 - uTime * 2.25) * 0.34 +
          sin(wakeBack * 0.48 + abs(wakeSide) * 1.42 - uTime * 1.7) * 0.52
        ) * wakeTrail * wakeFade * uWakeStrength;
        offset.y += wakeH;
        vWake = wakeTrail * wakeFade * uWakeStrength;
        vWakeCoord = vec2(wakeBack, wakeSide);

        vec3 world = base + offset;
        world.y += uWaterLevel;
        vWorld = world;
        vHeight = offset.y;
        vFold = fold;
        vNorm = normalize(cross(tanZ, tanX));
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uCrest;
      uniform vec3 uFoam;
      uniform vec3 uSky;
      uniform vec3 uSunDir;
      uniform vec2 uWindDir;
      uniform float uTime;
      varying vec3 vWorld;
      varying vec3 vNorm;
      varying float vHeight;
      varying float vFold;
      varying float vBreak;
      varying float vWake;
      varying vec2 vWakeCoord;

      float hash22(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash22(i), hash22(i + vec2(1.0, 0.0)), f.x),
          mix(hash22(i + vec2(0.0, 1.0)), hash22(i + vec2(1.0)), f.x),
          f.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        v += noise(p) * 0.55;
        p = mat2(1.62, 1.17, -1.17, 1.62) * p;
        v += noise(p) * 0.28;
        p = mat2(1.74, -1.09, 1.09, 1.74) * p;
        v += noise(p) * 0.17;
        return v;
      }

      void main() {
        vec3 N = normalize(vNorm);
        float rx = vWorld.x;
        float rz = vWorld.z;
        float rip =
          sin(rx * 1.7 + rz * 0.9 + uTime * 2.1) * 0.35 +
          sin(rx * -1.1 + rz * 2.3 + uTime * 1.7) * 0.3 +
          sin(rx * 3.1 - rz * 2.7 + uTime * 3.3) * 0.2 +
          sin(rx * 5.7 + rz * 4.1 - uTime * 4.7) * 0.12;
        N = normalize(N + vec3(rip * 0.045, 0.0, rip * 0.04));

        vec3 V = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 2.8);
        float sparkle = pow(max(dot(reflect(-uSunDir, N), V), 0.0), 64.0);
        float crest = smoothstep(-0.6, 1.1, vHeight);

        vec2 duv = vWorld.xz * 0.32;
        vec2 crossW = vec2(-uWindDir.y, uWindDir.x);
        float broad = fbm(duv * 0.38 + uWindDir * uTime * 0.055);
        float fine = fbm(duv * 1.7 - crossW * uTime * 0.11);
        float foam = smoothstep(0.35, 0.92, vFold) * mix(1.0, smoothstep(0.28, 0.72, broad * 0.66 + fine * 0.34), 0.78);
        foam += vBreak * (0.55 + 0.45 * fbm(duv * 2.8 - uWindDir * uTime * 0.8));
        float wakeCentre = exp(-abs(vWakeCoord.y) * 0.65);
        float wakeShoulder = 1.0 - smoothstep(0.0, 1.4, abs(abs(vWakeCoord.y) - max(vWakeCoord.x, 0.0) * 0.36));
        foam += vWake * (wakeCentre * 0.72 + wakeShoulder * 0.8) * smoothstep(0.18, 0.68, fbm(vec2(vWakeCoord.x * 0.18 - uTime * 0.45, vWakeCoord.y * 0.7)));
        foam = clamp(foam, 0.0, 1.0);

        vec3 waterCol = mix(uDeep, uCrest, crest * crest);
        waterCol *= 1.0 + (broad - 0.5) * 0.14;
        waterCol = mix(waterCol, uSky, fres * 0.62);
        waterCol += vec3(1.0, 0.97, 0.9) * sparkle * 1.1;
        waterCol = mix(waterCol, uFoam, foam);
        float alpha = mix(0.78, 0.96, fres);
        gl_FragColor = vec4(waterCol, alpha);
      }
    `,
  });

  const waterMesh = new THREE.Mesh(createRadialWaterGrid(780, 110, 160, 2.35), waterMat);
  waterMesh.frustumCulled = false;
  waterMesh.renderOrder = 1;
  scene.add(waterMesh);

  let wakeStrength = 0;

  function updateWater(dt) {
    waterTime += dt;
    waterUniforms.uTime.value = waterTime;
    waterMesh.position.x = craft.position.x;
    waterMesh.position.z = craft.position.z;
    waterMesh.position.y = 0;
    tmp.set(sun.position.x - craft.position.x, sun.position.y, sun.position.z - craft.position.z).normalize();
    waterUniforms.uSunDir.value.copy(tmp);

    forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
    const flat = Math.sqrt(forward.x * forward.x + forward.z * forward.z) || 1;
    waterUniforms.uWakePos.value.set(craft.position.x, craft.position.z);
    waterUniforms.uWakeDir.value.set(forward.x / flat, forward.z / flat);

    const altW = craft.position.y - surfaceHeight(craft.position.x, craft.position.z);
    const lowFast = isOverWater(craft.position.x, craft.position.z) && altW < 22 && flight.speed > 55;
    const targetWake = lowFast ? THREE.MathUtils.clamp((22 - altW) / 18, 0.2, 1.35) * (flight.speed / 120) : 0;
    wakeStrength = THREE.MathUtils.damp(wakeStrength, targetWake, 4, dt);
    waterUniforms.uWakeStrength.value = wakeStrength;
  }

  function splashAt(pos, strength = 1) {
    const n = Math.floor(14 + strength * 18);
    const sy = surfaceHeight(pos.x, pos.z);
    for (let i = 0; i < n; i++) {
      const p = exhaust.find((e) => e.life <= 0);
      if (!p) break;
      p.life = 0.4 + Math.random() * 0.5 * strength;
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 8 * strength;
      p.mesh.position.y = sy + 0.4 + Math.random() * 2.5;
      p.mesh.position.z += (Math.random() - 0.5) * 8 * strength;
      p.mesh.visible = true;
      p.mesh.material.opacity = 0.92;
      p.mesh.material.color.setHex(Math.random() > 0.35 ? 0xe8f7ff : 0x6eb8d8);
      p.mesh.scale.setScalar(0.9 + Math.random() * 2.5 * strength);
      if (!p.vel) p.vel = new THREE.Vector3();
      p.vel.set((Math.random() - 0.5) * 14, 10 + Math.random() * 20 * strength, (Math.random() - 0.5) * 14);
    }
    wakeStrength = Math.min(1.8, wakeStrength + 0.7 * strength);
  }

  // Trees — denser recycled forest
  const treeGroup = new THREE.Group();
  scene.add(treeGroup);
  const TREE_RADIUS = 640;
  const TREE_COUNT = 280;
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3422, flatShading: true, roughness: 0.95 });
  const trunkDarkMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, flatShading: true, roughness: 0.98 });
  const trunkPaleMat = new THREE.MeshStandardMaterial({ color: 0xc8c0b0, flatShading: true, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b3c, flatShading: true, roughness: 0.9 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ color: 0x245230, flatShading: true, roughness: 0.92 });
  const leafLiteMat = new THREE.MeshStandardMaterial({ color: 0x3f8a4e, flatShading: true, roughness: 0.88 });
  const leafAutumnMat = new THREE.MeshStandardMaterial({ color: 0x8a6b2e, flatShading: true, roughness: 0.9 });
  const leafRedMat = new THREE.MeshStandardMaterial({ color: 0x8a3a28, flatShading: true, roughness: 0.9 });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x356b3a, flatShading: true, roughness: 0.95 });
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xe8eef2, flatShading: true, roughness: 0.85 });

  function makeTree() {
    const g = new THREE.Group();
    const kind = Math.random();
    const trunkH = 3.4 + Math.random() * 2.4;
    const trunkMatPick =
      kind > 0.92 ? trunkPaleMat : Math.random() > 0.5 ? trunkMat : trunkDarkMat;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26 + Math.random() * 0.22, 0.5 + Math.random() * 0.3, trunkH, 6),
      trunkMatPick
    );
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    g.add(trunk);

    // Trunk knots / branch stubs
    if (Math.random() > 0.4) {
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
        const stub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.08, 0.45 + Math.random() * 0.4, 5),
          trunkDarkMat
        );
        const ang = Math.random() * Math.PI * 2;
        stub.position.set(Math.cos(ang) * 0.35, 1.2 + Math.random() * 1.8, Math.sin(ang) * 0.35);
        stub.rotation.z = Math.cos(ang) * 0.9;
        stub.rotation.x = Math.sin(ang) * 0.9;
        g.add(stub);
      }
    }

    if (kind < 0.38) {
      // Layered pine
      const layers = 3 + Math.floor(Math.random() * 2);
      const snowy = Math.random() > 0.88;
      for (let i = 0; i < layers; i++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(2.9 - i * 0.48, 2.9 - i * 0.3, 7),
          i === 0 ? leafDarkMat : i === layers - 1 ? leafLiteMat : leafMat
        );
        cone.position.y = 3.6 + i * 1.4;
        cone.castShadow = true;
        g.add(cone);
        if (snowy) {
          const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6 - i * 0.25, 0.55, 6), snowMat);
          cap.position.y = 4.5 + i * 1.4;
          g.add(cap);
        }
      }
    } else if (kind < 0.62) {
      // Broad leafy / autumn
      const leafColor =
        Math.random() > 0.88 ? leafRedMat : Math.random() > 0.7 ? leafAutumnMat : leafMat;
      for (let i = 0; i < 5; i++) {
        const blob = new THREE.Mesh(
          new THREE.SphereGeometry(1.1 + Math.random() * 0.85, 7, 6),
          i % 2 ? leafColor : leafLiteMat
        );
        blob.position.set((Math.random() - 0.5) * 1.8, 4.0 + i * 0.55, (Math.random() - 0.5) * 1.8);
        blob.scale.y = 0.65 + Math.random() * 0.4;
        blob.castShadow = true;
        g.add(blob);
      }
    } else if (kind < 0.78) {
      // Tall spruce
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.7, 8.2, 6), leafDarkMat);
      cone.position.y = 5.8;
      cone.castShadow = true;
      g.add(cone);
      const mid = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3.2, 6), leafMat);
      mid.position.y = 8.2;
      g.add(mid);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.0, 5), leafLiteMat);
      tip.position.y = 10.2;
      g.add(tip);
    } else if (kind < 0.9) {
      // Twin trunk clump
      const trunk2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.38, 3.0, 5),
        trunkDarkMat
      );
      trunk2.position.set(0.75, 1.55, 0.15);
      trunk2.rotation.z = -0.18;
      g.add(trunk2);
      for (let i = 0; i < 4; i++) {
        const blob = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 5), i % 2 ? leafMat : leafLiteMat);
        blob.position.set((Math.random() - 0.5) * 2, 4.2 + i * 0.45, (Math.random() - 0.5) * 1.4);
        g.add(blob);
      }
    } else {
      // Dead / snag
      trunk.material = trunkDarkMat;
      for (let i = 0; i < 3; i++) {
        const branch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.07, 1.2 + Math.random(), 4),
          trunkDarkMat
        );
        const ang = (i / 3) * Math.PI * 2;
        branch.position.set(Math.cos(ang) * 0.2, 2.5 + i * 0.6, Math.sin(ang) * 0.2);
        branch.rotation.z = Math.cos(ang) * 1.1;
        branch.rotation.x = Math.sin(ang) * 1.1;
        g.add(branch);
      }
    }

    // Ground litter / underbrush
    if (Math.random() > 0.3) {
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.65 + Math.random() * 0.55, 6, 5), bushMat);
      bush.position.set((Math.random() - 0.5) * 1.6, 0.4, (Math.random() - 0.5) * 1.6);
      bush.scale.y = 0.5;
      g.add(bush);
    }
    if (Math.random() > 0.55) {
      const litter = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 5, 4),
        Math.random() > 0.5 ? leafDarkMat : leafAutumnMat
      );
      litter.position.set((Math.random() - 0.5) * 2.2, 0.2, (Math.random() - 0.5) * 2.2);
      litter.scale.set(1.2, 0.35, 1.1);
      g.add(litter);
    }

    g.scale.setScalar(0.65 + Math.random() * 1.7);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }

  function placeOnLand(obj, cx, cz, minR, maxR, maxH = 30, minH = -4) {
    for (let attempt = 0; attempt < 10; attempt++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = minR + Math.random() * (maxR - minR);
      const x = cx + Math.cos(ang) * dist;
      const z = cz + Math.sin(ang) * dist;
      const y = terrainHeight(x, z);
      if (y > maxH || y < minH) continue;
      obj.position.set(x, y, z);
      return;
    }
    const x = cx + (Math.random() - 0.5) * maxR;
    const z = cz + (Math.random() - 0.5) * maxR;
    obj.position.set(x, terrainHeight(x, z), z);
  }

  function scatterTrees(cx = 0, cz = 0) {
    while (treeGroup.children.length) {
      treeGroup.remove(treeGroup.children[0]);
    }
    for (let i = 0; i < TREE_COUNT; i++) treeGroup.add(makeTree());
    for (const tree of treeGroup.children) {
      placeOnLand(tree, cx, cz, 35, TREE_RADIUS, 34, WATER_Y + 1.2);
    }
  }
  scatterTrees();

  function recycleTrees() {
    const cx = craft.position.x;
    const cz = craft.position.z;
    const maxR2 = TREE_RADIUS * TREE_RADIUS;
    for (const tree of treeGroup.children) {
      const dx = tree.position.x - cx;
      const dz = tree.position.z - cz;
      if (dx * dx + dz * dz > maxR2) {
        if (Math.random() < 0.18) {
          treeGroup.remove(tree);
          const neu = makeTree();
          treeGroup.add(neu);
          placeOnLand(neu, cx, cz, TREE_RADIUS * 0.5, TREE_RADIUS * 0.95, 34, WATER_Y + 1.2);
        } else {
          placeOnLand(tree, cx, cz, TREE_RADIUS * 0.5, TREE_RADIUS * 0.95, 34, WATER_Y + 1.2);
        }
      }
    }
  }

  // Rocks, boulders, shrubs — ground clutter
  const propGroup = new THREE.Group();
  scene.add(propGroup);
  const PROP_RADIUS = 600;
  const PROP_COUNT = 200;
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6a655c, flatShading: true, roughness: 0.96 });
  const rockDarkMat = new THREE.MeshStandardMaterial({ color: 0x4e4a44, flatShading: true, roughness: 0.98 });
  const rockLiteMat = new THREE.MeshStandardMaterial({ color: 0x8a8578, flatShading: true, roughness: 0.9 });
  const rockMossMat = new THREE.MeshStandardMaterial({ color: 0x4a5a40, flatShading: true, roughness: 0.95 });
  const scrubMat = new THREE.MeshStandardMaterial({ color: 0x4a6b38, flatShading: true, roughness: 0.95 });
  const scrubDryMat = new THREE.MeshStandardMaterial({ color: 0x6a7a3a, flatShading: true, roughness: 0.95 });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2818, flatShading: true, roughness: 0.98 });
  const flowerMat = new THREE.MeshStandardMaterial({ color: 0xc47850, flatShading: true, roughness: 0.85 });

  function makeProp() {
    const g = new THREE.Group();
    const kind = Math.random();
    if (kind < 0.4) {
      // Rock cluster
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.65 + Math.random() * 1.5, 0),
          i % 3 === 0 ? rockMossMat : i % 2 ? rockMat : rockDarkMat
        );
        rock.position.set((Math.random() - 0.5) * 2.4, 0.3 + Math.random() * 0.45, (Math.random() - 0.5) * 2.4);
        rock.rotation.set(Math.random(), Math.random(), Math.random());
        rock.scale.set(1 + Math.random() * 0.6, 0.5 + Math.random() * 0.55, 1 + Math.random() * 0.5);
        rock.castShadow = true;
        rock.receiveShadow = true;
        g.add(rock);
      }
    } else if (kind < 0.58) {
      // Large boulder + chips
      const big = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + Math.random() * 1.6, 0), rockLiteMat);
      big.position.y = 0.95;
      big.rotation.set(0.3, Math.random() * 6, 0.2);
      big.scale.set(1.25, 0.7, 1.05);
      big.castShadow = true;
      g.add(big);
      for (let i = 0; i < 3; i++) {
        const chip = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45 + Math.random() * 0.4, 0), rockDarkMat);
        chip.position.set((Math.random() - 0.5) * 3, 0.25, (Math.random() - 0.5) * 3);
        chip.rotation.set(Math.random(), Math.random(), Math.random());
        g.add(chip);
      }
    } else if (kind < 0.72) {
      // Fallen log
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 + Math.random() * 0.15, 0.35 + Math.random() * 0.12, 3.5 + Math.random() * 2, 7),
        logMat
      );
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (Math.random() - 0.5) * 0.4;
      log.position.y = 0.3;
      log.castShadow = true;
      g.add(log);
      const end = new THREE.Mesh(new THREE.CircleGeometry(0.32, 8), rockDarkMat);
      end.position.set(1.8, 0.3, 0);
      end.rotation.y = Math.PI / 2;
      g.add(end);
      if (Math.random() > 0.4) {
        const moss = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 4), rockMossMat);
        moss.position.set((Math.random() - 0.5) * 1.5, 0.5, 0.2);
        moss.scale.y = 0.4;
        g.add(moss);
      }
    } else if (kind < 0.88) {
      // Scrub / grass tufts
      for (let i = 0; i < 4; i++) {
        const scrub = new THREE.Mesh(
          new THREE.SphereGeometry(0.5 + Math.random() * 0.45, 5, 4),
          Math.random() > 0.6 ? scrubDryMat : scrubMat
        );
        scrub.position.set((Math.random() - 0.5) * 2.4, 0.35, (Math.random() - 0.5) * 2.4);
        scrub.scale.y = 0.4 + Math.random() * 0.25;
        g.add(scrub);
      }
      if (Math.random() > 0.55) {
        for (let i = 0; i < 3; i++) {
          const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), flowerMat);
          bloom.position.set((Math.random() - 0.5) * 1.8, 0.55 + Math.random() * 0.3, (Math.random() - 0.5) * 1.8);
          g.add(bloom);
        }
      }
    } else {
      // Standing stone / slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.7 + Math.random(), 1.8 + Math.random() * 1.4, 0.35), rockMat);
      slab.position.y = 1.0;
      slab.rotation.y = (Math.random() - 0.5) * 0.5;
      slab.rotation.z = (Math.random() - 0.5) * 0.15;
      slab.castShadow = true;
      g.add(slab);
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), rockDarkMat);
      base.position.y = 0.25;
      base.scale.set(1.2, 0.4, 1);
      g.add(base);
    }
    g.scale.setScalar(0.75 + Math.random() * 1.5);
    g.rotation.y = Math.random() * Math.PI * 2;
    return g;
  }

  function scatterProps(cx = 0, cz = 0) {
    while (propGroup.children.length) propGroup.remove(propGroup.children[0]);
    for (let i = 0; i < PROP_COUNT; i++) propGroup.add(makeProp());
    for (const p of propGroup.children) {
      placeOnLand(p, cx, cz, 25, PROP_RADIUS, 52, WATER_Y + 0.8);
    }
  }
  scatterProps();

  function recycleProps() {
    const cx = craft.position.x;
    const cz = craft.position.z;
    const maxR2 = PROP_RADIUS * PROP_RADIUS;
    for (const p of propGroup.children) {
      const dx = p.position.x - cx;
      const dz = p.position.z - cz;
      if (dx * dx + dz * dz > maxR2) {
        if (Math.random() < 0.12) {
          propGroup.remove(p);
          const neu = makeProp();
          propGroup.add(neu);
          placeOnLand(neu, cx, cz, PROP_RADIUS * 0.5, PROP_RADIUS * 0.95, 52, WATER_Y + 0.8);
        } else {
          placeOnLand(p, cx, cz, PROP_RADIUS * 0.5, PROP_RADIUS * 0.95, 52, WATER_Y + 0.8);
        }
      }
    }
  }

  // Clouds — layered sky field
  const cloudGroup = new THREE.Group();
  scene.add(cloudGroup);
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xf2f7fa,
    transparent: true,
    opacity: 0.82,
    roughness: 1,
    flatShading: true,
  });
  const cloudShadeMat = new THREE.MeshStandardMaterial({
    color: 0xc5d5e2,
    transparent: true,
    opacity: 0.55,
    roughness: 1,
    flatShading: true,
  });
  const cloudGoldMat = new THREE.MeshStandardMaterial({
    color: 0xf0e0c8,
    transparent: true,
    opacity: 0.7,
    roughness: 1,
    flatShading: true,
  });
  const cloudStormDark = new THREE.MeshStandardMaterial({
    color: 0x6a7580,
    transparent: true,
    opacity: 0.78,
    roughness: 1,
    flatShading: true,
  });
  const CLOUD_RADIUS = 950;
  const CLOUD_COUNT = 88;

  function makeCloud() {
    const g = new THREE.Group();
    const style = Math.random();
    const stormy = style > 0.86;
    const golden = !stormy && style > 0.72;
    const cirrus = !stormy && !golden && style < 0.18;
    const tower = !stormy && !golden && !cirrus && style > 0.55;
    const matA = stormy ? cloudStormDark : golden ? cloudGoldMat : cloudMat;
    const matB = stormy
      ? new THREE.MeshStandardMaterial({
          color: 0x8a96a2,
          transparent: true,
          opacity: 0.65,
          roughness: 1,
          flatShading: true,
        })
      : cloudShadeMat;

    if (cirrus) {
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 5, 7, 5), matA);
        m.position.set((i - 1.5) * 8 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 4);
        m.scale.set(2.2 + Math.random(), 0.18 + Math.random() * 0.15, 0.6 + Math.random() * 0.4);
        g.add(m);
      }
      g.userData.kind = "cirrus";
    } else if (tower) {
      const n = 8 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        const h = i / n;
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(4 + Math.random() * 6, 8, 7),
          i < 3 ? matB : matA
        );
        m.position.set(
          (Math.random() - 0.5) * 16,
          h * 18 + (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 12
        );
        m.scale.set(1.1 + Math.random() * 0.6, 0.7 + Math.random() * 0.5, 0.9 + Math.random() * 0.5);
        g.add(m);
      }
      const anvil = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), matA);
      anvil.position.y = 16;
      anvil.scale.set(2.2, 0.35, 1.3);
      g.add(anvil);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), matB);
      belly.position.y = -1.5;
      belly.scale.set(1.6, 0.3, 1.0);
      g.add(belly);
      g.userData.kind = "tower";
    } else {
      const n = 7 + Math.floor(Math.random() * 7);
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(
          new THREE.SphereGeometry(3.5 + Math.random() * 7.5, 8, 7),
          i < 2 ? matB : matA
        );
        m.position.set((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 14);
        m.scale.set(1 + Math.random(), 0.4 + Math.random() * 0.55, 0.7 + Math.random() * 0.65);
        g.add(m);
      }
      const belly = new THREE.Mesh(new THREE.SphereGeometry(10, 8, 6), matB);
      belly.position.y = -2.0;
      belly.scale.set(1.6, 0.3, 1.0);
      g.add(belly);
      if (stormy) {
        const shelf = new THREE.Mesh(new THREE.SphereGeometry(8, 7, 5), matB);
        shelf.position.set(0, -3.2, 2);
        shelf.scale.set(1.8, 0.25, 1.1);
        g.add(shelf);
      }
      g.userData.kind = stormy ? "storm" : golden ? "gold" : "cumulus";
    }
    g.userData.stormy = stormy;
    g.userData.bob = Math.random() * Math.PI * 2;
    g.userData.bobAmp = 0.4 + Math.random() * 1.2;
    return g;
  }

  while (cloudGroup.children.length) cloudGroup.remove(cloudGroup.children[0]);
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const c = makeCloud();
    const layer = Math.random();
    let y;
    if (c.userData.kind === "cirrus") y = 220 + Math.random() * 160;
    else if (c.userData.kind === "tower") y = 70 + Math.random() * 90;
    else if (layer < 0.5) y = 48 + Math.random() * 55;
    else if (layer < 0.8) y = 110 + Math.random() * 80;
    else y = 200 + Math.random() * 130;
    c.position.set((Math.random() - 0.5) * 1700, y, (Math.random() - 0.5) * 1700);
    c.userData.drift = 1.2 + Math.random() * 7.5;
    c.userData.baseY = y;
    c.scale.setScalar(0.55 + Math.random() * 1.55);
    cloudGroup.add(c);
  }

  function recycleClouds(dt) {
    const cx = craft.position.x;
    const cz = craft.position.z;
    const cy = craft.position.y;
    const maxR2 = CLOUD_RADIUS * CLOUD_RADIUS;
    const t = clock.elapsedTime;
    for (const c of cloudGroup.children) {
      c.position.x += c.userData.drift * dt;
      if (c.userData.baseY != null && c.userData.bob != null) {
        c.position.y = c.userData.baseY + Math.sin(t * 0.35 + c.userData.bob) * (c.userData.bobAmp || 0.8);
      }
      const dx = c.position.x - cx;
      const dz = c.position.z - cz;
      if (dx * dx + dz * dz > maxR2) {
        const ang = Math.random() * Math.PI * 2;
        const dist = CLOUD_RADIUS * (0.45 + Math.random() * 0.5);
        let y;
        if (c.userData.kind === "cirrus") y = Math.max(200, cy * 0.6) + Math.random() * 140;
        else if (c.userData.kind === "tower") y = Math.max(60, cy * 0.2) + Math.random() * 80;
        else {
          const layer = Math.random();
          y =
            layer < 0.5
              ? Math.max(45, cy * 0.15) + Math.random() * 60
              : layer < 0.8
                ? Math.max(90, cy * 0.35) + Math.random() * 90
                : Math.max(160, cy * 0.55) + Math.random() * 140;
        }
        c.position.set(cx + Math.cos(ang) * dist, y, cz + Math.sin(ang) * dist);
        c.userData.baseY = y;
      }
    }
  }

  function updateInfiniteWorld() {
    if (Math.abs(craft.position.x) > 4000 || Math.abs(craft.position.z) > 4000) {
      const ox = craft.position.x;
      const oz = craft.position.z;
      worldOffsetX += ox;
      worldOffsetZ += oz;
      craft.position.x = 0;
      craft.position.z = 0;
      camera.position.x -= ox;
      camera.position.z -= oz;
      for (const tree of treeGroup.children) {
        tree.position.x -= ox;
        tree.position.z -= oz;
      }
      for (const p of propGroup.children) {
        p.position.x -= ox;
        p.position.z -= oz;
      }
      for (const c of cloudGroup.children) {
        c.position.x -= ox;
        c.position.z -= oz;
      }
      for (const ring of rings) {
        ring.position.x -= ox;
        ring.position.z -= oz;
      }
      for (const p of exhaust) {
        p.mesh.position.x -= ox;
        p.mesh.position.z -= oz;
      }
      shiftCombat(ox, oz);
      rebuildTerrain(0, 0);
    }

    const nx = Math.round(craft.position.x / TERRAIN_SNAP) * TERRAIN_SNAP;
    const nz = Math.round(craft.position.z / TERRAIN_SNAP) * TERRAIN_SNAP;
    if (nx !== terrainAnchorX || nz !== terrainAnchorZ) {
      rebuildTerrain(nx, nz);
    }
    recycleTrees();
    recycleProps();
  }

  // Rings
  const rings = [];
  const ringGroup = new THREE.Group();
  scene.add(ringGroup);

  function clearRings() {
    while (ringGroup.children.length) {
      const r = ringGroup.children[0];
      ringGroup.remove(r);
      r.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
    rings.length = 0;
  }

  function spawnRing(x, y, z) {
    const g = new THREE.Group();
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe8a04a,
      emissive: 0x8a4a12,
      emissiveIntensity: 0.55,
      metalness: 0.55,
      roughness: 0.28,
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.58, 14, 48), rimMat);
    const outer = new THREE.Mesh(
      new THREE.TorusGeometry(8.6, 0.16, 10, 48),
      new THREE.MeshStandardMaterial({
        color: 0xc47830,
        emissive: 0x5a3010,
        emissiveIntensity: 0.35,
        metalness: 0.4,
        roughness: 0.4,
      })
    );
    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(7.5, 0.2, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0xfff0b0 })
    );
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.1, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.32 })
    );
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(6.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffc060,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    glow.name = "ringGlow";
    const spokeMat = new THREE.MeshStandardMaterial({
      color: 0xd4923a,
      emissive: 0x6a3810,
      emissiveIntensity: 0.35,
      metalness: 0.5,
      roughness: 0.35,
    });
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 14.2), spokeMat);
      spoke.rotation.z = (i / 4) * Math.PI;
      g.add(spoke);
    }
    const beadMat = new THREE.MeshStandardMaterial({
      color: 0xf0d878,
      emissive: 0xa07018,
      emissiveIntensity: 0.65,
      metalness: 0.55,
      roughness: 0.25,
    });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 7, 7), beadMat);
      bead.position.set(Math.cos(a) * 7.5, Math.sin(a) * 7.5, 0);
      g.add(bead);
    }
    g.add(torus, outer, inner, halo, glow);
    const ground = surfaceHeight(x, z);
    const ry = y != null ? y : ground + 28 + Math.random() * 45;
    g.position.set(x, Math.max(ry, ground + 18), z);
    g.rotation.y = Math.random() * Math.PI;
    g.userData = { taken: false, spin: Math.random() * Math.PI * 2, pulse: Math.random() * Math.PI * 2 };
    ringGroup.add(g);
    rings.push(g);
  }

  function ensureRings() {
    forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
    right.set(1, 0, 0).applyQuaternion(craft.quaternion);
    up.set(0, 1, 0).applyQuaternion(craft.quaternion);

    for (let i = rings.length - 1; i >= 0; i--) {
      tmp.copy(rings[i].position).sub(craft.position);
      const along = tmp.dot(forward);
      const dist = tmp.length();
      if (along < -40 || dist > 2200 || (rings[i].userData.taken && along < 20)) {
        ringGroup.remove(rings[i]);
        rings.splice(i, 1);
      }
    }

    let farthest = 0;
    for (const ring of rings) {
      tmp.copy(ring.position).sub(craft.position);
      farthest = Math.max(farthest, tmp.dot(forward));
    }

    let guard = 0;
    while (farthest < 1800 && rings.length < 18 && guard++ < 12) {
      farthest += 140 + Math.random() * 70;
      const lateral = (Math.random() - 0.5) * 70;
      const vertical = (Math.random() - 0.5) * 36;
      tmp.copy(craft.position)
        .addScaledVector(forward, farthest)
        .addScaledVector(right, lateral)
        .addScaledVector(up, vertical);
      const ground = surfaceHeight(tmp.x, tmp.z);
      tmp.y = Math.max(tmp.y, ground + 26 + Math.random() * 30);
      spawnRing(tmp.x, tmp.y, tmp.z);
    }
  }

  // Plane craft
  const craft = new THREE.Group();
  scene.add(craft);

  const flight = {
    velocity: new THREE.Vector3(0, 0, -90),
    speed: 90,
    roll: 0,
    pitch: 0,
    yaw: 0,
    grounded: false,
    prevY: 40,
    airGrace: 0,
    skipGrace: 0,
    skipImpulse: new THREE.Vector3(),
  };

  const WHEEL_CLEARANCE = 2.05;

  const camOffset = new THREE.Vector3(0, 8, 22);
  const camLook = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const mouseNdc = new THREE.Vector2(0, 0);
  const softMouse = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const aimTarget = new THREE.Vector3();
  const aimPlane = new THREE.Plane();
  const desiredFwd = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const steerQuat = new THREE.Quaternion();
  const bankQuat = new THREE.Quaternion();
  const lookMatrix = new THREE.Matrix4();
  const camDir = new THREE.Vector3();
  const bankAxis = new THREE.Vector3(0, 0, 1);
  const pitchAxis = new THREE.Vector3(1, 0, 0);
  const flatAim = new THREE.Vector3();

  function disposeCraft() {
    while (craft.children.length) {
      const c = craft.children[0];
      craft.remove(c);
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    }
  }

  function buildCraft(spec) {
    disposeCraft();
    const loadout = spec && spec.tier ? spec : getPlayerLoadout();
    assembleFighter(craft, loadout.colors, {
      guns: true,
      gear: true,
      glow: true,
      variant: loadout.variant,
      scale: loadout.scale,
    });
  }

  // Exhaust particles (simple sprites via meshes)
  const exhaust = [];
  const exhaustPool = new THREE.Group();
  scene.add(exhaustPool);
  const exhaustMat = new THREE.MeshBasicMaterial({ color: 0xeef4f8, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 72; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.35, 5, 5), exhaustMat.clone());
    p.visible = false;
    exhaustPool.add(p);
    exhaust.push({ mesh: p, life: 0, smoke: false });
  }

  function emitExhaust(dt) {
    if (boost >= 0.05 || flight.speed >= 100) {
      for (const p of exhaust) {
        if (p.life <= 0) {
          p.life = 0.35 + Math.random() * 0.25;
          craft.getWorldPosition(tmp);
          forward.set(0, 0, 1).applyQuaternion(craft.quaternion);
          p.mesh.position.copy(tmp).addScaledVector(forward, 4 + Math.random());
          p.mesh.position.x += (Math.random() - 0.5) * 0.6;
          p.mesh.position.y += (Math.random() - 0.5) * 0.6;
          p.mesh.visible = true;
          p.mesh.material.opacity = 0.45 + boost * 0.4;
          p.mesh.material.color.setHex(0xeef4f8);
          p.mesh.scale.setScalar(0.6 + Math.random());
          if (p.vel) p.vel.set(0, 0, 0);
          break;
        }
      }
    }
    for (const p of exhaust) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.vel && p.vel.lengthSq() > 0.01) {
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= (p.smoke ? 6 : 28) * dt;
        p.vel.multiplyScalar(p.smoke ? 0.98 : 0.96);
        if (p.smoke) p.mesh.scale.multiplyScalar(1 + dt * 0.9);
      } else {
        p.mesh.scale.multiplyScalar(1 + dt * 2);
      }
      p.mesh.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        p.mesh.visible = false;
        if (p.vel) p.vel.set(0, 0, 0);
      }
    }
  }

  // ——— Combat: guns + Grok AI wingmen ———
  const ENEMY_COLORS = [
    { body: 0x2b2f36, wing: 0x1a1d22, accent: 0xc44b4b, canopy: 0x0a1018 },
    { body: 0x3a2a2a, wing: 0x2a1818, accent: 0xf0d878, canopy: 0x100808 },
    { body: 0x243044, wing: 0x1a2430, accent: 0x6eb8d8, canopy: 0x081018 },
  ];
  const ALLY_COLORS = [
    { body: 0xd4a574, wing: 0xb8895c, accent: 0x3d6b8c, canopy: 0x1a2834 },
    { body: 0xe8eef2, wing: 0xc5d0d8, accent: 0xe8a04a, canopy: 0x2a4a62 },
    { body: 0x6eb8d8, wing: 0x4a90b0, accent: 0xf0d878, canopy: 0x102030 },
  ];
  const WINGMAN_NAMES = ["Ace", "Rook", "Sparrow"];
  const GROK_QUIPS = [
    "Grok AI: locks acquired.",
    "Grok AI: you fly cute.",
    "Grok AI: on your six.",
    "Grok AI: lead computed.",
    "Grok AI: try harder.",
    "Grok AI: your squad is soft.",
  ];

  const enemies = [];
  const allies = [];
  const bullets = [];
  const enemyGroup = new THREE.Group();
  const allyGroup = new THREE.Group();
  const bulletGroup = new THREE.Group();
  scene.add(enemyGroup);
  scene.add(allyGroup);
  scene.add(bulletGroup);

  const bulletGeo = new THREE.SphereGeometry(0.22, 6, 6);
  const tracerGeo = new THREE.CylinderGeometry(0.06, 0.14, 3.8, 5);
  tracerGeo.rotateX(Math.PI / 2);
  const playerBulletMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
  const playerTracerMat = new THREE.MeshBasicMaterial({
    color: 0xe8a04a,
    transparent: true,
    opacity: 0.7,
  });
  const enemyBulletMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
  const enemyTracerMat = new THREE.MeshBasicMaterial({
    color: 0xc44b4b,
    transparent: true,
    opacity: 0.65,
  });
  const muzzleFlashMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c0,
    transparent: true,
    opacity: 0.9,
  });
  const aimTmp = new THREE.Vector3();
  const enemyFwd = new THREE.Vector3();
  const enemyRight = new THREE.Vector3();
  const enemyUp = new THREE.Vector3();
  const enemySteer = new THREE.Quaternion();
  const enemyMat4 = new THREE.Matrix4();

  function makeBulletMesh(friendly) {
    const g = new THREE.Group();
    const core = new THREE.Mesh(bulletGeo, friendly ? playerBulletMat : enemyBulletMat);
    const streak = new THREE.Mesh(tracerGeo, friendly ? playerTracerMat : enemyTracerMat);
    streak.position.z = 1.6;
    g.add(core, streak);
    return g;
  }

  function muzzleFlash(origin, quat) {
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.55 + Math.random() * 0.35, 6, 6),
      muzzleFlashMat.clone()
    );
    flash.position.copy(origin);
    enemyFwd.set(0, 0, -1).applyQuaternion(quat);
    flash.position.addScaledVector(enemyFwd, 2.2);
    flash.scale.set(1, 0.55, 1.6);
    bulletGroup.add(flash);
    // reuse bullet list with life-only flash marker
    bullets.push({
      mesh: flash,
      vel: enemyFwd.clone().multiplyScalar(40),
      life: 0.06,
      friendly: true,
      damage: 0,
      flash: true,
    });
  }

  function hitSpark(pos, friendly) {
    for (let i = 0; i < 10; i++) {
      const p = exhaust.find((e) => e.life <= 0);
      if (!p) break;
      p.life = 0.16 + Math.random() * 0.22;
      p.smoke = false;
      p.mesh.position.copy(pos);
      p.mesh.visible = true;
      p.mesh.material.opacity = 0.95;
      p.mesh.material.color.setHex(
        i < 3 ? 0xfff2c8 : friendly ? 0xffc878 : 0xff8080
      );
      p.mesh.scale.setScalar(0.35 + Math.random() * 0.85);
      if (!p.vel) p.vel = new THREE.Vector3();
      p.vel.set(
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 55,
        (Math.random() - 0.5) * 55
      );
    }
  }

  function explodeAt(pos) {
    // Bright flash core
    for (let i = 0; i < 4; i++) {
      const p = exhaust.find((e) => e.life <= 0);
      if (!p) break;
      p.life = 0.2 + Math.random() * 0.15;
      p.smoke = false;
      p.mesh.position.copy(pos);
      p.mesh.visible = true;
      p.mesh.material.opacity = 1;
      p.mesh.material.color.setHex(0xfff0c0);
      p.mesh.scale.setScalar(2.2 + Math.random() * 2.5);
      if (!p.vel) p.vel = new THREE.Vector3();
      p.vel.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    }
    // Fire / ember debris
    for (let i = 0; i < 22; i++) {
      const p = exhaust.find((e) => e.life <= 0);
      if (!p) break;
      p.life = 0.45 + Math.random() * 0.55;
      p.smoke = false;
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 2;
      p.mesh.position.y += (Math.random() - 0.5) * 2;
      p.mesh.position.z += (Math.random() - 0.5) * 2;
      p.mesh.visible = true;
      p.mesh.material.opacity = 0.9;
      const roll = Math.random();
      p.mesh.material.color.setHex(roll > 0.65 ? 0xffe090 : roll > 0.3 ? 0xe8a04a : 0xc44b4b);
      p.mesh.scale.setScalar(0.7 + Math.random() * 2.2);
      if (!p.vel) p.vel = new THREE.Vector3();
      p.vel.set(
        (Math.random() - 0.5) * 55,
        12 + Math.random() * 42,
        (Math.random() - 0.5) * 55
      );
    }
    // Dark smoke that hangs
    for (let i = 0; i < 12; i++) {
      const p = exhaust.find((e) => e.life <= 0);
      if (!p) break;
      p.life = 0.8 + Math.random() * 0.7;
      p.smoke = true;
      p.mesh.position.copy(pos);
      p.mesh.position.x += (Math.random() - 0.5) * 3;
      p.mesh.position.y += Math.random() * 2;
      p.mesh.position.z += (Math.random() - 0.5) * 3;
      p.mesh.visible = true;
      p.mesh.material.opacity = 0.55;
      p.mesh.material.color.setHex(Math.random() > 0.5 ? 0x4a4a4a : 0x2a2a2a);
      p.mesh.scale.setScalar(1.5 + Math.random() * 2.5);
      if (!p.vel) p.vel = new THREE.Vector3();
      p.vel.set(
        (Math.random() - 0.5) * 12,
        4 + Math.random() * 10,
        (Math.random() - 0.5) * 12
      );
    }
  }

  function assembleFighter(group, colors, { guns = true, gear = false, glow = false, variant = 0, scale = 1 } = {}) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors.body, metalness: 0.32, roughness: 0.42, flatShading: true });
    const wingMat = new THREE.MeshStandardMaterial({ color: colors.wing, metalness: 0.22, roughness: 0.48, flatShading: true });
    const accentMat = new THREE.MeshStandardMaterial({ color: colors.accent, metalness: 0.45, roughness: 0.38, flatShading: true });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: colors.canopy,
      metalness: 0.85,
      roughness: 0.12,
      flatShading: true,
      transparent: true,
      opacity: 0.72,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, metalness: 0.5, roughness: 0.45, flatShading: true });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2a2e34, metalness: 0.55, roughness: 0.4, flatShading: true });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, flatShading: true });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xb0b6bc, metalness: 0.7, roughness: 0.35, flatShading: true });
    const lightRed = new THREE.MeshBasicMaterial({ color: 0xc44b4b });
    const lightGreen = new THREE.MeshBasicMaterial({ color: 0x3dba6a });
    const lightWhite = new THREE.MeshBasicMaterial({ color: 0xf2f2f0 });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.52, 2.0, 12), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -4.7;
    nose.castShadow = true;
    group.add(nose);

    const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), accentMat);
    spinner.scale.set(1, 1, 1.35);
    spinner.position.z = -5.55;
    group.add(spinner);

    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 2.4, 12), bodyMat);
    fore.rotation.x = Math.PI / 2;
    fore.position.z = -3.0;
    fore.castShadow = true;
    group.add(fore);

    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 2.6, 12), bodyMat);
    mid.rotation.x = Math.PI / 2;
    mid.position.z = -0.5;
    mid.castShadow = true;
    group.add(mid);

    const aft = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.42, 2.8, 12), bodyMat);
    aft.rotation.x = Math.PI / 2;
    aft.position.z = 2.2;
    aft.castShadow = true;
    group.add(aft);

    const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.1, 10), bodyMat);
    tailCone.rotation.x = Math.PI / 2;
    tailCone.position.z = 4.0;
    group.add(tailCone);

    for (let i = 0; i < 5; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.72 - i * 0.04, 0.025, 6, 16), darkMat);
      ring.position.z = -3.4 + i * 1.35;
      group.add(ring);
    }

    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.4), darkMat);
    intake.position.set(0, -0.7, -1.8);
    group.add(intake);

    [-0.35, 0.35].forEach((x) => {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 6), darkMat);
      stack.rotation.z = Math.PI / 2;
      stack.rotation.y = 0.4;
      stack.position.set(x * 1.4, -0.15, -2.4);
      group.add(stack);
    });

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.78, 12, 10), canopyMat);
    canopy.scale.set(0.95, 0.72, 1.55);
    canopy.position.set(0, 0.62, -1.0);
    group.add(canopy);

    const windscreen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.08), canopyMat);
    windscreen.position.set(0, 0.7, -2.05);
    windscreen.rotation.x = -0.35;
    group.add(windscreen);

    [-0.42, 0.42].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 2.0), frameMat);
      rail.position.set(x, 0.95, -1.0);
      group.add(rail);
    });

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 5), darkMat);
    mast.position.set(0, 1.35, 0.4);
    group.add(mast);

    const mainWing = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.16, 2.4), wingMat);
    mainWing.position.set(0, 0, -0.35);
    mainWing.castShadow = true;
    group.add(mainWing);

    [-1, 1].forEach((side) => {
      const root = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.35, 2.0), wingMat);
      root.position.set(side * 1.1, -0.05, -0.35);
      group.add(root);

      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 1.6), wingMat);
      tip.position.set(side * 5.5, 0.02, -0.2);
      tip.rotation.z = side * -0.25;
      group.add(tip);

      const aileron = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 0.55), darkMat);
      aileron.position.set(side * 3.8, -0.02, 0.85);
      group.add(aileron);

      const flap = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.5), darkMat);
      flap.position.set(side * 1.6, -0.02, 0.9);
      group.add(flap);

      const le = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.08, 0.2), accentMat);
      le.position.set(side * 2.8, 0.08, -1.4);
      group.add(le);

      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.9), darkMat);
      pylon.position.set(side * 2.4, -0.35, -0.2);
      group.add(pylon);
    });

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(11.3, 0.05, 0.28), accentMat);
    stripe.position.set(0, 0.12, -0.35);
    group.add(stripe);

    const navL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), lightRed);
    navL.position.set(-5.6, 0.08, -0.2);
    group.add(navL);
    const navR = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), lightGreen);
    navR.position.set(5.6, 0.08, -0.2);
    group.add(navR);
    const navT = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), lightWhite);
    navT.position.set(0, 1.55, 3.2);
    group.add(navT);

    // —— Markings & cockpit details ——
    const paintMat = new THREE.MeshStandardMaterial({
      color: colors.accent,
      metalness: 0.2,
      roughness: 0.55,
      flatShading: true,
    });
    const stencilMat = new THREE.MeshStandardMaterial({
      color: 0xf0f2f4,
      metalness: 0.15,
      roughness: 0.6,
      flatShading: true,
    });

    // Fuselage roundels
    [-1, 1].forEach((side) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), paintMat);
      disc.position.set(side * 0.79, 0.15, 0.4);
      disc.rotation.y = side * (Math.PI / 2);
      group.add(disc);
      const inner = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), stencilMat);
      inner.position.set(side * 0.8, 0.15, 0.4);
      inner.rotation.y = side * (Math.PI / 2);
      group.add(inner);
    });

    // Wing roundels (upper)
    [-1, 1].forEach((side) => {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), paintMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(side * 3.2, 0.12, -0.35);
      group.add(disc);
    });

    // Serial / stencil block on aft fuselage
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.7), stencilMat);
    plate.position.set(0.76, 0.2, 1.6);
    group.add(plate);
    for (let i = 0; i < 3; i++) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.12), darkMat);
      dash.position.set(0.78, 0.28 - i * 0.1, 1.45 + i * 0.08);
      group.add(dash);
    }

    // Headrest / seat under canopy
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.45), darkMat);
    seat.position.set(0, 0.35, -0.55);
    group.add(seat);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.18), frameMat);
    headrest.position.set(0, 0.7, -0.25);
    group.add(headrest);

    // Pitot tube
    const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), hubMat);
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(-1.4, 0.05, -1.9);
    group.add(pitot);

    // Canopy mirror
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), hubMat);
    mirror.position.set(0, 1.05, -1.85);
    mirror.rotation.x = -0.4;
    group.add(mirror);

    // Cowling cooling vents
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.35, 0.06), darkMat);
      vent.position.set(0.55, 0.05, -3.6 + i * 0.22);
      group.add(vent);
      const ventL = vent.clone();
      ventL.position.x = -0.55;
      group.add(ventL);
    }

    // Panel lines & rivet strips along the fuselage
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1c2228,
      metalness: 0.4,
      roughness: 0.55,
      flatShading: true,
    });
    for (let i = 0; i < 6; i++) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.015, 0.03), panelMat);
      seam.position.set(0, 0.55, -3.2 + i * 1.05);
      group.add(seam);
      const seamB = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.015, 0.03), panelMat);
      seamB.position.set(0, -0.45, -2.8 + i * 0.95);
      group.add(seamB);
    }
    // Wing rib / rivet hints
    [-1, 1].forEach((side) => {
      for (let i = 0; i < 5; i++) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 2.1), panelMat);
        rib.position.set(side * (1.6 + i * 0.85), 0.1, -0.35);
        group.add(rib);
      }
      const tipLightFairing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.55), darkMat);
      tipLightFairing.position.set(side * 5.35, 0.06, -0.55);
      group.add(tipLightFairing);
    });
    // Oil cooler under nose
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.85), darkMat);
    cooler.position.set(0, -0.72, -3.5);
    group.add(cooler);
    for (let i = 0; i < 5; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.04), panelMat);
      slot.position.set(-0.24 + i * 0.12, -0.72, -3.85);
      group.add(slot);
    }
    // Antenna wire from mast to fin
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.4, 4), hubMat);
    wire.position.set(0, 1.55, 1.7);
    wire.rotation.x = 0.55;
    group.add(wire);

    const hStab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 1.15), wingMat);
    hStab.position.set(0, 0.15, 3.15);
    group.add(hStab);

    [-1, 1].forEach((side) => {
      const elev = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.4), darkMat);
      elev.position.set(side * 1.3, 0.12, 3.65);
      group.add(elev);
    });

    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.85, 1.45), wingMat);
    fin.position.set(0, 1.05, 3.05);
    group.add(fin);

    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.3, 0.45), accentMat);
    rudder.position.set(0, 1.1, 3.75);
    group.add(rudder);

    const prop = new THREE.Group();
    prop.name = "prop";
    prop.position.z = -5.5;
    for (let i = 0; i < 3; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.5, 0.32), accentMat);
      blade.position.y = 0.15;
      blade.rotation.y = 0.22;
      arm.add(blade);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.18), darkMat);
      tip.position.y = 1.35;
      arm.add(tip);
      prop.add(arm);
    }
    const propHub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), hubMat);
    propHub.rotation.x = Math.PI / 2;
    prop.add(propHub);
    prop.children.forEach((arm) => {
      if (!arm.isGroup) return;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.35, 6), hubMat);
      cuff.position.y = 0.35;
      arm.add(cuff);
    });
    group.add(prop);

    if (glow) {
      const boostGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xe8a04a, transparent: true, opacity: 0 })
      );
      boostGlow.position.set(0, 0, 4.2);
      boostGlow.name = "boostGlow";
      group.add(boostGlow);
    }

    if (guns) {
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x3a3f46, metalness: 0.65, roughness: 0.32, flatShading: true });
      [-3.3, 3.3].forEach((x) => {
        const fairing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 1.1), darkMat);
        fairing.position.set(x, -0.12, -0.9);
        group.add(fairing);
        const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 8), gunMat);
        gun.rotation.x = Math.PI / 2;
        gun.position.set(x, -0.15, -1.55);
        group.add(gun);
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.2, 8), hubMat);
        muzzle.rotation.x = Math.PI / 2;
        muzzle.position.set(x, -0.15, -2.5);
        group.add(muzzle);
      });
    }

    if (gear) {
      function addWheel(x, y, z, scale = 1) {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.09 * scale, 1.15 * scale, 6), darkMat);
        strut.position.y = 0.35 * scale;
        g.add(strut);
        const door = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.06, 0.9 * scale), wingMat);
        door.position.set(x > 0 ? 0.25 * scale : x < 0 ? -0.25 * scale : 0, 0.5 * scale, 0);
        door.rotation.z = x === 0 ? 0 : x > 0 ? 0.5 : -0.5;
        g.add(door);
        const wheel = new THREE.Group();
        wheel.name = "wheel";
        wheel.position.y = -0.15 * scale;
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.38 * scale, 0.22 * scale, 14), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.26 * scale, 10), hubMat);
        hub.rotation.z = Math.PI / 2;
        wheel.add(tire, hub);
        g.add(wheel);
        group.add(g);
      }
      addWheel(-1.15, -1.15, 0.35, 1);
      addWheel(1.15, -1.15, 0.35, 1);
      addWheel(0, -1.05, -2.6, 0.72);
    }

    // Evolution extras — airframe morphs as you upgrade
    if (variant >= 1) {
      // Reinforced nose ring
      const noseRing = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.06, 6, 16), accentMat);
      noseRing.position.z = -5.1;
      group.add(noseRing);
    }
    if (variant >= 2) {
      // Swept canards
      [-1, 1].forEach((side) => {
        const canard = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.7), wingMat);
        canard.position.set(side * 1.1, 0.15, -3.2);
        canard.rotation.y = side * 0.35;
        canard.rotation.z = side * -0.15;
        group.add(canard);
      });
      // Extra gun pods
      if (guns) {
        [-4.2, 4.2].forEach((x) => {
          const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.4, 6), darkMat);
          pod.rotation.x = Math.PI / 2;
          pod.position.set(x, -0.2, -0.8);
          group.add(pod);
        });
      }
    }
    if (variant >= 3) {
      // Twin intake scoops + dorsal spine
      [-1, 1].forEach((side) => {
        const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 1.6), darkMat);
        scoop.position.set(side * 0.55, -0.55, -2.2);
        group.add(scoop);
      });
      const spine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 4.5), accentMat);
      spine.position.set(0, 0.85, 0.2);
      group.add(spine);
      // 4-blade prop hint: extra thin blades
      const propObj = group.getObjectByName("prop");
      if (propObj) {
        for (let i = 0; i < 1; i++) {
          const arm = new THREE.Group();
          arm.rotation.z = Math.PI / 6;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.22), darkMat);
          blade.position.y = 0.1;
          arm.add(blade);
          propObj.add(arm);
        }
      }
    }
    if (variant >= 4) {
      // Apex Phantom — sleek fins, afterburner ring, stealth edge
      [-1, 1].forEach((side) => {
        const bladeFin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 2.2), darkMat);
        bladeFin.position.set(side * 0.7, 0.4, 2.4);
        bladeFin.rotation.z = side * 0.4;
        group.add(bladeFin);
      });
      const ab = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.08, 8, 20),
        new THREE.MeshBasicMaterial({ color: colors.accent })
      );
      ab.position.z = 4.3;
      group.add(ab);
      const stealth = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.06, 0.35), frameMat);
      stealth.position.set(0, -0.05, 0.4);
      group.add(stealth);
    }

    if (scale !== 1) group.scale.setScalar(scale);
  }

  function saveTeamProgress() {
    localStorage.setItem("sky-drift-scrap", String(scrap));
    localStorage.setItem("sky-drift-team", JSON.stringify(teamUpgrades));
    localStorage.setItem("sky-drift-plane", JSON.stringify(playerUpgrades));
    scrapEl.textContent = String(scrap);
    menuScrapEl.textContent = String(scrap);
  }

  function allyStats() {
    return {
      maxHp: 38 + teamUpgrades.armor * 14,
      damage: 9 + teamUpgrades.guns * 3.5,
      skill: Math.min(0.92, 0.42 + teamUpgrades.skill * 0.1),
      reaction: Math.min(0.95, 0.45 + teamUpgrades.skill * 0.08),
      speed: 72 + teamUpgrades.speed * 9,
      slots: Math.max(0, Math.min(3, teamUpgrades.slots | 0)),
    };
  }

  const PLANE_UPGRADE_DEFS = [
    { key: "hull", label: "Hull plating", max: 5, cost: (lv) => 14 + lv * 15, desc: (lv) => `HP ${100 + lv * 18}` },
    { key: "guns", label: "Cannons", max: 5, cost: (lv) => 14 + lv * 15, desc: (lv) => `Dmg ${Math.round(12 + lv * 3.5)}` },
    { key: "engine", label: "Engine", max: 5, cost: (lv) => 14 + lv * 15, desc: (lv) => `Thrust +${lv}` },
    { key: "avionics", label: "Avionics", max: 5, cost: (lv) => 16 + lv * 16, desc: (lv) => `Handling +${lv}` },
  ];

  const UPGRADE_DEFS = [
    { key: "slots", label: "Wingman slots", max: 3, cost: (lv) => [0, 20, 55, 110][lv + 1] || 999, desc: (lv) => `${lv}/3 in the air` },
    { key: "armor", label: "Squad armor", max: 5, cost: (lv) => 12 + lv * 14, desc: (lv) => `HP ${38 + lv * 14}` },
    { key: "guns", label: "Squad guns", max: 5, cost: (lv) => 12 + lv * 14, desc: (lv) => `Dmg ${Math.round(9 + lv * 3.5)}` },
    { key: "skill", label: "Pilot drill", max: 5, cost: (lv) => 15 + lv * 16, desc: (lv) => `Aim Lv ${lv}` },
    { key: "speed", label: "Engine tune", max: 5, cost: (lv) => 12 + lv * 13, desc: (lv) => `Spd ${72 + lv * 9}` },
  ];

  function fillUpgradeList(listEl, defs, store, onChange) {
    listEl.innerHTML = "";
    defs.forEach((def) => {
      const lv = store[def.key] | 0;
      const atMax = lv >= def.max;
      const price = atMax ? 0 : def.cost(lv);
      const row = document.createElement("div");
      row.className = "upgrade-row";
      const info = document.createElement("div");
      info.innerHTML = `<div>${def.label}</div><div class="meta">${def.desc(lv)}</div>`;
      const cost = document.createElement("div");
      cost.className = "meta";
      cost.textContent = atMax ? "MAX" : `${price} scrap`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = atMax ? "Maxed" : "Upgrade";
      btn.disabled = atMax || scrap < price;
      btn.addEventListener("click", () => {
        if (atMax || scrap < price) return;
        scrap -= price;
        store[def.key] = lv + 1;
        saveTeamProgress();
        onChange();
      });
      row.append(info, cost, btn);
      listEl.appendChild(row);
    });
  }

  function updateAirframeLabel() {
    const loadout = getPlayerLoadout();
    const el = document.getElementById("airframe-label");
    if (el) {
      const next = PLANE_TIERS.find((t) => t.need > playerUpgradeTotal());
      el.textContent = next
        ? `Airframe · ${loadout.tier.name}  ·  ${playerUpgradeTotal()}/${next.need} to ${next.name}`
        : `Airframe · ${loadout.tier.name}  ·  MAX EVOLUTION`;
    }
    const brand = document.querySelector(".brand");
    if (brand && state === "play") brand.textContent = loadout.name.toUpperCase();
  }

  function renderUpgrades() {
    const planeList = document.getElementById("plane-upgrade-list");
    menuScrapEl.textContent = String(scrap);
    scrapEl.textContent = String(scrap);
    if (planeList) {
      fillUpgradeList(planeList, PLANE_UPGRADE_DEFS, playerUpgrades, () => {
        renderUpgrades();
        buildCraft(getPlayerLoadout());
        updateAirframeLabel();
      });
    }
    fillUpgradeList(upgradeList, UPGRADE_DEFS, teamUpgrades, () => renderUpgrades());
    updateAirframeLabel();
  }

  function disposeUnitMesh(mesh, group) {
    group.remove(mesh);
    mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
  }

  function clearCombat() {
    while (enemies.length) {
      const e = enemies.pop();
      disposeUnitMesh(e.mesh, enemyGroup);
    }
    while (allies.length) {
      const a = allies.pop();
      disposeUnitMesh(a.mesh, allyGroup);
    }
    while (bullets.length) {
      const b = bullets.pop();
      bulletGroup.remove(b.mesh);
    }
    while (bulletGroup.children.length) bulletGroup.remove(bulletGroup.children[0]);
    allyRespawnTimer = 0;
  }

  function makePilotState(mesh, name, stats, team) {
    return {
      mesh,
      team,
      name,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      speed: stats.speed,
      damage: stats.damage,
      skill: stats.skill,
      reaction: stats.reaction,
      cooldown: 0.8 + Math.random(),
      mode: "attack",
      modeTimer: 1.5 + Math.random() * 2,
      bank: 0,
      aimSmooth: mesh.position.clone(),
      jitter: new THREE.Vector3(),
      burstLeft: 0,
      burstPause: 0.5 + Math.random(),
      mistakeTimer: 1 + Math.random() * 2,
      formSide: team === "ally" ? (allies.length % 2 === 0 ? -1 : 1) : 0,
    };
  }

  function spawnEnemy(index = enemies.length) {
    const mesh = new THREE.Group();
    assembleFighter(mesh, ENEMY_COLORS[index % ENEMY_COLORS.length], { guns: true });
    const ang = Math.random() * Math.PI * 2;
    const dist = 240 + Math.random() * 160;
    const x = craft.position.x + Math.cos(ang) * dist;
    const z = craft.position.z + Math.sin(ang) * dist;
    const y = Math.max(surfaceHeight(x, z) + 35, craft.position.y + (Math.random() - 0.3) * 40);
    mesh.position.set(x, y, z);
    mesh.lookAt(craft.position);
    enemyGroup.add(mesh);
    const stats = {
      maxHp: 40,
      speed: 68 + Math.random() * 22,
      damage: 7,
      skill: 0.35 + Math.random() * 0.45,
      reaction: 0.35 + Math.random() * 0.55,
    };
    enemies.push(
      makePilotState(mesh, index === 0 ? "Grok" : `Grok-${index + 1}`, stats, "enemy")
    );
  }

  function spawnAlly(index = allies.length) {
    const stats = allyStats();
    if (allies.length >= stats.slots) return;
    const mesh = new THREE.Group();
    assembleFighter(mesh, ALLY_COLORS[index % ALLY_COLORS.length], { guns: true });
    const side = index % 2 === 0 ? -1 : 1;
    const x = craft.position.x + side * (28 + index * 8);
    const z = craft.position.z + 35 + index * 12;
    const y = craft.position.y + 6;
    mesh.position.set(x, y, z);
    mesh.quaternion.copy(craft.quaternion);
    allyGroup.add(mesh);
    const unit = makePilotState(
      mesh,
      WINGMAN_NAMES[index % WINGMAN_NAMES.length],
      stats,
      "ally"
    );
    unit.formSide = side;
    allies.push(unit);
    alliesAliveEl.textContent = String(allies.length);
  }

  function showGrokBanner(text) {
    grokBanner.textContent = text;
    grokBanner.classList.add("show");
    grokTauntTimer = 2.4;
  }

  function fireBullet(origin, quat, friendly, spread = 0, damage = null) {
    const mesh = makeBulletMesh(friendly);
    mesh.position.copy(origin);
    enemyFwd.set(0, 0, -1).applyQuaternion(quat);
    if (spread > 0) {
      enemyFwd.x += (Math.random() - 0.5) * spread;
      enemyFwd.y += (Math.random() - 0.5) * spread;
      enemyFwd.z += (Math.random() - 0.5) * spread * 0.35;
      enemyFwd.normalize();
    }
    mesh.position.addScaledVector(enemyFwd, 6);
    mesh.quaternion.copy(quat);
    bulletGroup.add(mesh);
    bullets.push({
      mesh,
      vel: enemyFwd.clone().multiplyScalar(friendly ? 320 : 240 + Math.random() * 40),
      life: friendly ? 1.6 : 1.25,
      friendly,
      damage: damage != null ? damage : friendly ? 12 : 7,
      flash: false,
    });
    if (friendly || Math.random() < 0.35) muzzleFlash(origin, quat);
  }

  function tryPlayerFire(dt) {
    fireCooldown -= dt;
    const wantFire = firing || keys.has("f") || keys.has("F");
    if (!wantFire || fireCooldown > 0 || flight.grounded || state !== "play") return;
    const loadout = getPlayerLoadout();
    fireCooldown = loadout.fireRate;
    const dmg = loadout.damage;
    enemyRight.set(1, 0, 0).applyQuaternion(craft.quaternion);
    const offsets = loadout.variant >= 2 ? [3.2, -3.2, 4.2, -4.2] : [3.2, -3.2];
    for (const ox of offsets) {
      aimTmp.copy(craft.position).addScaledVector(enemyRight, ox);
      fireBullet(aimTmp, craft.quaternion, true, 0, dmg);
    }
  }

  function damagePlayer(amount) {
    playerHp -= amount;
    const maxHp = getPlayerLoadout().maxHp;
    hpBar.style.width = `${Math.max(0, Math.round((playerHp / maxHp) * 100))}%`;
    if (playerHp <= 0) {
      explodeAt(craft.position);
      endGame(true);
    }
  }

  function addScrap(n) {
    scrap += n;
    saveTeamProgress();
  }

  function destroyEnemy(index) {
    const e = enemies[index];
    if (!e) return;
    explodeAt(e.mesh.position);
    disposeUnitMesh(e.mesh, enemyGroup);
    enemies.splice(index, 1);
    kills += 1;
    score += 5;
    addScrap(6);
    killsEl.textContent = String(kills);
    scoreEl.textContent = String(score);
    showGrokBanner(kills === 1 ? "Grok AI: unit lost." : "Grok AI: adapting…");
    spawnEnemy(kills + enemies.length);
  }

  function destroyAlly(index) {
    const a = allies[index];
    if (!a) return;
    explodeAt(a.mesh.position);
    disposeUnitMesh(a.mesh, allyGroup);
    allies.splice(index, 1);
    alliesAliveEl.textContent = String(allies.length);
    allyRespawnTimer = Math.max(allyRespawnTimer, 10);
    showGrokBanner(`${a.name} is down!`);
  }

  function pickHostileTarget(unit) {
    let best = null;
    let bestDist = Infinity;
    if (unit.team === "enemy") {
      const dPlayer = unit.mesh.position.distanceTo(craft.position);
      best = { kind: "player", dist: dPlayer };
      bestDist = dPlayer;
      for (const a of allies) {
        const d = unit.mesh.position.distanceTo(a.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          best = { kind: "ally", unit: a, dist: d };
        }
      }
    } else {
      for (const e of enemies) {
        const d = unit.mesh.position.distanceTo(e.mesh.position);
        if (d < bestDist) {
          bestDist = d;
          best = { kind: "enemy", unit: e, dist: d };
        }
      }
    }
    return best;
  }

  function getTargetPose(target) {
    if (!target) return null;
    if (target.kind === "player") {
      return { pos: craft.position, quat: craft.quaternion, speed: flight.speed };
    }
    return {
      pos: target.unit.mesh.position,
      quat: target.unit.mesh.quaternion,
      speed: target.unit.speed,
    };
  }

  function updatePilotAI(unit, dt) {
    const mesh = unit.mesh;
    const prop = mesh.getObjectByName("prop");
    if (prop) prop.rotation.z += dt * 22;

    unit.modeTimer -= dt;
    unit.mistakeTimer -= dt;
    if (unit.modeTimer <= 0) {
      const roll = Math.random();
      if (unit.team === "ally") {
        if (roll < 0.5) unit.mode = "attack";
        else if (roll < 0.75) unit.mode = "form";
        else if (roll < 0.9) unit.mode = "chase";
        else unit.mode = "evade";
      } else {
        if (roll < 0.45) unit.mode = "attack";
        else if (roll < 0.7) unit.mode = "chase";
        else if (roll < 0.88) unit.mode = "evade";
        else unit.mode = "wander";
      }
      unit.modeTimer = 1.2 + Math.random() * 3.5;
      if (unit.team === "enemy" && Math.random() < 0.14) {
        showGrokBanner(GROK_QUIPS[Math.floor(Math.random() * GROK_QUIPS.length)]);
      }
    }

    if (unit.mistakeTimer <= 0) {
      unit.mistakeTimer = 2.5 + Math.random() * 4;
      if (Math.random() < 0.35) {
        unit.mode = Math.random() < 0.5 ? "wander" : "evade";
        unit.modeTimer = 0.6 + Math.random();
      }
    }

    const target = pickHostileTarget(unit);
    const pose = getTargetPose(target);

    if (pose && (unit.mode === "attack" || unit.mode === "chase")) {
      const leadGuess = (0.08 + unit.skill * 0.22) * (0.7 + Math.random() * 0.6);
      aimTmp.copy(pose.pos);
      enemyFwd.set(0, 0, -1).applyQuaternion(pose.quat);
      aimTmp.addScaledVector(enemyFwd, pose.speed * leadGuess);
      aimTmp.y += (Math.random() - 0.5) * (12 - unit.skill * 8);
      if (unit.mode === "chase") {
        aimTmp.copy(pose.pos).addScaledVector(enemyFwd, unit.team === "ally" ? -30 : 40);
        aimTmp.y += 8;
      }
    } else if (unit.mode === "form" && unit.team === "ally") {
      enemyFwd.set(0, 0, -1).applyQuaternion(craft.quaternion);
      enemyRight.set(1, 0, 0).applyQuaternion(craft.quaternion);
      aimTmp
        .copy(craft.position)
        .addScaledVector(enemyRight, unit.formSide * 32)
        .addScaledVector(enemyFwd, 25)
        .addScaledVector(worldUp, 4);
    } else if (unit.mode === "evade") {
      aimTmp.copy(mesh.position);
      aimTmp.y += 25 + Math.random() * 20;
      aimTmp.x += Math.sin(clock.elapsedTime * 1.4 + unit.speed) * (40 + Math.random() * 40);
      aimTmp.z += Math.cos(clock.elapsedTime * 1.1 + unit.hp) * 30;
    } else {
      aimTmp.copy(mesh.position);
      aimTmp.x += Math.sin(clock.elapsedTime * 0.7 + unit.speed) * 80;
      aimTmp.z += Math.cos(clock.elapsedTime * 0.55 + unit.skill) * 80;
      aimTmp.y += Math.sin(clock.elapsedTime * 0.9) * 20;
    }

    unit.jitter.x = THREE.MathUtils.damp(unit.jitter.x, (Math.random() - 0.5) * 28, 2, dt);
    unit.jitter.y = THREE.MathUtils.damp(unit.jitter.y, (Math.random() - 0.5) * 16, 2, dt);
    unit.jitter.z = THREE.MathUtils.damp(unit.jitter.z, (Math.random() - 0.5) * 28, 2, dt);
    aimTmp.add(unit.jitter);

    const trackRate = (1.1 + unit.skill * 1.4) * unit.reaction;
    unit.aimSmooth.lerp(aimTmp, 1 - Math.exp(-trackRate * dt));

    enemyMat4.lookAt(mesh.position, unit.aimSmooth, worldUp);
    enemySteer.setFromRotationMatrix(enemyMat4);
    enemyFwd.set(0, 0, -1).applyQuaternion(mesh.quaternion);
    enemyRight.set(1, 0, 0).applyQuaternion(mesh.quaternion);
    flatAim.copy(unit.aimSmooth).sub(mesh.position);
    if (flatAim.lengthSq() > 0.0001) flatAim.normalize();
    const lateral = flatAim.dot(enemyRight);
    const targetBank = THREE.MathUtils.clamp(-lateral * (1.0 + unit.skill * 0.4), -1.0, 1.0);
    unit.bank = THREE.MathUtils.damp(unit.bank, targetBank, 4.5, dt);
    enemySteer.multiply(bankQuat.setFromAxisAngle(bankAxis, unit.bank));
    const turnSpeed = (0.85 + unit.skill * 0.9) * unit.reaction;
    mesh.quaternion.slerp(enemySteer, 1 - Math.exp(-turnSpeed * dt));

    const speedMul = unit.mode === "evade" ? 1.08 : unit.mode === "wander" || unit.mode === "form" ? 0.9 : 1;
    enemyFwd.set(0, 0, -1).applyQuaternion(mesh.quaternion);
    mesh.position.addScaledVector(enemyFwd, unit.speed * speedMul * dt);

    const gy = surfaceHeight(mesh.position.x, mesh.position.z);
    if (mesh.position.y < gy + 18) mesh.position.y = gy + 18;

    const anchor = unit.team === "ally" ? craft.position : craft.position;
    const distAnchor = mesh.position.distanceTo(anchor);
    if (distAnchor > 900) {
      const ang = Math.random() * Math.PI * 2;
      mesh.position.set(
        craft.position.x + Math.cos(ang) * (unit.team === "ally" ? 60 : 280),
        craft.position.y + 20,
        craft.position.z + Math.sin(ang) * (unit.team === "ally" ? 60 : 280)
      );
      unit.aimSmooth.copy(mesh.position);
    }

    const distTarget = target ? target.dist : 999;
    if (distTarget < 35 && unit.mode === "attack") {
      unit.mode = "evade";
      unit.modeTimer = 1 + Math.random();
      unit.burstLeft = 0;
      unit.burstPause = 0.6 + Math.random();
    }

    unit.cooldown -= dt;
    unit.burstPause -= dt;
    if (pose) {
      enemyFwd.set(0, 0, -1).applyQuaternion(mesh.quaternion);
      aimTmp.copy(pose.pos).sub(mesh.position).normalize();
      const align = enemyFwd.dot(aimTmp);
      const turningHard = Math.abs(unit.bank) > 0.55;
      const canSee =
        align > 0.88 + (1 - unit.skill) * 0.08 &&
        distTarget < 210 &&
        distTarget > 40 &&
        !turningHard &&
        unit.mode !== "wander" &&
        unit.mode !== "evade" &&
        unit.mode !== "form";

      if (unit.burstPause <= 0 && unit.burstLeft > 0) {
        if (unit.cooldown <= 0) {
          unit.cooldown = 0.14 + Math.random() * 0.1;
          unit.burstLeft -= 1;
          const spread = 0.12 + (1 - unit.skill) * 0.18 + (1 - align) * 0.35 + distTarget * 0.00035;
          const friendly = unit.team === "ally";
          if (Math.random() < 0.55 + unit.skill * 0.25) {
            fireBullet(mesh.position, mesh.quaternion, friendly, spread, unit.damage);
          }
          if (Math.random() < 0.35) {
            fireBullet(mesh.position, mesh.quaternion, friendly, spread * 1.4, unit.damage);
          }
          if (unit.burstLeft <= 0) unit.burstPause = 0.9 + Math.random() * 1.6;
        }
      } else if (canSee && unit.cooldown <= 0 && Math.random() < 0.35 + unit.skill * 0.3) {
        unit.burstLeft = 2 + Math.floor(Math.random() * 4);
        unit.cooldown = 0.05;
      }
    }

    // Ramming
    if (unit.team === "enemy") {
      if (distTarget < 8 && target) {
        if (target.kind === "player") {
          damagePlayer(18 * dt);
          unit.hp -= 15 * dt;
        } else if (target.kind === "ally") {
          target.unit.hp -= 18 * dt;
          unit.hp -= 15 * dt;
        }
      }
    } else if (target && target.kind === "enemy" && distTarget < 8) {
      target.unit.hp -= 16 * dt;
      unit.hp -= 12 * dt;
    }

    return distTarget;
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.flash) {
        b.mesh.scale.multiplyScalar(1 + dt * 18);
        if (b.mesh.material) b.mesh.material.opacity = Math.max(0, b.life * 12);
        if (b.life <= 0) {
          bulletGroup.remove(b.mesh);
          if (b.mesh.material) b.mesh.material.dispose();
          bullets.splice(i, 1);
        }
        continue;
      }
      // Keep tracer pointed along travel
      if (b.vel.lengthSq() > 0.01) {
        tmp.copy(b.mesh.position).add(b.vel);
        b.mesh.lookAt(tmp);
      }
      let hit = false;

      if (b.friendly) {
        for (let j = enemies.length - 1; j >= 0; j--) {
          if (b.mesh.position.distanceTo(enemies[j].mesh.position) < 5.5) {
            enemies[j].hp -= b.damage;
            hitSpark(b.mesh.position, true);
            hit = true;
            if (enemies[j].hp <= 0) destroyEnemy(j);
            break;
          }
        }
      } else {
        if (b.mesh.position.distanceTo(craft.position) < 5) {
          damagePlayer(b.damage);
          hitSpark(b.mesh.position, false);
          hit = true;
        } else {
          for (let j = allies.length - 1; j >= 0; j--) {
            if (b.mesh.position.distanceTo(allies[j].mesh.position) < 5.5) {
              allies[j].hp -= b.damage;
              hitSpark(b.mesh.position, false);
              hit = true;
              if (allies[j].hp <= 0) destroyAlly(j);
              break;
            }
          }
        }
      }

      const gy = surfaceHeight(b.mesh.position.x, b.mesh.position.z);
      if (hit || b.life <= 0 || b.mesh.position.y < gy) {
        if (!hit && b.mesh.position.y < gy) hitSpark(b.mesh.position, b.friendly);
        bulletGroup.remove(b.mesh);
        bullets.splice(i, 1);
      }
    }
  }

  function updateCombatAI(dt) {
    if (grokTauntTimer > 0) {
      grokTauntTimer -= dt;
      if (grokTauntTimer <= 0) grokBanner.classList.remove("show");
    }

    while (enemies.length < 3 && state === "play") spawnEnemy(enemies.length);

    const stats = allyStats();
    if (allyRespawnTimer > 0) allyRespawnTimer -= dt;
    while (allies.length < stats.slots && state === "play" && allyRespawnTimer <= 0) {
      spawnAlly(allies.length);
    }
    alliesAliveEl.textContent = String(allies.length);

    let nearestHostile = Infinity;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const d = updatePilotAI(enemies[i], dt);
      nearestHostile = Math.min(nearestHostile, d);
      if (enemies[i].hp <= 0) destroyEnemy(i);
    }
    for (let i = allies.length - 1; i >= 0; i--) {
      updatePilotAI(allies[i], dt);
      if (allies[i].hp <= 0) destroyAlly(i);
    }

    if (nearestHostile < 220 && grokTauntTimer <= 0 && Math.random() < 0.002) {
      showGrokBanner("GROK AI ON YOUR SIX");
    }
  }

  function shiftCombat(ox, oz) {
    for (const e of enemies) {
      e.mesh.position.x -= ox;
      e.mesh.position.z -= oz;
    }
    for (const a of allies) {
      a.mesh.position.x -= ox;
      a.mesh.position.z -= oz;
    }
    for (const b of bullets) {
      b.mesh.position.x -= ox;
      b.mesh.position.z -= oz;
    }
  }

  // Menu plane previews (2d canvas)
  function drawPreview(c, colors) {
    const g = c.getContext("2d");
    const w = c.width;
    const h = c.height;
    g.clearRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.fillStyle = "#" + colors.wing.toString(16).padStart(6, "0");
    g.beginPath();
    g.moveTo(-10, 0);
    g.lineTo(8, -24);
    g.lineTo(20, -4);
    g.lineTo(8, 24);
    g.closePath();
    g.fill();
    g.fillStyle = "#" + colors.body.toString(16).padStart(6, "0");
    g.beginPath();
    g.ellipse(4, 0, 28, 8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#" + colors.canopy.toString(16).padStart(6, "0");
    g.beginPath();
    g.ellipse(10, -2, 8, 4, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#" + colors.accent.toString(16).padStart(6, "0");
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-18, 1);
    g.lineTo(22, 1);
    g.stroke();
    g.restore();
  }

  function buildPicker() {
    picker.innerHTML = "";
    PLANES.forEach((p, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "plane-card" + (i === selectedPlane ? " selected" : "");
      const c = document.createElement("canvas");
      c.width = 120;
      c.height = 64;
      drawPreview(c, p.colors);
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = p.name;
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = "Paint · " + p.meta;
      btn.append(c, name, meta);
      btn.addEventListener("click", () => {
        selectedPlane = i;
        [...picker.children].forEach((el, j) => el.classList.toggle("selected", j === i));
        buildCraft(getPlayerLoadout());
        updateAirframeLabel();
        if (state === "menu") resetCraftPose(true);
      });
      picker.appendChild(btn);
    });
  }

  function resetCraftPose(menuIdle) {
    craft.position.set(0, 40, 0);
    craft.rotation.set(0, 0, 0);
    craft.quaternion.identity();
    flight.velocity.set(0, 0, menuIdle ? -40 : -95);
    flight.speed = menuIdle ? 40 : 95;
    flight.roll = 0;
    flight.pitch = 0;
    flight.yaw = 0;
    flight.grounded = false;
    flight.prevY = 40;
    flight.airGrace = 0;
    flight.skipGrace = 0;
    flight.skipImpulse.set(0, 0, 0);
    boost = 0;
  }

  function startGame() {
    const loadout = getPlayerLoadout();
    buildCraft(loadout);
    clearRings();
    clearCombat();
    score = 0;
    kills = 0;
    playerHp = loadout.maxHp;
    fireCooldown = 0;
    scoreEl.textContent = "0";
    killsEl.textContent = "0";
    scrapEl.textContent = String(scrap);
    alliesAliveEl.textContent = "0";
    hpBar.style.width = "100%";
    const brand = document.querySelector(".brand");
    if (brand) brand.textContent = loadout.name.toUpperCase();
    worldOffsetX = 0;
    worldOffsetZ = 0;
    resetCraftPose(false);
    craft.position.set(0, surfaceHeight(0, 0) + 42, 80);
    let lakeHint = false;
    const lake = findLakeNear(0, 0, 620);
    if (lake) {
      craft.position.set(lake.x, surfaceHeight(lake.x, lake.z) + 48, lake.z + 180);
      craft.lookAt(lake.x, surfaceHeight(lake.x, lake.z) + 6, lake.z);
      flight.speed = 110;
      lakeHint = true;
    }
    rebuildTerrain(
      Math.round(craft.position.x / TERRAIN_SNAP) * TERRAIN_SNAP,
      Math.round(craft.position.z / TERRAIN_SNAP) * TERRAIN_SNAP
    );
    scatterTrees(craft.position.x, craft.position.z);
    scatterProps(craft.position.x, craft.position.z);
    for (let i = 0; i < 12; i++) {
      const dist = 140 + i * 155;
      spawnRing(
        craft.position.x + (Math.random() - 0.5) * 50,
        craft.position.y,
        craft.position.z - dist
      );
    }
    spawnEnemy(0);
    spawnEnemy(1);
    spawnEnemy(2);
    allyRespawnTimer = 0;
    const slots = allyStats().slots;
    for (let i = 0; i < slots; i++) spawnAlly(i);
    showGrokBanner(
      lakeHint
        ? "Lake ahead — stay fast & shallow to skip!"
        : slots > 0
          ? `${loadout.tier.name} online — squad up.`
          : `${loadout.tier.name} online — Grok inbound.`
    );
    state = "play";
    menu.classList.add("hidden");
    overlay.classList.add("hidden");
    hud.classList.remove("hidden");
    applyViewMode();
  }

  function endGame(shotDown) {
    if (state === "over") return;
    state = "over";
    firing = false;
    craft.visible = true;
    cockpit.classList.add("hidden");
    camera.up.set(0, 1, 0);
    saveTeamProgress();
    renderUpgrades();
    if (score > best) {
      best = score;
      localStorage.setItem("sky-drift-3d-best", String(best));
      bestEl.textContent = String(best);
    }
    overlayTitle.textContent = shotDown ? "Shot Down" : "Wings Down";
    overlayMsg.textContent = `Rings ${score} · Kills ${kills} · Scrap ${scrap}. Your squad stands by.`;
    overlay.classList.remove("hidden");
  }

  function spinWheels(dt) {
    const spin = flight.speed * dt * (flight.grounded ? 1.1 : 0.15);
    craft.traverse((o) => {
      if (o.name === "wheel") o.rotation.x += spin;
    });
  }

  function updateFlight(dt) {
    const spec = getPlayerLoadout();
    const boosting = keys.has(" ") || keys.has("Shift");
    const speedUp = keys.has("ArrowUp") || keys.has("w") || keys.has("W");
    const speedDown = keys.has("ArrowDown") || keys.has("s") || keys.has("S");
    const h = spec.handling;

    if (flight.skipGrace > 0) flight.skipGrace -= dt;

    const ground = surfaceHeight(craft.position.x, craft.position.z);
    let alt = craft.position.y - ground;
    const sinkRate = (flight.prevY - craft.position.y) / Math.max(dt, 0.001);

    if (flight.grounded) {
      // Taxi / takeoff roll on the grass
      if (isOverWater(craft.position.x, craft.position.z)) {
        splashAt(craft.position, 1.6);
        endGame(false);
        return;
      }
      const steer = -mouseNdc.x * 2.2 * h * sensFactor();
      const qYaw = bankQuat.setFromAxisAngle(worldUp, steer * dt);
      craft.quaternion.premultiply(qYaw);

      const takeoffPull = Math.max(0, -mouseNdc.y);
      boost = boosting ? Math.min(1, boost + dt * 2.8) : Math.max(0, boost - dt * 1.6);

      let targetSpeed = (36 + boost * 120 + takeoffPull * 35 + (speedUp ? 25 : 0)) * spec.thrust;
      if (speedDown) targetSpeed -= 28;
      targetSpeed = Math.max(12, Math.min(160, targetSpeed));
      if (!boosting && takeoffPull < 0.1 && !speedUp) targetSpeed *= 0.75;
      flight.speed = THREE.MathUtils.damp(flight.speed, targetSpeed, 3.2, dt);

      // Level on ground but pitch nose up when pulling / boosting
      const noseUp = Math.max(takeoffPull * 0.45, boost * 0.22);
      lookMatrix.lookAt(
        craft.position,
        tmp.copy(craft.position).add(
          forward.set(0, 0, -1).applyQuaternion(craft.quaternion).setY(0).normalize()
        ),
        worldUp
      );
      steerQuat.setFromRotationMatrix(lookMatrix);
      steerQuat.multiply(bankQuat.setFromAxisAngle(pitchAxis, -noseUp));
      craft.quaternion.slerp(steerQuat, 1 - Math.exp(-7 * dt));

      forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
      forward.y = 0;
      if (forward.lengthSq() > 0.0001) forward.normalize();
      craft.position.addScaledVector(forward, flight.speed * dt);
      craft.position.y = surfaceHeight(craft.position.x, craft.position.z) + WHEEL_CLEARANCE;

      // Hold Space/click to spool up, then lift off
      if (flight.speed > 55 && (boosting || takeoffPull > 0.12 || speedUp)) {
        flight.grounded = false;
        flight.airGrace = 1.25;
        craft.position.y += 2.2;
        craft.quaternion.multiply(bankQuat.setFromAxisAngle(pitchAxis, -0.28));
        flight.speed = Math.max(flight.speed, 85);
      }

      flight.roll = THREE.MathUtils.damp(flight.roll, 0, 8, dt);
      flight.pitch = THREE.MathUtils.damp(flight.pitch, -noseUp, 6, dt);
      flight.yaw = THREE.MathUtils.damp(flight.yaw, steer * 0.4, 6, dt);
    } else {
      if (flight.airGrace > 0) flight.airGrace -= dt;

      // Aim where the mouse points — sensitivity slider scales the pull
      const mouseScale = 0.15 + sensFactor() * 0.85;
      softMouse.set(mouseNdc.x * mouseScale, mouseNdc.y * mouseScale);
      raycaster.setFromCamera(softMouse, camera);
      forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
      tmp.copy(craft.position).addScaledVector(forward, 160);
      camera.getWorldDirection(camDir);
      aimPlane.setFromNormalAndCoplanarPoint(camDir, tmp);
      if (!raycaster.ray.intersectPlane(aimPlane, aimTarget)) {
        raycaster.ray.at(200, aimTarget);
      }

      desiredFwd.copy(aimTarget).sub(craft.position);
      if (desiredFwd.lengthSq() < 0.0001) desiredFwd.copy(forward);
      else desiredFwd.normalize();

      const blend = THREE.MathUtils.clamp(0.55 - sensFactor() * 0.35, 0.15, 0.55);
      desiredFwd.lerp(forward, blend).normalize();

      // Level look, then bank into the turn
      lookMatrix.lookAt(craft.position, tmp.copy(craft.position).add(desiredFwd), worldUp);
      steerQuat.setFromRotationMatrix(lookMatrix);

      right.set(1, 0, 0).applyQuaternion(craft.quaternion);
      flatAim.copy(desiredFwd);
      const lateral = flatAim.dot(right);
      // Mouse adds a bit of intentional roll; lateral matches where you're cutting
      const targetBank = THREE.MathUtils.clamp(
        -lateral * 1.55 - mouseNdc.x * 0.55 * sensFactor(),
        -1.15,
        1.15
      );
      flight.roll = THREE.MathUtils.damp(flight.roll, targetBank, 7, dt);
      bankQuat.setFromAxisAngle(bankAxis, flight.roll);
      steerQuat.multiply(bankQuat);

      const turnRate = (1.4 + sensFactor() * 2.6) * h;
      craft.quaternion.slerp(steerQuat, 1 - Math.exp(-turnRate * dt));

      flight.pitch = THREE.MathUtils.damp(flight.pitch, -mouseNdc.y * 0.2 * (0.5 + sensFactor()), 5, dt);
      flight.yaw = THREE.MathUtils.damp(flight.yaw, mouseNdc.x * 0.18 * (0.5 + sensFactor()), 5, dt);

      boost = boosting ? Math.min(1, boost + dt * 2.5) : Math.max(0, boost - dt * 1.8);
      let targetSpeed = (88 + boost * 70) * spec.thrust;
      if (speedUp) targetSpeed += 28;
      if (speedDown) targetSpeed -= 30;
      targetSpeed = Math.max(55, targetSpeed);
      flight.speed = THREE.MathUtils.damp(flight.speed, targetSpeed, 2.2, dt);

      forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
      craft.position.addScaledVector(forward, flight.speed * dt);
      // Water-skip impulse — short kick along travel, fades out (no teleport)
      if (flight.skipImpulse.lengthSq() > 0.05) {
        craft.position.addScaledVector(flight.skipImpulse, dt);
        flight.skipImpulse.multiplyScalar(Math.exp(-5.5 * dt));
        if (flight.skipImpulse.lengthSq() < 0.05) flight.skipImpulse.set(0, 0, 0);
      }
      if (flight.airGrace > 0) craft.position.y += 18 * dt;
      else {
        let gravity = 5;
        // Ground effect over lakes — helps you stay flat for skips
        if (isOverWater(craft.position.x, craft.position.z)) {
          const a = craft.position.y - surfaceHeight(craft.position.x, craft.position.z);
          if (a < 28 && flight.speed > 50 && forward.y > -0.55) {
            gravity = THREE.MathUtils.lerp(1.2, 5, THREE.MathUtils.clamp(a / 28, 0, 1));
            if (a < 10) craft.position.y += (10 - a) * 2.5 * dt;
          }
        }
        craft.position.y -= gravity * dt;
      }

      alt = craft.position.y - surfaceHeight(craft.position.x, craft.position.z);

      // Touchdown / water skip / crash
      if (alt <= WHEEL_CLEARANCE + 0.8 && flight.airGrace <= 0 && flight.skipGrace <= 0) {
        const wet = isOverWater(craft.position.x, craft.position.z);
        if (wet) {
          forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
          const impactAngle = Math.atan2(Math.max(0, sinkRate), Math.max(8, flight.speed));
          const rollingOk = Math.abs(flight.roll) < 1.25;
          // Skip like a stone: fast + shallow path angle (nose attitude no longer blocks it)
          const canSkip = flight.speed > 48 && impactAngle < 0.62 && rollingOk;
          const softSkip = flight.speed > 38 && impactAngle < 0.78 && rollingOk;
          if (canSkip || softSkip) {
            const surf = surfaceHeight(craft.position.x, craft.position.z);
            // Only unstick if we dipped under — no upward teleport
            if (craft.position.y < surf + WHEEL_CLEARANCE) {
              craft.position.y = surf + WHEEL_CLEARANCE;
            }
            // Tiny kick along where you're already going, with a light lift
            const kick = canSkip ? 26 : 18;
            const lift = canSkip ? 0.22 : 0.14;
            flight.skipImpulse
              .copy(forward)
              .normalize()
              .addScaledVector(worldUp, lift)
              .normalize()
              .multiplyScalar(kick);
            flight.speed *= canSkip ? 0.97 : 0.92;
            flight.skipGrace = 0.4;
            splashAt(craft.position, 0.75 + flight.speed / 180);
            wakeStrength = Math.min(1.9, wakeStrength + 0.9);
            if (Math.random() < 0.45) showGrokBanner(canSkip ? "Water skip!" : "Heavy skip!");
          } else {
            splashAt(craft.position, 2.4);
            endGame(false);
            return;
          }
        } else {
          const hardLanding = sinkRate > 38 || Math.abs(flight.roll) > 1.2;
          if (hardLanding) {
            endGame(false);
            return;
          }
          flight.grounded = true;
          craft.position.y = surfaceHeight(craft.position.x, craft.position.z) + WHEEL_CLEARANCE;
          flight.speed *= 0.88;
        }
      } else if (alt < WHEEL_CLEARANCE && !isOverWater(craft.position.x, craft.position.z)) {
        craft.position.y = surfaceHeight(craft.position.x, craft.position.z) + WHEEL_CLEARANCE + 0.5;
      }
    }

    const prop = craft.getObjectByName("prop");
    if (prop) prop.rotation.z += dt * (flight.grounded ? 10 + boost * 24 : 18 + boost * 30);
    const glow = craft.getObjectByName("boostGlow");
    if (glow) glow.material.opacity = boost * 0.55;

    spinWheels(dt);
    emitExhaust(dt);
    tryPlayerFire(dt);
    updateCombatAI(dt);
    updateBullets(dt);
    updateInfiniteWorld();
    recycleClouds(dt);
    updateWater(dt);

    ensureRings();
    for (const ring of rings) {
      ring.userData.spin += dt;
      ring.userData.pulse = (ring.userData.pulse || 0) + dt * 2.4;
      ring.rotation.z = ring.userData.spin * 0.8;
      const glow = ring.getObjectByName("ringGlow");
      if (glow && glow.material && !ring.userData.taken) {
        glow.material.opacity = 0.08 + (Math.sin(ring.userData.pulse) * 0.5 + 0.5) * 0.14;
        const s = 1 + Math.sin(ring.userData.pulse * 0.7) * 0.04;
        glow.scale.setScalar(s);
      }
      if (ring.userData.taken) continue;
      const dist = craft.position.distanceTo(ring.position);
      if (dist < 7.2) {
        ring.userData.taken = true;
        ring.children.forEach((ch) => {
          if (ch.material) {
            ch.material.transparent = true;
            ch.material.opacity = 0.25;
            ch.material.emissiveIntensity = 0;
          }
        });
        score += 1;
        scoreEl.textContent = String(score);
      }
    }

    const groundNow = surfaceHeight(craft.position.x, craft.position.z);
    alt = craft.position.y - groundNow;
    flight.prevY = craft.position.y;

    altBar.style.width = `${Math.round(THREE.MathUtils.clamp(alt / 400, 0, 1) * 100)}%`;
    spdBar.style.width = `${Math.round(THREE.MathUtils.clamp(flight.speed / 180, 0, 1) * 100)}%`;

    // Push draw distance with altitude so the sky stays open
    const viewDist = 2000 + Math.max(0, alt) * 4;
    camera.far = viewDist;
    camera.updateProjectionMatrix();
    scene.fog.near = 200 + alt * 0.35;
    scene.fog.far = viewDist * 0.88;
    scene.fog.color.setRGB(
      THREE.MathUtils.lerp(0.66, 0.55, THREE.MathUtils.clamp(alt / 400, 0, 1)),
      THREE.MathUtils.lerp(0.8, 0.72, THREE.MathUtils.clamp(alt / 400, 0, 1)),
      THREE.MathUtils.lerp(0.88, 0.82, THREE.MathUtils.clamp(alt / 400, 0, 1))
    );
    skyUniforms.uTop.value.setRGB(0.22 - Math.min(0.06, alt * 0.00008), 0.48, 0.72);
    skyDome.position.copy(craft.position);

    sun.position.set(craft.position.x + 140, craft.position.y + 260, craft.position.z + 90);
    sun.target.position.copy(craft.position);
    sun.target.updateMatrixWorld();
    sunGroup.position.set(craft.position.x + 520, craft.position.y + 380, craft.position.z + 280);
  }

  function updateMenu(dt) {
    craft.position.set(Math.sin(clock.elapsedTime * 0.35) * 18, 48, Math.cos(clock.elapsedTime * 0.35) * 18);
    craft.lookAt(0, 42, 0);
    craft.rotateY(Math.PI);
    const prop = craft.getObjectByName("prop");
    if (prop) prop.rotation.z += dt * 20;
    recycleClouds(dt * 0.3);
    updateWater(dt * 0.5);
    skyDome.position.copy(craft.position);
    sunGroup.position.set(craft.position.x + 520, craft.position.y + 380, craft.position.z + 280);
  }

  function applyViewMode() {
    localStorage.setItem("sky-drift-fp", firstPerson ? "1" : "0");
    viewBtn.textContent = firstPerson ? "VIEW · 1ST" : "VIEW · 3RD";
    cockpit.classList.toggle("hidden", !firstPerson || state !== "play");
    craft.visible = !firstPerson || state === "menu";
    if (state === "menu") craft.visible = true;
    camera.fov = firstPerson && state === "play" ? 78 : 70;
    camera.updateProjectionMatrix();
  }

  function toggleViewMode() {
    firstPerson = !firstPerson;
    applyViewMode();
  }

  function updateCamera(dt) {
    if (state === "menu") {
      craft.visible = true;
      cockpit.classList.add("hidden");
      camPos.set(
        Math.sin(clock.elapsedTime * 0.25) * 55,
        36,
        Math.cos(clock.elapsedTime * 0.25) * 55
      );
      camera.position.lerp(camPos, 1 - Math.exp(-2 * dt));
      camera.lookAt(craft.position);
      return;
    }

    forward.set(0, 0, -1).applyQuaternion(craft.quaternion);
    up.set(0, 1, 0).applyQuaternion(craft.quaternion);
    right.set(1, 0, 0).applyQuaternion(craft.quaternion);

    if (firstPerson && state === "play") {
      // Cockpit seat: just behind the canopy, looking down the nose
      camPos
        .copy(craft.position)
        .addScaledVector(forward, -0.35)
        .addScaledVector(up, 0.85);
      camera.position.copy(camPos);
      camLook.copy(craft.position).addScaledVector(forward, 40).addScaledVector(up, 0.4);
      camera.up.copy(up);
      camera.lookAt(camLook);
      craft.visible = false;
      cockpit.classList.remove("hidden");
    } else {
      camera.up.set(0, 1, 0);
      camPos.copy(craft.position).addScaledVector(forward, -22).addScaledVector(up, 7);
      camera.position.lerp(camPos, 1 - Math.exp(-4.5 * dt));
      camLook.copy(craft.position).addScaledVector(forward, 30).addScaledVector(up, 1);
      camera.lookAt(camLook);
      craft.visible = true;
      cockpit.classList.add("hidden");
    }
  }

  function resize() {
    const w = root.clientWidth || window.innerWidth;
    const h = root.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    if (state === "menu") updateMenu(dt);
    else if (state === "play") updateFlight(dt);
    else emitExhaust(dt);
    updateCamera(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function updateMouse(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    mouseNdc.x = ((e.clientX - rect.left) / w) * 2 - 1;
    mouseNdc.y = -((e.clientY - rect.top) / h) * 2 + 1;
  }

  window.addEventListener("keydown", (e) => {
    keys.add(e.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if ((state === "menu" || state === "over") && (e.key === "Enter" || e.key === " ")) startGame();
    if ((e.key === "v" || e.key === "V") && (state === "play" || state === "over")) {
      toggleViewMode();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key));
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", updateMouse);

  viewBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (state === "play" || state === "over") toggleViewMode();
  });

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (state === "play") {
      if (e.button === 0) firing = true;
      updateMouse(e);
    }
  });
  window.addEventListener("pointerup", (e) => {
    if (e.button === 0) firing = false;
  });
  window.addEventListener("blur", () => {
    firing = false;
  });

  document.getElementById("start-btn").addEventListener("click", startGame);
  document.getElementById("retry-btn").addEventListener("click", startGame);
  document.getElementById("menu-btn").addEventListener("click", () => {
    state = "menu";
    firing = false;
    overlay.classList.add("hidden");
    hud.classList.add("hidden");
    menu.classList.remove("hidden");
    grokBanner.classList.remove("show");
    clearRings();
    clearCombat();
    buildCraft(getPlayerLoadout());
    resetCraftPose(true);
    craft.visible = true;
    cockpit.classList.add("hidden");
    camera.up.set(0, 1, 0);
    camera.fov = 70;
    camera.updateProjectionMatrix();
    renderUpgrades();
  });

  buildCraft(getPlayerLoadout());
  resetCraftPose(true);
  buildPicker();
  renderUpgrades();
  applyViewMode();
  craft.visible = true;
  cockpit.classList.add("hidden");
  resize();
  clock.start();
  requestAnimationFrame(frame);
})();

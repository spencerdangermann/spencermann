(() => {
  const bootError = document.getElementById("boot-error");
  const btnStart = document.getElementById("btn-start");

  function fail(msg) {
    console.error(msg);
    if (bootError) {
      bootError.hidden = false;
      bootError.textContent = msg;
    }
    if (btnStart) btnStart.disabled = true;
  }

  if (typeof THREE === "undefined") {
    fail("3D engine failed to load. Make sure three.min.js is in the same folder as index.html.");
    return;
  }

  const SAVE_KEY = "open-roads-3d-v1";
  const TILE = 14;
  const MAP_W = 48;
  const MAP_H = 48;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;
  const SPAWN_TX_DEFAULT = 24.5;
  const SPAWN_TZ_DEFAULT = 24.5;
  let SPAWN_TX = SPAWN_TX_DEFAULT;
  let SPAWN_TZ = SPAWN_TZ_DEFAULT;
  const T = { GRASS: 0, ROAD: 1, DIRT: 2, WATER: 3, BUILDING: 4 };

  const CARS = [
    { id: "hatch", name: "Hatch", style: "hatch", price: 0, color: 0x6f9b6a, accent: 0xc6e07a, power: 42, brake: 55, maxSpeed: 28, turn: 0.55, grip: 11, mass: 1.05, armor: 1, length: 3.4, width: 1.7, height: 1.35, drag: 0.42, blurb: "Balanced daily. Predictable grip." },
    { id: "mini", name: "Pocket", style: "hatch", price: 90, color: 0xe85d4c, accent: 0xffffff, power: 38, brake: 58, maxSpeed: 26, turn: 0.72, grip: 12, mass: 0.85, armor: 0.85, length: 3.0, width: 1.55, height: 1.4, drag: 0.4, blurb: "Tiny city car. Turns on a dime." },
    { id: "sedan", name: "Lane Sedan", style: "sedan", price: 120, color: 0xd8dde6, accent: 0x4a90c8, power: 48, brake: 58, maxSpeed: 30, turn: 0.58, grip: 11.5, mass: 1.1, armor: 1.05, length: 4.0, width: 1.8, height: 1.35, drag: 0.38, blurb: "Comfy sedan. Stable at speed." },
    { id: "wagon", name: "Estate", style: "sedan", price: 150, color: 0x4a6a58, accent: 0xc4d4a8, power: 50, brake: 56, maxSpeed: 29, turn: 0.54, grip: 11.8, mass: 1.2, armor: 1.1, length: 4.3, width: 1.85, height: 1.5, drag: 0.48, blurb: "Long roof. Extra mass, solid grip." },
    { id: "coupe", name: "Coupe", style: "coupe", price: 180, color: 0x3d6ea5, accent: 0x9ec5ff, power: 58, brake: 62, maxSpeed: 36, turn: 0.62, grip: 12, mass: 0.95, armor: 0.9, length: 3.6, width: 1.75, height: 1.2, drag: 0.35, tags: ["tailhappy"], blurb: "Sharp steering. Loses rear if you push it." },
    { id: "taxi", name: "Meter Cab", style: "sedan", price: 220, color: 0xf0c400, accent: 0x222222, power: 44, brake: 56, maxSpeed: 29, turn: 0.52, grip: 11, mass: 1.15, armor: 1.1, length: 4.1, width: 1.85, height: 1.4, drag: 0.45, blurb: "City workhorse. Tough bumpers." },
    { id: "classic", name: "Vintage", style: "sedan", price: 250, color: 0x8a3a2a, accent: 0xc9a227, power: 46, brake: 48, maxSpeed: 27, turn: 0.5, grip: 10, mass: 1.25, armor: 1.2, length: 4.2, width: 1.85, height: 1.5, drag: 0.55, blurb: "Old-school chrome. Soft brakes." },
    { id: "suv", name: "Ridgeback", style: "suv", price: 280, color: 0x2f5d4a, accent: 0xc4a574, power: 55, brake: 54, maxSpeed: 31, turn: 0.48, grip: 12, mass: 1.45, armor: 1.35, length: 4.2, width: 2.0, height: 1.75, drag: 0.62, tags: ["offroad"], blurb: "Tall SUV. Soft in corners, strong off-road." },
    { id: "trailkit", name: "Trail Kit", style: "suv", price: 300, color: 0x3a6a2a, accent: 0xd0a040, power: 52, brake: 50, maxSpeed: 28, turn: 0.55, grip: 13.5, mass: 1.35, armor: 1.3, length: 3.8, width: 1.95, height: 1.85, drag: 0.7, tags: ["offroad"], blurb: "Boxy off-roader. Clings to dirt." },
    { id: "truck", name: "Hauler", style: "truck", price: 320, color: 0xb86b3a, accent: 0xefc08a, power: 48, brake: 48, maxSpeed: 24, turn: 0.4, grip: 9, mass: 1.7, armor: 1.6, length: 4.4, width: 2.1, height: 1.9, drag: 0.7, blurb: "Heavy inertia. Slow to turn, hard to stop." },
    { id: "pickup", name: "Bedrock", style: "truck", price: 340, color: 0x4a5560, accent: 0xe8a040, power: 54, brake: 50, maxSpeed: 27, turn: 0.45, grip: 10.5, mass: 1.55, armor: 1.45, length: 4.5, width: 2.0, height: 1.7, drag: 0.65, tags: ["offroad"], blurb: "Work pickup. Strong chassis." },
    { id: "van", name: "Parcel Van", style: "van", price: 360, color: 0xffffff, accent: 0xe85d4c, power: 46, brake: 50, maxSpeed: 26, turn: 0.42, grip: 10, mass: 1.55, armor: 1.4, length: 4.5, width: 2.0, height: 2.0, drag: 0.75, blurb: "Boxy van. Catches wind like a sail." },
    { id: "ambulance", name: "Rescue", style: "van", price: 400, color: 0xffffff, accent: 0xe02020, power: 55, brake: 60, maxSpeed: 32, turn: 0.48, grip: 11, mass: 1.6, armor: 1.5, length: 4.6, width: 2.1, height: 2.15, drag: 0.72, blurb: "Emergency van. Heavy, strong brakes." },
    { id: "buggy", name: "Dune Rat", style: "buggy", price: 420, color: 0xe07a3a, accent: 0x222222, power: 58, brake: 50, maxSpeed: 32, turn: 0.7, grip: 13, mass: 0.78, armor: 0.85, length: 3.2, width: 1.9, height: 1.5, drag: 0.55, tags: ["offroad"], blurb: "Open buggy. Loves dirt, hates walls." },
    { id: "rally", name: "Rally", style: "rally", price: 520, color: 0xd9c24a, accent: 0xfff2a8, power: 62, brake: 58, maxSpeed: 34, turn: 0.68, grip: 14, mass: 0.92, armor: 1.05, length: 3.5, width: 1.8, height: 1.45, drag: 0.48, tags: ["offroad"], blurb: "AWD bite on dirt and grass." },
    { id: "drift", name: "Sideways", style: "coupe", price: 580, color: 0x7a2a8a, accent: 0xff80d0, power: 78, brake: 55, maxSpeed: 38, turn: 0.75, grip: 8.5, mass: 0.9, armor: 0.85, length: 3.7, width: 1.85, height: 1.2, drag: 0.36, tags: ["tailhappy", "powerover"], blurb: "Built to slide. Grip is optional." },
    { id: "roadster", name: "Open Top", style: "roadster", price: 640, color: 0xb83b5e, accent: 0xffd6e0, power: 72, brake: 64, maxSpeed: 40, turn: 0.7, grip: 11.5, mass: 0.88, armor: 0.8, length: 3.5, width: 1.75, height: 1.15, drag: 0.4, tags: ["tailhappy", "powerover"], blurb: "Light roadster. Fast hands, loose rear." },
    { id: "muscle", name: "Thunder", style: "muscle", price: 780, color: 0xc44536, accent: 0xffb4a2, power: 88, brake: 52, maxSpeed: 42, turn: 0.48, grip: 9.5, mass: 1.3, armor: 1.15, length: 4.0, width: 1.95, height: 1.3, drag: 0.5, tags: ["powerover"], blurb: "Torque monster. Easy to oversteer." },
    { id: "electric", name: "Volt Runner", style: "sedan", price: 850, color: 0xe8f0f8, accent: 0x40d0c0, power: 90, brake: 78, maxSpeed: 45, turn: 0.64, grip: 13, mass: 1.35, armor: 1.1, length: 4.1, width: 1.9, height: 1.35, drag: 0.28, blurb: "Silent torque. Instant pull, heavy pack." },
    { id: "police", name: "Interceptor", style: "sedan", price: 900, color: 0x1a1f2e, accent: 0xffffff, power: 82, brake: 72, maxSpeed: 44, turn: 0.6, grip: 12.5, mass: 1.2, armor: 1.25, length: 4.2, width: 1.9, height: 1.4, drag: 0.4, blurb: "Pursuit sedan. Strong brakes, solid armor." },
    { id: "gt", name: "Night GT", style: "coupe", price: 1050, color: 0x1a2744, accent: 0x6ec6ff, power: 95, brake: 74, maxSpeed: 48, turn: 0.66, grip: 12.8, mass: 1.05, armor: 0.95, length: 3.9, width: 1.9, height: 1.18, drag: 0.3, tags: ["tailhappy"], blurb: "Grand tourer. Speed with manners… mostly." },
    { id: "wedge", name: "Scarlet Wedge", style: "hyper", gltf: "wedge", price: 0, color: 0xc8102e, accent: 0x111111, power: 125, brake: 84, maxSpeed: 56, turn: 0.76, grip: 13.8, mass: 0.9, armor: 0.82, length: 4.34, width: 1.90, height: 1.16, drag: 0.23, tags: ["tailhappy", "powerover"], blurb: "Low supercar wedge. Loud and twitchy." },
    { id: "spike", name: "Solo Spike", style: "hyper", gltf: "spike", price: 0, color: 0xc0c4c8, accent: 0xff6a00, power: 135, brake: 88, maxSpeed: 60, turn: 0.8, grip: 14.2, mass: 0.78, armor: 0.7, length: 4.70, width: 2.02, height: 1.15, drag: 0.2, tags: ["powerover", "tailhappy"], blurb: "One-seat concept blade. Pure aggression." },
    { id: "rocketbike", name: "Red Comet", style: "hyper", gltf: "rocketbike", price: 0, color: 0xc8102e, accent: 0x111111, power: 140, brake: 78, maxSpeed: 58, turn: 0.92, grip: 11.5, mass: 0.55, armor: 0.45, length: 2.85, width: 1.15, height: 1.35, drag: 0.18, tags: ["powerover", "tailhappy"], blurb: "Retro hover bike. Tiny mass, huge attitude." },
    { id: "circuit", name: "Crimson Circuit", style: "hyper", gltf: "circuit", price: 0, color: 0xff0000, accent: 0xffffff, power: 120, brake: 82, maxSpeed: 54, turn: 0.74, grip: 13.5, mass: 0.92, armor: 0.85, length: 4.53, width: 1.94, height: 1.21, drag: 0.24, tags: ["tailhappy"], blurb: "Track-bred mid-engine coupe." },
    { id: "tailspin", name: "Tailspin GT", style: "coupe", gltf: "tailspin", price: 0, color: 0xc0c4c8, accent: 0xff2d2d, power: 108, brake: 80, maxSpeed: 52, turn: 0.72, grip: 13.6, mass: 0.95, armor: 0.88, length: 4.29, width: 1.85, height: 1.30, drag: 0.28, tags: ["tailhappy"], blurb: "Rear-engine grand tourer. Precision steering." },
    { id: "boost", name: "Boost Legend", style: "hyper", gltf: "boost", price: 0, color: 0xd01010, accent: 0xffffff, power: 128, brake: 84, maxSpeed: 57, turn: 0.74, grip: 13.2, mass: 0.88, armor: 0.78, length: 4.43, width: 1.97, height: 1.13, drag: 0.24, tags: ["powerover", "tailhappy"], blurb: "Raw turbo machine. No mercy." },
    { id: "knife", name: "Door Knife", style: "hyper", gltf: "knife", price: 0, color: 0xf0f2f4, accent: 0x111111, power: 122, brake: 80, maxSpeed: 55, turn: 0.7, grip: 12.8, mass: 0.92, armor: 0.8, length: 4.48, width: 2.00, height: 1.07, drag: 0.26, tags: ["powerover"], blurb: "Wedge classic. Scissor drama, straight-line bite." },
    { id: "rail", name: "Rail Coupe", style: "coupe", gltf: "rail", price: 0, color: 0xb8bcc0, accent: 0x222222, power: 92, brake: 74, maxSpeed: 46, turn: 0.68, grip: 13.0, mass: 1.05, armor: 0.95, length: 4.19, width: 1.84, height: 1.35, drag: 0.3, tags: ["tailhappy"], blurb: "Compact coupe. Planted and tidy." },
    { id: "stripe", name: "Stripe Coupe", style: "coupe", gltf: "stripe", price: 0, color: 0xffffff, accent: 0x1a3a8a, power: 98, brake: 72, maxSpeed: 48, turn: 0.7, grip: 12.6, mass: 1.02, armor: 0.9, length: 4.35, width: 1.75, height: 1.35, drag: 0.34, tags: ["tailhappy", "powerover"], blurb: "Boxy classic coupe. Manual vibes." },
    { id: "hatchx", name: "Hot Hatch X", style: "hatch", gltf: "hatchx", price: 0, color: 0x1a1a1c, accent: 0xc0c0c0, power: 100, brake: 78, maxSpeed: 49, turn: 0.66, grip: 13.4, mass: 1.15, armor: 1.0, length: 4.33, width: 1.78, height: 1.43, drag: 0.32, blurb: "Pocket rocket hatch. All-weather grip." },
    { id: "serpent", name: "Serpent", style: "roadster", gltf: "serpent", price: 0, color: 0xc8102e, accent: 0xffffff, power: 115, brake: 68, maxSpeed: 50, turn: 0.78, grip: 10.5, mass: 0.85, armor: 0.7, length: 3.90, width: 1.75, height: 1.20, drag: 0.4, tags: ["powerover", "tailhappy"], blurb: "Open roadster. Power first, manners later." },
    { id: "pint", name: "Pint Hatch", style: "hatch", gltf: "pint", price: 0, color: 0xe8e8ea, accent: 0xd01010, power: 70, brake: 62, maxSpeed: 38, turn: 0.72, grip: 12.0, mass: 0.9, armor: 0.85, length: 3.78, width: 1.66, height: 1.43, drag: 0.38, blurb: "Tiny turbo hatch. Fun in the city." },
    { id: "fold", name: "Steel Fold", style: "truck", gltf: "fold", price: 0, color: 0xc8ccd0, accent: 0x222222, power: 110, brake: 82, maxSpeed: 45, turn: 0.5, grip: 12.5, mass: 1.7, armor: 1.7, length: 5.68, width: 2.20, height: 1.79, drag: 0.35, tags: ["offroad"], blurb: "Angular electric hauler. Armor for days." },
    { id: "stampede", name: "Stampede", style: "muscle", gltf: "stampede", price: 0, color: 0xc8102e, accent: 0x111111, power: 105, brake: 70, maxSpeed: 49, turn: 0.62, grip: 11.2, mass: 1.15, armor: 0.95, length: 4.78, width: 1.91, height: 1.38, drag: 0.4, tags: ["powerover"], blurb: "Big-block muscle. Big torque, big slides." },
    { id: "sportback", name: "Arrow", style: "coupe", price: 1120, color: 0x1a3a4a, accent: 0x80e0ff, power: 100, brake: 76, maxSpeed: 50, turn: 0.7, grip: 13.2, mass: 1.0, armor: 0.9, length: 4.0, width: 1.9, height: 1.15, drag: 0.26, tags: ["tailhappy"], blurb: "Sleek fastback. Cuts air clean." },
    { id: "hyper", name: "Vapor", style: "hyper", price: 1200, color: 0x22262e, accent: 0x7df9c2, power: 110, brake: 78, maxSpeed: 52, turn: 0.72, grip: 13, mass: 0.82, armor: 0.75, length: 3.8, width: 1.85, height: 1.1, drag: 0.28, tags: ["powerover"], blurb: "Race setup. Huge power, little forgiveness." },
    { id: "limo", name: "Longboard", style: "limo", price: 1400, color: 0x0d0d0f, accent: 0xc9a227, power: 70, brake: 60, maxSpeed: 36, turn: 0.35, grip: 10.5, mass: 1.9, armor: 1.5, length: 5.6, width: 1.95, height: 1.45, drag: 0.55, blurb: "Stretched limo. Turns like a barge." },
    { id: "fire", name: "Blaze Unit", style: "truck", price: 1600, color: 0xc02020, accent: 0xf0c400, power: 65, brake: 58, maxSpeed: 30, turn: 0.38, grip: 11, mass: 2.0, armor: 1.8, length: 5.0, width: 2.2, height: 2.2, drag: 0.8, blurb: "Fire truck. Huge mass, tough armor." },
    { id: "proto", name: "Apex Proto", style: "hyper", price: 1800, color: 0xff4d00, accent: 0xffffff, power: 130, brake: 85, maxSpeed: 58, turn: 0.78, grip: 14, mass: 0.75, armor: 0.65, length: 3.9, width: 1.95, height: 1.05, drag: 0.22, tags: ["powerover"], blurb: "Prototype rocket. Win or wreck." },
    { id: "super", name: "Nova X", style: "hyper", price: 2200, color: 0x0a0a12, accent: 0xff40a0, power: 145, brake: 90, maxSpeed: 62, turn: 0.82, grip: 14.5, mass: 0.7, armor: 0.6, length: 4.0, width: 2.0, height: 1.0, drag: 0.18, tags: ["powerover", "tailhappy"], blurb: "Ultimate hypercar. Don't blink." },
    { id: "warp", name: "Warp Bolt", style: "hyper", gltf: "warp", price: 0, color: 0xffe14a, accent: 0xff2a2a, power: 9e15, brake: 9e15, maxSpeed: 1.661747766e37, turn: 1.2, grip: 40, mass: 0.08, armor: 0.5, length: 4.2, width: 2.0, height: 1.05, drag: 0.00001, tags: ["powerover", "tailhappy"], displayMph: "46528937456278935623489562389734789562389", invincible: true, blurb: "Yes. That many mph. Also unkillable." },
  ];

  function carInvincible() {
    return !!(car.spec && car.spec.invincible);
  }

  function hasTag(spec, tag) {
    return spec.tags && spec.tags.indexOf(tag) !== -1;
  }

  const view = document.getElementById("view");
  const overlay = document.getElementById("overlay");
  const panelTitle = document.getElementById("panel-title");
  const panelGarage = document.getElementById("panel-garage");
  const panelWrecked = document.getElementById("panel-wrecked");
  const hud = document.getElementById("hud");
  const touch = document.getElementById("touch");
  const hint = document.getElementById("hint");
  const carGrid = document.getElementById("car-grid");
  const el = {
    speed: document.getElementById("speed"),
    cash: document.getElementById("cash"),
    garageCash: document.getElementById("garage-cash"),
    carName: document.getElementById("car-name"),
    damageFill: document.getElementById("damage-fill"),
  };

  let renderer, scene, camera, sun, clock;
  let sunDiscMesh = null;
  let ambientClouds = [];
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false });
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    if (THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
    }
    if (renderer.outputColorSpace !== undefined && THREE.SRGBColorSpace !== undefined) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    view.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x6aa8c8);
    scene.fog = new THREE.FogExp2(0x8cbcce, 0.0065);

    camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 280);
    camera.position.set(0, 12, 16);

    sun = new THREE.DirectionalLight(0xfff3dc, 2.05);
    sun.position.set(62, 95, 38);
    sun.castShadow = false;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8e0ff, 0.75);
    fill.position.set(-40, 45, -30);
    scene.add(fill);
    scene.add(new THREE.AmbientLight(0xb8cce0, 0.85));
    scene.add(new THREE.HemisphereLight(0xe8f4ff, 0x5a7a48, 0.95));

    // Soft outdoor IBL so metallic car paint isn't black without an HDR
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.Scene();
      envScene.add(new THREE.HemisphereLight(0xffffff, 0x668855, 1.6));
      const envSun = new THREE.DirectionalLight(0xfff0d8, 2.2);
      envSun.position.set(5, 8, 3);
      envScene.add(envSun);
      const envFill = new THREE.DirectionalLight(0xa8c8ff, 1.1);
      envFill.position.set(-4, 3, -5);
      envScene.add(envFill);
      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch (_) {}

    // Gradient sky dome
    const skyGeo = new THREE.SphereGeometry(560, 32, 20);
    const skyPos = skyGeo.attributes.position;
    const skyCols = [];
    const zenith = new THREE.Color(0x3a7ab0);
    const midSky = new THREE.Color(0x7eb6d4);
    const horizon = new THREE.Color(0xc8dff0);
    for (let i = 0; i < skyPos.count; i++) {
      const y = skyPos.getY(i) / 560;
      const t = THREE.MathUtils.clamp((y + 0.15) / 1.15, 0, 1);
      const c = t > 0.45
        ? midSky.clone().lerp(zenith, (t - 0.45) / 0.55)
        : horizon.clone().lerp(midSky, t / 0.45);
      skyCols.push(c.r, c.g, c.b);
    }
    skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(skyCols, 3));
    scene.add(new THREE.Mesh(
      skyGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })
    ));

    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, fog: false, transparent: true, opacity: 0.9 })
    );
    sunDisc.position.copy(sun.position).normalize().multiplyScalar(420);
    scene.add(sunDisc);
    sunDiscMesh = sunDisc;

    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xf4f8fc, transparent: true, opacity: 0.5, depthWrite: false, fog: false,
    });
    const cloudMatSoft = new THREE.MeshBasicMaterial({
      color: 0xe8f0f8, transparent: true, opacity: 0.32, depthWrite: false, fog: false,
    });
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group();
      const ang = (i / 8) * Math.PI * 2 + i * 0.07;
      const dist = 180 + (i % 6) * 36;
      cloud.position.set(
        WORLD_W / 2 + Math.cos(ang) * dist,
        32 + (i % 5) * 7,
        WORLD_H / 2 + Math.sin(ang) * dist
      );
      cloud.userData.drift = { ang, dist, baseY: cloud.position.y, phase: i * 0.9 };
      for (let p = 0; p < 5; p++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(5 + (p % 3) * 2.8, 8, 6),
          p % 2 ? cloudMatSoft : cloudMat
        );
        puff.position.set((p - 2) * 5.2, (p % 2) * 2.4, ((p * 3) % 5) - 2);
        puff.scale.set(1.5, 0.5, 1.1);
        cloud.add(puff);
      }
      scene.add(cloud);
      ambientClouds.push(cloud);
    }

    clock = new THREE.Clock();
  } catch (err) {
    fail("WebGL failed to start: " + (err && err.message ? err.message : err));
    return;
  }

  const keys = new Set();
  const input = { throttle: 0, steer: 0, brake: 0 };
  const touchState = { throttle: 0, steer: 0, brake: 0 };

  const CAR_ID_ALIASES = {
    ferrari: "circuit", lambo: "wedge", egoista: "spike", porsche: "tailspin",
    f40: "boost", countach: "knife", audi: "rail", bmw: "stripe",
    mercedes: "hatchx", cobra: "serpent", fiat: "pint", cybertruck: "fold",
    mustang: "stampede", jeep: "trailkit",
  };
  function migrateCarId(id) {
    return CAR_ID_ALIASES[id] || id;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        return {
          cash: data.cash || 0,
          unlocked: Array.from(new Set([
            ...((data.unlocked || ["hatch"]).map(migrateCarId)),
            "circuit", "wedge", "spike", "rocketbike", "tailspin", "boost", "knife", "rail", "stripe",
            "hatchx", "serpent", "pint", "fold", "stampede", "trailkit", "warp",
          ])),
          selected: migrateCarId(data.selected || "warp"),
          mapId: data.mapId || "city",
        };
      }
    } catch (_) {}
    return {
      cash: 0,
      unlocked: [
        "hatch", "circuit", "wedge", "spike", "rocketbike", "tailspin", "boost", "knife", "rail",
        "stripe", "hatchx", "serpent", "pint", "fold", "stampede", "trailkit", "warp",
      ],
      selected: "warp",
      mapId: "city",
    };
  }

  let save = loadSave();
  let selectedCarId = migrateCarId(save.selected);
  let playing = false;
  let worldReady = false;
  let map = [];
  let heightMap = []; // corner heights (MAP_H+1) x (MAP_W+1)
  let solids = [];
  let crates = [];
  let npcs = [];
  let npcLodFrame = 0;
  let pedestrians = [];
  let particles = [];
  let debris = [];
  let worldGroup = null;
  let carMesh = null;
  let cameraMode = 0;
  let shake = 0;
  let impactSlow = 0;
  let camKickX = 0;
  let camKickY = 0;
  let camKickZ = 0;
  let impactFlash = 0;
  const elFlash = document.getElementById("impact-flash");
  let messageLife = 0;

  let skidMarks = [];
  let dustParticles = [];
  let worldFx = [];
  let grassWindMats = [];
  let audioCtx = null;
  let engineAudio = null;
  let lastGearForAudio = 1;
  let shiftBlip = 0;
  let lastThrottleAudio = 0;
  let audioRpm = 900;
  let popTimer = 0;
  let camVel = { x: 0, y: 0, z: 0 };
  let camLook = { x: 0, y: 1.2, z: 0 };
  let camYaw = 0;
  let camReady = false;
  const _hubWorld = new THREE.Vector3();

  const car = {
    x: WORLD_W / 2,
    z: WORLD_H / 2,
    y: 0,
    angle: 0,
    vx: 0,
    vz: 0,
    vy: 0,
    av: 0,
    health: 100,
    dent: 0,
    wreckPose: false,
    spec: CARS[0],
    pitch: 0,
    roll: 0,
    steerAngle: 0,
    wheelSpin: 0,
    slip: 0,
    rpm: 800,
    gear: 1,
    suspY: 0,
    suspV: 0,
    braking: false,
    handbrake: false,
    grounded: true,
    crashCooldown: 0,
    crashStun: 0,
    wheelDamage: 0,
    lastImpact: 0,
    pullSteer: 0,
    scrapeTimer: 0,
    bounceLock: 0,
    slideGrip: 1,
    tipTimer: 0,
    flipped: false,
  };

  function persist() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          cash: save.cash,
          unlocked: save.unlocked,
          selected: selectedCarId,
          mapId: selectedMapId,
        })
      );
    } catch (_) {}
  }

  function showMsg(text) {
    hint.hidden = false;
    hint.textContent = text;
    messageLife = 2.5;
  }

  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, opts || {}));
  }

  const MAPS = [
    {
      id: "city",
      name: "Grid City",
      blurb: "Dense downtown grid, parks, and lakes.",
      spawn: [24.5, 24.5],
      theme: {
        fog: 0x8cbcce, fogDensity: 0.0065, bg: 0x6aa8c8,
        grass: [0x4a9448, 0x3d7e3c, 0x5aa852, 0x7a9a52],
        dirt: [0x7a6040, 0x8a7050], road: [0x323a44, 0x3a4450], water: [0x1e6a88, 0x2a7c98],
        zenith: 0x3a7ab0, mid: 0x7eb6d4, horizon: 0xc8dff0,
      },
      dress: {
        trees: 1, grass: 1, streetProps: 1, buildings: 1, parked: 1,
        docks: 0.2, rocks: 0.25, flowers: 1, scatter: 1, signs: 1, landmark: "city",
      },
    },
    {
      id: "desert",
      name: "Desert Run",
      blurb: "Interstate through dunes and rock arches.",
      spawn: [24.5, 8.5],
      theme: {
        fog: 0xd4b896, fogDensity: 0.0082, bg: 0xc9a878,
        grass: [0xc2a06a, 0xb8945c, 0xd0b078, 0xa88850],
        dirt: [0x9a7040, 0xb08858], road: [0x4a4540, 0x555048], water: [0x3a6a78, 0x4a7a88],
        zenith: 0x5a90c0, mid: 0xc8b090, horizon: 0xf0e0c0,
      },
      dress: {
        trees: 0.08, grass: 0.12, streetProps: 0.15, buildings: 0.2, parked: 0.1,
        docks: 0, rocks: 1.8, flowers: 0, scatter: 0.2, signs: 0.35, landmark: "desert",
      },
    },
    {
      id: "coast",
      name: "Coast Ring",
      blurb: "Peninsula highway, beaches, and a marina.",
      spawn: [24.5, 14.5],
      theme: {
        fog: 0x9ec8d8, fogDensity: 0.0052, bg: 0x5a9ab8,
        grass: [0x3e9a62, 0x348a54, 0x52b070, 0x6aaa58],
        dirt: [0xc2b080, 0xd0c090], road: [0x2e3640, 0x384450], water: [0x156a98, 0x1e7eb0],
        zenith: 0x2a6aa0, mid: 0x6aadd0, horizon: 0xd0eaf8,
      },
      dress: {
        trees: 0.55, grass: 0.75, streetProps: 0.55, buildings: 0.55, parked: 0.45,
        docks: 1.6, rocks: 0.45, flowers: 0.9, scatter: 0.7, signs: 0.5, landmark: "coast",
      },
    },
    {
      id: "mountain",
      name: "Mountain Pass",
      blurb: "Hairpin climb through pine valleys.",
      spawn: [24.5, 40.5],
      theme: {
        fog: 0xa8b8c4, fogDensity: 0.009, bg: 0x7a90a4,
        grass: [0x3a6040, 0x2e5034, 0x4a7050, 0x6a7a58],
        dirt: [0x6a5848, 0x7a6858], road: [0x3a4048, 0x484e56], water: [0x3a6880, 0x4a7890],
        zenith: 0x4a6a88, mid: 0x8aa0b4, horizon: 0xd0d8e0,
      },
      dress: {
        trees: 1.6, grass: 0.45, streetProps: 0.2, buildings: 0.2, parked: 0.15,
        docks: 0, rocks: 1.4, flowers: 0.15, scatter: 0.35, signs: 0.4, landmark: "mountain",
      },
    },
    {
      id: "harbor",
      name: "Harbor Town",
      blurb: "Canal city, docks, and warehouse rows.",
      spawn: [30.5, 24.5],
      theme: {
        fog: 0x8ab0c0, fogDensity: 0.0072, bg: 0x5a88a0,
        grass: [0x4a8a58, 0x3e7a4a, 0x5a9a62, 0x6a8a50],
        dirt: [0x7a6548, 0x8a7558], road: [0x2c343c, 0x364048], water: [0x185878, 0x226888],
        zenith: 0x3a6888, mid: 0x6a98b0, horizon: 0xc0d8e4,
      },
      dress: {
        trees: 0.2, grass: 0.3, streetProps: 1.35, buildings: 1.4, parked: 1.2,
        docks: 2.2, rocks: 0.1, flowers: 0.25, scatter: 0.5, signs: 1.1, landmark: "harbor",
      },
    },
    {
      id: "tiny",
      name: "Pocket Isle",
      blurb: "A postage-stamp island — one plaza, one lap.",
      spawn: [24.5, 24.5],
      pursuit: 48,
      theme: {
        fog: 0xb8d4c8, fogDensity: 0.011, bg: 0x7ab8a0,
        grass: [0x5ab86a, 0x4aa858, 0x6ec878, 0x8aba60],
        dirt: [0xb89868, 0xc8a878], road: [0x3a444c, 0x48545c], water: [0x2a88a8, 0x38a0c0],
        zenith: 0x4a98c0, mid: 0x8ad0c0, horizon: 0xe0f4e8,
      },
      dress: {
        trees: 0.35, grass: 0.55, streetProps: 0.7, buildings: 0.85, parked: 0.5,
        docks: 0.4, rocks: 0.15, flowers: 1.2, scatter: 0.6, signs: 0.45, landmark: "tiny",
      },
    },
    {
      id: "infinite",
      name: "Endless Road",
      blurb: "One highway. No exit. Keep driving forever.",
      spawn: [24.5, 24.5],
      wrap: "z",
      theme: {
        fog: 0xc8b898, fogDensity: 0.014, bg: 0xb0a080,
        grass: [0x8a9a58, 0x7a8a48, 0x9aaa60, 0xa89850],
        dirt: [0xa88858, 0xb89868], road: [0x2a3038, 0x343c44], water: [0x4a7080, 0x5a8090],
        zenith: 0x6a98c0, mid: 0xb8c0a0, horizon: 0xe8dcc0,
      },
      dress: {
        trees: 0.15, grass: 0.2, streetProps: 0.35, buildings: 0.15, parked: 0.2,
        docks: 0, rocks: 0.55, flowers: 0.05, scatter: 0.25, signs: 0.8, landmark: "infinite",
      },
    },
  ];

  let selectedMapId = "city";
  if (!MAPS.some((m) => m.id === selectedMapId)) selectedMapId = MAPS[0].id;

  function currentMap() {
    return MAPS.find((m) => m.id === selectedMapId) || MAPS[0];
  }

  function mapDress() {
    return currentMap().dress || {};
  }

  function dressChance(key, fallback) {
    const d = mapDress();
    const v = d[key] != null ? d[key] : (fallback != null ? fallback : 1);
    return Math.random() < Math.min(1, Math.max(0, v));
  }

  function dressScale(key, fallback) {
    const d = mapDress();
    return d[key] != null ? d[key] : (fallback != null ? fallback : 1);
  }

  function dressCount(key, base) {
    return Math.max(0, Math.round(base * dressScale(key, 1)));
  }

  function dressKeep(key) {
    const s = dressScale(key, 1);
    if (s <= 0) return false;
    if (s >= 1) return true;
    return Math.random() < s;
  }

  function clearMapTiles(fill) {
    map = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(fill != null ? fill : T.GRASS));
  }

  function borderWater(thickness) {
    const t = thickness != null ? thickness : 1;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (x < t || y < t || x >= MAP_W - t || y >= MAP_H - t) map[y][x] = T.WATER;
      }
    }
  }

  function paintRoadNS(cols, y0, y1) {
    const a = y0 != null ? y0 : 3;
    const b = y1 != null ? y1 : MAP_H - 3;
    for (let y = a; y < b; y++) {
      for (const rx of cols) {
        if (map[y] && map[y][rx] !== undefined && map[y][rx] !== T.WATER) {
          map[y][rx] = T.ROAD;
          if (rx + 1 < MAP_W - 1 && map[y][rx + 1] !== T.WATER) map[y][rx + 1] = T.ROAD;
        }
      }
    }
  }

  function paintRoadEW(rows, x0, x1) {
    const a = x0 != null ? x0 : 3;
    const b = x1 != null ? x1 : MAP_W - 3;
    for (let x = a; x < b; x++) {
      for (const ry of rows) {
        if (map[ry] && map[ry][x] !== undefined && map[ry][x] !== T.WATER) {
          map[ry][x] = T.ROAD;
          if (ry + 1 < MAP_H - 1 && map[ry + 1][x] !== T.WATER) map[ry + 1][x] = T.ROAD;
        }
      }
    }
  }

  function paintRect(tx, ty, w, h, tile) {
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (map[y] && map[y][x] !== undefined && map[y][x] !== T.WATER) map[y][x] = tile;
      }
    }
  }

  function paintBuilding(tx, ty, w, h) {
    paintRect(tx, ty, w, h, T.BUILDING);
  }

  function buildMapCity() {
    clearMapTiles(T.GRASS);
    borderWater(1);
    // Dense boulevard grid + diagonal parkway
    paintRoadNS([5, 12, 19, 24, 29, 36, 42], 2, MAP_H - 2);
    paintRoadEW([5, 12, 19, 24, 29, 36, 42], 2, MAP_W - 2);
    for (let i = 6; i < 42; i++) {
      if (map[i] && map[i][i] !== undefined && map[i][i] !== T.WATER) map[i][i] = T.ROAD;
      if (map[i] && map[i][i + 1] !== undefined && map[i][i + 1] !== T.WATER) map[i][i + 1] = T.ROAD;
    }
    // Central park + neighborhood parks
    paintRect(21, 21, 6, 6, T.GRASS);
    paintRect(21, 23, 6, 2, T.DIRT);
    paintRect(7, 7, 4, 4, T.WATER);
    paintRect(35, 7, 5, 4, T.WATER);
    paintRect(7, 35, 5, 5, T.WATER);
    paintRect(34, 34, 4, 4, T.WATER);
    // Downtown blocks packed tight
    for (let by = 6; by <= 40; by += 7) {
      for (let bx = 6; bx <= 40; bx += 7) {
        if (Math.abs(bx - 24) < 4 && Math.abs(by - 24) < 4) continue;
        if (map[by][bx] === T.WATER || map[by][bx] === T.ROAD) continue;
        paintBuilding(bx + 1, by + 1, 2 + ((bx + by) % 2), 2);
      }
    }
    buildHeightMap({ amp: 0.75, peaks: null });
  }

  function buildMapDesert() {
    clearMapTiles(T.DIRT);
    borderWater(2);
    // Long interstate + service roads only
    paintRoadEW([8, 9], 2, MAP_W - 2);
    paintRoadNS([24, 25], 2, MAP_H - 2);
    paintRoadEW([30, 31], 8, 40);
    paintRoadNS([10], 8, 28);
    paintRoadNS([38], 16, 42);
    // Sand seas
    for (let y = 3; y < MAP_H - 3; y++) {
      for (let x = 3; x < MAP_W - 3; x++) {
        if (map[y][x] === T.ROAD || map[y][x] === T.WATER) continue;
        map[y][x] = ((x * 5 + y * 3) % 9 < 6) ? T.DIRT : T.GRASS;
      }
    }
    // Rare oases
    paintRect(16, 18, 4, 3, T.WATER);
    paintRect(16, 17, 4, 1, T.GRASS);
    paintRect(34, 34, 5, 4, T.WATER);
    paintRect(34, 33, 5, 1, T.GRASS);
    // Tiny outposts only
    [[6, 6, 2, 2], [40, 6, 2, 2], [6, 40, 2, 2], [40, 40, 2, 2], [22, 14, 2, 1]].forEach((b) =>
      paintBuilding(b[0], b[1], b[2], b[3])
    );
    buildHeightMap({
      amp: 1.15,
      peaks: [
        { x: 8, z: 16, h: 26, r: 11 }, { x: 40, z: 12, h: 30, r: 12 },
        { x: 14, z: 38, h: 24, r: 10 }, { x: 38, z: 40, h: 32, r: 13 },
        { x: 28, z: 22, h: 14, r: 8 }, { x: 18, z: 28, h: 16, r: 9 },
        { x: 6, z: 30, h: 18, r: 8 }, { x: 42, z: 26, h: 20, r: 9 },
      ],
    });
  }

  function buildMapCoast() {
    clearMapTiles(T.WATER);
    // Elongated peninsula from south
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dx = (x + 0.5 - 24) / 14;
        const dy = (y + 0.5 - 18) / 20;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.92) map[y][x] = T.GRASS;
        else if (d < 1.05) map[y][x] = T.DIRT;
      }
    }
    // Coastal ring + spine road
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (map[y][x] === T.WATER) continue;
        const dx = (x + 0.5 - 24) / 14;
        const dy = (y + 0.5 - 18) / 20;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.78 && d < 0.9) map[y][x] = T.ROAD;
      }
    }
    paintRoadNS([24], 6, 34);
    paintRoadEW([14], 12, 36);
    // Beach dirt band along south shore
    for (let x = 12; x <= 36; x++) {
      if (map[8] && map[8][x] === T.GRASS) map[8][x] = T.DIRT;
      if (map[9] && map[9][x] === T.GRASS) map[9][x] = T.DIRT;
    }
    // Lagoon + marina basin
    paintRect(20, 20, 5, 4, T.WATER);
    paintRect(28, 16, 3, 2, T.WATER);
    [[14, 16, 2, 2], [30, 18, 2, 2], [18, 26, 2, 2], [28, 26, 3, 2], [22, 12, 2, 2]].forEach((b) => {
      if (map[b[1]] && map[b[1]][b[0]] !== T.WATER) paintBuilding(b[0], b[1], b[2], b[3]);
    });
    buildHeightMap({
      amp: 0.4,
      peaks: [
        { x: 24, z: 22, h: 6, r: 9 }, { x: 18, z: 16, h: 4, r: 5 },
        { x: 30, z: 24, h: 5, r: 6 }, { x: 24, z: 30, h: 7, r: 7 },
      ],
    });
  }

  function buildMapMountain() {
    clearMapTiles(T.GRASS);
    borderWater(1);
    // Valley floor dirt + single serpentine climb
    for (let y = 34; y < 46; y++) {
      for (let x = 10; x < 38; x++) map[y][x] = T.DIRT;
    }
    paintRoadEW([42, 43], 8, 40);
    // Hairpins ascending north
    const pins = [
      [10, 38, 28, 2], [10, 34, 2, 6], [10, 32, 26, 2], [34, 26, 2, 8],
      [12, 26, 24, 2], [12, 20, 2, 8], [12, 18, 24, 2], [34, 12, 2, 8],
      [14, 12, 22, 2], [14, 6, 2, 8], [14, 6, 20, 2],
    ];
    pins.forEach(function (r) {
      paintRect(r[0], r[1], r[2], r[3], T.ROAD);
    });
    paintRoadNS([24], 6, 44);
    // Alpine lakes
    paintRect(6, 20, 3, 3, T.WATER);
    paintRect(38, 28, 4, 3, T.WATER);
    // Base village + summit lodge only
    [[18, 40, 3, 2], [28, 40, 2, 2], [20, 8, 2, 2], [26, 6, 3, 2]].forEach((b) =>
      paintBuilding(b[0], b[1], b[2], b[3])
    );
    buildHeightMap({
      amp: 1.55,
      peaks: [
        { x: 8, z: 8, h: 38, r: 11 }, { x: 40, z: 10, h: 34, r: 10 },
        { x: 10, z: 28, h: 28, r: 9 }, { x: 38, z: 32, h: 30, r: 10 },
        { x: 24, z: 16, h: 22, r: 8 }, { x: 16, z: 22, h: 20, r: 7 },
        { x: 32, z: 20, h: 24, r: 8 }, { x: 24, z: 6, h: 18, r: 6 },
      ],
    });
  }

  function buildMapHarbor() {
    clearMapTiles(T.GRASS);
    borderWater(1);
    // Huge western bay with canal fingers
    for (let y = 4; y < 44; y++) {
      for (let x = 1; x < 16; x++) map[y][x] = T.WATER;
    }
    for (let c = 0; c < 5; c++) {
      const cy = 8 + c * 7;
      paintRect(14, cy, 10, 2, T.WATER);
    }
    // Tight warehouse grid on the dry side
    paintRoadNS([18, 22, 26, 30, 34, 38, 42], 3, MAP_H - 3);
    paintRoadEW([6, 10, 14, 18, 22, 26, 30, 34, 38, 42], 16, MAP_W - 2);
    // Dock dirt piers into the bay
    for (let i = 0; i < 6; i++) {
      paintRect(12, 9 + i * 6, 5, 1, T.DIRT);
    }
    // Dense buildings between roads
    for (let y = 5; y < 43; y += 4) {
      for (let x = 19; x < 44; x += 4) {
        if (map[y][x] === T.ROAD || map[y][x] === T.WATER) continue;
        if ((x + y) % 3 === 0) paintBuilding(x, y, 2, 2);
      }
    }
    buildHeightMap({
      amp: 0.25,
      peaks: [
        { x: 36, z: 10, h: 5, r: 5 }, { x: 40, z: 36, h: 6, r: 6 },
        { x: 28, z: 24, h: 3, r: 4 }, { x: 22, z: 40, h: 4, r: 4 },
      ],
    });
  }

  function buildMapTiny() {
    // Tiny playable island in a big empty sea — feels pocket-sized
    clearMapTiles(T.WATER);
    const cx = 24;
    const cz = 24;
    const rLand = 6.2;
    const rBeach = 7.1;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dx = x + 0.5 - cx;
        const dz = y + 0.5 - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < rLand) map[y][x] = T.GRASS;
        else if (d < rBeach) map[y][x] = T.DIRT;
      }
    }
    // Mini ring road + cross
    paintRoadNS([24], 19, 30);
    paintRoadEW([24], 19, 30);
    paintRoadNS([20], 20, 29);
    paintRoadNS([28], 20, 29);
    paintRoadEW([20], 20, 29);
    paintRoadEW([28], 20, 29);
    // Pocket plaza
    paintRect(23, 23, 3, 3, T.DIRT);
    paintRect(23, 24, 3, 1, T.ROAD);
    paintRect(24, 23, 1, 3, T.ROAD);
    // Tiny pond + a few cottages
    paintRect(21, 26, 2, 2, T.WATER);
    [[21, 21, 2, 1], [26, 21, 2, 1], [21, 27, 1, 2], [27, 26, 1, 2]].forEach(function (b) {
      if (map[b[1]] && map[b[1]][b[0]] !== T.WATER) paintBuilding(b[0], b[1], b[2], b[3]);
    });
    buildHeightMap({
      amp: 0.2,
      peaks: [
        { x: 24, z: 24, h: 2.5, r: 5 },
        { x: 21, z: 22, h: 1.5, r: 3 },
        { x: 27, z: 26, h: 1.8, r: 3 },
      ],
    });
  }

  function buildMapInfinite() {
    // Seamless N–S highway — edges match so wrapping feels endless
    clearMapTiles(T.GRASS);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const dx = Math.abs(x - 24);
        if (dx > 8) map[y][x] = ((x * 3 + y * 5) % 11 < 7) ? T.DIRT : T.GRASS;
        else if (dx > 4) map[y][x] = T.DIRT;
      }
    }
    // 4-lane interstate + center median strip (dirt)
    paintRoadNS([21, 22, 23], 0, MAP_H);
    paintRoadNS([25, 26, 27], 0, MAP_H);
    for (let y = 0; y < MAP_H; y++) {
      map[y][24] = T.DIRT;
      if (map[y][20] !== T.ROAD) map[y][20] = T.DIRT;
      if (map[y][28] !== T.ROAD) map[y][28] = T.DIRT;
    }
    // Periodic pull-outs / rest pads (not near wrap seam)
    for (let y = 6; y < MAP_H - 6; y += 10) {
      paintRect(17, y, 2, 2, T.DIRT);
      paintRect(29, y + 3, 2, 2, T.DIRT);
      if (y % 20 === 6) {
        paintBuilding(15, y, 2, 1);
        paintBuilding(31, y + 3, 2, 1);
      }
    }
    buildHeightMap({
      amp: 0.12,
      peaks: [
        { x: 8, z: 12, h: 4, r: 8 },
        { x: 40, z: 28, h: 5, r: 9 },
        { x: 10, z: 36, h: 3.5, r: 7 },
        { x: 38, z: 8, h: 4, r: 8 },
      ],
    });
  }

  const MAP_BUILDERS = {
    city: buildMapCity,
    desert: buildMapDesert,
    coast: buildMapCoast,
    mountain: buildMapMountain,
    harbor: buildMapHarbor,
    tiny: buildMapTiny,
    infinite: buildMapInfinite,
  };

  function applyMapTheme(theme) {
    if (!theme || !scene) return;
    scene.background = new THREE.Color(theme.bg);
    if (scene.fog && scene.fog.isFogExp2) {
      scene.fog.color.setHex(theme.fog);
      scene.fog.density = theme.fogDensity;
    }
    scene.traverse(function (obj) {
      if (!obj.isMesh || !obj.geometry || !obj.material) return;
      if (obj.material.side !== THREE.BackSide || !obj.geometry.attributes.color) return;
      const zenith = new THREE.Color(theme.zenith);
      const midSky = new THREE.Color(theme.mid);
      const horizon = new THREE.Color(theme.horizon);
      const skyPos = obj.geometry.attributes.position;
      const skyCols = obj.geometry.attributes.color;
      const radius = 560;
      for (let i = 0; i < skyPos.count; i++) {
        const y = skyPos.getY(i) / radius;
        const t = THREE.MathUtils.clamp((y + 0.15) / 1.15, 0, 1);
        const c = t > 0.45
          ? midSky.clone().lerp(zenith, (t - 0.45) / 0.55)
          : horizon.clone().lerp(midSky, t / 0.45);
        skyCols.setXYZ(i, c.r, c.g, c.b);
      }
      skyCols.needsUpdate = true;
    });
  }

  function buildMapData() {
    const def = currentMap();
    SPAWN_TX = def.spawn[0];
    SPAWN_TZ = def.spawn[1];
    const builder = MAP_BUILDERS[def.id] || buildMapCity;
    builder();
    applyMapTheme(def.theme);
  }

  function tileAt(tx, ty) {
    if (ty < 0 || tx < 0 || ty >= MAP_H || tx >= MAP_W) return T.WATER;
    return map[ty][tx];
  }

  function cornerBlocked(cx, cy) {
    for (let ty = cy - 1; ty <= cy; ty++) {
      for (let tx = cx - 1; tx <= cx; tx++) {
        if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
        const t = map[ty][tx];
        if (t === T.ROAD || t === T.BUILDING || t === T.WATER) return true;
      }
    }
    return false;
  }

  const DEFAULT_PEAKS = [
    { x: 3.5, z: 3.5, h: 22, r: 8.0 },
    { x: 8.5, z: 14.5, h: 17, r: 7.0 },
    { x: 3.5, z: 22.5, h: 19, r: 7.5 },
    { x: 7.5, z: 34.5, h: 24, r: 8.5 },
    { x: 3.5, z: 42.5, h: 20, r: 7.8 },
    { x: 14.5, z: 3.5, h: 15, r: 6.5 },
    { x: 15.5, z: 15.5, h: 13, r: 6.0 },
    { x: 14.5, z: 28.5, h: 17, r: 7.2 },
    { x: 16.5, z: 42.5, h: 22, r: 8.0 },
    { x: 22.5, z: 8.5, h: 14, r: 6.2 },
    { x: 28.5, z: 3.5, h: 19, r: 7.2 },
    { x: 27.5, z: 15.5, h: 13, r: 6.0 },
    { x: 29.5, z: 29.5, h: 17, r: 7.0 },
    { x: 28.5, z: 42.5, h: 21, r: 8.0 },
    { x: 36.5, z: 5.5, h: 17, r: 7.0 },
    { x: 42.5, z: 3.5, h: 24, r: 8.5 },
    { x: 38.5, z: 16.5, h: 15, r: 6.5 },
    { x: 42.5, z: 24.5, h: 19, r: 7.5 },
    { x: 36.5, z: 34.5, h: 18, r: 7.2 },
    { x: 42.5, z: 42.5, h: 26, r: 9.0 },
    { x: 34.5, z: 42.5, h: 15, r: 6.2 },
    { x: 8.5, z: 8.5, h: 12, r: 5.5 },
    { x: 20.5, z: 36.5, h: 15, r: 6.5 },
    { x: 40.5, z: 10.5, h: 13, r: 5.8 },
    { x: 10.5, z: 40.5, h: 17, r: 7.0 },
    { x: 22.5, z: 20.5, h: 11, r: 5.0 },
    { x: 33.5, z: 22.5, h: 12, r: 5.5 },
    { x: 5.5, z: 28.5, h: 13, r: 6.0 },
    { x: 18.5, z: 6.5, h: 12, r: 5.8 },
    { x: 30.5, z: 36.5, h: 16, r: 6.8 },
    { x: 44.5, z: 30.5, h: 17, r: 7.0 },
    { x: 24.5, z: 44.5, h: 14, r: 6.2 },
    { x: 44.5, z: 14.5, h: 12, r: 5.5 },
    { x: 12.5, z: 22.5, h: 11, r: 5.2 },
  ];

  function buildHeightMap(opts) {
    opts = opts || {};
    const amp = opts.amp != null ? opts.amp : 1;
    const peaks = opts.peaks || DEFAULT_PEAKS;
    heightMap = Array.from({ length: MAP_H + 1 }, () => Array(MAP_W + 1).fill(0));

    for (let cy = 0; cy <= MAP_H; cy++) {
      for (let cx = 0; cx <= MAP_W; cx++) {
        if (cornerBlocked(cx, cy)) {
          heightMap[cy][cx] = 0;
          continue;
        }
        let h = 0;
        for (const p of peaks) {
          const dx = cx - p.x;
          const dz = cy - p.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < p.r) {
            const t = 1 - d / p.r;
            h += p.h * t * t;
          }
        }
        h += Math.sin(cx * 0.55 + cy * 0.35) * 2.2;
        h += Math.cos(cx * 0.28 - cy * 0.62) * 1.7;
        h += Math.sin(cx * 1.4 + cy * 1.1) * 0.75;
        h += Math.cos(cx * 0.9 - cy * 1.6) * 0.6;
        h += Math.sin(cx * 0.18 + cy * 0.22) * 2.5;
        heightMap[cy][cx] = Math.max(0, h * amp);
      }
    }

    for (let pass = 0; pass < 1; pass++) {
      const copy = heightMap.map((row) => row.slice());
      for (let cy = 1; cy < MAP_H; cy++) {
        for (let cx = 1; cx < MAP_W; cx++) {
          if (cornerBlocked(cx, cy)) continue;
          heightMap[cy][cx] =
            (copy[cy][cx] * 3 +
              copy[cy - 1][cx] +
              copy[cy + 1][cx] +
              copy[cy][cx - 1] +
              copy[cy][cx + 1]) /
            7;
        }
      }
    }
    for (let cy = 0; cy <= MAP_H; cy++) {
      for (let cx = 0; cx <= MAP_W; cx++) {
        if (cornerBlocked(cx, cy)) heightMap[cy][cx] = 0;
      }
    }
  }

  function heightAt(x, z) {
    if (!heightMap.length) return 0;
    const fx = THREE.MathUtils.clamp(x / TILE, 0, MAP_W);
    const fz = THREE.MathUtils.clamp(z / TILE, 0, MAP_H);
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(MAP_W, x0 + 1);
    const z1 = Math.min(MAP_H, z0 + 1);
    const tx = fx - x0;
    const tz = fz - z0;
    const h00 = heightMap[z0][x0];
    const h10 = heightMap[z0][x1];
    const h01 = heightMap[z1][x0];
    const h11 = heightMap[z1][x1];
    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    return h0 * (1 - tz) + h1 * tz;
  }

  function groundNormal(x, z) {
    const e = 0.6;
    const hL = heightAt(x - e, z);
    const hR = heightAt(x + e, z);
    const hD = heightAt(x, z - e);
    const hU = heightAt(x, z + e);
    const n = new THREE.Vector3(hL - hR, e * 2, hD - hU);
    n.normalize();
    return n;
  }

  function addInstanced(geo, material, positions, castShadow) {
    const mesh = new THREE.InstancedMesh(geo, material, positions.length);
    mesh.castShadow = !!castShadow;
    mesh.receiveShadow = true;
    const dummy = new THREE.Object3D();
    positions.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rz || 0, 0);
      if (p.sx || p.sy || p.sz) dummy.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
      else dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    worldGroup.add(mesh);
    return mesh;
  }

  function makeGrassClumpGeo(bladeCount, width, height) {
    const positions = [];
    const colors = [];
    const indices = [];
    let vert = 0;
    const base = new THREE.Color(0x1e4a22);
    const mid = new THREE.Color(0x3f8f3a);
    const tip = new THREE.Color(0x8fd45a);
    for (let b = 0; b < bladeCount; b++) {
      const yaw = (b / bladeCount) * Math.PI + (b % 2) * 0.35;
      const lean = 0.08 + (b % 3) * 0.04;
      const h = height * (0.72 + (b % 5) * 0.07);
      const w = width * (0.7 + (b % 3) * 0.18);
      const ox = Math.sin(yaw * 2.1) * 0.04;
      const oz = Math.cos(yaw * 1.7) * 0.04;
      const segs = 4;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const y = t * h;
        const taper = (1 - t * 0.92) * w;
        const sway = lean * t * t;
        const c = base.clone().lerp(mid, Math.min(1, t * 1.4)).lerp(tip, Math.max(0, t - 0.45) / 0.55);
        const x0 = ox - Math.cos(yaw) * taper * 0.5 + Math.sin(yaw) * sway;
        const z0 = oz - Math.sin(yaw) * taper * 0.5 - Math.cos(yaw) * sway * 0.35;
        const x1 = ox + Math.cos(yaw) * taper * 0.5 + Math.sin(yaw) * sway;
        const z1 = oz + Math.sin(yaw) * taper * 0.5 - Math.cos(yaw) * sway * 0.35;
        positions.push(x0, y, z0, x1, y, z1);
        colors.push(c.r, c.g, c.b, c.r * 0.95, c.g, c.b * 0.9);
        if (s < segs) {
          const i = vert + s * 2;
          indices.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
        }
      }
      vert += (segs + 1) * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  function makeGrassWindMaterial(colorMul, roughness) {
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: roughness != null ? roughness : 0.92,
      metalness: 0.02,
      side: THREE.DoubleSide,
      color: colorMul || 0xffffff,
    });
    material.onBeforeCompile = function (shader) {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "float hFac = max(transformed.y, 0.0);",
          "vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);",
          "float wind = sin(uTime * 1.65 + ip.x * 0.42 + ip.z * 0.33);",
          "float wind2 = cos(uTime * 1.15 + ip.z * 0.51 + ip.x * 0.2);",
          "transformed.x += wind * hFac * 0.55;",
          "transformed.z += wind2 * hFac * 0.32;",
        ].join("\n")
      );
      material.userData.shader = shader;
    };
    material.customProgramCacheKey = function () {
      return "grass-wind-v1";
    };
    grassWindMats.push(material);
    return material;
  }

  function addRealisticGrass(theme) {
    const mapId = currentMap().id;
    const dry = mapId === "desert" || mapId === "mountain";
    const sparse = mapId === "desert";
    const grassMul = dressScale("grass", 1);
    if (grassMul <= 0.02) return;
    const perTile = Math.max(1, Math.round((sparse ? 3 : mapId === "harbor" ? 5 : 7) * grassMul));
    const bladeH = sparse ? 0.38 : dry ? 0.52 : 0.68;
    const bladeW = sparse ? 0.07 : 0.1;
    const blades = sparse ? 4 : 6;

    const clumpGeo = makeGrassClumpGeo(blades, bladeW, bladeH);
    const tuftGeo = makeGrassClumpGeo(3, bladeW * 0.75, bladeH * 0.55);

    const lushMul = new THREE.Color(theme.grass[0]);
    const midMul = new THREE.Color(theme.grass[2]);
    const dryMul = new THREE.Color(theme.grass[3]);
    // Keep blade vertex greens, lightly tint toward map theme
    const matA = makeGrassWindMaterial(lushMul.clone().lerp(new THREE.Color(0xffffff), 0.35), dry ? 0.96 : 0.88);
    const matB = makeGrassWindMaterial(midMul.clone().lerp(new THREE.Color(0xffffff), 0.4), 0.9);
    const matC = makeGrassWindMaterial(dryMul.clone().lerp(new THREE.Color(0xffffff), 0.25), 0.95);

    const placements = [];
    const rng = function (n) {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    let seed = 1;
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (map[y][x] !== T.GRASS) continue;
        // Keep spawn pad and road edges a bit clearer
        const nearRoad =
          map[y][x + 1] === T.ROAD ||
          map[y][x - 1] === T.ROAD ||
          map[y + 1][x] === T.ROAD ||
          map[y - 1][x] === T.ROAD;
        const count = nearRoad ? Math.max(2, perTile - 2) : perTile;
        for (let i = 0; i < count; i++) {
          seed += 1;
          const u = rng(seed);
          const v = rng(seed * 1.7 + 3.1);
          const px = (x + 0.08 + u * 0.84) * TILE;
          const pz = (y + 0.08 + v * 0.84) * TILE;
          const gy = heightAt(px, pz);
          const scale = 0.75 + rng(seed + 9) * 0.55;
          const yaw = rng(seed + 4) * Math.PI * 2;
          const kind = rng(seed + 11);
          placements.push({
            x: px,
            y: gy,
            z: pz,
            s: scale * (nearRoad ? 0.85 : 1),
            yaw,
            layer: kind < 0.22 ? 2 : kind < 0.55 ? 1 : 0,
          });
        }
      }
    }

    function plant(geo, material, filter) {
      const list = placements.filter(filter);
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      mesh.frustumCulled = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.yaw, (rng(i * 13.3) - 0.5) * 0.15);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      worldGroup.add(mesh);
    }

    plant(clumpGeo, matA, (p) => p.layer === 0);
    plant(clumpGeo, matB, (p) => p.layer === 1);
    plant(tuftGeo, matC, (p) => p.layer === 2);

    // Soft turf cards under clumps so soil doesn't show through
    const turfN = Math.min(2800, Math.floor(placements.length * 0.55));
    if (turfN > 0) {
      const turfGeo = new THREE.CircleGeometry(0.55, 5);
      turfGeo.rotateX(-Math.PI / 2);
      const turfMat = new THREE.MeshLambertMaterial({
        color: theme.grass[1],
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });
      const turf = new THREE.InstancedMesh(turfGeo, turfMat, turfN);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < turfN; i++) {
        const p = placements[(i * 3) % placements.length];
        dummy.position.set(p.x, p.y + 0.02, p.z);
        dummy.rotation.y = p.yaw;
        const s = 0.7 + (i % 5) * 0.12;
        dummy.scale.set(s, 1, s);
        dummy.updateMatrix();
        turf.setMatrixAt(i, dummy.matrix);
      }
      turf.instanceMatrix.needsUpdate = true;
      worldGroup.add(turf);
    }
  }

  function buildWorld() {
    if (worldGroup) {
      scene.remove(worldGroup);
      worldGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    solids = [];
    crates = [];
    debris.forEach(function (d) { if (d.mesh) scene.remove(d.mesh); });
    debris = [];
    particles.forEach(function (p) { if (p.mesh) scene.remove(p.mesh); });
    particles = [];
    worldFx = [];
    grassWindMats = [];
    buildMapData();

    function placeProp(kind, x, z, opts) {
      opts = opts || {};
      if (!window.OpenRoadsModels) return null;
      const gy = opts.y != null ? opts.y : heightAt(x, z);
      const m = window.OpenRoadsModels.cloneKind(kind, opts.seed || 0, {
        height: opts.height,
        yaw: opts.yaw || 0,
        tint: opts.tint,
        scale: opts.scale,
      });
      if (!m) return null;
      m.position.set(x, gy, z);
      worldGroup.add(m);
      return m;
    }

    const road = [];
    const dirt = [];
    const water = [];
    const buildingPlots = [];

    function neighbor(x, y, t) {
      return map[y] && map[y][x] === t;
    }

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = map[y][x];
        const px = x * TILE + TILE / 2;
        const pz = y * TILE + TILE / 2;
        if (t === T.ROAD) {
          road.push({ x: px, y: 0.12, z: pz });
        } else if (t === T.DIRT) {
          const h = heightAt(px, pz);
          dirt.push({ x: px, y: h + 0.08, z: pz });
        } else if (t === T.WATER) {
          water.push({ x: px, y: -0.2, z: pz });
          solids.push({ type: "water", x: px, z: pz, w: TILE, d: TILE });
        } else if (t === T.BUILDING) {
          const h = 6 + ((x * 3 + y * 5) % 8);
          buildingPlots.push({ x: px, z: pz, h, seed: x * 17 + y * 31 });
          solids.push({ type: "building", x: px, z: pz, w: TILE * 0.88, d: TILE * 0.88 });
        }
      }
    }

    // Driveable terrain mesh (hills only rise on grass/dirt corners)
    const terrainGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_H, Math.floor(MAP_W / 2), Math.floor(MAP_H / 2));
    terrainGeo.rotateX(-Math.PI / 2);
    const pos = terrainGeo.attributes.position;
    const colors = [];
    const theme = currentMap().theme;
    const colorGrass = new THREE.Color(theme.grass[0]);
    const colorGrass2 = new THREE.Color(theme.grass[1]);
    const colorGrass3 = new THREE.Color(theme.grass[2]);
    const colorGrassDry = new THREE.Color(theme.grass[3]);
    const colorDirt = new THREE.Color(theme.dirt[0]);
    const colorDirt2 = new THREE.Color(theme.dirt[1]);
    const colorRoad = new THREE.Color(theme.road[0]);
    const colorRoad2 = new THREE.Color(theme.road[1]);
    const colorWater = new THREE.Color(theme.water[0]);
    const colorWater2 = new THREE.Color(theme.water[1]);
    const colorPad = new THREE.Color(0x7e868e);
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i) + WORLD_W / 2;
      const vz = pos.getZ(i) + WORLD_H / 2;
      const cx = Math.round(vx / TILE);
      const cy = Math.round(vz / TILE);
      const h = heightMap[cy] && heightMap[cy][cx] !== undefined ? heightMap[cy][cx] : 0;
      pos.setY(i, h);
      const tx = Math.min(MAP_W - 1, Math.max(0, Math.floor(vx / TILE)));
      const ty = Math.min(MAP_H - 1, Math.max(0, Math.floor(vz / TILE)));
      const tile = map[ty][tx];
      let c = colorGrass;
      if (tile === T.ROAD) c = (tx + ty) % 3 === 0 ? colorRoad2 : colorRoad;
      else if (tile === T.DIRT) c = (tx * ty) % 2 ? colorDirt2 : colorDirt;
      else if (tile === T.WATER) c = (tx + ty) % 2 ? colorWater2 : colorWater;
      else if (tile === T.BUILDING) c = colorPad;
      else if (h > 1.8) c = colorGrassDry;
      else if ((tx + ty) % 3 === 0) c = colorGrass3;
      else if ((tx + ty) % 2) c = colorGrass2;
      // Richer mottling + slope shading hint
      const mott = 0.88 + 0.1 * Math.sin(tx * 2.1 + ty * 1.7) + 0.04 * Math.sin(h * 1.4);
      const shade = 1 - Math.min(0.12, h * 0.02);
      colors.push(c.r * mott * shade, c.g * mott * shade, c.b * mott * (shade * 0.98));
    }
    terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    pos.needsUpdate = true;
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.03,
        flatShading: false,
      })
    );
    terrain.position.set(WORLD_W / 2, 0, WORLD_H / 2);
    terrain.receiveShadow = true;
    terrain.castShadow = false;
    worldGroup.add(terrain);

    addRealisticGrass(theme);

    // Flat road overlays so lane markings sit cleanly
    const tileGeo = new THREE.BoxGeometry(TILE, 0.2, TILE);
    if (road.length) addInstanced(tileGeo, mat(theme.road[0], { roughness: 0.88, metalness: 0.06 }), road, false);
    if (dirt.length) addInstanced(tileGeo, mat(theme.dirt[0], { roughness: 0.96 }), dirt, false);
    if (water.length) {
      addInstanced(
        tileGeo,
        mat(theme.water[0], { roughness: 0.12, metalness: 0.45, transparent: true, opacity: 0.92 }),
        water,
        false
      );
    }

    // Detailed buildings (unique per plot)
    const facadeColors = [0x75808c, 0x857568, 0x687888, 0x94867a, 0x586878, 0x7a6666, 0x687868, 0x8a8078];
    const roofColors = [0x3e464f, 0x52362e, 0x323a44, 0x624838, 0x2a323c];
    const winMat = mat(0xc2dff5, { roughness: 0.12, metalness: 0.45, emissive: 0x1a3048, emissiveIntensity: 0.18 });
    const winLit = mat(0xffe8b0, { roughness: 0.28, metalness: 0.12, emissive: 0xffcc66, emissiveIntensity: 0.62 });

    const buildingKeep = Math.min(1, Math.max(0, dressScale("buildings", 1)));
    const keptPlots = [];
    for (let bi = 0; bi < buildingPlots.length; bi++) {
      if (buildingKeep >= 1 || Math.random() < buildingKeep) keptPlots.push(buildingPlots[bi]);
    }
    // Drop solids for culled building pads
    if (keptPlots.length < buildingPlots.length) {
      const keepSet = new Set(keptPlots.map((b) => b.x + "," + b.z));
      solids = solids.filter((s) => s.type !== "building" || keepSet.has(s.x + "," + s.z));
    }

    for (const b of keptPlots) {
      // Prefer real Kenney building GLTFs when loaded
      if (window.OpenRoadsModels) {
        const tall = b.h >= 12;
        const kind = tall ? "buildingTall" : (b.seed % 3 === 0 ? "buildingLow" : "building");
        const model = window.OpenRoadsModels.cloneKind(kind, b.seed, {
          height: Math.max(5.5, Math.min(b.h * 1.05, tall ? 28 : 16)),
          yaw: ((b.seed % 4) * Math.PI) / 2,
          tint: b.seed,
        });
        if (model) {
          model.position.set(b.x, 0, b.z);
          worldGroup.add(model);
          continue;
        }
      }
      const facade = mat(facadeColors[b.seed % facadeColors.length], { roughness: 0.78 });
      const roof = mat(roofColors[b.seed % roofColors.length], { roughness: 0.85 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.86, b.h, TILE * 0.86), facade);
      body.position.set(b.x, b.h / 2, b.z);
      body.castShadow = false;
      body.receiveShadow = false;
      body.receiveShadow = true;
      worldGroup.add(body);

      // Foundation plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.9, 0.35, TILE * 0.9), mat(0xb8b0a4, { roughness: 0.85 }));
      plinth.position.set(b.x, 0.18, b.z);
      plinth.receiveShadow = true;
      worldGroup.add(plinth);

      const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.92, 0.35, TILE * 0.92), roof);
      roofMesh.position.set(b.x, b.h + 0.15, b.z);
      roofMesh.castShadow = false;
      worldGroup.add(roofMesh);

      // Rooftop AC unit
      if (b.seed % 3 !== 0) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.8), mat(0x7a828c));
        ac.position.set(b.x + 1.5, b.h + 0.7, b.z - 1.2);
        worldGroup.add(ac);
      }

      // Windows grid on 4 sides
      for (let wy = 1.4; wy < b.h - 0.8; wy += 2.1) {
        for (let wx = -3.2; wx <= 3.2; wx += 2.4) {
          const lit = ((b.seed + Math.floor(wy) + Math.floor(wx)) % 5) === 0;
          const m = lit ? winLit : winMat;
          const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.15, 0.08), m);
          w1.position.set(b.x + wx, wy, b.z + TILE * 0.43);
          worldGroup.add(w1);
          const frame1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.3, 0.05), mat(0xd8d0c4));
          frame1.position.set(b.x + wx, wy, b.z + TILE * 0.425);
          worldGroup.add(frame1);
          const w2 = w1.clone();
          w2.position.z = b.z - TILE * 0.43;
          worldGroup.add(w2);
          const frame2 = frame1.clone();
          frame2.position.z = b.z - TILE * 0.425;
          worldGroup.add(frame2);
          const w3 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 1.1), m);
          w3.position.set(b.x + TILE * 0.43, wy, b.z + wx);
          worldGroup.add(w3);
          const frame3 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 1.25), mat(0xd8d0c4));
          frame3.position.set(b.x + TILE * 0.425, wy, b.z + wx);
          worldGroup.add(frame3);
          const w4 = w3.clone();
          w4.position.x = b.x - TILE * 0.43;
          worldGroup.add(w4);
          const frame4 = frame3.clone();
          frame4.position.x = b.x - TILE * 0.425;
          worldGroup.add(frame4);

          // Window AC unit on some openings
          if (((b.seed + Math.floor(wy) + Math.floor(wx * 2)) % 7) === 0 && wy < b.h - 3) {
            const acWin = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.55), mat(0x8a9098, { metalness: 0.4, roughness: 0.45 }));
            acWin.position.set(b.x + wx, wy - 0.2, b.z + TILE * 0.55);
            worldGroup.add(acWin);
          }
        }
      }

      // Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.12), mat(0x2a221c));
      door.position.set(b.x, 1.2, b.z + TILE * 0.44);
      worldGroup.add(door);
      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.7, 0.08), mat(0xcfc6b8));
      doorFrame.position.set(b.x, 1.35, b.z + TILE * 0.435);
      worldGroup.add(doorFrame);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), mat(0xd4a017, { metalness: 0.8, roughness: 0.25 }));
      knob.position.set(b.x + 0.55, 1.15, b.z + TILE * 0.52);
      worldGroup.add(knob);
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.7), mat(0xb8b0a4));
      step.position.set(b.x, 0.2, b.z + TILE * 0.55);
      worldGroup.add(step);
      // Address plaque
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 0.04), mat(0xe8e0d0));
      plaque.position.set(b.x - 1.35, 2.2, b.z + TILE * 0.44);
      worldGroup.add(plaque);

      // Graffiti / mural splash on alley side
      if (b.seed % 4 === 3) {
        const mural = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, 2.8, 3.2),
          mat([0xe85d4c, 0x5b8def, 0x3dcfb6, 0xf0c400][b.seed % 4], { roughness: 0.95 })
        );
        mural.position.set(b.x - TILE * 0.44, 2.2, b.z);
        worldGroup.add(mural);
        const mural2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.2, 1.4), mat(0x22262e));
        mural2.position.set(b.x - TILE * 0.445, 3.4, b.z + 0.8);
        worldGroup.add(mural2);
      }

      // Awning (detailed storefront model when available)
      if (b.seed % 2 === 0) {
        if (!placeProp("awning", b.x, b.z + TILE * 0.42, { y: 2.2, height: 1.4, yaw: 0, seed: b.seed })) {
          const awnCols = [0xc45c48, 0x3d6ea5, 0xd4a017, 0x2f5d4a, 0x6a5a8a];
          const awning = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 1.6), mat(awnCols[b.seed % awnCols.length]));
          awning.position.set(b.x, 2.7, b.z + TILE * 0.5);
          worldGroup.add(awning);
        }
      }

      // Cornice / ledge under roof
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.94, 0.18, TILE * 0.94), mat(0xd8d0c4, { roughness: 0.7 }));
      cornice.position.set(b.x, b.h - 0.15, b.z);
      worldGroup.add(cornice);

      // Storefront glass band on ground floor
      if (b.seed % 3 !== 2) {
        const store = new THREE.Mesh(
          new THREE.BoxGeometry(TILE * 0.7, 1.6, 0.1),
          mat(0x88b8d8, { roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.55 })
        );
        store.position.set(b.x, 1.6, b.z + TILE * 0.44);
        worldGroup.add(store);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.72, 0.12, 0.2), mat(0xcfc6b8));
        sill.position.set(b.x, 0.75, b.z + TILE * 0.48);
        worldGroup.add(sill);
      }

      // Balcony on taller buildings
      if (b.h > 10 && b.seed % 2 === 1) {
        const balc = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.2), mat(0x6a7380));
        balc.position.set(b.x, Math.min(b.h - 2.5, 6.5), b.z + TILE * 0.5);
        worldGroup.add(balc);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.06), mat(0xcfd8e6, { metalness: 0.7, roughness: 0.3 }));
        rail.position.set(b.x, balc.position.y + 0.35, balc.position.z + 0.55);
        worldGroup.add(rail);
      }

      // Chimney / vent variety
      if (b.seed % 4 === 0) {
        const chim = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.9), mat(0x5a4030));
        chim.position.set(b.x - 2, b.h + 1.0, b.z + 1.5);
        worldGroup.add(chim);
      }

      // Rooftop water tower / satellite
      if (b.h > 9 && b.seed % 3 === 1) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 1.6, 10), mat(0x8a9098, { metalness: 0.55, roughness: 0.4 }));
        tank.position.set(b.x + 2.2, b.h + 1.4, b.z - 2);
        worldGroup.add(tank);
        const tankLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 5), mat(0x555b63));
        tankLeg.position.set(b.x + 2.2, b.h + 0.5, b.z - 2);
        worldGroup.add(tankLeg);
      } else if (b.seed % 3 === 2) {
        const dish = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xd8dde6, { metalness: 0.7, roughness: 0.3 }));
        dish.position.set(b.x - 1.5, b.h + 0.7, b.z + 1.8);
        dish.rotation.x = -0.5;
        worldGroup.add(dish);
        const dishArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 5), mat(0x555b63));
        dishArm.position.set(b.x - 1.5, b.h + 0.4, b.z + 1.8);
        worldGroup.add(dishArm);
      }

      // Side alley pipes
      if (b.seed % 5 === 0) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, b.h * 0.7, 6), mat(0x6a727a, { metalness: 0.6, roughness: 0.4 }));
        pipe.position.set(b.x + TILE * 0.42, b.h * 0.35, b.z - 2);
        worldGroup.add(pipe);
      }

      // Dumpster / recycling behind some buildings
      if (b.seed % 3 === 0) {
        const dump = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.4), mat(0x3d6a4a, { metalness: 0.35, roughness: 0.55 }));
        dump.position.set(b.x + TILE * 0.55, 0.75, b.z - TILE * 0.15);
        dump.castShadow = true;
        worldGroup.add(dump);
        const lid = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.1, 1.45), mat(0x2a4a35));
        lid.position.set(b.x + TILE * 0.55, 1.45, b.z - TILE * 0.15);
        lid.rotation.x = -0.15;
        worldGroup.add(lid);
        const wheelL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), mat(0x1a1d22));
        wheelL.rotation.z = Math.PI / 2;
        wheelL.position.set(b.x + TILE * 0.55 - 0.8, 0.15, b.z - TILE * 0.15 + 0.5);
        worldGroup.add(wheelL);
      }
    }

    // Road markings — clean center dashes + outer edges only (roads are 2 tiles wide)
    const markMat = mat(0xf0dc88, { roughness: 0.48, emissive: 0x3a3010, emissiveIntensity: 0.08 });
    const edgeMat = mat(0xf2f6fb, { roughness: 0.52 });
    const dashGeo = new THREE.BoxGeometry(0.34, 0.05, 2.1);
    const edgeGeoNS = new THREE.BoxGeometry(0.16, 0.04, TILE * 0.92); // long north-south
    const edgeGeoEW = new THREE.BoxGeometry(TILE * 0.92, 0.04, 0.16); // long east-west
    const dashes = [];
    const edgesNS = [];
    const edgesEW = [];

    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (map[y][x] !== T.ROAD) continue;
        const px = x * TILE + TILE / 2;
        const pz = y * TILE + TILE / 2;

        // Center dash only on the seam of a 2-wide vertical strip (west tile of the pair)
        if (neighbor(x + 1, y, T.ROAD) && !neighbor(x - 1, y, T.ROAD)) {
          // Avoid painting through E-W cross streets
          const onCrossStreet =
            neighbor(x - 1, y, T.ROAD) ||
            neighbor(x + 2, y, T.ROAD) ||
            (neighbor(x, y - 1, T.ROAD) && neighbor(x + 1, y - 1, T.ROAD) && neighbor(x + 2, y - 1, T.ROAD)) ||
            (neighbor(x, y + 1, T.ROAD) && neighbor(x + 1, y + 1, T.ROAD) && neighbor(x + 2, y + 1, T.ROAD));
          // Only when this is mainly a N-S corridor
          const nsRun = neighbor(x, y - 1, T.ROAD) || neighbor(x, y + 1, T.ROAD);
          if (nsRun && !onCrossStreet && y % 2 === 0) {
            dashes.push({ x: px + TILE / 2, y: 0.28, z: pz, rz: 0 });
          }
        }

        // Center dash on seam of 2-wide horizontal strip (north tile of the pair)
        if (neighbor(x, y + 1, T.ROAD) && !neighbor(x, y - 1, T.ROAD)) {
          const onCrossStreet =
            neighbor(x, y - 1, T.ROAD) ||
            neighbor(x, y + 2, T.ROAD) ||
            (neighbor(x - 1, y, T.ROAD) && neighbor(x - 1, y + 1, T.ROAD) && neighbor(x - 1, y + 2, T.ROAD)) ||
            (neighbor(x + 1, y, T.ROAD) && neighbor(x + 1, y + 1, T.ROAD) && neighbor(x + 1, y + 2, T.ROAD));
          const ewRun = neighbor(x - 1, y, T.ROAD) || neighbor(x + 1, y, T.ROAD);
          if (ewRun && !onCrossStreet && x % 2 === 0) {
            dashes.push({ x: px, y: 0.28, z: pz + TILE / 2, rz: Math.PI / 2 });
          }
        }

        // Outer white edge — only against non-road (and not water interior clutter)
        const leftClear = !neighbor(x - 1, y, T.ROAD);
        const rightClear = !neighbor(x + 1, y, T.ROAD);
        const upClear = !neighbor(x, y - 1, T.ROAD);
        const downClear = !neighbor(x, y + 1, T.ROAD);

        // Vertical road outer edges (left/right of N-S run)
        if (leftClear && (neighbor(x, y - 1, T.ROAD) || neighbor(x, y + 1, T.ROAD) || neighbor(x + 1, y, T.ROAD))) {
          edgesNS.push({ x: px - TILE * 0.46, y: 0.27, z: pz });
        }
        if (rightClear && (neighbor(x, y - 1, T.ROAD) || neighbor(x, y + 1, T.ROAD) || neighbor(x - 1, y, T.ROAD))) {
          edgesNS.push({ x: px + TILE * 0.46, y: 0.27, z: pz });
        }
        // Horizontal road outer edges (top/bottom of E-W run)
        if (upClear && (neighbor(x - 1, y, T.ROAD) || neighbor(x + 1, y, T.ROAD))) {
          edgesEW.push({ x: px, y: 0.27, z: pz - TILE * 0.46 });
        }
        if (downClear && (neighbor(x - 1, y, T.ROAD) || neighbor(x + 1, y, T.ROAD))) {
          edgesEW.push({ x: px, y: 0.27, z: pz + TILE * 0.46 });
        }
      }
    }

    function addDetailInstanced(geo, material, list) {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      mesh.receiveShadow = true;
      const dummy = new THREE.Object3D();
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rz || 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      worldGroup.add(mesh);
    }
    addDetailInstanced(dashGeo, markMat, dashes);
    addDetailInstanced(edgeGeoNS, edgeMat, edgesNS);
    addDetailInstanced(edgeGeoEW, edgeMat, edgesEW);

    // --- Sidewalks, curbs, crosswalks, manholes ---
    const walkMat = mat(0xa8b0ba, { roughness: 0.9 });
    const curbMat = mat(0xc8d0d8, { roughness: 0.72 });
    const crossMat = mat(0xf5f8fb, { roughness: 0.5 });
    const patchMat = mat(0x2e343c, { roughness: 0.95 });
    const manholeMat = mat(0x424a54, { metalness: 0.6, roughness: 0.4 });
    const sidewalks = [];
    const curbs = [];
    const crosses = [];
    const patches = [];
    const manholes = [];

    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        const px = x * TILE + TILE / 2;
        const pz = y * TILE + TILE / 2;

        // Sidewalk pads on grass that touches road
        if (map[y][x] === T.GRASS) {
          const tr =
            neighbor(x + 1, y, T.ROAD) || neighbor(x - 1, y, T.ROAD) ||
            neighbor(x, y + 1, T.ROAD) || neighbor(x, y - 1, T.ROAD);
          if (tr && (x + y) % 2 === 0) {
            const gy = heightAt(px, pz);
            sidewalks.push({ x: px, y: gy + 0.14, z: pz });
          }
        }

        if (map[y][x] !== T.ROAD) continue;

        // Curb strips on road edges against non-road
        if (!neighbor(x - 1, y, T.ROAD) && map[y][x - 1] !== T.WATER) {
          curbs.push({ x: px - TILE * 0.48, y: 0.22, z: pz, rz: 0, sx: 0.35, sy: 1, sz: 1 });
        }
        if (!neighbor(x + 1, y, T.ROAD) && map[y][x + 1] !== T.WATER) {
          curbs.push({ x: px + TILE * 0.48, y: 0.22, z: pz, rz: 0, sx: 0.35, sy: 1, sz: 1 });
        }
        if (!neighbor(x, y - 1, T.ROAD) && map[y - 1] && map[y - 1][x] !== T.WATER) {
          curbs.push({ x: px, y: 0.22, z: pz - TILE * 0.48, rz: Math.PI / 2, sx: 0.35, sy: 1, sz: 1 });
        }
        if (!neighbor(x, y + 1, T.ROAD) && map[y + 1] && map[y + 1][x] !== T.WATER) {
          curbs.push({ x: px, y: 0.22, z: pz + TILE * 0.48, rz: Math.PI / 2, sx: 0.35, sy: 1, sz: 1 });
        }

        // Crosswalk bars where road meets perpendicular road
        const isIntersection =
          (neighbor(x - 1, y, T.ROAD) || neighbor(x + 1, y, T.ROAD)) &&
          (neighbor(x, y - 1, T.ROAD) || neighbor(x, y + 1, T.ROAD));
        if (isIntersection && (x + y) % 3 === 0) {
          for (let k = -2; k <= 2; k++) {
            crosses.push({ x: px + k * 1.1, y: 0.26, z: pz - TILE * 0.35, rz: 0 });
            crosses.push({ x: px + k * 1.1, y: 0.26, z: pz + TILE * 0.35, rz: 0 });
          }
        }

        // Asphalt patches + manholes
        if ((x * 9 + y * 4) % 11 === 0) {
          patches.push({ x: px + ((x % 3) - 1) * 2.5, y: 0.24, z: pz + ((y % 3) - 1) * 2.2, rz: (x % 5) * 0.3 });
        }
        if ((x * 3 + y * 7) % 13 === 0) {
          manholes.push({ x: px + 2.2, y: 0.25, z: pz - 1.5 });
        }
      }
    }

    function addScaledInstanced(geo, material, list) {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      mesh.receiveShadow = true;
      const dummy = new THREE.Object3D();
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rz || 0, 0);
        dummy.scale.set(p.sx || 1, p.sy || 1, p.sz || 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      worldGroup.add(mesh);
    }

    addScaledInstanced(new THREE.BoxGeometry(TILE * 0.92, 0.12, TILE * 0.92), walkMat, sidewalks);
    addScaledInstanced(new THREE.BoxGeometry(0.45, 0.28, TILE * 0.95), curbMat, curbs);
    addDetailInstanced(new THREE.BoxGeometry(0.55, 0.04, 2.4), crossMat, crosses);
    addDetailInstanced(new THREE.BoxGeometry(2.8, 0.03, 1.6), patchMat, patches);
    if (manholes.length) {
      const mh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), manholeMat, manholes.length);
      mh.receiveShadow = true;
      const dummy = new THREE.Object3D();
      manholes.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        mh.setMatrixAt(i, dummy.matrix);
      });
      mh.instanceMatrix.needsUpdate = true;
      worldGroup.add(mh);
    }

    // Street lights on the curb (grass edge), never in the driving lane
    const poleMat = mat(0x2e333a, { metalness: 0.7, roughness: 0.35 });
    const lampMat = mat(0xfff4d4, { emissive: 0xffe2a8, emissiveIntensity: 0.95 });
    let lampCount = 0;
    const lampTops = [];
    const curbInset = 1.1; // sit just off the road surface
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (map[y][x] !== T.ROAD) continue;
        // Space lights along the street (sparser when streetProps is low)
        const lampStride = Math.max(6, Math.round(8 / Math.max(0.2, dressScale("streetProps", 1))));
        if ((x + y * 3) % lampStride !== 0) continue;

        // Prefer an outer edge (road next to non-road)
        const sides = [];
        if (!neighbor(x - 1, y, T.ROAD) && map[y][x - 1] !== T.WATER && map[y][x - 1] !== T.BUILDING) {
          sides.push({ px: x * TILE + curbInset, pz: y * TILE + TILE / 2, ax: 1, az: 0 });
        }
        if (!neighbor(x + 1, y, T.ROAD) && map[y][x + 1] !== T.WATER && map[y][x + 1] !== T.BUILDING) {
          sides.push({ px: x * TILE + TILE - curbInset, pz: y * TILE + TILE / 2, ax: -1, az: 0 });
        }
        if (!neighbor(x, y - 1, T.ROAD) && map[y - 1] && map[y - 1][x] !== T.WATER && map[y - 1][x] !== T.BUILDING) {
          sides.push({ px: x * TILE + TILE / 2, pz: y * TILE + curbInset, ax: 0, az: 1 });
        }
        if (!neighbor(x, y + 1, T.ROAD) && map[y + 1] && map[y + 1][x] !== T.WATER && map[y + 1][x] !== T.BUILDING) {
          sides.push({ px: x * TILE + TILE / 2, pz: y * TILE + TILE - curbInset, ax: 0, az: -1 });
        }
        if (!sides.length) continue;

        // One light per road tile — pick the side that faces open grass when possible
        let spot = sides[0];
        for (const s of sides) {
          const tx = Math.floor(s.px / TILE);
          const ty = Math.floor(s.pz / TILE);
          if (map[ty] && map[ty][tx] === T.GRASS) {
            spot = s;
            break;
          }
        }

        // Nudge fully onto the sidewalk/grass so the pole base is not on asphalt
        const px = spot.px - spot.ax * (curbInset + 0.5);
        const pz = spot.pz - spot.az * (curbInset + 0.5);
        const ax = spot.ax;
        const az = spot.az;
        // Skip if we somehow landed in water/building
        const baseTx = Math.floor(px / TILE);
        const baseTy = Math.floor(pz / TILE);
        if (!map[baseTy] || map[baseTy][baseTx] === T.WATER || map[baseTy][baseTx] === T.BUILDING || map[baseTy][baseTx] === T.ROAD) {
          continue;
        }
        const groundY = heightAt(px, pz);
        const yaw = Math.atan2(ax, az);
        const lampModel = placeProp("lamp", px, pz, {
          y: groundY,
          height: 5.8,
          yaw: yaw,
          seed: x * 17 + y,
        });
        if (lampModel) {
          lampTops.push({ x: px, y: groundY + 5.5, z: pz });
        } else {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.5, 6), poleMat);
          pole.position.set(px, groundY + 2.75, pz);
          worldGroup.add(pole);
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.18, 8), poleMat);
          collar.position.set(px, groundY + 0.12, pz);
          worldGroup.add(collar);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(ax) * 2.2 + 0.12, 0.12, Math.abs(az) * 2.2 + 0.12), poleMat);
          arm.position.set(px + ax * 1.0, groundY + 5.4, pz + az * 1.0);
          worldGroup.add(arm);
          const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), lampMat);
          lamp.position.set(px + ax * 1.9, groundY + 5.2, pz + az * 1.9);
          worldGroup.add(lamp);
          const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.48, 10, 8),
            new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.18, depthWrite: false })
          );
          glow.position.copy(lamp.position);
          worldGroup.add(glow);
          lampTops.push({ x: px, y: groundY + 5.5, z: pz });
        }
      }
    }

    // Sagging power cables skipped for performance
    if (false) {
    for (let i = 0; i < lampTops.length; i++) {
      const a = lampTops[i];
      let best = null;
      let bestD = 28;
      for (let j = i + 1; j < lampTops.length; j++) {
        const b = lampTops[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < bestD && d > 8) {
          bestD = d;
          best = b;
        }
      }
      if (!best) continue;
      const midX = (a.x + best.x) / 2;
      const midZ = (a.z + best.z) / 2;
      const midY = Math.min(a.y, best.y) - 0.85;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(a.x, a.y, a.z),
        new THREE.Vector3(midX, midY, midZ),
        new THREE.Vector3(best.x, best.y, best.z)
      );
      const cable = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 6, 0.035, 3, false),
        cableMat
      );
      worldGroup.add(cable);
    }
    } // end skipped cables

    // --- Street furniture: benches, bins, hydrants, signs, mailboxes, planters ---
    const benchSeatMat = mat(0x7a5634, { roughness: 0.82 });
    const benchMetalMat = mat(0x3e464e, { metalness: 0.7, roughness: 0.35 });
    const binMat = mat(0x425448, { roughness: 0.68, metalness: 0.15 });
    const hydrantMat = mat(0xd62828, { metalness: 0.4, roughness: 0.4, emissive: 0x400808, emissiveIntensity: 0.08 });
    const signPostMat = mat(0x505860, { metalness: 0.55, roughness: 0.4 });
    const stopFaceMat = mat(0xd62828, { roughness: 0.5, emissive: 0x400808, emissiveIntensity: 0.12 });
    const yieldFaceMat = mat(0xf5a820, { roughness: 0.5, emissive: 0x402800, emissiveIntensity: 0.1 });
    const mailMat = mat(0x2f68b8, { metalness: 0.45, roughness: 0.35 });
    const planterMat = mat(0x947850, { roughness: 0.88 });
    const planterDirtMat = mat(0x3e2c1a, { roughness: 0.95 });
    const planterLeafMat = mat(0x348a3c, { roughness: 0.85 });
    let furnitureSeed = 0;

    const streetMul = Math.max(0.05, dressScale("streetProps", 1));
    function curbSideSpots(stride, offset) {
      const spots = [];
      const adj = Math.max(4, Math.round(stride / streetMul));
      for (let y = 2; y < MAP_H - 2; y++) {
        for (let x = 2; x < MAP_W - 2; x++) {
          if (map[y][x] !== T.ROAD) continue;
          if ((x * 7 + y * 11 + offset) % adj !== 0) continue;
          const candidates = [];
          if (!neighbor(x - 1, y, T.ROAD) && map[y][x - 1] !== T.WATER && map[y][x - 1] !== T.BUILDING) {
            candidates.push({ px: x * TILE - 0.4, pz: y * TILE + TILE / 2, yaw: Math.PI / 2 });
          }
          if (!neighbor(x + 1, y, T.ROAD) && map[y][x + 1] !== T.WATER && map[y][x + 1] !== T.BUILDING) {
            candidates.push({ px: x * TILE + TILE + 0.4, pz: y * TILE + TILE / 2, yaw: -Math.PI / 2 });
          }
          if (!neighbor(x, y - 1, T.ROAD) && map[y - 1] && map[y - 1][x] !== T.WATER && map[y - 1][x] !== T.BUILDING) {
            candidates.push({ px: x * TILE + TILE / 2, pz: y * TILE - 0.4, yaw: 0 });
          }
          if (!neighbor(x, y + 1, T.ROAD) && map[y + 1] && map[y + 1][x] !== T.WATER && map[y + 1][x] !== T.BUILDING) {
            candidates.push({ px: x * TILE + TILE / 2, pz: y * TILE + TILE + 0.4, yaw: Math.PI });
          }
          if (!candidates.length) continue;
          const c = candidates[furnitureSeed++ % candidates.length];
          const tx = Math.floor(c.px / TILE);
          const ty = Math.floor(c.pz / TILE);
          if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING || map[ty][tx] === T.ROAD) continue;
          spots.push(c);
        }
      }
      return spots;
    }

    curbSideSpots(15, 1).forEach((s, i) => {
      if (i % 4 !== 0) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("bench", s.px, s.pz, { y: gy, height: 0.95, yaw: s.yaw, seed: i })) return;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.5), benchSeatMat);
      seat.position.set(s.px, gy + 0.55, s.pz);
      seat.rotation.y = s.yaw;
      worldGroup.add(seat);
    });

    curbSideSpots(13, 3).forEach((s, i) => {
      if (i % 2 !== 0) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("bin", s.px, s.pz, { y: gy, height: 1.05, yaw: s.yaw, seed: i })) return;
      const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.9, 8), binMat);
      bin.position.set(s.px, gy + 0.5, s.pz);
      worldGroup.add(bin);
    });

    curbSideSpots(17, 5).forEach((s, i) => {
      if (i % 2 !== 1) return;
      const gy = heightAt(s.px, s.pz);
      if (i % 4 === 1) {
        if (placeProp("cone", s.px, s.pz, { y: gy, height: 0.9, yaw: s.yaw, seed: i })) return;
      } else if (i % 4 === 3) {
        if (placeProp("barrier", s.px, s.pz, { y: gy, height: 1.15, yaw: s.yaw, seed: i })) return;
      }
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), hydrantMat);
      body.position.set(s.px, gy + 0.4, s.pz);
      worldGroup.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), hydrantMat);
      cap.position.set(s.px, gy + 0.82, s.pz);
      worldGroup.add(cap);
    });

    curbSideSpots(19, 7).forEach((s, i) => {
      if (i % 4 !== 0) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("sign", s.px, s.pz, { y: gy, height: 3.2, yaw: s.yaw, seed: i })) return;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), signPostMat);
      post.position.set(s.px, gy + 1.3, s.pz);
      worldGroup.add(post);
    });

    curbSideSpots(23, 2).forEach((s, i) => {
      if (i % 3 !== 1) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("furniture", s.px, s.pz, { y: gy, height: 1.15, yaw: s.yaw, seed: i + 50 })) return;
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.7, 0.3), mailMat);
      box.position.set(s.px, gy + 0.85, s.pz);
      box.rotation.y = s.yaw;
      worldGroup.add(box);
    });

    curbSideSpots(15, 9).forEach((s, i) => {
      if (i % 4 !== 2) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("pot", s.px, s.pz, { y: gy, height: 1.1, yaw: s.yaw, seed: i })) return;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.45, 8), planterMat);
      pot.position.set(s.px, gy + 0.28, s.pz);
      worldGroup.add(pot);
    });

    // Vending / street appliances (detailed fridge & furniture models)
    curbSideSpots(29, 4).forEach((s, i) => {
      if (i % 5 !== 0) return;
      const gy = heightAt(s.px, s.pz);
      if (placeProp("furniture", s.px, s.pz, { y: gy, height: 1.85, yaw: s.yaw, seed: i + 20 })) return;
      const vend = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.7, 0.7), mat(i % 3 === 0 ? 0xc44536 : 0x3d6ea5));
      vend.position.set(s.px, gy + 0.95, s.pz);
      vend.rotation.y = s.yaw;
      worldGroup.add(vend);
    });

    // Parking meters
    curbSideSpots(31, 6).forEach((s, i) => {
      if (i % 4 !== 1) return;
      const gy = heightAt(s.px, s.pz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.1, 6), mat(0x555b63, { metalness: 0.5, roughness: 0.4 }));
      pole.position.set(s.px, gy + 0.6, s.pz);
      worldGroup.add(pole);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.4, 0.22), mat(0x3a4048, { metalness: 0.45, roughness: 0.4 }));
      head.position.set(s.px, gy + 1.25, s.pz);
      head.rotation.y = s.yaw;
      worldGroup.add(head);
      const dial = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), mat(0xe8e0d0));
      dial.position.set(s.px + Math.sin(s.yaw) * 0.12, gy + 1.3, s.pz + Math.cos(s.yaw) * 0.12);
      dial.rotation.y = s.yaw;
      worldGroup.add(dial);
    });

    // Street name blades at major intersections
    for (let y = 4; y < MAP_H - 4; y += 6) {
      for (let x = 4; x < MAP_W - 4; x += 6) {
        if (map[y][x] !== T.ROAD) continue;
        const isCross =
          neighbor(x - 1, y, T.ROAD) &&
          neighbor(x + 1, y, T.ROAD) &&
          neighbor(x, y - 1, T.ROAD) &&
          neighbor(x, y + 1, T.ROAD);
        if (!isCross && (x + y) % 8 !== 0) continue;
        const px = x * TILE + 1.2;
        const pz = y * TILE + 1.2;
        const gy = heightAt(px, pz);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 3.2, 6), mat(0x555b63));
        post.position.set(px, gy + 1.6, pz);
        worldGroup.add(post);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 0.08), mat(0x2b5ea8));
        blade.position.set(px + 0.6, gy + 3.0, pz);
        worldGroup.add(blade);
        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 1.6), mat(0x2b5ea8));
        blade2.position.set(px, gy + 2.7, pz + 0.5);
        worldGroup.add(blade2);
      }
    }

    // Traffic cones near garage / dirt
    const coneGeo = new THREE.ConeGeometry(0.35, 0.9, 10);
    const coneMat = mat(0xff7a28, { roughness: 0.55, emissive: 0x4a1800, emissiveIntensity: 0.08 });
    [[SPAWN_TX - 1.3, SPAWN_TZ], [SPAWN_TX + 1.3, SPAWN_TZ], [SPAWN_TX, SPAWN_TZ - 1.5], [8.2, 8.5], [9.5, 9.2], [12.5, 12.2], [36.2, 36.5], [35.4, 16.8], [42.2, 24.5], [18.5, 42.2]].forEach(([tx, tz]) => {
      const px = tx * TILE;
      const pz = tz * TILE;
      const gy = heightAt(px, pz);
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(px, gy + 0.55, pz);
      cone.castShadow = true;
      worldGroup.add(cone);
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 8), mat(0xf5f5f5));
      stripe.position.set(px, gy + 0.45, pz);
      worldGroup.add(stripe);
    });

    // Wooden pallets + cardboard boxes near alleys
    [[13, 8], [24, 14], [9, 23], [27, 21], [36, 12], [40, 28], [18, 40], [32, 36]].forEach(([tx, ty], i) => {
      if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING) return;
      const px = tx * TILE + TILE * 0.3;
      const pz = ty * TILE + TILE * 0.4;
      const gy = heightAt(px, pz);
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 1.2), mat(0x8a6a40));
      pallet.position.set(px, gy + 0.15, pz);
      worldGroup.add(pallet);
      for (let s = 0; s < 3; s++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.05, 0.18), mat(0x9a7a50));
        slat.position.set(px, gy + 0.22, pz - 0.4 + s * 0.4);
        worldGroup.add(slat);
      }
      const boxC = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), mat(0xc4a574));
      boxC.position.set(px + 0.2, gy + 0.6, pz);
      boxC.rotation.y = i * 0.4;
      worldGroup.add(boxC);
    });

    // Construction barriers + caution tape posts
    const barrierMat = mat(0xf0a828, { roughness: 0.55, emissive: 0x3a2800, emissiveIntensity: 0.1 });
    const barrierStripe = mat(0x121418, { roughness: 0.7 });
    [[12, 13], [21, 10], [18, 21], [9, 19], [36, 20], [40, 32], [14, 36]].forEach(([tx, ty], bi) => {
      if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING) return;
      for (let k = 0; k < 3; k++) {
        const px = tx * TILE + 2 + k * 1.4;
        const pz = ty * TILE + TILE / 2 + (bi % 2) * 2;
        const gy = heightAt(px, pz);
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.22), barrierMat);
        bar.position.set(px, gy + 0.45, pz);
        bar.castShadow = true;
        worldGroup.add(bar);
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.24), barrierStripe);
        stripe.position.set(px, gy + 0.55, pz);
        worldGroup.add(stripe);
      }
    });

    // Billboards
    [[10, 5], [22, 18], [6, 22], [28, 9], [15, 28], [38, 14], [42, 34], [20, 42], [34, 6]].forEach(([tx, ty], i) => {
      if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING) return;
      const px = tx * TILE + TILE / 2;
      const pz = ty * TILE + TILE / 2;
      const gy = heightAt(px, pz);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 4.5, 0.25), mat(0x555b63));
      post.position.set(px, gy + 2.25, pz);
      worldGroup.add(post);
      const boardCols = [0x3dcfb6, 0xe0894a, 0x5b8def, 0xc44536, 0xf0c400];
      const boardEmi = [0x1a4a3a, 0x4a2a10, 0x1a2a4a, 0x4a1010, 0x4a3a10];
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 2.8, 0.2),
        mat(boardCols[i % boardCols.length], { emissive: boardEmi[i % boardEmi.length], emissiveIntensity: 0.22 })
      );
      board.position.set(px, gy + 5.2, pz);
      board.castShadow = true;
      worldGroup.add(board);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(5.9, 3.2, 0.14), mat(0x242830, { metalness: 0.35, roughness: 0.45 }));
      frame.position.set(px, gy + 5.2, pz - 0.02);
      worldGroup.add(frame);
      // Support brace
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), mat(0x555b63, { metalness: 0.5, roughness: 0.4 }));
      brace.position.set(px, gy + 3.6, pz);
      brace.rotation.x = 0.5;
      worldGroup.add(brace);
      // Billboard glow wash — skipped for performance
      if (false && i < 3) {
        const wash = new THREE.PointLight(boardCols[i % boardCols.length], 0.25, 12, 2);
        wash.position.set(px, gy + 5.0, pz + 1.5);
        worldGroup.add(wash);
      }
    });

    // Fences around dirt tracks
    const fenceMat = mat(0x947450, { roughness: 0.88 });
    function dirtFence(x0, x1, zLines) {
      for (let x = x0; x <= x1; x++) {
        for (const z of zLines) {
          if (!map[Math.floor(z)] || map[Math.floor(z)][x] === T.BUILDING) continue;
          const px = x * TILE + TILE / 2;
          const pz = z * TILE;
          const gy = heightAt(px, pz);
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.25, 0.16), fenceMat);
          post.position.set(px, gy + 0.72, pz);
          post.castShadow = true;
          worldGroup.add(post);
          const rail = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.9, 0.12, 0.09), fenceMat);
          rail.position.set(px, gy + 0.95, pz);
          worldGroup.add(rail);
          const railLow = new THREE.Mesh(new THREE.BoxGeometry(TILE * 0.9, 0.1, 0.08), fenceMat);
          railLow.position.set(px, gy + 0.55, pz);
          worldGroup.add(railLow);
        }
      }
    }
    dirtFence(6, 10, [6.5, 10.5]);
    dirtFence(34, 38, [34.5, 38.5]);
    // Dirt track center markers + tire berms
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const px = 8.5 * TILE + Math.cos(ang) * 18;
      const pz = 8.5 * TILE + Math.sin(ang) * 12;
      if (surfaceAt(px, pz) !== T.DIRT && surfaceAt(px, pz) !== T.GRASS) continue;
      const gy = heightAt(px, pz);
      const berm = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), mat(0x6e563a, { roughness: 1 }));
      berm.scale.set(1.4, 0.35, 1.0);
      berm.position.set(px, gy + 0.25, pz);
      worldGroup.add(berm);
    }
    // Checkered start line on dirt
    for (let i = 0; i < 8; i++) {
      const col = i % 2 === 0 ? 0xf2f5f8 : 0x1a1d22;
      const sq = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 1.0), mat(col));
      sq.position.set(8.5 * TILE - 3.5 + i, heightAt(8.5 * TILE, 8.5 * TILE) + 0.28, 8.5 * TILE);
      worldGroup.add(sq);
    }

    // Parked decorative cars — lightweight boxes (full meshes are too expensive)
    const parked = [
      [13.5 * TILE, 5.5 * TILE, Math.PI / 2, 0xd8dde6],
      [31.5 * TILE, 24.5 * TILE, Math.PI, 0xf0c400],
      [38.8 * TILE, 18.3 * TILE, -Math.PI / 2, 0xffffff],
      [24.4 * TILE, 11.1 * TILE, Math.PI / 2, 0x1a1f2e],
      [42.5 * TILE, 31.5 * TILE, 0, 0x1a2744],
      [4.5 * TILE, 11.5 * TILE, 0, 0xe85d4c],
    ];
    parked.forEach(([px, pz, ang, col], pi) => {
      if (!dressKeep("parked")) return;
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(pz / TILE);
      if (!map[ty] || (map[ty][tx] !== T.ROAD && map[ty][tx] !== T.GRASS && map[ty][tx] !== T.DIRT)) return;
      const gy = heightAt(px, pz);
      let g = null;
      if (window.OpenRoadsCars) {
        g = window.OpenRoadsCars.cloneNpc(pi + 3, col);
      }
      if (!g && window.OpenRoadsCircuit && window.OpenRoadsCircuit.ready()) {
        g = window.OpenRoadsCircuit.clone({
          color: col,
          scaleX: 0.92 + (pi % 3) * 0.04,
          scaleY: 0.9 + (pi % 2) * 0.08,
          scaleZ: 0.88 + (pi % 4) * 0.05,
        });
      }
      if (!g) {
        g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 3.4), mat(col));
        body.position.y = 0.55;
        g.add(body);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.6), mat(0x1a2838));
        cabin.position.set(0, 1.05, -0.2);
        g.add(cabin);
      }
      g.position.set(px, gy, pz);
      g.rotation.y = ang;
      worldGroup.add(g);
      solids.push({
        type: "parked",
        x: px,
        z: pz,
        r: 2.0,
        mesh: g,
        hp: 55,
        broken: false,
        breakable: true,
        color: col,
      });
    });

    // Richer trees
    const treeSpots = [
      [3, 3], [8, 15], [15, 3], [26, 14], [8, 26], [25, 27], [22, 4], [30, 10],
      [18, 2], [29, 29], [14, 5], [27, 12], [10, 30], [23, 25], [34, 8], [40, 4],
      [42, 26], [32, 42], [20, 44], [12, 42], [16, 34], [40, 16], [28, 36], [42, 36],
    ];
    // Extra procedural trees
    for (let i = 0; i < 12; i++) {
      const tx = 2 + (i * 7) % (MAP_W - 4);
      const ty = 2 + (i * 11) % (MAP_H - 4);
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      if ((tx + ty) % 2 === 0) continue;
      treeSpots.push([tx, ty]);
    }
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 2.4, 8);
    const leafGeo = new THREE.SphereGeometry(1.55, 10, 8);
    const leafGeo2 = new THREE.SphereGeometry(1.15, 8, 6);
    const trunkMat = mat(0x5e4028, { roughness: 0.95 });
    const leafMats = [
      mat(0x2f7a38, { roughness: 0.88 }),
      mat(0x3d8a42, { roughness: 0.86 }),
      mat(0x286832, { roughness: 0.9 }),
      mat(0x4a9448, { roughness: 0.85 }),
    ];
    const treeMul = dressScale("trees", 1);
    // Extra pines for forest maps
    if (treeMul > 1) {
      const extra = Math.round((treeMul - 1) * 40);
      for (let i = 0; i < extra; i++) {
        const tx = 2 + (i * 5 + 3) % (MAP_W - 4);
        const ty = 2 + (i * 13 + 7) % (MAP_H - 4);
        if (map[ty] && map[ty][tx] === T.GRASS) treeSpots.push([tx, ty]);
      }
    }
    for (const [tx, ty] of treeSpots) {
      if (treeMul < 1 && Math.random() > treeMul) continue;
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      const px = tx * TILE + TILE / 2 + ((tx * 3) % 5) * 0.2;
      const pz = ty * TILE + TILE / 2 + ((ty * 2) % 5) * 0.2;
      const scale = 0.85 + ((tx + ty) % 4) * 0.12;
      const gy = heightAt(px, pz);
      let treeMesh = null;
      if (window.OpenRoadsModels) {
        const tree = window.OpenRoadsModels.cloneKind("tree", tx * 13 + ty * 7, {
          height: 4.2 + scale * 3.2,
          yaw: ((tx + ty) % 8) * 0.7,
          tint: tx + ty,
        });
        if (tree) {
          tree.position.set(px, gy, pz);
          worldGroup.add(tree);
          treeMesh = tree;
        }
      }
      if (!treeMesh) {
        treeMesh = new THREE.Group();
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.set(0, 1.2 * scale, 0);
        trunk.scale.set(scale, scale, scale);
        trunk.castShadow = false;
        treeMesh.add(trunk);
        const leaves = new THREE.Mesh(leafGeo, leafMats[(tx + ty) % 4]);
        leaves.position.set(0, 3.3 * scale, 0);
        leaves.scale.set(scale, scale * 0.95, scale);
        leaves.castShadow = false;
        treeMesh.add(leaves);
        const leaves2 = new THREE.Mesh(leafGeo2, leafMats[(tx + ty + 1) % 4]);
        leaves2.position.set(0.6, 2.8 * scale, -0.4);
        leaves2.scale.set(scale, scale, scale);
        treeMesh.add(leaves2);
        if ((tx + ty) % 3 === 0) {
          const leaves3 = new THREE.Mesh(leafGeo2, leafMats[(tx + ty + 2) % 4]);
          leaves3.position.set(-0.5, 2.6 * scale, 0.5);
          leaves3.scale.set(scale * 0.85, scale * 0.85, scale * 0.85);
          treeMesh.add(leaves3);
        }
        treeMesh.position.set(px, gy, pz);
        worldGroup.add(treeMesh);
      }
      solids.push({
        type: "tree",
        x: px,
        z: pz,
        r: 1.5 * scale,
        mesh: treeMesh,
        hp: 26 + scale * 14,
        broken: false,
        breakable: true,
        color: 0x3d6a32,
      });
    }

    // Bushes + wildflowers
    const bushMat = mat(0x326a36, { roughness: 0.9 });
    const flowerMats = [
      mat(0xf0a8c0, { roughness: 0.7 }),
      mat(0xf5d868, { roughness: 0.7 }),
      mat(0xe08060, { roughness: 0.7 }),
      mat(0xffffff, { roughness: 0.65 }),
      mat(0x9ec5ff, { roughness: 0.7 }),
    ];
    const bushN = dressCount("flowers", 36);
    for (let i = 0; i < bushN; i++) {
      const tx = 2 + (i * 5) % (MAP_W - 4);
      const ty = 2 + (i * 7) % (MAP_H - 4);
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      const bx = tx * TILE + TILE / 2 + ((i * 1.7) % 3) - 1.5;
      const bz = ty * TILE + TILE / 2 + ((i * 2.3) % 3) - 1.5;
      const gy = heightAt(bx, bz);
      let placed = false;
      if (window.OpenRoadsModels) {
        const bushM = window.OpenRoadsModels.cloneKind("bush", i * 9, {
          height: 0.7 + (i % 3) * 0.25,
          yaw: i * 0.8,
        });
        if (bushM) {
          bushM.position.set(bx, gy, bz);
          worldGroup.add(bushM);
          placed = true;
        }
      }
      if (!placed) {
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55 + (i % 3) * 0.18, 6, 5), bushMat);
        bush.position.set(bx, gy + 0.45, bz);
        bush.castShadow = false;
        worldGroup.add(bush);
      }
    }

    // Fallen leaves patches on grass
    const leafPatchMat = mat(0x8a6a28, { roughness: 1 });
    const leafN = dressCount("flowers", 18);
    for (let i = 0; i < leafN; i++) {
      const tx = 2 + (i * 9) % (MAP_W - 4);
      const ty = 2 + (i * 4) % (MAP_H - 4);
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      const px = tx * TILE + 3 + (i % 6);
      const pz = ty * TILE + 4 + ((i * 2) % 5);
      const patch = new THREE.Mesh(new THREE.CircleGeometry(0.6 + (i % 3) * 0.2, 8), leafPatchMat);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(px, heightAt(px, pz) + 0.16, pz);
      worldGroup.add(patch);
    }

    // Detailed wildflowers + grass props on hills
    const tuftMat = mat(0x429644, { roughness: 0.92 });
    const tuftN = dressCount("flowers", 56);
    for (let i = 0; i < tuftN; i++) {
      const tx = 1 + (i * 3) % (MAP_W - 2);
      const ty = 1 + (i * 5) % (MAP_H - 2);
      if (!map[ty] || (map[ty][tx] !== T.GRASS && map[ty][tx] !== T.DIRT)) continue;
      const px = tx * TILE + 2 + (i % 5) * 2;
      const pz = ty * TILE + 2 + ((i * 2) % 5) * 2;
      const gy = heightAt(px, pz);
      if (gy < 0.2) continue;
      if (placeProp("flower", px, pz, { y: gy, height: 0.45 + (i % 4) * 0.08, yaw: i * 0.7, seed: i })) continue;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5 + (i % 3) * 0.12, 5), tuftMat);
      tuft.position.set(px, gy + 0.24, pz);
      worldGroup.add(tuft);
    }

    // Rocks + more clusters
     const rockSpots = [[5 * TILE, 22 * TILE], [26 * TILE, 5 * TILE], [29 * TILE, 25 * TILE], [9 * TILE, 29 * TILE], [18 * TILE, 8 * TILE],
     [12 * TILE, 4 * TILE], [3 * TILE, 16 * TILE], [27 * TILE, 28 * TILE], [21 * TILE, 3 * TILE],
     [36 * TILE, 8 * TILE], [42 * TILE, 20 * TILE], [40 * TILE, 38 * TILE], [34 * TILE, 44 * TILE],
     [20 * TILE, 40 * TILE], [8 * TILE, 42 * TILE], [44 * TILE, 30 * TILE], [15 * TILE, 36 * TILE]];
    const rockMul = dressScale("rocks", 1);
    if (rockMul > 1) {
      for (let i = 0; i < Math.round((rockMul - 1) * 22); i++) {
        rockSpots.push([(4 + (i * 7) % (MAP_W - 8)) * TILE, (4 + (i * 11) % (MAP_H - 8)) * TILE]);
      }
    }
    rockSpots.forEach(([rx, rz], i) => {
      if (rockMul < 1 && Math.random() > rockMul) return;
      const gy = heightAt(rx, rz);
      let rockMesh = null;
      if (window.OpenRoadsModels) {
        const rockM = window.OpenRoadsModels.cloneKind("rock", i * 5, {
          height: 1.1 + (i % 3) * 0.45,
          yaw: i * 0.7,
        });
        if (rockM) {
          rockM.position.set(rx, gy, rz);
          worldGroup.add(rockM);
          rockMesh = rockM;
        }
      }
      if (!rockMesh) {
        rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9 + (i % 3) * 0.25, 0), mat([0x6d7278, 0x7a8088, 0x5a6068][i % 3], { roughness: 0.92 }));
        rockMesh.position.set(rx, gy + 0.55, rz);
        rockMesh.rotation.set(i * 0.4, i * 0.7, 0);
        rockMesh.castShadow = true;
        worldGroup.add(rockMesh);
      }
      solids.push({
        type: "rock",
        x: rx,
        z: rz,
        r: 1.2 + (i % 3) * 0.2,
        mesh: rockMesh,
        hp: 40 + (i % 3) * 10,
        broken: false,
        breakable: true,
        color: 0x6d7278,
      });
      if (i % 2 === 0) {
        const pebble = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35, 0), mat(0x7a8088));
        pebble.position.set(rx + 1.1, heightAt(rx + 1.1, rz) + 0.2, rz + 0.4);
        worldGroup.add(pebble);
      }
    });

    // Water banks, reeds, and sparkle
    const reedMat = mat(0x4a7a3a);
    const bankMat = mat(0x8a7a58, { roughness: 0.95 });
    water.forEach((w, i) => {
      if (i % 3 === 0) {
        const sparkle = new THREE.Mesh(
          new THREE.CircleGeometry(2.0, 14),
          new THREE.MeshBasicMaterial({ color: 0xc0ecff, transparent: true, opacity: 0.22 })
        );
        sparkle.rotation.x = -Math.PI / 2;
        sparkle.position.set(w.x, 0.04, w.z);
        worldGroup.add(sparkle);
        worldFx.push({ mesh: sparkle, kind: "sparkle", phase: i * 0.7 });
        const sparkle2 = new THREE.Mesh(
          new THREE.CircleGeometry(1.1, 12),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 })
        );
        sparkle2.rotation.x = -Math.PI / 2;
        sparkle2.position.set(w.x + 0.6, 0.05, w.z - 0.4);
        worldGroup.add(sparkle2);
        worldFx.push({ mesh: sparkle2, kind: "sparkle", phase: i * 0.7 + 1.2 });
      }
      if (i % 4 === 0) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(2.2, 3.4, 16),
          bankMat
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(w.x, 0.05, w.z);
        worldGroup.add(ring);
      }
      if (i % 5 === 0) {
        for (let r = 0; r < 3; r++) {
          const ang = (i * 1.7 + r) * 1.9;
          const rx = w.x + Math.cos(ang) * 2.4;
          const rz = w.z + Math.sin(ang) * 2.4;
          const reed = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.1 + (r % 2) * 0.3, 4), reedMat);
          reed.position.set(rx, heightAt(rx, rz) + 0.55, rz);
          worldGroup.add(reed);
          worldFx.push({ mesh: reed, kind: "reed", phase: i + r, baseX: rx, baseZ: rz });
        }
      }
      if (i % 7 === 0) {
        const lily = new THREE.Mesh(
          new THREE.CircleGeometry(0.55, 8),
          mat(0x3a8a4a, { roughness: 0.8 })
        );
        lily.rotation.x = -Math.PI / 2;
        lily.position.set(w.x + ((i * 0.3) % 1.5) - 0.7, 0.06, w.z + ((i * 0.5) % 1.5) - 0.7);
        worldGroup.add(lily);
        worldFx.push({ mesh: lily, kind: "lily", phase: i * 0.4, baseY: 0.06 });
      }
      // Wooden dock / canoe models on some water edges
      const dockEvery = Math.max(3, Math.round(11 / Math.max(0.15, dressScale("docks", 1))));
      if (dressScale("docks", 1) > 0 && i % dockEvery === 0) {
        if (!placeProp("dock", w.x + 3.2, w.z, { y: 0.05, height: 0.55, yaw: i * 0.4, seed: i })) {
          const dock = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 1.4), mat(0x6a4a28, { roughness: 0.9 }));
          dock.position.set(w.x + 3.2, 0.2, w.z);
          worldGroup.add(dock);
        }
      }
    });

    // Crates (detailed cardboard box models)
    const crateGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const crateMat = mat(0xd0aa62, { roughness: 0.82 });
    const bandMat = mat(0x6e4e28, { roughness: 0.75 });
    const crateSpots = [[7, 8], [9, 8], [14, 13], [19, 7], [25, 11], [26, 20], [8, 20], [14, 22], [21, 15], [12, 11], [28, 16], [6, 13], [17, 25], [23, 9], [11, 17], [27, 7], [4, 19], [16, 9], [36, 14], [40, 26], [34, 32], [42, 18], [30, 40], [18, 38], [38, 42]];
    for (const [cx, cy] of crateSpots) {
      if (!map[cy] || map[cy][cx] === T.WATER || map[cy][cx] === T.BUILDING) continue;
      const px = cx * TILE + TILE / 2;
      const pz = cy * TILE + TILE / 2;
      const gy = heightAt(px, pz);
      let mesh = placeProp("crate", px, pz, {
        y: gy,
        height: 1.15,
        yaw: ((cx + cy) % 5) * 0.2,
        seed: cx * 9 + cy,
      });
      let band = null, band2 = null, stamp = null;
      if (!mesh) {
        mesh = new THREE.Mesh(crateGeo, crateMat);
        mesh.position.set(px, gy + 0.85, pz);
        mesh.rotation.y = ((cx + cy) % 5) * 0.2;
        worldGroup.add(mesh);
        band = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 1.15), bandMat);
        band.position.set(px, gy + 0.85, pz);
        band.rotation.y = mesh.rotation.y;
        worldGroup.add(band);
        band2 = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.12), bandMat);
        band2.position.set(px, gy + 0.85, pz);
        band2.rotation.y = mesh.rotation.y;
        worldGroup.add(band2);
        stamp = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.04), mat(0x8a3030));
        stamp.position.set(px, gy + 1.1, pz + 0.56);
        worldGroup.add(stamp);
      }
      crates.push({ mesh, band, band2, stamp, x: px, z: pz, baseY: gy + 0.85, taken: false, respawn: 0, value: 25 + ((cx * 7 + cy) % 35) });
    }

    // Garage pad + markings
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.2, 0.14, 32),
      mat(0x5ec4a8, { emissive: 0x1a4a3a, emissiveIntensity: 0.38, roughness: 0.55, metalness: 0.12 })
    );
    pad.position.set(SPAWN_TX * TILE, 0.25, SPAWN_TZ * TILE);
    worldGroup.add(pad);
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(3.6, 4.0, 28),
      new THREE.MeshBasicMaterial({ color: 0xd8f5c8, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(SPAWN_TX * TILE, 0.34, SPAWN_TZ * TILE);
    worldGroup.add(padRing);
    // Garage canopy posts + roof
    const gx = SPAWN_TX * TILE;
    const gz = SPAWN_TZ * TILE;
    [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]].forEach(([ox, oz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.2, 6), mat(0x4a5560, { metalness: 0.5, roughness: 0.4 }));
      post.position.set(gx + ox, 1.7, gz + oz);
      post.castShadow = true;
      worldGroup.add(post);
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 7.2), mat(0x42d4ba, { roughness: 0.45, metalness: 0.15 }));
    canopy.position.set(gx, 3.4, gz);
    canopy.castShadow = true;
    worldGroup.add(canopy);
    const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.08, 7.4), mat(0x2a9a88, { metalness: 0.25, roughness: 0.4 }));
    canopyTrim.position.set(gx, 3.28, gz);
    worldGroup.add(canopyTrim);
    // Garage canopy light skipped for performance
    // (emissive canopy materials still read as lit)
    // Garage yard props — detailed furniture / appliance models
    if (!placeProp("furniture", gx + 5.2, gz - 1.5, { height: 1.1, yaw: 0.4, seed: 3 })) {
      const chest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.7), mat(0xc44536, { metalness: 0.4, roughness: 0.45 }));
      chest.position.set(gx + 5.2, 0.55, gz - 1.5);
      worldGroup.add(chest);
    }
    placeProp("furniture", gx + 5.8, gz + 2.4, { height: 1.35, yaw: -0.5, seed: 8 });
    placeProp("bin", gx + 4.6, gz + 3.1, { height: 1.0, seed: 2 });
    placeProp("crate", gx - 5.2, gz + 2.0, { height: 0.9, yaw: 0.3, seed: 5 });
    placeProp("crate", gx - 4.4, gz + 2.6, { height: 0.9, yaw: -0.2, seed: 6 });
    placeProp("cone", gx - 3.5, gz + 1.2, { height: 0.85, seed: 1 });
    placeProp("cone", gx - 2.8, gz + 1.6, { height: 0.85, seed: 2 });
    placeProp("barrier", gx + 2.5, gz - 5.5, { height: 1.1, yaw: Math.PI / 2, seed: 4 });
    placeProp("pot", gx + 6.5, gz - 0.5, { height: 1.0, seed: 7 });
    placeProp("furniture", gx - 6.0, gz - 1.0, { height: 1.2, yaw: 1.1, seed: 11 });
    // Parking stall lines near garage
    for (let i = -2; i <= 2; i++) {
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 3.2),
        mat(0xf2f5f8, { roughness: 0.5 })
      );
      stall.position.set(gx + i * 2.4 - 8, 0.28, gz + 6.5);
      worldGroup.add(stall);
    }

    // Small plaza fountain in a grass park block (city / coast)
    {
      const fx = 16.5 * TILE;
      const fz = 16.5 * TILE;
      const allowFountain = (mapDress().landmark || "") === "city" || (mapDress().landmark || "") === "coast";
      if (allowFountain && map[16] && map[16][16] === T.GRASS) {
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.45, 16), mat(0xb8b0a4));
        basin.position.set(fx, heightAt(fx, fz) + 0.25, fz);
        worldGroup.add(basin);
        const waterPool = new THREE.Mesh(
          new THREE.CylinderGeometry(1.8, 1.8, 0.12, 16),
          mat(0x4aa0c0, { roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.7 })
        );
        waterPool.position.set(fx, heightAt(fx, fz) + 0.42, fz);
        worldGroup.add(waterPool);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.2, 8), mat(0xcfc6b8));
        spout.position.set(fx, heightAt(fx, fz) + 1.0, fz);
        worldGroup.add(spout);
        worldFx.push({ mesh: waterPool, kind: "sparkle", phase: 2.2 });
      }
    }

    // Road cracks / patches on longer stretches
    const crackMat = mat(0x1e242c, { roughness: 1 });
    for (let i = 0; i < 48; i++) {
      const tx = 2 + (i * 7) % (MAP_W - 4);
      const ty = 2 + (i * 11) % (MAP_H - 4);
      if (!map[ty] || map[ty][tx] !== T.ROAD) continue;
      const px = tx * TILE + 3 + (i % 5);
      const pz = ty * TILE + 4 + ((i * 3) % 6);
      const crack = new THREE.Mesh(new THREE.BoxGeometry(0.08 + (i % 3) * 0.04, 0.03, 1.2 + (i % 4) * 0.4), crackMat);
      crack.position.set(px, 0.26, pz);
      crack.rotation.y = (i * 0.7) % Math.PI;
      worldGroup.add(crack);
    }

    // Rain puddles (reflective discs on road / sidewalk edges)
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x3a6278,
      roughness: 0.08,
      metalness: 0.65,
      transparent: true,
      opacity: 0.62,
    });
    const puddleN = (mapDress().landmark === "desert") ? 4 : (mapDress().landmark === "coast" || mapDress().landmark === "harbor") ? 40 : 32;
    for (let i = 0; i < puddleN; i++) {
      const tx = 3 + (i * 5) % (MAP_W - 6);
      const ty = 3 + (i * 9) % (MAP_H - 6);
      if (!map[ty] || (map[ty][tx] !== T.ROAD && map[ty][tx] !== T.GRASS)) continue;
      const px = tx * TILE + 4 + (i % 4);
      const pz = ty * TILE + 5 + ((i * 2) % 5);
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.7 + (i % 3) * 0.25, 12), puddleMat);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(px, heightAt(px, pz) + 0.22, pz);
      worldGroup.add(puddle);
    }

    // Bike racks + newspaper boxes
    [[7, 11], [15, 5], [23, 17], [10, 21], [28, 14], [36, 24], [42, 11], [20, 38], [32, 42]].forEach(([tx, ty], i) => {
      if (!dressKeep("streetProps")) return;
      if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING) return;
      const px = tx * TILE + TILE * 0.25;
      const pz = ty * TILE + TILE * 0.6;
      const gy = heightAt(px, pz);
      const rack = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 16, Math.PI), mat(0x555b63, { metalness: 0.7, roughness: 0.35 }));
      rack.rotation.x = Math.PI / 2;
      rack.position.set(px, gy + 0.55, pz);
      worldGroup.add(rack);
      const rackPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 5), mat(0x555b63));
      rackPost.position.set(px, gy + 0.25, pz);
      worldGroup.add(rackPost);
      const news = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.4), mat([0xe85d4c, 0x3d6ea5, 0xf0c400][i % 3]));
      news.position.set(px + 1.2, gy + 0.55, pz);
      news.castShadow = true;
      worldGroup.add(news);
      const newsGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.45, 0.05),
        mat(0xa8d0e8, { transparent: true, opacity: 0.4, roughness: 0.15, metalness: 0.3 })
      );
      newsGlass.position.set(px + 1.2, gy + 0.7, pz + 0.22);
      worldGroup.add(newsGlass);
    });

    // Bus stops
    [[8, 5], [20, 16], [14, 22], [26, 11], [38, 24], [31, 42], [11, 38], [43, 18]].forEach(([tx, ty]) => {
      if (!dressKeep("streetProps")) return;
      if (!map[ty] || map[ty][tx] === T.WATER || map[ty][tx] === T.BUILDING) return;
      const px = tx * TILE + TILE / 2;
      const pz = ty * TILE + TILE / 2;
      const gy = heightAt(px, pz);
      const shelterRoof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.1, 1.6), mat(0x4a90c8, { metalness: 0.3, roughness: 0.5 }));
      shelterRoof.position.set(px, gy + 2.5, pz);
      worldGroup.add(shelterRoof);
      const shelterPost = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), mat(0x555b63));
      shelterPost.position.set(px - 1.4, gy + 1.2, pz);
      worldGroup.add(shelterPost);
      const shelterPost2 = shelterPost.clone();
      shelterPost2.position.x = px + 1.4;
      worldGroup.add(shelterPost2);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 1.2, 0.06),
        mat(0xb8d4f0, { transparent: true, opacity: 0.35, roughness: 0.2, metalness: 0.2 })
      );
      panel.position.set(px, gy + 1.5, pz - 0.7);
      worldGroup.add(panel);
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.45), mat(0x3a4048));
      bench.position.set(px, gy + 0.55, pz + 0.2);
      worldGroup.add(bench);
    });

    // Far skyline / ridges (map-specific silhouette)
    const landKind = (mapDress().landmark || currentMap().id);
    const skyN = landKind === "city" || landKind === "harbor" ? 8 : landKind === "mountain" ? 10 : 5;
    for (let i = 0; i < skyN; i++) {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(28 + (i % 4) * 5, 8, 6),
        mat([0x4e6e52, 0x45684c, 0x5a7e58, 0x3f5e44][i % 4], { roughness: 1 })
      );
      const ang = (i / 8) * Math.PI * 2 + 0.2;
      const dist = 380 + (i % 4) * 40;
      hill.position.set(
        WORLD_W / 2 + Math.cos(ang) * dist,
        -10,
        WORLD_H / 2 + Math.sin(ang) * dist
      );
      hill.scale.set(1.7, 0.32 + (i % 3) * 0.09, 1.35);
      worldGroup.add(hill);
    }
    // Distant city blocks on horizon (urban maps only)
    if (landKind === "city" || landKind === "harbor") for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + 0.05;
      const dist = 360 + (i % 4) * 18;
      const h = 7 + (i % 6) * 4.5;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(5 + (i % 4) * 2.2, h, 5 + (i % 3)),
        mat([0x5a6572, 0x4e5864, 0x66707c][i % 3], { roughness: 0.88 })
      );
      block.position.set(
        WORLD_W / 2 + Math.cos(ang) * dist,
        h * 0.32,
        WORLD_H / 2 + Math.sin(ang) * dist
      );
      worldGroup.add(block);
      if (i % 3 === 0) {
        const litWin = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(2, 5 + (i % 4) * 2.2 - 1), h * 0.35, 0.2),
          mat(0xffe0a0, { emissive: 0xffcc66, emissiveIntensity: 0.4 })
        );
        litWin.position.set(
          WORLD_W / 2 + Math.cos(ang) * (dist - 2.5),
          h * 0.45,
          WORLD_H / 2 + Math.sin(ang) * (dist - 2.5)
        );
        worldGroup.add(litWin);
      }
    }

    // Flocks of birds (real GLTF when available)
    const birdMat = mat(0x1a1d22);
    for (let f = 0; f < 2; f++) {
      const flock = new THREE.Group();
      const baseX = 40 + f * 55;
      const baseZ = 50 + (f * 37) % 200;
      for (let b = 0; b < 5; b++) {
        let bird = null;
        if (window.OpenRoadsModels) {
          bird = window.OpenRoadsModels.cloneKind("bird", f * 11 + b, { height: 0.55 + (b % 3) * 0.08 });
        }
        if (!bird) {
          bird = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 3), birdMat);
          bird.rotation.z = Math.PI / 2;
        }
        bird.position.set((b - 2) * 1.6, (b % 3) * 0.45, (b % 2) * 0.9);
        flock.add(bird);
      }
      flock.position.set(baseX, 18 + f * 2, baseZ);
      worldGroup.add(flock);
      worldFx.push({ mesh: flock, kind: "flock", phase: f * 1.3, baseX, baseZ, baseY: 18 + f * 2 });
    }

    // Highway / mile signs as detailed models
    for (let i = 0; i < dressCount("signs", 22); i++) {
      const tx = 3 + (i * 3) % (MAP_W - 6);
      const ty = 3 + (i * 5) % (MAP_H - 6);
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      if (!neighbor(tx - 1, ty, T.ROAD) && !neighbor(tx + 1, ty, T.ROAD) && !neighbor(tx, ty - 1, T.ROAD) && !neighbor(tx, ty + 1, T.ROAD)) continue;
      const px = tx * TILE + TILE / 2;
      const pz = ty * TILE + TILE / 2;
      const gy = heightAt(px, pz);
      if (placeProp("sign", px, pz, { y: gy, height: 2.8, yaw: i * 0.5, seed: i + 40 })) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.8, 5), mat(0x555b63));
      post.position.set(px, gy + 0.95, pz);
      worldGroup.add(post);
      const mile = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.06), mat(0x2b5ea8));
      mile.position.set(px, gy + 1.8, pz);
      worldGroup.add(mile);
    }

    // Extra detailed scatter: fences, tents, campfires, parasols, outdoor furniture, paths
    for (let i = 0; i < dressCount("scatter", 28); i++) {
      const tx = 3 + (i * 5) % (MAP_W - 6);
      const ty = 3 + (i * 9) % (MAP_H - 6);
      if (!map[ty] || map[ty][tx] !== T.GRASS) continue;
      const px = tx * TILE + TILE / 2 + ((i * 1.3) % 4) - 2;
      const pz = ty * TILE + TILE / 2 + ((i * 1.7) % 4) - 2;
      const gy = heightAt(px, pz);
      const kind = ["fence", "tent", "campfire", "parasol", "furniture", "path", "log", "pot"][i % 8];
      const heights = { fence: 1.4, tent: 2.2, campfire: 0.7, parasol: 2.4, furniture: 1.0, path: 0.12, log: 0.55, pot: 1.0 };
      placeProp(kind, px, pz, { y: gy, height: heights[kind], yaw: i * 0.6, seed: i * 3 });
    }
    // Unique landmark per map so each world reads differently
    (function addMapLandmark() {
      const kind = mapDress().landmark || currentMap().id;
      const midX = WORLD_W / 2;
      const midZ = WORLD_H / 2;
      if (kind === "city") {
        const fx = 12.5 * TILE;
        const fz = 12.5 * TILE;
        const gy = heightAt(fx, fz);
        const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 28, 4.2), mat(0x6a7888, { metalness: 0.35, roughness: 0.45 }));
        tower.position.set(fx, gy + 14, fz);
        worldGroup.add(tower);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(1.4, 6, 8), mat(0xc8d0d8, { metalness: 0.55, roughness: 0.3 }));
        spire.position.set(fx, gy + 31, fz);
        worldGroup.add(spire);
        const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(0xff6a3a, { emissive: 0xff4020, emissiveIntensity: 0.9 }));
        beacon.position.set(fx, gy + 34.2, fz);
        worldGroup.add(beacon);
        solids.push({ type: "building", x: fx, z: fz, w: 5, d: 5 });
        // Central park fountain plaza ring
        const px = 24.5 * TILE;
        const pz = 24.5 * TILE;
        const pgy = heightAt(px, pz);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.35, 8, 24), mat(0xb8b0a4));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(px, pgy + 0.4, pz);
        worldGroup.add(ring);
      } else if (kind === "desert") {
        // Rock arches along the interstate
        [[14, 10], [34, 12], [18, 32], [36, 28]].forEach(function (p, i) {
          const ax = p[0] * TILE;
          const az = p[1] * TILE;
          const gy = heightAt(ax, az);
          const left = new THREE.Mesh(new THREE.BoxGeometry(2.2, 8 + i, 2.2), mat(0xb89868, { roughness: 0.95 }));
          left.position.set(ax - 3.2, gy + 4 + i * 0.5, az);
          worldGroup.add(left);
          const right = left.clone();
          right.position.x = ax + 3.2;
          worldGroup.add(right);
          const top = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.6, 2.4), mat(0xc2a878, { roughness: 0.92 }));
          top.position.set(ax, gy + 8.5 + i, az);
          top.rotation.z = (i % 2 ? 0.08 : -0.06);
          worldGroup.add(top);
        });
        // Mirage oasis palms (simple cones)
        for (let i = 0; i < 6; i++) {
          const px = 18 * TILE + (i % 3) * 4;
          const pz = 19 * TILE + Math.floor(i / 3) * 4;
          const gy = heightAt(px, pz);
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 4.5, 6), mat(0x8a6840));
          trunk.position.set(px, gy + 2.2, pz);
          worldGroup.add(trunk);
          const frond = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.4, 6), mat(0x3a7a38));
          frond.position.set(px, gy + 4.8, pz);
          worldGroup.add(frond);
        }
      } else if (kind === "coast") {
        // Lighthouse on the ring
        const lx = 24.5 * TILE;
        const lz = 8.5 * TILE;
        const gy = heightAt(lx, lz);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 1.2, 12), mat(0xd8d0c4));
        base.position.set(lx, gy + 0.6, lz);
        worldGroup.add(base);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 14, 12), mat(0xf2f0ea));
        shaft.position.set(lx, gy + 8, lz);
        worldGroup.add(shaft);
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 2.2, 12), mat(0xd62828));
        stripe.position.set(lx, gy + 10, lz);
        worldGroup.add(stripe);
        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.5, 2.4, 10), mat(0xffe8a0, { emissive: 0xffcc66, emissiveIntensity: 0.7 }));
        lantern.position.set(lx, gy + 16.2, lz);
        worldGroup.add(lantern);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(2.1, 2.2, 8), mat(0x2a3038));
        roof.position.set(lx, gy + 18.2, lz);
        worldGroup.add(roof);
        // Beach umbrellas
        for (let i = 0; i < 10; i++) {
          const bx = (14 + i * 2) * TILE;
          const bz = 9.2 * TILE;
          if (!map[9] || map[9][14 + i * 2] === T.WATER) continue;
          const gy2 = heightAt(bx, bz);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), mat(0x555b63));
          pole.position.set(bx, gy2 + 1.1, bz);
          worldGroup.add(pole);
          const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.55, 10), mat([0xe85d4c, 0x3d6ea5, 0xf0c400][i % 3]));
          umb.position.set(bx, gy2 + 2.2, bz);
          worldGroup.add(umb);
        }
      } else if (kind === "mountain") {
        // Summit lodge + lookout
        const sx = 24.5 * TILE;
        const sz = 7.5 * TILE;
        const gy = heightAt(sx, sz);
        const lodge = new THREE.Mesh(new THREE.BoxGeometry(8, 3.2, 5.5), mat(0x6a4830, { roughness: 0.9 }));
        lodge.position.set(sx, gy + 1.6, sz);
        worldGroup.add(lodge);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3.5, 4), mat(0x3e2a1c));
        roof.rotation.y = Math.PI / 4;
        roof.position.set(sx, gy + 4.8, sz);
        worldGroup.add(roof);
        const look = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 9, 8), mat(0x7a8a70));
        look.position.set(sx + 8, gy + 4.5, sz - 2);
        worldGroup.add(look);
        // Ski lift poles along hairpin
        for (let i = 0; i < 8; i++) {
          const px = (16 + i * 2) * TILE;
          const pz = (38 - i * 3.5) * TILE;
          const gy2 = heightAt(px, pz);
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), mat(0x555b63, { metalness: 0.5 }));
          pole.position.set(px, gy2 + 3.5, pz);
          worldGroup.add(pole);
          const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 0.15), mat(0x3a4048));
          arm.position.set(px, gy2 + 6.8, pz);
          worldGroup.add(arm);
        }
      } else if (kind === "harbor") {
        // Crane + warehouse stacks on the docks
        for (let i = 0; i < 4; i++) {
          const cx = 13.5 * TILE;
          const cz = (10 + i * 7) * TILE;
          const gy = heightAt(cx, cz);
          const mast = new THREE.Mesh(new THREE.BoxGeometry(0.7, 16, 0.7), mat(0xd0aa40, { metalness: 0.55, roughness: 0.4 }));
          mast.position.set(cx, gy + 8, cz);
          worldGroup.add(mast);
          const boom = new THREE.Mesh(new THREE.BoxGeometry(14, 0.45, 0.45), mat(0xc09838, { metalness: 0.5 }));
          boom.position.set(cx + 5, gy + 14, cz);
          boom.rotation.z = -0.18;
          worldGroup.add(boom);
          const hook = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.8), mat(0x3a4048));
          hook.position.set(cx + 10, gy + 8, cz);
          worldGroup.add(hook);
        }
        // Canal barges (simple hulls)
        for (let i = 0; i < 5; i++) {
          const bx = 8 * TILE;
          const bz = (9 + i * 7) * TILE;
          const hull = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 2.2), mat(0x3a4a58, { metalness: 0.4, roughness: 0.55 }));
          hull.position.set(bx, 0.35, bz);
          worldGroup.add(hull);
          const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.6), mat(0xc8a050));
          cabin.position.set(bx - 1.2, 1.4, bz);
          worldGroup.add(cabin);
        }
        // Warehouse sheds
        for (let i = 0; i < 6; i++) {
          const wx = (20 + (i % 3) * 6) * TILE;
          const wz = (8 + Math.floor(i / 3) * 18) * TILE;
          if (!map[Math.floor(wz / TILE)] || map[Math.floor(wz / TILE)][Math.floor(wx / TILE)] === T.WATER) continue;
          const gy = heightAt(wx, wz);
          const shed = new THREE.Mesh(new THREE.BoxGeometry(7, 4.5, 5), mat(0x6a7078, { roughness: 0.85 }));
          shed.position.set(wx, gy + 2.25, wz);
          worldGroup.add(shed);
          const roof = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.35, 5.4), mat(0x3e464f));
          roof.position.set(wx, gy + 4.6, wz);
          worldGroup.add(roof);
        }
      } else if (kind === "tiny") {
        // Oversized toy windmill on the plaza
        const wx = 24.5 * TILE;
        const wz = 24.5 * TILE;
        const gy = heightAt(wx, wz);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 8), mat(0xe8e0d0));
        pole.position.set(wx, gy + 3.5, wz);
        worldGroup.add(pole);
        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), mat(0xd01010, { emissive: 0xa00808, emissiveIntensity: 0.35 }));
        hub.position.set(wx, gy + 7.2, wz);
        worldGroup.add(hub);
        for (let i = 0; i < 4; i++) {
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.8, 0.9), mat(0xf5f0e6));
          blade.position.set(wx, gy + 7.2, wz);
          blade.rotation.z = (i / 4) * Math.PI * 2;
          blade.translateY(2.2);
          worldGroup.add(blade);
        }
        // Mini pier stub
        const px = 24.5 * TILE;
        const pz = 30.2 * TILE;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 6), mat(0x8a6a40));
        pier.position.set(px, 0.25, pz);
        worldGroup.add(pier);
        solids.push({ type: "building", x: wx, z: wz, w: 2.5, d: 2.5 });
      } else if (kind === "infinite") {
        // Repeating overhead gantries + mile posts along the highway
        for (let i = 0; i < 8; i++) {
          const gz = (4 + i * 5.5) * TILE;
          const gx = 24.5 * TILE;
          const gy = heightAt(gx, gz);
          const left = new THREE.Mesh(new THREE.BoxGeometry(0.55, 7.5, 0.55), mat(0x6a7078, { metalness: 0.45, roughness: 0.4 }));
          left.position.set(gx - 9, gy + 3.75, gz);
          worldGroup.add(left);
          const right = left.clone();
          right.position.x = gx + 9;
          worldGroup.add(right);
          const beam = new THREE.Mesh(new THREE.BoxGeometry(19, 0.45, 0.7), mat(0x555b63, { metalness: 0.5 }));
          beam.position.set(gx, gy + 7.4, gz);
          worldGroup.add(beam);
          const panel = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 0.2), mat(0x1a5a38));
          panel.position.set(gx, gy + 6.4, gz + 0.2);
          worldGroup.add(panel);
        }
        for (let i = 0; i < 16; i++) {
          const pz = (2 + i * 2.8) * TILE;
          const side = i % 2 ? 1 : -1;
          const px = (24.5 + side * 6.2) * TILE;
          const gy = heightAt(px, pz);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.4, 6), mat(0x888e96));
          post.position.set(px, gy + 1.2, pz);
          worldGroup.add(post);
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.08), mat(0xe8e0c8));
          plate.position.set(px, gy + 2.35, pz);
          worldGroup.add(plate);
        }
      }
    })();

    // Construction cones / barriers near spawn for visibility
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      placeProp(i % 2 ? "cone" : "barrier", SPAWN_TX * TILE + Math.cos(ang) * 7, SPAWN_TZ * TILE + Math.sin(ang) * 7, {
        height: i % 2 ? 0.9 : 1.1,
        yaw: ang,
        seed: i + 90,
      });
    }

    car.x = SPAWN_TX * TILE;
    car.z = SPAWN_TZ * TILE;
    car.angle = 0;
    car.vx = car.vz = car.av = 0;
    car.vy = 0;
    car.grounded = true;
    car.y = heightAt(car.x, car.z);
    worldReady = true;
  }

  function attachBullbar(root, spec) {
    if (!root || root.userData.bullbar) return root;
    root.updateMatrixWorld(true);
    let frontZ = Math.max(1.4, (spec.length || 4) * 0.5);
    let halfW = Math.max(0.7, (spec.width || 1.9) * 0.48);
    let barY = 0.4;
    try {
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.z > 1) frontZ = size.z * 0.52;
      if (size.x > 0.8) halfW = size.x * 0.48;
      if (size.y > 0.5) barY = Math.min(0.7, Math.max(0.28, size.y * 0.28));
    } catch (_) {}
    const W = halfW * 2;
    const ram = new THREE.Group();
    ram.name = "bullbar";
    const steel = new THREE.MeshStandardMaterial({
      color: 0xd0d4da,
      metalness: 0.95,
      roughness: 0.22,
      envMapIntensity: 1.5,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      metalness: 0.75,
      roughness: 0.4,
    });
    const plate = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.32, 0.38), steel);
    plate.position.set(0, barY, frontZ);
    ram.add(plate);
    const skid = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.12, 0.26), dark);
    skid.position.set(0, barY - 0.22, frontZ + 0.04);
    ram.add(skid);
    [-1, 1].forEach(function (side) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.7, 0.14), steel);
      post.position.set(side * halfW * 0.85, barY + 0.28, frontZ - 0.02);
      ram.add(post);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.45), steel);
      tooth.position.set(side * halfW * 0.95, barY, frontZ + 0.12);
      ram.add(tooth);
    });
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, W * 0.9, 8), steel);
    hoop.rotation.z = Math.PI / 2;
    hoop.position.set(0, barY + 0.48, frontZ - 0.02);
    ram.add(hoop);
    root.add(ram);
    root.userData.bullbar = ram;
    root.userData.hasRam = true;
    return root;
  }

  function createCarMesh(spec) {
    if (window.OpenRoadsCars) {
      const sx = (spec.width || 1.9) / 1.94;
      const sy = (spec.height || 1.25) / 1.21;
      const sz = (spec.length || 4.2) / 4.53;
      const mesh = window.OpenRoadsCars.cloneCar(spec.id, {
        color: spec.color,
        accent: spec.accent,
        length: spec.length || 4,
        scaleX: Math.min(1.25, Math.max(0.75, sx)),
        scaleY: Math.min(1.4, Math.max(0.72, sy)),
        scaleZ: Math.min(1.4, Math.max(0.7, sz)),
        heightScale: Math.min(1.25, Math.max(0.85, (spec.height || 1.4) / 1.4)),
      });
      if (mesh) return mesh;
    }
    if (spec.id === "circuit" && window.OpenRoadsCircuit && window.OpenRoadsCircuit.ready()) {
      return window.OpenRoadsCircuit.clone({
        color: spec.color,
        accent: spec.accent,
      });
    }
    const g = new THREE.Group();
    const id = spec.id || "hatch";
    const style = spec.style || id;
    const W = spec.width;
    const L = spec.length;
    const H = spec.height;

    const paint = new THREE.MeshPhysicalMaterial({
      color: spec.color,
      metalness: 0.68,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      reflectivity: 0.9,
    });
    const paintDark = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(spec.color).multiplyScalar(0.52),
      metalness: 0.6,
      roughness: 0.28,
      clearcoat: 0.9,
      clearcoatRoughness: 0.14,
    });
    const accent = new THREE.MeshPhysicalMaterial({
      color: spec.accent,
      metalness: 0.75,
      roughness: 0.18,
      clearcoat: 0.95,
      clearcoatRoughness: 0.1,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8e2ee, metalness: 0.97, roughness: 0.12 });
    const plastic = new THREE.MeshStandardMaterial({ color: 0x161920, metalness: 0.25, roughness: 0.7 });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, metalness: 0.05, roughness: 0.94 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc4ccd8, metalness: 0.92, roughness: 0.22 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xb0daf5,
      metalness: 0.1,
      roughness: 0.04,
      transparent: true,
      opacity: 0.38,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
    });
    const glassDark = new THREE.MeshPhysicalMaterial({
      color: 0x1a3048,
      metalness: 0.28,
      roughness: 0.08,
      transparent: true,
      opacity: 0.72,
      clearcoat: 0.9,
      clearcoatRoughness: 0.06,
    });
    const headGlow = new THREE.MeshStandardMaterial({
      color: 0xfff8e0,
      emissive: 0xffeeb8,
      emissiveIntensity: 1.05,
      roughness: 0.15,
      metalness: 0.25,
    });
    const tailGlow = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xff1818,
      emissiveIntensity: 0.95,
      roughness: 0.3,
    });
    const orangeGlow = new THREE.MeshStandardMaterial({
      color: 0xffa848,
      emissive: 0xff7818,
      emissiveIntensity: 0.55,
      roughness: 0.35,
    });

    function add(mesh, x, y, z, rx, ry, rz) {
      mesh.position.set(x || 0, y || 0, z || 0);
      if (rx) mesh.rotation.x = rx;
      if (ry) mesh.rotation.y = ry;
      if (rz) mesh.rotation.z = rz;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
      return mesh;
    }

    function box(w, h, d, material) {
      return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    }

    // Smooth body shell from a subdivided box with profile curves
    function curvedShell(w, h, d, material, profile) {
      const p = profile || {};
      const geo = new THREE.BoxGeometry(w, h, d, 10, 6, 22);
      const pos = geo.attributes.position;
      const noseDrop = p.noseDrop != null ? p.noseDrop : 0.42;
      const tailDrop = p.tailDrop != null ? p.tailDrop : 0.22;
      const sideTuck = p.sideTuck != null ? p.sideTuck : 0.14;
      const roofDome = p.roofDome != null ? p.roofDome : 0.18;
      const waist = p.waist != null ? p.waist : 0.06;
      const flatTop = p.flatTop != null ? p.flatTop : 0.15;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        const xn = x / (w * 0.5 || 1);
        const yn = y / (h * 0.5 || 1);
        const zn = z / (d * 0.5 || 1);

        // Side tumblehome + waist pinch
        const sideCurve = 1 - sideTuck * xn * xn * (0.35 + 0.65 * Math.max(0, yn));
        const waistPinch = 1 - waist * (1 - zn * zn) * Math.abs(xn);
        x *= sideCurve * waistPinch;

        // Round vertical corners toward front/rear
        const endRound = 1 - 0.1 * zn * zn * xn * xn;
        x *= endRound;

        // Lengthwise roof / hood / deck profile
        let yMul = 1;
        if (zn > 0.2) {
          const t = (zn - 0.2) / 0.8;
          yMul *= 1 - noseDrop * t * t;
          if (yn > 0) y -= t * t * h * 0.22;
        } else if (zn < -0.15) {
          const t = (-zn - 0.15) / 0.85;
          yMul *= 1 - tailDrop * t * t;
          if (yn > 0) y -= t * h * 0.08;
        }

        // Domed roof / soft top surface
        if (yn > flatTop) {
          const roofT = (yn - flatTop) / Math.max(0.001, 1 - flatTop);
          y += (1 - xn * xn) * (1 - zn * zn * 0.55) * roofDome * h * 0.35 * roofT;
          x *= 1 - roofT * 0.08 * (1 - zn * zn);
        }

        // Soft underside curve
        if (yn < -0.2) {
          y += (1 - xn * xn) * 0.04 * h;
        }

        // Slightly round front/rear ends inward
        z *= 1 - 0.04 * xn * xn;

        pos.setXYZ(i, x, y * yMul, z);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return new THREE.Mesh(geo, material);
    }

    function curvedCapsule(r, len, material, radial = 10, tubular = 6) {
      // Approximate rounded bumper / fender with stretched sphere
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, radial, tubular), material);
      mesh.scale.set(1, 0.85, len / (r * 2));
      return mesh;
    }

    // Style profile presets
    const profiles = {
      hatch: { noseDrop: 0.38, tailDrop: 0.12, sideTuck: 0.16, roofDome: 0.28, waist: 0.05 },
      sedan: { noseDrop: 0.4, tailDrop: 0.28, sideTuck: 0.14, roofDome: 0.2, waist: 0.05 },
      coupe: { noseDrop: 0.48, tailDrop: 0.35, sideTuck: 0.18, roofDome: 0.32, waist: 0.08 },
      suv: { noseDrop: 0.28, tailDrop: 0.12, sideTuck: 0.1, roofDome: 0.12, waist: 0.03, flatTop: 0.35 },
      truck: { noseDrop: 0.22, tailDrop: 0.05, sideTuck: 0.08, roofDome: 0.06, waist: 0.02, flatTop: 0.4 },
      van: { noseDrop: 0.18, tailDrop: 0.05, sideTuck: 0.08, roofDome: 0.08, waist: 0.02, flatTop: 0.45 },
      buggy: { noseDrop: 0.25, tailDrop: 0.2, sideTuck: 0.12, roofDome: 0.05, waist: 0.04 },
      roadster: { noseDrop: 0.45, tailDrop: 0.3, sideTuck: 0.2, roofDome: 0.08, waist: 0.1, flatTop: 0.5 },
      muscle: { noseDrop: 0.42, tailDrop: 0.32, sideTuck: 0.12, roofDome: 0.15, waist: 0.04 },
      hyper: { noseDrop: 0.55, tailDrop: 0.4, sideTuck: 0.22, roofDome: 0.25, waist: 0.12 },
      rally: { noseDrop: 0.35, tailDrop: 0.18, sideTuck: 0.14, roofDome: 0.2, waist: 0.05 },
      limo: { noseDrop: 0.35, tailDrop: 0.25, sideTuck: 0.1, roofDome: 0.12, waist: 0.03 },
    };
    const profile = profiles[style] || profiles.hatch;

    // --- Chassis / floor ---
    add(box(W * 0.88, 0.1, L * 0.82, plastic), 0, 0.26, 0);

    // Lower rocker with soft curve
    add(curvedShell(W * 1.02, H * 0.26, L * 0.9, paintDark, {
      noseDrop: 0.15,
      tailDrop: 0.12,
      sideTuck: 0.2,
      roofDome: 0.02,
      waist: 0.08,
      flatTop: 0.6,
    }), 0, 0.4, -L * 0.01);

    // Main body shell — curved per class
    if (style === "truck") {
      add(curvedShell(W * 0.96, H * 0.4, L * 0.36, paint, { noseDrop: 0.2, tailDrop: 0.05, sideTuck: 0.1, roofDome: 0.1, flatTop: 0.35 }), 0, 0.72, L * 0.22);
      add(curvedShell(W * 0.96, H * 0.26, L * 0.4, paint, { noseDrop: 0.05, tailDrop: 0.05, sideTuck: 0.08, roofDome: 0.02, flatTop: 0.5 }), 0, 0.58, -L * 0.22);
      add(box(W * 0.82, 0.05, L * 0.36, plastic), 0, 0.48, -L * 0.2);
    } else if (style === "van") {
      add(curvedShell(W * 0.98, H * 0.82, L * 0.82, paint, profile), 0, 0.88, -L * 0.02);
      add(curvedShell(W * 0.9, H * 0.18, L * 0.18, paint, { noseDrop: 0.35, sideTuck: 0.12, roofDome: 0.05 }), 0, 0.52, L * 0.4);
    } else if (style === "suv") {
      add(curvedShell(W * 0.98, H * 0.48, L * 0.8, paint, profile), 0, 0.8, 0);
      add(curvedShell(W * 0.9, H * 0.14, L * 0.28, paint, { noseDrop: 0.45, sideTuck: 0.12, roofDome: 0.05 }), 0, 0.92, L * 0.28);
      add(box(W * 0.55, 0.07, L * 0.65, plastic), 0, 0.3, 0);
    } else if (style === "limo") {
      add(curvedShell(W * 0.96, H * 0.34, L * 0.92, paint, profile), 0, 0.64, 0);
      add(curvedShell(W * 0.88, H * 0.12, L * 0.2, paint, { noseDrop: 0.4, sideTuck: 0.1 }), 0, 0.8, L * 0.38);
      add(curvedShell(W * 0.86, H * 0.12, L * 0.16, paint, { tailDrop: 0.35, sideTuck: 0.1 }), 0, 0.78, -L * 0.4);
      add(box(W * 1.0, 0.035, L * 0.88, chrome), 0, 0.54, 0);
    } else if (style === "buggy") {
      add(curvedShell(W * 0.68, H * 0.22, L * 0.52, paint, profile), 0, 0.55, 0);
      add(curvedShell(W * 0.52, H * 0.1, L * 0.24, paint, { noseDrop: 0.3 }), 0, 0.64, L * 0.26);
      add(box(0.06, H * 0.7, 0.06, chrome), W * 0.28, 1.0, L * 0.1);
      add(box(0.06, H * 0.7, 0.06, chrome), -W * 0.28, 1.0, L * 0.1);
      add(box(0.06, H * 0.7, 0.06, chrome), W * 0.28, 1.0, -L * 0.15);
      add(box(0.06, H * 0.7, 0.06, chrome), -W * 0.28, 1.0, -L * 0.15);
      add(box(W * 0.6, 0.06, 0.06, chrome), 0, 1.35, L * 0.1);
      add(box(W * 0.6, 0.06, 0.06, chrome), 0, 1.35, -L * 0.15);
      add(box(0.06, 0.06, L * 0.28, chrome), W * 0.28, 1.35, -L * 0.02);
      add(box(0.06, 0.06, L * 0.28, chrome), -W * 0.28, 1.35, -L * 0.02);
      const spare = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.1, 8, 16), rubber);
      spare.rotation.y = Math.PI / 2;
      add(spare, 0, 0.7, -L * 0.38);
    } else if (style === "roadster") {
      add(curvedShell(W * 0.94, H * 0.26, L * 0.78, paint, profile), 0, 0.5, 0);
      add(curvedShell(W * 0.86, H * 0.1, L * 0.32, paint, { noseDrop: 0.5, sideTuck: 0.16 }), 0, 0.64, L * 0.22);
      add(curvedShell(W * 0.68, H * 0.1, L * 0.26, paintDark, { roofDome: 0.05 }), 0, 0.68, -L * 0.04);
      const screen = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, W * 0.62, 6), plastic);
      screen.rotation.z = Math.PI / 2;
      add(screen, 0, 0.78, L * 0.04);
      add(box(W * 0.62, H * 0.26, 0.04, glass), 0, 0.88, L * 0.02, -0.4);
    } else if (style === "muscle") {
      add(curvedShell(W * 0.98, H * 0.34, L * 0.72, paint, profile), 0, 0.6, 0);
      add(curvedShell(W * 0.9, H * 0.12, L * 0.34, paint, { noseDrop: 0.5, sideTuck: 0.1, roofDome: 0.05 }), 0, 0.76, L * 0.2);
      add(curvedShell(W * 0.26, 0.1, L * 0.16, paintDark, { roofDome: 0.2 }), 0, 0.88, L * 0.16);
      add(curvedShell(W * 0.88, H * 0.14, L * 0.26, paint, { tailDrop: 0.4, sideTuck: 0.1 }), 0, 0.76, -L * 0.26);
    } else if (style === "hyper") {
      add(curvedShell(W * 0.96, H * 0.26, L * 0.86, paint, profile), 0, 0.46, 0);
      add(curvedShell(W * 0.68, H * 0.14, L * 0.24, paint, { noseDrop: 0.6, sideTuck: 0.2 }), 0, 0.4, L * 0.4);
      add(curvedShell(W * 0.92, H * 0.2, L * 0.26, paint, { tailDrop: 0.45, sideTuck: 0.18, roofDome: 0.15 }), 0, 0.56, -L * 0.34);
      add(box(0.1, H * 0.16, L * 0.2, plastic), W * 0.46, 0.52, -L * 0.05);
      add(box(0.1, H * 0.16, L * 0.2, plastic), -W * 0.46, 0.52, -L * 0.05);
    } else if (style === "rally") {
      add(curvedShell(W * 0.98, H * 0.38, L * 0.76, paint, profile), 0, 0.66, 0);
      add(curvedShell(W * 0.92, H * 0.12, L * 0.28, paint, { noseDrop: 0.4, sideTuck: 0.12 }), 0, 0.86, L * 0.26);
      add(curvedCapsule(0.14, 0.45, paintDark), W * 0.5, 0.55, L * 0.26);
      add(curvedCapsule(0.14, 0.45, paintDark), -W * 0.5, 0.55, L * 0.26);
      add(curvedCapsule(0.14, 0.45, paintDark), W * 0.5, 0.55, -L * 0.26);
      add(curvedCapsule(0.14, 0.45, paintDark), -W * 0.5, 0.55, -L * 0.26);
    } else if (style === "coupe") {
      add(curvedShell(W * 0.96, H * 0.3, L * 0.8, paint, profile), 0, 0.56, 0);
      add(curvedShell(W * 0.88, H * 0.1, L * 0.3, paint, { noseDrop: 0.55, sideTuck: 0.14 }), 0, 0.72, L * 0.24);
      add(curvedShell(W * 0.86, H * 0.12, L * 0.22, paint, { tailDrop: 0.45, sideTuck: 0.14, roofDome: 0.1 }), 0, 0.7, -L * 0.3);
    } else if (style === "sedan") {
      add(curvedShell(W * 0.96, H * 0.32, L * 0.78, paint, profile), 0, 0.6, 0);
      add(curvedShell(W * 0.9, H * 0.12, L * 0.28, paint, { noseDrop: 0.45, sideTuck: 0.12 }), 0, 0.76, L * 0.28);
      add(curvedShell(W * 0.88, H * 0.14, L * 0.24, paint, { tailDrop: 0.35, sideTuck: 0.12, roofDome: 0.08 }), 0, 0.74, -L * 0.32);
    } else {
      // Hatch — fastback curve
      add(curvedShell(W * 0.96, H * 0.36, L * 0.72, paint, profile), 0, 0.64, -L * 0.02);
      add(curvedShell(W * 0.88, H * 0.12, L * 0.26, paint, { noseDrop: 0.45, sideTuck: 0.14 }), 0, 0.8, L * 0.26);
      add(curvedShell(W * 0.88, H * 0.16, L * 0.3, paint, { tailDrop: 0.15, sideTuck: 0.14, roofDome: 0.35 }), 0, 0.86, -L * 0.26);
    }

    // Wheel-arch bulges (curved fenders)
    if (style !== "buggy") {
      const archR = style === "truck" || style === "suv" || style === "van" ? 0.42 : 0.36;
      const archZ = L * (style === "truck" || style === "limo" ? 0.3 : 0.34);
      [[W * 0.48, archZ], [-W * 0.48, archZ], [W * 0.48, -archZ], [-W * 0.48, -archZ]].forEach(([ax, az]) => {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(archR, 0.1, 8, 14, Math.PI), paintDark);
        arch.rotation.y = ax > 0 ? Math.PI / 2 : -Math.PI / 2;
        arch.rotation.z = Math.PI;
        add(arch, ax, 0.42, az);
      });
    }

    // Taxi / police / special roof markers
    if (id === "taxi") {
      add(curvedShell(W * 0.32, 0.1, 0.22, accent, { roofDome: 0.4, sideTuck: 0.2 }), 0, H * 1.12, 0);
    }
    if (id === "police") {
      add(box(W * 0.48, 0.08, 0.2, plastic), 0, H * 1.1, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.85 })), W * 0.12, H * 1.18, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2244ff, emissive: 0x0022ff, emissiveIntensity: 0.85 })), -W * 0.12, H * 1.18, 0);
    }
    if (id === "ambulance") {
      add(box(W * 0.55, 0.1, 0.22, accent), 0, H * 1.15, 0);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 0.9 })), 0, H * 1.28, 0);
      add(box(W * 0.12, H * 0.35, 0.04, accent), W * 0.48, H * 0.85, 0);
      add(box(W * 0.12, H * 0.35, 0.04, accent), -W * 0.48, H * 0.85, 0);
    }
    if (id === "fire") {
      add(box(W * 0.7, 0.35, L * 0.35, accent), 0, H * 1.15, -L * 0.1);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), chrome), W * 0.35, H * 1.4, -L * 0.05);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), chrome), -W * 0.35, H * 1.4, -L * 0.05);
    }
    if (id === "electric") {
      add(box(W * 0.5, 0.04, 0.08, accent), 0, 0.38, L * 0.48);
      add(box(0.06, 0.06, L * 0.5, accent), W * 0.5, 0.55, 0);
      add(box(0.06, 0.06, L * 0.5, accent), -W * 0.5, 0.55, 0);
    }
    if (id === "drift") {
      add(box(W * 0.95, 0.04, L * 0.12, accent), 0, 0.35, L * 0.1);
      add(box(W * 0.95, 0.04, L * 0.12, accent), 0, 0.35, -L * 0.15);
    }

    // --- Cabin / greenhouse (curved roof + glass) ---
    const cabinY = style === "hyper" || style === "roadster" ? H * 0.68 : style === "truck" || style === "van" || style === "suv" ? H * 0.95 : H * 0.92;
    const cabinZ = style === "truck" ? L * 0.18 : style === "limo" ? 0 : -L * 0.02;
    const cabinLen = style === "truck" ? L * 0.28 : style === "limo" ? L * 0.7 : style === "muscle" ? L * 0.32 : style === "hyper" || style === "roadster" ? L * 0.4 : style === "van" ? L * 0.5 : L * 0.42;
    const cabinW = W * (style === "hyper" || style === "roadster" ? 0.76 : 0.86);
    const cabinH = H * (style === "hyper" || style === "roadster" ? 0.26 : style === "truck" || style === "van" || style === "suv" ? 0.38 : 0.36);

    if (style !== "buggy" && style !== "roadster") {
      add(
        curvedShell(cabinW * 0.95, cabinH * 0.55, cabinLen * 0.9, paint, {
          noseDrop: 0.15,
          tailDrop: style === "hatch" ? 0.08 : 0.2,
          sideTuck: 0.22,
          roofDome: 0.45,
          waist: 0.04,
          flatTop: 0.05,
        }),
        0,
        cabinY + cabinH * 0.2,
        cabinZ - cabinLen * 0.02
      );
      const windshield = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.88, cabinH * 0.95, 6, 4), glass);
      // Curve windshield slightly
      {
        const wp = windshield.geometry.attributes.position;
        for (let i = 0; i < wp.count; i++) {
          const x = wp.getX(i);
          const y = wp.getY(i);
          wp.setZ(i, -0.06 * (x / (cabinW * 0.44)) * (x / (cabinW * 0.44)) - 0.04 * (y / cabinH));
        }
        wp.needsUpdate = true;
        windshield.geometry.computeVertexNormals();
      }
      add(windshield, 0, cabinY, cabinZ + cabinLen * 0.4, -0.52);
      const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinW * 0.85, cabinH * 0.75, 5, 3), glassDark);
      {
        const rp = rearGlass.geometry.attributes.position;
        for (let i = 0; i < rp.count; i++) {
          const x = rp.getX(i);
          rp.setZ(i, 0.05 * (x / (cabinW * 0.42)) * (x / (cabinW * 0.42)));
        }
        rp.needsUpdate = true;
        rearGlass.geometry.computeVertexNormals();
      }
      add(rearGlass, 0, cabinY + 0.02, cabinZ - cabinLen * 0.42, style === "hatch" ? 0.48 : 0.28);
      // Side glass with slight outward bow
      [-1, 1].forEach((side) => {
        const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(cabinLen * 0.55, cabinH * 0.55, 4, 3), glassDark);
        const sp = sideGlass.geometry.attributes.position;
        for (let i = 0; i < sp.count; i++) {
          const x = sp.getX(i);
          sp.setZ(i, side * 0.04 * (1 - Math.pow(x / (cabinLen * 0.25), 2)));
        }
        sp.needsUpdate = true;
        sideGlass.geometry.computeVertexNormals();
        add(sideGlass, side * cabinW * 0.48, cabinY + 0.02, cabinZ, 0, side > 0 ? Math.PI / 2 : -Math.PI / 2);
      });
      add(box(0.05, cabinH * 0.85, 0.07, plastic), cabinW * 0.4, cabinY, cabinZ + cabinLen * 0.32);
      add(box(0.05, cabinH * 0.85, 0.07, plastic), -cabinW * 0.4, cabinY, cabinZ + cabinLen * 0.32);

      // Cabin interior: seats, dash, wheel (visible through glass)
      const seatMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.85 });
      const dashMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.7 });
      add(box(cabinW * 0.32, 0.28, 0.4, seatMat), W * 0.18, 0.55, cabinZ + cabinLen * 0.05);
      add(box(cabinW * 0.32, 0.45, 0.12, seatMat), W * 0.18, 0.78, cabinZ - 0.05);
      add(box(cabinW * 0.32, 0.28, 0.4, seatMat), -W * 0.18, 0.55, cabinZ + cabinLen * 0.05);
      add(box(cabinW * 0.32, 0.45, 0.12, seatMat), -W * 0.18, 0.78, cabinZ - 0.05);
      if (style !== "roadster" && style !== "hyper") {
        add(box(cabinW * 0.3, 0.22, 0.35, seatMat), W * 0.16, 0.5, cabinZ - cabinLen * 0.22);
        add(box(cabinW * 0.3, 0.22, 0.35, seatMat), -W * 0.16, 0.5, cabinZ - cabinLen * 0.22);
      }
      add(box(cabinW * 0.78, 0.18, 0.35, dashMat), 0, 0.72, cabinZ + cabinLen * 0.28);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), plastic);
      add(wheel, W * 0.16, 0.85, cabinZ + cabinLen * 0.22);
      add(box(0.04, 0.04, 0.12, plastic), W * 0.16, 0.72, cabinZ + cabinLen * 0.2);
      // Tiny dash gauges
      add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), chrome), -0.12, 0.8, cabinZ + cabinLen * 0.42);
      add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), chrome), 0, 0.8, cabinZ + cabinLen * 0.42);
    }

    // --- Bumpers (rounded) ---
    add(curvedShell(W * 0.92, H * 0.14, L * 0.1, plastic, { noseDrop: 0.2, sideTuck: 0.25, roofDome: 0.05 }), 0, 0.36, L * 0.46);
    add(curvedShell(W * 0.92, H * 0.14, L * 0.1, plastic, { tailDrop: 0.2, sideTuck: 0.25, roofDome: 0.05 }), 0, 0.36, -L * 0.46);
    if (style === "hyper" || style === "muscle" || style === "roadster") {
      add(curvedShell(W * 0.68, 0.06, L * 0.12, plastic, { sideTuck: 0.3 }), 0, 0.22, L * 0.48);
    }

    // --- Grille ---
    add(curvedShell(W * 0.5, H * 0.12, 0.06, plastic, { sideTuck: 0.15 }), 0, 0.5, L * 0.48);
    for (let i = -2; i <= 2; i++) {
      add(box(0.035, H * 0.1, 0.035, chrome), i * W * 0.09, 0.5, L * 0.5);
    }

    // --- Lights (rounded housings) ---
    const lightY = style === "hyper" || style === "roadster" ? 0.4 : 0.52;
    [-1, 1].forEach((side) => {
      const housing = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), chrome);
      housing.scale.set(1.35, 0.7, 0.55);
      add(housing, side * W * 0.32, lightY, L * 0.48);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), headGlow);
      lens.scale.set(1.2, 0.65, 0.45);
      add(lens, side * W * 0.32, lightY, L * 0.5);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), orangeGlow);
      tip.scale.set(1.1, 0.7, 0.5);
      add(tip, side * W * 0.46, lightY, L * 0.44);
    });
    if (style === "hyper") {
      add(curvedShell(W * 0.82, 0.07, 0.05, tailGlow, { sideTuck: 0.1 }), 0, 0.52, -L * 0.48);
    } else {
      [-1, 1].forEach((side) => {
        const tl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), tailGlow);
        tl.scale.set(1.4, 0.65, 0.4);
        add(tl, side * W * 0.32, 0.52, -L * 0.48);
      });
    }

    // --- Mirrors ---
    [-1, 1].forEach((side) => {
      add(curvedShell(0.1, 0.08, 0.16, plastic, { sideTuck: 0.2 }), side * W * 0.5, cabinY - 0.05, cabinZ + cabinLen * 0.22);
      const mir = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glassDark);
      mir.scale.set(1.3, 0.8, 0.5);
      add(mir, side * W * 0.56, cabinY - 0.05, cabinZ + cabinLen * 0.22);
    });

    // --- Accent stripe / racing marks ---
    if (style === "muscle" || style === "rally" || style === "coupe" || style === "roadster") {
      add(curvedShell(W * 0.1, 0.025, L * 0.65, accent, { sideTuck: 0.05, roofDome: 0.05 }), 0, H * 0.7, L * 0.02);
    }
    if (style === "hyper") {
      add(curvedShell(W * 0.05, 0.02, L * 0.48, accent, { sideTuck: 0.05 }), 0, H * 0.52, 0);
    }

    if (style === "coupe" || style === "hyper" || style === "muscle" || style === "roadster") {
      const spoilerY = style === "hyper" ? H * 0.82 : H * 0.92;
      add(box(0.045, 0.16, 0.045, plastic), W * 0.26, spoilerY - 0.05, -L * 0.4);
      add(box(0.045, 0.16, 0.045, plastic), -W * 0.26, spoilerY - 0.05, -L * 0.4);
      add(curvedShell(W * 0.82, 0.045, 0.2, paintDark, { sideTuck: 0.15, roofDome: 0.2 }), 0, spoilerY, -L * 0.4);
    }

    if (style === "rally") {
      add(box(0.1, 0.42, 0.1, plastic), -W * 0.15, H * 1.12, cabinZ);
      add(box(W * 0.65, 0.04, 0.07, chrome), 0, 0.68, L * 0.48);
      [-0.2, 0, 0.2].forEach((ox) => {
        add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), headGlow), ox * W, 0.8, L * 0.48);
      });
    }

    if (style === "muscle") {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8), chrome), W * 0.25, 0.25, -L * 0.5).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8), chrome), -W * 0.25, 0.25, -L * 0.5).rotation.x = Math.PI / 2;
    } else if (style === "hyper" || style === "roadster") {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), chrome), W * 0.15, 0.28, -L * 0.5).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), chrome), 0, 0.28, -L * 0.5).rotation.x = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), chrome), -W * 0.15, 0.28, -L * 0.5).rotation.x = Math.PI / 2;
    } else {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8), chrome), W * 0.28, 0.22, -L * 0.48).rotation.x = Math.PI / 2;
    }

    // --- Antenna + door handles ---
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, H * 0.55, 5), chrome);
    add(antenna, -W * 0.22, cabinY + cabinH * 0.55, cabinZ - cabinLen * 0.1);
    [-1, 1].forEach((side) => {
      add(box(0.04, 0.04, 0.12, chrome), side * W * 0.48, cabinY - cabinH * 0.15, cabinZ + cabinLen * 0.05);
    });
    // Wiper blades on windshield
    if (style !== "buggy" && style !== "roadster") {
      add(box(0.02, 0.02, cabinW * 0.35, plastic), W * 0.12, cabinY + cabinH * 0.15, cabinZ + cabinLen * 0.42).rotation.z = 0.35;
      add(box(0.02, 0.02, cabinW * 0.32, plastic), -W * 0.1, cabinY + cabinH * 0.12, cabinZ + cabinLen * 0.42).rotation.z = -0.4;
    }
    if (style === "suv" || style === "truck" || style === "van") {
      add(box(0.05, 0.04, L * 0.45, chrome), W * 0.28, H * 1.05, cabinZ);
      add(box(0.05, 0.04, L * 0.45, chrome), -W * 0.28, H * 1.05, cabinZ);
      add(box(W * 0.56, 0.03, 0.05, chrome), 0, H * 1.05, cabinZ + L * 0.12);
      add(box(W * 0.56, 0.03, 0.05, chrome), 0, H * 1.05, cabinZ - L * 0.12);
    }

    // Side mirrors
    if (style !== "buggy") {
      [-1, 1].forEach((side) => {
        add(box(0.08, 0.06, 0.14, plastic), side * W * 0.52, cabinY + 0.05, cabinZ + cabinLen * 0.35);
        add(box(0.12, 0.08, 0.04, chrome), side * (W * 0.52 + 0.08), cabinY + 0.05, cabinZ + cabinLen * 0.35);
      });
    }
    // Fog lights + side markers
    [-1, 1].forEach((side) => {
      add(new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0xfff8e0, emissive: 0xffe8a0, emissiveIntensity: 0.35, roughness: 0.3 })
      ), side * W * 0.28, 0.38, L * 0.48);
      add(box(0.06, 0.05, 0.04, new THREE.MeshStandardMaterial({ color: 0xffa020, emissive: 0xff8800, emissiveIntensity: 0.4 })), side * W * 0.5, 0.55, L * 0.15);
      add(box(0.06, 0.05, 0.04, new THREE.MeshStandardMaterial({ color: 0xff3030, emissive: 0xff0000, emissiveIntensity: 0.35 })), side * W * 0.5, 0.55, -L * 0.2);
    });
    // Hood badge / emblem
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 10), chrome), 0, 0.72, L * 0.22);
    // Window chrome trim
    if (style !== "buggy" && style !== "roadster") {
      add(box(cabinW * 1.02, 0.03, cabinLen * 0.95, chrome), 0, cabinY - cabinH * 0.35, cabinZ);
    }
    // Undercarriage skid / exhaust heat shield
    add(box(W * 0.55, 0.04, L * 0.35, plastic), 0, 0.22, -L * 0.15);
    if (style === "hyper" || style === "muscle" || id === "super" || id === "drift") {
      add(box(W * 0.7, 0.03, L * 0.15, accent), 0, 0.28, -L * 0.05);
    }

    // --- Wheels (tire + rim + hub + brake disc) ---
    const tireR = style === "rally" || style === "buggy" ? 0.45 : style === "truck" || style === "suv" || style === "van" ? 0.48 : style === "hyper" || style === "roadster" ? 0.4 : 0.42;
    const tireW = style === "rally" || style === "truck" || style === "buggy" || style === "suv" ? 0.34 : 0.28;
    const wheelZ = L * (style === "truck" || style === "limo" ? 0.3 : style === "buggy" ? 0.36 : 0.34);
    const wheelY = tireR;
    const wheelX = W * 0.52;
    const tireGeo = new THREE.CylinderGeometry(tireR, tireR, tireW, 20);
    const rimGeo = new THREE.CylinderGeometry(tireR * 0.62, tireR * 0.62, tireW * 0.7, 20);
    const hubGeo = new THREE.CylinderGeometry(tireR * 0.22, tireR * 0.22, tireW * 0.85, 12);
    const discGeo = new THREE.CylinderGeometry(tireR * 0.4, tireR * 0.4, tireW * 0.15, 12);
    const spokeGeo = new THREE.BoxGeometry(tireR * 0.1, tireR * 1.0, tireW * 0.12);

    function makeWheel() {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(tireGeo, rubber);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      wg.add(tire);
      // Slight tire sidewall bulge
      const sidewall = new THREE.Mesh(new THREE.TorusGeometry(tireR * 0.92, tireW * 0.22, 6, 20), rubber);
      sidewall.rotation.y = Math.PI / 2;
      wg.add(sidewall);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      wg.add(rim);
      const hub = new THREE.Mesh(hubGeo, chrome);
      hub.rotation.z = Math.PI / 2;
      wg.add(hub);
      const disc = new THREE.Mesh(discGeo, new THREE.MeshStandardMaterial({ color: 0x8a9098, metalness: 0.8, roughness: 0.35 }));
      disc.rotation.z = Math.PI / 2;
      disc.position.x = -tireW * 0.15;
      wg.add(disc);
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.z = Math.PI / 2;
        spoke.rotation.x = (i / 5) * Math.PI;
        wg.add(spoke);
      }
      return wg;
    }

    g.userData.wheels = [];
    g.userData.brakeLights = [];

    [[wheelX, wheelZ], [-wheelX, wheelZ], [wheelX, -wheelZ], [-wheelX, -wheelZ]].forEach(([wx, wz]) => {
      const wheel = makeWheel();
      const pivot = new THREE.Group();
      pivot.position.set(wx, wheelY, wz);
      pivot.add(wheel);
      g.add(pivot);
      g.userData.wheels.push({ pivot, spin: wheel, front: wz > 0, baseY: wheelY, localX: wx, localZ: wz });
    });

    // Dedicated brake-light overlays (brighter when braking)
    if (style === "hyper") {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.82, 0.07, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1111, emissiveIntensity: 0.45, roughness: 0.35 })
      );
      bar.position.set(0, 0.52, -L * 0.49);
      g.add(bar);
      g.userData.brakeLights.push(bar.material);
    } else {
      [-1, 1].forEach((side) => {
        const bl = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1111, emissiveIntensity: 0.45, roughness: 0.35 })
        );
        bl.scale.set(1.4, 0.65, 0.4);
        bl.position.set(side * W * 0.32, 0.52, -L * 0.49);
        g.add(bl);
        g.userData.brakeLights.push(bl.material);
      });
    }

    // Headlight glow without a real SpotLight (cheaper)
    const spot = null;
    g.userData.headlight = spot;

    // Soft ground contact blob
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(W, L) * 0.42, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    g.add(shadow);
    g.userData.groundShadow = shadow;

    return g;
  }

  function applyCarSpec(id) {
    const spec = CARS.find((c) => c.id === id) || CARS[0];
    car.spec = spec;
    selectedCarId = spec.id;
    car.dent = 0;
    car.wreckPose = false;
    const finish = function () {
      if (carMesh) scene.remove(carMesh);
      carMesh = createCarMesh(spec);
      scene.add(carMesh);
      el.carName.textContent = spec.name;
      persist();
    };
    if (window.OpenRoadsCars && window.OpenRoadsCars.ensure) {
      window.OpenRoadsCars.ensure(spec.id, function () { finish(); });
    } else {
      finish();
    }
  }

  function surfaceAt(x, z) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(z / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return T.WATER;
    return map[ty][tx];
  }

  function wrapZValue(z) {
    const min = TILE * 2;
    const max = WORLD_H - TILE * 2;
    const span = max - min;
    while (z > max) z -= span;
    while (z < min) z += span;
    return z;
  }

  // Seamless highway: drive off one end → appear at the other (camera follows)
  function applyInfiniteWrap() {
    if (currentMap().wrap !== "z") return;
    const min = TILE * 2;
    const max = WORLD_H - TILE * 2;
    const span = max - min;
    let dz = 0;
    if (car.z > max) dz = -span;
    else if (car.z < min) dz = span;
    if (!dz) return;
    car.z += dz;
    if (camera) camera.position.z += dz;
    if (camLook) camLook.z += dz;
    function shiftList(list) {
      for (let i = 0; i < list.length; i++) {
        const o = list[i];
        if (!o) continue;
        if (o.mesh && o.mesh.position) o.mesh.position.z += dz;
        if (o.z != null) o.z += dz;
      }
    }
    shiftList(particles);
    shiftList(debris);
    shiftList(dustParticles);
    shiftList(skidMarks);
    for (let i = 0; i < npcs.length; i++) {
      const n = npcs[i];
      if (!n) continue;
      n.z += dz;
      if (n.homeZ != null) n.homeZ += dz;
      if (n.aimZ != null) n.aimZ += dz;
      if (n.lastZ != null) n.lastZ += dz;
      if (n.mesh) n.mesh.position.z += dz;
    }
    for (let i = 0; i < pedestrians.length; i++) {
      const p = pedestrians[i];
      if (!p) continue;
      p.z += dz;
      if (p.mesh) p.mesh.position.z += dz;
    }
  }

  function spawnNpcs() {
    npcs.forEach((n) => { if (n.mesh) scene.remove(n.mesh); });
    pedestrians.forEach((p) => { if (p.mesh) scene.remove(p.mesh); });
    npcs = [];
    pedestrians = [];
    const colors = [
      0x8a9bb0, 0xc48b5a, 0x7a8f6a, 0xa07070, 0x4a6a8a, 0xd0a060, 0x6a5a7a,
      0x9a7a5a, 0x5a7a9a, 0xb07080, 0xd8dde6, 0x3d6ea5, 0xc44536, 0x2f5d4a,
      0xf0c400, 0xb86b3a, 0x1a1f2e, 0xb83b5e, 0xe07a3a, 0x6f9b6a,
    ];
    const spots = [];
    // Discover road tiles so traffic works on every map layout
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (map[y][x] !== T.ROAD) continue;
        if ((x + y * 3) % 7 !== 0) continue;
        const ns = map[y - 1][x] === T.ROAD || map[y + 1][x] === T.ROAD;
        const ew = map[y][x - 1] === T.ROAD || map[y][x + 1] === T.ROAD;
        let ang = 0;
        if (ns && !ew) ang = (x + y) % 2 === 0 ? 0 : Math.PI;
        else if (ew && !ns) ang = (x + y) % 2 === 0 ? Math.PI / 2 : -Math.PI / 2;
        else ang = (x + y) % 2 === 0 ? 0 : Math.PI / 2;
        spots.push([(x + 0.5) * TILE, (y + 0.5) * TILE, ang]);
      }
    }
    function createSimpleNpcCar(color, index) {
      if (window.OpenRoadsCars) {
        const mesh = window.OpenRoadsCars.cloneNpc(index || 0, color);
        if (mesh) return mesh;
      }
      if (window.OpenRoadsCircuit && window.OpenRoadsCircuit.ready()) {
        return window.OpenRoadsCircuit.clone({
          color: color,
          scaleX: 0.9 + Math.random() * 0.12,
          scaleY: 0.88 + Math.random() * 0.14,
          scaleZ: 0.88 + Math.random() * 0.14,
        });
      }
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 3.3), mat(color));
      body.position.y = 0.52;
      g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.5, 1.5), mat(0x1a2838));
      cabin.position.set(0, 0.98, -0.15);
      g.add(cabin);
      return g;
    }
    const maxNpcs = 8;
    const step = Math.max(1, Math.floor(spots.length / maxNpcs));
    let placed = 0;
    for (let i = 0; i < spots.length && placed < maxNpcs; i += step) {
      const s = spots[i];
      const tx = Math.floor(s[0] / TILE);
      const ty = Math.floor(s[1] / TILE);
      if (!map[ty] || map[ty][tx] !== T.ROAD) continue;
      if (Math.hypot(s[0] - SPAWN_TX * TILE, s[1] - SPAWN_TZ * TILE) < TILE * 3) continue;
      const mesh = createSimpleNpcCar(colors[placed % colors.length], placed);
      mesh.position.set(s[0], heightAt(s[0], s[1]), s[1]);
      mesh.rotation.y = s[2];
      scene.add(mesh);
      npcs.push({
        mesh,
        x: s[0],
        z: s[1],
        angle: s[2],
        vx: 0,
        vz: 0,
        speed: 7 + Math.random() * 7,
        w: 1.8,
        t: Math.random() * 2,
        turnEvery: 1.8 + Math.random() * 2.5,
        health: 40 + Math.floor(Math.random() * 25),
        wrecked: false,
        respawnIn: 0,
        homeX: s[0],
        homeZ: s[1],
        homeAngle: s[2],
        chase: false,
      });
      placed++;
    }

    // No pursuit cars
    spawnPedestrians();
  }

  function createPedestrianMesh(seed) {
    const g = new THREE.Group();
    // Bright, simple geometry so people are always visible (no Capsule / skinned deps)
    const skinTones = [0xf0d0b0, 0xd4a574, 0x8d5524, 0xffe0c0, 0xc68642];
    const shirts = [0xff4d4d, 0x3d8bfd, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xffffff, 0xff7f50, 0x1abc9c];
    const pants = [0x2c3e50, 0x34495e, 0x1a1a2e, 0x4a3728, 0x5d6d7e];
    const skin = new THREE.MeshLambertMaterial({ color: skinTones[seed % skinTones.length] });
    const shirt = new THREE.MeshLambertMaterial({ color: shirts[seed % shirts.length] });
    const pant = new THREE.MeshLambertMaterial({ color: pants[seed % pants.length] });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.9, 10), shirt);
    torso.position.y = 1.25;
    g.add(torso);

    // Jacket collar / neckline hint
    if (seed % 3 === 0) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 10), mat(shirts[(seed + 2) % shirts.length]));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 1.32;
      g.add(collar);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), skin);
    head.position.y = 1.85;
    head.castShadow = false;
    g.add(head);

    const hairCols = [0x1a1510, 0x3a2a18, 0x6a4a28, 0xc8b090, 0xe8e0d0];
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.185, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      mat(hairCols[seed % hairCols.length], { roughness: 0.9 })
    );
    hair.position.y = 1.6;
    g.add(hair);

    // Hats / caps
    if (seed % 5 === 0) {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), mat(0x2a2e34));
      brim.position.y = 1.68;
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.18, 10), mat(0x3a4048));
      crown.position.y = 1.78;
      g.add(crown);
    } else if (seed % 5 === 1) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0xc44536));
      cap.position.y = 1.68;
      g.add(cap);
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.18), mat(0xc44536));
      bill.position.set(0, 1.66, 0.18);
      g.add(bill);
    }

    // Sunglasses
    if (seed % 4 === 2) {
      const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), mat(0x111418, { metalness: 0.6, roughness: 0.3 }));
      glasses.position.set(0, 1.55, 0.14);
      g.add(glasses);
    }

    function limb(geo, material, x, y, z) {
      const m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    }
    const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.45, 6);
    const legGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.55, 6);
    const leftArm = limb(armGeo, shirt, 0.3, 1.05, 0);
    const rightArm = limb(armGeo, shirt, -0.3, 1.05, 0);
    const leftLeg = limb(legGeo, pant, 0.1, 0.45, 0);
    const rightLeg = limb(legGeo, pant, -0.1, 0.45, 0);

    // Shoes
    const shoeMat = mat([0x1a1a1e, 0xffffff, 0x8a4a28, 0x3a5a8a][seed % 4], { roughness: 0.6 });
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), shoeMat);
    leftShoe.position.set(0.1, 0.08, 0.04);
    g.add(leftShoe);
    const rightShoe = leftShoe.clone();
    rightShoe.position.x = -0.1;
    g.add(rightShoe);

    // Bag / backpack / phone
    if (seed % 3 === 1) {
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.35, 0.14), mat(0x4a3a2a));
      bag.position.set(0, 1.1, -0.28);
      g.add(bag);
    } else if (seed % 3 === 2) {
      const tote = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.12), mat(0xc07050));
      tote.position.set(0.38, 0.85, 0.05);
      g.add(tote);
    }

    g.userData.limbs = { leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe };



    // Occasional pet on a leash (small companion mesh)
    if (seed % 7 === 0) {
      const dog = new THREE.Group();
      const fur = mat([0x6a4a28, 0xc8b090, 0x2a2e34][seed % 3], { roughness: 0.9 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.25, 3, 6), fur);
      body.rotation.z = Math.PI / 2;
      body.position.set(0.55, 0.28, 0.35);
      dog.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), fur);
      head.position.set(0.55, 0.38, 0.55);
      dog.add(head);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), fur);
      tail.position.set(0.55, 0.35, 0.12);
      tail.rotation.x = 0.8;
      dog.add(tail);
      g.add(dog);
      g.userData.pet = dog;
    }

    return g;
  }

  function spawnPedestrians() {
    pedestrians.forEach((p) => {
      if (p.mesh && p.mesh.parent) scene.remove(p.mesh);
    });
    pedestrians = [];

    // Sidewalk spots: grass tiles that touch a road
    const spots = [];
    // Guaranteed crowd right next to spawn (impossible to miss)
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      const rad = 5 + (i % 5) * 1.8;
      spots.push({
        x: SPAWN_TX * TILE + Math.cos(ang) * rad,
        z: SPAWN_TZ * TILE + Math.sin(ang) * rad,
      });
    }
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (map[y][x] !== T.GRASS) continue;
        const touchesRoad =
          (map[y][x + 1] === T.ROAD) ||
          (map[y][x - 1] === T.ROAD) ||
          (map[y + 1] && map[y + 1][x] === T.ROAD) ||
          (map[y - 1] && map[y - 1][x] === T.ROAD);
        if (!touchesRoad) continue;
        // Denser sidewalk coverage
        if ((x * 5 + y * 11) % 3 !== 0) continue;
        spots.push({
          x: x * TILE + TILE / 2 + ((x % 3) - 1) * 1.8,
          z: y * TILE + TILE / 2 + ((y % 3) - 1) * 1.8,
        });
        // Second person on busy corners
        if ((x + y) % 4 === 0) {
          spots.push({
            x: x * TILE + TILE / 2 + ((y % 3) - 1) * 2.2,
            z: y * TILE + TILE / 2 + ((x % 3) - 1) * 2.2,
          });
        }
      }
    }

    // A few near building fronts (urban feel)
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (map[y][x] !== T.GRASS) continue;
        const nearBuilding =
          (map[y][x + 1] === T.BUILDING) ||
          (map[y][x - 1] === T.BUILDING) ||
          (map[y + 1] && map[y + 1][x] === T.BUILDING) ||
          (map[y - 1] && map[y - 1][x] === T.BUILDING);
        if (!nearBuilding) continue;
        if ((x * 7 + y * 3) % 5 !== 0) continue;
        spots.push({
          x: x * TILE + TILE / 2 + (Math.random() - 0.5) * 3,
          z: y * TILE + TILE / 2 + (Math.random() - 0.5) * 3,
        });
      }
    }

    const count = Math.min(48, spots.length);
    for (let i = 0; i < count; i++) {
      const s = spots[i];
      const mesh = createPedestrianMesh(i * 17 + 3);
      const gy = heightAt(s.x, s.z);
      mesh.position.set(s.x, gy + 0.02, s.z);
      mesh.visible = true;
      mesh.frustumCulled = false;
      scene.add(mesh);
      let angle = (i % 4) * (Math.PI / 2) + (Math.random() - 0.5) * 0.4;
      pedestrians.push({
        mesh,
        x: s.x,
        z: s.z,
        y: gy,
        angle,
        speed: 1.35 + (i % 6) * 0.22,
        baseSpeed: 1.35 + (i % 6) * 0.22,
        phase: Math.random() * Math.PI * 2,
        t: Math.random() * 3,
        turnEvery: 2.2 + Math.random() * 3.5,
        state: "walk",
        downTimer: 0,
        fear: 0,
      });
    }
  }

  function playCrashSound(impact) {
    if (!audioCtx) return;
    try {
      const t0 = audioCtx.currentTime;
      const heavy = impact > 10;
      const dur = 0.07 + Math.min(0.45, impact * 0.014);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 140 + impact * 48;
      osc.type = heavy ? "square" : "sawtooth";
      osc.frequency.setValueAtTime(70 + impact * 7, t0);
      osc.frequency.exponentialRampToValueAtTime(22, t0 + dur);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.min(0.42, 0.04 + impact * 0.014), t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
      // Layered noise / metal rattle
      const n = Math.floor(audioCtx.sampleRate * (0.1 + Math.min(0.18, impact * 0.008)));
      const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const env = 1 - i / n;
        data[i] = (Math.random() * 2 - 1) * env * env;
      }
      const src = audioCtx.createBufferSource();
      const ng = audioCtx.createGain();
      const nf = audioCtx.createBiquadFilter();
      nf.type = "bandpass";
      nf.frequency.value = 600 + impact * 80;
      nf.Q.value = 0.7;
      src.buffer = buf;
      ng.gain.value = Math.min(0.34, 0.05 + impact * 0.012);
      src.connect(nf);
      nf.connect(ng);
      ng.connect(audioCtx.destination);
      src.start(t0);
      if (heavy) {
        const thump = audioCtx.createOscillator();
        const tg = audioCtx.createGain();
        thump.type = "sine";
        thump.frequency.setValueAtTime(55, t0);
        thump.frequency.exponentialRampToValueAtTime(28, t0 + 0.18);
        tg.gain.setValueAtTime(0.0001, t0);
        tg.gain.exponentialRampToValueAtTime(0.28, t0 + 0.01);
        tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
        thump.connect(tg);
        tg.connect(audioCtx.destination);
        thump.start(t0);
        thump.stop(t0 + 0.24);
      }
    } catch (_) {}
  }

  function spawnSparks(x, y, z, nx, nz, impact) {
    const n = Math.min(18, 4 + Math.floor(impact * 0.7));
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04 + Math.random() * 0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xffe08a : 0xff6020 })
      );
      mesh.position.set(x, y + 0.3 + Math.random() * 0.4, z);
      scene.add(mesh);
      const spread = (Math.random() - 0.5) * 1.2;
      const alongX = -nz * spread + nx * (2 + Math.random() * impact * 0.4);
      const alongZ = nx * spread + nz * (2 + Math.random() * impact * 0.4);
      particles.push({
        mesh: mesh,
        vx: alongX + (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 4,
        vz: alongZ + (Math.random() - 0.5) * 3,
        life: 0.2 + Math.random() * 0.35,
        spark: true,
      });
    }
  }

  function spawnCrashSmoke(x, y, z, impact) {
    const n = Math.min(10, 2 + Math.floor(impact * 0.25));
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.35 + Math.random() * 0.45, 6, 6),
        new THREE.MeshBasicMaterial({
          color: 0x9a9aa0,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        })
      );
      mesh.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.5, z + (Math.random() - 0.5) * 0.6);
      scene.add(mesh);
      particles.push({
        mesh: mesh,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.6 + Math.random() * 1.4,
        vz: (Math.random() - 0.5) * 1.2,
        life: 0.7 + Math.random() * 0.9,
        smoke: true,
        grow: 1.8 + Math.random(),
      });
    }
  }

  function spawnCrashFX(x, y, z, impact) {
    const n = Math.min(32, 6 + Math.floor(impact));
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 + Math.random() * 0.12, 0.08 + Math.random() * 0.12, 0.08 + Math.random() * 0.12),
        mat(Math.random() > 0.45 ? 0xffd27a : Math.random() > 0.5 ? 0xffffff : 0xff8040)
      );
      mesh.position.set(x, y + 0.4, z);
      scene.add(mesh);
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * impact * 0.4;
      particles.push({
        mesh: mesh,
        vx: Math.cos(a) * s,
        vy: 2 + Math.random() * 6,
        vz: Math.sin(a) * s,
        life: 0.3 + Math.random() * 0.5,
      });
    }
    if (impact > 8) spawnCrashSmoke(x, y, z, impact);
  }

  function spawnDebrisChunk(x, y, z, opts) {
    opts = opts || {};
    if (debris.length > 180) {
      const old = debris.shift();
      if (old && old.mesh) scene.remove(old.mesh);
    }
    const color = opts.color != null ? opts.color : 0x777777;
    const sx = opts.sx != null ? opts.sx : 0.18 + Math.random() * 0.42;
    const sy = opts.sy != null ? opts.sy : 0.06 + Math.random() * 0.22;
    const sz = opts.sz != null ? opts.sz : 0.18 + Math.random() * 0.38;
    let mesh = opts.mesh || null;
    if (!mesh) {
      const geo = opts.glass
        ? new THREE.TetrahedronGeometry(0.12 + Math.random() * 0.14, 0)
        : new THREE.BoxGeometry(sx, sy, sz);
      mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: color,
          metalness: opts.metal != null ? opts.metal : opts.glass ? 0.1 : 0.55,
          roughness: opts.rough != null ? opts.rough : opts.glass ? 0.15 : 0.45,
          transparent: !!opts.glass,
          opacity: opts.glass ? 0.55 : 1,
        })
      );
      mesh.position.set(x, y, z);
      scene.add(mesh);
    }
    const a = opts.angle != null ? opts.angle : Math.random() * Math.PI * 2;
    const speed = opts.speed != null ? opts.speed : 4 + Math.random() * 7;
    debris.push({
      mesh: mesh,
      vx: Math.cos(a) * speed + (opts.vx || 0),
      vy: opts.vy != null ? opts.vy : 2.5 + Math.random() * 6,
      vz: Math.sin(a) * speed + (opts.vz || 0),
      avx: (Math.random() - 0.5) * 14,
      avy: (Math.random() - 0.5) * 14,
      avz: (Math.random() - 0.5) * 14,
      life: opts.life != null ? opts.life : 2.4 + Math.random() * 2.6,
      bounce: opts.bounce != null ? opts.bounce : 0.42,
      friction: opts.friction != null ? opts.friction : 0.9,
      mass: opts.mass != null ? opts.mass : 1,
    });
  }

  function spawnDestruction(x, y, z, impact, paintColor, vel) {
    vel = vel || {};
    spawnCrashFX(x, y, z, impact);
    const n = Math.min(20, 3 + Math.floor(impact * 0.65));
    const paint = paintColor != null ? paintColor : (car.spec && car.spec.color) || 0x888888;
    for (let i = 0; i < n; i++) {
      const roll = Math.random();
      const glass = roll > 0.82;
      const col = glass ? 0xa8c8e0 : roll > 0.5 ? paint : roll > 0.28 ? 0x2a2a2e : 0xb0b8c0;
      spawnDebrisChunk(x + (Math.random() - 0.5) * 0.9, y + Math.random() * 0.7, z + (Math.random() - 0.5) * 0.9, {
        color: col,
        glass: glass,
        metal: glass ? 0.05 : col === 0xb0b8c0 ? 0.92 : 0.45,
        speed: 2.8 + impact * (0.28 + Math.random() * 0.4),
        vx: (vel.vx || 0) * 0.25,
        vz: (vel.vz || 0) * 0.25,
        life: 2.2 + Math.random() * 2.8,
        bounce: glass ? 0.15 : 0.4,
      });
    }
  }

  function spawnBodyPanel(x, y, z, paint, nx, nz, impact, kind) {
    const accent = (car.spec && car.spec.accent) || 0x222222;
    let sx = 0.55 + Math.random() * 0.55;
    let sy = 0.06 + Math.random() * 0.08;
    let sz = 0.7 + Math.random() * 0.9;
    let col = paint;
    let metal = 0.62;
    let rough = 0.32;
    let glass = false;
    if (kind === "bumper") {
      sx = 1.1 + Math.random() * 0.5;
      sy = 0.18;
      sz = 0.28;
      col = Math.random() > 0.4 ? paint : 0x1a1a1e;
    } else if (kind === "mirror") {
      sx = 0.22;
      sy = 0.14;
      sz = 0.28;
    } else if (kind === "hood") {
      sx = 0.9 + Math.random() * 0.4;
      sy = 0.05;
      sz = 1.0 + Math.random() * 0.4;
    } else if (kind === "door") {
      sx = 0.12;
      sy = 0.55 + Math.random() * 0.25;
      sz = 0.85 + Math.random() * 0.35;
    } else if (kind === "fender") {
      sx = 0.45 + Math.random() * 0.35;
      sy = 0.35 + Math.random() * 0.2;
      sz = 0.55 + Math.random() * 0.3;
    } else if (kind === "spoiler") {
      sx = 1.0 + Math.random() * 0.4;
      sy = 0.08;
      sz = 0.28;
      col = Math.random() > 0.5 ? paint : 0x111114;
    } else if (kind === "grille") {
      sx = 0.7;
      sy = 0.28;
      sz = 0.1;
      col = 0x1c1c20;
      metal = 0.75;
    } else if (kind === "exhaust") {
      sx = 0.12;
      sy = 0.12;
      sz = 0.45;
      col = 0xb8bcc0;
      metal = 0.95;
      rough = 0.2;
    } else if (kind === "wheel") {
      sx = 0.55;
      sy = 0.22;
      sz = 0.55;
      col = 0x1a1a1a;
      metal = 0.35;
      rough = 0.7;
    } else if (kind === "glass") {
      sx = 0.5 + Math.random() * 0.4;
      sy = 0.04;
      sz = 0.45 + Math.random() * 0.35;
      col = 0xa8c8e0;
      metal = 0.08;
      rough = 0.12;
      glass = true;
    } else if (kind === "light") {
      sx = 0.35;
      sy = 0.12;
      sz = 0.18;
      col = Math.random() > 0.5 ? 0xffe8a0 : 0xff3030;
      metal = 0.2;
      rough = 0.25;
    } else if (kind === "trim") {
      col = accent;
      metal = 0.85;
      rough = 0.25;
      sx = 0.4;
      sy = 0.05;
      sz = 0.55;
    } else if (kind === "bolt") {
      sx = 0.08;
      sy = 0.08;
      sz = 0.08;
      col = 0x9aa0a8;
      metal = 0.95;
      rough = 0.3;
    }
    const mesh = new THREE.Mesh(
      glass
        ? new THREE.BoxGeometry(sx, sy, sz)
        : kind === "wheel"
          ? new THREE.CylinderGeometry(sx * 0.45, sx * 0.45, sy, 10)
          : new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshStandardMaterial({
        color: col,
        metalness: metal,
        roughness: rough,
        transparent: glass,
        opacity: glass ? 0.45 : 1,
      })
    );
    if (kind === "wheel") mesh.rotation.z = Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    const fling = 5.5 + impact * 0.7 + Math.random() * 6;
    const side = (Math.random() - 0.5) * 8;
    spawnDebrisChunk(x, y, z, {
      mesh: mesh,
      speed: fling,
      angle: Math.atan2(-(nx || 0) + side * 0.15, -(nz || 0) + (Math.random() - 0.5) * 0.5),
      vx: (car.vx || 0) * 0.45 + (nx || 0) * (2.5 + impact * 0.35),
      vz: (car.vz || 0) * 0.45 + (nz || 0) * (2.5 + impact * 0.35),
      vy: 3.8 + Math.random() * 6 + impact * 0.18,
      bounce: glass ? 0.12 : kind === "wheel" ? 0.55 : 0.3,
      friction: 0.86,
      life: 3.8 + Math.random() * 3.5,
      mass: kind === "wheel" ? 2.2 : 1.4,
    });
  }

  function shearCarParts(impact, nx, nz) {
    if (carInvincible()) return;
    if (!carMesh || impact < 5.5) return;
    if (car.partsLost == null) car.partsLost = 0;
    if (car.partsLost >= 28) return;

    const paint = (car.spec && car.spec.color) || 0x888888;
    const want = Math.min(10, 2 + Math.floor((impact - 5) * 0.55));
    let sheared = 0;

    // Try to rip real mesh chunks off the car (impact-side first)
    const candidates = [];
    carMesh.updateMatrixWorld(true);
    carMesh.traverse(function (ch) {
      if (!ch.isMesh || !ch.visible || ch.userData.sheared) return;
      if (ch.userData.isShadow || ch.userData.groundShadow) return;
      if (!ch.geometry) return;
      if (!ch.geometry.boundingSphere) ch.geometry.computeBoundingSphere();
      const r = (ch.geometry.boundingSphere && ch.geometry.boundingSphere.radius) || 0;
      if (r < 0.05 || r > 4.2) return;
      const wp = new THREE.Vector3();
      ch.getWorldPosition(wp);
      const local = new THREE.Vector3();
      carMesh.worldToLocal(local.copy(wp));
      const side = local.x * (nx || 0) + local.z * (nz || 0);
      candidates.push({ mesh: ch, score: side + Math.random() * 0.55, wp: wp, r: r });
    });
    candidates.sort(function (a, b) { return b.score - a.score; });

    for (let i = 0; i < candidates.length && sheared < want; i++) {
      const c = candidates[i];
      if (impact < 9 && c.score < -0.15 && sheared > 1) continue;
      const clone = c.mesh.clone();
      if (clone.material) {
        if (Array.isArray(clone.material)) {
          clone.material = clone.material.map(function (m) { return m.clone(); });
        } else {
          clone.material = clone.material.clone();
        }
      }
      clone.position.copy(c.wp);
      clone.quaternion.copy(c.mesh.getWorldQuaternion(new THREE.Quaternion()));
      clone.scale.copy(c.mesh.getWorldScale(new THREE.Vector3()));
      scene.add(clone);
      c.mesh.visible = false;
      c.mesh.userData.sheared = true;
      const fling = 6 + impact * 0.65 + Math.random() * 5;
      spawnDebrisChunk(c.wp.x, c.wp.y, c.wp.z, {
        mesh: clone,
        speed: fling,
        angle: Math.atan2(-(nx || 0) + (Math.random() - 0.5), -(nz || 0) + (Math.random() - 0.5)),
        vx: (car.vx || 0) * 0.5 + (nx || 0) * (3 + impact * 0.35),
        vz: (car.vz || 0) * 0.5 + (nz || 0) * (3 + impact * 0.35),
        vy: 4 + Math.random() * 6.5,
        bounce: 0.24,
        friction: 0.84,
        life: 4.5 + Math.random() * 3.5,
        mass: 1.8,
      });
      sheared++;
      car.partsLost++;
    }

    // Pop a wheel off on hard side hits
    if (impact >= 11 && carMesh.userData.wheels && carMesh.userData.wheels.length) {
      const wheels = carMesh.userData.wheels;
      for (let wi = 0; wi < wheels.length; wi++) {
        const w = wheels[wi];
        if (!w || !w.pivot || w.sheared) continue;
        const sideDot = (w.localX || 0) * (nx || 0) + (w.localZ || 0) * (nz || 0);
        if (sideDot < 0.05 && Math.random() > 0.35) continue;
        w.sheared = true;
        if (w.pivot.visible !== undefined) w.pivot.visible = false;
        const wp = new THREE.Vector3();
        w.pivot.getWorldPosition(wp);
        spawnBodyPanel(wp.x, wp.y, wp.z, paint, nx, nz, impact, "wheel");
        car.wheelDamage = Math.min(1, (car.wheelDamage || 0) + 0.35);
        car.partsLost++;
        break;
      }
    }

    // Always fling painted body panels / glass / trim so every hard crash sheds metal
    const kinds = [
      "door", "bumper", "hood", "mirror", "light", "trim", "panel",
      "fender", "spoiler", "grille", "exhaust", "glass", "bolt", "bolt",
    ];
    const panelN = Math.min(14, 4 + Math.floor((impact - 5) * 0.75));
    for (let i = 0; i < panelN; i++) {
      const ox = (nx || 0) * (0.5 + Math.random() * 1.1) + (Math.random() - 0.5) * 1.6;
      const oz = (nz || 0) * (0.5 + Math.random() * 1.1) + (Math.random() - 0.5) * 1.6;
      spawnBodyPanel(
        car.x + ox,
        car.y + 0.4 + Math.random() * 0.95,
        car.z + oz,
        paint,
        nx,
        nz,
        impact,
        kinds[(i + Math.floor(Math.random() * 4)) % kinds.length]
      );
    }

    // Extra scrap shards / bolts for denser showers
    const scrapN = Math.min(16, 3 + Math.floor(impact * 0.55));
    for (let i = 0; i < scrapN; i++) {
      spawnDebrisChunk(
        car.x + (Math.random() - 0.5) * 2.2,
        car.y + 0.3 + Math.random() * 1.1,
        car.z + (Math.random() - 0.5) * 2.2,
        {
          color: Math.random() > 0.55 ? paint : Math.random() > 0.5 ? 0x2a2a2e : 0xb0b8c0,
          glass: Math.random() > 0.88,
          speed: 3.5 + impact * 0.45 + Math.random() * 5,
          vx: (car.vx || 0) * 0.3 + (nx || 0) * 2,
          vz: (car.vz || 0) * 0.3 + (nz || 0) * 2,
          vy: 2.5 + Math.random() * 7,
          life: 2.5 + Math.random() * 2.5,
        }
      );
    }
  }

  function deformCarFromHit(impact, nx, nz) {
    if (carInvincible()) return;
    if (!carMesh || impact < 5) return;
    const amount = Math.min(0.65, (impact - 4) * 0.028);
    car.dent = Math.min(1, car.dent + amount);
    const push = amount * (0.1 + Math.random() * 0.16);
    carMesh.traverse(function (ch) {
      if (!ch.isMesh || ch.userData.sheared) return;
      if (!ch.userData._basePos) {
        ch.userData._basePos = ch.position.clone();
        ch.userData._baseScale = ch.scale.clone();
        ch.userData._baseRot = ch.rotation.clone();
      }
      // Bias crumple toward impact side
      const side = (ch.userData._basePos.x || 0) * nx + (ch.userData._basePos.z || 0) * nz;
      const bias = side > 0 ? 1.35 : 0.55;
      ch.position.x = ch.userData._basePos.x - nx * push * bias * (0.45 + Math.random());
      ch.position.z = ch.userData._basePos.z - nz * push * bias * (0.45 + Math.random());
      ch.position.y = ch.userData._basePos.y - Math.random() * amount * 0.1;
      const squash = 1 - amount * (0.05 + Math.random() * 0.12) * bias;
      ch.scale.set(
        ch.userData._baseScale.x * (squash + (Math.random() - 0.5) * 0.08),
        ch.userData._baseScale.y * squash,
        ch.userData._baseScale.z * (squash + (Math.random() - 0.5) * 0.08)
      );
      ch.rotation.z = ch.userData._baseRot.z + (Math.random() - 0.5) * amount * 0.45 * bias;
      ch.rotation.x = ch.userData._baseRot.x + (Math.random() - 0.5) * amount * 0.28 * bias;
    });
    if (impact >= 6.5) shearCarParts(impact, nx, nz);
  }

  function resetCarDeform() {
    car.dent = 0;
    car.wreckPose = false;
    car.crashStun = 0;
    car.wheelDamage = 0;
    car.crashCooldown = 0;
    car.pullSteer = 0;
    car.scrapeTimer = 0;
    car.bounceLock = 0;
    car.lastImpact = 0;
    car.slideGrip = 1;
    car.tipTimer = 0;
    car.flipped = false;
    car.partsLost = 0;
    impactSlow = 0;
    camKickX = camKickY = camKickZ = 0;
    impactFlash = 0;
    if (!carMesh) return;
    carMesh.visible = true;
    carMesh.traverse(function (ch) {
      if (!ch.isMesh) return;
      if (ch.userData.sheared) {
        ch.visible = true;
        ch.userData.sheared = false;
      }
      if (!ch.userData._basePos) return;
      ch.position.copy(ch.userData._basePos);
      ch.scale.copy(ch.userData._baseScale);
      if (ch.userData._baseRot) {
        ch.rotation.copy(ch.userData._baseRot);
      }
    });
    if (carMesh.userData.wheels) {
      carMesh.userData.wheels.forEach(function (w) {
        if (!w) return;
        w.sheared = false;
        if (w.pivot) w.pivot.visible = true;
      });
    }
  }

  function breakSolid(solid, impact, nx, nz) {
    if (!solid || solid.broken || !solid.breakable) return false;
    solid.hp = (solid.hp || 20) - impact * 1.45;
    if (solid.hp > 0) return false;
    solid.broken = true;
    solid.r = 0;
    const paint = solid.color != null ? solid.color : solid.type === "tree" ? 0x3d6a32 : solid.type === "parked" ? 0x888888 : 0x8a8a8a;
    const wood = solid.type === "tree";
    spawnDestruction(solid.x, 1.2, solid.z, Math.min(22, impact), paint, {
      vx: -nx * impact * 0.45,
      vz: -nz * impact * 0.45,
    });
    spawnSparks(solid.x, 1, solid.z, nx, nz, impact);
    const chunks = wood ? 12 : 9;
    for (let i = 0; i < chunks; i++) {
      spawnDebrisChunk(solid.x, 0.8 + Math.random(), solid.z, {
        color: wood ? (Math.random() > 0.4 ? 0x5e4028 : 0x2f7a38) : paint,
        metal: wood ? 0.05 : 0.5,
        rough: wood ? 0.9 : 0.5,
        sx: wood ? 0.15 + Math.random() * 0.35 : 0.2 + Math.random() * 0.5,
        sy: wood ? 0.4 + Math.random() * 0.9 : 0.1 + Math.random() * 0.25,
        sz: wood ? 0.15 + Math.random() * 0.35 : 0.2 + Math.random() * 0.5,
        speed: 3.2 + impact * 0.35 * Math.random(),
        vx: -nx * 2.4,
        vz: -nz * 2.4,
        life: 3.2 + Math.random() * 2.2,
      });
    }
    if (solid.mesh) {
      const m = solid.mesh;
      const wp = new THREE.Vector3();
      m.getWorldPosition(wp);
      if (m.parent) m.parent.remove(m);
      scene.add(m);
      m.position.copy(wp);
      spawnDebrisChunk(wp.x, wp.y, wp.z, {
        mesh: m,
        speed: 2.2 + impact * 0.18,
        angle: Math.atan2(-nx, -nz) + (Math.random() - 0.5),
        vy: 3.2 + Math.random() * 4.5,
        vx: -nx * impact * 0.3,
        vz: -nz * impact * 0.3,
        bounce: 0.2,
        life: 4.5,
        mass: 2.5,
        friction: 0.86,
      });
      solid.mesh = null;
    }
    if (solid.type === "parked" || solid.type === "tree") {
      const scrap = Math.floor(8 + impact * 0.85);
      save.cash += scrap;
      showMsg((solid.type === "tree" ? "Timber" : "Smashed") + " +$" + scrap);
      persist();
      updateCashUI();
    }
    return true;
  }

  function wreckNpc(n, impact) {
    if (!n || n.wrecked) return;
    n.wrecked = true;
    n.speed = 0;
    n.knocked = 0;
    // Keep sliding / spinning wreck momentum
    n.vx = (n.vx || 0) * 0.25 + car.vx * 0.35 + (Math.random() - 0.5) * 6;
    n.vz = (n.vz || 0) * 0.25 + car.vz * 0.35 + (Math.random() - 0.5) * 6;
    n.spin = (Math.random() > 0.5 ? 1 : -1) * (2.2 + Math.min(5, impact * 0.22));
    n.tumble = 1.2 + Math.random() * 1.0;
    n.health = 0;
    n.respawnIn = n.chase ? 6 + Math.random() * 5 : 14 + Math.random() * 8;
    spawnDestruction(n.x, 1, n.z, Math.max(14, Math.min(28, impact)), 0x7a8088, { vx: n.vx, vz: n.vz });
    spawnSparks(n.x, 0.8, n.z, Math.sin(car.angle), Math.cos(car.angle), Math.max(impact, 12));
    spawnGlassBurst(n.x, 1.1, n.z, Math.sin(n.angle || 0), Math.cos(n.angle || 0), Math.max(10, impact));
    // Extra fireball burst so kamikaze hits read as explosions
    for (let i = 0; i < 3; i++) {
      spawnCrashFX(
        n.x + (Math.random() - 0.5) * 1.2,
        0.6 + Math.random() * 0.8,
        n.z + (Math.random() - 0.5) * 1.2,
        10 + impact * 0.4
      );
    }
    if (n.mesh) {
      n.mesh.visible = false;
      n.mesh.rotation.z = (Math.random() > 0.5 ? 1 : -1) * (0.55 + Math.random() * 0.55);
      n.mesh.rotation.x = 0.25 + Math.random() * 0.5;
    }
  }

  function spawnGlassBurst(x, y, z, nx, nz, impact) {
    const n = Math.min(14, 3 + Math.floor(impact * 0.45));
    for (let i = 0; i < n; i++) {
      spawnDebrisChunk(x + (Math.random() - 0.5) * 0.5, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.5, {
        glass: true,
        color: 0xb8d4ec,
        speed: 3.5 + impact * 0.35 * Math.random(),
        vx: (nx || 0) * 2 + (Math.random() - 0.5) * 4,
        vz: (nz || 0) * 2 + (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 5,
        bounce: 0.12,
        life: 1.6 + Math.random() * 1.2,
      });
    }
  }

  function punchCamera(nx, nz, impact) {
    const p = Math.min(2.8, 0.35 + impact * 0.09);
    camKickX += -(nx || 0) * p;
    camKickZ += -(nz || 0) * p;
    camKickY += Math.min(1.4, impact * 0.04);
    shake = Math.min(2.8, Math.max(shake, impact * 0.09));
  }

  function triggerImpactFlash(impact) {
    impactFlash = Math.max(impactFlash, Math.min(0.22, 0.06 + impact * 0.008));
    if (elFlash) {
      elFlash.classList.add("on");
      elFlash.style.opacity = String(Math.min(0.85, 0.25 + impact * 0.03));
    }
  }

    function applyCrashDamage(impact, mult, nx, nz) {
    if (carInvincible()) {
      car.health = 100;
      return;
    }
    if (car.crashCooldown > 0 && impact < car.lastImpact * 0.78 && mult < 1.5) return;
    const armor = Math.max(0.45, car.spec.armor || 1);
    // Soft crumple: high-speed hits dump more energy into deformation than pure HP
    const crumple = 1 + Math.min(0.55, Math.max(0, impact - 10) * 0.035);
    const dmg = ((impact - 4.8) * 2.15 * crumple * (mult || 1)) / armor;
    car.health = Math.max(0, car.health - Math.max(0, dmg));
    car.lastImpact = impact;
    car.crashCooldown = Math.max(car.crashCooldown, 0.14 + Math.min(0.42, impact * 0.014));
    updateDamageUI();
    if (impact > 8) {
      car.crashStun = Math.max(car.crashStun, Math.min(1.05, (impact - 7) * 0.048));
      car.wheelDamage = Math.min(0.72, car.wheelDamage + (impact - 7) * 0.016);
      // Asymmetric pull after hard hits (bias toward impact side)
      car.pullSteer = THREE.MathUtils.clamp(
        (car.pullSteer || 0) + (-(nx || 0) * 0.35 + (Math.random() - 0.5) * 0.2) * Math.min(1, impact * 0.06),
        -0.55,
        0.55
      );
    }
    if (dmg > 1.0 && impact > 5.5) {
      deformCarFromHit(impact, nx || 0, nz || 0);
    }
    // Body whip from impact normal
    car.pitch += (nz || 0) * impact * 0.018;
    car.roll += -(nx || 0) * impact * 0.022;
    car.pitch = THREE.MathUtils.clamp(car.pitch, -1.15, 1.15);
    car.roll = THREE.MathUtils.clamp(car.roll, -1.2, 1.2);
    if (car.health <= 0) totalCar();
  }

  function registerImpact(impact, nx, nz, hitType, opts) {
    opts = opts || {};
    if (impact < 1.4) return;
    // Energy scale — high-speed hits feel dramatically heavier
    const energy = impact + impact * impact * 0.045;
    const tangential = opts.tangential || 0;
    const glancing = opts.glancing || (tangential > impact * 1.15);
    const scrape = opts.scrape || (tangential > 5.5 && impact < 5.5);
    const heavy = energy > 7.5 && !scrape;
    const catastrophic = energy > 18;

    if (scrape) {
      if (car.scrapeTimer <= 0) {
        spawnSparks(car.x, car.y + 0.4, car.z, nx, nz, Math.min(12, 3 + tangential * 0.4));
        playCrashSound(Math.min(9, 3 + tangential * 0.22));
        car.scrapeTimer = 0.06;
        if (!carInvincible()) {
          car.health = Math.max(0, car.health - (0.2 + tangential * 0.05) / Math.max(0.5, car.spec.armor));
          updateDamageUI();
          if (car.health <= 0) totalCar();
        }
      }
      shake = Math.min(0.7, shake + tangential * 0.018);
      return;
    }

    if (heavy) {
      const mult = opts.explosion
        ? 1.65
        : hitType === "water"
          ? 1.55
          : hitType === "explosion"
            ? 1.65
            : hitType === "npc"
              ? 0.85
              : hitType === "tree"
                ? 1.0
                : 1.1;
      applyCrashDamage(energy * (glancing ? 0.7 : 1) * (opts.explosion ? 1.15 : 1), mult, nx, nz);
      if (!carInvincible()) {
        spawnDestruction(car.x, car.y + 1, car.z, Math.min(28, energy), car.spec.color, { vx: car.vx, vz: car.vz });
        if (energy > 6.5) shearCarParts(energy, nx, nz);
        if (energy > 9) spawnGlassBurst(car.x, car.y + 0.9, car.z, nx, nz, energy);
        if (energy > 12) spawnCrashSmoke(car.x, car.y + 0.7, car.z, energy * 0.7);
      }
      spawnSparks(car.x, car.y + 0.6, car.z, nx, nz, energy);
      playCrashSound(Math.min(30, energy));
      punchCamera(nx, nz, energy);
      triggerImpactFlash(energy);
      impactSlow = Math.max(impactSlow, Math.min(0.18, 0.055 + energy * 0.005));
      car.slideGrip = Math.min(car.slideGrip, Math.max(0.15, 0.9 - energy * 0.04));
      // Side hits tip — extreme ones flip
      if (!carInvincible() && Math.abs(nx) > Math.abs(nz) * 0.85 && energy > 8) {
        car.roll += -Math.sign(nx || 1) * Math.min(1.25, energy * 0.055);
        car.tipTimer = Math.max(car.tipTimer, 0.7 + energy * 0.025);
        if (energy > 16 && Math.abs(car.roll) > 0.7) {
          car.flipped = true;
          car.roll = Math.sign(car.roll || -nx || 1) * Math.PI * 0.92;
          car.vy = Math.max(car.vy, 4);
          car.grounded = false;
          car.crashStun = Math.max(car.crashStun, 1.2);
        }
      }
      if (car.grounded && energy > 6) {
        spawnSkid(car.x, car.z, car.angle + (Math.random() - 0.5) * 0.5);
        spawnSkid(car.x + nx * 0.7, car.z + nz * 0.7, car.angle);
        spawnSkid(car.x - nx * 0.5, car.z - nz * 0.5, car.angle + 0.6);
        spawnDust(car.x, car.z, Math.min(5, 1 + Math.floor(energy / 5)));
      }
    } else if (impact > 2.2) {
      spawnSparks(car.x, car.y + 0.45, car.z, nx, nz, impact * 0.65);
      if (impact > 3.8) deformCarFromHit(impact, nx, nz);
      if (car.crashCooldown <= 0 && !carInvincible()) {
        car.health = Math.max(0, car.health - (impact * (glancing ? 0.18 : 0.32)) / Math.max(0.5, car.spec.armor));
        car.crashCooldown = 0.08;
        updateDamageUI();
        if (car.health <= 0) totalCar();
      }
      if (impact > 3.2) playCrashSound(impact * 0.85);
      punchCamera(nx, nz, impact * 0.55);
      car.pitch += (nz || 0) * impact * 0.014;
      car.roll += -(nx || 0) * impact * 0.016;
    }

    if (catastrophic) {
      const scrap = Math.floor(energy * 1.6);
      save.cash += scrap;
      showMsg("Scrap +$" + scrap);
      persist();
      updateCashUI();
      spawnCrashSmoke(car.x, car.y + 0.8, car.z, energy);
      spawnGlassBurst(car.x, car.y + 1, car.z, nx, nz, energy * 1.3);
      triggerImpactFlash(energy * 1.2);
    }
  }

  function totalCar() {
    if (carInvincible()) {
      car.health = 100;
      return;
    }
    playing = false;
    car.wreckPose = true;
    playCrashSound(28);
    spawnDestruction(car.x, car.y + 1, car.z, 26, car.spec.color, { vx: car.vx, vz: car.vz });
    spawnSparks(car.x, car.y + 0.8, car.z, Math.sin(car.angle), Math.cos(car.angle), 22);
    spawnCrashSmoke(car.x, car.y + 1, car.z, 24);
    car.partsLost = 0;
    shearCarParts(28, Math.sin(car.angle), Math.cos(car.angle));
    car.partsLost = 0;
    shearCarParts(32, -Math.sin(car.angle), -Math.cos(car.angle));
    for (let i = 0; i < 10; i++) {
      spawnDebrisChunk(car.x, car.y + 0.7, car.z, {
        color: i % 3 === 0 ? 0x222226 : car.spec.color,
        sx: 0.35 + Math.random() * 0.55,
        sy: 0.05 + Math.random() * 0.12,
        sz: 0.4 + Math.random() * 0.7,
        metal: 0.7,
        speed: 5.5 + Math.random() * 9,
        vy: 4 + Math.random() * 5.5,
        vx: car.vx * 0.35,
        vz: car.vz * 0.35,
        life: 3.8,
      });
    }
    if (carMesh) {
      carMesh.visible = true;
      carMesh.rotation.z += (Math.random() > 0.5 ? 1 : -1) * (0.75 + Math.random() * 0.55);
      carMesh.rotation.x += 0.35 + Math.random() * 0.4;
      deformCarFromHit(30, Math.sin(car.angle), Math.cos(car.angle));
    }
    panelTitle.hidden = true;
    panelGarage.hidden = true;
    panelWrecked.hidden = false;
    overlay.hidden = false;
  }

  function resolveCollisions(dt) {
    if (car.crashCooldown > 0) car.crashCooldown = Math.max(0, car.crashCooldown - dt);
    if (car.crashStun > 0) car.crashStun = Math.max(0, car.crashStun - dt);
    if (car.scrapeTimer > 0) car.scrapeTimer = Math.max(0, car.scrapeTimer - dt);
    if (car.bounceLock > 0) car.bounceLock = Math.max(0, car.bounceLock - dt);
    if (car.pullSteer) car.pullSteer *= Math.pow(0.55, dt);

    const hw = car.spec.width * 0.5;
    const hl = car.spec.length * 0.5;
    const mass = Math.max(0.65, car.spec.mass || 1);
    const c = Math.cos(car.angle);
    const s = Math.sin(car.angle);
    const corners = [
      { x: hw, z: hl, ox: hw, oz: hl },
      { x: -hw, z: hl, ox: -hw, oz: hl },
      { x: hw, z: -hl, ox: hw, oz: -hl },
      { x: -hw, z: -hl, ox: -hw, oz: -hl },
      // Edge midpoints catch wall clips the corners miss
      { x: 0, z: hl, ox: 0, oz: hl },
      { x: 0, z: -hl, ox: 0, oz: -hl },
      { x: hw, z: 0, ox: hw, oz: 0 },
      { x: -hw, z: 0, ox: -hw, oz: 0 },
    ].map((p) => ({
      x: car.x + p.x * c + p.z * s,
      z: car.z + -p.x * s + p.z * c,
      ox: p.ox,
      oz: p.oz,
    }));

    let hit = false;
    let nx = 0;
    let nz = 0;
    let count = 0;
    let hitType = "building";
    let hitRestitution = 0.38;
    let contactOx = 0;
    let contactOz = 0;
    let softHit = false;
    let didRam = false;

    for (const p of corners) {
      const surf = surfaceAt(p.x, p.z);
      if (surf === T.BUILDING || surf === T.WATER) {
        const tileX = Math.floor(p.x / TILE) * TILE;
        const tileZ = Math.floor(p.z / TILE) * TILE;
        // Penetration depth to each edge → pick shallowest exit (true AABB response)
        const penL = p.x - tileX;
        const penR = tileX + TILE - p.x;
        const penT = p.z - tileZ;
        const penB = tileZ + TILE - p.z;
        const minPen = Math.min(penL, penR, penT, penB);
        let ex = 0;
        let ez = 0;
        if (minPen === penL) { ex = -1; car.x -= penL + 0.08; }
        else if (minPen === penR) { ex = 1; car.x += penR + 0.08; }
        else if (minPen === penT) { ez = -1; car.z -= penT + 0.08; }
        else { ez = 1; car.z += penB + 0.08; }
        nx += ex;
        nz += ez;
        contactOx += p.ox;
        contactOz += p.oz;
        count++;
        hit = true;
        hitType = surf === T.WATER ? "water" : "building";
        hitRestitution = surf === T.WATER ? 0.05 : 0.24;
      }
    }

    for (const solid of solids) {
      if (solid.broken) continue;
      if (solid.type === "building" || solid.type === "water") continue;
      const dx = car.x - solid.x;
      const dz = car.z - solid.z;
      const dist = Math.hypot(dx, dz);
      const min = solid.r + Math.max(hw, hl) * 0.55;
      if (dist < min && solid.r > 0.05) {
        const len = dist || 1;
        const ux = dx / len;
        const uz = dz / len;
        const overlap = min - dist;
        const give = solid.type === "tree" ? 0.55 : solid.type === "parked" ? 0.75 : 0.9;
        car.x += ux * overlap * give;
        car.z += uz * overlap * give;
        nx += ux;
        nz += uz;
        contactOx += ux * hw;
        contactOz += uz * hl;
        count++;
        hit = true;
        hitType = solid.type;
        hitRestitution = solid.type === "tree" ? 0.18 : solid.type === "parked" ? 0.48 : solid.type === "rock" ? 0.25 : 0.34;
        softHit = solid.type === "parked" || solid.type === "tree";
        if (solid.breakable) {
          const into = Math.max(0, -(car.vx * ux + car.vz * uz));
          const smash = Math.hypot(car.vx, car.vz);
          if (solid.type === "parked" && smash > 5) {
            car.vx *= 0.88;
            car.vz *= 0.88;
          }
          if (smash > 8 || into > 6) {
            breakSolid(solid, Math.max(smash, into), ux, uz);
            hitRestitution *= 0.45;
          }
        }
      }
    }

    for (const n of npcs) {
      if (n.wrecked) continue;
      const dx = car.x - n.x;
      const dz = car.z - n.z;
      const dist = Math.hypot(dx, dz);
      const min = (car.spec.width + n.w) * 0.92;
      if (dist < min) {
        const len = dist || 1;
        const ux = dx / len;
        const uz = dz / len;
        const overlap = min - dist;

        const fwdX = Math.sin(car.angle);
        const fwdZ = Math.cos(car.angle);
        const toNpcX = -ux;
        const toNpcZ = -uz;
        const speed = Math.hypot(car.vx, car.vz);
        const npcSpeed = Math.hypot(n.vx || 0, n.vz || 0);
        const closing = -(car.vx * ux + car.vz * uz); // >0 when driving into them
        const theyClosing = (n.vx || 0) * ux + (n.vz || 0) * uz; // >0 when they drive into you
        const noseAlign = fwdX * toNpcX + fwdZ * toNpcZ;
        const velAlign = speed > 0.5 ? (car.vx * toNpcX + car.vz * toNpcZ) / speed : 0;
        // They slam into you → boom
        const theyHitMe = theyClosing > 1.8 && npcSpeed > 3.2;
        // You ram them (bullbar / nose / velocity)
        const ramHit = !theyHitMe && speed > 2 && (closing > 1.2 || noseAlign > 0.05 || velAlign > 0.2);
        const hardRam = ramHit && speed > 5 && (closing > 3 || noseAlign > 0.15 || velAlign > 0.4);

        if (theyHitMe) {
          // Separate a bit so you don't stick in the fireball
          car.x += ux * overlap * 0.7;
          car.z += uz * overlap * 0.7;
          car.vx += ux * Math.min(6, theyClosing * 0.3);
          car.vz += uz * Math.min(6, theyClosing * 0.3);
          car.bounceLock = Math.max(car.bounceLock || 0, 0.12);
          const boom = Math.max(npcSpeed, theyClosing) * 1.6;
          wreckNpc(n, boom);
          spawnSparks(n.x, 0.7, n.z, ux, uz, Math.min(28, 10 + boom));
          if (Math.random() < 0.55) showMsg("BOOM!");
          // Spectacle only — their explosion does not damage you
          punchCamera(-ux, -uz, Math.min(8, boom * 0.25));
          softHit = true;
          hitType = "npc";
          hitRestitution = 0.08;
        } else if (ramHit) {
          didRam = true;
          // Separate mostly by shoving the other car away
          car.x += ux * overlap * 0.08;
          car.z += uz * overlap * 0.08;
          n.x -= ux * overlap * 1.5;
          n.z -= uz * overlap * 1.5;

          const shove = 14 + speed * 1.75 + Math.max(0, closing) * 0.8;
          n.vx = toNpcX * shove + car.vx * 1.05;
          n.vz = toNpcZ * shove + car.vz * 1.05;
          n.speed = Math.hypot(n.vx, n.vz);
          n.angle = Math.atan2(n.vx, n.vz);
          n.spin = (Math.random() > 0.5 ? 1 : -1) * (3.5 + speed * 0.35);
          n.knocked = hardRam ? 2.8 + Math.min(3.2, speed * 0.12) : 1.6 + Math.min(2, speed * 0.08);
          n.panic = 1.2;
          // You keep most forward speed — plow through
          car.vx = car.vx * 0.98 + fwdX * speed * 0.06;
          car.vz = car.vz * 0.98 + fwdZ * speed * 0.06;
          car.bounceLock = Math.max(car.bounceLock || 0, 0.22);

          n.health = (n.health != null ? n.health : 45) - speed * (hardRam ? 2.4 : 1.2);
          if (n.health <= 0 || (hardRam && speed > 14)) {
            wreckNpc(n, speed * 1.4);
          }
          if (hardRam || speed > 7) showMsg("RAM!");
          spawnSparks(n.x, 0.5, n.z, toNpcX, toNpcZ, Math.min(20, 6 + speed * 0.5));
          registerImpact(Math.max(speed * 0.45, closing), toNpcX, toNpcZ, "npc", { glancing: false });

          hitType = "npc";
          hitRestitution = 0.02;
          softHit = true;
          // Don't feed wall-bounce normals for a clear ram
        } else {
          car.x += ux * overlap * 0.55;
          car.z += uz * overlap * 0.55;
          n.x -= ux * overlap * 0.45;
          n.z -= uz * overlap * 0.45;

          const nMass = 1.05 + (n.w || 1.8) * 0.08;
          const rvx = car.vx - (n.vx || 0);
          const rvz = car.vz - (n.vz || 0);
          const relN = rvx * ux + rvz * uz;
          if (relN < 0) {
            const speedRel = Math.hypot(rvx, rvz);
            const e = THREE.MathUtils.clamp(0.55 - speedRel * 0.012, 0.12, 0.55);
            const j = (-(1 + e) * relN) / (1 / mass + 1 / nMass);
            car.vx += (j * ux) / mass;
            car.vz += (j * uz) / mass;
            n.vx = (n.vx || 0) - (j * ux) / nMass;
            n.vz = (n.vz || 0) - (j * uz) / nMass;
            const torque = (ux * rvz - uz * rvx) * 0.045;
            car.av += torque / mass;
            n.angle = Math.atan2(n.vx, n.vz);
            n.knocked = Math.max(n.knocked || 0, 0.35);
          }

          nx += ux;
          nz += uz;
          contactOx += ux * hw * 0.5;
          contactOz += uz * hl * 0.5;
          count++;
          hit = true;
          hitType = "npc";
          hitRestitution = 0.42;
          softHit = true;
          const rel = Math.hypot(rvx, rvz);
          if (rel > 3.8) {
            registerImpact(rel, ux, uz, "npc", { glancing: Math.abs(relN) < rel * 0.45 });
            n.health = (n.health != null ? n.health : 45) - rel * 2.6;
            if (n.health <= 0 || rel > 15) wreckNpc(n, rel);
          }
        }
      }
    }

    if (hit && count && !didRam) {
      nx /= count;
      nz /= count;
      const nlen = Math.hypot(nx, nz) || 1;
      nx /= nlen;
      nz /= nlen;
      contactOx /= count;
      contactOz /= count;

      const speedInto = -(car.vx * nx + car.vz * nz);
      const push = 0.22 + Math.min(0.55, Math.max(0, speedInto) * 0.03);
      car.x += nx * push;
      car.z += nz * push;

      const tx = -nz;
      const tz = nx;
      const vt = car.vx * tx + car.vz * tz;
      const tangential = Math.abs(vt);
      const glancing = tangential > Math.max(0.01, speedInto) * 1.25;

      if (speedInto > 0.15 && car.bounceLock <= 0) {
        // Crumple zone: softer bounce at high speed (energy → deformation)
        let e = hitRestitution;
        if (speedInto > 14) e *= 0.35;
        else if (speedInto > 10) e *= 0.5;
        else if (speedInto > 7) e *= 0.7;
        if (softHit) e = Math.min(0.65, e * 1.15);
        if (glancing) e *= 0.5;

        // Reflect OFF the surface (n points outward). Previous formula had inverted sign
        // and treated walls like movable bodies, so hits felt mushy/sticky.
        const bounce = (1 + e) * speedInto;
        const kick = Math.min(10, 1.2 + speedInto * 0.45) / Math.max(0.7, Math.sqrt(mass));
        car.vx += nx * (bounce + kick * 0.45);
        car.vz += nz * (bounce + kick * 0.45);
        // Crumple: bleed a bit of outbound speed into deformation on hard walls
        if (!softHit && !glancing) {
          const bleed = speedInto * (hitType === "building" || hitType === "rock" ? 0.18 : 0.1);
          car.vx -= nx * bleed;
          car.vz -= nz * bleed;
        }

        // Kinetic friction along the wall (scrape)
        const mu = glancing ? 0.78 : 0.45;
        const maxF = Math.abs(vt) * mu;
        const scrapeF = Math.min(maxF, speedInto * (glancing ? 0.65 : 0.3)) * Math.sign(vt || 1);
        car.vx -= tx * scrapeF;
        car.vz -= tz * scrapeF;

        // Corner lever arm → spin / fishtail
        const lever = contactOx * nz - contactOz * nx;
        const yawKick = (lever * speedInto * 0.1 + (nx * car.vz - nz * car.vx) * 0.03) / mass;
        car.av += THREE.MathUtils.clamp(yawKick, -3.2, 3.2);
        if (car.slideGrip < 0.7) car.av += Math.sign(yawKick || 1) * speedInto * 0.018;

        if (speedInto > 8 && car.grounded && !glancing) {
          car.vy = Math.max(car.vy, Math.min(8, 1.8 + speedInto * 0.2));
          car.grounded = false;
          car.pitch -= Math.min(0.65, speedInto * 0.025);
          car.roll += -nx * Math.min(0.4, speedInto * 0.018);
        } else if (speedInto > 5.5) {
          car.suspY = -Math.min(0.3, speedInto * 0.02);
          car.suspV = -speedInto * 0.25;
        }

        car.bounceLock = glancing ? 0.04 : 0.09;

        registerImpact(speedInto, nx, nz, hitType, {
          tangential: tangential,
          glancing: glancing,
          scrape: glancing && speedInto < 5.5 && tangential > 5,
        });
      } else if (tangential > 6 && speedInto > -1.5) {
        registerImpact(Math.min(Math.max(speedInto, 2), 5), nx, nz, hitType, {
          tangential: tangential,
          scrape: true,
        });
        car.vx -= tx * vt * 0.12;
        car.vz -= tz * vt * 0.12;
        car.av += -Math.sign(vt || 1) * Math.min(1.2, tangential * 0.04);
      }

      if (hitType === "water" && !carInvincible()) {
        car.vx *= 0.88;
        car.vz *= 0.88;
        car.health = Math.max(0, car.health - 12 * dt);
        if (car.health <= 0) totalCar();
      }
    }
  }

  function surfaceFriction(surf, spec) {
    let mu = 1;
    if (surf === T.ROAD) mu = 1.05;
    else if (surf === T.DIRT) mu = hasTag(spec, "offroad") ? 1.05 : 0.72;
    else if (surf === T.GRASS) mu = hasTag(spec, "offroad") ? 0.85 : 0.48;
    else if (surf === T.WATER) mu = 0.22;
    return mu;
  }

  const AUDIO_VERSION = 6;
  let musicReady = false;
  let musicTimer = null;
  let musicGain = null;

  function ensureAudio() {
    if (musicReady) {
      resumeMusic();
      return;
    }
    try {
      if (audioCtx) {
        try { audioCtx.close(); } catch (_) {}
      }
      if (musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }
      engineAudio = null;
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtx;
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.55;
      musicGain.connect(ctx.destination);

      // Prefer a real song file in the game folder if present
      const fileSong = new Audio();
      fileSong.loop = true;
      fileSong.preload = "auto";
      fileSong.volume = 0.92;
      const tryFiles = ["song.mp3", "music.mp3", "rush-e.mp3", "RushE.mp3"];
      let fileIdx = 0;
      let settled = false;
      const useProcedural = () => {
        if (settled) return;
        settled = true;
        startProceduralSong(ctx);
      };
      const tryNextFile = () => {
        if (fileIdx >= tryFiles.length) {
          useProcedural();
          return;
        }
        const name = tryFiles[fileIdx++];
        fileSong.src = name + "?v=" + Date.now();
        const onErr = () => {
          fileSong.removeEventListener("error", onErr);
          tryNextFile();
        };
        fileSong.addEventListener("error", onErr);
        fileSong.play().then(() => {
          fileSong.removeEventListener("error", onErr);
          if (settled) {
            fileSong.pause();
            return;
          }
          settled = true;
          if (musicTimer) {
            clearInterval(musicTimer);
            musicTimer = null;
          }
          musicGain.gain.value = 0;
          fileSong.dataset.active = "1";
          window.__openRoadsSong = fileSong;
        }).catch(onErr);
      };
      tryNextFile();
      // Guaranteed song if no file is found quickly
      setTimeout(useProcedural, 500);
      musicReady = true;
    } catch (_) {
      audioCtx = null;
      musicReady = false;
    }
  }

  function resumeMusic() {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    const file = window.__openRoadsSong;
    if (file && file.dataset.active === "1") {
      file.volume = 0.92;
      file.play().catch(() => {});
      return;
    }
    if (musicGain && audioCtx) {
      musicGain.gain.setTargetAtTime(playing ? 0.58 : 0.28, audioCtx.currentTime, 0.2);
    }
  }

  function startProceduralSong(ctx) {
    if (window.__openRoadsSong && window.__openRoadsSong.dataset.active === "1") return;
    if (musicTimer) return;

    const master = musicGain || ctx.createGain();
    if (!musicGain) {
      musicGain = master;
      master.connect(ctx.destination);
    }
    master.gain.value = 0.55;

    // Original upbeat "Open Roads" loop (not a copyrighted track)
    const tempo = 132;
    const beat = 60 / tempo;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25]; // C major-ish
    const melody = [
      0, 2, 4, 5, 4, 2, 0, 2,
      4, 5, 7, 5, 4, 2, 0, -1,
      2, 4, 5, 7, 5, 4, 2, 4,
      5, 4, 2, 0, 2, 4, 5, 4,
    ];
    const bass = [0, 0, 3, 3, 4, 4, 0, 0];
    let step = 0;

    function beep(freq, dur, type, gainVal, when) {
      if (!freq || freq < 20) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      osc.type = type;
      osc.frequency.value = freq;
      f.type = "lowpass";
      f.frequency.value = type === "square" ? 2200 : 1400;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gainVal, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      osc.connect(f);
      f.connect(g);
      g.connect(master);
      osc.start(when);
      osc.stop(when + dur + 0.05);
    }

    function tick() {
      if (!audioCtx || audioCtx.state === "closed") return;
      if (audioCtx.state === "suspended") audioCtx.resume();
      const t0 = audioCtx.currentTime + 0.03;
      const m = melody[step % melody.length];
      const b = bass[Math.floor(step / 4) % bass.length];
      if (m >= 0) beep(scale[m], beat * 0.85, "square", playing ? 0.04 : 0.018, t0);
      if (step % 2 === 0) beep(scale[b] / 2, beat * 1.5, "triangle", playing ? 0.05 : 0.025, t0);
      if (step % 4 === 0) beep(90, beat * 0.35, "sine", playing ? 0.07 : 0.035, t0);
      step++;
      master.gain.setTargetAtTime(playing ? 0.24 : 0.1, audioCtx.currentTime, 0.15);
    }

    tick();
    musicTimer = setInterval(tick, beat * 1000);
    musicReady = true;
  }

  // Engine synth helpers kept unused (engine sound removed — background song only)
  function makeNoiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    return buf;
  }
  function makeWhiteNoiseBuffer(ctx, seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    return buf;
  }
  function makeDCBuffer(ctx, value) {
    const buf = ctx.createBuffer(1, 128, ctx.sampleRate);
    return buf;
  }
  function makeDriveCurve() { return new Float32Array(2); }
  function makePulseCurve() { return new Float32Array(2); }
  function makeCombustionCycle(ctx) {
    return ctx.createBuffer(1, 128, ctx.sampleRate);
  }
  function engineVoiceForSpec() {
    return { cyl: 4, sub: 1, turbo: 0, bark: 1, lope: 0.8, pitch: 1 };
  }

  function updateEngineAudio() {
    resumeMusic();
  }

  function spawnSkid(x, z, angle) {
    if (skidMarks.length > 60) {
      const old = skidMarks.shift();
      if (old.mesh.parent) old.mesh.parent.remove(old.mesh);
    }
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 1.25),
      new THREE.MeshBasicMaterial({ color: 0x121214, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -angle;
    mesh.position.set(x, heightAt(x, z) + 0.22, z);
    scene.add(mesh);
    skidMarks.push({ mesh, life: 8 });
  }

  function spawnDust(x, z, amount) {
    const gy = heightAt(x, z);
    const surf = surfaceAt(x, z);
    const col = surf === T.DIRT ? 0xb8956a : surf === T.GRASS ? 0x8a9a60 : surf === T.ROAD ? 0x6a7078 : 0xc2b280;
    for (let i = 0; i < amount; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.22, 5, 5),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.4 + Math.random() * 0.2 })
      );
      mesh.position.set(x + (Math.random() - 0.5) * 1.2, gy + 0.25, z + (Math.random() - 0.5) * 1.2);
      scene.add(mesh);
      dustParticles.push({
        mesh,
        vx: (Math.random() - 0.5) * 2.4,
        vy: 0.8 + Math.random() * 2.2,
        vz: (Math.random() - 0.5) * 2.4,
        life: 0.45 + Math.random() * 0.55,
      });
    }
  }

  function updateDriving(dt) {
    const GRAVITY = 36;
    const spec = car.spec;
    const surf = surfaceAt(car.x, car.z);
    let mu = surfaceFriction(surf, spec) * (0.5 + 0.5 * (car.health / 100));
    mu *= Math.max(0.4, 1 - (car.wheelDamage || 0) * 0.85);
    mu *= Math.max(0.2, car.slideGrip != null ? car.slideGrip : 1);
    if (car.slideGrip < 1) car.slideGrip = Math.min(1, car.slideGrip + dt * 0.55);
    if (car.tipTimer > 0) {
      car.tipTimer = Math.max(0, car.tipTimer - dt);
      car.roll += Math.sign(car.roll || 1) * (car.flipped ? 0.35 : 1.15) * dt;
      mu *= car.flipped ? 0.2 : 0.4;
      if (car.flipped) {
        input.throttle *= 0.05;
        input.steer *= 0.15;
        car.vx *= Math.pow(0.35, dt);
        car.vz *= Math.pow(0.35, dt);
      }
    } else if (car.flipped && Math.abs(car.roll) > 1.2) {
      // Stay belly-up until repair / respawn impulse
      car.roll = Math.sign(car.roll) * Math.PI * 0.92;
      mu *= 0.15;
      input.throttle *= 0.05;
    }
    // Damaged wheels / crash pull bias the steering (before stun dampens input)
    if (car.pullSteer || car.wheelDamage > 0.08) {
      input.steer = THREE.MathUtils.clamp(
        input.steer + (car.pullSteer || 0) + (car.wheelDamage > 0.2 ? Math.sin(performance.now() * 0.004) * car.wheelDamage * 0.25 : 0),
        -1.15,
        1.15
      );
    }
    if (car.crashStun > 0) {
      input.steer *= 0.25;
      input.throttle *= 0.35;
    }
    const mass = Math.max(0.7, spec.mass);
    const air = !car.grounded;
    const wheelbase = Math.max(2.2, spec.length * 0.55);

    car.handbrake = keys.has(" ") || keys.has("Space");
    let speed = Math.hypot(car.vx, car.vz);
    let fx = Math.sin(car.angle);
    let fz = Math.cos(car.angle);
    let rx = Math.cos(car.angle);
    let rz = -Math.sin(car.angle);
    let forwardSpeed = car.vx * fx + car.vz * fz;
    let lateralSpeed = car.vx * rx + car.vz * rz;

    // Steering
    const maxSteer = 0.68 / (1 + speed * 0.024);
    const steerTarget = input.steer * maxSteer;
    const steerRate = Math.abs(input.steer) < 0.08 ? 22 : 14; // center fast when you let go
    car.steerAngle += (steerTarget - car.steerAngle) * Math.min(1, steerRate * dt);
    if (Math.abs(input.steer) < 0.08 && Math.abs(car.steerAngle) < 0.04) car.steerAngle = 0;

    // Bicycle yaw
    if (!air) {
      const slipSteer = car.handbrake ? 1.35 : 1;
      const yawSpeed = Math.abs(forwardSpeed);
      const cappedYawSpeed = Math.min(yawSpeed, 30);
      const steerRad = THREE.MathUtils.clamp(car.steerAngle, -0.62, 0.62);
      let turnFromSteer = 0;
      if (Math.abs(steerRad) > 0.012 && cappedYawSpeed > 0.4) {
        turnFromSteer =
          Math.sign(forwardSpeed || 1) *
          cappedYawSpeed *
          Math.tan(steerRad) /
          wheelbase *
          spec.turn *
          2.4 *
          slipSteer;
      }

      // High-speed settle
      const stab = 1 / (1 + speed * 0.022);
      turnFromSteer *= stab;

      if (Math.abs(input.steer) > 0.08) {
        turnFromSteer += input.steer * spec.turn * (0.85 + Math.min(0.9, speed / 40));
      }

      const crawl =
        Math.abs(forwardSpeed) < 4
          ? input.steer * spec.turn * 2.0 * (Math.abs(input.throttle) > 0.1 || car.handbrake ? 1 : 0.55)
          : 0;

      // Hands off → snap yaw rate toward zero
      if (Math.abs(input.steer) < 0.08) {
        car.av += (0 - car.av) * Math.min(1, 16 * dt);
      } else {
        car.av += (turnFromSteer + crawl - car.av) * Math.min(1, 16 * dt);
      }

      // Oversteer kick
      if (Math.abs(lateralSpeed) > 3.5) {
        const yawKick = -lateralSpeed * 0.035 * (car.handbrake ? 1.4 : 0.4);
        car.av += yawKick * dt * spec.turn;
      }
      const maxAv = 2.8 + Math.min(1.1, 18 / (6 + speed));
      car.av = THREE.MathUtils.clamp(car.av, -maxAv, maxAv);
    } else {
      car.av *= Math.pow(0.2, dt);
      car.angle += input.steer * spec.turn * 1.1 * dt;
      car.pitch += input.throttle * 0.5 * dt;
      car.roll -= input.steer * 0.65 * dt;
    }
    car.angle += car.av * dt;
    // Yaw damping
    if (air) {
      car.av *= Math.pow(0.15, dt);
    } else if (Math.abs(input.steer) < 0.08) {
      car.av *= Math.pow(0.02, dt);
      if (Math.abs(car.av) < 0.05) car.av = 0;
    } else {
      car.av *= Math.pow(0.14, dt);
    }

    fx = Math.sin(car.angle);
    fz = Math.cos(car.angle);
    rx = Math.cos(car.angle);
    rz = -Math.sin(car.angle);
    forwardSpeed = car.vx * fx + car.vz * fz;
    lateralSpeed = car.vx * rx + car.vz * rz;

    // Gears
    const gearRatios = [0, 3.4, 2.2, 1.5, 1.15, 0.88];
    if (forwardSpeed > spec.maxSpeed * 0.2 * car.gear && car.gear < 5) car.gear++;
    if (forwardSpeed < spec.maxSpeed * 0.11 * Math.max(1, car.gear - 1) && car.gear > 1) car.gear--;
    const ratio = gearRatios[car.gear] || 1.2;
    const throttle = Math.max(0, input.throttle);
    const wantingReverse = input.throttle < 0 && forwardSpeed < 2.2;
    car.braking = (input.throttle < 0 && forwardSpeed > 2.2) || input.brake > 0;

    // Grip budget (friction circle)
    let gripBudget = mu * spec.grip * (air ? 0.05 : 1);
    if (car.handbrake && !air) gripBudget *= 0.42;
    if (hasTag(spec, "powerover") && throttle > 0.65) gripBudget *= 0.88;
    if (hasTag(spec, "tailhappy") && Math.abs(car.steerAngle) > 0.28) gripBudget *= 0.9;

    // Drive / reverse / engine brake
    let driveForce = 0;
    if (wantingReverse) {
      driveForce = -spec.power * 0.38 * Math.abs(input.throttle) * (air ? 0.1 : 1);
    } else if (throttle > 0) {
      const speedNorm = Math.min(1, Math.max(0, forwardSpeed) / Math.max(1, spec.maxSpeed));
      const powerCurve = Math.max(0.18, 1 - speedNorm * speedNorm);
      driveForce = (spec.power / mass) * throttle * powerCurve * ratio * 0.58 * (air ? 0.12 : 1);
    } else if (!air && Math.abs(forwardSpeed) > 0.4) {
      // Engine braking when you lift
      driveForce = -Math.sign(forwardSpeed) * (spec.brake * 0.12) / mass;
    }

    let brakeForce = 0;
    if (!air) {
      if (car.braking) {
        brakeForce = (spec.brake / mass) * Math.max(Math.abs(input.throttle), input.brake || 0.9);
      }
      if (car.handbrake) brakeForce += (spec.brake / mass) * 0.35;
    }

    // Clamp longitudinal demand to grip
    let longDemand = driveForce;
    if (Math.abs(forwardSpeed) > 0.15) {
      longDemand -= Math.sign(forwardSpeed) * brakeForce;
    }
    const maxLong = gripBudget * 5.5;
    if (Math.abs(longDemand) > maxLong) {
      car.slip = Math.min(1, car.slip + dt * 2.2);
      longDemand = Math.sign(longDemand) * (maxLong + (Math.abs(longDemand) - maxLong) * 0.25);
    } else {
      car.slip = Math.max(0, car.slip - dt * 1.6);
    }

    car.vx += fx * longDemand * dt;
    car.vz += fz * longDemand * dt;

    // Refresh velocity basis after long forces
    forwardSpeed = car.vx * fx + car.vz * fz;
    lateralSpeed = car.vx * rx + car.vz * rz;
    speed = Math.hypot(car.vx, car.vz);

    // Lateral tire force — remaining grip after long use
    const longUsed = Math.min(1, Math.abs(longDemand) / Math.max(0.1, maxLong));
    let latGrip = gripBudget * Math.sqrt(Math.max(0.08, 1 - longUsed * longUsed));
    if (car.handbrake) latGrip *= 0.55;
    const latStiffness = 5.5 + latGrip * 0.55;
    let latForce = -lateralSpeed * latStiffness;
    const maxLat = latGrip * 6.2;
    if (Math.abs(latForce) > maxLat) {
      latForce = Math.sign(latForce) * maxLat;
      car.slip = Math.min(1, car.slip + dt * 1.4);
    }
    car.vx += rx * latForce * dt;
    car.vz += rz * latForce * dt;

    // Quadratic aero drag + rolling resistance
    speed = Math.hypot(car.vx, car.vz);
    const aero = (spec.drag || 0.4) * speed * speed * 0.018;
    const rollRes = air ? 0 : 1.1 + mu * 0.4;
    const drag = aero + rollRes * 0.35;
    if (speed > 0.01) {
      car.vx -= (car.vx / speed) * (drag / mass) * dt;
      car.vz -= (car.vz / speed) * (drag / mass) * dt;
    }

    car.x += car.vx * dt;
    car.z += car.vz * dt;
    // Warp Bolt: keep speed finite so the world doesn't NaN, still absurdly fast
    if (car.spec && car.spec.id === "warp") {
      const cap = 48000;
      const sp = Math.hypot(car.vx, car.vz);
      if (sp > cap) {
        car.vx = (car.vx / sp) * cap;
        car.vz = (car.vz / sp) * cap;
      }
    }
    car.x = Math.max(TILE, Math.min(WORLD_W - TILE, car.x));
    if (currentMap().wrap === "z") {
      applyInfiniteWrap();
    } else {
      car.z = Math.max(TILE, Math.min(WORLD_H - TILE, car.z));
    }

    const groundY = heightAt(car.x, car.z);
    const n = groundNormal(car.x, car.z);
    const surfaceVy = -(car.vx * n.x + car.vz * n.z) / Math.max(0.22, n.y);
    const transfer = THREE.MathUtils.clamp(longDemand * 0.004, -0.22, 0.22);

    // Refresh axes for attitude
    const f2x = Math.sin(car.angle);
    const f2z = Math.cos(car.angle);
    const r2x = Math.cos(car.angle);
    const r2z = -Math.sin(car.angle);
    forwardSpeed = car.vx * f2x + car.vz * f2z;
    lateralSpeed = car.vx * r2x + car.vz * r2z;
    speed = Math.hypot(car.vx, car.vz);

    if (car.grounded) {
      // Project gravity down the slope (real downhill pull)
      const gScale = GRAVITY * (1.05 - n.y * 0.85);
      car.vx += n.x * gScale * dt;
      car.vz += n.z * gScale * dt;

      // Spring–damper suspension
      const bump =
        surf === T.DIRT || surf === T.GRASS
          ? Math.sin(performance.now() * 0.045 + car.x * 0.3) * 0.035
          : 0;
      const suspTarget = THREE.MathUtils.clamp(-transfer * 0.22 + bump, -0.08, 0.1);
      const spring = 70;
      const damp = 14;
      car.suspV += ((suspTarget - car.suspY) * spring - car.suspV * damp) * dt;
      car.suspY += car.suspV * dt;
      car.suspY = THREE.MathUtils.clamp(car.suspY, -0.14, 0.12);

      let launch = false;
      const spd = speed;
      if (spd > 7) {
        const look = Math.min(4.5, 1.2 + spd * 0.14);
        const ux = car.vx / spd;
        const uz = car.vz / spd;
        const aheadY = heightAt(car.x + ux * look, car.z + uz * look);
        const expectedIfGlued = groundY + surfaceVy * (look / spd);
        if (surfaceVy > 2.2 && aheadY < expectedIfGlued - 0.85) launch = true;
        if (aheadY < groundY - 1.6 && surfaceVy > 0.5) launch = true;
      }
      if (groundY < car.y - 0.55) launch = true;

      if (launch) {
        car.grounded = false;
        car.vy = Math.max(surfaceVy, car.vy) + Math.max(0, surfaceVy) * 0.15;
        car.y = Math.max(car.y, groundY) + 0.08;
        car.suspV = 0;
      } else {
        car.y = groundY;
        car.vy = surfaceVy;
      }

      const slopePitch = Math.atan2(n.x * f2x + n.z * f2z, Math.max(0.2, n.y));
      const slopeRoll = Math.atan2(-(n.x * r2x + n.z * r2z), Math.max(0.2, n.y));
      const pitchTarget = THREE.MathUtils.clamp(slopePitch - transfer * 0.28, -0.55, 0.55);
      const rollTarget = THREE.MathUtils.clamp(
        slopeRoll - lateralSpeed * 0.014 - car.steerAngle * Math.min(1, speed / 20) * 0.07,
        -0.42,
        0.42
      );
      car.pitch += (pitchTarget - car.pitch) * Math.min(1, 11 * dt);
      car.roll += (rollTarget - car.roll) * Math.min(1, 11 * dt);
    } else {
      car.vy -= GRAVITY * dt;
      car.y += car.vy * dt;

      const levelRate = Math.min(1, 2.4 * dt);
      car.pitch += (0 - car.pitch) * levelRate;
      car.roll += (0 - car.roll) * levelRate;
      car.pitch = THREE.MathUtils.clamp(car.pitch, -1.1, 1.1);
      car.roll = THREE.MathUtils.clamp(car.roll, -1.2, 1.2);

      car.suspV += (-car.suspY * 40 - car.suspV * 10) * dt;
      car.suspY += car.suspV * dt;

      if (car.y <= groundY) {
        const impact = Math.max(0, -car.vy);
        car.y = groundY;
        car.grounded = true;
        car.vy = surfaceVy;
        car.suspY = -Math.min(0.2, impact * 0.014);
        car.suspV = -impact * 0.15;
        if (impact > 10) {
          shake = Math.min(1.4, impact * 0.045);
          spawnDust(car.x, car.z, Math.min(6, 1 + Math.floor(impact / 4)));
        }
        if (impact > 16) {
          applyCrashDamage(impact * 0.55, 0.6, 0, 1);
          spawnDestruction(car.x, car.y + 1, car.z, impact * 0.4, car.spec.color, { vx: car.vx, vz: car.vz });
        }
        const landPitch = Math.atan2(n.x * f2x + n.z * f2z, Math.max(0.2, n.y));
        const landRoll = Math.atan2(-(n.x * r2x + n.z * r2z), Math.max(0.2, n.y));
        car.pitch = car.pitch * 0.35 + landPitch * 0.65;
        car.roll = car.roll * 0.35 + landRoll * 0.65;
      }
    }

    car.wheelSpin += forwardSpeed * dt * 1.8 + car.slip * 8 * dt;
    car.rpm =
      850 +
      Math.abs(forwardSpeed) * (95 + car.gear * 8) * ratio * 0.55 +
      throttle * (1600 + car.gear * 120) +
      car.slip * 700;

    if (car.grounded && car.slip > 0.35 && speed > 6) {
      spawnSkid(car.x - r2x * 0.7, car.z - r2z * 0.7, car.angle);
      spawnSkid(car.x + r2x * 0.7, car.z + r2z * 0.7, car.angle);
      if (surf === T.DIRT || surf === T.GRASS) spawnDust(car.x, car.z, 1);
    } else if (car.grounded && (surf === T.DIRT || surf === T.GRASS) && speed > 10 && Math.random() < 0.2) {
      spawnDust(car.x, car.z, 1);
    }
    // Soft idle exhaust puff — rare, cheap
    if (playing && car.grounded && speed < 3 && Math.random() < 0.03) {
      const ex = car.x - Math.sin(car.angle) * (car.spec.length * 0.48);
      const ez = car.z - Math.cos(car.angle) * (car.spec.length * 0.48);
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.18 + Math.random() * 0.12, 5, 5),
        new THREE.MeshBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.35 })
      );
      puff.position.set(ex, car.y + 0.45, ez);
      scene.add(puff);
      dustParticles.push({
        mesh: puff,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0.6 + Math.random() * 0.5,
        vz: (Math.random() - 0.5) * 0.4,
        life: 0.5 + Math.random() * 0.4,
      });
    }

    resolveCollisions(dt);
    collectCrates(dt);
    updateEngineAudio(dt);
    if (speed > 5) save.cash += speed * dt * 0.08;
  }

  function collectCrates(dt) {
    for (const c of crates) {
      if (c.taken) {
        c.respawn -= dt;
        if (c.respawn <= 0) {
          c.taken = false;
          c.mesh.visible = true;
          if (c.band) c.band.visible = true;
          if (c.band2) c.band2.visible = true;
          if (c.stamp) c.stamp.visible = true;
          c.value = 25 + Math.floor(Math.random() * 35);
        }
        continue;
      }
      const baseY = c.baseY != null ? c.baseY : heightAt(c.x, c.z) + 0.85;
      c.mesh.position.y = baseY + Math.sin(performance.now() / 300 + c.x) * 0.12;
      c.mesh.rotation.y += dt;
      if (c.band) {
        c.band.position.y = c.mesh.position.y;
        c.band.rotation.y = c.mesh.rotation.y;
      }
      if (c.band2) {
        c.band2.position.y = c.mesh.position.y;
        c.band2.rotation.y = c.mesh.rotation.y;
      }
      if (c.stamp) {
        c.stamp.position.y = c.mesh.position.y + 0.25;
        c.stamp.rotation.y = c.mesh.rotation.y;
      }
      if (Math.hypot(c.x - car.x, c.z - car.z) < 3) {
        c.taken = true;
        c.respawn = 20 + Math.random() * 20;
        c.mesh.visible = false;
        if (c.band) c.band.visible = false;
        if (c.band2) c.band2.visible = false;
        if (c.stamp) c.stamp.visible = false;
        save.cash += c.value;
        showMsg("Crate +$" + c.value);
        persist();
        updateCashUI();
        spawnCrashFX(c.x, baseY, c.z, 6);
      }
    }
  }

  function updateNpcs(dt) {
    const viewR2 = 260 * 260;
    const chaseVisR2 = 200 * 200;
    const chaseFarR2 = 160 * 160;
    const chaseUltraR2 = 380 * 380;
    const playerSpeed = Math.hypot(car.vx, car.vz);
    npcLodFrame = (npcLodFrame + 1) | 0;
    for (const n of npcs) {
      if (n.wrecked) {
        n.respawnIn -= dt;
        // Sliding / tumbling wreck after a hard hit
        if (n.tumble > 0) {
          n.tumble -= dt;
          n.x += (n.vx || 0) * dt;
          n.z += (n.vz || 0) * dt;
          n.vx *= Math.pow(0.12, dt);
          n.vz *= Math.pow(0.12, dt);
          n.angle += (n.spin || 0) * dt;
          n.spin *= Math.pow(0.18, dt);
          if (Math.hypot(n.vx || 0, n.vz || 0) > 5 && Math.random() < 0.25) {
            spawnSparks(n.x, 0.35, n.z, -(n.vx || 0), -(n.vz || 0), 3.5);
          }
        }
        n.mesh.visible = false;
        n.mesh.position.set(n.x, heightAt(n.x, n.z) + 0.15, n.z);
        n.mesh.rotation.y = n.angle;
        if (n.spin) n.mesh.rotation.z += n.spin * dt * 0.4;
        if (n.respawnIn <= 0) {
          n.wrecked = false;
          n.health = n.chase ? 70 + Math.floor(Math.random() * 20) : 40 + Math.floor(Math.random() * 25);
          // Chase cars re-engage near the player instead of going home
          if (n.chase) {
            const ang = Math.random() * Math.PI * 2;
            const dist = (currentMap().id === "tiny" ? 10 : 28) + Math.random() * (currentMap().id === "tiny" ? 8 : 22);
            n.x = car.x + Math.sin(ang) * dist;
            n.z = car.z + Math.cos(ang) * dist;
            n.angle = Math.atan2(car.x - n.x, car.z - n.z);
            n.speed = (n.maxSpeed || 20) * 0.75;
          } else {
            n.x = n.homeX;
            n.z = n.homeZ;
            n.angle = n.homeAngle;
            n.speed = 7 + Math.random() * 7;
          }
          n.vx = n.vz = 0;
          n.spin = 0;
          n.tumble = 0;
          n.mesh.visible = true;
          n.mesh.rotation.x = 0;
          n.mesh.rotation.z = 0;
          n.mesh.rotation.y = n.angle;
        }
        continue;
      }
      const dx = n.x - car.x;
      const dz = n.z - car.z;
      const dist2 = dx * dx + dz * dz;
      const near = dist2 < viewR2;
      if (n.chase) {
        n.mesh.visible = dist2 < chaseVisR2;
        // Ultra-far: warp closer in packs + skip most frames
        if (dist2 > chaseUltraR2) {
          if (((npcLodFrame + (n.lod || 0)) & 7) !== 0) continue;
          const ang = Math.atan2(car.x - n.x, car.z - n.z);
          const tiny = currentMap().id === "tiny";
          const pull = tiny
            ? 18 + (n.lod || 0) * 4 + Math.random() * 12
            : 90 + (n.lod || 0) * 18 + Math.random() * 40;
          n.x = car.x - Math.sin(ang) * pull;
          n.z = car.z - Math.cos(ang) * pull;
          n.angle = ang;
          n.speed = (n.maxSpeed || 16) * 0.85;
          n.vx = Math.sin(n.angle) * n.speed;
          n.vz = Math.cos(n.angle) * n.speed;
          continue;
        }
      } else {
        n.mesh.visible = near;
        if (!near) continue;
      }
      n.t += dt;

      // Rammed / stunned — slide from impulse, ignore chase AI
      if (n.knocked > 0) {
        n.knocked -= dt;
        n.x += (n.vx || 0) * dt;
        n.z += (n.vz || 0) * dt;
        n.vx *= Math.pow(0.55, dt); // long slide
        n.vz *= Math.pow(0.55, dt);
        n.angle += (n.spin || 0) * dt;
        n.spin = (n.spin || 0) * Math.pow(0.45, dt);
        n.speed = Math.hypot(n.vx || 0, n.vz || 0);
        n.x = Math.max(TILE * 1.5, Math.min(WORLD_W - TILE * 1.5, n.x));
        n.z = currentMap().wrap === "z" ? wrapZValue(n.z) : Math.max(TILE * 1.5, Math.min(WORLD_H - TILE * 1.5, n.z));
        if (n.mesh) {
          n.mesh.visible = true;
          n.mesh.position.set(n.x, heightAt(n.x, n.z), n.z);
          n.mesh.rotation.y = n.angle;
          n.mesh.rotation.z = Math.max(-0.75, Math.min(0.75, (n.spin || 0) * 0.1));
        }
        continue;
      }

      // Far pursuit cars: cheap update (keep pack pressure without melting FPS)
      if (n.chase && dist2 > chaseFarR2) {
        if (((npcLodFrame + (n.lod || 0)) & 1) !== 0) {
          // Odd frames: coast on last velocity
          n.x += (n.vx || 0) * dt;
          n.z += (n.vz || 0) * dt;
          if (n.mesh.visible) {
            n.mesh.position.set(n.x, heightAt(n.x, n.z), n.z);
            n.mesh.rotation.y = n.angle;
          }
          continue;
        }
        const dist = Math.sqrt(dist2) || 1;
        const desired = Math.atan2(car.x - n.x, car.z - n.z);
        let diff = desired - n.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        n.angle += Math.max(-1.2 * dt, Math.min(1.2 * dt, diff));
        n.speed = Math.min(n.maxSpeed || 16, 10 + Math.min(12, dist * 0.04));
        n.x += Math.sin(n.angle) * n.speed * dt;
        n.z += Math.cos(n.angle) * n.speed * dt;
        n.vx = Math.sin(n.angle) * n.speed;
        n.vz = Math.cos(n.angle) * n.speed;
        if (n.mesh.visible) {
          n.mesh.position.set(n.x, heightAt(n.x, n.z), n.z);
          n.mesh.rotation.y = n.angle;
        }
        continue;
      }

      if (n.chase) {
        const dist = Math.sqrt(dist2) || 0.001;
        const skill = n.skill != null ? n.skill : 0.5;
        const react = n.react != null ? n.react : 0.25;

        // Lagged aim point — they don't instantly track you
        const lead = (0.05 + skill * 0.35) * Math.min(0.9, playerSpeed * 0.04);
        const wantX = car.x + car.vx * lead + (Math.random() - 0.5) * (1.2 - skill);
        const wantZ = car.z + car.vz * lead + (Math.random() - 0.5) * (1.2 - skill);
        const blend = Math.min(1, dt / Math.max(0.08, react));
        n.aimX = (n.aimX != null ? n.aimX : n.x) + (wantX - n.aimX) * blend;
        n.aimZ = (n.aimZ != null ? n.aimZ : n.z) + (wantZ - n.aimZ) * blend;

        // Occasional brain fart — wrong turn / freeze / overcommit
        n.mistakeIn = (n.mistakeIn != null ? n.mistakeIn : 2) - dt;
        if (n.mistakeIn <= 0) {
          n.mistakeIn = 1.4 + Math.random() * 3.5;
          const roll = Math.random();
          if (roll < 0.35) n.panic = 0.45 + Math.random() * 0.55;
          else if (roll < 0.6) n.angle += (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.1);
          else if (roll < 0.8) n.speed *= 0.55 + Math.random() * 0.25;
          else n.slip = Math.min(1, (n.slip || 0) + 0.5);
        }
        if (n.panic > 0) n.panic -= dt;

        const desired = Math.atan2(n.aimX - n.x, n.aimZ - n.z);
        let diff = desired - n.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        // Slow hands + oversteer: they turn late and past the mark
        let turnRate = 1.1 + skill * 1.3 + (n.aggression || 0.6) * 0.5;
        if (n.panic > 0) turnRate *= 1.7;
        if (n.speed > 14) turnRate *= 0.72;
        const overshoot = (1.15 - skill * 0.4) + (n.slip || 0) * 0.35;
        const steer = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff * overshoot));
        n.angle += steer + (Math.random() - 0.5) * dt * (0.7 - skill * 0.5);

        // Visual body slip when turning hard
        n.slip = Math.max(0, (n.slip || 0) * Math.pow(0.2, dt) + Math.abs(steer) * 4);
        if (n.mesh) n.mesh.rotation.z = Math.max(-0.28, Math.min(0.28, -steer * 8 * (0.4 + n.slip)));

        // Speed: late on throttle/brake, rarely match you cleanly
        const maxSp = (n.maxSpeed || 18) * (0.82 + skill * 0.28);
        let targetSp = maxSp * (0.7 + skill * 0.25);
        if (dist < 10) targetSp *= 0.55 + Math.random() * 0.2;
        else if (dist > 35) targetSp = Math.min(maxSp, targetSp + 2);
        if (playerSpeed > 10) targetSp = Math.min(maxSp, Math.max(targetSp, playerSpeed * (0.75 + skill * 0.2)));
        if (n.panic > 0) targetSp *= 1.15;
        // Sloppy speed control
        const accel = 0.7 + skill * 0.9;
        n.speed += (targetSp - n.speed) * Math.min(1, dt * accel);
        n.speed += (Math.random() - 0.5) * dt * 6;

        // Short, jittery look-ahead — they clip corners and panic-swerve
        const look = 4 + n.speed * (0.12 + skill * 0.08);
        const ax = n.x + Math.sin(n.angle) * look;
        const az = n.z + Math.cos(n.angle) * look;
        const ahead = surfaceAt(ax, az);
        if (ahead === T.BUILDING || ahead === T.WATER) {
          const left = surfaceAt(
            n.x + Math.sin(n.angle - 0.9) * look,
            n.z + Math.cos(n.angle - 0.9) * look
          );
          const right = surfaceAt(
            n.x + Math.sin(n.angle + 0.9) * look,
            n.z + Math.cos(n.angle + 0.9) * look
          );
          // Sometimes pick the worse side
          const preferLeft = Math.random() < 0.5 + (left !== T.BUILDING && left !== T.WATER ? 0.25 : -0.25);
          if (preferLeft && left !== T.BUILDING && left !== T.WATER) n.angle -= (1.8 + Math.random()) * dt * 2.5;
          else if (right !== T.BUILDING && right !== T.WATER) n.angle += (1.8 + Math.random()) * dt * 2.5;
          else n.angle += (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 1.5);
          n.speed *= 0.7 + Math.random() * 0.2;
          n.slip = Math.min(1, (n.slip || 0) + 0.35);
          n.panic = Math.max(n.panic || 0, 0.35);
        } else if (ahead === T.GRASS && Math.random() < 0.4) {
          // Don't always stay on road
          n.speed *= 0.94;
          n.angle += (Math.random() - 0.5) * 0.4 * dt;
        }

        // Unstick if jammed — messy recovery
        const moved = Math.hypot(n.x - (n.lastX || n.x), n.z - (n.lastZ || n.z));
        if (moved < 0.35 * dt * Math.max(1, n.speed)) n.stuck = (n.stuck || 0) + dt;
        else n.stuck = Math.max(0, (n.stuck || 0) - dt * 2);
        if (n.stuck > 0.85) {
          n.angle += (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 2);
          n.speed *= 0.4;
          n.stuck = 0;
          n.panic = 0.6;
        }
        n.lastX = n.x;
        n.lastZ = n.z;

        // Flashing light bar
        if (n.mesh.userData.chaseLights) {
          const pulse = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 14 + (n.t || 0)));
          const mats = n.mesh.userData.chaseLights;
          if (mats[0] && mats[0].emissiveIntensity != null) mats[0].emissiveIntensity = pulse;
          if (mats[1] && mats[1].emissiveIntensity != null) {
            mats[1].emissiveIntensity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(clock.elapsedTime * 14 + 2.2));
          }
        }
      } else {
        n.x += Math.sin(n.angle) * n.speed * dt;
        n.z += Math.cos(n.angle) * n.speed * dt;
        n.vx = Math.sin(n.angle) * n.speed;
        n.vz = Math.cos(n.angle) * n.speed;
        const ahead = surfaceAt(n.x + Math.sin(n.angle) * 6, n.z + Math.cos(n.angle) * 6);
        if (ahead === T.BUILDING || ahead === T.WATER || ahead === T.GRASS) n.angle += (Math.random() > 0.5 ? 1 : -1) * 1.2;
        if (n.t > n.turnEvery) {
          n.t = 0;
          if (Math.random() < 0.4) n.angle += (Math.random() - 0.5);
        }
        n.x = Math.max(TILE * 2, Math.min(WORLD_W - TILE * 2, n.x));
        n.z = currentMap().wrap === "z" ? wrapZValue(n.z) : Math.max(TILE * 2, Math.min(WORLD_H - TILE * 2, n.z));
        n.mesh.position.set(n.x, heightAt(n.x, n.z), n.z);
        n.mesh.rotation.y = n.angle;
        continue;
      }

      n.x += Math.sin(n.angle) * n.speed * dt;
      n.z += Math.cos(n.angle) * n.speed * dt;
      n.vx = Math.sin(n.angle) * n.speed;
      n.vz = Math.cos(n.angle) * n.speed;
      n.x = Math.max(TILE * 1.5, Math.min(WORLD_W - TILE * 1.5, n.x));
      n.z = currentMap().wrap === "z" ? wrapZValue(n.z) : Math.max(TILE * 1.5, Math.min(WORLD_H - TILE * 1.5, n.z));
      n.mesh.position.set(n.x, heightAt(n.x, n.z), n.z);
      n.mesh.rotation.y = n.angle;
    }
  }

  function updatePedestrians(dt) {
    const carSpeed = Math.hypot(car.vx, car.vz);
    const viewR2 = 260 * 260;
    for (const p of pedestrians) {
      const pdx = p.x - car.x;
      const pdz = p.z - car.z;
      const near = pdx * pdx + pdz * pdz < viewR2;
      p.mesh.visible = near;
      if (!near) continue;
      if (p.state === "down") {
        p.downTimer -= dt;
        p.mesh.rotation.x = Math.min(1.2, p.mesh.rotation.x + dt * 4);
        p.mesh.position.y = heightAt(p.x, p.z) + 0.15;
        if (p.downTimer <= 0) {
          p.state = "walk";
          p.mesh.rotation.x = 0;
          p.mesh.rotation.z = 0;
          p.fear = 1.5;
          // Respawn a bit away
          p.x += (Math.random() - 0.5) * 8;
          p.z += (Math.random() - 0.5) * 8;
        }
        continue;
      }

      const dx = p.x - car.x;
      const dz = p.z - car.z;
      const dist = Math.hypot(dx, dz);
      const threat = carSpeed > 4 && dist < 14;

      if (threat || p.fear > 0) {
        p.state = "flee";
        p.fear = Math.max(p.fear, threat ? 1.2 : p.fear);
        // Run away from car
        if (dist > 0.1) {
          p.angle = Math.atan2(dx, dz);
        }
        p.speed = p.baseSpeed * 2.6;
        p.fear = Math.max(0, p.fear - dt);
      } else {
        p.state = "walk";
        p.speed = p.baseSpeed;
        p.t += dt;
        if (p.t > p.turnEvery) {
          p.t = 0;
          p.angle += (Math.random() - 0.5) * 1.2;
        }
      }

      const stepX = Math.sin(p.angle) * p.speed * dt;
      const stepZ = Math.cos(p.angle) * p.speed * dt;
      let nx = p.x + stepX;
      let nz = p.z + stepZ;
      const surf = surfaceAt(nx, nz);
      const ahead = surfaceAt(nx + Math.sin(p.angle) * 2, nz + Math.cos(p.angle) * 2);

      // Stay on grass/sidewalk; avoid water, buildings, deep road center when calm
      if (surf === T.WATER || surf === T.BUILDING || ahead === T.WATER || ahead === T.BUILDING) {
        p.angle += (Math.random() > 0.5 ? 1 : -1) * (0.8 + Math.random());
      } else if (p.state === "walk" && surf === T.ROAD && Math.random() < 0.7) {
        // Prefer not to stroll in the lane
        p.angle += (Math.random() > 0.5 ? 1 : -1) * 1.1;
      } else {
        p.x = nx;
        p.z = nz;
      }

      p.x = Math.max(TILE, Math.min(WORLD_W - TILE, p.x));
      p.z = currentMap().wrap === "z" ? wrapZValue(p.z) : Math.max(TILE, Math.min(WORLD_H - TILE, p.z));
      p.y = heightAt(p.x, p.z);

      // Walk cycle
      p.phase += dt * p.speed * 5;
      const swing = Math.sin(p.phase) * (p.state === "flee" ? 0.7 : 0.45);
      const limbs = p.mesh.userData.limbs;
      if (limbs && limbs.leftArm && limbs.rightArm && limbs.leftLeg && limbs.rightLeg) {
        limbs.leftArm.rotation.x = swing;
        limbs.rightArm.rotation.x = -swing;
        limbs.leftLeg.rotation.x = -swing * 0.9;
        limbs.rightLeg.rotation.x = swing * 0.9;
        if (limbs.leftShoe && limbs.rightShoe) {
          limbs.leftShoe.position.z = 0.04 - swing * 0.12;
          limbs.rightShoe.position.z = 0.04 + swing * 0.12;
          limbs.leftShoe.position.y = 0.08 + Math.max(0, -swing) * 0.06;
          limbs.rightShoe.position.y = 0.08 + Math.max(0, swing) * 0.06;
        }
      }

      p.mesh.position.set(p.x, p.y, p.z);
      p.mesh.rotation.y = p.angle;
      p.mesh.rotation.x = 0;

      // Hit by car
      const hitR = 1.15 + car.spec.width * 0.35;
      if (dist < hitR && carSpeed > 3.5) {
        p.state = "down";
        p.downTimer = 4 + Math.random() * 3;
        p.mesh.rotation.z = (Math.random() - 0.5) * 0.8;
        const scrap = Math.floor(8 + carSpeed * 0.9);
        save.cash += scrap;
        showMsg("Bump +$" + scrap);
        persist();
        updateCashUI();
        spawnCrashFX(p.x, p.y + 0.8, p.z, Math.min(12, carSpeed * 0.5));
        shake = Math.min(0.8, carSpeed * 0.025);
        // Slight slowdown
        car.vx *= 0.92;
        car.vz *= 0.92;
        if (carSpeed > 18) applyCrashDamage(carSpeed * 0.25, 0.35);
      }
    }
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.smoke) {
        p.vy *= 0.98;
        p.vx *= 0.96;
        p.vz *= 0.96;
        const g = p.grow || 1.5;
        p.mesh.scale.multiplyScalar(1 + g * dt * 0.55);
        if (p.mesh.material) {
          p.mesh.material.opacity = Math.max(0, (p.mesh.material.opacity || 0.3) * (1 - dt * 1.1));
        }
      } else if (p.spark) {
        p.vy -= 12 * dt;
        p.vx *= 0.98;
        p.vz *= 0.98;
      } else {
        p.vy -= 18 * dt;
      }
      p.life -= dt;
      if (p.life <= 0) scene.remove(p.mesh);
    }
    particles = particles.filter((p) => p.life > 0);

    for (const d of debris) {
      const fr = d.friction != null ? d.friction : 0.9;
      d.vx *= Math.pow(fr, dt * 60);
      d.vz *= Math.pow(fr, dt * 60);
      d.vy -= (20 + (d.mass || 1) * 2) * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.avx * dt;
      d.mesh.rotation.y += d.avy * dt;
      d.mesh.rotation.z += d.avz * dt;
      const gy = heightAt(d.mesh.position.x, d.mesh.position.z) + 0.06;
      if (d.mesh.position.y <= gy) {
        d.mesh.position.y = gy;
        if (Math.abs(d.vy) > 1.2) {
          d.vy *= -d.bounce;
          d.vx *= 0.68;
          d.vz *= 0.68;
          d.avx *= 0.6;
          d.avy *= 0.6;
          d.avz *= 0.6;
          d.bounce *= 0.5;
          if (Math.abs(d.vy) > 3 && Math.random() < 0.35) {
            spawnDust(d.mesh.position.x, d.mesh.position.z, 1);
          }
        } else {
          d.vy = 0;
          d.vx *= 0.84;
          d.vz *= 0.84;
          d.avx *= 0.75;
          d.avy *= 0.75;
          d.avz *= 0.75;
        }
      }
      d.life -= dt;
      if (d.life < 0.6) {
        const mats = d.mesh.material
          ? Array.isArray(d.mesh.material)
            ? d.mesh.material
            : [d.mesh.material]
          : [];
        mats.forEach(function (m) {
          if (!m) return;
          m.transparent = true;
          m.opacity = Math.max(0, d.life / 0.6);
          m.depthWrite = false;
        });
        d.mesh.traverse(function (ch) {
          if (!ch.isMesh || !ch.material) return;
          const cm = Array.isArray(ch.material) ? ch.material : [ch.material];
          cm.forEach(function (m) {
            m.transparent = true;
            m.opacity = Math.max(0, d.life / 0.6);
            m.depthWrite = false;
          });
        });
      }
      if (d.life <= 0) scene.remove(d.mesh);
    }
    debris = debris.filter((d) => d.life > 0);

    for (const d of dustParticles) {
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.vy -= 4 * dt;
      d.life -= dt;
      d.mesh.material.opacity = Math.max(0, d.life);
      d.mesh.scale.multiplyScalar(1 + dt * 1.5);
      if (d.life <= 0) scene.remove(d.mesh);
    }
    dustParticles = dustParticles.filter((d) => d.life > 0);

    for (const s of skidMarks) {
      s.life -= dt;
      s.mesh.material.opacity = Math.max(0, Math.min(0.45, s.life * 0.08));
      if (s.life <= 0) scene.remove(s.mesh);
    }
    skidMarks = skidMarks.filter((s) => s.life > 0);

    if (shake > 0) shake = Math.max(0, shake - dt * 3);
    if (messageLife > 0) {
      messageLife -= dt;
      if (messageLife <= 0) hint.hidden = true;
    }
  }

  function syncCarMesh() {
    if (!carMesh || !carMesh.visible) return;
    const visualY = car.y + car.suspY + (car.wreckPose ? 0.15 : 0);
    carMesh.position.set(car.x, visualY, car.z);
    carMesh.rotation.order = "YXZ";
    const dentLean = car.dent * 0.18;
    if (car.wreckPose) {
      // Keep the crumpled wreck pose; only update position
      carMesh.position.y = visualY;
    } else {
      carMesh.rotation.set(car.pitch + dentLean * 0.25, car.angle, car.roll + dentLean * (car.dent > 0.3 ? 0.35 : 0.1));
    }

    const wheels = carMesh.userData.wheels || [];
    for (const w of wheels) {
      if (w.front) w.pivot.rotation.y = car.steerAngle * (w.steerSign || 1);
      else w.pivot.rotation.y = 0;
      w.spin.rotation.x = (w.restX || 0) + car.wheelSpin;
      w.pivot.position.y = w.baseY;
    }

    const brakeGlow = car.braking || car.handbrake ? 1.4 : 0.45;
    (carMesh.userData.brakeLights || []).forEach((m) => {
      m.emissiveIntensity = brakeGlow;
    });

    if (carMesh.userData.groundShadow) {
      carMesh.userData.groundShadow.position.y = 0.06 - car.suspY * 0.15;
      carMesh.userData.groundShadow.material.opacity = car.grounded ? 0.28 : 0.08;
    }
  }

  function updateCamera(dt) {
    const speed = Math.hypot(car.vx, car.vz);

    // Keep sun / sun disc near the player
    if (sun) {
      sun.position.set(car.x + 62, 95, car.z + 38);
      if (sunDiscMesh) {
        sunDiscMesh.position.set(car.x + 180, 140, car.z + 110);
      }
    }

    // Face mostly where the car points; blend toward velocity when moving
    let faceX = Math.sin(car.angle);
    let faceZ = Math.cos(car.angle);
    if (speed > 1.5) {
      const vx = car.vx / speed;
      const vz = car.vz / speed;
      const blend = Math.min(0.55, speed / 40);
      faceX = faceX * (1 - blend) + vx * blend;
      faceZ = faceZ * (1 - blend) + vz * blend;
      const fl = Math.hypot(faceX, faceZ) || 1;
      faceX /= fl;
      faceZ /= fl;
    }

    // Locked to the car — no glide / lag
    camYaw = Math.atan2(faceX, faceZ);
    camReady = true;
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);

    const back =
      cameraMode === 1 ? 22 :
      cameraMode === 2 ? 0.9 :
      8.5 + Math.min(5, speed * 0.1);
    const height =
      cameraMode === 1 ? 15 :
      cameraMode === 2 ? 1.2 :
      3.6 + Math.min(2.2, speed * 0.035);
    const lookAhead =
      cameraMode === 2 ? 16 :
      4.5 + Math.min(8, speed * 0.18);

    camera.position.x = car.x - fx * back;
    camera.position.y = car.y + height;
    camera.position.z = car.z - fz * back;

    camLook.x = car.x + fx * lookAhead;
    camLook.y = car.y + (cameraMode === 2 ? 1.0 : 1.35);
    camLook.z = car.z + fz * lookAhead;

    // Directional impact punch + noisy shake
    camera.position.x += camKickX;
    camera.position.y += camKickY;
    camera.position.z += camKickZ;
    camKickX *= Math.pow(0.02, dt);
    camKickY *= Math.pow(0.02, dt);
    camKickZ *= Math.pow(0.02, dt);
    if (Math.abs(camKickX) < 0.01) camKickX = 0;
    if (Math.abs(camKickY) < 0.01) camKickY = 0;
    if (Math.abs(camKickZ) < 0.01) camKickZ = 0;
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 1.15;
      camera.position.y += (Math.random() - 0.5) * shake * 0.55;
      camera.position.z += (Math.random() - 0.5) * shake * 1.15;
    }
    if (impactFlash > 0) {
      impactFlash = Math.max(0, impactFlash - dt);
      if (elFlash) {
        elFlash.style.opacity = String(Math.max(0, impactFlash * 4));
        if (impactFlash <= 0) {
          elFlash.classList.remove("on");
          elFlash.style.opacity = "0";
        }
      }
    }

    camera.lookAt(camLook.x, camLook.y, camLook.z);

    const targetFov =
      (cameraMode === 1 ? 55 : 60) +
      Math.min(12, speed * 0.28);
    camera.fov += (targetFov - camera.fov) * Math.min(1, 3 * dt);
    camera.updateProjectionMatrix();
  }

  function readInput() {
    let throttle = 0;
    let steer = 0;
    let brake = 0;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) throttle += 1;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) throttle -= 1;
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) steer += 1;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) steer -= 1;
    // Space is handbrake only (handled in updateDriving)
    throttle += touchState.throttle;
    steer += touchState.steer;
    brake = Math.max(brake, touchState.brake);
    input.throttle = Math.max(-1, Math.min(1, throttle));
    input.steer = Math.max(-1, Math.min(1, steer));
    input.brake = Math.max(0, Math.min(1, brake));
  }

  function updateCashUI() {
    el.cash.textContent = String(Math.floor(save.cash));
    el.garageCash.textContent = String(Math.floor(save.cash));
  }

  function renderMapPicker() {
    const host = document.getElementById("map-picker-garage");
    if (!host) return;
    host.innerHTML = "";
    MAPS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "map-card" + (m.id === selectedMapId ? " selected" : "");
      btn.innerHTML = "<strong>" + m.name + "</strong><span>" + m.blurb + "</span>";
      btn.addEventListener("click", () => selectMap(m.id));
      host.appendChild(btn);
    });
  }

  function selectMap(id) {
    if (!MAPS.some((m) => m.id === id)) return;
    if (selectedMapId === id) {
      renderMapPicker();
      return;
    }
    selectedMapId = id;
    persist();
    renderMapPicker();
    showMsg("Map: " + currentMap().name);
    if (!worldReady || !scene) return;
    try {
      buildWorld();
      spawnNpcs();
      applyCarSpec(selectedCarId);
      car.x = SPAWN_TX * TILE;
      car.z = SPAWN_TZ * TILE;
      car.vx = car.vz = car.av = 0;
      car.angle = 0;
      car.y = heightAt(car.x, car.z);
      camReady = false;
      camera.position.set(car.x - 12, car.y + 9, car.z + 12);
      camera.lookAt(car.x, car.y + 1, car.z);
    } catch (err) {
      console.error(err);
      showMsg("Map switch failed");
    }
  }

  function updateDamageUI() {
    const pct = Math.max(0, car.health);
    el.damageFill.style.width = pct + "%";
    el.damageFill.style.background = pct > 60
      ? "linear-gradient(90deg, #e0894a, #e8c46a, #5ec4a8)"
      : pct > 30
        ? "linear-gradient(90deg, #e0894a, #e8c46a)"
        : "#c44536";
  }

  function updateHud() {
    el.speed.textContent =
      car.spec && car.spec.displayMph && Math.hypot(car.vx, car.vz) > 40
        ? car.spec.displayMph
        : String(Math.round(Math.hypot(car.vx, car.vz) * 2.8));
    el.carName.textContent =
      car.spec.name +
      "  ·  " +
      car.gear +
      (car.slip > 0.4 ? "  SLIP" : "");
    updateCashUI();
    updateDamageUI();
  }

  function renderGarage() {
    carGrid.innerHTML = "";
    updateCashUI();
    CARS.forEach((c) => {
      const unlocked = save.unlocked.includes(c.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "car-card" + (c.id === selectedCarId ? " selected" : "");
      btn.innerHTML =
        '<div class="swatch" style="background:#' + c.color.toString(16).padStart(6, "0") + '"></div>' +
        '<div class="name">' + c.name + "</div>" +
        '<div class="meta">' + (unlocked ? "Owned" : "$" + c.price) + " · Top " + (c.displayMph || String(Math.round(c.maxSpeed * 2.8))) + " mph<br/>" + c.blurb + "</div>";
      btn.addEventListener("click", () => {
        if (!unlocked) {
          if (save.cash >= c.price) {
            save.cash -= c.price;
            save.unlocked.push(c.id);
            selectedCarId = c.id;
            applyCarSpec(c.id);
            showMsg("Unlocked " + c.name);
            persist();
            renderGarage();
          } else showMsg("Not enough cash");
          return;
        }
        selectedCarId = c.id;
        applyCarSpec(c.id);
        renderGarage();
      });
      carGrid.appendChild(btn);
    });
  }

  function openGarage() {
    playing = false;
    panelTitle.hidden = true;
    panelWrecked.hidden = true;
    panelGarage.hidden = false;
    overlay.hidden = false;
    renderMapPicker();
    renderGarage();
  }

  function closeGarageAndDrive() {
    panelGarage.hidden = true;
    overlay.hidden = true;
    applyCarSpec(selectedCarId);
    if (car.health <= 0) respawn();
    if (carMesh) carMesh.visible = true;
    playing = true;
    hud.hidden = false;
    setupTouch();
    updateHud();
  }

  function respawn() {
    car.health = 100;
    car.x = SPAWN_TX * TILE;
    car.z = SPAWN_TZ * TILE;
    car.vx = car.vz = car.av = 0;
    car.angle = 0;
    car.pitch = car.roll = 0;
    car.vy = 0;
    car.grounded = true;
    car.y = heightAt(car.x, car.z);
    resetCarDeform();
    if (carMesh) {
      carMesh.visible = true;
      carMesh.rotation.set(0, 0, 0);
    }
    updateHud();
  }

  function repairCar() {
    if (car.health >= 100 && car.dent <= 0.01) return showMsg("Already pristine");
    if (save.cash < 40) return showMsg("Need $40 to repair");
    save.cash -= 40;
    car.health = 100;
    resetCarDeform();
    if (carMesh) carMesh.rotation.set(car.pitch, car.angle, car.roll);
    persist();
    updateHud();
    showMsg("Repaired");
  }

  function setupTouch() {
    const isTouch = matchMedia("(pointer: coarse)").matches || window.innerWidth <= 720;
    touch.hidden = !isTouch || !playing;
    if (touch.dataset.ready) return;
    touch.dataset.ready = "1";
    const zone = document.getElementById("stick-zone");
    const knob = document.getElementById("stick-knob");
    let active = null;
    zone.addEventListener("pointerdown", (e) => {
      active = e.pointerId;
      zone.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    zone.addEventListener("pointermove", (e) => {
      if (active === e.pointerId) moveStick(e);
    });
    const end = (e) => {
      if (active === e.pointerId) {
        active = null;
        touchState.steer = 0;
        knob.style.transform = "translate(0,0)";
      }
    };
    zone.addEventListener("pointerup", end);
    zone.addEventListener("pointercancel", end);
    function moveStick(e) {
      const rect = zone.getBoundingClientRect();
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const max = 36;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      knob.style.transform = "translate(" + dx + "px," + dy + "px)";
      touchState.steer = -dx / max;
    }
    const hold = (btn, set) => {
      btn.addEventListener("pointerdown", (e) => { e.preventDefault(); set(1); });
      const off = () => set(0);
      btn.addEventListener("pointerup", off);
      btn.addEventListener("pointerleave", off);
      btn.addEventListener("pointercancel", off);
    };
    hold(document.getElementById("btn-gas"), (v) => (touchState.throttle = v));
    hold(document.getElementById("btn-brake"), (v) => {
      touchState.brake = v;
      if (v) touchState.throttle = -1;
      else if (touchState.throttle < 0) touchState.throttle = 0;
    });
  }

  function startGame() {
    clearAutoStart();
    try {
      try { ensureAudio(); } catch (_) {}
      // Always start on Grid City from the title screen
      const needRebuild = !worldReady || selectedMapId !== "city";
      selectedMapId = "city";
      persist();
      renderMapPicker();
      if (needRebuild) {
        buildWorld();
        spawnNpcs();
        applyCarSpec(selectedCarId);
      } else {
        spawnPedestrians();
      }
      car.health = 100;
      car.slip = 0;
      car.steerAngle = 0;
      car.gear = 1;
      car.suspY = 0;
      car.suspV = 0;
      if (carMesh) carMesh.visible = true;
      car.x = SPAWN_TX * TILE;
      car.z = SPAWN_TZ * TILE;
      car.vx = car.vz = car.av = 0;
      car.angle = 0;
      car.vy = 0;
      car.grounded = true;
      car.y = heightAt(car.x, car.z);
      camReady = false;
      camLook.x = car.x;
      camLook.y = car.y + 1.35;
      camLook.z = car.z + 5;
      playing = true;
      overlay.hidden = true;
      panelTitle.hidden = true;
      panelGarage.hidden = true;
      panelWrecked.hidden = true;
      hud.hidden = false;
      setupTouch();
      updateHud();
      showMsg("Pursuit cars are hunting you — outrun or wreck them");
    } catch (err) {
      console.error(err);
      if (bootError) {
        bootError.hidden = false;
        bootError.textContent = "Could not start: " + (err && err.message ? err.message : err);
      }
      beginAutoStart();
    }
  }

  let autoStartTimer = null;
  let autoStartLeft = 5;
  const autoStartSec = document.getElementById("auto-start-sec");

  function clearAutoStart() {
    if (autoStartTimer) {
      clearTimeout(autoStartTimer);
      autoStartTimer = null;
    }
  }

  function beginAutoStart() {
    clearAutoStart();
    autoStartLeft = 5;
    function secEl() {
      return document.getElementById("auto-start-sec");
    }
    if (secEl()) secEl().textContent = worldReady ? String(autoStartLeft) : "…";
    function tick() {
      if (playing || overlay.hidden || panelTitle.hidden) {
        clearAutoStart();
        return;
      }
      if (!worldReady) {
        if (secEl()) secEl().textContent = "…";
        autoStartTimer = setTimeout(tick, 200);
        return;
      }
      if (secEl()) secEl().textContent = String(Math.max(0, autoStartLeft));
      if (autoStartLeft <= 0) {
        clearAutoStart();
        startGame();
        return;
      }
      autoStartLeft -= 1;
      autoStartTimer = setTimeout(tick, 1000);
    }
    autoStartTimer = setTimeout(tick, 0);
  }

  let hudTick = 0;
  let fxTick = 0;

  function loop() {
    const rawDt = Math.min(0.033, clock.getDelta());
    let dt = rawDt;
    // Crash hitstop — short time dilation so heavy impacts feel weighty
    if (impactSlow > 0) {
      const scale = 0.12 + 0.4 * (1 - Math.min(1, impactSlow / 0.18));
      dt *= scale;
      impactSlow = Math.max(0, impactSlow - rawDt);
    }
    try {
      if (playing) {
        readInput();
        updateDriving(dt);
        updateNpcs(dt);
        updatePedestrians(dt);
        if ((hudTick = (hudTick + 1) % 3) === 0) updateHud();
      }
      updateParticles(dt);
      // Grass wind — every frame for smooth sway
      if (grassWindMats.length) {
        const t = clock.elapsedTime;
        for (let i = 0; i < grassWindMats.length; i++) {
          const sh = grassWindMats[i].userData.shader;
          if (sh && sh.uniforms && sh.uniforms.uTime) sh.uniforms.uTime.value = t;
        }
      }
      // Ambient world motion — every 4th frame
      if ((fxTick = (fxTick + 1) % 4) === 0) {
        const t = clock.elapsedTime;
        for (const fx of worldFx) {
          if (fx.kind === "sparkle" && fx.mesh.material) {
            fx.mesh.material.opacity = 0.1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.6 + fx.phase));
            fx.mesh.scale.setScalar(0.92 + 0.12 * Math.sin(t * 0.9 + fx.phase));
          } else if (fx.kind === "reed") {
            fx.mesh.rotation.z = Math.sin(t * 1.8 + fx.phase) * 0.12;
          } else if (fx.kind === "lily") {
            fx.mesh.position.y = fx.baseY + Math.sin(t * 1.3 + fx.phase) * 0.03;
            fx.mesh.rotation.z = Math.sin(t * 0.7 + fx.phase) * 0.08;
          } else if (fx.kind === "flock") {
            fx.mesh.position.x = fx.baseX + Math.sin(t * 0.25 + fx.phase) * 40;
            fx.mesh.position.z = fx.baseZ + Math.cos(t * 0.2 + fx.phase) * 30;
            fx.mesh.position.y = fx.baseY + Math.sin(t * 0.8 + fx.phase) * 2;
            fx.mesh.rotation.y = t * 0.15 + fx.phase;
          }
        }
        for (const cloud of ambientClouds) {
          const d = cloud.userData.drift;
          if (!d) continue;
          const ang = d.ang + t * 0.012;
          cloud.position.x = WORLD_W / 2 + Math.cos(ang) * d.dist;
          cloud.position.z = WORLD_H / 2 + Math.sin(ang) * d.dist;
          cloud.position.y = d.baseY + Math.sin(t * 0.2 + d.phase) * 1.5;
        }
      }
      syncCarMesh();
      updateCamera(dt);
      renderer.render(scene, camera);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener("keydown", (e) => {
    keys.add(e.key);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    if ((e.key === "g" || e.key === "G") && playing) openGarage();
    if ((e.key === "r" || e.key === "R") && playing) repairCar();
    if ((e.key === "c" || e.key === "C") && playing) {
      cameraMode = (cameraMode + 1) % 3;
      showMsg(cameraMode === 0 ? "Chase cam" : cameraMode === 1 ? "High cam" : "Hood cam");
    }
    if ((e.key === "Enter" || e.key === " ") && !playing && !overlay.hidden && !panelTitle.hidden) {
      startGame();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key));

  btnStart.addEventListener("click", startGame);
  document.getElementById("btn-garage").addEventListener("click", openGarage);
  document.getElementById("btn-close-garage").addEventListener("click", closeGarageAndDrive);
  document.getElementById("btn-drive").addEventListener("click", closeGarageAndDrive);
  document.getElementById("btn-repair").addEventListener("click", repairCar);
  document.getElementById("btn-respawn").addEventListener("click", () => {
    panelWrecked.hidden = true;
    overlay.hidden = true;
    respawn();
    playing = true;
  });

  // Build Grid City right away — don't wait on GLTF packs (those can hang boot)
  updateCashUI();
  renderMapPicker();

  let modelsWorldApplied = false;
  let carsWorldApplied = false;

  function snapDriveState() {
    return {
      x: car.x,
      z: car.z,
      y: car.y,
      angle: car.angle,
      vx: car.vx,
      vz: car.vz,
      vy: car.vy,
      health: car.health,
      playing: playing,
    };
  }

  function restoreDriveState(snap) {
    if (!snap) return;
    car.x = snap.x;
    car.z = snap.z;
    car.y = heightAt(snap.x, snap.z);
    car.angle = snap.angle;
    car.vx = snap.vx;
    car.vz = snap.vz;
    car.vy = snap.vy || 0;
    car.health = snap.health;
    playing = snap.playing;
    if (snap.playing) {
      overlay.hidden = true;
      panelTitle.hidden = true;
      panelGarage.hidden = true;
      panelWrecked.hidden = true;
      hud.hidden = false;
    }
  }

  function applyLoadedModelsToWorld() {
    if (!scene || modelsWorldApplied) return;
    if (!window.OpenRoadsModels) return;
    const richEnough =
      window.OpenRoadsModels.ready() ||
      (window.OpenRoadsModels.hasKind &&
        (window.OpenRoadsModels.hasKind("building") || window.OpenRoadsModels.hasKind("buildingTall"))) ||
      (window.OpenRoadsModels.hasKind && window.OpenRoadsModels.hasKind("tree") && window.OpenRoadsModels.hasKind("lamp"));
    if (!richEnough) return;
    modelsWorldApplied = true;
    const snap = worldReady ? snapDriveState() : null;
    try {
      buildWorld();
      spawnNpcs();
      applyCarSpec(selectedCarId);
      if (snap) restoreDriveState(snap);
      else {
        camera.position.set(car.x - 12, car.y + 9, car.z + 12);
        camera.lookAt(car.x, car.y + 1, car.z);
      }
      if (playing) showMsg("3D models loaded");
      const lede = document.querySelector("#panel-title .lede");
      if (lede && !playing) {
        if (!document.getElementById("auto-start-sec")) {
          lede.innerHTML = 'Grid City free roam — starting in <span id="auto-start-sec">5</span>s';
        }
      }
    } catch (err) {
      console.warn("Model world refresh failed", err);
      modelsWorldApplied = false;
    }
  }

  function applyLoadedCars() {
    if (!scene) return;
    if (!window.OpenRoadsCars) return;
    // Prefer a real player-car mesh as soon as that file is cached
    try {
      applyCarSpec(selectedCarId);
      if (worldReady && window.OpenRoadsCars.ready()) spawnNpcs();
      carsWorldApplied = !!window.OpenRoadsCars.ready();
    } catch (err) {
      console.warn("Car model refresh failed", err);
    }
  }

  function finishBootWorld() {
    if (worldReady) return;
    try {
      selectedMapId = "city";
      buildWorld();
      spawnNpcs();
      applyCarSpec(selectedCarId);
      camera.position.set(car.x - 12, car.y + 9, car.z + 12);
      camera.lookAt(car.x, car.y + 1, car.z);
    } catch (err) {
      fail("World build failed: " + (err && err.message ? err.message : err));
      console.error(err);
      return;
    }
    beginAutoStart();
    applyLoadedModelsToWorld();
    applyLoadedCars();
  }

  // Start GLTF packs immediately so they can finish before / during play
  (function startModelPacks() {
    const lede = document.querySelector("#panel-title .lede");
    if (lede) lede.textContent = "Loading 3D models…";
    try { if (window.OpenRoadsCircuit) window.OpenRoadsCircuit.load(function () { applyLoadedCars(); }); } catch (e) { console.warn(e); }
    try { if (window.OpenRoadsModels) window.OpenRoadsModels.load(function () { applyLoadedModelsToWorld(); }); } catch (e) { console.warn(e); }
    try { if (window.OpenRoadsCars) window.OpenRoadsCars.load(function () { applyLoadedCars(); }); } catch (e) { console.warn(e); }
    // Progressive upgrade while packs stream in
    let enrichPass = 0;
    const enrichTimer = setInterval(function () {
      enrichPass += 1;
      applyLoadedModelsToWorld();
      applyLoadedCars();
      if ((modelsWorldApplied && carsWorldApplied) || enrichPass > 60) clearInterval(enrichTimer);
    }, 1000);
  })();
  // Placeholder city so Start / auto-start always have a world
  requestAnimationFrame(function () {
    finishBootWorld();
  });
  loop();
})();

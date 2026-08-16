(function () {
  if (typeof THREE === "undefined") return;
  if (THREE.sRGBEncoding === undefined) THREE.sRGBEncoding = 3001;
  if (THREE.LinearEncoding === undefined) THREE.LinearEncoding = 3000;

  // One unique mesh file per garage car. HQ sports car uses dedicated loader path.
  // yaw 0 — Kenney/sample cars already face +Z (do not flip 180).
  // keepLook skips garage paint tint so authored textures stay intact.
  // lazy: load in background after Kenney pack so boot is not blocked by big GLBs.
  const CAR_SPEC = {
    hatch: { file: "hatchback-sports.glb" },
    mini: { file: "kart-oobi.glb" },
    sedan: { file: "sedan.glb" },
    wagon: { file: "milktruck.glb" },
    coupe: { file: "sedan-sports.glb" },
    taxi: { file: "taxi.glb" },
    classic: { file: "tractor.glb" },
    suv: { file: "suv.glb" },
    trailkit: { file: "tractor-shovel.glb" },
    truck: { file: "truck.glb" },
    pickup: { file: "truck-flat.glb" },
    van: { file: "van.glb" },
    ambulance: { file: "ambulance.glb" },
    buggy: { file: "kart-oodi.glb" },
    rally: { file: "race.glb" },
    drift: { file: "raceCarOrange.glb" },
    roadster: { file: "raceCarWhite.glb" },
    muscle: { file: "raceCarRed.glb" },
    electric: { file: "race-future.glb" },
    police: { file: "police.glb" },
    gt: { file: "raceCarGreen.glb" },
    circuit: { circuit: true },
    wedge: { file: "lambo.glb", yaw: 0 },
    spike: { file: "egoista.glb", keepLook: true, lazy: true },
    rocketbike: { file: "rocketbike.glb", keepLook: true, lazy: true },
    tailspin: { file: "porsche.glb", keepLook: true, lazy: true },
    pint: { file: "fiat.glb", keepLook: true, lazy: true },
    serpent: { file: "cobra.glb", keepLook: true, lazy: true },
    rail: { file: "audi.glb", keepLook: true, lazy: true },
    knife: { file: "countach.glb", keepLook: true, lazy: true },
    boost: { file: "f40.glb", keepLook: true, lazy: true },
    fold: { file: "cybertruck.glb", lazy: true },
    hatchx: { file: "mercedes.glb", keepLook: true, lazy: true },
    stripe: { file: "bmw.glb", keepLook: true, lazy: true },
    stampede: { file: "mustang.glb", lazy: true },
    sportback: { file: "suv-luxury.glb" },
    hyper: { file: "kart-ooli.glb" },
    limo: { file: "delivery-flat.glb" },
    fire: { file: "firetruck.glb" },
    proto: { file: "kart-oopi.glb" },
    super: { file: "kart-oozi.glb" },
    warp: { file: "warp.glb", yaw: Math.PI },
  };

  // Leftover unique meshes for traffic variety
  const NPC_POOL = [
    "sedan.glb", "taxi.glb", "suv.glb", "hatchback-sports.glb", "sedan-sports.glb",
    "van.glb", "police.glb", "truck.glb", "race.glb", "race-future.glb",
    "ambulance.glb", "suv-luxury.glb", "delivery.glb", "raceCarRed.glb", "raceCarGreen.glb",
    "garbage-truck.glb", "firetruck.glb", "tractor-police.glb", "toycar.glb", "milktruck.glb",
    "kart-ooli.glb", "kart-oopi.glb", "kart-oozi.glb", "raceCarOrange.glb", "raceCarWhite.glb",
  ];

  const cache = Object.create(null);
  const waiters = [];
  let loading = false;
  let readyFlag = false;
  let lazyStarted = false;
  let sharedLoader = null;

  function getLoader() {
    if (sharedLoader) return sharedLoader;
    if (typeof THREE.GLTFLoader !== "function") return null;
    sharedLoader = new THREE.GLTFLoader();
    if (typeof THREE.DRACOLoader === "function") {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      sharedLoader.setDRACOLoader(draco);
    }
    return sharedLoader;
  }

  function allFiles(includeLazy) {
    const set = Object.create(null);
    Object.keys(CAR_SPEC).forEach(function (id) {
      const s = CAR_SPEC[id];
      if (!s || !s.file) return;
      if (!includeLazy && s.lazy) return;
      set[s.file] = true;
    });
    if (!includeLazy) {
      NPC_POOL.forEach(function (f) { set[f] = true; });
    }
    return Object.keys(set);
  }

  function brandLabel(text) {
    if (!text) return false;
    const s = String(text).toLowerCase();
    return /logo|badge|emblem|sticker|decal|plate|brand|wordmark|trademark|ferrari|lambo|lamborghini|porsche|mercedes|bmw|audi|mustang|fiat|ford|chevy|chevrolet|toyota|honda|nissan|countach|egoista|gallardo|huracan|f40|cybertruck|tesla|bugatti|mclaren|script|text[-_ ]?logo|number[-_ ]?plate|license/.test(s);
  }

  function scrubBranding(root) {
    if (!root) return root;
    root.traverse(function (child) {
      const nm = (child.name || "");
      if (brandLabel(nm)) {
        child.visible = false;
        return;
      }
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      let hide = false;
      mats.forEach(function (m) {
        if (!m) return;
        if (brandLabel(m.name)) hide = true;
        const maps = [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.emissiveMap, m.aoMap];
        maps.forEach(function (tex) {
          if (!tex) return;
          const src = (tex.name || "") + " " + (tex.image && (tex.image.currentSrc || tex.image.src) || "");
          if (brandLabel(src) || brandLabel(tex.name)) hide = true;
        });
      });
      // Tiny floating badge / plate meshes often unnamed but use logo maps
      if (hide) {
        child.visible = false;
        return;
      }
    });
    return root;
  }

  function prepare(scene) {
    scene.traverse(function (child) {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (m) {
          if (m.map && THREE.SRGBColorSpace) m.map.colorSpace = THREE.SRGBColorSpace;
          // Without an IBL env map, high metalness reads almost black outdoors — keep it moderate
          if (m.metalness != null) m.metalness = Math.min(0.42, (m.metalness || 0) * 0.55);
          if (m.roughness != null) m.roughness = Math.min(0.85, Math.max(0.28, (m.roughness || 0.5) * 1.05));
          if (m.color && m.color.isColor) m.color.offsetHSL(0, 0.02, 0.08);
          if (m.envMapIntensity != null) m.envMapIntensity = Math.max(m.envMapIntensity, 1.35);
          else m.envMapIntensity = 1.35;
          m.needsUpdate = true;
        });
      }
    });
    scrubBranding(scene);
    return scene;
  }

  function brightenClone(root) {
    if (!root) return root;
    root.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach(function (m) {
        if (!m) return;
        if (m.metalness != null) m.metalness = Math.min(m.metalness, 0.48);
        if (m.roughness != null && m.roughness < 0.22) m.roughness = 0.26;
        if (m.color && m.color.isColor) {
          const hsl = { h: 0, s: 0, l: 0 };
          m.color.getHSL(hsl);
          if (hsl.l < 0.22) m.color.offsetHSL(0, 0, 0.12);
          else m.color.offsetHSL(0, 0.01, 0.05);
        }
        if (m.envMapIntensity == null) m.envMapIntensity = 1.4;
        else m.envMapIntensity = Math.max(m.envMapIntensity, 1.4);
        m.needsUpdate = true;
      });
    });
    return root;
  }

  function flush() {
    while (waiters.length) {
      const fn = waiters.shift();
      try { fn(readyFlag); } catch (e) { console.warn(e); }
    }
  }

  function loadOne(loader, file, onDone) {
    loader.load(
      "models/cars/" + file,
      function (gltf) {
        cache[file] = prepare(gltf.scene);
        if (onDone) onDone(true);
      },
      undefined,
      function () {
        console.warn("Car model failed:", file);
        if (onDone) onDone(false);
      }
    );
  }

  function startLazyLoads() {
    if (lazyStarted) return;
    lazyStarted = true;
    const loader = getLoader();
    if (!loader) return;
    allFiles(true).forEach(function (file) {
      if (cache[file]) return;
      // only files marked lazy in CAR_SPEC
      let isLazy = false;
      Object.keys(CAR_SPEC).forEach(function (id) {
        const s = CAR_SPEC[id];
        if (s && s.file === file && s.lazy) isLazy = true;
      });
      if (!isLazy) return;
      loadOne(loader, file);
    });
  }

  function load(done) {
    if (done) waiters.push(done);
    if (readyFlag) { flush(); startLazyLoads(); return; }
    if (loading) return;
    const loader = getLoader();
    if (!loader) {
      readyFlag = true;
      flush();
      return;
    }
    loading = true;

    const files = allFiles(false);
    let pending = files.length;
    let settled = false;
    let cursor = 0;
    let active = 0;
    const CONCURRENCY = 6;

    function settle() {
      if (settled) return;
      settled = true;
      readyFlag = true;
      loading = false;
      flush();
      startLazyLoads();
    }

    function pump() {
      if (settled) return;
      while (active < CONCURRENCY && cursor < files.length) {
        const file = files[cursor++];
        active += 1;
        loadOne(loader, file, function () {
          active -= 1;
          pending -= 1;
          if (pending <= 0) settle();
          else pump();
        });
      }
    }

    setTimeout(settle, 45000);
    if (!pending) {
      settle();
      return;
    }
    pump();
  }

  function ensure(carId, done) {
    const spec = CAR_SPEC[carId];
    if (!spec) { if (done) done(false); return; }
    if (spec.circuit) {
      if (done) done(!!(window.OpenRoadsCircuit && window.OpenRoadsCircuit.ready()));
      return;
    }
    if (cache[spec.file]) { if (done) done(true); return; }
    const loader = getLoader();
    if (!loader) { if (done) done(false); return; }
    loadOne(loader, spec.file, done);
  }

  function groundToFloor(root) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (!isFinite(box.min.y) || !isFinite(box.min.x)) return root;
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.updateMatrixWorld(true);
    box.setFromObject(root);
    root.position.y -= box.min.y;
    return root;
  }

  function fitLength(root, targetLen) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const longest = Math.max(size.x, size.z, 0.001);
    if (targetLen) root.scale.multiplyScalar(targetLen / longest);
    return groundToFloor(root);
  }

  function tintBody(root, colorHex) {
    if (colorHex == null) return;
    let painted = false;
    root.traverse(function (child) {
      if (!child.isMesh || !child.material) return;
      const name = (child.name || "").toLowerCase();
      if (/wheel|tire|glass|window|light|rim|tyre/.test(name)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      const next = mats.map(function (m) {
        const c = m.clone();
        if (c.color && (/body|hull|chassis|paint|car|mesh/.test(name) || !painted)) {
          c.color.setHex(colorHex);
          painted = true;
        }
        return c;
      });
      child.material = Array.isArray(child.material) ? next : next[0];
    });
    if (!painted) {
      let best = null;
      let bestArea = 0;
      root.traverse(function (child) {
        if (!child.isMesh || !child.geometry) return;
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        const b = child.geometry.boundingBox;
        if (!b) return;
        const area = (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
        if (area > bestArea) { bestArea = area; best = child; }
      });
      if (best && best.material) {
        best.material = best.material.clone();
        if (best.material.color) best.material.color.setHex(colorHex);
      }
    }
  }

  function finishSteelFold(root) {
    // LOD1 + windshield "crack" deco sit on top of the real body — drop them
    root.traverse(function (child) {
      const n = (child.name || "").toLowerCase();
      if (/lod1/.test(n) || n === "crack") {
        child.visible = false;
        return;
      }
      if (!child.isMesh) return;
      // orphan crack mesh is named "0"
      if (n === "0" || /glass_crack/.test(n)) {
        child.visible = false;
        return;
      }

      let mat;
      if (/tire|rubber/.test(n)) {
        mat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.05, roughness: 0.92 });
      } else if (/light/.test(n)) {
        mat = new THREE.MeshStandardMaterial({
          color: 0xf4f7ff,
          emissive: 0xdde8ff,
          emissiveIntensity: 0.85,
          metalness: 0.35,
          roughness: 0.25,
        });
      } else if (/glass/.test(n)) {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x1a2228,
          metalness: 0.1,
          roughness: 0.08,
          transmission: 0.55,
          transparent: true,
          opacity: 0.72,
          thickness: 0.4,
        });
      } else if (/gray|steer/.test(n)) {
        mat = new THREE.MeshStandardMaterial({ color: 0x2a2e32, metalness: 0.85, roughness: 0.35 });
      } else {
        // Exo-steel body panels
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xd4d8dc,
          metalness: 0.35,
          roughness: 0.38,
          envMapIntensity: 1.45,
          clearcoat: 0.25,
          clearcoatRoughness: 0.2,
          emissive: 0xb8bcc0,
          emissiveIntensity: 0.04,
        });
      }
      child.material = mat;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const brakeMats = [];
    root.traverse(function (child) {
      if (!child.isMesh || !child.visible) return;
      const n = (child.name || "").toLowerCase();
      if (/light/.test(n) && child.material && child.material.emissive) {
        brakeMats.push(child.material);
      }
    });
    root.userData.brakeLights = brakeMats;
  }

  function paintWarpBody(root, colorHex) {
    const paintHex = colorHex != null ? colorHex : 0xffe14a;
    const paint = new THREE.MeshPhysicalMaterial({
      color: paintHex,
      metalness: 0.32,
      roughness: 0.28,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.55,
      emissive: paintHex,
      emissiveIntensity: 0.05,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x1c1e24, metalness: 0.3, roughness: 0.5 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x1a2838,
      metalness: 0.1,
      roughness: 0.08,
      transparent: true,
      opacity: 0.55,
      transmission: 0.35,
      envMapIntensity: 1.6,
    });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8e0e8, metalness: 0.6, roughness: 0.25, envMapIntensity: 1.5 });
    const head = new THREE.MeshStandardMaterial({
      color: 0xf5f8ff,
      emissive: 0xdde8ff,
      emissiveIntensity: 0.8,
      metalness: 0.12,
      roughness: 0.25,
    });
    const tail = new THREE.MeshStandardMaterial({
      color: 0xff2a2a,
      emissive: 0xff2020,
      emissiveIntensity: 0.95,
      metalness: 0.15,
      roughness: 0.35,
    });
    const rubber = new THREE.MeshStandardMaterial({ color: 0x141418, metalness: 0.05, roughness: 0.9 });

    root.traverse(function (child) {
      // Undo brand scrub that hid Ferrari-named meshes
      child.visible = true;
      if (!child.isMesh) return;
      const n = (child.name || "").toLowerCase();
      let mat = paint;
      if (/glass|window|windshield|screen/.test(n)) mat = glass;
      else if (/headlight|head_light|lamp_f|light_f/.test(n)) mat = head;
      else if (/taillight|tail_light|lamp_r|light_r|brake/.test(n)) mat = tail;
      else if (/wheel|tire|tyre|rim|disc/.test(n)) mat = rubber;
      else if (/bumper|grille|grill|exhaust|muffler|chassis|under|carbon/.test(n)) mat = black;
      else if (/mirror|chrome|trim/.test(n)) mat = chrome;
      else if (/interior|seat|cabin|cockpit/.test(n)) mat = black;
      child.material = mat.clone();
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const brakeMats = [];
    root.traverse(function (child) {
      if (!child.isMesh) return;
      if (/taillight|tail_light|brake/.test((child.name || "").toLowerCase())) brakeMats.push(child.material);
    });
    root.userData.brakeLights = brakeMats;
  }

  function paintWedgeBody(root, colorHex) {
    const paintHex = colorHex != null ? colorHex : 0xc8102e;
    const paint = new THREE.MeshPhysicalMaterial({
      color: paintHex,
      metalness: 0.28,
      roughness: 0.32,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.5,
      emissive: paintHex,
      emissiveIntensity: 0.06,
    });
    const black = new THREE.MeshStandardMaterial({ color: 0x2a2c32, metalness: 0.25, roughness: 0.55 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8e0e8, metalness: 0.55, roughness: 0.28, envMapIntensity: 1.4 });
    const head = new THREE.MeshStandardMaterial({
      color: 0xf5f8ff,
      emissive: 0xdde8ff,
      emissiveIntensity: 0.75,
      metalness: 0.15,
      roughness: 0.28,
    });
    const tail = new THREE.MeshStandardMaterial({
      color: 0xff1a1a,
      emissive: 0xff2020,
      emissiveIntensity: 0.9,
      metalness: 0.15,
      roughness: 0.35,
    });

    root.traverse(function (child) {
      if (!child.isMesh) return;
      const n = (child.name || "").toLowerCase();
      let mat = paint;
      if (/headlight/.test(n)) mat = head;
      else if (/taillight/.test(n)) mat = tail;
      else if (/bumper|muffler/.test(n)) mat = black;
      else if (/mirror/.test(n)) mat = chrome;
      child.material = mat.clone();
      child.castShadow = true;
      child.receiveShadow = true;
    });

    const brakeMats = [];
    root.traverse(function (child) {
      if (!child.isMesh) return;
      if (/taillight/.test((child.name || "").toLowerCase())) brakeMats.push(child.material);
    });
    root.userData.brakeLights = brakeMats;
  }

  function addWedgeWheels(root) {
    const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.05, roughness: 0.88 });
    const rim = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 0.45, roughness: 0.32, envMapIntensity: 1.35 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe0e8f0, metalness: 0.5, roughness: 0.3, envMapIntensity: 1.35 });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const wheelR = Math.max(0.28, Math.min(0.4, size.y * 0.32));
    const wheelY = wheelR;
    const halfW = size.x * 0.42;
    const frontZ = box.min.z + size.z * 0.78;
    const rearZ = box.min.z + size.z * 0.22;
    // Convert world axle points into root local space
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const wheels = [];
    [
      { x: center.x + halfW, z: frontZ, front: true },
      { x: center.x - halfW, z: frontZ, front: true },
      { x: center.x + halfW * 1.02, z: rearZ, front: false },
      { x: center.x - halfW * 1.02, z: rearZ, front: false },
    ].forEach(function (a) {
      const world = new THREE.Vector3(a.x, box.min.y + wheelY, a.z);
      const local = world.clone().applyMatrix4(inv);
      const pivot = new THREE.Group();
      pivot.position.copy(local);
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, wheelR * 0.72, 14), rubber);
      tire.rotation.z = Math.PI / 2;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.58, wheelR * 0.58, wheelR * 0.78, 12), rim);
      disc.rotation.z = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(wheelR * 0.22, wheelR * 0.22, wheelR * 0.82, 8), chrome);
      hub.rotation.z = Math.PI / 2;
      const spin = new THREE.Group();
      spin.add(tire);
      spin.add(disc);
      spin.add(hub);
      // Undo non-uniform root scale so tires stay round
      const sx = Math.abs(root.scale.x) || 1;
      const sy = Math.abs(root.scale.y) || 1;
      const sz = Math.abs(root.scale.z) || 1;
      spin.scale.set(1, sx / sy, sx / sz);
      pivot.add(spin);
      root.add(pivot);
      wheels.push({
        pivot: pivot,
        spin: spin,
        front: a.front,
        steerSign: 1,
        baseY: local.y,
        localX: local.x,
        localZ: local.z,
        restX: 0,
      });
    });
    root.userData.wheels = wheels;
  }

  function cloneFile(file, opts) {
    opts = opts || {};
    const src = cache[file];
    if (!src) return null;
    const g = new THREE.Group();
    const mesh = src.clone(true);
    mesh.rotation.order = "XYZ";
    mesh.rotation.x = opts.pitch || 0;
    mesh.rotation.y = opts.yaw != null ? opts.yaw : 0;
    mesh.rotation.z = opts.roll || 0;
    g.add(mesh);
    if (file === "lambo.glb") paintWedgeBody(g, opts.color);
    else if (file === "cybertruck.glb") finishSteelFold(g);
    else if (file === "warp.glb") {
      scrubBranding(g);
      paintWarpBody(g, opts.color);
    } else if (!opts.keepLook) {
      tintBody(g, opts.color);
      scrubBranding(g);
    } else {
      scrubBranding(g);
    }
    if (file !== "warp.glb") brightenClone(g);
    fitLength(g, opts.length || 4.0);
    if (opts.heightScale) g.scale.y *= opts.heightScale;
    if (file === "lambo.glb") addWedgeWheels(g);
    // heightScale / added wheels shift the AABB — ground again so tires sit on y=0
    groundToFloor(g);
    if (file !== "warp.glb") brightenClone(g);
    if (!g.userData.wheels) g.userData.wheels = [];
    if (!g.userData.brakeLights) g.userData.brakeLights = [];
    g.userData.gltfCar = true;
    g.userData.carFile = file;
    return g;
  }

  function cloneCar(carId, opts) {
    opts = opts || {};
    const spec = CAR_SPEC[carId];
    if (!spec) return null;

    if (spec.circuit) {
      if (window.OpenRoadsCircuit && window.OpenRoadsCircuit.ready()) {
        return window.OpenRoadsCircuit.clone({
          color: opts.color,
          accent: opts.accent,
          scaleX: opts.scaleX,
          scaleY: opts.scaleY,
          scaleZ: opts.scaleZ,
        });
      }
      return null;
    }

    return cloneFile(spec.file, {
      color: opts.color,
      yaw: spec.yaw != null ? spec.yaw : 0,
      pitch: spec.pitch || 0,
      roll: spec.roll || 0,
      length: opts.length || 4.0,
      heightScale: opts.heightScale,
      keepLook: !!spec.keepLook,
    });
  }

  function cloneNpc(index, color) {
    const file = NPC_POOL[index % NPC_POOL.length];
    return cloneFile(file, {
      color: color,
      yaw: 0,
      length: 3.6 + (index % 5) * 0.15,
    });
  }

  window.OpenRoadsCars = {
    load: load,
    ensure: ensure,
    ready: function () { return readyFlag; },
    cloneCar: cloneCar,
    cloneNpc: cloneNpc,
    fileFor: function (id) {
      const s = CAR_SPEC[id];
      if (!s) return null;
      return s.circuit ? "circuit" : s.file;
    },
    files: CAR_SPEC,
  };
})();

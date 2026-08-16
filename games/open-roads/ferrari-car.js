(function () {
  if (typeof THREE === "undefined") return;
  if (THREE.sRGBEncoding === undefined) THREE.sRGBEncoding = 3001;
  if (THREE.LinearEncoding === undefined) THREE.LinearEncoding = 3000;

  let template = null;
  const waiters = [];

  function wrapWheel(wheel) {
    if (!wheel) return null;
    const pivot = new THREE.Group();
    pivot.name = wheel.name + "_steer";
    wheel.parent.add(pivot);
    pivot.position.copy(wheel.position);
    wheel.position.set(0, 0, 0);
    pivot.add(wheel);
    return pivot;
  }

  function prepare(gltf) {
    const carModel = gltf.scene.children[0];
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xff0000,
      metalness: 0.32,
      roughness: 0.34,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5,
      emissive: 0xff0000,
      emissiveIntensity: 0.05,
    });
    const detailsMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.45,
      roughness: 0.35,
      envMapIntensity: 1.35,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.08,
      transmission: 0.85,
      transparent: true,
      opacity: 0.85,
    });
    const body = carModel.getObjectByName("body");
    if (body) body.material = bodyMat;
    ["rim_fl", "rim_fr", "rim_rl", "rim_rr", "trim"].forEach(function (name) {
      const n = carModel.getObjectByName(name);
      if (n) n.material = detailsMat;
    });
    const glass = carModel.getObjectByName("glass");
    if (glass) glass.material = glassMat;

    wrapWheel(carModel.getObjectByName("wheel_fr"));
    wrapWheel(carModel.getObjectByName("wheel_fl"));
    wrapWheel(carModel.getObjectByName("wheel_rr"));
    wrapWheel(carModel.getObjectByName("wheel_rl"));

    carModel.traverse(function (child) {
      if (!child.isMesh) return;
      const nm = (child.name || "").toLowerCase();
      if (/logo|badge|emblem|sticker|plate|ferrari|brand|decal/.test(nm)) {
        child.visible = false;
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material && child.material.map && THREE.SRGBColorSpace) {
        child.material.map.colorSpace = THREE.SRGBColorSpace;
      }
    });

    const root = new THREE.Group();
    root.name = "circuit";
    carModel.rotation.y = Math.PI;
    root.add(carModel);
    return root;
  }

  function clone(opts) {
    if (!template) return null;
    opts = opts || {};
    const g = template.clone(true);
    const sx = opts.scaleX != null ? opts.scaleX : 1;
    const sy = opts.scaleY != null ? opts.scaleY : 1;
    const sz = opts.scaleZ != null ? opts.scaleZ : 1;
    g.scale.set(sx, sy, sz);

    // Recolor body paint (clone material so instances don't share)
    const body = g.getObjectByName("body");
    if (body && body.material) {
      body.material = body.material.clone();
      if (opts.color != null) {
        body.material.color.setHex(opts.color);
        if (body.material.emissive) {
          body.material.emissive.setHex(opts.color);
          body.material.emissiveIntensity = 0.05;
        }
      }
      if (body.material.metalness != null) body.material.metalness = Math.min(0.35, body.material.metalness);
    }
    const trim = g.getObjectByName("trim");
    if (trim && trim.material && opts.accent != null) {
      trim.material = trim.material.clone();
      trim.material.color.setHex(opts.accent);
      if (trim.material.metalness != null) trim.material.metalness = Math.min(0.5, trim.material.metalness);
    }

    // Sit tires on y=0 after non-uniform scale
    g.updateMatrixWorld(true);
    const groundBox = new THREE.Box3().setFromObject(g);
    if (isFinite(groundBox.min.y)) g.position.y -= groundBox.min.y;

    const wheels = [];
    const wp = new THREE.Vector3();
    g.updateMatrixWorld(true);
    ["wheel_fr_steer", "wheel_fl_steer", "wheel_rr_steer", "wheel_rl_steer"].forEach(function (name) {
      const pivot = g.getObjectByName(name);
      if (!pivot) return;
      const spin = pivot.children[0];
      pivot.getWorldPosition(wp);
      g.worldToLocal(wp);
      wheels.push({
        pivot: pivot,
        spin: spin,
        front: wp.z > 0.2,
        baseY: wp.y,
        localX: wp.x,
        localZ: wp.z,
        restX: spin ? spin.rotation.x : -Math.PI / 2,
        steerSign: -1,
      });
    });
    g.userData.wheels = wheels;
    const brakeLights = [];
    g.traverse(function (child) {
      if (!child.isMesh) return;
      child.castShadow = true;
      if (child.name === "lights_red") {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0xff1008);
        child.material.emissiveIntensity = 0.5;
        brakeLights.push(child.material);
      }
    });
    g.userData.brakeLights = brakeLights;
    g.userData.gltfCar = true;
    return g;
  }

  function flush() {
    while (waiters.length) {
      const fn = waiters.shift();
      try { fn(template); } catch (e) { console.warn(e); }
    }
  }

  function load(done) {
    if (done) waiters.push(done);
    if (template) {
      flush();
      return;
    }
    if (typeof THREE.GLTFLoader !== "function" || typeof THREE.DRACOLoader !== "function") {
      flush();
      return;
    }
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    const loader = new THREE.GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load(
      "models/ferrari.glb",
      function (gltf) {
        template = prepare(gltf);
        flush();
      },
      undefined,
      function (err) {
        console.warn("Sports car model failed to load", err);
        flush();
      }
    );
  }

  window.OpenRoadsCircuit = {
    load: load,
    clone: clone,
    ready: function () { return !!template; },
  };
})();

  // Compat alias for older hooks
  window.OpenRoadsFerrari = window.OpenRoadsCircuit;

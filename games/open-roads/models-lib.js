(function () {
  if (typeof THREE === "undefined") return;
  if (THREE.sRGBEncoding === undefined) THREE.sRGBEncoding = 3001;
  if (THREE.LinearEncoding === undefined) THREE.LinearEncoding = 3000;

  const cache = Object.create(null);
  const waiters = [];
  let loading = false;
  let readyFlag = false;

  const CATALOG = {
    tree: [
      "tree_default.glb", "tree_oak.glb", "tree_pineDefaultA.glb", "tree_pineDefaultB.glb",
      "tree_detailed.glb", "tree_cone.glb", "tree_tall.glb", "tree_fat.glb", "tree_simple.glb", "tree_small.glb",
    ],
    rock: [
      "rock_largeA.glb", "rock_largeB.glb", "rock_largeC.glb", "rock_smallA.glb", "rock_smallB.glb",
      "rock_largeD.glb", "rock_largeE.glb",
    ],
    bush: [
      "plant_bush.glb", "plant_bushDetailed.glb", "plant_bushLarge.glb", "plant_bushSmall.glb", "grass_large.glb",
    ],
    building: [
      "building-type-a.glb", "building-type-b.glb", "building-type-c.glb", "building-type-d.glb",
      "building-type-e.glb", "building-type-f.glb", "building-type-g.glb", "building-type-h.glb",
      "building-a.glb", "building-b.glb", "building-c.glb", "building-d.glb", "building-e.glb", "building-f.glb",
    ],
    buildingTall: [
      "building-skyscraper-a.glb", "building-skyscraper-b.glb", "building-skyscraper-c.glb", "building-skyscraper-d.glb",
    ],
    buildingLow: [
      "low-detail-building-a.glb", "low-detail-building-b.glb", "low-detail-building-c.glb", "low-detail-building-d.glb",
      "low-detail-building-e.glb", "low-detail-building-f.glb", "low-detail-building-g.glb", "low-detail-building-h.glb",
    ],
    person: [
      "people/character-male-a.glb", "people/character-male-b.glb", "people/character-male-c.glb",
      "people/character-male-d.glb", "people/character-male-e.glb", "people/character-male-f.glb",
      "people/character-female-a.glb", "people/character-female-b.glb", "people/character-female-c.glb",
      "people/character-female-d.glb", "people/character-female-e.glb", "people/character-female-f.glb",
    ],
    bird: ["flamingo.glb", "parrot.glb", "stork.glb"],
    flower: [
      "props/nature/flower_purpleA.glb", "props/nature/flower_purpleB.glb",
      "props/nature/flower_redA.glb", "props/nature/flower_redB.glb",
      "props/nature/flower_yellowA.glb", "props/nature/flower_yellowB.glb",
      "flower.glb",
    ],
    lamp: [
      "props/roads/light-curved.glb", "props/roads/light-curved-double.glb",
      "props/roads/light-square.glb", "props/roads/light-square-double.glb",
    ],
    bench: [
      "props/furniture/bench.glb", "props/furniture/benchCushion.glb", "props/furniture/benchCushionLow.glb",
    ],
    bin: ["props/furniture/trashcan.glb"],
    crate: ["props/furniture/cardboardBoxClosed.glb", "props/furniture/cardboardBoxOpen.glb"],
    pot: [
      "props/furniture/pottedPlant.glb", "props/furniture/plantSmall1.glb",
      "props/furniture/plantSmall2.glb", "props/furniture/plantSmall3.glb",
      "props/suburb/planter.glb",
    ],
    sign: [
      "props/roads/sign-highway.glb", "props/roads/sign-highway-detailed.glb", "props/roads/sign-highway-wide.glb",
    ],
    cone: ["props/roads/construction-cone.glb"],
    barrier: ["props/roads/construction-barrier.glb", "props/roads/construction-light.glb"],
    fence: [
      "props/nature/fence_simple.glb", "props/nature/fence_simpleHigh.glb", "props/nature/fence_planks.glb",
      "props/nature/fence_gate.glb", "props/suburb/fence.glb", "props/suburb/fence-low.glb",
    ],
    awning: [
      "props/city/detail-awning.glb", "props/city/detail-awning-wide.glb",
      "props/city/detail-overhang.glb",
    ],
    parasol: ["props/city/detail-parasol-a.glb", "props/city/detail-parasol-b.glb"],
    path: [
      "props/nature/path_stone.glb", "props/nature/path_stoneCircle.glb", "props/nature/path_wood.glb",
      "props/suburb/path-stones-messy.glb",
    ],
    tent: ["props/nature/tent_detailedOpen.glb", "props/nature/tent_smallOpen.glb"],
    campfire: ["props/nature/campfire_logs.glb", "props/nature/campfire_stones.glb"],
    log: ["props/nature/log.glb", "props/nature/log_large.glb"],
    dock: ["props/nature/bridge_center_wood.glb", "props/nature/bridge_side_wood.glb", "props/nature/canoe.glb"],
    bridge: ["props/roads/road-bridge.glb", "props/roads/bridge-pillar.glb"],
    furniture: [
      "props/furniture/table.glb", "props/furniture/tableCoffee.glb", "props/furniture/tableRound.glb",
      "props/furniture/chair.glb", "props/furniture/loungeChair.glb", "props/furniture/sideTable.glb",
      "props/furniture/radio.glb", "props/furniture/speaker.glb", "props/furniture/televisionVintage.glb",
      "props/furniture/kitchenFridge.glb", "props/furniture/kitchenFridgeSmall.glb", "props/furniture/washer.glb",
      "props/furniture/bookcaseOpen.glb", "props/furniture/coatRackStanding.glb",
      "props/furniture/lampRoundFloor.glb", "props/furniture/lampSquareFloor.glb",
    ],
  };

  function allUrls() {
    const set = Object.create(null);
    Object.keys(CATALOG).forEach(function (key) {
      CATALOG[key].forEach(function (f) { set[f] = true; });
    });
    const urls = Object.keys(set);
    const rank = function (f) {
      if (/building|skyscraper/.test(f)) return 0;
      if (/tree_|plant_bush|rock_/.test(f)) return 1;
      if (/people\/|character-/.test(f)) return 2;
      if (/light-|bench|trashcan|cone|barrier|sign-/.test(f)) return 3;
      return 5;
    };
    urls.sort(function (a, b) { return rank(a) - rank(b); });
    return urls;
  }

  function prepareScene(scene) {
    scene.traverse(function (child) {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = true;
      child.frustumCulled = false;
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (m) {
          if (m.map && THREE.SRGBColorSpace) m.map.colorSpace = THREE.SRGBColorSpace;
          m.side = THREE.DoubleSide;
          m.transparent = false;
          if (m.opacity != null) m.opacity = 1;
          if (m.color && m.color.r + m.color.g + m.color.b < 0.05) m.color.setHex(0xcccccc);
        });
      }
    });
    return scene;
  }

  function flush() {
    while (waiters.length) {
      const fn = waiters.shift();
      try { fn(readyFlag); } catch (e) { console.warn(e); }
    }
  }

  function load(done) {
    if (done) waiters.push(done);
    if (readyFlag) { flush(); return; }
    if (loading) return;
    if (typeof THREE.GLTFLoader !== "function") {
      readyFlag = true;
      flush();
      return;
    }
    loading = true;

    const loader = new THREE.GLTFLoader();
    if (typeof THREE.DRACOLoader === "function") {
      const draco = new THREE.DRACOLoader();
      draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
      loader.setDRACOLoader(draco);
    }

    const urls = allUrls();
    let pending = urls.length;
    let settled = false;
    let cursor = 0;
    let active = 0;
    const CONCURRENCY = 10;

    function settle() {
      if (settled) return;
      settled = true;
      readyFlag = true;
      loading = false;
      flush();
    }

    function tryLoad(file, onDone) {
      const attempts = [file];
      // Flat props fallbacks (some packs land files in models/props/*.glb)
      if (file.indexOf("props/") === 0) {
        const leaf = file.split("/").pop();
        attempts.push("props/" + leaf);
        attempts.push(leaf);
      }
      let ai = 0;
      function next() {
        if (ai >= attempts.length) {
          console.warn("Model failed:", file);
          onDone(false);
          return;
        }
        const path = "models/" + attempts[ai++];
        loader.load(
          path,
          function (gltf) {
            cache[file] = prepareScene(gltf.scene);
            // Also cache under the actual path key for has()
            if (attempts[ai - 1] !== file) cache[attempts[ai - 1]] = cache[file];
            onDone(true);
          },
          undefined,
          function () { next(); }
        );
      }
      next();
    }

    function pump() {
      if (settled) return;
      while (active < CONCURRENCY && cursor < urls.length) {
        const file = urls[cursor++];
        active += 1;
        tryLoad(file, function () {
          active -= 1;
          pending -= 1;
          if (pending <= 0) settle();
          else pump();
        });
      }
    }

    // Force-ready after 45s with whatever loaded so the world can upgrade
    setTimeout(settle, 45000);
    if (!pending) {
      settle();
      return;
    }
    pump();
  }

  function has(file) { return !!cache[file]; }

  function pick(list, seed) {
    if (!list || !list.length) return null;
    const n = ((seed % list.length) + list.length) % list.length;
    return list[n];
  }

  function groundAndFit(root, targetHeight) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0.001 && targetHeight) {
      const s = targetHeight / size.y;
      root.scale.multiplyScalar(s);
      root.updateMatrixWorld(true);
      box.setFromObject(root);
    }
    root.position.y -= box.min.y;
    return root;
  }

  function cloneFile(file, opts) {
    opts = opts || {};
    const src = cache[file];
    if (!src) return null;
    const g = new THREE.Group();
    const mesh = src.clone(true);
    g.add(mesh);
    if (opts.tint != null) {
      mesh.traverse(function (child) {
        if (!child.isMesh || !child.material) return;
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(function (m, i) {
          const c = m.clone();
          if (c.color) c.color.offsetHSL(0, 0, ((opts.tint % 7) - 3) * 0.02);
          if (Array.isArray(child.material)) child.material[i] = c;
          else child.material = c;
        });
      });
    }
    if (opts.yaw != null) g.rotation.y = opts.yaw;
    groundAndFit(g, opts.height);
    if (opts.scale) g.scale.multiplyScalar(opts.scale);
    return g;
  }

  function cloneKind(kind, seed, opts) {
    opts = opts || {};
    const list = CATALOG[kind];
    if (!list) return null;
    const available = list.filter(has);
    if (!available.length) return null;
    const file = pick(available, seed == null ? 0 : seed);
    return cloneFile(file, opts);
  }

  window.OpenRoadsModels = {
    load: load,
    ready: function () { return readyFlag; },
    has: has,
    hasKind: function (kind) {
      const list = CATALOG[kind];
      if (!list || !list.length) return false;
      for (let i = 0; i < list.length; i++) if (has(list[i])) return true;
      return false;
    },
    clone: cloneFile,
    cloneKind: cloneKind,
    catalog: CATALOG,
  };
})();

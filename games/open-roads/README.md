# Open Roads 3D

Browser open-world driving game (Three.js). Garage, many cars (GLB models), cash, damage/repair, touch controls.

**Suggested site path:** `https://spencermann.com/games/open-roads/`  
**Suggested slug:** `open-roads`

## Files to deploy

Deploy the **entire** `open-roads/` folder (HTML/JS/CSS + `lib/`, `vendor/`, `models/`, `three.min.js`, etc.).

Do **not** omit `models/` — cars, buildings, trees, and props are GLB files loaded at runtime.

Typical layout:

```
open-roads/
  index.html
  style.css
  game.js
  cars-lib.js
  models-lib.js
  ferrari-car.js
  three.min.js
  play.bat
  lib/          (GLTFLoader, DRACOLoader, etc.)
  vendor/       (optional duplicates — keep if present)
  models/       (REQUIRED — .glb assets)
```

## How to add to spencermann.com

1. Copy this whole folder into the site, e.g. `public/games/open-roads/`.
2. Link: `/games/open-roads/`.
3. **Must be served over HTTP(S)** — GLB loads and some loaders fail on `file://`.
4. No npm build required for the packaged game (uses local `three.min.js` + loaders).
5. Folder may be ~150–170 MB because of 3D models — that is expected.

## Local test

```bash
cd open-roads
python -m http.server 8765
# or double-click play.bat on Windows
```

Open `http://127.0.0.1:8765/`.

## Notes for Cursor (website update)

- Keep relative paths intact; do not move `models/` without updating loaders.
- Large binary assets: commit with Git LFS if the site repo requires it, or host models on CDN and update paths only if asked.
- Title in HTML: **Open Roads 3D**.
- Progress/cash likely uses `localStorage` — do not clear on deploy.

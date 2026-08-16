# Wave Tester (boat / ocean)

Browser 3D Gerstner ocean with a controllable boat, buoys, crates, and live sea-state presets. This is the “boat game” / wave lab.

**Suggested site path:** `https://spencermann.com/games/wave-tester/`  
**Suggested slug:** `wave-tester`  
**Alternate display name:** Ocean / Boat Simulator

## Files to deploy

```
wave-tester/
  index.html
  styles.css
  start.bat
  src/
    main.js
    ocean.js
    waves.js
    floaters.js   (boat + floaters)
    sky.js
    presets.js
    hud.js
    ui.js
```

Three.js and lil-gui load from CDN via import map in `index.html`.

## How to add to spencermann.com

1. Copy this folder to e.g. `public/games/wave-tester/`.
2. Link: `/games/wave-tester/`.
3. **Must be served over HTTP(S)** — ES modules will not run from `file://`.
4. No build step.

## Local test

```bash
cd wave-tester
python -m http.server 8080
# or double-click start.bat
```

Open `http://localhost:8080`.

## Notes for Cursor (website update)

- Source lived at `C:\Users\cindy\Desktop\wave-tester` on the authoring machine.
- Keep `type="module"` and the import map; do not bundle unless asked.
- Title in HTML: **Wave Tester — 3D Ocean Simulator**.

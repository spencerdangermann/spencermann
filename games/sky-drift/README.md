# Sky Drift

Browser 3D dogfight / flight game (Three.js). Paint schemes, plane upgrades that evolve the airframe, wingmen, Grok AI enemies, lakes with Gerstner water and skip physics.

**Suggested site path:** `https://spencermann.com/games/sky-drift/`  
**Suggested slug:** `sky-drift`

## Files to deploy

```
sky-drift/
  index.html
  style.css
  game.js
```

All game logic and assets are in these three files. Three.js and fonts load from CDNs (needs network).

## How to add to spencermann.com

1. Copy this folder into the site repo, e.g. `public/games/sky-drift/` or `games/sky-drift/`.
2. Link from the games page: `/games/sky-drift/` or `/games/sky-drift/index.html`.
3. No build step. Serve as static files.
4. Prefer HTTPS hosting (CDN scripts require network).

## Local test

```bash
cd sky-drift
npx --yes serve .
# or: python -m http.server 8080
```

Open `http://localhost:8080` (or the port shown).

Opening `index.html` via `file://` also works if CDNs are reachable.

## Controls (for site copy)

| Input | Action |
|--------|--------|
| Mouse | Steer |
| Space / Shift | Boost |
| Click / F | Guns |
| V | 1st / 3rd person |
| Skim lakes fast & shallow | Water skip |

## Notes for Cursor (website update)

- Self-contained static game; do not rewrite into a framework unless asked.
- Keep relative paths (`style.css`, `game.js`) as-is.
- Title in HTML: **Sky Drift — 3D Flight**.
- Progress uses `localStorage` keys prefixed `sky-drift-*`.

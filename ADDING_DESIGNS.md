# Adding Designs to Your Website

Designs are defined in **`data/models.json`** and shown automatically on category carousels and the homepage **Featured Designs** section.

## Quick steps

### 1. Add an entry to `data/models.json`

Add an object to the `models` array:

```json
{
  "id": "my-new-design",
  "title": "My New Design",
  "category": "hollow-knight",
  "makerworldUrl": "https://makerworld.com/en/models/123456-my-new-design",
  "image": "images/hollow-knight/my-new-design.jpg",
  "description": "Two or three sentences about the design, print tips, and use case.",
  "featured": false
}
```

**Categories:** `hollow-knight`, `tools`, `games`, `random`

Set `"featured": true` to show the design on the homepage grid (use sparingly — 4–8 items is ideal).

### 2. Add the image

1. Save a cover image (JPG or SVG, ~1200×800 or similar).
2. Place it at the path in the `image` field, e.g. `images/hollow-knight/my-new-design.jpg` (or `.svg`).

Replace the bundled SVG placeholders with real photos from your prints or MakerWorld when you have them.

To download covers from MakerWorld automatically, run:

```powershell
cd D:\Website
.\scripts\download-images.ps1
```

(Edit the `$jobs` list in that script when adding new models.)

### 3. Preview and publish

1. Open `index.html` or a category page in your browser (use a local server if `fetch` for JSON fails on `file://`).
2. Publish:

```powershell
cd D:\Website
git pull origin main
git add .
git commit -m "Add my-new-design to site"
git push
```

Wait 1–5 minutes for GitHub Pages, then check https://www.spencermann.com

## MakerWorld links

- Use the **full model URL** (`https://makerworld.com/en/models/...`), not only your profile.
- The site adds UTM parameters automatically (`utm_source=spencermann`) for attribution.

## Category thumbnails (homepage cards)

After adding images in a category folder, copy the best one to `images/categories/`:

- `hollow-knight.jpg`, `tools.jpg`, `games.jpg`, `random.jpg`

Recommended size: 800×600px.

## Legacy manual HTML (optional)

Category HTML files only need an empty `<div class="carousel-track"></div>`. Slides are injected by `script.js` from `models.json`. You no longer need to duplicate carousel HTML blocks.

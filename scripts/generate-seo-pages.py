#!/usr/bin/env python3
"""Generate flagship print pages, Hollow Knight HTML index, and sitemap."""
from __future__ import annotations

import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_JSON = ROOT / "data" / "models.json"
HK_HTML = ROOT / "hollow-knight.html"
SITEMAP = ROOT / "sitemap.xml"
PRINTS_DIR = ROOT / "prints"
SITE = "https://spencermann.com"
TODAY = date.today().isoformat()

FLAGSHIPS = [
    {
        "id": "large-hornet-mask-silk-song-hollow-knight-adult",
        "slug": "hornet-mask",
        "h1": "Hornet Mask — Adult Hollow Knight / Silksong Cosplay",
        "title": "Hornet Mask 3D Print (Adult, Silksong) | Spencermann",
        "meta": (
            "Free adult Hornet Mask 3D print for Hollow Knight: Silksong cosplay by Spencer Mann "
            "(Spencermann). Download the STL and Bambu Lab profiles on MakerWorld."
        ),
        "body": (
            "This is the adult-size Hornet Mask from Hollow Knight: Silksong — the design that "
            "gets the most downloads of anything I publish. The original Hornet mask was built "
            "for my kids; this version is scaled for an adult head, with print-friendly seams "
            "and Bambu Lab profiles so you can go from download to a wearable mask without "
            "remodeling it yourself."
        ),
    },
    {
        "id": "hornet-mask-hollow-knight-teen-child-sized",
        "slug": "hornet-mask-child",
        "h1": "Hornet Mask — Child & Teen Hollow Knight Cosplay",
        "title": "Hornet Mask 3D Print (Child / Teen) | Spencermann",
        "meta": (
            "Free child and teen Hornet Mask 3D print for Hollow Knight cosplay by Spencermann. "
            "Sized from in-game art. Download the STL on MakerWorld."
        ),
        "body": (
            "The child and teen Hornet Mask is the original size I designed from Hollow Knight "
            "screenshots so the proportions stay true to the 2D art. If you are printing for a "
            "kid, a smaller adult, or a display head, start here instead of the large Silksong "
            "adult mask."
        ),
    },
    {
        "id": "hornet-s-needle-big-silk-song-adult-cosplay",
        "slug": "hornets-needle",
        "h1": "Hornet's Needle — Adult Silksong Cosplay 3D Print",
        "title": "Hornet's Needle 3D Print (Adult Silksong Cosplay) | Spencermann",
        "meta": (
            "Free adult Hornet's Needle 3D print for Hollow Knight: Silksong cosplay by "
            "Spencermann. Large-scale needle prop with MakerWorld print profiles."
        ),
        "body": (
            "Hornet's Needle is the matching adult weapon for the large Hornet Mask. This bigger "
            "Silksong version replaces the teen-scale needle that used conduit as a core. Print "
            "it as a cosplay prop alongside the adult mask, or as a standalone Hallownest piece."
        ),
    },
    {
        "id": "the-pure-vessel-mask-from-hollow-knight",
        "slug": "pure-vessel-mask",
        "h1": "Pure Vessel Mask — Hollow Knight Cosplay 3D Print",
        "title": "Pure Vessel Mask 3D Print | Hollow Knight Cosplay | Spencermann",
        "meta": (
            "Free adult Pure Vessel Mask 3D print from Hollow Knight by Spencer Mann "
            "(Spencermann). Download the STL on MakerWorld."
        ),
        "body": (
            "The Pure Vessel Mask is an adult-sized Hollow Knight boss cosplay piece. Like the "
            "rest of the mask series, it is split for FDM printing with overlapping seams so you "
            "can assemble, sand, and paint a convention-ready helmet."
        ),
    },
    {
        "id": "the-nail-hollow-knight-sword-cosplay-tpu",
        "slug": "the-nail",
        "h1": "The Nail — Hollow Knight Sword Cosplay (TPU)",
        "title": "The Nail 3D Print | Hollow Knight Sword Cosplay | Spencermann",
        "meta": (
            "Free Hollow Knight Nail 3D print by Spencermann — a TPU-friendly sword prop scaled "
            "from the in-game art. Download on MakerWorld."
        ),
        "body": (
            "The Nail is Hollow Knight's iconic sword, modeled to sit next to the Knight and "
            "Hornet masks. The files are set up for TPU so the blade has a little flex for "
            "cosplay instead of a brittle PLA stick."
        ),
    },
    {
        "id": "hollow-knight-mask-adult-size-updated-cosplay",
        "slug": "hollow-knight-mask",
        "h1": "Hollow Knight Mask — Adult Cosplay 3D Print",
        "title": "Hollow Knight Mask 3D Print (Adult Size) | Spencermann",
        "meta": (
            "Free adult Hollow Knight Mask 3D print by Spencermann. Updated Knight helmet for "
            "adult heads — download the STL on MakerWorld."
        ),
        "body": (
            "This is the adult Hollow Knight Mask — the Knight's own helmet, enlarged from the "
            "youth version after people asked for a head that actually fits grown-ups. If you "
            "want the classic bug-head look rather than Hornet or Grimm, this is the print."
        ),
    },
    {
        "id": "the-grimm-mask-hollow-knight-adult-child-size",
        "slug": "grimm-mask",
        "h1": "Grimm Mask — Hollow Knight Cosplay 3D Print",
        "title": "Grimm Mask 3D Print | Hollow Knight Cosplay | Spencermann",
        "meta": (
            "Free Grimm Mask 3D print from Hollow Knight by Spencermann. Adult and child sizes. "
            "Download the STL on MakerWorld."
        ),
        "body": (
            "The Grimm Mask covers Troupe Master Grimm for both adult and child heads. I "
            "prototype from in-game stills until the silhouette reads as Grimm at a glance, then "
            "tune the parts so they print and assemble without a custom support nightmare."
        ),
    },
    {
        "id": "zote-the-mighty-mask-hollow-knight",
        "slug": "zote-mask",
        "h1": "Zote the Mighty Mask — Hollow Knight 3D Print",
        "title": "Zote the Mighty Mask 3D Print | Hollow Knight | Spencermann",
        "meta": (
            "Free Zote the Mighty Mask 3D print from Hollow Knight by Spencermann. A different "
            "mask construction from the rest of the series. Download on MakerWorld."
        ),
        "body": (
            "Zote the Mighty is the newest Hollow Knight mask in the collection. The shell is "
            "built a little differently from Hornet and the Knight so the pretender's face reads "
            "correctly in person. Print it as a gag cosplay or to complete a Hallownest mask wall."
        ),
    },
]

NAV = """    <nav class="navbar" aria-label="Main navigation">
        <div class="nav-container">
            <a href="../index.html" class="nav-logo">Spencermann</a>
            <ul class="nav-menu">
                <li><a href="../index.html" class="nav-link">Home</a></li>
                <li><a href="../hollow-knight.html" class="nav-link active">Hollow Knight</a></li>
                <li><a href="../glitch-productions.html" class="nav-link">Glitch</a></li>
                <li><a href="../water-fountains.html" class="nav-link">Fountains</a></li>
                <li><a href="../utility.html" class="nav-link">Utility</a></li>
                <li><a href="../other.html" class="nav-link">Other</a></li>
                <li><a href="../video-games.html" class="nav-link">Video Games</a></li>
                <li><a href="../design-requests.html" class="nav-link">Requests</a></li>
            </ul>
            <div class="hamburger" aria-label="Open menu"><span></span><span></span><span></span></div>
        </div>
    </nav>"""

FOOTER = """    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <p>&copy; 2026 Spencer Mann (Spencermann). All rights reserved.</p>
                <div class="footer-links">
                    <a href="https://makerworld.com/en/@spencermann" target="_blank" rel="noopener noreferrer">MakerWorld</a>
                    <a href="../hollow-knight.html">All Hollow Knight prints</a>
                </div>
            </div>
        </div>
    </footer>
    <script src="../script.js"></script>"""


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def model_in_hk(model: dict) -> bool:
    cats = model.get("categories") or [model.get("category")]
    return "hollow-knight" in cats


def card_html(model: dict, href: str, prefix: str = "") -> str:
    img = prefix + model["image"].replace("\\", "/")
    alt = model.get("imageAlt") or model["title"]
    desc = model.get("description") or ""
    return (
        f'<a class="featured-card" role="listitem" href="{esc(href)}">'
        f'<div class="featured-image">'
        f'<img src="{esc(img)}" alt="{esc(alt)}" loading="lazy" decoding="async">'
        f"</div>"
        f'<div class="featured-info">'
        f'<h3 class="featured-title">{esc(model["title"])}</h3>'
        f'<p class="featured-description">{esc(desc)}</p>'
        f'<span class="featured-cta">View print &amp; download &rarr;</span>'
        f"</div></a>"
    )


def print_page(flag: dict, model: dict, others: list[dict]) -> str:
    page_url = f"{SITE}/prints/{flag['slug']}.html"
    image_url = f"{SITE}/{model['image'].replace(chr(92), '/')}"
    more_links = "\n".join(
        f'                <li><a href="{esc(o["slug"])}.html">{esc(o["h1"].split("—")[0].strip())}</a></li>'
        for o in others
        if o["slug"] != flag["slug"]
    )
    schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": flag["h1"],
        "description": flag["meta"],
        "image": image_url,
        "sku": flag["id"],
        "brand": {"@type": "Brand", "name": "Spencermann"},
        "url": page_url,
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": model["makerworldUrl"],
        },
        "creator": {
            "@type": "Person",
            "name": "Spencer Mann",
            "alternateName": "Spencermann",
            "url": f"{SITE}/",
        },
    }
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Hollow Knight",
                "item": f"{SITE}/hollow-knight.html",
            },
            {"@type": "ListItem", "position": 3, "name": flag["h1"], "item": page_url},
        ],
    }
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(flag["title"])}</title>
    <meta name="description" content="{esc(flag["meta"])}">
    <meta name="author" content="Spencer Mann">
    <meta name="robots" content="index, follow">
    <meta property="og:type" content="website">
    <meta property="og:url" content="{esc(page_url)}">
    <meta property="og:title" content="{esc(flag["title"])}">
    <meta property="og:description" content="{esc(flag["meta"])}">
    <meta property="og:image" content="{esc(image_url)}">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="{esc(flag["title"])}">
    <meta property="twitter:description" content="{esc(flag["meta"])}">
    <meta property="twitter:image" content="{esc(image_url)}">
    <link rel="canonical" href="{esc(page_url)}">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="stylesheet" href="../styles.css">
    <script type="application/ld+json">
    {json.dumps(schema, indent=2)}
    </script>
    <script type="application/ld+json">
    {json.dumps(crumbs, indent=2)}
    </script>
</head>
<body>
{NAV}
    <main id="main-content">
        <header class="category-header">
            <p class="print-kicker"><a href="../hollow-knight.html">Hollow Knight 3D prints</a></p>
            <h1>{esc(flag["h1"])}</h1>
            <p>Free STL by Spencer Mann (Spencermann) — original design on MakerWorld.</p>
        </header>
        <section class="featured-section print-detail">
            <div class="container print-detail-grid">
                <div class="print-hero-image">
                    <img src="../{esc(model["image"])}" alt="{esc(model.get("imageAlt") or model["title"])}">
                </div>
                <div class="print-copy">
                    <p class="about-text">{esc(flag["body"])}</p>
                    <p class="about-text">{esc(model.get("description") or "")}</p>
                    <a class="btn-makerworld" href="{esc(model["makerworldUrl"])}?utm_source=spencermann&amp;utm_medium=website&amp;utm_campaign={esc(flag["id"])}" target="_blank" rel="noopener noreferrer">Download free on MakerWorld</a>
                    <p class="print-meta">Also in the <a href="../hollow-knight.html">full Hollow Knight collection</a>.</p>
                </div>
            </div>
        </section>
        <section class="featured-section">
            <div class="container">
                <h2 class="category-subsection-title">More Hollow Knight 3D prints</h2>
                <ul class="hk-related-list">
{more_links}
                </ul>
            </div>
        </section>
    </main>
{FOOTER}
</body>
</html>
"""


def hk_directory_html(models: list[dict], by_id: dict[str, dict], slug_by_id: dict[str, str]) -> str:
    def href_for(model: dict) -> str:
        slug = slug_by_id.get(model["id"])
        if slug:
            return f"prints/{slug}.html"
        return model["makerworldUrl"]

    flagship_links = []
    for flag in FLAGSHIPS:
        model = by_id[flag["id"]]
        flagship_links.append(
            f'<li><a href="prints/{esc(flag["slug"])}.html">{esc(model["title"])}</a></li>'
        )

    all_items = []
    for model in sorted(models, key=lambda m: m["title"].lower()):
        all_items.append(
            f'<li><a href="{esc(href_for(model))}">{esc(model["title"])}</a></li>'
        )

    return f"""                <div class="hk-flagship-block">
                    <h2 class="category-subsection-title">Flagship Hollow Knight 3D prints</h2>
                    <ul class="hk-model-index">
                        {"".join(flagship_links)}
                    </ul>
                </div>
                <div class="hk-directory">
                    <h2 class="category-subsection-title">All {len(models)} Hollow Knight 3D prints</h2>
                    <ol class="hk-model-index">
                        {"".join(all_items)}
                    </ol>
                </div>
"""


def hk_cards_html(models: list[dict], slug_by_id: dict[str, str]) -> str:
    latest = sorted(models, key=lambda m: m.get("publishTime") or "", reverse=True)[:3]
    latest_ids = {m["id"] for m in latest}
    popular = sorted(
        (m for m in models if m["id"] not in latest_ids),
        key=lambda m: m.get("likes") or 0,
        reverse=True,
    )

    def href_for(model: dict) -> str:
        slug = slug_by_id.get(model["id"])
        if slug:
            return f"prints/{slug}.html"
        return model["makerworldUrl"]

    def cards(group: list[dict]) -> str:
        return "\n".join(card_html(m, href_for(m)) for m in group)

    return f"""                <div class="category-subsection">
                    <h2 class="category-subsection-title">Latest Models</h2>
                    <div class="featured-grid" role="list">
                        {cards(latest)}
                    </div>
                </div>
                <div class="category-subsection">
                    <h2 class="category-subsection-title">Popular Models</h2>
                    <p class="featured-intro">Sorted by MakerWorld likes.</p>
                    <div class="featured-grid" role="list">
                        {cards(popular)}
                    </div>
                </div>
"""


def replace_block(text: str, start: str, end: str, inner: str) -> str:
    pattern = re.compile(re.escape(start) + r".*?" + re.escape(end), re.S)
    block = f"{start}\n{inner.rstrip()}\n                {end}"
    if not pattern.search(text):
        raise SystemExit(f"Missing markers {start} / {end}")
    return pattern.sub(block, text)


def write_sitemap(flag_slugs: list[str]) -> None:
    pages = [
        ("/", "1.0", "weekly"),
        ("/hollow-knight.html", "0.95", "weekly"),
        ("/glitch-productions.html", "0.9", "weekly"),
        ("/water-fountains.html", "0.9", "weekly"),
        ("/utility.html", "0.85", "weekly"),
        ("/other.html", "0.8", "weekly"),
        ("/video-games.html", "0.9", "weekly"),
        ("/video-game-play.html", "0.7", "weekly"),
        ("/games/sky-drift/", "0.8", "monthly"),
        ("/games/open-roads/", "0.8", "monthly"),
        ("/games/wave-tester/", "0.8", "monthly"),
        ("/design-requests.html", "0.85", "monthly"),
    ]
    for slug in flag_slugs:
        pages.append((f"/prints/{slug}.html", "0.9", "weekly"))

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for loc, priority, freq in pages:
        lines.extend(
            [
                "  <url>",
                f"    <loc>{SITE}{loc}</loc>",
                f"    <lastmod>{TODAY}</lastmod>",
                f"    <changefreq>{freq}</changefreq>",
                f"    <priority>{priority}</priority>",
                "  </url>",
            ]
        )
    lines.append("</urlset>")
    lines.append("")
    SITEMAP.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    models = json.loads(MODELS_JSON.read_text(encoding="utf-8"))["models"]
    by_id = {m["id"]: m for m in models}
    hk_models = [m for m in models if model_in_hk(m)]
    slug_by_id = {f["id"]: f["slug"] for f in FLAGSHIPS}

    PRINTS_DIR.mkdir(exist_ok=True)
    for flag in FLAGSHIPS:
        model = by_id[flag["id"]]
        (PRINTS_DIR / f"{flag['slug']}.html").write_text(
            print_page(flag, model, FLAGSHIPS), encoding="utf-8"
        )

    hk = HK_HTML.read_text(encoding="utf-8")
    hk = replace_block(
        hk,
        "<!-- HK_DIRECTORY_START -->",
        "<!-- HK_DIRECTORY_END -->",
        hk_directory_html(hk_models, by_id, slug_by_id),
    )
    hk = replace_block(
        hk,
        "<!-- HK_STATIC_MODELS_START -->",
        "<!-- HK_STATIC_MODELS_END -->",
        hk_cards_html(hk_models, slug_by_id),
    )
    HK_HTML.write_text(hk, encoding="utf-8")
    write_sitemap([f["slug"] for f in FLAGSHIPS])
    print(f"Wrote {len(FLAGSHIPS)} print pages, HK index ({len(hk_models)} models), sitemap")


if __name__ == "__main__":
    main()

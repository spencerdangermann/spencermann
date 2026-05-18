#!/usr/bin/env python3
"""Fetch full MakerWorld catalog, categorize, download covers, write models.json."""
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
MODELS_JSON = ROOT / "data" / "models.json"
HK_SCRAPE = ROOT / "data" / "hollow-knight-scrape.json"
API_URL = "https://makerworld.com/api/v1/design-service/published/2215294622/design?offset=0&limit=100"

DUAL_CATEGORIES = {
    "city-of-tears-pond-water-fountain-functional": ["hollow-knight", "water-fountains"],
    "working-city-of-tears-water-fountain-hollow-knight": ["hollow-knight", "water-fountains"],
}

FEATURED_PER_CATEGORY = 4

CATEGORY_FOLDERS = {
    "hollow-knight": "hollow-knight",
    "glitch-productions": "glitch-productions",
    "water-fountains": "water-fountains",
    "utility": "utility",
    "other": "other",
}

HK_TITLE_MARKERS = (
    "hollow knight",
    "silksong",
    "silk song",
    "hallownest",
    "hornet mask",
    "hornet's needle",
    "hornet s needle",
    "pure vessel",
    "grimm mask",
    "grimmchild",
    "dreamer ",
    "mantis lord",
    "mantis claw",
    "lace mask",
    "lace's sword",
    "shakra mask",
    "trobbio mask",
    "cogfly",
    "silkshot",
    "wingmould",
    "lumafly",
    "pale king",
    "bell beast",
    "lurien",
    "monomon",
    "harrah",
)

GLITCH_MARKERS = (
    "murder drones",
    "murder drone",
    "digital circus",
    "tadc",
    "amazing digital circus",
    "serial designation",
    "cynessa",
    "lizzy -",
    "lizzy ",
    "tessa james",
    "bubble mask",
    "bubble amazing",
    "bubble (amazing",
    "popcorn bowl",
    "remix of uzi",
    "doll - murder",
)

WATER_MARKERS = (
    "fountain",
    "sprinkler",
    "pond water",
    "sea serpent water",
    "gyarados pokemon water",
    "christ working water",
    "working fountain girl",
    "dragon water fountain",
    "dragon fountain working",
)

UTILITY_MARKERS = (
    "vent cover",
    "dryer air vent",
    "snap on vent",
    "mountable dumpster",
    "dumpster trash",
    "dumpster trash can",
    "desk garbage",
    "garage organizer",
    "toilet flush",
    "doorbell cover",
    "pegboard",
    "spray paint can holder",
    "van head rest",
    "dryer air vent",
)


def fetch_catalog() -> list[dict]:
    req = urllib.request.Request(
        API_URL,
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
    return data["hits"]


def ext_from_url(url: str) -> str:
    path = urlparse(url).path.lower()
    for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
        if path.endswith(ext):
            return ext.lstrip(".")
    return "jpg"


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; spencermann-site-sync/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        dest.write_bytes(resp.read())


def slug_id(slug: str, design_id: int) -> str:
    return slug or str(design_id)


def classify(title: str, slug: str, hk_slugs: set[str]) -> tuple[str, list[str]]:
    if slug in DUAL_CATEGORIES:
        return "hollow-knight", DUAL_CATEGORIES[slug]

    t = title.lower()
    s = slug.lower()

    if slug in hk_slugs or any(m in t for m in HK_TITLE_MARKERS) or "hollow-knight" in s:
        return "hollow-knight", ["hollow-knight"]

    if any(m in t for m in GLITCH_MARKERS):
        return "glitch-productions", ["glitch-productions"]

    if any(m in t for m in WATER_MARKERS):
        return "water-fountains", ["water-fountains"]

    if (
        any(m in t for m in UTILITY_MARKERS)
        and "dumpster fire" not in t
        and "shadowbox" not in t
    ):
        return "utility", ["utility"]

    return "other", ["other"]


def describe(title: str, primary: str) -> str:
    templates = {
        "hollow-knight": (
            f"{title} — free Hollow Knight / Silksong 3D print by Spencermann. "
            "Download on MakerWorld with ready-made Bambu Lab profiles."
        ),
        "glitch-productions": (
            f"{title} — free Glitch Productions fan art 3D print by Spencermann. "
            "Download on MakerWorld with print profiles."
        ),
        "water-fountains": (
            f"{title} — working water fountain 3D print by Spencermann. "
            "Download free on MakerWorld for pond or garden setups."
        ),
        "utility": (
            f"{title} — practical utility 3D print by Spencermann. "
            "Free download on MakerWorld."
        ),
        "other": (
            f"{title} — free 3D printable design by Spencermann. "
            "Download on MakerWorld."
        ),
    }
    return templates.get(primary, templates["other"])


def image_alt(title: str, primary: str) -> str:
    return f"{title} — free 3D print by Spencermann ({primary.replace('-', ' ')})"


def main() -> None:
    hits = fetch_catalog()
    hk_slugs = set()
    if HK_SCRAPE.exists():
        for row in json.loads(HK_SCRAPE.read_text(encoding="utf-8")):
            hk_slugs.add(row["id"])

    models: list[dict] = []
    report = {"downloaded": 0, "skipped": 0, "by_category": {}}

    for hit in hits:
        slug = hit["slug"]
        mid = slug_id(slug, hit["id"])
        title = hit["title"].strip()
        likes = int(hit.get("likeCount") or 0)
        cover = hit["coverUrl"]
        url = f"https://makerworld.com/en/models/{hit['id']}-{slug}"

        primary, categories = classify(title, slug, hk_slugs)
        folder = CATEGORY_FOLDERS[primary]
        img_dir = ROOT / "images" / folder
        img_dir.mkdir(parents=True, exist_ok=True)

        ext = ext_from_url(cover)
        rel = f"images/{folder}/{mid}.{ext}"
        dest = ROOT / rel

        try:
            if not dest.exists() or dest.stat().st_size < 500:
                download(cover, dest)
                report["downloaded"] += 1
            else:
                report["skipped"] += 1
        except Exception:
            rel = f"images/{folder}/{mid}.svg"

        report["by_category"][primary] = report["by_category"].get(primary, 0) + 1

        models.append(
            {
                "id": mid,
                "title": title,
                "category": primary,
                "categories": categories,
                "makerworldUrl": url,
                "image": rel.replace("\\", "/"),
                "description": describe(title, primary),
                "imageAlt": image_alt(title, primary),
                "likes": likes,
                "featured": False,
            }
        )

    models.sort(key=lambda m: m.get("likes", 0), reverse=True)

    featured_counts: dict[str, int] = {}
    for model in models:
        cat = model["category"]
        if featured_counts.get(cat, 0) < FEATURED_PER_CATEGORY:
            model["featured"] = True
            featured_counts[cat] = featured_counts.get(cat, 0) + 1

    MODELS_JSON.write_text(
        json.dumps({"models": models}, indent=2) + "\n", encoding="utf-8"
    )

    print(json.dumps({"total": len(models), **report, "featured": featured_counts}, indent=2))


if __name__ == "__main__":
    main()

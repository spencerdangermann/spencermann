#!/usr/bin/env python3
"""Fetch full MakerWorld catalog, categorize, download covers, write models.json."""
import html
import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
MODELS_JSON = ROOT / "data" / "models.json"
HK_SCRAPE = ROOT / "data" / "hollow-knight-scrape.json"
API_URL = "https://makerworld.com/api/v1/design-service/published/2215294622/design?offset=0&limit=100"
DETAIL_URL = "https://makerworld.com/api/v1/design-service/design/{design_id}"

DUAL_CATEGORIES = {
    "city-of-tears-pond-water-fountain-functional": ["hollow-knight", "water-fountains"],
    "working-city-of-tears-water-fountain-hollow-knight": ["hollow-knight", "water-fountains"],
}

FEATURED_PER_CATEGORY = 4
DESCRIPTION_MAX = 280

CATEGORY_FOLDERS = {
    "hollow-knight": "hollow-knight",
    "glitch-productions": "glitch-productions",
    "water-fountains": "water-fountains",
    "utility": "utility",
    "other": "other",
}

CATEGORY_KEYWORDS = {
    "hollow-knight": ["Hollow Knight 3D print", "Silksong cosplay", "Spencermann", "MakerWorld free STL"],
    "glitch-productions": ["Glitch Productions 3D print", "Murder Drones", "Gameoverse", "Spencermann", "MakerWorld free STL"],
    "water-fountains": ["3D printed water fountain", "pond fountain STL", "Spencermann", "MakerWorld free download"],
    "utility": ["functional 3D print", "practical STL", "Spencermann", "MakerWorld free download"],
    "other": ["free 3D print", "Spencermann", "MakerWorld STL download"],
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
    " tad ",
    " tad-",
    "- tad ",
    "- tad-",
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
    "popcorn tub",
    "popcorn topper",
    "remix of uzi",
    "doll - murder",
    "gameoverse",
    "kaboodle",
    "caine",
    "pomni",
    "ragatha",
    "jax tadc",
    "gangle",
    "kinger",
    "zooble",
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


def fetch_design_detail(design_id: int) -> dict:
    req = urllib.request.Request(
        DETAIL_URL.format(design_id=design_id),
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def clean_summary(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<boostme>.*?</boostme>", " ", raw, flags=re.I | re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def truncate_summary(text: str, max_len: int = DESCRIPTION_MAX) -> str:
    if len(text) <= max_len:
        return text
    chunk = text[: max_len + 1]
    for sep in (". ", "! ", "? "):
        idx = chunk.rfind(sep)
        if idx > 80:
            return chunk[: idx + 1].strip()
    cut = chunk.rfind(" ")
    if cut > 80:
        return chunk[:cut].strip() + "…"
    return text[:max_len].strip() + "…"


def build_keywords(tags: list[str], title: str, primary: str) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for source in (tags, CATEGORY_KEYWORDS.get(primary, [])):
        for item in source:
            label = str(item).strip()
            if not label:
                continue
            key = label.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(label)
    title_lower = title.lower()
    if primary == "hollow-knight":
        if "hornet" in title_lower and "mask" in title_lower:
            out.insert(0, "Hornet Mask")
        if "needle" in title_lower or "nail" in title_lower:
            out.insert(0, "Hornet's Needle")
    if primary == "glitch-productions" and "murder drones" in title_lower:
        out.insert(0, "Murder Drones figure")
    return out[:12]


def build_description(summary: str, title: str, primary: str, tags: list[str]) -> str:
    cleaned = clean_summary(summary)
    if cleaned:
        body = truncate_summary(cleaned)
    else:
        body = f"{title} — free 3D printable design by Spencermann."

    tag_phrase = ", ".join(tags[:4]) if tags else ""
    if tag_phrase and tag_phrase.lower() not in body.lower():
        suffix = f" Tags: {tag_phrase}."
        if len(body) + len(suffix) <= DESCRIPTION_MAX + 40:
            body = body.rstrip(".") + "." + suffix
    return body


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

    if any(m in t for m in GLITCH_MARKERS) or any(m in s for m in GLITCH_MARKERS):
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


def image_alt(title: str, primary: str) -> str:
    label = primary.replace("-", " ")
    return f"{title} — free 3D print by Spencermann ({label})"


def main() -> None:
    hits = fetch_catalog()
    hk_slugs = set()
    if HK_SCRAPE.exists():
        for row in json.loads(HK_SCRAPE.read_text(encoding="utf-8")):
            hk_slugs.add(row["id"])

    models: list[dict] = []
    report = {"downloaded": 0, "skipped": 0, "by_category": {}, "detail_errors": 0}

    for index, hit in enumerate(hits):
        slug = hit["slug"]
        design_id = int(hit["id"])
        mid = slug_id(slug, design_id)
        title = hit["title"].strip()
        likes = int(hit.get("likeCount") or 0)
        cover = hit["coverUrl"]
        publish_time = hit.get("publishTime") or hit.get("createTime") or ""
        url = f"https://makerworld.com/en/models/{design_id}-{slug}"

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

        tags: list[str] = []
        summary = ""
        try:
            detail = fetch_design_detail(design_id)
            tags = detail.get("tags") or []
            summary = detail.get("summary") or detail.get("summaryTranslated") or ""
            if index < len(hits) - 1:
                time.sleep(0.08)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            report["detail_errors"] += 1

        report["by_category"][primary] = report["by_category"].get(primary, 0) + 1

        models.append(
            {
                "id": mid,
                "makerworldId": design_id,
                "title": title,
                "category": primary,
                "categories": categories,
                "makerworldUrl": url,
                "image": rel.replace("\\", "/"),
                "description": build_description(summary, title, primary, tags),
                "imageAlt": image_alt(title, primary),
                "keywords": build_keywords(tags, title, primary),
                "likes": likes,
                "publishTime": publish_time,
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

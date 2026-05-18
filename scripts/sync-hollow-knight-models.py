#!/usr/bin/env python3
"""Merge Hollow Knight scrape into models.json and download cover images."""
import json
import re
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SCRAPE = ROOT / "data" / "hollow-knight-scrape.json"
MODELS_JSON = ROOT / "data" / "models.json"
IMG_DIR = ROOT / "images" / "hollow-knight"

FEATURED_IDS = {
    "the-pure-vessel-mask-from-hollow-knight",
    "large-hornet-mask-silk-song-hollow-knight-adult",
    "dreamer-harrah-the-beast-mask-hollow-knight",
    "the-grimm-mask-hollow-knight-adult-child-size",
    "the-nail-hollow-knight-sword-cosplay-tpu",
    "hollow-knight-mask-adult-size-updated-cosplay",
}

DUAL_CATEGORIES = {
    "city-of-tears-pond-water-fountain-functional": ["hollow-knight", "water-fountains"],
    "working-city-of-tears-water-fountain-hollow-knight": ["hollow-knight", "water-fountains"],
}


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


def describe(title: str) -> str:
    return (
        f"{title} — a free 3D printable design by Spencermann for Hollow Knight and "
        "Silksong fans. Download on MakerWorld with ready-made print profiles."
    )


def main() -> None:
    scrape = json.loads(SCRAPE.read_text(encoding="utf-8"))
    data = json.loads(MODELS_JSON.read_text(encoding="utf-8"))
    others = [m for m in data["models"] if m.get("category") != "hollow-knight"]
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    hk_models = []
    report = {"ok": [], "fail": []}

    for item in scrape:
        mid = item["id"]
        ext = ext_from_url(item["coverImageUrl"])
        rel = f"images/hollow-knight/{mid}.{ext}"
        dest = ROOT / rel
        try:
            if not dest.exists() or dest.stat().st_size < 500:
                download(item["coverImageUrl"], dest)
            report["ok"].append(mid)
        except Exception as exc:
            report["fail"].append({"id": mid, "error": str(exc)})
            if dest.exists():
                rel = str(dest.relative_to(ROOT)).replace("\\", "/")
            else:
                rel = f"images/hollow-knight/{mid}.svg"

        entry = {
            "id": mid,
            "title": item["title"],
            "category": "hollow-knight",
            "categories": DUAL_CATEGORIES.get(mid, ["hollow-knight"]),
            "makerworldUrl": item["makerworldUrl"],
            "image": rel.replace("\\", "/"),
            "description": describe(item["title"]),
            "featured": mid in FEATURED_IDS,
        }
        hk_models.append(entry)

    # Sort newest MakerWorld id first (numeric from URL)
    def sort_key(m: dict) -> int:
        m_url = m["makerworldUrl"]
        num = re.search(r"/models/(\d+)-", m_url)
        return int(num.group(1)) if num else 0

    hk_models.sort(key=sort_key, reverse=True)
    data["models"] = hk_models + others
    MODELS_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    print(json.dumps({"hk_count": len(hk_models), "downloads": report}, indent=2))


if __name__ == "__main__":
    main()

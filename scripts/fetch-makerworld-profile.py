#!/usr/bin/env python3
"""Fetch model URLs from a MakerWorld user profile page."""
import json
import re
import sys
import urllib.request

PROFILE = sys.argv[1] if len(sys.argv) > 1 else "https://makerworld.com/en/@spencermann"


def fetch(url: str) -> str:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return resp.read().decode("utf-8", errors="ignore")


def extract_models(html: str) -> list[dict]:
    seen = set()
    models = []
    for mid, slug in re.findall(r"/en/models/(\d+)-([a-z0-9-]+)", html, re.I):
        key = (mid, slug)
        if key in seen:
            continue
        seen.add(key)
        models.append(
            {
                "id": mid,
                "slug": slug,
                "url": f"https://makerworld.com/en/models/{mid}-{slug}",
            }
        )
    return models


def fetch_model_meta(url: str) -> dict:
    html = fetch(url)
    title = None
    og_image = None
    desc = None
    m = re.search(r'property="og:title"\s+content="([^"]+)"', html)
    if m:
        title = m.group(1)
    m = re.search(r'property="og:image"\s+content="([^"]+)"', html)
    if m:
        og_image = m.group(1).replace("&amp;", "&")
    m = re.search(r'property="og:description"\s+content="([^"]+)"', html)
    if m:
        desc = m.group(1)
    return {"title": title, "ogImage": og_image, "description": desc}


def main() -> None:
    html = fetch(PROFILE)
    models = extract_models(html)
    print(f"Found {len(models)} models on profile page", file=sys.stderr)
    hk_keywords = re.compile(
        r"hollow.?knight|silksong|hornet|vessel|dreamer|hallownest|"
        r"grimm|nail|moss|crystal|zote|shade|void|larva|mantis|"
        r"harrah|herra|monomon|lurien|quirrel|stag|bark|watcher",
        re.I,
    )
    hk = [m for m in models if hk_keywords.search(m["slug"])]
    print(json.dumps({"all": models, "hollow_knight_likely": hk}, indent=2))


if __name__ == "__main__":
    main()

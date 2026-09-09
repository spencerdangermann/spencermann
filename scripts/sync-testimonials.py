#!/usr/bin/env python3
"""Harvest strong MakerWorld comments for the homepage testimonials scroller."""
from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_JSON = ROOT / "data" / "models.json"
OUT_JSON = ROOT / "data" / "testimonials.json"

COMMENT_URL = (
    "https://makerworld.com/api/v1/comment-service/comment"
    "?designId={design_id}&limit={limit}&offset={offset}"
)

TOP_MODELS = 22
COMMENTS_PER_MODEL = 25
KEEP = 14
MIN_CHARS = 45
MAX_QUOTE = 220

# Keep the homepage family-friendly / on-brand.
PREFERRED_CATEGORIES = {
    "hollow-knight",
    "glitch-productions",
    "water-fountains",
    "utility",
}
EXCLUDED_MODEL_IDS = {
    "feet-shoes-because-what-s-more-beautiful-than-feet",
}

SKIP_PATTERNS = (
    re.compile(r"^\s*boost", re.I),
    re.compile(r"^\s*nice\s*[!.]*\s*$", re.I),
    re.compile(r"^\s*cool\s*[!.]*\s*$", re.I),
    re.compile(r"^\s*thanks?\s*[!.]*\s*$", re.I),
    re.compile(r"^\s*thank you\s*[!.]*\s*$", re.I),
    re.compile(r"^\s*great\s*[!.]*\s*$", re.I),
    re.compile(r"http[s]?://", re.I),
)


def fetch_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        return json.loads(resp.read())


def clean_quote(text: str) -> str:
    text = re.sub(r"\s+", " ", (text or "")).strip()
    if len(text) <= MAX_QUOTE:
        return text
    chunk = text[: MAX_QUOTE + 1]
    cut = chunk.rfind(" ")
    if cut > 80:
        return chunk[:cut].rstrip(".,;:") + "…"
    return text[:MAX_QUOTE].rstrip(".,;:") + "…"


def is_usable(content: str) -> bool:
    if len(content) < MIN_CHARS:
        return False
    if re.search(r"http[s]?://", content, re.I):
        return False
    short_only = (
        r"^\s*(boost|nice|cool|thanks?|thank you|great)\s*[!.]*\s*$"
    )
    if re.match(short_only, content, re.I):
        return False
    return True


def score_comment(comment: dict, model: dict) -> float:
    content = (comment.get("content") or "").strip()
    likes = int(comment.get("likeCount") or 0)
    images = comment.get("images") or []
    score = likes * 12.0
    score += min(len(content), 240) / 8.0
    if images:
        score += 55
    if comment.get("isPinned"):
        score += 40
    if comment.get("isDesignCreatorLiked"):
        score += 25
    if comment.get("boosted"):
        score += 10
    # Prefer photo prints slightly over text-only for the scroller
    if images and len(content) >= 60:
        score += 15
    cats = set(model.get("categories") or [model.get("category")])
    if cats & PREFERRED_CATEGORIES:
        score += 35
    if model.get("category") == "hollow-knight":
        score += 20
    return score


def main() -> None:
    models = json.loads(MODELS_JSON.read_text(encoding="utf-8"))["models"]
    ranked = sorted(
        [
            m
            for m in models
            if m.get("makerworldId") and m.get("id") not in EXCLUDED_MODEL_IDS
        ],
        key=lambda m: m.get("likes", 0),
        reverse=True,
    )[:TOP_MODELS]

    by_id = {m["id"]: m for m in models}
    harvested: list[dict] = []

    for model in ranked:
        design_id = int(model["makerworldId"])
        url = COMMENT_URL.format(
            design_id=design_id, limit=COMMENTS_PER_MODEL, offset=0
        )
        try:
            payload = fetch_json(url)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            continue

        for comment in payload.get("comments") or []:
            content = (comment.get("content") or "").strip()
            if not is_usable(content):
                continue
            user = comment.get("user") or {}
            name = (user.get("name") or user.get("handle") or "MakerWorld maker").strip()
            images = [img for img in (comment.get("images") or []) if img]
            harvested.append(
                {
                    "id": f"{design_id}-{comment.get('id')}",
                    "quote": clean_quote(content),
                    "author": name,
                    "likes": int(comment.get("likeCount") or 0),
                    "score": score_comment(comment, model),
                    "modelId": model["id"],
                    "modelTitle": model["title"],
                    "modelImage": model["image"],
                    "makerworldUrl": model["makerworldUrl"],
                    "commentImage": images[0] if images else "",
                    "hasPhoto": bool(images),
                }
            )
        time.sleep(0.12)

    # Prefer one strong comment per model when possible, then fill with next-best
    harvested.sort(key=lambda row: row["score"], reverse=True)
    selected: list[dict] = []
    seen_models: set[str] = set()
    seen_authors: set[str] = set()

    for row in harvested:
        if len(selected) >= KEEP:
            break
        if row["modelId"] in seen_models:
            continue
        author_key = row["author"].lower()
        if author_key in seen_authors:
            continue
        selected.append(row)
        seen_models.add(row["modelId"])
        seen_authors.add(author_key)

    for row in harvested:
        if len(selected) >= KEEP:
            break
        if any(s["id"] == row["id"] for s in selected):
            continue
        author_key = row["author"].lower()
        if author_key in seen_authors and len(selected) >= KEEP // 2:
            continue
        selected.append(row)
        seen_authors.add(author_key)

    # Drop scoring helper before write
    for row in selected:
        row.pop("score", None)

    OUT_JSON.write_text(
        json.dumps({"testimonials": selected}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "models_scanned": len(ranked),
                "comments_considered": len(harvested),
                "kept": len(selected),
                "with_photos": sum(1 for s in selected if s.get("hasPhoto")),
                "sample": [
                    {"author": s["author"], "model": s["modelTitle"][:40], "likes": s["likes"]}
                    for s in selected[:5]
                ],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

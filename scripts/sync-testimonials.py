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

TOP_MODELS = 28
COMMENTS_PER_MODEL = 40
KEEP = 14
MIN_CHARS = 50
MAX_QUOTE = 220

# Always pull comments from these even if they are not in the global top-N.
FORCE_INCLUDE_IDS = {
    "feet-shoes-because-what-s-more-beautiful-than-feet",
}

PREFERRED_CATEGORIES = {
    "hollow-knight",
    "glitch-productions",
    "water-fountains",
    "utility",
}

# Reject critical feedback, print failures, and feature requests.
NEGATIVE_RE = re.compile(
    r"("
    r"\bbroke\b|\bbroken\b|\bbreak(?:ing|s)?\b|\bcrack(?:ed|s)?\b|"
    r"\bfail(?:ed|ure|s|ing)?\b|\bissue(?:s)?\b|\bproblem(?:s)?\b|\bbug(?:s)?\b|"
    r"\btoo small\b|\btoo big\b|\btoo short\b|\btoo long\b|\bwon'?t fit\b|"
    r"\bdidn't work\b|\bdoesn'?t work\b|\bnot working\b|"
    r"\bstability issues\b|\blayer lines?\b|\bstress on\b|"
    r"\breglue\b|\bre-?glue\b|\bwobbly\b|\bwarped?\b|"
    r"\bwish you\b|\bcould you\b|\bcan you add\b|\bplease add\b|"
    r"\bwould be nice if\b|\bfeature request\b|\bsuggest(?:ion|ed)?\b|"
    r"\bwanted to (?:point out|give some input|mention)\b|"
    r"\bone thing i wanted\b|\bjust wanted to give\b|"
    r"\bis it possible\b|\bam i doing something wrong\b|"
    r"\bkeeps (?:failing|falling|breaking|warping)\b|"
    r"\brequired (?:a bit of )?fil(?:ing|e)\b|\bhad to (?:file|sand|glue|cut)\b|"
    r"\bbarely (?:fit|get)\b|\bprint profile\b|"
    r"\bdo not\b|\bdon'?t say\b|\bdoing something wrong\b|"
    r"\bhowever\b|\bconfused\b|\bopen to suggestions\b|"
    r"\bbarley\b|\bbarely\b|\bsize it down\b|"
    r"\byou should (?:make|add|do|create)\b|\bfor no reason\b|\bmemes?\b|"
    r"\ba little tough\b|\btough to get\b|\bhard to (?:get|remove)\b"
    r")",
    re.I,
)

POSITIVE_RE = re.compile(
    r"("
    r"\blove\b|\bloved\b|\bawesome\b|\bamazing\b|\bperfect\b|\bbeautiful\b|"
    r"\bstellar\b|\bclutch\b|\bincredible\b|\bfantastic\b|\bwonderful\b|"
    r"\bthank(?:s| you)\b|\bgreat(?: job| design| print)?\b|"
    r"\beasy (?:to )?print\b|\bcame out (?:great|perfect|amazing)\b|"
    r"\bfirst cosplay\b|\bso happy\b|\bmade (?:my|our|us)\b|"
    r"\baccurate\b|\bbrilliant\b|\bepic\b|\bhilarious\b|\bfunny\b|"
    r"\bperfeito\b|\bmaravilhoso\b|\bobrigado\b"
    r")",
    re.I,
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
    if re.match(r"^\s*(boost|nice|cool|thanks?|thank you|great)\s*[!.]*\s*$", content, re.I):
        return False
    if NEGATIVE_RE.search(content):
        return False
    # Lead with praise — reject comments that open as questions/complaints
    lead = content[:120].lower()
    if lead.lstrip().startswith(("is it ", "am i ", "why ", "how do i ", "can you ", "could you ")):
        return False
    if not POSITIVE_RE.search(content):
        return False
    # Prefer praise appearing early so the truncated card still reads positive
    if not POSITIVE_RE.search(content[:160]):
        return False
    return True


def score_comment(comment: dict, model: dict) -> float:
    content = (comment.get("content") or "").strip()
    likes = int(comment.get("likeCount") or 0)
    images = comment.get("images") or []
    score = likes * 14.0
    score += min(len(content), 240) / 8.0
    score += 12 * len(POSITIVE_RE.findall(content))
    if images:
        score += 60
    if comment.get("isPinned"):
        score += 40
    if comment.get("isDesignCreatorLiked"):
        score += 30
    if images and len(content) >= 60:
        score += 15
    cats = set(model.get("categories") or [model.get("category")])
    if cats & PREFERRED_CATEGORIES:
        score += 30
    if model.get("category") == "hollow-knight":
        score += 15
    if model.get("id") in FORCE_INCLUDE_IDS:
        score += 40
    return score


def harvest_model(model: dict) -> list[dict]:
    design_id = int(model["makerworldId"])
    url = COMMENT_URL.format(design_id=design_id, limit=COMMENTS_PER_MODEL, offset=0)
    try:
        payload = fetch_json(url)
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return []

    rows: list[dict] = []
    for comment in payload.get("comments") or []:
        content = (comment.get("content") or "").strip()
        if not is_usable(content):
            continue
        user = comment.get("user") or {}
        name = (user.get("name") or user.get("handle") or "MakerWorld maker").strip()
        images = [img for img in (comment.get("images") or []) if img]
        rows.append(
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
    return rows


def main() -> None:
    models = json.loads(MODELS_JSON.read_text(encoding="utf-8"))["models"]
    by_id = {m["id"]: m for m in models if m.get("makerworldId")}

    ranked = sorted(
        [m for m in models if m.get("makerworldId")],
        key=lambda m: m.get("likes", 0),
        reverse=True,
    )[:TOP_MODELS]

    # Ensure forced models are included in the scan set
    scan: list[dict] = []
    seen = set()
    for model in ranked:
        if model["id"] in seen:
            continue
        scan.append(model)
        seen.add(model["id"])
    for mid in FORCE_INCLUDE_IDS:
        model = by_id.get(mid)
        if model and mid not in seen:
            scan.append(model)
            seen.add(mid)

    harvested: list[dict] = []
    for model in scan:
        harvested.extend(harvest_model(model))
        time.sleep(0.1)

    harvested.sort(key=lambda row: row["score"], reverse=True)
    selected: list[dict] = []
    seen_models: set[str] = set()
    seen_authors: set[str] = set()

    # Guarantee at least one feet-design comment if any passed the filter
    for row in harvested:
        if row["modelId"] in FORCE_INCLUDE_IDS:
            selected.append(row)
            seen_models.add(row["modelId"])
            seen_authors.add(row["author"].lower())
            break

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
        if author_key in seen_authors and len(selected) >= max(8, KEEP - 3):
            continue
        selected.append(row)
        seen_authors.add(author_key)

    for row in selected:
        row.pop("score", None)

    OUT_JSON.write_text(
        json.dumps({"testimonials": selected}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "models_scanned": len(scan),
                "comments_considered": len(harvested),
                "kept": len(selected),
                "with_photos": sum(1 for s in selected if s.get("hasPhoto")),
                "includes_feet": any(
                    s["modelId"] in FORCE_INCLUDE_IDS for s in selected
                ),
                "quotes": [
                    {
                        "author": s["author"],
                        "model": s["modelTitle"][:40],
                        "quote": s["quote"][:90],
                    }
                    for s in selected
                ],
            },
            indent=2,
            ensure_ascii=True,
        )
    )


if __name__ == "__main__":
    main()

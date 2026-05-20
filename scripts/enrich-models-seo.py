#!/usr/bin/env python3
"""Ensure categories[], imageAlt, and keywords on all models in models.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODELS_JSON = ROOT / "data" / "models.json"

DUAL_CATEGORY = {
    "city-of-tears-pond-water-fountain-functional": ["hollow-knight", "water-fountains"],
    "working-city-of-tears-water-fountain-hollow-knight": ["hollow-knight", "water-fountains"],
}

ALT_OVERRIDES = {
    "large-hornet-mask-silk-song-hollow-knight-adult": (
        "Hornet Mask Hollow Knight Silksong adult size — free 3D print cosplay by Spencermann"
    ),
    "hornet-mask-hollow-knight-teen-child-sized": (
        "Hornet Mask Hollow Knight child and teen size — free 3D print cosplay"
    ),
    "hornet-s-needle-hollow-knight-cosplay": (
        "Hornet's Needle Hollow Knight cosplay prop — free 3D print download"
    ),
    "hornet-s-needle-big-silk-song-adult-cosplay": (
        "Hornet's Needle large Silksong adult cosplay — free 3D print STL"
    ),
    "the-pure-vessel-mask-from-hollow-knight": (
        "Pure Vessel Mask Hollow Knight cosplay — free 3D print by Spencermann"
    ),
    "hollow-knight-mask-adult-size-updated-cosplay": (
        "Hollow Knight Mask adult cosplay — free 3D print Knight mask"
    ),
    "the-nail-hollow-knight-sword-cosplay-tpu": (
        "The Nail Hollow Knight sword cosplay TPU — free 3D print prop"
    ),
    "the-grimm-mask-hollow-knight-adult-child-size": (
        "Grimm Mask Hollow Knight adult and child — free 3D print cosplay"
    ),
    "working-city-of-tears-water-fountain-hollow-knight": (
        "Hollow Knight City of Tears working water fountain — free 3D print pond sculpture"
    ),
    "city-of-tears-pond-water-fountain-functional": (
        "City of Tears pond water fountain Hollow Knight — free 3D print garden fountain"
    ),
    "kaboodle-articulated-gameoverse-glitch": (
        "Kaboodle articulated Gameoverse robot — free Glitch Productions 3D print by Spencermann"
    ),
}


def keyword_hints(title: str, primary: str, existing: list[str]) -> list[str]:
    t = title.lower()
    hints = list(existing or [])
    base = {
        "hollow-knight": [
            "Hollow Knight 3D print",
            "Hollow Knight cosplay",
            "Spencermann",
            "MakerWorld free download",
        ],
        "glitch-productions": [
            "Glitch Productions 3D print",
            "Murder Drones",
            "Gameoverse",
            "Spencermann",
            "MakerWorld free download",
        ],
        "water-fountains": [
            "3D printed water fountain",
            "pond fountain",
            "Spencermann",
            "MakerWorld free download",
        ],
        "utility": [
            "functional 3D print",
            "practical STL",
            "Spencermann",
            "MakerWorld free download",
        ],
        "other": [
            "free 3D print",
            "Spencermann",
            "MakerWorld STL download",
        ],
    }
    hints.extend(base.get(primary, base["other"]))

    if primary == "hollow-knight" or "hollow-knight" in primary:
        if "hornet" in t and "mask" in t:
            hints.extend(["Hornet Mask", "Hornet mask Silksong", "Hollow Knight Hornet cosplay"])
        if "needle" in t or "nail" in t:
            hints.extend(["Hornet's Needle", "Hollow Knight Nail", "cosplay sword 3D print"])
        if "pure vessel" in t:
            hints.extend(["Pure Vessel Mask", "Hollow Knight boss cosplay"])
        if "silksong" in t or "silk song" in t:
            hints.append("Silksong 3D print")
        if "dreamer" in t or "harrah" in t or "monomon" in t or "lurien" in t:
            hints.append("Hollow Knight Dreamer mask")
        if "grimm" in t:
            hints.extend(["Grimm Mask", "Grimmchild"])
        if "fountain" in t:
            hints.extend(["Hollow Knight fountain", "3D printed water fountain"])
        if "mantis" in t:
            hints.append("Mantis Lord Hollow Knight")
        if "lace" in t:
            hints.append("Lace Silksong")

    if primary == "glitch-productions":
        if "murder drones" in t:
            hints.append("Murder Drones figure")
        if "digital circus" in t or "tadc" in t:
            hints.append("The Amazing Digital Circus")
        if "kaboodle" in t or "gameoverse" in t:
            hints.extend(["Kaboodle", "Gameoverse robot"])

    seen = set()
    out = []
    for h in hints:
        key = h.lower()
        if key not in seen:
            seen.add(key)
            out.append(h)
    return out[:12]


def default_alt(title: str, primary: str) -> str:
    label = primary.replace("-", " ")
    return f"{title} — free 3D print ({label}) on MakerWorld | Spencermann"


def main() -> None:
    data = json.loads(MODELS_JSON.read_text(encoding="utf-8"))
    updated = 0
    for model in data["models"]:
        mid = model["id"]
        primary = model.get("category", "other")
        cats = DUAL_CATEGORY.get(mid)
        if cats:
            model["categories"] = cats
            updated += 1
        elif primary:
            model["categories"] = [primary]

        if model.get("likes") is None:
            model["likes"] = 0

        model["imageAlt"] = ALT_OVERRIDES.get(mid, default_alt(model["title"], primary))
        model["keywords"] = keyword_hints(
            model["title"], primary, model.get("keywords") or []
        )
        updated += 1

    MODELS_JSON.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(f"Enriched models.json ({updated} field updates)")


if __name__ == "__main__":
    main()

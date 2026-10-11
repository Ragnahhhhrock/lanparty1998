#!/usr/bin/env python3
"""Regenerate design/tokens.json from css/tokens.css (the source of truth).

    python3 scripts/build-tokens.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GROUPS = {
    "shell": ("w98-",),
    "crt": ("crt-", "phosphor", "dos-", "amber", "toast", "bsod"),
    "basement": ("basement", "wood", "carpet", "ceiling", "beige", "paper", "duct-", "cardboard", "pizza-", "pepperoni", "couch", "oak", "tv-", "console-"),
    "media": ("floppy-", "disk-", "disc-", "case-"),
    "brand": ("volt", "nacho", "cheese", "curlz", "zap-", "cup-"),
    "apps": ("mine-", "felt", "card-"),
    "people": ("link-led", "skin", "denim", "shoe", "hair", "eye-", "iris-", "lip", "clothes-", "neon-", "shirt-"),
    "font": ("font-",),
    "text": ("text-", "leading-"),
    "space": ("space-", "gutter"),
    "desktop": ("taskbar-", "startmenu-"),
    "bevel": ("bevel-", "title-gradient"),
    "overlay": ("scrim", "hud-bg", "bar-bg", "scanlines", "vignette"),
    "z": ("z-",),
    "motion": ("dur-",),
}

css = (ROOT / "css/tokens.css").read_text()
root = css[css.index(":root"):]
tokens = dict(re.findall(r"--([a-z0-9-]+):\s*(.*?);", root, re.S))

out = {
    "$comment": "Generated from css/tokens.css by scripts/build-tokens.py. Do not edit by hand.",
    "name": "LAN Party '98",
    "url": "https://lanparty1998.com",
}
placed = set()
for group, prefixes in GROUPS.items():
    out[group] = {}
    for key, value in tokens.items():
        if key.startswith(prefixes) and key not in placed:
            out[group][key] = re.sub(r"\s+", " ", value).strip()
            placed.add(key)

orphans = set(tokens) - placed
if orphans:
    sys.exit(f"Tokens with no group (add a prefix to GROUPS): {sorted(orphans)}")

(ROOT / "design/tokens.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"design/tokens.json: {len(tokens)} tokens")

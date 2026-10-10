#!/usr/bin/env python3
"""Render every generated raster asset from its HTML/SVG source.

    pip install playwright pillow && python3 -m playwright install chromium
    python3 scripts/render-social.py

Outputs (all committed):
    img/og-image.png        1200x630  Open Graph (Facebook, LinkedIn, Discord, Slack…)
    img/twitter-card.png    1200x600  X/Twitter summary_large_image (2:1)
    favicon-32.png          32x32     legacy favicon
    apple-touch-icon.png    180x180   iOS home screen
    img/icon-192.png        192x192   web manifest
    img/icon-512.png        512x512   web manifest
"""
import pathlib

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
CARD = (ROOT / "design/social/card.html").as_uri()
ICON = (ROOT / "favicon.svg").read_text()
BASEMENT = "#0b0906"  # --basement


def icon_page(size, pad):
    inner = size - pad * 2
    return (f"<html><body style='margin:0;background:{BASEMENT}'>"
            f"<div style='width:{size}px;height:{size}px;display:grid;place-items:center'>"
            f"<div style='width:{inner}px;height:{inner}px'>{ICON.replace('<svg ', '<svg width=100% height=100% ')}</div>"
            "</div></body></html>")


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(device_scale_factor=1)

    for variant, w, h, out in [("og", 1200, 630, "img/og-image.png"),
                               ("twitter", 1200, 600, "img/twitter-card.png")]:
        page.set_viewport_size({"width": w, "height": h})
        page.goto(f"{CARD}?variant={variant}")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(300)
        page.locator("#card").screenshot(path=str(ROOT / out))

    for size, pad, out in [(32, 0, "favicon-32.png"), (180, 20, "apple-touch-icon.png"),
                           (192, 24, "img/icon-192.png"), (512, 64, "img/icon-512.png")]:
        page.set_viewport_size({"width": size, "height": size})
        page.set_content(icon_page(size, pad))
        page.screenshot(path=str(ROOT / out), omit_background=False)

    browser.close()

for f in ["img/og-image.png", "img/twitter-card.png", "favicon-32.png",
          "apple-touch-icon.png", "img/icon-192.png", "img/icon-512.png"]:
    path = ROOT / f
    Image.open(path).convert("RGB").save(path, optimize=True)
    print(f, Image.open(path).size, f"{path.stat().st_size // 1024} KB")

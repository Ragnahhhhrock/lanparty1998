#!/usr/bin/env python3
"""Render the explainer video from design/video/explainer.html.

    pip install playwright && python3 -m playwright install chromium
    python3 scripts/render-video.py            # both shapes
    python3 scripts/render-video.py wide       # YouTube only
    python3 scripts/render-video.py portrait   # TikTok / Reels / Shorts only

Needs ffmpeg, the footage in img/video/ (scripts/capture-video.py) and the music in video/audio/volt-rush.m4a
(rendered from js/music.js by scripts/render-music.py).

Outputs (committed):
    video/lanparty1998-explainer-youtube-1920x1080.mp4
    video/lanparty1998-explainer-portrait-1080x1920.mp4
    video/lanparty1998-thumbnail-youtube.jpg, video/lanparty1998-cover-portrait.jpg
"""
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "design/video/explainer.html").as_uri()
AUDIO = ROOT / "video/audio/volt-rush.m4a"
FPS = 24
SHAPES = {
    "wide": dict(size=(960, 540), out="video/lanparty1998-explainer-youtube-1920x1080.mp4", thumb="video/lanparty1998-thumbnail-youtube.jpg", still=1.2),
    "portrait": dict(size=(540, 960), out="video/lanparty1998-explainer-portrait-1080x1920.mp4", thumb="video/lanparty1998-cover-portrait.jpg", still=1.2),
}


def render(name, cfg):
    w, h = cfg["size"]
    out = ROOT / cfg["out"]
    out.parent.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
        page.goto(f"{PAGE}?fmt={name}")
        page.evaluate("preload()")
        duration = page.evaluate("DURATION")
        frames = round(duration * FPS)
        page.evaluate(f"seek({cfg['still']})")
        page.screenshot(path=str(ROOT / cfg["thumb"]), type="jpeg", quality=92)
        ff = subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
             "-i", str(AUDIO), "-t", f"{duration}",
             "-af", f"afade=t=out:st={duration - 2}:d=2",
             "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)],
            stdin=subprocess.PIPE)
        for i in range(frames):
            page.evaluate(f"seek({i / FPS})")
            ff.stdin.write(page.screenshot(type="jpeg", quality=92))
        ff.stdin.close()
        ff.wait()
        browser.close()
    print(f"{out.relative_to(ROOT)}: {frames} frames, {duration}s")


if __name__ == "__main__":
    for n in (sys.argv[1:] or list(SHAPES)):
        render(n, SHAPES[n])

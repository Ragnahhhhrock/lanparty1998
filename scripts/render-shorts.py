#!/usr/bin/env python3
"""Render the portrait shorts from design/video/shorts.html (scenes in design/video/shorts-data.js).

    pip install playwright && python3 -m playwright install chromium
    python3 scripts/render-shorts.py                  # all eight
    python3 scripts/render-shorts.py food lanamp      # only these

Needs ffmpeg, the footage in img/video/shorts/ (scripts/capture-shorts.py) and the music in video/shorts/audio/
(scripts/render-music.py "<track>" 30 video/shorts/audio/<short>.m4a; which track goes with which short is in
shorts-data.js).

Outputs (committed): video/shorts/lanparty1998-<short>-1080x1920.mp4 and video/shorts/lanparty1998-<short>-cover.jpg
"""
import pathlib
import subprocess
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "design/video/shorts.html").as_uri()
FPS = 24
SHORTS = ["builder", "network", "room", "food", "console", "chat", "desktop", "lanamp"]
STILL = 1.6  # the cover frame: the first scene with its caption up


def render(name):
    out = ROOT / f"video/shorts/lanparty1998-{name}-1080x1920.mp4"
    out.parent.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 540, "height": 960}, device_scale_factor=2)
        page.goto(f"{PAGE}?short={name}")
        page.evaluate("preload()")
        duration = page.evaluate("DURATION")
        audio = ROOT / "video/shorts/audio" / page.evaluate("AUDIO")
        assert duration <= 30, f"{name} is {duration}s; shorts stay at 30 seconds or less"
        frames = round(duration * FPS)
        page.evaluate(f"seek({STILL})")
        page.screenshot(path=str(out.parent / f"lanparty1998-{name}-cover.jpg"), type="jpeg", quality=92)
        ff = subprocess.Popen(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-",
             "-i", str(audio), "-t", f"{duration}",
             "-af", f"afade=t=in:d=0.3,afade=t=out:st={duration - 1.5}:d=1.5",
             "-c:v", "libx264", "-preset", "slow", "-crf", "21", "-pix_fmt", "yuv420p", "-r", str(FPS),
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)],
            stdin=subprocess.PIPE)
        for i in range(frames):
            page.evaluate(f"seek({i / FPS})")
            ff.stdin.write(page.screenshot(type="jpeg", quality=92))
        ff.stdin.close()
        ff.wait()
        browser.close()
    print(f"{out.relative_to(ROOT)}: {frames} frames, {duration}s", flush=True)


if __name__ == "__main__":
    for n in (sys.argv[1:] or SHORTS):
        render(n)

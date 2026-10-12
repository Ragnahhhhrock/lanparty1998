#!/usr/bin/env python3
"""Capture the room and desktop footage for design/video/explainer.html from the real site.

    pip install playwright && python3 -m playwright install chromium
    python3 -m http.server 8099 &            # from the repo root
    python3 scripts/capture-video.py portrait   # 720x1280 -> img/video/p/*.jpg
    python3 scripts/capture-video.py wide       # 1280x720  -> img/video/w/*.jpg
    python3 scripts/capture-video.py wide food  # only the named shots (desk for the three desktop shots)

Walks into the room as FRAGMASTER, takes the standard PC from BUILDPC.EXE, hides the HUD and puts the camera at each
pose. The game frames in img/video/games/ are captured separately from the emulator (DOS canvas screenshots) and
checked by eye: avoid title screens, which carry the games' logos.
"""
import math
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PI = math.pi
SITE = "http://localhost:8099/index.html?room=video"
HIDE = "#hud,#taskbar,#desktop,#prompt,#toast,#chat,#stand-btn{display:none!important}"

# name: (x, y, z, yaw, pitch). yaw 0 faces the back wall (-z); positive turns left.
POSES = {
    "title": (1, 1.6, 3, -0.6, -0.05),
    "walk": (-2.0, 1.6, -2.0, -PI / 2, -0.05),
    "sit": (-3.5, 1.7, -3.5, -0.75, -0.2),
    "dm": (-3, 1.6, 0, -PI / 2, -0.05),
    "bench": (0.5, 1.6, -1.8, 0.35, -0.15),
    "power": (-1.5, 1.6, 1.0, PI, -0.05),
    "food": (2.0, 1.6, -2.0, PI / 2, -0.05),
    "phone": (0, 1.5, -1.5, 0, -0.2),
    "lounge": (-0.3, 1.6, -1.0, -1.9, -0.12),
    "shelf": (-1, 1.6, 3, 0.6, -0.05),
}
DESK_POSE = (-2.0, 1.6, -2.0, -PI / 2, -0.05)


def menu(page, *path):
    page.evaluate("document.querySelector('#start-btn').click()")
    for label in path:
        page.evaluate("""(t) => { const b = [...document.querySelectorAll('#startmenu [role=menuitem]')]
            .find((x) => x.textContent.trim().toLowerCase().startsWith(t.toLowerCase())); if (b) b.click(); }""", label)
        page.wait_for_timeout(500)


def main(fmt, only=()):
    w, h, out = (720, 1280, "p") if fmt == "portrait" else (1280, 720, "w")
    dest = ROOT / "img/video" / out
    dest.mkdir(parents=True, exist_ok=True)

    def shot(page, name):
        page.screenshot(path=str(dest / f"{name}.jpg"), type="jpeg", quality=88, timeout=180000)

    def put(page, pose):
        x, y, z, yaw, pitch = pose
        page.evaluate(f"(()=>{{const p=window.lan.player;p.pos.set({x},{y},{z});p.yaw={yaw};p.pitch={pitch};}})()")
        page.wait_for_timeout(1500)

    with sync_playwright() as p:
        b = p.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        page = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
        page.goto(SITE)
        page.wait_for_timeout(3000)
        page.evaluate("document.querySelector('#handle').value='FRAGMASTER'; document.querySelector('#enter-btn').click()")
        page.wait_for_timeout(2500)
        wanted = lambda name: not only or name in only
        if wanted("wizard"):
            shot(page, "wizard")
        page.evaluate("document.querySelector('#wiz-std').click()")
        page.wait_for_timeout(800)
        page.evaluate("document.querySelector('#wiz-next').click()")
        page.wait_for_timeout(4000)

        # the desktop first, while its windows are open
        if wanted("desk"):
            put(page, DESK_POSE)
            shot(page, "desk1")
            menu(page, "Programs", "Snapster")
            page.wait_for_timeout(1500)
            shot(page, "desk2")
            menu(page, "Programs", "Games", "Minesweeper")
            menu(page, "Programs", "Games", "Solitaire")
            menu(page, "Programs", "Games", "Downhill")
            page.wait_for_timeout(1500)
            shot(page, "desk3")

        page.add_style_tag(content=HIDE)
        for name, pose in POSES.items():
            if wanted(name):
                put(page, pose)
                shot(page, name)
                print(fmt, name, flush=True)
        b.close()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "portrait", tuple(sys.argv[2:]))

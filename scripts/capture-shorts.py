#!/usr/bin/env python3
"""Capture the footage for the short explainer videos (design/video/shorts.html) from the real site.

    pip install playwright && python3 -m playwright install chromium
    (cd server && npx wrangler dev) &        # the room server, for deathmatch, voice and the second player
    python3 -m http.server 8099 &            # from the repo root
    python3 scripts/capture-shorts.py                 # every set
    python3 scripts/capture-shorts.py room food       # only the named sets
    MUSIC="/path/to/My Music" python3 scripts/capture-shorts.py lanamp

Portrait, 720x1280, into img/video/shorts/<set>-<shot>.jpg. Walks in as FRAGMASTER and drives the page the way a
player would: the camera is put at a pose looking at the thing, then the key is pressed (E, F, Y, T, M...).
"""
import math
import os
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEST = ROOT / "img/video/shorts"
SITE = "http://localhost:8099/index.html?room=shorts"
W, H = 720, 1280
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
        "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"]
EYE = 1.6
MUSIC = pathlib.Path(os.environ["MUSIC"]) if os.environ.get("MUSIC") else None


class Player:
    def __init__(self, browser, name, std=True, meters=False, size=(W, H), games=True):
        ctx = browser.new_context(viewport={"width": size[0], "height": size[1]}, permissions=["microphone"])
        self.page = ctx.new_page()
        # K-Rad and n00bslayer's two hidden DOS PCs make software GL crawl on a small machine: their CRTs show
        # the stand-in picture instead
        self.page.route("**/*-spectate.jsdos", lambda r: r.abort())
        if not games:  # a stand-in second player: sits and hosts, but runs no DOS box of its own
            self.page.route("**/bundles/*.zip", lambda r: r.abort())
        self.page.on("crash", lambda *_: print("   ! the page crashed", flush=True))
        self.page.on("pageerror", lambda e: print("   ! page error:", str(e)[:160], flush=True))
        self.page.goto(SITE, timeout=240000)
        self.page.wait_for_timeout(3000)
        self.js(f"document.querySelector('#handle').value='{name}'; document.querySelector('#enter-btn').click()")
        self.wait(2500)
        if std:
            self.wizard_done()
        self.page.add_style_tag(content="#crosshair{display:none!important}")
        self.hide("#setup{display:none!important}" + ("" if meters else "#meters{display:none!important}"))

    def js(self, code, arg=None):
        return self.page.evaluate(code, arg)

    def wait(self, ms):
        self.page.wait_for_timeout(ms)

    def wizard_done(self):
        self.js("document.querySelector('#wiz-std').click()")
        self.wait(800)
        self.js("document.querySelector('#wiz-next').click()")
        self.wait(4000)

    def put(self, x, y, z, yaw, pitch=-0.05, settle=1500):
        self.js(f"(()=>{{const p=window.lan.player;p.pos.set({x},{y},{z});p.yaw={yaw};p.pitch={pitch};}})()")
        self.wait(settle)

    def look(self, frm, at, settle=1500):
        """Stand at frm (x, z) at eye height and look at the point at (x, y, z)."""
        x, z = frm
        dx, dy, dz = at[0] - x, at[1] - EYE, at[2] - z
        yaw = math.atan2(-dx, -dz)
        pitch = math.atan2(dy, math.hypot(dx, dz))
        self.put(x, EYE, z, yaw, pitch, settle)

    def aim(self, frm, at, want="", timeout=25000):
        """Look at a thing and wait until the room has noticed (its E/F prompt shows): frames are slow in software GL."""
        self.look(frm, at, 300)
        try:
            self.page.wait_for_function("""(w) => { const p = document.querySelector('#prompt');
                return p && !p.hidden && p.textContent && p.textContent.toLowerCase().includes(w.toLowerCase()); }""", arg=want, timeout=timeout)
        except Exception:
            print("   ! no prompt for", repr(want), "at", frm, at, flush=True)
        self.wait(600)

    def use(self, frm, at, want="", code="KeyE", settle=2500):
        self.aim(frm, at, want)
        self.key(code, settle)

    def where(self, kind, test="true"):
        """World position of the first thing in the room you can use of this kind (test is JS on its interact data t)."""
        return self.js(f"""() => {{ const v = new (window.lan.player.pos.constructor)();
            for (const o of window.lan.room.interactables) {{ const t = o.userData.interact;
              if (t && t.kind === '{kind}' && ({test})) {{ o.getWorldPosition(v); return [v.x, v.y, v.z]; }} }} return null; }}""")

    def type(self, text, settle=600):
        self.page.keyboard.type(text, delay=60)
        self.wait(settle)

    def press(self, key, settle=900):
        self.page.keyboard.press(key)
        self.wait(settle)

    def wait_for(self, js, timeout=120000):
        try:
            self.page.wait_for_function(js, timeout=timeout)
            return True
        except Exception:
            print("   ! gave up waiting for", js[:80], flush=True)
            return False

    def key(self, code, settle=900, shift=False):
        self.js("([c, s]) => { for (const t of ['keydown', 'keyup']) window.dispatchEvent(new KeyboardEvent(t, { code: c, key: c.replace('Key', '').toLowerCase(), shiftKey: s, bubbles: true })); }", [code, shift])
        self.wait(settle)

    def click(self, sel, settle=700):
        self.js("(s) => document.querySelector(s)?.click()", sel)
        self.wait(settle)

    def button(self, text, settle=700, scope="body"):
        """Click the first visible button whose label starts with text."""
        ok = self.js("""([t, s]) => { const b = [...document.querySelectorAll(s + ' button, ' + s + ' [role=menuitem]')]
            .find((x) => x.offsetParent && x.textContent.trim().toLowerCase().startsWith(t.toLowerCase())); if (b) b.click(); return !!b; }""", [text, scope])
        self.wait(settle)
        return ok

    def sit(self, pc):
        """Sit at a PC the way E does (lan.sitDown), and wait for the seated bar."""
        self.js("""(n) => { for (const o of window.lan.room.interactables) { const t = o.userData.interact;
            if (t && t.kind === 'sit' && t.station.name === n) { window.lan.sitDown(t.station); return; } } }""", pc)
        self.wait_for("() => !document.querySelector('#seated-bar').hidden", 60000)
        # js-dos asks you to click to capture the mouse; a player clicks it away, so the footage leaves it out
        self.js("""() => setInterval(() => { for (const e of document.querySelectorAll('#dos *'))
            if (/capture mouse/i.test(e.textContent) && !e.querySelector('canvas'))
              e.style.display = 'none'; }, 300)""")
        self.wait(1500)

    def menu(self, *path, run=True):
        """Start, then down the submenus (focusing an item opens its submenu, as hovering does), and click the last
        item. No mouse: moving it over the room would turn the camera."""
        if self.js("document.querySelector('#startmenu').hidden"):
            self.js("document.querySelector('#start-btn').click()")
            self.wait(500)
        for i, label in enumerate(path):
            last = i == len(path) - 1
            ok = self.js("""([t, click]) => { const b = [...document.querySelectorAll('#startmenu .sm-item')]
                .find((x) => x.offsetParent && x.querySelector('.sm-label').textContent.trim().startsWith(t));
                if (!b) return false; if (click) b.click(); else b.focus(); return true; }""", [label, last and run])
            if not ok:
                print("   ! no menu item", label, flush=True)
            self.wait(700)

    def shot(self, name):
        DEST.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(DEST / f"{name}.jpg"), type="jpeg", quality=88, timeout=180000)
        print("  ", name, flush=True)

    def hide(self, css):
        self.page.add_style_tag(content=css)

    def dismiss(self):
        """Close a message box (the price list, the phone) if one is up."""
        self.js("() => { const d = document.querySelector('#dialog'); if (d && !d.hidden) document.querySelector('#dialog-close').click(); }")
        self.wait(800)

    def close_windows(self):
        self.js("document.querySelectorAll('[data-act=close]').forEach((b) => b.click())")
        self.wait(500)


SETS = {}


def shotset(fn):
    SETS[fn.__name__] = fn
    return fn


@shotset
def builder(b):
    me = Player(b, "FRAGMASTER", std=False)
    me.shot("builder-0")                    # step 1, the monitor
    for i in range(1, 8):                   # processor, memory, drives, network card, sound, keyboard and mouse, receipt
        me.click("#wiz-next", 1200)
        me.shot(f"builder-{i}")
    me.click("#wiz-next", 4000)             # pay and carry it to the bench
    me.hide("#setup{display:none!important}#meters{display:none!important}")
    me.close_windows()
    mine = "window.lan.room.benches[t.bench].owner === 'me'"
    mon = me.where("bench-place", mine + " && /monitor/.test(t.part)") or me.where("bench-place", mine)
    print("   bench outline at", mon, flush=True)
    me.aim((mon[0] + 0.3, mon[2] + 1.3), mon, "Unpack")
    me.shot("builder-outline")
    me.js("() => { const b = window.lan.room.benches.find((x) => x.owner === 'me'); for (const p of b.setup.parts()) b.place(p.id); }")
    me.wait(2500)
    tower = me.where("bench-tower", mine)
    me.look((tower[0] + 0.5, tower[2] + 1.5), (tower[0] - 0.2, 0.9, tower[2]), 2500)
    me.shot("builder-unpacked")
    me.aim((tower[0] + 0.3, tower[2] + 1.2), tower, "Behind the PC")
    me.key("KeyE", 2000)
    me.shot("builder-rear")
    for _ in range(12):                     # every lead into its socket
        if not me.js("() => { const b = [...document.querySelectorAll('#rear-body button')].find((x) => x.textContent === 'Plug in' && !x.disabled); if (b) b.click(); return !!b; }"):
            break
        me.wait(500)
    me.wait(800)
    me.shot("builder-plugged")
    me.click("#rear-go", 1500)
    me.click("#rear-close", 1000)
    me.look((tower[0] + 0.1, tower[2] + 1.1), (tower[0] - 0.3, 1.05, tower[2] - 0.1), 3500)
    me.shot("builder-post")
    me.wait(5000)
    me.shot("builder-post2")


@shotset
def network(b):
    me = Player(b, "FRAGMASTER")
    me.close_windows()
    me.aim((0.2, -3.0), (0.0, 0.74, -4.37), "Sit down")
    me.shot("net-sit")
    me.look((0.2, -1.6), (0.0, 1.0, -4.4), 2500)
    me.shot("net-idle")                     # a free PC's screen: IPXSETUP waiting for players
    me.sit("PC-02")
    me.wait(30000)                          # DOOM boots in js-dos
    me.shot("net-doom")
    mate = Player(b, "LLAMA_99", size=(320, 568), games=False)
    mate.close_windows()
    mate.sit("PC-03")
    mate.wait_for("() => !document.querySelector('#dm-btn').closest('#dm').hidden", 30000)
    mate.click("#dm-btn", 2000)             # Host a deathmatch
    me.wait(3000)
    me.shot("net-join")
    me.click("#dm-btn", 2500)               # Join deathmatch
    me.shot("net-joined")
    mate.wait(2000)
    mate.button("Start", 2000, "#dm")
    me.wait(20000)                          # reboots into IPXSETUP and looks for the other node
    me.shot("net-ipx")
    me.wait(10000)
    me.shot("net-ipx2")


@shotset
def room(b):
    me = Player(b, "FRAGMASTER")
    me.close_windows()
    sw = (4.35, 1.2, -4.99)
    me.look((2.6, -1.6), sw, 2500)
    me.shot("room-wide")
    me.aim((3.6, -3.6), sw, "lights off")
    me.shot("room-switch")
    me.key("KeyE", 4000)
    me.look((0.8, 0.2), (5.45, 1.0, 3.6), 4000)
    me.shot("room-dark")
    me.look((1.2, 1.8), (-2.0, 0.9, -4.4), 3000)
    me.shot("room-dark2")
    me.use((3.6, -3.6), sw, "lights on", settle=4000)
    me.look((1.2, 1.8), (-2.0, 0.9, -4.4), 3000)
    me.shot("room-light")
    # the door to the stairs (Mum), the fan, DUCTAPE, the bean bag, the CD tray, the game shelf
    me.use((4.6, -3.6), (5.15, 1.05, -4.95), "Open the door", settle=2500)
    me.shot("room-door")
    me.key("KeyE", 1500)
    me.aim((2.8, 0.9), (3.9, 0.65, 0.3), "fan")
    me.shot("room-fan")
    me.look((0.2, 3.6), (-2.6, 2.0, 2.2), 2500)
    me.shot("room-ductape")
    me.use((-1.9, 1.2), (-2.6, 2.12, 2.2), "DUCTAPE", settle=2500)
    me.shot("room-ductape2")
    me.close_windows()
    me.aim((-4.2, -2.5), (-5.1, 0.5, -3.35), "bean bag")
    me.shot("room-beanbag")
    me.key("KeyE", 3000)
    me.shot("room-beanbag2")
    me.key("KeyW", 2500)
    me.look((-2.0, 1.0), (-5.8, 1.0, 3.0), 2500)
    me.shot("room-shelf")


@shotset
def food(b):
    me = Player(b, "FRAGMASTER", meters=True)
    me.close_windows()
    me.use((-3.0, -3.1), (-3.16, 0.74, -4.13), "Volt Cola", settle=2500)
    me.shot("food-volt")
    me.look((-3.6, 0.2), (-5.5, 0.74, 0.3), 2000)
    me.shot("food-table")
    me.aim((-4.4, 0.9), (-5.5, 0.74, 0.79), "Nachoz")
    me.shot("food-nachoz")
    me.key("KeyE", 2500)
    me.dismiss()
    me.aim((-4.4, 1.6), (-5.62, 0.74, 1.46), "Citrus Zap")
    me.key("KeyE", 1200)
    me.shot("food-zap")
    me.dismiss()
    # the wall phone and Pizza Shack
    me.aim((-4.6, -2.6), (-5.8, 1.3, -2.81), "Use the phone")
    me.shot("food-phone")
    me.key("KeyE", 1500)
    me.shot("food-phone2")
    me.button("Pizza Shack", 500, "#dialog")
    me.wait_for("() => /SHACK/.test(document.querySelector('#dialog-title')?.textContent || '')", 30000)
    me.wait(800)
    me.shot("food-menu")
    me.button("Order", 1500, "#dialog")
    me.shot("food-ordered")
    me.button("Hang up", 1500, "#dialog")
    me.js("document.querySelector('#dialog-close')?.click()")
    me.wait(1000)
    # about eight game minutes later the driver knocks. Software GL runs a frame or two a second and each frame
    # counts at most 0.05 s, so the party clock is run 30 times faster until he does
    me.js("""async () => { const m = await import('/js/party.js'); const t = m.Party.prototype.tick;
        m.Party.prototype._tick = t; m.Party.prototype.tick = function (dt, ctx) { return t.call(this, dt * 30, ctx); }; }""")
    me.look((4.2, -2.6), (5.15, 1.05, -4.95), 1000)
    me.wait_for("() => /knock/i.test(document.querySelector('#toast')?.textContent || '') && !document.querySelector('#toast').hidden", 600000)
    me.js("async () => { const m = await import('/js/party.js'); m.Party.prototype.tick = m.Party.prototype._tick; }")
    me.aim((4.6, -3.6), (5.15, 1.05, -4.95), "Somebody is knocking")
    me.shot("food-knock")
    me.key("KeyE", 1200)
    me.shot("food-driver")
    me.wait(1500)
    me.shot("food-handover")
    box = me.where("pizza", "t.box.fresh")
    print("   fresh box at", box, flush=True)
    if box:
        me.aim((box[0] + 0.9, box[2] + (0.9 if box[2] < 0 else -0.9)), box, "pizza")
        me.key("KeyE", 2000)
        me.shot("food-box")
        me.key("KeyE", 2000)
        me.shot("food-slice")
    me.key("KeyG", 2500)
    me.shot("food-garlic")


@shotset
def console(b):
    me = Player(b, "FRAGMASTER")
    me.close_windows()
    me.look((2.6, -2.9), (5.6, 0.9, -1.0), 2500)
    me.shot("con-lounge")
    me.aim((4.4, -1.0), (5.7, 0.3, -1.0), "console")
    me.shot("con-prompt")
    me.key("KeyE", 1000)
    me.wait_for("() => !document.querySelector('#console-bar').hidden", 30000)
    me.wait(6000)
    # the TV is wider than a portrait screen: widen the lens for these shots so the whole prompt is in frame
    me.js("() => { const c = window.lan.camera; c.fov = 92; c.updateProjectionMatrix(); }")
    me.wait(2500)
    me.shot("con-tv")
    me.type("HELP", 300)
    me.press("Enter", 2500)
    me.shot("con-help")
    me.type("CLS", 200)
    me.press("Enter", 800)
    me.type("DIR", 300)
    me.press("Enter", 2500)
    me.shot("con-dir")
    me.js("() => { const c = window.lan.camera; c.fov = 60; c.updateProjectionMatrix(); }")


@shotset
def chat(b):
    me = Player(b, "FRAGMASTER", meters=True)
    me.close_windows()
    mate = Player(b, "LLAMA_99", size=(320, 568), games=False)
    mate.close_windows()
    mate.put(0.0, 1.6, 0.4, 0.0)            # stands in the aisle, facing the back wall
    me.look((0.9, 2.2), (0.0, 1.5, 0.4), 4000)
    me.shot("chat-mate")
    me.key("KeyY", 4000)                    # voice: the fake microphone is allowed
    mate.key("KeyY", 4000)
    me.wait(5000)
    me.shot("chat-voice")
    mate.key("KeyT", 500)
    mate.type("anyone got a spare mouse ball", 300)
    mate.press("Enter", 500)
    me.wait(3000)
    me.shot("chat-bubble")
    me.key("KeyT", 500)
    me.type("check under PC-04", 300)
    me.shot("chat-typing")
    me.press("Enter", 2500)
    me.key("KeyI", 1500)
    me.shot("chat-irc")
    me.key("KeyY", 2500)                    # mute
    me.shot("chat-muted")
    me.put(-2.0, 1.6, 4.0, 0.15)            # walk off: further away is quieter, silent at 9 m
    me.wait(3000)
    me.shot("chat-far")


@shotset
def desktop(b):
    me = Player(b, "FRAGMASTER")
    me.put(-2.0, 1.6, -2.0, -math.pi / 2, -0.05, 2500)
    me.shot("win-ie")                       # Internet Explorer is open on the news when you walk in
    me.close_windows()
    me.menu("Programs", run=False)
    me.shot("win-start")
    me.menu("Programs", "Games", run=False)
    me.shot("win-games")
    me.js("document.querySelector('#start-btn').click()")
    me.wait(500)
    for name, path in [("win-snapster", ("Programs", "Snapster")), ("win-mine", ("Programs", "Games", "Minesweeper")),
                       ("win-solitaire", ("Programs", "Games", "Solitaire")), ("win-ski", ("Programs", "Games", "Downhill")),
                       ("win-dos", ("Programs", "Accessories", "MS-DOS Prompt")), ("win-paint", ("Programs", "Accessories", "Paint")),
                       ("win-defrag", ("Programs", "Accessories", "System Tools", "Disk Defragmenter")), ("win-calc", ("Programs", "Accessories", "Calculator"))]:
        me.close_windows()
        me.menu(*path)
        me.wait(1500)
        if name == "win-dos":
            me.type("DIR", 200)
            me.press("Enter", 1200)
        if name == "win-defrag":
            me.button("Start", 3000)
        me.shot(name)
    me.close_windows()
    me.key("KeyI", 1500)
    me.shot("win-irc")
    me.close_windows()
    me.menu("Shut Down")
    me.wait(1200)
    me.shot("win-shutdown")


@shotset
def lanamp(b):
    """MUSIC is a folder of a few .mp3 files with ID3 tags for the ADD DIR shots (any will do; the shorts used tagged
    copies of LANamp's own tracks under Snapster's made-up band names). It goes in through the folder chooser LANamp
    uses when there is no showDirectoryPicker."""
    me = Player(b, "FRAGMASTER")
    me.close_windows()
    me.put(-2.0, 1.6, -2.0, -math.pi / 2, -0.05, 1500)
    me.key("KeyM", 1500)
    me.shot("amp-window")
    me.key("KeyX", 4000)                    # play
    me.shot("amp-playing")
    me.key("KeyB", 3000)                    # next
    me.shot("amp-next")
    if MUSIC:
        me.page.set_input_files("#amp-files", str(MUSIC))
        me.wait(1200)
        me.shot("amp-scan")
        me.wait(5000)
        me.shot("amp-added")
        me.js("() => [...document.querySelectorAll('#amp-list li')].find((x) => /Pepperoni/.test(x.textContent))?.click()")
        me.wait(4000)
        me.shot("amp-own")


def main(only):
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        for name, fn in SETS.items():
            if not only or name in only:
                print(name, flush=True)
                fn(b)
        b.close()


if __name__ == "__main__":
    main(tuple(sys.argv[1:]))

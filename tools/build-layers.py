"""
Split the locked island and library concepts into replaceable layers.

The ground plate keeps terrain, water, paths, and grass. Each landmark,
hero tree, picnic blanket, and animal mascot is its own PNG. The game
depth-sorts those PNGs with the existing plate sprites.

Requires Pillow and OpenCV. From the repo root:

    python3 tools/build-layers.py
"""
import json
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC_ISLAND = ROOT / "assets" / "painted" / "sources" / "island-concept.jpg"
SRC_LIBRARY = ROOT / "assets" / "painted" / "sources" / "library-hangout.jpg"
LAYER_DIR = ROOT / "assets" / "painted" / "layers"
W, H = 1280, 720
WORLD_W, WORLD_H = 32.0, 18.0

# Front to back. Later cuts see earlier sprites already lifted off the working image.
# rect is x, y, w, h. peel is border-connected ground/sky removed from the sprite.
RECTS = [
    ("fox", "mascot", (255, 228, 115, 145), "ground"),
    ("pink-friend", "mascot", (278, 418, 85, 105), "ground"),
    ("white-cat", "mascot", (328, 505, 75, 85), "ground"),
    ("bird", "mascot", (788, 472, 72, 82), "ground"),
    ("chick", "mascot", (1088, 328, 85, 125), "ground"),
    ("snail", "mascot", (1000, 615, 95, 95), "ground"),
    ("sprout", "mascot", (930, 600, 80, 90), "ground"),
    ("wing-cat", "mascot", (48, 585, 95, 110), "ground"),
    ("arcade", "building", (62, 72, 145, 245), "ground", {"door_inset": 0.36}),
    ("lighthouse", "building", (1100, 18, 140, 200), "ground", {"door_inset": 0.28}),
    ("mushroom-house", "building", (395, 385, 165, 185), "ground", {"door_inset": 0.26}),
    ("library", "building", (415, 145, 230, 255), "ground", {"door_inset": 0.22}),
    ("cottage", "building", (665, 165, 270, 265), "ground", {"door_inset": 0.22}),
    ("market", "building", (955, 265, 175, 205), "ground", {"door_inset": 0.28}),
    ("picnic", "decor", (655, 495, 210, 130), "none"),
    ("tree-green", "nature", (320, 0, 340, 270), "sky-grass"),
    ("tree-pink", "nature", (850, 0, 230, 230), "sky-grass"),
]


def is_ground_bgr(b, g, r):
    if g > r + 16 and g > b + 8 and 60 < g < 210 and r < 185 and b < 170:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if r > 170 and g > 135 and 75 < b < 195 and r + 8 >= g and g > b + 8 and lum > 130:
        return True
    return False


def is_sky_bgr(b, g, r):
    if b > 150 and b > r + 22 and b >= g - 12 and g > r - 8:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 218 and max(r, g, b) - min(r, g, b) < 42


def peel(fg, bgr, mode):
    if mode == "none":
        return fg
    h, w = fg.shape
    out = fg.copy()
    seen = np.zeros_like(fg, np.uint8)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y, x]:
            continue
        seen[y, x] = 1
        b, g, r = (int(v) for v in bgr[y, x])
        open_px = is_sky_bgr(b, g, r) if mode == "sky" else False
        if mode in ("ground", "sky-grass") and is_ground_bgr(b, g, r):
            open_px = True
        if mode == "sky-grass" and is_sky_bgr(b, g, r):
            open_px = True
        if not open_px:
            continue
        out[y, x] = 0
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return out


def grab_mask(work, rect):
    x, y, w, h = rect
    x = max(0, min(W - 4, x))
    y = max(0, min(H - 4, y))
    w = max(4, min(W - x, w))
    h = max(4, min(H - y, h))
    mask = np.zeros(work.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(work, mask, (x, y, w, h), bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    fg[:y, :] = 0
    fg[y + h:, :] = 0
    fg[:, :x] = 0
    fg[:, x + w:] = 0
    return fg, (x, y, w, h)


def crop_fg(original, fg):
    ys, xs = np.where(fg > 0)
    if len(xs) == 0:
        return None
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    alpha = fg[y0:y1, x0:x1]
    bgr = original[y0:y1, x0:x1]
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = alpha
    return rgba, x0, y0, x1, y1, int((alpha > 0).sum())


def inpaint_work(work, holes):
    """Bleed nearest kept color into holes on the working image."""
    filled = work.copy()
    dist = np.full((H, W), 255, np.uint8)
    qx, qy = deque(), deque()
    ys, xs = np.where(holes == 0)
    dist[ys, xs] = 0
    for x, y in zip(xs.tolist(), ys.tolist()):
        qx.append(x)
        qy.append(y)
    while qx:
        x = qx.popleft()
        y = qy.popleft()
        base = int(dist[y, x])
        if base >= 254:
            continue
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= W or ny >= H:
                continue
            if dist[ny, nx] <= base + 1:
                continue
            dist[ny, nx] = base + 1
            filled[ny, nx] = filled[y, x]
            qx.append(nx)
            qy.append(ny)
    blur = cv2.GaussianBlur(filled, (0, 0), 1.4)
    filled[holes > 0] = blur[holes > 0]
    return filled


def is_air_pixel(r, g, b):
    return b > 150 and b > r + 25 and b >= g - 12 and g > r - 8


def air_mask(rgb):
    air = np.zeros((H, W), np.uint8)
    q = deque()
    for y in range(H):
        for x in range(W):
            if is_air_pixel(*rgb[y, x]):
                air[y, x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx >= W or ny >= H or air[ny, nx]:
                continue
            r, g, b = (int(v) for v in rgb[ny, nx])
            lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
            if is_air_pixel(r, g, b) or (lum > 214 and max(r, g, b) - min(r, g, b) < 48):
                air[ny, nx] = 1
                q.append((nx, ny))
    return air


def nearest_land(air, x, y, max_rad=48):
    x = int(np.clip(x, 0, W - 1))
    y = int(np.clip(y, 0, H - 1))
    if air[y, x] == 0:
        return x, y
    for rad in range(1, max_rad + 1):
        for dy in range(-rad, rad + 1):
            for dx in range(-rad, rad + 1):
                if max(abs(dx), abs(dy)) != rad:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H and air[ny, nx] == 0:
                    return nx, ny
    return x, y


def world(px, py):
    return round((px / W - 0.5) * WORLD_W, 3), round((py / H - 0.5) * WORLD_H, 3)


def upscale(rgba):
    im = Image.fromarray(rgba, "RGBA")
    return im.resize((im.width * 2, im.height * 2), Image.Resampling.LANCZOS)


def build_island():
    original = cv2.imread(str(SRC_ISLAND))
    if original is None:
        raise SystemExit(f"missing {SRC_ISLAND}")
    if original.shape[1] != W or original.shape[0] != H:
        original = cv2.resize(original, (W, H), interpolation=cv2.INTER_AREA)
    work = original.copy()
    holes = np.zeros((H, W), np.uint8)
    sprites = []
    for spec in RECTS:
        name, kind, rect, peel_mode = spec[:4]
        extra = spec[4] if len(spec) > 4 else {}
        fg, rect = grab_mask(work, rect)
        x, y, w, h = rect
        peeled = peel(fg[y:y + h, x:x + w], original[y:y + h, x:x + w], peel_mode)
        full = np.zeros((H, W), np.uint8)
        full[y:y + h, x:x + w] = peeled
        full[holes > 0] = 0
        cropped = crop_fg(original, full)
        if not cropped:
            print(f"skip {name}: empty")
            continue
        rgba, x0, y0, x1, y1, opaque = cropped
        bw, bh = x1 - x0, y1 - y0
        if kind == "mascot" and (bw > 150 or bh > 170 or opaque < 200):
            print(f"skip {name}: mascot cut {bw}x{bh} opaque {opaque}")
            continue
        if opaque < 80:
            print(f"skip {name}: tiny")
            continue
        holes[full > 0] = 1
        work = inpaint_work(original, holes)
        foot_x = (x0 + x1) / 2
        foot_y = y1
        wx, wz = world(foot_x, foot_y)
        sprites.append({
            "id": name,
            "kind": kind,
            "rgba": rgba,
            "x0": x0,
            "y0": y0,
            "x1": x1,
            "y1": y1,
            "x": wx,
            "z": wz,
            "width": round((x1 - x0) / W * WORLD_W, 3),
            "height": round((y1 - y0) / H * WORLD_H, 3),
            "extra": extra,
            "opaque": opaque,
        })
        print(f"{name:16} {bw:4}x{bh:<4} at ({wx:.2f},{wz:.2f}) opaque {opaque}")

    ground_bgr = inpaint_work(original, holes)
    rgb = cv2.cvtColor(original, cv2.COLOR_BGR2RGB)
    air = air_mask(rgb)

    mask = Image.new("RGB", (W // 2, H // 2), (255, 0, 0))
    mp = mask.load()
    for y in range(H // 2):
        for x in range(W // 2):
            votes = int(air[y * 2, x * 2]) + int(air[y * 2, x * 2 + 1]) + int(air[y * 2 + 1, x * 2]) + int(air[y * 2 + 1, x * 2 + 1])
            mp[x, y] = (0, 0, 255) if votes >= 2 else (255, 0, 0)
    for x in range(mask.width):
        mp[x, 0] = (0, 255, 0)
        mp[x, 1] = (0, 255, 0)

    LAYER_DIR.mkdir(parents=True, exist_ok=True)
    for old in LAYER_DIR.glob("*.png"):
        old.unlink()
    for entry in sprites:
        big = upscale(entry["rgba"])
        big.save(LAYER_DIR / f"{entry['id']}.png")
        entry["pixelWidth"] = big.width
        entry["pixelHeight"] = big.height
        entry["file"] = f"assets/painted/layers/{entry['id']}.png"

    ground = Image.fromarray(cv2.cvtColor(ground_bgr, cv2.COLOR_BGR2RGB))
    plate = ground.resize((W * 2, H * 2), Image.Resampling.LANCZOS)
    # Save the painting only. A vertical pad made by stretching the top and
    # bottom rows becomes a hard seam: the cliff, flowers, and foliage smear
    # into streaks. The camera frames these pixels and does not show past them.
    plate.save(ROOT / "assets" / "painted" / "plate.png", optimize=True)
    mask.save(ROOT / "assets" / "painted" / "walk-mask.png")

    preview = ground.convert("RGBA")
    # Paint back in back-to-front so the check matches the game's depth order.
    for entry in reversed(sprites):
        preview.alpha_composite(Image.fromarray(entry["rgba"], "RGBA"), (entry["x0"], entry["y0"]))
    preview.convert("RGB").resize((1100, 619), Image.Resampling.LANCZOS).save("/tmp/layer-preview.jpg", quality=86)
    ground.resize((1100, 619), Image.Resampling.LANCZOS).save("/tmp/layer-ground.jpg", quality=86)
    contact_sheet(sprites)
    return sprites, air


def contact_sheet(sprites):
    buildings = [s for s in sprites if s["kind"] == "building"]
    if not buildings:
        return
    cell = 280
    sheet = Image.new("RGBA", (cell * len(buildings), cell + 28), (255, 228, 214, 255))
    for i, sprite in enumerate(buildings):
        im = Image.fromarray(sprite["rgba"], "RGBA")
        im.thumbnail((cell - 16, cell - 16), Image.Resampling.LANCZOS)
        sheet.alpha_composite(im, (i * cell + (cell - im.width) // 2, (cell - im.height) // 2))
    sheet.convert("RGB").save("/tmp/layered-buildings.jpg", quality=90)


def layout_for(sprites, air):
    by_id = {s["id"]: s for s in sprites}
    houses = {}
    circles = []
    doors = {}
    for sprite in sprites:
        if sprite["kind"] == "building":
            inset = sprite["extra"].get("door_inset", 0.22)
            south = int(sprite["y0"] + (sprite["y1"] - sprite["y0"]) * (1 - inset))
            cx = int((sprite["x0"] + sprite["x1"]) / 2)
            px, py = nearest_land(air, cx, min(H - 1, south + 18))
            doors[sprite["id"]] = (px, py)
            corners = [
                (sprite["x0"], sprite["y0"]),
                (sprite["x1"], sprite["y0"]),
                (sprite["x1"], south),
                (sprite["x0"], south),
            ]
            houses[sprite["id"]] = [world(x, y) for x, y in corners]
        elif sprite["kind"] == "nature":
            cx = (sprite["x0"] + sprite["x1"]) / 2
            cy = sprite["y1"] - 6
            wx, wz = world(cx, cy)
            circles.append({"id": sprite["id"], "x": wx, "z": wz, "radius": 0.46, "role": "trunk"})
        elif sprite["kind"] == "mascot":
            circles.append({
                "id": sprite["id"],
                "x": sprite["x"],
                "z": sprite["z"],
                "radius": 0.32,
                "role": "mascot",
            })

    def look(sprite_id):
        sprite = by_id[sprite_id]
        return world((sprite["x0"] + sprite["x1"]) / 2, (sprite["y0"] + sprite["y1"]) / 2)

    def land_spot(pair):
        x, y = nearest_land(air, int(pair[0]), int(pair[1]))
        return dict(zip(("x", "z"), world(x, y)))

    spawn = land_spot((620, 430))
    layout = {
        "start": spawn,
        "home": dict(zip(("x", "z"), look("cottage"))) if "cottage" in by_id else spawn,
        "tealHouse": dict(zip(("x", "z"), look("mushroom-house"))) if "mushroom-house" in by_id else spawn,
        "lighthouse": dict(zip(("x", "z"), look("lighthouse"))) if "lighthouse" in by_id else spawn,
        "lighthousePad": land_spot(doors.get("lighthouse", (1160, 200))),
        "arcade": dict(zip(("x", "z"), look("arcade"))) if "arcade" in by_id else spawn,
        "arcadeDoor": land_spot(doors.get("arcade", (130, 280))),
        "library": dict(zip(("x", "z"), look("library"))) if "library" in by_id else spawn,
        "libraryDoor": land_spot(doors.get("library", (520, 380))),
        "cottageDoor": land_spot(doors.get("cottage", (800, 400))),
        "companion": land_spot((180, 420)),
        "pino": land_spot((220, 460)),
    }
    return layout, houses, circles


def build_library():
    original = cv2.imread(str(SRC_LIBRARY))
    if original.shape[1] != W or original.shape[0] != H:
        original = cv2.resize(original, (W, H), interpolation=cv2.INTER_AREA)
    # The raccoon is the figure in the middle of the hangout.
    fg, rect = grab_mask(original, (470, 260, 340, 400))
    x, y, w, h = rect
    peeled = peel(fg[y:y + h, x:x + w], original[y:y + h, x:x + w], "ground")
    full = np.zeros((H, W), np.uint8)
    full[y:y + h, x:x + w] = peeled
    cropped = crop_fg(original, full)
    if not cropped:
        raise SystemExit("could not cut the library raccoon")
    rgba, x0, y0, x1, y1, opaque = cropped
    holes = np.zeros((H, W), np.uint8)
    holes[full > 0] = 1
    ground = Image.fromarray(cv2.cvtColor(inpaint_work(original, holes), cv2.COLOR_BGR2RGB))
    big = upscale(rgba)
    hang = ground.resize((W * 2, H * 2), Image.Resampling.LANCZOS)
    big.save(LAYER_DIR / "raccoon.png")
    hang.save(LAYER_DIR / "library-hangout.png", optimize=True)
    box = {
        "left": round(100 * x0 / W, 2),
        "top": round(100 * y0 / H, 2),
        "width": round(100 * (x1 - x0) / W, 2),
    }
    print(f"raccoon {x1 - x0}x{y1 - y0} opaque {opaque} css {box}")
    preview = ground.convert("RGBA")
    preview.alpha_composite(Image.fromarray(rgba, "RGBA"), (x0, y0))
    preview.convert("RGB").resize((960, 540), Image.Resampling.LANCZOS).save("/tmp/library-preview.jpg", quality=86)
    return box


def js_num(n):
    return f"{n:.3f}".rstrip("0").rstrip(".")


def write_js(sprites, layout, houses, circles, raccoon):
    bias = {"nature": -0.02, "building": 0, "decor": -1.15, "mascot": 0.04}
    lines = [
        "/**",
        " * Replaceable island layers. Generated by tools/build-layers.py.",
        " * Swap a PNG in assets/painted/layers/ and refresh. Do not redraw the whole map.",
        " * The anchor is the bottom center of each sprite.",
        " */",
        "export const PAINTED_SPRITES = [",
    ]
    for sprite in sprites:
        lines += [
            "  {",
            f'    id: "{sprite["id"]}",',
            f'    src: "{sprite["file"]}",',
            f'    kind: "{sprite["kind"]}",',
            f'    pixelWidth: {sprite["pixelWidth"]},',
            f'    pixelHeight: {sprite["pixelHeight"]},',
            f'    width: {js_num(sprite["width"])},',
            f'    height: {js_num(sprite["height"])},',
            "    anchor: { x: 0.5, y: 0 },",
            f'    x: {js_num(sprite["x"])},',
            f'    z: {js_num(sprite["z"])},',
            f'    depthBias: {js_num(bias.get(sprite["kind"], 0))},',
            "  },",
        ]
    lines += ["];", "", "export const LAYOUT = {"]
    for key, value in layout.items():
        lines.append(f'  {key}: {{ x: {js_num(value["x"])}, z: {js_num(value["z"])} }},')
    lines += ["};", "", "export const HOUSES = {"]
    for name, corners in houses.items():
        pts = ", ".join(f"[{js_num(x)}, {js_num(z)}]" for x, z in corners)
        lines.append(f"  {json.dumps(name)}: [{pts}],")
    lines += ["};", "", "export const CIRCLES = ["]
    for circle in circles:
        lines.append(
            '  { id: "%s", x: %s, z: %s, radius: %s, role: "%s" },'
            % (circle["id"], js_num(circle["x"]), js_num(circle["z"]), js_num(circle["radius"]), circle["role"])
        )
    lines += [
        "];",
        "",
        "export const LIBRARY_MASCOT = {",
        '  src: "assets/painted/layers/raccoon.png",',
        '  background: "assets/painted/layers/library-hangout.png",',
        f'  left: "{raccoon["left"]}%",',
        f'  top: "{raccoon["top"]}%",',
        f'  width: "{raccoon["width"]}%",',
        "};",
        "",
    ]
    path = ROOT / "src" / "data" / "layers.js"
    path.write_text("\n".join(lines))
    print("wrote", path)


def main():
    if not SRC_ISLAND.exists() or not SRC_LIBRARY.exists():
        raise SystemExit(f"missing concept sources in {SRC_ISLAND.parent}")
    sprites, air = build_island()
    layout, houses, circles = layout_for(sprites, air)
    raccoon = build_library()
    write_js(sprites, layout, houses, circles, raccoon)
    print("spawn", layout["start"])
    print("doors", {k: layout[k] for k in ("libraryDoor", "cottageDoor", "arcadeDoor", "lighthousePad")})


if __name__ == "__main__":
    main()

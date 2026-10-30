"""
Rebuild the outdoor island as one painting.

The old pipeline cut buildings, trees, and animals out of the concept and
stacked the pieces back onto a plate whose top and bottom rows had been
stretched. Canopies met that stretch as a hard line, trees drew through
roofs, and the bottom edge smeared. This script keeps the concept intact:
no edge pad, no building or tree cutouts. Outdoor animals and butterflies
are painted out of the grass and sky. The library room keeps its own files.

    python3 tools/build-layers.py
"""
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "painted" / "sources" / "island-concept.jpg"
LAYER_DIR = ROOT / "assets" / "painted" / "layers"
W, H = 1280, 720

# Windows that sit on the creature, not on a neighboring building.
GRAB = {
    "fox": (248, 220, 130, 155),
    "pink-friend": (270, 420, 90, 90),
    "white-cat": (310, 500, 90, 100),
    "bird": (780, 455, 80, 90),
    "center-cat": (688, 440, 120, 110),
    "witch-chick": (948, 228, 102, 118),
    "mushroom-buddy": (850, 490, 110, 120),
    "snail": (820, 545, 155, 120),
}
BUTTERFLIES = [
    (266, 78, 76, 78),
    (996, 122, 70, 80),
    (72, 338, 64, 64),
    (1036, 214, 48, 42),
]

# These files were cut-out stickers. The game no longer draws them.
RETIRED = [
    "fox", "pink-friend", "white-cat", "bird", "chick", "snail", "wing-cat",
    "tree-green", "tree-pink", "cottage", "library", "market", "mushroom-house",
    "arcade", "lighthouse", "picnic",
]


def grab_creature(original, rect):
    x, y, w, h = rect
    mask = np.zeros(original.shape[:2], np.uint8)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(original, mask, (x, y, w, h), bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    fg[:y, :] = 0
    fg[y + h:, :] = 0
    fg[:, :x] = 0
    fg[:, x + w:] = 0
    n, lab, stats, _ = cv2.connectedComponentsWithStats((fg > 0).astype(np.uint8))
    if n <= 1:
        return fg
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return np.where(lab == i, 255, 0).astype(np.uint8)


def channel_views(image):
    b, g, r = [c.astype(np.int16) for c in cv2.split(image)]
    sky = (b > 150) & (b > r + 18) & (b + 8 >= g) & (g > r - 10)
    strict = (g > r + 14) & (g > b + 8) & (g > 110) & (r < 175) & (b < 150)
    grass = (g > r + 10) & (g > b + 6) & (g > 95) & (r < 200) & (b < 170)
    dark = (r.astype(np.int32) + g.astype(np.int32) + b.astype(np.int32)) < 380
    return sky, strict, grass, dark


def limited(mask, strict, sky, dark, radius):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    inv = cv2.bitwise_not(mask)
    dist = cv2.distanceTransform(inv, cv2.DIST_L2, 5)
    allow = dist <= radius
    m = mask.copy()
    for _ in range(radius):
        dil = cv2.dilate(m, k)
        take = (dil > 0) & (m == 0) & allow & ~strict & ~sky
        if not np.any(take):
            break
        m[take] = 255
    m[(dist < 8) & dark & ~sky] = 255
    return cv2.dilate(m, k, 1)


def grass_fill(image, mask, pool, rng):
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return image
    out = image.copy()
    out[ys, xs] = pool[rng.integers(0, len(pool), len(ys))]
    blur = cv2.GaussianBlur(out, (0, 0), 1.35)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    weight = np.clip(dist / 6, 0, 1)[:, :, None]
    soft = cv2.GaussianBlur(out, (0, 0), 2.1)
    mix = soft.astype(np.float32) * (1 - weight) + blur.astype(np.float32) * weight
    out[mask > 0] = np.clip(mix[mask > 0], 0, 255).astype(np.uint8)
    return out


def nearest_map(mask):
    h, w = mask.shape
    hole = mask > 0
    iy = np.zeros((h, w), np.int32)
    ix = np.zeros((h, w), np.int32)
    seen = np.zeros((h, w), np.uint8)
    q = deque()
    dil = cv2.dilate(mask, np.ones((3, 3), np.uint8))
    for y, x in zip(*np.where((dil > 0) & ~hole)):
        y, x = int(y), int(x)
        q.append((x, y))
        seen[y, x] = 1
        iy[y, x] = y
        ix[y, x] = x
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny, nx] and hole[ny, nx]:
                seen[ny, nx] = 1
                iy[ny, nx] = iy[y, x]
                ix[ny, nx] = ix[y, x]
                q.append((nx, ny))
    return iy, ix


def butterfly_mask(image, rect):
    x, y, w, h = rect
    crop = image[y:y + h, x:x + w]
    ring = np.concatenate([crop[0], crop[-1], crop[:, 0], crop[:, -1]], 0)
    med = np.median(ring, 0)
    diff = np.abs(crop.astype(np.int16) - med).sum(2)
    fg = (diff > 30).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((fg > 0).astype(np.uint8))
    if n <= 1:
        full = np.zeros(image.shape[:2], np.uint8)
        return full
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    fg = np.where(lab == i, 255, 0).astype(np.uint8)
    fg = cv2.dilate(fg, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), 2)
    full = np.zeros(image.shape[:2], np.uint8)
    full[y:y + h, x:x + w] = fg
    return full


def fill_butterfly(image, mask):
    """Replace a butterfly with the surrounding sky, never with a nearby tree."""
    iy, ix = nearest_map(mask)
    out = image.copy()
    ys, xs = np.where(mask > 0)
    if len(ys) == 0:
        return out
    copied = image[iy[ys, xs], ix[ys, xs]]
    b = copied[:, 0].astype(np.int16)
    r = copied[:, 2].astype(np.int16)
    skyish = (b > 140) & (b > r + 8)
    med = np.median(copied[skyish], 0) if np.any(skyish) else np.array([210, 190, 140])
    use = copied.astype(np.float32)
    use[~skyish] = med
    out[ys, xs] = np.clip(use, 0, 255).astype(np.uint8)
    blur = cv2.GaussianBlur(out, (0, 0), 0.9)
    out[mask > 0] = blur[mask > 0]
    return out


def fill_fox(image, mask, pool, rng):
    """Head copies the bushes behind it. Body copies lawn."""
    iy, ix = nearest_map(mask)
    ys, xs = np.where(mask > 0)
    cut = ys.min() + int((ys.max() - ys.min()) * 0.5)
    upper = ys < cut
    out = image.copy()
    out[ys[upper], xs[upper]] = image[iy[ys[upper], xs[upper]], ix[ys[upper], xs[upper]]]
    lower = np.zeros_like(mask)
    lower[ys[~upper], xs[~upper]] = 255
    return grass_fill(out, lower, pool, rng)


def fill_witch(image, mask):
    """Copy only bush green or sky. Roofs and the awning are not donors."""
    ys, xs = np.where(mask > 0)
    out = image.copy()
    h, w = image.shape[:2]

    def good(px):
        b, g, r = int(px[0]), int(px[1]), int(px[2])
        if b > 145 and b > r + 12 and g > r - 5:
            return True
        return g > r + 12 and g > b - 5 and 70 < g < 210 and r < 170

    for y, x in zip(ys.tolist(), xs.tolist()):
        picked = None
        for rad in range(1, 48):
            for nx, ny in ((x - rad, y), (x + rad, y), (x, y - rad), (x, y + rad)):
                if 0 <= nx < w and 0 <= ny < h and mask[ny, nx] == 0 and good(image[ny, nx]):
                    picked = image[ny, nx]
                    break
            if picked is not None:
                break
        if picked is None:
            picked = np.array([80, 150, 90], np.uint8)
        out[y, x] = picked
    blur = cv2.GaussianBlur(out, (0, 0), 2.4)
    dist = cv2.distanceTransform(mask, cv2.DIST_L2, 5)
    weight = np.clip(dist / 6, 0, 1)[:, :, None]
    mix = blur.astype(np.float32) * (1 - weight) + out.astype(np.float32) * weight
    out[mask > 0] = np.clip(mix[mask > 0], 0, 255).astype(np.uint8)
    return out


def is_air_pixel(r, g, b):
    r, g, b = int(r), int(g), int(b)
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


def write_layers():
    text = """/**
 * Island layout. The outdoor picture is one painting (assets/painted/plate.png).
 * Buildings and trees stay in that painting so they cannot clip through each other.
 * Outdoor animals and butterflies are not drawn. The library room still has its own files.
 * The anchor of a future outdoor sprite is the bottom center.
 */
export const PAINTED_SPRITES = [];

export const LAYOUT = {
  start: { x: -0.5, z: 1.75 },
  home: { x: 3.9, z: -1.525 },
  tealHouse: { x: -3.675, z: 3.075 },
  lighthouse: { x: 13.288, z: -5.475 },
  lighthousePad: { x: 13.275, z: -3.7 },
  arcade: { x: -12.625, z: -4.3 },
  arcadeDoor: { x: -12.625, z: -1.8 },
  library: { x: -2.713, z: -2.612 },
  libraryDoor: { x: -2.725, z: 0.4 },
  cottageDoor: { x: 3.9, z: 1.85 },
  companion: { x: -11.5, z: 1.5 },
  pino: { x: -10.5, z: 2.5 },
};

export const HOUSES = {
  "arcade": [[-14.425, -7.2], [-10.825, -7.2], [-10.825, -3.5], [-14.425, -3.5]],
  "lighthouse": [[12.525, -6.9], [14.05, -6.9], [14.05, -4.85], [12.525, -4.85]],
  "mushroom-house": [[-5.35, 0.9], [-2, 0.9], [-2, 4.1], [-5.35, 4.1]],
  "library": [[-5.55, -5.375], [0.125, -5.375], [0.125, -1.075], [-5.55, -1.075]],
  "cottage": [[0.625, -4.65], [7.175, -4.65], [7.175, 0.225], [0.625, 0.225]],
  "market": [[7.875, -2.375], [11.825, -2.375], [11.825, 1.3], [7.875, 1.3]],
};

export const CIRCLES = [
  { id: "tree-green", x: -3.75, z: -2.6, radius: 0.46, role: "trunk" },
  { id: "tree-pink", x: 8.012, z: -4.3, radius: 0.46, role: "trunk" },
];

export const LIBRARY_MASCOT = {
  src: "assets/painted/layers/raccoon.png",
  background: "assets/painted/layers/library-hangout.png",
  left: "43.2%",
  top: "36.11%",
  width: "20.08%",
};
"""
    path = ROOT / "src" / "data" / "layers.js"
    path.write_text(text)
    print("wrote", path)


def main():
    original = cv2.imread(str(SRC))
    if original is None or original.shape[0] != H or original.shape[1] != W:
        raise SystemExit(f"expected {W}x{H} concept at {SRC}")
    sky, strict, _grass, dark = channel_views(original)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    masks = {name: grab_creature(original, rect) for name, rect in GRAB.items()}
    for name, mask in masks.items():
        print(f"mask {name:16} {int((mask > 0).sum())}")

    pool = original[576:606, 470:518].reshape(-1, 3)
    rng = np.random.default_rng(4)
    img = original.copy()
    for name in ("pink-friend", "white-cat", "bird", "center-cat", "mushroom-buddy", "snail"):
        img = grass_fill(img, limited(masks[name], strict, sky, dark, 16), pool, rng)
    img = fill_fox(img, cv2.dilate(masks["fox"], k, 2), pool, rng)
    img = fill_witch(img, cv2.dilate(masks["witch-chick"], k, 2))
    for rect in BUTTERFLIES:
        img = fill_butterfly(img, butterfly_mask(original, rect))

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    plate = Image.fromarray(rgb).resize((W * 2, H * 2), Image.Resampling.LANCZOS)
    plate_path = ROOT / "assets" / "painted" / "plate.png"
    plate.save(plate_path, optimize=True)
    print("plate", plate.size, plate_path)

    air = air_mask(rgb)
    mask_im = Image.new("RGB", (W // 2, H // 2), (255, 0, 0))
    mp = mask_im.load()
    for y in range(H // 2):
        for x in range(W // 2):
            votes = (
                int(air[y * 2, x * 2])
                + int(air[y * 2, x * 2 + 1])
                + int(air[y * 2 + 1, x * 2])
                + int(air[y * 2 + 1, x * 2 + 1])
            )
            mp[x, y] = (0, 0, 255) if votes >= 2 else (255, 0, 0)
    for x in range(mask_im.width):
        mp[x, 0] = (0, 255, 0)
        mp[x, 1] = (0, 255, 0)
    mask_im.save(ROOT / "assets" / "painted" / "walk-mask.png")

    for name in RETIRED:
        path = LAYER_DIR / f"{name}.png"
        if path.exists():
            path.unlink()
            print("retired", path.name)
    write_layers()

    preview = Path("/tmp/island-qa")
    preview.mkdir(exist_ok=True)
    Image.fromarray(rgb).save(preview / "ship-full.jpg", quality=88)
    crops = {
        "fox": (200, 180, 230, 210),
        "cottage": (860, 150, 280, 250),
        "library": (380, 80, 280, 280),
        "lawn": (620, 420, 280, 200),
        "top": (250, 0, 780, 110),
        "bottom": (0, 620, 1280, 100),
    }
    for name, (x, y, w, h) in crops.items():
        Image.fromarray(rgb[y:y + h, x:x + w]).save(preview / f"ship-{name}.jpg", quality=92)
    print("review", preview)


if __name__ == "__main__":
    main()

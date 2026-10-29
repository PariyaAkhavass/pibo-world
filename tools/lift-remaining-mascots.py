"""
Lift creatures that are still painted into the island plate so they can walk.

Fox, pink friend, white cat, and blue bird already have their own layers.
The snail, the little mushroom friend, the chick, the picnic wing-cat, and
the butterflies were missed or cut as scenery. This replaces those layer
files from the concept painting and paints grass or sky back into the plate.

Run from the repo root: python3 tools/lift-remaining-mascots.py
"""
import sys
from collections import deque
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CONCEPT = ROOT / "assets" / "painted" / "sources" / "island-concept.jpg"
PLATE = ROOT / "assets" / "painted" / "plate.png"
LAYER = ROOT / "assets" / "painted" / "layers"
HANGOUT = LAYER / "library-hangout.png"
RACCOON = LAYER / "raccoon.png"

# Concept pixels, 1280 x 720. rect is x, y, w, h.
CUTS = [
    ("snail", "ground", (845, 568, 155, 125)),
    ("mushroom-buddy", "ground", (875, 498, 115, 95)),
    ("chick", "ground", (945, 248, 100, 115)),
    ("wing-cat", "ground", (668, 468, 125, 115)),
    ("butterfly-purple", "sky", (78, 345, 70, 70)),
    ("butterfly-blue", "sky", (262, 78, 80, 75)),
    ("butterfly-lighthouse", "sky", (990, 145, 80, 70)),
]

# Bad cuts that stole scenery. Restore those pixels from the concept
# before the real characters are lifted, so the flowers and cliff stay.
RESTORE = [
    ("wing-cat", -13.613, 8.375),
    ("snail", 10.188, 8.75),
    ("chick", 12.6, 2.325),
]


def is_ground_bgr(b, g, r):
    if g > r + 16 and g > b + 8 and 60 < g < 210 and r < 185 and b < 170:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if r > 170 and g > 135 and 75 < b < 195 and r + 8 >= g and g > b + 8 and lum > 130:
        return True
    return False


def is_sky_bgr(b, g, r):
    if b > 150 and b > r + 18 and b >= g - 18 and g > r - 15:
        return True
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > 218 and max(r, g, b) - min(r, g, b) < 42


def peel(fg, bgr, mode):
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
        open_px = False
        if mode == "sky" and is_sky_bgr(b, g, r):
            open_px = True
        if mode == "ground" and is_ground_bgr(b, g, r):
            open_px = True
        if not open_px:
            continue
        out[y, x] = 0
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return out


def grab(work, rect):
    H, W = work.shape[:2]
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
    fg[y + h :, :] = 0
    fg[:, :x] = 0
    fg[:, x + w :] = 0
    return fg, (x, y, w, h)


def world_of(px, py, concept_w=1280, concept_h=720):
    x = (px / concept_w - 0.5) * 32
    z = (py / concept_h - 0.5) * 18
    return x, z


def cut_one(concept, name, mode, rect):
    fg, rect = grab(concept, rect)
    x, y, w, h = rect
    peeled = peel(fg[y : y + h, x : x + w], concept[y : y + h, x : x + w], mode)
    full = np.zeros(concept.shape[:2], np.uint8)
    full[y : y + h, x : x + w] = peeled
    ys, xs = np.where(full > 0)
    if len(xs) < 40:
        raise SystemExit(f"{name}: cut was empty")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    alpha = full[y0:y1, x0:x1]
    bgr = concept[y0:y1, x0:x1]
    rgba = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGBA)
    rgba[:, :, 3] = alpha
    big = Image.fromarray(rgba, "RGBA").resize(
        ((x1 - x0) * 2, (y1 - y0) * 2), Image.Resampling.LANCZOS
    )
    foot_x = (x0 + x1) / 2
    foot_y = y1
    wx, wz = world_of(foot_x, foot_y)
    width = (x1 - x0) / 1280 * 32
    height = (y1 - y0) / 720 * 18
    print(
        f"{name:22} {big.size[0]}x{big.size[1]} "
        f"world {wx:.3f},{wz:.3f} size {width:.3f}x{height:.3f} "
        f"opaque {int((alpha > 0).sum())}"
    )
    return big, full, wx, wz, width, height


def clean_wing_cat(big):
    """Drop grass and flowers the grab-cut kept around the picnic cat."""
    im = np.array(big)
    r, g, b, a = [im[:, :, i].astype(int) for i in range(4)]
    cream = (r > 170) & (g > 150) & (b > 130) & (a > 10)
    dark = (np.maximum(np.maximum(r, g), b) < 100) & (a > 10)
    blush = (r > 170) & (g > 100) & (b > 100) & (r > g) & (a > 10) & ~cream
    keep = (cream | dark | blush).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
    bridged = cv2.dilate(keep, kernel, iterations=1)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(bridged, 8)
    if count <= 1:
        return big, 0, 0
    best = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    region = labels == best
    green = (g > r + 12) & (g > b + 8)
    flower = (r > 160) & (g < 140) & (b < 140) & (r > g + 30)
    drop = (green | flower) & ~dark
    im[:, :, 3] = np.where(region & (a > 10) & ~drop, a, 0).astype(np.uint8)
    ys, xs = np.where(im[:, :, 3] > 10)
    crop = im[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    return Image.fromarray(crop, "RGBA"), int(xs.min()), int(ys.min())


def restore_scenery(plate, concept):
    """Put scenery stolen by the old bad mascot cuts back on the plate."""
    up = cv2.resize(concept, (2560, 1440), interpolation=cv2.INTER_CUBIC)
    band = plate[96 : 96 + 1440]
    for name, x, z in RESTORE:
        backup = Path(f"/tmp/{name.split('-')[0]}-before.png")
        if name == "wing-cat":
            backup = Path("/tmp/wing-before.png")
        if name == "chick":
            backup = Path("/tmp/chick-before.png")
        if name == "snail":
            backup = Path("/tmp/snail-before.png")
        sprite = cv2.imread(str(backup), cv2.IMREAD_UNCHANGED)
        if sprite is None:
            print("no backup for", name)
            continue
        alpha = sprite[:, :, 3]
        ph, pw = alpha.shape
        fx = int(round((x + 16) * 80))
        fy = int(round((z + 10.2) * 80))
        left = int(round(fx - pw / 2))
        top = int(round(fy - ph))
        for sy in range(ph):
            py = top + sy
            if py < 96 or py >= 96 + 1440:
                continue
            row_a = alpha[sy]
            xs = np.where(row_a > 20)[0]
            if len(xs) == 0:
                continue
            for sx in xs.tolist():
                px = left + sx
                if px < 0 or px >= 2560:
                    continue
                band[py - 96, px] = up[py - 96, px]
        print(f"restored scenery under old {name}")
    plate[96 : 96 + 1440] = band
    return plate


def paint_plate(plate, concept_mask):
    """concept_mask is 1280x720. Plate art sits 96px below the top."""
    H, W = concept_mask.shape
    assert (H, W) == (720, 1280)
    big = cv2.resize(concept_mask, (2560, 1440), interpolation=cv2.INTER_NEAREST)
    holes = np.zeros(plate.shape[:2], np.uint8)
    holes[96 : 96 + 1440, :] = (big > 0).astype(np.uint8) * 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    holes = cv2.dilate(holes, kernel, iterations=1)
    return cv2.inpaint(plate, holes, 5, cv2.INPAINT_TELEA)


def heal_hangout():
    hang = cv2.imread(str(HANGOUT), cv2.IMREAD_COLOR)
    rac = cv2.imread(str(RACCOON), cv2.IMREAD_UNCHANGED)
    if hang is None or rac is None:
        print("skip hangout heal")
        return
    hh, hw = hang.shape[:2]
    rh, rw = rac.shape[:2]
    left = int(round(hw * 0.432))
    top = int(round(hh * 0.3611))
    mask = np.zeros((hh, hw), np.uint8)
    alpha = rac[:, :, 3]
    x1, y1 = min(hw, left + rw), min(hh, top + rh)
    src = alpha[: y1 - top, : x1 - left]
    mask[top:y1, left:x1] = np.where(src > 20, 255, 0).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (18, 18))
    mask = cv2.dilate(mask, kernel, iterations=1)
    healed = cv2.inpaint(hang, mask, 7, cv2.INPAINT_TELEA)
    cv2.imwrite(str(HANGOUT), healed)
    print(f"healed library hangout hole {int((mask > 0).sum())} px")


def main():
    print("Creature sprites are already lifted into assets/painted/layers.")
    print("This tool is kept so the cuts can be inspected. It does not rewrite the plate.")
    return
    concept = cv2.imread(str(CONCEPT))
    plate = cv2.imread(str(PLATE))
    if concept is None or plate is None:
        raise SystemExit("missing concept or plate")
    if concept.shape[1] != 1280 or concept.shape[0] != 720:
        concept = cv2.resize(concept, (1280, 720), interpolation=cv2.INTER_AREA)
    # Always start from the plate as it was before this tool, if we saved one.
    before = Path("/tmp/plate-before.png")
    if before.exists():
        plate = cv2.imread(str(before))
    plate = restore_scenery(plate, concept)
    preview = Image.new("RGBA", (1400, 280), (255, 190, 210, 255))
    mask = np.zeros(concept.shape[:2], np.uint8)
    x_cursor = 8
    for name, mode, rect in CUTS:
        big, full, wx, wz, width, height = cut_one(concept, name, mode, rect)
        if name == "wing-cat":
            cleaned, crop_x, crop_y = clean_wing_cat(big)
            ys, xs = np.where(full > 0)
            x0, y0 = int(xs.min()), int(ys.min())
            # The saved sprite is 2x the concept. crop_x/y are inside that sprite.
            foot_x = x0 + (crop_x + cleaned.size[0] / 2) / 2
            foot_y = y0 + (crop_y + cleaned.size[1]) / 2
            wx, wz = world_of(foot_x, foot_y)
            width = cleaned.size[0] / 80
            height = cleaned.size[1] / 80
            full = np.zeros_like(full)
            alpha = np.array(cleaned)[:, :, 3]
            for sy in range(alpha.shape[0]):
                for sx in range(alpha.shape[1]):
                    if alpha[sy, sx] < 20:
                        continue
                    cx = int(x0 + (crop_x + sx) / 2)
                    cy = int(y0 + (crop_y + sy) / 2)
                    if 0 <= cx < full.shape[1] and 0 <= cy < full.shape[0]:
                        full[cy, cx] = 255
            big = cleaned
            print(f"  cleaned wing-cat {big.size[0]}x{big.size[1]} world {wx:.3f},{wz:.3f} size {width:.3f}x{height:.3f}")
        big.save(LAYER / f"{name}.png")
        mask = np.maximum(mask, full)
        thumb = big.copy()
        thumb.thumbnail((160, 220))
        preview.alpha_composite(thumb, (x_cursor, 20))
        x_cursor += 170
    painted = paint_plate(plate, mask)
    cv2.imwrite(str(PLATE), painted)
    preview.convert("RGB").save("/tmp/lifted-mascots.jpg", quality=90)
    Image.fromarray(cv2.cvtColor(painted, cv2.COLOR_BGR2RGB)).resize((960, 612)).save(
        "/tmp/plate-after-lift.jpg", quality=84
    )
    heal_hangout()
    print("wrote plate, layers, and /tmp previews")


if __name__ == "__main__":
    main()

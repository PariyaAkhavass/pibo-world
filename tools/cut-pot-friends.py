"""
Cut Paria's three pot friends out of the black sheet.

The sheet is her drawing: front, three-quarter, and closed-eye, left to right.
Background pixels are already transparent. This only crops each pot, knocks out
near-invisible black dust, and lines their feet up on one canvas so a pose
swap does not resize or slide them. The ink, blush, and yellow are unchanged.

    python3 tools/cut-pot-friends.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "pot-friends" / "sources" / "paria-pot-friends-sheet.png"
OUT = ROOT / "assets" / "pot-friends"
NAMES = ("front", "side", "closed")
SPANS = ((0, 740), (740, 1420), (1420, 10_000))
PAD = 10
ALPHA_KEEP = 16


def content_box(arr, x0, x1):
    h, w = arr.shape[:2]
    x1 = min(x1, w)
    alpha = arr[:, x0:x1, 3]
    ys, xs = np.where(alpha > ALPHA_KEEP)
    if len(xs) == 0:
        raise SystemExit(f"no pot pixels between x {x0} and {x1}")
    return int(xs.min() + x0), int(ys.min()), int(xs.max() + x0), int(ys.max())


def knock_dust(crop):
    rgb = crop[:, :, :3]
    alpha = crop[:, :, 3]
    mx = rgb.max(axis=2)
    dust = (alpha < 8) | ((mx < 8) & (alpha < 48))
    crop[dust, 3] = 0
    return crop


def main():
    if not SRC.exists():
        raise SystemExit(f"missing sheet: {SRC}")
    arr = np.array(Image.open(SRC).convert("RGBA"))
    boxes = [content_box(arr, x0, x1) for x0, x1 in SPANS]
    widths = [b[2] - b[0] + 1 for b in boxes]
    heights = [b[3] - b[1] + 1 for b in boxes]
    canvas_w = max(widths) + PAD * 2
    canvas_h = max(heights) + PAD * 2
    OUT.mkdir(parents=True, exist_ok=True)

    for name, box in zip(NAMES, boxes):
        x0, y0, x1, y1 = box
        crop = knock_dust(arr[y0 : y1 + 1, x0 : x1 + 1].copy())
        canvas = np.zeros((canvas_h, canvas_w, 4), dtype=np.uint8)
        bh, bw = crop.shape[:2]
        left = (canvas_w - bw) // 2
        top = canvas_h - PAD - bh
        canvas[top : top + bh, left : left + bw] = crop
        Image.fromarray(canvas, "RGBA").save(OUT / f"{name}.png")
        print(f"{name:6} {canvas_w}x{canvas_h} from {x0},{y0}-{x1},{y1}")


if __name__ == "__main__":
    main()

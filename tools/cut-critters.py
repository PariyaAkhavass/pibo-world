"""
Cut Paria's eight animal mascots off the checkered sheet.

The sheet is a flat RGB checker of white and light gray. Each animal is her
drawing: thick ink, flat color, bead eyes. This removes only the checker that
touches the outside of the picture, keeps interior whites (panda, fox tip),
and turns the soft edge into transparency so no checker fringe remains.

    python3 tools/cut-critters.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "critters" / "sources" / "paria-animal-mascots-sheet.png"
OUT = ROOT / "assets" / "critters"
NAMES = ("cat", "dog", "bunny", "panda", "frog", "penguin", "unicorn", "fox")
PAD = 6


def border_checker(rgb):
    mx = rgb.max(axis=2)
    sat = mx - rgb.min(axis=2)
    checker = (sat <= 12) & (mx >= 226)
    labels, _ = ndimage.label(checker)
    edge = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1],
    ]))
    edge = edge[edge != 0]
    return np.isin(labels, edge)


def cut(rgb):
    rgb = rgb.astype(np.float32)
    mx = rgb.max(axis=2)
    sat = mx - rgb.min(axis=2)
    outside = border_checker(rgb.astype(np.int16))
    alpha = np.full(mx.shape, 255, np.float32)
    alpha[outside] = 0

    touch = ndimage.binary_dilation(outside) & ~outside
    fringe = touch & (sat < 28) & (mx > 70)
    bg = 248.0
    a = np.clip((bg - mx) / bg, 0, 1)
    color = np.clip((rgb - bg * (1 - a[..., None])) / np.maximum(a[..., None], 1e-3), 0, 255)
    out = rgb.copy()
    out[fringe] = color[fringe]
    alpha[fringe] = a[fringe] * 255
    alpha[(alpha < 8) | ((mx < 8) & (alpha < 40))] = 0

    rgba = np.dstack([np.clip(out, 0, 255), alpha]).astype(np.uint8)
    return rgba


def main():
    if not SRC.exists():
        raise SystemExit(f"missing sheet: {SRC}")
    rgb = np.array(Image.open(SRC).convert("RGB"))
    rgba = cut(rgb)
    body = rgba[:, :, 3] > 16
    labels, count = ndimage.label(body)
    boxes = []
    for idx in range(1, count + 1):
        ys, xs = np.where(labels == idx)
        if len(xs) < 800:
            continue
        boxes.append((ys.min(), xs.min(), ys.max(), xs.max(), len(xs)))
    boxes.sort(key=lambda b: (b[0] // 80, b[1]))
    if len(boxes) != 8:
        raise SystemExit(f"expected 8 animals, found {len(boxes)}: {boxes}")

    OUT.mkdir(parents=True, exist_ok=True)
    for name, (y0, x0, y1, x1, _n) in zip(NAMES, boxes):
        crop = rgba[y0:y1 + 1, x0:x1 + 1]
        h, w = crop.shape[:2]
        canvas = np.zeros((h + PAD * 2, w + PAD * 2, 4), np.uint8)
        canvas[PAD:PAD + h, PAD:PAD + w] = crop
        Image.fromarray(canvas, "RGBA").save(OUT / f"{name}.png")
        print(f"{name:8} {canvas.shape[1]}x{canvas.shape[0]} from {x0},{y0}-{x1},{y1}")


if __name__ == "__main__":
    main()

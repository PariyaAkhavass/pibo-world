"""
Build the images the game actually downloads.

PNG and JPEG files stay in the repo as the sources. This writes hashed WebP
files under assets/runtime/ and src/data/assetManifest.js. The page loads only
those WebP files.

Paintings (the island plate, rooms) are WebP quality 90. Sprites keep their
alpha. A sprite uses lossless WebP when that is smaller, or when lossy quality
90 would move an edge by more than a few levels. Critter walk frames are packed
into one atlas per animal. A layer with a real transparent margin is cropped
to that box, and the manifest remembers where it sat in the original canvas.

    python3 tools/optimize-runtime.py
"""
from __future__ import annotations

import hashlib
import json
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "assets" / "runtime"
MANIFEST_PATH = ROOT / "src" / "data" / "assetManifest.js"

# Chrome-visible error on a straight-alpha composite. Above this, lossy WebP
# is rejected for sprites so outlines do not grow a halo.
SPRITE_MAX_DELTA = 6

CRITTER_ORDER = [
    "front-a",
    "three-left",
    "side-left",
    "back-left",
    "front-b",
    "three-right",
    "side-right",
    "back-right",
]
CRITTERS = ["cat", "dog", "bunny", "panda", "frog", "penguin", "unicorn", "fox"]

PAINTINGS = [
    "assets/painted/plate.png",
    "assets/painted/layers/library-hangout.png",
    "assets/painted/art-room.jpg",
    "assets/painted/trophy-room.jpg",
]

# Full-canvas layers. Trim a transparent margin and keep the old position.
PLACEABLE = {
    "assets/painted/layers/library-hangout.png",
}

SPRITES = [
    "assets/pibo/pibo.png",
    "assets/pibo/pibo-face-right.png",
    "assets/pibo/pibo-face-front.png",
    "assets/pibo/hair/tuft-icon.png",
    "assets/pibo/hair/succulent.png",
    "assets/pibo/hair/fern.png",
    "assets/pibo/hair/sunflower.png",
    "assets/pibo/hair/clover.png",
    "assets/pibo/hair/palm.png",
    "assets/pibo/hats/beanie.png",
    "assets/pibo/hats/strawhat.png",
    "assets/pibo/hats/wizard.png",
    "assets/pibo/hats/crown.png",
    "assets/pibo/hats/cap.png",
    "assets/pibo/hats/pirate.png",
    "assets/painted/layers/raccoon.png",
    "assets/painted/trophies/medal-star.png",
    "assets/painted/trophies/medal-blue.png",
    "assets/painted/trophies/rosette.png",
    "assets/painted/trophies/cup-silver.png",
    "assets/painted/trophies/cup-gold.png",
    "assets/painted/trophies/cup-bronze.png",
]

MASKS = ["assets/painted/walk-mask.png"]


def encode(im: Image.Image, lossless: bool, quality: int = 90) -> bytes:
    buf = BytesIO()
    if lossless:
        im.save(buf, "WEBP", lossless=True, quality=100, method=6, exact=True, alpha_quality=100)
    else:
        im.save(buf, "WEBP", quality=quality, method=6, exact=True, alpha_quality=100)
    return buf.getvalue()


def decode(data: bytes, mode: str) -> Image.Image:
    im = Image.open(BytesIO(data))
    im.load()
    return im.convert(mode)


def composite_max_delta(src: Image.Image, dec: Image.Image) -> int:
    """Largest channel change after compositing onto a few flat grounds."""
    a = np.asarray(src.convert("RGBA")).astype(np.float32)
    b = np.asarray(dec.convert("RGBA")).astype(np.float32)
    if a.shape != b.shape:
        raise SystemExit(f"size changed {a.shape} vs {b.shape}")
    worst = 0
    for bg in ((186, 214, 140), (255, 244, 220), (90, 170, 220), (40, 32, 28)):
        ground = np.array(bg, np.float32)
        out_a = a[:, :, :3] * (a[:, :, 3:4] / 255) + ground * (1 - a[:, :, 3:4] / 255)
        out_b = b[:, :, :3] * (b[:, :, 3:4] / 255) + ground * (1 - b[:, :, 3:4] / 255)
        worst = max(worst, int(np.abs(out_a - out_b).max()))
    return worst


def opaque_max_delta(src: Image.Image, dec: Image.Image) -> int:
    a = np.asarray(src.convert("RGB")).astype(np.int16)
    b = np.asarray(dec.convert("RGB")).astype(np.int16)
    return int(np.abs(a - b).max())


def trim_alpha(im: Image.Image):
    """Crop a transparent margin. One pixel of padding stays so the edge AA is kept."""
    if im.mode != "RGBA":
        return im, None
    bbox = im.getbbox()
    if not bbox:
        return im, None
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - 1)
    y0 = max(0, y0 - 1)
    x1 = min(im.width, x1 + 1)
    y1 = min(im.height, y1 + 1)
    # Ignore a hair of padding. Crop only when a real empty margin is there.
    if x0 < 8 and y0 < 8 and (im.width - x1) < 8 and (im.height - y1) < 8:
        return im, None
    frame = {
        "x": x0,
        "y": y0,
        "width": x1 - x0,
        "height": y1 - y0,
        "fullWidth": im.width,
        "fullHeight": im.height,
    }
    return im.crop((x0, y0, x1, y1)), frame


def choose_sprite(im: Image.Image, label: str):
    mode = "RGBA" if "A" in im.getbands() else "RGB"
    im = im.convert(mode)
    lossy = encode(im, lossless=False, quality=90)
    lossless = encode(im, lossless=True)
    lossy_im = decode(lossy, mode)
    delta = composite_max_delta(im, lossy_im) if mode == "RGBA" else opaque_max_delta(im, lossy_im)
    use_lossless = len(lossless) <= len(lossy) or delta > SPRITE_MAX_DELTA
    data = lossless if use_lossless else lossy
    how = "lossless" if use_lossless else "q90"
    if use_lossless:
        back = decode(data, mode)
        check = composite_max_delta(im, back) if mode == "RGBA" else opaque_max_delta(im, back)
        if check != 0:
            raise SystemExit(f"{label} lossless webp is not exact (delta {check})")
    return data, how, delta, len(lossy), len(lossless)


def write_runtime(stem: str, data: bytes) -> str:
    digest = hashlib.sha256(data).hexdigest()[:10]
    name = f"{stem}.{digest}.webp"
    path = RUNTIME / name
    path.write_bytes(data)
    return f"assets/runtime/{name}"


def rel_size(path: Path) -> int:
    return path.stat().st_size


def manifest_entry(url: str, im: Image.Image, extra: dict | None = None) -> dict:
    entry = {"url": url, "width": im.width, "height": im.height}
    if extra:
        entry.update(extra)
    return entry


def js_string(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def build_painting(logical: str, manifest: dict, report: list):
    path = ROOT / logical
    im = Image.open(path)
    im.load()
    frame = None
    if logical in PLACEABLE:
        im, frame = trim_alpha(im.convert("RGBA") if "A" in im.getbands() else im)
    mode = "RGBA" if "A" in im.getbands() else "RGB"
    im = im.convert(mode)
    # Flat paintings are quality 90. The side-by-side check lives in the PR notes.
    data = encode(im, lossless=False, quality=90)
    delta = opaque_max_delta(im, decode(data, "RGB")) if mode == "RGB" else composite_max_delta(im, decode(data, "RGBA"))
    if delta > 22:
        data = encode(im, lossless=False, quality=95)
        delta = opaque_max_delta(im, decode(data, "RGB")) if mode == "RGB" else composite_max_delta(im, decode(data, "RGBA"))
        quality = "q95"
    else:
        quality = "q90"
    stem = Path(logical).stem
    url = write_runtime(stem, data)
    extra = {"frame": frame} if frame else None
    manifest[logical] = manifest_entry(url, im, extra)
    report.append((logical, rel_size(path), len(data), quality, delta, frame))


def build_sprite(logical: str, manifest: dict, report: list):
    path = ROOT / logical
    im = Image.open(path)
    im.load()
    # Keep the sprite's own padding. Hair anchors and trophy boxes use it.
    data, how, delta, lossy_n, lossless_n = choose_sprite(im, logical)
    stem = Path(logical).parent.name + "-" + Path(logical).stem
    if Path(logical).parent.name in {"pibo", "trophies", "layers", "painted"}:
        stem = Path(logical).stem
    url = write_runtime(stem, data)
    out = decode(data, "RGBA" if "A" in im.getbands() else "RGB")
    manifest[logical] = manifest_entry(url, out)
    report.append((logical, rel_size(path), len(data), how, delta, None))


def build_mask(logical: str, manifest: dict, report: list):
    path = ROOT / logical
    im = Image.open(path).convert("RGB")
    data = encode(im, lossless=True)
    back = np.asarray(decode(data, "RGB"))
    src = np.asarray(im)
    if not np.array_equal(src, back):
        raise SystemExit(f"{logical} lossless webp changed a mask pixel")
    url = write_runtime(Path(logical).stem, data)
    manifest[logical] = manifest_entry(url, im)
    report.append((logical, rel_size(path), len(data), "lossless", 0, None))


def build_critters(manifest: dict, report: list):
    pad = 2
    cols = 4
    for critter in CRITTERS:
        frames = []
        logicals = []
        for name in CRITTER_ORDER:
            logical = f"assets/critters/{critter}/{name}.png"
            im = Image.open(ROOT / logical).convert("RGBA")
            frames.append(im)
            logicals.append(logical)
        fw, fh = frames[0].size
        for im in frames:
            if im.size != (fw, fh):
                raise SystemExit(f"{critter} frames differ in size")
        atlas_w = cols * fw + (cols - 1) * pad
        rows = 2
        atlas_h = rows * fh + (rows - 1) * pad
        atlas = Image.new("RGBA", (atlas_w, atlas_h), (0, 0, 0, 0))
        rects = []
        for i, frame in enumerate(frames):
            col = i % cols
            row = i // cols
            x = col * (fw + pad)
            y = row * (fh + pad)
            atlas.paste(frame, (x, y))
            rects.append({"x": x, "y": y, "w": fw, "h": fh})
        data, how, delta, _, _ = choose_sprite(atlas, critter)
        # Confirm every sliced frame, not just the atlas as a whole.
        decoded = decode(data, "RGBA")
        worst = 0
        for frame, rect in zip(frames, rects):
            crop = decoded.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]))
            worst = max(worst, composite_max_delta(frame, crop))
        if worst > SPRITE_MAX_DELTA and how != "lossless":
            data = encode(atlas, lossless=True)
            how = "lossless"
            decoded = decode(data, "RGBA")
            worst = 0
            for frame, rect in zip(frames, rects):
                crop = decoded.crop((rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"]))
                worst = max(worst, composite_max_delta(frame, crop))
            if worst != 0:
                raise SystemExit(f"{critter} atlas is not exact ({worst})")
        url = write_runtime(f"critter-{critter}", data)
        src_bytes = sum(rel_size(ROOT / logical) for logical in logicals)
        report.append((f"assets/critters/{critter}/*", src_bytes, len(data), f"atlas {how}", worst, None))
        for logical, rect in zip(logicals, rects):
            manifest[logical] = {
                "url": url,
                "width": fw,
                "height": fh,
                "atlas": rect,
            }


def write_manifest(manifest: dict):
    # Stable order so a re-run with the same bytes does not churn the file
    # beyond the hashed names, which are content-addressed.
    lines = [
        "/**",
        " * Generated by tools/optimize-runtime.py. Do not edit.",
        " * Keys are the source paths. `url` is the file the game downloads.",
        " * A `frame` is a crop inside the original canvas, in source pixels.",
        " * An `atlas` rect is one critter frame inside that animal's sheet.",
        " */",
        "export const ASSET_MANIFEST = " + js_string(manifest) + ";",
        "",
    ]
    MANIFEST_PATH.write_text("\n".join(lines))


def main():
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for old in RUNTIME.glob("*.webp"):
        old.unlink()
    manifest = {}
    report = []
    for logical in PAINTINGS:
        build_painting(logical, manifest, report)
        print("painting", logical)
    for logical in MASKS:
        build_mask(logical, manifest, report)
        print("mask", logical)
    for logical in SPRITES:
        build_sprite(logical, manifest, report)
        print("sprite", logical)
    build_critters(manifest, report)
    print("critters")
    write_manifest(manifest)
    src = sum(row[1] for row in report)
    out = sum(row[2] for row in report)
    print(f"\n{'source':62} {'png':>8} {'webp':>8}  mode  delta")
    for logical, before, after, how, delta, frame in report:
        note = " trimmed" if frame else ""
        print(f"{logical:62} {before/1024:8.1f} {after/1024:8.1f}  {how:16} {delta:3}{note}")
    print(f"{'TOTAL':62} {src/1024:8.1f} {out/1024:8.1f}")
    print("wrote", MANIFEST_PATH)


if __name__ == "__main__":
    main()

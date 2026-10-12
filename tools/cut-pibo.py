"""
Cut the painted pot out of the concept and use that picture as Pibo.

The pot stays in the plate today, and a tiny sprite walks underneath it.
This removes the pot from the plate (sand path painted back in), saves the
cutout, and draws four face-down breaststroke frames from that same pot.

Run: python3 tools/cut-pibo.py
"""
import struct
import subprocess
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = Path("/tmp/concept.raw")
PLATE = ROOT / "assets" / "painted" / "plate.png"
MASK = ROOT / "assets" / "painted" / "walk-mask.png"
OUT = ROOT / "assets" / "pibo"
W, H = 1280, 720
PAD = 48
WORLD_W, WORLD_H = 32.0, 18.0


def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path, w, h, rgba):
    rows = []
    stride = w * 4
    for y in range(h):
        rows.append(b"\x00" + bytes(rgba[y * stride:(y + 1) * stride]))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(b"".join(rows), 9))
    png += chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def read_png(path):
    data = Path(path).read_bytes()
    i = 8
    chunks = []
    while i < len(data):
        ln = struct.unpack(">I", data[i:i + 4])[0]
        tag = data[i + 4:i + 8]
        chunk_data = data[i + 8:i + 8 + ln]
        i += 12 + ln
        chunks.append((tag, chunk_data))
    w, h, bit, color = struct.unpack(">IIBB", chunks[0][1][:10])
    raw = zlib.decompress(b"".join(c for t, c in chunks if t == b"IDAT"))
    bpp = 4 if color == 6 else 3
    rows = []
    pos = 0
    stride = w * bpp
    prev = bytearray(stride)

    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        return a if pa <= pb and pa <= pc else (b if pb <= pc else c)

    for y in range(h):
        filt = raw[pos]
        pos += 1
        row = bytearray(raw[pos:pos + stride])
        pos += stride
        if filt == 1:
            for x in range(stride):
                row[x] = (row[x] + (row[x - bpp] if x >= bpp else 0)) & 255
        elif filt == 2:
            for x in range(stride):
                row[x] = (row[x] + prev[x]) & 255
        elif filt == 3:
            for x in range(stride):
                left = row[x - bpp] if x >= bpp else 0
                row[x] = (row[x] + ((left + prev[x]) // 2)) & 255
        elif filt == 4:
            for x in range(stride):
                a = row[x - bpp] if x >= bpp else 0
                b = prev[x]
                c = prev[x - bpp] if x >= bpp else 0
                row[x] = (row[x] + paeth(a, b, c)) & 255
        elif filt != 0:
            raise SystemExit(f"png filter {filt}")
        rows.append(row)
        prev = row
    return w, h, bpp, rows


def lum(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def is_yellow(r, g, b):
    return r > 200 and g > 145 and b < 155 and g > b + 18 and r + 15 > g


def is_leaf(r, g, b):
    return g > r + 8 and g > b + 5 and 60 < g < 220 and r < 200 and b < 180 and lum(r, g, b) < 200


def is_ink(r, g, b):
    return lum(r, g, b) < 95


def is_sand(r, g, b):
    return r > 168 and g > 128 and 80 < b < 200 and r + 18 >= g and g > b + 4 and not is_yellow(r, g, b)


def pot_pixels(rgb):
    """Yellow body, the leaves sitting on it, and the outline touching those."""
    def at(x, y):
        i = (y * W + x) * 3
        return rgb[i], rgb[i + 1], rgb[i + 2]

    sx, sy = 595, 442
    body = {(sx, sy)}
    stack = [(sx, sy)]
    while stack:
        x, y = stack.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in body:
                continue
            if not (540 <= nx < 660 and 400 <= ny < 510):
                continue
            if is_yellow(*at(nx, ny)):
                body.add((nx, ny))
                stack.append((nx, ny))
    pot = set(body)
    # Leaves grow upward from the rim. Stop after a short climb so nearby
    # bushes are not pulled in through a chain of dark pixels.
    for _ in range(10):
        add = []
        for x, y in list(pot):
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    nx, ny = x + dx, y + dy
                    if (nx, ny) in pot or not (520 <= nx < 680 and 360 <= ny < 500):
                        continue
                    if is_leaf(*at(nx, ny)) or is_yellow(*at(nx, ny)):
                        add.append((nx, ny))
        if not add:
            break
        pot.update(add)
    outline = []
    for x, y in pot:
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                nx, ny = x + dx, y + dy
                if (nx, ny) in pot or not (0 <= nx < W and 0 <= ny < H):
                    continue
                if is_ink(*at(nx, ny)):
                    outline.append((nx, ny))
    pot.update(outline)
    return pot


def dilate(pot, radius):
    extra = set()
    r2 = radius * radius
    for x, y in pot:
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                if dx * dx + dy * dy <= r2:
                    extra.add((x + dx, y + dy))
    return {p for p in extra if 0 <= p[0] < W and 0 <= p[1] < H}


def cut_sprite(rgb, pot):
    xs = [p[0] for p in pot]
    ys = [p[1] for p in pot]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    # Seal the interior (face, pot highlight) so it is not a hole.
    bw, bh = maxx - minx + 1, maxy - miny + 1
    wall = bytearray(bw * bh)
    for x, y in pot:
        wall[(y - miny) * bw + (x - minx)] = 1
    thick = bytearray(wall)
    for y in range(bh):
        for x in range(bw):
            if not wall[y * bw + x]:
                continue
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < bw and 0 <= yy < bh:
                        thick[yy * bw + xx] = 1
    bg = bytearray(bw * bh)
    stack = [(x, 0) for x in range(bw)] + [(x, bh - 1) for x in range(bw)]
    stack += [(0, y) for y in range(bh)] + [(bw - 1, y) for y in range(bh)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= bw or y >= bh:
            continue
        k = y * bw + x
        if bg[k] or thick[k]:
            continue
        bg[k] = 1
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    rgba = bytearray(bw * bh * 4)
    for y in range(bh):
        for x in range(bw):
            r, g, b = rgb[((miny + y) * W + (minx + x)) * 3:(miny + y) * W * 3 + (minx + x) * 3 + 3]
            o = (y * bw + x) * 4
            rgba[o:o + 3] = bytes((r, g, b))
            # Keep the pot. Drop enclosed sand, which is lighter and bluer than the pot.
            sand_leak = b > 150 and g > 165 and r > 180
            keep = (not bg[y * bw + x]) and not sand_leak
            rgba[o + 3] = 255 if keep else 0
    # Close tiny holes in the pot (highlights the color test skipped).
    filled = bytearray(rgba)
    for y in range(1, bh - 1):
        for x in range(1, bw - 1):
            o = (y * bw + x) * 4
            if rgba[o + 3] > 0:
                continue
            nbr = []
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    no = ((y + dy) * bw + (x + dx)) * 4
                    if rgba[no + 3] > 200:
                        nbr.append(rgba[no:no + 3])
            if len(nbr) >= 6:
                filled[o] = sum(p[0] for p in nbr) // len(nbr)
                filled[o + 1] = sum(p[1] for p in nbr) // len(nbr)
                filled[o + 2] = sum(p[2] for p in nbr) // len(nbr)
                filled[o + 3] = 255
    rgba = filled
    # Drop any stray flower that is not connected to the pot body.
    seen = bytearray(bw * bh)
    best = []
    for y in range(bh):
        for x in range(bw):
            k = y * bw + x
            if seen[k] or rgba[k * 4 + 3] < 20:
                continue
            stack = [(x, y)]
            seen[k] = 1
            comp = [(x, y)]
            while stack:
                cx, cy = stack.pop()
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = cx + dx, cy + dy
                    if not (0 <= nx < bw and 0 <= ny < bh):
                        continue
                    nk = ny * bw + nx
                    if seen[nk] or rgba[nk * 4 + 3] < 20:
                        continue
                    seen[nk] = 1
                    stack.append((nx, ny))
                    comp.append((nx, ny))
            if len(comp) > len(best):
                best = comp
    keep = set(best)
    for y in range(bh):
        for x in range(bw):
            if (x, y) not in keep:
                rgba[(y * bw + x) * 4 + 3] = 0
    # A flower under the pot's right side stays attached by a few pixels.
    # The pot body is the wide mass; drop rows below it that sit off to the side.
    body_rows = []
    for y in range(bh):
        cols = [x for x in range(bw) if rgba[(y * bw + x) * 4 + 3] > 20]
        if len(cols) > bw * 0.28:
            body_rows.append(y)
    if body_rows:
        limit = max(body_rows)
        for y in range(limit + 1, bh):
            for x in range(bw):
                rgba[(y * bw + x) * 4 + 3] = 0
    # Trim fully transparent edges.
    def row_empty(y):
        return all(rgba[(y * bw + x) * 4 + 3] == 0 for x in range(bw))
    def col_empty(x):
        return all(rgba[(y * bw + x) * 4 + 3] == 0 for y in range(bh))
    top = 0
    while top < bh and row_empty(top):
        top += 1
    bot = bh - 1
    while bot > top and row_empty(bot):
        bot -= 1
    left = 0
    while left < bw and col_empty(left):
        left += 1
    right = bw - 1
    while right > left and col_empty(right):
        right -= 1
    cw, ch = right - left + 1, bot - top + 1
    cropped = bytearray(cw * ch * 4)
    for y in range(ch):
        src = ((top + y) * bw + left) * 4
        cropped[y * cw * 4:(y + 1) * cw * 4] = rgba[src:src + cw * 4]
    return cropped, cw, ch, minx + left, miny + top


def inpaint_pot(plate_rows, plate_w, hole):
    """Copy sandy path from below the pot, then blend the seam."""
    # Distance from each hole pixel back to the nearest plate pixel.
    dist = {}
    src_of = {}
    from collections import deque
    q = deque()
    for x, y in hole:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) in hole or not (0 <= nx < W and 0 <= ny < H):
                continue
            if (x, y) not in dist:
                dist[(x, y)] = 1
                src_of[(x, y)] = (nx, ny)
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if (nx, ny) not in hole or (nx, ny) in dist:
                continue
            dist[(nx, ny)] = dist[(x, y)] + 1
            src_of[(nx, ny)] = src_of[(x, y)]
            q.append((nx, ny))

    def plate_at(x, y):
        py = y + PAD
        o = x * 4
        row = plate_rows[py]
        return row[o], row[o + 1], row[o + 2]

    def donor(x, y):
        for off in (112, 124, 100, 136, 88):
            sy = y + off
            if not (0 <= sy < H) or (x, sy) in hole:
                continue
            if is_sand(*plate_at(x, sy)):
                return plate_at(x, sy)
        # Spiral for any sand outside the hole.
        for rad in range(1, 48):
            for yy in (y - rad, y + rad):
                for xx in range(x - rad, x + rad + 1):
                    if 0 <= xx < W and 0 <= yy < H and (xx, yy) not in hole and is_sand(*plate_at(xx, yy)):
                        return plate_at(xx, yy)
            for xx in (x - rad, x + rad):
                for yy in range(y - rad + 1, y + rad):
                    if 0 <= xx < W and 0 <= yy < H and (xx, yy) not in hole and is_sand(*plate_at(xx, yy)):
                        return plate_at(xx, yy)
        return plate_at(*src_of.get((x, y), (x, min(H - 1, y + 1))))

    for x, y in hole:
        grain = donor(x, y)
        edge = plate_at(*src_of.get((x, y), (x, y)))
        d = dist.get((x, y), 8)
        if d <= 5:
            t = d / 6
            color = tuple(int(edge[i] * (1 - t) + grain[i] * t) for i in range(3))
        else:
            color = grain
        # The copied strip sits a little lighter than the path around the pot.
        color = tuple(max(0, color[i] - bias) for i, bias in enumerate((8, 6, 10)))
        py = y + PAD
        o = x * 4
        plate_rows[py][o:o + 3] = bytes(color)


def paint_mask(mask_rows, mw, hole):
    for x, y in hole:
        mx, my = x // 2, y // 2
        if not (0 <= mx < mw and 0 <= my < mask_rows.__len__()):
            continue
        o = mx * 4
        # The pot sat on the path. Clearing its outline lets the bigger pot walk there.
        if mask_rows[my][o + 2] > 200:
            continue
        mask_rows[my][o:o + 4] = b"\xff\x00\x00\xff"


def sample(rgba, w, h, x, y):
    if x < 0 or y < 0 or x >= w or y >= h:
        return (0, 0, 0, 0)
    o = (y * w + x) * 4
    return tuple(rgba[o:o + 4])


def rotate_deg(rgba, w, h, degrees):
    """Rotate around the center. Positive degrees are clockwise in image space."""
    import math
    rad = math.radians(degrees)
    c, s = math.cos(rad), math.sin(rad)
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    rot = [(c * x + s * y, -s * x + c * y) for x, y in corners]
    minx = min(p[0] for p in rot)
    miny = min(p[1] for p in rot)
    nw = int(max(p[0] for p in rot) - minx) + 2
    nh = int(max(p[1] for p in rot) - miny) + 2
    out = bytearray(nw * nh * 4)
    cx, cy = w / 2, h / 2
    ocx, ocy = nw / 2, nh / 2
    for y in range(nh):
        for x in range(nw):
            dx, dy = x - ocx, y - ocy
            sx = c * dx - s * dy + cx
            sy = s * dx + c * dy + cy
            x0, y0 = int(sx), int(sy)
            if x0 < 0 or y0 < 0 or x0 >= w - 1 or y0 >= h - 1:
                continue
            fx, fy = sx - x0, sy - y0
            acc = [0, 0, 0, 0]
            for oy, wy in ((0, 1 - fy), (1, fy)):
                for ox, wx in ((0, 1 - fx), (1, fx)):
                    p = sample(rgba, w, h, x0 + ox, y0 + oy)
                    weight = wx * wy * (p[3] / 255)
                    for k in range(3):
                        acc[k] += p[k] * weight
                    acc[3] += weight
            if acc[3] < 0.08:
                continue
            o = (y * nw + x) * 4
            for k in range(3):
                out[o + k] = max(0, min(255, int(acc[k] / acc[3])))
            out[o + 3] = max(0, min(255, int(min(1, acc[3]) * 255)))
    return out, nw, nh


def blit(dst, dw, dh, src, sw, sh, ox, oy):
    for y in range(sh):
        dy = oy + y
        if dy < 0 or dy >= dh:
            continue
        for x in range(sw):
            dx = ox + x
            if dx < 0 or dx >= dw:
                continue
            so = (y * sw + x) * 4
            a = src[so + 3]
            if a < 8:
                continue
            do = (dy * dw + dx) * 4
            if a > 250 or dst[do + 3] == 0:
                dst[do:do + 4] = src[so:so + 4]
            else:
                da = dst[do + 3]
                out_a = a + da * (255 - a) // 255
                if out_a == 0:
                    continue
                for c in range(3):
                    dst[do + c] = (src[so + c] * a + dst[do + c] * da * (255 - a) // 255) // out_a
                dst[do + 3] = out_a


def ellipse(dst, dw, dh, cx, cy, rx, ry, color, outline=None):
    if outline:
        ellipse(dst, dw, dh, cx, cy, rx + 3, ry + 3, outline, None)
    r, g, b, a = color
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            if x < 0 or y < 0 or x >= dw or y >= dh:
                continue
            nx = (x - cx) / rx
            ny = (y - cy) / ry
            if nx * nx + ny * ny <= 1:
                o = (y * dw + x) * 4
                dst[o:o + 4] = bytes((r, g, b, a))


def make_swim(stand, sw, sh):
    """Four frames of the same pot lying flat, arms stroking forward (to the right)."""
    # Leaves point to the right. A little short of flat so the face stays readable.
    turned, tw, th = rotate_deg(stand, sw, sh, 78)
    flat_h = max(8, int(th * 0.78))
    flat = bytearray(tw * flat_h * 4)
    for y in range(flat_h):
        sy = y / flat_h * th
        y0 = int(sy)
        y1 = min(th - 1, y0 + 1)
        fy = sy - y0
        for x in range(tw):
            c0 = sample(turned, tw, th, x, y0)
            c1 = sample(turned, tw, th, x, y1)
            o = (y * tw + x) * 4
            if c0[3] == 0 and c1[3] == 0:
                continue
            a0, a1 = c0[3] / 255, c1[3] / 255
            a = a0 * (1 - fy) + a1 * fy
            if a < 0.04:
                continue
            for c in range(3):
                flat[o + c] = int((c0[c] * a0 * (1 - fy) + c1[c] * a1 * fy) / a)
            flat[o + 3] = int(a * 255)
    # Canvas leaves room for the arms to reach forward of the leaves.
    cw, ch = tw + 46, flat_h + 18
    yellow = (236, 188, 78, 255)
    ink = (72, 56, 42, 255)
    # Breaststroke. The leaves (head) point right; arms reach that way.
    # Offsets are from a shoulder that overlaps the body, so the arms stay attached.
    poses = [
        ((26, -3), (26, 5)),
        ((16, -14), (16, 16)),
        ((2, -12), (2, 14)),
        ((12, -5), (12, 7)),
    ]
    frames = []
    for pose in poses:
        canvas = bytearray(cw * ch * 4)
        blit(canvas, cw, ch, flat, tw, flat_h, 2, 9)
        # Shoulder overlaps the body so the stroke stays attached.
        sx0, sy0 = 2 + int(tw * 0.62), 9 + flat_h // 2
        for ox, oy in pose:
            ellipse(canvas, cw, ch, sx0 + ox, sy0 + oy, 14, 6, yellow, ink)
        frames.append((canvas, cw, ch))
    return frames


def main():
    if not RAW.exists() or RAW.stat().st_size != W * H * 3:
        src = Path("/home/ubuntu/.cursor/projects/workspace/uploads/0795e3ea422336996db3a5a661f411e0e8a55facac09ba89e3166ac54b34dc1d_cce7.jpg")
        subprocess.check_call([
            "ffmpeg", "-y", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24", str(RAW),
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    rgb = bytearray(RAW.read_bytes())
    pot = pot_pixels(rgb)
    hole = dilate(pot, 4)
    sprite, pw, ph, ox, oy = cut_sprite(rgb, pot)
    # Feet: bottom center of the opaque pixels, in concept pixels.
    feet_xs = []
    feet_y = 0
    for y in range(ph - 1, -1, -1):
        row = [x for x in range(pw) if sprite[(y * pw + x) * 4 + 3] > 20]
        if row:
            feet_y = oy + y
            feet_xs = row
            break
    feet_x = ox + (min(feet_xs) + max(feet_xs)) / 2
    world_x = (feet_x / W - 0.5) * WORLD_W
    world_z = (feet_y / H - 0.5) * WORLD_H
    world_w = pw / W * WORLD_W
    world_h = ph / H * WORLD_H

    plate_w, plate_h, bpp, plate_rows = read_png(PLATE)
    assert plate_w == W and plate_h == H + PAD * 2 and bpp == 4
    inpaint_pot(plate_rows, plate_w, hole)
    plate = bytearray(plate_w * plate_h * 4)
    for y in range(plate_h):
        plate[y * plate_w * 4:(y + 1) * plate_w * 4] = plate_rows[y]
    write_png(PLATE, plate_w, plate_h, plate)

    mw, mh, mbpp, mask_rows = read_png(MASK)
    paint_mask(mask_rows, mw, hole)
    mask = bytearray(mw * mh * 4)
    for y in range(mh):
        mask[y * mw * 4:(y + 1) * mw * 4] = mask_rows[y]
    write_png(MASK, mw, mh, mask)

    OUT.mkdir(parents=True, exist_ok=True)
    write_png(OUT / "pibo.png", pw, ph, sprite)
    frames = make_swim(sprite, pw, ph)
    swim_w = swim_h = None
    for i, (canvas, cw, ch) in enumerate(frames, start=1):
        write_png(OUT / f"pibo-swim-{i}.png", cw, ch, canvas)
        swim_w, swim_h = cw, ch
    swim_world_w = swim_w / W * WORLD_W
    swim_world_h = swim_h / H * WORLD_H
    print(f"sprite {pw}x{ph} feet pixel ({feet_x:.1f},{feet_y}) world ({world_x:.3f},{world_z:.3f})")
    print(f"stand world {world_w:.3f} x {world_h:.3f}")
    print(f"swim {swim_w}x{swim_h} world {swim_world_w:.3f} x {swim_world_h:.3f}")
    # Leftover bright yellow inside the old pot box?
    left = 0
    for y in range(390, 500):
        for x in range(540, 660):
            if (x, y) in hole:
                py = y + PAD
                r, g, b = plate_rows[py][x * 4:x * 4 + 3]
                if is_yellow(r, g, b):
                    left += 1
    print("yellow left in hole", left)


if __name__ == "__main__":
    main()

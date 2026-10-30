"""
Draw the outdoor mascots in Pibo's cel style and write transparent PNGs.

Same family as the pot: thick soft ink, flat color, one cel shade, cream
highlights, black bead eyes, a tiny smile, and orange blush. No background,
no cast shadow (the game draws that). Feet sit on the bottom center so the
sprite anchor can be (0.5, 0).

    python3 tools/build-mascots.py
"""
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "mascots"

INK = "#1A1A1A"
BLUSH = "#F09624"
HILITE = "#FFF6D4"
STROKE = 22

# viewBox is 0 0 640 760. Feet rest on y=700, x=320.
FOOT_X = 320
FOOT_Y = 700


def svg(body):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="640" height="760" viewBox="0 0 640 760">
  <g fill="none" stroke="{INK}" stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round">
    {body}
  </g>
</svg>'''


def face(cx, cy, s=1, smile=18, eyes=True):
    """Pibo's face: bead eyes, shallow smile, round blush. s scales it."""
    ex = 28 * s
    ey = 32 * s
    gap = 46 * s
    blush_r = 18 * s
    blush_y = 34 * s
    blush_x = 70 * s
    smile_w = 18 * s
    smile_drop = 12 * s
    y_eye = cy - 8 * s
    beads = ""
    if eyes:
        beads = f'''
      <ellipse cx="{cx - gap}" cy="{y_eye}" rx="{ex}" ry="{ey}" fill="{INK}" stroke="none"/>
      <ellipse cx="{cx + gap}" cy="{y_eye}" rx="{ex}" ry="{ey}" fill="{INK}" stroke="none"/>'''
    return f'''{beads}
      <path d="M {cx - smile_w} {cy + smile} Q {cx} {cy + smile + smile_drop} {cx + smile_w} {cy + smile}"
            stroke="{INK}" stroke-width="{max(6, 8 * s):.1f}" fill="none"/>
      <circle cx="{cx - blush_x}" cy="{cy + blush_y}" r="{blush_r}" fill="{BLUSH}" stroke="none"/>
      <circle cx="{cx + blush_x}" cy="{cy + blush_y}" r="{blush_r}" fill="{BLUSH}" stroke="none"/>
    '''


def highlights(d, width=16):
    return f'<path d="{d}" stroke="{HILITE}" stroke-width="{width}" fill="none"/>'


FOX = svg(f'''
  <defs>
    <clipPath id="fox-body"><ellipse cx="300" cy="430" rx="150" ry="150"/></clipPath>
    <clipPath id="fox-tail"><ellipse cx="478" cy="470" rx="108" ry="78" transform="rotate(-18 478 470)"/></clipPath>
  </defs>
  <!-- one bushy tail, cream tip inside the same outline -->
  <ellipse cx="478" cy="470" rx="108" ry="78" transform="rotate(-18 478 470)" fill="#F6A21C" stroke="none"/>
  <ellipse cx="545" cy="430" rx="46" ry="40" fill="#FFE6B0" stroke="none"/>
  <ellipse cx="520" cy="500" rx="40" ry="36" fill="#E18412" stroke="none" clip-path="url(#fox-tail)"/>
  <ellipse cx="478" cy="470" rx="108" ry="78" transform="rotate(-18 478 470)" fill="none"/>
  {highlights("M 400 430 Q 440 400 490 412", 14)}
  <!-- chubby fox ears, wide enough that the ink does not eat the fill -->
  <path d="M 210 340 L 168 175 Q 210 155 268 250 Z" fill="#F6A21C" stroke="none"/>
  <path d="M 360 330 L 430 155 Q 478 175 430 275 Z" fill="#F6A21C" stroke="none"/>
  <path d="M 210 340 L 168 175 Q 210 155 268 250 Z"/>
  <path d="M 360 330 L 430 155 Q 478 175 430 275 Z"/>
  <path d="M 206 300 L 186 200 Q 214 186 246 250 Z" fill="#F09624" stroke="none"/>
  <path d="M 378 292 L 428 186 Q 458 200 424 262 Z" fill="#F09624" stroke="none"/>
  <!-- feet -->
  <ellipse cx="248" cy="586" rx="42" ry="28" fill="#F6A21C"/>
  <ellipse cx="356" cy="586" rx="42" ry="28" fill="#F6A21C"/>
  <!-- body -->
  <ellipse cx="300" cy="430" rx="150" ry="150" fill="#F6A21C" stroke="none"/>
  <ellipse cx="378" cy="500" rx="72" ry="96" fill="#E18412" stroke="none" clip-path="url(#fox-body)"/>
  <ellipse cx="300" cy="478" rx="84" ry="68" fill="#FFE6B0" stroke="none"/>
  {highlights("M 190 360 Q 214 292 270 274", 18)}
  {highlights("M 196 404 Q 210 368 236 348", 10)}
  <ellipse cx="300" cy="430" rx="150" ry="150" fill="none"/>
  {face(298, 400, 1.0, smile=14)}
''')

CAT = svg(f'''
  <defs>
    <clipPath id="cat-body"><ellipse cx="318" cy="455" rx="156" ry="136"/></clipPath>
  </defs>
  <!-- curled tail, a loop rather than the fox's bush -->
  <circle cx="500" cy="500" r="58" fill="#FFF1DE" stroke="none"/>
  <circle cx="500" cy="500" r="22" fill="#F0C8A4" stroke="none"/>
  <circle cx="500" cy="500" r="58" fill="none"/>
  <circle cx="500" cy="500" r="22" fill="none" stroke-width="16"/>
  <!-- short cat ears -->
  <path d="M 214 360 L 196 248 Q 230 232 276 320 Z" fill="#FFF1DE" stroke="none"/>
  <path d="M 392 352 L 470 236 Q 498 258 438 330 Z" fill="#FFF1DE" stroke="none"/>
  <path d="M 214 360 L 196 248 Q 230 232 276 320 Z"/>
  <path d="M 392 352 L 470 236 Q 498 258 438 330 Z"/>
  <path d="M 220 334 L 214 268 Q 236 258 262 318 Z" fill="#F7B7A3" stroke="none"/>
  <path d="M 404 328 L 456 262 Q 474 276 430 322 Z" fill="#F7B7A3" stroke="none"/>
  <!-- feet tucked under a round loaf -->
  <ellipse cx="250" cy="592" rx="44" ry="26" fill="#FFF1DE"/>
  <ellipse cx="386" cy="592" rx="44" ry="26" fill="#FFF1DE"/>
  <ellipse cx="318" cy="455" rx="156" ry="136" fill="#FFF1DE" stroke="none"/>
  <ellipse cx="410" cy="520" rx="62" ry="78" fill="#F0C8A4" stroke="none" clip-path="url(#cat-body)"/>
  {highlights("M 206 400 Q 230 330 296 314", 18)}
  {highlights("M 214 442 Q 228 404 256 384", 10)}
  <ellipse cx="318" cy="455" rx="156" ry="136" fill="none"/>
  {face(314, 430, 0.98, smile=16)}
  <ellipse cx="314" cy="458" rx="11" ry="8" fill="#F09624" stroke="none"/>
''')

SNAIL = svg(f'''
  <defs>
    <clipPath id="shell"><circle cx="400" cy="378" r="128"/></clipPath>
    <clipPath id="slug"><ellipse cx="268" cy="530" rx="168" ry="96"/></clipPath>
  </defs>
  <circle cx="400" cy="378" r="128" fill="#F7A8B8" stroke="none"/>
  <path d="M 318 330 C 340 250 490 260 488 360 C 486 460 360 470 330 390 C 310 340 360 310 400 330"
        fill="none" stroke="#FFE3A3" stroke-width="36" stroke-linecap="round"/>
  <circle cx="392" cy="368" r="28" fill="#FFE3A3" stroke="none"/>
  <ellipse cx="470" cy="430" rx="52" ry="70" fill="#E8889C" stroke="none" clip-path="url(#shell)"/>
  {highlights("M 310 320 Q 350 268 420 286", 16)}
  <circle cx="400" cy="378" r="128" fill="none"/>
  <!-- one yellow body, face on the left -->
  <ellipse cx="268" cy="530" rx="168" ry="96" fill="#F0CC00" stroke="none"/>
  <ellipse cx="330" cy="560" rx="78" ry="48" fill="#E0A800" stroke="none" clip-path="url(#slug)"/>
  {highlights("M 140 500 Q 160 455 214 444", 14)}
  <ellipse cx="268" cy="530" rx="168" ry="96" fill="none"/>
  <!-- stalks: black sleeve, yellow core on top, so the ink stays one clean line -->
  <path d="M 188 470 Q 150 390 172 332" stroke="{INK}" stroke-width="48"/>
  <path d="M 250 460 Q 268 370 250 324" stroke="{INK}" stroke-width="48"/>
  <path d="M 188 470 Q 150 390 172 332" stroke="#F0CC00" stroke-width="26"/>
  <path d="M 250 460 Q 268 370 250 324" stroke="#F0CC00" stroke-width="26"/>
  <circle cx="168" cy="318" r="26" fill="#F0CC00" stroke="{INK}" stroke-width="16"/>
  <circle cx="250" cy="308" r="26" fill="#F0CC00" stroke="{INK}" stroke-width="16"/>
  <circle cx="168" cy="320" r="9" fill="{INK}" stroke="none"/>
  <circle cx="250" cy="310" r="9" fill="{INK}" stroke="none"/>
  {face(214, 512, 0.78, smile=4, eyes=False)}
''')

CHICK = svg(f'''
  <defs>
    <clipPath id="chick"><ellipse cx="320" cy="430" rx="136" ry="130"/></clipPath>
  </defs>
  <!-- two soft tuft feathers -->
  <ellipse cx="292" cy="292" rx="26" ry="48" transform="rotate(-28 292 292)" fill="#E6B000" stroke="none"/>
  <ellipse cx="338" cy="278" rx="22" ry="46" transform="rotate(16 338 278)" fill="#E6B000" stroke="none"/>
  <ellipse cx="292" cy="292" rx="26" ry="48" transform="rotate(-28 292 292)" fill="none"/>
  <ellipse cx="338" cy="278" rx="22" ry="46" transform="rotate(16 338 278)" fill="none"/>
  <!-- wing, clearly a wing and not a pot handle -->
  <ellipse cx="448" cy="470" rx="58" ry="36" transform="rotate(-20 448 470)" fill="#F0CC00" stroke="none"/>
  <ellipse cx="448" cy="470" rx="58" ry="36" transform="rotate(-20 448 470)" fill="none"/>
  {highlights("M 412 458 Q 440 446 468 458", 8)}
  <ellipse cx="268" cy="566" rx="40" ry="24" fill="#F09624"/>
  <ellipse cx="372" cy="566" rx="40" ry="24" fill="#F09624"/>
  <ellipse cx="320" cy="430" rx="136" ry="130" fill="#F0CC00" stroke="none"/>
  <ellipse cx="400" cy="488" rx="58" ry="78" fill="#E0A800" stroke="none" clip-path="url(#chick)"/>
  {highlights("M 224 372 Q 248 308 310 292", 16)}
  {highlights("M 230 412 Q 246 378 272 358", 9)}
  <ellipse cx="320" cy="430" rx="136" ry="130" fill="none"/>
  {face(308, 400, 0.9, smile=8)}
  <!-- solid beak sticking out to the left, clear of the eyes -->
  <path d="M 214 442 L 112 470 L 214 502 Z" fill="#F09624" stroke="{INK}" stroke-width="16" stroke-linejoin="round"/>
''')

BIRD = svg(f'''
  <defs>
    <clipPath id="bird"><ellipse cx="300" cy="430" rx="118" ry="104"/></clipPath>
  </defs>
  <!-- rounded tail, one shape -->
  <ellipse cx="470" cy="455" rx="70" ry="28" transform="rotate(-12 470 455)" fill="#5BB8D4" stroke="none"/>
  <ellipse cx="470" cy="455" rx="70" ry="28" transform="rotate(-12 470 455)" fill="none"/>
  <ellipse cx="404" cy="448" rx="50" ry="32" transform="rotate(-28 404 448)" fill="#7EC8E8" stroke="none"/>
  <ellipse cx="404" cy="448" rx="50" ry="32" transform="rotate(-28 404 448)" fill="none"/>
  <ellipse cx="262" cy="540" rx="28" ry="16" fill="#F09624"/>
  <ellipse cx="338" cy="540" rx="28" ry="16" fill="#F09624"/>
  <ellipse cx="300" cy="430" rx="118" ry="104" fill="#7EC8E8" stroke="none"/>
  <ellipse cx="300" cy="488" rx="62" ry="34" fill="#E7F7FB" stroke="none"/>
  <ellipse cx="370" cy="478" rx="46" ry="52" fill="#4EADC8" stroke="none" clip-path="url(#bird)"/>
  {highlights("M 214 392 Q 236 338 292 324", 14)}
  <ellipse cx="300" cy="430" rx="118" ry="104" fill="none"/>
  {face(286, 408, 0.82, smile=6)}
  <!-- beak sits left of the smile, under the eye -->
  <path d="M 196 448 L 136 468 L 196 492 Z" fill="#F09624" stroke="{INK}" stroke-width="12" stroke-linejoin="round"/>
''')


SPRITES = {
    "fox": FOX,
    "cat": CAT,
    "snail": SNAIL,
    "chick": CHICK,
    "bird": BIRD,
}


def render(name, markup):
    png = cairosvg.svg2png(bytestring=markup.encode("utf-8"), scale=2)
    im = Image.open(BytesIO(png)).convert("RGBA")
    scale = 2
    fx = FOOT_X * scale
    fy = FOOT_Y * scale
    alpha = im.getchannel("A")
    mask = alpha.point(lambda a: 255 if a > 12 else 0)
    bbox = mask.getbbox()
    if not bbox:
        raise SystemExit(f"{name} rendered empty")
    pad = 6
    left, top, right, bottom = bbox
    left -= pad
    top -= pad
    right += pad
    bottom = max(bottom + pad, int(fy) + pad)
    half = max(fx - left, right - fx, 8)
    left = int(round(fx - half))
    right = int(round(fx + half))
    top = max(0, int(top))
    bottom = min(im.height, int(bottom))
    left = max(0, left)
    right = min(im.width, right)
    crop = im.crop((left, top, right, bottom))
    # Knock out the faint fringe so the island cannot show as a halo.
    pixels = crop.load()
    w, h = crop.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 16:
                pixels[x, y] = (0, 0, 0, 0)
            elif a < 255:
                # Keep the ink dark while the edge fades. No colored fringe.
                pixels[x, y] = (r, g, b, a)
    out = OUT / f"{name}.png"
    crop.save(out)
    print(f"{name:6} {crop.size[0]}x{crop.size[1]} -> {out.relative_to(ROOT)}")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, markup in SPRITES.items():
        render(name, markup)


if __name__ == "__main__":
    main()

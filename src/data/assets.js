/**
 * Swappable art for the painted island.
 *
 * The ground is one picture (the concept plate). Tall objects are separate
 * images cut from that same picture so Pibo can walk behind them. Replace a
 * PNG, or point `src` at a new one, and refresh. Width and height are world
 * units on the plate (the painting is 32 units wide). Anchor y 0 is the
 * bottom edge, which sits on the feet line used for depth sorting.
 *
 * Pibo's frames live under `states`. See ASSETS.md.
 */
import { PAINTED_SPRITES, PLATE_PIXELS, PLATE_SRC, WALK_MASK_SRC } from "./painted.js";

const px = (w, h) => ({ pixelWidth: w, pixelHeight: h });

export const ASSETS = {
  plate: {
    id: "plate",
    src: PLATE_SRC,
    kind: "ground",
    pixelWidth: PLATE_PIXELS.pixelWidth,
    pixelHeight: PLATE_PIXELS.pixelHeight,
    width: PLATE_PIXELS.worldW,
    height: PLATE_PIXELS.worldH,
    note: "The whole painting: sea, cliffs, foam, path, flowers, and the still lighthouse beam.",
  },
  walkMask: {
    id: "walk-mask",
    src: WALK_MASK_SRC,
    kind: "mask",
    ...px(640, 360),
    note: "Red = grass and path, blue = sea, green = cliff. Not drawn.",
  },
  pibo: {
    id: "pibo",
    kind: "character",
    width: 1.22,
    height: 1.58,
    anchor: { x: 0.5, y: 0.05 },
    ...px(200, 260),
    fps: { idle: 2, walk: 8, swim: 5 },
    states: {
      idle: ["assets/placeholders/pibo-idle.svg"],
      walk: [1, 2, 3, 4].map((i) => `assets/placeholders/pibo-walk-${i}.svg`),
      swim: [1, 2, 3, 4].map((i) => `assets/placeholders/pibo-swim-${i}.svg`),
    },
  },
};

for (const sprite of PAINTED_SPRITES) {
  ASSETS[sprite.id] = {
    id: sprite.id,
    src: sprite.src,
    pixelWidth: sprite.pixelWidth,
    pixelHeight: sprite.pixelHeight,
    width: sprite.width,
    height: sprite.height,
    anchor: sprite.anchor,
    footprint: sprite.footprint,
  };
}

export function collectSources(assets = ASSETS) {
  const urls = new Set();
  for (const entry of Object.values(assets)) {
    if (entry.kind === "mask") continue;
    if (entry.src) urls.add(entry.src);
    if (entry.states) {
      for (const frames of Object.values(entry.states)) {
        for (const url of frames) urls.add(url);
      }
    }
  }
  return [...urls];
}

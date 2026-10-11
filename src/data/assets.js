/**
 * Swappable art for the isometric island.
 *
 * Each entry points at an image (SVG or PNG). Replace the file, or point `src`
 * at a new one, and refresh. Width and height are world units. Anchor is the
 * point that sits on the ground: x 0.5 is the horizontal center, y 0 is the
 * bottom edge of the image. Footprint is the round solid used for collision
 * (omit it for things Pibo can walk across).
 *
 * Pibo's frames live under `states`. The game swaps them; it does not draw
 * the pot in 3D. See ASSETS.md for canvas sizes and the camera angle.
 */

const px = (w, h) => ({ pixelWidth: w, pixelHeight: h });

export const ASSETS = {
  islandTop: {
    id: "island-top",
    src: "assets/placeholders/island-top.svg",
    kind: "ground",
    ...px(1500, 1100),
    note: "Home island surface, top-down, covering GROUND_BOUNDS in layout.js.",
  },
  grassTile: {
    id: "grass-tile",
    src: "assets/placeholders/grass-tile.svg",
    kind: "ground",
    ...px(256, 256),
    note: "Repeating grass for the lighthouse and arcade islets.",
  },
  cliff: {
    id: "cliff",
    src: "assets/placeholders/cliff.svg",
    kind: "ground",
    ...px(512, 256),
    note: "Repeating rock face. The top of the image is the grassy lip.",
  },
  ocean: {
    id: "ocean",
    src: "assets/placeholders/ocean.svg",
    kind: "ground",
    ...px(1024, 1024),
    note: "Water surface. Keep the edges soft so the sea fades into the sky.",
  },
  sky: {
    id: "sky",
    src: "assets/placeholders/sky.svg",
    kind: "ground",
    ...px(1024, 512),
  },

  cottage: {
    id: "cottage",
    src: "assets/placeholders/cottage.svg",
    ...px(512, 540),
    width: 3.7,
    height: 3.9,
    anchor: { x: 0.5, y: 0.05 },
    footprint: { radius: 1.05 },
  },
  tealHouse: {
    id: "teal-house",
    src: "assets/placeholders/teal-house.svg",
    ...px(512, 480),
    width: 3.5,
    height: 3.3,
    anchor: { x: 0.5, y: 0.05 },
    footprint: { radius: 1.05 },
  },
  shed: {
    id: "shed",
    src: "assets/placeholders/shed.svg",
    ...px(420, 400),
    width: 2.55,
    height: 2.4,
    anchor: { x: 0.5, y: 0.05 },
    footprint: { radius: 0.82 },
  },
  crate: {
    id: "crate",
    src: "assets/placeholders/crate.svg",
    ...px(256, 256),
    width: 0.95,
    height: 0.9,
    anchor: { x: 0.5, y: 0.06 },
    footprint: { radius: 0.38 },
  },
  picnic: {
    id: "picnic",
    src: "assets/placeholders/picnic.svg",
    ...px(420, 320),
    width: 2.5,
    height: 1.7,
    anchor: { x: 0.5, y: 0.08 },
    footprint: null,
  },
  patio: {
    id: "patio",
    src: "assets/placeholders/patio.svg",
    ...px(420, 320),
    width: 2.15,
    height: 1.55,
    anchor: { x: 0.5, y: 0.06 },
    footprint: { radius: 0.62 },
  },
  tree: {
    id: "tree",
    src: "assets/placeholders/tree.svg",
    ...px(420, 460),
    width: 2.7,
    height: 2.95,
    anchor: { x: 0.5, y: 0.04 },
    footprint: { radius: 0.55 },
  },
  treeSmall: {
    id: "tree-small",
    src: "assets/placeholders/tree-small.svg",
    ...px(360, 400),
    width: 2.05,
    height: 2.25,
    anchor: { x: 0.5, y: 0.04 },
    footprint: { radius: 0.42 },
  },
  bush: {
    id: "bush",
    src: "assets/placeholders/bush.svg",
    ...px(256, 200),
    width: 1.25,
    height: 0.95,
    anchor: { x: 0.5, y: 0.08 },
    footprint: { radius: 0.32 },
  },
  flowers: {
    id: "flowers",
    src: "assets/placeholders/flowers.svg",
    ...px(256, 220),
    width: 1.15,
    height: 1.0,
    anchor: { x: 0.5, y: 0.06 },
    footprint: null,
  },
  flowersPink: {
    id: "flowers-pink",
    src: "assets/placeholders/flowers-pink.svg",
    ...px(256, 220),
    width: 1.1,
    height: 0.95,
    anchor: { x: 0.5, y: 0.06 },
    footprint: null,
  },
  lamp: {
    id: "lamp",
    src: "assets/placeholders/lamp.svg",
    ...px(220, 420),
    width: 0.85,
    height: 1.85,
    anchor: { x: 0.5, y: 0.03 },
    footprint: { radius: 0.22 },
  },
  rock: {
    id: "rock",
    src: "assets/placeholders/rock.svg",
    ...px(280, 200),
    width: 1.15,
    height: 0.82,
    anchor: { x: 0.5, y: 0.08 },
    footprint: { radius: 0.4 },
  },
  rockSmall: {
    id: "rock-small",
    src: "assets/placeholders/rock-small.svg",
    ...px(200, 160),
    width: 0.72,
    height: 0.55,
    anchor: { x: 0.5, y: 0.08 },
    footprint: { radius: 0.26 },
  },
  lighthouse: {
    id: "lighthouse",
    src: "assets/placeholders/lighthouse.svg",
    ...px(360, 640),
    width: 2.15,
    height: 4.15,
    anchor: { x: 0.5, y: 0.03 },
    footprint: { radius: 0.72 },
  },
  lighthouseBeam: {
    id: "lighthouse-beam",
    src: "assets/placeholders/lighthouse-beam.svg",
    kind: "effect",
    ...px(640, 280),
    note: "Wedge of light. The left edge is the lantern; the right edge fades out. The game faces this card at the camera.",
  },
  arcade: {
    id: "arcade",
    src: "assets/placeholders/arcade.svg",
    ...px(420, 460),
    width: 2.25,
    height: 2.45,
    anchor: { x: 0.5, y: 0.04 },
    footprint: { radius: 0.7 },
  },
  bloom: {
    id: "bloom",
    src: "assets/placeholders/bloom.svg",
    ...px(320, 320),
    width: 1.5,
    height: 1.5,
    anchor: { x: 0.5, y: 0.06 },
    footprint: null,
  },
  bridge: {
    id: "bridge",
    src: "assets/placeholders/bridge.svg",
    ...px(420, 220),
    width: 2.4,
    height: 1.15,
    anchor: { x: 0.5, y: 0.1 },
    footprint: null,
  },
  cloud: {
    id: "cloud",
    src: "assets/placeholders/cloud.svg",
    ...px(420, 220),
    width: 4.2,
    height: 2.1,
    anchor: { x: 0.5, y: 0.5 },
    footprint: null,
  },
  pibo: {
    id: "pibo",
    kind: "character",
    width: 1.42,
    height: 1.82,
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

export function collectSources(assets = ASSETS) {
  const urls = new Set();
  for (const entry of Object.values(assets)) {
    if (entry.src) urls.add(entry.src);
    if (entry.states) {
      for (const frames of Object.values(entry.states)) {
        for (const url of frames) urls.add(url);
      }
    }
  }
  return [...urls];
}

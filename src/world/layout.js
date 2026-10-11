/**
 * Flat layout of the home island, in world units.
 * x grows east, z grows south (toward the camera). North is −z.
 * Every prop id here is listed in src/data/assets.js.
 */

export const GROUND_Y = 2.35;
export const WATER_Y = 0.16;

/** Texture coverage for the island-top image. Keep in sync with ASSETS.md. */
export const GROUND_BOUNDS = {
  minX: -12,
  maxX: 18,
  minZ: -12,
  maxZ: 10,
};

/**
 * Walkable land. The home outline is an irregular cliff. The two islets are
 * circles. Anything outside these shapes is water.
 */
export const LAND = {
  home: [
    [-8.7, -3.2],
    [-7.6, -5.6],
    [-4.8, -6.7],
    [-1.4, -6.3],
    [1.8, -5.4],
    [4.6, -4.0],
    [6.8, -2.2],
    [7.9, 0.2],
    [7.5, 2.6],
    [5.8, 4.6],
    [3.2, 5.8],
    [0.2, 6.4],
    [-3.0, 5.8],
    [-5.8, 4.4],
    [-7.8, 2.2],
    [-8.9, -0.4],
  ],
  lighthouse: { x: 12.6, z: -8.0, r: 2.35 },
  arcade: { x: 15.2, z: 2.8, r: 2.05 },
};

export const LAYOUT = {
  start: { x: 0.15, z: 1.05 },
  home: { x: -5.45, z: -1.05 },
  tealHouse: { x: -0.45, z: -3.75 },
  patio: { x: 1.2, z: -2.05 },
  shed: { x: 4.85, z: -0.45 },
  crate: { x: 3.4, z: 0.62 },
  picnic: { x: 2.85, z: 3.4 },
  lighthouse: { x: 12.6, z: -8.0 },
  lighthousePad: { x: 11.45, z: -6.7 },
  arcade: { x: 15.2, z: 2.8 },
  arcadeDoor: { x: 13.95, z: 3.45 },
  companion: { x: -6.35, z: 3.05 },
  pino: { x: -5.55, z: 3.65 },
  garden: [
    { x: -4.15, z: 2.25 },
    { x: -2.75, z: 3.15 },
    { x: -5.05, z: 3.45 },
  ],
  bridge: { x: 0.9, z: 5.35 },
  rewardBloom: { x: -1.5, z: 4.45 },
};

/**
 * Everything drawn as a swappable sprite. `hidden` stays out of view until a
 * system shows it. `sky` sprites float and do not collide.
 */
export const PLACEMENTS = [
  { id: "tree-west", asset: "tree", x: -7.35, z: -1.55 },
  { id: "tree-cottage-back", asset: "tree", x: -4.05, z: -4.05 },
  { id: "tree-north", asset: "treeSmall", x: -2.45, z: -5.45 },
  { id: "tree-south", asset: "treeSmall", x: -6.35, z: 1.85 },
  { id: "cottage", asset: "cottage", x: -5.45, z: -1.05 },
  { id: "teal-house", asset: "tealHouse", x: -0.45, z: -3.75 },
  { id: "patio", asset: "patio", x: 1.2, z: -2.05 },
  { id: "lamp-patio", asset: "lamp", x: 2.55, z: -1.25 },
  { id: "lamp-path", asset: "lamp", x: 0.15, z: 2.45 },
  { id: "shed", asset: "shed", x: 4.85, z: -0.45 },
  { id: "crate", asset: "crate", x: 3.4, z: 0.62 },
  { id: "tree-shed", asset: "tree", x: 6.55, z: 0.05 },
  { id: "picnic", asset: "picnic", x: 2.85, z: 3.4 },
  { id: "bush-1", asset: "bush", x: -6.7, z: 0.35 },
  { id: "bush-2", asset: "bush", x: 5.7, z: 1.85 },
  { id: "bush-3", asset: "bush", x: -1.7, z: -1.15 },
  { id: "bush-4", asset: "bush", x: 0.85, z: -5.15 },
  { id: "flowers-1", asset: "flowers", x: -6.85, z: -3.15 },
  { id: "flowers-2", asset: "flowersPink", x: -3.15, z: -2.15 },
  { id: "flowers-3", asset: "flowers", x: 0.55, z: -0.15 },
  { id: "flowers-4", asset: "flowersPink", x: 6.05, z: 2.55 },
  { id: "flowers-5", asset: "flowers", x: -2.35, z: 4.35 },
  { id: "flowers-6", asset: "flowersPink", x: 4.55, z: 4.55 },
  { id: "flowers-7", asset: "flowers", x: -7.55, z: 0.85 },
  { id: "flowers-8", asset: "flowersPink", x: -5.4, z: -3.55 },
  { id: "rock-1", asset: "rock", x: -8.15, z: -1.35 },
  { id: "rock-2", asset: "rock", x: 6.35, z: 3.15 },
  { id: "rock-3", asset: "rockSmall", x: 6.15, z: -1.85 },
  { id: "rock-4", asset: "rockSmall", x: -3.6, z: 5.45 },
  { id: "rock-5", asset: "rock", x: -6.7, z: -5.15 },
  { id: "rock-6", asset: "rockSmall", x: 3.55, z: -3.7 },
  { id: "lighthouse", asset: "lighthouse", x: 12.6, z: -8.0 },
  { id: "arcade", asset: "arcade", x: 15.2, z: 2.8 },
  { id: "bloom", asset: "bloom", x: -1.5, z: 4.45, hidden: true },
  { id: "bridge", asset: "bridge", x: 0.9, z: 5.35, hidden: true },
  { id: "cloud-1", asset: "cloud", x: -7.5, z: -10.2, y: 8.2, sky: true },
  { id: "cloud-2", asset: "cloud", x: 2.4, z: -11.4, y: 9.1, sky: true },
  { id: "cloud-3", asset: "cloud", x: 13.5, z: -11.8, y: 8.4, sky: true },
  { id: "cloud-4", asset: "cloud", x: 8.2, z: -9.6, y: 10.2, sky: true },
];

export function collidersFromPlacements(placements, assets) {
  const out = [];
  for (const place of placements) {
    if (place.hidden || place.sky) continue;
    const footprint = assets[place.asset]?.footprint;
    if (!footprint?.radius) continue;
    out.push({
      id: place.id,
      x: place.x,
      z: place.z,
      radius: footprint.radius,
    });
  }
  return out;
}

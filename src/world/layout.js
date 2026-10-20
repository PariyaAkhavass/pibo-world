/**
 * Painted-plate layout. x grows to the right of the picture, z grows down.
 * The numbers come from the concept painting (see src/data/painted.js).
 */
import { PLACEMENTS as PLACES, LAYOUT, PLACEMENTS } from "../data/painted.js";

export { LAYOUT, PLACEMENTS };

export const GROUND_Y = 0;
export const WATER_Y = 0;

/**
 * Keep-outs are the house footprints and a few big trunks.
 * A house is the polygon of its walls on the ground, large enough that
 * Pibo cannot overlap a wall from any side. Trunk circles sit on the
 * trunk, not the canopy. Pibo adds his own body radius when he resolves.
 */
const HOUSES = {
  cottage: [
    [-8.85, -0.55],
    [-5.35, -0.2],
    [-4.15, -1.4],
    [-4.2, -2.8],
    [-8.5, -3.05],
    [-8.95, -1.6],
  ],
  "teal-house": [
    [-1.5, -2.05],
    [1.6, -1.95],
    [1.65, -3.55],
    [-1.4, -3.7],
  ],
  shed: [
    [4.6, 1.2],
    [8.75, 1.3],
    [8.9, 0.15],
    [8.8, -1.35],
    [5.15, -1.6],
    [4.5, -0.45],
  ],
  // Library walls on the top-left islet. The stairs and the path stay open.
  library: [
    [-15.42, -3.25],
    [-13.72, -3.25],
    [-13.65, -4.55],
    [-15.5, -4.6],
  ],
};

const TRUNKS = {
  "tree-west": { dx: 0.25, dz: -0.35, radius: 0.28 },
  "tree-back": { dx: -0.55, dz: -0.7, radius: 0.24 },
  "tree-shed": { dx: 0.45, dz: -0.18, radius: 0.18 },
};

export function collidersFromPlacements(placements = PLACES) {
  const byId = new Map(placements.map((place) => [place.id, place]));
  const out = [];
  for (const [id, ring] of Object.entries(HOUSES)) {
    const place = byId.get(id);
    if (!place || place.hidden || place.sky) continue;
    out.push({
      id,
      type: "poly",
      points: ring.map(([x, z]) => ({ x, z })),
    });
  }
  for (const [id, shape] of Object.entries(TRUNKS)) {
    const place = byId.get(id);
    if (!place || place.hidden || place.sky) continue;
    out.push({
      id,
      type: "circle",
      x: place.x + shape.dx,
      z: place.z + shape.dz,
      radius: shape.radius,
    });
  }
  return out;
}

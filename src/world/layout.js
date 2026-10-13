/**
 * Painted-plate layout. x grows to the right of the picture, z grows down.
 * The numbers come from the concept painting (see src/data/painted.js).
 */
import { PLACEMENTS as PLACES, LAYOUT, PLACEMENTS } from "../data/painted.js";

export { LAYOUT, PLACEMENTS };

export const GROUND_Y = 0;
export const WATER_Y = 0;

/**
 * Keep-outs are only the house bases and a few big trunks.
 * dx/dz shift the shape off the sprite's feet, up the picture into the
 * base or the trunk, and away from the roof and the canopy.
 * halfW/halfD and radius are the solid itself; Pibo adds a thin skin.
 */
const KEEPOUTS = {
  // The near face sits just up the picture from the feet, on the wall.
  cottage: { type: "box", dx: -0.1, dz: -0.72, halfW: 1.15, halfD: 0.35 },
  "teal-house": { type: "box", dx: 0.15, dz: -2.85, halfW: 0.8, halfD: 0.3 },
  shed: { type: "box", dx: -0.35, dz: -1.12, halfW: 0.95, halfD: 0.32 },
  "tree-west": { type: "circle", dx: 0.25, dz: -0.35, radius: 0.28 },
  "tree-back": { type: "circle", dx: -0.55, dz: -0.7, radius: 0.24 },
  "tree-shed": { type: "circle", dx: 0.45, dz: -0.18, radius: 0.18 },
};

export function collidersFromPlacements(placements = PLACES) {
  const byId = new Map(placements.map((place) => [place.id, place]));
  const out = [];
  for (const [id, shape] of Object.entries(KEEPOUTS)) {
    const place = byId.get(id);
    if (!place || place.hidden || place.sky) continue;
    out.push({
      id,
      type: shape.type,
      x: place.x + shape.dx,
      z: place.z + shape.dz,
      radius: shape.radius,
      halfW: shape.halfW,
      halfD: shape.halfD,
    });
  }
  return out;
}

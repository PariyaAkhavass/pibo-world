/**
 * Bright-island layout. x grows to the right of the picture, z grows down.
 * The buildings are painted into the plate, so these polygons are the
 * footprints Pibo slides along. They are not tied to a cutout sprite.
 */
import { LAYOUT, PLACEMENTS } from "../data/painted.js";

export { LAYOUT, PLACEMENTS };

export const GROUND_Y = 0;
export const WATER_Y = 0;

/**
 * Each ring is the building as it sits on the picture, so Pibo cannot walk
 * through the walls. The side toward the bottom of the picture (larger z)
 * is the door side and stays just outside the ring.
 */
const HOUSES = {
  // Book stack. The south edge stops above the sandy pad in front of the door.
  library: [
    [-14.0, -7.8],
    [-10.5, -7.8],
    [-10.5, -4.05],
    [-14.0, -4.05],
  ],
  // Red roof and tan walls. The front grass (z > 0.95) stays walkable.
  cottage: [
    [-10.15, -4.25],
    [-4.95, -4.25],
    [-4.95, 0.95],
    [-10.15, 0.95],
  ],
  // Cap and stem. The path along the west and south sides stays open.
  mushroom: [
    [-0.85, -5.35],
    [2.85, -5.35],
    [2.85, -0.85],
    [-0.85, -0.85],
  ],
  // Striped stall. Stops before the grass south of the counter.
  stall: [
    [6.35, -0.15],
    [9.3, -0.15],
    [9.3, 2.25],
    [6.35, 2.25],
  ],
  // Tower shaft only. The rock apron in front (lighthousePad) stays open.
  lighthouse: [
    [7.3, -7.7],
    [9.15, -7.7],
    [9.15, -3.55],
    [7.3, -3.55],
  ],
  // Purple arcade. The gray steps just south of z=3.25 are the door pad.
  arcade: [
    [11.62, -0.75],
    [15.38, -0.75],
    [15.38, 3.25],
    [11.62, 3.25],
  ],
};

const TRUNKS = [
  { id: "tree-left", x: -12.25, z: 3.15, radius: 0.48 },
  { id: "tree-cottage", x: -11.0, z: 1.05, radius: 0.5 },
];

export function collidersFromPlacements() {
  const out = [];
  for (const [id, ring] of Object.entries(HOUSES)) {
    out.push({
      id,
      type: "poly",
      points: ring.map(([x, z]) => ({ x, z })),
    });
  }
  for (const trunk of TRUNKS) {
    out.push({
      id: trunk.id,
      type: "circle",
      x: trunk.x,
      z: trunk.z,
      radius: trunk.radius,
    });
  }
  return out;
}

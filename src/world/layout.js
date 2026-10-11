/**
 * Painted-plate layout. x grows to the right of the picture, z grows down.
 * The numbers come from the concept painting (see src/data/painted.js).
 */
import { PLACEMENTS as PLACES, LAYOUT, PLACEMENTS } from "../data/painted.js";

export { LAYOUT, PLACEMENTS };

export const GROUND_Y = 0;
export const WATER_Y = 0;

/** Push circles sit on the body of a sprite, not on the grass in front of it. */
export function collidersFromPlacements(placements = PLACES, assets) {
  const out = [];
  for (const place of placements) {
    if (place.hidden || place.sky) continue;
    const asset = assets[place.asset];
    const footprint = asset?.footprint;
    if (!footprint?.radius || !asset.width || asset.width < 0.4) continue;
    out.push({
      id: place.id,
      x: place.x,
      z: place.z - asset.height * 0.34,
      radius: Math.min(footprint.radius, asset.height > 4 ? 1.15 : 0.55),
    });
  }
  return out;
}

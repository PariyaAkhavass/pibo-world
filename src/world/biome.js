import { LAND } from "./layout.js";

/**
 * Flat-island water test. Land is the home cliff polygon plus two round islets.
 * The pot counts as touching water the moment any sample on its body leaves land,
 * so it never keeps a walking pose while a foot is in the sea.
 */

const BODY = 0.4;

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const zi = poly[i][1];
    const xj = poly[j][0];
    const zj = poly[j][1];
    const hit = (zi > z) !== (zj > z)
      && x < ((xj - xi) * (z - zi)) / (zj - zi + 0.0000001) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

function onDisc(x, z, disc) {
  const dx = x - disc.x;
  const dz = z - disc.z;
  return dx * dx + dz * dz <= disc.r * disc.r;
}

/** True when this point is on grass, sand, or an islet — not open water. */
export function onLand(x, z) {
  if (pointInPoly(x, z, LAND.home)) return true;
  if (onDisc(x, z, LAND.lighthouse)) return true;
  if (onDisc(x, z, LAND.arcade)) return true;
  return false;
}

/**
 * Swim as soon as the body touches blue water.
 * `fx, fz` is the facing direction (unit vector). The forward sample is the
 * pot's nose, so stepping off a cliff starts the stroke immediately.
 */
export function isBlueWater(x, z, fx = 0, fz = 0) {
  if (!onLand(x, z)) return true;
  const reach = BODY;
  if (!onLand(x + fx * reach, z + fz * reach)) return true;
  if (!onLand(x + reach, z)) return true;
  if (!onLand(x - reach, z)) return true;
  if (!onLand(x, z + reach)) return true;
  if (!onLand(x, z - reach)) return true;
  return false;
}

/** Kept so older sphere modules still import. The live world does not use it. */
export const OCEAN_LAT = 64;
export function oceanAmount() {
  return 0;
}

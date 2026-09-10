import * as THREE from "three";
import { LAYOUT, dirOf } from "./layout.js";

/**
 * Planet-scale biomes. The garden village is a grassy cap around the north
 * pole; the rest of the sphere is open ocean, with two islands (lighthouse +
 * the far meadow) so the empty green hillside reads as sea.
 *
 * lat is degrees from the north pole (same convention as layout.js).
 */
export const OCEAN_LAT = 64;
export const SHORE_WIDTH = 8;

const ISLANDS = [
  { dir: dirOf(LAYOUT.lighthouseIsland), radius: 14 },
  { dir: dirOf(LAYOUT.meadowIsland), radius: 26 },
];

function islandAmount(dir) {
  let best = 0;
  for (const isl of ISLANDS) {
    const d = THREE.MathUtils.radToDeg(dir.angleTo(isl.dir));
    const inner = isl.radius - 5;
    let amt = 0;
    if (d < inner) amt = 1;
    else if (d < isl.radius) amt = 1 - (d - inner) / 5;
    if (amt > best) best = amt;
  }
  return best;
}

function latOf(dir) {
  return THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(dir.y, -1, 1)));
}

/**
 * 0 = dry land, 1 = open water. Islands cut holes in the sea so the
 * lighthouse dock and far meadow stay walkable.
 */
export function oceanAmount(dir) {
  const n = dir.clone().normalize();
  const lat = latOf(n);
  let land;
  if (lat >= OCEAN_LAT) land = 0;
  else if (lat <= OCEAN_LAT - SHORE_WIDTH) land = 1;
  else land = 1 - (lat - (OCEAN_LAT - SHORE_WIDTH)) / SHORE_WIDTH;
  land = Math.max(land, islandAmount(n));
  return 1 - land;
}

import * as THREE from "three";
import { LAYOUT, dirOf } from "./layout.js";
import { tangentToward } from "../core/SphereMath.js";

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

/**
 * Latitude where the sandy beach ends and the ground is blue ocean.
 * Shallow water at this line counts as water — there is no wade band.
 */
export const WATERLINE_LAT = OCEAN_LAT + 6;

const PLANET_R = 10;
/** How far the pot sticks forward of its center, so swim starts on contact. */
const BODY_REACH = 0.42;

const _n = new THREE.Vector3();
const _off = new THREE.Vector3();
const _right = new THREE.Vector3();

const LAND_DISCS = [
  { dir: dirOf(LAYOUT.lighthouseIsland), radius: 2.15 },
  { dir: dirOf(LAYOUT.meadowIsland), radius: 4.4 },
];

const DOCK_PAD = dirOf(LAYOUT.lighthousePad);
const DOCK_FWD = tangentToward(DOCK_PAD, dirOf(LAYOUT.lighthouse));

function onDisc(dir, disc) {
  return dir.angleTo(disc.dir) * PLANET_R <= disc.radius + BODY_REACH;
}

function onLighthouseDock(dir) {
  if (dir.angleTo(DOCK_PAD) > 0.45) return false;
  _off.copy(dir).addScaledVector(DOCK_PAD, -dir.dot(DOCK_PAD));
  _right.crossVectors(DOCK_PAD, DOCK_FWD);
  const along = _off.dot(DOCK_FWD) * PLANET_R;
  const side = _off.dot(_right) * PLANET_R;
  const onDeck = along * along + side * side <= 2.05 * 2.05;
  const onPier = along >= -0.2 && along <= 3.05 && Math.abs(side) <= 1.05;
  return onDeck || onPier;
}

/**
 * True when the character is touching the blue ocean — shoreline shallows
 * included. Grass, the beach, the islands, and the lighthouse dock are dry.
 */
export function isBlueWater(dir) {
  _n.copy(dir).normalize();
  if (latOf(_n) <= WATERLINE_LAT - (BODY_REACH / PLANET_R) * (180 / Math.PI)) return false;
  for (const disc of LAND_DISCS) {
    if (onDisc(_n, disc)) return false;
  }
  if (onLighthouseDock(_n)) return false;
  return true;
}

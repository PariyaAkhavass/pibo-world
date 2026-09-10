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

const GRASS = new THREE.Color(0x8fce74);
const GRASS_DARK = new THREE.Color(0x7cbb63);
const SAND = new THREE.Color(0xe6d09a);
const SAND_WET = new THREE.Color(0xc4b070);
const SHALLOW = new THREE.Color(0x5ebfd4);
const OCEAN = new THREE.Color(0x2f90c0);
const DEEP = new THREE.Color(0x1c6a9a);

const ISLANDS = [
  { dir: dirOf(LAYOUT.lighthouseIsland), radius: 15 },
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

export function biomeSample(dir) {
  const n = dir.clone().normalize();
  const lat = latOf(n);
  const island = islandAmount(n);
  const ocean = oceanAmount(n);
  const depth = THREE.MathUtils.clamp((lat - OCEAN_LAT) / 48, 0, 1) * (1 - island);
  return { lat, island, ocean, depth, land: 1 - ocean };
}

/** Vertex color for the ground sphere. */
export function biomeColor(dir, target = new THREE.Color()) {
  const s = biomeSample(dir);
  if (s.ocean < 0.06) {
    const g = (Math.abs(dir.x * 12.7 + dir.z * 8.3) % 1) > 0.55 ? GRASS_DARK : GRASS;
    return target.copy(g);
  }
  if (s.ocean < 0.5) {
    const t = (s.ocean - 0.06) / 0.44;
    return target.copy(GRASS).lerp(SAND, t);
  }
  const sand = s.island > 0.05 ? SAND : SAND_WET;
  const water = SHALLOW.clone().lerp(DEEP, s.depth);
  const t = THREE.MathUtils.smoothstep(0.5, 1, s.ocean);
  return target.copy(sand).lerp(water, t);
}

export function isLand(dir, threshold = 0.45) {
  return oceanAmount(dir) < threshold;
}

/** Tint for the glossy water overlay (shallow near shore, deep mid-ocean). */
export function waterTint(dir, target = new THREE.Color()) {
  const s = biomeSample(dir);
  return target.copy(SHALLOW).lerp(OCEAN, THREE.MathUtils.clamp(s.depth * 1.2, 0, 1));
}

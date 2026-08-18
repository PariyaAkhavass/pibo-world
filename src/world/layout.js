import { latLonToDir } from "../core/SphereMath.js";

/**
 * The handcrafted layout of the starter planet, in lat/lon degrees.
 * lat 0 = north pole = where Pibo wakes up. Kept in one place so props, the
 * garden, and the camera framing all agree, and so future planets are just a
 * different layout object.
 */
export const LAYOUT = {
  start: { lat: 0, lon: 0 },

  home: { lat: 24, lon: 20, yaw: -0.5 },
  workshop: { lat: 27, lon: -48, yaw: 0.7 },
  observatory: { lat: 18, lon: -108, yaw: 0.2 },
  pond: { lat: 33, lon: -158 },
  landing: { lat: 36, lon: 66 },

  // three planting spots in the garden patch, spread so they never overlap
  // (longitude compresses toward the pole, so spacing mostly uses latitude)
  garden: [
    { lat: 14, lon: 116 },
    { lat: 30, lon: 128 },
    { lat: 46, lon: 118 },
  ],

  // reward pieces (hidden until earned)
  bridge: { lat: 40, lon: -178, yaw: 0.3 },
  rewardBloom: { lat: 6, lon: 250 },

  // decorative nature, hand-placed for good silhouettes
  trees: [
    { lat: 34, lon: 8 }, { lat: 40, lon: -20 }, { lat: 30, lon: 44 },
    { lat: 46, lon: -78 }, { lat: 44, lon: 150 }, { lat: 52, lon: 100 },
    { lat: 38, lon: -128 },
  ],
  rocks: [
    { lat: 30, lon: -70 }, { lat: 48, lon: 30 }, { lat: 26, lon: 96 },
    { lat: 50, lon: -150 }, { lat: 42, lon: 180 },
  ],
  flowers: [
    { lat: 16, lon: 40 }, { lat: 22, lon: -10 }, { lat: 28, lon: 60 },
    { lat: 34, lon: -30 }, { lat: 18, lon: 150 }, { lat: 30, lon: 170 },
    { lat: 24, lon: -90 }, { lat: 40, lon: 96 }, { lat: 12, lon: 90 },
  ],
};

export function dirOf(entry) {
  return latLonToDir(entry.lat, entry.lon);
}

/**
 * Solid footprints for surface collision. Radii are world units on the
 * planet (roughly half the building/tree width). Garden beds, the pond,
 * the landing pad, and flowers stay walkable so you can still reach them.
 */
export function collidersOf(layout = LAYOUT) {
  const out = [];
  const add = (entry, radius) => {
    if (!entry || !radius) return;
    out.push({ dir: dirOf(entry), radius });
  };
  add(layout.home, 1.5);
  add(layout.workshop, 1.45);
  add(layout.observatory, 2.0);
  for (const t of layout.trees ?? []) add(t, 0.72);
  for (const r of layout.rocks ?? []) add(r, 0.58);
  return out;
}

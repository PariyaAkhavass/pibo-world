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
  planetarium: { lat: 55, lon: -104, yaw: -0.35 },
  cafe: { lat: 49, lon: 14, yaw: 0.55 },
  library: { lat: 57, lon: -226, yaw: -0.15 },
  windmill: { lat: 61, lon: 220, yaw: 0.6 },
  well: { lat: 53, lon: -146, yaw: 0.25 },
  picnic: { lat: 39, lon: -12, yaw: -0.45 },
  pond: { lat: 33, lon: -158 },
  landing: { lat: 36, lon: 66 },
  ufo: { lat: 36, lon: 66 },

  // far green side — a quiet meadow opposite the starting village
  companion: { lat: 122, lon: 204 },
  pino: { lat: 119, lon: 211 },
  familyShip: { lat: 125, lon: 196 },

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
    { lat: 38, lon: -128 }, { lat: 58, lon: -38 }, { lat: 56, lon: 58 },
    { lat: 62, lon: 142 }, { lat: 28, lon: -202 },
  ],
  rocks: [
    { lat: 30, lon: -70 }, { lat: 48, lon: 30 }, { lat: 26, lon: 96 },
    { lat: 50, lon: -150 }, { lat: 42, lon: 180 }, { lat: 58, lon: -176 },
    { lat: 60, lon: 86 }, { lat: 36, lon: -224 },
  ],
  flowers: [
    { lat: 16, lon: 40 }, { lat: 22, lon: -10 }, { lat: 28, lon: 60 },
    { lat: 34, lon: -30 }, { lat: 18, lon: 150 }, { lat: 30, lon: 170 },
    { lat: 24, lon: -90 }, { lat: 40, lon: 96 }, { lat: 12, lon: 90 },
    { lat: 54, lon: -18 }, { lat: 58, lon: 32 }, { lat: 60, lon: 118 },
    { lat: 48, lon: -206 }, { lat: 20, lon: -172 },
    { lat: 117, lon: 200 }, { lat: 120, lon: 208 }, { lat: 124, lon: 212 },
  ],
  lanterns: [
    { lat: 39, lon: -100 }, { lat: 50, lon: -118 }, { lat: 43, lon: 36 },
    { lat: 54, lon: -4 }, { lat: 42, lon: 132 }, { lat: 55, lon: 172 },
  ],
  mushrooms: [
    { lat: 22, lon: -140 }, { lat: 26, lon: -188 }, { lat: 48, lon: -52 },
    { lat: 52, lon: 72 }, { lat: 58, lon: 212 }, { lat: 38, lon: 222 },
  ],
  benches: [
    { lat: 43, lon: -162, yaw: 0.8 },
    { lat: 45, lon: 42, yaw: -0.55 },
  ],
  starStones: [
    { lat: 31, lon: -108 }, { lat: 37, lon: -110 }, { lat: 44, lon: -109 },
    { lat: 50, lon: -106 },
  ],
  mailboxes: [
    { lat: 26, lon: 36, yaw: -0.55 },
    { lat: 48, lon: 92, yaw: 0.2 },
    { lat: 54, lon: -212, yaw: -0.35 },
  ],
  signposts: [
    { lat: 35, lon: -64, yaw: 0.35 },
    { lat: 42, lon: 78, yaw: -0.25 },
    { lat: 50, lon: -132, yaw: 0.75 },
  ],
  crystals: [
    { lat: 59, lon: -70 }, { lat: 63, lon: 24 }, { lat: 56, lon: 190 },
    { lat: 45, lon: 238 },
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
  add(layout.planetarium, 1.65);
  add(layout.cafe, 1.55);
  add(layout.library, 1.35);
  add(layout.windmill, 1.35);
  add(layout.well, 1.0);
  for (const t of layout.trees ?? []) add(t, 0.72);
  for (const r of layout.rocks ?? []) add(r, 0.58);
  for (const b of layout.benches ?? []) add(b, 0.55);
  return out;
}

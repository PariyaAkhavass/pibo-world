/**
 * The three plants a player can grow in the starter garden.
 *
 * Each entry is pure data: identity, palette, a single wondrous fact, and the
 * number of growth stages. Visuals are built procedurally by GardenSystem from
 * `type`, so adding a new plant later is just another object here.
 */
export const PLANTS = [
  {
    id: "sunpetal",
    name: "Sunpetal",
    emoji: "🌻",
    type: "sun",
    color: 0xffcf4d,
    accent: 0x8a5a2b,
    leaf: 0x6fae5a,
    stages: 4,
    fact: "Sunpetals turn their faces to follow the sun across the sky all day.",
  },
  {
    id: "moonbell",
    name: "Moonbell",
    emoji: "🔔",
    type: "bell",
    color: 0xbca7ff,
    accent: 0x7d6bd6,
    leaf: 0x6fae5a,
    stages: 4,
    fact: "Moonbells stay shut by day and only open at night to greet passing moths.",
  },
  {
    id: "fernling",
    name: "Fernling",
    emoji: "🌿",
    type: "fern",
    color: 0x5fbf72,
    accent: 0x3f8a54,
    leaf: 0x5fbf72,
    stages: 4,
    fact: "Fernlings are ancient — their kind grew tall long before the first flower existed.",
  },
];

export function getPlant(id) {
  return PLANTS.find((p) => p.id === id);
}

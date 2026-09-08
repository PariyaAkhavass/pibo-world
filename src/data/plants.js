/**
 * The three plants a player can grow in the starter garden.
 *
 * Each entry is pure gameplay/visual data: identity, palette, and growth
 * stages. Language content lives in `vocab.js` so thesis experiments can
 * swap word lists without retuning the clay models.
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
  },
];

export function getPlant(id) {
  return PLANTS.find((p) => p.id === id);
}

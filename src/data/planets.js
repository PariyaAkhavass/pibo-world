/**
 * Planets a player can visit from the map.
 *
 * `locked` is the switch the map reads today. `unlock` is a placeholder for a
 * later points system — `points` stays null until the rules are chosen.
 * Rename `name` freely. Keep `id` stable so saves and travel can depend on it.
 */
export const PLANETS = [
  {
    id: "pibo-world",
    name: "Pibo World",
    home: true,
    locked: false,
    unlock: null,
    blurb: "Your pocket planet",
    color: "#8fce74",
  },
  {
    id: "cookie-cove",
    name: "Cookie Cove",
    home: false,
    locked: true,
    unlock: { kind: "points", points: null, label: "Earn points to unlock" },
    blurb: "A sweet little sea",
    color: "#f2c14e",
  },
  {
    id: "moon-muffin",
    name: "Moon Muffin",
    home: false,
    locked: true,
    unlock: { kind: "points", points: null, label: "Earn points to unlock" },
    blurb: "Soft hills under a night sky",
    color: "#c7b6f5",
  },
  {
    id: "bubble-bay",
    name: "Bubble Bay",
    home: false,
    locked: true,
    unlock: { kind: "points", points: null, label: "Earn points to unlock" },
    blurb: "Round islands and quiet water",
    color: "#8fd4ea",
  },
  {
    id: "star-sprinkle",
    name: "Star Sprinkle",
    home: false,
    locked: true,
    unlock: { kind: "points", points: null, label: "Earn points to unlock" },
    blurb: "A sparkly sky garden",
    color: "#f5a8c8",
  },
];

/** What the map should say when a planet cannot be visited yet. */
export function lockedLabel(planet) {
  return planet?.unlock?.label || "Earn points to unlock";
}

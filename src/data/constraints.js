/**
 * Teacher layer of the triple helix: class constraints on the designer world.
 *
 * A pack names the topic, learning goals, target language, and which catalog
 * plants are in bounds. Language stays swappable (`targetLang`, or `?lang=`).
 *
 * This is a data stub — no teacher login or CMS. Pick a pack with `?class=`:
 *   garden  (default)  nature / all three plants
 *   night              night sky / moonbell only
 */
export const CONSTRAINT_PACKS = {
  garden: {
    id: "class-garden-v1",
    role: "teacher",
    worldId: "pocket-planet-starter",
    title: "Garden words",
    theme: "nature",
    goals: [
      "Recognize three garden words in the target language",
      "Recall each word after growing it",
    ],
    targetLang: "es",
    nativeLang: "en",
    allowedPlantIds: ["sunpetal", "moonbell", "fernling"],
    distractors: "allowed",
    requireRecall: false,
    allowStudentCreations: true,
  },
  night: {
    id: "class-night-v1",
    role: "teacher",
    worldId: "pocket-planet-starter",
    title: "Night words",
    theme: "night",
    goals: [
      "Learn the word for moon",
      "Recall it after the plant blooms",
    ],
    targetLang: "es",
    nativeLang: "en",
    allowedPlantIds: ["moonbell"],
    distractors: "world",
    requireRecall: false,
    allowStudentCreations: true,
  },
};

export function getConstraints(classId = "garden") {
  return CONSTRAINT_PACKS[classId] || CONSTRAINT_PACKS.garden;
}

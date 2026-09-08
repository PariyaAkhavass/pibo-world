/**
 * Student layer of the triple helix: a play session + future creations.
 *
 * No accounts yet. One local session records what this visit planted and
 * recalled. `creations` is the stub for student-authored words/plants later;
 * `peers` is the stub for playing with classmates.
 *
 * This is a log, not a save game — the planet still starts empty each load.
 */
const STORAGE_KEY = "pibo-helix-session-v1";

export function createSession(worldId, constraintId, now = Date.now) {
  return {
    id: `local-${now()}`,
    role: "student",
    worldId,
    constraintId,
    startedAt: now(),
    plantings: [],
    recalls: [],
    creations: [],
    peers: [],
  };
}

export function recordPlanting(session, { spotIndex, plantId }, now = Date.now) {
  session.plantings.push({ spotIndex, plantId, at: now() });
  persist(session);
  return session;
}

export function recordRecall(session, { plantId, correct = false, skipped = false, word = "" }, now = Date.now) {
  session.recalls.push({
    plantId,
    correct: !!correct,
    skipped: !!skipped,
    word,
    at: now(),
  });
  persist(session);
  return session;
}

/**
 * Student-authored content living inside teacher constraints.
 * `kind: "vocab"` adds a word card; planting a brand-new species is later.
 */
export function addCreation(session, creation, now = Date.now) {
  session.creations.push({ ...creation, at: creation.at ?? now() });
  persist(session);
  return session;
}

/** Merge student vocab creations into a designer word bank (pure). */
export function mergeVocabCreations(bank, creations) {
  const out = { ...bank };
  for (const c of creations) {
    if (c.kind !== "vocab" || !c.plantId || !c.word) continue;
    const lang = c.lang || "es";
    out[c.plantId] = {
      ...(out[c.plantId] || {}),
      [lang]: {
        word: c.word,
        gloss: c.gloss || "",
        phrase: c.phrase || "",
        phraseGloss: c.phraseGloss || "",
      },
    };
  }
  return out;
}

function persist(session) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* node tests, private mode */
  }
}

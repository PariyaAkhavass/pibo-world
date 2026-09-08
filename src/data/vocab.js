/**
 * Language content for garden plants, keyed by plant id then language code.
 *
 * Each entry is a small vocabulary card:
 *   word        — L2 form shown as the thing to learn
 *   gloss       — L1 meaning
 *   phrase      — short L2 example sentence
 *   phraseGloss — L1 gloss of that sentence
 *
 * Add a new language by copying an `es` block under a new code (`de`, `ja`, …)
 * and pointing LESSON at it (`?lang=de` or DEFAULT_TARGET in lesson.js).
 */
import { LESSON } from "./lesson.js";

export const VOCAB = {
  sunpetal: {
    es: {
      word: "sol",
      gloss: "sun",
      phrase: "El sol brilla.",
      phraseGloss: "The sun is shining.",
    },
    fr: {
      word: "soleil",
      gloss: "sun",
      phrase: "Le soleil brille.",
      phraseGloss: "The sun is shining.",
    },
    en: {
      word: "sun",
      gloss: "the star that warms the garden",
      phrase: "The sun is shining.",
      phraseGloss: "El sol brilla.",
    },
  },
  moonbell: {
    es: {
      word: "luna",
      gloss: "moon",
      phrase: "La luna sale de noche.",
      phraseGloss: "The moon comes out at night.",
    },
    fr: {
      word: "lune",
      gloss: "moon",
      phrase: "La lune sort la nuit.",
      phraseGloss: "The moon comes out at night.",
    },
    en: {
      word: "moon",
      gloss: "the light that visits at night",
      phrase: "The moon comes out at night.",
      phraseGloss: "La luna sale de noche.",
    },
  },
  fernling: {
    es: {
      word: "helecho",
      gloss: "fern",
      phrase: "El helecho crece despacio.",
      phraseGloss: "The fern grows slowly.",
    },
    fr: {
      word: "fougère",
      gloss: "fern",
      phrase: "La fougère pousse doucement.",
      phraseGloss: "The fern grows slowly.",
    },
    en: {
      word: "fern",
      gloss: "an ancient leafy plant",
      phrase: "The fern grows slowly.",
      phraseGloss: "El helecho crece despacio.",
    },
  },
};

/**
 * Vocab card for a plant in the active (or given) target language.
 * Falls back to the native language, then to any available entry.
 */
export function vocabFor(plantId, lang = LESSON.target.code) {
  const entry = VOCAB[plantId];
  if (!entry) return null;
  return entry[lang] || entry[LESSON.native.code] || Object.values(entry)[0] || null;
}

export function wordOf(plantId, lang = LESSON.target.code) {
  return vocabFor(plantId, lang)?.word ?? "";
}

export function supportedLangs() {
  const codes = new Set();
  for (const entry of Object.values(VOCAB)) {
    for (const code of Object.keys(entry)) codes.add(code);
  }
  return [...codes].sort();
}

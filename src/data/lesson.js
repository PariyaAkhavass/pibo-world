/**
 * Active language-learning lesson for the starter garden.
 *
 * Swap the target language with `?lang=fr` (or `es` / `en`). The teacher
 * pack in `constraints.js` owns the default; this file is HUD copy plus
 * query helpers. Vocab lives in `vocab.js`.
 *
 * Playtest helper: `?fast=1` speeds plant growth so a full learn beat
 * can be walked through quickly. `?class=night` applies a tighter teacher pack.
 */
const LANG_NAMES = {
  es: "Spanish",
  fr: "French",
  en: "English",
};

const DEFAULT_TARGET = "es";
const DEFAULT_NATIVE = "en";

export function queryParam(name) {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get(name);
  } catch {
    return null;
  }
}

export function queryFlag(name) {
  try {
    const params = new URLSearchParams(globalThis.location?.search ?? "");
    return params.has(name);
  } catch {
    return false;
  }
}

export function resolveLang(raw, fallback) {
  if (raw && LANG_NAMES[raw]) return raw;
  return fallback;
}

const targetCode = resolveLang(queryParam("lang"), DEFAULT_TARGET);
const nativeCode = DEFAULT_NATIVE;

export const LESSON = {
  id: "starter-garden-v1",
  target: { code: targetCode, name: LANG_NAMES[targetCode] },
  native: { code: nativeCode, name: LANG_NAMES[nativeCode] },
  ui: {
    plantTitle: "Plant something",
    inspectNew: "Learn the word",
    inspectAgain: "Look again",
    quizPrompt: "What was this called?",
    quizFoot: "press <b>1</b> <b>2</b> <b>3</b> · <b>Esc</b> to skip",
    quizFootTouch: "<b>tap</b> a word · tap <b>E</b> to skip",
    correctToast: "You remembered {word}!",
    allLearnedToast: "You remembered every word ✨",
    bloomToast: "{word} bloomed {emoji}",
    collectionTitle: "Words you've grown",
    collectionEmpty: "Nothing yet — plant something and learn its name.",
  },
};

/** Fill `{name}` placeholders in a lesson UI string. */
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (
    vars[key] == null ? "" : String(vars[key])
  ));
}

export function langName(code) {
  return LANG_NAMES[code] || code;
}

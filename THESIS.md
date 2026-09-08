# Thesis notes — language learning on the pocket planet

Pibo World is being evolved as **Paria’s educational game** for a thesis on
language learning. The long-term vision is player-made worlds; this slice is
the first step: turn the existing garden loop into a learnable beat without
rewriting the toy.

## What changed

The plant → grow → inspect loop is now a small **exposure → input → recall**
cycle:

1. **Plant** — the seed picker shows the L2 word and an L1 gloss (`sol` / sun).
2. **Grow** — same cozy wait as before (the world still rewards a full garden).
3. **Inspect** — a vocabulary card replaces the old one-line “fact”: L2 word,
   L1 gloss, and a short example sentence with a translation.
4. **Recall** — closing the card opens a 3-choice quiz (“What was this called?”).
   A correct answer marks the word remembered in the collection. Skipping is
   allowed so the planet stays a toy, not a test.

World rewards (bridge, meadow bloom, observatory light) still fire when all
three beds bloom. Remembering every word is a separate, gentler toast.

## Why this supports language learning

- **Grounded in a scene.** Words are tied to something you grew, not a flashcard
  stack. That is a first approximation of situated vocabulary learning.
- **Input before output.** The word is seen at planting and again on the inspect
  card before the quiz asks for it.
- **Retrieval practice.** The quiz is a tiny recall prompt, which is more useful
  than re-reading the card alone.
- **Low affective filter.** Wrong answers stay on the card so you can try again;
  Esc skips. The cozy controls and clay-toy look are unchanged.

This is a prototype of a mechanic, not a finished pedagogy. It is meant to be
easy to measure and swap.

## Data-driven content (how to run experiments)

Language lives in `src/data/`, not in the mesh builders.

| File | Role |
| --- | --- |
| `src/data/lesson.js` | Active language pair + UI copy for the learn beat |
| `src/data/vocab.js` | Word cards keyed by plant id → language code |
| `src/data/plants.js` | Visual / gameplay identity only (palette, stages) |
| `src/learn/recall.js` | Pure quiz helpers (choices, shuffle, grade) |

**Swap the target language**

- Edit `DEFAULT_TARGET` in `src/data/lesson.js`, or
- Open the game with `?lang=fr` (Spanish `es`, French `fr`, English `en`).

Add a new language by copying an `es` block in `vocab.js` under a new code.

**Faster playtests:** `?fast=1` shortens growth so a full inspect + quiz can be
walked in a few seconds. Combine: `http://localhost:8000/?lang=fr&fast=1`.

**Tests:** `npm test` (or `node --test src/learn/recall.test.js`) checks that
every plant has es/fr/en cards and that recall choices always include the
target word.

## Suggested next experiments

These stay inside the current architecture (`data/` + `systems/` + `ui/`):

1. **Hide L2 at planting.** Picker shows only the emoji; the word appears first
   on inspect. Compare recall against the current “see it twice” condition.
2. **Bigger word bank / extra distractors.** `recallChoices` already takes
   `count`; add unused vocab entries so foils are not always the other two
   garden plants.
3. **Spaced re-inspect.** After a delay (or a lap around the planet), prompt
   “what was this called?” again. Log first-try accuracy per item.
4. **Production instead of recognition.** Type or speak the L2 word; keep the
   3-choice quiz as a fallback.
5. **Audio.** Attach a short pronunciation clip (or browser speechSynthesis)
   on the vocab card. Crucial for languages where spelling ≠ sound.
6. **Library as a review room.** The existing library prop is a natural place
   to reopen learned cards without growing a new plant.
7. **Local-only session log.** Write `{plantId, lang, correct, skipped, ms}` to
   `localStorage` for thesis playtests. Still no backend.
8. **Learner-authored lists.** A JSON drop-in (or a simple textarea later)
   that replaces `VOCAB` — a sketch of the “make your own world” vision.
9. **UI language vs. target language.** Chrome copy is still English; try a
   fully L2 HUD as a later condition.

Out of scope for now (on purpose): accounts, multiplayer, a content CMS, or a
new engine.

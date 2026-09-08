# Thesis notes — triple-helix co-design

Pibo World is **Paria’s thesis game**: a cozy Pocket Planet that becomes a
language-learning place through **triple-helix co-design**.

```
World (designer)  →  Constraints (teacher)  →  Student creations / play
     Paria                 class topic              peers learn together
```

1. **Game designer (Paria)** creates the Pocket Planet world and platform —
   the clay-toy planet, the garden loop, and the inspect/recall beat.
2. **Teachers** put constraints on a class: vocabulary theme, learning goals,
   which plants are in bounds, target language.
3. **Students** create and play with peers *inside* those constraints.

This PR implements (1) as a playable loop, and (2)+(3) as a real data shape
plus a tiny runtime hook — not a CMS, not accounts.

Language is still flexible: teacher packs pick a default; `?lang=fr` swaps it.

## What you can play now (designer-side loop)

The plant → grow → inspect loop is a small **exposure → input → recall** cycle
that students will eventually play inside a teacher’s assignment:

1. **Plant** — the seed picker shows the L2 word and an L1 gloss (`sol` / sun).
   A teacher pack can hide plants that are off-topic (`?class=night` → only
   moonbell).
2. **Grow** — same cozy wait as before (the world still rewards a full garden).
3. **Inspect** — a vocabulary card: L2 word, L1 gloss, example sentence.
4. **Recall** — closing the card opens a 3-choice quiz. A correct answer marks
   the word remembered. Skipping stays allowed so the planet is a toy, not a test.

The 🪴 drawer shows the **teacher title + language** (`Garden words · Spanish`)
above what the student has grown. Play is logged on `game.helix.session`
(plantings, recalls). `creations` and `peers` are empty stubs for later.

World rewards (bridge, meadow bloom, observatory light) still fire when all
three beds bloom. Remembering every word is a separate, gentler toast.

## Data model — World → Constraints → Session

| Layer | Role | File | What it owns |
| --- | --- | --- | --- |
| **World** | Designer (Paria) | `src/data/world.js` | Platform identity, layout id, plant catalog, supported languages, learn-loop verbs |
| **Constraints** | Teacher | `src/data/constraints.js` | Theme, goals, allow-list of plants, target/native language, foil policy |
| **Session** | Student | `src/data/session.js` | This visit’s plantings, recall attempts, `creations[]`, `peers[]` |
| **Compose** | Runtime | `src/data/helix.js` | `composeHelix()` → one object the game actually runs |

Sketch (the running objects match this):

```
World {
  id, role: "designer",
  layoutId, systems: ["garden"],
  plantCatalog: ["sunpetal", "moonbell", "fernling"],
  languagesSupported: ["es", "fr", "en"]
}

Constraints {
  id, role: "teacher", worldId,
  title, theme, goals[],
  targetLang, nativeLang,          // still swappable
  allowedPlantIds[],               // subset of world.plantCatalog
  distractors: "allowed" | "world",
  requireRecall, allowStudentCreations
}

Session {
  id, role: "student", worldId, constraintId,
  plantings: [{ spotIndex, plantId, at }],
  recalls:   [{ plantId, correct, skipped, word, at }],
  creations: [{ kind: "vocab", plantId, lang, word, gloss, … }],  // stub
  peers: []                                                      // stub
}
```

`composeHelix({ classId, lang })` intersects the allow-list with the catalog,
applies the language, and starts a session. `Game.helix` is that object.

Teacher packs in this build (no teacher UI yet):

- `?class=garden` (default) — Garden words, all three plants
- `?class=night` — Night words, moonbell only (quiz foils still come from the
  designer catalog so a 3-choice recall still works)

## Why the learn beat supports language learning

- **Grounded in a scene.** Words are tied to something you grew.
- **Input before output.** Seen at planting and on the inspect card before the quiz.
- **Retrieval practice.** A tiny recall prompt, skippable.
- **Constrained creation (next).** Students will add words/plants only inside
  the teacher’s theme — that is the helix, not an open sandbox.

## How to run experiments

| File | Role |
| --- | --- |
| `src/data/world.js` | Designer world stub |
| `src/data/constraints.js` | Teacher packs |
| `src/data/session.js` | Student log + vocab-creation merge |
| `src/data/helix.js` | Compose the three layers |
| `src/data/vocab.js` | Word cards keyed by plant id → language |
| `src/data/plants.js` | Visual / gameplay identity only |
| `src/data/lesson.js` | HUD copy + `?lang=` / `?fast=` / `?class=` helpers |
| `src/learn/recall.js` | Quiz choices + grading (no DOM) |

```bash
http://localhost:8000/?fast=1
http://localhost:8000/?class=night&fast=1
http://localhost:8000/?lang=fr&fast=1
```

Add a language by copying an `es` block in `vocab.js`. Add a class by copying
a pack in `constraints.js`. Dump the student log from the console:
`window.pibo.helix.session`.

**Tests:** `npm test` checks helix compose, teacher filtering, language swap,
session events, and that a student vocab creation can merge into the bank.

## Suggested next experiments (by helix layer)

**Designer (world / platform)**
- Audio on the vocab card; library as a review room; more systems than garden.

**Teacher (constraints)**
- A tiny local “class sheet” JSON (theme, goals, allow-list) dropped in `data/`.
- Hide L2 at planting as a constraint flag; required vs optional recall.
- Bigger word banks so foils are not always the other two garden plants.

**Student (play / create / peers)**
- Persist `helix.session` as a thesis log (`localStorage` already snapshots).
- Production (type/speak) instead of 3-choice recognition.
- First creation tool: add a vocab card that respects `allowedPlantIds`.
- Later: place a student-made plant; visit a peer’s planet (still no backend).

Out of scope for now (on purpose): accounts, multiplayer, a content CMS, or a
new engine.

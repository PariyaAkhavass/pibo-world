# Pibo · Pocket Planet

A tiny, charming, social **Pocket Planet** prototype for [pibo.world](https://pibo.world) — the
first playable sample of an educational MMORPG made of small personal planets.

The goal of this build is one feeling, not a feature list:

> **"I own this tiny world, it feels alive, and I want to keep shaping it."**

You wake up on a handcrafted **cozy learning garden planet**. Walk around it, plant three
things in the garden, watch them grow, learn a little **word** for each, and your world quietly
changes in return.

This fork is Paria’s thesis game: a language-learning experience grown out of the
pocket-planet prototype. See [THESIS.md](./THESIS.md) for the first learning slice,
how to swap word lists, and suggested experiments.

## Run it

The project uses native ES modules, so it needs to be served over HTTP (opening
`index.html` from the file system won't load the modules). No build step, no install.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Optional checks for the language data (no extra packages):

```bash
npm test
```

Any static server works (`npx serve`, `php -S localhost:8000`, a Live Server extension, …).

Three.js is loaded from a CDN via the import map in `index.html`, so you need an internet
connection the first time.

## Play

- **WASD** / **arrow keys** — walk around your planet (Pibo turns to face where it's going)
- **E** / **Enter** — interact (plant, then later inspect what you grew)
- **1 / 2 / 3** — choose a plant (and later pick a quiz answer)
- **Esc** — step back from a panel, vocab card, or quiz
- **🪴** (top-right) — words you've grown (a check appears when you remember one)
- **Phone / tablet** — a little joystick (bottom-left) steers Pibo; tap **E** (bottom-right) to interact. On-screen prompts and plant cards are tappable too.
- Houses, the workshop, the observatory, trees, and rocks are solid — Pibo slides around them.
- New landmarks fill out the walk: a little planetarium, mini café, tiny library,
  windmill, wishing well, picnic blanket, benches, lanterns, mailboxes, crystals,
  mushrooms, and star-stone paths now make the quiet spaces feel intentionally inhabited.
- **Pot-ship** (landing pad) — press **E** to board. **WASD** flies around the world, **Space** climbs into the toy sky, **Shift** / **F** descends, **E** lands anywhere. On a phone, ↑ / ↓ sit above the E button.

Walk to the three planter beds in the garden, plant a seed in each, wait a few seconds for
them to grow, and inspect them to learn a vocabulary card (L2 word, L1 gloss, example
sentence). Close the card and a tiny recall quiz asks “what was this called?” Grow all three
and watch what happens to the rest of the planet.

Playtest helpers (optional query flags):

- `?fast=1` — plants bloom in about a second
- `?lang=fr` — French word list (`es` Spanish default, `en` English)

## Architecture

Everything is a small, self-contained module so the world can grow later without a rewrite.

```
src/
  core/
    Game.js         orchestrator: renderer, loop, camera, interaction wiring
    Input.js        keyboard + analog stick (held movement vs. one-shot actions)
    SphereMath.js   living on a sphere: placement, movement, orientation
    Collision.js    circular keep-out on the surface (houses, trees, rocks)
  world/
    Planet.js       the Pocket Planet sphere + surface placement
    Environment.js  soft daytime lighting + shadows
    Props.js        handcrafted structures & nature (home, workshop, observatory, …)
    Ambient.js      clouds, butterflies — life while you stand still
    materials.js    shared "clay toy" materials & primitives
    layout.js       the handcrafted lat/lon layout of this planet
  entities/
    Pibo.js         the player creature (walks, idles, faces movement)
    Ufo.js          pot-shaped ship you can board and fly
    Galaxy.js       stars + hard clay planets for the family voyage
  systems/
    GardenSystem.js the plant → grow → inspect → recall loop
  learn/
    recall.js       quiz choices + grading (no DOM)
  data/
    plants.js       the three plants (visuals / growth only)
    vocab.js        L2 word cards keyed by plant + language
    lesson.js       active language pair + learn-beat copy
  ui/
    UI.js           overlay: prompt, plant panel, vocab cards, quiz, collection
    Joystick.js     on-screen analog stick for phones and tablets
```

### Designed to extend

The seams are already in place for the real game, but intentionally not built yet:

- **Multiple Pocket Planets** — a `Planet` is a self-contained group built from a `layout`.
  Instantiate more and place them in the sky.
- **Ownership / visitors** — the landing pad is where future visitors arrive; the planet is
  a discrete unit ready to carry an owner id and guests.
- **Placeable buildings** — `Props` builders are pure factories; a placement system can reuse
  `planet.placeOnSurface`.
- **More educational systems** — `GardenSystem` plus the vocab/recall beat in `data/`
  and `learn/`; more systems can slot in the same way. Word lists are data, not code.
- **Inventory / NPCs / world events** — slot in as new `systems/` + `entities/`, wired
  through `Game`.

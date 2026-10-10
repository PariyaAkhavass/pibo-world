# Pibo · Pocket Planet

A tiny, charming, social **Pocket Planet** prototype for [pibo.world](https://pibo.world) — the
first playable sample of an educational MMORPG made of small personal planets.

The goal of this build is one feeling, not a feature list:

> **"I own this tiny world, it feels alive, and I want to keep shaping it."**

You wake up on a handcrafted **cozy learning garden planet**. Walk around it, plant three
things in the garden, watch them grow, learn a little about each, and your world quietly
changes in return.

## Run it

The project uses native ES modules, so it needs to be served over HTTP (opening
`index.html` from the file system won't load the modules). No build step, no install.

```bash
# from the project root
python3 -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S localhost:8000`, a Live Server extension, …).

Three.js is loaded from a CDN via the import map in `index.html`, so you need an internet
connection the first time.

## Play

- **WASD** / **arrow keys** — walk around your planet (Pibo turns to face where it's going)
- **E** / **Enter** — interact (plant, then later inspect what you grew)
- **1 / 2 / 3** — choose a plant
- **Esc** — step back from a panel
- **Map** (top-right) — your planet, a “You are here” dot, and other planets that stay locked until a points system exists. Tap the lighthouse, then **Go to the lighthouse**, to use the same trip as the top-left button. Tap **Arcade**, then **Go to Arcade**, for the same trip as the button under Go to lighthouse. Close with **×**, a click outside, or **Esc**.
- **🪴** (under Map) — see the things you've grown
- The blue friend and little white Pino are hidden for now. Turn them back on with `SHOW_VILLAGE_FRIENDS` in `src/config.js`.
- **Phone / tablet** — a little joystick (bottom-left) steers Pibo; tap **E** (bottom-right) to interact. On-screen prompts and plant cards are tappable too.
- Houses, the workshop, the observatory, trees, and rocks are solid — Pibo slides around them.
- New landmarks fill out the walk: a little planetarium, mini café, tiny library,
  windmill, wishing well, picnic blanket, benches, lanterns, mailboxes, crystals,
  mushrooms, star-stone paths, and a **lighthouse** standing in the ocean.
- **Pot-ship** (village landing pad) — press **E** to board. **WASD** flies around the world, **Space** climbs into the toy sky, **Shift** / **F** descends, **E** lands. On a phone, ↑ / ↓ sit above the E button.
- **Lighthouse studio** — a gold beam rises over the ocean from the moment you wake up. An on-screen marker labeled **Lighthouse Studio** points at it. Tap **Go to lighthouse** (top left) to stand on the dock without the pot-ship, then press **E**. You can still fly there: board the pot-ship and follow the same beam.
- **Swimming** — the instant Pibo touches blue water it tips forward, lies face-down, and breaststrokes (both arms sweep out and back together, legs kick). Stepping onto grass or the lighthouse dock stands it upright and it walks again.
- **Need an idea?** — inside the lighthouse studio. Rolls a tiny game prompt that stays inside the demo lesson (food words + “I like / I don’t like”). Lock a slot, reroll the rest, then **Use this idea** to drop the hint into the sentence box.
- **Arcade room** — tap **Go to Arcade** (under Go to lighthouse), or use the map, then press **E** to step inside. The machine's screen shows your game as you choose a template or answer the idea chips. Drag pictures on the screen, set the key, the treasure, the order, and the English clues. **Play / Test** runs on that screen. **Exit** or **Esc** steps back outside. **Save** and **Export log (JSON)** work from the side panel.

Walk to the three planter beds in the garden, plant a seed in each, wait a few seconds for
them to grow, and inspect them to learn a tiny fact. Grow all three and watch what happens
to the rest of the planet.

Or skip the flight with `?dock` (stand on the lighthouse pier) or `?studio` (open the studio immediately).

Live build: [pibo.paria.ai](https://pibo.paria.ai). From spawn, follow the gold beam
or tap **Go to lighthouse**, then press **E**. Or open [pibo.paria.ai/?studio](https://pibo.paria.ai/?studio).
On that screen, tap **Need an idea?** to roll a food-lesson hint without leaving the studio.

## Idea generator

Students design a tiny game inside a teacher frame. The generator only fills
slots the lesson already lists — subject, stance (`likes` / `doesn't like`),
a food word, and an optional twist.

The demo lesson ships in `src/data/lessons/foodLikes.js` (food vocabulary +
“I like / I don’t like”), so the lighthouse studio works with no backend and
no API key. Try it:

1. Open [pibo.paria.ai/?studio](https://pibo.paria.ai/?studio) (or `http://localhost:8000/?studio`).
2. Tap **Need an idea?**
3. Lock any slot (the dragon, “doesn’t like”, a snack…), then **Reroll the rest**.
4. Tap **Use this idea**. The hint lands in the studio box. **Generate** plays it.

## Arcade room

Kids make a point-and-click treasure hunt inside the arcade. Press **E** at the outdoor cabinet and Pibo steps into the room. The camera sits on the machine's screen. A panel beside it is where the child chooses the template or answers chips, writes clues, and saves. The 2D game is drawn on the screen and updates as those choices change. **Play / Test** is played by tapping that screen. **Exit** or **Esc** returns outside.

The child keeps the meaningful decisions: the idea, where the key and the treasure hide, the order of steps, and the English clues. The arcade only supplies stickers, positions, and the play rules. Nothing in the spec is executable code.

A game is a JSON spec (`src/systems/gameSpec.js`). Every field records who wrote it: `child`, `ai`, `template`, or `teacher`. One runtime (`src/systems/treasureRuntime.js`) plays any treasure-hunt spec. The describe-your-idea path asks two or three questions with tap-to-pick chips and accepts a typed answer. Wording stays inside the same food lesson as the lighthouse (“I like / I don’t like”). `createArcadeAssistant({ stitch })` is the seam for a later model, matching `createIdeaGenerator({ stitch })`. The model would return a spec, not code, and mark art it invents as `author: "ai"`.

**Save** writes the spec to `localStorage` (`pibo.arcade.spec`). **Export log (JSON)** downloads every prompt, chip, typed answer, template choice, and edit with a timestamp and an author tag.

Accepting an idea also stores it on `game.ui.lastIdea` and emits a `pibo-idea`
event (`prompt`, `sentence`, and `slots`) for a later whiteboard. Wording comes
from `templateStitch` in `src/systems/ideaGen.js`. A later LLM can replace that
stitcher via `createIdeaGenerator({ lesson, stitch })` without changing the panel.

## Screen studio (AI hook)

The studio is playable without API keys. Prompt → generate → preview uses a built-in demo
clip (a short clay-toy animation of the sentence, with the text as a caption for English
practice). The outdoor lighthouse lantern shows the same broadcast.

To wire a real video / animation provider later (OpenAI, Replicate, a Vercel function, …)
point the client at an endpoint **without putting secrets in the repo**:

```js
// in the browser console, or a small snippet you inject at deploy time
window.PIBO_VIDEO_API = "https://your-api.example/generate";
localStorage.setItem("PIBO_VIDEO_API", "https://your-api.example/generate");
```

Or open the game with `?videoApi=https://your-api.example/generate`.

The client (`src/systems/videoGen.js`) `POST`s JSON:

```json
{ "prompt": "A yellow bird hops in a garden.", "source": "pibo-world-studio" }
```

and expects:

```json
{ "url": "https://…/clip.mp4", "kind": "video", "caption": "optional" }
```

`kind` may be `"video"` or `"image"`. If the request fails, the studio falls back to the
demo clip so students are never stuck. Keep provider API keys on the server that owns
that endpoint — never in this static ES-module game.

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
    Planet.js       the Pocket Planet sphere + grass/ocean biomes
    Environment.js  soft daytime lighting + shadows
    Props.js        handcrafted structures & nature (home, workshop, observatory, …)
    Ambient.js      clouds, butterflies — life while you stand still
    materials.js    shared "clay toy" materials & primitives
    layout.js       the handcrafted lat/lon layout of this planet
    biome.js        grass cap, shoreline, and open-ocean coloring
  entities/
    Pibo.js         the player creature (walks, idles, faces movement)
    Ufo.js          pot-shaped ship you can board and fly
    Galaxy.js       stars + hard clay planets for the family voyage
  systems/
    GardenSystem.js the plant → grow → inspect → reward loop
    TvStudio.js     lighthouse interior + prompt → generate → preview
    videoGen.js     pluggable clip client (demo animation, optional API)
    ideaGen.js      lesson-locked slot roller + template stitcher (LLM-swappable)
    gameSpec.js     treasure-hunt spec: every field has an author tag
    arcadeAssistant.js  template questions + stitcher (LLM-swappable)
    treasureRuntime.js  shared 2D player for any treasure-hunt spec
    ArcadeRoom.js   arcade interior; the machine screen shows the 2D game
    arcadeScreen.js paints that screen from the current spec
    arcadeLog.js    authorship log for thesis export
  data/
    plants.js       the three plants + their one-line facts
    studioPrompts.js English-practice sentence chips for the studio
    lessons/foodLikes.js  demo lesson: food vocab + I like / I don't like
  config.js         runtime knobs (video API url, no secrets)
  ui/
    UI.js           minimal overlay: prompt, plant panel, facts, collection
    IdeaPanel.js    "Need an idea?" overlay for the lighthouse studio
    ArcadeEditor.js one editor: template or describe, then edit, play, export
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
- **More educational systems** — `GardenSystem` and `TvStudio` are two systems among
  future ones; `data/` holds content separate from mechanics.
- **Inventory / NPCs / world events** — slot in as new `systems/` + `entities/`, wired
  through `Game`.

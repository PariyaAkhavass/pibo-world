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
- **🪴** (top-right) — see the things you've grown
- **Phone / tablet** — a little joystick (bottom-left) steers Pibo; tap **E** (bottom-right) to interact. On-screen prompts and plant cards are tappable too.
- Houses, the workshop, the observatory, trees, and rocks are solid — Pibo slides around them.
- New landmarks fill out the walk: a little planetarium, mini café, tiny library,
  windmill, wishing well, picnic blanket, benches, lanterns, mailboxes, crystals,
  mushrooms, star-stone paths, and a **TV tower** for the screen studio.
- **Pot-ship** (landing pad) — press **E** to board. **WASD** flies around the world, **Space** climbs into the toy sky, **Shift** / **F** descends, **E** lands anywhere. On a phone, ↑ / ↓ sit above the E button.
- **TV tower / screen studio** — from spawn, walk toward the garden and look for the tall broadcast tower with a glowing screen. Press **E** to go inside. Type an English sentence, tap **Generate**, watch the clip on the studio screen, then **Esc** (or **E** when you're not typing) to step back onto the planet.

Walk to the three planter beds in the garden, plant a seed in each, wait a few seconds for
them to grow, and inspect them to learn a tiny fact. Grow all three and watch what happens
to the rest of the planet.

Or skip the walk with `?studio` on the URL to open the studio immediately (handy for testing).

Live build: [pibo.paria.ai](https://pibo.paria.ai). After this lands, walk to the TV tower
there — or open [pibo.paria.ai/?studio](https://pibo.paria.ai/?studio).

## Screen studio (AI hook)

The studio is playable without API keys. Prompt → generate → preview uses a built-in demo
clip (a short clay-toy animation of the sentence, with the text as a caption for English
practice). The outdoor tower screen shows the same broadcast.

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
    GardenSystem.js the plant → grow → inspect → reward loop
    TvStudio.js     TV-tower landmark interior + prompt → generate → preview
    videoGen.js     pluggable clip client (demo animation, optional API)
  data/
    plants.js       the three plants + their one-line facts
    studioPrompts.js English-practice sentence chips for the studio
  config.js         runtime knobs (video API url, no secrets)
  ui/
    UI.js           minimal overlay: prompt, plant panel, facts, collection
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

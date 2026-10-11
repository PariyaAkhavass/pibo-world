# Replacing art on Pibo Island

The island is a fixed isometric view. Every building, tree, flower, and Pibo frame is an image. You can replace those images without changing gameplay.

The list of images lives in [`src/data/assets.js`](src/data/assets.js). Where each object stands lives in [`src/world/layout.js`](src/world/layout.js).

## Camera angle

Draw props from the same view the game uses, so a new picture drops in without looking tilted:

- **Yaw:** 32° (the camera sits slightly to the east of south)
- **Pitch:** 40° above the ground (a high three-quarter view)
- **Lens:** orthographic — no perspective shrink. Near and far objects are the same scale.

Buildings in the concept show a **front face plus a roof**, with a thin dark outline and almost no shading. Match that. The ground images (`island-top`, `grass-tile`) are painted **top-down**. The cliff image is a **horizontal rock strip**.

Characters and props are **camera-facing cards**. The bottom of the picture sits on the ground. Do not draw the ground inside a prop picture except for a small contact shadow.

## File format

PNG with a transparent background is the best hand-off. SVG works too. Soft brush edges are fine; avoid heavy blur, because the game clips pixels that are almost invisible.

Recommended pixel sizes (also listed as `pixelWidth` / `pixelHeight` on each entry):

| Kind | Size | Notes |
| --- | --- | --- |
| Pibo frame | 200 × 260 | One file per pose. Keep the pot on the same spot in every frame. |
| Tree | 420 × 460 | Round canopy, short trunk, shadow at the bottom. |
| Cottage, houses | 512 × 540 | Front and a little of the side, roof included. |
| Shed, arcade | about 420 × 440 | Same angle as the cottage. |
| Lighthouse | 360 × 640 | Tall. The lantern is near the top. |
| Lamp | 220 × 420 | Thin. Leave empty space on the sides. |
| Flowers, rocks, crate | about 256 × 220 | |
| Island surface | 1500 × 1100 | Top-down. Covers the bounds below. |
| Cliff | 512 × 256 | Repeats sideways. Top edge is the grassy lip. |
| Ocean | 1024 × 1024 | Soft blue. Fade the outer edge so it melts into the sky. |
| Light beam | 640 × 280 | Left edge bright (the lantern), right edge fades out. The game keeps this card facing the camera. |

Name files in kebab-case and match the `id` in the manifest: `teal-house.png`, `pibo-swim-2.png`.

## How to swap one object

1. Export the picture with a transparent background.
2. Put it in `assets/` (for example `assets/paria/cottage.png`). The placeholders live in `assets/placeholders/`.
3. Open `src/data/assets.js` and change that object's `src` to the new path.
4. Refresh the game. No build step.

If the picture feels too big, too small, or floating, change these numbers on the same entry:

- `width`, `height` — size in world units (the island is about 17 units wide).
- `anchor.x` — `0.5` is the center. Move it if the art is off to one side.
- `anchor.y` — `0` is the bottom edge of the file. Use about `0.05` if you included a shadow under the feet.
- `footprint.radius` — how wide a circle Pibo cannot walk through. Leave it off (`null`) for flowers, the picnic blanket, and anything you should be able to step on.

To move an object, edit its `x` and `z` in `PLACEMENTS` inside `src/world/layout.js`. `x` is east, `z` is south. You do not need a new image for that.

## Pibo's animation

`pibo.states` lists the frames:

- `idle` — standing still
- `walk` — used only on land, never in the water
- `swim` — face-down breaststroke. Frame 1 reaches forward, frame 2 sweeps the arms out, frame 3 pulls back and kicks, frame 4 recovers.

`fps` is how fast those frames play. Keep every frame the same pixel size so the pot does not jump.

## Ground images

`island-top` is stretched across this world rectangle (see `GROUND_BOUNDS` in `layout.js`):

- west `x = -12` to east `x = 18`
- north `z = -12` to south `z = 10`

North is the **top** of the image. Paint the grass, the sandy paths, and the flowers that lie flat on the ground here. Buildings are not part of this image; they are their own files.

`grass-tile` repeats on the lighthouse islet and the arcade islet.

`cliff` wraps around every shoreline. The top row of pixels should be the lip of the grass.

Water is not walkable. Land is the home outline plus the two circles in `LAND` inside `layout.js`. Stepping off that shape makes Pibo swim.

## Adding a new object

1. Add an entry to `ASSETS` in `src/data/assets.js`.
2. Add a placement `{ id, asset, x, z }` to `PLACEMENTS` in `src/world/layout.js`.
3. Refresh.

Set `hidden: true` on a placement to keep it invisible until the game calls `sprites.show(id)`. Set `sky: true` for clouds and other things with no collision. Give `y` only when it should float above the ground.

## What not to replace

The lighthouse studio and the arcade room are separate scenes (the screen, the idea generator, the authorship log). They are not part of this manifest. The buttons ("Go to lighthouse", "Go to Arcade", "Map") are HTML, styled in `styles.css`.

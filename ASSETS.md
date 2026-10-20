# Replacing art on Pibo Island

The island you see is the concept painting, shown flat to the camera so the coastline is not squashed. Tall objects (houses, trees, lamps, the shed, the lighthouse, the arcade) are separate images cut from that same painting. Pibo walks in front of or behind them.

The list of images lives in [`src/data/assets.js`](src/data/assets.js). Where each cutout stands lives in [`src/data/painted.js`](src/data/painted.js) (re-exported by [`src/world/layout.js`](src/world/layout.js)).

## What to draw

Match the concept painting: a front face plus a roof, thin dark outlines, soft color, almost no shading. The camera does not tilt your picture. It shows the image as drawn.

- **Plate** (`assets/painted/plate.png`) — the whole scene: sky, sea, cliffs, foam, grass, path, flowers, and the still gold beam. 1280 × 816, with a little extra sky on top and sea on the bottom.
- **Cutouts** (`assets/painted/sprites/`) — one PNG per tall object, transparent around the silhouette. The bottom center of the file is the feet.
- **Walk mask** (`assets/painted/walk-mask.png`) — red where Pibo may walk, blue for the sea, green for cliff and sky. 640 × 360.
- **Pibo** (`assets/pibo/pibo.png`) — the painted pot, cut out of the concept at the same size it has in the picture, leaves included. The bottom edge is the base. Walk bob, squash, and tilt are drawn in code. `pibo-swim-1.png` through `pibo-swim-4.png` are that same pot lying flat, leaves and all, stroking. Replace `pibo.png` with your own pot and keep the pixel size, or change `width` and `height` in `src/data/assets.js`.

`x` grows to the right of the picture. `z` grows down the picture. The painting is 32 units wide and 18 units tall.

## How to swap one object

1. Export a PNG with a transparent background, the same pixel size as the file you are replacing.
2. Overwrite that file (for example `assets/painted/sprites/cottage.png`), or put a new file in `assets/paria/` and point `src` at it in `src/data/assets.js`.
3. Refresh the game. There is no build step.

If it sits too high or too low, change `anchor` (y 0 is the bottom edge). If it is too big, change `width` and `height`. `footprint.radius` is the round solid Pibo walks around.

To replace the whole island, overwrite `assets/painted/plate.png` and paint a new `walk-mask.png` in the same red / blue / green. Keep the lighthouse beam in the plate if you want it to stay still.

The buttons (Go to lighthouse, Go to Arcade, Go to Library, Map) are HTML in `index.html` and `styles.css`, not part of the painting.

## Library islet

The library is an islet in the sea at the top-left. It is not painted into the plate.

- **Islet and building** are one picture, `assets/painted/sprites/library.png` (236 × 217). It is the `library` slot (`ASSETS.library`). The picture is a transparent cutout: rocky cliff, grass, foam, and an isometric library with two walls, a roof, a small tree, and a lamp. To use your own art, overwrite that PNG. If the new picture is a different size, change `width` and `height` on the slot. The wall collider lives in `src/world/layout.js` under `library`. The walk mask has a red pad at the steps and blue sea around it, so Pibo swims across.

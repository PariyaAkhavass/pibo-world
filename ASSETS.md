# Replacing art on Pibo Island

The island is one bright picture, shown flat to the camera. Pibo is a separate layer on top of it, with his own shadow. Nothing in the picture has words or signs. The Go to lighthouse, Go to Arcade, Go to Library, and Map buttons are HTML in `index.html` and `styles.css`.

The list of images lives in [`src/data/assets.js`](src/data/assets.js) and [`src/data/layers.js`](src/data/layers.js). Where Pibo starts, and where each door is, lives in `layers.js` (re-exported from [`src/data/painted.js`](src/data/painted.js)). The walls he slides along are the `HOUSES` and `CIRCLES` in that same file.

## What to draw

Bold, saturated, flat color, thick outlines, and very little detail. No letters anywhere in the picture. No human characters. Animal mascots are their own files.

Replace one PNG and refresh. Positions stay in `src/data/layers.js`. Rebuild from the locked concepts with `python3 tools/build-layers.py`.

### Ground

- **Plate** (`assets/painted/plate.png`) — terrain only: sky, sea, islet grass, paths, cliffs, and small flowers. Buildings, hero trees, the picnic blanket, and mascots are not in this file. 2560 × 1632. The middle is the 32 × 18 play area.
- **Walk mask** (`assets/painted/walk-mask.png`) — red where Pibo may walk, blue for open sea (he flies there), green for the top sky edge. 640 × 360.

### Buildings — one file each

| Layer | File |
| --- | --- |
| Book-stack library | `assets/painted/layers/library.png` |
| Art cottage (red roof) | `assets/painted/layers/cottage.png` |
| Market stall | `assets/painted/layers/market.png` |
| Mushroom house | `assets/painted/layers/mushroom-house.png` |
| Purple arcade | `assets/painted/layers/arcade.png` |
| Lighthouse | `assets/painted/layers/lighthouse.png` |

### Nature and picnic

| Layer | File |
| --- | --- |
| Green canopy | `assets/painted/layers/tree-green.png` |
| Pink canopy | `assets/painted/layers/tree-pink.png` |
| Picnic blanket | `assets/painted/layers/picnic.png` |

### Animal mascots (no people)

| Layer | File |
| --- | --- |
| Fox | `assets/painted/layers/fox.png` |
| Pink friend | `assets/painted/layers/pink-friend.png` |
| White cat | `assets/painted/layers/white-cat.png` |
| Blue bird | `assets/painted/layers/bird.png` |
| Chick in a hat | `assets/painted/layers/chick.png` |
| Snail | `assets/painted/layers/snail.png` |
| Winged cat | `assets/painted/layers/wing-cat.png` |
| Library raccoon | `assets/painted/layers/raccoon.png` |

The library hangout background, with the raccoon removed, is `assets/painted/layers/library-hangout.png`.

- **Art room** (`assets/painted/art-room.jpg`) — the cottage studio behind the cottage door, in the same cel-shaded palette as the island. Pibo is drawn on top of the rug, not painted in. The preview keeps the whole silhouette, including outline, feet, hair, and hats, inside the frame.
- **Pibo** (`assets/pibo/pibo.png`) — Paria's left-facing pot, 645 × 838, feet at the bottom edge. No leaves in this file. The body, feet, outline, eyes, smile, and blush are opaque, with only a thin soft edge, so the island does not show through. Bead eyes, the smile, the orange blush, and the black outline stay when the body and feet recolor. Hair and hats are separate sprites; a hat replaces whichever hair is on. `pibo-face-right.png` and `pibo-face-front.png` are the other two drawings. Walk and flight swap those three pictures: screen-left uses the left drawing, screen-right uses the right drawing, and up or down the island uses the front drawing. Stopping keeps the last facing. The game draws the soft shadow.
- **Hair** (`assets/pibo/hair/`) — succulent, fern, sunflower, clover, and palm. Each file is a transparent PNG of any size, with no pot, rim, or soil in it. The original big tuft is not one of these files. It is the green layer already in `pibo.png`. `tuft-icon.png` is only the picker picture for that tuft.
- **Hats** (`assets/pibo/hats/`) — beanie, strawhat, wizard, crown, cap, and pirate. Same rules: transparent PNG, any size, no pot pixels. A hat hides whichever hair is selected.
- Placement for each id is `anchorPx`, `offset`, and `scale` on that entry in `HAIRS` or `HATS` in `src/entities/piboLook.js`. `anchorPx` is the pixel in the file (x from the left, y from the top) that sits on the middle of the pot rim's top. `scale` 1 means one image pixel per sprite pixel. `offset` is sprite pixels, x to the right and y downward. To use a new painting, overwrite the PNG, update `anchorPx` if the crop changed, and refresh.

`x` grows to the right of the picture. `z` grows down the picture.

## How to swap the island or Pibo

1. Export a PNG. The island can be opaque. Pibo needs a transparent background.
2. Overwrite `assets/painted/plate.png` or `assets/pibo/pibo.png`.
3. Refresh the game. There is no build step.

The old cutouts in `assets/painted/sprites/` are not drawn. Each current building is the matching file under `assets/painted/layers/`. Footprints are `HOUSES` and `CIRCLES` in `src/data/layers.js`. If a new painting moves a building, move that polygon and the sprite `x` / `z` so Pibo still slides along the wall.

Doors are points in `src/data/layers.js`:

- `libraryDoor` opens the story room.
- `cottageDoor` opens the art room.
- `lighthousePad` opens the studio. `lighthouse` is the tower he looks at.
- `arcadeDoor` opens the arcade.

Stand on the grass just in front of the door, on the red part of the walk mask. Blue is open sea, and Pibo flies there instead of swimming.

# Replacing art on Pibo Island

The island is one bright picture, shown flat to the camera. Pibo is a separate layer on top of it, with his own shadow. Nothing in the picture has words or signs. The Go to lighthouse, Go to Arcade, Go to Library, and Map buttons are HTML in `index.html` and `styles.css`.

The list of images lives in [`src/data/assets.js`](src/data/assets.js). Where Pibo starts, and where each door is, lives in [`src/data/painted.js`](src/data/painted.js). The walls he slides along live in [`src/world/layout.js`](src/world/layout.js).

## What to draw

Bold, saturated, flat color, thick outlines, and very little detail. No letters anywhere in the picture.

- **Plate** (`assets/painted/plate.png`) — the whole scene except the red cottage, which is its own layer. Sky, sea, the main island (mushroom cottage, market stall, picnic, trees), the book-stack library islet, the lighthouse islet, and the purple arcade islet are painted into this one file. Pibo is not in it. To use your own island, overwrite this PNG. It is drawn at 2560 × 1632 so it stays sharp on a phone screen. The middle of the picture is the 32 × 18 play area. A strip of sky sits above it and a strip of sea sits below it.
- **Cottage** (`assets/painted/cottage.png`) — the red-roofed cottage, cut from the plate so Pibo can walk behind it. It is placed in `PAINTED_SPRITES` in `src/data/painted.js`.
- **Art room** (`assets/painted/art-room.jpg`) — the room behind the cottage door. Pibo is drawn on top of it, not painted in.
- **Walk mask** (`assets/painted/walk-mask.png`) — red where Pibo may walk, blue for the sea, green for the sky. 640 × 360. Grass, path, and cliff tops are red. The sea is blue, so he swims there. If you change the coastline, paint a new mask in those three colors.
- **Pibo** (`assets/pibo/pibo.png`) — the yellow pot, transparent around the silhouette, feet at the bottom edge. There should be no white or cream fringe. The game draws a soft black shadow under him and bobs him when he walks. `pibo-swim-1.png` through `pibo-swim-4.png` are the same pot tipped over for the water. Replace `pibo.png` with your own pot. If the new picture is a different size, change `pixelWidth`, `pixelHeight`, `width`, and `height` on `pibo` in `src/data/assets.js`.
- **Hair** (`assets/pibo/hair/`) — succulent, fern, sunflower, clover, and palm. Each file is a transparent PNG of any size, with no pot, rim, or soil in it. The original big tuft is not one of these files. It is the green layer already in `pibo.png`. `tuft-icon.png` is only the picker picture for that tuft.
- **Hats** (`assets/pibo/hats/`) — beanie, strawhat, wizard, crown, cap, and pirate. Same rules: transparent PNG, any size, no pot pixels. A hat hides whichever hair is selected.
- Placement for each id is `anchorPx`, `offset`, and `scale` on that entry in `HAIRS` or `HATS` in `src/entities/piboLook.js`. `anchorPx` is the pixel in the file (x from the left, y from the top) that sits on the middle of the pot rim's top. `scale` 1 means one image pixel per sprite pixel. `offset` is sprite pixels, x to the right and y downward. To use a new painting, overwrite the PNG, update `anchorPx` if the crop changed, and refresh.

`x` grows to the right of the picture. `z` grows down the picture.

## How to swap the island or Pibo

1. Export a PNG. The island can be opaque. Pibo needs a transparent background.
2. Overwrite `assets/painted/plate.png` or `assets/pibo/pibo.png`.
3. Refresh the game. There is no build step.

The old house, tree, lighthouse, arcade, and library cutouts in `assets/painted/sprites/` are not drawn. The buildings are in the plate, so a second copy would sit on top of them. Footprints for the cottage, the mushroom house, the stall, the book stack, the lighthouse, the arcade, and the big trees are polygons in `src/world/layout.js`. If your new picture moves a building, move that polygon so Pibo still slides along the wall.

Doors are points in `src/data/painted.js`:

- `libraryDoor` opens the story room.
- `cottageDoor` opens the art room.
- `lighthousePad` opens the studio. `lighthouse` is the tower he looks at.
- `arcadeDoor` opens the arcade.

Stand on the ground just in front of the door, on the red part of the walk mask, not in the sea.

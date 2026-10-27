/**
 * The bright island. The ground plate is terrain only: islets, sea, paths,
 * and grass. Buildings, trees, the picnic, and animal mascots are separate
 * cards in src/data/layers.js so each file can be replaced on its own.
 * x grows right, z grows down. The picture is 32 units wide and 18 tall,
 * with a little extra sky and sea above and below.
 */
import {
  CIRCLES,
  HOUSES,
  LAYOUT,
  LIBRARY_MASCOT,
  PAINTED_SPRITES,
} from "./layers.js";

export { CIRCLES, HOUSES, LAYOUT, LIBRARY_MASCOT, PAINTED_SPRITES };

export const PLATE_SRC = "assets/painted/plate.png";
export const PLATE_PIXELS = {
  pixelWidth: 2560,
  pixelHeight: 1632,
  worldW: 32,
  worldH: 20.4,
  pad: 96,
};
export const WALK_MASK_SRC = "assets/painted/walk-mask.png";

export const PLACEMENTS = PAINTED_SPRITES.map((sprite) => ({
  id: sprite.id,
  asset: sprite.id,
  x: sprite.x,
  z: sprite.z,
  depthBias: sprite.depthBias || 0,
}));

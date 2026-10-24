/**
 * The bright island. The plate is the picture: sky, sea, the main island,
 * and the three islets. The red cottage is the one building lifted onto its
 * own card (see PAINTED_SPRITES) so Pibo can walk behind it. Everything else
 * stays painted in the plate.
 * x grows right, z grows down. The picture is 32 units wide and 18 tall,
 * with a little extra sky and sea above and below.
 */
export const PLATE_SRC = "assets/painted/plate.png";
export const PLATE_PIXELS = {
  pixelWidth: 2560,
  pixelHeight: 1632,
  worldW: 32,
  worldH: 20.4,
  pad: 48,
};
export const WALK_MASK_SRC = "assets/painted/walk-mask.png";

// The red cottage, cut from the plate and drawn at the depth of its front
// wall. The card's bottom center is the doorstep.
export const PAINTED_SPRITES = [
  {
    id: "cottage",
    src: "assets/painted/cottage.png",
    pixelWidth: 324,
    pixelHeight: 420,
    width: 4.05,
    height: 5.25,
    anchor: { x: 0.5, y: 0 },
    x: -6.6875,
    z: 0.65,
    depthBias: 0,
  },
];

export const LAYOUT = {
  start: { x: -0.8, z: 2.3 },
  home: { x: -8.0, z: 0.2 },
  tealHouse: { x: 0.25, z: -2.4 },
  lighthouse: { x: 8.5, z: -5.5 },
  lighthousePad: { x: 8.5, z: -2.8 },
  arcade: { x: 13.5, z: 1.2 },
  arcadeDoor: { x: 13.1, z: 3.55 },
  library: { x: -12.25, z: -5.9 },
  libraryDoor: { x: -12.25, z: -3.3 },
  // Just south of the red door, on the grass in front of the cottage.
  cottageDoor: { x: -6.74, z: 1.22 },
  companion: { x: -14, z: 1 },
  pino: { x: -13.5, z: 1.75 },
};

export const PLACEMENTS = PAINTED_SPRITES.map((sprite) => ({
  id: sprite.id,
  asset: sprite.id,
  x: sprite.x,
  z: sprite.z,
  depthBias: sprite.depthBias || 0,
}));

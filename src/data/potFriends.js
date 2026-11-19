/**
 * Paria's pot friends. Three drawings, several walkers.
 * They are separate sprites on the outdoor grass, never painted into the plate.
 * x grows right, z grows down the picture. Feet sit on the bottom center.
 *
 * The side drawing faces screen-left. restFlip -1 mirrors it.
 * Front and closed eyes are the idle looks. Left/right travel uses the side drawing.
 */
export const POT_FRIEND_SIZE = {
  // A little roomier than Pibo's pot body, same family. Not a dot, not a giant.
  width: 1.74,
  height: 1.86,
  pixelWidth: 582,
  pixelHeight: 648,
};

export const POT_FRIEND_POSES = {
  front: "assets/pot-friends/front.png",
  side: "assets/pot-friends/side.png",
  closed: "assets/pot-friends/closed.png",
};

export const POT_FRIENDS = [
  {
    id: "pot-west",
    x: -8.7,
    z: 3.15,
    roam: 1.1,
    speed: 1.02,
    rest: "front",
    restFlip: 1,
    idle: 2.4,
  },
  {
    id: "pot-shelf",
    x: -8.25,
    z: 0.05,
    roam: 0.62,
    speed: 0.88,
    rest: "side",
    restFlip: 1,
    idle: 3.6,
  },
  {
    id: "pot-lower",
    x: -2.2,
    z: 4.6,
    roam: 0.72,
    speed: 0.98,
    rest: "closed",
    restFlip: 1,
    idle: 2.8,
  },
  {
    id: "pot-center",
    x: 1.15,
    z: 3.35,
    roam: 0.85,
    speed: 1.1,
    rest: "front",
    restFlip: 1,
    idle: 0.08,
  },
  {
    id: "pot-cottage",
    x: 4.8,
    z: 3.65,
    roam: 0.85,
    speed: 0.94,
    rest: "side",
    restFlip: -1,
    idle: 3.2,
  },
  {
    id: "pot-east",
    x: 7.7,
    z: 5.05,
    roam: 0.7,
    speed: 1.04,
    rest: "closed",
    restFlip: 1,
    idle: 0.35,
  },
];

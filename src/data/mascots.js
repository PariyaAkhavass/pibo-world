/**
 * Outdoor friends drawn in Pibo's cel style. They are separate sprites,
 * never painted into the island plate. Feet sit on the bottom center.
 * x grows right, z grows down the picture.
 *
 * `roam` is how far a stroll may wander from home. The bird stays on the
 * lighthouse grass and only hops, so its roam is short.
 */
export const MASCOTS = [
  {
    id: "fox",
    src: "assets/mascots/fox.png",
    pixelWidth: 1110,
    pixelHeight: 1124,
    width: 1.84,
    height: 1.86,
    radius: 0.46,
    speed: 1.28,
    x: -8.0,
    z: 2.55,
    roam: 1.05,
    kind: "walk",
  },
  {
    id: "chick",
    src: "assets/mascots/chick.png",
    pixelWidth: 876,
    pixelHeight: 968,
    width: 1.36,
    height: 1.5,
    radius: 0.36,
    speed: 1.42,
    x: -1.35,
    z: 4.55,
    roam: 0.9,
    kind: "walk",
  },
  {
    id: "cat",
    src: "assets/mascots/cat.png",
    pixelWidth: 1008,
    pixelHeight: 962,
    width: 1.7,
    height: 1.62,
    radius: 0.44,
    speed: 1.16,
    x: 3.5,
    z: 3.5,
    roam: 1.05,
    kind: "walk",
  },
  {
    id: "snail",
    src: "assets/mascots/snail.png",
    pixelWidth: 936,
    pixelHeight: 934,
    width: 1.4,
    height: 1.4,
    radius: 0.5,
    speed: 0.82,
    x: 6.85,
    z: 4.45,
    roam: 0.9,
    kind: "walk",
  },
  {
    id: "bird",
    src: "assets/mascots/bird.png",
    pixelWidth: 932,
    pixelHeight: 782,
    width: 1.16,
    height: 0.98,
    radius: 0.28,
    speed: 0.95,
    x: 13.95,
    z: -3.22,
    roam: 0.34,
    kind: "hop",
    // Grass cap in front of the lighthouse. The cliff below is still "walk"
    // on the mask, and the door pad is just to the left.
    bounds: { minX: 13.55, maxX: 14.55, minZ: -3.55, maxZ: -2.95 },
  },
];

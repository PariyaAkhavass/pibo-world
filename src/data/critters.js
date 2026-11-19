/**
 * Paria's eight animal mascots. Little critters, smaller than Pibo and the
 * pot friends. Separate sprites on the outdoor grass, never painted into
 * the plate. Feet sit on the bottom center.
 *
 * World size uses the same pixels-per-unit as the pot friends, and these
 * drawings are about half as tall, so they read as small friends.
 */
const UNIT = 1.86 / 648;

function critter(id, file, pixelWidth, pixelHeight, x, z, roam, speed, idle) {
  return {
    id,
    src: `assets/critters/${file}.png`,
    pixelWidth,
    pixelHeight,
    width: Math.round(pixelWidth * UNIT * 1000) / 1000,
    height: Math.round(pixelHeight * UNIT * 1000) / 1000,
    x,
    z,
    roam,
    speed,
    idle,
  };
}

export const CRITTERS = [
  critter("cat", "cat", 327, 338, -6.4, 1.65, 0.48, 0.95, 0.2),
  critter("dog", "dog", 374, 309, -6.9, 3.7, 0.42, 0.82, 0.9),
  critter("bunny", "bunny", 299, 360, -0.4, 4.75, 0.4, 1.05, 0.15),
  critter("panda", "panda", 321, 330, -6.55, -0.4, 0.38, 0.78, 1.3),
  critter("frog", "frog", 332, 348, 3.45, 5.15, 0.4, 0.9, 0.55),
  critter("penguin", "penguin", 373, 338, 6.3, 2.45, 0.36, 0.86, 0.4),
  critter("unicorn", "unicorn", 350, 371, -9.35, 1.25, 0.4, 0.92, 1.1),
  critter("fox", "fox", 384, 356, -7.7, 5.05, 0.42, 1.02, 0.25),
];

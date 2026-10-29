/**
 * Wander rules without the browser: stay on the home patch, slide off houses,
 * butterflies stay near their sky, and Pibo is never the one who gets pushed.
 */
import { createActor, spotsByHome, stepActor } from "../src/world/mascotMotion.js";

let failed = 0;
function check(name, ok) {
  if (!ok) {
    failed += 1;
    console.error("FAIL", name);
  } else {
    console.log("ok", name);
  }
}

const cells = [];
for (let z = 0; z <= 4; z += 0.5) {
  for (let x = 0; x <= 6; x += 0.5) cells.push({ x, z });
}
for (let z = 8; z <= 9; z += 0.5) {
  for (let x = -4; x <= -2; x += 0.5) cells.push({ x, z });
}
const homes = [
  { id: "fox", x: 1, z: 1 },
  { id: "wing-cat", x: -3, z: 8.5 },
];
const groups = spotsByHome(cells, homes);
check("main islet is separate from the small one", groups.get("fox").every((c) => c.z < 6));
check("small islet stays small", groups.get("wing-cat").every((c) => c.x < 0));

function worldFor(actor, actors, pibo) {
  const spots = groups.get(actor.id) || [];
  return {
    rng: () => 0.2,
    free(x, z) {
      if (x > 3.2 && x < 4.2 && z > 1 && z < 2.2) return false;
      return spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 0.72);
    },
    spotsFor: () => spots,
    flyFree(x, z) {
      const d = Math.hypot(x - actor.homeX, z - actor.homeZ);
      return d <= (actor.gait.radius || 2) + 0.05 && z > -8;
    },
    others: actors.filter((item) => item.id !== actor.id).map((item) => ({
      id: item.id, x: item.x, z: item.z, fly: !!item.gait.fly,
    })),
    pibo,
  };
}

const fox = createActor("fox", 1, 1, () => 0.4);
const start = { x: fox.x, z: fox.z };
let moved = false;
let leftHome = false;
for (let i = 0; i < 400; i++) {
  stepActor(fox, 0.05, worldFor(fox, [fox], null));
  if (Math.hypot(fox.x - start.x, fox.z - start.z) > 0.8) moved = true;
  if (fox.z > 6 || fox.x < 0) leftHome = true;
}
check("fox leaves its start spot", moved);
check("fox stays on the home islet", !leftHome);
check("fox never walks through the house box", !(fox.x > 3.25 && fox.x < 4.15 && fox.z > 1.05 && fox.z < 2.15));

const snail = createActor("snail", 1, 1, () => 0.5);
const pibo = { x: 1.2, z: 1 };
const before = snail.x;
stepActor(snail, 0.2, worldFor(snail, [snail], pibo));
check("snail steps aside from Pibo", Math.hypot(snail.x - pibo.x, snail.z - pibo.z) >= Math.hypot(before - pibo.x, snail.z - pibo.z) - 0.02);
check("Pibo's position is not edited", pibo.x === 1.2 && pibo.z === 1);

const butterfly = createActor("butterfly-blue", -8, -5, () => 0.3);
let flew = false;
let escaped = false;
for (let i = 0; i < 300; i++) {
  stepActor(butterfly, 0.05, worldFor(butterfly, [butterfly], null));
  const d = Math.hypot(butterfly.x + 8, butterfly.z + 5);
  if (d > 0.4) flew = true;
  if (d > butterfly.gait.radius + 0.2) escaped = true;
}
check("butterfly flies off its perch", flew);
check("butterfly stays near its sky", !escaped);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("mascot wander checks passed");

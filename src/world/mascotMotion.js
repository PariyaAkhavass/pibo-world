/**
 * Idle, stroll, and flutter for the island creatures.
 * No rendering here, so the step can be checked on its own.
 * Ground animals stay on one islet. Butterflies loop near the sky where they were painted.
 */

const DEFAULT_GAIT = {
  speed: 1,
  hop: 0.07,
  squash: 0.08,
  idle: [1.3, 3],
  reach: [1.2, 3.6],
  step: 7,
  facing: 1,
};

export const GAITS = {
  fox: { speed: 1.15, hop: 0.07, squash: 0.08, idle: [1.5, 3.4], reach: [1.6, 4.6], step: 7, facing: 1 },
  "pink-friend": { speed: 1.02, hop: 0.09, squash: 0.1, idle: [1.2, 2.8], reach: [1.1, 3.4], step: 8, facing: 1 },
  "white-cat": { speed: 1.18, hop: 0.06, squash: 0.07, idle: [1.6, 3.6], reach: [1.4, 4.2], step: 7, facing: 1 },
  bird: { speed: 1.42, hop: 0.18, squash: 0.11, idle: [0.7, 2.1], reach: [1.1, 3.6], step: 9, facing: 1 },
  chick: { speed: 1.02, hop: 0.16, squash: 0.13, idle: [0.8, 2.3], reach: [1.0, 3.2], step: 8, facing: 1 },
  snail: { speed: 0.36, hop: 0.012, squash: 0.03, idle: [1.8, 4.4], reach: [0.6, 2.2], step: 3, facing: -1 },
  "wing-cat": { speed: 1.12, hop: 0.1, squash: 0.08, idle: [1.2, 3.1], reach: [1.2, 3.6], step: 7.5, facing: 1 },
  "mushroom-buddy": { speed: 0.82, hop: 0.13, squash: 0.16, idle: [1.0, 2.6], reach: [0.8, 2.6], step: 6.5, facing: 1 },
  "butterfly-purple": { fly: true, speed: 0.9, radius: 2.3, hop: 0.28, idle: [0.35, 1.3], step: 14, facing: 1 },
  "butterfly-blue": { fly: true, speed: 1.0, radius: 2.6, hop: 0.32, idle: [0.3, 1.2], step: 15, facing: 1 },
  "butterfly-lighthouse": { fly: true, speed: 0.85, radius: 2.15, hop: 0.26, idle: [0.4, 1.4], step: 13, facing: 1 },
};

export function gaitFor(id) {
  return GAITS[id] || DEFAULT_GAIT;
}

export function createActor(id, x, z, rng = Math.random) {
  const gait = gaitFor(id);
  return {
    id,
    x,
    z,
    homeX: x,
    homeZ: z,
    gait,
    mode: "idle",
    timer: between(gait.idle[0], gait.idle[1], rng),
    tx: x,
    tz: z,
    flip: gait.facing,
    phase: rng() * Math.PI * 2,
    fails: 0,
  };
}

/**
 * @param {ReturnType<typeof createActor>} actor
 * @param {number} dt
 * @param {{
 *   rng: () => number,
 *   free: (x: number, z: number) => boolean,
 *   spotsFor: (x: number, z: number) => {x: number, z: number}[],
 *   flyFree: (x: number, z: number) => boolean,
 *   others: {id: string, x: number, z: number, fly?: boolean}[],
 *   pibo: {x: number, z: number} | null,
 * }} world
 */
export function stepActor(actor, dt, world) {
  const rng = world.rng || Math.random;
  actor.phase += dt * (actor.gait.step || 6);
  if (actor.gait.fly) stepFly(actor, dt, world, rng);
  else stepWalk(actor, dt, world, rng);
  return poseOf(actor);
}

function stepWalk(actor, dt, world, rng) {
  const nudged = shoveAside(actor.x, actor.z, actor, world);
  if (Math.hypot(nudged.x - actor.x, nudged.z - actor.z) > 0.01 && world.free(nudged.x, nudged.z)) {
    actor.x = nudged.x;
    actor.z = nudged.z;
  }
  if (actor.mode !== "walk") {
    actor.timer -= dt;
    if (actor.timer > 0) return;
    const spot = pickSpot(actor, world, rng);
    if (!spot) {
      actor.timer = between(0.6, 1.4, rng);
      return;
    }
    actor.tx = spot.x;
    actor.tz = spot.z;
    actor.mode = "walk";
    actor.fails = 0;
  }

  const dx = actor.tx - actor.x;
  const dz = actor.tz - actor.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    rest(actor, rng);
    return;
  }
  const step = Math.min(dist, actor.gait.speed * dt);
  let nx = actor.x + (dx / dist) * step;
  let nz = actor.z + (dz / dist) * step;
  const shoved = shoveAside(nx, nz, actor, world);
  if (world.free(shoved.x, shoved.z)) {
    nx = shoved.x;
    nz = shoved.z;
  }
  if (!world.free(nx, nz)) {
    actor.fails += 1;
    if (actor.fails > 8) rest(actor, rng, 0.35);
    return;
  }
  if (Math.abs(nx - actor.x) > 0.002) {
    const goingRight = nx > actor.x;
    actor.flip = goingRight ? actor.gait.facing : -actor.gait.facing;
  }
  actor.x = nx;
  actor.z = nz;
}

function stepFly(actor, dt, world, rng) {
  if (actor.mode !== "fly") {
    actor.timer -= dt;
    if (actor.timer > 0) return;
    const spot = pickSky(actor, world, rng);
    actor.tx = spot.x;
    actor.tz = spot.z;
    actor.mode = "fly";
    actor.fails = 0;
  }
  const dx = actor.tx - actor.x;
  const dz = actor.tz - actor.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.08) {
    actor.mode = "idle";
    actor.timer = between(actor.gait.idle[0], actor.gait.idle[1], rng);
    return;
  }
  const step = Math.min(dist, actor.gait.speed * dt);
  const nx = actor.x + (dx / dist) * step;
  const nz = actor.z + (dz / dist) * step;
  if (!world.flyFree(nx, nz)) {
    actor.fails += 1;
    if (actor.fails > 6) {
      actor.mode = "idle";
      actor.timer = 0.25;
    }
    return;
  }
  if (Math.abs(nx - actor.x) > 0.002) {
    actor.flip = nx > actor.x ? actor.gait.facing : -actor.gait.facing;
  }
  actor.x = nx;
  actor.z = nz;
}

function rest(actor, rng, soon = 0) {
  actor.mode = "idle";
  actor.timer = soon || between(actor.gait.idle[0], actor.gait.idle[1], rng);
  actor.fails = 0;
}

function pickSpot(actor, world, rng) {
  const spots = world.spotsFor(actor.homeX, actor.homeZ) || [];
  const [minR, maxR] = actor.gait.reach;
  const near = spots.filter((spot) => {
    const d = Math.hypot(spot.x - actor.x, spot.z - actor.z);
    return d >= minR * 0.45 && d <= maxR;
  });
  const pool = near.length ? near : spots;
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function pickSky(actor, world, rng) {
  const radius = actor.gait.radius || 2;
  for (let i = 0; i < 10; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = radius * (0.35 + rng() * 0.65);
    const x = actor.homeX + Math.cos(ang) * dist;
    const z = actor.homeZ + Math.sin(ang) * dist * 0.72;
    if (world.flyFree(x, z)) return { x, z };
  }
  return { x: actor.homeX, z: actor.homeZ };
}

function shoveAside(x, z, actor, world) {
  let ox = 0;
  let oz = 0;
  for (const other of world.others || []) {
    if (other.id === actor.id || other.fly) continue;
    const dx = x - other.x;
    const dz = z - other.z;
    const d = Math.hypot(dx, dz);
    if (d >= 0.7 || d < 0.0001) continue;
    const push = (0.7 - d) / 0.7;
    ox += (dx / d) * push * 0.28;
    oz += (dz / d) * push * 0.28;
  }
  const pibo = world.pibo;
  if (pibo) {
    const dx = x - pibo.x;
    const dz = z - pibo.z;
    const d = Math.hypot(dx, dz) || 0.0001;
    if (d < 0.95) {
      const push = (0.95 - d) / 0.95;
      ox += (dx / d) * push * 0.85;
      oz += (dz / d) * push * 0.85;
    }
  }
  return { x: x + ox, z: z + oz };
}

export function poseOf(actor) {
  const moving = actor.mode === "walk" || actor.mode === "fly";
  const wave = Math.sin(actor.phase);
  const hit = wave * wave;
  let bob = Math.sin(actor.phase * 0.45) * 0.018;
  let sx = 1;
  let sy = 1;
  let lean = 0;
  if (actor.gait.fly) {
    const flap = Math.sin(actor.phase);
    sx = 1 + Math.abs(flap) * 0.16;
    sy = 1 - Math.abs(flap) * 0.1;
    bob = (actor.gait.hop || 0.25) * (0.65 + 0.35 * flap);
    lean = flap * 0.18 * actor.flip;
  } else if (moving) {
    const squash = actor.gait.squash || 0.08;
    sy = 1 - hit * squash;
    sx = 1 + hit * squash * 0.65;
    bob = (1 - hit) * (actor.gait.hop || 0.06);
    lean = wave * 0.06 * actor.flip;
  }
  return { flip: actor.flip, bob, sx, sy, lean };
}

function between(a, b, t) {
  return a + (b - a) * t;
}

/** Cells of one connected patch of ground, so a creature stays on its islet. */
export function spotsByHome(cells, homes) {
  const step = 0.5;
  const key = (x, z) => `${Math.round(x / step)}:${Math.round(z / step)}`;
  const byKey = new Map();
  for (const cell of cells) byKey.set(key(cell.x, cell.z), cell);
  const seen = new Set();
  const groups = [];
  for (const cell of cells) {
    const start = key(cell.x, cell.z);
    if (seen.has(start)) continue;
    const group = [];
    const stack = [cell];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop();
      group.push(cur);
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const next = byKey.get(key(cur.x + dx * step, cur.z + dz * step));
          if (!next) continue;
          const id = key(next.x, next.z);
          if (seen.has(id)) continue;
          seen.add(id);
          stack.push(next);
        }
      }
    }
    groups.push(group);
  }
  const out = new Map();
  for (const home of homes) {
    let best = groups[0] || [];
    let bestD = Infinity;
    for (const group of groups) {
      for (const cell of group) {
        const d = (cell.x - home.x) ** 2 + (cell.z - home.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = group;
        }
      }
    }
    out.set(home.id, best);
  }
  return out;
}

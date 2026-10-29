import { HOUSES, PAINTED_SPRITES } from "../data/layers.js";
import { onLand, isBlocked } from "./biome.js";
import { createActor, spotsByHome, stepActor } from "./mascotMotion.js";

const STEP = 0.5;

/**
 * Painted creatures stroll their own islet. Butterflies flutter in the open
 * air around the spot they were painted. None of them are solid, so Pibo
 * is nudged past them instead of getting stuck.
 */
export class MascotWander {
  constructor(sprites, collision) {
    this.sprites = sprites;
    this.collision = collision;
    this.actors = [];
    this._spots = new Map();
    const homes = [];
    for (const sprite of PAINTED_SPRITES) {
      if (sprite.kind !== "mascot" && sprite.kind !== "flyer") continue;
      const view = sprites.items.get(sprite.id);
      if (!view) continue;
      const actor = createActor(sprite.id, sprite.x, sprite.z);
      actor.bias = sprite.depthBias || 0;
      actor.fly = sprite.kind === "flyer";
      actor.view = view;
      this.actors.push(actor);
      if (!actor.fly) homes.push(actor);
    }
    this._buildGround(homes);
  }

  _buildGround(homes) {
    const cells = [];
    for (let z = -8.4; z <= 8.6; z += STEP) {
      for (let x = -15.4; x <= 15.4; x += STEP) {
        if (!this._ground(x, z)) continue;
        cells.push({ x, z });
      }
    }
    this._spots = spotsByHome(cells, homes);
    for (const actor of homes) {
      const spots = this._spots.get(actor.id) || [];
      if (!spots.length) continue;
      let best = spots[0];
      let bestD = Infinity;
      for (const spot of spots) {
        const d = (spot.x - actor.x) ** 2 + (spot.z - actor.z) ** 2;
        if (d < bestD) {
          bestD = d;
          best = spot;
        }
      }
      if (!this._ground(actor.x, actor.z)) {
        actor.x = best.x;
        actor.z = best.z;
        actor.homeX = best.x;
        actor.homeZ = best.z;
      }
    }
  }

  _ground(x, z) {
    if (!onLand(x, z) || isBlocked(x, z)) return false;
    const pushed = this.collision.resolve(x, z, 0.16);
    return Math.hypot(pushed.x - x, pushed.z - z) < 0.08;
  }

  _slide(x, z) {
    if (!onLand(x, z) || isBlocked(x, z)) return null;
    const pushed = this.collision.resolve(x, z, 0.16);
    if (Math.hypot(pushed.x - x, pushed.z - z) > 0.34) return null;
    if (!onLand(pushed.x, pushed.z) || isBlocked(pushed.x, pushed.z)) return null;
    return pushed;
  }

  update(dt, pibo) {
    const others = this.actors.map((actor) => ({
      id: actor.id,
      x: actor.x,
      z: actor.z,
      fly: actor.fly,
    }));
    const world = {
      rng: Math.random,
      free: (x, z) => this._slide(x, z) != null,
      spotsFor: (x, z) => {
        const actor = this.actors.find((item) => item.homeX === x && item.homeZ === z);
        return (actor && this._spots.get(actor.id)) || [];
      },
      flyFree: (x, z) => flyRoom(x, z),
      others,
      pibo: pibo ? { x: pibo.x, z: pibo.z } : null,
    };
    for (const actor of this.actors) {
      const pose = stepActor(actor, dt, world);
      const slid = actor.fly ? null : this._slide(actor.x, actor.z);
      if (slid && !actor.fly) {
        actor.x = slid.x;
        actor.z = slid.z;
      }
      actor.view.place(actor.x, actor.z, actor.bias);
      actor.view.setMotion(pose);
    }
  }
}

function flyRoom(x, z) {
  if (x < -15.6 || x > 15.6 || z < -8.4 || z > 8.2) return false;
  return !insideHouse(x, z);
}

function insideHouse(x, z) {
  for (const ring of Object.values(HOUSES)) {
    if (pointInPoly(x, z, ring)) return true;
  }
  return false;
}

function pointInPoly(x, z, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    const hit = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-9) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

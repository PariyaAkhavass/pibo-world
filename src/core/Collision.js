import * as THREE from "three";
import { tangentAt } from "./SphereMath.js";

/**
 * Surface collision on a tiny planet. Obstacles are circles on the sphere
 * (a direction + a keep-out radius in world units). Movement stays on the
 * surface: if Pibo steps inside a circle we push them back out along the
 * great circle, which also lets them slide around houses instead of sticking.
 */
export class Collision {
  constructor(planetRadius, obstacles = []) {
    this.R = planetRadius;
    this.obstacles = obstacles.map((o) => ({
      dir: o.dir.clone().normalize(),
      radius: o.radius,
    }));
  }

  add(dir, radius) {
    this.obstacles.push({ dir: dir.clone().normalize(), radius });
  }

  /**
   * Push a surface direction out of any overlapping obstacles.
   * `padding` is Pibo's own radius so we test center-to-center.
   */
  resolve(dir, padding = 0.5) {
    let out = dir.clone().normalize();
    for (let pass = 0; pass < 4; pass++) {
      let hit = false;
      for (const o of this.obstacles) {
        const next = pushOut(out, o, padding, this.R);
        if (next) {
          out = next;
          hit = true;
        }
      }
      if (!hit) break;
    }
    return out;
  }
}

/** If `dir` overlaps `obstacle`, return the nearest legal direction; else null. */
function pushOut(dir, obstacle, padding, R) {
  const a = dir.clone().normalize();
  const b = obstacle.dir;
  const ang = a.angleTo(b);
  const minAng = (obstacle.radius + padding) / R;
  if (ang >= minAng - 1e-5) return null;

  let axis = new THREE.Vector3().crossVectors(b, a);
  if (axis.lengthSq() < 1e-10) axis = tangentAt(b);
  axis.normalize();
  return b.clone().applyAxisAngle(axis, minAng).normalize();
}

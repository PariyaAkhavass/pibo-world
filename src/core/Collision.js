/**
 * Flat keep-out circles on the island. Pibo slides around a building instead
 * of sticking to it. Water is not a collider — stepping off land starts a swim.
 */
export class Collision {
  constructor(obstacles = []) {
    this.obstacles = obstacles.map((o) => ({
      id: o.id || "",
      x: o.x,
      z: o.z,
      radius: o.radius,
    }));
  }

  add(x, z, radius, id = "") {
    this.obstacles.push({ id, x, z, radius });
  }

  remove(id) {
    this.obstacles = this.obstacles.filter((o) => o.id !== id);
  }

  /**
   * Push a point out of any overlapping circle.
   * `padding` is Pibo's own radius.
   */
  resolve(x, z, padding = 0.45) {
    let px = x;
    let pz = z;
    for (let pass = 0; pass < 4; pass++) {
      let hit = false;
      for (const o of this.obstacles) {
        let dx = px - o.x;
        let dz = pz - o.z;
        const min = o.radius + padding;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.0001;
        const push = (min - d) / d;
        px += dx * push;
        pz += dz * push;
        hit = true;
      }
      if (!hit) break;
    }

    const limit = 15.6;
    const r = Math.hypot(px, pz);
    if (r > limit) {
      px *= limit / r;
      pz *= limit / r;
    }
    return { x: px, z: pz };
  }
}

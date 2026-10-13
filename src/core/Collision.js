/**
 * Small keep-outs on the flat island: boxes for house bases, circles for
 * a few tree trunks. Pibo is pushed out along the shortest side so he
 * slides along a wall or trunk instead of sticking. Water and the ground
 * are not colliders.
 */
export class Collision {
  constructor(obstacles = []) {
    this.obstacles = obstacles.map(shapeOf);
  }

  add(x, z, radius, id = "") {
    this.obstacles.push(shapeOf({ id, type: "circle", x, z, radius }));
  }

  remove(id) {
    this.obstacles = this.obstacles.filter((o) => o.id !== id);
  }

  /**
   * Push a point out of any overlapping house or trunk.
   * `padding` is a thin skin, not the whole pot, so the blockers stay small.
   */
  resolve(x, z, padding = 0.2) {
    let px = x;
    let pz = z;
    const skin = padding;
    for (let pass = 0; pass < 4; pass++) {
      let hit = false;
      for (const o of this.obstacles) {
        if (o.type === "box") {
          const hx = o.halfW + skin;
          const hz = o.halfD + skin;
          const dx = px - o.x;
          const dz = pz - o.z;
          const adx = Math.abs(dx);
          const adz = Math.abs(dz);
          if (adx >= hx || adz >= hz) continue;
          const penX = hx - adx;
          const penZ = hz - adz;
          if (penX <= penZ) px += (dx < 0 ? -1 : 1) * (penX + 0.0001);
          else pz += (dz < 0 ? -1 : 1) * (penZ + 0.0001);
          hit = true;
          continue;
        }
        let dx = px - o.x;
        let dz = pz - o.z;
        const min = o.radius + skin;
        const d2 = dx * dx + dz * dz;
        if (d2 >= min * min || min <= 0) continue;
        if (d2 < 1e-8) {
          px += min;
        } else {
          const d = Math.sqrt(d2);
          const push = (min - d) / d;
          px += dx * push;
          pz += dz * push;
        }
        hit = true;
      }
      if (!hit) break;
    }
    return { x: px, z: pz };
  }
}

function shapeOf(o) {
  return {
    id: o.id || "",
    type: o.type === "box" ? "box" : "circle",
    x: o.x,
    z: o.z,
    radius: o.radius || 0,
    halfW: o.halfW || 0,
    halfD: o.halfD || 0,
  };
}

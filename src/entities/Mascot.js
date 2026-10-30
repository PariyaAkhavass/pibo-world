import * as THREE from "three";
import { isBlocked, onLand } from "../world/biome.js";
import { placeOnPlate } from "../world/iso.js";

/**
 * A friend of Pibo's pot. It idles, then takes a short stroll on walkable
 * ground. Houses and trunks slide it along their edges. When Pibo comes
 * close it steps aside, so the animals are never walls.
 *
 * The drawing faces screen-left. Walking right mirrors it.
 */
export class Mascot {
  constructor({ textures, basis, def }) {
    this.def = def;
    this.basis = basis;
    this.id = def.id;
    this.kind = def.kind || "walk";
    this.x = def.x;
    this.z = def.z;
    this.homeX = def.x;
    this.homeZ = def.z;
    this.roam = def.roam;
    this.radius = def.radius;
    this.speed = def.speed;
    this.bounds = def.bounds || null;
    this.height = def.height;
    this.width = def.width;

    this.faceX = -1;
    this.faceZ = 0;
    this.moving = false;
    this.mode = "idle";
    this.idleLeft = 0.35 + Math.random() * 1.1;
    this.target = null;
    this.stuck = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.idleT = Math.random() * 6;
    this._flip = 1;

    const map = textures.get(def.src);
    this.material = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(def.width, def.height);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 3;
    this.mesh.position.y = def.height * 0.5;

    this.body = new THREE.Group();
    this.body.add(this.mesh);
    this.pivot = new THREE.Group();
    this.pivot.quaternion.copy(basis.quaternion);
    this.pivot.add(this.body);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(def.width * 0.62, def.height * 0.22),
      new THREE.MeshBasicMaterial({
        map: contactShadowTexture(),
        transparent: true,
        premultipliedAlpha: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    this.shadow.position.set(0, 0.02, 0.02);
    this.shadow.renderOrder = 2;

    this.group = new THREE.Group();
    this.group.name = `mascot-${def.id}`;
    this.group.add(this.shadow);
    this.group.add(this.pivot);
    this._apply();
  }

  update(dt, collision, pibo, others = []) {
    const yielded = this._yield(dt, collision, pibo);
    if (!yielded) this._stroll(dt, collision);
    this._separate(others, collision);
    this._animate(dt);
    this._apply();
  }

  _yield(dt, collision, pibo) {
    if (!pibo) return false;
    const dx = this.x - pibo.x;
    const dz = this.z - pibo.z;
    const dist = Math.hypot(dx, dz);
    const need = (pibo.radius || 0.45) + this.radius + 0.2;
    if (dist >= need) {
      if (this.mode === "yield") {
        this.mode = "idle";
        this.idleLeft = 0.45 + Math.random() * 0.7;
        this.moving = false;
      }
      return false;
    }
    let awayX;
    let awayZ;
    if (dist < 0.02) {
      // Stacked on the pot. Step off to the side of the way Pibo is facing.
      const fx = pibo.faceX || 1;
      const fz = pibo.faceZ || 0;
      const fl = Math.hypot(fx, fz) || 1;
      awayX = -fz / fl;
      awayZ = fx / fl;
    } else {
      awayX = dx / dist;
      awayZ = dz / dist;
    }
    const sideX = -awayZ;
    const sideZ = awayX;
    const push = Math.min(this.speed * 1.35 * dt, need - dist + 0.015);
    const options = [
      [awayX * 0.45 + sideX, awayZ * 0.45 + sideZ],
      [awayX * 0.45 - sideX, awayZ * 0.45 - sideZ],
      [awayX, awayZ],
    ];
    for (const [ox, oz] of options) {
      const len = Math.hypot(ox, oz) || 1;
      if (this._tryMove((ox / len) * push, (oz / len) * push, collision, this.roam + 0.55)) {
        this.faceX = ox;
        this.faceZ = oz;
        this.moving = true;
        this.mode = "yield";
        this.target = null;
        return true;
      }
    }
    // No open step. Pibo still walks through; this friend is not a wall.
    this.moving = false;
    return true;
  }

  _stroll(dt, collision) {
    if (this.mode === "idle") {
      const hx = this.homeX - this.x;
      const hz = this.homeZ - this.z;
      const homeDist = Math.hypot(hx, hz);
      if (homeDist > this.roam) {
        this._tryMove((hx / homeDist) * this.speed * dt, (hz / homeDist) * this.speed * dt, collision, this.roam + 0.55);
        this.faceX = hx;
        this.faceZ = hz;
        this.moving = true;
      } else {
        this.moving = false;
      }
      this.idleLeft -= dt;
      if (this.idleLeft <= 0) {
        const next = this._pickTarget(collision);
        if (next) {
          this.target = next;
          this.mode = "walk";
          this.stuck = 0;
        } else {
          this.idleLeft = 0.8 + Math.random() * 1.2;
        }
      }
      return;
    }

    if (!this.target) {
      this.mode = "idle";
      this.idleLeft = 1;
      return;
    }

    let dx = this.target.x - this.x;
    let dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.07) {
      this.mode = "idle";
      this.idleLeft = 1.5 + Math.random() * 2.4;
      this.moving = false;
      this.target = null;
      return;
    }
    dx /= dist;
    dz /= dist;
    const step = Math.min(dist, this.speed * dt);
    const before = dist;
    if (!this._tryMove(dx * step, dz * step, collision, this.roam)) {
      this.stuck += dt;
    } else {
      const after = Math.hypot(this.target.x - this.x, this.target.z - this.z);
      this.faceX = dx;
      this.faceZ = dz;
      this.moving = true;
      this.stuck = after < before - 0.002 ? 0 : this.stuck + dt;
    }
    if (this.stuck > 0.45) {
      this.mode = "idle";
      this.idleLeft = 0.7 + Math.random() * 1.1;
      this.moving = false;
      this.target = null;
      this.stuck = 0;
    }
  }

  _pickTarget(collision) {
    for (let n = 0; n < 14; n++) {
      const angle = Math.random() * Math.PI * 2;
      const reach = Math.sqrt(Math.random()) * this.roam * 0.92;
      const x = this.homeX + Math.cos(angle) * reach;
      const z = this.homeZ + Math.sin(angle) * reach;
      if (Math.hypot(x - this.x, z - this.z) < 0.28) continue;
      if (!this._standable(x, z, collision)) continue;
      return { x, z };
    }
    return null;
  }

  _tryMove(dx, dz, collision, leash) {
    const x0 = this.x;
    const z0 = this.z;
    this.x += dx;
    this.z += dz;
    this._clamp(collision, leash);
    if (!this._standable(this.x, this.z, collision)) {
      this.x = x0;
      this.z = z0;
      return false;
    }
    return true;
  }

  _separate(others, collision) {
    for (const other of others) {
      if (!other || other === this) continue;
      const dx = this.x - other.x;
      const dz = this.z - other.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const need = this.radius + other.radius * 0.85;
      if (dist >= need) continue;
      const push = (need - dist) * 0.5;
      this._tryMove((dx / dist) * push, (dz / dist) * push, collision, this.roam + 0.2);
    }
  }

  _clamp(collision, leash) {
    if (collision) {
      const p = collision.resolve(this.x, this.z, this.radius * 0.85);
      this.x = p.x;
      this.z = p.z;
    }
    const dx = this.x - this.homeX;
    const dz = this.z - this.homeZ;
    const dist = Math.hypot(dx, dz);
    if (dist > leash) {
      this.x = this.homeX + (dx / dist) * leash;
      this.z = this.homeZ + (dz / dist) * leash;
    }
  }

  _standable(x, z, collision) {
    if (!this._onGround(x, z)) return false;
    const reach = this.radius * 0.55;
    const samples = [
      [reach, 0],
      [-reach, 0],
      [0, reach],
      [0, -reach],
    ];
    for (const [dx, dz] of samples) {
      if (!this._onGround(x + dx, z + dz)) return false;
    }
    if (collision) {
      const p = collision.resolve(x, z, this.radius * 0.85);
      if (Math.hypot(p.x - x, p.z - z) > 0.08) return false;
    }
    return true;
  }

  _onGround(x, z) {
    if (!onLand(x, z) || isBlocked(x, z)) return false;
    const box = this.bounds;
    if (!box) return true;
    return x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ;
  }

  _animate(dt) {
    this.idleT += dt;
    let bob = Math.sin(this.idleT * 2.2) * 0.02;
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    if (this.kind === "hop") {
      this.walkPhase += dt * (this.moving ? 7.5 : 3.2);
      const hop = Math.max(0, Math.sin(this.walkPhase));
      bob = hop * (this.moving ? 0.34 : 0.1);
      sy = 1 - (1 - hop) * (this.moving ? 0.08 : 0.03);
      sx = 1 + (1 - hop) * (this.moving ? 0.06 : 0.02);
    } else if (this.moving) {
      this.walkPhase += dt * 8;
      const step = Math.sin(this.walkPhase * Math.PI);
      const hit = step * step;
      sy = 1 - hit * 0.1;
      sx = 1 + hit * 0.06;
      bob = (1 - hit) * 0.07;
      tilt = step * 0.08;
    }

    if (this.moving) {
      if (this.faceX > 0.2) this._flip = -1;
      else if (this.faceX < -0.2) this._flip = 1;
    }

    this.mesh.scale.set(sx, sy, 1);
    this.body.scale.x = this._flip;
    this.body.rotation.z = this._flip * tilt;
    this.mesh.position.y = this.height * sy * 0.5 + bob;

    if (this.shadow) {
      const lift = this.kind === "hop" ? bob : 0;
      const spread = this.moving && this.kind !== "hop" ? 1.04 : 1 - lift * 0.45;
      this.shadow.scale.set(spread, this.kind === "hop" ? 1 - lift * 0.5 : 1, 1);
      this.shadow.material.opacity = this.kind === "hop" ? 0.46 - lift * 0.35 : 0.5;
    }
  }

  _apply() {
    placeOnPlate(this.group, this.x, this.z, 0.04);
  }
}

let shadowMap = null;

function contactShadowTexture() {
  if (shadowMap) return shadowMap;
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, h * 0.48);
  g.addColorStop(0, "rgba(0,0,0,0.95)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;
    data[i + 1] = 0;
    data[i + 2] = 0;
  }
  ctx.putImageData(img, 0, 0);
  shadowMap = new THREE.CanvasTexture(canvas);
  shadowMap.premultiplyAlpha = true;
  shadowMap.needsUpdate = true;
  return shadowMap;
}

import * as THREE from "three";
import { POT_FRIEND_POSES, POT_FRIEND_SIZE } from "../data/potFriends.js";
import { isBlocked, onLand } from "../world/biome.js";
import { placeOnPlate } from "../world/iso.js";
import { createChatterBubble, nearSomeone, setChatterBubble } from "./chatterBubble.js";

/**
 * One of Paria's yellow pots on the outdoor grass.
 * It idles, then takes a short wander on walkable ground. Houses and trunks
 * slide it along their edges. When Pibo comes close it steps aside, so the
 * pots are never walls.
 *
 * The three-quarter drawing faces screen-left. Walking right mirrors it.
 * Front and closed eyes stay for idle, and for walking up or down the picture.
 */
export class PotFriend {
  constructor({ textures, basis, def }) {
    this.def = def;
    this.id = def.id;
    this.x = def.x;
    this.z = def.z;
    this.homeX = def.x;
    this.homeZ = def.z;
    this.roam = def.roam;
    this.speed = def.speed;
    this.radius = 0.5;
    this.height = POT_FRIEND_SIZE.height;
    this.width = POT_FRIEND_SIZE.width;
    this.restPose = def.rest || "front";
    this.restFlip = def.restFlip || 1;

    this.faceX = this.restFlip < 0 ? 1 : -1;
    this.faceZ = 0;
    this.moving = false;
    this.mode = "idle";
    this.idleLeft = def.idle ?? 1.2 + Math.random();
    this.target = null;
    this.stuck = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.idleT = Math.random() * 6;
    this._flip = this.restPose === "side" ? this.restFlip : 1;
    this._blink = 0;
    this._nextBlink = 1.4 + Math.random() * 2.2;

    this.poses = {};
    for (const [name, src] of Object.entries(POT_FRIEND_POSES)) {
      this.poses[name] = textures.get(src) || null;
    }

    this.material = new THREE.MeshBasicMaterial({
      map: this.poses[this.restPose] || this.poses.front,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(this.width, this.height);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 3;
    this.mesh.position.y = this.height * 0.5;

    this.body = new THREE.Group();
    this.body.add(this.mesh);
    this.pivot = new THREE.Group();
    this.pivot.quaternion.copy(basis.quaternion);
    this.pivot.add(this.body);
    this.bubble = createChatterBubble(this.width * 0.55);
    this.pivot.add(this.bubble);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width * 0.62, this.height * 0.2),
      new THREE.MeshBasicMaterial({
        map: contactShadowTexture(),
        transparent: true,
        premultipliedAlpha: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    );
    this.shadow.position.set(0, 0.02, 0.02);
    this.shadow.renderOrder = 2;

    this.group = new THREE.Group();
    this.group.name = `pot-friend-${def.id}`;
    this.group.add(this.shadow);
    this.group.add(this.pivot);
    this._applyPose();
    this._apply();
  }

  update(dt, collision, pibo, others = []) {
    const yielded = this._yield(dt, collision, pibo);
    if (!yielded) this._stroll(dt, collision);
    this._separate(others, collision);
    setChatterBubble(this.bubble, nearSomeone(this, others, 1.35), dt, this.idleT, this.height);
    this._animate(dt);
    this._apply();
  }

  _yield(dt, collision, pibo) {
    if (!pibo) return false;
    const dx = this.x - pibo.x;
    const dz = this.z - pibo.z;
    const dist = Math.hypot(dx, dz);
    const need = (pibo.radius || 0.45) + this.radius + 0.18;
    if (dist >= need) {
      if (this.mode === "yield") {
        this.mode = "idle";
        this.idleLeft = 0.4 + Math.random() * 0.7;
        this.moving = false;
      }
      return false;
    }
    let awayX;
    let awayZ;
    if (dist < 0.02) {
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
    const push = Math.min(this.speed * 1.35 * dt, need - dist + 0.02);
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
    this.moving = false;
    return true;
  }

  _stroll(dt, collision) {
    if (this.mode === "idle") {
      const hx = this.homeX - this.x;
      const hz = this.homeZ - this.z;
      const homeDist = Math.hypot(hx, hz);
      if (homeDist > this.roam) {
        const stepped = this._tryMove(
          (hx / homeDist) * this.speed * dt,
          (hz / homeDist) * this.speed * dt,
          collision,
          this.roam + 0.55,
        );
        this.faceX = hx;
        this.faceZ = hz;
        this.moving = stepped;
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
      this.moving = false;
      return;
    }

    let dx = this.target.x - this.x;
    let dz = this.target.z - this.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.08) {
      this.mode = "idle";
      this.idleLeft = 1.4 + Math.random() * 2.2;
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
      this.moving = false;
    } else {
      const after = Math.hypot(this.target.x - this.x, this.target.z - this.z);
      this.faceX = dx;
      this.faceZ = dz;
      this.moving = true;
      this.stuck = after < before - 0.002 ? 0 : this.stuck + dt;
    }
    if (this.stuck > 0.45) {
      this.mode = "idle";
      this.idleLeft = 0.6 + Math.random() * 1.1;
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
    return Math.hypot(this.x - x0, this.z - z0) > 0.0001;
  }

  _separate(others, collision) {
    for (const other of others) {
      if (!other || other === this) continue;
      const dx = this.x - other.x;
      const dz = this.z - other.z;
      const dist = Math.hypot(dx, dz) || 0.0001;
      const need = this.radius + (other.radius || 0.4) * 0.85;
      if (dist >= need) continue;
      const push = (need - dist) * 0.5;
      this._tryMove((dx / dist) * push, (dz / dist) * push, collision, this.roam + 0.25);
    }
  }

  _clamp(collision, leash) {
    if (collision) {
      const p = collision.resolve(this.x, this.z, this.radius * 0.72);
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
    for (const [dx, dz] of [[reach, 0], [-reach, 0], [0, reach], [0, -reach]]) {
      if (!this._onGround(x + dx, z + dz)) return false;
    }
    if (collision) {
      const p = collision.resolve(x, z, this.radius * 0.72);
      if (Math.hypot(p.x - x, p.z - z) > 0.08) return false;
    }
    return true;
  }

  _onGround(x, z) {
    return onLand(x, z) && !isBlocked(x, z);
  }

  _animate(dt) {
    this.idleT += dt;
    let bob = Math.sin(this.idleT * 2.05) * 0.022;
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    if (this.moving) {
      this.walkPhase += dt * 7.2;
      const step = Math.sin(this.walkPhase * Math.PI);
      const hit = step * step;
      sy = 1 - hit * 0.07;
      sx = 1 + hit * 0.045;
      bob = (1 - hit) * 0.055;
      tilt = step * 0.05;
    } else if (this.restPose === "front") {
      this._nextBlink -= dt;
      if (this._blink > 0) {
        this._blink -= dt;
      } else if (this._nextBlink <= 0) {
        this._blink = 0.22;
        this._nextBlink = 2.4 + Math.random() * 2.8;
      }
    }

    this._applyPose();
    this.mesh.scale.set(sx, sy, 1);
    this.body.scale.x = this._flip;
    this.body.rotation.z = this._flip * tilt;
    this.mesh.position.y = this.height * sy * 0.5 + bob;
    if (this.shadow) {
      const spread = this.moving ? 1.05 : 1;
      this.shadow.scale.set(spread, 1, 1);
    }
  }

  _applyPose() {
    let pose = this.restPose;
    let flip = this.restPose === "side" ? this.restFlip : 1;
    if (this.moving) {
      const ax = Math.abs(this.faceX);
      const az = Math.abs(this.faceZ);
      if (ax > az * 0.85) {
        pose = "side";
        flip = this.faceX > 0.08 ? -1 : 1;
      } else {
        pose = "front";
        flip = 1;
      }
    } else if (this._blink > 0 && pose === "front") {
      pose = "closed";
      flip = 1;
    }
    const tex = this.poses[pose] || this.poses.front;
    if (tex && this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
    this._flip = flip;
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

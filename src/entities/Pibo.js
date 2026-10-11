import * as THREE from "three";
import { ASSETS } from "../data/assets.js";
import { GROUND_Y, WATER_Y } from "../world/layout.js";
import { isBlueWater } from "../world/biome.js";

/**
 * Pibo on the flat island. The body is a swappable sprite sheet (idle, walk,
 * swim). Touching water swaps to the face-down breaststroke frames immediately
 * and never plays the walk cycle while any part of the pot is in the sea.
 *
 * Movement is screen-relative: W / stick-up goes up the picture, D / stick-right
 * goes right. Pibo turns to face the direction it is traveling.
 */
export class Pibo {
  constructor({ textures, basis, x = 0, z = 0, controllable = true, scale = 1, tint = 0xffffff } = {}) {
    this.basis = basis;
    this.asset = ASSETS.pibo;
    this.controllable = controllable;
    this.charScale = scale;
    this.x = x;
    this.z = z;
    this.y = GROUND_Y;
    this.faceX = basis.screenUp.x;
    this.faceZ = basis.screenUp.z;
    this.radius = 0.42 * scale;
    this.linSpeed = 4.6;
    this.swimSpeed = 3.15;
    this.moving = false;
    this.inWater = false;
    this.walkPhase = 0;
    this.swimPhase = 0;
    this.idleT = Math.random() * 6;

    this.frames = {};
    for (const [state, urls] of Object.entries(this.asset.states)) {
      this.frames[state] = urls.map((url) => textures.get(url));
    }

    this.material = new THREE.MeshBasicMaterial({
      map: this.frames.idle[0],
      transparent: true,
      alphaTest: 0.12,
      depthWrite: true,
      side: THREE.DoubleSide,
      color: tint,
    });
    const geo = new THREE.PlaneGeometry(this.asset.width, this.asset.height);
    this.mesh = new THREE.Mesh(geo, this.material);
    const ax = (this.asset.anchor.x - 0.5) * this.asset.width;
    const ay = (this.asset.anchor.y - 0.5) * this.asset.height;
    this.mesh.position.set(-ax, -ay, 0);
    this.restLocalY = this.mesh.position.y;

    this.pivot = new THREE.Group();
    this.pivot.quaternion.copy(basis.quaternion);
    this.pivot.add(this.mesh);
    this.group = new THREE.Group();
    this.group.scale.setScalar(scale);
    this.group.add(this.pivot);
    this._apply();
  }

  worldPosition(target = new THREE.Vector3()) {
    return target.set(this.x, this.y, this.z);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  placeAt(x, z, faceX = 0, faceZ = -1, collision = null) {
    const p = collision ? collision.resolve(x, z, this.radius) : { x, z };
    this.x = p.x;
    this.z = p.z;
    const len = Math.hypot(faceX, faceZ) || 1;
    this.faceX = faceX / len;
    this.faceZ = faceZ / len;
    this.inWater = isBlueWater(this.x, this.z, this.faceX, this.faceZ);
    this.y = this.inWater ? WATER_Y : GROUND_Y;
    this._apply();
  }

  update(dt, input, { frozen = false, collision = null } = {}) {
    let sx = 0;
    let sy = 0;
    if (this.controllable && input && !frozen) {
      sx = input.turn;
      sy = input.moveForward;
    }

    const right = this.basis.screenRight;
    const up = this.basis.screenUp;
    let dx = right.x * sx + up.x * sy;
    let dz = right.z * sx + up.z * sy;
    const mag = Math.hypot(dx, dz);
    this.moving = mag > 0.08;

    if (this.moving) {
      dx /= mag;
      dz /= mag;
      const speed = (this.inWater ? this.swimSpeed : this.linSpeed) * Math.min(1, mag);
      this.x += dx * speed * dt;
      this.z += dz * speed * dt;
      this.faceX = dx;
      this.faceZ = dz;
    }

    if (collision) {
      const p = collision.resolve(this.x, this.z, this.radius);
      this.x = p.x;
      this.z = p.z;
    }

    const wasWater = this.inWater;
    this.inWater = isBlueWater(this.x, this.z, this.faceX, this.faceZ);
    const targetY = this.inWater ? WATER_Y : GROUND_Y;
    const rise = 1 - Math.exp(-16 * dt);
    this.y += (targetY - this.y) * rise;
    if (!wasWater && this.inWater) this.swimPhase = 0;

    this._animate(dt);
    this._apply();
  }

  _animate(dt) {
    const fps = this.asset.fps;
    let state = "idle";
    let index = 0;
    let bob = Math.sin(this.idleT * 2) * 0.03;
    this.idleT += dt;

    if (this.inWater) {
      state = "swim";
      const rate = this.moving ? fps.swim : fps.swim * 0.45;
      this.swimPhase += dt * rate;
      index = Math.floor(this.swimPhase) % this.frames.swim.length;
      bob = Math.sin(this.swimPhase * 1.4) * 0.03;
    } else if (this.moving) {
      state = "walk";
      this.walkPhase += dt * fps.walk;
      index = Math.floor(this.walkPhase) % this.frames.walk.length;
      bob = Math.abs(Math.sin(this.walkPhase * Math.PI)) * 0.06;
    }

    const tex = this.frames[state][index];
    if (tex && this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }

    const screenRight = this.faceX * this.basis.screenRight.x + this.faceZ * this.basis.screenRight.z;
    const flip = screenRight >= 0 ? 1 : -1;
    this.mesh.scale.set(flip, 1, 1);
    this.mesh.position.y = this.restLocalY + bob;
  }

  _apply() {
    this.group.position.set(this.x, this.y, this.z);
  }
}

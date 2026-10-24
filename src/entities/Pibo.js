import * as THREE from "three";
import { ASSETS } from "../data/assets.js";
import { isBlocked, isBlueWater } from "../world/biome.js";
import { placeOnPlate } from "../world/iso.js";
import { loadLook, paintLook } from "./piboLook.js";

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
    this.y = 0;
    this._safeX = x;
    this._safeZ = z;
    this.faceX = basis.screenUp.x;
    this.faceZ = basis.screenUp.z;
    this.radius = (this.asset.radius ?? 0.42) * scale;
    this.waterReach = (this.asset.waterReach ?? 0.5) * scale;
    // Body radius against houses and trunks. Scales with the pot.
    this.blockSkin = 0.32 * scale;
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
      alphaTest: 0.05,
      depthWrite: true,
      side: THREE.DoubleSide,
      color: tint,
    });
    const geo = new THREE.PlaneGeometry(this.asset.width, this.asset.height);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.renderOrder = 3;
    const ax = (this.asset.anchor.x - 0.5) * this.asset.width;
    const ay = (this.asset.anchor.y - 0.5) * this.asset.height;
    this.mesh.position.set(-ax, -ay, 0);

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(this.asset.width * 0.78, this.asset.height * 0.22),
      new THREE.MeshBasicMaterial({
        map: contactShadowTexture(),
        transparent: true,
        premultipliedAlpha: true,
        opacity: 0.58,
        depthWrite: false,
      }),
    );
    this.shadow.position.set(0, 0.03, 0.02);
    this.shadow.renderOrder = 2;

    this.pivot = new THREE.Group();
    this.pivot.quaternion.copy(basis.quaternion);
    this.pivot.add(this.mesh);
    this.group = new THREE.Group();
    this.group.scale.setScalar(scale);
    this.group.add(this.shadow);
    this.group.add(this.pivot);
    this._baseImage = this.frames.idle[0]?.image || null;
    this._lookGrow = 1;
    this._lookTex = null;
    if (controllable && this._baseImage) this.applyLook(loadLook());
    this._apply();
  }

  applyLook(look) {
    if (!this._baseImage) return;
    this.look = look;
    const canvas = paintLook(this._baseImage, look);
    const srcH = this._baseImage.height || this._baseImage.naturalHeight || canvas.height;
    this._lookGrow = srcH ? canvas.height / srcH : 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this._lookTex?.dispose();
    this._lookTex = tex;
    this.frames.idle[0] = tex;
    this.frames.walk[0] = tex;
    if (!this.inWater) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
  }

  worldPosition(target = new THREE.Vector3()) {
    return target.set(this.x, 0, this.z);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  placeAt(x, z, faceX = 0, faceZ = -1, collision = null) {
    const p = collision ? collision.resolve(x, z, this.blockSkin) : { x, z };
    this.x = p.x;
    this.z = p.z;
    const len = Math.hypot(faceX, faceZ) || 1;
    this.faceX = faceX / len;
    this.faceZ = faceZ / len;
    this._keepOnLand();
    this.inWater = isBlueWater(this.x, this.z, this.faceX, this.faceZ, this.waterReach);
    this._animate(0);
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
      const p = collision.resolve(this.x, this.z, this.blockSkin);
      this.x = p.x;
      this.z = p.z;
    }
    this._keepOnLand();

    const wasWater = this.inWater;
    this.inWater = isBlueWater(this.x, this.z, this.faceX, this.faceZ, this.waterReach);
    if (!wasWater && this.inWater) this.swimPhase = 0;

    this._animate(dt);
    this._apply();
  }

  _animate(dt) {
    const fps = this.asset.fps;
    let state = "idle";
    let index = 0;
    this.idleT += dt;

    let bob = Math.sin(this.idleT * 2.1) * 0.028;
    let sx = 1;
    let sy = 1;
    let tilt = 0;

    if (this.inWater) {
      state = "swim";
      const rate = this.moving ? fps.swim : fps.swim * 0.45;
      this.swimPhase += dt * rate;
      index = Math.floor(this.swimPhase) % this.frames.swim.length;
      bob = Math.sin(this.swimPhase * 1.5) * 0.03;
      sx = (this.asset.swimWidth || this.asset.width) / this.asset.width;
      sy = (this.asset.swimHeight || this.asset.height) / this.asset.height;
    } else if (this.moving) {
      state = "walk";
      this.walkPhase += dt * fps.walk;
      index = Math.floor(this.walkPhase) % this.frames.walk.length;
      const step = Math.sin(this.walkPhase * Math.PI);
      const hit = step * step;
      // Squash on the step, stretch back up, and lean into the walk.
      sy = 1 - hit * 0.12;
      sx = 1 + hit * 0.08;
      bob = (1 - hit) * 0.09;
      tilt = 0.07 + step * 0.1;
    }

    const tex = this.frames[state][index];
    if (tex && this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }

    const screenRight = this.faceX * this.basis.screenRight.x + this.faceZ * this.basis.screenRight.z;
    const flip = screenRight >= 0 ? 1 : -1;
    // A hat adds clear space above the leaves. Swim frames stay the original pot.
    const grow = state === "swim" ? 1 : (this._lookGrow || 1);
    this.mesh.scale.set(flip * sx, sy * grow, 1);
    // Positive rotation leans the top to screen-left, so flip it with facing.
    this.mesh.rotation.z = state === "walk" ? -flip * tilt : 0;
    // The plane is centered. Park its base on the ground while it squishes or lies flat.
    this.mesh.position.y = this.asset.height * sy * grow * 0.5 + bob;
    if (this.shadow) {
      this.shadow.material.opacity = this.inWater ? 0 : 0.58;
      const spread = state === "walk" ? 1 + (1 - sy) * 1.4 : 1;
      this.shadow.scale.set(spread, 1, 1);
    }
  }

  _keepOnLand() {
    if (!isBlocked(this.x, this.z)) {
      this._safeX = this.x;
      this._safeZ = this.z;
      return;
    }
    const nx = this.x;
    const nz = this.z;
    // Slide along the sky edge instead of snapping the whole step back.
    if (!isBlocked(nx, this._safeZ)) {
      this.z = this._safeZ;
      this._safeX = nx;
      return;
    }
    if (!isBlocked(this._safeX, nz)) {
      this.x = this._safeX;
      this._safeZ = nz;
      return;
    }
    this.x = this._safeX;
    this.z = this._safeZ;
  }

  _apply() {
    placeOnPlate(this.group, this.x, this.z, 0.045);
  }
}

/** Soft black ellipse. RGB stays black so the feather cannot turn into a light ring. */
function contactShadowTexture() {
  const w = 256;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
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
  const tex = new THREE.CanvasTexture(canvas);
  tex.premultiplyAlpha = true;
  tex.needsUpdate = true;
  return tex;
}

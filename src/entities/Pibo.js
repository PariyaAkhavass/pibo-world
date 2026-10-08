import * as THREE from "three";
import { RoundedBoxGeometry } from "https://unpkg.com/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, blob, ball, cyl, cone } from "../world/materials.js";
import { shade } from "../world/materials.js";
import { surfaceQuaternion, tangentAt } from "../core/SphereMath.js";
import { isBlueWater } from "../world/biome.js";

/**
 * Pibo — the player's little creature. An original silhouette: a chubby little
 * planter-pot with stubby legs and arms, simple dot eyes, rosy cheeks, and a
 * leafy plant growing right out of the top. Built to feel expressive with very
 * little animation: it bobs when idle, squashes and waddles when it walks,
 * blinks now and then, and always faces the way it's going.
 *
 * It lives on the planet surface, storing a direction (position) and a forward
 * tangent, and is oriented every frame to stand upright on the sphere.
 */
const DEFAULT_PALETTE = {
  pot: 0xffe27a,
  potDark: 0xefc65c,
  smile: 0xc4a05a,
  leaves: [0x5fae55, 0x74c266, 0x6ab85e],
  leafTall: 0x6fbf5f,
};

export class Pibo {
  constructor(planet, startDir, startForward, opts = {}) {
    this.planet = planet;
    this.dir = startDir.clone().normalize();
    this.forward = startForward
      ? startForward.clone().normalize()
      : tangentAt(this.dir);

    this.palette = { ...DEFAULT_PALETTE, ...opts.palette };
    this.charScale = opts.scale ?? 1;
    this.controllable = opts.controllable !== false;

    this.linSpeed = 4.2; // units/sec along surface
    this.swimSpeed = 3.05; // a little slower, still easy to steer
    this.turnSpeed = 2.6; // rad/sec
    this.radius = 0.5 * this.charScale; // collision padding — about half the pot's width
    this.moving = false;
    this.inWater = false;
    this.swimPose = 0; // 1 face-down in blue water, 0 upright on land
    this.strokeT = 0;
    this.walkPhase = 0;
    this.idleT = Math.random() * 10;
    this.blinkT = 2 + Math.random() * 3;
    this.blinking = 0;

    this.group = new THREE.Group();
    this._buildModel();
    this.group.scale.setScalar(this.charScale);
    planet.surface.add(this.group);
    this._applyTransform();
  }

  _buildModel() {
    // bob/squash wrapper so animation never disturbs surface orientation
    this.body = new THREE.Group();
    this.group.add(this.body);

    const pot = clay(this.palette.pot);
    const potDark = clay(this.palette.potDark);
    const soilMat = clay(0x5a3f2c, { roughness: 1 });

    // --- planter-pot body (rounded cube, like the reference creatures) ---
    const bodyMesh = new THREE.Mesh(
      new RoundedBoxGeometry(1.02, 1.0, 0.92, 6, 0.3),
      pot
    );
    bodyMesh.position.y = 0.62;
    this.body.add(bodyMesh);

    // lip / rim near the top
    const rim = new THREE.Mesh(
      new RoundedBoxGeometry(1.12, 0.2, 1.02, 5, 0.09),
      potDark
    );
    rim.position.y = 1.04;
    this.body.add(rim);

    // soil the plant grows out of
    const soil = new THREE.Mesh(
      new RoundedBoxGeometry(0.82, 0.16, 0.72, 4, 0.06),
      soilMat
    );
    soil.position.y = 1.1;
    this.body.add(soil);

    // --- face: simple flat dot eyes, blush, tiny smile ---
    this.eyes = new THREE.Group();
    const eyeMat = clay(0x30303c, { roughness: 0.5 });
    for (const sx of [-1, 1]) {
      const eye = ball(0.1, eyeMat, 16);
      eye.scale.set(0.82, 1.1, 0.35); // flat oval against the pot face
      eye.position.set(sx * 0.2, 0.66, 0.47);
      this.eyes.add(eye);
      const glint = ball(0.026, clay(0xffffff), 8);
      glint.position.set(sx * 0.2 + 0.05, 0.71, 0.5);
      this.body.add(glint);
    }
    this.body.add(this.eyes);

    for (const sx of [-1, 1]) {
      const cheek = ball(0.08, clay(0xffb6b6));
      cheek.scale.set(1, 0.68, 0.32);
      cheek.position.set(sx * 0.36, 0.54, 0.44);
      this.body.add(cheek);
    }

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.022, 8, 16, Math.PI),
      clay(this.palette.smile, { roughness: 0.6 })
    );
    smile.rotation.z = Math.PI; // flip the half-arc into an upward "u" smile
    smile.position.set(0, 0.52, 0.48);
    this.body.add(smile);

    // --- the plant on top: upright, snake-plant-style blades ---
    this.sprout = new THREE.Group();
    this.sprout.position.y = 1.14;
    const leafGreens = this.palette.leaves;
    const ring = 7;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2;
      const h = 0.5 + (i % 2 ? 0.16 : 0) + Math.random() * 0.1;
      const lean = 0.16 + Math.random() * 0.12;
      const blade = cone(0.08, h, clay(leafGreens[i % leafGreens.length]), 8);
      blade.scale.z = 0.32; // flatten a cone into a leaf blade
      blade.position.set(Math.cos(a) * 0.17, h / 2, Math.sin(a) * 0.17);
      blade.rotation.y = a;
      blade.rotation.x = Math.sin(a) * lean;
      blade.rotation.z = -Math.cos(a) * lean;
      this.sprout.add(blade);
    }
    // two taller central blades for a strong silhouette
    for (const sx of [-1, 1]) {
      const h = 0.92;
      const blade = cone(0.095, h, clay(this.palette.leafTall), 8);
      blade.scale.z = 0.3;
      blade.position.set(sx * 0.07, h / 2, 0);
      blade.rotation.z = -sx * 0.12;
      this.sprout.add(blade);
    }
    this.body.add(this.sprout);

    // --- stubby arms (pivot at the shoulder so they can paddle) ---
    this.arms = [];
    this.armPads = [];
    for (const sx of [-1, 1]) {
      const arm = new THREE.Group();
      const upper = blob(0.14, pot, 2);
      upper.scale.set(0.75, 1, 0.75);
      upper.position.y = -0.16;
      arm.add(upper);
      arm.position.set(sx * 0.58, 0.66, 0.06);
      this.body.add(arm);
      this.arms.push(arm);
      this.armPads.push(upper);
    }

    // --- stubby legs (animated for walking) ---
    this.legs = [];
    this.legShins = [];
    this.legFeet = [];
    for (const sx of [-1, 1]) {
      const leg = new THREE.Group();
      const shin = cyl(0.13, 0.15, 0.18, pot, 8);
      shin.position.y = -0.09;
      const foot = ball(0.15, potDark, 12);
      foot.scale.set(1, 0.55, 1.25);
      foot.position.set(0, -0.18, 0.05);
      leg.add(shin);
      leg.add(foot);
      leg.position.set(sx * 0.24, 0.18, 0.01);
      this.body.add(leg);
      this.legs.push(leg);
      this.legShins.push(shin);
      this.legFeet.push(foot);
    }

    shade(this.group, true, false);
    this._buildSplash();
  }

  _buildSplash() {
    this.splash = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc8f4ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.splashRing = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.5, 22), ringMat);
    this.splashRing.rotation.x = -Math.PI / 2;
    this.splashRing.position.y = 0.06;
    this.splash.add(this.splashRing);

    const dropMat = new THREE.MeshBasicMaterial({
      color: 0xe7fbff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.droplets = [];
    for (let i = 0; i < 3; i++) {
      const drop = ball(0.055, dropMat.clone(), 8);
      drop.position.y = 0.12;
      this.splash.add(drop);
      this.droplets.push(drop);
    }
    this.splash.visible = false;
    this.group.add(this.splash);
  }

  _applyTransform() {
    const R = this.planet.radius;
    this.group.position.copy(this.dir).multiplyScalar(R);
    surfaceQuaternion(this.dir, this.forward, this.group.quaternion);
  }

  worldPosition(target = new THREE.Vector3()) {
    return this.group.getWorldPosition(target);
  }

  setVisible(v) {
    this.group.visible = v;
  }

  /** Snap onto the surface after hopping out of the pot-ship. */
  placeAt(dir, forward, collision = null) {
    this.dir.copy(dir).normalize();
    this.forward.copy(forward);
    if (collision) this.dir.copy(collision.resolve(this.dir, this.radius));
    const up = this.dir.clone().normalize();
    this.forward.sub(up.clone().multiplyScalar(this.forward.dot(up))).normalize();
    this._applyTransform();
  }

  /** Freeze movement (e.g. while a UI panel is open) but keep it breathing. */
  update(dt, input, { frozen = false, collision = null } = {}) {
    let move = 0, turn = 0;
    if (this.controllable && input && !frozen) {
      move = input.moveForward;
      turn = input.turn;
    }

    // turn: rotate forward about the surface normal
    // (negative so pressing right/D turns Pibo to the player's right)
    if (turn !== 0) {
      const up = this.dir.clone().normalize();
      this.forward.applyAxisAngle(up, -turn * this.turnSpeed * dt);
    }

    // move: rotate position + forward about the "right" axis
    this.moving = move !== 0;
    if (this.moving) {
      const up = this.dir.clone().normalize();
      const right = new THREE.Vector3().crossVectors(up, this.forward).normalize();
      const speed = this.inWater ? this.swimSpeed : this.linSpeed;
      const da = (move * speed * dt) / this.planet.radius;
      this.dir.applyAxisAngle(right, da).normalize();
      this.forward.applyAxisAngle(right, da);
    }

    if (collision) {
      this.dir.copy(collision.resolve(this.dir, this.radius));
    }

    // keep forward a clean tangent
    const up = this.dir.clone().normalize();
    this.forward.sub(up.clone().multiplyScalar(this.forward.dot(up))).normalize();

    // Blue water is swim, immediately. Grass and the dock are a stand, immediately.
    this.inWater = isBlueWater(this.dir);
    this.swimPose = this.inWater ? 1 : 0;

    this._applyTransform();
    this._animate(dt);
  }

  _animate(dt) {
    // blink timer
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blinking = 0.14;
      this.blinkT = 2.5 + Math.random() * 3.5;
    }
    if (this.blinking > 0) {
      this.blinking -= dt;
      this.eyes.scale.y = Math.max(0.1, Math.abs(Math.sin((this.blinking / 0.14) * Math.PI)));
    } else {
      this.eyes.scale.y = 1;
    }

    if (this.inWater) {
      this._animateSwim(dt);
      return;
    }
    this._animateLand(dt);
  }

  /** Upright walk or idle. Limbs stay short and hang at the sides. */
  _animateLand(dt) {
    this._setPaddleLength(false);
    this.splash.position.set(0, 0, 0);

    if (this.moving) this.walkPhase += dt * 12;
    else this.idleT += dt;

    let y = 0;
    let rx = 0;
    let sx = 1;
    let sy = 1;
    let sz = 1;
    let leg0 = 0;
    let leg1 = 0;
    let sproutZ = 0;

    if (this.moving) {
      const b = Math.abs(Math.sin(this.walkPhase));
      y = b * 0.14;
      const sq = 1 + Math.sin(this.walkPhase * 2) * 0.05;
      sx = 1 / Math.sqrt(sq);
      sy = sq;
      sz = sx;
      rx = 0.12;
      leg0 = Math.sin(this.walkPhase) * 0.6;
      leg1 = -leg0;
      sproutZ = Math.sin(this.walkPhase) * 0.12;
    } else {
      const breathe = Math.sin(this.idleT * 2) * 0.03;
      y = breathe;
      sx = 1 - breathe * 0.4;
      sy = 1 + breathe * 0.6;
      sz = sx;
      sproutZ = Math.sin(this.idleT * 1.5) * 0.08;
    }

    this.body.position.y = y;
    this.body.rotation.x = rx;
    this.body.rotation.y = 0;
    this.body.rotation.z = 0;
    this.body.scale.set(sx, sy, sz);
    this.legs[0].rotation.set(leg0, 0, 0);
    this.legs[1].rotation.set(leg1, 0, 0);
    this.sprout.rotation.z = sproutZ;
    this.arms[0].rotation.set(0, 0, 0);
    this.arms[1].rotation.set(0, 0, 0);
    this._animateSplash(0);
  }

  /**
   * Face-down on the surface. Both arms sweep out and back together
   * (breaststroke); the legs frog-kick on the recovery. No walk cycle.
   */
  _animateSwim(dt) {
    const period = this.moving ? 0.92 : 1.7;
    this.strokeT = (this.strokeT + dt / period) % 1;
    const t = this.strokeT;

    this._setPaddleLength(true);
    this.splash.position.set(0, 0, 0.48);

    const bob = Math.sin(t * Math.PI * 2) * 0.02;
    this.body.position.y = 0.08 + bob;
    this.body.rotation.x = Math.PI / 2;
    this.body.rotation.y = 0;
    this.body.rotation.z = 0;
    this.body.scale.set(1, 1, 1);

    const right = this._breaststrokeDir(t);
    this._aimArm(this.arms[0], -right[0], right[1], right[2]);
    this._aimArm(this.arms[1], right[0], right[1], right[2]);

    const kick = this._frogKick(t);
    this.legs[0].rotation.set(kick.x, 0, kick.spread);
    this.legs[1].rotation.set(kick.x, 0, -kick.spread);
    this.sprout.rotation.z = 0;
    this._animateSplash(1, t);
  }

  /** Longer paddles while swimming so the stroke reads at camera distance. */
  _setPaddleLength(swim) {
    const ay = swim ? -0.55 : -0.16;
    const ax = swim ? 1.15 : 0.75;
    const az = swim ? 0.8 : 0.75;
    const aScaleY = swim ? 3.4 : 1;
    for (const pad of this.armPads) {
      pad.position.y = ay;
      pad.scale.set(ax, aScaleY, az);
    }
    for (const shin of this.legShins) {
      shin.scale.y = swim ? 1.8 : 1;
      shin.position.y = swim ? -0.16 : -0.09;
    }
    for (const foot of this.legFeet) {
      foot.position.y = swim ? -0.32 : -0.18;
    }
  }

  /**
   * Right-arm aim in body space while the pot is tipped face-down:
   * +Y forward, +X out to the right, +Z down into the water.
   */
  _breaststrokeDir(t) {
    const keys = [
      [0.0, 0.06, 0.98, 0.16],
      [0.18, 0.28, 0.9, 0.22],
      [0.4, 1.0, 0.05, 0.28],
      [0.58, 0.42, -0.9, 0.1],
      [0.74, 0.16, -0.15, 0.7],
      [0.88, 0.08, 0.62, 0.4],
      [1.0, 0.06, 0.98, 0.16],
    ];
    let i = 0;
    while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const k = THREE.MathUtils.smoothstep(t, a[0], b[0]);
    return [
      THREE.MathUtils.lerp(a[1], b[1], k),
      THREE.MathUtils.lerp(a[2], b[2], k),
      THREE.MathUtils.lerp(a[3], b[3], k),
    ];
  }

  /** Point a shoulder pivot so the arm blob aims along (dx, dy, dz). */
  _aimArm(arm, dx, dy, dz) {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len;
    dy /= len;
    dz /= len;
    const horiz = Math.hypot(dx, dy);
    arm.rotation.x = Math.atan2(-dz, horiz);
    arm.rotation.y = 0;
    arm.rotation.z = Math.atan2(dx, -dy);
  }

  /** Both legs together: tuck and spread, then snap back as the arms reach. */
  _frogKick(t) {
    if (t < 0.56 || t > 0.94) return { x: 0, spread: 0 };
    const u = (t - 0.56) / 0.38;
    const bend = Math.sin(u * Math.PI);
    const spread = u < 0.42 ? u / 0.42 : Math.max(0, 1 - (u - 0.42) / 0.58);
    return { x: -bend * 1.35, spread: spread * 0.95 };
  }

  _animateSplash(s, strokeT = 0) {
    const show = s > 0.2;
    this.splash.visible = show;
    if (!show) return;
    const pull = Math.sin(THREE.MathUtils.clamp((strokeT - 0.18) / 0.42, 0, 1) * Math.PI);
    const pulse = this.moving ? 0.35 + pull * 1.15 : 0.28 + Math.sin(strokeT * Math.PI * 2) * 0.08;
    this.splashRing.scale.setScalar(0.85 + pulse);
    this.splashRing.material.opacity = 0.28 + pulse * 0.35;
    this.droplets.forEach((drop, i) => {
      const phase = strokeT * Math.PI * 2 + i * 2.1;
      const hop = this.moving ? pull * Math.max(0, Math.sin(phase)) : 0;
      const ang = i * 2.2 + strokeT * Math.PI * 2;
      drop.position.set(Math.cos(ang) * (0.34 + hop * 0.2), 0.1 + hop * 0.28, Math.sin(ang) * 0.22);
      drop.material.opacity = hop * 0.85;
      drop.scale.setScalar(0.7 + hop);
    });
  }
}

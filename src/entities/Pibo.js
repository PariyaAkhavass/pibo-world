import * as THREE from "three";
import { RoundedBoxGeometry } from "https://unpkg.com/three@0.160.0/examples/jsm/geometries/RoundedBoxGeometry.js";
import { clay, blob, ball, cyl, cone } from "../world/materials.js";
import { shade } from "../world/materials.js";
import { surfaceQuaternion, tangentAt } from "../core/SphereMath.js";

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
export class Pibo {
  constructor(planet, startDir, startForward) {
    this.planet = planet;
    this.dir = startDir.clone().normalize();
    this.forward = startForward
      ? startForward.clone().normalize()
      : tangentAt(this.dir);

    this.linSpeed = 4.2; // units/sec along surface
    this.turnSpeed = 2.6; // rad/sec
    this.moving = false;
    this.walkPhase = 0;
    this.idleT = Math.random() * 10;
    this.blinkT = 2 + Math.random() * 3;
    this.blinking = 0;

    this.group = new THREE.Group();
    this._buildModel();
    planet.surface.add(this.group);
    this._applyTransform();
  }

  _buildModel() {
    // bob/squash wrapper so animation never disturbs surface orientation
    this.body = new THREE.Group();
    this.group.add(this.body);

    const pot = clay(0xffe27a); // light pastel yellow pot
    const potDark = clay(0xefc65c); // rim + feet, a softer butter shade
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
      clay(0xc4a05a, { roughness: 0.6 })
    );
    smile.rotation.z = Math.PI; // flip the half-arc into an upward "u" smile
    smile.position.set(0, 0.52, 0.48);
    this.body.add(smile);

    // --- the plant on top: upright, snake-plant-style blades ---
    this.sprout = new THREE.Group();
    this.sprout.position.y = 1.14;
    const leafGreens = [0x5fae55, 0x74c266, 0x6ab85e];
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
      const blade = cone(0.095, h, clay(0x6fbf5f), 8);
      blade.scale.z = 0.3;
      blade.position.set(sx * 0.07, h / 2, 0);
      blade.rotation.z = -sx * 0.12;
      this.sprout.add(blade);
    }
    this.body.add(this.sprout);

    // --- stubby arms ---
    for (const sx of [-1, 1]) {
      const arm = blob(0.14, pot, 2);
      arm.scale.set(0.75, 1, 0.75);
      arm.position.set(sx * 0.58, 0.5, 0.06);
      this.body.add(arm);
    }

    // --- stubby legs (animated for walking) ---
    this.legs = [];
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
    }

    shade(this.group, true, false);
  }

  _applyTransform() {
    const R = this.planet.radius;
    this.group.position.copy(this.dir).multiplyScalar(R);
    surfaceQuaternion(this.dir, this.forward, this.group.quaternion);
  }

  worldPosition(target = new THREE.Vector3()) {
    return this.group.getWorldPosition(target);
  }

  /** Freeze movement (e.g. while a UI panel is open) but keep it breathing. */
  update(dt, input, { frozen = false } = {}) {
    let move = 0, turn = 0;
    if (input && !frozen) {
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
      const da = (move * this.linSpeed * dt) / this.planet.radius;
      this.dir.applyAxisAngle(right, da).normalize();
      this.forward.applyAxisAngle(right, da);
    }

    // keep forward a clean tangent
    const up = this.dir.clone().normalize();
    this.forward.sub(up.clone().multiplyScalar(this.forward.dot(up))).normalize();

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

    if (this.moving) {
      this.walkPhase += dt * 12;
      const b = Math.abs(Math.sin(this.walkPhase)); // bounce
      this.body.position.y = b * 0.14;
      // squash & stretch
      const sq = 1 + Math.sin(this.walkPhase * 2) * 0.05;
      this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      this.body.rotation.x = 0.12; // lean into the walk
      // waddle legs
      this.legs[0].rotation.x = Math.sin(this.walkPhase) * 0.6;
      this.legs[1].rotation.x = -Math.sin(this.walkPhase) * 0.6;
      this.sprout.rotation.z = Math.sin(this.walkPhase) * 0.12;
    } else {
      // gentle idle breathing
      this.idleT += dt;
      const breathe = Math.sin(this.idleT * 2) * 0.03;
      this.body.position.y = breathe;
      this.body.scale.set(1 - breathe * 0.4, 1 + breathe * 0.6, 1 - breathe * 0.4);
      this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, 0, 0.1);
      this.legs[0].rotation.x = THREE.MathUtils.lerp(this.legs[0].rotation.x, 0, 0.2);
      this.legs[1].rotation.x = THREE.MathUtils.lerp(this.legs[1].rotation.x, 0, 0.2);
      this.sprout.rotation.z = Math.sin(this.idleT * 1.5) * 0.08;
    }
  }
}

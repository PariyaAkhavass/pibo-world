import * as THREE from "three";
import { clay, blob, ball, box, cyl, cone, shade } from "./materials.js";
import { LAYOUT, dirOf } from "./layout.js";
import { mulberry32 } from "./Planet.js";

/**
 * Every handcrafted structure and piece of nature on the starter planet.
 * Each builder returns a Group whose base sits at y=0 and grows upward, so the
 * Planet can place it flush on the surface. Props holds references to the few
 * things that animate or react (pond water, landing beacon, observatory lights,
 * and the reward pieces).
 */
export class Props {
  constructor(planet) {
    this.planet = planet;
    this.t = 0;
    this.observatoryLights = [];
    this.landingRing = null;
    this.pondWater = null;
    this.bridge = null;
    this.rewardBloom = null;
    this.swayers = []; // {mesh, phase, amp}
  }

  build() {
    const P = this.planet;

    P.placeOnSurface(shade(buildHome()), dirOf(LAYOUT.home), { yaw: LAYOUT.home.yaw });
    P.placeOnSurface(shade(buildWorkshop()), dirOf(LAYOUT.workshop), { yaw: LAYOUT.workshop.yaw });

    const obs = buildObservatory(this.observatoryLights);
    P.placeOnSurface(shade(obs), dirOf(LAYOUT.observatory), { lift: 0, yaw: LAYOUT.observatory.yaw });

    const pond = buildPond();
    this.pondWater = pond.userData.water;
    P.placeOnSurface(shade(pond, false, true), dirOf(LAYOUT.pond));

    const pad = buildLandingPad();
    this.landingRing = pad.userData.ring;
    this.landingBeacon = pad.userData.beacon;
    P.placeOnSurface(shade(pad), dirOf(LAYOUT.landing));

    // nature
    for (const t of LAYOUT.trees) {
      const tree = buildTree(t.lon);
      P.placeOnSurface(shade(tree), dirOf(t), { yaw: t.lon });
      this._collectSway(tree);
    }
    for (const r of LAYOUT.rocks) {
      P.placeOnSurface(shade(buildRock(r.lon)), dirOf(r), { yaw: r.lon });
    }
    for (const f of LAYOUT.flowers) {
      const fl = buildFlower(f.lon);
      P.placeOnSurface(shade(fl), dirOf(f), { yaw: f.lon });
      this._collectSway(fl);
    }

    // reward pieces, hidden until earned
    this.bridge = shade(buildBridge());
    this.bridge.visible = false;
    P.placeOnSurface(this.bridge, dirOf(LAYOUT.bridge), { yaw: LAYOUT.bridge.yaw });

    this.rewardBloom = shade(buildRewardBloom());
    this.rewardBloom.visible = false;
    this.rewardBloom.scale.setScalar(0.001);
    P.placeOnSurface(this.rewardBloom, dirOf(LAYOUT.rewardBloom));

    return this;
  }

  _collectSway(group) {
    group.traverse((o) => {
      if (o.userData.sway) {
        this.swayers.push({ mesh: o, phase: Math.random() * Math.PI * 2, amp: o.userData.sway });
      }
    });
  }

  setObservatoryLit(on) {
    for (const m of this.observatoryLights) {
      m.emissiveIntensity = on ? 1 : 0;
    }
  }

  revealBridge() {
    this.bridge.visible = true;
  }

  revealBloom() {
    this.rewardBloom.visible = true;
    this.rewardBloom.userData.grow = 0; // animate scale up
  }

  update(dt) {
    this.t += dt;
    const t = this.t;

    // gentle grass/flower sway
    for (const s of this.swayers) {
      s.mesh.rotation.z = Math.sin(t * 1.6 + s.phase) * s.amp;
    }

    // pond ripples
    if (this.pondWater) {
      const geo = this.pondWater.geometry;
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i);
        const r = Math.sqrt(x * x + y * y);
        pos.setZ(i, Math.sin(r * 3.4 - t * 2.2) * 0.045 * Math.min(1, r));
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }

    // landing beacon pulse
    if (this.landingBeacon) {
      const p = (Math.sin(t * 2.0) + 1) * 0.5;
      this.landingBeacon.material.emissiveIntensity = 0.4 + p * 1.1;
      this.landingBeacon.scale.setScalar(0.9 + p * 0.18);
    }
    if (this.landingRing) this.landingRing.rotation.z += dt * 0.6;

    // reward bloom pop-in
    const rb = this.rewardBloom;
    if (rb && rb.visible && rb.userData.grow < 1) {
      rb.userData.grow = Math.min(1, rb.userData.grow + dt * 1.4);
      const e = easeOutBack(rb.userData.grow);
      rb.scale.setScalar(e);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Structure builders — primitives only, clay palette                  */
/* ------------------------------------------------------------------ */

function buildHome() {
  const g = new THREE.Group();
  const body = box(2.2, 1.7, 2.0, clay(0xfff0d2));
  body.position.y = 0.85;
  g.add(body);

  const roof = cone(1.9, 1.3, clay(0xe08a6b), 4);
  roof.position.y = 2.35;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);

  const door = box(0.6, 0.95, 0.1, clay(0xb06a45));
  door.position.set(0, 0.48, 1.02);
  g.add(door);
  const knob = ball(0.06, clay(0xffe28a, { emissive: 0xffce5a, emissiveIntensity: 0.3 }));
  knob.position.set(0.16, 0.5, 1.08);
  g.add(knob);

  const win = ball(0.28, clay(0xbfe0ff, { emissive: 0x8fc7ff, emissiveIntensity: 0.15 }));
  win.scale.set(1, 1, 0.25);
  win.position.set(-0.65, 1.05, 1.02);
  g.add(win);

  const chimney = box(0.35, 0.7, 0.35, clay(0xc06a48));
  chimney.position.set(0.7, 2.3, -0.2);
  g.add(chimney);

  return g;
}

function buildWorkshop() {
  const g = new THREE.Group();
  const body = box(2.0, 1.4, 1.7, clay(0xcaa06a));
  body.position.y = 0.7;
  g.add(body);

  // planks
  for (let i = 0; i < 3; i++) {
    const plank = box(2.02, 0.06, 1.72, clay(0xb98a55));
    plank.position.y = 0.35 + i * 0.45;
    g.add(plank);
  }

  const roof = box(2.3, 0.28, 2.0, clay(0x5bb0a0));
  roof.position.y = 1.5;
  roof.rotation.z = 0.12;
  g.add(roof);

  const crate = box(0.6, 0.6, 0.6, clay(0xb98a55));
  crate.position.set(1.35, 0.3, 0.4);
  crate.rotation.y = 0.4;
  g.add(crate);

  // grinding wheel
  const wheel = cyl(0.35, 0.35, 0.12, clay(0x9aa0a6), 20);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-1.25, 0.55, 0.3);
  g.add(wheel);
  const post = box(0.12, 0.5, 0.12, clay(0x8a6a45));
  post.position.set(-1.25, 0.25, 0.3);
  g.add(post);

  return g;
}

function buildObservatory(lightRefs) {
  const g = new THREE.Group();

  // raised grassy hill
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(1.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    clay(0x83c268, { roughness: 1 })
  );
  hill.scale.y = 0.5;
  g.add(hill);

  const base = cyl(1.0, 1.15, 1.2, clay(0xcfc6b4), 24);
  base.position.y = 1.05;
  g.add(base);

  // windows that will glow on reward
  for (let i = 0; i < 4; i++) {
    const m = clay(0xffd98a, { emissive: 0xffbe4d, emissiveIntensity: 0 });
    lightRefs.push(m);
    const w = box(0.28, 0.4, 0.12, m);
    const a = (i / 4) * Math.PI * 2;
    w.position.set(Math.cos(a) * 1.0, 1.05, Math.sin(a) * 1.0);
    w.lookAt(w.position.clone().multiplyScalar(2));
    g.add(w);
  }

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    clay(0xdfe6ef)
  );
  dome.position.y = 1.65;
  g.add(dome);

  // telescope poking out
  const scope = cyl(0.14, 0.2, 1.1, clay(0x6b7280), 16);
  scope.position.set(0.2, 2.05, 0.2);
  scope.rotation.set(-0.7, 0, -0.5);
  g.add(scope);

  return g;
}

function buildPond() {
  const g = new THREE.Group();

  const basin = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 28),
    clay(0x6a4a35, { roughness: 1 })
  );
  basin.rotation.x = -Math.PI / 2;
  basin.position.y = 0.02;
  g.add(basin);

  const waterGeo = new THREE.CircleGeometry(1.42, 40);
  const water = new THREE.Mesh(
    waterGeo,
    new THREE.MeshStandardMaterial({
      color: 0x5bb6db,
      roughness: 0.25,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9,
      emissive: 0x2b7fb0,
      emissiveIntensity: 0.12,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.09;
  g.add(water);
  g.userData.water = water;

  // ring of stones
  const rng = mulberry32(77);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = 0.16 + rng() * 0.14;
    const stone = blob(s, clay(0x9aa0a6), 1);
    stone.position.set(Math.cos(a) * 1.55, 0.08, Math.sin(a) * 1.55);
    stone.scale.y = 0.7;
    g.add(stone);
  }

  // a lily pad
  const pad = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), clay(0x6fae5a));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0.4, 0.11, -0.3);
  g.add(pad);

  return g;
}

function buildLandingPad() {
  const g = new THREE.Group();

  const pad = cyl(1.35, 1.5, 0.18, clay(0xd8d2c4), 8);
  pad.position.y = 0.09;
  g.add(pad);

  const inner = cyl(1.0, 1.0, 0.06, clay(0xeef3f7), 8);
  inner.position.y = 0.19;
  g.add(inner);

  // glowing ring (spins) — where visitors will arrive
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x8fd7ff,
    emissive: 0x66c6ff,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 12, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.24;
  g.add(ring);
  g.userData.ring = ring;

  // central beacon
  const beacon = ball(
    0.22,
    new THREE.MeshStandardMaterial({
      color: 0xbfe9ff,
      emissive: 0x8fd7ff,
      emissiveIntensity: 1.0,
      roughness: 0.3,
    })
  );
  beacon.position.y = 0.5;
  g.add(beacon);
  g.userData.beacon = beacon;

  return g;
}

function buildTree(seed = 0) {
  const g = new THREE.Group();
  const rng = mulberry32(Math.floor(seed * 97) + 3);
  const h = 1.3 + rng() * 0.6;
  const trunk = cyl(0.16, 0.24, h, clay(0x9b6a43), 10);
  trunk.position.y = h / 2;
  g.add(trunk);

  const crown = new THREE.Group();
  crown.position.y = h;
  const foliageColor = rng() > 0.5 ? 0x7bbf6a : 0x6aa85c;
  const f1 = blob(0.8 + rng() * 0.2, clay(foliageColor, { flat: true }), 1);
  f1.position.y = 0.5;
  crown.add(f1);
  const f2 = blob(0.55, clay(0x8ccf78, { flat: true }), 1);
  f2.position.set(0.4, 0.2, 0.2);
  crown.add(f2);
  crown.userData.sway = 0.05; // whole crown sways gently
  g.add(crown);

  return g;
}

function buildRock(seed = 0) {
  const g = new THREE.Group();
  const rng = mulberry32(Math.floor(seed * 53) + 9);
  const r = 0.45 + rng() * 0.4;
  const rock = blob(r, clay(0x9aa0a6, { flat: true }), 1);
  rock.scale.set(1, 0.7 + rng() * 0.2, 1);
  rock.position.y = r * 0.5;
  rock.rotation.y = rng() * Math.PI;
  g.add(rock);
  if (rng() > 0.5) {
    const small = blob(r * 0.5, clay(0xb0b6bb, { flat: true }), 1);
    small.position.set(r * 0.8, r * 0.3, 0);
    g.add(small);
  }
  return g;
}

function buildFlower(seed = 0) {
  const g = new THREE.Group();
  const rng = mulberry32(Math.floor(seed * 131) + 5);
  const palette = [0xf2a6c2, 0xf6d365, 0xffffff, 0xb9a6ff, 0xff9a76];
  const color = palette[Math.floor(rng() * palette.length)];
  const h = 0.5 + rng() * 0.4;

  const swayGroup = new THREE.Group();
  const stem = cyl(0.03, 0.04, h, clay(0x6fae5a), 6);
  stem.position.y = h / 2;
  swayGroup.add(stem);

  const head = new THREE.Group();
  head.position.y = h;
  const center = ball(0.09, clay(0xffd98a), 10);
  head.add(center);
  const petals = 6;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const petal = ball(0.09, clay(color));
    petal.scale.set(1, 0.4, 0.6);
    petal.position.set(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13);
    head.add(petal);
  }
  swayGroup.add(head);
  swayGroup.userData.sway = 0.12;
  g.add(swayGroup);

  const leaf = ball(0.1, clay(0x6fae5a));
  leaf.scale.set(1, 0.3, 0.5);
  leaf.position.set(0.1, h * 0.4, 0);
  g.add(leaf);

  return g;
}

function buildBridge() {
  const g = new THREE.Group();
  const plankMat = clay(0xb98a55);
  const arch = 0.5;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const plank = box(0.5, 0.08, 0.34, plankMat);
    plank.position.set((f - 0.5) * 2.2, Math.sin(f * Math.PI) * arch + 0.2, 0);
    plank.rotation.z = Math.cos(f * Math.PI) * 0.5;
    g.add(plank);
  }
  // rope rails
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const post = cyl(0.03, 0.03, 0.3, clay(0x8a6a45), 6);
      post.position.set((f - 0.5) * 2.2, Math.sin(f * Math.PI) * arch + 0.4, side * 0.2);
      g.add(post);
    }
  }
  return g;
}

function buildRewardBloom() {
  // a big celebratory flower that appears in the empty meadow
  const g = new THREE.Group();
  const h = 1.4;
  const stem = cyl(0.08, 0.12, h, clay(0x5fae55), 10);
  stem.position.y = h / 2;
  g.add(stem);
  const head = new THREE.Group();
  head.position.y = h;
  const center = ball(
    0.3,
    clay(0xffd166, { emissive: 0xffb23e, emissiveIntensity: 0.4 })
  );
  head.add(center);
  const petals = 10;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const petal = ball(0.26, clay(0xff9ec4));
    petal.scale.set(1, 0.35, 0.7);
    petal.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
    petal.lookAt(0, 0, 0);
    head.add(petal);
  }
  g.add(head);
  return g;
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

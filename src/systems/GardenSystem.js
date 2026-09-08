import * as THREE from "three";
import { clay, ball, box, cyl, cone, shade } from "../world/materials.js";
import { LAYOUT, dirOf } from "../world/layout.js";
import { getPlant } from "../data/plants.js";
import { LESSON, queryFlag } from "../data/lesson.js";

const STAGE_TIME = queryFlag("fast") ? 0.35 : 2.6; // seconds per growth stage
const INTERACT_RANGE = 2.6; // world units from Pibo to a spot

/**
 * The starter garden: three raised planter beds the player can plant in, watch
 * grow through stages, and inspect to learn a vocabulary card. Growing all
 * three fires `onAllGrown` so the world can reward the player. Recalling a
 * word marks the spot `learned` (language beat, separate from bloom).
 *
 * Interaction is exposed through getInteractable(worldPos): the Game asks each
 * frame what (if anything) is in reach and what pressing E would do, so this
 * system owns all garden state while staying decoupled from input/UI.
 */
export class GardenSystem {
  constructor(planet) {
    this.planet = planet;
    this.spots = [];
    this.onAllGrown = null;
    this.onBloom = null;
    this._rewarded = false;
  }

  build() {
    LAYOUT.garden.forEach((entry, i) => {
      const bed = buildPlanterBed();
      this.planet.placeOnSurface(shade(bed), dirOf(entry), { yaw: entry.lon });
      const worldPos = bed.getWorldPosition(new THREE.Vector3());
      this.spots.push({
        index: i,
        dir: dirOf(entry),
        worldPos,
        holder: bed.userData.holder,
        state: "empty", // empty | growing | bloomed
        plantId: null,
        stage: 0,
        timer: 0,
        inspected: false,
        learned: false,
        plantMesh: null,
        popT: 0,
      });
    });
    return this;
  }

  get grownCount() {
    return this.spots.filter((s) => s.state === "bloomed").length;
  }

  get learnedCount() {
    return this.spots.filter((s) => s.learned).length;
  }

  /** What can Pibo do at the nearest spot right now? */
  getInteractable(worldPos) {
    let best = null, bestD = INTERACT_RANGE;
    for (const s of this.spots) {
      const d = worldPos.distanceTo(s.worldPos);
      if (d < bestD) { best = s; bestD = d; }
    }
    if (!best) return null;

    if (best.state === "empty") {
      return { spot: best, kind: "plant", label: "Plant something" };
    }
    if (best.state === "growing") {
      return { spot: best, kind: "wait", label: "Growing…", disabled: true };
    }
    // bloomed — first look is a vocab card; later looks can review
    const label = (best.inspected || best.learned)
      ? LESSON.ui.inspectAgain
      : LESSON.ui.inspectNew;
    return { spot: best, kind: "inspect", label };
  }

  plant(spot, plantId) {
    if (spot.state !== "empty") return;
    spot.plantId = plantId;
    spot.state = "growing";
    spot.stage = 0;
    spot.timer = 0;
    this._setStageMesh(spot);
  }

  inspect(spot) {
    const p = getPlant(spot.plantId);
    if (p) spot.inspected = true;
    return p;
  }

  markLearned(spot) {
    if (spot) spot.learned = true;
  }

  update(dt) {
    for (const s of this.spots) {
      if (s.state === "growing") {
        s.timer += dt;
        const plant = getPlant(s.plantId);
        if (s.timer >= STAGE_TIME) {
          s.timer = 0;
          s.stage++;
          if (s.stage >= plant.stages - 1) {
            s.stage = plant.stages - 1;
            s.state = "bloomed";
            this._setStageMesh(s);
            if (this.onBloom) this.onBloom(s);
          } else {
            this._setStageMesh(s);
          }
        }
      }
      // pop-in + idle sway on the current plant mesh
      if (s.plantMesh) {
        if (s.popT < 1) {
          s.popT = Math.min(1, s.popT + dt * 2.2);
          s.plantMesh.scale.setScalar(easeOutBack(s.popT));
        }
        s.plantMesh.rotation.z = Math.sin(performance.now() * 0.001 * 1.4 + s.index) * 0.05;
      }
    }

    if (!this._rewarded && this.grownCount === this.spots.length) {
      this._rewarded = true;
      if (this.onAllGrown) this.onAllGrown();
    }
  }

  _setStageMesh(spot) {
    if (spot.plantMesh) {
      spot.holder.remove(spot.plantMesh);
      disposeTree(spot.plantMesh);
    }
    const plant = getPlant(spot.plantId);
    const mesh = shade(buildStage(plant, spot.stage), true, false);
    spot.plantMesh = mesh;
    spot.popT = 0;
    mesh.scale.setScalar(0.001);
    spot.holder.add(mesh);
  }
}

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

function buildPlanterBed() {
  const g = new THREE.Group();
  const wood = clay(0xb0794a);
  const size = 0.8, th = 0.12, hgt = 0.28;
  for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const horiz = ax === 0;
    const rail = box(horiz ? size * 2 : th, hgt, horiz ? th : size * 2, wood);
    rail.position.set(ax * size, hgt / 2, az * size);
    g.add(rail);
  }
  const soil = box(size * 2 - th, 0.16, size * 2 - th, clay(0x6a4a33, { roughness: 1 }));
  soil.position.y = 0.2;
  g.add(soil);
  // little seed markers in the soil
  const holder = new THREE.Group();
  holder.position.y = 0.28;
  g.add(holder);
  g.userData.holder = holder;
  return g;
}

function buildStage(plant, stage) {
  const g = new THREE.Group();
  const stemMat = clay(plant.leaf ?? 0x6fae5a);

  if (stage === 0) {
    // a sprouting seed: a nub with two tiny leaves
    const nub = ball(0.06, clay(0x8a5a3a));
    nub.position.y = 0.04;
    g.add(nub);
    for (const sx of [-1, 1]) {
      const leaf = ball(0.07, stemMat);
      leaf.scale.set(1, 0.35, 0.6);
      leaf.position.set(sx * 0.06, 0.1, 0);
      leaf.rotation.z = sx * 0.7;
      g.add(leaf);
    }
    return g;
  }

  // stems for later stages
  const h = stage === 1 ? 0.28 : stage === 2 ? 0.5 : 0.7;
  const stem = cyl(0.03, 0.05, h, stemMat, 8);
  stem.position.y = h / 2;
  g.add(stem);
  for (const sx of [-1, 1]) {
    const leaf = ball(0.1, stemMat);
    leaf.scale.set(1, 0.4, 0.65);
    leaf.position.set(sx * 0.1, h * 0.45, 0);
    leaf.rotation.z = sx * 0.7;
    g.add(leaf);
  }

  if (stage === 1) return g;

  if (stage === 2) {
    // a closed bud
    const bud = ball(0.12, clay(plant.accent));
    bud.scale.set(1, 1.4, 1);
    bud.position.y = h + 0.05;
    g.add(bud);
    return g;
  }

  // stage 3: full bloom, per type
  const head = new THREE.Group();
  head.position.y = h + 0.02;
  if (plant.type === "sun") {
    const center = ball(0.14, clay(plant.accent));
    head.add(center);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = ball(0.12, clay(plant.color));
      petal.scale.set(1, 0.3, 0.5);
      petal.position.set(Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2);
      petal.lookAt(0, 0, 0);
      head.add(petal);
    }
  } else if (plant.type === "bell") {
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const bell = cone(0.11, 0.2, clay(plant.color), 12);
      bell.rotation.x = Math.PI; // opening downward
      bell.position.set(Math.cos(a) * 0.12, -0.05 - i * 0.02, Math.sin(a) * 0.12);
      head.add(bell);
    }
  } else {
    // fern: arching fronds instead of a flower
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const frond = cyl(0.015, 0.03, 0.4, clay(plant.color), 6);
      frond.position.set(Math.cos(a) * 0.08, 0.1, Math.sin(a) * 0.08);
      frond.rotation.z = Math.cos(a) * 0.6;
      frond.rotation.x = Math.sin(a) * 0.6;
      head.add(frond);
    }
  }
  g.add(head);
  return g;
}

function easeOutBack(x) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.geometry?.dispose();
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
      else o.material?.dispose();
    }
  });
}

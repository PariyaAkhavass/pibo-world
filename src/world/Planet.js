import * as THREE from "three";
import { clay, shade } from "./materials.js";
import { latLonToDir } from "../core/SphereMath.js";

/**
 * The Pocket Planet itself: a small sphere the player lives on.
 *
 * The planet is a self-contained unit (its own THREE.Group) so that later we
 * can instantiate several of them, give them owners, and place them in a wider
 * sky. Everything that sits on the surface is parented to this group.
 */
export class Planet {
  constructor(config = {}) {
    this.radius = config.radius ?? 10;
    this.group = new THREE.Group();
    this.surface = new THREE.Group(); // props/entities live here
    this.group.add(this.surface);

    this._build(config);
  }

  _build(config) {
    // Core ground sphere, gently two-toned via a second slightly-smaller shell
    const ground = new THREE.Mesh(
      new THREE.IcosahedronGeometry(this.radius, 24),
      clay(config.grass ?? 0x8fce74, { roughness: 0.95 })
    );
    ground.receiveShadow = true;
    ground.castShadow = true;
    this.group.add(ground);
    this.ground = ground;

    // A warm "soil" underside peeking out — sells the floating-toy look
    const soil = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 0.985, 32, 32),
      clay(config.soil ?? 0xcaa46a, { roughness: 1 })
    );
    this.group.add(soil);

    // Scatter faint darker grass patches for texture (flat decals on surface)
    this._grassPatches(config.grassDark ?? 0x7cbb63);
  }

  _grassPatches(color) {
    const patchMat = clay(color, { roughness: 1 });
    const group = new THREE.Group();
    const rng = mulberry32(1337);
    for (let i = 0; i < 26; i++) {
      const lat = 8 + rng() * 60;
      const lon = rng() * 360;
      const dir = latLonToDir(lat, lon);
      const r = 0.5 + rng() * 1.4;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 14), patchMat);
      this.placeOnSurface(patch, dir, { lift: 0.02, flatDecal: true });
      patch.rotateZ(rng() * Math.PI);
      group.add(patch);
    }
    shade(group, false, true);
    this.surface.add(group);
  }

  /** World-space point for a surface direction, lifted `lift` above ground. */
  pointAt(dir, lift = 0) {
    return dir.clone().normalize().multiplyScalar(this.radius + lift);
  }

  /**
   * Place an object on the surface at a unit direction.
   * By default orients its +Y up along the surface normal.
   */
  placeOnSurface(obj, dir, { lift = 0, flatDecal = false, yaw = 0 } = {}) {
    const n = dir.clone().normalize();
    obj.position.copy(n).multiplyScalar(this.radius + lift);
    if (flatDecal) {
      // circle geometry faces +Z; lay it flat against the surface
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    } else {
      obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    }
    if (yaw) obj.rotateY(yaw); // spin around the surface normal
    this.surface.add(obj);
    return obj;
  }
}

// tiny deterministic RNG so the world looks the same every visit
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

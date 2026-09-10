import * as THREE from "three";
import { clay, shade } from "./materials.js";
import { latLonToDir } from "../core/SphereMath.js";
import { biomeColor, oceanAmount, waterTint } from "./biome.js";

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
    // Core ground sphere — vertex-colored so a grassy village cap meets a
    // planet-scale ocean instead of a uniform green ball with a tiny pond.
    const geo = new THREE.IcosahedronGeometry(this.radius, 24);
    this._paintBiomes(geo);
    const groundMat = clay(0xffffff, { roughness: 0.95 });
    groundMat.vertexColors = true;
    const ground = new THREE.Mesh(geo, groundMat);
    ground.receiveShadow = true;
    ground.castShadow = true;
    this.group.add(ground);
    this.ground = ground;

    this._buildOcean(geo);

    // A warm "soil" underside peeking out — sells the floating-toy look
    const soil = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius * 0.985, 32, 32),
      clay(config.soil ?? 0xcaa46a, { roughness: 1 })
    );
    this.group.add(soil);

    // Scatter faint darker grass patches for texture (flat decals on land only)
    this._grassPatches(config.grassDark ?? 0x7cbb63);
  }

  _paintBiomes(geo) {
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      biomeColor(v, c);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }

  _buildOcean(sourceGeo) {
    const srcPos = sourceGeo.attributes.position;
    const srcIdx = sourceGeo.index;
    if (!srcIdx) return;
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const tint = new THREE.Color();
    const verts = [];
    const colors = [];
    const lift = this.radius * 1.006;

    const push = (v) => {
      v.normalize();
      verts.push(v.x * lift, v.y * lift, v.z * lift);
      waterTint(v, tint);
      colors.push(tint.r, tint.g, tint.b);
    };

    for (let i = 0; i < srcIdx.count; i += 3) {
      vA.fromBufferAttribute(srcPos, srcIdx.getX(i));
      vB.fromBufferAttribute(srcPos, srcIdx.getX(i + 1));
      vC.fromBufferAttribute(srcPos, srcIdx.getX(i + 2));
      const mid = vA.clone().add(vB).add(vC).normalize();
      if (oceanAmount(mid) < 0.28) continue;
      push(vA); push(vB); push(vC);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
      metalness: 0.04,
      transparent: true,
      opacity: 0.86,
      vertexColors: true,
      emissive: 0x165a82,
      emissiveIntensity: 0.16,
      depthWrite: false,
    });

    const water = new THREE.Mesh(geo, mat);
    water.receiveShadow = true;
    water.renderOrder = 1;
    this.group.add(water);
    this.oceanWater = water;
    this.oceanBase = Float32Array.from(verts);
    this.t = 0;
  }

  update(dt) {
    if (!this.oceanWater) return;
    this.t += dt;
    const pos = this.oceanWater.geometry.attributes.position;
    const base = this.oceanBase;
    const t = this.t;
    for (let i = 0; i < pos.count; i++) {
      const ox = base[i * 3], oy = base[i * 3 + 1], oz = base[i * 3 + 2];
      const len = Math.hypot(ox, oy, oz) || 1;
      const nx = ox / len, ny = oy / len, nz = oz / len;
      const wave = Math.sin(ox * 0.62 + oz * 0.44 - t * 2.05) * 0.05
        + Math.sin(oy * 0.9 + ox * 0.28 + t * 1.35) * 0.028;
      const s = len + wave;
      pos.setXYZ(i, nx * s, ny * s, nz * s);
    }
    pos.needsUpdate = true;
  }

  _grassPatches(color) {
    const patchMat = clay(color, { roughness: 1 });
    const group = new THREE.Group();
    const rng = mulberry32(1337);
    let placed = 0;
    let guard = 0;
    while (placed < 26 && guard < 80) {
      guard++;
      const lat = 8 + rng() * 52;
      const lon = rng() * 360;
      const dir = latLonToDir(lat, lon);
      if (oceanAmount(dir) > 0.22) continue;
      const r = 0.5 + rng() * 1.4;
      const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 14), patchMat);
      this.placeOnSurface(patch, dir, { lift: 0.02, flatDecal: true });
      patch.rotateZ(rng() * Math.PI);
      group.add(patch);
      placed++;
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

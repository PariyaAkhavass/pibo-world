import * as THREE from "three";
import { ASSETS } from "../data/assets.js";
import { GROUND_BOUNDS, GROUND_Y, LAND } from "./layout.js";

/**
 * The home cliff, two islets, and the sea. Surfaces are textured from the
 * asset manifest so the painted ground can be replaced without touching code.
 */
export class Island {
  constructor(scene, textures, basis) {
    this.group = new THREE.Group();
    this.group.name = "island";
    scene.add(this.group);
    this.textures = textures;
    this.basis = basis;

    this._buildSky();
    this._buildOcean();
    this._buildLand(LAND.home, textures.get(ASSETS.islandTop.src), false);
    this._buildDisc(LAND.lighthouse, textures.get(ASSETS.grassTile.src));
    this._buildDisc(LAND.arcade, textures.get(ASSETS.grassTile.src));
  }

  _mat(map, extra = {}) {
    return new THREE.MeshBasicMaterial({
      map: map || null,
      color: map ? 0xffffff : 0xc5e4a0,
      side: THREE.DoubleSide,
      ...extra,
    });
  }

  _buildSky() {
    const tex = this.textures.get(ASSETS.sky.src);
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 52),
      this._mat(tex, { depthWrite: false })
    );
    sky.quaternion.copy(this.basis.quaternion);
    sky.position.copy(this.basis.offsetDir).multiplyScalar(-36);
    sky.position.y += 6;
    sky.renderOrder = -20;
    this.group.add(sky);
  }

  _buildOcean() {
    const tex = this.textures.get(ASSETS.ocean.src);
    if (tex) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.2, 2.2);
    }
    const geo = new THREE.CircleGeometry(46, 64);
    geo.rotateX(-Math.PI / 2);
    const ocean = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0x8fd0e8,
      transparent: true,
      depthWrite: false,
    }));
    ocean.position.set(2.5, 0, 1.2);
    ocean.renderOrder = -10;
    this.ocean = ocean;
    this.group.add(ocean);
  }

  _buildLand(points, texture, repeating) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], -points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], -points[i][1]);
    const geo = new THREE.ShapeGeometry(shape, 8);
    this._uvWorld(geo, repeating);
    geo.rotateX(-Math.PI / 2);
    const top = new THREE.Mesh(geo, this._mat(texture));
    top.position.y = GROUND_Y;
    top.receiveShadow = false;
    this.group.add(top);
    this._skirt(points);
    this._rim(points);
  }

  _buildDisc(disc, texture) {
    const steps = 14;
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([
        disc.x + Math.cos(a) * disc.r,
        disc.z + Math.sin(a) * disc.r,
      ]);
    }
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    }
    this._buildLand(pts, texture, true);
  }

  _uvWorld(geo, repeating) {
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const { minX, maxX, minZ, maxZ } = GROUND_BOUNDS;
    const w = maxX - minX;
    const h = maxZ - minZ;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = -pos.getY(i);
      if (repeating) {
        uv.setXY(i, x / 4, z / 4);
      } else {
        uv.setXY(i, (x - minX) / w, (z - minZ) / h);
      }
    }
    uv.needsUpdate = true;
  }

  _skirt(points) {
    const tex = this.textures.get(ASSETS.cliff.src);
    if (tex) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
    }
    const positions = [];
    const uvs = [];
    let run = 0;
    const top = GROUND_Y;
    const bot = -0.55;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u0 = run / 2.2;
      const u1 = (run + len) / 2.2;
      run += len;
      positions.push(
        a[0], top, a[1], b[0], top, b[1], a[0], bot, a[1],
        b[0], top, b[1], b[0], bot, b[1], a[0], bot, a[1]
      );
      uvs.push(
        u0, 1, u1, 1, u0, 0,
        u1, 1, u1, 0, u0, 0
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0xc9b6a2,
      side: THREE.DoubleSide,
    }));
    this.group.add(mesh);
  }

  _rim(points) {
    const pts = [];
    for (const [x, z] of points) pts.push(new THREE.Vector3(x, GROUND_Y + 0.02, z));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: 0x6d5346 }));
    this.group.add(line);
  }

  update(dt) {
    if (!this.ocean?.material?.map) return;
    this.ocean.material.map.offset.x += dt * 0.008;
    this.ocean.material.map.offset.y += dt * 0.004;
  }
}

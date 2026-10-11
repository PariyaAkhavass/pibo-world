import * as THREE from "three";
import { ASSETS } from "../data/assets.js";
import { PLACEMENTS, GROUND_Y, LAYOUT } from "./layout.js";

/**
 * One camera-facing card per placed object. The image is whatever the asset
 * manifest points at, so swapping a PNG does not require a new mesh.
 */
export class IsoSprite {
  constructor(asset, texture, quaternion) {
    this.asset = asset;
    this.ground = new THREE.Vector3();
    const geo = new THREE.PlaneGeometry(asset.width, asset.height);
    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.12,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.pivot = new THREE.Group();
    this.pivot.quaternion.copy(quaternion);
    const ax = (asset.anchor?.x ?? 0.5) - 0.5;
    const ay = (asset.anchor?.y ?? 0) - 0.5;
    this.mesh.position.set(-ax * asset.width, -ay * asset.height, 0);
    this.baseLocalY = this.mesh.position.y;
    this.pivot.add(this.mesh);
    this.group = new THREE.Group();
    this.group.add(this.pivot);
  }

  place(x, y, z) {
    this.ground.set(x, y, z);
    this.group.position.copy(this.ground);
  }

  setVisible(v) {
    this.group.visible = v;
  }
}

export class SpriteSet {
  constructor(scene, textures, basis) {
    this.scene = scene;
    this.basis = basis;
    this.items = new Map();
    this.group = new THREE.Group();
    this.group.name = "sprites";
    scene.add(this.group);

    for (const place of PLACEMENTS) {
      const asset = ASSETS[place.asset];
      if (!asset?.src) continue;
      const tex = textures.get(asset.src);
      const sprite = new IsoSprite(asset, tex, basis.quaternion);
      const y = place.y ?? GROUND_Y;
      sprite.place(place.x, y, place.z);
      sprite.id = place.id;
      sprite.sky = !!place.sky;
      if (place.hidden) sprite.setVisible(false);
      this.group.add(sprite.group);
      this.items.set(place.id, sprite);
    }

    this._buildBeam(textures);
  }

  _buildBeam(textures) {
    const tex = textures.get(ASSETS.lighthouseBeam.src);
    const geo = new THREE.PlaneGeometry(8.5, 1.7);
    geo.translate(4.25, 0, 0);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.beam = new THREE.Mesh(geo, mat);
    this.beam.rotation.z = 0.42;
    this.beam.renderOrder = 20;
    this.beamPivot = new THREE.Group();
    const towardCam = this.basis.offsetDir.clone().normalize();
    this.beamPivot.position.set(
      LAYOUT.lighthouse.x + towardCam.x * 0.35,
      GROUND_Y + 3.15,
      LAYOUT.lighthouse.z + towardCam.z * 0.35
    );
    this.beamPivot.add(this.beam);
    this.scene.add(this.beamPivot);
    this._beamT = 0.6;
  }

  show(id) {
    this.items.get(id)?.setVisible(true);
  }

  update(dt) {
    this._beamT += dt * 0.28;
    this.beamPivot.rotation.y = Math.sin(this._beamT) * 0.9 - 0.4;

    const clouds = ["cloud-1", "cloud-2", "cloud-3", "cloud-4"];
    clouds.forEach((id, i) => {
      const sprite = this.items.get(id);
      if (!sprite) return;
      const place = PLACEMENTS.find((p) => p.id === id);
      if (!place) return;
      const drift = Math.sin(this._beamT * 0.35 + i) * 0.35;
      sprite.place(place.x + drift, place.y, place.z);
    });
  }
}

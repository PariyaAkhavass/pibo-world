import * as THREE from "three";
import { ASSETS } from "../data/assets.js";

/**
 * The concept painting, faced straight at the camera so the coastline,
 * cliffs, foam, and path stay exactly as painted.
 */
export class Island {
  constructor(scene, textures) {
    this.group = new THREE.Group();
    this.group.name = "island";
    scene.add(this.group);

    const asset = ASSETS.plate;
    const tex = textures.get(asset.src);
    const geo = new THREE.PlaneGeometry(asset.width, asset.height);
    const mat = new THREE.MeshBasicMaterial({
      map: tex || null,
      color: tex ? 0xffffff : 0xc5d6d8,
      depthWrite: false,
    });
    const plate = new THREE.Mesh(geo, mat);
    plate.position.set(0, 0, -8);
    plate.renderOrder = -20;
    this.group.add(plate);
  }

  update() {}
}

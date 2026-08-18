import * as THREE from "three";
import { clay, ball, blob, shade } from "./materials.js";

/**
 * Ambient life that makes the planet feel alive even when the player stands
 * still: soft clouds drifting around the globe and a couple of butterflies
 * looping just above the surface. Added to the scene root so clouds pass both
 * in front of and behind the planet.
 */
export class Ambient {
  constructor(scene, planetRadius = 10) {
    this.R = planetRadius;
    this.clouds = [];
    this.flyers = [];
    this._buildClouds(scene);
    this._buildButterflies(scene);
  }

  _buildClouds(scene) {
    const mat = clay(0xffffff, { roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      const puffs = 2 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = blob(0.7 + Math.random() * 0.6, mat, 1);
        puff.position.set((p - puffs / 2) * 0.8, Math.random() * 0.2, Math.random() * 0.3);
        puff.scale.set(1, 0.6, 0.8);
        cloud.add(puff);
      }
      shade(cloud, false, false);

      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        1 + Math.random(),
        Math.random() - 0.5
      ).normalize();
      const radius = this.R + 3.5 + Math.random() * 4;
      const base = new THREE.Vector3(1, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * Math.PI - Math.PI / 2)
        .multiplyScalar(radius);
      this.clouds.push({
        mesh: cloud,
        axis,
        base,
        angle: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.04,
      });
      scene.add(cloud);
    }
  }

  _buildButterflies(scene) {
    const colors = [0xff9ec4, 0xffd166, 0x9ad0ff];
    for (let i = 0; i < 3; i++) {
      const bf = new THREE.Group();
      const bodyMat = clay(0x4a3b35);
      const body = ball(0.06, bodyMat, 8);
      body.scale.set(1, 1, 1.8);
      bf.add(body);
      const wingMat = clay(colors[i % colors.length], { flat: true });
      const wings = [];
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), wingMat);
        wing.position.set(sx * 0.02, 0, 0);
        wing.userData.side = sx;
        bf.add(wing);
        wings.push(wing);
      }
      shade(bf, false, false);

      this.flyers.push({
        mesh: bf,
        wings,
        axis: new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize(),
        radius: this.R + 0.7 + Math.random() * 0.6,
        angle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.4,
        bob: Math.random() * Math.PI * 2,
        flap: Math.random() * Math.PI * 2,
      });
      scene.add(bf);
    }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.angle += c.speed * dt;
      c.mesh.position.copy(c.base).applyAxisAngle(c.axis, c.angle);
      // face roughly tangent to orbit for a nicer read
      c.mesh.lookAt(c.mesh.position.clone().add(c.axis));
    }

    for (const f of this.flyers) {
      f.angle += f.speed * dt;
      f.bob += dt * 3;
      const r = f.radius + Math.sin(f.bob) * 0.35;
      const pos = new THREE.Vector3(1, 0, 0)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.5)
        .multiplyScalar(r)
        .applyAxisAngle(f.axis, f.angle);
      f.mesh.position.copy(pos);
      f.mesh.up.copy(pos).normalize();
      // look along direction of travel
      const ahead = pos.clone().applyAxisAngle(f.axis, 0.05);
      f.mesh.lookAt(ahead);

      // flap
      f.flap += dt * 18;
      const a = Math.sin(f.flap) * 0.9 + 0.5;
      f.wings[0].rotation.y = a;
      f.wings[1].rotation.y = -a;
    }
  }
}

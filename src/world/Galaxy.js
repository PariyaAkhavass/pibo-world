import * as THREE from "three";
import { clay, shade } from "./materials.js";

/**
 * A toy-galaxy backdrop for the family voyage: hard-edged clay planets and a
 * field of stars the pot-ship flies through after the letter.
 */
export class Galaxy {
  constructor(scene) {
    this.scene = scene;
    this.t = 0;
    this.active = false;
    this.group = new THREE.Group();
    this.group.visible = false;
    this.planets = [];
    this._buildStars();
    this._buildPlanets();
    scene.add(this.group);
  }

  begin(originDir) {
    this.active = true;
    this.group.visible = true;
    const axis = originDir.clone().normalize();
    this.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    this.starField.rotation.y += dt * 0.015;
    for (const p of this.planets) {
      p.mesh.rotation.y += dt * p.spin;
      p.mesh.rotation.x += dt * p.spin * 0.35;
    }
  }

  _buildStars() {
    const count = 900;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 90 + Math.random() * 220;
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xfff4d2,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.92,
    });
    this.starField = new THREE.Points(geo, mat);
    this.group.add(this.starField);
  }

  _buildPlanets() {
    const shapes = [
      { geo: () => new THREE.IcosahedronGeometry(1, 0), color: 0xff8a6b, r: 3.2 },
      { geo: () => new THREE.BoxGeometry(1, 1, 1), color: 0x8fd4ff, r: 2.4 },
      { geo: () => new THREE.OctahedronGeometry(1, 0), color: 0xffe27a, r: 2.8 },
      { geo: () => new THREE.DodecahedronGeometry(1, 0), color: 0xc9a6ff, r: 3.6 },
      { geo: () => new THREE.TetrahedronGeometry(1, 0), color: 0x7ee0b0, r: 2.2 },
      { geo: () => new THREE.IcosahedronGeometry(1, 0), color: 0xffb4d9, r: 4.0 },
      { geo: () => new THREE.BoxGeometry(1, 1, 1), color: 0xf6d365, r: 1.8 },
      { geo: () => new THREE.OctahedronGeometry(1, 0), color: 0x9aa0ff, r: 3.1 },
    ];

    shapes.forEach((s, i) => {
      const mesh = new THREE.Mesh(s.geo(), clay(s.color, { roughness: 0.7, flat: true }));
      mesh.scale.setScalar(s.r);
      const along = 48 + i * 32;
      const side = (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 5);
      mesh.position.set(side, along, (i % 3 - 1) * 7);
      mesh.rotation.set(i * 0.4, i * 0.7, i * 0.2);
      shade(mesh, true, false);
      this.group.add(mesh);
      this.planets.push({ mesh, spin: 0.12 + (i % 4) * 0.05 });
    });
  }
}

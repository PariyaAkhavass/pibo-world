import * as THREE from "three";

/**
 * Shared "clay toy" material + geometry helpers so every prop reads as part of
 * the same handcrafted diorama: matte, soft, slightly rounded.
 */

export function clay(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: 0,
    flatShading: !!opts.flat,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });
}

/** A soft rounded blob (low-poly sphere) — the core clay primitive. */
export function blob(radius, mat, detail = 2) {
  return new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), mat);
}

export function ball(radius, mat, seg = 20) {
  return new THREE.Mesh(new THREE.SphereGeometry(radius, seg, seg), mat);
}

export function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function cyl(rt, rb, h, mat, seg = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
}

export function cone(r, h, mat, seg = 18) {
  return new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
}

/** Enable shadow casting/receiving across a whole subtree. */
export function shade(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}

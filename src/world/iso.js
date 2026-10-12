import * as THREE from "three";

/**
 * The concept painting is already the isometric view, so the camera looks
 * straight at that picture. An angled camera would squash it.
 * x grows right, z grows down the picture. W moves up the painting.
 */
export const PLATE_W = 32;
export const PLATE_H = 18;
export const ISO_YAW_DEG = 0;
export const ISO_PITCH_DEG = 0;

export function isoBasis() {
  return {
    quaternion: new THREE.Quaternion(),
    screenRight: new THREE.Vector3(1, 0, 0),
    screenUp: new THREE.Vector3(0, 0, -1),
    offsetDir: new THREE.Vector3(0, 0, 1),
    offset: new THREE.Vector3(0, 0, 40),
  };
}

/** Put a card on the painting. Larger z (lower on the picture) is closer. */
export function placeOnPlate(object, x, z, bias = 0) {
  object.position.set(x, -z, z * 0.08 + bias);
}

/**
 * Frame the painting.
 * contain — desktop and portrait. 1920×1080 matches the picture. A taller
 * window shows a little extra sky and sea. A portrait phone keeps the
 * island as wide as the screen.
 * cover — phone landscape. The picture fills the viewport edge to edge
 * and the extra height is cropped instead of leaving bars beside the island.
 */
export function orthoSize(width, height, options = {}) {
  const aspect = width / Math.max(1, height);
  const plateAspect = PLATE_W / PLATE_H;
  const cover = options.cover === true;
  if (cover) {
    if (aspect >= plateAspect) {
      const viewW = PLATE_W;
      return { viewW, viewH: viewW / aspect };
    }
    const viewH = PLATE_H;
    return { viewW: viewH * aspect, viewH };
  }
  if (aspect >= plateAspect) {
    const viewH = PLATE_H;
    return { viewW: viewH * aspect, viewH };
  }
  const viewW = PLATE_W;
  return { viewW, viewH: viewW / aspect };
}

/** Short landscape windows are phones held sideways, not a desktop monitor. */
export function isPhoneLandscape(width, height) {
  return width > height && height > 0 && height <= 520;
}

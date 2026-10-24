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
 * Sky and sea kept around the painting so the lighthouse cap, the library
 * flag, and the arcade are not cut by the screen edge. Desktop 16:10 and
 * 16:9, and a sideways phone, all contain this frame.
 */
const FRAME_MARGIN_Y = 1.15;

/**
 * Frame the painting.
 * The view always contains the whole picture, with a band of sky above it
 * and sea below it. A wide window shows a little more sky at the sides.
 */
export function orthoSize(width, height) {
  const aspect = width / Math.max(1, height);
  const frameH = PLATE_H + FRAME_MARGIN_Y * 2;
  const frameW = PLATE_W;
  const frameAspect = frameW / frameH;
  if (aspect >= frameAspect) {
    const viewH = frameH;
    return { viewW: viewH * aspect, viewH };
  }
  const viewW = frameW;
  return { viewW, viewH: viewW / aspect };
}

/** Short landscape windows are phones held sideways, not a desktop monitor. */
export function isPhoneLandscape(width, height) {
  return width > height && height > 0 && height <= 520;
}

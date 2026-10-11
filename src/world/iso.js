import * as THREE from "three";

/**
 * Fixed isometric camera. Yaw and pitch never change — only the look-at
 * point follows Pibo — so every sprite can be drawn once from this angle.
 *
 * Yaw 32° and pitch 40° are a high three-quarter view: roofs and paths read,
 * and building fronts stay visible. Draw replacement art from this same angle
 * (see ASSETS.md).
 */
export const ISO_YAW_DEG = 32;
export const ISO_PITCH_DEG = 40;
export const ISO_YAW = THREE.MathUtils.degToRad(ISO_YAW_DEG);
export const ISO_PITCH = THREE.MathUtils.degToRad(ISO_PITCH_DEG);

/** Unit offset from the look-at point to the camera. */
export function isoOffsetDirection() {
  const cp = Math.cos(ISO_PITCH);
  return new THREE.Vector3(
    Math.sin(ISO_YAW) * cp,
    Math.sin(ISO_PITCH),
    Math.cos(ISO_YAW) * cp
  ).normalize();
}

export function isoOffset(distance = 48) {
  return isoOffsetDirection().multiplyScalar(distance);
}

/**
 * Camera orientation, plus the ground directions that match "up the screen"
 * and "right on the screen" so WASD and the joystick stay intuitive.
 */
export function isoBasis(distance = 48) {
  const offsetDir = isoOffsetDirection();
  const cam = new THREE.Object3D();
  cam.up.set(0, 1, 0);
  cam.position.copy(offsetDir);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();

  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const screenRight = new THREE.Vector3(right.x, 0, right.z);
  const screenUp = new THREE.Vector3(up.x, 0, up.z);
  if (screenRight.lengthSq() > 1e-8) screenRight.normalize();
  if (screenUp.lengthSq() > 1e-8) screenUp.normalize();

  return {
    quaternion: cam.quaternion.clone(),
    screenRight,
    screenUp,
    offsetDir,
    offset: offsetDir.clone().multiplyScalar(distance),
  };
}

/**
 * Orthographic window in world units.
 * Landscape keeps a steady vertical size so 1280×800 and 1920×1080 frame the
 * island the same way (wider screens just show more ocean).
 * Portrait pulls in so Pibo and the nearest buildings stay large on a phone.
 */
export function orthoSize(width, height) {
  const aspect = width / Math.max(1, height);
  if (aspect >= 1) {
    const viewH = 19.2;
    return { viewW: viewH * aspect, viewH };
  }
  const viewW = aspect < 0.7 ? 16.5 : 18.5;
  return { viewW, viewH: viewW / aspect };
}

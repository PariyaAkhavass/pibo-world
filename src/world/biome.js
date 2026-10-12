import { PLATE_W, PLATE_H } from "./iso.js";

/**
 * Walk, water, and cliff samples painted from the concept image.
 * Red = grass and path, blue = sea, green = cliff and sky.
 */

const IMG_W = 1280;
const IMG_H = 720;
let mask = null;

export function setWalkMask(data, w, h) {
  mask = { data, w, h };
}

export function loadWalkMask(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      setWalkMask(data, img.width, img.height);
      resolve();
    };
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

function sample(x, z) {
  if (!mask) return "walk";
  const px = (x / PLATE_W + 0.5) * IMG_W;
  const py = (z / PLATE_H + 0.5) * IMG_H;
  const mx = Math.max(0, Math.min(mask.w - 1, Math.floor(px * mask.w / IMG_W)));
  const my = Math.max(0, Math.min(mask.h - 1, Math.floor(py * mask.h / IMG_H)));
  const i = (my * mask.w + mx) * 4;
  if (mask.data[i] > 200) return "walk";
  if (mask.data[i + 2] > 200) return "water";
  return "block";
}

export function onLand(x, z) {
  return sample(x, z) === "walk";
}

export function isBlocked(x, z) {
  return sample(x, z) === "block";
}

/** Swim as soon as any sample on the pot is in the painted sea. */
export function isBlueWater(x, z, fx = 0, fz = 0, reach = 0.5) {
  const points = [
    [x, z],
    [x + fx * reach, z + fz * reach],
    [x + reach, z],
    [x - reach, z],
    [x, z + reach],
    [x, z - reach],
  ];
  return points.some(([px, pz]) => sample(px, pz) === "water");
}

export const OCEAN_LAT = 64;
export function oceanAmount() {
  return 0;
}

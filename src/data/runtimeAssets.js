import { ASSET_MANIFEST } from "./assetManifest.js";

/** Source path (the PNG or JPEG in the repo) → hashed WebP the page downloads. */
export function resolveAsset(src) {
  if (!src) return src;
  return ASSET_MANIFEST[src]?.url || src;
}

/**
 * Crop of a full-canvas layer, in the original image's pixels.
 * Absent when the runtime file is the whole picture.
 */
export function assetFrame(src) {
  return ASSET_MANIFEST[src]?.frame || null;
}

const images = new Map();

/** Decode one runtime image. Repeated calls share the same download. */
export function loadImage(src) {
  const url = resolveAsset(src);
  if (!url) return Promise.resolve(null);
  const cached = images.get(url);
  if (cached) return cached;
  const pending = new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = url;
  });
  images.set(url, pending);
  return pending;
}

export function loadImages(sources) {
  return Promise.all([...new Set(sources.filter(Boolean))].map((src) => loadImage(src)));
}

import * as THREE from "three";
import { ASSET_MANIFEST } from "../data/assetManifest.js";
import { resolveAsset } from "../data/runtimeAssets.js";

/**
 * Rasterize a runtime image to a texture. Callers pass the size from the
 * asset list. Critter frames share one atlas and are cut back out here, so
 * each animal is a single download and still draws as eight separate pictures.
 */
function loadHtmlImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${url}`));
    img.src = url;
  });
}

function paintTexture(img, sx, sy, sw, sh, dw, dh, url) {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, dw, dh);
  // A 1:1 copy stays on the source pixels. Scaling a painting may smooth.
  ctx.imageSmoothingEnabled = !(sw === dw && sh === dh);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  tex.userData = { url };
  return tex;
}

function missingTexture() {
  const data = new Uint8Array([246, 234, 214, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function loadTexture(url, pixelWidth = 512, pixelHeight = 512) {
  return loadHtmlImage(resolveAsset(url)).then((img) => {
    const sw = img.naturalWidth || pixelWidth;
    const sh = img.naturalHeight || pixelHeight;
    return paintTexture(img, 0, 0, sw, sh, pixelWidth, pixelHeight, url);
  });
}

export async function loadTextureSet(sources, sizes) {
  const map = new Map();
  const groups = new Map();
  for (const logical of sources) {
    const fetchUrl = resolveAsset(logical);
    if (!groups.has(fetchUrl)) groups.set(fetchUrl, []);
    groups.get(fetchUrl).push(logical);
  }
  await Promise.all([...groups.entries()].map(async ([fetchUrl, logicals]) => {
    let img = null;
    try {
      img = await loadHtmlImage(fetchUrl);
    } catch (err) {
      console.warn(err);
    }
    for (const logical of logicals) {
      if (!img) {
        map.set(logical, missingTexture());
        continue;
      }
      const size = sizes.get(logical) || {
        w: img.naturalWidth || 512,
        h: img.naturalHeight || 512,
      };
      const atlas = ASSET_MANIFEST[logical]?.atlas;
      if (atlas) {
        map.set(logical, paintTexture(img, atlas.x, atlas.y, atlas.w, atlas.h, size.w, size.h, logical));
      } else {
        const sw = img.naturalWidth || size.w;
        const sh = img.naturalHeight || size.h;
        map.set(logical, paintTexture(img, 0, 0, sw, sh, size.w, size.h, logical));
      }
    }
  }));
  return map;
}

export function textureSizes(assets) {
  const sizes = new Map();
  const add = (url, entry) => {
    if (!url) return;
    sizes.set(url, {
      w: entry.pixelWidth || 512,
      h: entry.pixelHeight || 512,
    });
  };
  for (const entry of Object.values(assets)) {
    add(entry.src, entry);
    if (entry.faces) {
      for (const url of Object.values(entry.faces)) add(url, entry);
    }
    if (entry.states) {
      for (const frames of Object.values(entry.states)) {
        for (const url of frames) add(url, entry);
      }
    }
  }
  return sizes;
}

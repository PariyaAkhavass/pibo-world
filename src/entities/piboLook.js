/**
 * Kid's look for the flat Pibo: pot color, hair, hat, scarf, glasses.
 * The sprite is split into pot (body and feet), leaves, and eyes. A new pot
 * color keeps the painted light and shadow and the dark outline. Hair is the
 * leaf layer. A hat replaces that layer and sits on the rim.
 * Saved on this browser and drawn on the island and in the art room.
 */

const KEY = "pibo-look";

export const DEFAULT_LOOK = {
  pot: "yellow",
  hair: "tuft",
  hat: "none",
  scarf: "none",
  glasses: "none",
};

export const POTS = [
  { id: "yellow", label: "Yellow pot" },
  { id: "red", label: "Red pot", color: [226, 64, 58] },
  { id: "orange", label: "Orange pot", color: [242, 132, 36] },
  { id: "pink", label: "Pink pot", color: [236, 96, 168] },
  { id: "green", label: "Green pot", color: [64, 186, 86] },
  { id: "blue", label: "Blue pot", color: [58, 148, 226] },
  { id: "purple", label: "Purple pot", color: [168, 96, 214] },
  { id: "dots", label: "Polka dots", color: [236, 96, 168], pattern: "dots" },
  { id: "stars", label: "Stars", color: [58, 130, 220], pattern: "stars" },
];

export const HAIRS = [
  { id: "tuft", label: "Big leaf tuft" },
  { id: "sprout", label: "Two-leaf sprout" },
  { id: "lily", label: "Lily pads" },
  { id: "aloe", label: "Spiky leaves" },
  { id: "vine", label: "Curly vine" },
  { id: "flower", label: "Flower" },
];

export const HATS = [
  { id: "none", label: "No hat" },
  { id: "pink", label: "Pink hat", color: "#ff7eb3" },
  { id: "blue", label: "Blue hat", color: "#4aa3e8" },
  { id: "yellow", label: "Yellow hat", color: "#ffd24a" },
];

export const SCARVES = [
  { id: "none", label: "No scarf" },
  { id: "blue", label: "Blue scarf", color: "#3d7ee8" },
  { id: "red", label: "Red scarf", color: "#e23b3b" },
];

export const GLASSES = [
  { id: "none", label: "No glasses" },
  { id: "yellow", label: "Yellow glasses", color: "#ffd24a" },
  { id: "blue", label: "Blue glasses", color: "#3d7ee8" },
];

const INK = "#3a2a24";
const LEAF = "#7ec83a";
const LEAF_DEEP = "#3d8f24";
const layersOf = new WeakMap();

export function loadLook() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_LOOK };
    return {
      pot: POTS.some((item) => item.id === raw.pot) ? raw.pot : DEFAULT_LOOK.pot,
      hair: HAIRS.some((item) => item.id === raw.hair) ? raw.hair : DEFAULT_LOOK.hair,
      hat: HATS.some((item) => item.id === raw.hat) ? raw.hat : DEFAULT_LOOK.hat,
      scarf: SCARVES.some((item) => item.id === raw.scarf) ? raw.scarf : DEFAULT_LOOK.scarf,
      glasses: GLASSES.some((item) => item.id === raw.glasses) ? raw.glasses : DEFAULT_LOOK.glasses,
    };
  } catch {
    return { ...DEFAULT_LOOK };
  }
}

export function saveLook(look) {
  localStorage.setItem(KEY, JSON.stringify(look));
}

export function paintLook(source, look, target) {
  const canvas = target || document.createElement("canvas");
  const layers = splitLayers(source);
  const { w, h } = layers;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  const pot = POTS.find((item) => item.id === look.pot) || POTS[0];
  ctx.drawImage(potCanvas(layers, pot), 0, 0);
  if (pot.pattern) drawPattern(ctx, layers, pot.pattern);
  ctx.drawImage(layers.eyes, 0, 0);
  const hat = HATS.find((item) => item.id === look.hat);
  if (!hat?.color) {
    const hair = HAIRS.some((item) => item.id === look.hair) ? look.hair : "tuft";
    if (hair === "tuft") ctx.drawImage(layers.leaves, 0, 0);
    else drawHair(ctx, layers, hair);
  }
  const scarf = SCARVES.find((item) => item.id === look.scarf);
  if (scarf?.color) drawScarf(ctx, layers, scarf.color);
  const glasses = GLASSES.find((item) => item.id === look.glasses);
  if (glasses?.color) drawGlasses(ctx, w, h, glasses.color);
  if (hat?.color) drawHat(ctx, layers, hat.color);
  return canvas;
}

function splitLayers(source) {
  const cached = layersOf.get(source);
  if (cached) return cached;
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  sctx.drawImage(source, 0, 0, w, h);
  const src = sctx.getImageData(0, 0, w, h).data;
  const potTop = new Int32Array(w);
  potTop.fill(h);
  for (let x = 0; x < w; x++) {
    let run = 0;
    for (let y = Math.floor(h * 0.3); y < h; y++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 20 && isWarm(src[i], src[i + 1], src[i + 2]) && !isGreen(src[i], src[i + 1], src[i + 2])) {
        run += 1;
        if (run >= 4) {
          potTop[x] = y - 3;
          break;
        }
      } else run = 0;
    }
  }
  const smooth = new Int32Array(potTop);
  for (let x = 4; x < w - 4; x++) {
    const window = Array.from(potTop.slice(x - 4, x + 5)).sort((a, b) => a - b);
    smooth[x] = window[4];
  }

  const mask = new Uint8Array(w * h);
  const pot = sctx.createImageData(w, h);
  const leafC = document.createElement("canvas");
  leafC.width = w;
  leafC.height = h;
  const eyeC = document.createElement("canvas");
  eyeC.width = w;
  eyeC.height = h;
  const leafImg = leafC.getContext("2d").createImageData(w, h);
  const eyeImg = eyeC.getContext("2d").createImageData(w, h);
  const pd = pot.data;
  const ld = leafImg.data;
  const ed = eyeImg.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = (y * w + x) * 4;
      const a = src[p + 3];
      if (a < 16) continue;
      const r = src[p];
      const g = src[p + 1];
      const b = src[p + 2];
      let into = ld;
      let kind = 0;
      if (isGreen(r, g, b)) {
        into = ld;
      } else if (inEye(x, y, w, h) && isEyePixel(r, g, b)) {
        into = ed;
      } else if (y < smooth[x] && !isWarm(r, g, b)) {
        into = ld;
      } else {
        into = pd;
        kind = Math.max(r, g, b) < 80 ? 2 : 1;
      }
      into[p] = r;
      into[p + 1] = g;
      into[p + 2] = b;
      into[p + 3] = a;
      mask[y * w + x] = kind;
    }
  }
  leafC.getContext("2d").putImageData(leafImg, 0, 0);
  eyeC.getContext("2d").putImageData(eyeImg, 0, 0);

  const layers = {
    w,
    h,
    mask,
    pot,
    leaves: leafC,
    eyes: eyeC,
    rim: measureRim(mask, w, h),
    pots: new Map(),
  };
  layersOf.set(source, layers);
  return layers;
}

function measureRim(mask, w, h) {
  const tops = [];
  for (let x = Math.floor(w * 0.35); x < Math.floor(w * 0.65); x++) {
    for (let y = 0; y < h; y++) {
      if (mask[y * w + x] === 1) {
        tops.push(y);
        break;
      }
    }
  }
  tops.sort((a, b) => a - b);
  const yTop = tops.length ? tops[tops.length >> 1] : Math.floor(h * 0.44);
  const y = Math.min(h - 1, yTop + Math.round(h * 0.015));
  let left = w;
  let right = 0;
  for (let x = 0; x < w; x++) {
    if (mask[y * w + x]) {
      left = x;
      break;
    }
  }
  for (let x = w - 1; x >= 0; x--) {
    if (mask[y * w + x]) {
      right = x;
      break;
    }
  }
  if (right <= left) {
    left = Math.floor(w * 0.12);
    right = Math.floor(w * 0.88);
  }
  return { x: (left + right) / 2, y: yTop, width: right - left, left, right };
}

function potCanvas(layers, pot) {
  const key = pot.color ? pot.color.join(",") : "yellow";
  const cached = layers.pots.get(key);
  if (cached) return cached;
  const { w, h, mask } = layers;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const img = new ImageData(new Uint8ClampedArray(layers.pot.data), w, h);
  if (pot.color) {
    const [th, , ts] = rgbToHsl(pot.color[0], pot.color[1], pot.color[2]);
    const sat = Math.max(0.78, ts);
    const data = img.data;
    for (let n = 0; n < mask.length; n++) {
      if (mask[n] !== 1) continue;
      const p = n * 4;
      const [, , l] = rgbToHsl(data[p], data[p + 1], data[p + 2]);
      const [r, g, b] = hslToRgb(th, sat, Math.max(0.16, Math.min(0.86, l)));
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
    }
  }
  canvas.getContext("2d").putImageData(img, 0, 0);
  layers.pots.set(key, canvas);
  return canvas;
}

function drawPattern(ctx, layers, pattern) {
  const { w, h, mask } = layers;
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const g = scratch.getContext("2d");
  g.lineJoin = "round";
  g.strokeStyle = INK;
  g.lineWidth = Math.max(4, w * 0.012);
  if (pattern === "dots") {
    g.fillStyle = "#fff6ee";
    for (let y = Math.floor(h * 0.48); y < h * 0.88; y += Math.floor(h * 0.075)) {
      for (let x = Math.floor(w * 0.22); x < w * 0.82; x += Math.floor(w * 0.12)) {
        const jx = ((y / h) * 3) % 2 > 1 ? w * 0.06 : 0;
        ellipse(g, x + jx, y, w * 0.055, h * 0.04);
        g.fill();
        g.stroke();
      }
    }
  } else {
    g.fillStyle = "#ffe56a";
    for (const [fx, fy] of [[0.32, 0.52], [0.68, 0.52], [0.42, 0.84], [0.64, 0.82]]) {
      star(g, fx * w, fy * h, w * 0.045);
      g.fill();
      g.stroke();
    }
  }
  const img = g.getImageData(0, 0, w, h);
  const data = img.data;
  for (let n = 0; n < mask.length; n++) {
    if (mask[n] !== 1) data[n * 4 + 3] = 0;
  }
  g.putImageData(img, 0, 0);
  ctx.drawImage(scratch, 0, 0);
}

function drawHair(ctx, layers, id) {
  const { w, h, rim } = layers;
  ctx.save();
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, w * 0.026);
  ctx.fillStyle = LEAF;
  const cx = rim.x;
  const y = rim.y + 2;
  if (id === "sprout") {
    leafBlob(ctx, cx - w * 0.01, y, -0.85, w * 0.2, h * 0.15);
    leafBlob(ctx, cx + w * 0.01, y, 0.85, w * 0.2, h * 0.15);
  } else if (id === "lily") {
    const r = w * 0.13;
    lily(ctx, cx - r * 0.85, y - r * 0.35, r);
    lily(ctx, cx + r * 0.85, y - r * 0.35, r);
    lily(ctx, cx, y - r * 1.05, r * 0.92);
  } else if (id === "aloe") {
    const angles = [-1.05, -0.55, 0, 0.55, 1.05];
    angles.forEach((angle, i) => {
      spike(ctx, cx, y, angle, h * (i === 2 ? 0.26 : 0.2), w * 0.055);
    });
  } else if (id === "vine") {
    vine(ctx, cx, y, w, h);
  } else if (id === "flower") {
    flower(ctx, cx, y, w, h);
  }
  ctx.restore();
}

function leafBlob(ctx, x, y, angle, len, wid) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, -len * 0.45, wid * 0.42, len * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = LEAF_DEEP;
  ctx.lineWidth = Math.max(4, wid * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(0, -len * 0.75);
  ctx.stroke();
  ctx.restore();
}

function lily(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = LEAF_DEEP;
  ctx.lineWidth = Math.max(4, r * 0.12);
  ctx.moveTo(x - r * 0.2, y);
  ctx.lineTo(x + r * 0.85, y - r * 0.15);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, r * 0.22);
}

function spike(ctx, x, y, angle, len, wid) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, -len * 0.45, 0, -len);
  ctx.quadraticCurveTo(-wid, -len * 0.45, 0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function vine(ctx, cx, y, w, h) {
  ctx.lineWidth = Math.max(16, w * 0.04);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.02, y);
  ctx.bezierCurveTo(cx + w * 0.28, y - h * 0.08, cx - w * 0.02, y - h * 0.16, cx + w * 0.08, y - h * 0.26);
  ctx.stroke();
  ctx.strokeStyle = LEAF;
  ctx.lineWidth = Math.max(8, w * 0.022);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, w * 0.026);
  ctx.fillStyle = LEAF;
  leafBlob(ctx, cx + w * 0.16, y - h * 0.1, 0.4, w * 0.12, h * 0.08);
  leafBlob(ctx, cx + w * 0.02, y - h * 0.2, -0.8, w * 0.11, h * 0.07);
  leafBlob(ctx, cx + w * 0.08, y - h * 0.26, 0.2, w * 0.1, h * 0.06);
}

function flower(ctx, cx, y, w, h) {
  const top = y - h * 0.28;
  ctx.lineWidth = Math.max(12, w * 0.03);
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, top + h * 0.04);
  ctx.stroke();
  ctx.strokeStyle = LEAF_DEEP;
  ctx.lineWidth = Math.max(6, w * 0.016);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, w * 0.026);
  ctx.fillStyle = LEAF;
  leafBlob(ctx, cx, y - h * 0.12, -1.1, w * 0.12, h * 0.07);
  const petal = w * 0.055;
  ctx.fillStyle = "#ff8fb8";
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    ellipse(ctx, cx + Math.cos(a) * petal * 0.95, top + Math.sin(a) * petal * 0.95, petal * 1.15, petal * 0.85);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#ffd24a";
  ctx.beginPath();
  ctx.arc(cx, top, petal * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawHat(ctx, layers, color) {
  const { w, h, rim } = layers;
  const brimW = rim.width * 1.02;
  const brimH = h * 0.072;
  const brimY = rim.y + brimH * 0.2;
  const crownW = brimW * 0.7;
  const crownH = h * 0.22;
  const crownTop = brimY - crownH * 0.86;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(12, w * 0.034);
  ctx.lineJoin = "round";
  roundTop(ctx, rim.x - crownW / 2, crownTop, crownW, crownH, crownW * 0.48);
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, rim.x, brimY, brimW, brimH);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawScarf(ctx, layers, color) {
  const { w, h, mask } = layers;
  const y = h * 0.785;
  const span = spanAt(mask, w, y);
  const inset = (span.right - span.left) * 0.03;
  const x = span.left + inset;
  const bw = Math.max(w * 0.4, span.right - span.left - inset * 2);
  const bh = h * 0.068;
  const tailW = w * 0.09;
  const tailX = x + bw - tailW * 1.55;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, w * 0.028);
  ctx.lineJoin = "round";
  roundRect(ctx, tailX, y + bh * 0.55, tailW, h * 0.085, w * 0.028);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, tailX + tailW * 0.7, y + bh * 0.62, tailW * 0.85, h * 0.06, w * 0.024);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, x, y, bw, bh, bh * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lighten(color, 0.45);
  roundRect(ctx, x + w * 0.025, y + bh * 0.34, bw - w * 0.05, bh * 0.28, bh * 0.18);
  ctx.fill();
  ctx.restore();
}

function spanAt(mask, w, y) {
  const row = Math.max(0, Math.min(mask.length / w - 1, Math.round(y)));
  let left = 0;
  let right = w - 1;
  for (let x = 0; x < w; x++) {
    if (mask[row * w + x]) {
      left = x;
      break;
    }
  }
  for (let x = w - 1; x >= 0; x--) {
    if (mask[row * w + x]) {
      right = x;
      break;
    }
  }
  return { left, right };
}

function drawGlasses(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(8, w * 0.026);
  ctx.lineJoin = "round";
  const rw = w * 0.15;
  const rh = h * 0.078;
  const y = h * 0.632;
  roundRect(ctx, w * 0.305 - rw / 2, y, rw, rh, rh * 0.45);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, w * 0.64 - rw / 2, y, rw, rh, rh * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.305 + rw / 2, y + rh * 0.5);
  ctx.lineTo(w * 0.64 - rw / 2, y + rh * 0.5);
  ctx.stroke();
  ctx.restore();
}

function isGreen(r, g, b) {
  return g > r + 8 && g > b && g > 45;
}

function isWarm(r, g, b) {
  return r > 140 && r > g + 5 && r > b + 35 && b < 120 && g < r + 10;
}

function isEyePixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 95) return true;
  if (min > 175 && b > 150) return true;
  return r < 130 && g < 90 && b < 70 && max < 150;
}

function inEye(x, y, w, h) {
  const fx = x / w;
  const fy = y / h;
  const eyes = [
    [0.308, 0.678, 0.082, 0.072],
    [0.64, 0.682, 0.082, 0.072],
  ];
  for (const [cx, cy, rx, ry] of eyes) {
    const dx = (fx - cx) / rx;
    const dy = (fy - cy) / ry;
    if (dx * dx + dy * dy <= 1) return true;
  }
  return false;
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d < 1e-6) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s <= 0) {
    const v = clamp(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [clamp(hue(h + 1 / 3) * 255), clamp(hue(h) * 255), clamp(hue(h - 1 / 3) * 255)];
}

function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * t);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.abs(rx) / 2, Math.abs(ry) / 2, 0, 0, Math.PI * 2);
}

function roundRect(ctx, x, y, rw, rh, r) {
  const rad = Math.min(r, Math.abs(rw) / 2, Math.abs(rh) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + rw, y, x + rw, y + rh, rad);
  ctx.arcTo(x + rw, y + rh, x, y + rh, rad);
  ctx.arcTo(x, y + rh, x, y, rad);
  ctx.arcTo(x, y, x + rw, y, rad);
  ctx.closePath();
}

function roundTop(ctx, x, y, rw, rh, r) {
  const rad = Math.min(r, rw / 2, rh);
  ctx.beginPath();
  ctx.moveTo(x, y + rh);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.arcTo(x + rw, y, x + rw, y + rad, rad);
  ctx.lineTo(x + rw, y + rh);
  ctx.closePath();
}

function star(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Kid's look for the flat Pibo: pot color or pattern, hat, scarf, glasses.
 * Saved on this browser and drawn on the island and in the art room.
 */

const KEY = "pibo-look";

export const DEFAULT_LOOK = {
  pot: "yellow",
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
  { id: "dots", label: "Polka dots", color: [236, 96, 168], pattern: "dots" },
  { id: "stars", label: "Stars", color: [58, 130, 220], pattern: "stars" },
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

export function loadLook() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return { ...DEFAULT_LOOK };
    return {
      pot: POTS.some((item) => item.id === raw.pot) ? raw.pot : DEFAULT_LOOK.pot,
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

// Extra canvas above the leaves so a hat can sit on the tuft without being clipped.
const HAT_PAD = 0.32;

export function paintLook(source, look, target) {
  const canvas = target || document.createElement("canvas");
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const hat = HATS.find((item) => item.id === look.hat);
  const pad = hat?.color ? Math.round(h * HAT_PAD) : 0;
  canvas.width = w;
  canvas.height = h + pad;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, pad, w, h);
  const pot = POTS.find((item) => item.id === look.pot) || POTS[0];
  if (pot.color) recolorPot(ctx, w, canvas.height, pot, pad, h);
  const scarf = SCARVES.find((item) => item.id === look.scarf);
  if (scarf?.color) drawScarf(ctx, w, h, scarf.color, pad);
  const glasses = GLASSES.find((item) => item.id === look.glasses);
  if (glasses?.color) drawGlasses(ctx, w, h, glasses.color, pad);
  if (hat?.color) drawHat(ctx, w, h, hat.color, pad);
  return canvas;
}

function recolorPot(ctx, w, canvasH, pot, pad, srcH) {
  const img = ctx.getImageData(0, 0, w, canvasH);
  const data = img.data;
  const [tr, tg, tb] = pot.color;
  const dots = pot.pattern === "dots";
  const stars = pot.pattern === "stars";
  for (let y = 0; y < canvasH; y++) {
    const fy = (y - pad) / srcH;
    if (fy < 0 || fy > 1) continue;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3];
      if (a < 16) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!isPot(r, g, b, fy)) continue;
      const luma = (r * 0.3 + g * 0.59 + b * 0.11) / 185;
      let nr = tr * luma;
      let ng = tg * luma;
      let nb = tb * luma;
      if (dots && inDot(x / w, fy)) {
        nr = nr * 0.25 + 255 * 0.75;
        ng = ng * 0.25 + 248 * 0.75;
        nb = nb * 0.25 + 236 * 0.75;
      }
      data[i] = clamp(nr);
      data[i + 1] = clamp(ng);
      data[i + 2] = clamp(nb);
    }
  }
  ctx.putImageData(img, 0, 0);
  if (stars) drawStars(ctx, w, srcH, pad);
}

// Bright yellow pot body only. Leaves, eyes, feet, and anything drawn later stay put.
function isPot(r, g, b, fy) {
  if (fy < 0.436 || fy > 0.9) return false;
  if (g > r + 8 && g > b) return false;
  return r >= 220 && g >= 175 && b <= 110 && g < r + 8 && r > b + 40;
}

function inDot(fx, fy) {
  const gx = (fx - 0.18) / 0.16;
  const gy = (fy - 0.5) / 0.11;
  const cx = gx - Math.round(gx);
  const cy = gy - Math.round(gy);
  return cx * cx + cy * cy < 0.16 && fy > 0.46 && fy < 0.86 && fx > 0.18 && fx < 0.82;
}

function drawStars(ctx, w, srcH, pad) {
  const spots = [
    [0.3, 0.5],
    [0.7, 0.5],
    [0.34, 0.8],
    [0.66, 0.8],
  ];
  ctx.save();
  ctx.fillStyle = "#ffe56a";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(4, w * 0.014);
  ctx.lineJoin = "round";
  const radius = w * 0.042;
  for (const [fx, fy] of spots) {
    star(ctx, fx * w, pad + fy * srcH, radius);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
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

function drawHat(ctx, w, h, color, pad) {
  const cx = w * 0.5;
  const brimW = w * 0.78;
  const brimH = h * 0.085;
  const brimY = pad + h * 0.035;
  const crownW = w * 0.56;
  const crownTop = Math.max(6, pad * 0.08);
  const crownH = brimY - crownTop + brimH * 0.45;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(12, w * 0.042);
  ctx.lineJoin = "round";
  roundTop(ctx, cx - crownW / 2, crownTop, crownW, crownH, crownW * 0.46);
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, cx, brimY, brimW, brimH);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawScarf(ctx, w, h, color, pad) {
  const y = pad + h * 0.458;
  const bh = h * 0.1;
  const x = w * 0.15;
  const bw = w * 0.7;
  const tailW = w * 0.1;
  const tailX = w * 0.76;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(10, w * 0.032);
  ctx.lineJoin = "round";
  roundRect(ctx, tailX, y + bh * 0.55, tailW, h * 0.13, w * 0.03);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, tailX + tailW * 0.72, y + bh * 0.62, tailW * 0.92, h * 0.09, w * 0.028);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, x, y, bw, bh, bh * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lighten(color, 0.42);
  roundRect(ctx, x + w * 0.03, y + bh * 0.36, bw - w * 0.06, bh * 0.28, bh * 0.2);
  ctx.fill();
  ctx.restore();
}

function drawGlasses(ctx, w, h, color, pad) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(8, w * 0.028);
  ctx.lineJoin = "round";
  const y = pad + h * 0.6;
  const rw = w * 0.16;
  const rh = h * 0.09;
  roundRect(ctx, w * 0.2, y, rw, rh, rh * 0.45);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, w * 0.58, y, rw, rh, rh * 0.45);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w * 0.36, y + rh * 0.5);
  ctx.lineTo(w * 0.58, y + rh * 0.5);
  ctx.stroke();
  ctx.restore();
}

function lighten(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * t);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx / 2, ry / 2, 0, 0, Math.PI * 2);
}

function roundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function roundTop(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + rad);
  ctx.arcTo(x, y, x + rad, y, rad);
  ctx.arcTo(x + w, y, x + w, y + rad, rad);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
}

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

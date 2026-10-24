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

export function paintLook(source, look, target) {
  const canvas = target || document.createElement("canvas");
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  const pot = POTS.find((item) => item.id === look.pot) || POTS[0];
  if (pot.color) recolorPot(ctx, w, h, pot);
  const scarf = SCARVES.find((item) => item.id === look.scarf);
  if (scarf?.color) drawScarf(ctx, w, h, scarf.color);
  const glasses = GLASSES.find((item) => item.id === look.glasses);
  if (glasses?.color) drawGlasses(ctx, w, h, glasses.color);
  const hat = HATS.find((item) => item.id === look.hat);
  if (hat?.color) drawHat(ctx, w, h, hat.color);
  return canvas;
}

function recolorPot(ctx, w, h, pot) {
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const [tr, tg, tb] = pot.color;
  const dots = pot.pattern === "dots";
  const stars = pot.pattern === "stars";
  for (let y = 0; y < h; y++) {
    const fy = y / h;
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
  if (stars) drawStars(ctx, w, h);
}

function isPot(r, g, b, fy) {
  if (fy > 0.93) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 90) return false;
  if (min > 210) return false;
  if (g > r + 8 && g > b) return false;
  return r > 150 && g > 90 && b < 170 && r > b + 35 && g < r + 45;
}

function inDot(fx, fy) {
  const gx = (fx - 0.18) / 0.16;
  const gy = (fy - 0.42) / 0.11;
  const cx = gx - Math.round(gx);
  const cy = gy - Math.round(gy);
  return cx * cx + cy * cy < 0.16 && fy > 0.4 && fy < 0.9 && fx > 0.16 && fx < 0.86;
}

function drawStars(ctx, w, h) {
  const spots = [
    [0.34, 0.5],
    [0.62, 0.56],
    [0.46, 0.74],
    [0.7, 0.78],
  ];
  ctx.save();
  ctx.fillStyle = "#ffe56a";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, w * 0.012);
  ctx.lineJoin = "round";
  for (const [fx, fy] of spots) {
    star(ctx, fx * w, fy * h, w * 0.055);
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

function drawHat(ctx, w, h, color) {
  const cx = w * 0.5;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(6, w * 0.028);
  ctx.lineJoin = "round";
  roundTop(ctx, cx - w * 0.16, h * 0.02, w * 0.32, h * 0.2, w * 0.14);
  ctx.fill();
  ctx.stroke();
  ellipse(ctx, cx, h * 0.2, w * 0.46, h * 0.075);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawScarf(ctx, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(5, w * 0.02);
  ctx.lineJoin = "round";
  roundRect(ctx, w * 0.2, h * 0.36, w * 0.6, h * 0.09, h * 0.04);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, w * 0.3, h * 0.42, w * 0.14, h * 0.22, w * 0.04);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, w * 0.52, h * 0.42, w * 0.14, h * 0.18, w * 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGlasses(ctx, w, h, color) {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(6, w * 0.026);
  ctx.lineJoin = "round";
  const y = h * 0.6;
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

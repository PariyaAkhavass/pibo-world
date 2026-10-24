import {
  DEFAULT_LOOK,
  GLASSES,
  HAIRS,
  HATS,
  POTS,
  SCARVES,
  loadLook,
  onHairSprite,
  paintLook,
  saveLook,
} from "../entities/piboLook.js";

const INK = "#3a2a24";

/**
 * Full-screen art room. The painted room fills the window. Pibo stands on
 * the round stage. Choices are icons, saved for the island too.
 */
export class ArtRoom {
  constructor({ root, onClose, onChange } = {}) {
    this.root = root;
    this.onClose = onClose || null;
    this.onChange = onChange || null;
    this.isOpen = false;
    this.look = loadLook();
    this.source = null;
    this._build();
    this._loadSource();
    onHairSprite(() => {
      if (!this.isOpen) return;
      this._paint();
      this.layout();
    });
  }

  _build() {
    this.root.innerHTML = "";
    this.root.setAttribute("role", "dialog");
    this.root.setAttribute("aria-modal", "true");
    this.root.setAttribute("aria-label", "Art room");

    const bg = document.createElement("img");
    bg.className = "art-bg";
    bg.alt = "";
    bg.src = "assets/painted/art-room.jpg";
    this.root.appendChild(bg);

    this.shadow = document.createElement("div");
    this.shadow.className = "art-shadow";
    this.root.appendChild(this.shadow);

    this.canvas = document.createElement("canvas");
    this.canvas.className = "art-pibo";
    this.root.appendChild(this.canvas);

    const back = document.createElement("button");
    back.type = "button";
    back.className = "art-back";
    back.setAttribute("aria-label", "Back");
    back.innerHTML = arrowIcon();
    back.addEventListener("click", () => this.onClose?.());
    this.root.appendChild(back);

    const tools = document.createElement("div");
    tools.className = "art-tools";
    tools.appendChild(this._row(POTS, "pot", potIcon));
    tools.appendChild(this._row(HAIRS, "hair", hairIcon));
    tools.appendChild(this._row(HATS, "hat", hatIcon));
    tools.appendChild(this._row(SCARVES, "scarf", scarfIcon));
    tools.appendChild(this._row(GLASSES, "glasses", glassesIcon));
    this.root.appendChild(tools);
  }

  _row(items, key, icon) {
    const row = document.createElement("div");
    row.className = "art-row";
    for (const item of items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "art-choice";
      btn.dataset.group = key;
      btn.dataset.id = item.id;
      btn.setAttribute("aria-label", item.label);
      btn.innerHTML = icon(item);
      btn.addEventListener("click", () => this._pick(key, item.id));
      row.appendChild(btn);
    }
    return row;
  }

  _pick(key, id) {
    this.look = { ...this.look, [key]: id };
    saveLook(this.look);
    this._paint();
    this.layout();
    this._mark();
    this.onChange?.(this.look);
  }

  _loadSource() {
    const img = new Image();
    img.onload = () => {
      this.source = img;
      if (this.isOpen) {
        this._paint();
        this.layout();
      }
    };
    img.src = "assets/pibo/pibo.png";
  }

  open() {
    this.isOpen = true;
    this.look = loadLook();
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-hidden", "false");
    this._paint();
    this._mark();
    this.layout();
  }

  close() {
    this.isOpen = false;
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-hidden", "true");
  }

  layout() {
    if (!this.isOpen) return;
    const vw = this.root.clientWidth || window.innerWidth;
    const vh = this.root.clientHeight || window.innerHeight;
    const scale = Math.max(vw / 1280, vh / 720);
    const ox = (vw - 1280 * scale) / 2;
    const oy = (vh - 720 * scale) / 2;
    const feetX = ox + 633 * scale;
    const feetY = oy + 524 * scale;
    const srcW = this.source?.naturalWidth || 645;
    const srcH = this.source?.naturalHeight || 838;
    const bmpW = this.canvas.width || srcW;
    const bmpH = this.canvas.height || srcH;
    const bodyH = 228 * scale;
    const ph = bodyH * (bmpH / srcH);
    const pw = bodyH * (bmpW / srcH);
    this.canvas.style.width = `${pw}px`;
    this.canvas.style.height = `${ph}px`;
    this.canvas.style.left = `${feetX - pw / 2}px`;
    this.canvas.style.top = `${feetY - ph}px`;
    const sw = pw * 0.7;
    const sh = Math.max(18, ph * 0.11);
    this.shadow.style.width = `${sw}px`;
    this.shadow.style.height = `${sh}px`;
    this.shadow.style.left = `${feetX - sw / 2}px`;
    this.shadow.style.top = `${feetY - sh * 0.45}px`;
  }

  _paint() {
    if (!this.source) return;
    paintLook(this.source, this.look || DEFAULT_LOOK, this.canvas);
  }

  _mark() {
    for (const btn of this.root.querySelectorAll(".art-choice")) {
      const on = this.look[btn.dataset.group] === btn.dataset.id;
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
}

function potIcon(item) {
  const color = item.color
    ? `rgb(${item.color.join(",")})`
    : "#ffd24a";
  if (item.pattern === "dots") {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="${color}" stroke="${INK}" stroke-width="3"/><circle cx="18" cy="20" r="3" fill="#fff8ee"/><circle cx="28" cy="18" r="3" fill="#fff8ee"/><circle cx="24" cy="28" r="3" fill="#fff8ee"/></svg>`;
  }
  if (item.pattern === "stars") {
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="${color}" stroke="${INK}" stroke-width="3"/><path d="M24 12l2.2 6.2H33l-5.2 3.8 2 6.2L24 24.6 18.2 28.2l2-6.2L15 18.2h6.8z" fill="#ffe56a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="16" fill="${color}" stroke="${INK}" stroke-width="3"/></svg>`;
}

function hairIcon(item) {
  const src = item.src || (item.id === "tuft" ? "assets/pibo/hair/tuft-icon.png" : "");
  if (!src) return noneIcon();
  return `<img src="${src}" alt="">`;
}

function hatIcon(item) {
  if (!item.src) return noneIcon();
  return `<img src="${item.src}" alt="">`;
}

function scarfIcon(item) {
  if (item.id === "none") return noneIcon();
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 16h32v10H8z" fill="${item.color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><path d="M14 21h20v4H14z" fill="#fff6ee" opacity="0.85"/><path d="M30 22h7v14h-7z" fill="${item.color}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/></svg>`;
}

function glassesIcon(item) {
  if (item.id === "none") return noneIcon();
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="16" width="14" height="12" rx="4" fill="${item.color}" stroke="${INK}" stroke-width="3"/><rect x="28" y="16" width="14" height="12" rx="4" fill="${item.color}" stroke="${INK}" stroke-width="3"/><path d="M20 22h8" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function noneIcon() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="14" fill="#fff8ee" stroke="${INK}" stroke-width="3"/><path d="M16 16l16 16" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function arrowIcon() {
  return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M28 12L16 24l12 12" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

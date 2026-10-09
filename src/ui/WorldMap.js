import { LAYOUT } from "../world/layout.js";
import { OCEAN_LAT } from "../world/biome.js";
import { PLANETS, lockedLabel } from "../data/planets.js";

/**
 * Places drawn on the home planet. Coordinates come from the world layout so
 * the map stays lined up with the island you can walk. `travel: "lighthouse"`
 * reuses the existing dock trip.
 */
const PLACES = [
  { id: "village", name: "Village", at: LAYOUT.start, featured: true },
  { id: "home", name: "Home", at: LAYOUT.home },
  { id: "garden", name: "Garden", at: LAYOUT.garden[1] },
  { id: "observatory", name: "Observatory", at: LAYOUT.observatory },
  { id: "cafe", name: "Café", at: LAYOUT.cafe },
  { id: "library", name: "Library", at: LAYOUT.library },
  { id: "lighthouse", name: "Lighthouse Studio", short: "Lighthouse", at: LAYOUT.lighthouse, featured: true, travel: "lighthouse" },
];

/** Percent from the disc center. 46 keeps the south pole inside the rim. */
const MAP_REACH = 46;

function project(lat, lon) {
  const r = (lat / 180) * MAP_REACH;
  const a = (lon * Math.PI) / 180;
  return {
    left: 50 + r * Math.cos(a),
    top: 50 + r * Math.sin(a),
  };
}

function angularDistance(a, b) {
  const toRad = Math.PI / 180;
  const lat1 = a.lat * toRad;
  const lat2 = b.lat * toRad;
  const dLon = (b.lon - a.lon) * toRad;
  const cos = Math.sin(lat1) * Math.sin(lat2) * Math.cos(dLon) + Math.cos(lat1) * Math.cos(lat2);
  return Math.acos(Math.min(1, Math.max(-1, cos)));
}

/**
 * Map overlay: the home planet with a you-are-here dot, plus later planets
 * that stay locked until a points system exists.
 */
export class WorldMap {
  constructor({ root, onTravel, onLocked, onClose } = {}) {
    this.root = root;
    this.onTravel = onTravel || null;
    this.onLocked = onLocked || null;
    this.onClose = onClose || null;
    this.isOpen = false;
    this._here = { lat: 0, lon: 0 };
    this._selected = null;

    this.disc = root.querySelector("[data-map-disc]");
    this.you = root.querySelector("[data-map-you]");
    this.detailName = root.querySelector("[data-map-detail-name]");
    this.detailNote = root.querySelector("[data-map-detail-note]");
    this.go = root.querySelector("[data-map-go]");
    this.galaxy = root.querySelector("[data-map-galaxy]");

    const land = root.querySelector("[data-map-land]");
    if (land) {
      const size = `${(2 * OCEAN_LAT / 180) * MAP_REACH}%`;
      land.style.width = size;
      land.style.height = size;
    }

    this._buildPins();
    this._buildGalaxy();
    this._bind();
    this._select(null);
  }

  _bind() {
    this.root.querySelector("[data-map-scrim]")?.addEventListener("click", () => this.close());
    this.root.querySelector("[data-map-close]")?.addEventListener("click", () => this.close());
    this.go?.addEventListener("click", () => {
      const id = this._selected?.travel;
      if (!id) return;
      this.close();
      this.onTravel?.(id);
    });
  }

  _buildPins() {
    for (const place of PLACES) {
      const pos = project(place.at.lat, place.at.lon);
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "map-pin" + (place.featured ? " is-featured" : "");
      pin.style.left = `${pos.left}%`;
      pin.style.top = `${pos.top}%`;
      pin.setAttribute("aria-label", place.name);
      pin.innerHTML = `<span class="map-pin-dot"></span><span class="map-pin-name">${place.short || place.name}</span>`;
      pin.addEventListener("click", () => this._select(place));
      this.disc.appendChild(pin);
    }

    const ocean = project(92, 210);
    const label = document.createElement("div");
    label.className = "map-ocean-label";
    label.style.left = `${ocean.left}%`;
    label.style.top = `${ocean.top}%`;
    label.textContent = "Ocean";
    this.disc.appendChild(label);
  }

  _buildGalaxy() {
    this.galaxy.innerHTML = "";
    for (const planet of PLANETS) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "planet-card" + (planet.locked ? " is-locked" : "") + (planet.home ? " is-home" : "");
      const note = planet.locked ? lockedLabel(planet) : planet.home ? "You are here" : planet.blurb;
      card.title = planet.locked ? note : planet.name;
      card.innerHTML = `
        <span class="planet-orb" style="background:${planet.color}"></span>
        <span class="planet-copy">
          <span class="planet-name">${planet.name}</span>
          <span class="planet-note">${planet.locked ? "🔒 Locked" : note}</span>
        </span>`;
      card.addEventListener("click", () => {
        if (planet.locked) this.onLocked?.(planet);
        else this._select(null);
      });
      this.galaxy.appendChild(card);
    }
  }

  _select(place) {
    this._selected = place;
    const hereName = this._nearestName();
    if (!place) {
      this.detailName.textContent = "You are here";
      this.detailNote.textContent = hereName;
      this.go.classList.add("hidden");
      return;
    }
    this.detailName.textContent = place.name;
    const standingThere = hereName === place.name;
    this.detailNote.textContent = standingThere ? "You are here" : place.travel ? "Tap to travel" : "On your planet";
    if (place.travel) {
      this.go.textContent = place.travel === "lighthouse" ? "Go to the lighthouse" : `Go to ${place.name}`;
      this.go.classList.remove("hidden");
    } else {
      this.go.classList.add("hidden");
    }
    for (const pin of this.disc.querySelectorAll(".map-pin")) {
      pin.classList.toggle("is-selected", pin.getAttribute("aria-label") === place.name);
    }
  }

  _nearestName() {
    let best = "Village";
    let bestD = Infinity;
    for (const place of PLACES) {
      const d = angularDistance(this._here, place.at);
      if (d < bestD) {
        bestD = d;
        best = place.name;
      }
    }
    if (this._here.lat > OCEAN_LAT && bestD > 0.35) return "Ocean";
    return best;
  }

  open(here = { lat: 0, lon: 0 }) {
    this._here = { lat: here.lat || 0, lon: here.lon || 0 };
    const pos = project(this._here.lat, this._here.lon);
    this.you.style.left = `${pos.left}%`;
    this.you.style.top = `${pos.top}%`;
    this._select(null);
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-hidden", "false");
    this.isOpen = true;
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-hidden", "true");
    this.isOpen = false;
    this.onClose?.();
  }

  toggle(here) {
    if (this.isOpen) this.close();
    else this.open(here);
  }
}

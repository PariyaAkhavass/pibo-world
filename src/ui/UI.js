import { PLANTS } from "../data/plants.js";

/**
 * Thin controller over the HTML overlay. Keeps the DOM out of gameplay code:
 * the Game asks the UI to show a prompt, open the plant panel, reveal a fact,
 * or toast a world moment. The planet stays the interface; this is just the
 * few soft touches layered on top.
 */
export class UI {
  constructor() {
    this.el = {
      intro: document.getElementById("intro"),
      prompt: document.getElementById("prompt"),
      promptLabel: document.querySelector("#prompt .prompt-label"),
      panel: document.getElementById("plant-panel"),
      cards: document.getElementById("plant-cards"),
      fact: document.getElementById("fact-card"),
      factEmoji: document.getElementById("fact-emoji"),
      factName: document.getElementById("fact-name"),
      factText: document.getElementById("fact-text"),
      collectionBtn: document.getElementById("collection-btn"),
      collection: document.getElementById("collection"),
      collectionList: document.getElementById("collection-list"),
      toast: document.getElementById("toast"),
    };

    this._onPick = null;
    this._collected = new Map(); // id -> count
    this._toastTimer = null;

    this._buildCards();
    this._renderCollection();

    this.el.collectionBtn.addEventListener("click", () => this.toggleCollection());
  }

  _buildCards() {
    this.el.cards.innerHTML = "";
    PLANTS.forEach((plant, i) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-emoji">${plant.emoji}</div>
        <div class="card-name">${plant.name}</div>
        <div class="card-hint">press ${i + 1}</div>`;
      card.addEventListener("click", () => this.pick(plant.id));
      this.el.cards.appendChild(card);
    });
  }

  hideIntro() {
    if (this.el.intro.style.opacity === "0") return;
    this.el.intro.style.opacity = "0";
    setTimeout(() => this.el.intro.classList.add("hidden"), 1200);
  }

  /* prompt --------------------------------------------------------- */
  setPrompt(label) {
    this.el.promptLabel.textContent = label;
    this.el.prompt.classList.remove("hidden");
  }
  hidePrompt() {
    this.el.prompt.classList.add("hidden");
  }

  /* plant panel ---------------------------------------------------- */
  get isModalOpen() {
    return !this.el.panel.classList.contains("hidden") ||
      !this.el.fact.classList.contains("hidden");
  }
  get isPanelOpen() {
    return !this.el.panel.classList.contains("hidden");
  }

  openPlantPanel(onPick) {
    this._onPick = onPick;
    this.el.panel.classList.remove("hidden");
    this.hidePrompt();
  }
  pick(id) {
    if (!this.isPanelOpen) return;
    const cb = this._onPick;
    this.closePanel();
    if (cb) cb(id);
  }
  pickByIndex(i) {
    const plant = PLANTS[i];
    if (plant) this.pick(plant.id);
  }
  closePanel() {
    this.el.panel.classList.add("hidden");
    this._onPick = null;
  }

  /* fact card ------------------------------------------------------ */
  showFact(plant) {
    this.el.factEmoji.textContent = plant.emoji;
    this.el.factName.textContent = plant.name;
    this.el.factText.textContent = plant.fact;
    this.el.fact.classList.remove("hidden");
    this.hidePrompt();
  }
  closeFact() {
    this.el.fact.classList.add("hidden");
  }

  closeModals() {
    this.closePanel();
    this.closeFact();
  }

  /* collection ----------------------------------------------------- */
  addGrown(plant) {
    this._collected.set(plant.id, (this._collected.get(plant.id) || 0) + 1);
    this._renderCollection();
    this.el.collectionBtn.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-8deg)" }, { transform: "scale(1)" }],
      { duration: 420, easing: "ease-out" }
    );
  }
  _renderCollection() {
    const list = this.el.collectionList;
    list.innerHTML = "";
    if (this._collected.size === 0) {
      const empty = document.createElement("div");
      empty.className = "collection-empty";
      empty.textContent = "Nothing yet — go plant something in the garden.";
      list.appendChild(empty);
      return;
    }
    for (const [id, count] of this._collected) {
      const plant = PLANTS.find((p) => p.id === id);
      const row = document.createElement("div");
      row.className = "collection-row";
      row.innerHTML = `<span class="dot">${plant.emoji}</span> ${plant.name} ×${count}`;
      list.appendChild(row);
    }
  }
  toggleCollection() {
    this.el.collection.classList.toggle("hidden");
  }
  closeCollection() {
    this.el.collection.classList.add("hidden");
  }

  /* toast ---------------------------------------------------------- */
  toast(msg, dur = 3200) {
    const t = this.el.toast;
    t.textContent = msg;
    t.classList.remove("hidden");
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      t.classList.remove("show");
      setTimeout(() => t.classList.add("hidden"), 400);
    }, dur);
  }
}

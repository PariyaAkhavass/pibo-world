import { PLANTS } from "../data/plants.js";
import { LESSON } from "../data/lesson.js";
import { vocabFor } from "../data/vocab.js";
import { HELIX, playablePlants } from "../data/helix.js";
import { Joystick } from "./Joystick.js";

/**
 * Thin controller over the HTML overlay. Keeps the DOM out of gameplay code:
 * the Game asks the UI to show a prompt, open the plant panel, reveal a
 * vocabulary card, or run a tiny recall quiz. The planet stays the interface;
 * this is just the few soft touches layered on top.
 */
export class UI {
  constructor() {
    this.el = {
      intro: document.getElementById("intro"),
      prompt: document.getElementById("prompt"),
      promptLabel: document.querySelector("#prompt .prompt-label"),
      panel: document.getElementById("plant-panel"),
      panelTitle: document.querySelector("#plant-panel .panel-title"),
      panelFoot: document.querySelector("#plant-panel .panel-foot"),
      cards: document.getElementById("plant-cards"),
      fact: document.getElementById("fact-card"),
      factLang: document.getElementById("fact-lang"),
      factEmoji: document.getElementById("fact-emoji"),
      factName: document.getElementById("fact-name"),
      factGloss: document.getElementById("fact-gloss"),
      factText: document.getElementById("fact-text"),
      factPhraseGloss: document.getElementById("fact-phrase-gloss"),
      factFrom: document.getElementById("fact-from"),
      factFoot: document.querySelector("#fact-card .fact-foot"),
      quiz: document.getElementById("quiz-card"),
      quizPrompt: document.getElementById("quiz-prompt"),
      quizEmoji: document.getElementById("quiz-emoji"),
      quizChoices: document.getElementById("quiz-choices"),
      quizFoot: document.getElementById("quiz-foot"),
      beyond: document.getElementById("beyond"),
      collectionBtn: document.getElementById("collection-btn"),
      collection: document.getElementById("collection"),
      collectionTitle: document.querySelector("#collection .collection-title"),
      collectionKicker: document.getElementById("collection-kicker"),
      collectionList: document.getElementById("collection-list"),
      toast: document.getElementById("toast"),
      mobileControls: document.getElementById("mobile-controls"),
      joystick: document.getElementById("joystick"),
      actionBtn: document.getElementById("action-btn"),
      flightPad: document.getElementById("flight-pad"),
      climbUp: document.getElementById("climb-up"),
      climbDown: document.getElementById("climb-down"),
    };

    this.input = null;
    this.joystick = null;
    this._onPick = null;
    this._onCardClose = null;
    this._onQuiz = null;
    this._quizChoices = [];
    this._quizLocked = false;
    this._collected = new Map(); // id -> count
    this._learned = new Set();
    this._toastTimer = null;
    this._touchUi = false;

    if (this.el.panelTitle) this.el.panelTitle.textContent = LESSON.ui.plantTitle;
    if (this.el.collectionTitle) this.el.collectionTitle.textContent = LESSON.ui.collectionTitle;
    if (this.el.collectionKicker) {
      this.el.collectionKicker.textContent = `${HELIX.constraints.title} · ${HELIX.target.name}`;
    }

    this._buildCards();
    this._renderCollection();

    this.el.collectionBtn.addEventListener("click", () => this.toggleCollection());
  }

  /**
   * Reveal the on-screen stick on phones/tablets (or the first touch),
   * and let taps fire the same actions as E / Esc.
   */
  attachInput(input) {
    this.input = input;
    this.joystick = new Joystick(this.el.joystick, (x, y) => input.setAxis(x, y));

    const show = () => this._enableTouchUi();
    if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) show();
    window.addEventListener("touchstart", show, { once: true, passive: true });

    this.el.actionBtn.addEventListener("click", (e) => {
      e.preventDefault();
      this._onAction();
    });
    this.el.prompt.addEventListener("click", () => input.press("KeyE"));
    this.el.fact.addEventListener("click", () => this.closeFact());
    this._bindHold(this.el.climbUp, 1);
    this._bindHold(this.el.climbDown, -1);
    this._syncActionBtn();
  }

  _bindHold(el, dir) {
    if (!el) return;
    const on = (e) => {
      e.preventDefault();
      this.input?.setClimb(dir);
    };
    const off = () => this.input?.setClimb(0);
    el.addEventListener("pointerdown", on);
    el.addEventListener("pointerup", off);
    el.addEventListener("pointerleave", off);
    el.addEventListener("pointercancel", off);
  }

  setFlying(on) {
    if (on) this.el.flightPad.classList.remove("hidden");
    else {
      this.el.flightPad.classList.add("hidden");
      this.input?.setClimb(0);
    }
  }

  _enableTouchUi() {
    if (this._touchUi) return;
    this._touchUi = true;
    document.documentElement.classList.add("touch-ui");
    this.el.mobileControls.classList.remove("hidden");
    this.el.panelFoot.innerHTML = "<b>tap</b> a plant · tap <b>E</b> to step back";
    this.el.factFoot.innerHTML = "<b>tap</b> to close";
    if (this.el.quizFoot) this.el.quizFoot.innerHTML = LESSON.ui.quizFootTouch;
    this._syncActionBtn();
  }

  _onAction() {
    if (!this.input) return;
    if (this.isPanelOpen) this.closePanel();
    else if (this.isQuizOpen) this.skipQuiz();
    else if (this.isModalOpen) this.closeFact();
    else this.input.press("KeyE");
  }

  _syncActionBtn() {
    const btn = this.el.actionBtn;
    if (!btn) return;
    if (this.isModalOpen) {
      btn.textContent = "back";
      btn.classList.add("close-mode");
      btn.classList.remove("ready");
      btn.setAttribute("aria-label", "Close");
    } else {
      btn.textContent = "E";
      btn.classList.remove("close-mode");
      btn.setAttribute("aria-label", "Interact");
    }
  }

  _buildCards() {
    this.el.cards.innerHTML = "";
    playablePlants(HELIX).forEach((plant, i) => {
      const vocab = vocabFor(plant.id);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-emoji">${plant.emoji}</div>
        <div class="card-name">${vocab?.word ?? plant.name}</div>
        <div class="card-gloss">${vocab?.gloss ?? ""}</div>
        <div class="card-hint"><span class="kb-only">press ${i + 1}</span><span class="touch-only">tap</span></div>`;
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
    this.el.actionBtn.classList.add("ready");
  }
  hidePrompt() {
    this.el.prompt.classList.add("hidden");
    if (!this.isModalOpen) this.el.actionBtn.classList.remove("ready");
  }

  /* plant panel ---------------------------------------------------- */
  get isModalOpen() {
    return !this.el.panel.classList.contains("hidden") ||
      !this.el.fact.classList.contains("hidden") ||
      this.isQuizOpen;
  }
  get isPanelOpen() {
    return !this.el.panel.classList.contains("hidden");
  }
  get isQuizOpen() {
    return !!(this.el.quiz && !this.el.quiz.classList.contains("hidden"));
  }
  get isFactOpen() {
    return !this.el.fact.classList.contains("hidden");
  }

  openPlantPanel(onPick) {
    this._onPick = onPick;
    this.el.panel.classList.remove("hidden");
    this.hidePrompt();
    this._syncActionBtn();
  }
  pick(id) {
    if (!this.isPanelOpen) return;
    const cb = this._onPick;
    this.closePanel();
    if (cb) cb(id);
  }
  pickByIndex(i) {
    const plant = playablePlants(HELIX)[i];
    if (plant) this.pick(plant.id);
  }
  closePanel() {
    this.el.panel.classList.add("hidden");
    this._onPick = null;
    this._syncActionBtn();
  }

  /* vocab / letter card -------------------------------------------- */
  showVocab(plant, vocab, { onClose } = {}) {
    this._onCardClose = onClose || null;
    this.el.fact.classList.remove("letter");
    this.el.fact.classList.add("vocab");
    this.el.factLang.textContent = HELIX.target.name;
    this.el.factEmoji.textContent = plant.emoji;
    this.el.factName.textContent = vocab?.word ?? plant.name;
    this.el.factGloss.textContent = vocab?.gloss ?? "";
    this.el.factText.textContent = vocab?.phrase ?? "";
    this.el.factPhraseGloss.textContent = vocab?.phraseGloss ?? "";
    this.el.factFrom.textContent = "";
    this.el.fact.classList.remove("hidden");
    this.hidePrompt();
    this._syncActionBtn();
  }

  showFact(plant) {
    this.showVocab(plant, vocabFor(plant.id));
  }

  showLetter({ emoji = "💌", name = "", text, from = "", onClose } = {}) {
    this._onCardClose = onClose || null;
    this.el.fact.classList.remove("vocab");
    this.el.fact.classList.add("letter");
    this.el.factLang.textContent = "";
    this.el.factGloss.textContent = "";
    this.el.factPhraseGloss.textContent = "";
    this.el.factEmoji.textContent = emoji;
    this.el.factName.textContent = name;
    this.el.factText.textContent = text;
    this.el.factFrom.textContent = from;
    this.el.fact.classList.remove("hidden");
    this.hidePrompt();
    this._syncActionBtn();
  }

  closeFact() {
    this.el.fact.classList.add("hidden");
    this.el.fact.classList.remove("letter", "vocab");
    this._syncActionBtn();
    const cb = this._onCardClose;
    this._onCardClose = null;
    if (cb) cb();
  }

  /* recall quiz ---------------------------------------------------- */
  showQuiz({ plant, choices, onResult } = {}) {
    this._onQuiz = onResult || null;
    this._quizChoices = choices || [];
    this._quizLocked = false;
    this.el.quizPrompt.textContent = LESSON.ui.quizPrompt;
    this.el.quizEmoji.textContent = plant?.emoji ?? "🌱";
    if (!this._touchUi) this.el.quizFoot.innerHTML = LESSON.ui.quizFoot;
    this.el.quizChoices.innerHTML = "";
    this._quizChoices.forEach((choice, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-choice";
      btn.innerHTML = `<span class="quiz-key">${i + 1}</span><span class="quiz-word">${choice.word}</span>`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.answerQuiz(i);
      });
      this.el.quizChoices.appendChild(btn);
    });
    this.el.quiz.classList.remove("hidden");
    this.hidePrompt();
    this._syncActionBtn();
  }

  answerQuiz(index) {
    if (!this.isQuizOpen || this._quizLocked) return;
    const choice = this._quizChoices[index];
    const btn = this.el.quizChoices.children[index];
    if (!choice || !btn || btn.disabled) return;

    if (choice.correct) {
      this._quizLocked = true;
      btn.classList.add("correct");
      for (const other of this.el.quizChoices.children) other.disabled = true;
      setTimeout(() => {
        const cb = this._onQuiz;
        this._closeQuizDom();
        if (cb) cb({ correct: true, plantId: choice.plantId, word: choice.word });
      }, 480);
    } else {
      btn.classList.add("wrong");
      btn.disabled = true;
      this.el.quizPrompt.textContent = "Not quite — try another?";
      this._onQuiz?.({
        correct: false,
        skipped: false,
        plantId: choice.plantId,
        word: choice.word,
        attempt: true,
      });
    }
  }

  skipQuiz() {
    if (!this.isQuizOpen) return;
    const cb = this._onQuiz;
    this._closeQuizDom();
    if (cb) cb({ correct: false, skipped: true });
  }

  _closeQuizDom() {
    this.el.quiz.classList.add("hidden");
    this._quizChoices = [];
    this._quizLocked = false;
    this._onQuiz = null;
    this._syncActionBtn();
  }

  showBeyond() {
    this.el.beyond.classList.remove("hidden");
    requestAnimationFrame(() => this.el.beyond.classList.add("show"));
  }

  closeModals() {
    this.closePanel();
    this.skipQuiz();
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
  markLearned(plantId) {
    this._learned.add(plantId);
    this._renderCollection();
  }
  _renderCollection() {
    const list = this.el.collectionList;
    list.innerHTML = "";
    if (this._collected.size === 0) {
      const empty = document.createElement("div");
      empty.className = "collection-empty";
      empty.textContent = LESSON.ui.collectionEmpty;
      list.appendChild(empty);
      return;
    }
    for (const [id, count] of this._collected) {
      const plant = PLANTS.find((p) => p.id === id);
      const vocab = vocabFor(id);
      const learned = this._learned.has(id);
      const row = document.createElement("div");
      row.className = "collection-row" + (learned ? " learned" : "");
      const word = vocab?.word ?? plant.name;
      const gloss = vocab?.gloss ? ` · ${vocab.gloss}` : "";
      const mark = learned ? `<span class="learned-mark" title="remembered">✓</span>` : "";
      row.innerHTML = `<span class="dot">${plant.emoji}</span> ${word}${gloss} ×${count} ${mark}`;
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

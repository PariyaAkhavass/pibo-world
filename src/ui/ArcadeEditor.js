import { STICKERS, BACKGROUNDS, HIDE_SPOTS, hideSpot } from "../data/arcadeStickers.js";
import { createArcadeAssistant } from "../systems/arcadeAssistant.js";
import { read, authorOf, normalizeSteps, normalizeSpec } from "../systems/gameSpec.js";
import { createTreasurePlay } from "../systems/treasureRuntime.js";
import { createAuthorshipLog, loadAuthorshipLog, saveAuthorshipLog, downloadJson } from "../systems/arcadeLog.js";

const SAVE_KEY = "pibo.arcade.spec";

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function who(author) {
  if (author === "child") return "you";
  if (author === "ai") return "helper";
  if (author === "teacher") return "teacher";
  return "starter";
}

/**
 * One editor overlay: pick a template or answer a few questions, then drag
 * the room, write English clues, test the game, and export the authorship log.
 */
export class ArcadeEditor {
  constructor({ root, lesson, assistant, onClose } = {}) {
    this.root = root;
    this.onClose = onClose || null;
    this.assistant = assistant || createArcadeAssistant({ lesson });
    this.lesson = this.assistant.lesson;
    this.log = loadAuthorshipLog();
    this.spec = null;
    this.answers = {};
    this.questionIndex = 0;
    this.questions = [];
    this.play = null;
    this.mode = "start";
  }

  open() {
    this.root.classList.remove("hidden");
    this.root.setAttribute("aria-hidden", "false");
    this.mode = "start";
    this._render();
  }

  close() {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.root.setAttribute("aria-hidden", "true");
    this.onClose?.();
  }

  get isOpen() {
    return this.root && !this.root.classList.contains("hidden");
  }

  _render() {
    this.root.replaceChildren();
    const card = h("div", "arcade-card");
    const bar = h("div", "arcade-bar");
    bar.append(h("div", "arcade-kicker", "Arcade room"));
    const close = h("button", "arcade-x", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close arcade");
    close.addEventListener("click", () => this.close());
    bar.append(close);
    card.append(bar);

    if (this.mode === "start") card.append(this._start());
    else if (this.mode === "ask") card.append(this._ask());
    else if (this.mode === "play") card.append(this._playView());
    else card.append(this._edit());

    this.root.append(card);
  }

  _start() {
    const body = h("div", "arcade-body");
    body.append(h("h2", "arcade-title", "Make a tiny game"));
    body.append(h("p", "arcade-lead", "You choose the goal, the obstacles, and the English clues. The arcade draws the pictures."));
    const choices = h("div", "arcade-choices");
    const template = h("button", "arcade-choice", "Choose a game template");
    template.type = "button";
    const templateNote = h("span", "arcade-choice-note", "Treasure hunt · a ghost in a castle");
    template.append(templateNote);
    template.addEventListener("click", () => this._chooseTemplate());
    const describe = h("button", "arcade-choice arcade-choice-alt", "Describe your game idea");
    describe.type = "button";
    describe.append(h("span", "arcade-choice-note", "Answer a few questions, then edit"));
    describe.addEventListener("click", () => this._startQuestions());
    choices.append(template, describe);
    body.append(choices);
    if (this._savedSpec()) {
      const cont = h("button", "arcade-textbtn", "Continue your saved game");
      cont.type = "button";
      cont.addEventListener("click", () => this._continue());
      body.append(cont);
    }
    return body;
  }

  _chooseTemplate() {
    this.spec = this.assistant.template();
    this.log.add("template-chosen", { id: "ghost-castle", title: read(this.spec.title) }, "child");
    this.log.add("prompt", { id: "template", prompt: "Choose a game template" }, "template");
    this.mode = "edit";
    this._render();
  }

  _startQuestions() {
    this.answers = {};
    this.questionIndex = 0;
    this.questions = this.assistant.questions(this.answers);
    this.mode = "ask";
    this._logPrompt();
    this._render();
  }

  _logPrompt() {
    const q = this.questions[this.questionIndex];
    if (!q) return;
    this.log.add("prompt", { id: q.id, prompt: q.prompt }, "template");
  }

  _ask() {
    const q = this.questions[this.questionIndex];
    const body = h("div", "arcade-body");
    body.append(h("p", "arcade-step", `Question ${this.questionIndex + 1} of ${this.questions.length}`));
    body.append(h("h2", "arcade-title", q.prompt));
    if (q.hint) body.append(h("p", "arcade-lead", q.hint));
    const chips = h("div", "arcade-chips");
    let picked = null;
    const field = h("textarea", "arcade-type");
    field.rows = 2;
    field.placeholder = q.placeholder || "Type your own answer";
    for (const chip of q.chips) {
      const button = h("button", "arcade-chip", chip.label);
      button.type = "button";
      button.addEventListener("click", () => {
        picked = chip;
        field.value = chip.label;
        for (const other of chips.querySelectorAll(".arcade-chip")) other.classList.remove("is-on");
        button.classList.add("is-on");
        this.log.add("chip", { questionId: q.id, chipId: chip.id, label: chip.label }, "child");
      });
      chips.append(button);
    }
    body.append(chips, field);
    const next = h("button", "arcade-go", this.questionIndex === this.questions.length - 1 ? "Make my game" : "Next");
    next.type = "button";
    next.addEventListener("click", () => this._answer(q, picked, field.value));
    body.append(next);
    return body;
  }

  _answer(q, chip, typed) {
    const text = String(typed || "").trim();
    if (!text && !chip) return;
    const usedChip = chip && text === chip.label;
    if (!usedChip && text) this.log.add("typed", { questionId: q.id, text }, "child");
    if (q.id === "idea") this.answers.idea = text || chip?.label || "";
    if (q.id === "keyPlace") this.answers.keyPlace = usedChip ? chip.place || chip.id : this._matchSpot(text);
    if (q.id === "clue") {
      this.answers.clue = usedChip ? chip.text || chip.label : text;
      if (usedChip?.place) this.answers.treasurePlace = chip.place;
      else this.answers.treasurePlace = this._matchSpot(text);
    }
    this.questionIndex += 1;
    if (this.questionIndex < this.questions.length) {
      this.questions = this.assistant.questions(this.answers);
      this._logPrompt();
      this.mode = "ask";
      this._render();
      return;
    }
    this._finishAssistant();
  }

  _matchSpot(text) {
    const lower = text.toLowerCase();
    const found = HIDE_SPOTS.find((spot) => lower.includes(spot.name) || lower.includes(spot.phrase));
    return found?.id;
  }

  async _finishAssistant() {
    this.spec = await this.assistant.finish(this.answers);
    this.mode = "edit";
    this._render();
  }

  _continue() {
    const saved = this._savedSpec();
    if (!saved) return;
    this.spec = normalizeSpec(saved, this.lesson);
    this.log.add("edit", { field: "continue", id: this.spec.id }, "child");
    this.mode = "edit";
    this._render();
  }

  _savedSpec() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _edit() {
    const spec = this.spec;
    const body = h("div", "arcade-body arcade-workspace");
    const title = h("h2", "arcade-title", read(spec.title));
    body.append(title);
    body.append(h("p", "arcade-lead", "Drag the stickers. You decide where the key and the treasure hide, the order, and the clues."));

    const actions = h("div", "arcade-actions");
    actions.append(this._action("Play / Test", "arcade-go", () => this._beginPlay()));
    actions.append(this._action("Save", "arcade-quiet", () => this._save()));
    actions.append(this._action("Export log (JSON)", "arcade-quiet", () => this._export()));
    actions.append(this._action("Back", "arcade-quiet", () => {
      this.mode = "start";
      this._render();
    }));
    body.append(actions);

    const room = this._room(spec, true);
    const side = h("div", "arcade-side");

    side.append(h("div", "arcade-label", "Stickers"));
    const library = h("div", "arcade-stickers");
    for (const sticker of [STICKERS.ghost, STICKERS.cat, STICKERS.door, STICKERS.bed, STICKERS.tree, STICKERS.chest, STICKERS.painting]) {
      const button = h("button", "arcade-sticker", `${sticker.emoji} ${sticker.label}`);
      button.type = "button";
      button.addEventListener("click", () => this._useSticker(sticker));
      library.append(button);
    }
    side.append(library);

    side.append(this._labeledField("Goal", read(spec.goal), authorOf(spec.goal), (value) => {
      spec.goal = { value, author: "child" };
      this.log.add("edit", { field: "goal", value }, "child");
    }));

    side.append(this._spotSelect("Key hides", read(spec.obstacles[0].keyHidesIn), (id) => {
      const obstacle = spec.obstacles[0];
      obstacle.keyHidesIn = { value: id, author: "child" };
      if (read(obstacle.treasureHidesIn) === id) {
        const other = HIDE_SPOTS.find((spot) => spot.id !== id);
        obstacle.treasureHidesIn = { value: other.id, author: "child" };
      }
      this.log.add("edit", { field: "keyHidesIn", value: id }, "child");
      this._render();
    }));
    side.append(this._spotSelect("Treasure hides", read(spec.obstacles[0].treasureHidesIn), (id) => {
      if (id === read(spec.obstacles[0].keyHidesIn)) {
        this._toast("The treasure needs its own hiding place.");
        return false;
      }
      spec.obstacles[0].treasureHidesIn = { value: id, author: "child" };
      this.log.add("edit", { field: "treasureHidesIn", value: id }, "child");
      this._render();
    }));

    side.append(h("div", "arcade-label", "Order of steps"));
    const order = h("div", "arcade-order");
    this._paintOrder(order, spec);
    side.append(order);

    side.append(this._clueField("Clue for the key", spec.clues[0]));
    side.append(this._clueField("Clue for the treasure", spec.clues[1]));
    side.append(h("p", "arcade-frame", `Lesson frame: ${this.lesson.grammar.frame}`));

    const columns = h("div", "arcade-columns");
    columns.append(room, side);
    body.append(columns);
    this._roomNode = room;
    return body;
  }

  _action(label, className, onClick) {
    const button = h("button", className, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
  }

  _labeledField(label, value, author, onChange) {
    const wrap = h("label", "arcade-field");
    wrap.append(h("span", "arcade-label", `${label} · ${who(author)}`));
    const input = h("input", "arcade-input");
    input.value = value || "";
    input.addEventListener("change", () => onChange(input.value.trim()));
    wrap.append(input);
    return wrap;
  }

  _spotSelect(label, value, onChange) {
    const wrap = h("label", "arcade-field");
    wrap.append(h("span", "arcade-label", label));
    const select = h("select", "arcade-input");
    for (const spot of HIDE_SPOTS) {
      const option = h("option", "", spot.phrase);
      option.value = spot.id;
      if (spot.id === value) option.selected = true;
      select.append(option);
    }
    select.addEventListener("change", () => {
      const ok = onChange(select.value);
      if (ok === false) select.value = value;
    });
    wrap.append(select);
    return wrap;
  }

  _clueField(label, clue) {
    const wrap = h("label", "arcade-field");
    wrap.append(h("span", "arcade-label", `${label} · ${who(clue.author)}`));
    const area = h("textarea", "arcade-type");
    area.rows = 2;
    area.value = clue.text || "";
    area.addEventListener("change", () => {
      clue.text = area.value.trim();
      clue.author = "child";
      wrap.querySelector(".arcade-label").textContent = `${label} · you`;
      this.log.add("edit", { field: clue.id, value: clue.text }, "child");
    });
    wrap.append(area);
    return wrap;
  }

  _paintOrder(order, spec) {
    order.replaceChildren();
    const steps = read(spec.steps);
    steps.forEach((step, index) => {
      const row = h("div", "arcade-step-row");
      row.append(h("span", "", `${index + 1}. ${step}`));
      if (index > 0) {
        const up = h("button", "arcade-mini", "Up");
        up.type = "button";
        up.addEventListener("click", () => {
          const next = steps.slice();
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
          spec.steps = { value: normalizeSteps(next), author: "child" };
          this.log.add("edit", { field: "steps", value: next }, "child");
          this._paintOrder(order, spec);
        });
        row.append(up);
      }
      order.append(row);
    });
  }

  _useSticker(sticker) {
    const spec = this.spec;
    if (sticker.id === "ghost" || sticker.id === "cat") {
      spec.hero = { value: sticker.id, author: "child" };
      this.log.add("edit", { field: "hero", value: sticker.id }, "child");
    } else {
      const object = spec.objects.find((item) => item.id === sticker.id || item.asset === sticker.id);
      if (object) {
        object.asset = sticker.id;
        object.author = "child";
      }
      this.log.add("edit", { field: "sticker", value: sticker.id }, "child");
    }
    if (this._roomNode) this._paintRoom(this._roomNode, spec, true);
  }

  _room(spec, editable) {
    const room = h("div", `arcade-room room-${read(spec.scene.background) || "castle"}`);
    this._paintRoom(room, spec, editable);
    return room;
  }

  _paintRoom(room, spec, editable) {
    room.className = `arcade-room room-${read(spec.scene.background) || "castle"}`;
    room.replaceChildren();
    const bg = BACKGROUNDS[read(spec.scene.background)] || BACKGROUNDS.castle;
    room.append(h("div", "arcade-bg-label", bg.label));
    const hero = STICKERS[read(spec.hero)] || STICKERS.ghost;
    const mascot = h("div", "arcade-hero", hero.emoji);
    mascot.title = hero.label;
    room.append(mascot);
    const keyIn = read(spec.obstacles[0].keyHidesIn);
    const treasureIn = read(spec.obstacles[0].treasureHidesIn);
    const lockId = read(spec.obstacles[0].lockId);
    for (const object of spec.objects) {
      const sticker = STICKERS[object.asset] || STICKERS.door;
      const spot = h("button", "arcade-object");
      spot.type = "button";
      spot.style.left = `${object.x}%`;
      spot.style.top = `${object.y}%`;
      const tags = [];
      if (object.id === keyIn) tags.push("key");
      if (object.id === treasureIn) tags.push("treasure");
      if (object.id === lockId) tags.push("lock");
      spot.append(h("span", "arcade-emoji", sticker.emoji));
      spot.append(h("span", "arcade-object-name", object.name));
      if (tags.length && editable) spot.append(h("span", "arcade-tags", tags.join(" · ")));
      if (editable) this._drag(spot, object);
      else spot.addEventListener("click", () => this._onPlayClick(object.id));
      room.append(spot);
    }
  }

  _drag(spot, object) {
    let start = null;
    let moved = false;
    const down = (event) => {
      event.preventDefault();
      const room = spot.parentElement.getBoundingClientRect();
      start = { x: event.clientX, y: event.clientY, room };
      moved = false;
      spot.setPointerCapture?.(event.pointerId);
    };
    const move = (event) => {
      if (!start) return;
      const room = start.room;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (dx * dx + dy * dy < 9) return;
      moved = true;
      object.x = Math.min(92, Math.max(8, ((event.clientX - room.left) / room.width) * 100));
      object.y = Math.min(88, Math.max(12, ((event.clientY - room.top) / room.height) * 100));
      spot.style.left = `${object.x}%`;
      spot.style.top = `${object.y}%`;
    };
    const up = () => {
      if (!start || !moved) {
        start = null;
        return;
      }
      start = null;
      moved = false;
      object.author = "child";
      this.log.add("edit", { field: "move", id: object.id, x: Math.round(object.x), y: Math.round(object.y) }, "child");
    };
    spot.addEventListener("pointerdown", down);
    spot.addEventListener("pointermove", move);
    spot.addEventListener("pointerup", up);
  }

  _beginPlay() {
    this.play = createTreasurePlay(this.spec);
    this.mode = "play";
    this.log.add("play", { id: this.spec.id }, "child");
    this._render();
  }

  _playView() {
    const spec = this.spec;
    const body = h("div", "arcade-body");
    body.append(h("h2", "arcade-title", read(spec.title)));
    const clue = h("p", "arcade-clue", this.play.clueForStep() || read(spec.goal));
    body.append(clue);
    const room = this._room(spec, false);
    body.append(room);
    const message = h("p", "arcade-message", "Tap a thing in the room.");
    body.append(message);
    this._playClue = clue;
    this._playMessage = message;
    const back = h("button", "arcade-quiet", "Back to edit");
    back.type = "button";
    back.addEventListener("click", () => {
      this.mode = "edit";
      this._render();
    });
    body.append(back);
    return body;
  }

  _onPlayClick(objectId) {
    if (!this.play) return;
    const result = this.play.click(objectId);
    if (this._playMessage) this._playMessage.textContent = result.message;
    if (this._playClue) this._playClue.textContent = this.play.clueForStep() || (result.won ? "You did it!" : this._playClue.textContent);
    this.log.add("play", { click: objectId, won: !!result.won, message: result.message }, "child");
  }

  _save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.spec));
    saveAuthorshipLog(this.log, { specId: this.spec?.id, lessonId: this.lesson.id });
    this.log.add("save", { id: this.spec.id }, "child");
    saveAuthorshipLog(this.log, { specId: this.spec?.id, lessonId: this.lesson.id });
    this._toast("Saved in this browser");
  }

  _export() {
    const data = saveAuthorshipLog(this.log, { specId: this.spec?.id, lessonId: this.lesson.id });
    this.log.add("export", { events: data.events.length }, "child");
    const fresh = saveAuthorshipLog(this.log, { specId: this.spec?.id, lessonId: this.lesson.id });
    downloadJson("pibo-arcade-log.json", fresh);
    this._toast("Exported authorship log");
    this._showLog(fresh);
  }

  _showLog(data) {
    let pre = this.root.querySelector(".arcade-log");
    if (!pre) {
      pre = h("pre", "arcade-log");
      this.root.querySelector(".arcade-card")?.append(pre);
    }
    pre.textContent = JSON.stringify({ version: data.version, events: data.events }, null, 2);
  }

  _toast(text) {
    let note = this.root.querySelector(".arcade-toast");
    if (!note) {
      note = h("div", "arcade-toast");
      this.root.querySelector(".arcade-card")?.append(note);
    }
    note.textContent = text;
  }
}

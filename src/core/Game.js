import * as THREE from "three";
import { Input } from "./Input.js";
import { Collision } from "./Collision.js";
import { Island } from "../world/Island.js";
import { SpriteSet } from "../world/SpriteSet.js";
import { isoBasis, orthoSize } from "../world/iso.js";
import { LAYOUT, PLACEMENTS, GROUND_Y, collidersFromPlacements } from "../world/layout.js";
import { ASSETS, collectSources } from "../data/assets.js";
import { loadTextureSet, textureSizes } from "../world/textures.js";
import { GardenSystem } from "../systems/GardenSystem.js";
import { TvStudio } from "../systems/TvStudio.js";
import { ArcadeRoom } from "../systems/ArcadeRoom.js";
import { Pibo } from "../entities/Pibo.js";
import { getPlant } from "../data/plants.js";
import { SHOW_VILLAGE_FRIENDS } from "../config.js";

const ENTER_RANGE = 2.15;

/**
 * Isometric island. The camera angle stays fixed; it only slides to follow
 * Pibo. Props are images from the asset manifest. Studio, arcade, garden,
 * and the hidden friends keep their old jobs.
 */
export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.clock = new THREE.Clock();
    this.started = false;
    this.basis = isoBasis(48);

    this._initRenderer();
    this._initScene();
    this.input = new Input();
    this.ui.attachInput(this.input);
    window.addEventListener("resize", () => this._onResize());
    window.addEventListener("keydown", (e) => {
      if (!["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) return;
      this.started = true;
      this.ui.hideIntro();
    });

    this._focus = new THREE.Vector3(LAYOUT.start.x, 0.6, LAYOUT.start.z);
    this._isoOffset = this.basis.offset.clone();
    this._guideTip = new THREE.Vector3();
    this._guideNdc = new THREE.Vector3();
    this._wasSwimming = false;

    this.ui.onGoToLighthouse = () => this._goToLighthouse();
    this.ui.onMapHere = () => this._playerMapPos();
    this.ui.onGoToArcade = () => this._goToArcade();
    this.ui.onMapTravel = (placeId) => {
      if (placeId === "lighthouse") this._goToLighthouse();
      else if (placeId === "arcade") this._goToArcade();
    };
  }

  async preload() {
    const sources = collectSources(ASSETS);
    this.textures = await loadTextureSet(sources, textureSizes(ASSETS));
    this._initWorld();
    this._initPlayer();
    this._initCamera();
  }

  _playerMapPos() {
    return { x: this.pibo.x, z: this.pibo.z };
  }

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.sortObjects = true;
    this.renderer = renderer;
  }

  _initScene() {
    this.scene = new THREE.Scene();
  }

  _initWorld() {
    this.island = new Island(this.scene, this.textures, this.basis);
    this.sprites = new SpriteSet(this.scene, this.textures, this.basis);
    this.collision = new Collision(collidersFromPlacements(PLACEMENTS, ASSETS));

    this.garden = new GardenSystem(this.scene, { isoQuat: this.basis.quaternion }).build();
    this.garden.onBloom = (spot) => {
      const plant = getPlant(spot.plantId);
      this.ui.addGrown(plant);
      this.ui.toast(`Your ${plant.name} bloomed ${plant.emoji}`, 2400);
    };
    this.garden.onAllGrown = () => this._reward();

    this.studio = new TvStudio(null, { outdoorScreen: null });
    this.arcadeRoom = new ArcadeRoom(this.canvas);
    this.arcadeRoom.onPlay = (id) => this.ui.arcade?.hitPlay(id);
    this.arcadeRoom.onMove = (id, x, y, commit) => this.ui.arcade?.moveOnScreen(id, x, y, commit);
    this.ui.arcade.onScreen = (view) => this.arcadeRoom.show(view);
    this.ui.onArcadeLeave = () => this._leaveArcade();
  }

  _initPlayer() {
    const start = LAYOUT.start;
    this.pibo = new Pibo({
      textures: this.textures,
      basis: this.basis,
      x: start.x,
      z: start.z,
    });
    this.scene.add(this.pibo.group);

    this.friendsVisible = SHOW_VILLAGE_FRIENDS;
    this.companion = new Pibo({
      textures: this.textures,
      basis: this.basis,
      x: LAYOUT.companion.x,
      z: LAYOUT.companion.z,
      controllable: false,
      tint: 0x9ec8f8,
    });
    this.pino = new Pibo({
      textures: this.textures,
      basis: this.basis,
      x: LAYOUT.pino.x,
      z: LAYOUT.pino.z,
      controllable: false,
      scale: 0.62,
      tint: 0xfff6ea,
    });
    this.scene.add(this.companion.group);
    this.scene.add(this.pino.group);
    if (!this.friendsVisible) {
      this.companion.setVisible(false);
      this.pino.setVisible(false);
    }
    this.letterRead = false;
  }

  _initCamera() {
    const { viewW, viewH } = orthoSize(window.innerWidth, window.innerHeight);
    this.camera = new THREE.OrthographicCamera(
      -viewW / 2,
      viewW / 2,
      viewH / 2,
      -viewH / 2,
      0.1,
      220
    );
    this._frameCameraOnPibo();
  }

  start() {
    this.renderer.setAnimationLoop(() => this._frame());
    this._maybeBootStudio();
  }

  _maybeBootStudio() {
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.has("arcade")) {
        this._goToArcade();
        this._enterArcade();
        return;
      }
      if (!q.has("studio") && !q.has("dock")) return;
      const pad = LAYOUT.lighthousePad;
      const face = this._faceToward(pad, LAYOUT.lighthouse);
      this.pibo.placeAt(pad.x, pad.z, face.x, face.z, this.collision);
      this.started = true;
      this.ui.hideIntro();
      this._frameCameraOnPibo();
      if (q.has("studio")) this._enterStudio();
    } catch {
      return;
    }
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.arcadeRoom.active) {
      this.arcadeRoom.update(dt);
      this._handleArcadeInteraction();
      this.input.endFrame();
      this.renderer.render(this.arcadeRoom.scene, this.arcadeRoom.camera);
      return;
    }

    if (this.studio.active) {
      this.studio.update(dt);
      this._handleStudioInteraction();
      this.input.endFrame();
      this.renderer.render(this.studio.scene, this.studio.camera);
      return;
    }

    const frozen = this.ui.isModalOpen || this.ui.isMapOpen || this.ui.isArcadeOpen;
    if (this.friendsVisible) {
      this.companion.update(dt, null, { frozen: true });
      this.pino.update(dt, null, { frozen: true });
    }

    this.pibo.update(dt, this.input, { frozen, collision: this.collision });

    if (!this.started && this.pibo.moving) {
      this.started = true;
      this.ui.hideIntro();
    }
    if (this.pibo.inWater && !this._wasSwimming) {
      this.ui.toast("Splash — Pibo swims!", 1600);
    }
    this._wasSwimming = this.pibo.inWater;

    this._updateCamera(dt);
    this._updateLighthouseGuide();
    this._handleInteraction();

    this.island.update(dt);
    this.sprites.update(dt);
    this.garden.update(dt);

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  _updateCamera(dt) {
    const k = 1 - Math.exp(-3.4 * dt);
    const look = new THREE.Vector3(this.pibo.x, 0.7, this.pibo.z);
    this._focus.lerp(look, k);
    this.camera.position.copy(this._focus).add(this._isoOffset);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._focus);
  }

  _handleInteraction() {
    const ui = this.ui;

    if (ui.isArcadeOpen) {
      ui.hidePrompt();
      if (this.input.consume("Escape")) ui.closeArcade();
      return;
    }

    if (ui.isMapOpen) {
      ui.hidePrompt();
      if (this.input.consume("Escape")) ui.closeMap();
      return;
    }

    if (ui.isModalOpen) {
      ui.hidePrompt();
      if (ui.isPanelOpen) {
        if (this.input.consume("Digit1", "Numpad1")) ui.pickByIndex(0);
        else if (this.input.consume("Digit2", "Numpad2")) ui.pickByIndex(1);
        else if (this.input.consume("Digit3", "Numpad3")) ui.pickByIndex(2);
        else if (this.input.consume("Escape")) ui.closePanel();
      } else if (this.input.consume("Escape", "KeyE", "Enter")) {
        ui.closeFact();
      }
      return;
    }

    const p = this.pibo.worldPosition();
    const tower = this.studio.getInteractable(p);
    if (tower) {
      ui.setPrompt(tower.label);
      if (this.input.consume("KeyE", "Enter")) this._enterStudio();
      return;
    }

    const arcade = this._near(p, LAYOUT.arcadeDoor, ENTER_RANGE)
      ? { label: "Enter arcade" }
      : null;
    if (arcade) {
      ui.setPrompt(arcade.label);
      if (this.input.consume("KeyE", "Enter")) this._enterArcade();
      return;
    }

    if (this.friendsVisible && Math.hypot(p.x - this.companion.x, p.z - this.companion.z) < 1.8) {
      ui.setPrompt("Talk");
      if (this.input.consume("KeyE", "Enter")) this._talkToCompanion();
      return;
    }

    const it = this.garden.getInteractable(p);
    if (!it) {
      ui.hidePrompt();
      return;
    }
    ui.setPrompt(it.label);
    if (it.disabled) return;
    if (this.input.consume("KeyE", "Enter")) {
      if (it.kind === "plant") {
        ui.openPlantPanel((plantId) => this.garden.plant(it.spot, plantId));
      } else if (it.kind === "inspect") {
        ui.showFact(this.garden.factFor(it.spot));
      }
    }
  }

  _near(p, spot, range) {
    return Math.hypot(p.x - spot.x, p.z - spot.z) < range;
  }

  _faceToward(from, to) {
    const x = to.x - from.x;
    const z = to.z - from.z;
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len };
  }

  _talkToCompanion() {
    this.ui.showLetter({
      emoji: "💌",
      name: "",
      text: "I love you so much. I cannot wait to travel the world with you and beyond.\nMe + you + Pino always..",
      from: "— R",
      onClose: () => this._revealFamilyShip(),
    });
  }

  _revealFamilyShip() {
    if (this.letterRead) return;
    this.letterRead = true;
    this.ui.toast("They dream of a voyage together", 2800);
  }

  _handleArcadeInteraction() {
    if (this.input.consume("Escape")) this._leaveArcade();
  }

  _handleStudioInteraction() {
    if (this.ui.isIdeaOpen) {
      if (this.input.consume("Escape")) this.ui.closeIdeas();
      return;
    }
    const typing = this.ui.isStudioTyping;
    if (this.input.consume("Escape")) {
      this._leaveStudio();
      return;
    }
    if (!typing && this.input.consume("KeyE")) this._leaveStudio();
  }

  _enterStudio() {
    this.started = true;
    this.ui.hideIntro();
    this.ui.closeModals();
    this.ui.closeCollection();
    this.studio.enter();
    this.ui.openStudio({
      onGenerate: (prompt) => this._generateStudioClip(prompt),
      onLeave: () => this._leaveStudio(),
    });
    this.renderer.setClearColor(0x1c1730, 1);
    this.ui.toast("The lighthouse welcomes you ✨", 2400);
  }

  async _generateStudioClip(prompt) {
    this.ui.setStudioBusy(true);
    this.ui.setStudioStatus("Making your little show…");
    const clip = await this.studio.generate(prompt);
    if (!this.studio.active || !clip) {
      this.ui.setStudioBusy(false);
      return;
    }
    this.ui.setStudioBusy(false);
    if (clip.demo && clip.fallbackReason) {
      this.ui.setStudioStatus("Demo clip — hook a video API later");
      this.ui.toast("Playing a toy demo on the screen ✨", 2400);
    } else if (clip.demo) {
      this.ui.setStudioStatus("Demo show playing on the screen");
      this.ui.toast("Your sentence is on the air ✨", 2200);
    } else {
      this.ui.setStudioStatus("On the air");
      this.ui.toast("Your show is on the screen ✨", 2200);
    }
  }

  _leaveStudio() {
    if (!this.studio.active) return;
    this.studio.leave();
    this.ui.closeStudio();
    this.renderer.setClearColor(0x000000, 0);
    this._frameCameraOnPibo();
    this.ui.toast("Back on your island", 2000);
  }

  _enterArcade() {
    if (this.ui.isIdeaOpen) this.ui.closeIdeas();
    if (this.studio.active) this._leaveStudio();
    if (this.arcadeRoom.active) this._leaveArcade();
    this.ui.closeModals();
    this.ui.closeCollection();
    this.started = true;
    this.ui.hideIntro();
    this.arcadeRoom.enter();
    this.ui.openArcade();
    this.renderer.setClearColor(0x14080c, 1);
    this.ui.toast("The screen is yours. Make a game on it.", 2400);
  }

  _leaveArcade() {
    if (!this.arcadeRoom.active && !this.ui.isArcadeOpen) return;
    this.arcadeRoom.leave();
    this.ui.closeArcade();
    this.renderer.setClearColor(0x000000, 0);
    this._frameCameraOnPibo();
    this.ui.toast("Back outside the arcade", 2000);
  }

  _goToArcade() {
    this._travelTo(LAYOUT.arcadeDoor, LAYOUT.arcade, "Arcade. Press E to step inside.");
  }

  _goToLighthouse() {
    this._travelTo(LAYOUT.lighthousePad, LAYOUT.lighthouse, "Lighthouse dock. Press E to step inside.");
  }

  _travelTo(pad, look, message) {
    if (this.ui.isIdeaOpen) this.ui.closeIdeas();
    if (this.studio.active) this._leaveStudio();
    this.ui.closeModals();
    this.ui.closeCollection();
    const face = this._faceToward(pad, look);
    this.pibo.setVisible(true);
    this.pibo.placeAt(pad.x, pad.z, face.x, face.z, this.collision);
    this.ui.hideIntro();
    this.started = true;
    this._frameCameraOnPibo();
    this.ui.toast(message, 2800);
  }

  _updateLighthouseGuide() {
    if (this.studio.active || this.arcadeRoom.active) {
      this.ui.setLighthouseGuide({ hidden: true });
      return;
    }
    const spot = LAYOUT.lighthouse;
    const dist = Math.hypot(this.pibo.x - spot.x, this.pibo.z - spot.z);
    if (dist < 3.2) {
      this.ui.setLighthouseGuide({ hidden: true });
      return;
    }

    this._guideTip.set(spot.x, GROUND_Y + 3.2, spot.z);
    this._guideNdc.copy(this._guideTip).project(this.camera);
    const w = window.innerWidth;
    const h = window.innerHeight;
    let sx = (this._guideNdc.x * 0.5 + 0.5) * w;
    let sy = (-this._guideNdc.y * 0.5 + 0.5) * h;
    const inFront = this._guideNdc.z < 1;
    if (!inFront) {
      sx = w - sx;
      sy = h - sy;
    }
    const marginX = 28;
    const marginTop = 72;
    const marginBottom = 120;
    const onScreen = inFront
      && sx > marginX && sx < w - marginX
      && sy > marginTop && sy < h - marginBottom;
    const x = onScreen ? sx : Math.min(w - marginX, Math.max(marginX, sx));
    let y = onScreen ? sy - 36 : Math.min(h - marginBottom, Math.max(marginTop, sy));
    if (!onScreen && x < 280 && y < 130) y = 130;
    if (x > w - 170 && y < 140) y = 140;
    const rotation = onScreen ? -Math.PI / 2 : Math.atan2(sy - h / 2, sx - w / 2);
    this.ui.setLighthouseGuide({
      hidden: false,
      x,
      y,
      distance: Math.max(1, Math.round(dist)),
      rotation,
    });
  }

  _reward() {
    this.ui.toast("The whole garden is blooming ✨", 3000);
    setTimeout(() => {
      this.sprites.show("bridge");
      this.ui.toast("A little bridge appears by the water 🌉", 3000);
    }, 1600);
    setTimeout(() => {
      this.sprites.show("bloom");
      this.ui.toast("Something new is growing in the meadow 🌸", 3200);
    }, 3400);
  }

  _frameCameraOnPibo() {
    this._focus.set(this.pibo.x, 0.7, this.pibo.z);
    this.camera.position.copy(this._focus).add(this._isoOffset);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this._focus);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const { viewW, viewH } = orthoSize(w, h);
    this.camera.left = -viewW / 2;
    this.camera.right = viewW / 2;
    this.camera.top = viewH / 2;
    this.camera.bottom = -viewH / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.studio?.resize(w, h);
    this.arcadeRoom?.resize(w, h);
  }
}

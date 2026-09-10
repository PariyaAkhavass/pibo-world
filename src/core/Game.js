import * as THREE from "three";
import { Input } from "./Input.js";
import { tangentToward } from "./SphereMath.js";
import { Collision } from "./Collision.js";
import { Planet } from "../world/Planet.js";
import { Environment } from "../world/Environment.js";
import { Props } from "../world/Props.js";
import { Ambient } from "../world/Ambient.js";
import { GardenSystem } from "../systems/GardenSystem.js";
import { TvStudio } from "../systems/TvStudio.js";
import { Pibo } from "../entities/Pibo.js";
import { Ufo } from "../entities/Ufo.js";
import { Galaxy } from "../world/Galaxy.js";
import { LAYOUT, dirOf, collidersOf } from "../world/layout.js";
import { getPlant } from "../data/plants.js";
import { UI } from "../ui/UI.js";

/**
 * Top-level orchestrator. Owns the renderer, the planet and its systems, the
 * player, and the update loop, and mediates the tiny interaction contract
 * between Pibo, the garden, and the UI. Deliberately small: each subsystem is
 * self-contained so future planets, entities, and systems slot in here.
 */
export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.clock = new THREE.Clock();
    this.started = false;

    this._initRenderer();
    this._initScene();
    this._initWorld();
    this._initPlayer();
    this._initCamera();

    this.input = new Input();
    this.ui.attachInput(this.input);
    window.addEventListener("resize", () => this._onResize());

    this._camUp = this.pibo.dir.clone();
    this._camForward = this.pibo.forward.clone();
    this._camTarget = this.pibo.worldPosition();
  }

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearAlpha(0); // let the CSS sky show through
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.env = new Environment(this.scene, 10);
  }

  _initWorld() {
    this.planet = new Planet({ radius: 10 });
    this.scene.add(this.planet.group);

    this.props = new Props(this.planet).build();

    this.garden = new GardenSystem(this.planet).build();
    this.garden.onBloom = (spot) => {
      const plant = getPlant(spot.plantId);
      this.ui.addGrown(plant);
      this.ui.toast(`Your ${plant.name} bloomed ${plant.emoji}`, 2400);
    };
    this.garden.onAllGrown = () => this._reward();

    this.ambient = new Ambient(this.scene, 10);
    this.galaxy = new Galaxy(this.scene);
    this.studio = new TvStudio(this.planet, { outdoorScreen: this.props.tvScreen });
    this.collision = new Collision(this.planet.radius, collidersOf(LAYOUT));
    if (this.props.landingBeacon) this.props.landingBeacon.visible = false;
  }

  _initPlayer() {
    const start = dirOf(LAYOUT.start);
    const forward = tangentToward(start, dirOf(LAYOUT.ufo));
    this.pibo = new Pibo(this.planet, start, forward);

    const pad = dirOf(LAYOUT.ufo);
    this.ufo = new Ufo(this.planet, pad, tangentToward(pad, start));

    const friendDir = dirOf(LAYOUT.companion);
    const pinoDir = dirOf(LAYOUT.pino);
    this.companion = new Pibo(this.planet, friendDir, tangentToward(friendDir, start), {
      controllable: false,
      palette: {
        pot: 0x7eb6f5,
        potDark: 0x5a94d6,
        smile: 0x4a6a8a,
        leaves: [0x5fae55, 0x74c266, 0x6ab85e],
        leafTall: 0x6fbf5f,
      },
    });
    this.pino = new Pibo(this.planet, pinoDir, tangentToward(pinoDir, friendDir), {
      controllable: false,
      scale: 0.38,
      palette: {
        pot: 0xfff6ea,
        potDark: 0xe8dcc8,
        smile: 0xc4b8a8,
        leaves: [0xc6e8b8, 0xd4f0c4, 0xb8dca8],
        leafTall: 0xd8f2c8,
      },
    });

    const shipDir = dirOf(LAYOUT.familyShip);
    this.familyShip = new Ufo(this.planet, shipDir, tangentToward(shipDir, friendDir), {
      scale: 1.85,
      hidden: true,
      voyage: true,
      canLand: false,
      crew: true,
      boardLabel: "Hop on together",
      interactRange: 3.8,
    });
    this.letterRead = false;
    this.voyaging = false;
  }

  _initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      34,
      window.innerWidth / window.innerHeight,
      0.1,
      400
    );
    this.camHeight = 9.5;
    this.camBack = 13.5;
    // seed a sensible starting pose
    const p = this.pibo.worldPosition();
    this.camera.position.copy(p)
      .add(this.pibo.dir.clone().multiplyScalar(this.camHeight))
      .add(this.pibo.forward.clone().multiplyScalar(-this.camBack));
    this.camera.up.copy(this.pibo.dir);
    this.camera.lookAt(p);
  }

  start() {
    this.renderer.setAnimationLoop(() => this._frame());
    this._maybeBootStudio();
  }

  _maybeBootStudio() {
    try {
      const q = new URLSearchParams(window.location.search);
      if (!q.has("studio") && !q.has("dock")) return;
      const here = dirOf(LAYOUT.lighthousePad);
      this.pibo.placeAt(here, tangentToward(here, dirOf(LAYOUT.lighthouse)), this.collision);
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

    if (this.studio.active) {
      this.studio.update(dt);
      this._handleStudioInteraction();
      this.input.endFrame();
      this.renderer.render(this.studio.scene, this.studio.camera);
      return;
    }

    const frozen = this.ui.isModalOpen;
    this.companion.update(dt, null, { frozen: true });
    this.pino.update(dt, null, { frozen: true });
    this.familyShip.update(dt, null, { frozen });

    if (this.familyShip.riding) {
      this.ufo.update(dt, null, { frozen });
    } else if (this.ufo.riding) {
      this.ufo.update(dt, this.input, { frozen });
    } else {
      this.pibo.update(dt, this.input, { frozen, collision: this.collision });
      this.ufo.update(dt, null, { frozen });
    }

    if (!this.started && (this.pibo.moving || this.ufo.riding)) {
      this.started = true;
      this.ui.hideIntro();
    }

    this._updateCamera(dt);
    this._handleInteraction();

    this.env.update(dt);
    this.planet.update(dt);
    this.props.update(dt);
    this.garden.update(dt);
    this.ambient.update(dt);
    this.galaxy.update(dt);

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  _updateCamera(dt) {
    const k = 1 - Math.exp(-6 * dt); // smoothing factor
    const ship = this.familyShip.riding ? this.familyShip : this.ufo.riding ? this.ufo : null;
    const flying = !!ship;
    const subject = ship || this.pibo;
    const p = subject.worldPosition();
    const up = ship ? ship.dir : this.pibo.dir;
    const fwd = ship ? ship.forward : this.pibo.forward;
    const voyaging = ship && ship.mode === "voyage";

    this._camUp.lerp(up, k).normalize();
    this._camForward.lerp(fwd, k * (flying ? 0.85 : 0.6)).normalize();

    const alt = ship ? ship.altitude : 0;
    const space = THREE.MathUtils.smoothstep(alt, 10, 26);
    const height = flying ? 4.2 + alt * 0.22 : this.camHeight;
    const back = flying ? 11 + alt * (0.85 + space * 0.55) : this.camBack;

    let desired;
    if (voyaging && ship.heading && alt >= 36) {
      const away = ship.heading.clone();
      const camUp = (ship.voyageUp || ship.dir).clone();
      camUp.sub(away.clone().multiplyScalar(camUp.dot(away)));
      if (camUp.lengthSq() < 1e-6) camUp.set(0, 1, 0);
      camUp.normalize();
      this._camUp.lerp(camUp, k).normalize();
      this._camForward.lerp(away, k).normalize();
      desired = p.clone()
        .add(away.clone().multiplyScalar(-18 - (alt - 36) * 0.4))
        .add(camUp.clone().multiplyScalar(6));
    } else {
      desired = p.clone()
        .add(this._camUp.clone().multiplyScalar(height))
        .add(this._camForward.clone().multiplyScalar(-back));
    }

    this.camera.position.lerp(desired, flying ? k * 0.85 : k);
    this.camera.up.copy(this._camUp);

    let lookAt;
    if (voyaging && alt >= 36) {
      lookAt = p.clone().add(this._camForward.clone().multiplyScalar(16));
    } else {
      const lookShip = p.clone()
        .add(this._camUp.clone().multiplyScalar(flying ? 0.4 : 1.6))
        .add(this._camForward.clone().multiplyScalar(flying ? 2.2 : 1.4));
      const lookPlanet = new THREE.Vector3(0, 0, 0);
      lookAt = lookShip.lerp(lookPlanet, space * 0.55);
    }
    this._camTarget.lerp(lookAt, k);
    this.camera.lookAt(this._camTarget);

    const wantFov = voyaging ? 52
      : flying ? THREE.MathUtils.lerp(36, 50, THREE.MathUtils.clamp(alt / 34, 0, 1))
      : 34;
    if (Math.abs(this.camera.fov - wantFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, wantFov, k);
      this.camera.updateProjectionMatrix();
    }
  }

  _handleInteraction() {
    const ui = this.ui;

    // While a panel/fact is open, route only modal keys.
    if (ui.isModalOpen) {
      ui.hidePrompt();
      if (ui.isPanelOpen) {
        if (this.input.consume("Digit1", "Numpad1")) ui.pickByIndex(0);
        else if (this.input.consume("Digit2", "Numpad2")) ui.pickByIndex(1);
        else if (this.input.consume("Digit3", "Numpad3")) ui.pickByIndex(2);
        else if (this.input.consume("Escape")) ui.closePanel();
      } else {
        if (this.input.consume("Escape", "KeyE", "Enter")) ui.closeFact();
      }
      return;
    }

    if (this.familyShip.riding) {
      ui.hidePrompt();
      return;
    }

    if (this.ufo.riding) {
      const pad = dirOf(LAYOUT.lighthousePad);
      const nearDock = this.ufo.dir.angleTo(pad) * this.planet.radius < 5.2;
      ui.setPrompt(nearDock ? "Land at lighthouse" : "Land");
      if (this.input.consume("KeyE", "Enter")) this._landShip();
      return;
    }

    const p = this.pibo.worldPosition();
    const tower = this.studio.getInteractable(p);
    if (tower) {
      ui.setPrompt(tower.label);
      if (this.input.consume("KeyE", "Enter")) this._enterStudio();
      return;
    }

    const family = this.familyShip.getInteractable(p);
    if (family) {
      ui.setPrompt(family.label);
      if (this.input.consume("KeyE", "Enter")) this._boardFamily();
      return;
    }

    if (p.distanceTo(this.companion.worldPosition()) < 2.6) {
      ui.setPrompt("Talk");
      if (this.input.consume("KeyE", "Enter")) this._talkToCompanion();
      return;
    }

    const ship = this.ufo.getInteractable(p);
    if (ship) {
      ui.setPrompt(ship.label);
      if (this.input.consume("KeyE", "Enter")) this._boardShip();
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
        const plant = this.garden.factFor(it.spot);
        ui.showFact(plant);
      }
    }
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
    this.familyShip.reveal();
    this.ui.toast("A bigger pot-ship appears ✨", 2800);
  }

  _boardFamily() {
    this.pibo.setVisible(false);
    this.companion.setVisible(false);
    this.pino.setVisible(false);
    this.familyShip.board();
    this.voyaging = true;
    this.galaxy.begin(this.familyShip.dir);
    document.documentElement.classList.add("galaxy");
    this.camera.far = 2500;
    this.camera.updateProjectionMatrix();
    this.ui.setFlying(false);
    this.ui.hideIntro();
    this.started = true;
    this.ui.toast("Me + you + Pino ✨", 2600);
    setTimeout(() => this.ui.showBeyond(), 8500);
  }

  _handleStudioInteraction() {
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
    this.ui.toast("Back on your planet 🌍", 2000);
  }

  _boardShip() {
    this.pibo.setVisible(false);
    this.ufo.board();
    this.ui.setFlying(true);
    this.ui.hideIntro();
    this.started = true;
    this.ui.toast("Fly to the lighthouse in the ocean 🌊", 2600);
  }

  _landShip() {
    const pad = dirOf(LAYOUT.lighthousePad);
    const nearDock = this.ufo.dir.angleTo(pad) * this.planet.radius < 5.2;
    if (nearDock) {
      this.ufo.dir.copy(pad);
      this.ufo.forward.copy(tangentToward(pad, dirOf(LAYOUT.lighthouse)));
    }
    this.ufo.requestLand(() => {
      this.pibo.placeAt(this.ufo.dir, this.ufo.forward, this.collision);
      this.ufo.parkAt(this.pibo.dir, this.pibo.forward);
      this.pibo.setVisible(true);
      this.ui.setFlying(false);
      this._frameCameraOnPibo();
      this.ui.toast(nearDock ? "Docked by the lighthouse 🌊" : "Back on your planet 🌍", 2000);
    });
  }

  _reward() {
    const ui = this.ui;
    ui.toast("The whole garden is blooming ✨", 3000);
    this.props.setObservatoryLit(true);
    setTimeout(() => {
      this.props.revealBridge();
      ui.toast("A little bridge appears by the water 🌉", 3000);
    }, 1600);
    setTimeout(() => {
      this.props.revealBloom();
      ui.toast("Something new is growing in the meadow 🌸", 3200);
    }, 3400);
  }

  _frameCameraOnPibo() {
    const p = this.pibo.worldPosition();
    this._camUp.copy(this.pibo.dir);
    this._camForward.copy(this.pibo.forward);
    this.camera.position.copy(p)
      .add(this._camUp.clone().multiplyScalar(this.camHeight))
      .add(this._camForward.clone().multiplyScalar(-this.camBack));
    this._camTarget.copy(p)
      .add(this._camUp.clone().multiplyScalar(1.6))
      .add(this._camForward.clone().multiplyScalar(1.4));
    this.camera.up.copy(this._camUp);
    this.camera.fov = 34;
    this.camera.lookAt(this._camTarget);
    this.camera.updateProjectionMatrix();
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.studio?.resize(w, h);
  }
}

import * as THREE from "three";
import { Input } from "./Input.js";
import { tangentToward } from "./SphereMath.js";
import { Collision } from "./Collision.js";
import { Planet } from "../world/Planet.js";
import { Environment } from "../world/Environment.js";
import { Props } from "../world/Props.js";
import { Ambient } from "../world/Ambient.js";
import { GardenSystem } from "../systems/GardenSystem.js";
import { Pibo } from "../entities/Pibo.js";
import { Ufo } from "../entities/Ufo.js";
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
    this.collision = new Collision(this.planet.radius, collidersOf(LAYOUT));
    if (this.props.landingBeacon) this.props.landingBeacon.visible = false;
  }

  _initPlayer() {
    const start = dirOf(LAYOUT.start);
    const forward = tangentToward(start, dirOf(LAYOUT.garden[1]));
    this.pibo = new Pibo(this.planet, start, forward);

    const pad = dirOf(LAYOUT.ufo);
    this.ufo = new Ufo(this.planet, pad, tangentToward(pad, start));
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
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);

    const frozen = this.ui.isModalOpen;
    if (this.ufo.riding) {
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
    this.props.update(dt);
    this.garden.update(dt);
    this.ambient.update(dt);

    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }

  _updateCamera(dt) {
    const k = 1 - Math.exp(-6 * dt); // smoothing factor
    const flying = this.ufo.riding;
    const subject = flying ? this.ufo : this.pibo;
    const p = subject.worldPosition();
    const up = flying ? this.ufo.dir : this.pibo.dir;
    const fwd = flying ? this.ufo.forward : this.pibo.forward;

    this._camUp.lerp(up, k).normalize();
    this._camForward.lerp(fwd, k * (flying ? 0.85 : 0.6)).normalize();

    const alt = flying ? this.ufo.altitude : 0;
    const height = flying ? 4.2 + alt * 0.28 : this.camHeight;
    const back = flying ? 12 + alt * 0.95 : this.camBack;

    const desired = p.clone()
      .add(this._camUp.clone().multiplyScalar(height))
      .add(this._camForward.clone().multiplyScalar(-back));

    this.camera.position.lerp(desired, flying ? k * 0.85 : k);
    this.camera.up.copy(this._camUp);

    const lookAt = p.clone()
      .add(this._camUp.clone().multiplyScalar(flying ? 0.4 : 1.6))
      .add(this._camForward.clone().multiplyScalar(flying ? 2.2 : 1.4));
    this._camTarget.lerp(lookAt, k);
    this.camera.lookAt(this._camTarget);

    const wantFov = flying ? THREE.MathUtils.lerp(36, 50, THREE.MathUtils.clamp(alt / 34, 0, 1)) : 34;
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

    if (this.ufo.riding) {
      ui.setPrompt("Land");
      if (this.input.consume("KeyE", "Enter")) this._landShip();
      return;
    }

    const p = this.pibo.worldPosition();
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

  _boardShip() {
    this.pibo.setVisible(false);
    this.ufo.board();
    this.ui.setFlying(true);
    this.ui.hideIntro();
    this.started = true;
    this.ui.toast("The pot-ship hums to life 🛸", 2400);
  }

  _landShip() {
    this.ufo.requestLand(() => {
      this.pibo.placeAt(this.ufo.dir, this.ufo.forward, this.collision);
      this.ufo.parkAt(this.pibo.dir, this.pibo.forward);
      this.pibo.setVisible(true);
      this.ui.setFlying(false);
      this.ui.toast("Back on your planet 🌍", 2000);
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

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

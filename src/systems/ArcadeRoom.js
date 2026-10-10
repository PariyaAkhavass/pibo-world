import * as THREE from "three";
import { clay, ball, box, cyl } from "../world/materials.js";
import { objectAt, paintArcadeScreen, screenPoint } from "./arcadeScreen.js";

/**
 * Interior you step into from the outdoor cabinet, same idea as the lighthouse
 * studio: a separate scene, a close camera, and a screen that shows the work.
 * Here the screen is the arcade machine itself.
 */
export class ArcadeRoom {
  constructor(canvas) {
    this.active = false;
    this.t = 0;
    this.view = { spec: null, mode: "start", message: "", clue: "", won: false };
    this._drag = null;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.08, 40);
    this.raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();

    this._buildRoom();
    this._buildScreen();
    this.resize(window.innerWidth, window.innerHeight);
    this._bind(canvas);
    this.show(this.view);
  }

  enter() {
    this.active = true;
    this.t = 0;
    this._placeCamera();
  }

  leave() {
    this.active = false;
    this._drag = null;
  }

  resize(w, h) {
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  show(view = {}) {
    this.view = {
      spec: view.spec || null,
      mode: view.mode || "start",
      message: view.message || "",
      clue: view.clue || "",
      won: !!view.won,
    };
    this._paint();
  }

  update(dt) {
    this.t += dt;
    if (this.glow) this.glow.intensity = 1.35 + Math.sin(this.t * 1.8) * 0.08;
  }

  _placeCamera() {
    // Shift left a little so the side panel doesn't cover the screen.
    this.camera.position.set(-0.42, 1.28, 3.05);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0.12, 1.22, 0);
  }

  _buildScreen() {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 720;
    this.screenCanvas = canvas;
    this.screenCtx = canvas.getContext("2d");
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    this.screenTex = tex;
    this.screenMat = new THREE.MeshBasicMaterial({
      map: tex,
      toneMapped: false,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 1.29), this.screenMat);
    screen.position.set(0, 1.62, 0.28);
    this.scene.add(screen);
    this.screen = screen;
  }

  _paint() {
    paintArcadeScreen(this.screenCtx, this.screenCanvas.width, this.screenCanvas.height, this.view);
    this.screenTex.needsUpdate = true;
  }

  _bind(canvas) {
    if (!canvas) return;
    canvas.addEventListener("pointerdown", (event) => this._down(event));
    canvas.addEventListener("pointermove", (event) => this._move(event));
    canvas.addEventListener("pointerup", (event) => this._up(event));
    canvas.addEventListener("pointercancel", (event) => this._up(event));
  }

  _uv(event) {
    const rect = event.target.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.screen, false);
    return hits[0]?.uv || null;
  }

  _down(event) {
    if (!this.active || event.button > 0) return;
    const uv = this._uv(event);
    if (!uv || !this.view.spec) return;
    const object = objectAt(this.view.spec, uv.x, uv.y);
    if (!object) return;
    if (this.view.mode === "play") {
      this.onPlay?.(object.id);
      return;
    }
    if (this.view.mode !== "edit") return;
    const point = screenPoint(uv.x, uv.y);
    this._drag = { id: object.id, x: point.x, y: point.y, moved: false };
  }

  _move(event) {
    if (!this._drag) return;
    const uv = this._uv(event);
    if (!uv) return;
    const point = screenPoint(uv.x, uv.y);
    const x = Math.min(92, Math.max(8, point.x));
    const y = Math.min(88, Math.max(12, point.y));
    if (Math.hypot(x - this._drag.x, y - this._drag.y) < 1.2 && !this._drag.moved) return;
    this._drag.moved = true;
    this._drag.x = x;
    this._drag.y = y;
    this.onMove?.(this._drag.id, x, y, false);
  }

  _up() {
    if (!this._drag) return;
    const drag = this._drag;
    this._drag = null;
    if (drag.moved) this.onMove?.(drag.id, drag.x, drag.y, true);
  }

  _buildRoom() {
    const scene = this.scene;
    scene.background = new THREE.Color(0x14080c);
    scene.fog = new THREE.Fog(0x14080c, 6.5, 14);

    scene.add(new THREE.AmbientLight(0xfff2ea, 0.35));
    const key = new THREE.DirectionalLight(0xfff4ec, 1.25);
    key.position.set(0.6, 3.4, 4.2);
    scene.add(key);
    this.glow = new THREE.PointLight(0xffd0dc, 1.4, 6, 2);
    this.glow.position.set(0, 1.7, 1.1);
    scene.add(this.glow);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.5, 32),
      clay(0x2a1218, { roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wall = box(8, 4.2, 0.2, clay(0x3a1520));
    wall.position.set(0, 2.1, -1.4);
    scene.add(wall);

    const stripe = stripeMaterial();
    const silver = new THREE.MeshStandardMaterial({
      color: 0xd5d8de,
      metalness: 0.72,
      roughness: 0.28,
    });
    const red = clay(0xd01224, { roughness: 0.55 });
    const black = clay(0x1a1a1a, { roughness: 0.4 });

    for (const sx of [-1, 1]) {
      const side = box(0.14, 2.35, 0.62, silver);
      side.position.set(sx * 1.18, 1.28, 0.05);
      scene.add(side);
      const trim = box(0.05, 2.2, 0.08, clay(0xf2f3f6, { roughness: 0.35 }));
      trim.position.set(sx * 1.08, 1.28, 0.32);
      scene.add(trim);
    }

    const body = box(2.15, 2.2, 0.48, stripe);
    body.position.set(0, 1.32, -0.08);
    scene.add(body);

    const hood = box(2.15, 0.28, 0.5, stripe);
    hood.position.set(0, 2.28, 0.02);
    scene.add(hood);

    const deckPivot = new THREE.Group();
    deckPivot.position.set(0, 0.58, 0.62);
    deckPivot.rotation.x = 0.72;
    scene.add(deckPivot);

    const deck = box(2.2, 0.07, 0.92, red);
    deckPivot.add(deck);

    const deckStripe = box(2.05, 0.02, 0.78, stripe);
    deckStripe.position.y = 0.045;
    deckPivot.add(deckStripe);

    deckPivot.add(joystick(-0.72));
    deckPivot.add(joystick(0.28));
    deckPivot.add(buttonRow(-0.28));
    deckPivot.add(buttonRow(0.72));

    const strip = box(2.05, 0.14, 0.08, black);
    strip.position.set(0, 0.9, 0.34);
    scene.add(strip);
    for (const sx of [-0.28, 0.28]) {
      const start = cyl(0.045, 0.045, 0.03, clay(0xfff6ee), 12);
      start.rotation.x = Math.PI / 2;
      start.position.set(sx, 0.9, 0.39);
      scene.add(start);
    }
    for (const sx of [-0.52, 0.52]) {
      const coin = box(0.16, 0.05, 0.02, clay(0x8a9098, { roughness: 0.35 }));
      coin.position.set(sx, 0.9, 0.39);
      scene.add(coin);
    }

    // A second cabinet, small and off to the side, so the room reads as an arcade.
    const extra = box(0.7, 1.3, 0.4, stripe);
    extra.position.set(-2.15, 0.7, -0.4);
    extra.rotation.y = 0.4;
    scene.add(extra);
    const extra2 = box(0.6, 1.15, 0.36, clay(0x1f4c8a));
    extra2.position.set(2.25, 0.62, -0.35);
    extra2.rotation.y = -0.35;
    scene.add(extra2);
  }
}

function stripeMaterial() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#d01224";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#9a0c1c";
  ctx.lineWidth = 14;
  for (let i = -256; i < 512; i += 28) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 180, 256);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.04 });
}

function joystick(x) {
  const g = new THREE.Group();
  const base = cyl(0.1, 0.12, 0.045, clay(0x222222), 16);
  base.position.y = 0.06;
  g.add(base);
  const shaft = cyl(0.028, 0.028, 0.18, clay(0x1a1a1a), 10);
  shaft.position.y = 0.16;
  g.add(shaft);
  const knob = ball(0.055, clay(0x111111, { roughness: 0.35 }), 16);
  knob.position.y = 0.27;
  g.add(knob);
  g.position.set(x, 0.04, 0.2);
  return g;
}

function buttonRow(x) {
  const g = new THREE.Group();
  const colors = [0xe23b3b, 0xf5d03a, 0x3cba5a, 0x3a7de8];
  colors.forEach((color, i) => {
    const button = cyl(0.045, 0.05, 0.035, clay(color, { roughness: 0.4 }), 14);
    button.position.set((i - 1.5) * 0.11, 0.07, -0.12);
    g.add(button);
  });
  g.position.set(x, 0.04, 0);
  return g;
}

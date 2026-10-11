import { Game } from "./core/Game.js";
import { UI } from "./ui/UI.js";

/**
 * Pibo — Pocket Planet prototype.
 * Boots the UI overlay and the game, then starts the loop.
 */
const canvas = document.getElementById("scene");
const ui = new UI();
const game = new Game(canvas, ui);
canvas.addEventListener("pointerdown", () => canvas.focus());
await game.preload();
game.start();
canvas.focus();

// handy for tinkering in the console
window.pibo = game;

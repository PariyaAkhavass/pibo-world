/**
 * Keyboard input. Separates continuously-held movement keys from one-shot
 * "just pressed" actions (interact, cancel, choose 1-3) so gameplay code can
 * consume discrete presses without tracking edges itself.
 */
export class Input {
  constructor(target = window) {
    this.held = new Set();
    this._pressed = new Set();
    this.enabled = true;

    target.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      // avoid page scroll on arrows/space
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this._pressed.add(e.code);
      this.held.add(e.code);
    });
    target.addEventListener("keyup", (e) => this.held.delete(e.code));
    // don't leave keys "stuck" if focus is lost
    window.addEventListener("blur", () => this.held.clear());
  }

  isDown(...codes) {
    return codes.some((c) => this.held.has(c));
  }

  /** Consume a one-shot press (returns true once per keydown). */
  consume(...codes) {
    for (const c of codes) {
      if (this._pressed.has(c)) {
        this._pressed.delete(c);
        return true;
      }
    }
    return false;
  }

  /** Movement axes in screen-intuitive terms. */
  get moveForward() {
    return (this.isDown("KeyW", "ArrowUp") ? 1 : 0) - (this.isDown("KeyS", "ArrowDown") ? 1 : 0);
  }
  get turn() {
    // positive = turn right
    return (this.isDown("KeyD", "ArrowRight") ? 1 : 0) - (this.isDown("KeyA", "ArrowLeft") ? 1 : 0);
  }

  /** Clear one-shot buffer at end of frame. */
  endFrame() {
    this._pressed.clear();
  }
}

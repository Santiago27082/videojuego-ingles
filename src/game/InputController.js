/** Asignaciones de controles. Cambia aquí los códigos para reasignar teclas. */
export const BINDINGS = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  crouch: ['ControlLeft', 'KeyC'],
  jump: ['Space'],
  roll: ['KeyQ'],
  interact: ['KeyE'],
  kick: ['KeyF'],
  heavy: ['KeyR'],
  light: ['Mouse0'],
  block: ['Mouse2'],
  info: ['Tab'],
};

const PREVENT = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class InputController {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = false;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.touchHeld = new Set();
    this.touchPressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.touchMove = { x: 0, y: 0 };
    this.sensitivity = 1;

    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (PREVENT.has(e.code)) e.preventDefault();
      if (!e.repeat) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.touchHeld.clear(); });

    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      const code = 'Mouse' + e.button;
      this.pressedKeys.add(code);
      this.keys.add(code);
    });
    window.addEventListener('mouseup', (e) => this.keys.delete('Mouse' + e.button));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    canvas.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.wheel += Math.sign(e.deltaY);
    }, { passive: true });
  }

  held(action) {
    if (this.touchHeld.has(action)) return true;
    return BINDINGS[action].some((c) => this.keys.has(c));
  }

  pressed(action) {
    if (this.touchPressed.has(action)) return true;
    return BINDINGS[action].some((c) => this.pressedKeys.has(c));
  }

  /** Eje de movimiento: x = derecha, z = adelante, con longitud máxima 1. */
  axis() {
    let x = (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0);
    let z = (this.held('forward') ? 1 : 0) - (this.held('back') ? 1 : 0);
    x += this.touchMove.x;
    z += -this.touchMove.y;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    return { x, z, len: Math.min(1, len) };
  }

  touchPress(action) { this.touchPressed.add(action); }
  touchHold(action, on) { on ? this.touchHeld.add(action) : this.touchHeld.delete(action); }

  endFrame() {
    this.pressedKeys.clear();
    this.touchPressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }

  reset() {
    this.keys.clear();
    this.pressedKeys.clear();
    this.touchHeld.clear();
    this.touchPressed.clear();
    this.touchMove.x = this.touchMove.y = 0;
    this.mouseDX = this.mouseDY = this.wheel = 0;
  }
}

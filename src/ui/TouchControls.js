/** Controles táctiles: joystick virtual, botones de acción y giro de cámara arrastrando en la mitad derecha. */
export class TouchControls {
  constructor(input, onPause) {
    this.input = input;
    this.root = document.getElementById('touch');
    this.joy = document.getElementById('joy');
    this.knob = document.getElementById('joy-knob');
    this.joyId = null;
    this.lookId = null;
    this.lookLast = { x: 0, y: 0 };

    const R = 55;
    const setKnob = (dx, dy) => { this.knob.style.transform = `translate(${dx}px, ${dy}px)`; };

    this.joy.addEventListener('pointerdown', (e) => {
      this.joyId = e.pointerId;
      this.joy.setPointerCapture(e.pointerId);
      this.moveJoy(e, R, setKnob);
    });
    this.joy.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) this.moveJoy(e, R, setKnob); });
    const endJoy = (e) => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      input.touchMove.x = input.touchMove.y = 0;
      setKnob(0, 0);
    };
    this.joy.addEventListener('pointerup', endJoy);
    this.joy.addEventListener('pointercancel', endJoy);

    // Botones
    this.root.querySelectorAll('[data-act]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); input.touchPress(b.dataset.act); });
    });
    this.root.querySelectorAll('[data-hold]').forEach((b) => {
      const on = (v) => (e) => { e.preventDefault(); input.touchHold(b.dataset.hold, v); b.classList.toggle('on', v); };
      b.addEventListener('pointerdown', on(true));
      b.addEventListener('pointerup', on(false));
      b.addEventListener('pointercancel', on(false));
      b.addEventListener('pointerleave', on(false));
    });
    document.getElementById('touch-pause').addEventListener('pointerdown', (e) => { e.preventDefault(); onPause(); });

    // Cámara: arrastrar sobre el lienzo
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'touch' || this.lookId !== null) return;
      this.lookId = e.pointerId;
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      input.mouseDX += (e.clientX - this.lookLast.x) * 1.4;
      input.mouseDY += (e.clientY - this.lookLast.y) * 1.4;
      this.lookLast = { x: e.clientX, y: e.clientY };
    });
    const endLook = (e) => { if (e.pointerId === this.lookId) this.lookId = null; };
    canvas.addEventListener('pointerup', endLook);
    canvas.addEventListener('pointercancel', endLook);
  }

  moveJoy(e, R, setKnob) {
    const r = this.joy.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    setKnob(dx, dy);
    this.input.touchMove.x = dx / R;
    this.input.touchMove.y = dy / R;
  }

  show(v) { this.root.classList.toggle('hidden', !v); }
}

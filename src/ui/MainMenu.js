import { SaveManager } from '../systems/SaveManager.js';

/** Conecta los botones de los menús (inicio, pausa, derrota, victoria, controles y configuración) con el juego. */
export class MainMenu {
  constructor(game) {
    const $ = (id) => document.getElementById(id);
    const on = (id, fn) => $(id).addEventListener('click', fn);
    this.game = game;

    $('btn-continue').disabled = !SaveManager.exists();
    const saved = SaveManager.load();
    if (saved) { game.audio.setVolume(saved.volume); game.sensitivity = saved.sensitivity; }
    $('set-volume').value = game.audio.volume;
    $('set-sens').value = game.sensitivity;

    on('btn-new', () => game.start({ keepProgress: false }));
    on('btn-continue', () => game.start({ fromSave: true }));
    on('btn-controls', () => this.openPanel('controls-panel', 'menu'));
    on('btn-settings', () => this.openPanel('settings-panel', 'menu'));

    on('btn-resume', () => game.resume());
    on('btn-restart', () => game.start({ keepProgress: false }));
    on('btn-pause-controls', () => this.openPanel('controls-panel', 'pause'));
    on('btn-pause-settings', () => this.openPanel('settings-panel', 'pause'));
    on('btn-to-menu', () => game.toMenu());

    on('btn-retry', () => game.start({ keepProgress: true }));
    on('btn-dead-menu', () => game.toMenu());
    on('btn-again', () => game.start({ keepProgress: true }));
    on('btn-victory-menu', () => game.toMenu());

    document.querySelectorAll('.close-panel').forEach((b) => b.addEventListener('click', () => this.closePanel()));

    $('set-volume').addEventListener('input', (e) => { game.audio.setVolume(parseFloat(e.target.value)); game.saveProgress(); });
    $('set-sens').addEventListener('input', (e) => { game.sensitivity = parseFloat(e.target.value); game.saveProgress(); });

    // Esc en el menú de pausa (con el puntero libre) reanuda la partida
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && game.state === 'paused' && this.panelOpen === null) game.resume();
      else if (e.code === 'Escape' && this.panelOpen) this.closePanel();
    });

    this.panelOpen = null;
    this.returnTo = null;
  }

  openPanel(id, returnTo) {
    this.returnTo = returnTo;
    this.panelOpen = id;
    document.getElementById(returnTo).classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
  }

  closePanel() {
    if (!this.panelOpen) {
      // Panel de ayuda abierto con Tab durante la partida
      document.getElementById('controls-panel').classList.add('hidden');
      return;
    }
    document.getElementById(this.panelOpen).classList.add('hidden');
    document.getElementById(this.returnTo).classList.remove('hidden');
    this.panelOpen = null;
  }
}

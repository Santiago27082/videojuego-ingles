
import { SaveManager } from '../systems/SaveManager.js';

export class MainMenu {
  constructor(game) {
    const $ = (id) => document.getElementById(id);

    const on = (id, fn) => {
      const element = $(id);
      if (element) element.addEventListener('click', fn);
    };

    this.game = game;
    this.panelOpen = null;
    this.returnTo = null;

    const continueButton = $('btn-continue');
    if (continueButton) {
      continueButton.disabled = !SaveManager.exists();
    }

    const saved = SaveManager.load();

    if (saved) {
      if (saved.volume !== undefined) {
        game.audio.setVolume(saved.volume);
      }

      if (saved.sensitivity !== undefined) {
        game.sensitivity = saved.sensitivity;
      }

      if (
        saved.character === 'knight' ||
        saved.character === 'warrior'
      ) {
        game.selectedCharacter = saved.character;
      }
    }

    if ($('set-volume')) {
      $('set-volume').value = game.audio.volume;
    }

    if ($('set-sens')) {
      $('set-sens').value = game.sensitivity;
    }

    // MENÚ PRINCIPAL
    on('btn-new', () => this.openCharacterSelect());

    on('btn-continue', () => {
      game.start({ fromSave: true });
    });

    on('btn-controls', () => {
      this.openPanel('controls-panel', 'menu');
    });

    on('btn-settings', () => {
      this.openPanel('settings-panel', 'menu');
    });

    // SELECTOR DE PERSONAJES
    on('btn-select-knight', () => {
      this.selectCharacter('knight');
    });

    on('btn-select-warrior', () => {
      this.selectCharacter('warrior');
    });

    on('btn-character-back', () => {
      this.closeCharacterSelect();
    });

    // PAUSA
    on('btn-resume', () => game.resume());

    on('btn-restart', () => {
      game.start({
        keepProgress: false,
        character: game.selectedCharacter,
      });
    });

    on('btn-pause-controls', () => {
      this.openPanel('controls-panel', 'pause');
    });

    on('btn-pause-settings', () => {
      this.openPanel('settings-panel', 'pause');
    });

    on('btn-to-menu', () => game.toMenu());

    // DERROTA
    on('btn-retry', () => {
      game.start({ keepProgress: true });
    });

    on('btn-dead-menu', () => game.toMenu());

    // VICTORIA
    on('btn-again', () => {
      game.start({ keepProgress: true });
    });

    on('btn-victory-menu', () => game.toMenu());

    // CERRAR PANELES
    document.querySelectorAll('.close-panel').forEach((button) => {
      button.addEventListener('click', () => this.closePanel());
    });

    // CONFIGURACIÓN
    if ($('set-volume')) {
      $('set-volume').addEventListener('input', (event) => {
        game.audio.setVolume(Number(event.target.value));
        game.saveProgress();
      });
    }

    if ($('set-sens')) {
      $('set-sens').addEventListener('input', (event) => {
        game.sensitivity = Number(event.target.value);
        game.saveProgress();
      });
    }

    // TECLA ESCAPE
    window.addEventListener('keydown', (event) => {
      if (
        event.code === 'Escape' &&
        game.state === 'paused' &&
        this.panelOpen === null
      ) {
        game.resume();
      } else if (
        event.code === 'Escape' &&
        this.panelOpen
      ) {
        this.closePanel();
      } else if (
        event.code === 'Escape' &&
        !document.getElementById('character-select')
          ?.classList.contains('hidden')
      ) {
        this.closeCharacterSelect();
      }
    });
  }

  openCharacterSelect() {
    document.getElementById('menu')?.classList.add('hidden');

    document
      .getElementById('character-select')
      ?.classList.remove('hidden');
  }

  closeCharacterSelect() {
    document
      .getElementById('character-select')
      ?.classList.add('hidden');

    document.getElementById('menu')?.classList.remove('hidden');
  }

  selectCharacter(character) {
    if (character !== 'knight' && character !== 'warrior') {
      console.warn('Personaje no válido:', character);
      return;
    }

    this.game.start({
      keepProgress: false,
      character,
    });
  }

  openPanel(id, returnTo) {
    const panel = document.getElementById(id);
    const previous = document.getElementById(returnTo);

    if (!panel || !previous) return;

    this.returnTo = returnTo;
    this.panelOpen = id;

    previous.classList.add('hidden');
    panel.classList.remove('hidden');
  }

  closePanel() {
    if (!this.panelOpen) {
      document
        .getElementById('controls-panel')
        ?.classList.add('hidden');

      return;
    }

    document
      .getElementById(this.panelOpen)
      ?.classList.add('hidden');

    document
      .getElementById(this.returnTo)
      ?.classList.remove('hidden');

    this.panelOpen = null;
    this.returnTo = null;
  }
}

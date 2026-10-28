const STYLE_ID = 'velkran-stats-panel-style';

const LABELS = {
  strength: {
    name: 'Fuerza',
    description: '+5% de daño por punto',
    icon: '⚔',
  },
  vitality: {
    name: 'Vitalidad',
    description: '+15 de vida máxima por punto',
    icon: '♥',
  },
  endurance: {
    name: 'Resistencia',
    description: '+12 de energía máxima por punto',
    icon: '◆',
  },
  agility: {
    name: 'Agilidad',
    description: '+3% de velocidad por punto',
    icon: '➤',
  },
};

export class StatsPanel {
  constructor(game) {
    this.game = game;
    this.opened = false;
    this.lastRefresh = 0;

    this.injectStyles();
    this.create();

    window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyP' || event.repeat) return;

  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement
  ) {
    return;
  }

  event.preventDefault();

  console.log('Tecla P detectada. Estado:', this.game.state);

  this.toggle();
});
  }

  injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;

    style.textContent = `
      #velkran-stats-panel {
        position: fixed;
        z-index: 1000;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: min(560px, calc(100vw - 28px));
        max-height: calc(100vh - 32px);
        overflow: auto;
        color: #f5e7c5;
        background: linear-gradient(
          145deg,
          rgba(31,25,21,.98),
          rgba(13,12,12,.98)
        );
        border: 1px solid #b58a45;
        box-shadow: 0 18px 70px #000b;
        padding: 22px;
        font-family: Georgia, 'Times New Roman', serif;
        border-radius: 5px;
      }

      #velkran-stats-panel[hidden] {
        display: none !important;
      }

      #velkran-stats-panel .stats-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid #806238;
        padding-bottom: 12px;
        margin-bottom: 16px;
      }

      #velkran-stats-panel h2 {
        margin: 0;
        color: #e4c27b;
        font-size: 25px;
        letter-spacing: 2px;
        text-transform: uppercase;
      }

      #velkran-stats-panel .stats-close {
        background: transparent;
        color: #f5e7c5;
        border: 1px solid #8e754f;
        padding: 5px 11px;
        cursor: pointer;
        font-size: 18px;
      }

      #velkran-stats-panel .stats-summary {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 16px;
      }

      #velkran-stats-panel .stats-box {
        background: #ffffff0a;
        border: 1px solid #65503a;
        padding: 10px;
      }

      #velkran-stats-panel .stats-label {
        font-size: 11px;
        letter-spacing: 1.5px;
        color: #c8b58e;
        text-transform: uppercase;
      }

      #velkran-stats-panel .stats-value {
        font-size: 23px;
        color: #fff1d0;
        margin-top: 4px;
      }

      #velkran-stats-panel .stats-xp {
        height: 7px;
        background: #3d3429;
        margin-top: 8px;
        overflow: hidden;
      }

      #velkran-stats-panel .stats-xp-fill {
        height: 100%;
        width: 0;
        background: #b9954e;
        transition: width .2s;
      }

      #velkran-stats-panel .stats-points {
        color: #f1d28b;
        font-size: 15px;
        margin: 12px 0;
      }

      #velkran-stats-panel .stats-row {
        display: grid;
        grid-template-columns: 42px 1fr auto;
        align-items: center;
        gap: 10px;
        padding: 12px 0;
        border-top: 1px solid #ffffff16;
      }

      #velkran-stats-panel .stats-icon {
        font-size: 24px;
        color: #d5ae65;
        text-align: center;
      }

      #velkran-stats-panel .stats-name {
        font-size: 16px;
        color: #fff0d1;
      }

      #velkran-stats-panel .stats-desc {
        font: 12px Arial, sans-serif;
        color: #b8aa93;
        margin-top: 4px;
      }

      #velkran-stats-panel .stats-count {
        font: 12px Arial, sans-serif;
        color: #e7cc8e;
        margin-top: 3px;
      }

      #velkran-stats-panel .stats-add {
        min-width: 43px;
        height: 39px;
        border: 1px solid #b58a45;
        background: #6b4b25;
        color: #fff1d0;
        font-size: 24px;
        cursor: pointer;
      }

      #velkran-stats-panel .stats-add:disabled {
        opacity: .3;
        cursor: not-allowed;
      }

      #velkran-stats-panel .stats-footer {
        font: 12px Arial, sans-serif;
        color: #a99b83;
        margin-top: 15px;
      }

      @media(max-width:420px) {
        #velkran-stats-panel {
          padding: 15px;
        }

        #velkran-stats-panel h2 {
          font-size: 19px;
        }

        #velkran-stats-panel .stats-row {
          grid-template-columns: 32px 1fr auto;
          gap: 7px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  create() {
    const panel = document.createElement('section');

    panel.id = 'velkran-stats-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute(
      'aria-label',
      'Estadísticas del personaje'
    );

    panel.innerHTML = `
      <div class="stats-top">
        <h2>Estadísticas</h2>
        <button
          type="button"
          class="stats-close"
          aria-label="Cerrar"
        >✕</button>
      </div>

      <div class="stats-summary">
        <div class="stats-box">
          <div class="stats-label">Nivel</div>
          <div class="stats-value" data-value="level">1</div>
        </div>

        <div class="stats-box">
          <div class="stats-label">Puntos disponibles</div>
          <div class="stats-value" data-value="points">0</div>
        </div>

        <div class="stats-box">
          <div class="stats-label">Vida</div>
          <div class="stats-value" data-value="hp">100 / 100</div>
        </div>

        <div class="stats-box">
          <div class="stats-label">Resistencia</div>
          <div class="stats-value" data-value="sta">100 / 100</div>
        </div>
      </div>

      <div class="stats-label">Experiencia</div>

      <div class="stats-xp">
        <div class="stats-xp-fill" data-value="xp-fill"></div>
      </div>

      <div class="stats-footer" data-value="xp-text">
        0 XP
      </div>

      <div class="stats-points" data-value="hint">
        Sube de nivel para ganar puntos de atributo.
      </div>

      <div class="stats-attributes"></div>

      <div class="stats-footer">
        Pulsa <b>P</b> para cerrar.
        Cada mejora se guarda automáticamente.
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;

    panel
      .querySelector('.stats-close')
      .addEventListener('click', () => this.close());

    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-upgrade]');
      if (!button) return;

      const attribute = button.dataset.upgrade;

      if (this.game.player.spendAttribute(attribute)) {
        this.game.hud?.notify(
          `Atributo mejorado: ${LABELS[attribute].name}`
        );

        this.refresh();
      } else {
        this.game.hud?.notify(
          'No tienes puntos de atributo disponibles'
        );
      }
    });

    this.renderAttributes();
    this.refresh();
  }

  renderAttributes() {
    const container = this.panel.querySelector(
      '.stats-attributes'
    );

    container.innerHTML = Object.entries(LABELS)
      .map(([key, item]) => `
        <div class="stats-row">
          <div class="stats-icon">${item.icon}</div>

          <div>
            <div class="stats-name">${item.name}</div>
            <div class="stats-desc">${item.description}</div>

            <div class="stats-count">
              Nivel de atributo:
              <b data-value="${key}">0</b>
            </div>
          </div>

          <button
            type="button"
            class="stats-add"
            data-upgrade="${key}"
            aria-label="Mejorar ${item.name}"
          >+</button>
        </div>
      `)
      .join('');
  }

  toggle() {
    if (this.opened) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this.opened = true;
    this.panel.hidden = false;
    this.refresh();
  }

  close() {
    this.opened = false;
    this.panel.hidden = true;
  }

  update() {
    if (!this.opened) return;

    this.lastRefresh += 1;

    if (this.lastRefresh % 8 === 0) {
      this.refresh();
    }
  }

  refresh() {
    if (!this.panel || !this.game.player) return;

    const p = this.game.player;

    const set = (key, value) => {
      const el = this.panel.querySelector(
        `[data-value="${key}"]`
      );

      if (el) el.textContent = String(value);
    };

    set('level', p.level);
    set('points', p.attributePoints ?? 0);
    set('hp', `${Math.ceil(p.hp)} / ${p.maxHp}`);
    set('sta', `${Math.ceil(p.sta)} / ${p.maxSta}`);

    const xpNext = Math.max(1, p.xpNext);
    const xp = Math.max(0, p.xp);

    const fill = this.panel.querySelector(
      '[data-value="xp-fill"]'
    );

    if (fill) {
      fill.style.width = `${Math.min(
        100,
        (xp / xpNext) * 100
      )}%`;
    }

    set('xp-text', `${xp} / ${xpNext} XP`);

    set(
      'hint',
      p.attributePoints > 0
        ? `Tienes ${p.attributePoints} punto(s). Elige qué atributo mejorar.`
        : 'No tienes puntos disponibles. El siguiente llega al subir de nivel.'
    );

    for (const key of Object.keys(LABELS)) {
      set(key, p.attributes?.[key] ?? 0);

      const button = this.panel.querySelector(
        `[data-upgrade="${key}"]`
      );

      if (button) {
        button.disabled = !(p.attributePoints > 0);
      }
    }
  }
}
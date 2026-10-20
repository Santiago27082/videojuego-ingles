
import { Inventory } from '../game/inventory.js';

export class InventoryUI {
  constructor(game) {
    this.game = game;
    this.inventory = new Inventory(game);
    this.opened = false;
    this.previousState = 'playing';
    this.category = 'all';

    this.createUI();

    window.addEventListener('keydown', event => {
      if (event.code !== 'KeyI' || event.repeat) return;

      // No abrir el inventario desde los menús.
      if (this.game.state === 'playing' || this.opened) {
        event.preventDefault();
        this.toggle();
      }
    });
  }

  createUI() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'velkran-inventory';
    this.overlay.className = 'vk-inventory hidden';

    this.overlay.innerHTML = `
      <section class="vk-panel">
        <header class="vk-header">
          <div>
            <small>LA CORONA DE VELKRAN</small>
            <h2>Inventario</h2>
          </div>
          <button data-action="close" class="vk-close">✕</button>
        </header>

        <div class="vk-equipment">
          <div><span>Arma</span><strong id="vk-weapon">Ninguna</strong></div>
          <div><span>Escudo</span><strong id="vk-shield">Ninguno</strong></div>
        </div>

        <nav class="vk-tabs">
          <button data-category="all">Todos</button>
          <button data-category="weapon">Armas</button>
          <button data-category="shield">Escudos</button>
          <button data-category="consumable">Pociones</button>
          <button data-category="material">Materiales</button>
        </nav>

        <div class="vk-content">
          <div id="vk-grid" class="vk-grid"></div>
          <aside id="vk-details" class="vk-details">
            <h3>Tu aventura</h3>
            <p>Selecciona un objeto para consultar sus detalles.</p>
          </aside>
        </div>

        <footer class="vk-footer">
          <span id="vk-capacity"></span>
          <span>I / ESC · Cerrar</span>
        </footer>
      </section>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .vk-inventory {
        position: fixed; inset: 0; z-index: 10000;
        display: grid; place-items: center;
        padding: 18px; background: #080705d9;
        color: #eee0c1; font-family: Georgia, serif;
      }
      .vk-inventory.hidden { display: none; }
      .vk-panel {
        width: min(900px, 100%); max-height: 90vh;
        overflow: auto; padding: 24px;
        background: linear-gradient(135deg,#29251d,#15130f);
        border: 2px solid #8c7042;
        box-shadow: 0 20px 80px #000b;
      }
      .vk-header,.vk-footer {
        display:flex; justify-content:space-between;
        align-items:center; gap:12px;
      }
      .vk-header small { color:#c6a66a; letter-spacing:2px; }
      .vk-header h2 { margin:6px 0 18px; font-size:30px; }
      .vk-close,.vk-tabs button,.vk-details button {
        color:#f3e6c9; background:#383024;
        border:1px solid #8c7042; padding:9px 12px;
        cursor:pointer; font:inherit;
      }
      .vk-close { align-self:flex-start; }
      .vk-equipment {
        display:grid; grid-template-columns:1fr 1fr;
        gap:10px; margin-bottom:16px;
      }
      .vk-equipment div {
        padding:12px; border:1px solid #5e4c32;
        background:#211d16; display:flex;
        flex-direction:column; gap:6px;
      }
      .vk-equipment span,.vk-footer { color:#b7a582; font-size:13px; }
      .vk-tabs { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:16px; }
      .vk-tabs button.active,.vk-details button:hover {
        background:#70542b; border-color:#e1bd75;
      }
      .vk-content {
        display:grid; grid-template-columns:minmax(0,1.5fr) minmax(190px,1fr);
        gap:16px;
      }
      .vk-grid {
        display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
        gap:8px; align-content:start;
      }
      .vk-slot {
        min-width:0; aspect-ratio:1; position:relative;
        display:flex; flex-direction:column; justify-content:center;
        align-items:center; gap:5px; padding:4px;
        background:#211e18; border:1px solid #55462f;
        color:#ead8b3; cursor:pointer;
      }
      .vk-slot.selected { outline:2px solid #d4ad64; }
      .vk-slot .vk-icon { font-size:clamp(22px,4vw,35px); }
      .vk-slot .vk-name {
        font-size:11px; text-align:center;
        overflow-wrap:anywhere;
      }
      .vk-slot .vk-qty {
        position:absolute; right:5px; bottom:3px;
        font-size:12px; color:#fff;
      }
      .vk-details {
        border:1px solid #55462f; padding:14px;
        background:#211e18; min-height:160px;
      }
      .vk-details h3 { margin-top:0; }
      .vk-details p { color:#c5b798; line-height:1.5; }
      .vk-details button { margin:5px 5px 0 0; }
      .vk-footer { margin-top:18px; }
      @media(max-width:600px) {
        .vk-panel { padding:14px; }
        .vk-content { grid-template-columns:1fr; }
        .vk-grid { grid-template-columns:repeat(4,minmax(0,1fr)); }
        .vk-details { min-height:100px; }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(this.overlay);

    this.selectedId = null;

    this.overlay.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;

      if (button.dataset.category) {
        this.category = button.dataset.category;
        this.render();
      }

      if (button.dataset.item) {
        this.selectedId = button.dataset.item;
        this.render();
      }

      if (button.dataset.action === 'close') this.close();
      if (button.dataset.action === 'equip') {
        this.inventory.equip(this.selectedId);
        this.render();
      }
      if (button.dataset.action === 'use') {
        this.inventory.use(this.selectedId);
        this.render();
      }
      if (button.dataset.action === 'drop') {
        this.inventory.remove(this.selectedId, 1);
        this.selectedId = null;
        this.render();
      }
    });

    this.render();
  }

  toggle() {
    if (this.opened) this.close();
    else this.open();
  }

  open() {
    if (this.game.state !== 'playing' || this.opened) return;

    this.opened = true;
    this.previousState = this.game.state;
    this.game.state = 'inventory';
    this.game.input.enabled = false;
    this.game.input.reset();

    if (document.pointerLockElement) document.exitPointerLock();

    this.overlay.classList.remove('hidden');
    this.render();
  }

  close() {
    if (!this.opened) return;

    this.opened = false;
    this.overlay.classList.add('hidden');

    if (this.game.state === 'inventory') {
      this.game.state = 'playing';
      this.game.input.reset();
      this.game.input.enabled = true;
      this.game.lockPointer();
    }
  }

  render() {
    const grid = this.overlay.querySelector('#vk-grid');
    const details = this.overlay.querySelector('#vk-details');
    const items = this.inventory.getItems();
    const visible = items.filter(item =>
      this.category === 'all' || item.type === this.category
    );

    grid.innerHTML = '';

    for (let i = 0; i < this.inventory.capacity; i++) {
      const item = visible[i];
      const slot = document.createElement('button');
      slot.className = 'vk-slot' +
        (item?.id === this.selectedId ? ' selected' : '');

      if (item) {
        slot.dataset.item = item.id;
        slot.innerHTML = `
          <span class="vk-icon">${item.icon}</span>
          <span class="vk-name"></span>
          <span class="vk-qty">${item.qty > 1 ? item.qty : ''}</span>
        `;
        slot.querySelector('.vk-name').textContent = item.name;
        slot.title = item.description;
        if (item.equipped) slot.style.borderColor = '#d4ad64';
      } else {
        slot.disabled = true;
        slot.innerHTML = '<span style="opacity:.2">◇</span>';
      }

      grid.appendChild(slot);
    }

    const selected = items.find(item => item.id === this.selectedId);

    if (!selected) {
      details.innerHTML = `
        <h3>Tu aventura</h3>
        <p>Selecciona un objeto para consultar sus detalles.</p>
      `;
    } else {
      details.replaceChildren();

      const title = document.createElement('h3');
      title.textContent = `${selected.icon} ${selected.name}`;

      const description = document.createElement('p');
      description.textContent = selected.description;

      const quantity = document.createElement('p');
      quantity.textContent = `Cantidad: ${selected.qty}`;

      details.append(title, description, quantity);

      if (selected.attack) {
        const stat = document.createElement('p');
        stat.textContent = `Ataque adicional: +${selected.attack}`;
        details.appendChild(stat);
      }

      if (selected.defense) {
        const stat = document.createElement('p');
        stat.textContent =
          `Reducción de daño: ${selected.defense * 100}%`;
        details.appendChild(stat);
      }

      const addButton = (label, action) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.dataset.action = action;
        details.appendChild(button);
      };

      if (selected.slot) {
        addButton(selected.equipped ? 'Ya equipado' : 'Equipar', 'equip');
      }

      if (selected.type === 'consumable') {
        addButton('Usar', 'use');
      }

      addButton('Soltar 1', 'drop');
    }

    this.overlay.querySelector('#vk-weapon').textContent =
      this.inventory.getDefinition(this.inventory.equipment.weapon)?.name || 'Ninguna';

    this.overlay.querySelector('#vk-shield').textContent =
      this.inventory.getDefinition(this.inventory.equipment.shield)?.name || 'Ninguno';

    this.overlay.querySelector('#vk-capacity').textContent =
      `${items.length} / ${this.inventory.capacity} espacios ocupados`;

    this.overlay.querySelectorAll('[data-category]').forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.category === this.category
      );
    });
  }
}

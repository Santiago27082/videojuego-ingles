import * as THREE from 'three';

/** Interfaz durante la partida: barras, misión, notificaciones, textos flotantes y barras de enemigos. */
export class HUD {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.el = {
      root: $('hud'), hp: $('bar-hp'), hpTxt: $('txt-hp'), sta: $('bar-sta'), xp: $('bar-xp'), lvl: $('lvl'),
      quest: $('quest-text'), notify: $('notify'), enemyBars: $('enemy-bars'), floats: $('float-layer'),
      vignette: $('vignette-hit'), staBar: document.querySelector('.bar.sta'),
    };
    this.tmp = new THREE.Vector3();
  }

  show(v) { this.el.root.classList.toggle('hidden', !v); }

  update(player) {
    const e = this.el;
    e.hp.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    e.hpTxt.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    e.sta.style.width = `${(player.sta / player.maxSta) * 100}%`;
    e.xp.style.width = `${(player.xp / player.xpNext) * 100}%`;
    e.lvl.textContent = player.level;
    this.updateEnemyBars();
  }

  setQuest(text) { this.el.quest.textContent = text; }

  notify(text) {
    const d = document.createElement('div');
    d.className = 'note';
    d.textContent = text;
    this.el.notify.appendChild(d);
    setTimeout(() => d.remove(), 2700);
  }

  flashHit() {
    this.el.vignette.classList.add('on');
    clearTimeout(this._vt);
    this._vt = setTimeout(() => this.el.vignette.classList.remove('on'), 90);
  }

  flashStamina() {
    const b = this.el.staBar;
    b.classList.remove('low');
    void b.offsetWidth;
    b.classList.add('low');
  }

  /** Convierte una posición 3D a coordenadas de pantalla; devuelve null si está detrás de la cámara. */
  project(v) {
    this.tmp.copy(v).project(this.game.camera);
    if (this.tmp.z > 1 || this.tmp.z < -1) return null;
    return { x: (this.tmp.x * 0.5 + 0.5) * window.innerWidth, y: (-this.tmp.y * 0.5 + 0.5) * window.innerHeight };
  }

  floatText(worldPos, text, cls = '') {
    const p = this.project(worldPos);
    if (!p) return;
    const d = document.createElement('div');
    d.className = `ftxt ${cls}`;
    d.textContent = text;
    d.style.left = `${p.x}px`;
    d.style.top = `${p.y}px`;
    this.el.floats.appendChild(d);
    setTimeout(() => d.remove(), 950);
  }

  addEnemyBar(enemy) {
    const wrap = document.createElement('div');
    wrap.className = 'ebar';
    wrap.innerHTML = `<div class="nm"></div><div class="eb"><div class="ef"></div></div>`;
    wrap.querySelector('.nm').textContent = enemy.name;
    wrap.style.display = 'none';
    this.el.enemyBars.appendChild(wrap);
    return { wrap, fill: wrap.querySelector('.ef') };
  }

  removeEnemyBar(enemy) { enemy.hud.wrap.remove(); }

  updateEnemyBars() {
    const g = this.game;
    for (const e of g.enemies) {
      const h = e.hud;
      const d = e.distTo(g.player.pos);
      if (e.dead || d > 24) { h.wrap.style.display = 'none'; continue; }
      const p = this.project(e.headPos);
      if (!p) { h.wrap.style.display = 'none'; continue; }
      h.wrap.style.display = '';
      h.wrap.style.left = `${p.x}px`;
      h.wrap.style.top = `${p.y}px`;
      h.fill.style.width = `${Math.max(0, (e.hp / e.maxHp) * 100)}%`;
    }
  }
}

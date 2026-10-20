import * as THREE from 'three';
import { World } from '../world/World.js';
import { InputController } from './InputController.js';
import { CameraController } from './CameraController.js';
import { Effects } from './Effects.js';
import { Player } from '../player/Player.js';
import { Enemy } from '../enemies/Enemy.js';
import { HUD } from '../ui/HUD.js';
import { TouchControls } from '../ui/TouchControls.js';
import { AudioManager } from '../systems/AudioManager.js';
import { SaveManager } from '../systems/SaveManager.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('c');
    this.isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);

    this.world = new World(this.scene);
    this.world.build();
    this.input = new InputController(this.canvas);
    this.cam = new CameraController(this.camera, this.world);
    this.effects = new Effects(this.scene);
    this.audio = new AudioManager();
    this.hud = new HUD(this);
    this.player = new Player(this);
    this.enemies = [];
    this.touch = new TouchControls(this.input, () => this.pause());

    this.state = 'menu'; // menu | playing | paused | dead | won
    this.time = 0;
    this.hitStopT = 0;
    this.sensitivity = 1;
    this.saveTimer = 0;
    this.startTime = 0;

    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this.resize());
    this.resize();

    // Si se pierde el bloqueo del puntero durante la partida (Esc), se pausa
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas && this.state === 'playing' && !this.isTouch) this.pause();
    });
    // Si el navegador rechazó el bloqueo (p. ej. justo tras Esc), un clic en la escena lo recupera
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !this.isTouch && document.pointerLockElement !== this.canvas) this.lockPointer();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });

    // Cámara del menú: panorámica lenta sobre la aldea
    this.menuAngle = 0;
    this.loop = this.loop.bind(this);
    this.renderer.setAnimationLoop(this.loop);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1 ? 74 : 62;
    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------ Flujo de la partida ------------------------------ */
  spawnEnemies() {
    for (const e of this.enemies) e.dispose();
    this.enemies = this.world.enemySpawns.map((s) => new Enemy(this, s));
  }

  updateQuest() {
    const total = this.enemies.length;
    const dead = this.enemies.filter((e) => e.dead).length;
    this.hud.setQuest(dead >= total ? 'Misión cumplida' : `Elimina a los bandidos del camino (${dead}/${total}) — cruza la puerta de la fortaleza hacia el norte`);
  }

  start({ keepProgress = false, fromSave = false } = {}) {
    this.audio.init();
    this.audio.resume();
    const p = this.player;
    if (fromSave) {
      const s = SaveManager.load();
      if (s) { p.level = s.level; p.xp = s.xp; p.kills = s.kills; this.audio.setVolume(s.volume); this.sensitivity = s.sensitivity; }
    } else if (!keepProgress) {
      p.level = 1; p.xp = 0; p.kills = 0;
    }
    p.reset();
    this.spawnEnemies();
    this.updateQuest();
    this.cam.reset(0);
    this.input.reset();
    this.startTime = performance.now();
    this.hud.show(true);
    this.touch.show(this.isTouch);
    document.getElementById('info-hint').classList.toggle('hidden', this.isTouch);
    this.setState('playing');
    this.hud.notify('Aldea de Brumavieja');
    setTimeout(() => this.hud.notify('Los bandidos acechan al norte, más allá de la puerta'), 1400);
    this.saveProgress();
  }

  setState(s) {
    this.state = s;
    this.input.enabled = s === 'playing';
    if (s === 'playing') {
      this.hideAll();
      this.lockPointer();
    }
  }

  hideAll() {
    for (const id of ['menu', 'pause', 'dead', 'victory', 'controls-panel', 'settings-panel', 'loading']) {
      document.getElementById(id).classList.add('hidden');
    }
  }

  show(id) { document.getElementById(id).classList.remove('hidden'); }

  lockPointer() {
    if (this.isTouch) return;
    try {
      const r = this.canvas.requestPointerLock();
      if (r && r.catch) r.catch(() => {});
    } catch (e) { /* algunos navegadores lo rechazan sin gesto del usuario */ }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.input.reset();
    if (document.pointerLockElement) document.exitPointerLock();
    this.show('pause');
    this.saveProgress();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('playing');
  }

  toMenu() {
    this.state = 'menu';
    this.input.enabled = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.hideAll();
    this.hud.show(false);
    this.touch.show(false);
    this.show('menu');
    document.getElementById('btn-continue').disabled = !SaveManager.exists();
  }

  saveProgress() {
    SaveManager.save({
      level: this.player.level, xp: this.player.xp, kills: this.player.kills,
      volume: this.audio.volume, sensitivity: this.sensitivity,
    });
  }

  onPlayerDead() {
    this.state = 'dead';
    this.input.enabled = false;
    this.hud.notify('Has caído...');
    setTimeout(() => {
      if (this.state !== 'dead') return;
      if (document.pointerLockElement) document.exitPointerLock();
      this.show('dead');
    }, 1600);
  }

  onEnemyKilled(enemy) {
    this.player.addXp(enemy.xp);
    this.updateQuest();
    this.hud.floatText(enemy.headPos, `+${enemy.xp} XP`, 'info');
    this.saveProgress();
    if (this.enemies.every((e) => e.dead)) {
      this.hud.notify('¡Has despejado el camino!');
      setTimeout(() => {
        if (this.state !== 'playing') return;
        this.audio.victory();
        this.state = 'won';
        this.input.enabled = false;
        if (document.pointerLockElement) document.exitPointerLock();
        const secs = Math.round((performance.now() - this.startTime) / 1000);
        document.getElementById('victory-stats').textContent = `Tiempo: ${Math.floor(secs / 60)} min ${secs % 60} s · Nivel ${this.player.level}`;
        this.show('victory');
      }, 2500);
    }
  }

  /** Pausa brevísima al impactar para dar peso a los golpes. */
  hitStop(sec) { this.hitStopT = Math.max(this.hitStopT, sec); }

  /* ------------------------------ Bucle principal ------------------------------ */
  loop() {
    let dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.hitStopT > 0) { this.hitStopT -= dt; dt *= 0.08; }

    if (this.state === 'playing' || this.state === 'dead' || this.state === 'won') {
      this.time += dt;
      // El jugador sólo lee entradas mientras `input.enabled` sea verdadero
      this.player.update(dt);
      for (const e of this.enemies) e.update(dt);
      this.effects.update(dt);
      this.world.update(dt, this.player.pos);
      this.cam.update(dt, this.input, this.player.pos, this.sensitivity);
      this.hud.update(this.player);
      this.saveTimer += dt;
      if (this.saveTimer > 20) { this.saveTimer = 0; if (this.state === 'playing') this.saveProgress(); }
    } else if (this.state === 'menu') {
      this.time += dt;
      this.menuAngle += dt * 0.08;
      const a = this.menuAngle;
      this.world.update(dt, new THREE.Vector3(0, 0, 10));
      this.camera.position.set(Math.sin(a) * 34, 9 + Math.sin(a * 2) * 2, 10 + Math.cos(a) * 34);
      this.camera.lookAt(0, 3, 6);
      this.effects.update(dt);
    } else {
      this.effects.update(dt);
    }

    if (this.input.pressed('info') && (this.state === 'playing')) {
      document.getElementById('controls-panel').classList.toggle('hidden');
    }
    this.input.endFrame();
    this.renderer.render(this.scene, this.camera);
  }
}

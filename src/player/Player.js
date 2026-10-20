import * as THREE from 'three';
import { Humanoid, IDLE, lerpPose } from './Humanoid.js';
import { heightAt } from '../world/World.js';

const TAU = Math.PI * 2;
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

/* ------------------------------ Poses de combate ------------------------------ */
const STANCE = { ...IDLE, ll: 0.3, sl: 0.2, lr: -0.28, sr: 0.25, lean: 0.08, lax: -0.7, lf: -1.2, laz: -0.1 };
const A = (o) => ({ ...STANCE, ...o });

// Fases: preparación (wind) -> impacto (act) -> recuperación (rec). El daño sólo se aplica en `act`.
const ATTACKS = {
  light: [
    { name: 'Corte horizontal', wind: 0.15, act: 0.12, rec: 0.24, dmg: 16, sta: 11, range: 2.5, arc: 150, poise: 16, lunge: 2.6,
      w: A({ rax: -1.45, ray: -1.3, raz: -0.15, rf: -0.5, ty: -0.55 }), e: A({ rax: -1.45, ray: 1.1, raz: 0.1, rf: -0.1, ty: 0.6, lean: 0.18 }) },
    { name: 'Corte diagonal', wind: 0.14, act: 0.12, rec: 0.24, dmg: 18, sta: 11, range: 2.5, arc: 150, poise: 18, lunge: 2.6,
      w: A({ rax: -2.1, ray: 1.0, raz: 0.1, rf: -0.5, ty: 0.5 }), e: A({ rax: -1.0, ray: -1.2, raz: -0.2, rf: -0.1, ty: -0.6, lean: 0.2 }) },
    { name: 'Estocada', wind: 0.18, act: 0.12, rec: 0.34, dmg: 24, sta: 14, range: 2.9, arc: 80, poise: 26, lunge: 4.2,
      w: A({ rax: -0.9, ray: -0.3, raz: -0.1, rf: -2.0, ty: -0.45, lean: -0.08 }), e: A({ rax: -1.5, ray: 0.05, raz: 0, rf: -0.05, ty: 0.3, lean: 0.3 }) },
  ],
  heavy: {
    name: 'Golpe descendente', wind: 0.45, act: 0.14, rec: 0.5, dmg: 44, sta: 28, range: 2.7, arc: 120, poise: 60, lunge: 3.5, guardBreak: true, knock: 3.5, heavy: true,
    w: A({ rax: -3.0, ray: 0, raz: -0.05, rf: -0.4, lean: -0.25, hy: 0.02 }), e: A({ rax: -1.15, ray: 0, raz: 0, rf: -0.1, lean: 0.55, hy: -0.12 }),
  },
  kick: {
    name: 'Patada', wind: 0.13, act: 0.1, rec: 0.3, dmg: 6, sta: 10, range: 2.1, arc: 90, poise: 70, lunge: 1.0, guardBreak: true, knock: 6, kick: true, stagger: true,
    w: A({ lr: 0.55, sr: 1.0, lean: -0.2, rax: -0.6, lax: -0.9 }), e: A({ lr: -1.55, sr: 0.05, lean: -0.3, rax: -0.6, lax: -0.9 }),
  },
};

const POSE_BLOCK = { ...IDLE, lax: -1.15, lay: 0, laz: -0.15, lf: -1.55, rax: -0.55, rf: -1.0, lean: 0.12, ll: 0.25, sl: 0.2, lr: -0.25, sr: 0.2, hy: -0.06 };
const POSE_STAGGER = { ...IDLE, lean: -0.5, rax: 0.1, rf: -0.4, lax: 0.3, lf: -0.3, ll: 0.2, lr: -0.3, hy: -0.05, hx: 0.3 };
const POSE_ROLL = { ...IDLE, rax: -0.9, raz: 0.5, rf: -1.6, lax: -0.9, laz: -0.5, lf: -1.6, ll: -1.4, sl: 1.9, lr: -1.4, sr: 1.9, lean: 0.8, hy: -0.35 };
const POSE_AIR = { ...IDLE, rax: -0.3, raz: -0.9, rf: -0.5, lax: -0.3, laz: 0.9, lf: -0.4, ll: -0.6, sl: 0.8, lr: 0.2, sr: 0.5 };
const POSE_DEAD = { ...IDLE, rax: -0.2, raz: -1.0, lax: -0.1, laz: 1.0, rf: -0.2, lf: -0.2, ll: 0.1, lr: 0.1 };

export class Player {
  constructor(game) {
    this.game = game;
    this.rig = new Humanoid({ skin: 0xd6a67f, cloth: 0x4a3b2a, armor: 0x98a0ab, trim: 0x2b1f14, helmet: true, shield: true, shieldColor: 0x7a1f1f, cape: 0x6d1717, scale: 1 });
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.9;
    this.rig.root.position.y = -0.9;
    this.pivot.add(this.rig.root);
    this.root.add(this.pivot);
    game.scene.add(this.root);

    this.pos = this.root.position;
    this.radius = 0.42;
    this.level = 1;
    this.xp = 0;
    this.kills = 0;
    this.reset();
  }

  get maxHp() { return 100 + (this.level - 1) * 12; }
  get maxSta() { return 100 + (this.level - 1) * 6; }
  get dmgMul() { return 1 + (this.level - 1) * 0.1; }
  get xpNext() { return 80 + (this.level - 1) * 60; }

  reset(spawn = this.game.world.playerSpawn) {
    this.pos.set(spawn.x, heightAt(spawn.x, spawn.z), spawn.z);
    this.y = this.pos.y;
    this.vy = 0;
    this.grounded = true;
    this.facing = Math.PI; // mirando hacia -z (hacia la fortaleza)
    this.hp = this.maxHp;
    this.sta = this.maxSta;
    this.state = 'free';
    this.timer = 0;
    this.atk = null;
    this.comboIdx = 0;
    this.comboTimer = 0;
    this.buffered = null;
    this.staDelay = 0;
    this.invuln = 0;
    this.blocking = false;
    this.blockTime = 0;
    this.counterWindow = 0;
    this.rollDir = new THREE.Vector3();
    this.walkPhase = 0;
    this.lastStep = 0;
    this.knock = new THREE.Vector3();
    this.crouching = false;
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.position.y = 0.9;
    this.rig.pose = { ...IDLE };
    this.rig.setEmissive(0x000000, 0);
    this.root.rotation.y = this.facing;
  }

  get forward() { return new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)); }

  addXp(n) {
    this.xp += n;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.hp = this.maxHp;
      this.sta = this.maxSta;
      this.game.hud.notify(`¡Has subido al nivel ${this.level}!`);
      this.game.audio.levelUp();
    }
  }

  /* ------------------------------ Daño recibido ------------------------------ */
  /** Devuelve: 'dodged' | 'parried' | 'blocked' | 'guardbreak' | 'hit' | 'dead' | 'none' */
  takeDamage(dmg, from, { guardBreak = false, knock = 3, attacker = null } = {}) {
    if (this.state === 'dead') return 'none';
    if (this.invuln > 0) return 'dodged';
    const g = this.game;
    const toAtt = Math.atan2(from.x - this.pos.x, from.z - this.pos.z);
    const front = Math.abs(angDiff(this.facing, toAtt)) < 1.25;

    if (this.blocking && front && this.state === 'free') {
      if (this.blockTime < 0.26 && !guardBreak) {
        // Parada perfecta
        g.audio.parry();
        g.effects.burst(this.pos.clone().setY(this.pos.y + 1.3).addScaledVector(this.forward, 0.6), 0xbfe6ff, 16, 7, false);
        g.hud.floatText(this.pos.clone().setY(this.pos.y + 2.2), '¡Parada!', 'info');
        g.cam.addShake(0.08);
        this.counterWindow = 1.2;
        this.sta = Math.min(this.maxSta, this.sta + 12);
        if (attacker) attacker.stagger(1.1, from.clone().sub(this.pos).normalize().multiplyScalar(-1));
        return 'parried';
      }
      const cost = guardBreak ? 999 : dmg * 0.55;
      if (this.sta >= cost) {
        this.sta -= cost;
        this.staDelay = 0.9;
        g.audio.block();
        g.effects.burst(this.pos.clone().setY(this.pos.y + 1.3).addScaledVector(this.forward, 0.6), 0xffe9b0, 8, 4);
        g.cam.addShake(0.05);
        this.hp -= dmg * 0.12;
        if (this.hp <= 0) { this.die(); return 'dead'; }
        this.knock.copy(this.pos).sub(from).setY(0).normalize().multiplyScalar(2.5);
        return 'blocked';
      }
      // Guardia rota
      this.sta = 0;
      this.staDelay = 1.8;
      g.hud.floatText(this.pos.clone().setY(this.pos.y + 2.2), '¡Guardia rota!', 'player');
      return this.applyHit(dmg * 0.7, from, 1.0, knock + 2, 'guardbreak');
    }
    return this.applyHit(dmg, from, 0.42, knock, 'hit');
  }

  applyHit(dmg, from, staggerTime, knock, result) {
    const g = this.game;
    this.hp -= dmg;
    this.invuln = 0.35;
    this.atk = null;
    this.buffered = null;
    this.blocking = false;
    g.audio.hurt();
    g.audio.hit();
    g.cam.addShake(0.2);
    g.effects.burst(this.pos.clone().setY(this.pos.y + 1.3), 0xb81818, 10, 4);
    g.hud.floatText(this.pos.clone().setY(this.pos.y + 2.1), `-${Math.round(dmg)}`, 'player');
    g.hud.flashHit();
    if (this.hp <= 0) { this.hp = 0; this.die(); return 'dead'; }
    this.state = 'stagger';
    this.timer = staggerTime;
    this.knock.copy(this.pos).sub(from).setY(0).normalize().multiplyScalar(knock);
    return result;
  }

  die() {
    this.state = 'dead';
    this.timer = 0;
    this.atk = null;
    this.game.audio.death();
    this.game.onPlayerDead();
  }

  /* ------------------------------ Actualización ------------------------------ */
  update(dt) {
    const g = this.game, inp = g.input, world = g.world;
    this.invuln = Math.max(0, this.invuln - dt);
    this.staDelay = Math.max(0, this.staDelay - dt);
    this.counterWindow = Math.max(0, this.counterWindow - dt);

    if (this.state === 'dead') { this.updateDead(dt); return; }

    const axis = inp.axis();
    const camF = g.cam.forward(), camR = g.cam.right();
    let mx = camF.x * axis.z + camR.x * axis.x;
    let mz = camF.z * axis.z + camR.z * axis.x;
    const mlen = Math.hypot(mx, mz);
    const moving = mlen > 0.05;
    if (moving) { mx /= mlen; mz /= mlen; }

    let speed = 0;
    let targetPose = null;
    let poseRate = 14;

    switch (this.state) {
      case 'free': {
        this.blocking = inp.held('block') && this.grounded && this.sta > 0;
        if (this.blocking) this.blockTime += dt; else this.blockTime = 0;
        this.crouching = inp.held('crouch') && this.grounded && !this.blocking;
        const wantSprint = inp.held('sprint') && moving && this.sta > 2 && !this.blocking && !this.crouching;

        speed = this.crouching ? 1.7 : wantSprint ? 6.0 : 3.1;
        if (this.blocking) speed = 1.9;
        speed *= axis.len > 0.05 ? Math.max(0.5, axis.len) : 0;
        if (wantSprint) { this.sta = Math.max(0, this.sta - 9 * dt); this.staDelay = 0.6; }

        // Orientación: al defender se mira hacia donde apunta la cámara
        if (this.blocking) {
          this.turnTo(Math.atan2(camF.x, camF.z), 10, dt);
        } else if (moving) {
          this.turnTo(Math.atan2(mx, mz), 14, dt);
        }

        if (moving) {
          this.pos.x += mx * speed * dt;
          this.pos.z += mz * speed * dt;
        }
        this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt;
        this.knock.multiplyScalar(Math.max(0, 1 - 10 * dt));

        // Acciones
        if (inp.pressed('jump') && this.grounded && this.sta >= 8 && !this.crouching) {
          this.vy = 7.2; this.grounded = false; this.sta -= 8; this.staDelay = 0.5;
        }
        if (inp.pressed('roll') && this.sta >= 22 && this.grounded) this.startRoll(moving ? { x: mx, z: mz } : null);
        else if (inp.pressed('heavy')) this.tryAttack('heavy');
        else if (inp.pressed('kick')) this.tryAttack('kick');
        else if (inp.pressed('light')) this.tryAttack('light');

        // Poses
        if (!this.grounded) targetPose = POSE_AIR;
        else if (this.blocking) {
          targetPose = { ...POSE_BLOCK };
          this.addWalk(targetPose, speed, dt, 0.45);
        } else {
          targetPose = { ...IDLE };
          const t = g.time;
          targetPose.rax += Math.sin(t * 1.6) * 0.02; targetPose.lax += Math.sin(t * 1.6 + 1) * 0.02;
          targetPose.hy += Math.sin(t * 1.6) * 0.004;
          if (this.crouching) { Object.assign(targetPose, { hy: -0.38, ll: -0.95, sl: 1.5, lr: -0.45, sr: 1.35, lean: 0.28 }); }
          this.addWalk(targetPose, speed, dt, 1);
        }
        break;
      }

      case 'attack': {
        this.updateAttack(dt, moving ? { x: mx, z: mz } : null);
        const a = this.atk;
        if (a) {
          const d = a.def;
          let p;
          if (a.phase === 'wind') p = lerpPose(IDLE, d.w, easeOut(Math.min(1, a.t / d.wind)));
          else if (a.phase === 'act') p = lerpPose(d.w, d.e, easeOut(Math.min(1, a.t / d.act)));
          else p = lerpPose(d.e, STANCE, easeInOut(Math.min(1, a.t / d.rec)));
          targetPose = p;
          poseRate = 40;
        } else targetPose = { ...IDLE };
        break;
      }

      case 'roll': {
        this.timer += dt;
        const T = 0.55;
        const k = Math.min(1, this.timer / T);
        speed = 9.0 - 4.5 * k;
        this.pos.x += this.rollDir.x * speed * dt;
        this.pos.z += this.rollDir.z * speed * dt;
        this.pivot.rotation.x = easeInOut(k) * TAU;
        targetPose = POSE_ROLL;
        poseRate = 30;
        if (k >= 1) { this.state = 'free'; this.pivot.rotation.x = 0; this.staDelay = 0.5; }
        break;
      }

      case 'stagger': {
        this.timer -= dt;
        this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt;
        this.knock.multiplyScalar(Math.max(0, 1 - 7 * dt));
        targetPose = POSE_STAGGER;
        poseRate = 25;
        if (this.timer <= 0) this.state = 'free';
        break;
      }
    }

    // Combo: se reinicia si pasa tiempo sin atacar
    if (this.state !== 'attack') {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.comboIdx = 0;
    }

    // Regeneración de resistencia
    if (this.staDelay <= 0 && this.state !== 'attack' && this.state !== 'roll') {
      const rate = this.blocking ? 8 : this.state === 'stagger' ? 0 : 26;
      this.sta = Math.min(this.maxSta, this.sta + rate * dt);
    }

    // Física vertical y colisiones
    this.vy -= 20 * dt;
    this.y += this.vy * dt;
    const gh = heightAt(this.pos.x, this.pos.z);
    if (this.y <= gh) {
      if (!this.grounded && this.vy < -8) g.audio.step();
      this.y = gh; this.vy = 0; this.grounded = true;
    } else if (this.y - gh > 0.12) this.grounded = false;
    world.resolve(this.pos, this.radius);
    // Mantener al personaje sobre el terreno al subir cuestas
    if (this.grounded) this.y = heightAt(this.pos.x, this.pos.z);
    this.pos.y = this.y;

    this.root.rotation.y = this.facing;
    if (targetPose) this.rig.setPose(targetPose, poseRate, dt);

    // La capa ondea con la velocidad
    if (this.rig.cape) {
      const v = Math.min(1, speed / 6);
      this.rig.cape.rotation.x = 0.1 + v * 0.55 + Math.sin(g.time * 6) * 0.05 * v;
    }
  }

  /** Añade el ciclo de caminar a una pose objetivo. */
  addWalk(pose, speed, dt, amount) {
    if (speed > 0.2 && this.grounded) {
      this.walkPhase += speed * dt * 2.3;
      const amp = Math.min(0.85, speed * 0.17) * amount;
      const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
      if (this.crouching) {
        pose.ll += -s * amp * 0.5; pose.lr += s * amp * 0.5;
      } else {
        pose.ll = -s * amp; pose.lr = s * amp;
        pose.sl = Math.max(0, c) * amp * 1.25 + 0.05; pose.sr = Math.max(0, -c) * amp * 1.25 + 0.05;
        pose.rax += s * amp * 0.5; pose.lax += -s * amp * 0.5;
        if (speed > 4.5) pose.lean = 0.2;
      }
      pose.hy += Math.abs(Math.sin(this.walkPhase)) * -0.03;
      const stepIdx = Math.floor(this.walkPhase / Math.PI);
      if (stepIdx !== this.lastStep) { this.lastStep = stepIdx; this.game.audio.step(); }
    }
  }

  turnTo(target, rate, dt) {
    this.facing += angDiff(this.facing, target) * Math.min(1, rate * dt);
  }

  /* ------------------------------ Ataques ------------------------------ */
  findTarget(range) {
    let best = null, bd = range;
    for (const e of this.game.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  tryAttack(kind) {
    let def;
    if (kind === 'light') def = ATTACKS.light[this.comboIdx % 3];
    else def = ATTACKS[kind];
    if (this.sta < def.sta * 0.6) { this.game.hud.flashStamina(); return false; }
    // Se puede atacar con poca resistencia, pero se queda en 0 y la recuperación se retrasa
    this.sta = Math.max(0, this.sta - def.sta);
    this.staDelay = 1.0;
    this.state = 'attack';
    this.atk = { def, kind, phase: 'wind', t: 0, hit: new Set() };
    this.blocking = false;

    // Autoapuntado suave hacia el enemigo cercano
    const tgt = this.findTarget(5);
    if (tgt) this.facing = Math.atan2(tgt.pos.x - this.pos.x, tgt.pos.z - this.pos.z);
    // Los enemigos cercanos pueden reaccionar a un ataque (defensa)
    for (const e of this.game.enemies) if (!e.dead && e.pos.distanceTo(this.pos) < 4) e.reactToPlayerAttack(def);
    return true;
  }

  updateAttack(dt, moveDir) {
    const a = this.atk;
    if (!a) { this.state = 'free'; return; }
    const d = a.def;
    a.t += dt;

    // Pequeño avance durante la preparación y el impacto
    if (a.phase !== 'rec') {
      const f = this.forward;
      const sp = d.lunge * (a.phase === 'act' ? 1 : 0.35);
      this.pos.x += f.x * sp * dt;
      this.pos.z += f.z * sp * dt;
    }

    // Buffer de entrada para el combo
    if (a.kind === 'light') {
      if (this.game.input.pressed('light')) this.buffered = 'light';
    }
    if (this.game.input.pressed('roll') && a.phase === 'rec' && this.sta >= 22) {
      this.startRoll(moveDir); return;
    }

    if (a.phase === 'wind' && a.t >= d.wind) {
      a.phase = 'act'; a.t = 0;
      this.game.audio.swing(!!d.heavy);
    } else if (a.phase === 'act') {
      this.checkHits(a, d);
      if (a.t >= d.act) { a.phase = 'rec'; a.t = 0; }
    } else if (a.phase === 'rec') {
      // Continuar el combo durante la recuperación
      if (this.buffered === 'light' && a.kind === 'light' && a.t > d.rec * 0.35 && this.comboIdx < 2) {
        this.comboIdx++;
        this.buffered = null;
        this.state = 'free';
        this.tryAttack('light');
        return;
      }
      if (a.t >= d.rec) {
        if (a.kind === 'light') { this.comboIdx = this.comboIdx >= 2 ? 0 : this.comboIdx + 1; this.comboTimer = 0.45; }
        this.atk = null;
        this.buffered = null;
        this.state = 'free';
      }
    }
  }

  checkHits(a, d) {
    const g = this.game;
    const f = this.forward;
    for (const e of g.enemies) {
      if (e.dead || a.hit.has(e)) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > d.range + e.radius) continue;
      const ang = Math.abs(angDiff(this.facing, Math.atan2(dx, dz)));
      if (ang > (d.arc * Math.PI) / 360 && dist > e.radius + 0.6) continue;
      if (g.world.segmentBlocked(this.pos.x, this.pos.z, e.pos.x, e.pos.z)) continue;
      a.hit.add(e);

      let dmg = d.dmg * this.dmgMul;
      let counter = false;
      if (this.counterWindow > 0 && a.kind !== 'kick') { dmg *= 1.6; counter = true; this.counterWindow = 0; }
      const res = e.takeHit(dmg, this.pos, { guardBreak: !!d.guardBreak, poise: d.poise, stagger: !!d.stagger, knock: d.knock || 1.5, kick: !!d.kick });
      const hp = e.pos.clone().setY(e.pos.y + 1.3);
      if (res === 'blocked') {
        g.audio.block();
        g.effects.burst(hp, 0xffe9b0, 8, 4);
        g.hud.floatText(hp.setY(hp.y + 0.8), 'Bloqueado', 'info');
        g.cam.addShake(0.05);
      } else if (res !== 'none') {
        g.audio.hit(!!d.heavy);
        g.effects.burst(hp, 0xffd27a, d.heavy ? 18 : 10, d.heavy ? 7 : 5);
        g.effects.burst(hp, 0xb81818, 6, 3);
        g.hud.floatText(hp.setY(hp.y + 0.8), (counter ? '¡Contraataque! ' : res === 'guardbreak' ? '¡Guardia rota! ' : '') + Math.round(dmg), counter || d.heavy ? 'crit' : '');
        g.cam.addShake(d.heavy ? 0.22 : 0.1);
        g.hitStop(d.heavy ? 0.1 : 0.05);
        if (res === 'dead') { this.kills++; }
      }
    }
  }

  /* ------------------------------ Esquiva ------------------------------ */
  startRoll(dir) {
    this.sta -= 22;
    this.staDelay = 0.9;
    this.state = 'roll';
    this.timer = 0;
    this.atk = null;
    this.buffered = null;
    this.blocking = false;
    this.invuln = 0.42;
    if (dir) {
      this.rollDir.set(dir.x, 0, dir.z);
      this.facing = Math.atan2(dir.x, dir.z);
    } else {
      this.rollDir.copy(this.forward).multiplyScalar(-1); // sin dirección: hacia atrás
    }
    this.game.audio.roll();
  }

  /* ------------------------------ Muerte ------------------------------ */
  updateDead(dt) {
    this.timer += dt;
    const k = Math.min(1, this.timer / 0.7);
    this.pivot.rotation.x = -easeOut(k) * (Math.PI / 2);
    this.pivot.position.y = 0.9 - 0.62 * easeOut(k);
    this.rig.setPose(POSE_DEAD, 10, dt);
    this.root.rotation.y = this.facing;
  }
}

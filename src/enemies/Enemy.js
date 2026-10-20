import * as THREE from 'three';
import { Humanoid, IDLE, lerpPose } from '../player/Humanoid.js';
import { heightAt } from '../world/World.js';

const TAU = Math.PI * 2;
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

const E_STANCE = { ...IDLE, ll: 0.25, sl: 0.15, lr: -0.25, sr: 0.2, lean: 0.05, rax: -0.5, rf: -1.0 };
const P_WIND = { ...E_STANCE, rax: -2.7, rf: -0.5, lean: -0.22, ty: 0.2 };
const P_STRIKE = { ...E_STANCE, rax: -1.15, rf: -0.1, lean: 0.5, ty: -0.25, hy: -0.1 };
const P_WIND_HEAVY = { ...E_STANCE, rax: -3.05, rf: -0.3, lean: -0.35, hy: 0.02 };
const P_BLOCK = { ...E_STANCE, lax: -1.15, lf: -1.55, laz: -0.15, rax: -0.4 };
const P_STAGGER = { ...IDLE, lean: -0.55, rax: 0.2, lax: 0.3, hx: 0.3, ll: 0.2, lr: -0.3, hy: -0.06 };
const P_DEAD = { ...IDLE, rax: -0.2, raz: -1.0, lax: -0.1, laz: 1.0, ll: 0.1, lr: 0.1 };

/**
 * Enemigo cuerpo a cuerpo con máquina de estados:
 * patrulla -> persecución -> (acechar | defender | atacar) -> recuperación | aturdido | muerto -> regreso.
 */
export class Enemy {
  constructor(game, spawn) {
    this.game = game;
    this.type = spawn.type;
    const boss = this.type === 'jefe';
    this.name = spawn.name;
    this.boss = boss;
    this.radius = boss ? 0.6 : 0.45;

    this.maxHp = boss ? 230 : 85;
    this.hp = this.maxHp;
    this.dmg = boss ? 26 : 13;
    this.walkSpeed = boss ? 1.9 : 2.1;
    this.runSpeed = boss ? 3.9 : 4.3;
    this.maxPoise = boss ? 90 : 40;
    this.poise = this.maxPoise;
    this.xp = boss ? 120 : 40;
    this.hasShield = !boss;

    this.rig = new Humanoid(boss
      ? { skin: 0xb48a6a, cloth: 0x2a2a2e, armor: 0x4a4d55, trim: 0x1a1612, helmet: true, weapon: 'axe', scale: 1.17, bulky: 1.25 }
      : { skin: 0xc79b78, cloth: 0x4f3f2b, armor: 0x6a5a45, trim: 0x2a1d12, helmet: false, shield: true, shieldColor: 0x4a3a28, weapon: 'sword', scale: 1.0 });
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 0.9;
    this.rig.root.position.y = -0.9;
    this.pivot.add(this.rig.root);
    this.root.add(this.pivot);
    game.scene.add(this.root);
    this.pos = this.root.position;

    this.home = new THREE.Vector3(spawn.x, heightAt(spawn.x, spawn.z), spawn.z);
    this.pos.copy(this.home);
    this.facing = Math.random() * TAU;
    this.state = 'patrol';
    this.stateT = 0;
    this.dead = false;
    this.cool = 1 + Math.random();
    this.patrolTarget = this.home.clone();
    this.patrolWait = Math.random() * 2;
    this.walkPhase = 0;
    this.knock = new THREE.Vector3();
    this.attackKind = 'light';
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeT = 0;
    this.didHit = false;
    this.flash = 0;
    this.aggro = false;
    this.hud = game.hud.addEnemyBar(this);
  }

  get headPos() { return this.pos.clone().setY(this.pos.y + 2.1); }

  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }

  setState(s) { this.state = s; this.stateT = 0; }

  /* ------------------------------ Reacciones ------------------------------ */
  /** Llamado cuando el jugador empieza un ataque cerca: a veces se cubre con el escudo. */
  reactToPlayerAttack(def) {
    if (this.dead || !this.hasShield) return;
    if ((this.state === 'chase' || this.state === 'stalk' || this.state === 'recover') && Math.random() < 0.38) {
      this.setState('block');
      this.blockFor = 0.7 + Math.random() * 0.4;
    }
  }

  stagger(time, dir) {
    if (this.dead) return;
    this.setState('stagger');
    this.staggerFor = time;
    this.poise = this.maxPoise;
    this.rig.setEmissive(0x000000, 0);
    if (dir) this.knock.copy(dir).multiplyScalar(2.5);
  }

  /** Devuelve: 'hit' | 'blocked' | 'guardbreak' | 'dead' | 'none' */
  takeHit(dmg, from, { guardBreak = false, poise = 10, stagger = false, knock = 2 } = {}) {
    if (this.dead) return 'none';
    this.aggro = true;
    const toAtt = Math.atan2(from.x - this.pos.x, from.z - this.pos.z);
    const front = Math.abs(angDiff(this.facing, toAtt)) < 1.2;
    const away = new THREE.Vector3(this.pos.x - from.x, 0, this.pos.z - from.z).normalize();

    if (this.state === 'block' && front) {
      if (!guardBreak) {
        this.hp -= dmg * 0.15;
        this.knock.copy(away).multiplyScalar(1.5);
        if (this.hp <= 0) return this.die(away);
        return 'blocked';
      }
      // Guardia rota: aturdido y recibe daño
      this.hp -= dmg;
      this.stagger(1.2, away.clone().multiplyScalar(knock / 2.5));
      if (this.hp <= 0) return this.die(away);
      this.flashHit();
      return 'guardbreak';
    }

    this.hp -= dmg;
    this.poise -= poise;
    this.flashHit();
    if (this.hp <= 0) return this.die(away);

    if (this.state === 'patrol') this.setState('chase');
    if (stagger || this.poise <= 0) {
      this.stagger(stagger ? 0.9 : 0.55, away.clone().multiplyScalar(knock / 2.5));
    } else {
      // El golpe empuja un poco pero no interrumpe el ataque (armadura)
      this.knock.copy(away).multiplyScalar(knock * 0.4);
    }
    return 'hit';
  }

  flashHit() { this.flash = 0.12; }

  die(away) {
    this.dead = true;
    this.state = 'dead';
    this.stateT = 0;
    this.knock.copy(away).multiplyScalar(3);
    this.rig.setEmissive(0x000000, 0);
    this.game.onEnemyKilled(this);
    return 'dead';
  }

  /* ------------------------------ IA ------------------------------ */
  update(dt) {
    const g = this.game, player = g.player;
    this.stateT += dt;
    this.poise = Math.min(this.maxPoise, this.poise + 18 * dt);
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0 && this.state !== 'windup') this.rig.setEmissive(0x000000, 0);
      else if (this.flash > 0) this.rig.setEmissive(0xff2a1a, 0.9);
    }

    if (this.state === 'dead') { this.updateDead(dt); return; }

    const pd = this.distTo(player.pos);
    const playerAlive = player.state !== 'dead';
    let speed = 0;
    let pose = { ...E_STANCE };
    let rate = 14;

    // Detección: radio de visión (con cono frontal en patrulla) y radio de oído
    if (this.state === 'patrol' && playerAlive) {
      const toP = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      const inCone = Math.abs(angDiff(this.facing, toP)) < 1.1 && pd < 16;
      if ((inCone || pd < 6 || this.aggro) && !g.world.segmentBlocked(this.pos.x, this.pos.z, player.pos.x, player.pos.z)) {
        this.setState('chase');
        this.aggro = true;
        g.enemies.forEach((o) => { if (o !== this && !o.dead && o.distTo(this.pos) < 12 && o.state === 'patrol') { o.aggro = true; o.setState('chase'); } });
      }
    }

    switch (this.state) {
      case 'patrol': {
        pose = { ...IDLE, rax: -0.3, rf: -0.8 };
        if (this.patrolWait > 0) {
          this.patrolWait -= dt;
          if (this.patrolWait <= 0) {
            const a = Math.random() * TAU, r = 1 + Math.random() * 6;
            this.patrolTarget.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
          }
        } else {
          const d = this.steerTo(this.patrolTarget.x, this.patrolTarget.z, this.walkSpeed * 0.6, dt);
          speed = this.walkSpeed * 0.6;
          if (d < 0.8) this.patrolWait = 1.5 + Math.random() * 2.5;
        }
        break;
      }

      case 'chase': {
        if (!playerAlive || pd > 34) { this.setState('return'); break; }
        const ang = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        this.turnTo(ang, 8, dt);
        const attackRange = this.boss ? 2.6 : 2.2;
        if (pd > attackRange * 1.15) {
          this.steerTo(player.pos.x, player.pos.z, this.runSpeed, dt);
          speed = this.runSpeed;
        } else {
          // En distancia de combate: atacar si el enfriamiento terminó, si no, acechar
          this.cool -= dt;
          if (this.cool <= 0) this.beginAttack(pd);
          else this.setState('stalk');
        }
        this.cool = Math.max(0, this.cool - dt * 0.5);
        break;
      }

      case 'stalk': {
        // Rodea al jugador a media distancia hasta poder atacar
        if (!playerAlive) { this.setState('return'); break; }
        const ang = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        this.turnTo(ang, 10, dt);
        this.cool -= dt;
        this.strafeT -= dt;
        if (this.strafeT <= 0) { this.strafeDir = Math.random() < 0.5 ? -1 : 1; this.strafeT = 0.8 + Math.random(); }
        const sx = Math.cos(ang) * this.strafeDir, sz = -Math.sin(ang) * this.strafeDir;
        const want = this.boss ? 2.8 : 2.6;
        const radial = THREE.MathUtils.clamp((pd - want) * 1.2, -1, 1);
        speed = this.walkSpeed * 0.9;
        this.moveBy((sx + Math.sin(ang) * radial) * speed * dt, (sz + Math.cos(ang) * radial) * speed * dt);
        pose.rax = -0.7;
        this.walkAnim(pose, speed * 0.7, dt);
        if (this.cool <= 0 && pd < (this.boss ? 3.0 : 2.6)) this.beginAttack(pd);
        else if (pd > 4.5) this.setState('chase');
        if (pd > 34) this.setState('return');
        break;
      }

      case 'block': {
        pose = { ...P_BLOCK };
        const ang = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        this.turnTo(ang, 12, dt);
        this.blockFor -= dt;
        if (this.blockFor <= 0) { this.setState('chase'); this.cool = Math.min(this.cool, 0.2); }
        break;
      }

      case 'windup': {
        const T = this.attackKind === 'heavy' ? 0.85 : 0.55;
        const ang = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
        if (this.stateT < T * 0.7) this.turnTo(ang, 6, dt); // deja de seguir justo antes de golpear
        const k = Math.min(1, this.stateT / T);
        pose = lerpPose(E_STANCE, this.attackKind === 'heavy' ? P_WIND_HEAVY : P_WIND, k);
        rate = 30;
        // Aviso visual: el arma y el cuerpo brillan en rojo
        this.rig.setEmissive(this.attackKind === 'heavy' ? 0xff3010 : 0xff7a20, 0.25 + 0.5 * k);
        if (this.stateT >= T) { this.setState('strike'); this.didHit = false; this.rig.setEmissive(0x000000, 0); g.audio.swing(this.attackKind === 'heavy'); }
        break;
      }

      case 'strike': {
        pose = { ...P_STRIKE };
        rate = 40;
        const f = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
        this.moveBy(f.x * 3.0 * dt, f.z * 3.0 * dt);
        if (!this.didHit && this.stateT > 0.06) {
          this.didHit = true;
          this.resolveStrike();
        }
        if (this.stateT >= 0.2) { this.setState('recover'); }
        break;
      }

      case 'recover': {
        const T = this.attackKind === 'heavy' ? 0.8 : 0.45;
        pose = lerpPose(P_STRIKE, E_STANCE, Math.min(1, this.stateT / T));
        if (this.stateT >= T) { this.setState(pd > 3.2 ? 'chase' : 'stalk'); this.cool = (this.boss ? 0.8 : 1.1) + Math.random() * 1.1; }
        break;
      }

      case 'stagger': {
        pose = { ...P_STAGGER };
        rate = 25;
        this.moveBy(this.knock.x * dt, this.knock.z * dt);
        this.knock.multiplyScalar(Math.max(0, 1 - 7 * dt));
        if (this.stateT >= (this.staggerFor || 0.5)) { this.setState('chase'); this.cool = 0.4 + Math.random() * 0.4; }
        break;
      }

      case 'return': {
        // Vuelve a su zona y recupera vida despacio
        this.hp = Math.min(this.maxHp, this.hp + 8 * dt);
        const d = this.steerTo(this.home.x, this.home.z, this.walkSpeed, dt);
        speed = this.walkSpeed;
        this.aggro = false;
        if (d < 1.2) { this.setState('patrol'); this.patrolWait = 1; }
        if (playerAlive && this.distTo(player.pos) < 9) { this.aggro = true; this.setState('chase'); }
        break;
      }
    }

    if (this.state === 'chase' || this.state === 'patrol' || this.state === 'return') this.walkAnim(pose, speed, dt);

    // Empuje residual (retroceso) y colisiones
    if (this.state !== 'stagger' && this.state !== 'strike') {
      this.moveBy(this.knock.x * dt, this.knock.z * dt);
      this.knock.multiplyScalar(Math.max(0, 1 - 8 * dt));
    }
    // Separación entre enemigos para que no se apilen
    for (const o of g.enemies) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x, dz = this.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = 1.1;
      if (d < min && d > 0.001) { this.pos.x += (dx / d) * (min - d) * 0.5; this.pos.z += (dz / d) * (min - d) * 0.5; }
    }
    // No atravesar al jugador
    const px = this.pos.x - player.pos.x, pz = this.pos.z - player.pos.z, pdist = Math.hypot(px, pz), pmin = 0.85;
    if (pdist < pmin && pdist > 0.001 && playerAlive) { this.pos.x = player.pos.x + (px / pdist) * pmin; this.pos.z = player.pos.z + (pz / pdist) * pmin; }

    g.world.resolve(this.pos, this.radius);
    this.pos.y = heightAt(this.pos.x, this.pos.z);
    this.root.rotation.y = this.facing;
    this.rig.setPose(pose, rate, dt);
  }

  beginAttack(pd) {
    const heavy = this.boss ? Math.random() < 0.4 : Math.random() < 0.12;
    this.attackKind = heavy ? 'heavy' : 'light';
    this.setState('windup');
  }

  /** Aplica el golpe si el jugador está en alcance y delante del enemigo. */
  resolveStrike() {
    const g = this.game, p = g.player;
    if (p.state === 'dead') return;
    const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const range = (this.boss ? 2.9 : 2.5) + p.radius;
    const heavy = this.attackKind === 'heavy';
    if (d > range) return;
    if (Math.abs(angDiff(this.facing, Math.atan2(dx, dz))) > 1.0) return;
    if (g.world.segmentBlocked(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) return;
    p.takeDamage(heavy ? this.dmg * 1.7 : this.dmg, this.pos, { guardBreak: heavy && this.boss, knock: heavy ? 5 : 3, attacker: this });
  }

  /* ------------------------------ Movimiento ------------------------------ */
  moveBy(dx, dz) { this.pos.x += dx; this.pos.z += dz; }

  turnTo(target, rate, dt) { this.facing += angDiff(this.facing, target) * Math.min(1, rate * dt); }

  /** Avanza hacia un punto esquivando obstáculos con sondas laterales. Devuelve la distancia restante. */
  steerTo(tx, tz, speed, dt) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return dist;
    let ang = Math.atan2(dx, dz);
    const w = this.game.world;
    const probe = (a) => w.blocked(this.pos.x + Math.sin(a) * 1.4, this.pos.z + Math.cos(a) * 1.4, this.radius);
    if (probe(ang)) {
      const offs = [0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3];
      // Mantener el lado elegido evita oscilar frente a un muro
      if (this.avoidSide) offs.sort((a, b) => (Math.sign(b) === this.avoidSide ? 1 : 0) - (Math.sign(a) === this.avoidSide ? 1 : 0));
      for (const o of offs) {
        if (!probe(ang + o)) { ang += o; this.avoidSide = Math.sign(o); break; }
      }
    } else this.avoidSide = 0;
    this.turnTo(ang, 9, dt);
    this.moveBy(Math.sin(this.facing) * speed * dt, Math.cos(this.facing) * speed * dt);
    return dist;
  }

  walkAnim(pose, speed, dt) {
    if (speed < 0.2) return;
    this.walkPhase += speed * dt * 2.3;
    const amp = Math.min(0.8, speed * 0.17);
    const s = Math.sin(this.walkPhase), c = Math.cos(this.walkPhase);
    pose.ll = -s * amp; pose.lr = s * amp;
    pose.sl = Math.max(0, c) * amp * 1.2 + 0.05; pose.sr = Math.max(0, -c) * amp * 1.2 + 0.05;
    pose.lax += -s * amp * 0.4;
  }

  updateDead(dt) {
    const k = Math.min(1, this.stateT / 0.8);
    this.pivot.rotation.x = -(1 - (1 - k) * (1 - k)) * (Math.PI / 2);
    this.pivot.position.y = 0.9 - 0.62 * k;
    this.moveBy(this.knock.x * dt, this.knock.z * dt);
    this.knock.multiplyScalar(Math.max(0, 1 - 6 * dt));
    this.game.world.resolve(this.pos, 0.3);
    // El cuerpo se hunde lentamente en el suelo y desaparece
    const sink = this.stateT > 7 ? (this.stateT - 7) * 0.5 : 0;
    this.pos.y = heightAt(this.pos.x, this.pos.z) - sink;
    this.rig.setPose(P_DEAD, 10, dt);
    if (this.stateT > 11) this.root.visible = false;
  }

  dispose() {
    this.game.scene.remove(this.root);
    this.game.hud.removeEnemyBar(this);
  }
}

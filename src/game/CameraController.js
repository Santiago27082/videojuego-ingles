import * as THREE from 'three';
import { heightAt } from '../world/World.js';

/** Cámara en tercera persona: órbita alrededor del jugador, distancia ajustable y sin atravesar muros. */
export class CameraController {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = 0.28;
    this.dist = 5.2;
    this.minDist = 2.0;
    this.maxDist = 9;
    this.curDist = this.dist;
    this.shake = 0;
    this.target = new THREE.Vector3();
    this._f = new THREE.Vector3();
    this._r = new THREE.Vector3();
  }

  forward() { return this._f.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  right() { return this._r.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }

  reset(yaw = 0) {
    this.yaw = yaw;
    this.pitch = 0.28;
    this.dist = 5.2;
    this.curDist = this.dist;
  }

  addShake(a) { this.shake = Math.min(0.5, this.shake + a); }

  update(dt, input, playerPos, sensitivity = 1) {
    const s = 0.0023 * sensitivity;
    this.yaw -= input.mouseDX * s;
    this.pitch = THREE.MathUtils.clamp(this.pitch + input.mouseDY * s, -0.35, 1.2);
    if (input.wheel) this.dist = THREE.MathUtils.clamp(this.dist + input.wheel * 0.7, this.minDist, this.maxDist);

    // Punto al que mira (hombro derecho del personaje)
    const right = this.right();
    const lookAt = this.target.set(playerPos.x + right.x * 0.45, playerPos.y + 1.55, playerPos.z + right.z * 0.45);

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const dx = Math.sin(this.yaw) * cp, dy = sp, dz = Math.cos(this.yaw) * cp;

    // Colisión de la cámara: avanzar desde el jugador hacia atrás hasta chocar
    let free = this.dist;
    for (let d = 0.6; d <= this.dist; d += 0.25) {
      const x = lookAt.x + dx * d, y = lookAt.y + dy * d, z = lookAt.z + dz * d;
      if (this.world.blocked(x, z, 0.25) && y < 8 || y < heightAt(x, z) + 0.35) {
        free = Math.max(this.minDist * 0.6, d - 0.35);
        break;
      }
    }
    this.curDist += (free - this.curDist) * Math.min(1, dt * (free < this.curDist ? 18 : 4));

    this.camera.position.set(lookAt.x + dx * this.curDist, lookAt.y + dy * this.curDist, lookAt.z + dz * this.curDist);
    const gy = heightAt(this.camera.position.x, this.camera.position.z) + 0.3;
    if (this.camera.position.y < gy) this.camera.position.y = gy;

    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.6);
    }
    this.camera.lookAt(lookAt);
  }
}

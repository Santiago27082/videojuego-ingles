import * as THREE from 'three';

/** Chispas y partículas de impacto con un grupo reutilizable de mallas (sin crear objetos por golpe). */
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    const geo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    for (let i = 0; i < 80; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      scene.add(m);
      this.pool.push({ mesh: m, vel: new THREE.Vector3(), life: 0, max: 1 });
    }
    this.next = 0;
  }

  burst(pos, color = 0xffd27a, count = 10, speed = 5, gravity = true) {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.next];
      this.next = (this.next + 1) % this.pool.length;
      p.mesh.position.copy(pos);
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = 1;
      p.mesh.visible = true;
      p.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8 + 1, (Math.random() - 0.5) * speed);
      p.max = p.life = 0.35 + Math.random() * 0.35;
      p.gravity = gravity;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.mesh.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      if (p.gravity) p.vel.y -= 14 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = p.life / p.max;
    }
  }
}

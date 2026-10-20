import * as THREE from 'three';

/* ---------- Utilidades de texturas procedurales (provisionales) ---------- */
function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function noiseTexture(base, variance, { size = 256, repeat = [1, 1], extra = null } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size, size);
  const [r, gg, b] = hexToRgb(base);
  for (let i = 0; i < size * size; i++) {
    const v = (Math.random() - 0.5) * variance;
    img.data[i * 4] = Math.max(0, Math.min(255, r + v));
    img.data[i * 4 + 1] = Math.max(0, Math.min(255, gg + v));
    img.data[i * 4 + 2] = Math.max(0, Math.min(255, b + v));
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  if (extra) extra(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function stoneLines(g, s) {
  g.strokeStyle = 'rgba(15,15,18,.55)';
  g.lineWidth = 3;
  const rows = 6;
  for (let y = 0; y < rows; y++) {
    const py = (y * s) / rows;
    g.beginPath(); g.moveTo(0, py); g.lineTo(s, py); g.stroke();
    const off = y % 2 ? s / 8 : 0;
    for (let x = 0; x < 4; x++) {
      const px = off + (x * s) / 4;
      g.beginPath(); g.moveTo(px, py); g.lineTo(px, py + s / rows); g.stroke();
    }
  }
}

function woodLines(g, s) {
  g.strokeStyle = 'rgba(20,10,4,.5)';
  g.lineWidth = 2;
  for (let x = 0; x < 8; x++) {
    g.beginPath(); g.moveTo((x * s) / 8, 0); g.lineTo((x * s) / 8, s); g.stroke();
  }
}

/** Caja con UVs escaladas para que la textura no se estire en piezas grandes. */
function boxGeo(w, h, d, tile = 3) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const scales = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * scales[f][0]) / tile, (uv.getY(i) * scales[f][1]) / tile);
    }
  }
  return geo;
}

function gableRoofGeo(w, d, h, overhang = 0.5) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - overhang, 0);
  shape.lineTo(w / 2 + overhang, 0);
  shape.lineTo(0, h);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d + overhang * 2, bevelEnabled: false });
  geo.translate(0, 0, -(d + overhang * 2) / 2);
  return geo;
}

function rand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const WORLD_RADIUS = 78;

export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  const t = THREE.MathUtils.smoothstep(d, 46, 80);
  return t * (Math.sin(x * 0.05) * Math.cos(z * 0.06) * 3 + Math.sin(x * 0.13 + z * 0.11) * 0.8 + 4 * t);
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.circles = [];
    this.boxes = [];
    this.torches = [];
    this.fires = [];
    this.time = 0;
    this.enemySpawns = [];
    this.playerSpawn = new THREE.Vector3(0, 0, 26);

    this.mats = {
      ground: new THREE.MeshStandardMaterial({ map: noiseTexture(0x3d4a2a, 46, { repeat: [60, 60] }), roughness: 1 }),
      dirt: new THREE.MeshStandardMaterial({ map: noiseTexture(0x5d4a33, 40, { repeat: [2, 14] }), roughness: 1 }),
      stone: new THREE.MeshStandardMaterial({ map: noiseTexture(0x77777a, 40, { extra: stoneLines }), roughness: 0.95 }),
      plaster: new THREE.MeshStandardMaterial({ map: noiseTexture(0xb7a583, 26), roughness: 0.95 }),
      wood: new THREE.MeshStandardMaterial({ map: noiseTexture(0x5a3b22, 30, { extra: woodLines }), roughness: 0.9 }),
      darkWood: new THREE.MeshStandardMaterial({ color: 0x2f1d10, roughness: 0.9 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x5a2d22, roughness: 0.9 }),
      thatch: new THREE.MeshStandardMaterial({ color: 0x7a6532, roughness: 1 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.5, metalness: 0.8 }),
      window: new THREE.MeshStandardMaterial({ color: 0xffb54a, emissive: 0xff9a2a, emissiveIntensity: 1.4 }),
      leaf: new THREE.MeshStandardMaterial({ color: 0x1f3a1f, roughness: 1, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: 0x3a2818, roughness: 1 }),
      rock: new THREE.MeshStandardMaterial({ color: 0x6a6a68, roughness: 1, flatShading: true }),
      cloth: new THREE.MeshStandardMaterial({ color: 0x8f2a2a, roughness: 0.9, side: THREE.DoubleSide }),
      flame: new THREE.MeshBasicMaterial({ color: 0xffa23a }),
    };
  }

  /* ----------------------------- Construcción ----------------------------- */
  build() {
    this.buildLighting();
    this.buildSky();
    this.buildTerrain();
    this.buildRoad();
    this.buildVillage();
    this.buildFortressGate();
    this.buildBanditCamp();
    this.buildForest();
    this.buildBoundaryRocks();
  }

  buildLighting() {
    const s = this.scene;
    s.background = new THREE.Color(0x0e1521);
    s.fog = new THREE.Fog(0x232b3a, 24, 120);
    this.hemi = new THREE.HemisphereLight(0x7a8ca8, 0x2c2519, 0.75);
    s.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0xb7c6e6, 1.25);
    this.moon.position.set(-30, 55, 25);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const c = this.moon.shadow.camera;
    c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 1; c.far = 150;
    this.moon.shadow.bias = -0.0004;
    this.moon.shadow.normalBias = 0.03;
    s.add(this.moon);
    s.add(this.moon.target);
    this.moonOffset = new THREE.Vector3(-30, 55, 25);
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(500, 24, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color(0x070d1c) }, bottom: { value: new THREE.Color(0x4a5470) } },
      vertexShader: 'varying float vY; void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying float vY; void main(){ float t = smoothstep(-0.05, 0.6, vY); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);

    const r = rand(7);
    const pts = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      const u = r() * Math.PI * 2, v = Math.acos(0.05 + r() * 0.95);
      pts[i * 3] = 450 * Math.sin(v) * Math.cos(u);
      pts[i * 3 + 1] = 450 * Math.cos(v);
      pts[i * 3 + 2] = 450 * Math.sin(v) * Math.sin(u);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }));
    this.scene.add(this.stars);

    const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(18, 20, 14), new THREE.MeshBasicMaterial({ color: 0xe6ecff, fog: false }));
    moonMesh.position.set(-190, 230, 170);
    this.scene.add(moonMesh);
  }

  buildTerrain() {
    const size = 240, seg = 120;
    const geo = new THREE.PlaneGeometry(size, size, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, this.mats.ground);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  buildRoad() {
    // Camino de tierra de la aldea hacia la fortaleza y el campamento
    const segs = 40, zs = 62, ze = -52, w = 4.6;
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) {
      const z = zs + ((ze - zs) * i) / segs;
      const wob = Math.sin(z * 0.11) * 1.4;
      for (const side of [-1, 1]) {
        const x = wob + side * (w / 2);
        pos.push(x, heightAt(x, z) + 0.05, z);
        uv.push(side < 0 ? 0 : 1, i * 0.6);
      }
      if (i < segs) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, this.mats.dirt);
    road.receiveShadow = true;
    this.scene.add(road);
    this.roadWobble = (z) => Math.sin(z * 0.11) * 1.4;
  }

  /* ----------------------------- Colisiones ----------------------------- */
  addCircle(x, z, r) { this.circles.push({ x, z, r }); }
  addBox(cx, cz, w, d) {
    this.boxes.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  }

  /** Empuja `pos` (x,z) fuera de los obstáculos y lo mantiene dentro del mundo. */
  resolve(pos, radius) {
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.circles) {
        const dx = pos.x - c.x, dz = pos.z - c.z;
        const min = c.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.0001;
          pos.x = c.x + (dx / d) * min;
          pos.z = c.z + (dz / d) * min;
        }
      }
      for (const b of this.boxes) {
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        const dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 < radius * radius) {
          if (d2 > 0.000001) {
            const d = Math.sqrt(d2);
            pos.x = cx + (dx / d) * radius;
            pos.z = cz + (dz / d) * radius;
          } else {
            // Centro dentro de la caja: salir por el lado más cercano
            const l = pos.x - b.minX, r = b.maxX - pos.x, t = pos.z - b.minZ, bt = b.maxZ - pos.z;
            const m = Math.min(l, r, t, bt);
            if (m === l) pos.x = b.minX - radius;
            else if (m === r) pos.x = b.maxX + radius;
            else if (m === t) pos.z = b.minZ - radius;
            else pos.z = b.maxZ + radius;
          }
        }
      }
    }
    const d = Math.hypot(pos.x, pos.z);
    if (d > WORLD_RADIUS) {
      pos.x *= WORLD_RADIUS / d;
      pos.z *= WORLD_RADIUS / d;
    }
  }

  blocked(x, z, radius = 0.4) {
    for (const c of this.circles) {
      const dx = x - c.x, dz = z - c.z, m = c.r + radius;
      if (dx * dx + dz * dz < m * m) return true;
    }
    for (const b of this.boxes) {
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  /** Línea de visión aproximada: los golpes no atraviesan muros ni edificios. */
  segmentBlocked(ax, az, bx, bz) {
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(len / 0.4));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      for (const b of this.boxes) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
      for (const c of this.circles) {
        if (c.r < 1) continue; // los árboles finos y barriles no tapan golpes
        const dx = x - c.x, dz = z - c.z;
        if (dx * dx + dz * dz < c.r * c.r) return true;
      }
    }
    return false;
  }

  /* ----------------------------- Estructuras ----------------------------- */
  addMesh(geo, mat, x, y, z, { shadow = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    m.receiveShadow = receive;
    this.scene.add(m);
    return m;
  }

  house(x, z, w, d, h, { roof = this.mats.roof, wall = this.mats.plaster, chimney = false, windows = 2 } = {}) {
    const base = heightAt(x, z);
    // Zócalo de piedra + muros con vigas de madera
    this.addMesh(boxGeo(w + 0.3, 0.6, d + 0.3), this.mats.stone, x, base + 0.3, z);
    this.addMesh(boxGeo(w, h, d), wall, x, base + 0.6 + h / 2, z);
    // Vigas
    for (const sx of [-1, 1]) {
      this.addMesh(new THREE.BoxGeometry(0.22, h, d + 0.12), this.mats.darkWood, x + sx * (w / 2), base + 0.6 + h / 2, z, { receive: false });
    }
    this.addMesh(new THREE.BoxGeometry(w + 0.12, 0.2, d + 0.14), this.mats.darkWood, x, base + 0.6 + h * 0.55, z, { receive: false });
    // Tejado a dos aguas
    const roofMesh = this.addMesh(gableRoofGeo(w, d, h * 0.65, 0.55), roof, x, base + 0.6 + h, z);
    roofMesh.rotation.y = 0;
    // Puerta y ventanas (cara +z, hacia el camino)
    this.addMesh(new THREE.BoxGeometry(1.1, 2.0, 0.12), this.mats.darkWood, x, base + 1.6, z + d / 2 + 0.03, { receive: false });
    for (let i = 0; i < windows; i++) {
      const wx = x + (windows === 1 ? 0 : (i === 0 ? -1 : 1) * (w / 2 - 1.2));
      if (Math.abs(wx - x) < 0.8 && windows > 1) continue;
      this.addMesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), this.mats.window, wx + (windows === 1 ? w / 3 : 0), base + 0.6 + h * 0.6, z + d / 2 + 0.03, { shadow: false, receive: false });
    }
    if (chimney) {
      this.addMesh(boxGeo(0.9, h * 1.15, 0.9), this.mats.stone, x + w / 2 - 1.1, base + 0.6 + h * 0.9, z - d / 4);
    }
    this.addBox(x, z, w + 0.2, d + 0.2);
  }

  tower(x, z, r, h) {
    const base = heightAt(x, z);
    this.addMesh(new THREE.CylinderGeometry(r, r * 1.08, h, 16), this.mats.stone, x, base + h / 2, z);
    // Almenas
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.addMesh(new THREE.BoxGeometry(1.0, 1.1, 0.8), this.mats.stone, x + Math.cos(a) * (r - 0.2), base + h + 0.5, z + Math.sin(a) * (r - 0.2), { receive: false }).rotation.y = -a;
    }
    this.addCircle(x, z, r);
  }

  barrel(x, z) {
    const y = heightAt(x, z);
    this.addMesh(new THREE.CylinderGeometry(0.42, 0.38, 0.9, 10), this.mats.wood, x, y + 0.45, z);
    for (const hy of [0.2, 0.7]) this.addMesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 10), this.mats.iron, x, y + hy, z, { receive: false });
    this.addCircle(x, z, 0.45);
  }

  crate(x, z, s = 0.9, rot = 0) {
    const y = heightAt(x, z);
    const m = this.addMesh(boxGeo(s, s, s, 1.2), this.mats.wood, x, y + s / 2, z);
    m.rotation.y = rot;
    this.addCircle(x, z, s * 0.62);
  }

  torch(x, y, z, withLight = true) {
    this.addMesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 6), this.mats.darkWood, x, y + 0.85, z, { receive: false });
    const flame = this.addMesh(new THREE.ConeGeometry(0.17, 0.5, 6), this.mats.flame, x, y + 1.95, z, { shadow: false, receive: false });
    let light = null;
    if (withLight) {
      light = new THREE.PointLight(0xff9a3c, 2.2, 17, 1.6);
      light.position.set(x, y + 2.1, z);
      this.scene.add(light);
    }
    this.torches.push({ flame, light, base: 2.2, seed: Math.random() * 100 });
  }

  wallTorch(x, y, z) {
    // Antorcha en un soporte de hierro, sin poste
    this.addMesh(new THREE.BoxGeometry(0.12, 0.12, 0.4), this.mats.iron, x, y, z, { receive: false });
    const flame = this.addMesh(new THREE.ConeGeometry(0.15, 0.45, 6), this.mats.flame, x, y + 0.3, z, { shadow: false, receive: false });
    const light = new THREE.PointLight(0xff9a3c, 2.4, 16, 1.6);
    light.position.set(x, y + 0.5, z + 0.3);
    this.scene.add(light);
    this.torches.push({ flame, light, base: 2.4, seed: Math.random() * 100 });
  }

  buildVillage() {
    // --- Posada (grande) ---
    this.house(-14, 8, 11, 7, 4.2, { chimney: true, windows: 2 });
    // Cartel
    this.addMesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), this.mats.wood, -9.4, 3.6, 12.0);
    this.addMesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), this.mats.darkWood, -10.1, 2.4, 12.0);
    // --- Herrería ---
    this.house(14, 6, 8, 6, 3.6, { chimney: true, roof: this.mats.thatch, wall: this.mats.stone, windows: 1 });
    // Yunque + fragua exterior
    const ay = heightAt(9.5, 10.5);
    this.addMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), this.mats.wood, 9.5, ay + 0.25, 10.5);
    this.addMesh(new THREE.BoxGeometry(0.9, 0.3, 0.35), this.mats.iron, 9.5, ay + 0.65, 10.5);
    this.addBox(9.5, 10.5, 1.0, 0.7);
    // --- Casas ---
    this.house(-13, -8, 6.5, 5.5, 3.4, { roof: this.mats.thatch });
    this.house(13, -9, 7, 5.5, 3.5);
    this.house(-24, 1, 6, 5, 3.2, { roof: this.mats.thatch });
    this.house(24, -1, 6, 5, 3.2);
    // --- Pozo (a un lado del camino) ---
    const wx = 6, wz = 3, wy = heightAt(wx, wz);
    this.addMesh(new THREE.CylinderGeometry(1.1, 1.2, 1.0, 14), this.mats.stone, wx, wy + 0.5, wz);
    for (const sx of [-1, 1]) this.addMesh(new THREE.BoxGeometry(0.15, 2.2, 0.15), this.mats.darkWood, wx + sx * 0.95, wy + 1.9, wz, { receive: false });
    this.addMesh(gableRoofGeo(2.4, 1.6, 0.9, 0.2), this.mats.roof, wx, wy + 3.0, wz).rotation.y = Math.PI / 2;
    this.addCircle(wx, wz, 1.3);
    // --- Mercado ---
    for (const [sx, sz, col] of [[-6.5, 17, 0x8f2a2a], [6.5, 17.5, 0x2a4f8f], [-2, 31, 0x3f7a3a]]) {
      const y = heightAt(sx, sz);
      for (const [px, pz] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) {
        this.addMesh(new THREE.CylinderGeometry(0.06, 0.06, 2.3, 6), this.mats.darkWood, sx + px, y + 1.15, sz + pz, { receive: false });
      }
      const cloth = this.addMesh(new THREE.BoxGeometry(3.0, 0.08, 2.2), new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }), sx, y + 2.35, sz);
      cloth.rotation.z = 0.08;
      this.addMesh(boxGeo(2.4, 0.9, 0.9, 1.5), this.mats.wood, sx, y + 0.45, sz - 0.3);
      this.addBox(sx, sz - 0.3, 2.4, 0.9);
      this.barrel(sx + 1.8, sz + 0.2);
    }
    this.crate(-3, 20, 0.9, 0.3); this.crate(-3.8, 20.4, 0.7, 1.0); this.crate(3.5, 21, 0.9, 0.7);
    this.barrel(-9.5, 13.5); this.barrel(-8.8, 13.9); this.crate(10, 1, 0.8, 0.2); this.barrel(11, -3.5);

    // --- Antorchas del pueblo ---
    this.torch(-3.2, heightAt(-3.2, 28), 28);
    this.torch(3.2, heightAt(3.2, 28), 28);
    this.torch(-4, heightAt(-4, 9), 9);
    this.torch(5, heightAt(5, -2), -2);
    // Cartel de bienvenida
    const signY = heightAt(0, 36);
    this.addMesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), this.mats.darkWood, -2.3, signY + 1.2, 36);
    this.addMesh(new THREE.BoxGeometry(0.15, 2.4, 0.15), this.mats.darkWood, 2.3, signY + 1.2, 36);
    this.addMesh(new THREE.BoxGeometry(4.8, 0.2, 0.2), this.mats.darkWood, 0, signY + 2.5, 36);
    this.addMesh(new THREE.BoxGeometry(2.4, 0.7, 0.1), this.mats.wood, 0, signY + 2.0, 36);
  }

  buildFortressGate() {
    // Muralla ruinosa de la Fortaleza de Hierro con puerta central
    const z = -30, thick = 2.6, h = 7;
    const segs = [[-17, 28], [17, 28]]; // centros y longitudes (hueco central de 6 de ancho entre pilares)
    for (const [cx, len] of segs) {
      const base = heightAt(cx, z);
      this.addMesh(boxGeo(len, h, thick, 4), this.mats.stone, cx, base + h / 2, z);
      this.addBox(cx, z, len, thick);
      const n = Math.floor(len / 2.2);
      for (let i = 0; i < n; i++) {
        if ((i * 7) % 5 === 0) continue; // almenas derruidas
        this.addMesh(new THREE.BoxGeometry(1.2, 1.1, thick * 0.8), this.mats.stone, cx - len / 2 + 1.1 + i * 2.2, base + h + 0.5, z, { receive: false });
      }
    }
    this.tower(-33, z, 4, 11);
    this.tower(33, z, 4, 11);
    // Dintel y pilares de la puerta
    const by = heightAt(0, z);
    this.addMesh(boxGeo(7, 2.2, thick + 0.4, 3), this.mats.stone, 0, by + h - 1.1, z);
    for (const sx of [-1, 1]) {
      this.addMesh(boxGeo(1.4, h, thick + 0.6, 3), this.mats.stone, sx * 3.7, by + h / 2, z);
    }
    this.addBox(-3.7, z, 1.4, thick + 0.6);
    this.addBox(3.7, z, 1.4, thick + 0.6);
    // Pendones
    for (const sx of [-1, 1]) {
      const b = this.addMesh(new THREE.PlaneGeometry(1.1, 3), this.mats.cloth, sx * 2.9, by + 4.2, z + thick / 2 + 0.35, { receive: false });
      b.userData.sway = Math.random() * 6;
      this.fires.push({ banner: b });
    }
    this.wallTorch(-2.6, by + 3.0, z + thick / 2 + 0.6);
    this.wallTorch(2.6, by + 3.0, z + thick / 2 + 0.6);
  }

  buildBanditCamp() {
    const cx = 0, cz = -44;
    const base = heightAt(cx, cz);
    // Hoguera
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.addMesh(new THREE.DodecahedronGeometry(0.28, 0), this.mats.rock, cx + Math.cos(a) * 0.9, base + 0.15, cz + Math.sin(a) * 0.9);
    }
    for (let i = 0; i < 4; i++) {
      const l = this.addMesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6), this.mats.darkWood, cx, base + 0.3, cz, { receive: false });
      l.rotation.set(Math.PI / 2.4, (i / 4) * Math.PI * 2, 0, 'YXZ');
    }
    const flame = this.addMesh(new THREE.ConeGeometry(0.5, 1.3, 7), this.mats.flame, cx, base + 0.95, cz, { shadow: false, receive: false });
    const light = new THREE.PointLight(0xff7a22, 3.2, 22, 1.5);
    light.position.set(cx, base + 1.4, cz);
    this.scene.add(light);
    this.torches.push({ flame, light, base: 3.2, seed: 3.3 });
    this.addCircle(cx, cz, 1.0);
    // Tiendas
    for (const [tx, tz, rot] of [[-9, -47, 0.5], [9, -48, -0.4]]) {
      const y = heightAt(tx, tz);
      const tent = this.addMesh(new THREE.ConeGeometry(3.0, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0x5a4a38, roughness: 1 }), tx, y + 1.6, tz);
      tent.rotation.y = Math.PI / 4 + rot;
      this.addCircle(tx, tz, 2.2);
    }
    this.crate(-4, -41, 0.9, 0.2); this.crate(4.5, -42, 0.8, 1.1); this.barrel(5.5, -46); this.barrel(-5.5, -49);
    // Aparición de enemigos
    this.enemySpawns = [
      { x: -5, z: -42, type: 'bandido', name: 'Bandido' },
      { x: 6, z: -45, type: 'bandido', name: 'Bandido' },
      { x: 0, z: -52, type: 'jefe', name: 'Garra Negra, jefe bandido' },
    ];
  }

  buildForest() {
    const r = rand(2026);
    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 7);
    trunkGeo.translate(0, 1.6, 0);
    const coneA = new THREE.ConeGeometry(2.4, 4.2, 8); coneA.translate(0, 4.6, 0);
    const coneB = new THREE.ConeGeometry(1.8, 3.4, 8); coneB.translate(0, 6.6, 0);
    const N = 340;
    const trunks = new THREE.InstancedMesh(trunkGeo, this.mats.trunk, N);
    const leavesA = new THREE.InstancedMesh(coneA, this.mats.leaf, N);
    const leavesB = new THREE.InstancedMesh(coneB, this.mats.leaf, N);
    for (const m of [trunks, leavesA, leavesB]) { m.castShadow = true; m.receiveShadow = true; }
    const dummy = new THREE.Object3D();
    let placed = 0, tries = 0;
    while (placed < N && tries < 6000) {
      tries++;
      const x = (r() - 0.5) * 170, z = (r() - 0.5) * 170;
      const d = Math.hypot(x, z);
      if (d > 76) continue;
      if (d < 32 && z > -22) continue; // claro de la aldea
      if (Math.abs(x - this.roadWobble(z)) < 4.2 && z > -60) continue; // camino
      if (Math.hypot(x, z + 46) < 15) continue; // campamento
      if (z < -20 && z > -40 && Math.abs(x) < 38) continue; // muralla
      const s = 0.8 + r() * 0.9;
      const y = heightAt(x, z);
      dummy.position.set(x, y, z);
      dummy.rotation.set(0, r() * 6.28, 0);
      dummy.scale.set(s, s * (0.9 + r() * 0.5), s);
      dummy.updateMatrix();
      trunks.setMatrixAt(placed, dummy.matrix);
      leavesA.setMatrixAt(placed, dummy.matrix);
      leavesB.setMatrixAt(placed, dummy.matrix);
      this.addCircle(x, z, 0.55 * s);
      placed++;
    }
    for (const m of [trunks, leavesA, leavesB]) { m.count = placed; m.instanceMatrix.needsUpdate = true; this.scene.add(m); }
  }

  buildBoundaryRocks() {
    const r = rand(99);
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const N = 90;
    const rocks = new THREE.InstancedMesh(geo, this.mats.rock, N);
    rocks.castShadow = true; rocks.receiveShadow = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2, d = 20 + r() * 58;
      let x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.abs(x - this.roadWobble(z)) < 4 || (d < 30)) { x += 14; }
      const s = 0.4 + r() * 1.3;
      dummy.position.set(x, heightAt(x, z) + s * 0.3, z);
      dummy.rotation.set(r() * 3, r() * 3, r() * 3);
      dummy.scale.set(s, s * 0.7, s);
      dummy.updateMatrix();
      rocks.setMatrixAt(i, dummy.matrix);
      if (s > 1.1) this.addCircle(x, z, s * 0.8);
    }
    rocks.instanceMatrix.needsUpdate = true;
    this.scene.add(rocks);
  }

  /* ----------------------------- Actualización ----------------------------- */
  update(dt, playerPos) {
    this.time += dt;
    for (const t of this.torches) {
      const f = 0.82 + 0.18 * Math.sin(this.time * 11 + t.seed) + 0.12 * Math.sin(this.time * 23 + t.seed * 2);
      if (t.light) t.light.intensity = t.base * f;
      t.flame.scale.set(1, 0.85 + 0.35 * f, 1);
    }
    for (const f of this.fires) {
      if (f.banner) f.banner.rotation.y = Math.sin(this.time * 1.7 + f.banner.userData.sway) * 0.08;
    }
    // La sombra de la luna sigue al jugador
    if (playerPos) {
      this.moon.target.position.copy(playerPos);
      this.moon.position.copy(playerPos).add(this.moonOffset);
    }
  }
}

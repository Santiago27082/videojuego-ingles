import * as THREE from 'three';

/**
 * Maniquí humanoide PROCEDURAL (provisional).
 * Tiene la misma jerarquía de huesos que usaría un personaje GLB (caderas > torso > cabeza,
 * brazos y piernas con dos segmentos), de modo que más adelante se puede sustituir por un
 * modelo con AnimationMixer sin tocar la lógica de combate. Las animaciones son poses
 * interpoladas por código: NO son animaciones realistas de captura de movimiento.
 */

// Pose de reposo. x de brazo: negativo = hacia delante. Pierna: negativo = hacia delante.
export const IDLE = {
  rax: -0.35, ray: 0, raz: 0.12, rf: -1.1,
  lax: -0.2, lay: 0, laz: -0.12, lf: -0.5,
  ty: 0, lean: 0, hy: 0,
  ll: 0.05, sl: 0.1, lr: -0.05, sr: 0.1,
  hx: 0,
};
export const POSE_KEYS = Object.keys(IDLE);

export function lerpPose(a, b, t) {
  const o = {};
  for (const k of POSE_KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
}

function mat(color, rough = 0.7, metal = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

function limb(r, len, material) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), material);
  m.position.y = -(len / 2 + r);
  m.castShadow = true;
  return m;
}

function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export class Humanoid {
  constructor({
    skin = 0xd2a07a, cloth = 0x5a4632, armor = 0x8a9099, trim = 0x3a2a1c,
    helmet = true, shield = false, shieldColor = 0x7a1f1f, weapon = 'sword',
    scale = 1, cape = null, bulky = 1,
  } = {}) {
    this.root = new THREE.Group();
    this.mats = [];
    const track = (m) => { this.mats.push(m); return m; };
    const mSkin = track(mat(skin, 0.8));
    const mCloth = track(mat(cloth, 0.9));
    const mArmor = track(mat(armor, 0.35, 0.85));
    const mTrim = track(mat(trim, 0.8));
    const mBlade = track(mat(0xc9ced6, 0.25, 0.9));
    const mWood = track(mat(0x5a3b22, 0.9));

    this.pose = { ...IDLE };

    // Caderas y torso
    this.hips = new THREE.Group();
    this.hips.position.y = 1.0;
    this.root.add(this.hips);
    this.hips.add(part(new THREE.BoxGeometry(0.34 * bulky, 0.2, 0.22), mTrim));

    this.torso = new THREE.Group();
    this.torso.position.y = 0.08;
    this.hips.add(this.torso);
    this.torso.add(part(new THREE.BoxGeometry(0.44 * bulky, 0.52, 0.25), mArmor, 0, 0.3, 0));
    this.torso.add(part(new THREE.BoxGeometry(0.38 * bulky, 0.16, 0.22), mCloth, 0, 0.02, 0));
    for (const sx of [-1, 1]) {
      this.torso.add(part(new THREE.SphereGeometry(0.105 * bulky, 10, 8), mArmor, sx * 0.28 * bulky, 0.56, 0));
    }
    this.torso.add(part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 8), mSkin, 0, 0.62, 0));

    // Cabeza
    this.head = new THREE.Group();
    this.head.position.y = 0.66;
    this.torso.add(this.head);
    this.head.add(part(new THREE.SphereGeometry(0.115, 14, 12), mSkin, 0, 0.12, 0));
    if (helmet) {
      this.head.add(part(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mArmor, 0, 0.14, 0));
      this.head.add(part(new THREE.BoxGeometry(0.03, 0.12, 0.03), mArmor, 0, 0.1, 0.125));
    } else {
      this.head.add(part(new THREE.SphereGeometry(0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), mTrim, 0, 0.14, -0.01));
    }

    // Capa (opcional)
    this.cape = null;
    if (cape !== null) {
      this.cape = new THREE.Group();
      this.cape.position.set(0, 0.58, -0.14);
      const capeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.85, 0.025),
        new THREE.MeshStandardMaterial({ color: cape, roughness: 0.95 })
      );
      capeMesh.position.y = -0.42;
      capeMesh.castShadow = true;
      this.cape.add(capeMesh);
      this.cape.rotation.x = 0.1;
      this.torso.add(this.cape);
    }

    // Brazos
    const makeArm = (side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.29 * bulky, 0.56, 0);
      arm.rotation.order = 'YXZ';
      arm.add(limb(0.058, 0.2, mCloth));
      const fore = new THREE.Group();
      fore.position.y = -0.34;
      fore.add(limb(0.05, 0.18, mArmor));
      fore.add(part(new THREE.SphereGeometry(0.055, 8, 6), mSkin, 0, -0.3, 0));
      arm.add(fore);
      this.torso.add(arm);
      return { arm, fore };
    };
    const r = makeArm(-1);
    const l = makeArm(1);
    this.armR = r.arm; this.foreR = r.fore;
    this.armL = l.arm; this.foreL = l.fore;

    // Arma en la mano derecha
    this.weapon = new THREE.Group();
    this.weaponBlade = null;
    if (weapon === 'axe') {
      this.weapon.add(part(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8), mWood, 0, -0.35, 0));
      const head = part(new THREE.BoxGeometry(0.04, 0.22, 0.34), mBlade, 0, -0.75, 0.16);
      this.weapon.add(head);
      this.weaponBlade = head;
    } else {
      this.weapon.add(part(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8), mTrim, 0, 0.0, 0));
      this.weapon.add(part(new THREE.BoxGeometry(0.28, 0.04, 0.06), mArmor, 0, -0.11, 0));
      this.weapon.add(part(new THREE.SphereGeometry(0.035, 8, 6), mArmor, 0, 0.11, 0));
      const blade = part(new THREE.BoxGeometry(0.06, 0.82, 0.014), mBlade, 0, -0.54, 0);
      this.weapon.add(blade);
      const tip = part(new THREE.ConeGeometry(0.043, 0.12, 4), mBlade, 0, -1.01, 0);
      tip.rotation.y = Math.PI / 4;
      tip.scale.set(1, 1, 0.25);
      tip.rotation.x = Math.PI;
      this.weapon.add(tip);
      this.weaponBlade = blade;
    }
    this.weapon.position.y = -0.3;
    this.weapon.rotation.x = -1.0;
    this.foreR.add(this.weapon);

    // Escudo en el brazo izquierdo
    this.shield = null;
    if (shield) {
      this.shield = new THREE.Group();
      const disc = part(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), track(mat(shieldColor, 0.7, 0.2)));
      disc.rotation.x = Math.PI / 2;
      this.shield.add(disc);
      const rim = part(new THREE.TorusGeometry(0.3, 0.025, 6, 20), mArmor);
      this.shield.add(rim);
      const boss = part(new THREE.SphereGeometry(0.07, 10, 8), mArmor, 0, 0, 0.04);
      this.shield.add(boss);
      this.shield.position.set(0.04, -0.14, 0.13);
      this.foreL.add(this.shield);
    }

    // Piernas
    const makeLeg = (side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.11 * bulky, -0.08, 0);
      leg.add(limb(0.085, 0.3, mCloth));
      const shin = new THREE.Group();
      shin.position.y = -0.46;
      shin.add(limb(0.07, 0.28, mArmor));
      shin.add(part(new THREE.BoxGeometry(0.13, 0.08, 0.26), mTrim, 0, -0.44, 0.05));
      leg.add(shin);
      this.hips.add(leg);
      return { leg, shin };
    };
    const ll = makeLeg(1);
    const lr = makeLeg(-1);
    this.legL = ll.leg; this.shinL = ll.shin;
    this.legR = lr.leg; this.shinR = lr.shin;

    this.root.scale.setScalar(scale);
    this.apply();
  }

  /** Acerca la pose actual a la pose objetivo (suavizado exponencial). */
  setPose(target, rate, dt) {
    const k = 1 - Math.exp(-rate * dt);
    for (const key of POSE_KEYS) {
      this.pose[key] += (target[key] - this.pose[key]) * k;
    }
    this.apply();
  }

  apply() {
    const p = this.pose;
    this.hips.position.y = 1.0 + p.hy;
    this.hips.rotation.x = p.lean;
    this.torso.rotation.y = p.ty;
    this.torso.rotation.x = p.lean * 0.3;
    this.head.rotation.x = -p.lean * 0.9 + p.hx;
    this.armR.rotation.set(p.rax, p.ray, p.raz, 'YXZ');
    this.foreR.rotation.x = p.rf;
    this.armL.rotation.set(p.lax, p.lay, p.laz, 'YXZ');
    this.foreL.rotation.x = p.lf;
    this.legL.rotation.x = p.ll;
    this.shinL.rotation.x = p.sl;
    this.legR.rotation.x = p.lr;
    this.shinR.rotation.x = p.sr;
  }

  /** Resplandor de impacto o de aviso de ataque. */
  setEmissive(hex, intensity) {
    for (const m of this.mats) {
      m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  }
}

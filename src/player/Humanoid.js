import * as THREE from 'three';

// La Corona de Velkran
// Rig procedural compatible con Player.js y Enemy.js.
// Incluye ranuras para equipamiento intercambiable.

export const IDLE = {
  rax: -0.35, ray: 0, raz: 0.12, rf: -1.1,
  lax: -0.2, lay: 0, laz: -0.12, lf: -0.5,
  ty: 0, lean: 0, hy: 0,
  ll: 0.05, sl: 0.1, lr: -0.05, sr: 0.1,
  hx: 0,
};

export const POSE_KEYS = Object.keys(IDLE);

export function lerpPose(a, b, t) {
  const result = {};
  for (const key of POSE_KEYS) {
    result[key] = a[key] + (b[key] - a[key]) * t;
  }
  return result;
}

function mat(color, rough = 0.7, metal = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
  });
}

function part(geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function capsule(radius, length, material, segments = 10) {
  const mesh = part(
    new THREE.CapsuleGeometry(radius, length, 5, segments),
    material,
  );
  mesh.position.y = -(length / 2 + radius);
  return mesh;
}

function ellipsoid(material, x, y, z, sx, sy, sz) {
  const mesh = part(
    new THREE.SphereGeometry(1, 16, 12),
    material,
    x, y, z,
  );
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function box(material, x, y, z, sx, sy, sz) {
  return part(
    new THREE.BoxGeometry(sx, sy, sz),
    material,
    x, y, z,
  );
}

export class Humanoid {
  constructor({
    skin = 0xd2a07a,
    cloth = 0x5a4632,
    armor = 0x8a9099,
    trim = 0x3a2a1c,
    helmet = true,
    shield = false,
    shieldColor = 0x7a1f1f,
    weapon = 'sword',
    scale = 1,
    cape = null,
    bulky = 1,
  } = {}) {
    this.root = new THREE.Group();
    this.mats = [];
    this.pose = { ...IDLE };

    const track = (material) => {
      this.mats.push(material);
      return material;
    };

    const mSkin = track(mat(skin, 0.78));
    const mCloth = track(mat(cloth, 0.92));
    const mArmor = track(mat(armor, 0.32, 0.78));
    const mTrim = track(mat(trim, 0.72, 0.12));
    const mBlade = track(mat(0xdce4ec, 0.23, 0.92));
    const mDark = track(mat(0x25272b, 0.68, 0.2));
    const mLeather = track(mat(0x493020, 0.87));
    const mWood = track(mat(0x50351f, 0.9));
    const mGold = track(mat(0xb58a43, 0.3, 0.72));
    const mEye = track(mat(0x211710, 0.4));
    const mHair = track(mat(0x30221b, 0.95));

    // Caderas.
    this.hips = new THREE.Group();
    this.hips.position.y = 1;
    this.root.add(this.hips);

    this.hips.add(
      ellipsoid(mCloth, 0, -0.005, 0,
        0.205 * bulky, 0.135, 0.145),
    );

    this.hips.add(
      box(mLeather, 0, -0.035, 0.005,
        0.39 * bulky, 0.09, 0.255),
    );

    this.hips.add(
      box(mGold, 0, -0.035, 0.137, 0.065, 0.065, 0.018),
    );
    this.hips.add(
      box(mTrim, 0, -0.035, 0.148, 0.027, 0.027, 0.009),
    );

    // Torso.
    this.torso = new THREE.Group();
    this.torso.position.y = 0.08;
    this.hips.add(this.torso);

    this.torso.add(
      ellipsoid(mCloth, 0, 0.31, 0,
        0.205 * bulky, 0.275, 0.125),
    );

    this.torso.add(
      ellipsoid(mCloth, 0, 0.105, 0.005,
        0.17 * bulky, 0.145, 0.115),
    );

    // Peto.
    this.torso.add(
      ellipsoid(mArmor, 0, 0.365, 0.012,
        0.235 * bulky, 0.245, 0.14),
    );

    this.torso.add(
      ellipsoid(mArmor, 0, 0.37, 0.132,
        0.135 * bulky, 0.195, 0.025),
    );

    this.torso.add(
      box(mGold, 0, 0.37, 0.16, 0.014, 0.29, 0.009),
    );

    this.torso.add(
      ellipsoid(mGold, 0, 0.46, 0.16, 0.045, 0.045, 0.012),
    );

    // Placas abdominales.
    for (let i = 0; i < 3; i++) {
      const y = 0.205 + i * 0.075;
      const width = 0.29 * bulky - i * 0.018;

      this.torso.add(
        box(mArmor, 0, y, 0.115, width, 0.052, 0.035),
      );

      this.torso.add(
        box(mTrim, 0, y - 0.029, 0.137,
          width - 0.02, 0.008, 0.009),
      );
    }

    // Cuello.
    const neck = capsule(0.065, 0.08, mSkin, 10);
    neck.position.set(0, 0.56, 0);
    this.torso.add(neck);

    this.torso.add(
      ellipsoid(mArmor, 0, 0.575, 0.012,
        0.095, 0.045, 0.085),
    );

    // Hombreras.
    for (const side of [-1, 1]) {
      const shoulder = ellipsoid(
        mArmor,
        side * 0.255 * bulky,
        0.545,
        0,
        0.135 * bulky,
        0.105,
        0.14,
      );

      shoulder.rotation.z = side * -0.12;
      this.torso.add(shoulder);

      this.torso.add(
        ellipsoid(
          mGold,
          side * 0.255 * bulky,
          0.548,
          0.112,
          0.087 * bulky,
          0.025,
          0.018,
        ),
      );

      for (const dx of [-0.065, 0.065]) {
        this.torso.add(
          ellipsoid(
            mGold,
            side * 0.255 * bulky + dx * bulky,
            0.55,
            0.126,
            0.012,
            0.012,
            0.009,
          ),
        );
      }
    }

    // Cabeza.
    this.head = new THREE.Group();
    this.head.position.y = 0.65;
    this.torso.add(this.head);

    this.head.add(
      ellipsoid(mSkin, 0, 0.105, 0,
        0.108, 0.135, 0.102),
    );

    this.head.add(
      ellipsoid(mSkin, 0, 0.045, 0.025,
        0.083, 0.063, 0.085),
    );

    const nose = part(
      new THREE.ConeGeometry(0.023, 0.075, 8),
      mSkin,
      0, 0.11, 0.105,
    );
    nose.rotation.x = Math.PI / 2;
    this.head.add(nose);

    for (const side of [-1, 1]) {
      this.head.add(
        ellipsoid(mSkin, side * 0.108, 0.095, 0,
          0.022, 0.038, 0.026),
      );

      this.head.add(
        ellipsoid(mEye, side * 0.043, 0.13, 0.088,
          0.015, 0.012, 0.009),
      );

      const brow = box(
        mHair, side * 0.043, 0.151, 0.087,
        0.038, 0.012, 0.014,
      );
      brow.rotation.z = side * 0.12;
      this.head.add(brow);
    }

    if (helmet) {
      this.head.add(
        ellipsoid(mArmor, 0, 0.205, -0.005,
          0.13, 0.105, 0.12),
      );

      this.head.add(
        box(mGold, 0, 0.151, 0.005, 0.23, 0.018, 0.19),
      );

      for (const side of [-1, 1]) {
        const cheek = box(
          mArmor, side * 0.087, 0.075, 0.015,
          0.045, 0.105, 0.11,
        );
        cheek.rotation.z = side * -0.12;
        this.head.add(cheek);
      }

      this.head.add(
        box(mArmor, 0, 0.105, 0.112, 0.025, 0.105, 0.018),
      );

      this.head.add(
        box(mDark, 0, 0.119, 0.108, 0.105, 0.025, 0.014),
      );

      this.head.add(
        ellipsoid(mTrim, 0, 0.299, -0.015,
          0.034, 0.085, 0.045),
      );
    } else {
      this.head.add(
        ellipsoid(mHair, 0, 0.193, -0.018,
          0.116, 0.07, 0.105),
      );

      this.head.add(
        ellipsoid(mHair, 0, 0.055, -0.067,
          0.082, 0.09, 0.052),
      );

      this.head.add(
        ellipsoid(mHair, 0, 0.015, 0.035,
          0.07, 0.06, 0.065),
      );
    }

    // Capa predeterminada.
    this.cape = null;

    if (cape !== null) {
      this.cape = new THREE.Group();
      this.cape.position.set(0, 0.52, -0.13);

      const capeMat = track(mat(cape, 0.95));
      const innerMat = track(mat(0x332323, 0.98));

      const outer = box(
        capeMat, 0, -0.39, -0.012, 0.43, 0.8, 0.035,
      );
      outer.rotation.x = -0.08;
      this.cape.add(outer);

      const inner = box(
        innerMat, 0, -0.39, 0.008, 0.35, 0.72, 0.012,
      );
      inner.rotation.x = -0.08;
      this.cape.add(inner);

      this.torso.add(this.cape);
    }

    // Brazos articulados.
    const makeArm = (side) => {
      const arm = new THREE.Group();
      arm.position.set(side * 0.29 * bulky, 0.55, 0);
      arm.rotation.order = 'YXZ';

      arm.add(capsule(0.061, 0.20, mCloth, 10));

      arm.add(
        ellipsoid(mArmor, 0, -0.13, 0,
          0.071, 0.12, 0.07),
      );

      arm.add(
        ellipsoid(mArmor, 0, -0.275, 0,
          0.058, 0.06, 0.061),
      );

      const fore = new THREE.Group();
      fore.position.y = -0.34;

      fore.add(capsule(0.05, 0.19, mArmor, 10));

      fore.add(
        box(mGold, 0, -0.105, 0.006,
          0.098, 0.035, 0.095),
      );

      fore.add(
        ellipsoid(mSkin, 0, -0.30, 0.012,
          0.05, 0.06, 0.047),
      );

      fore.add(
        ellipsoid(mDark, 0, -0.32, 0.014,
          0.055, 0.045, 0.05),
      );

      arm.add(fore);
      this.torso.add(arm);

      return { arm, fore };
    };

    const rightArm = makeArm(-1);
    const leftArm = makeArm(1);

    this.armR = rightArm.arm;
    this.foreR = rightArm.fore;
    this.armL = leftArm.arm;
    this.foreL = leftArm.fore;
        // Arma.
    this.weapon = new THREE.Group();
    this.weaponBlade = null;

    if (weapon === 'axe') {
      this.weapon.add(
        part(
          new THREE.CylinderGeometry(0.022, 0.029, 0.95, 10),
          mWood, 0, -0.35, 0,
        ),
      );

      this.weapon.add(
        box(mDark, 0, -0.04, 0, 0.075, 0.09, 0.075),
      );

      const axeHead = part(
        new THREE.ShapeGeometry(this.makeAxeShape()),
        mBlade,
        0, -0.72, 0.02,
      );

      axeHead.rotation.y = Math.PI / 2;
      axeHead.scale.set(0.8, 0.9, 1);

      this.weapon.add(axeHead);
      this.weaponBlade = axeHead;
    } else {
      this.weapon.add(
        part(
          new THREE.CylinderGeometry(0.023, 0.023, 0.22, 10),
          mLeather, 0, 0, 0,
        ),
      );

      this.weapon.add(
        part(
          new THREE.CylinderGeometry(0.035, 0.035, 0.035, 10),
          mGold, 0, 0.12, 0,
        ),
      );

      const guard = box(
        mGold, 0, -0.115, 0, 0.29, 0.035, 0.045,
      );
      guard.rotation.z = -0.04;
      this.weapon.add(guard);

      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.032, 0);
      bladeShape.lineTo(0.032, 0);
      bladeShape.lineTo(0.027, -0.65);
      bladeShape.lineTo(0, -0.86);
      bladeShape.lineTo(-0.027, -0.65);
      bladeShape.closePath();

      const blade = part(
        new THREE.ShapeGeometry(bladeShape),
        mBlade, 0, -0.13, 0,
      );

      this.weapon.add(blade);
      this.weaponBlade = blade;

      this.weapon.add(
        box(mArmor, 0, -0.48, 0.009,
          0.009, 0.55, 0.006),
      );
    }

    this.weapon.position.set(0, -0.3, 0.025);
    this.weapon.rotation.x = -1.0;
    this.foreR.add(this.weapon);

    // Escudo.
    this.shield = null;

    if (shield) {
      this.shield = new THREE.Group();

      const shieldMat = track(mat(shieldColor, 0.62, 0.28));

      const face = part(
        new THREE.CylinderGeometry(0.285, 0.285, 0.055, 12),
        shieldMat,
      );
      face.rotation.x = Math.PI / 2;
      this.shield.add(face);

      this.shield.add(
        part(new THREE.TorusGeometry(0.285, 0.024, 8, 24), mGold),
      );

      this.shield.add(
        ellipsoid(mArmor, 0, 0, 0.044,
          0.075, 0.075, 0.035),
      );

      for (const side of [-1, 1]) {
        const reinforcement = box(
          mGold, side * 0.13, 0, 0.032,
          0.018, 0.42, 0.012,
        );
        reinforcement.rotation.z = side * 0.45;
        this.shield.add(reinforcement);
      }

      this.shield.position.set(0.04, -0.14, 0.13);
      this.foreL.add(this.shield);
    }

    // Piernas.
    const makeLeg = (side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.11 * bulky, -0.08, 0);

      leg.add(capsule(0.077, 0.30, mCloth, 10));

      leg.add(
        ellipsoid(mArmor, 0, -0.12, 0,
          0.085, 0.16, 0.085),
      );

      const knee = new THREE.Group();
      knee.position.y = -0.43;

      knee.add(
        ellipsoid(mArmor, 0, 0, 0.012,
          0.073, 0.073, 0.073),
      );

      knee.add(capsule(0.061, 0.25, mArmor, 10));

      knee.add(
        box(mGold, 0, -0.11, 0.061,
          0.068, 0.018, 0.009),
      );

      const foot = new THREE.Group();
      foot.position.set(0, -0.34, 0.065);

      foot.add(
        ellipsoid(mLeather, 0, -0.045, 0.035,
          0.073, 0.052, 0.12),
      );

      foot.add(
        box(mDark, 0, -0.012, 0.035,
          0.11, 0.025, 0.13),
      );

      knee.add(foot);
      leg.add(knee);
      this.hips.add(leg);

      return { leg, shin: knee, foot };
    };

    const leftLeg = makeLeg(1);
    const rightLeg = makeLeg(-1);

    this.legL = leftLeg.leg;
    this.shinL = leftLeg.shin;
    this.footL = leftLeg.foot;

    this.legR = rightLeg.leg;
    this.shinR = rightLeg.shin;
    this.footR = rightLeg.foot;

    // ====================================================
    // SISTEMA DE ROPA INTERCAMBIABLE
    // ====================================================

    // Las ranuras siguen el movimiento de sus articulaciones.
    this.equipmentSlots = {
      head: new THREE.Group(),
      torso: new THREE.Group(),
      hands: new THREE.Group(),
      legs: new THREE.Group(),
      feet: new THREE.Group(),
      cape: new THREE.Group(),
    };

    this.equippedItems = {
      head: null,
      torso: null,
      hands: null,
      legs: null,
      feet: null,
      cape: null,
    };

    this.head.add(this.equipmentSlots.head);
    this.torso.add(this.equipmentSlots.torso);

    // La ropa de las dos manos/brazos puede incluir ambas piezas.
    this.torso.add(this.equipmentSlots.hands);

    this.hips.add(this.equipmentSlots.legs);
    this.hips.add(this.equipmentSlots.feet);
    this.torso.add(this.equipmentSlots.cape);

    this.root.scale.setScalar(scale);
    this.apply();
  }

  makeAxeShape() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.15);
    shape.lineTo(0.12, 0.10);
    shape.lineTo(0.27, 0.00);
    shape.lineTo(0.25, -0.20);
    shape.lineTo(0.16, -0.32);
    shape.lineTo(0.05, -0.28);
    shape.lineTo(0, -0.18);
    shape.closePath();
    return shape;
  }

    // Equipa una pieza de ropa o armadura.
  // Acepta:
  // 1. Un objeto 3D de Three.js.
  // 2. Una definición con create(THREE).
  // 3. Una definición con model (Object3D), que se clonará.
  equipItem(slot, item) {
    const group = this.equipmentSlots[slot];

    if (!group) {
      console.warn(`Ranura desconocida: ${slot}`);
      return false;
    }

    // Pasar null quita la pieza de la ranura.
    if (!item) {
      this.clearEquipmentSlot(slot);
      return true;
    }

    let visual = null;

    try {
      if (item.isObject3D) {
        // Un Object3D directo se añade tal cual.
        visual = item;
      } else if (typeof item.create === 'function') {
        visual = item.create(THREE);
      } else if (item.model?.isObject3D) {
        // Clonar para no mover el modelo original del inventario.
        visual = item.model.clone(true);
      }
    } catch (error) {
      console.error('No se pudo crear la pieza de ropa:', error);
      return false;
    }

    // No quitar el equipamiento actual si la nueva pieza no es válida.
    if (!visual?.isObject3D) {
      console.warn(
        `La pieza "${item.id ?? 'sin nombre'}" no contiene un modelo 3D válido.`,
      );
      return false;
    }

    // Evitar que el objeto siga conectado a otro padre.
    // Si se recibe un modelo directo, se mueve desde su padre actual.
    if (visual.parent) {
      visual.parent.remove(visual);
    }

    this.clearEquipmentSlot(slot);
    group.add(visual);
    this.equippedItems[slot] = item;

    return true;
  }

  // Quita una pieza de una ranura.
  clearEquipmentSlot(slot) {
    const group = this.equipmentSlots[slot];

    if (!group) return false;

    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    this.equippedItems[slot] = null;
    return true;
  }

  // Consulta la pieza equipada.
  getEquippedItem(slot) {
    return this.equippedItems[slot] ?? null;
  }

  // Quita todas las piezas añadidas mediante el inventario.
  clearAllEquipment() {
    for (const slot of Object.keys(this.equipmentSlots)) {
      this.clearEquipmentSlot(slot);
    }
  }

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

  setEmissive(hex, intensity) {
    for (const material of this.mats) {
      material.emissive.setHex(hex);
      material.emissiveIntensity = intensity;
    }
  }
}
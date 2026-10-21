
import * as THREE from 'three';

// Inventario y equipamiento de La Corona de Velkran.

function createClothingVisual(slot, color, metalness = 0.15) {
  return () => {
    const group = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: metalness > 0.5 ? 0.32 : 0.82,
      metalness,
    });

    const addEllipsoid = (x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 12),
        material,
      );

      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };

    const addBox = (x, y, z, sx, sy, sz) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(sx, sy, sz),
        material,
      );

      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };

    switch (slot) {
      case 'head':
        addEllipsoid(0, 0.205, -0.005, 0.135, 0.11, 0.125);
        addBox(0, 0.15, 0.105, 0.19, 0.025, 0.025);
        break;

      case 'torso':
        addEllipsoid(0, 0.34, 0.005, 0.225, 0.24, 0.14);
        addBox(0, 0.15, 0.01, 0.30, 0.22, 0.13);
        break;

      case 'hands':
        addEllipsoid(-0.29, 0.20, 0.03, 0.065, 0.09, 0.065);
        addEllipsoid(0.29, 0.20, 0.03, 0.065, 0.09, 0.065);
        break;

      case 'legs':
        addEllipsoid(-0.11, -0.13, 0.015, 0.09, 0.18, 0.09);
        addEllipsoid(0.11, -0.13, 0.015, 0.09, 0.18, 0.09);
        break;

      case 'feet':
        addEllipsoid(-0.11, -0.49, 0.08, 0.08, 0.07, 0.13);
        addEllipsoid(0.11, -0.49, 0.08, 0.08, 0.07, 0.13);
        break;

      case 'cape':
        addBox(0, -0.38, -0.15, 0.43, 0.78, 0.035);
        break;
    }

    return group;
  };
}

const ITEMS = {
  espadaHierro: {
    id: 'espadaHierro',
    name: 'Espada de hierro',
    type: 'weapon',
    slot: 'weapon',
    description: 'Una espada fiable para combatir bandidos.',
    attack: 5,
    maxStack: 1,
    icon: '⚔️',
    rarity: 'common',
  },

  escudoHierro: {
    id: 'escudoHierro',
    name: 'Escudo de hierro',
    type: 'shield',
    slot: 'shield',
    description: 'Un escudo resistente que reduce el daño recibido.',
    defense: 0.10,
    maxStack: 1,
    icon: '🛡️',
    rarity: 'common',
  },

  cascoCuero: {
    id: 'cascoCuero',
    name: 'Capucha de cuero',
    type: 'armor',
    slot: 'head',
    description: 'Una capucha sencilla para proteger la cabeza.',
    defense: 0.02,
    maxStack: 1,
    icon: '🪖',
    rarity: 'common',
    create: createClothingVisual('head', 0x68452d),
  },

  cascoHierro: {
    id: 'cascoHierro',
    name: 'Yelmo de hierro',
    type: 'armor',
    slot: 'head',
    description: 'Un casco metálico para los combates.',
    defense: 0.08,
    maxStack: 1,
    icon: '⛑️',
    rarity: 'uncommon',
    create: createClothingVisual('head', 0x89939e, 0.8),
  },

  tunicaCuero: {
    id: 'tunicaCuero',
    name: 'Túnica de cuero',
    type: 'armor',
    slot: 'torso',
    description: 'Ropa resistente para viajar por el reino.',
    defense: 0.04,
    maxStack: 1,
    icon: '👕',
    rarity: 'common',
    create: createClothingVisual('torso', 0x68452d),
  },

  petoHierro: {
    id: 'petoHierro',
    name: 'Peto de hierro',
    type: 'armor',
    slot: 'torso',
    description: 'Una protección sólida para el pecho.',
    defense: 0.15,
    maxStack: 1,
    icon: '🦺',
    rarity: 'uncommon',
    create: createClothingVisual('torso', 0x89939e, 0.8),
  },

  guantesCuero: {
    id: 'guantesCuero',
    name: 'Guantes de cuero',
    type: 'armor',
    slot: 'hands',
    description: 'Guantes sencillos para proteger las manos.',
    defense: 0.02,
    maxStack: 1,
    icon: '🧤',
    rarity: 'common',
    create: createClothingVisual('hands', 0x50351f),
  },

  guanteletesHierro: {
    id: 'guanteletesHierro',
    name: 'Guanteletes de hierro',
    type: 'armor',
    slot: 'hands',
    description: 'Protección metálica para las manos.',
    defense: 0.05,
    maxStack: 1,
    icon: '🧤',
    rarity: 'uncommon',
    create: createClothingVisual('hands', 0x89939e, 0.8),
  },

  pantalonesCuero: {
    id: 'pantalonesCuero',
    name: 'Grebas de cuero',
    type: 'armor',
    slot: 'legs',
    description: 'Protecciones flexibles para las piernas.',
    defense: 0.03,
    maxStack: 1,
    icon: '👖',
    rarity: 'common',
    create: createClothingVisual('legs', 0x68452d),
  },

  grebasHierro: {
    id: 'grebasHierro',
    name: 'Grebas de hierro',
    type: 'armor',
    slot: 'legs',
    description: 'Placas metálicas que protegen las piernas.',
    defense: 0.08,
    maxStack: 1,
    icon: '🦿',
    rarity: 'uncommon',
    create: createClothingVisual('legs', 0x89939e, 0.8),
  },

  botasCuero: {
    id: 'botasCuero',
    name: 'Botas de cuero',
    type: 'armor',
    slot: 'feet',
    description: 'Botas resistentes para recorrer Velkran.',
    defense: 0.02,
    maxStack: 1,
    icon: '🥾',
    rarity: 'common',
    create: createClothingVisual('feet', 0x50351f),
  },

  botasHierro: {
    id: 'botasHierro',
    name: 'Botas blindadas',
    type: 'armor',
    slot: 'feet',
    description: 'Botas reforzadas con placas de hierro.',
    defense: 0.05,
    maxStack: 1,
    icon: '🥾',
    rarity: 'uncommon',
    create: createClothingVisual('feet', 0x89939e, 0.8),
  },

  capaRoja: {
    id: 'capaRoja',
    name: 'Capa del caballero',
    type: 'armor',
    slot: 'cape',
    description: 'Una capa roja digna de un caballero.',
    defense: 0.01,
    maxStack: 1,
    icon: '🧣',
    rarity: 'uncommon',
    create: createClothingVisual('cape', 0x7a1f1f),
  },

  pocionVida: {
    id: 'pocionVida',
    name: 'Poción de vida',
    type: 'consumable',
    description: 'Recupera 35 puntos de vida.',
    healing: 35,
    maxStack: 20,
    icon: '🧪',
    rarity: 'common',
  },

  mineralHierro: {
    id: 'mineralHierro',
    name: 'Mineral de hierro',
    type: 'material',
    description: 'Material para futuras recetas de fabricación.',
    maxStack: 99,
    icon: '⛏️',
    rarity: 'common',
  },

  cuero: {
    id: 'cuero',
    name: 'Cuero',
    type: 'material',
    description: 'Material utilizado para fabricar equipo.',
    maxStack: 99,
    icon: '🟫',
    rarity: 'common',
  },
};

const EQUIPMENT_SLOTS = [
  'weapon',
  'shield',
  'head',
  'torso',
  'hands',
  'legs',
  'feet',
  'cape',
];

const CLOTHING_SLOTS = [
  'head',
  'torso',
  'hands',
  'legs',
  'feet',
  'cape',
];

export class Inventory {
  constructor(game, capacity = 24) {
    this.game = game;
    this.capacity = capacity;
    this.items = [];

    this.equipment = Object.fromEntries(
      EQUIPMENT_SLOTS.map(slot => [slot, null]),
    );

    this.load();

    // Los objetos iniciales solo se entregan si no existe
    // una partida guardada con inventario inicializado.
    if (!this.hasInitialized) {
      this.add('espadaHierro', 1, false);
      this.add('escudoHierro', 1, false);
      this.add('pocionVida', 3, false);
      this.add('mineralHierro', 4, false);

      this.add('cascoCuero', 1, false);
      this.add('tunicaCuero', 1, false);
      this.add('guantesCuero', 1, false);
      this.add('pantalonesCuero', 1, false);
      this.add('botasCuero', 1, false);
      this.add('capaRoja', 1, false);

      this.hasInitialized = true;
      this.save();
    }

    // Restaura los objetos equipados en el guardado.
    this.applyEquipment();
  }

  getDefinition(id) {
    return ITEMS[id] || null;
  }

  getCount(id) {
    return this.items.find(item => item.id === id)?.qty || 0;
  }

  add(id, quantity = 1, persist = true) {
    const def = ITEMS[id];

    if (!def || !Number.isInteger(quantity) || quantity <= 0) {
      return false;
    }

    const existing = this.items.find(item => item.id === id);

    if (existing) {
      if (existing.qty + quantity > def.maxStack) return false;
      existing.qty += quantity;
    } else {
      if (this.items.length >= this.capacity) return false;
      if (quantity > def.maxStack) return false;

      this.items.push({ id, qty: quantity });
    }

    if (persist) this.save();
    return true;
  }

  remove(id, quantity = 1, persist = true) {
    const item = this.items.find(entry => entry.id === id);

    if (
      !item ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      item.qty < quantity
    ) {
      return false;
    }

    item.qty -= quantity;

    if (item.qty === 0) {
      this.items = this.items.filter(entry => entry.id !== id);

      for (const slot of EQUIPMENT_SLOTS) {
        if (this.equipment[slot] === id) {
          this.equipment[slot] = null;
        }
      }

      this.applyEquipment();
    }

    if (persist) this.save();
    return true;
  }

  equip(id) {
    const def = ITEMS[id];

    if (
      !def ||
      !def.slot ||
      !EQUIPMENT_SLOTS.includes(def.slot) ||
      this.getCount(id) < 1
    ) {
      return false;
    }

    this.equipment[def.slot] = id;

    this.applyEquipment();
    this.save();

    return true;
  }

  unequip(slot) {
    if (!EQUIPMENT_SLOTS.includes(slot)) return false;

    this.equipment[slot] = null;

    this.applyEquipment();
    this.save();

    return true;
  }

  // En Player.js el modelo se almacena en this.rig.
  getHumanoid() {
    const player = this.game?.player;

    return (
      player?.rig ||
      player?.humanoid ||
      player?.model?.humanoid ||
      player?.character?.humanoid ||
      null
    );
  }

  applyEquipment() {
    const humanoid = this.getHumanoid();

    // El jugador podría no estar creado todavía.
    if (!humanoid) return false;

    for (const slot of CLOTHING_SLOTS) {
      const id = this.equipment[slot];
      const def = id ? ITEMS[id] : null;

      if (def?.create && typeof humanoid.equipItem === 'function') {
        // Crea una malla nueva para la prenda equipada.
        const visual = def.create();
        humanoid.equipItem(slot, visual);
      } else if (typeof humanoid.clearEquipmentSlot === 'function') {
        humanoid.clearEquipmentSlot(slot);
      }
    }

    return true;
  }

  getAttackBonus() {
    const weapon = ITEMS[this.equipment.weapon];
    return weapon?.attack || 0;
  }

  getDamageReduction() {
    let reduction = 0;

    for (const slot of [
      'shield',
      'head',
      'torso',
      'hands',
      'legs',
      'feet',
      'cape',
    ]) {
      const item = ITEMS[this.equipment[slot]];
      reduction += item?.defense || 0;
    }

    return Math.min(reduction, 0.75);
  }

  use(id) {
    const def = ITEMS[id];
    const player = this.game?.player;

    if (!def || def.type !== 'consumable' || !player) {
      return false;
    }

    if (def.healing) {
      if (player.hp >= player.maxHp) {
        this.game.hud?.notify('Ya tienes la vida completa');
        return false;
      }

      player.hp = Math.min(player.maxHp, player.hp + def.healing);
      this.game.hud?.notify('Has recuperado vida');
    }

    if (!this.remove(id, 1)) return false;

    this.game.hud?.update(player);
    return true;
  }

  save() {
    try {
      localStorage.setItem(
        'velkran_inventory_v1',
        JSON.stringify({
          items: this.items,
          equipment: this.equipment,
          hasInitialized: this.hasInitialized,
        }),
      );
    } catch (error) {
      console.warn('No se pudo guardar el inventario:', error);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem('velkran_inventory_v1');

      if (!raw) {
        this.hasInitialized = false;
        return;
      }

      const data = JSON.parse(raw);

      this.items = Array.isArray(data.items)
        ? data.items
            .filter(item =>
              ITEMS[item.id] &&
              Number.isInteger(item.qty) &&
              item.qty > 0 &&
              item.qty <= ITEMS[item.id].maxStack
            )
            .slice(0, this.capacity)
        : [];

      this.equipment = Object.fromEntries(
        EQUIPMENT_SLOTS.map(slot => [slot, null]),
      );

      for (const slot of EQUIPMENT_SLOTS) {
        const id = data.equipment?.[slot];

        if (
          id &&
          ITEMS[id]?.slot === slot &&
          this.getCount(id) > 0
        ) {
          this.equipment[slot] = id;
        }
      }

      // Compatibilidad con guardados anteriores.
      this.hasInitialized =
        data.hasInitialized === true ||
        this.items.length > 0;
    } catch (error) {
      console.warn('No se pudo cargar el inventario:', error);

      this.items = [];
      this.equipment = Object.fromEntries(
        EQUIPMENT_SLOTS.map(slot => [slot, null]),
      );
      this.hasInitialized = false;
    }
  }

  getItems() {
    return this.items.map(item => {
      const def = ITEMS[item.id];

      return {
        ...def,
        qty: item.qty,
        equipped: def?.slot
          ? this.equipment[def.slot] === item.id
          : false,
      };
    });
  }
}


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
    rarity: 'common'
  },
  escudoHierro: {
    id: 'escudoHierro',
    name: 'Escudo de hierro',
    type: 'shield',
    slot: 'shield',
    description: 'Reduce el daño recibido en un 10%.',
    defense: 0.10,
    maxStack: 1,
    icon: '🛡️',
    rarity: 'common'
  },
  pocionVida: {
    id: 'pocionVida',
    name: 'Poción de vida',
    type: 'consumable',
    description: 'Recupera 35 puntos de vida.',
    healing: 35,
    maxStack: 20,
    icon: '🧪',
    rarity: 'common'
  },
  mineralHierro: {
    id: 'mineralHierro',
    name: 'Mineral de hierro',
    type: 'material',
    description: 'Material para futuras recetas de fabricación.',
    maxStack: 99,
    icon: '⛏️',
    rarity: 'common'
  },
  cuero: {
    id: 'cuero',
    name: 'Cuero',
    type: 'material',
    description: 'Material utilizado para fabricar equipo.',
    maxStack: 99,
    icon: '🟫',
    rarity: 'common'
  }
};

export class Inventory {
  constructor(game, capacity = 24) {
    this.game = game;
    this.capacity = capacity;
    this.items = [];
    this.equipment = {
      weapon: null,
      shield: null
    };

    this.load();

    // Equipo inicial solo para una partida nueva.
    if (!this.items.length && !this.hasInitialized) {
      this.add('espadaHierro', 1, false);
      this.add('escudoHierro', 1, false);
      this.add('pocionVida', 3, false);
      this.add('mineralHierro', 4, false);
      this.hasInitialized = true;
      this.save();
    }
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
    const item = this.items.find(item => item.id === id);

    if (!item || !Number.isInteger(quantity) ||
        quantity <= 0 || item.qty < quantity) {
      return false;
    }

    item.qty -= quantity;

    if (item.qty === 0) {
      this.items = this.items.filter(entry => entry.id !== id);

      for (const slot of Object.keys(this.equipment)) {
        if (this.equipment[slot] === id) {
          this.equipment[slot] = null;
        }
      }
    }

    if (persist) this.save();
    return true;
  }

  equip(id) {
    const def = ITEMS[id];

    if (!def || !def.slot || this.getCount(id) < 1) {
      return false;
    }

    this.equipment[def.slot] = id;
    this.save();
    return true;
  }

  unequip(slot) {
    if (!(slot in this.equipment)) return false;

    this.equipment[slot] = null;
    this.save();
    return true;
  }

  getAttackBonus() {
    const weapon = ITEMS[this.equipment.weapon];
    return weapon?.attack || 0;
  }

  getDamageReduction() {
    const shield = ITEMS[this.equipment.shield];
    return shield?.defense || 0;
  }

  use(id) {
    const def = ITEMS[id];
    const player = this.game.player;

    if (!def || def.type !== 'consumable') return false;

    if (def.healing) {
      if (player.hp >= player.maxHp) {
        this.game.hud.notify('Ya tienes la vida completa');
        return false;
      }

      player.hp = Math.min(player.maxHp, player.hp + def.healing);
      this.game.hud.notify('Has recuperado vida');
    }

    if (!this.remove(id, 1)) return false;

    this.game.hud.update(player);
    return true;
  }

  save() {
    try {
      localStorage.setItem('velkran_inventory_v1', JSON.stringify({
        items: this.items,
        equipment: this.equipment,
        hasInitialized: this.hasInitialized
      }));
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
        ? data.items.filter(item =>
            ITEMS[item.id] &&
            Number.isInteger(item.qty) &&
            item.qty > 0 &&
            item.qty <= ITEMS[item.id].maxStack
          ).slice(0, this.capacity)
        : [];

      this.equipment = {
        weapon: null,
        shield: null
      };

      for (const slot of Object.keys(this.equipment)) {
        const id = data.equipment?.[slot];
        if (id && ITEMS[id]?.slot === slot &&
            this.getCount(id) > 0) {
          this.equipment[slot] = id;
        }
      }

      this.hasInitialized = data.hasInitialized === true;
    } catch (error) {
      console.warn('No se pudo cargar el inventario:', error);
      this.items = [];
      this.equipment = { weapon: null, shield: null };
      this.hasInitialized = false;
    }
  }

  getItems() {
    return this.items.map(item => ({
      ...ITEMS[item.id],
      qty: item.qty,
      equipped: Object.values(this.equipment).includes(item.id)
    }));
  }
}

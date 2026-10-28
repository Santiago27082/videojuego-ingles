const KEY = 'velkran.save.v1';

const num = (v, min, max, def) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def;

const validAttributes = ['strength', 'vitality', 'endurance', 'agility'];

export const SaveManager = {
  exists() {
    return this.load() !== null;
  },

  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, ...data }));
      return true;
    } catch (e) {
      console.warn('No se pudo guardar la partida:', e);
      return false;
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;

      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || typeof d !== 'object') return null;

      const attributes = {};
      for (const key of validAttributes) {
        attributes[key] = Math.floor(
          num(d.attributes?.[key], 0, 99, 0)
        );
      }

      return {
        level: Math.floor(num(d.level, 1, 50, 1)),
        xp: Math.floor(num(d.xp, 0, 1e6, 0)),
        kills: Math.floor(num(d.kills, 0, 9999, 0)),
        attributes,
        attributePoints: Math.floor(
          num(d.attributePoints, 0, 999, 0)
        ),
        volume: num(d.volume, 0, 1, 0.6),
        sensitivity: num(d.sensitivity, 0.4, 2.5, 1),
        character: d.character === 'warrior' ? 'warrior' : 'knight',
      };
    } catch (e) {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      // Sin acceso a LocalStorage.
    }
  },
};
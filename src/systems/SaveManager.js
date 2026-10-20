const KEY = 'velkran.save.v1';

const num = (v, min, max, def) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);

/**
 * Guardado local en LocalStorage.
 * Aviso: no se sincroniza entre dispositivos ni está protegido frente a modificaciones del usuario.
 */
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

  /** Devuelve datos validados o null si no hay guardado o está dañado. */
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || d.v !== 1 || typeof d !== 'object') return null;
      return {
        level: Math.floor(num(d.level, 1, 50, 1)),
        xp: Math.floor(num(d.xp, 0, 1e6, 0)),
        kills: Math.floor(num(d.kills, 0, 9999, 0)),
        volume: num(d.volume, 0, 1, 0.6),
        sensitivity: num(d.sensitivity, 0.4, 2.5, 1),
      };
    } catch (e) {
      return null;
    }
  },

  clear() {
    try { localStorage.removeItem(KEY); } catch (e) { /* sin acceso */ }
  },
};

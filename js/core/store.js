// Voortgang en instellingen in localStorage, onder één sleutel met versienummer.
// Dit is de enige module die localStorage aanraakt.

import { today } from './util.js';

const KEY = 'arabisch.v1';
const VERSION = 1;

const DEFAULTS = {
  translit: 'auto', // 'auto' (volgt de les) | 'aan' | 'uit'
  strengHarakat: false,
  spraakSnelheid: 0.8,
  stem: '', // voiceURI van de gekozen Arabische stem
  thema: 'auto', // 'auto' | 'licht' | 'donker'
  nieuwPerDag: 20,
  startdatum: '', // 'JJJJ-MM-DD'; leeg = eerste dag met activiteit (zie progress-model.js)
  dagdoel: 20, // kaarten + oefenantwoorden per dag
  herinnering: false, // melding als je een dag niet geoefend hebt (alleen geïnstalleerde app, Chrome/Android)
};

function fresh() {
  return {
    v: VERSION,
    settings: { ...DEFAULTS },
    lessen: {}, // id -> { onderdelen: {woorden, grammatica, oefeningen, toets}, oefen: {goed, totaal}, toetsen: [] }
    srs: {}, // woord-id -> kaart (zie srs.js)
    tags: {}, // grammatica-tag -> { goed, fout }
    trainer: {}, // werkwoord-id -> { goed, fout }
    dagen: {}, // 'JJJJ-MM-DD' -> { kaarten, oefen, nieuw }
  };
}

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Voortgang kon niet geladen worden; er wordt met een lege voortgang gestart.', e);
    return fresh();
  }
}

function migrate(s) {
  const base = fresh();
  if (!s || typeof s !== 'object') return base;
  // Toekomstige versies: hier stap voor stap omzetten (if (s.v === 1) {...; s.v = 2}).
  return {
    ...base,
    ...s,
    v: VERSION,
    settings: { ...base.settings, ...(s.settings || {}) },
  };
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Opslaan mislukt', e);
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get state() {
    return state;
  },
  get settings() {
    return state.settings;
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  setSetting(key, value) {
    state.settings[key] = value;
    save();
  },

  lesson(id) {
    if (!state.lessen[id]) {
      state.lessen[id] = { onderdelen: {}, oefen: { goed: 0, totaal: 0 }, toetsen: [] };
    }
    return state.lessen[id];
  },
  markPart(id, part) {
    const l = this.lesson(id);
    if (!l.onderdelen[part]) {
      l.onderdelen[part] = today();
      save();
    }
  },
  recordAnswer(lessonId, tag, correct) {
    if (lessonId) {
      const l = this.lesson(lessonId);
      l.oefen.totaal++;
      if (correct) l.oefen.goed++;
    }
    if (tag) {
      const t = (state.tags[tag] ||= { goed: 0, fout: 0 });
      correct ? t.goed++ : t.fout++;
    }
    const d = (state.dagen[today()] ||= { kaarten: 0, oefen: 0, nieuw: 0 });
    d.oefen++;
    save();
  },
  /** Beste score per oefenset; alle sets gedaan = onderdeel oefeningen afgerond. */
  recordSet(lessonId, setIndex, pctValue, totalSets) {
    const l = this.lesson(lessonId);
    l.sets ||= {};
    l.sets[setIndex] = Math.max(l.sets[setIndex] || 0, pctValue);
    if (Object.keys(l.sets).length >= totalSets) l.onderdelen.oefeningen ||= today();
    save();
  },
  recordTest(lessonId, result) {
    const l = this.lesson(lessonId);
    l.toetsen.push(result);
    if (result.pct >= result.drempel) l.onderdelen.toets ||= today();
    save();
  },

  card(id) {
    return state.srs[id];
  },
  putCard(id, card) {
    state.srs[id] = card;
    save();
  },
  /** Voeg kaarten toe zonder bestaande te overschrijven. */
  addCards(cards) {
    let added = 0;
    for (const c of cards) {
      if (!state.srs[c.id]) {
        state.srs[c.id] = c;
        added++;
      }
    }
    if (added) save();
    return added;
  },
  countDay(field) {
    const d = (state.dagen[today()] ||= { kaarten: 0, oefen: 0, nieuw: 0 });
    d[field] = (d[field] || 0) + 1;
    save();
  },

  recordTrainer(verbId, correct) {
    const t = (state.trainer[verbId] ||= { goed: 0, fout: 0 });
    correct ? t.goed++ : t.fout++;
    save();
  },

  exportJson() {
    return JSON.stringify({ app: 'darb-arabisch', exported: new Date().toISOString(), ...state }, null, 2);
  },
  importJson(text) {
    const data = JSON.parse(text);
    if (!data || data.app !== 'darb-arabisch' || typeof data.v !== 'number') {
      throw new Error('Dit is geen geldig voortgangsbestand van deze app.');
    }
    delete data.app;
    delete data.exported;
    state = migrate(data);
    save();
  },
  reset() {
    state = fresh();
    save();
  },
};

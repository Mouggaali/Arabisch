// Afgeleide voortgangscijfers uit store + curriculum. Geen DOM.

import { store } from '../core/store.js';
import { allCards, stage } from '../core/srs.js';

export function unitStatus(u) {
  if (!u.bestand) return { key: 'gepland', label: 'nog uit te werken' };
  const l = store.state.lessen[u.id];
  if (!l) return { key: 'nieuw', label: 'nieuw' };
  if (l.onderdelen.toets) return { key: 'afgerond', label: 'afgerond' };
  const n = ['woorden', 'grammatica', 'oefeningen'].filter((p) => l.onderdelen[p]).length;
  return { key: 'bezig', label: n ? `${n}/4 onderdelen` : 'begonnen' };
}

/** Een eenheid telt als afgerond als de toets gehaald is. */
export function periodProgress(periode) {
  const total = periode.eenheden.length;
  const done = periode.eenheden.filter((u) => unitStatus(u).key === 'afgerond').length;
  return { done, total, ratio: total ? done / total : 0 };
}

export function planProgress(curriculum) {
  const total = curriculum.order.length;
  const done = curriculum.order.filter((u) => unitStatus(u).key === 'afgerond').length;
  return { done, total, ratio: total ? done / total : 0 };
}

/** Beheersing per lesonderdeel (0..1), voor de lichten op het dashboard. */
export function partLevels(curriculum) {
  const built = curriculum.order.filter((u) => u.bestand);
  if (!built.length) return { woorden: 0, grammatica: 0, oefeningen: 0, toets: 0 };
  const cards = allCards();
  const words = cards.length ? cards.filter((c) => stage(c) !== 'nieuw').length / cards.length : 0;
  const lessons = built.map((u) => store.state.lessen[u.id] || { onderdelen: {}, oefen: { goed: 0, totaal: 0 }, toetsen: [] });
  const gram = lessons.filter((l) => l.onderdelen.grammatica).length / built.length;
  const oef = lessons.reduce((s, l) => s + (l.oefen.totaal ? l.oefen.goed / l.oefen.totaal : 0), 0) / built.length;
  const toets = lessons.reduce((s, l) => s + Math.max(0, ...l.toetsen.map((t) => t.pct)), 0) / built.length;
  return { woorden: words, grammatica: gram, oefeningen: oef, toets };
}

/** Zwakke punten: tags met minstens 3 antwoorden en het laagste percentage goed. */
export function weakTags(limit = 6) {
  return Object.entries(store.state.tags)
    .map(([tag, v]) => ({ tag, ...v, totaal: v.goed + v.fout, ratio: v.goed / Math.max(1, v.goed + v.fout) }))
    .filter((t) => t.totaal >= 3)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}

export function vocabStats() {
  const cards = allCards();
  const s = { nieuw: 0, lerend: 0, beheerst: 0, totaal: cards.length };
  cards.forEach((c) => s[stage(c)]++);
  return s;
}

/** Aantal herhaalde kaarten per dag over de laatste n dagen. */
export function activity(days = 14) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('sv-SE');
    const v = store.state.dagen[key] || {};
    out.push({ key, kaarten: v.kaarten || 0, oefen: v.oefen || 0 });
  }
  return out;
}

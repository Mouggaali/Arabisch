// Afgeleide voortgangscijfers uit store + curriculum. Geen DOM.

import { store } from '../core/store.js';
import { allCards, stage } from '../core/srs.js';
import { today, daysBetween, shuffle } from '../core/util.js';

/** Tempo van het leerplan in eenheden per kalenderweek: 228 eenheden in 3 jaar, vakanties meegerekend. */
export const PACE = 1.5;

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

/**
 * Beheersing van een tag: het percentage goed van de laatste 10 antwoorden zodra dat er minstens 5 zijn,
 * anders van alle antwoorden. Zo schuift een zwak punt echt op als je het oefent.
 */
export function tagRatio(v) {
  const recent = v.laatste || '';
  if (recent.length >= 5) return [...recent].filter((x) => x === '1').length / recent.length;
  return v.goed / Math.max(1, v.goed + v.fout);
}

/** Zwakke punten: tags met minstens 3 antwoorden en het laagste percentage goed (onder 85%). */
export function weakTags(limit = 6) {
  return Object.entries(store.state.tags)
    .map(([tag, v]) => ({ tag, ...v, totaal: v.goed + v.fout, ratio: tagRatio(v) }))
    .filter((t) => t.totaal >= 3 && t.ratio < 0.85)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}

/** Lessen waaruit herhaald mag worden: begonnen lessen, in de volgorde van het leerplan. */
export function startedUnits(curriculum) {
  return curriculum.order.filter((u) => u.bestand && store.state.lessen[u.id]);
}

/**
 * Oefenitems voor de gekozen tags uit de lessen die je al gehad hebt: de oefensets van begonnen lessen
 * en de toets van afgeronde lessen. Geen schrijfopdrachten. Hooguit `perLes` items per les.
 * Elk item krijgt `_lesId`, `_lesCode` en `_dialect` mee (de runner gebruikt die).
 */
export function weakItemPool(lessons, tags, { perLes = 3 } = {}) {
  const want = new Set(tags);
  const pool = [];
  for (const les of lessons) {
    if (!les) continue;
    const done = unitStatus(les.unit).key === 'afgerond';
    const items = [
      ...(les.oefeningen || []).flatMap((s) => s.items),
      ...(done && les.toets ? les.toets.items : []),
    ].filter((it) => want.has(it.tag) && it.type !== 'schrijven');
    for (const it of shuffle(items).slice(0, perLes)) {
      pool.push({ ...it, _lesId: les.id, _lesCode: les.code, _dialect: les.dialect || 'fusha' });
    }
  }
  return shuffle(pool);
}

/** De vroegste les waarin een tag voorkomt (voor de link naar de uitleg). */
export function tagSource(lessons, tag) {
  return lessons.find((les) => les && [...(les.oefeningen || []).flatMap((s) => s.items), ...(les.toets?.items || [])].some((it) => it.tag === tag)) || null;
}

export function vocabStats() {
  const cards = allCards();
  const s = { nieuw: 0, lerend: 0, beheerst: 0, totaal: cards.length };
  cards.forEach((c) => s[stage(c)]++);
  return s;
}

/** Activiteit op één dag: herhaalde kaarten + oefenantwoorden. */
export function dayTotal(key) {
  const d = store.state.dagen[key];
  return d ? (d.kaarten || 0) + (d.oefen || 0) : 0;
}

/** Dagdoel: hoeveel kaarten + oefenantwoorden vandaag, tegenover het doel uit de instellingen. */
export function todayGoal() {
  const doel = Math.max(1, store.settings.dagdoel || 20);
  const gedaan = dayTotal(today());
  return { gedaan, doel, ratio: Math.min(1, gedaan / doel), gehaald: gedaan >= doel };
}

/**
 * Reeks: aantal dagen op rij met activiteit. Vandaag telt mee zodra je iets gedaan hebt;
 * heb je vandaag nog niets gedaan, dan loopt de reeks van gisteren nog door.
 */
export function streak() {
  let off = dayTotal(today()) > 0 ? 0 : -1;
  let n = 0;
  while (dayTotal(today(off)) > 0) { n++; off--; }
  return n;
}

/** Eerste dag met activiteit (dagen of afgeronde onderdelen), of null. */
function firstActivity() {
  const dates = [
    ...Object.keys(store.state.dagen),
    ...Object.values(store.state.lessen).flatMap((l) => Object.values(l.onderdelen || {})),
  ].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return dates[0] || null;
}

/** Startdatum van de planning: ingesteld, anders de eerste dag met activiteit, anders vandaag. */
export function startDate() {
  return store.settings.startdatum || firstActivity() || today();
}

/**
 * Planning volgens het leerplan (PACE eenheden per week vanaf de startdatum).
 * @returns {{start, week, done, expected, diff, total, next: object[], eind: string}}
 */
export function weekPlan(curriculum) {
  const start = startDate();
  const dagen = Math.max(0, daysBetween(start, today()));
  const total = curriculum.order.length;
  const done = curriculum.order.filter((u) => unitStatus(u).key === 'afgerond').length;
  const expected = Math.min(total, Math.floor((dagen / 7) * PACE));
  const next = curriculum.order.filter((u) => u.bestand && unitStatus(u).key !== 'afgerond').slice(0, 2);
  const eind = today(Math.ceil(((total - done) / PACE) * 7));
  return { start, week: Math.floor(dagen / 7) + 1, done, expected, diff: done - expected, total, next, eind };
}

/** Streefdatum per jaar: einde van elk jaar bij het tempo van het leerplan, vanaf de startdatum. */
export function yearTargets(curriculum) {
  const [y, m, d] = startDate().split('-').map(Number);
  let cum = 0;
  return curriculum.jaren.map((j) => {
    const n = j.periodes.reduce((s, p) => s + p.eenheden.length, 0);
    cum += n;
    const dt = new Date(y, m - 1, d + Math.ceil((cum / PACE) * 7));
    const done = j.periodes.reduce((s, p) => s + p.eenheden.filter((u) => unitStatus(u).key === 'afgerond').length, 0);
    return { nr: j.nr, niveau: j.niveau, eenheden: n, done, datum: dt.toLocaleDateString('sv-SE') };
  });
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

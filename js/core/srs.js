// Spaced repetition volgens SM-2 (SuperMemo 2), met vier knoppen.
// Een kaart: { id, ar, tr, nl, les, dialect, ef, interval, reps, lapses, due, added, last }

import { store } from './store.js';
import { today } from './util.js';

export const GRADES = {
  opnieuw: 1, // niet geweten: kaart begint opnieuw en komt vandaag nog terug
  moeilijk: 3,
  goed: 4,
  makkelijk: 5,
};

/** Maak een nieuwe kaart van een woord uit een lesbestand. */
export function newCard(word, lesson) {
  return {
    id: word.id,
    ar: word.ar,
    tr: word.tr || '',
    nl: word.nl,
    les: lesson.id,
    lesCode: lesson.code,
    dialect: lesson.dialect || 'fusha',
    ef: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    due: today(),
    added: today(),
    last: null,
    isNew: true,
  };
}

/** Pas SM-2 toe. Een kaart met 'opnieuw' blijft vandaag in de rij (learning step). */
export function grade(card, q) {
  const c = { ...card, isNew: false, last: today() };
  if (q < 3) {
    c.reps = 0;
    c.interval = 0;
    c.lapses = (c.lapses || 0) + 1;
    c.due = today();
  } else {
    if (c.reps === 0) c.interval = q === 5 ? 3 : 1;
    else if (c.reps === 1) c.interval = q === 3 ? 3 : 6;
    else c.interval = Math.max(1, Math.round(c.interval * c.ef * (q === 3 ? 0.8 : q === 5 ? 1.3 : 1)));
    c.reps++;
    c.due = today(c.interval);
  }
  c.ef = Math.max(1.3, c.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return c;
}

/** Wat het interval wordt per knop (voor het label onder de knop). */
export function preview(card) {
  const out = {};
  for (const [k, q] of Object.entries(GRADES)) {
    const c = grade(card, q);
    out[k] = q < 3 ? 'vandaag' : c.interval === 1 ? '1 dag' : c.interval + ' dagen';
  }
  return out;
}

export function allCards() {
  return Object.values(store.state.srs);
}

/** Kaarten voor vandaag: eerst achterstallige herhalingen (moeilijkste eerst), dan nieuwe tot het daglimiet. */
export function dueToday({ lesson } = {}) {
  const t = today();
  let cards = allCards();
  if (lesson) cards = cards.filter((c) => c.les === lesson);
  const reviews = cards
    .filter((c) => !c.isNew && c.due <= t)
    .sort((a, b) => a.ef - b.ef || a.due.localeCompare(b.due));
  const introducedToday = store.state.dagen[t]?.nieuw || 0;
  const room = lesson ? Infinity : Math.max(0, store.settings.nieuwPerDag - introducedToday);
  const fresh = cards.filter((c) => c.isNew).slice(0, room);
  return [...reviews, ...fresh];
}

/** Stadium van een kaart voor het dashboard. */
export function stage(card) {
  if (card.isNew) return 'nieuw';
  if (card.interval >= 21) return 'beheerst';
  return 'lerend';
}

/** Moeilijke woorden: vaak vergeten of lage ease. */
export function difficult(limit = 10) {
  return allCards()
    .filter((c) => !c.isNew && (c.lapses >= 2 || c.ef < 2.0))
    .sort((a, b) => b.lapses - a.lapses || a.ef - b.ef)
    .slice(0, limit);
}

/** Een woord dat in een oefening fout ging komt vandaag terug in de flashcards. */
export function lapseWord(id) {
  const c = store.card(id);
  if (!c || c.isNew) return;
  store.putCard(id, { ...c, due: today(), ef: Math.max(1.3, c.ef - 0.15) });
}

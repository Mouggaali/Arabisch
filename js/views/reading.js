// Leesteksten: korte teksten per periode met alleen woorden die je al gehad hebt.
// Routes: #/lezen (overzicht per jaar en periode)  en  #/lezen/<id> (tekst + vragen).
// Tik op een woord voor de vertaling (uit de woordkaart, via de zoekindex) en zet het in je flashcards.

import { h, icon, pct, toast, today, rich } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { stripMarks } from '../core/arabic.js';
import { speech } from '../core/speech.js';
import { newCard } from '../core/srs.js';
import { ar, tr, playButton, reviewFlag } from '../ui/components.js';
import { lightPart } from '../ui/world.js';
import { runExercises, score } from '../exercises/runner.js';
import { unitStatus } from './progress-model.js';

const SOORT = { dialoog: 'Dialoog', verhaal: 'Verhaal', bericht: 'Bericht', artikel: 'Artikel', brief: 'Brief' };

let words = null;
/** Woorden uit de zoekindex, op id. */
async function wordMap() {
  if (!words) {
    const idx = await content.searchIndex();
    words = new Map(idx.woorden.map(([a, t, nl, soort, unit, code, id]) => [id, { id, ar: a, tr: t, nl, soort, unit, code }]));
  }
  return words;
}

/** Status van een tekst voor het overzicht: gelezen (met score), aanbevolen (les bereikt) of later. */
export function textStatus(entry, curriculum) {
  const t = store.state.teksten?.[entry.id];
  if (t) return { key: 'gelezen', label: t.best != null ? `gelezen · ${pct(t.best)}` : 'gelezen' };
  const u = curriculum.index.get(entry.naLes);
  const reached = u && unitStatus(u).key !== 'nieuw';
  return reached ? { key: 'klaar', label: 'aanbevolen' } : { key: 'later', label: `na ${u?.code || entry.naLes}` };
}

/** Rij voor een leestekst (ook gebruikt in het lesoverzicht). */
export function textRow(entry, curriculum) {
  const st = textStatus(entry, curriculum);
  const u = curriculum.index.get(entry.naLes);
  return h('li', h('a.unit-row.row-hit', { href: `#/lezen/${entry.id}` },
    h('span.code', entry.code),
    h('span', h('span.t', entry.titel), h('span.g', `Leestekst · ${SOORT[entry.soort] || entry.soort} · na ${u?.code || entry.naLes}`)),
    h('span.state' + (st.key === 'gelezen' ? '.done' : ''), st.label)));
}

export async function renderReading(main, [id] = []) {
  if (id) return renderText(main, id);
  const [c, list] = await Promise.all([content.curriculum(), content.texts()]);
  main.replaceChildren(
    h('div.page-head', h('h1', 'Leesteksten'),
      h('p', 'Korte teksten met alleen woorden die je in de lessen al gehad hebt. Tik op een woord voor de vertaling, laat de tekst voorlezen en beantwoord daarna de vragen.')),
    ...c.jaren.map((jaar) => {
      const ofYear = list.filter((t) => t.jaar === jaar.nr);
      if (!ofYear.length) return '';
      return h('section.year.panel.glass',
        h('h2', `Jaar ${jaar.nr}: ${jaar.titel}`),
        jaar.periodes.map((p) => {
          const ofPeriod = ofYear.filter((t) => t.periode === p.nr);
          return ofPeriod.length ? h('div', h('h3', `Periode ${p.nr} · ${p.titel}`), h('ul.list.rows', ofPeriod.map((t) => textRow(t, c)))) : '';
        }));
    }));
}

async function renderText(main, id) {
  const [text, c, map] = await Promise.all([content.text(id), content.curriculum(), wordMap()]);
  if (!text) {
    main.replaceChildren(h('section.panel.glass', h('h1', 'Tekst niet gevonden'), h('a.btn', { href: '#/lezen' }, 'Alle leesteksten')));
    return;
  }
  const naLes = c.index.get(text.naLes);
  const view = { harakat: true, vertaling: false };

  const readerBody = h('div.reader');
  const card = h('div');
  const panel = h('section.panel.glass', readerBody);

  const harakatBtn = h('button.btn.btn--ghost.btn--small', { type: 'button', 'aria-pressed': 'true', onclick: () => { view.harakat = !view.harakat; harakatBtn.setAttribute('aria-pressed', String(view.harakat)); draw(); } }, 'Harakat');
  const transBtn = h('button.btn.btn--ghost.btn--small', { type: 'button', 'aria-pressed': 'false', onclick: () => { view.vertaling = !view.vertaling; transBtn.setAttribute('aria-pressed', String(view.vertaling)); draw(); } }, 'Vertaling');
  const readAll = h('button.btn.btn--small', {
    type: 'button',
    onclick: () => {
      if (!speech.speak(text.zinnen.map((z) => z.ar).join(' '))) toast('Geen Arabische stem gevonden in deze browser (zie Instellingen).');
    },
  }, icon('sound'), 'Voorlezen');

  const questions = h('section.panel.glass', { style: { marginTop: '18px' }, 'aria-live': 'polite' });

  main.replaceChildren(
    h('header.panel.glass.lesson-head',
      h('div',
        h('div.code', `Jaar ${text.jaar} · Periode ${text.periode} · ${text.entry.code} · ${SOORT[text.soort] || text.soort}`),
        h('h1', { style: { fontSize: 'var(--sc-t-xl)', marginTop: '4px' } }, text.titel),
        text.intro ? h('p.soft', { style: { margin: '4px 0 0' }, html: rich(text.intro) }) : null,
        naLes ? h('p.soft.small', { style: { margin: '6px 0 0' } }, 'Aanbevolen na ', h('a', { href: `#/les/${naLes.id}` }, `${naLes.code} ${naLes.titel}`), '. Tik op een woord voor de betekenis.') : null),
      reviewFlag(text.review)),
    h('div.btn-row.reader-tools', readAll, harakatBtn, transBtn),
    panel,
    questions);
  requestAnimationFrame(() => lightPart('woorden', panel));

  function draw() {
    readerBody.replaceChildren(...text.zinnen.map((z, i) => sentence(z, i)));
  }

  function sentence(z, i) {
    const gloss = h('div.reader-gloss');
    const line = h('p.reader-line', { lang: 'ar', dir: 'rtl' },
      ...z.tokens.flatMap((tok, j) => {
        const shown = view.harakat ? tok.t : stripMarks(tok.t);
        const el = tok.w || tok.g
          ? h('button.tok', { type: 'button', lang: 'ar', 'data-w': tok.w || '', onclick: (e) => openWord(tok, gloss, e.currentTarget) }, shown)
          : h('span.tok.tok--plain', shown);
        return j ? [' ', el] : [el];
      }));
    return h('div.reader-sent', { 'data-i': i },
      h('div.reader-row', line, playButton(z.ar, { label: 'Zin beluisteren' })),
      z.tr ? h('div', tr(z.tr)) : null,
      view.vertaling ? h('p.soft.reader-nl', z.nl) : null,
      reviewFlag(z.review),
      gloss);
  }

  function openWord(tok, gloss, btn) {
    readerBody.querySelectorAll('.tok.is-open').forEach((b) => b !== btn && b.classList.remove('is-open'));
    readerBody.querySelectorAll('.reader-gloss').forEach((g) => g !== gloss && g.replaceChildren());
    if (btn.classList.contains('is-open')) {
      btn.classList.remove('is-open');
      gloss.replaceChildren();
      return;
    }
    btn.classList.add('is-open');
    const w = tok.w ? map.get(tok.w) : null;
    gloss.replaceChildren(h('div.inset.word-gloss', { role: 'status' },
      h('div.word-gloss__head', ar(tok.t, 'lg'), tok.g ? h('span', ' ', h('b', tok.g)) : null),
      w ? h('div.word-gloss__card',
        h('span', ar(w.ar), ' ', tr(w.tr)),
        h('span', w.nl),
        h('span.soft.small', [w.soort, w.code].filter(Boolean).join(' · '))) : null,
      w ? h('div.btn-row', { style: { marginTop: '8px' } },
        playButton(w.ar),
        h('button.btn.btn--small', { type: 'button', onclick: () => toCards(w) }, icon('cards'), 'Oefen in flashcards'),
        h('a.btn.btn--ghost.btn--small', { href: `#/les/${w.unit}/woorden/${w.id}` }, `Naar ${w.code}`)) : null));
  }

  function toCards(w) {
    const existing = store.card(w.id);
    if (existing) {
      if (!existing.isNew && existing.due > today()) store.putCard(w.id, { ...existing, due: today() });
      toast('Dit woord komt vandaag terug in je flashcards.');
      return;
    }
    const unit = c.index.get(w.unit);
    store.addCards([newCard({ id: w.id, ar: w.ar, tr: w.tr, nl: w.nl.split(' · ') }, { id: w.unit, code: w.code, dialect: unit?.dialect || 'fusha' })]);
    toast('Toegevoegd aan je flashcards.');
  }

  function intro() {
    const best = store.state.teksten?.[id]?.best;
    questions.replaceChildren(
      h('h2', 'Vragen bij de tekst'),
      h('p.sub', `${text.vragen.length} vragen over de inhoud. Je mag de tekst erbij houden.`),
      best != null ? h('p.soft.small', `Beste score tot nu toe: ${pct(best)}`) : '',
      h('button.btn', { type: 'button', onclick: start }, best != null ? 'Opnieuw' : 'Start de vragen'));
  }

  function start() {
    const host = h('div');
    questions.replaceChildren(h('h2', 'Vragen bij de tekst'), host);
    runExercises(host, text.vragen, {
      mode: 'oefen', dialect: 'fusha',
      onDone(results) {
        const s = score(results);
        store.recordText(id, s.pct);
        const next = nextText();
        host.replaceChildren(
          h('div.result-head', h('div.big-num', pct(s.pct)), h('div', h('b', `${s.points} van ${s.max} goed`), h('div.soft.small', s.pct >= 0.7 ? 'Goed gelezen.' : 'Lees de tekst nog eens met de vertaling erbij.'))),
          h('div.btn-row', { style: { marginTop: '18px' } },
            h('button.btn.btn--ghost', { type: 'button', onclick: start }, icon('refresh'), 'Opnieuw'),
            next ? h('a.btn', { href: `#/lezen/${next.id}` }, `Volgende tekst: ${next.titel}`, icon('arrow')) : h('a.btn', { href: '#/lezen' }, 'Alle leesteksten')));
      },
    });
  }

  let all = [];
  content.texts().then((l) => { all = l; });
  function nextText() {
    const i = all.findIndex((t) => t.id === id);
    return i >= 0 ? all[i + 1] : null;
  }

  draw();
  intro();
}

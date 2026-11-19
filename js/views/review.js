// Zwakke plekken oefenen: een ronde met items uit de lessen die je al gehad hebt, voor je zwakste
// grammaticapunten. Eerst 10 vragen met directe feedback, daarna een mini-toets van 5 andere vragen.
// Route: #/herhalen (overzicht)  of  #/herhalen/<tag>[,<tag>…] (ronde voor die punten).

import { h, icon, pct, rich } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { meter } from '../ui/components.js';
import { lightPart } from '../ui/world.js';
import { runExercises, score, smart, typeLabel } from '../exercises/runner.js';
import { weakTags, tagRatio, startedUnits, weakItemPool, tagSource } from './progress-model.js';

const OEFEN = 10;
const TOETS = 5;

/** Verdeel een pool over oefenvragen en mini-toets; bij een kleine pool krijgt de toets minder. */
export function splitRound(pool) {
  const nToets = Math.min(TOETS, Math.floor(pool.length / 3));
  const oefen = pool.slice(0, Math.min(OEFEN, pool.length - nToets));
  return { oefen, toets: pool.slice(oefen.length, oefen.length + nToets) };
}

async function startedLessons() {
  const c = await content.curriculum();
  return Promise.all(startedUnits(c).map((u) => content.lesson(u.id)));
}

const color = (r) => (r >= 0.7 ? 'var(--good)' : 'var(--bad)');

export async function renderReview(main, [param] = []) {
  const panel = h('section.panel.glass', { 'aria-live': 'polite' }, h('p.soft', 'Je lessen worden geladen…'));
  main.replaceChildren(
    h('div.page-head', h('h1', 'Zwakke plekken oefenen'),
      h('p', 'Een ronde met vragen uit de lessen die je al gehad hebt, voor de grammaticapunten waar je de meeste fouten maakt. Eerst oefen je met directe uitleg, daarna volgt een korte toets.')),
    panel);
  requestAnimationFrame(() => lightPart('oefeningen', panel));

  const lessons = await startedLessons();
  if (!lessons.length) {
    panel.replaceChildren(h('h2', 'Nog niets om te herhalen'), h('p.soft', 'Begin eerst met een les. Zodra je oefeningen hebt gemaakt, zie je hier je zwakke punten.'),
      h('a.btn', { href: '#/lessen' }, 'Naar de lessen', icon('arrow')));
    return;
  }

  if (param) {
    const tags = decodeURIComponent(param).split(',').filter(Boolean);
    return round(panel, lessons, tags);
  }
  overview(panel, lessons);
}

function overview(panel, lessons) {
  const weak = weakTags(8);
  if (!weak.length) {
    panel.replaceChildren(h('h2', 'Geen duidelijke zwakke punten'),
      h('p.soft', 'Je hebt bij geen enkel grammaticapunt (met minstens 3 antwoorden) minder dan 85% goed. Mooi zo. Herhaal je flashcards of ga verder met de volgende les.'),
      h('div.btn-row', h('a.btn', { href: '#/kaarten' }, 'Flashcards'), h('a.btn.btn--ghost', { href: '#/lessen' }, 'Lessen')));
    return;
  }
  const all = weak.slice(0, 4).map((t) => t.tag);
  panel.replaceChildren(
    h('h2', 'Je zwakste punten'),
    h('p.sub', 'Gemeten over je laatste 10 antwoorden per punt (of alle, als het er minder dan 5 zijn).'),
    h('ul.list.rows', weak.map((t) => {
      const src = tagSource(lessons, t.tag);
      return h('li.review-row',
        h('div.review-row__main',
          h('div.review-row__label', h('span', content.tagLabel(t.tag)), h('span.pct', pct(t.ratio))),
          meter(t.ratio, color(t.ratio), true),
          src ? h('a.note', { href: `#/les/${src.id}/grammatica` }, `Uitleg in ${src.code}`) : null),
        h('a.btn.btn--small', { href: `#/herhalen/${encodeURIComponent(t.tag)}` }, 'Oefen'));
    })),
    h('div.btn-row', { style: { marginTop: '16px' } },
      h('a.btn', { href: `#/herhalen/${encodeURIComponent(all.join(','))}` }, `Oefen de ${all.length} zwakste samen`, icon('arrow'))));
}

function round(panel, lessons, tags) {
  const labels = tags.map((t) => content.tagLabel(t)).join(', ');
  const pool = weakItemPool(lessons, tags);
  if (pool.length < 4) {
    panel.replaceChildren(h('h2', labels),
      h('p.soft', `Er zijn te weinig vragen over dit punt in de lessen die je al gehad hebt (${pool.length} gevonden). Lees de uitleg nog eens en maak de volgende les.`),
      backButtons(lessons, tags));
    return;
  }
  const before = Object.fromEntries(tags.map((t) => [t, store.state.tags[t] ? tagRatio(store.state.tags[t]) : null]));
  const { oefen, toets } = splitRound(pool);
  const host = h('div');
  panel.replaceChildren(h('h2', `Oefenen: ${labels}`), h('p.soft.small', `${oefen.length} vragen met uitleg, daarna een toets van ${toets.length}.`), host);

  runExercises(host, oefen, {
    mode: 'oefen',
    onDone(results) {
      const s = score(results);
      host.replaceChildren(
        h('div.result-head', h('div.big-num', pct(s.pct)), h('div', h('b', `${s.points} van ${s.max} goed`), h('div.soft.small', 'Nu een korte toets zonder tussentijdse uitleg.'))),
        h('div.btn-row', { style: { marginTop: '18px' } },
          toets.length
            ? h('button.btn', { type: 'button', onclick: () => miniTest() }, 'Start de toets', icon('arrow'))
            : h('button.btn', { type: 'button', onclick: () => finish([]) }, 'Bekijk de uitslag', icon('arrow'))));
    },
  });

  function miniTest() {
    panel.querySelector('h2').textContent = `Toets: ${labels}`;
    runExercises(host, toets, { mode: 'toets', onDone: finish });
  }

  function finish(results) {
    const s = score(results);
    host.replaceChildren(
      results.length ? h('div.result-head', h('div.big-num', { style: { color: color(s.pct) } }, pct(s.pct)),
        h('div', h('b', `Toets: ${s.points} van ${s.max} goed`), h('div.soft.small', s.pct >= 0.7 ? 'Dit punt gaat de goede kant op.' : 'Lees de uitleg nog eens en doe nog een ronde.'))) : '',
      h('h3', 'Voor en na deze ronde'),
      h('div', tags.map((t) => {
        const after = store.state.tags[t] ? tagRatio(store.state.tags[t]) : 0;
        const b = before[t];
        return h('div.review-row__main', { style: { padding: '8px 0' } },
          h('div.review-row__label', h('span', content.tagLabel(t)), h('span.pct', b == null ? pct(after) : `${pct(b)} → ${pct(after)}`)),
          meter(after, color(after), true));
      })),
      results.some((r) => !r.ok) ? h('h3', 'Fout in de toets') : '',
      results.some((r) => !r.ok) ? h('ul.list.rows.result-list', results.filter((r) => !r.ok).map((r) =>
        h('li', h('span.mark.bad', '✗'),
          h('div', h('b', `${typeLabel(r.item)} · ${r.item._lesCode}`)),
          h('div.detail',
            h('div', 'Jouw antwoord: ', smart(r.gegeven || '(leeg)')),
            h('div', 'Juist: ', smart(r.juist)),
            r.item.uitleg ? h('div', { html: rich(r.item.uitleg) }) : null)))) : '',
      backButtons(lessons, tags, true));
  }
}

function backButtons(lessons, tags, again = false) {
  const src = tags.length === 1 ? tagSource(lessons, tags[0]) : null;
  return h('div.btn-row', { style: { marginTop: '20px' } },
    again ? h('button.btn', { type: 'button', onclick: () => window.dispatchEvent(new HashChangeEvent('hashchange')) }, icon('refresh'), 'Nog een ronde') : null,
    src ? h('a.btn.btn--ghost', { href: `#/les/${src.id}/grammatica` }, `Uitleg in ${src.code}`) : null,
    h('a.btn.btn--ghost', { href: '#/herhalen' }, 'Alle zwakke punten'));
}

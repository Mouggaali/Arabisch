// Lesoverzicht: het hele meerjarenplan per jaar en periode, met status per eenheid.

import { h, bidi } from '../core/util.js';
import { content } from '../core/content.js';
import { meter } from '../ui/components.js';
import { unitStatus, periodProgress } from './progress-model.js';
import { textRow } from './reading.js';

const TYPE_NAMES = { les: 'Les', herhaling: 'Herhaling', darija: 'Darija', periodetoets: 'Periodetoets', evaluatie: 'Niveau-evaluatie' };

export async function renderLessons(main) {
  const c = await content.curriculum();
  const texts = await content.texts().catch(() => []);
  const firstOpen = c.order.find((u) => u.bestand && unitStatus(u).key !== 'afgerond');

  main.replaceChildren(
    h('div.page-head', h('h1', 'Lessen'), h('p', c.beschrijving)),
    ...c.jaren.map((jaar) =>
      h('section.year.panel.glass',
        h('h2', `Jaar ${jaar.nr}: ${jaar.titel}`),
        h('p.sub', jaar.niveau),
        jaar.periodes.map((p) => {
          const prog = periodProgress(p);
          const open = p.eenheden.some((u) => u === firstOpen) || (jaar.nr === 1 && p.nr === 1);
          return h('details.period', { open },
            h('summary', h('h3', `Periode ${p.nr} · ${p.titel}`), meter(prog.ratio, null, true), h('span.soft.small', `${prog.done}/${prog.total}`)),
            h('ul.list.rows', p.eenheden.map((u) => unitRow(u))),
            ...textsFor(texts, jaar.nr, p.nr, c));
        }))));
}

/** Leesteksten van een periode, onder de eenheden. */
function textsFor(texts, jaar, periode, c) {
  const list = texts.filter((t) => t.jaar === jaar && t.periode === periode);
  return list.length ? [h('h4.period-sub', 'Leesteksten'), h('ul.list.rows', list.map((t) => textRow(t, c)))] : [];
}

function unitRow(u) {
  const st = unitStatus(u);
  const inner = [
    h('span.code', u.code),
    h('span', h('span.t', u.titel), h('span.g', { html: bidi([TYPE_NAMES[u.type], u.grammatica].filter(Boolean).join(' · ')) })),
    h('span.state' + (st.key === 'afgerond' ? '.done' : ''), st.label),
  ];
  return h('li', h(u.bestand ? 'a.unit-row.row-hit' : 'div.unit-row.is-planned', u.bestand ? { href: `#/les/${u.id}` } : null, inner));
}


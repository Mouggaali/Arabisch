// Vandaag: wat staat er nu klaar? Te herhalen kaarten, de volgende les en je zwakste punt.

import { h, icon, pct, formatDate } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { dueToday, difficult } from '../core/srs.js';
import { ar, tr, meter } from '../ui/components.js';
import { PARTS, sizeParts } from '../ui/world.js';
import { unitStatus, planProgress, partLevels, weakTags, todayGoal, streak, weekPlan } from './progress-model.js';

export async function renderToday(main) {
  const c = await content.curriculum();
  const due = dueToday();
  const next = c.order.find((u) => u.bestand && unitStatus(u).key !== 'afgerond');
  const plan = planProgress(c);
  const levels = partLevels(c);
  const weak = weakTags(3);
  const hard = difficult(5);
  const goal = todayGoal();
  const reeks = streak();
  const week = weekPlan(c);
  sizeParts(levels);

  const nextStatus = next ? unitStatus(next) : null;
  const nextPart = next && store.state.lessen[next.id]
    ? ['woorden', 'grammatica', 'oefeningen', 'toets'].find((p) => !store.state.lessen[next.id].onderdelen[p]) || 'toets'
    : 'woorden';

  main.replaceChildren(
    h('section.panel.glass.hero-today',
      h('div.lens.glass.glass--lens',
        h('div.big-num', due.length),
        h('small', due.length === 1 ? 'kaart klaar' : 'kaarten klaar')),
      h('div',
        h('h1', { style: { fontSize: 'var(--sc-t-xl)' } }, greeting()),
        h('p.soft', { style: { margin: '6px 0 16px' } },
          next ? `Volgende stap: ${next.code} ${next.titel}${nextStatus.key === 'bezig' ? ` (${PARTS[nextPart].naam.toLowerCase()})` : ''}.` : 'Alle uitgewerkte lessen zijn afgerond. Nieuwe lessen volgen.'),
        h('div.btn-row',
          due.length ? h('a.btn', { href: '#/kaarten' }, icon('cards'), `Herhaal ${due.length} kaarten`) : null,
          next ? h('a.btn' + (due.length ? '.btn--ghost' : ''), { href: `#/les/${next.id}/${nextPart}` }, icon('book'), nextStatus.key === 'nieuw' ? 'Begin les' : 'Ga verder') : null),
        h('div.goal', { style: { marginTop: '16px' } },
          h('div.kv',
            h('span.small', goal.gehaald ? 'Dagdoel gehaald' : 'Dagdoel', ` · ${goal.gedaan} / ${goal.doel}`),
            h('span.small.streak', { title: 'Dagen op rij geoefend' }, icon('flame'), reeks === 1 ? '1 dag op rij' : `${reeks} dagen op rij`)),
          meter(goal.ratio, goal.gehaald ? 'var(--good)' : null, true)))),

    weekPanel(week),

    h('div.grid-2', { style: { marginTop: '18px' } },
      h('section.panel.glass',
        h('h2', 'Jouw meerjarenplan'),
        h('p.sub', `${plan.done} van ${plan.total} eenheden afgerond (jaar 1 tot en met 3).`),
        meter(plan.ratio),
        h('h3', 'Beheersing per lesonderdeel'),
        h('div', Object.entries(PARTS).map(([k, p]) =>
          h('div.tag-row', h('span', h('span.dot', { style: { '--c': p.kleur } }), p.naam), meter(levels[k], p.kleur), h('span.pct', pct(levels[k]))))),
        h('p.soft.small', { style: { marginTop: '8px' } }, 'De lichten achter het glas groeien mee met deze vier waarden.')),
      h('section.panel.glass',
        h('h2', 'Aandachtspunten'),
        weak.length
          ? h('div', weak.map((t) => h('div.tag-row', h('span', content.tagLabel(t.tag)), meter(t.ratio, t.ratio >= 0.7 ? 'var(--good)' : 'var(--bad)'), h('span.pct', pct(t.ratio)))))
          : h('p.soft', 'Nog te weinig antwoorden om zwakke punten te bepalen. Maak eerst een paar oefeningen.'),
        hard.length ? h('h3', 'Lastige woorden') : null,
        hard.length ? h('ul.list.rows', hard.map((w) => h('li.kv', h('span', w.nl[0]), h('span', { style: { textAlign: 'right' } }, ar(w.ar), h('div', tr(w.tr)))))) : null,
        h('div.btn-row', { style: { marginTop: '14px' } }, h('a.btn.btn--ghost.btn--small', { href: '#/voortgang' }, 'Volledige voortgang', icon('arrow'))))));
}

/** Deze week volgens het leerplan: status tegenover het schema en de eenheden voor deze week. */
function weekPanel(w) {
  const status = w.diff === 0 ? 'Je ligt precies op schema.'
    : w.diff > 0 ? `Je ligt ${w.diff} ${w.diff === 1 ? 'eenheid' : 'eenheden'} voor op het schema.`
      : `Je loopt ${-w.diff} ${w.diff === -1 ? 'eenheid' : 'eenheden'} achter op het schema.`;
  return h('section.panel.glass', { style: { marginTop: '18px' } },
    h('div.kv', h('h2', { style: { margin: 0 } }, icon('calendar'), ` Week ${w.week}`),
      h('span.soft.small', `gestart op ${formatDate(w.start)}`)),
    h('p.sub', `${status} Volgens het leerplan (± 1,5 eenheid per week) had je nu ${w.expected} van de ${w.total} eenheden af; je hebt er ${w.done}.`),
    w.next.length
      ? h('ul.list.rows', w.next.map((u) => h('li', h('a.result-link', { href: `#/les/${u.id}` }, h('span.code', u.code), h('span', u.titel)))))
      : h('p.soft', 'Alle eenheden zijn afgerond.'),
    h('p.soft.small', { style: { marginTop: '8px' } },
      `In dit tempo ben je klaar rond ${formatDate(w.eind, { month: 'long', year: 'numeric' })}. De startdatum en je dagdoel stel je in bij Instellingen.`));
}

function greeting() {
  const hr = new Date().getHours();
  if (hr < 12) return 'Ṣabāḥ al-ḫayr. Klaar voor vandaag?';
  if (hr < 18) return 'Marḥaban. Tijd voor Arabisch.';
  return 'Masāʾ al-ḫayr. Nog even oefenen?';
}

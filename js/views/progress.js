// Voortgang: per les en periode, toetsresultaten, grammaticabeheersing, woordenschat, zwakke punten.

import { h, pct, icon, formatDate } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { dueToday, difficult } from '../core/srs.js';
import { ar, tr, meter } from '../ui/components.js';
import { sizeParts } from '../ui/world.js';
import { periodProgress, planProgress, partLevels, weakTags, vocabStats, activity, weekPlan, yearTargets, streak, todayGoal, PACE } from './progress-model.js';

export async function renderProgress(main) {
  const c = await content.curriculum();
  sizeParts(partLevels(c));
  const plan = planProgress(c);
  const vocab = vocabStats();
  const tags = Object.entries(store.state.tags)
    .map(([tag, v]) => ({ tag, ratio: v.goed / Math.max(1, v.goed + v.fout), n: v.goed + v.fout }))
    .sort((a, b) => a.ratio - b.ratio);
  const tests = c.order
    .filter((u) => store.state.lessen[u.id]?.toetsen.length)
    .map((u) => ({ u, list: store.state.lessen[u.id].toetsen }));
  const due = dueToday();
  const act = activity(14);
  const maxAct = Math.max(1, ...act.map((d) => d.kaarten + d.oefen));

  main.replaceChildren(
    h('div.page-head', h('h1', 'Voortgang'), h('p', 'Alles wat je tot nu toe gedaan hebt. Een eenheid telt als afgerond zodra je de toets gehaald hebt.')),
    planningPanel(c),
    h('div.grid-2',
      h('section.panel.glass',
        h('h2', 'Totaal meerjarenplan'),
        h('div.kv', h('span.big-num', pct(plan.ratio)), h('span.soft', `${plan.done} / ${plan.total} eenheden`)),
        h('div', { style: { marginTop: '12px' } }, meter(plan.ratio)),
        ...c.jaren.map((j) => h('div', h('h3', `Jaar ${j.nr} · ${j.niveau}`),
          j.periodes.map((p) => {
            const pr = periodProgress(p);
            return h('div.tag-row', h('span.small', `P${p.nr} ${p.titel}`), meter(pr.ratio), h('span.pct', `${pr.done}/${pr.total}`));
          })))),
      h('div.stack',
        h('section.panel.glass',
          h('h2', 'Woordenschat'),
          h('div.kv', h('span.big-num', vocab.totaal), h('span.soft', 'woorden in je flashcards')),
          h('div', { style: { marginTop: '12px' } },
            ['nieuw', 'lerend', 'beheerst'].map((k) => h('div.tag-row',
              h('span', k === 'beheerst' ? 'beheerst (interval ≥ 21 dagen)' : k), meter(vocab.totaal ? vocab[k] / vocab.totaal : 0, k === 'beheerst' ? 'var(--good)' : k === 'lerend' ? 'var(--part-woorden)' : 'var(--mid)'), h('span.pct', vocab[k])))),
          h('h3', 'Activiteit, laatste 14 dagen'),
          h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '64px' }, role: 'img', 'aria-label': 'Aantal kaarten en oefenvragen per dag' },
            act.map((d) => h('div', { title: `${d.key}: ${d.kaarten} kaarten, ${d.oefen} vragen`, style: { flex: 1, height: `${Math.max(3, ((d.kaarten + d.oefen) / maxAct) * 100)}%`, borderRadius: '4px', background: d.kaarten + d.oefen ? 'var(--sc-accent)' : 'var(--track)' } })))),
        h('section.panel.glass',
          h('h2', `Opnieuw oefenen (${due.length})`),
          due.length
            ? h('ul.list.rows', due.slice(0, 8).map((w) => h('li.kv', h('span', w.nl[0], h('span.soft.small', ` · ${w.lesCode}`)), h('span', ar(w.ar), tr(' ' + w.tr)))))
            : h('p.soft', 'Niets te herhalen vandaag.'),
          due.length ? h('a.btn.btn--small', { href: '#/kaarten', style: { marginTop: '12px' } }, 'Naar de flashcards') : null))),

    h('div.grid-2', { style: { marginTop: '18px' } },
      h('section.panel.glass',
        h('h2', 'Grammaticale beheersing'),
        h('p.sub', 'Percentage goed per grammatica-onderwerp, uit oefeningen en toetsen. Laagste eerst.'),
        tags.length
          ? h('div', tags.map((t) => h('div.tag-row', h('span', content.tagLabel(t.tag), h('span.soft.small', ` (${t.n})`)), meter(t.ratio, t.ratio >= 0.7 ? 'var(--good)' : t.ratio >= 0.5 ? 'var(--mid)' : 'var(--bad)'), h('span.pct', pct(t.ratio)))))
          : h('p.soft', 'Nog geen gegevens.')),
      h('section.panel.glass',
        h('h2', 'Toetsresultaten'),
        tests.length
          ? h('ul.list.rows', tests.map(({ u, list }) => {
              const best = Math.max(...list.map((t) => t.pct));
              return h('li.kv', h('span', h('b', u.code), ' ', u.titel, h('div.soft.small', `${list.length} poging${list.length > 1 ? 'en' : ''}, laatste ${list.at(-1).datum}`)),
                h('span', { style: { fontWeight: 700, color: best >= 0.7 ? 'var(--good)' : 'var(--bad)' } }, pct(best)));
            }))
          : h('p.soft', 'Nog geen toetsen gemaakt.'),
        h('h3', 'Zwakke punten'),
        weakTags().length
          ? h('ul.list', weakTags().map((t) => h('li', `${content.tagLabel(t.tag)}: ${pct(t.ratio)} goed`)))
          : h('p.soft', 'Nog geen duidelijke zwakke punten.'),
        difficult(8).length ? h('h3', 'Moeilijke woorden') : null,
        difficult(8).length ? h('ul.list.rows', difficult(8).map((w) => h('li.kv', h('span', w.nl[0], h('span.soft.small', ` · ${w.lapses}× vergeten`)), ar(w.ar)))) : null)));
}


/** Planning: startdatum, tempo, reeks en streefdatum per jaar (tempo van het leerplan). */
function planningPanel(c) {
  const w = weekPlan(c);
  const goal = todayGoal();
  const reeks = streak();
  return h('section.panel.glass', { style: { marginBottom: '18px' } },
    h('h2', icon('calendar'), ' Planning'),
    h('p.sub', `Gestart op ${formatDate(w.start)} · week ${w.week} · tempo van het leerplan: ${String(PACE).replace('.', ',')} eenheid per week (vakanties meegerekend). `
      + (w.diff === 0 ? 'Je ligt op schema.' : w.diff > 0 ? `Je ligt ${w.diff} voor.` : `Je loopt ${-w.diff} achter.`)),
    h('div.kv', { style: { flexWrap: 'wrap', gap: '8px 24px', marginBottom: '10px' } },
      h('span', h('b', `${reeks}`), reeks === 1 ? ' dag op rij geoefend' : ' dagen op rij geoefend'),
      h('span', 'Vandaag ', h('b', `${goal.gedaan}`), ` van je dagdoel ${goal.doel}`),
      h('span', 'Verwacht klaar: ', h('b', formatDate(w.eind, { month: 'long', year: 'numeric' })))),
    h('div', yearTargets(c).map((y) => h('div.tag-row.tag-row--date',
      h('span.small', `Jaar ${y.nr} · ${y.niveau.replace(/^Niveau\s*/, '')}`),
      meter(y.done / Math.max(1, y.eenheden)),
      h('span.small', { style: { whiteSpace: 'nowrap' } }, formatDate(y.datum, { month: 'short', year: 'numeric' }))))),
    h('p.soft.small', { style: { marginTop: '6px' } }, 'De datum per jaar is de streefdatum in het tempo van het leerplan. Startdatum en dagdoel pas je aan bij Instellingen.'));
}

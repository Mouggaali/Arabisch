// Vervoegingstrainer: kies een werkwoord, een tijd en een groep personen.
// Bekijk de tabel, vul de hele tabel in, of oefen losse vormen in willekeurige volgorde.

import { h, icon, pct, shuffle, bidi } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { conjugate, PERSONS, TENSES } from '../core/conjugate.js';
import { ar, tr, playButton, reviewFlag } from '../ui/components.js';
import { runExercises, score } from '../exercises/runner.js';
import { lightPart } from '../ui/world.js';

const GROUPS = {
  alle: 'Alle personen',
  enkelvoud: 'Enkelvoud',
  meervoud: 'Meervoud',
  dualis: 'Dualis',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Korte uitleg per wijs, met de les waarin hij behandeld wordt.
const MOOD_HINT = {
  mansub: 'Manṣūb (aanvoegende wijs): na أَنْ، لَنْ، كَيْ، لِـ en حَتّى. Enkelvoud op -a, de vijf vormen op -na/-ni verliezen de nūn. Zie les 50.',
  majzum: 'Majzūm (verkorte wijs): na لَمْ (verleden ontkend) en لا (verbod). Enkelvoud met sukūn; holle en defectieve werkwoorden worden korter. Zie les 51.',
  amr: 'Gebiedende wijs: alleen de 2e personen. Afgeleid van de majzūm zonder تَـ; begint de stam met twee medeklinkers, dan komt er اُ of اِ voor. Zie les 52 en 89.',
};

const VERB_GROUPS = [
  ['Vorm I (regelmatig)', (v) => !v.zwak && (v.vorm || 1) === 1],
  ['Afgeleide vormen II–X', (v) => !v.zwak && (v.vorm || 1) > 1],
  ['Zwakke werkwoorden', (v) => !!v.zwak],
];

const sel = { verb: null, tijd: 'madi', groep: 'enkelvoud' };

export async function renderTrainer(main, [verbId] = []) {
  const data = await content.verbs();
  const verbs = data.werkwoorden;
  if (verbId && verbs.some((v) => v.id === verbId)) sel.verb = verbId; // #/trainer/<werkwoord> (vanuit Zoeken)
  if (!sel.verb) sel.verb = verbs[0].id;
  const verb = () => verbs.find((v) => v.id === sel.verb);
  const persons = () => PERSONS.filter((p) => sel.groep === 'alle' || p.groep === sel.groep).map((p) => p.id);

  const option = (v) => {
    const st = store.state.trainer[v.id];
    const extra = st ? ` · ${pct(st.goed / Math.max(1, st.goed + st.fout))}` : '';
    const soort = v.zwak ? v.zwak : `vorm ${ROMAN[v.vorm || 1]}`;
    return h('option', { value: v.id, selected: v.id === sel.verb }, `${v.nl} (${v.tr}) · ${soort}${extra}`);
  };
  const verbSelect = h('select.sel', { 'aria-label': 'Werkwoord', onchange: (e) => { sel.verb = e.target.value; showTable(); } },
    VERB_GROUPS.map(([label, test]) => {
      const list = verbs.filter(test);
      return list.length ? h('optgroup', { label }, list.map(option)) : '';
    }));
  const tenseSeg = segment(Object.entries(TENSES).map(([k, t]) => [k, t.kort]), () => sel.tijd, (k) => { sel.tijd = k; showTable(); }, 'Tijd');
  const groupSeg = segment(Object.entries(GROUPS), () => sel.groep, (k) => { sel.groep = k; showTable(); }, 'Personen');

  const panel = h('section.panel.glass');
  main.replaceChildren(
    h('div.page-head', h('h1', 'Vervoegingstrainer'),
      h('p', 'Oefen de vervoeging in alle personen: verleden en tegenwoordige tijd, de aanvoegende wijs (manṣūb), de verkorte wijs (majzūm) en de gebiedende wijs. Voor regelmatige werkwoorden van vorm I, de afgeleide vormen II–VIII en X, en zwakke werkwoorden (hol, defectief, verdubbeld, hamza, assimilerend en dubbel zwak).')),
    h('section.panel.glass', { style: { marginBottom: '18px' } },
      h('div.btn-row.trainer-controls', { style: { gap: '14px' } }, verbSelect, tenseSeg, groupSeg)),
    panel);
  requestAnimationFrame(() => lightPart('oefeningen', panel));

  function showTable() {
    const v = verb();
    const forms = conjugate(v, sel.tijd).filter((f) => f.ar && persons().includes(f.person.id));
    const soort = `vorm ${ROMAN[v.vorm || 1]}${v.zwak ? ' · ' + v.zwak : ''}`;
    panel.replaceChildren(
      h('div.kv', { style: { flexWrap: 'wrap' } },
        h('div', h('h2', { style: { marginBottom: '2px' } }, `${v.nl}`), h('p.soft.small', { style: { margin: 0 } }, `Wortel ${v.wortel.join(' - ')} · ${soort} · ${TENSES[sel.tijd].naam}`)),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } }, ar(v.ar, 'lg'), tr(v.tr), reviewFlag(v.review))),
      v.notitie ? h('p.soft.small', { html: bidi(v.notitie) }) : '',
      MOOD_HINT[sel.tijd] ? h('p.small', { html: bidi(MOOD_HINT[sel.tijd]) }) : '',
      h('div.table-scroll', h('table.conj',
        h('thead', h('tr', h('th', 'Persoon'), h('th', ''), h('th', { style: { textAlign: 'right' } }, 'Vorm'), h('th', ''))),
        h('tbody', forms.map((f) => h('tr',
          h('td', f.person.nl),
          h('td.ar-cell', f.person.ar),
          h('td.ar-cell', f.ar, tr(f.tr)),
          h('td', { style: { width: '48px' } }, playButton(f.ar))))))),
      h('div.btn-row', { style: { marginTop: '18px' } },
        h('button.btn', { type: 'button', onclick: drillTable }, 'Hele tabel invullen'),
        h('button.btn.btn--ghost', { type: 'button', onclick: drillSingles }, 'Losse vormen oefenen')));
  }

  function drillTable() {
    const v = verb();
    runDrill([{ type: 'vervoegen', werkwoord: v, tijd: sel.tijd, personen: persons(), tag: 'vervoeging-' + sel.tijd }]);
  }

  function drillSingles() {
    const v = verb();
    const known = conjugate(v, sel.tijd).filter((f) => f.ar).map((f) => f.person.id);
    const items = shuffle(persons().filter((pid) => known.includes(pid))).slice(0, 8).map((pid) => ({
      type: 'vervoegen', werkwoord: v, tijd: sel.tijd, personen: [pid], tag: 'vervoeging-' + sel.tijd,
    }));
    runDrill(items);
  }

  function runDrill(items) {
    const v = verb();
    const host = h('div');
    panel.replaceChildren(h('h2', `${v.nl} · ${TENSES[sel.tijd].kort}`), host);
    runExercises(host, items, {
      mode: 'oefen',
      onDone(results) {
        results.forEach((r) => store.recordTrainer(v.id, r.ok));
        const s = score(results);
        host.replaceChildren(
          h('div.result-head', h('div.big-num', pct(s.pct)), h('p.soft', `${s.points} van ${s.max} goed`)),
          h('div.btn-row', { style: { marginTop: '16px' } },
            h('button.btn.btn--ghost', { type: 'button', onclick: () => runDrill(items) }, icon('refresh'), 'Opnieuw'),
            h('button.btn', { type: 'button', onclick: showTable }, 'Terug naar de tabel')));
      },
    });
  }

  showTable();
}

function segment(options, get, set, label) {
  const seg = h('div.segment', { role: 'tablist', 'aria-label': label, style: { background: 'var(--track)' } });
  const draw = () => seg.replaceChildren(...options.map(([k, l]) =>
    h('button', { type: 'button', role: 'tab', 'aria-selected': String(get() === k), onclick: () => { set(k); draw(); } }, l)));
  draw();
  return seg;
}

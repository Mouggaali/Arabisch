// Lesweergave: vier vaste onderdelen (woordenschat, grammatica, oefenen, toets).
// Route: #/les/<id>/<onderdeel>

import { h, icon, rich, bidi, toast, pct, today } from '../core/util.js';
import { content } from '../core/content.js';
import { store } from '../core/store.js';
import { newCard } from '../core/srs.js';
import { speech } from '../core/speech.js';
import { ar, tr, playButton, reviewFlag, meter } from '../ui/components.js';
import { PARTS, lightPart } from '../ui/world.js';
import { runExercises, score, smart, typeLabel } from '../exercises/runner.js';
import { applyTranslit } from '../ui/translit.js';

const ORDER = ['woorden', 'grammatica', 'oefeningen', 'toets'];
// Periodetoetsen en niveau-evaluaties hebben alleen een toets.
const TEST_ONLY = ['periodetoets', 'evaluatie'];

export async function renderLesson(main, [id, part = 'woorden']) {
  const lesson = await content.lesson(id);
  if (!lesson) return renderPlanned(main, id);
  const parts = TEST_ONLY.includes(lesson.type) ? ['toets'] : ORDER;
  if (!parts.includes(part)) part = parts[0];
  applyTranslit(lesson);

  const progress = store.lesson(id);
  const dialect = lesson.dialect || 'fusha';

  const tabs = h('div.segment.glass.parts', { role: 'tablist', 'aria-label': 'Onderdelen van de les' },
    parts.map((p) => h('button', {
      type: 'button', role: 'tab', 'aria-selected': String(p === part),
      onclick: () => (location.hash = `#/les/${id}/${p}`),
    }, h('span.dot', { style: { '--c': PARTS[p].kleur } }), PARTS[p].naam, progress.onderdelen[p] ? h('span.ok', { 'aria-label': 'afgerond' }, '✓') : null)));

  const body = h('section.panel.glass', { 'aria-live': 'polite' });
  main.replaceChildren(
    h('header.panel.glass.lesson-head',
      h('div',
        h('div.code', `Jaar ${lesson.unit.jaar} · Periode ${lesson.unit.periode} · ${lesson.code}`),
        h('h1', { style: { fontSize: 'var(--sc-t-xl)', marginTop: '4px' } }, lesson.titel),
        lesson.thema ? h('p.soft', { style: { margin: '4px 0 0' } }, 'Thema: ' + lesson.thema) : null,
        h('ul.goals', lesson.leerdoelen.map((g) => h('li', { html: rich((TEST_ONLY.includes(lesson.type) ? '' : 'Ik kan ') + g) })))),
      dialect === 'darija' ? h('span.flag', 'Darija · moedertaalcontrole') : null),
    parts.length > 1 ? tabs : '',
    body);

  const views = { woorden: renderWords, grammatica: renderGrammar, oefeningen: renderPractice, toets: renderTest };
  await views[part](body, lesson, dialect);
  requestAnimationFrame(() => lightPart(part, body));
}

function nextPartButton(lesson, part, label) {
  const i = ORDER.indexOf(part);
  const next = ORDER[i + 1];
  return h('div.btn-row', { style: { marginTop: '22px', justifyContent: 'flex-end' } },
    h('button.btn', {
      type: 'button',
      onclick: () => {
        store.markPart(lesson.id, part);
        location.hash = next ? `#/les/${lesson.id}/${next}` : '#/lessen';
      },
    }, label, icon('arrow')));
}

/* ------------------------------------------------------------ woordenschat -- */
function renderWords(body, lesson, dialect) {
  if (!lesson.woorden.length) {
    body.replaceChildren(
      h('h2', 'Woordenschat'),
      h('p.sub', lesson.woordenUitleg || 'In deze eenheid komen geen nieuwe woorden. Herhaal de woorden van de vorige lessen in je flashcards.'),
      h('div.btn-row', h('a.btn.btn--ghost', { href: '#/kaarten' }, icon('cards'), 'Naar de flashcards')),
      nextPartButton(lesson, 'woorden', 'Naar de grammatica'));
    return;
  }
  const added = store.addCards(lesson.woorden.map((w) => newCard(w, lesson)));
  if (added) toast(`${added} woorden toegevoegd aan je flashcards`);

  let hideNl = false;
  const rows = lesson.woorden.map((w) => {
    const row = h('li.word-row.row-hit',
      playButton(w.ar, { dialect }),
      h('div', { style: { textAlign: 'right' } }, ar(w.ar, 'lg'), h('div', tr(w.tr))),
      h('div.nl-wrap', { onclick: () => row.classList.remove('hide-nl') },
        h('span.nl', w.nl.join(' · ')),
        w.notitie ? h('span.note', { html: rich(w.notitie) }) : null),
      h('div', reviewFlag(w.review)));
    return row;
  });
  const list = h('ul.list.rows', rows);

  const toggle = h('button.btn.btn--ghost.btn--small', {
    type: 'button', 'aria-pressed': 'false',
    onclick: () => {
      hideNl = !hideNl;
      toggle.setAttribute('aria-pressed', String(hideNl));
      toggle.lastChild.textContent = hideNl ? 'Toon vertalingen' : 'Verberg vertalingen';
      rows.forEach((r) => r.classList.toggle('hide-nl', hideNl));
    },
  }, icon('eye'), h('span', 'Verberg vertalingen'));

  let playing = false;
  const playAll = h('button.btn.btn--ghost.btn--small', {
    type: 'button', disabled: !speech.available,
    onclick: async () => {
      if (playing) { playing = false; speech.stop(); return; }
      playing = true;
      for (const [i, w] of lesson.woorden.entries()) {
        if (!playing) break;
        rows[i].classList.add('is-lit');
        rows[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        await new Promise((res) => speech.speak(w.ar, { dialect, onend: res }) || res());
        rows[i].classList.remove('is-lit');
        await new Promise((res) => setTimeout(res, 450));
      }
      playing = false;
    },
  }, icon('sound'), 'Alles afspelen');

  body.replaceChildren(
    h('h2', `Woordenschat · ${lesson.woorden.length} kernwoorden`),
    h('p.sub', 'Beluister elk woord en zeg het hardop na. Verberg daarna de vertalingen en test jezelf; tik op een vervaagde vertaling om hem te zien.'),
    h('div.btn-row', { style: { marginBottom: '10px' } }, toggle, playAll),
    list,
    nextPartButton(lesson, 'woorden', 'Naar de grammatica'));
}

/* -------------------------------------------------------------- grammatica -- */
function renderGrammar(body, lesson, dialect) {
  const blocks = lesson.grammatica.map((g) =>
    h('article.gram-block',
      h('h2', { html: bidi(g.titel) }),
      g.blokken.map((b) => renderBlock(b, dialect))));
  body.replaceChildren(...blocks, nextPartButton(lesson, 'grammatica', 'Naar de oefeningen'));
}

function renderBlock(b, dialect) {
  switch (b.type) {
    case 'tekst':
      return h('div.prose', (Array.isArray(b.md) ? b.md : [b.md]).map((p) => h('p', { html: rich(p) })));
    case 'waarom':
      return h('div.why', h('p', { style: { margin: 0 }, html: '<b>Waarom?</b> ' + rich(b.md) }));
    case 'letop':
      return h('div.inset', { style: { margin: '12px 0' } }, h('p', { style: { margin: 0 }, html: '<b>Let op:</b> ' + rich(b.md) }));
    case 'voorbeelden':
      return h('ul.list.rows.examples', b.items.map((x) =>
        h('li', playButton(x.ar, { dialect }), ar(x.ar), x.tr ? tr(x.tr) : null, h('span.nl', x.nl), x.review ? reviewFlag(x.review) : null)));
    case 'tabel':
      return h('div.table-scroll', h('table.conj',
        h('thead', h('tr', b.kop.map((k) => h('th', k)))),
        h('tbody', b.rijen.map((r) => h('tr', r.map((cell, i) => {
          if (b.arKolommen?.includes(i)) {
            const [arText, trText] = String(cell).split('|');
            return h('td.ar-cell', { lang: 'ar' }, arText, trText ? tr(trText) : null);
          }
          return h('td', cell);
        }))))));
    default:
      return null;
  }
}

/* -------------------------------------------------------------- oefeningen -- */
function renderPractice(body, lesson, dialect) {
  const progress = store.lesson(lesson.id);
  const sets = lesson.oefeningen;

  function overview() {
    body.replaceChildren(
      h('h2', 'Oefenen'),
      h('p.sub', 'Na elke vraag zie je direct of het goed is, met uitleg. Fout beantwoorde woorden komen vaker terug in je flashcards.'),
      h('ul.list.rows', sets.map((s, i) => {
        const best = progress.sets?.[i];
        return h('li', { style: { display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between', flexWrap: 'wrap' } },
          h('div',
            h('b', s.titel),
            h('div.soft.small', `${s.items.length} vragen · ${[...new Set(s.items.map(typeLabel))].join(', ')}`)),
          h('div.btn-row',
            best != null ? h('span.small', { style: { color: best >= 0.7 ? 'var(--good)' : 'var(--mid)' } }, 'beste: ' + pct(best)) : null,
            h('button.btn.btn--small' + (best != null ? '.btn--ghost' : ''), { type: 'button', onclick: () => run(i) }, best != null ? 'Opnieuw' : 'Start')));
      })),
      progress.onderdelen.oefeningen ? nextPartButton(lesson, 'oefeningen', 'Naar de toets') : h('p.soft.small', { style: { marginTop: '16px' } }, 'Maak elke set minstens één keer om dit onderdeel af te ronden.'));
  }

  function run(i) {
    const set = sets[i];
    const host = h('div');
    body.replaceChildren(h('h2', set.titel), host);
    runExercises(host, set.items, {
      mode: 'oefen', lessonId: lesson.id, dialect,
      onDone(results) {
        const s = score(results);
        store.recordSet(lesson.id, i, s.pct, sets.length);
        host.replaceChildren(
          h('div.result-head', h('div.big-num', pct(s.pct)), h('div', h('b', `${s.points} van ${s.max} goed`), h('div.soft.small', s.pct >= 0.7 ? 'Mooi zo. Ga door naar de volgende set.' : 'Herhaal deze set nog eens; de uitleg bij elke fout helpt je.'))),
          h('div.btn-row', { style: { marginTop: '18px' } },
            h('button.btn.btn--ghost', { type: 'button', onclick: () => run(i) }, icon('refresh'), 'Opnieuw'),
            h('button.btn', { type: 'button', onclick: overview }, 'Terug naar de sets')));
      },
    });
  }

  overview();
}

/* -------------------------------------------------------------------- toets -- */
function renderTest(body, lesson, dialect) {
  const progress = store.lesson(lesson.id);
  const t = lesson.toets;
  const drempel = t.drempel ?? 0.7;

  function intro() {
    const last = progress.toetsen.at(-1);
    body.replaceChildren(
      h('h2', 'Toets'),
      h('p.sub', `${t.items.length} vragen over de hele les. Je krijgt pas aan het eind je score en de uitleg. Geslaagd vanaf ${pct(drempel)}.`),
      progress.toetsen.length
        ? h('div.inset', { style: { marginBottom: '16px' } },
            h('b', 'Eerdere pogingen'),
            h('ul.list', progress.toetsen.slice(-5).reverse().map((r) =>
              h('li.kv', { style: { padding: '6px 0' } }, h('span', r.datum), h('span', { style: { color: r.pct >= r.drempel ? 'var(--good)' : 'var(--bad)', fontWeight: 650 } }, pct(r.pct))))))
        : '',
      h('button.btn', { type: 'button', onclick: start }, last ? 'Toets opnieuw maken' : 'Start de toets'));
  }

  function start() {
    const host = h('div');
    body.replaceChildren(h('h2', 'Toets'), host);
    runExercises(host, t.items, {
      mode: 'toets', lessonId: lesson.id, dialect,
      onDone(results) {
        const s = score(results);
        const perTag = {};
        for (const r of results) {
          const tag = r.item.tag || 'overig';
          perTag[tag] ||= { goed: 0, totaal: 0 };
          perTag[tag].totaal++;
          perTag[tag].goed += r.ok ? 1 : r.deels || 0;
        }
        store.recordTest(lesson.id, { datum: today(), pct: s.pct, punten: s.points, max: s.max, drempel, perTag });
        showResult(host, results, s, perTag);
      },
    });
  }

  function showResult(host, results, s, perTag) {
    const passed = s.pct >= drempel;
    const tab = document.querySelector('.parts [aria-selected="true"]');
    if (passed && tab && !tab.querySelector('.ok')) tab.append(h('span.ok', { 'aria-label': 'afgerond' }, '✓'));
    host.replaceChildren(
      h('div.result-head',
        h('div.glass.glass--lens', { style: { width: '150px' } }, h('div.big-num', { style: { color: passed ? 'var(--good)' : 'var(--bad)' } }, pct(s.pct))),
        h('div',
          h('h3', { style: { margin: 0, fontSize: '1.3rem' } }, passed ? 'Geslaagd' : 'Nog niet geslaagd'),
          h('p.soft', { style: { margin: '4px 0 0' } }, `${s.points} van ${s.max} punten. ${passed ? 'Deze les is afgerond.' : `Je hebt ${pct(drempel)} nodig. Bekijk de uitleg hieronder en oefen de onderdelen in het rood.`}`))),
      h('h3', 'Per onderdeel'),
      h('div', Object.entries(perTag).map(([tag, v]) =>
        h('div.tag-row', h('span', content.tagLabel(tag)), meter(v.goed / v.totaal, v.goed / v.totaal >= 0.7 ? 'var(--good)' : 'var(--bad)'), h('span.pct', pct(v.goed / v.totaal))))),
      h('h3', 'Alle vragen'),
      h('ul.list.rows.result-list', results.map((r, i) =>
        h('li',
          h('span.mark' + (r.ok ? '.good' : '.bad'), r.ok ? '✓' : '✗'),
          h('div', h('b', `${i + 1}. ${typeLabel(r.item)}`), r.item.vraag || r.item.bron || r.item.nl || r.item.opdracht ? h('span.soft', { html: ' · ' + rich(r.item.vraag || r.item.bron || r.item.nl || r.item.opdracht) }) : null),
          !r.ok ? h('div.detail',
            r.samenvatting ? h('div', r.samenvatting) : null,
            h('div', 'Jouw antwoord: ', smart(r.gegeven || '(leeg)')),
            h('div', 'Juist: ', smart(r.juist)),
            r.hint ? h('div', r.hint) : null,
            r.item.uitleg ? h('div', { html: rich(r.item.uitleg) }) : null) : null))),
      h('div.btn-row', { style: { marginTop: '20px' } },
        h('button.btn.btn--ghost', { type: 'button', onclick: intro }, icon('refresh'), 'Opnieuw'),
        h('a.btn', { href: '#/lessen' }, 'Naar het lesoverzicht')));
  }

  intro();
}

/* -------------------------------------------------- les nog niet uitgewerkt -- */
async function renderPlanned(main, id) {
  const unit = await content.unit(id);
  if (!unit) {
    main.replaceChildren(h('div.panel.glass.empty', 'Deze les bestaat niet. ', h('a', { href: '#/lessen' }, 'Naar het lesoverzicht')));
    return;
  }
  main.replaceChildren(h('section.panel.glass',
    h('div.code.soft.small', `Jaar ${unit.jaar} · Periode ${unit.periode} · ${unit.code}`),
    h('h1', { style: { fontSize: 'var(--sc-t-xl)', margin: '4px 0 10px' } }, unit.titel),
    unit.grammatica ? h('p', { html: '<b>Grammatica:</b> ' + rich(unit.grammatica) }) : null,
    unit.leerdoel ? h('p', 'Leerdoel: ik kan ' + unit.leerdoel) : null,
    h('p.soft', 'Deze les staat in het leerplan maar is nog niet uitgewerkt. Ze wordt toegevoegd in fase 4.'),
    h('a.btn.btn--ghost', { href: '#/lessen' }, icon('back'), 'Lesoverzicht')));
}

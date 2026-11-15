// Zoeken en woordenboek: alle woorden, grammaticaonderwerpen, lessen en werkwoorden.
// Route: #/zoeken  of  #/zoeken/<zoekterm>. Werkt met content/zoekindex.json (tools/build-search-index.mjs).
// Arabisch zoekt zonder harakat (alif-, hamza-, ى- en ة-varianten gelijk), transliteratie en Nederlands
// zonder hoofdletters en accenten.

import { h, icon, rich, bidi } from '../core/util.js';
import { content } from '../core/content.js';
import { isArabic, searchKeyAr, searchKeyLat } from '../core/arabic.js';
import { ar, tr, playButton, reviewFlag } from '../ui/components.js';
import { keyboard } from '../ui/keyboard.js';
import { lightPart } from '../ui/world.js';

const MAX = { woorden: 60, grammatica: 20, lessen: 12, werkwoorden: 10 };
let prepared = null;

/** Zoeksleutels één keer per sessie voorbereiden. */
async function prepare() {
  if (prepared) return prepared;
  const idx = await content.searchIndex();
  prepared = {
    woorden: idx.woorden.map(([a, t, nl, soort, unit, code, id, review]) => ({
      a, t, nl, soort, unit, code, id, review,
      ka: searchKeyAr(a), kt: searchKeyLat(t), kn: searchKeyLat(nl),
    })),
    grammatica: idx.grammatica.map(([titel, unit, code, i]) => ({ titel, unit, code, i, k: searchKeyLat(titel), ka: searchKeyAr(titel) })),
    lessen: idx.lessen.map(([titel, thema, unit, code, type]) => ({ titel, thema, unit, code, type, k: searchKeyLat(`${code} ${titel} ${thema}`) })),
    werkwoorden: idx.werkwoorden.map(([a, t, nl, id, soort]) => ({ a, t, nl, id, soort, ka: searchKeyAr(a), kt: searchKeyLat(t), kn: searchKeyLat(nl) })),
  };
  return prepared;
}

/** 3 = exact, 2 = begint ermee (of heel woord), 1 = komt erin voor, 0 = geen treffer. */
function rank(hay, q) {
  if (!hay || !q) return 0;
  if (hay === q) return 3;
  if (hay.startsWith(q)) return 2;
  const i = hay.indexOf(q);
  if (i < 0) return 0;
  return /[\s·,;(/]/.test(hay[i - 1]) ? 2 : 1;
}

function search(data, raw) {
  const arabic = isArabic(raw);
  const q = arabic ? searchKeyAr(raw) : searchKeyLat(raw);
  if (!q) return null;
  const pick = (list, score, max) => list
    .map((x) => [score(x), x]).filter(([s]) => s > 0)
    .sort((a, b) => b[0] - a[0]).slice(0, max).map(([, x]) => x);
  const wordScore = (w) => (arabic ? rank(w.ka, q) : Math.max(rank(w.kt, q), rank(w.kn, q)));
  return {
    q, arabic,
    woorden: pick(data.woorden, wordScore, MAX.woorden),
    werkwoorden: pick(data.werkwoorden, wordScore, MAX.werkwoorden),
    grammatica: pick(data.grammatica, (g) => (arabic ? rank(g.ka, q) : rank(g.k, q)), MAX.grammatica),
    lessen: arabic ? [] : pick(data.lessen, (l) => rank(l.k, q), MAX.lessen),
    totaalWoorden: data.woorden.filter((w) => wordScore(w) > 0).length,
  };
}

export async function renderSearch(main, [term = '']) {
  const data = await prepare();
  const initial = decodeURIComponent(term);

  const input = h('input', {
    type: 'search', value: initial, dir: 'auto', autocomplete: 'off', spellcheck: 'false',
    placeholder: 'Zoek in het Arabisch, de transliteratie of het Nederlands…', 'aria-label': 'Zoekterm',
  });
  const kbBtn = h('button.icon-btn', { type: 'button', title: 'Arabisch toetsenbord', 'aria-label': 'Arabisch toetsenbord', onmousedown: (e) => e.preventDefault(), onclick: () => keyboard.toggle(input) }, icon('kbd'));
  const field = h('div.answer-field.search-field', icon('search'), input, kbBtn);
  const results = h('div');

  main.replaceChildren(
    h('div.page-head', h('h1', 'Zoeken'),
      h('p', `Woordenboek van de hele cursus: ${data.woorden.length} woorden, ${data.grammatica.length} grammaticaonderwerpen, ${data.lessen.length} eenheden en ${data.werkwoorden.length} werkwoorden.`)),
    h('section.panel.glass', { style: { marginBottom: '18px' } }, field),
    results);
  requestAnimationFrame(() => lightPart('woordenschat', results));

  let timer = null;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Zoekterm in de adresbalk zonder de pagina opnieuw op te bouwen.
      history.replaceState(null, '', '#/zoeken/' + encodeURIComponent(input.value.trim()));
      show();
    }, 150);
  });

  function show() {
    const r = search(data, input.value);
    if (!r) {
      results.replaceChildren(h('section.panel.glass', h('div.empty',
        h('p', 'Typ een woord om te zoeken. Voorbeelden:'),
        h('div.btn-row', { style: { justifyContent: 'center' } },
          ['كتاب', 'kitāb', 'huis', 'iḍāfa', 'gebiedende wijs'].map((v) =>
            h('button.btn.btn--ghost.btn--small', { type: 'button', onclick: () => { input.value = v; input.dispatchEvent(new Event('input')); } }, isArabic(v) ? ar(v) : v))))));
      return;
    }
    const sections = [];
    if (r.woorden.length) {
      sections.push(h('section.panel.glass',
        h('h2', r.totaalWoorden > r.woorden.length ? `Woorden (${r.woorden.length} van ${r.totaalWoorden})` : `Woorden (${r.woorden.length})`),
        h('ul.list.rows', r.woorden.map(wordRow))));
    }
    if (r.werkwoorden.length) {
      sections.push(h('section.panel.glass',
        h('h2', `In de vervoegingstrainer (${r.werkwoorden.length})`),
        h('ul.list.rows', r.werkwoorden.map((v) => h('li.kv',
          h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, ar(v.a), tr(v.t)),
          h('span.soft', `${v.nl} · ${v.soort}`),
          h('a.btn.btn--ghost.btn--small', { href: '#/trainer/' + v.id }, icon('verb'), 'Oefenen'))))));
    }
    if (r.grammatica.length) {
      sections.push(h('section.panel.glass',
        h('h2', `Grammatica (${r.grammatica.length})`),
        h('ul.list.rows', r.grammatica.map((g) => h('li',
          h('a.result-link', { href: `#/les/${g.unit}/grammatica/${g.i}` },
            h('span.code', g.code), h('span', { html: bidi(g.titel) })))))));
    }
    if (r.lessen.length) {
      sections.push(h('section.panel.glass',
        h('h2', `Lessen (${r.lessen.length})`),
        h('ul.list.rows', r.lessen.map((l) => h('li',
          h('a.result-link', { href: `#/les/${l.unit}` },
            h('span.code', l.code), h('span', h('b', l.titel), l.thema ? h('span.soft', { html: ' · ' + rich(l.thema) }) : null)))))));
    }
    results.replaceChildren(...(sections.length ? sections
      : [h('section.panel.glass', h('div.empty', h('p', 'Niets gevonden voor ', h('b', input.value.trim()), '.'),
        h('p.small', r.arabic ? 'Zoek eventueel op een deel van het woord of zonder lidwoord (ال).' : 'Probeer een ander woord, of zoek in het Arabisch of de transliteratie.')))]));
  }

  show();
  input.focus();
}

function wordRow(w) {
  return h('li.word-row.row-hit',
    playButton(w.a),
    h('div', { style: { textAlign: 'right' } }, ar(w.a, 'lg'), h('div', tr(w.t))),
    h('div.nl-wrap',
      h('span.nl', w.nl),
      h('a.note', { href: `#/les/${w.unit}/woorden/${w.id}` }, `${w.code} · ${w.soort}`)),
    h('div', w.review ? reviewFlag({ note: 'Zie de controlelijst' }) : ''));
}

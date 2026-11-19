// Speelt een reeks oefen-items af. Twee modi:
// - 'oefen': na elke vraag directe feedback met het juiste antwoord en de uitleg.
// - 'toets': geen tussentijdse feedback; na afloop een overzicht met score per onderdeel.
// Elk oefentype is een module met render(item, ctx) -> { el, ready(), check(), focus?(), autoSubmit? }.

import { h, icon, rich } from '../core/util.js';
import { isArabic } from '../core/arabic.js';
import { store } from '../core/store.js';
import { lapseWord } from '../core/srs.js';
import { ar, meter } from '../ui/components.js';
import { flash } from '../ui/world.js';
import * as meerkeuze from './choice.js';
import * as luisteren from './listen.js';
import * as invullen from './fill.js';
import * as vertalen from './translate.js';
import * as vervoegen from './conjugate.js';
import * as koppelen from './match.js';
import * as ordenen from './order.js';
import * as schrijven from './write.js';

export const TYPES = { meerkeuze, luisteren, invullen, vertalen, vervoegen, koppelen, ordenen, schrijven };

export const TYPE_LABELS = {
  meerkeuze: 'Meerkeuze',
  luisteren: 'Luisteren',
  invullen: 'Invullen',
  vertalen: 'Vertalen',
  vervoegen: 'Vervoegen',
  koppelen: 'Koppelen',
  ordenen: 'Zin ordenen',
  schrijven: 'Schrijven',
};

export function typeLabel(item) {
  if (item.type === 'vertalen') return item.richting === 'nl-ar' ? 'Vertalen NL → AR' : 'Vertalen AR → NL';
  if (item.type === 'schrijven' && item.modus === 'spreken') return 'Spreken';
  return TYPE_LABELS[item.type] || item.type;
}

/** Toon een tekst als Arabisch als hij Arabische letters bevat. */
export function smart(text) {
  return isArabic(text) ? ar(text) : h('span', text);
}

/**
 * @param {HTMLElement} host
 * @param {object[]} items
 * @param {{mode: 'oefen'|'toets', lessonId?: string, dialect?: string, onDone: (results) => void, onStep?: () => void}} opts
 * Items uit verschillende lessen (herhalen) dragen zelf `_lesId` en `_dialect`; die gaan voor opts.
 */
export function runExercises(host, items, opts) {
  const results = [];
  let index = 0;
  const mode = opts.mode || 'oefen';

  const bar = meter(0, mode === 'toets' ? 'var(--part-toets)' : 'var(--part-oefenen)');
  const count = h('span');
  const stage = h('div');
  host.replaceChildren(h('div.ex-progress', bar, count), stage);

  function show() {
    const item = items[index];
    const mod = TYPES[item.type];
    count.textContent = `${index + 1} / ${items.length}`;
    bar.style.setProperty('--v', index / items.length);
    if (!mod) {
      stage.replaceChildren(h('p', `Onbekend oefentype: ${item.type}`));
      return;
    }

    let view;
    let checked = false;
    const primary = h('button.btn', { type: 'button', disabled: true });
    const feedback = h('div');
    const ctx = {
      mode,
      dialect: item._dialect ?? opts.dialect,
      strict: store.settings.strengHarakat,
      onReady: (auto) => {
        primary.disabled = !view.ready();
        if (auto && view.autoSubmit && !checked) submit();
      },
      submit: () => { if (!primary.disabled) primary.click(); },
    };
    view = mod.render(item, ctx);

    function submit() {
      if (checked) return next();
      checked = true;
      const res = view.check();
      results.push({ item, ...res });
      store.recordAnswer(mode === 'oefen' ? (item._lesId ?? opts.lessonId) : null, item.tag, res.ok);
      if (!res.ok && mode === 'oefen' && item.woord) lapseWord(item.woord);
      if (mode === 'toets') return next();
      flash(res.ok);
      feedback.replaceChildren(renderFeedback(item, res));
      primary.replaceChildren(index + 1 < items.length ? 'Volgende' : 'Afronden', icon('arrow'));
      primary.disabled = false;
      primary.focus({ preventScroll: true });
    }
    function next() {
      index++;
      if (index < items.length) show();
      else finish();
    }

    primary.addEventListener('click', submit);
    primary.replaceChildren(mode === 'toets' ? (index + 1 < items.length ? 'Volgende vraag' : 'Toets inleveren') : 'Controleer');

    stage.replaceChildren(
      h('div.ex-type', typeLabel(item)),
      view.el,
      feedback,
      h('div.ex-actions', h('span'), primary));
    view.focus?.();
    opts.onStep?.();
  }

  function finish() {
    bar.style.setProperty('--v', 1);
    count.textContent = `${items.length} / ${items.length}`;
    opts.onDone(results, stage);
  }

  show();
}

export function renderFeedback(item, res) {
  const box = h('div.feedback' + (res.ok ? '.is-good' : '.is-bad'), { role: 'status' });
  box.append(h('div.title', res.ok ? 'Goed!' : 'Niet goed'));
  // Bij zelfbeoordeling is de samenvatting (aantal afgevinkte punten) ook bij een voldoende nuttig.
  if (res.ok && item.type === 'schrijven' && res.samenvatting) box.append(h('p', res.samenvatting));
  if (!res.ok) {
    if (res.samenvatting) box.append(h('p', res.samenvatting));
    if (!['koppelen', 'vervoegen', 'schrijven'].includes(item.type)) {
      box.append(h('p', 'Juist antwoord: ', smart(res.juist)));
      if (res.gegeven) box.append(h('p.soft', 'Jouw antwoord: ', smart(res.gegeven)));
    }
    if (res.hint) box.append(h('p', res.hint));
  }
  if (res.gehoord) box.append(h('p.soft', 'Je hoorde: ', ar(res.gehoord)));
  if (item.uitleg) box.append(h('p', { html: rich(item.uitleg) }));
  return box;
}

/** Score met gedeeltelijke punten voor vervoegingen. */
export function score(results) {
  const points = results.reduce((s, r) => s + (r.ok ? 1 : r.deels || 0), 0);
  return { points: Math.round(points * 10) / 10, max: results.length, pct: results.length ? points / results.length : 0 };
}


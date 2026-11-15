// Koppelen. Item: { type: 'koppelen', paren: [{ ar, nl, woord? }], uitleg }
// Tik een Arabisch woord en daarna de vertaling. De oefening is goed als er geen foute koppeling was.

import { h, shuffle } from '../core/util.js';
import { lapseWord } from '../core/srs.js';
import { ar } from '../ui/components.js';

export function render(item, ctx) {
  const pairs = item.paren;
  let selected = null; // index in pairs (Arabische kant)
  let mistakes = 0;
  let done = 0;
  const wrongWords = new Set();

  const left = shuffle(pairs.map((_, i) => i)).map((i) =>
    h('button.choice', { type: 'button', dataset: { i }, onclick: () => pickLeft(i) }, ar(pairs[i].ar)));
  const right = shuffle(pairs.map((_, i) => i)).map((i) =>
    h('button.choice', { type: 'button', dataset: { i }, onclick: () => pickRight(i) }, pairs[i].nl));
  const byIndex = (list, i) => list.find((b) => Number(b.dataset.i) === i);

  function pickLeft(i) {
    left.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    byIndex(left, i).setAttribute('aria-pressed', 'true');
    selected = i;
  }
  function pickRight(i) {
    if (selected === null) return;
    const l = byIndex(left, selected);
    const r = byIndex(right, i);
    if (i === selected) {
      [l, r].forEach((b) => { b.disabled = true; b.classList.add('is-done'); b.setAttribute('aria-pressed', 'false'); });
      done++;
      selected = null;
      if (done === pairs.length) ctx.onReady?.(true);
    } else {
      mistakes++;
      if (pairs[selected].woord) wrongWords.add(pairs[selected].woord);
      r.classList.add('is-bad');
      setTimeout(() => r.classList.remove('is-bad'), 500);
    }
  }

  const el = h('div',
    h('p.ex-q', item.vraag || 'Koppel elk Arabisch woord aan de juiste vertaling.'),
    h('div.match', h('div.col', left), h('div.col', right)));

  return {
    el,
    autoSubmit: true,
    ready: () => done === pairs.length,
    check() {
      if (ctx.mode !== 'toets') wrongWords.forEach(lapseWord);
      return {
        ok: mistakes === 0,
        gegeven: mistakes ? `${mistakes} foute koppeling${mistakes > 1 ? 'en' : ''}` : 'alles in één keer goed',
        juist: pairs.map((p) => `${p.ar} = ${p.nl}`).join(' · '),
        samenvatting: mistakes ? `${mistakes} keer fout gekoppeld` : null,
      };
    },
  };
}

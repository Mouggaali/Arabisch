// Meerkeuze. Item: { type: 'meerkeuze', vraag, ar?, tr?, opties: [...], juist: index, uitleg }
// Opties in het Arabisch worden automatisch als Arabisch weergegeven.

import { h, shuffle, rich } from '../core/util.js';
import { isArabic } from '../core/arabic.js';
import { ar, prompt } from '../ui/components.js';

export function optionLabel(text) {
  return isArabic(text) ? ar(text) : h('span', text);
}

/** Gedeelde knoppenlijst, ook gebruikt door de luisteroefening. */
export function choiceList(item, onPick) {
  let picked = null;
  const order = shuffle(item.opties.map((_, i) => i));
  const buttons = order.map((i) =>
    h('button.choice', {
      type: 'button', 'aria-pressed': 'false', dataset: { i },
      onclick: (e) => {
        buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
        e.currentTarget.setAttribute('aria-pressed', 'true');
        picked = i;
        onPick?.(i);
      },
    }, optionLabel(item.opties[i])));
  return {
    el: h('div.choices', buttons),
    get picked() { return picked; },
    reveal(showFeedback) {
      buttons.forEach((b) => {
        b.disabled = true;
        if (!showFeedback) return;
        const i = Number(b.dataset.i);
        if (i === item.juist) b.classList.add('is-good');
        else if (i === picked) b.classList.add('is-bad');
      });
    },
  };
}

export function render(item, ctx) {
  const list = choiceList(item, () => ctx.onReady?.());
  const el = h('div',
    h('p.ex-q', { html: rich(item.vraag) }),
    item.ar ? prompt({ ar: item.ar, tr: item.tr, dialect: ctx.dialect }) : null,
    list.el);
  return {
    el,
    ready: () => list.picked !== null,
    check() {
      const ok = list.picked === item.juist;
      list.reveal(ctx.mode !== 'toets');
      return { ok, gegeven: item.opties[list.picked] ?? '', juist: item.opties[item.juist] };
    },
  };
}

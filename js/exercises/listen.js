// Luisteren. Item: { type: 'luisteren', vraag, tekst (Arabisch, wordt uitgesproken), opties, juist, uitleg }
// Zonder Arabische stem kan de tekst getoond worden; dat telt dan als leesoefening.

import { h, icon, rich } from '../core/util.js';
import { speech } from '../core/speech.js';
import { ar } from '../ui/components.js';
import { choiceList } from './choice.js';

export function render(item, ctx) {
  const list = choiceList(item, () => ctx.onReady?.());
  const shown = h('div.ex-prompt.hidden', ar(item.tekst, 'lg'));
  const big = h('button.btn', { type: 'button', onclick: () => play() }, icon('sound'), 'Beluister');
  const slow = h('button.btn.btn--ghost.btn--small', { type: 'button', onclick: () => play(0.55) }, 'Langzaam');
  const fallback = h('button.btn.btn--ghost.btn--small', {
    type: 'button',
    onclick: () => { shown.classList.remove('hidden'); fallback.remove(); },
  }, icon('eye'), 'Toon tekst');

  function play(rate) {
    speech.speak(item.tekst, { dialect: ctx.dialect, rate });
  }

  const noVoice = !speech.available;
  if (noVoice) {
    big.disabled = true;
    slow.disabled = true;
  }

  const el = h('div',
    h('p.ex-q', { html: rich(item.vraag || 'Wat hoor je?') }),
    h('div.btn-row', { style: { justifyContent: 'center', marginBottom: '16px' } }, big, slow, fallback),
    noVoice ? h('p.soft.small', { style: { textAlign: 'center' } }, 'Er is geen Arabische stem beschikbaar. Lees de tekst in plaats daarvan (zie Instellingen om een stem te installeren).') : null,
    shown,
    list.el);

  if (!noVoice) setTimeout(() => play(), 250);

  return {
    el,
    ready: () => list.picked !== null,
    check() {
      const ok = list.picked === item.juist;
      list.reveal(ctx.mode !== 'toets');
      shown.classList.remove('hidden');
      return { ok, gegeven: item.opties[list.picked] ?? '', juist: item.opties[item.juist], gehoord: item.tekst };
    },
  };
}

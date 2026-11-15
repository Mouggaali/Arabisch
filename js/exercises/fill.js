// Invullen. Item: { type: 'invullen', zin: 'كَيْفَ ___؟', nl, tr?, antwoord: [...], woordbank?: [...], uitleg }
// Met een woordbank kies je het woord; zonder typ je het (met schermtoetsenbord).

import { h, rich } from '../core/util.js';
import { checkArabic } from '../core/arabic.js';
import { tr, answerField } from '../ui/components.js';
import { choiceList } from './choice.js';

export function render(item, ctx) {
  const answers = Array.isArray(item.antwoord) ? item.antwoord : [item.antwoord];
  const [before, after] = item.zin.split('___');
  const gap = h('span.gap');
  const sentence = h('div.sentence', h('span.ar.ar--lg', { lang: 'ar', dir: 'rtl' }, before, gap, after));

  let field = null;
  let bank = null;
  if (item.woordbank) {
    const opties = item.woordbank;
    bank = choiceList({ opties, juist: opties.indexOf(answers[0]) }, (i) => {
      gap.textContent = opties[i];
      ctx.onReady?.();
    });
  } else {
    field = answerField({ onEnter: () => ctx.submit?.() });
    field.input.addEventListener('input', () => {
      gap.textContent = field.input.value;
      ctx.onReady?.();
    });
  }

  const el = h('div',
    h('p.ex-q', { html: rich(item.vraag || 'Vul het ontbrekende woord in.') }),
    sentence,
    item.tr ? h('div', { style: { textAlign: 'center' } }, tr(item.tr)) : null,
    item.nl ? h('p.soft', { style: { textAlign: 'center', marginTop: '4px' } }, item.nl) : null,
    h('div', { style: { marginTop: '14px' } }, bank ? bank.el : field.el));

  return {
    el,
    focus: () => field?.input.focus(),
    ready: () => (bank ? bank.picked !== null : field.input.value.trim().length > 0),
    check() {
      if (bank) {
        const given = item.woordbank[bank.picked];
        const res = checkArabic(given, answers, { strict: true });
        bank.reveal(ctx.mode !== 'toets');
        return { ok: res.ok, gegeven: given, juist: answers[0] };
      }
      const res = checkArabic(field.input.value, answers, { strict: item.streng ?? ctx.strict, final: item.eind });
      field.input.disabled = true;
      if (ctx.mode !== 'toets') field.el.classList.add(res.ok ? 'is-good' : 'is-bad');
      return { ok: res.ok, gegeven: field.input.value, juist: res.match, hint: res.hint };
    },
  };
}


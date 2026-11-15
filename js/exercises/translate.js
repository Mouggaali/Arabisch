// Vertalen. Item: { type: 'vertalen', richting: 'nl-ar' | 'ar-nl', bron, tr?, antwoorden: [...], uitleg }
// nl-ar: Arabisch typen (zonder harakat goedgekeurd, tenzij streng); ar-nl: Nederlands typen.

import { h } from '../core/util.js';
import { checkArabic, checkDutch } from '../core/arabic.js';
import { answerField, prompt } from '../ui/components.js';

export function render(item, ctx) {
  const toArabic = item.richting === 'nl-ar';
  const field = answerField({
    arabic: toArabic,
    placeholder: toArabic ? '' : 'Typ de Nederlandse vertaling',
    onEnter: () => ctx.submit?.(),
  });
  field.input.addEventListener('input', () => ctx.onReady?.());

  const el = h('div',
    h('p.ex-q', toArabic ? 'Vertaal naar het Arabisch.' : 'Vertaal naar het Nederlands.'),
    toArabic
      ? h('div.ex-prompt', h('div', { style: { fontSize: '1.4rem', fontWeight: 600 } }, item.bron), item.hint ? h('p.soft.small', item.hint) : null)
      : prompt({ ar: item.bron, tr: item.tr, dialect: ctx.dialect }),
    field.el);

  return {
    el,
    focus: () => field.input.focus(),
    ready: () => field.input.value.trim().length > 0,
    check() {
      const res = toArabic
        ? checkArabic(field.input.value, item.antwoorden, { strict: item.streng ?? ctx.strict, final: item.eind })
        : checkDutch(field.input.value, item.antwoorden);
      field.input.disabled = true;
      if (ctx.mode !== 'toets') field.el.classList.add(res.ok ? 'is-good' : 'is-bad');
      return { ok: res.ok, gegeven: field.input.value, juist: res.match, hint: res.hint || null };
    },
  };
}

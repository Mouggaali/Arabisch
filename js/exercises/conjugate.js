// Vervoegen / verbuigen: een tabel invullen, één vorm per persoon.
// Item (vaste vormen):  { type: 'vervoegen', instructie, rijen: [{ label, ar?, antwoord, tr? }], eind?, streng?, uitleg }
//   eind: true = ook de eindklinker moet kloppen (voor vormen als حالُكَ / حالُكِ); per rij te overschrijven met rijen[i].eind.
// Item (werkwoord):     { type: 'vervoegen', werkwoord: <object uit werkwoorden.json>, tijd: 'madi'|'mudari', personen?: [...ids] }
//   Een vorm uit een expliciete tabel mag een lijst alt hebben: spellingvarianten die ook goed zijn (قَرَؤوا ~ قَرَأُوا).
// Een rij is goed als de letters kloppen; met "streng op harakat" ook de klinkertekens.

import { h, bidi } from '../core/util.js';
import { checkArabic } from '../core/arabic.js';
import { conjugate, TENSES } from '../core/conjugate.js';
import { ar, tr, answerField } from '../ui/components.js';

export function rowsFor(item) {
  if (!item.werkwoord) return item.rijen;
  const forms = conjugate(item.werkwoord, item.tijd);
  return forms
    .filter((f) => f.ar && (!item.personen || item.personen.includes(f.person.id)))
    .map((f) => ({ label: f.person.nl, ar: f.person.ar, antwoord: f.ar, alt: f.alt, tr: f.tr }));
}

export function render(item, ctx) {
  const rows = rowsFor(item);
  const fields = rows.map(() => answerField({ onEnter: () => ctx.submit?.() }));
  const fixes = rows.map(() => h('div.fix.hidden'));
  fields.forEach((f) => f.input.addEventListener('input', () => ctx.onReady?.()));

  const title = item.werkwoord
    ? `Vervoeg ${item.werkwoord.nl} in de ${TENSES[item.tijd].naam.toLowerCase()}.`
    : item.instructie || 'Vul de juiste vorm in.';

  const el = h('div',
    h('p.ex-q', title),
    item.werkwoord ? h('div.ex-prompt', ar(item.werkwoord.ar, 'lg'), h('div', tr(item.werkwoord.tr))) : null,
    h('div.conj-grid', rows.map((r, i) =>
      h('div.row',
        h('div.who', h('b', { html: bidi(r.label) }), r.ar ? ar(r.ar) : null),
        fields[i].el,
        fixes[i]))));

  return {
    el,
    focus: () => fields[0]?.input.focus(),
    ready: () => fields.every((f) => f.input.value.trim().length > 0),
    check() {
      let good = 0;
      const wrong = [];
      rows.forEach((r, i) => {
        const res = checkArabic(fields[i].input.value, [r.antwoord, ...(r.alt || [])], { strict: item.streng ?? ctx.strict, final: r.eind ?? item.eind });
        fields[i].input.disabled = true;
        if (res.ok) good++;
        else wrong.push(r);
        if (ctx.mode !== 'toets') {
          fields[i].el.classList.add(res.ok ? 'is-good' : 'is-bad');
          if (!res.ok) {
            fixes[i].classList.remove('hidden');
            fixes[i].append('Juist: ', ar(r.antwoord), r.tr ? tr(' ' + r.tr) : null, res.hint ? h('span.soft', ' · ' + res.hint) : null);
          }
        }
      });
      return {
        ok: good === rows.length,
        deels: good / rows.length,
        gegeven: fields.map((f) => f.input.value).join(' · '),
        juist: rows.map((r) => r.antwoord).join(' · '),
        samenvatting: `${good} van ${rows.length} vormen goed`,
      };
    },
  };
}

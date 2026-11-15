// Schrijven of spreken met zelfbeoordeling. Er is geen automatisch nakijken:
// de leerling maakt de opdracht, bekijkt daarna het modelantwoord en vinkt de checklist af.
// Item: { type: 'schrijven', modus?: 'schrijven'|'spreken', opdracht, woorden?: [...], minimum?: aantal woorden,
//         model: [{ ar, tr, nl }], checklist: ['…', …], uitleg }
// Goed = minstens 70% van de checklist afgevinkt; de score telt het aandeel afgevinkte punten.

import { h, rich } from '../core/util.js';
import { ar, tr, playButton, textArea } from '../ui/components.js';

const DREMPEL = 0.7;

/** Aantal woorden in een (Arabische of Nederlandse) tekst. */
export function countWords(text) {
  return text.trim().split(/\s+/).filter((w) => /[\p{L}]/u.test(w)).length;
}

export function render(item, ctx) {
  const spreken = item.modus === 'spreken';
  const min = item.minimum || 0;
  let revealed = false;

  const area = spreken ? null : textArea({ placeholder: 'Schrijf hier je tekst…' });
  const counter = h('p.soft.small', { style: { margin: '6px 0 0' } });
  const updateCount = () => {
    const n = countWords(area.input.value);
    counter.textContent = min ? `${n} woorden (minimaal ${min})` : `${n} woorden`;
  };
  if (area) { area.input.addEventListener('input', updateCount); updateCount(); }

  const boxes = (item.checklist || []).map((punt) => h('input', { type: 'checkbox' }));
  const checklist = h('div.checklist', (item.checklist || []).map((punt, i) =>
    h('label', boxes[i], h('span', { html: rich(punt) }))));

  const model = h('div.model',
    h('h3', 'Modelantwoord'),
    (item.model || []).map((m) => h('div.model-line',
      m.ar ? h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, ar(m.ar), playButton(m.ar, { dialect: ctx.dialect })) : null,
      m.tr ? h('div', tr(m.tr)) : null,
      m.nl ? h('div.soft', { html: rich(m.nl) }) : null)));

  const after = h('div.hidden',
    model,
    h('h3', 'Controleer jezelf'),
    h('p.soft.small', 'Vink aan wat in jouw tekst of antwoord klopt. Wees eerlijk: zo zie je waar je nog op moet letten.'),
    checklist);

  const revealBtn = h('button.btn.btn--ghost', {
    type: 'button',
    onclick: () => {
      if (area && !area.input.value.trim()) { area.input.focus(); return; }
      revealed = true;
      after.classList.remove('hidden');
      revealBtn.remove();
      if (area) area.input.readOnly = true;
      ctx.onReady?.();
    },
  }, spreken ? 'Ik heb het hardop gezegd' : 'Klaar: toon het modelantwoord');

  const copyBtn = area
    ? h('button.btn.btn--ghost.btn--small', { type: 'button', onclick: () => navigator.clipboard?.writeText(area.input.value) }, 'Kopieer mijn tekst')
    : null;

  const el = h('div',
    h('p.ex-q', { html: rich(item.opdracht) }),
    item.woorden?.length ? h('div.inset', { style: { marginBottom: '12px' } },
      h('p.soft.small', { style: { margin: '0 0 6px' } }, 'Gebruik bijvoorbeeld:'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 16px' } }, item.woorden.map((w) => ar(w)))) : null,
    spreken ? h('p.soft', 'Zeg je antwoord hardop, het liefst in één keer zonder te stoppen. Neem jezelf eventueel op met je telefoon.') : null,
    area ? area.el : null,
    area ? counter : null,
    h('div.btn-row', { style: { marginTop: '12px' } }, revealBtn, copyBtn),
    after);

  return {
    el,
    focus: () => area?.input.focus(),
    ready: () => revealed,
    check() {
      const n = boxes.filter((b) => b.checked).length;
      boxes.forEach((b) => { b.disabled = true; });
      const total = Math.max(1, boxes.length);
      const fractie = n / total;
      const kort = area && min && countWords(area.input.value) < min ? ` Je tekst is korter dan ${min} woorden.` : '';
      return {
        ok: fractie >= DREMPEL,
        deels: fractie,
        gegeven: area ? area.input.value : '',
        juist: '',
        samenvatting: `Je vinkte ${n} van de ${boxes.length} punten af.${kort}`,
      };
    },
  };
}

// Flashcards met SM-2. Richting: Arabisch → Nederlands (herkennen) of Nederlands → Arabisch (actief).

import { h, icon } from '../core/util.js';
import { store } from '../core/store.js';
import { dueToday, grade, preview, GRADES, allCards } from '../core/srs.js';
import { speech } from '../core/speech.js';
import { ar, tr, playButton } from '../ui/components.js';
import { lightPart } from '../ui/world.js';

let direction = 'ar-nl';

export function renderFlashcards(main) {
  const queue = dueToday();
  let flipped = false;
  let done = 0;

  const dirSeg = h('div.segment.glass', { role: 'tablist', 'aria-label': 'Richting' },
    [['ar-nl', 'Arabisch → Nederlands'], ['nl-ar', 'Nederlands → Arabisch']].map(([k, label]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(direction === k), onclick: () => { direction = k; renderFlashcards(main); } }, label)));

  const stageEl = h('div.card-stage');
  const panel = h('section.panel.glass', stageEl);
  const counter = h('span.soft');

  main.replaceChildren(
    h('div.page-head', h('h1', 'Flashcards'),
      h('p', 'Woorden uit alle lessen die je geopend hebt komen hier terug. Wat je moeilijk vindt, zie je vaker; wat je goed kent, steeds minder vaak (SM-2).')),
    h('div.btn-row', { style: { justifyContent: 'space-between', marginBottom: '14px' } }, dirSeg, counter),
    panel);

  requestAnimationFrame(() => lightPart('woorden', panel));

  function update() {
    counter.textContent = queue.length ? `${done} gedaan · nog ${queue.length}` : '';
  }

  function show() {
    update();
    const card = queue[0];
    if (!card) return finished();
    flipped = false;
    const front = direction === 'ar-nl'
      ? h('div', ar(card.ar, 'xl'), h('div', { style: { marginTop: '10px', display: 'flex', justifyContent: 'center' } }, playButton(card.ar, { dialect: card.dialect })))
      : h('div', h('div', { style: { fontSize: '1.8rem', fontWeight: 600 } }, card.nl.join(' · ')));
    const back = h('div.card-back.hidden',
      direction === 'ar-nl'
        ? h('div', h('div.nl', card.nl.join(' · ')), h('div', tr(card.tr)))
        : h('div', ar(card.ar, 'xl'), h('div', tr(card.tr)), h('div', { style: { marginTop: '10px', display: 'flex', justifyContent: 'center' } }, playButton(card.ar, { dialect: card.dialect }))));
    const labels = preview(card);
    const grades = h('div.grade-row.hidden',
      gradeBtn('again', 'Opnieuw', labels.opnieuw, GRADES.opnieuw, '1'),
      gradeBtn('hard', 'Moeilijk', labels.moeilijk, GRADES.moeilijk, '2'),
      gradeBtn('good', 'Goed', labels.goed, GRADES.goed, '3'),
      gradeBtn('easy', 'Makkelijk', labels.makkelijk, GRADES.makkelijk, '4'));
    const flipBtn = h('button.btn', { type: 'button', onclick: flip }, 'Toon antwoord');

    function flip() {
      flipped = true;
      back.classList.remove('hidden');
      grades.classList.remove('hidden');
      flipBtn.remove();
      if (direction === 'nl-ar') speech.speak(card.ar, { dialect: card.dialect });
      grades.querySelector('.good').focus({ preventScroll: true });
    }
    function gradeBtn(cls, label, sub, q, key) {
      return h('button.btn.' + cls, { type: 'button', 'aria-keyshortcuts': key, onclick: () => answer(q) }, label, h('small', sub));
    }
    function answer(q) {
      const wasNew = card.isNew;
      store.putCard(card.id, grade(card, q));
      if (wasNew) store.countDay('nieuw');
      store.countDay('kaarten');
      queue.shift();
      if (q < 3) queue.splice(Math.min(queue.length, 3), 0, store.card(card.id)); // komt na een paar kaarten terug
      done++;
      show();
    }
    stageEl.replaceChildren(h('div', h('div.soft.small', { style: { marginBottom: '10px' } }, card.isNew ? 'Nieuw woord' : `Les ${card.lesCode}`), front, back, h('div', { style: { marginTop: '18px' } }, flipBtn), grades));
    stageEl.onkeydown = null;
    keyHandler = (e) => {
      if (e.target.matches?.('input, textarea, select')) return;
      if (!flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); flip(); }
      else if (flipped && ['1', '2', '3', '4'].includes(e.key)) answer([GRADES.opnieuw, GRADES.moeilijk, GRADES.goed, GRADES.makkelijk][Number(e.key) - 1]);
    };
  }

  function finished() {
    keyHandler = null;
    const total = allCards().length;
    stageEl.replaceChildren(h('div',
      h('div', { style: { fontSize: '1.4rem', fontWeight: 650 } }, done ? 'Klaar voor vandaag' : total ? 'Niets te herhalen' : 'Nog geen kaarten'),
      h('p.soft', total
        ? 'Je volgende herhalingen staan voor de komende dagen klaar. Kom morgen terug.'
        : 'Open de woordenschat van een les; de woorden worden dan automatisch flashcards.'),
      h('a.btn.btn--ghost', { href: total ? '#/vandaag' : '#/lessen' }, total ? 'Naar Vandaag' : 'Naar de lessen', icon('arrow'))));
  }

  show();
}

let keyHandler = null;
document.addEventListener('keydown', (e) => {
  if (location.hash.startsWith('#/kaarten')) keyHandler?.(e);
});

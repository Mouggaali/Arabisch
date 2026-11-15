// Zinnen ordenen. Item: { type: 'ordenen', woorden: [... in de juiste volgorde], nl, uitleg, ook?: [[alternatieve volgorde], ...] }
// Tik de woorden in de juiste volgorde; de zin loopt van rechts naar links.

import { h, shuffle } from '../core/util.js';
import { stripMarks } from '../core/arabic.js';

export function render(item, ctx) {
  const words = item.woorden;
  let order = shuffle(words.map((_, i) => i));
  // Nooit al in de goede volgorde beginnen.
  if (words.length > 1 && order.every((v, i) => v === i)) order = order.reverse();
  const chosen = [];
  const target = h('div.tiles.tiles--target', { 'aria-label': 'Jouw zin' });
  const pool = h('div.tiles', { 'aria-label': 'Woorden' });

  const tiles = order.map((i) => {
    const t = h('button.tile', { type: 'button', lang: 'ar', onclick: () => add(i, t) }, words[i]);
    return t;
  });
  pool.append(...tiles);

  function add(i, tile) {
    tile.disabled = true;
    const placed = h('button.tile', { type: 'button', lang: 'ar', title: 'Terugzetten', onclick: () => remove(i, tile, placed) }, words[i]);
    chosen.push(i);
    target.appendChild(placed);
    ctx.onReady?.();
  }
  function remove(i, tile, placed) {
    if (locked) return;
    chosen.splice(chosen.indexOf(i), 1);
    placed.remove();
    tile.disabled = false;
    ctx.onReady?.();
  }

  let locked = false;
  const sentence = (idx) => idx.map((i) => words[i]).join(' ');
  const el = h('div',
    h('p.ex-q', 'Zet de woorden in de juiste volgorde.'),
    item.nl ? h('p', { style: { textAlign: 'center', fontWeight: 600 } }, item.nl) : null,
    target,
    h('div', { style: { height: '10px' } }),
    pool);

  return {
    el,
    ready: () => chosen.length === words.length,
    check() {
      locked = true;
      tiles.forEach((t) => (t.disabled = true));
      const given = sentence(chosen);
      const okList = [words.join(' '), ...(item.ook || []).map((alt) => alt.join(' '))].map(stripMarks);
      const ok = okList.includes(stripMarks(given));
      if (ctx.mode !== 'toets') target.style.boxShadow = `0 0 0 2px var(${ok ? '--good' : '--bad'})`;
      return { ok, gegeven: given, juist: words.join(' ') };
    },
  };
}

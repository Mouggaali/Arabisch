// Arabisch schermtoetsenbord. Werkt op het laatst gefocuste veld met class "ar-input".
// Letters in alfabetische volgorde (abjad hijāʾī), daarna hamza-vormen, harakat en leestekens.

import { h } from '../core/util.js';

const LETTERS = 'ا ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي ة ى ء أ إ آ ؤ ئ'.split(' ');
const MARKS = [
  ['َ', 'fatḥa'], ['ُ', 'ḍamma'], ['ِ', 'kasra'], ['ْ', 'sukūn'], ['ّ', 'shadda'],
  ['ً', 'tanwīn fatḥ'], ['ٌ', 'tanwīn ḍamm'], ['ٍ', 'tanwīn kasr'],
];
const PUNCT = ['،', '؟'];

let target = null;
let panel = null;

document.addEventListener('focusin', (e) => {
  if (e.target.matches?.('.ar-input')) target = e.target;
});

function insert(text) {
  if (!target || !document.body.contains(target)) {
    target = document.querySelector('.ar-input:not([disabled])');
    if (!target) return;
  }
  if (target.disabled) return;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  target.setRangeText(text, start, end, 'end');
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.focus({ preventScroll: true });
}

function backspace() {
  if (!target) return;
  const s = target.selectionStart, e = target.selectionEnd;
  if (s !== e) target.setRangeText('', s, e, 'end');
  else if (s > 0) {
    // Een teken terug, ook als dat een losse harakat is.
    const chars = Array.from(target.value.slice(0, s));
    chars.pop();
    const before = chars.join('');
    target.value = before + target.value.slice(s);
    target.setSelectionRange(before.length, before.length);
  }
  target.dispatchEvent(new Event('input', { bubbles: true }));
  target.focus({ preventScroll: true });
}

function key(label, onPress, cls = '', title = '') {
  // mousedown voorkomt dat het invoerveld zijn focus verliest.
  return h('button' + (cls ? '.' + cls : ''), {
    type: 'button', title: title || label, 'aria-label': title || label,
    onmousedown: (e) => e.preventDefault(),
    onclick: onPress,
  }, label);
}

function build() {
  const keys = [
    ...LETTERS.map((l) => key(l, () => insert(l))),
    ...MARKS.map(([m, name]) => key('◌' + m, () => insert(m), 'mark', name)),
    ...PUNCT.map((p) => key(p, () => insert(p))),
    key('spatie', () => insert(' '), 'wide', 'Spatie'),
    key('⌫', backspace, 'wide', 'Wissen'),
    key('Enter ↵', () => target?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })), 'wide', 'Controleer (Enter)'),
  ];
  return h('div.kbd.glass', { role: 'dialog', 'aria-label': 'Arabisch toetsenbord' },
    h('div.kbd-head', h('span', 'Arabisch toetsenbord: tik een letter, daarna eventueel een klinkerteken'),
      h('button.icon-btn', { type: 'button', onclick: () => keyboard.close(), 'aria-label': 'Toetsenbord sluiten' }, 'Sluiten')),
    h('div.kbd-keys', keys));
}

export const keyboard = {
  get open() {
    return Boolean(panel);
  },
  toggle(forInput) {
    if (forInput) target = forInput;
    panel ? this.close() : this.show();
  },
  show() {
    if (panel) return;
    panel = build();
    document.body.appendChild(panel);
    document.body.classList.add('kbd-open');
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  },
  close() {
    panel?.remove();
    panel = null;
    document.body.classList.remove('kbd-open');
  },
};

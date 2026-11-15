// Herbruikbare UI-bouwstenen.

import { h, ar, tr, icon, rich } from '../core/util.js';
import { speech } from '../core/speech.js';
import { keyboard } from './keyboard.js';

/** Afspeelknop voor Arabische tekst. Uitgeschakeld (met uitleg) als er geen Arabische stem is. */
export function playButton(text, { dialect = 'fusha', label = 'Beluister' } = {}) {
  const btn = h('button.play', { type: 'button', 'aria-label': label, title: label }, icon('sound'));
  const sync = () => {
    btn.disabled = !speech.available;
    btn.title = speech.available ? label : 'Geen Arabische stem gevonden in deze browser (zie Instellingen)';
  };
  sync();
  speech.onVoices(sync);
  btn.addEventListener('click', () => {
    btn.classList.add('is-playing');
    const ok = speech.speak(text, { dialect, onend: () => btn.classList.remove('is-playing') });
    if (!ok) btn.classList.remove('is-playing');
  });
  return btn;
}

/** Markering voor inhoud die door een moedertaalspreker gecontroleerd moet worden. */
export function reviewFlag(review) {
  if (!review) return null;
  return h('span.flag', { title: 'Moedertaalcontrole: ' + (review.note || 'nog niet gecontroleerd') }, icon('flag'), 'controle');
}

export function meter(value, color, thin = false) {
  const m = h('div.meter' + (thin ? '.meter--thin' : ''), { role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(value * 100) }, h('i'));
  m.style.setProperty('--v', Math.max(0, Math.min(1, value)));
  if (color) m.style.setProperty('--c', color);
  return m;
}

/**
 * Invoerveld met knop voor het schermtoetsenbord.
 * @returns {{el: HTMLElement, input: HTMLInputElement}}
 */
export function answerField({ arabic = true, placeholder = '', onEnter } = {}) {
  const input = h('input' + (arabic ? '.ar-input' : ''), {
    type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    lang: arabic ? 'ar' : 'nl', dir: arabic ? 'rtl' : 'ltr', placeholder,
    'aria-label': arabic ? 'Antwoord in het Arabisch' : 'Antwoord in het Nederlands',
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onEnter?.(); }
  });
  const kbBtn = arabic
    ? h('button.icon-btn', { type: 'button', title: 'Arabisch toetsenbord', 'aria-label': 'Arabisch toetsenbord', onmousedown: (e) => e.preventDefault(), onclick: () => keyboard.toggle(input) }, icon('kbd'))
    : null;
  return { el: h('div.answer-field', input, kbBtn), input };
}

/**
 * Tekstvak voor langere teksten (schrijfopdrachten), met knop voor het schermtoetsenbord.
 * @returns {{el: HTMLElement, input: HTMLTextAreaElement}}
 */
export function textArea({ arabic = true, placeholder = '', rows = 6 } = {}) {
  const input = h('textarea' + (arabic ? '.ar-input' : ''), {
    rows, autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
    lang: arabic ? 'ar' : 'nl', dir: arabic ? 'rtl' : 'ltr', placeholder,
    'aria-label': arabic ? 'Jouw tekst in het Arabisch' : 'Jouw tekst',
  });
  const kbBtn = arabic
    ? h('button.icon-btn', { type: 'button', title: 'Arabisch toetsenbord', 'aria-label': 'Arabisch toetsenbord', onmousedown: (e) => e.preventDefault(), onclick: () => keyboard.toggle(input) }, icon('kbd'))
    : null;
  return { el: h('div.answer-field.answer-field--area', input, kbBtn), input };
}

/** Arabisch + transliteratie + Nederlands onder elkaar, gecentreerd (voor vraagteksten). */
export function prompt({ ar: a, tr: t, nl, size = 'lg', dialect }) {
  return h('div.ex-prompt',
    a ? h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' } }, ar(a, size), playButton(a, { dialect })) : null,
    t ? h('div', tr(t)) : null,
    nl ? h('div', { html: rich(nl) }) : null);
}

export { ar, tr, rich };

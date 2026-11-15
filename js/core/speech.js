// Uitspraak via de Web Speech API. Werkt alleen als de browser een Arabische stem heeft.

import { store } from './store.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voices = [];
const waiters = new Set();

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices().filter((v) => /^ar(-|_|$)/i.test(v.lang));
  waiters.forEach((fn) => fn(voices));
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

/** Voorkeur: gekozen stem, dan Standaard Arabisch (SA), dan Egypte, dan elke Arabische stem. */
function pickVoice(dialect) {
  const chosen = voices.find((v) => v.voiceURI === store.settings.stem);
  if (chosen && dialect !== 'darija') return chosen;
  const order = dialect === 'darija' ? ['ar-MA', 'ar-DZ', 'ar-TN', 'ar-SA'] : ['ar-SA', 'ar-001', 'ar-EG', 'ar-AE'];
  for (const lang of order) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase() === lang.toLowerCase());
    if (v) return v;
  }
  return chosen || voices[0] || null;
}

export const speech = {
  get supported() {
    return Boolean(synth);
  },
  get available() {
    return Boolean(synth) && voices.length > 0;
  },
  get voices() {
    return voices;
  },
  onVoices(fn) {
    waiters.add(fn);
    return () => waiters.delete(fn);
  },
  /** Spreek Arabische tekst uit. Geeft false terug als er geen stem is. */
  speak(text, { dialect = 'fusha', rate, onend } = {}) {
    if (!synth || !voices.length) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(dialect);
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    } else {
      u.lang = 'ar-SA';
    }
    u.rate = rate || store.settings.spraakSnelheid || 0.8;
    if (onend) {
      u.onend = onend;
      u.onerror = onend;
    }
    synth.speak(u);
    return true;
  },
  stop() {
    synth?.cancel();
  },
};

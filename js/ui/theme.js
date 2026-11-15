// Licht/donker volgens de instelling; 'auto' volgt het systeem (prefers-color-scheme).

import { store } from '../core/store.js';

export function applyTheme() {
  const t = store.settings.thema;
  const root = document.documentElement;
  if (t === 'licht') root.dataset.theme = 'light';
  else if (t === 'donker') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
}

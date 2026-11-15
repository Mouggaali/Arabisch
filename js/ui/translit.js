// Transliteratie tonen of verbergen (body.hide-tr), volgens de instelling en de les.
// Instelling 'auto': de les bepaalt (veld translitStandaard); buiten een les staat ze aan.

import { store } from '../core/store.js';

let lessonDefault = true;

export function applyTranslit(lesson) {
  if (lesson !== undefined) lessonDefault = lesson ? lesson.translitStandaard !== false || lesson.dialect === 'darija' : true;
  const mode = store.settings.translit;
  const show = mode === 'aan' || (mode === 'auto' && lessonDefault);
  document.body.classList.toggle('hide-tr', !show);
  return show;
}

export function translitVisible() {
  return !document.body.classList.contains('hide-tr');
}

// Arabische en Nederlandse antwoorden normaliseren en vergelijken.

// Harakat, tanwīn, shadda, sukūn, superscript alif en andere Koran-tekens.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
const TATWEEL = /ـ/g;
const PUNCT_AR = /[،؛؟٪-٭۔.,!?;:"'()«»\-–—]/g;

export function stripMarks(s) {
  return String(s).normalize('NFC').replace(MARKS, '').replace(TATWEEL, '');
}

/** Basisvorm voor vergelijking: zonder leestekens, met enkele spaties. */
function base(s, keepMarks) {
  let t = String(s).normalize('NFC').replace(TATWEEL, '');
  if (!keepMarks) t = t.replace(MARKS, '');
  return t.replace(PUNCT_AR, ' ').replace(/\s+/g, ' ').trim();
}

/** Lossere vorm om veelvoorkomende spellingfouten te herkennen (alleen voor hints). */
function loose(s) {
  return base(s, false)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ؤئ]/g, 'ء');
}

/**
 * Vergelijk een Arabisch antwoord met één of meer goede antwoorden.
 * Standaard zonder harakat; met strict worden ook de harakat vergeleken.
 * @returns {{ok: boolean, hint: string|null, match: string}}
 */
export function checkArabic(given, answers, { strict = false, final = false } = {}) {
  const list = Array.isArray(answers) ? answers : [answers];
  const g = base(given, strict);
  if (!g) return { ok: false, hint: null, match: list[0] };
  for (const a of list) {
    if (base(a, strict) === g) {
      if (final && !strict && !sameFinalVowel(given, a)) {
        return { ok: false, hint: 'De letters kloppen, maar de klinker aan het eind niet. Juist die klinker bepaalt hier de betekenis.', match: a };
      }
      return { ok: true, hint: null, match: a };
    }
  }
  if (strict) {
    for (const a of list) {
      if (base(a, false) === base(given, false)) {
        return { ok: false, hint: 'De letters kloppen, maar de harakat (klinkertekens) niet.', match: a };
      }
    }
  }
  for (const a of list) {
    if (loose(a) === loose(given)) {
      return { ok: false, hint: spellingHint(base(given, false), base(a, false)), match: a };
    }
  }
  return { ok: false, hint: null, match: list[0] };
}

/** Klinkertekens op de laatste letter (zonder sukūn), gesorteerd. */
function finalVowel(s) {
  const t = base(s, true);
  const m = t.match(/([ً-ّٰ]*)[ْ]?$/);
  return (m ? m[1] : '').split('').sort().join('');
}

/**
 * Voor vormen die alleen in de eindklinker verschillen (حالُكَ / حالُكِ):
 * goed als de laatste klinker overeenkomt. Heeft het antwoord geen eindklinker (of sukūn), dan altijd goed.
 */
function sameFinalVowel(given, answer) {
  const want = finalVowel(answer);
  return !want || finalVowel(given) === want;
}

function spellingHint(g, a) {
  const has = (s, re) => re.test(s);
  if (has(a, /[أإآ]/) || has(g, /[أإآ]/)) return 'Bijna goed: let op de hamza op of onder de alif (أ / إ / آ / ا).';
  if (has(a, /ة/) || has(g, /ة/)) return 'Bijna goed: let op het verschil tussen ta marbūṭa (ة) en hāʾ (ه).';
  if (has(a, /ى/) || has(g, /ى/)) return 'Bijna goed: let op alif maqṣūra (ى) tegenover yāʾ (ي).';
  return 'Bijna goed: let op de spelling van de hamza (ء / ؤ / ئ).';
}

/** Nederlands: hoofdletters, accenten, leestekens en dubbele spaties negeren. */
export function normalizeNl(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:"'()\-–—…/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkDutch(given, answers) {
  const g = normalizeNl(given);
  const list = Array.isArray(answers) ? answers : [answers];
  const hit = list.find((a) => normalizeNl(a) === g);
  return { ok: Boolean(g) && Boolean(hit), match: hit || list[0] };
}

export function isArabic(s) {
  return /[؀-ۿ]/.test(String(s));
}

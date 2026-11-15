// Vervoeging van regelmatige (sterke) werkwoorden van vorm I–VIII en X, in māḍī en muḍāriʿ (indicatief).
// Zwakke, hamza- en verdubbelde werkwoorden worden NIET gegenereerd: die krijgen in
// content/werkwoorden.json een expliciete tabel ("vormen").
// Werkwoorden waarvan de derde wortelletter ت of ن is, hebben assimilatie (سَكَنّا) en
// moeten daarom ook een expliciete tabel krijgen.

const A = 'َ'; // fatḥa
const U = 'ُ'; // ḍamma
const I = 'ِ'; // kasra
const O = 'ْ'; // sukūn
const SH = 'ّ'; // shadda
const VOWEL = { a: A, u: U, i: I };

/** De 13 persoonsvormen in de volgorde van de tabellen in deze cursus. */
export const PERSONS = [
  { id: 'ana', ar: 'أَنا', tr: 'ana', nl: 'ik', groep: 'enkelvoud' },
  { id: 'anta', ar: 'أَنْتَ', tr: 'anta', nl: 'jij (m)', groep: 'enkelvoud' },
  { id: 'anti', ar: 'أَنْتِ', tr: 'anti', nl: 'jij (v)', groep: 'enkelvoud' },
  { id: 'huwa', ar: 'هُوَ', tr: 'huwa', nl: 'hij', groep: 'enkelvoud' },
  { id: 'hiya', ar: 'هِيَ', tr: 'hiya', nl: 'zij (ev)', groep: 'enkelvoud' },
  { id: 'antuma', ar: 'أَنْتُما', tr: 'antumā', nl: 'jullie twee', groep: 'dualis' },
  { id: 'huma_m', ar: 'هُما', tr: 'humā', nl: 'zij twee (m)', groep: 'dualis' },
  { id: 'huma_f', ar: 'هُما', tr: 'humā', nl: 'zij twee (v)', groep: 'dualis' },
  { id: 'nahnu', ar: 'نَحْنُ', tr: 'naḥnu', nl: 'wij', groep: 'meervoud' },
  { id: 'antum', ar: 'أَنْتُمْ', tr: 'antum', nl: 'jullie (m)', groep: 'meervoud' },
  { id: 'antunna', ar: 'أَنْتُنَّ', tr: 'antunna', nl: 'jullie (v)', groep: 'meervoud' },
  { id: 'hum', ar: 'هُمْ', tr: 'hum', nl: 'zij (m mv)', groep: 'meervoud' },
  { id: 'hunna', ar: 'هُنَّ', tr: 'hunna', nl: 'zij (v mv)', groep: 'meervoud' },
];

const LAT = {
  'ب': 'b', 'ت': 't', 'ث': 'ṯ', 'ج': 'j', 'ح': 'ḥ', 'خ': 'ḫ', 'د': 'd', 'ذ': 'ḏ', 'ر': 'r', 'ز': 'z',
  'س': 's', 'ش': 'š', 'ص': 'ṣ', 'ض': 'ḍ', 'ط': 'ṭ', 'ظ': 'ẓ', 'ع': 'ʿ', 'غ': 'ġ', 'ف': 'f', 'ق': 'q',
  'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
};

// [arabisch achtervoegsel na de stam, latijns achtervoegsel]
const MADI = {
  huwa: [A, 'a'],
  hiya: [A + 'ت' + O, 'at'],
  huma_m: [A + 'ا', 'ā'],
  huma_f: [A + 'ت' + A + 'ا', 'atā'],
  hum: [U + 'وا', 'ū'],
  hunna: [O + 'ن' + A, 'na'],
  anta: [O + 'ت' + A, 'ta'],
  anti: [O + 'ت' + I, 'ti'],
  antuma: [O + 'ت' + U + 'م' + A + 'ا', 'tumā'],
  antum: [O + 'ت' + U + 'م' + O, 'tum'],
  antunna: [O + 'ت' + U + 'ن' + SH + A, 'tunna'],
  ana: [O + 'ت' + U, 'tu'],
  nahnu: [O + 'ن' + A + 'ا', 'nā'],
};

// [voorvoegsel, latijns voorvoegsel, achtervoegsel, latijns achtervoegsel]
const MUDARI = {
  ana: ['أ', 'a', U, 'u'],
  anta: ['ت', 'ta', U, 'u'],
  anti: ['ت', 'ta', I + 'ينَ', 'īna'],
  huwa: ['ي', 'ya', U, 'u'],
  hiya: ['ت', 'ta', U, 'u'],
  antuma: ['ت', 'ta', A + 'انِ', 'āni'],
  huma_m: ['ي', 'ya', A + 'انِ', 'āni'],
  huma_f: ['ت', 'ta', A + 'انِ', 'āni'],
  nahnu: ['ن', 'na', U, 'u'],
  antum: ['ت', 'ta', U + 'ونَ', 'ūna'],
  antunna: ['ت', 'ta', O + 'نَ', 'na'],
  hum: ['ي', 'ya', U + 'ونَ', 'ūna'],
  hunna: ['ي', 'ya', O + 'نَ', 'na'],
};

// Afgeleide vormen (sterke wortels). Per vorm: de māḍī-stam, de muḍāriʿ-stam na het
// voorvoegsel, en de klinker van het voorvoegsel (u bij II–IV, anders a).
// Vorm VIII met assimilatie (اِتَّصَلَ، اِضْطَرَبَ) en vorm IX krijgen een expliciete tabel.
const DERIVED = {
  2: { madi: (r) => [r[0] + A + r[1] + SH + A + r[2], (l) => l[0] + 'a' + l[1] + l[1] + 'a' + l[2]],
       mudari: (r) => [r[0] + A + r[1] + SH + I + r[2], (l) => l[0] + 'a' + l[1] + l[1] + 'i' + l[2]], pv: 'u' },
  3: { madi: (r) => [r[0] + A + 'ا' + r[1] + A + r[2], (l) => l[0] + 'ā' + l[1] + 'a' + l[2]],
       mudari: (r) => [r[0] + A + 'ا' + r[1] + I + r[2], (l) => l[0] + 'ā' + l[1] + 'i' + l[2]], pv: 'u' },
  4: { madi: (r) => ['أ' + A + r[0] + O + r[1] + A + r[2], (l) => 'a' + l[0] + l[1] + 'a' + l[2]],
       mudari: (r) => [r[0] + O + r[1] + I + r[2], (l) => l[0] + l[1] + 'i' + l[2]], pv: 'u' },
  5: { madi: (r) => ['ت' + A + r[0] + A + r[1] + SH + A + r[2], (l) => 'ta' + l[0] + 'a' + l[1] + l[1] + 'a' + l[2]],
       mudari: (r) => ['ت' + A + r[0] + A + r[1] + SH + A + r[2], (l) => 'ta' + l[0] + 'a' + l[1] + l[1] + 'a' + l[2]], pv: 'a' },
  6: { madi: (r) => ['ت' + A + r[0] + A + 'ا' + r[1] + A + r[2], (l) => 'ta' + l[0] + 'ā' + l[1] + 'a' + l[2]],
       mudari: (r) => ['ت' + A + r[0] + A + 'ا' + r[1] + A + r[2], (l) => 'ta' + l[0] + 'ā' + l[1] + 'a' + l[2]], pv: 'a' },
  7: { madi: (r) => ['ا' + I + 'ن' + O + r[0] + A + r[1] + A + r[2], (l) => 'in' + l[0] + 'a' + l[1] + 'a' + l[2]],
       mudari: (r) => ['ن' + O + r[0] + A + r[1] + I + r[2], (l) => 'n' + l[0] + 'a' + l[1] + 'i' + l[2]], pv: 'a' },
  8: { madi: (r) => ['ا' + I + r[0] + O + 'ت' + A + r[1] + A + r[2], (l) => 'i' + l[0] + 'ta' + l[1] + 'a' + l[2]],
       mudari: (r) => [r[0] + O + 'ت' + A + r[1] + I + r[2], (l) => l[0] + 'ta' + l[1] + 'i' + l[2]], pv: 'a' },
  10: { madi: (r) => ['ا' + I + 'س' + O + 'ت' + A + r[0] + O + r[1] + A + r[2], (l) => 'ista' + l[0] + l[1] + 'a' + l[2]],
        mudari: (r) => ['س' + O + 'ت' + A + r[0] + O + r[1] + I + r[2], (l) => 'sta' + l[0] + l[1] + 'i' + l[2]], pv: 'a' },
};

/**
 * @param verb {{wortel: string[3], vorm?: number, madi?: 'a'|'i'|'u', mudari?: 'a'|'i'|'u', vormen?: object}}
 *   Vorm I heeft de stamklinkers madi/mudari nodig; vormen II–VIII en X worden uit de wortel afgeleid.
 * @param tijd 'madi' | 'mudari'
 * @returns {Array<{person, ar, tr}>}
 */
export function conjugate(verb, tijd) {
  if (verb.vormen && verb.vormen[tijd]) {
    // Een ontbrekende persoon geeft een lege vorm; de trainer slaat die over.
    return PERSONS.map((p) => ({ person: p, ar: '', tr: '', ...verb.vormen[tijd][p.id] }));
  }
  const r = verb.wortel;
  const l = r.map((c) => LAT[c] || c);
  const d = DERIVED[verb.vorm];
  if (tijd === 'madi') {
    const [stem, lstem] = d
      ? [d.madi(r)[0], d.madi(r)[1](l)]
      : [r[0] + A + r[1] + VOWEL[verb.madi] + r[2], l[0] + 'a' + l[1] + verb.madi + l[2]];
    return PERSONS.map((p) => {
      const [suf, lsuf] = MADI[p.id];
      return { person: p, ar: stem + suf, tr: lstem + lsuf };
    });
  }
  const [mid, lmid, pv] = d
    ? [d.mudari(r)[0], d.mudari(r)[1](l), d.pv]
    : [r[0] + O + r[1] + VOWEL[verb.mudari] + r[2], l[0] + l[1] + verb.mudari + l[2], 'a'];
  return PERSONS.map((p) => {
    const [pre, lpre, suf, lsuf] = MUDARI[p.id];
    // lpre eindigt op de standaardklinker a; vervang die door de klinker van deze vorm.
    return { person: p, ar: pre + VOWEL[pv] + mid + suf, tr: lpre.slice(0, -1) + pv + lmid + lsuf };
  });
}

export const TENSES = {
  madi: { naam: 'Māḍī (verleden tijd)', kort: 'Māḍī' },
  mudari: { naam: 'Muḍāriʿ (tegenwoordige tijd)', kort: 'Muḍāriʿ' },
};

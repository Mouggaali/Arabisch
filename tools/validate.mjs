// Structuurcontrole van alle uitgewerkte lesbestanden.  Gebruik:  node tools/validate.mjs
// Controleert: onbekende tags, ongeldige 'juist'-index, woordbank zonder het antwoord,
// verwijzingen naar onbekende woord-id's, dubbele woorden over lessen heen, het aantal oefenvormen,
// de werkwoorden van de trainer en de leesteksten (alleen bekende woorden).

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const curriculum = read('content/curriculum.json');
const tags = read('content/tags.json');

const lessons = curriculum.jaren
  .flatMap((j) => j.periodes.flatMap((p) => p.eenheden))
  .filter((u) => u.bestand)
  .map((u) => ({ unit: u, data: read('content/' + u.bestand) }));

const wordIds = new Set(lessons.flatMap((l) => l.data.woorden.map((w) => w.id)));
const seen = new Map();
const problems = [];

for (const { unit, data } of lessons) {
  const code = unit.code;
  if (data.id !== unit.id) problems.push(`${code}: id ${data.id} ≠ ${unit.id}`);
  for (const w of data.woorden) {
    if (!w.id.startsWith(unit.id + '-w')) problems.push(`${code}: woord-id ${w.id} past niet bij de les`);
    if (seen.has(w.ar)) problems.push(`${code}: woord ${w.ar} staat ook in ${seen.get(w.ar)}`);
    else seen.set(w.ar, code);
  }
  const items = [...data.oefeningen.flatMap((s) => s.items), ...data.toets.items];
  for (const it of items) {
    if (!tags[it.tag]) problems.push(`${code}: onbekende tag '${it.tag}'`);
    if ('juist' in it && !(it.juist >= 0 && it.juist < it.opties.length)) problems.push(`${code}: ongeldige 'juist' in "${it.vraag}"`);
    if (it.woordbank && !it.woordbank.includes([].concat(it.antwoord)[0])) problems.push(`${code}: woordbank mist het antwoord bij "${it.zin}"`);
    if (it.woord && !wordIds.has(it.woord)) problems.push(`${code}: onbekend woord ${it.woord}`);
    (it.paren || []).forEach((p) => p.woord && !wordIds.has(p.woord) && problems.push(`${code}: onbekend woord ${p.woord}`));
    if (it.type === 'invullen' && !it.zin.includes('___')) problems.push(`${code}: invulzin zonder ___`);
    if (it.type === 'schrijven') {
      if (!it.opdracht) problems.push(`${code}: schrijfopdracht zonder opdracht`);
      if (!(it.model || []).length) problems.push(`${code}: schrijfopdracht zonder modelantwoord`);
      if ((it.checklist || []).length < 3) problems.push(`${code}: schrijfopdracht met minder dan 3 checklistpunten`);
      if (!['schrijven', 'spreken'].includes(it.modus || 'schrijven')) problems.push(`${code}: onbekende modus '${it.modus}'`);
    }
  }
  if (data.toets.items.some((i) => i.type === 'schrijven')) problems.push(`${code}: een schrijfopdracht hoort niet in de toets`);
  // Perzische/Urdu-letters (ی ک گ پ چ) horen niet in Arabische tekst.
  const raw = JSON.stringify(data);
  const foreign = raw.match(/[پچکگی]/g);
  if (foreign) problems.push(`${code}: niet-Arabische letters gevonden (${[...new Set(foreign)].join(' ')})`);
  // Zelfbeoordeling (schrijven) telt niet mee voor de eis van minstens 5 oefenvormen.
  const forms = new Set(items.filter((i) => i.type !== 'schrijven').map((i) => (i.type === 'vertalen' ? 'vertalen-' + i.richting : i.type)));
  if (forms.size < 5) problems.push(`${code}: maar ${forms.size} oefenvormen`);
  const n = data.toets.items.length;
  const testOnly = ['periodetoets', 'evaluatie'].includes(data.type);
  const [min, max] = testOnly ? [30, 45] : [12, 15];
  if (n < min || n > max) problems.push(`${code}: toets heeft ${n} items (${min}–${max} verwacht)`);
  console.log(`${code.padEnd(4)} woorden ${String(data.woorden.length).padStart(2)} · oefenitems ${String(items.length - n).padStart(2)} · toets ${n} · vormen ${forms.size}`);
}

// Werkwoorden voor de trainer: unieke id's; een expliciete tabel (vormen) heeft beide tijden met alle 13 personen.
const PERSONS = ['ana', 'anta', 'anti', 'huwa', 'hiya', 'antuma', 'huma_m', 'huma_f', 'nahnu', 'antum', 'antunna', 'hum', 'hunna'];
const verbIds = new Set();
for (const v of read('content/werkwoorden.json').werkwoorden) {
  if (verbIds.has(v.id)) problems.push(`werkwoord ${v.id}: dubbel id`);
  verbIds.add(v.id);
  if (!v.vormen) {
    if ((v.vorm || 1) === 1 && !(v.madi && v.mudari)) problems.push(`werkwoord ${v.id}: vorm I zonder stamklinkers madi/mudari`);
    continue;
  }
  const SECOND = ['anta', 'anti', 'antuma', 'antum', 'antunna'];
  for (const tijd of new Set(['madi', 'mudari', ...Object.keys(v.vormen)])) {
    if (!['madi', 'mudari', 'mansub', 'majzum', 'amr'].includes(tijd)) { problems.push(`werkwoord ${v.id}: onbekende tijd ${tijd}`); continue; }
    for (const p of tijd === 'amr' ? SECOND : PERSONS) {
      const f = v.vormen[tijd]?.[p];
      if (!f || !f.ar || !f.tr) problems.push(`werkwoord ${v.id}: ${tijd}/${p} ontbreekt of is onvolledig`);
    }
  }
}
console.log(`\nWerkwoorden: ${verbIds.size} (${[...verbIds].length - read('content/werkwoorden.json').werkwoorden.filter((v) => !v.vormen).length} met eigen tabel)`);

// Leesteksten (content/teksten): index klopt met de bestanden, elk token heeft een woordkaart (w) of een glosse (g),
// elke woordkaart komt uit een eenheid tot en met naLes ("alleen bekende woorden"), 4–6 vragen met geldige items.
const order = curriculum.jaren.flatMap((j) => j.periodes.flatMap((p) => p.eenheden));
const pos = new Map(order.map((u, i) => [u.id, i]));
const wordUnit = new Map(lessons.flatMap((l) => l.data.woorden.map((w) => [w.id, l.unit.id])));
const textIndex = read('content/teksten/index.json').teksten;
const textIds = new Set();
let tokens = 0, linked = 0;
for (const entry of textIndex) {
  const where = `leestekst ${entry.id}`;
  if (textIds.has(entry.id)) problems.push(`${where}: dubbel id`);
  textIds.add(entry.id);
  let t;
  try { t = read('content/teksten/' + entry.bestand); } catch { problems.push(`${where}: bestand ${entry.bestand} ontbreekt`); continue; }
  if (t.id !== entry.id) problems.push(`${where}: id in het bestand is ${t.id}`);
  if (!pos.has(entry.naLes)) problems.push(`${where}: onbekende les ${entry.naLes}`);
  for (const [k, z] of t.zinnen.entries()) {
    if (!z.ar || !z.tr || !z.nl || !z.tokens?.length) problems.push(`${where} zin ${k + 1}: ar, tr, nl of tokens ontbreekt`);
    if (z.tokens.map((x) => x.t).join(' ') !== z.ar) problems.push(`${where} zin ${k + 1}: tokens vormen niet de zin`);
    for (const tok of z.tokens) {
      tokens++;
      const core = tok.t.replace(/[،؛؟.,!?;:"'()«»\-–—]/g, '');
      if (!core) continue;
      if (tok.w) {
        linked++;
        if (!wordUnit.has(tok.w)) problems.push(`${where}: onbekend woord ${tok.w} (${tok.t})`);
        else if (pos.get(wordUnit.get(tok.w)) > pos.get(entry.naLes)) problems.push(`${where}: ${tok.t} (${tok.w}) komt pas na ${entry.naLes}`);
      } else if (!tok.g) problems.push(`${where}: ${tok.t} heeft geen woordkaart en geen glosse`);
    }
  }
  if (t.vragen.length < 4 || t.vragen.length > 6) problems.push(`${where}: ${t.vragen.length} vragen (4–6 verwacht)`);
  for (const it of t.vragen) {
    if (!tags[it.tag]) problems.push(`${where}: onbekende tag '${it.tag}'`);
    if (!it.uitleg) problems.push(`${where}: vraag zonder uitleg`);
    if (it.type === 'schrijven') problems.push(`${where}: schrijfopdracht hoort niet bij de vragen`);
    if ('juist' in it && !(it.juist >= 0 && it.juist < it.opties.length)) problems.push(`${where}: ongeldige 'juist' in "${it.vraag}"`);
    if (it.woordbank && !it.woordbank.includes([].concat(it.antwoord)[0])) problems.push(`${where}: woordbank mist het antwoord bij "${it.zin}"`);
    if (it.type === 'invullen' && !it.zin.includes('___')) problems.push(`${where}: invulzin zonder ___`);
  }
  const foreign = JSON.stringify(t).match(/[پچکگی]/g);
  if (foreign) problems.push(`${where}: niet-Arabische letters gevonden (${[...new Set(foreign)].join(' ')})`);
}
console.log(`Leesteksten: ${textIndex.length}, ${tokens} woorden, waarvan ${linked} gekoppeld aan een woordkaart (${Math.round((linked / Math.max(1, tokens)) * 100)}%)`);

console.log(problems.length ? '\nProblemen:\n' + problems.join('\n') : '\nGeen problemen gevonden.');
process.exitCode = problems.length ? 1 : 0;

// Genereert content/curriculum.json uit leerplan.md (de bron van waarheid voor de opbouw).
// Gebruik:  node tools/build-curriculum.mjs
// - Elke tabelrij met een code (**L01**, **H03**, **D02**, **PT1**, **NE2**, **L129–L132**) wordt een eenheid.
// - Een eenheid krijgt "bestand" als content/jaar-<j>/periode-<p>/<code>.json bestaat.
// - Grammatica-tags (labels) komen uit content/tags.json.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(root, 'leerplan.md'), 'utf8');
const tags = JSON.parse(readFileSync(join(root, 'content', 'tags.json'), 'utf8'));

const TYPES = { L: 'les', H: 'herhaling', D: 'darija', PT: 'periodetoets', NE: 'evaluatie' };
const jaren = [];
let jaar = null;
let periode = null;
let header = null;

const clean = (s) => (s || '').replace(/\*\*/g, '').trim();

for (const line of md.split(/\r?\n/)) {
  let m;
  if ((m = line.match(/^## A\d+\. JAAR (\d+) — (.+?)(?: \((.+)\))?$/))) {
    jaar = { nr: Number(m[1]), titel: m[2].trim(), niveau: m[3] ? 'Niveau ' + m[3] : '', periodes: [] };
    jaren.push(jaar);
    continue;
  }
  if (jaar && (m = line.match(/^### Periode (\d+) — "(.+?)"/))) {
    periode = { nr: Number(m[1]), titel: m[2], eenheden: [] };
    jaar.periodes.push(periode);
    header = null;
    continue;
  }
  if (!periode || !line.startsWith('|')) continue;
  const cells = line.split('|').slice(1, -1).map((c) => c.trim());
  if (/^Les$/i.test(cells[0])) { header = cells.map((c) => c.toLowerCase()); continue; }
  if (/^-+$/.test(cells[0]) || !header) continue;

  const col = (name) => { const i = header.findIndex((x) => x.startsWith(name)); return i >= 0 ? cells[i] : ''; };
  // Alle codes in de eerste twee kolommen, ook "Herhaling + **PT5** + **NE3 (A2−)**".
  const codeCell = cells[0];
  const extra = [...(cells[1] || '').matchAll(/\*\*((?:PT|NE)\d+)(?: \(([^)]+)\))?\*\*/g)];
  const range = codeCell.match(/\*\*([A-Z]+)(\d+)–[A-Z]+(\d+)\*\*/);
  const single = codeCell.match(/\*\*([A-Z]+)(\d+)\*\*/);

  const base = {
    titel: clean(col('thema')).replace(/\s*\+\s*PT\d+.*$/, '').replace(/^Periodetoets \d+$/, (s) => s),
    leerdoel: clean(col('leerdoel')),
    grammatica: col('grammatica'),
    woorden: Number(col('wd')) || null,
    accent: clean(col('accent')),
  };

  const add = (prefix, num, over = {}) => {
    const code = prefix + (prefix === 'L' || prefix === 'H' || prefix === 'D' ? String(num).padStart(2, '0') : num);
    const id = `j${jaar.nr}-p${periode.nr}-${code.toLowerCase()}`;
    const file = `jaar-${jaar.nr}/periode-${periode.nr}/${code.toLowerCase()}.json`;
    const unit = { id, code, type: TYPES[prefix], ...base, ...over };
    if (prefix === 'PT') unit.titel = `Periodetoets ${num}`;
    if (prefix === 'NE') unit.titel = `Niveau-evaluatie${over.niveau ? ' ' + over.niveau : ''}`;
    if (prefix === 'H' && !unit.titel.startsWith('Herhaling')) unit.titel = 'Herhaling';
    if (existsSync(join(root, 'content', file))) unit.bestand = file;
    for (const k of Object.keys(unit)) if (unit[k] === '' || unit[k] === null) delete unit[k];
    periode.eenheden.push(unit);
  };

  if (range) {
    for (let n = Number(range[2]); n <= Number(range[3]); n++) add(range[1], n);
  } else if (single) {
    const [, prefix, num] = single;
    if (prefix === 'PT' || prefix === 'NE') {
      add(prefix, Number(num), { titel: undefined, niveau: (codeCell.match(/\(([^)]+)\)/) || cells[1].match(/\(([^)]+)\)/) || [])[1] });
    } else {
      add(prefix, Number(num));
    }
  }
  for (const [, code, niveau] of extra) {
    const [, p, n] = code.match(/([A-Z]+)(\d+)/);
    add(p, Number(n), { niveau, grammatica: undefined, leerdoel: undefined });
  }
}

const out = {
  titel: 'Darb · Arabisch',
  beschrijving: 'Fusha als hoofdspoor, met vanaf jaar 1 periode 3 een Marokkaans Darija-spoor. Alleen uitgewerkte lessen zijn te openen; de rest volgt in fase 4.',
  gegenereerd: 'Niet met de hand bewerken: gegenereerd door tools/build-curriculum.mjs uit leerplan.md.',
  tags,
  jaren,
};
writeFileSync(join(root, 'content', 'curriculum.json'), JSON.stringify(out, null, 2) + '\n');
const units = jaren.flatMap((j) => j.periodes.flatMap((p) => p.eenheden));
const count = (t) => units.filter((u) => u.type === t).length;
console.log(`curriculum.json: ${units.length} eenheden (${count('les')} lessen, ${count('herhaling')} herhaling, ${count('darija')} Darija, ${count('periodetoets')} periodetoetsen, ${count('evaluatie')} evaluaties); uitgewerkt: ${units.filter((u) => u.bestand).length}`);

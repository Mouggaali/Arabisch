// Bouwt content/zoekindex.json: een compacte index van alle woorden, grammaticaonderwerpen,
// lessen en werkwoorden, voor de zoekpagina (#/zoeken). Zo hoeft de app niet alle 228 lesbestanden
// (± 3,6 MB) te laden om te zoeken.  Gebruik:  node tools/build-search-index.mjs
// Wordt ook aangeroepen door tools/build-dist.mjs. Draai het opnieuw na het wijzigen van lesinhoud.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

export function buildSearchIndex() {
  const cur = read('content/curriculum.json');
  const units = cur.jaren.flatMap((j) => j.periodes.flatMap((p) => p.eenheden)).filter((u) => u.bestand);
  const woorden = [], grammatica = [], lessen = [];
  for (const u of units) {
    const d = read('content/' + u.bestand);
    lessen.push([d.titel, d.thema || '', u.id, d.code, d.type]);
    for (const w of d.woorden) woorden.push([w.ar, w.tr, w.nl.join(' · '), w.soort || '', u.id, d.code, w.id, w.review ? 1 : 0]);
    d.grammatica.forEach((g, i) => grammatica.push([g.titel, u.id, d.code, i]));
  }
  const werkwoorden = read('content/werkwoorden.json').werkwoorden.map((v) => [v.ar, v.tr, v.nl, v.id, v.zwak || `vorm ${v.vorm || 1}`]);
  const index = {
    uitleg: 'GEGENEREERD door tools/build-search-index.mjs; niet met de hand bewerken.',
    velden: {
      woorden: ['ar', 'tr', 'nl', 'soort', 'eenheid', 'code', 'woordId', 'review'],
      grammatica: ['titel', 'eenheid', 'code', 'index'],
      lessen: ['titel', 'thema', 'eenheid', 'code', 'type'],
      werkwoorden: ['ar', 'tr', 'nl', 'id', 'soort'],
    },
    woorden, grammatica, lessen, werkwoorden,
  };
  writeFileSync(join(root, 'content/zoekindex.json'), JSON.stringify(index) + '\n');
  return { woorden: woorden.length, grammatica: grammatica.length, lessen: lessen.length, werkwoorden: werkwoorden.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = buildSearchIndex();
  console.log(`content/zoekindex.json: ${n.woorden} woorden, ${n.grammatica} grammaticaonderwerpen, ${n.lessen} eenheden, ${n.werkwoorden} werkwoorden.`);
}

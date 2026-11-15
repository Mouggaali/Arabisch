// Bouwt de map dist/ voor publicatie (GitHub Pages).  Gebruik:  node tools/build-dist.mjs
// Kopieert alleen wat de app nodig heeft (geen tools/, leerplan.md, CLAUDE.md, start.bat, .claude/)
// en stempelt in sw.js een cacheversie (hash van alle bestanden) en de lijst van de app-schil.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const INCLUDE = ['index.html', 'manifest.webmanifest', 'sw.js', 'css', 'js', 'vendor', 'icons', 'content'];

const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap((f) => walk(join(p, f))) : [p]);
const rel = (p) => relative(root, p).split(sep).join('/');

rmSync(dist, { recursive: true, force: true });
const files = INCLUDE.flatMap((name) => {
  const p = join(root, name);
  if (!existsSync(p)) throw new Error(`Ontbreekt: ${name}`);
  return walk(p);
});
for (const f of files) {
  const to = join(dist, rel(f));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(f, to);
}

// Cacheversie = hash van de inhoud; verandert bij elke wijziging, zodat telefoons de update krijgen.
const hash = createHash('sha256');
for (const f of files.filter((f) => !f.endsWith('sw.js')).sort()) hash.update(rel(f)).update(readFileSync(f));
const version = hash.digest('hex').slice(0, 12);

// App-schil: alles behalve de lesinhoud (die komt via stale-while-revalidate of de knop in Instellingen).
const shell = ['./', ...files.map(rel).filter((p) => !p.startsWith('content/') && p !== 'sw.js')];
const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`)
  .replace(/const SHELL = \[[^\]]*\];/, `const SHELL = ${JSON.stringify(shell)};`);
if (!sw.includes(version)) throw new Error('Cacheversie niet ingevuld in sw.js');
writeFileSync(swPath, sw);
writeFileSync(join(dist, '.nojekyll'), '');

const size = files.reduce((n, f) => n + statSync(f).size, 0);
console.log(`dist/ klaar: ${files.length} bestanden, ${(size / 1e6).toFixed(1)} MB, cacheversie ${version}, app-schil ${shell.length} bestanden.`);

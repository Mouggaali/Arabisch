// De signature: vier lichten achter het glas, één per lesonderdeel.
// - Het licht van het actieve onderdeel glijdt achter het paneel waar je aan werkt.
// - Na een antwoord kleurt het licht achter de oefening even groen (goed) of rood (fout).
// - Op het dashboard is de grootte van elk licht je beheersing van dat onderdeel.
// Bouwt op vendor/glass.js (window.GlassWorld).

export const PARTS = {
  woorden: { naam: 'Woordenschat', kleur: 'var(--part-woorden)' },
  grammatica: { naam: 'Grammatica', kleur: 'var(--part-grammatica)' },
  oefeningen: { naam: 'Oefenen', kleur: 'var(--part-oefenen)' },
  toets: { naam: 'Toets', kleur: 'var(--part-toets)' },
};

let world = null;
let flashTimer = 0;
let current = null;

export function mountWorld() {
  const root = document.querySelector('.world');
  world = window.GlassWorld.mount(root, {
    lights: Object.entries(PARTS).map(([id, p], i) => ({ id, color: p.kleur, size: 22 + (i % 2) * 4 })),
    ambient: [{ id: 'turkoois', color: '#2aa89c', at: [0.12, 0.88], size: 50 }, { id: 'nacht', color: '#4057a8', at: [0.85, 0.08], size: 44 }],
    ring: { center: [0.62, 0.48], radius: [0.3, 0.36], phone: { center: [0.5, 0.42], radius: [0.42, 0.28] } },
    parallax: 0.02,
  });
  return world;
}

/** Zet het licht van een onderdeel achter een element. */
export function lightPart(part, el) {
  if (!world) return;
  if (current && current !== part) world.dim(current);
  current = part;
  if (el) world.light(part, el);
}

export function dimAll() {
  if (!world) return;
  Object.keys(PARTS).forEach((p) => {
    world.dim(p);
    world.color(p, PARTS[p].kleur);
  });
  current = null;
}

/** Kleur het actieve licht kort naar goed/fout. */
export function flash(correct) {
  if (!world || !current) return;
  const part = current;
  world.color(part, correct ? 'var(--good)' : 'var(--bad)');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => world.color(part, PARTS[part].kleur), 1400);
}

/** Dashboard: grootte van elk licht = beheersing (0..1). */
export function sizeParts(levels) {
  if (!world) return;
  for (const [part, v] of Object.entries(levels)) {
    const o = world.orbs.get(part);
    if (o) o.el.style.setProperty('--s', (16 + v * 18).toFixed(1) + 'vmax');
  }
  world.update();
}

export function relayoutWorld() {
  world?.update();
}

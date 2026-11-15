// Automatische inhoudstest, uit te voeren in de browserconsole terwijl de app draait:
//   const t = await import('/tools/selftest.js');
//   await t.run(['j1-p1-l05', 'j1-p1-l06']);      // alles GOED beantwoorden: elk item moet "Goed!" geven
//   await t.runFout(['j1-p1-l05']);                // alles FOUT beantwoorden: "Niet goed", uitleg, tag-fout, flashcard terug
//   await t.runTrainer();                           // alle werkwoorden van de trainer: goed en fout
//   t.ids({ jaar: 1 }) / t.ids({ jaar: 3, periode: 12 })   // lijst met les-id's om door te geven
// run() schrijft voortgang weg (toetsresultaten, tags). runFout() bewaart de voortgang vooraf en zet die achteraf terug.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const btn = () => document.querySelector('.ex-actions .btn');
const type = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const squash = (s) => (s || '').replace(/\s+/g, '');

async function answer(it) {
  if (it.type === 'meerkeuze' || it.type === 'luisteren') {
    [...document.querySelectorAll('.choice')].find((b) => b.dataset.i == it.juist).click();
  } else if (it.type === 'invullen') {
    const a = [].concat(it.antwoord)[0];
    if (it.woordbank) [...document.querySelectorAll('.choice')].find((b) => b.textContent.trim() === a).click();
    else type(document.querySelector('.answer-field input'), a);
  } else if (it.type === 'vertalen') {
    type(document.querySelector('.answer-field input'), it.antwoorden[0]);
  } else if (it.type === 'vervoegen') {
    const ins = [...document.querySelectorAll('.conj-grid input')];
    it.rijen.forEach((r, k) => type(ins[k], r.antwoord));
  } else if (it.type === 'koppelen') {
    const [L, R] = [...document.querySelectorAll('.match .col')].map((c) => [...c.children]);
    for (const l of L) { l.click(); R.find((b) => b.dataset.i == l.dataset.i).click(); }
    await wait(80);
    return;
  } else if (it.type === 'ordenen') {
    for (const w of it.woorden) {
      [...document.querySelectorAll('.tiles:not(.tiles--target) .tile')].find((x) => x.textContent === w && !x.disabled).click();
    }
  } else if (it.type === 'schrijven') {
    reveal(it, 'نَصٌّ قَصيرٌ لِلتَّجْرِبَةِ');
    document.querySelectorAll('.checklist input').forEach((b) => b.click());
  }
  btn().click();
  await wait(60);
}

function reveal(it, text) {
  const area = document.querySelector('.answer-field--area textarea');
  if (area) type(area, text);
  [...document.querySelectorAll('button')].find((b) => /modelantwoord|hardop/.test(b.textContent)).click();
}

/**
 * Beantwoord een item bewust fout. Geeft { ok: false, reden } terug als dat niet kan
 * (dan wordt het item goed beantwoord en niet meegeteld), anders { ok: true, woorden: [...] }
 * met de woord-id's die na een fout terug in de flashcards moeten komen.
 */
async function answerWrong(it) {
  let woorden = it.woord ? [it.woord] : [];
  if (it.type === 'meerkeuze' || it.type === 'luisteren') {
    [...document.querySelectorAll('.choice')].find((b) => b.dataset.i != it.juist).click();
  } else if (it.type === 'invullen' && it.woordbank) {
    const ok = [].concat(it.antwoord);
    const wrong = [...document.querySelectorAll('.choice')].find((b) => !ok.includes(b.textContent.trim()));
    if (!wrong) { await answer(it); return { ok: false, reden: 'elke optie in de woordbank is goed' }; }
    wrong.click();
  } else if (it.type === 'invullen' || it.type === 'vertalen') {
    type(document.querySelector('.answer-field input'), 'xyz');
  } else if (it.type === 'vervoegen') {
    document.querySelectorAll('.conj-grid input').forEach((i) => type(i, 'xyz'));
  } else if (it.type === 'koppelen') {
    const [L, R] = [...document.querySelectorAll('.match .col')].map((c) => [...c.children]);
    const first = L[0];
    first.click();
    R.find((b) => b.dataset.i != first.dataset.i).click();
    const w = it.paren[Number(first.dataset.i)].woord;
    woorden = w ? [w] : [];
    for (const l of L) { l.click(); R.find((b) => b.dataset.i == l.dataset.i).click(); }
    await wait(80);
    return { ok: true, woorden };
  } else if (it.type === 'ordenen') {
    const rev = [...it.woorden].reverse();
    const same = (a) => a.join(' ') === rev.join(' ');
    if (it.woorden.length < 2 || same(it.woorden) || (it.ook || []).some(same)) {
      await answer(it); return { ok: false, reden: 'omgekeerde volgorde is ook goed' };
    }
    for (const w of rev) {
      [...document.querySelectorAll('.tiles:not(.tiles--target) .tile')].find((x) => x.textContent === w && !x.disabled).click();
    }
  } else if (it.type === 'schrijven') {
    reveal(it, 'نَصٌّ قَصيرٌ لِلتَّجْرِبَةِ'); // niets aanvinken
  }
  btn().click();
  await wait(60);
  return { ok: true, woorden };
}

async function go(hash) {
  location.hash = '#/vandaag';
  await wait(150);
  location.hash = hash;
  await wait(350);
}

function startSet(s) {
  [...document.querySelectorAll('button')].filter((b) => /^(Start|Opnieuw)$/.test(b.textContent.trim()))[s].click();
}

export async function run(ids) {
  const { content } = await import('/js/core/content.js');
  const report = [];
  for (const id of ids) {
    const data = await content.lesson(id);
    if (!data) { report.push(`${id}: niet uitgewerkt`); continue; }
    for (const p of ['woorden', 'grammatica']) {
      await go(`#/les/${id}/${p}`);
      if (document.body.innerText.includes('Er ging iets mis')) report.push(`${id} ${p}: FOUT bij weergave`);
    }
    for (let s = 0; s < data.oefeningen.length; s++) {
      await go(`#/les/${id}/oefeningen`);
      startSet(s);
      await wait(120);
      for (const [k, it] of data.oefeningen[s].items.entries()) {
        await answer(it);
        const t = document.querySelector('.feedback .title')?.textContent;
        if (t !== 'Goed!') report.push(`${id} set ${s + 1} item ${k + 1} (${it.type}): ${document.querySelector('.feedback')?.innerText.replace(/\n+/g, ' | ')}`);
        btn().click();
        await wait(80);
      }
    }
    await go(`#/les/${id}/toets`);
    [...document.querySelectorAll('button')].find((b) => /Start de toets|Toets opnieuw maken/.test(b.textContent)).click();
    await wait(120);
    for (const it of data.toets.items) await answer(it);
    await wait(200);
    report.push(`${id} toets: ${document.querySelector('.result-head')?.innerText.replace(/\n+/g, ' ') || 'GEEN RESULTAAT'}`);
  }
  console.log(report.join('\n'));
  return report.join('\n');
}

/** Alle items fout beantwoorden en controleren dat de app dat juist afhandelt. Meldt alleen afwijkingen. */
export async function runFout(ids) {
  const { content } = await import('/js/core/content.js');
  const { store } = await import('/js/core/store.js');
  const { rich, today } = await import('/js/core/util.js');
  const snapshot = store.exportJson();
  const report = [];
  let checked = 0, skipped = 0;
  const uitlegText = (md) => { const d = document.createElement('div'); d.innerHTML = rich(md); return squash(d.textContent); };
  const prepCard = (wid) => {
    const c = store.card(wid) || { id: wid, ar: '', tr: '', nl: [], ef: 2.5, interval: 5, reps: 2, lapses: 0 };
    store.putCard(wid, { ...c, isNew: false, due: '2099-01-01', ef: 2.5 });
  };
  try {
    for (const id of ids) {
      const data = await content.lesson(id);
      if (!data) { report.push(`${id}: niet uitgewerkt`); continue; }
      const wordIds = (it) => [it.woord, ...(it.paren || []).map((p) => p.woord)].filter(Boolean);
      for (let s = 0; s < data.oefeningen.length; s++) {
        await go(`#/les/${id}/oefeningen`);
        startSet(s);
        await wait(120);
        for (const [k, it] of data.oefeningen[s].items.entries()) {
          const where = `${id} set ${s + 1} item ${k + 1} (${it.type})`;
          wordIds(it).forEach(prepCard);
          const before = store.state.tags[it.tag]?.fout || 0;
          const res = await answerWrong(it);
          if (!res.ok) { skipped++; btn().click(); await wait(80); continue; }
          checked++;
          const fb = document.querySelector('.feedback');
          const title = fb?.querySelector('.title')?.textContent;
          if (title !== 'Niet goed') report.push(`${where}: fout antwoord gaf "${title}" (${fb?.innerText.replace(/\n+/g, ' | ')})`);
          if (it.uitleg && !squash(fb?.innerText).includes(uitlegText(it.uitleg))) report.push(`${where}: uitleg ontbreekt in de feedback`);
          const after = store.state.tags[it.tag]?.fout || 0;
          if (after !== before + 1) report.push(`${where}: tag ${it.tag} fout ${before} → ${after} (verwacht +1)`);
          for (const w of res.woorden) {
            const c = store.card(w);
            if (!c || c.due !== today() || !(c.ef < 2.5)) report.push(`${where}: woord ${w} kwam niet terug in de flashcards`);
          }
          btn().click();
          await wait(80);
        }
      }
      // Toets: alles fout; elk fout item moet ✗ krijgen met de uitleg erbij.
      await go(`#/les/${id}/toets`);
      [...document.querySelectorAll('button')].find((b) => /Start de toets|Toets opnieuw maken/.test(b.textContent)).click();
      await wait(120);
      const wrongDone = [];
      for (const it of data.toets.items) wrongDone.push((await answerWrong(it)).ok);
      await wait(200);
      const head = document.querySelector('.result-head')?.innerText || '';
      if (!/Nog niet geslaagd/.test(head)) report.push(`${id} toets: verwacht "Nog niet geslaagd", kreeg "${head.replace(/\n+/g, ' ')}"`);
      const rows = [...document.querySelectorAll('.result-list li')];
      data.toets.items.forEach((it, k) => {
        if (!wrongDone[k]) { skipped++; return; }
        checked++;
        const li = rows[k];
        if (!li?.querySelector('.mark.bad')) report.push(`${id} toets item ${k + 1} (${it.type}): niet als fout gemarkeerd`);
        else if (it.uitleg && !squash(li.querySelector('.detail')?.innerText).includes(uitlegText(it.uitleg))) report.push(`${id} toets item ${k + 1}: uitleg ontbreekt`);
      });
    }
  } finally {
    store.importJson(snapshot);
  }
  report.push(`Gecontroleerd: ${checked} fout beantwoorde items; overgeslagen (kan niet fout): ${skipped}; afwijkingen: ${report.length}`);
  console.log(report.join('\n'));
  return report.join('\n');
}

/** Alle werkwoorden van de trainer: elke vorm (en spellingvariant) goed, en een fout antwoord fout. */
export async function runTrainer() {
  const { content } = await import('/js/core/content.js');
  const { rowsFor } = await import('/js/exercises/conjugate.js');
  const { checkArabic } = await import('/js/core/arabic.js');
  const report = [];
  const { werkwoorden } = await content.verbs();
  for (const v of werkwoorden) {
    for (const tijd of ['madi', 'mudari']) {
      const rows = rowsFor({ werkwoord: v, tijd });
      if (rows.length !== 13) report.push(`${v.id} ${tijd}: ${rows.length} vormen i.p.v. 13`);
      for (const r of rows) {
        for (const a of [r.antwoord, ...(r.alt || [])]) {
          if (!checkArabic(a, [r.antwoord, ...(r.alt || [])], { strict: true }).ok) report.push(`${v.id} ${tijd} ${r.label}: ${a} niet goed gerekend`);
        }
        if (checkArabic('xyz', [r.antwoord, ...(r.alt || [])], {}).ok) report.push(`${v.id} ${tijd} ${r.label}: fout antwoord goed gerekend`);
        if (!r.tr) report.push(`${v.id} ${tijd} ${r.label}: transliteratie ontbreekt`);
      }
    }
  }
  report.push(`Werkwoorden gecontroleerd: ${werkwoorden.length}; afwijkingen: ${report.length}`);
  console.log(report.join('\n'));
  return report.join('\n');
}

/** Les-id's van uitgewerkte eenheden, eventueel per jaar en/of periode. */
export async function ids({ jaar, periode } = {}) {
  const { content } = await import('/js/core/content.js');
  const cur = await content.curriculum();
  return cur.jaren.filter((j) => !jaar || j.nr === jaar)
    .flatMap((j) => j.periodes.filter((p) => !periode || p.nr === periode))
    .flatMap((p) => p.eenheden.filter((u) => u.bestand).map((u) => u.id));
}

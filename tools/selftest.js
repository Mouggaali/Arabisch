// Automatische inhoudstest, uit te voeren in de browserconsole terwijl de app draait:
//   const t = await import('/tools/selftest.js');
//   await t.run(['j1-p1-l05', 'j1-p1-l06']);      // alles GOED beantwoorden: elk item moet "Goed!" geven
//   await t.runFout(['j1-p1-l05']);                // alles FOUT beantwoorden: "Niet goed", uitleg, tag-fout, flashcard terug
//   await t.runTrainer();                           // alle werkwoorden van de trainer: goed en fout
//   await t.runLezen();                             // alle leesteksten: woord aantikken, vragen goed en fout
//   await t.runHerhalen();                          // zwakke plekken oefenen: pool, ronde, mini-toets, tags bijgewerkt
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
  const { TENSES } = await import('/js/core/conjugate.js');
  const report = [];
  const { werkwoorden } = await content.verbs();
  for (const v of werkwoorden) {
    for (const tijd of Object.keys(TENSES)) {
      const rows = rowsFor({ werkwoord: v, tijd });
      const verwacht = tijd === 'amr' ? 5 : 13;
      if (rows.length !== verwacht) report.push(`${v.id} ${tijd}: ${rows.length} vormen i.p.v. ${verwacht}`);
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

const press = (re) => [...document.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()))?.click();

/** Leesteksten: elk woord heeft een vertaling, de vragen goed geven "Goed!", fout geven "Niet goed" met uitleg. */
export async function runLezen(only) {
  const { content } = await import('/js/core/content.js');
  const { store } = await import('/js/core/store.js');
  const { rich } = await import('/js/core/util.js');
  const snapshot = store.exportJson();
  const uitlegText = (md) => { const d = document.createElement('div'); d.innerHTML = rich(md); return squash(d.textContent); };
  const report = [];
  let checked = 0;
  try {
    const list = (await content.texts()).filter((t) => !only || only.includes(t.id));
    for (const entry of list) {
      const t = await content.text(entry.id);
      await go(`#/lezen/${t.id}`);
      if (document.body.innerText.includes('Er ging iets mis')) { report.push(`${t.id}: FOUT bij weergave`); continue; }
      const nTok = t.zinnen.reduce((n, z) => n + z.tokens.length, 0);
      const toks = [...document.querySelectorAll('.reader .tok')];
      if (toks.length !== nTok) report.push(`${t.id}: ${toks.length} woorden getoond i.p.v. ${nTok}`);
      const tap = toks.find((b) => b.dataset.w);
      tap?.click();
      await wait(80);
      if (!document.querySelector('.word-gloss .word-gloss__card')) report.push(`${t.id}: aantikken van ${tap?.textContent} toont geen woordkaart`);
      press(/^Start de vragen$|^Opnieuw$/);
      await wait(120);
      for (const [k, it] of t.vragen.entries()) {
        await answer(it);
        const title = document.querySelector('.feedback .title')?.textContent;
        if (title !== 'Goed!') report.push(`${t.id} vraag ${k + 1} (${it.type}) goed: ${document.querySelector('.feedback')?.innerText.replace(/\n+/g, ' | ')}`);
        btn().click();
        await wait(80);
      }
      if (!/100%/.test(document.querySelector('.result-head')?.innerText || '')) report.push(`${t.id}: score niet 100%`);
      press(/^Opnieuw$/);
      await wait(120);
      for (const [k, it] of t.vragen.entries()) {
        const res = await answerWrong(it);
        if (res.ok) {
          checked++;
          const fb = document.querySelector('.feedback');
          if (fb?.querySelector('.title')?.textContent !== 'Niet goed') report.push(`${t.id} vraag ${k + 1} (${it.type}) fout gaf geen "Niet goed"`);
          if (it.uitleg && !squash(fb?.innerText).includes(uitlegText(it.uitleg))) report.push(`${t.id} vraag ${k + 1}: uitleg ontbreekt`);
        }
        btn().click();
        await wait(80);
      }
      if (store.state.teksten?.[t.id]?.best !== 1) report.push(`${t.id}: beste score niet bewaard`);
    }
    report.push(`Leesteksten gecontroleerd: ${list.length}; fout beantwoorde vragen: ${checked}; afwijkingen: ${report.length}`);
  } finally {
    store.importJson(snapshot);
  }
  console.log(report.join('\n'));
  return report.join('\n');
}

/**
 * Zwakke plekken oefenen: zaait voortgang (begonnen lessen en een zwakke tag), controleert de pool en
 * speelt de ronde helemaal af (oefenvragen goed, daarna de mini-toets goed). Zet de voortgang terug.
 */
export async function runHerhalen(lesIds = ['j1-p1-l02', 'j1-p1-l03', 'j1-p1-l04', 'j1-p1-l05', 'j1-p1-l06', 'j1-p1-l07', 'j1-p1-l08', 'j1-p1-l10', 'j1-p1-l11', 'j1-p1-l12']) {
  const { content } = await import('/js/core/content.js');
  const { store } = await import('/js/core/store.js');
  const { rich } = await import('/js/core/util.js');
  const model = await import('/js/views/progress-model.js');
  const { splitRound } = await import('/js/views/review.js');
  const { typeLabel } = await import('/js/exercises/runner.js');
  const snapshot = store.exportJson();
  const report = [];
  const textOf = (md) => { const d = document.createElement('div'); d.innerHTML = rich(md); return squash(d.textContent); };
  try {
    store.reset();
    const lessons = await Promise.all(lesIds.map((id) => content.lesson(id)));
    lessons.forEach((l) => store.markPart(l.id, 'woorden'));
    // De tag die de grootste pool oplevert (hooguit 3 items per les) wordt zwak gemaakt.
    const count = {};
    lessons.forEach((l) => {
      const per = {};
      l.oefeningen.flatMap((s) => s.items).forEach((it) => { if (it.type !== 'schrijven') per[it.tag] = (per[it.tag] || 0) + 1; });
      Object.entries(per).forEach(([tg, n]) => { count[tg] = (count[tg] || 0) + Math.min(3, n); });
    });
    const tag = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
    for (let i = 0; i < 6; i++) store.recordAnswer(null, tag, i === 0);
    if (!model.weakTags().some((t) => t.tag === tag)) report.push(`weakTags bevat ${tag} niet`);

    const pool = model.weakItemPool(lessons, [tag]);
    if (pool.some((it) => it.tag !== tag)) report.push('pool bevat items met een andere tag');
    if (pool.some((it) => it.type === 'schrijven')) report.push('pool bevat schrijfopdrachten');
    if (pool.some((it) => !it._lesId || !it._dialect)) report.push('pool-item zonder _lesId of _dialect');
    const perLes = {};
    pool.forEach((it) => { perLes[it._lesId] = (perLes[it._lesId] || 0) + 1; });
    if (Object.values(perLes).some((n) => n > 3)) report.push('meer dan 3 items uit één les');
    const split = splitRound(pool);
    if (pool.length >= 15 && (split.oefen.length !== 10 || split.toets.length !== 5)) report.push(`ronde ${split.oefen.length} + ${split.toets.length} i.p.v. 10 + 5`);

    // Alle kandidaten, om het getoonde item te herkennen aan de vraagtekst.
    const all = lessons.flatMap((l) => l.oefeningen.flatMap((s) => s.items)).filter((it) => it.tag === tag && it.type !== 'schrijven');
    const finger = (it) => [it.vraag, it.bron, it.nl, it.instructie, it.zin && it.zin.split('___')[0], ...(it.paren || []).map((p) => p.nl), ...(it.opties || [])]
      .filter(Boolean).map(textOf);
    const current = () => {
      const shown = squash(document.querySelector('.ex-progress')?.parentElement?.innerText);
      const label = document.querySelector('.ex-type')?.textContent;
      const fits = all.filter((it) => typeLabel(it) === label && finger(it).every((f) => shown.includes(f)));
      const size = (it) => finger(it).join('').length;
      return fits.sort((a, b) => size(b) - size(a))[0];
    };
    await go('#/herhalen');
    if (!document.querySelector(`a[href="#/herhalen/${encodeURIComponent(tag)}"]`)) report.push('overzicht toont geen knop voor de zwakke tag');
    await go(`#/herhalen/${encodeURIComponent(tag)}`);
    await wait(300);
    const nOefen = Number(document.querySelector('.ex-progress span')?.textContent.split('/')[1]) || 0;
    if (!nOefen) report.push('geen oefenronde gestart');
    let goed = 0;
    for (let k = 0; k < nOefen; k++) {
      const it = current();
      if (!it) { report.push(`oefenvraag ${k + 1}: item niet herkend`); break; }
      await answer(it);
      if (document.querySelector('.feedback .title')?.textContent === 'Goed!') goed++;
      else report.push(`oefenvraag ${k + 1} (${it.type}): niet goed gerekend`);
      btn().click();
      await wait(80);
    }
    press(/^Start de toets$|^Bekijk de uitslag$/);
    await wait(150);
    const nToets = document.querySelector('.ex-actions') ? Number(document.querySelector('.ex-progress span')?.textContent.split('/')[1]) || 0 : 0;
    for (let k = 0; k < nToets; k++) {
      const it = current();
      if (!it) { report.push(`toetsvraag ${k + 1}: item niet herkend`); break; }
      await answer(it);
    }
    await wait(200);
    const page = document.querySelector('main#view').innerText;
    if (!/Voor en na deze ronde/.test(page)) report.push('uitslag met voor en na ontbreekt');
    if (nToets && !/100%/.test(document.querySelector('.result-head')?.innerText || '')) report.push('mini-toets niet 100%');
    const laatste = store.state.tags[tag].laatste;
    if (!/1{5}$/.test(laatste)) report.push(`tag ${tag}: laatste antwoorden ${laatste} (verwacht eindigend op 11111)`);
    report.push(`Herhalen: tag ${tag}, pool ${pool.length}, ronde ${nOefen} + ${nToets}, goed ${goed}; afwijkingen: ${report.length}`);
  } finally {
    store.importJson(snapshot);
  }
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

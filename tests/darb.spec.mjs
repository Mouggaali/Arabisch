// Browsertests van Darb (Playwright Test). Zie playwright.config.mjs voor het gebruik.
// - Elke pagina laadt zonder consolefouten en zonder horizontaal scrollen op telefoonbreedte.
// - De inhoudstest uit tools/selftest.js: alles goed (run), alles fout (runFout), alle werkwoorden (runTrainer).
// - Zoeken, diepe links en offline gebruik (service worker).
// - Leesteksten (runLezen: woord aantikken, vragen goed en fout) en zwakke plekken oefenen (runHerhalen).
// Steekproef bij elke push; met DARB_FULL=1 alle 228 eenheden (per jaar een test).

import { test, expect } from '@playwright/test';

const FULL = process.env.DARB_FULL === '1';
// Steekproef: een gewone les, de aanvoegende wijs, een schrijfopdracht, Darija en een evaluatie (alleen toets).
const SAMPLE = ['j1-p1-l01', 'j2-p5-l50', 'j3-p12-l139', 'j3-p12-d29', 'j3-p12-ne6'];

const ROUTES = [
  '#/vandaag', '#/lessen', '#/les/j1-p1-l01/woorden', '#/les/j1-p1-l01/grammatica', '#/les/j1-p1-l01/oefeningen',
  '#/les/j1-p1-l01/toets', '#/les/j3-p12-d29/woorden', '#/kaarten', '#/trainer', '#/trainer/qaala', '#/voortgang',
  '#/instellingen', '#/controle', '#/zoeken/huis', '#/herhalen', '#/lezen', '#/lezen/j1-p1-t1', '#/lezen/j3-p12-t2',
];

/** Open de app en wacht tot de eerste pagina getekend is. */
async function openApp(page, hash = '#/vandaag') {
  await page.goto('/' + hash);
  await expect(page.locator('main#view')).not.toHaveText(/^\s*Laden…\s*$/, { timeout: 20_000 });
}

/** Voer een functie uit tools/selftest.js uit in de pagina en geef het verslag terug. */
async function selftest(page, fn, ids) {
  return page.evaluate(async ([fn, ids]) => {
    const t = await import('/tools/selftest.js');
    const list = ids === 'ALL' ? await t.ids() : (typeof ids === 'object' && ids?.jaar ? await t.ids(ids) : ids);
    return t[fn](list);
  }, [fn, ids]);
}

test.describe('pagina\'s', () => {
  test('alle pagina\'s laden zonder fouten en passen op een telefoon', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    await page.setViewportSize({ width: 375, height: 812 });
    await openApp(page);
    for (const route of ROUTES) {
      await page.evaluate((h) => { location.hash = h; }, route);
      // De controlelijst laadt alle 228 lesbestanden; in Firefox duurt dat de eerste keer ± 15 s.
      await expect(page.locator('main#view'), `${route}: blijft laden`).not.toHaveText(/^\s*Laden…\s*$/, { timeout: route === '#/controle' ? 60_000 : 15_000 });
      await page.waitForTimeout(400);
      await expect(page.locator('main#view'), `${route}: foutmelding op de pagina`).not.toContainText('Er ging iets mis');
      const [scrollW, innerW] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(scrollW, `${route}: horizontaal scrollen op 375 px`).toBeLessThanOrEqual(innerW);
    }
    expect(errors, 'geen fouten in de console').toEqual([]);
  });

  test('zoeken vindt woorden en een diepe link opent het woord in de les', async ({ page }) => {
    await openApp(page, '#/zoeken/huis');
    await expect(page.getByRole('heading', { name: /^Woorden \(\d+/ })).toBeVisible();
    await expect(page.locator('.word-row').first()).toContainText('بَيْتٌ');
    const link = page.locator('.word-row a.note').first();
    const wordId = (await link.getAttribute('href')).split('/').pop();
    await link.click();
    await expect(page).toHaveURL(/#\/les\/j1-p1-l04\/woorden\//);
    // Het woord wordt in beeld gebracht (het oplichten zelf duurt maar 2,6 s).
    await expect(page.locator(`.word-row[data-target="${wordId}"]`)).toBeInViewport({ timeout: 10_000 });
  });
});

test.describe('inhoud', () => {
  if (!FULL) {
    test('steekproef: alle items goed beantwoord geven "Goed!" en 100% op de toets', async ({ page }) => {
      await openApp(page);
      const report = await selftest(page, 'run', SAMPLE);
      const lines = report.split('\n');
      expect(lines.filter((l) => / set \d+ item |FOUT bij weergave/.test(l)), 'items die niet als goed beoordeeld werden').toEqual([]);
      expect(lines.filter((l) => / toets: /.test(l) && !/100%/.test(l)), 'toetsen onder 100%').toEqual([]);
    });

    test('steekproef: fout beantwoord geeft "Niet goed", uitleg, tag-fout en flashcard', async ({ page }) => {
      await openApp(page);
      const report = await selftest(page, 'runFout', SAMPLE);
      expect(report, report).toMatch(/afwijkingen: 0$/);
    });
  } else {
    for (const jaar of [1, 2, 3]) {
      test(`volledig jaar ${jaar}: goed en fout`, async ({ page }) => {
        await openApp(page);
        const goed = await selftest(page, 'run', { jaar });
        const lines = goed.split('\n');
        expect(lines.filter((l) => / set \d+ item /.test(l) || (/ toets: /.test(l) && !/100%/.test(l))), goed).toEqual([]);
        const fout = await selftest(page, 'runFout', { jaar });
        expect(fout, fout).toMatch(/afwijkingen: 0$/);
      });
    }
  }

  test('leesteksten: woord aantikken, vragen goed en fout', async ({ page }) => {
    await openApp(page);
    const report = await selftest(page, 'runLezen', FULL ? undefined : ['j1-p1-t1', 'j2-p7-t2', 'j3-p12-t2']);
    expect(report, report).toMatch(/afwijkingen: 0$/);
  });

  test('zwakke plekken oefenen: ronde van 10 vragen en een mini-toets', async ({ page }) => {
    await openApp(page);
    const report = await selftest(page, 'runHerhalen');
    expect(report, report).toMatch(/ronde 10 \+ 5.*afwijkingen: 0$/);
  });

  test('trainer: alle werkwoorden in alle tijden en wijzen', async ({ page }) => {
    await openApp(page);
    const report = await selftest(page, 'runTrainer');
    expect(report, report).toMatch(/afwijkingen: 0$/);
  });
});

test.describe('offline', () => {
  test('na "Alle lessen offline beschikbaar maken" werkt een les zonder internet', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Offline-simulatie met service worker alleen betrouwbaar in Chromium');
    await openApp(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); // nu stuurt de service worker de pagina aan
    await expect(page.locator('main#view')).not.toHaveText(/^\s*Laden…\s*$/);
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await page.evaluate(() => { location.hash = '#/instellingen'; });
    await page.getByRole('button', { name: 'Alle lessen offline beschikbaar maken' }).click();
    await expect(page.getByText(/^Klaar: alle \d+ bestanden zijn offline beschikbaar\.$/)).toBeVisible({ timeout: 120_000 });

    await context.setOffline(true);
    await page.goto('/#/les/j2-p6-l69/woorden');
    await expect(page.locator('main#view')).toContainText('Winkel en markt', { timeout: 20_000 });
    await page.evaluate(() => { location.hash = '#/zoeken/huis'; });
    await expect(page.getByRole('heading', { name: /^Woorden \(\d+/ })).toBeVisible();
    await page.evaluate(() => { location.hash = '#/lezen/j2-p6-t2'; });
    await expect(page.locator('.reader .tok').first()).toBeVisible();
    await context.setOffline(false);
  });
});

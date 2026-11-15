// Instellingen, export/import van voortgang en de controlelijst voor een moedertaalspreker.

import { h, icon, toast, today } from '../core/util.js';
import { store } from '../core/store.js';
import { speech } from '../core/speech.js';
import { content } from '../core/content.js';
import { ar, tr, reviewFlag } from '../ui/components.js';
import { applyTranslit } from '../ui/translit.js';
import { applyTheme } from '../ui/theme.js';

export function renderSettings(main) {
  const s = store.settings;

  const voiceSelect = h('select.sel', { 'aria-label': 'Arabische stem', onchange: (e) => store.setSetting('stem', e.target.value) });
  const fillVoices = () => voiceSelect.replaceChildren(
    h('option', { value: '' }, speech.available ? 'Automatisch (voorkeur Standaard Arabisch)' : 'Geen Arabische stem gevonden'),
    ...speech.voices.map((v) => h('option', { value: v.voiceURI, selected: v.voiceURI === s.stem }, `${v.name} (${v.lang})`)));
  fillVoices();
  speech.onVoices(fillVoices);

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden', onchange: importFile });

  main.replaceChildren(
    h('div.page-head', h('h1', 'Instellingen')),
    h('section.panel.glass.rows',
      setting('Transliteratie', 'Latijnse uitspraak onder het Arabisch. "Automatisch" volgt het leerplan: aan in jaar 1 periode 1 en 2, daarna uit. Bij Darija altijd aan.',
        select([['auto', 'Automatisch'], ['aan', 'Altijd tonen'], ['uit', 'Nooit tonen']], s.translit, (v) => { store.setSetting('translit', v); applyTranslit(); })),
      setting('Streng op harakat', 'Uit: een antwoord is goed als de letters kloppen. Aan: ook de klinkertekens moeten kloppen.',
        select([['false', 'Uit'], ['true', 'Aan']], String(s.strengHarakat), (v) => store.setSetting('strengHarakat', v === 'true'))),
      setting('Nieuwe flashcards per dag', 'Hoeveel nieuwe woorden er per dag in je herhaling komen.',
        h('input.num', { type: 'number', min: 5, max: 60, value: s.nieuwPerDag, style: { width: '90px' }, onchange: (e) => store.setSetting('nieuwPerDag', Math.max(5, Math.min(60, Number(e.target.value) || 20))) })),
      setting('Arabische stem', speech.supported
        ? 'Voor de audio wordt de spraak van je browser of besturingssysteem gebruikt. Geen stem? Voeg in Windows een Arabische stem toe via Instellingen > Tijd en taal > Spraak, en herstart de browser. Chrome en Edge hebben vaak ook online stemmen.'
        : 'Deze browser ondersteunt geen spraaksynthese.', voiceSelect),
      setting('Spreeksnelheid', 'Langzamer helpt bij nieuwe woorden.',
        select([['0.6', 'Langzaam'], ['0.8', 'Rustig'], ['1', 'Normaal']], String(s.spraakSnelheid), (v) => store.setSetting('spraakSnelheid', Number(v)))),
      setting('Weergave', 'Licht, donker of volgens je systeem.',
        select([['auto', 'Systeem'], ['licht', 'Licht'], ['donker', 'Donker']], s.thema, (v) => { store.setSetting('thema', v); applyTheme(); }))),

    h('section.panel.glass.rows', { style: { marginTop: '18px' } },
      h('h2', 'Planning en motivatie'),
      setting('Startdatum', 'Vanaf deze dag rekent de planning met ± 1,5 eenheid per week. Leeg = je eerste oefendag.',
        h('input.num', { type: 'date', value: s.startdatum, style: { width: '160px' }, onchange: (e) => store.setSetting('startdatum', e.target.value) })),
      setting('Dagdoel', 'Aantal herhaalde kaarten plus oefenantwoorden per dag. 20 is ongeveer een kwartier.',
        h('input.num', { type: 'number', min: 5, max: 200, step: 5, value: s.dagdoel, style: { width: '90px' }, onchange: (e) => store.setSetting('dagdoel', Math.max(5, Math.min(200, Number(e.target.value) || 20))) })),
      reminderSetting()),

    offlinePanel(),

    h('section.panel.glass', { style: { marginTop: '18px' } },
      h('h2', 'Voortgang bewaren'),
      h('p.sub', 'Je voortgang staat alleen in deze browser, en per adres: wat je op http://localhost:8080 deed, staat niet automatisch in de online versie of op je telefoon. Exporteer daar en importeer hier om verder te gaan. Maak ook regelmatig een back-up, zeker voordat je browsergegevens wist.'),
      h('div.btn-row',
        h('button.btn', { type: 'button', onclick: exportFile }, 'Exporteer voortgang'),
        h('button.btn.btn--ghost', { type: 'button', onclick: () => fileInput.click() }, 'Importeer voortgang'),
        fileInput,
        h('button.btn.btn--ghost', { type: 'button', style: { marginLeft: 'auto' }, onclick: resetAll }, 'Alles wissen'))),

    h('section.panel.glass', { style: { marginTop: '18px' } },
      h('h2', 'Controlelijst voor een moedertaalspreker'),
      h('p.sub', 'Inhoud waarover twijfel bestaat is gemarkeerd. Laat deze punten nakijken en pas daarna de lesbestanden aan (zie CLAUDE.md).'),
      h('a.btn.btn--ghost', { href: '#/controle' }, icon('flag'), 'Open de controlelijst')));
}

/**
 * Herinnering: een melding op een dag waarop je nog niet geoefend hebt. Zonder server kan dat alleen
 * met Periodic Background Sync (Chrome op Android, als de app geïnstalleerd is). Zie syncReminder() in app.js.
 */
function reminderSetting() {
  const supported = 'Notification' in window && 'serviceWorker' in navigator;
  const periodic = supported && 'periodicSync' in ServiceWorkerRegistration.prototype;
  const desc = !supported
    ? 'Deze browser ondersteunt geen meldingen.'
    : periodic
      ? 'Een melding op een dag waarop je nog niet geoefend hebt. Werkt als Darb als app is geïnstalleerd; je telefoon bepaalt zelf het precieze moment.'
      : 'Deze browser kan geen meldingen sturen terwijl de app dicht is (dat kan alleen Chrome op Android, met de app geïnstalleerd). Je kunt wel een testmelding proberen.';
  const sel = select([['false', 'Uit'], ['true', 'Aan']], String(store.settings.herinnering), async (v) => {
    if (v === 'true') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        sel.value = 'false';
        toast('Meldingen zijn niet toegestaan. Sta ze toe in de browserinstellingen.');
        return;
      }
    }
    store.setSetting('herinnering', v === 'true');
    window.dispatchEvent(new Event('darb-herinnering'));
    toast(v === 'true' ? 'Herinnering staat aan' : 'Herinnering staat uit');
  });
  sel.disabled = !supported;
  const test = h('button.btn.btn--ghost.btn--small', {
    type: 'button', disabled: !supported,
    onclick: async () => {
      if ((await Notification.requestPermission()) !== 'granted') { toast('Meldingen zijn niet toegestaan.'); return; }
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification('Darb · Arabisch', { body: 'Zo ziet een herinnering eruit. Tik om je flashcards te openen.', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'darb-test', data: { url: './#/kaarten' } });
    },
  }, icon('bell'), 'Testmelding');
  return setting('Herinnering', desc, h('div.btn-row', { style: { gap: '8px', flexWrap: 'nowrap' } }, sel, test));
}

/** Alle lesbestanden in de cache van de service worker zetten, zodat de hele cursus offline werkt. */
function offlinePanel() {
  const status = h('p.soft.small', { style: { margin: '10px 0 0' } });
  const supported = 'caches' in window && 'serviceWorker' in navigator;
  const run = async () => {
    btn.disabled = true;
    try {
      const cur = await content.curriculum();
      const files = ['content/curriculum.json', 'content/werkwoorden.json', 'content/tags.json',
        ...cur.order.filter((u) => u.bestand).map((u) => 'content/' + u.bestand)];
      const cache = await caches.open('darb-content');
      let done = 0, failed = 0;
      for (const f of files) {
        try {
          const res = await fetch(f, { cache: 'no-cache' });
          if (res.ok) await cache.put(new URL(f, location.href).href, res);
          else failed++;
        } catch { failed++; }
        done++;
        if (done % 10 === 0 || done === files.length) status.textContent = `${done} van ${files.length} bestanden geladen…`;
      }
      status.textContent = failed
        ? `${files.length - failed} van ${files.length} bestanden offline beschikbaar; ${failed} mislukt. Probeer het opnieuw met een goede verbinding.`
        : `Klaar: alle ${files.length} bestanden zijn offline beschikbaar.`;
      if (!failed) toast('Alle lessen zijn offline beschikbaar');
    } catch (err) {
      status.textContent = 'Offline maken lukte niet: ' + err.message;
    }
    btn.disabled = false;
  };
  const btn = h('button.btn', { type: 'button', onclick: run, disabled: !supported }, 'Alle lessen offline beschikbaar maken');
  return h('section.panel.glass', { style: { marginTop: '18px' } },
    h('h2', 'Offline en op je telefoon'),
    h('p.sub', supported
      ? 'Lessen die je hebt geopend werken ook zonder internet. Met deze knop laad je alle 228 eenheden in één keer (ongeveer 4,5 MB). Op je telefoon kun je Darb daarna als app installeren: in Chrome via het menu > "App installeren", in Safari via Delen > "Zet op beginscherm".'
      : 'Deze browser ondersteunt geen offline gebruik.'),
    h('div.btn-row', btn), status);
}

function setting(title, desc, control) {
  return h('div.setting', h('div', h('b', title), h('span', desc)), control);
}

function select(options, value, onChange) {
  return h('select.sel', { onchange: (e) => onChange(e.target.value) }, options.map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
}

function exportFile() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `arabisch-voortgang-${today()}.json` });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  toast('Voortgang geëxporteerd');
}

async function importFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    if (!confirm('Je huidige voortgang wordt vervangen door de inhoud van dit bestand. Doorgaan?')) return;
    store.importJson(text);
    toast('Voortgang geïmporteerd');
    location.hash = '#/vandaag';
  } catch (err) {
    alert('Importeren mislukt: ' + err.message);
  } finally {
    e.target.value = '';
  }
}

function resetAll() {
  if (confirm('Weet je zeker dat je al je voortgang wilt wissen? Exporteer eerst als je een back-up wilt.')) {
    store.reset();
    toast('Voortgang gewist');
    location.hash = '#/vandaag';
  }
}

/* ------------------------------------------------------------ controlelijst -- */
export async function renderReviewList(main) {
  const lessons = await content.allLessons();
  const verbs = (await content.verbs()).werkwoorden;
  const items = [];
  const scan = (obj, where) => {
    if (!obj || typeof obj !== 'object') return;
    if (obj.review) items.push({ where, obj });
    for (const [k, v] of Object.entries(obj)) {
      if (k !== 'review' && k !== 'unit' && typeof v === 'object') scan(v, where);
    }
  };
  lessons.forEach((l) => scan(l, `${l.code} ${l.titel}`));
  verbs.forEach((v) => v.review && items.push({ where: 'Werkwoorden', obj: v }));

  main.replaceChildren(
    h('div.page-head', h('h1', 'Controlelijst'), h('p', `${items.length} gemarkeerde onderdelen. Elk punt bevat wat er gecontroleerd moet worden.`)),
    h('section.panel.glass', items.length
      ? h('ul.list.rows', items.map(({ where, obj }) =>
          h('li', h('div.soft.small', where),
            h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
              obj.ar ? ar(obj.ar) : null, obj.tr ? tr(obj.tr) : null, obj.nl ? h('span', [].concat(obj.nl).join(' · ')) : null, reviewFlag(obj.review)),
            h('p.small', { style: { margin: '4px 0 0' } }, obj.review.note || ''))))
      : h('p.soft', 'Er zijn geen gemarkeerde onderdelen.')));
}

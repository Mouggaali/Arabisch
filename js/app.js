// Darb: Arabisch leren. Opstart, navigatie (hash-router) en de vaste schil.
// Routes: #/vandaag  #/lessen  #/les/<id>/<onderdeel>[/<woord-id of grammatica-nr>]  #/kaarten  #/trainer[/<werkwoord>]
//         #/voortgang  #/instellingen  #/controle  #/zoeken[/<term>]

import { h, icon } from './core/util.js';
import { store } from './core/store.js';
import { dueToday } from './core/srs.js';
import { keyboard } from './ui/keyboard.js';
import { mountWorld, dimAll, relayoutWorld } from './ui/world.js';
import { applyTranslit } from './ui/translit.js';
import { applyTheme } from './ui/theme.js';
import { renderToday } from './views/today.js';
import { renderLessons } from './views/lessons.js';
import { renderLesson } from './views/lesson.js';
import { renderFlashcards } from './views/flashcards.js';
import { renderTrainer } from './views/trainer.js';
import { renderProgress } from './views/progress.js';
import { renderSettings, renderReviewList } from './views/settings.js';
import { renderSearch } from './views/search.js';
import { dayTotal, streak } from './views/progress-model.js';

const ROUTES = {
  vandaag: { render: renderToday, title: 'Vandaag' },
  lessen: { render: renderLessons, title: 'Lessen' },
  les: { render: renderLesson, title: 'Les', nav: 'lessen' },
  kaarten: { render: renderFlashcards, title: 'Flashcards' },
  trainer: { render: renderTrainer, title: 'Vervoegingstrainer' },
  voortgang: { render: renderProgress, title: 'Voortgang' },
  instellingen: { render: renderSettings, title: 'Instellingen' },
  controle: { render: renderReviewList, title: 'Controlelijst', nav: 'instellingen' },
  zoeken: { render: renderSearch, title: 'Zoeken' },
};

const NAV = [
  ['vandaag', 'Vandaag', 'today'],
  ['lessen', 'Lessen', 'book'],
  ['kaarten', 'Kaarten', 'cards'],
  ['trainer', 'Trainer', 'verb'],
  ['voortgang', 'Voortgang', 'chart'],
  ['zoeken', 'Zoeken', 'search', 'rail-extra'],
  ['instellingen', 'Instellingen', 'gear', 'rail-extra'],
];

const main = document.getElementById('view');
let sc = null;

function buildShell() {
  const translitBtn = h('button.icon-btn', {
    type: 'button', title: 'Transliteratie aan/uit', 'aria-label': 'Transliteratie aan of uit',
    onclick: () => {
      const showing = !document.body.classList.contains('hide-tr');
      store.setSetting('translit', showing ? 'uit' : 'aan');
      syncTranslitBtn();
    },
  }, icon('latin'), h('span.label', 'Translit.'));
  function syncTranslitBtn() {
    applyTranslit();
    translitBtn.setAttribute('aria-pressed', String(!document.body.classList.contains('hide-tr')));
  }

  const bar = h('header.bar',
    h('a.brand.glass', { href: '#/vandaag' }, h('span.ar', { lang: 'ar' }, 'دَرْب'), h('span.label', 'Darb · Arabisch')),
    h('span.spacer'),
    h('div.tools.glass',
      h('a.icon-btn', { href: '#/zoeken', title: 'Zoeken', 'aria-label': 'Zoeken' }, icon('search')),
      translitBtn,
      h('button.icon-btn', { type: 'button', title: 'Arabisch toetsenbord', 'aria-label': 'Arabisch toetsenbord', onmousedown: (e) => e.preventDefault(), onclick: () => keyboard.toggle() }, icon('kbd')),
      h('a.icon-btn', { href: '#/instellingen', title: 'Instellingen', 'aria-label': 'Instellingen' }, icon('gear'))));

  const rail = h('nav.rail.glass', { 'aria-label': 'Hoofdmenu' },
    NAV.map(([id, label, ic, extra]) =>
      h('a' + (extra ? '.' + extra : ''), { href: '#/' + id, dataset: { nav: id } }, icon(ic), h('span', label), id === 'kaarten' ? h('span.badge.hidden', { id: 'due-badge' }) : null)));

  document.body.insertBefore(rail, main);
  document.body.insertBefore(bar, rail);
  return { syncTranslitBtn };
}

function updateBadge() {
  const b = document.getElementById('due-badge');
  if (!b) return;
  const n = dueToday().length;
  b.textContent = n > 99 ? '99+' : n;
  b.classList.toggle('hidden', n === 0);
}

async function route() {
  const [name = 'vandaag', ...params] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const r = ROUTES[name] || ROUTES.vandaag;
  const navId = r.nav || (ROUTES[name] ? name : 'vandaag');
  document.querySelectorAll('.rail a').forEach((a) =>
    a.dataset.nav === navId ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  document.title = `${r.title} · Darb`;

  keyboard.close();
  dimAll();
  if (name !== 'les') applyTranslit(null);
  shell.syncTranslitBtn();

  main.replaceChildren(h('p.soft', 'Laden…'));
  try {
    await r.render(main, params);
  } catch (err) {
    console.error(err);
    main.replaceChildren(h('section.panel.glass',
      h('h2', 'Er ging iets mis'),
      h('p', err.message),
      location.protocol === 'file:' ? h('p.soft', 'Open de app via start.bat (lokale server). Browsers blokkeren het laden van lesbestanden via file://.') : null));
  }
  shell.syncTranslitBtn();
  window.scrollTo(0, 0);
  updateBadge();
  relayout();
}

function relayout() {
  if (sc) requestAnimationFrame(() => { sc.layout(); relayoutWorld(); });
}

applyTheme();
const shell = buildShell();
mountWorld();
if (window.ScrollCraft) {
  sc = window.ScrollCraft.mount(document.body);
  new ResizeObserver(relayout).observe(main);
}
store.onChange(updateBadge);
window.addEventListener('hashchange', route);
route();
registerServiceWorker();
let reminderTimer = null;
const scheduleReminder = () => { clearTimeout(reminderTimer); reminderTimer = setTimeout(syncReminder, 1500); };
store.onChange(scheduleReminder);
window.addEventListener('darb-herinnering', syncReminder);
scheduleReminder();

/**
 * Herinnering: de service worker kan localStorage niet lezen. Daarom schrijft de pagina de laatste oefendag,
 * de reeks en de instelling in cache 'darb-status'; sw.js leest die bij een periodieke synchronisatie.
 */
async function syncReminder() {
  if (!('serviceWorker' in navigator) || !('caches' in window) || !navigator.serviceWorker.controller) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const cache = await caches.open('darb-status');
    const old = await cache.match('status.json').then((r) => r?.json()).catch(() => null) || {};
    const actief = Object.keys(store.state.dagen).filter((k) => dayTotal(k) > 0).sort();
    const status = { ...old, herinnering: store.settings.herinnering, laatsteActiviteit: actief.at(-1) || '', reeks: streak() };
    await cache.put('status.json', new Response(JSON.stringify(status), { headers: { 'Content-Type': 'application/json' } }));
    if ('periodicSync' in reg) {
      if (store.settings.herinnering && Notification.permission === 'granted') {
        await reg.periodicSync.register('darb-herinnering', { minInterval: 12 * 3600 * 1000 });
      } else {
        await reg.periodicSync.unregister('darb-herinnering');
      }
    }
  } catch (err) {
    // Periodic sync mag alleen voor een geïnstalleerde app; anders gewoon geen herinnering.
    console.info('Herinnering niet ingepland:', err.message);
  }
}

/** Service worker (offline en installeerbaar). Alleen over https of op de eigen computer. */
function registerServiceWorker() {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || local)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller && !local) offerUpdate(worker);
      });
    });
  }).catch((err) => console.warn('Service worker niet geregistreerd:', err));
  // Alleen herladen bij een update (er was al een service worker), niet bij het allereerste bezoek.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloading && !local) { reloading = true; location.reload(); }
  });
}

function offerUpdate(worker) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  document.body.appendChild(h('div.toast.glass', { role: 'status' },
    'Er is een nieuwe versie van Darb. ',
    h('button.btn.btn--small', { type: 'button', onclick: () => worker.postMessage({ type: 'SKIP_WAITING' }) }, 'Herladen')));
}

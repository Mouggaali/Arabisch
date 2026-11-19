// Kleine DOM- en datumhulpjes die door alle modules gedeeld worden.

/** Maak een element: h('div.panel.glass', { onclick }, kind1, 'tekst', ...) */
export function h(tag, attrs, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs != null && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs);
    attrs = null;
  }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className += (el.className ? ' ' : '') + v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** Arabische tekst met de juiste taal- en richtingsattributen. */
export function ar(text, size = '') {
  return h('span.ar' + (size ? '.ar--' + size : ''), { lang: 'ar', dir: 'rtl' }, text);
}

/** Transliteratie; verborgen via body.hide-tr. */
export function tr(text) {
  return text ? h('span.tr', { lang: 'ar-Latn' }, text) : null;
}

/**
 * Zet eenvoudige opmaak om in HTML: **vet**, *cursief* en {ar|tekst} voor Arabisch.
 * De invoer komt uit onze eigen contentbestanden; toch eerst escapen.
 */
export function rich(text) {
  // {ar|...} eerst apart zetten; losse Arabische stukken daarbuiten krijgen een <bdi>.
  const kept = [];
  const marked = escapeHtml(text).replace(/\{ar\|([^}]+)\}/g, (_, a) => {
    kept.push(a);
    return `\u0000${kept.length - 1}\u0000`;
  });
  return wrapArabicRuns(marked)
    .replace(/\u0000(\d+)\u0000/g, (_, i) => `<span class="ar" lang="ar" dir="rtl">${kept[i]}</span>`)
    .replace(/\{tr\|([^}]+)\}/g, '<span class="tr">$1</span>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Datum als 'JJJJ-MM-DD' in lokale tijd. */
export function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('sv-SE');
}

/** 'JJJJ-MM-DD' als Nederlandse datum, bijv. "15 november 2026". */
export function formatDate(key, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-NL', opts);
}

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pct(x) {
  return Math.round(x * 100) + '%';
}

export function toast(message) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h('div.toast.glass', { role: 'status' }, message);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

const PATHS = {
  today: 'M3 12h3m12 0h3M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1m-8.6 8.6-2.1 2.1M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zm0 16a2 2 0 0 1 2-2h13',
  cards: 'M7 4h12a1 1 0 0 1 1 1v12M4 8h12a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z',
  verb: 'M4 6h16M4 12h10M4 18h7m7-3 3 3-3 3',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 3a8 8 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2-1.2L15 2h-4l-.5 2.6a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A8 8 0 0 0 4 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2 1.2L11 22h4l.5-2.6a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  sound: 'M4 9v6h4l5 4V5L8 9H4zm12.5-1.5a5 5 0 0 1 0 9M19 5a9 9 0 0 1 0 14',
  check: 'M5 12.5 10 17 19 7',
  x: 'M6 6l12 12M18 6 6 18',
  kbd: 'M3 7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7zm4 7h10M7 10h.01M11 10h.01M15 10h.01',
  latin: 'M4 18 8.5 6 13 18M5.6 14h5.8M15 12.5c0-1.4 1.1-2.5 2.5-2.5S20 11.1 20 12.5V18m0-3.2c-.5 1.6-1.6 3.2-3.2 3.2-1.2 0-1.8-.8-1.8-1.7 0-1.6 2-2.2 5-2.2',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  back: 'M19 12H5m6-6-6 6 6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4',
  flame: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 0 2 1 3 2 3.5C11.5 9 11 6 12 3z',
  calendar: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6zm0 4h16M8 3v4m8-4v4',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zm4 4h4',
  read: 'M3 5.5C5.5 4 9 4 12 6c3-2 6.5-2 9-.5V19c-2.5-1.5-6-1.5-9 .5-3-2-6.5-2-9-.5V5.5zM12 6v13.5',
};

export function icon(name) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PATHS[name] || '');
  svg.appendChild(p);
  return svg;
}

/** Gewone tekst met losse Arabische stukken: elk Arabisch stuk in een eigen <bdi>, zodat de volgorde klopt. */
export function bidi(text) {
  return wrapArabicRuns(escapeHtml(text).replace(/\*\*/g, ''));
}

// Een Arabisch stuk begint met een letter of tatweel (ـ) en mag harakat en spaties bevatten. Een / scheidt twee stukken, zodat "m / v" in de Nederlandse leesrichting blijft.
const AR_RUN = /[؀-ۿ](?:[؀-ۿً-ْٰ\s]*[؀-ۿً-ْٰ؟])?/g;

function wrapArabicRuns(html) {
  return html.replace(AR_RUN, (m) => `<bdi lang="ar" class="ar-inline">${m}</bdi>`);
}

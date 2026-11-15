/* ============================================================================
   glass.js: het licht achter het glas
   ----------------------------------------------------------------------------
   Vanilla JS, geen afhankelijkheden. Vult een vaste .world-laag met lichten (.orb).
   Bedoeld als startpunt voor de signature: koppel elk licht aan iets echts (een
   indicator, een product, een teamlid) en laat het achter het element glijden dat de
   bezoeker aanwijst. Bouw je eigen signature hierop; dit is het mechanisme, niet het idee.

     const world = GlassWorld.mount(document.querySelector('.world'), {
       lights: [{ id: 'a', color: 'var(--bull)', size: 20 }, ...],   // size in vmax
       ambient: [{ id: 'gold', color: '#f0c46a', at: [0.1, 0.86] }],  // at = fractie van viewport
       ring: { center: [0.72, 0.5], radius: [0.24, 0.34], phone: { center: [0.5, 0.3], radius: [0.42, 0.2] } },
       parallax: 0.035,       // lichten zakken langzamer weg dan de pagina (max 260px)
     });
     world.light('a', element);  // licht glijdt achter element en volgt het bij scrollen
     world.dim('a');             // terug naar huis
     world.color('a', 'var(--bear)');
     world.focus('gold', element); // een ambient licht achter een paneel zolang dat in beeld is
     world.unfocus('gold');

   Coördinaten zijn viewport-pixels: de wereld staat vast. Alles loopt via transform.
   Onder prefers-reduced-motion geen parallax en geen zweefanimatie (zie glass.css).
   ========================================================================== */

(function (global) {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function mount(root, opts) {
    opts = opts || {};
    var orbs = new Map();
    var shift = 0, frame = 0;
    var ring = opts.ring || { center: [0.5, 0.5], radius: [0.3, 0.3] };
    var rate = opts.parallax == null ? 0.035 : opts.parallax;

    function make(id, color, size, dur, ambient) {
      var el = document.createElement('div');
      el.className = 'orb' + (ambient ? ' orb--ambient' : '');
      el.style.setProperty('--s', size + 'vmax');
      el.style.setProperty('--d', dur + 's');
      el.style.setProperty('--c', color);
      el.appendChild(document.createElement('i'));
      if (ambient) root.insertBefore(el, root.firstChild); else root.appendChild(el);
      return el;
    }

    var lights = opts.lights || [];
    lights.forEach(function (l, i) {
      orbs.set(l.id, { el: make(l.id, l.color, l.size || 18 + (i * 5) % 9, 14 + (i * 7) % 11, false), i: i, n: lights.length, target: null });
    });
    (opts.ambient || []).forEach(function (a, i) {
      orbs.set(a.id, { el: make(a.id, a.color, a.size || 46, 22 + i * 5, true), at: a.at || [0.5, 0.5], target: null });
    });

    function place(o, x, y, k) {
      o.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + k + ')';
    }

    function home(o) {
      var w = innerWidth, h = innerHeight;
      if (o.at) return place(o, o.at[0] * w, o.at[1] * h - shift * 0.5, 1);
      var r = w < 860 && ring.phone ? ring.phone : ring;
      var a = -Math.PI / 2 + (o.i / o.n) * Math.PI * 2;
      place(o, r.center[0] * w + r.radius[0] * w * Math.cos(a), r.center[1] * h + r.radius[1] * h * Math.sin(a) - shift, 1);
    }

    // Achter een rij: iets rechts van het midden. Achter een paneel: zolang het in beeld is.
    function follow(o) {
      var r = o.target.getBoundingClientRect();
      if (o.at) {
        if (r.top < innerHeight && r.bottom > 0) {
          var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, innerHeight);
          place(o, r.left + r.width * 0.3, top + (bottom - top) * 0.45, 1);
        } else home(o);
      } else place(o, r.left + r.width * 0.78, r.top + r.height / 2, 1.15);
    }

    function update() {
      frame = 0;
      shift = reduce ? 0 : Math.min(scrollY * rate, 260);
      orbs.forEach(function (o) { if (o.target) follow(o); else home(o); });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(update); }

    addEventListener('scroll', schedule, { passive: true });
    addEventListener('resize', schedule);
    update();

    var api = {
      light: function (id, target) {
        var o = orbs.get(id); if (!o) return;
        // Eén licht tegelijk per soort: een rij-licht verdringt geen paneel-licht.
        orbs.forEach(function (p, k) { if (k !== id && p.target && !p.at === !o.at) api.dim(k); });
        o.target = target; o.el.classList.add('is-lit'); follow(o);
      },
      dim: function (id) {
        var o = orbs.get(id); if (!o) return;
        o.target = null; o.el.classList.remove('is-lit'); home(o);
      },
      color: function (id, color) { var o = orbs.get(id); if (o) o.el.style.setProperty('--c', color); },
      focus: function (id, target) { api.light(id, target); },
      unfocus: function (id) { api.dim(id); },
      update: schedule,
      orbs: orbs,
    };
    return api;
  }

  global.GlassWorld = { mount: mount };
})(window);

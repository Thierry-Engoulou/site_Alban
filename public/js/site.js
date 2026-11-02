/* HIGH QUALITY — interactions du site public */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- en-tête : transparent sur le héros, plein ensuite, masqué en descente ---------- */
  var header = document.querySelector('[data-header]');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle('is-solid', y > 40 && !doc.classList.contains('menu-open') || header.hasAttribute('data-solid'));
      header.classList.toggle('is-hidden', y > 500 && y > lastY + 4 && !doc.classList.contains('menu-open'));
      if (y < lastY - 4) header.classList.remove('is-hidden');
      doc.classList.toggle('hdr-off', header.classList.contains('is-hidden'));
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menu mobile ---------- */
  var burger = document.querySelector('[data-burger]');
  var menu = document.querySelector('[data-menu]');
  function setMenu(open) {
    doc.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { menu.removeAttribute('hidden'); header.classList.remove('is-hidden'); }
    else { setTimeout(function () { if (!doc.classList.contains('menu-open')) menu.setAttribute('hidden', ''); }, 300); }
    onScroll();
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!doc.classList.contains('menu-open')); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && doc.classList.contains('menu-open')) setMenu(false); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ---------- heure de Douala ---------- */
  var clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    var fmt;
    try { fmt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { fmt = null; }
    var tick = function () {
      var t = fmt ? fmt.format(new Date()) : '';
      clocks.forEach(function (c) { c.textContent = t.replace(':', ' h '); });
    };
    tick();
    setInterval(tick, 20000);
  }

  /* ---------- apparition au défilement ---------- */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    rv.forEach(function (el) { io.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- compteurs ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var end = parseFloat(el.getAttribute('data-count'));
    if (reduce) { el.textContent = end.toLocaleString('fr-FR'); return; }
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var v = Math.round(end * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString('fr-FR');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { runCount(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { co.observe(c); });
  }

  /* ---------- liste des métiers : la photo suit le survol ---------- */
  var mlist = document.querySelector('[data-mlist]');
  if (mlist) {
    var rows = mlist.querySelectorAll('.mrow');
    var imgs = mlist.querySelectorAll('.mfig__frame img');
    var cap = mlist.querySelector('[data-mcap]');
    var show = function (i) {
      rows.forEach(function (r, j) { r.classList.toggle('is-on', i === j); });
      imgs.forEach(function (im, j) { im.classList.toggle('is-on', i === j); });
      if (cap) cap.textContent = rows[i].getAttribute('data-cap') || '';
    };
    rows.forEach(function (r, i) {
      r.addEventListener('mouseenter', function () { show(i); });
      r.addEventListener('focus', function () { show(i); });
    });
  }

  /* ---------- léger parallaxe sur les bandeaux photo ---------- */
  var bands = document.querySelectorAll('.band img');
  if (bands.length && !reduce) {
    var raf = null;
    var par = function () {
      raf = null;
      bands.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        var p = (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight;
        img.style.transform = 'translate3d(0,' + (p * -6).toFixed(2) + '%,0)';
      });
    };
    window.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(par); }, { passive: true });
    par();
  }

  /* ---------- sous-navigation des métiers ---------- */
  var sub = document.querySelector('[data-subnav]');
  if (sub && 'IntersectionObserver' in window) {
    var links = sub.querySelectorAll('a');
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute('href') === '#' + en.target.id;
          a.classList.toggle('is-on', on);
          if (on && a.scrollIntoView && window.innerWidth < 900) {
            sub.querySelector('.wrap').scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.metier[id]').forEach(function (s) { so.observe(s); });
  }

  /* ---------- onglets (pose aérienne / souterraine, devis / message) ---------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = list.querySelectorAll('[role="tab"]');
    function select(tab) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!k) return;
        var n = tabs[(i + k + tabs.length) % tabs.length];
        n.focus(); select(n);
      });
    });
    var wanted = list.getAttribute('data-hash-tabs') && location.hash;
    if (wanted) {
      tabs.forEach(function (t) { if ('#' + t.getAttribute('aria-controls') === location.hash) select(t); });
    }
  });

  /* ---------- copier dans le presse-papiers ---------- */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var old = b.textContent;
      var done = function () { b.textContent = 'copié'; setTimeout(function () { b.textContent = old; }, 1400); };
      try { navigator.clipboard.writeText(b.getAttribute('data-copy')).then(done, done); } catch (e) { done(); }
    });
  });

  /* ---------- pré-remplissage depuis l'URL (?metier=… / ?poste=…) ---------- */
  var params = new URLSearchParams(location.search);
  var metier = params.get('metier');
  if (metier) {
    var chip = document.querySelector('input[name="service_type"][value="' + metier.replace(/"/g, '') + '"]');
    if (chip) chip.checked = true;
  }
  document.querySelectorAll('[data-poste]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = document.getElementById('c-poste');
      if (sel) sel.value = a.getAttribute('data-poste');
    });
  });

  /* ---------- formulaires connectés à l'API ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  document.querySelectorAll('form[data-api]').forEach(function (form) {
    var msg = form.querySelector('.form-msg');
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = typeof v === 'string' ? v.trim() : v; });

      // candidature : on range le poste dans l'objet du message
      if (form.hasAttribute('data-job')) {
        data.subject = 'Candidature — ' + (data.poste || 'spontanée');
        delete data.poste;
      }

      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = 'Envoi en cours…';
      msg.className = 'form-msg';

      fetch(form.getAttribute('data-api'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j && res.j.error);
          msg.className = 'form-msg is-ok';
          msg.innerHTML = res.j.ref_code
            ? '<b>Demande bien reçue.</b>Votre référence : <code>' + esc(res.j.ref_code) + '</code>. Un ingénieur vous rappelle sous 24 à 48 h ouvrées.'
            : '<b>Message envoyé.</b>Merci, nous revenons vers vous rapidement.';
          form.reset();
        })
        .catch(function (err) {
          msg.className = 'form-msg is-err';
          msg.innerHTML = '<b>L\'envoi n\'a pas abouti.</b>' + esc((err && err.message) || 'Le serveur ne répond pas.') +
            ' Vous pouvez aussi nous écrire à <a href="mailto:contact@highqualityltd.com">contact@highqualityltd.com</a>.';
        })
        .then(function () {
          btn.disabled = false;
          btn.innerHTML = label;
          msg.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
        });
    });
  });

  /* ---------- mesure d'audience anonyme ----------
     Un identifiant aléatoire par onglet (sessionStorage, effacé à la fermeture), pas de cookie,
     pas d'adresse IP enregistrée. Les navigateurs de l'équipe connectée à /admin ne sont pas comptés. */
  (function () {
    var skip = false;
    try { skip = localStorage.getItem('hq-admin') === '1'; } catch (e) {}
    if (skip || navigator.webdriver || location.protocol === 'file:') return;

    var sid, first = false;
    function rnd() {
      var a = new Uint8Array(8);
      (window.crypto || window.msCrypto).getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    }
    try {
      sid = sessionStorage.getItem('hq-sid');
      if (!sid) { sid = rnd(); first = true; sessionStorage.setItem('hq-sid', sid); }
    } catch (e) { sid = rnd(); first = true; }

    var page = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
    function send(body) {
      var json = JSON.stringify(body);
      if (navigator.sendBeacon && navigator.sendBeacon('/api/hit', new Blob([json], { type: 'application/json' }))) return;
      try { fetch('/api/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }); } catch (e) {}
    }

    var view = { sid: sid, type: 'view', path: page };
    if (first) {
      var ref = '';
      try { if (document.referrer && new URL(document.referrer).host !== location.host) ref = document.referrer; } catch (e) {}
      view.ref = ref;
      if (params.get('utm_source')) view.utm = params.get('utm_source');
    }
    send(view);

    var ping = function () { if (document.visibilityState === 'visible') send({ sid: sid, type: 'ping', path: page }); };
    setInterval(ping, 45000);
    document.addEventListener('visibilitychange', ping);
  })();

  /* ---------- carte du Cameroun ---------- */
  var mapEl = document.querySelector('[data-map]');
  if (mapEl && window.HQ_MAP) buildMap(mapEl, window.HQ_MAP);

  function buildMap(root, M) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-10 -10 ' + (M.w + 20) + ' ' + (M.h + 20));
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Carte des dix régions du Cameroun, base principale à Douala');
    function el(tag, attrs, parent) {
      var n = document.createElementNS(NS, tag);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n);
      return n;
    }

    var info = root.closest('.mapsec').querySelector('[data-rinfo]');
    var chipsBox = root.closest('.mapsec').querySelector('[data-rchips]');
    var paths = {}, chips = {};

    function select(id) {
      var r = M.regions.filter(function (x) { return x.id === id; })[0];
      if (!r) return;
      Object.keys(paths).forEach(function (k) { paths[k].classList.toggle('is-on', k === id); });
      Object.keys(chips).forEach(function (k) { chips[k].classList.toggle('is-on', k === id); });
      if (info) {
        info.innerHTML =
          '<div class="rinfo__name">' + r.name + '</div>' +
          '<div class="rinfo__meta">' +
          '<div><b>' + r.town + '</b>chef-lieu</div>' +
          (r.km === 0
            ? '<div><b>Siège</b>base technique, Deido</div>'
            : '<div><b>' + r.km + ' km</b>de Douala, à vol d\'oiseau</div>') +
          '</div>';
      }
    }

    var g = el('g', {});
    M.regions.forEach(function (r) {
      var p = el('path', { d: r.d, class: 'cm-region', tabindex: '0', 'aria-label': r.name }, g);
      p.addEventListener('mouseenter', function () { select(r.id); });
      p.addEventListener('focus', function () { select(r.id); });
      p.addEventListener('click', function () { select(r.id); });
      paths[r.id] = p;
      if (chipsBox) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = r.name;
        b.addEventListener('click', function () { select(r.id); });
        b.addEventListener('mouseenter', function () { select(r.id); });
        chipsBox.appendChild(b);
        chips[r.id] = b;
      }
    });

    // liaisons depuis la base de Douala
    var C = M.cities;
    var links = [
      ['Douala', 'Yaoundé', -30], ['Yaoundé', 'Bertoua', -26], ['Douala', 'Buea', -10],
      ['Douala', 'Bafoussam', 22], ['Bafoussam', 'Bamenda', 10], ['Yaoundé', 'Ebolowa', 18],
      ['Yaoundé', 'Ngaoundéré', 40], ['Ngaoundéré', 'Garoua', -30], ['Garoua', 'Maroua', 16]
    ];
    var routes = el('g', {});
    links.forEach(function (l, i) {
      var a = C[l[0]], b = C[l[1]];
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy) || 1;
      var cx = mx - dy / len * l[2], cy = my + dx / len * l[2];
      var d = 'M' + a[0] + ' ' + a[1] + 'Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + b[0] + ' ' + b[1];
      el('path', { d: d, class: 'cm-route-bg' }, routes);
      var p = el('path', { d: d, class: 'cm-route', id: 'rt' + i }, routes);
      if (!reduce) {
        var dot = el('circle', { r: '2.6', class: 'cm-pulse' }, routes);
        var am = el('animateMotion', { dur: (3 + (i % 3) * 0.8) + 's', repeatCount: 'indefinite', begin: (i * 0.35) + 's' }, dot);
        el('mpath', { href: '#rt' + i }, am);
      }
      p._len = 0;
    });

    var labels = {
      Douala: [12, 18, 'start'], Buea: [-10, -8, 'end'], 'Yaoundé': [10, 4, 'start'], Bafoussam: [10, 4, 'start'],
      Bamenda: [-10, 0, 'end'], Bertoua: [10, 4, 'start'], Ebolowa: [10, 12, 'start'], 'Ngaoundéré': [10, 4, 'start'],
      Garoua: [10, 4, 'start'], Maroua: [10, 4, 'start']
    };
    var cg = el('g', {});
    Object.keys(C).forEach(function (k) {
      var c = C[k];
      if (k === 'Douala') {
        el('circle', { cx: c[0], cy: c[1], r: '6', class: 'cm-hq-ring' }, cg);
        el('circle', { cx: c[0], cy: c[1], r: '6', class: 'cm-hq' }, cg);
      } else {
        el('circle', { cx: c[0], cy: c[1], r: '3.2', class: 'cm-city' }, cg);
      }
      var L = labels[k] || [8, 4, 'start'];
      var t = el('text', { x: c[0] + L[0], y: c[1] + L[1], 'text-anchor': L[2], class: 'cm-city-l' }, cg);
      t.textContent = k;
      if (k === 'Douala') { t.setAttribute('fill', '#fff'); t.style.fontWeight = '700'; }
    });

    root.appendChild(svg);

    // tracé progressif des liaisons à l'arrivée dans l'écran
    var sec = root.closest('.mapsec');
    routes.querySelectorAll('.cm-route').forEach(function (p) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = reduce ? 0 : L;
    });
    if ('IntersectionObserver' in window) {
      var mo = new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { sec.classList.add('is-drawn'); mo.disconnect(); }
      }, { threshold: 0.3 });
      mo.observe(sec);
    } else { sec.classList.add('is-drawn'); }

    select('Littoral');
  }
})();

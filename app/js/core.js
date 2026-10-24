/* Noyau : utilitaires, stockage de la progression, routeur, recherche, éléments d'interface partagés. */
(function () {
  'use strict';
  const D = window.GRAMMAIRE;
  const G = (window.G = { D, views: {} });

  // ------------------------------------------------------------------ utilitaires
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘ʼ`]/g, "'");
  const fmt = (n) => Number(n).toLocaleString('fr-FR');
  // dates au format AAAA-MM-JJ dans le fuseau local (minuit local, pas UTC)
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => ymd(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
  const plural0 = (n, s, p) => `${fmt(n)} ${n > 1 ? (p || s + 's') : s}`;
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function hashStr(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  Object.assign(G, { $, $$, esc, strip, fold, fmt, today, ymd, addDays, plural: plural0, h, debounce, hashStr, rng, shuffle });

  const ICON = {
    rule: '<svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>',
    ex: '<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    side: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M14 5v14"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 19h4L19 9l-4-4L5 15z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    redo: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
    map: '<svg viewBox="0 0 24 24"><circle cx="6" cy="7" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="13" r="2.5"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="18" r="2"/><path d="m7.6 8.3 3 3M16.5 7.4 13.6 11M7.5 17.7l3-2.8M16.4 16.8l-2.6-2"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    cards: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="11" height="14" rx="2"/><path d="M8 4h10a2 2 0 0 1 2 2v12"/></svg>',
    path: '<svg viewBox="0 0 24 24"><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18h6a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h6"/></svg>',
    quote: '<svg viewBox="0 0 24 24"><path d="M7 8h4v4c0 3-2 5-4 5M14 8h4v4c0 3-2 5-4 5"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  };
  G.ICON = ICON;

  // ------------------------------------------------------------------ accès aux données
  // auf Deutsch : Titel und Text der Fiche aus der deutschen Fassung (Beispiele bleiben französisch)
  const deCache = {};
  G.rule = (id) => {
    const r = D.rules[D.alias[id] || id];
    if (!r || G.lang !== 'de' || !G.DE || !G.DE.rules[r.id]) return r;
    return deCache[r.id] || (deCache[r.id] = Object.assign({}, r, G.DE.rules[r.id], { frTitle: r.title }));
  };
  G.ex = (id) => D.exercises[id];
  G.ruleTitle = (id) => (G.rule(id) || {}).title || id;
  G.exTitle = (e) => (strip(G.tx(e.title)) || e.file) + (e.type === 'cloze' && e.gaps.some((g) => g.opts) ? G.T(' (avec menu)', ' (mit Auswahlmenü)') : '');
  const THEME_COLORS = ['var(--map-0)', 'var(--map-1)', 'var(--map-2)', 'var(--map-3)', 'var(--map-4)'];
  G.themeColor = (i) => (i >= 0 && i < 5 ? THEME_COLORS[i] : 'var(--map-x)');
  G.TYPE_LABEL = new Proxy({ cloze: ['Texte à compléter', 'Lückentext'], quiz: ['Questionnaire', 'Quiz'], match: ['Associations', 'Zuordnung'] }, { get: (o, k) => o[k] && G.T(o[k][0], o[k][1]) });
  G.excerpt = (rule, n = 220) => { const t = strip(rule.html); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t; };

  // ------------------------------------------------------------------ stockage (local + base privée de l'artefact)
  const LS_KEY = 'grammaire-en-reseau-v1';
  const blank = () => ({ v: 1, ex: {}, read: {}, fav: {}, notes: {}, review: {}, hist: [], days: {}, games: {}, prefs: {} });
  const S = (G.S = {
    data: blank(), remote: null, uid: null, synced: false, listeners: [],
    load() {
      try { const raw = localStorage.getItem(LS_KEY); if (raw) this.data = Object.assign(blank(), JSON.parse(raw)); } catch (e) { /* stockage indisponible */ }
    },
    save() {
      try { localStorage.setItem(LS_KEY, JSON.stringify(this.data)); } catch (e) { /* ignoré */ }
      this.pushRemote();
      this.listeners.forEach((f) => f());
    },
    on(f) { this.listeners.push(f); },
    pushRemote: debounce(function () { S._push(); }, 1200),
    async _push() {
      if (!this.remote) return;
      const { notes, ...main } = this.data;
      try {
        await this.remote.main.set({ json: JSON.stringify(main), at: Date.now() });
        await this.remote.notes.set({ json: JSON.stringify(notes || {}), at: Date.now() });
        G.setSync('on');
      } catch (e) { G.setSync('err'); }
    },
    async connect() {
      if (!window.claude || !window.claude.use) return;
      try {
        const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
        if (!db || !user) return;
        const uid = await user.id();
        if (!uid) return;
        const col = db.collection('data/users/' + uid);
        this.remote = { main: col.doc('progression'), notes: col.doc('notes') };
        const [m, n] = await Promise.all([this.remote.main.get(), this.remote.notes.get()]);
        const rm = m && m.exists ? JSON.parse(m.data().json || '{}') : null;
        const rn = n && n.exists ? JSON.parse(n.data().json || '{}') : null;
        if (rm) this.data = merge(this.data, Object.assign(blank(), rm, { notes: rn || {} }));
        else if (rn) this.data.notes = Object.assign({}, rn, this.data.notes);
        this.synced = true;
        G.setSync('on');
        this.save();
        G.refresh && G.refresh();
      } catch (e) { G.setSync('err'); }
    },
    exResult(id) { return this.data.ex[id]; },
    markDay(n = 1) { const d = today(); this.data.days[d] = (this.data.days[d] || 0) + n; },
  });

  function merge(a, b) {
    // fusion prudente : on garde le meilleur score, la date la plus récente, l'union des listes
    const out = blank();
    out.prefs = Object.assign({}, b.prefs, a.prefs);
    for (const k of ['read', 'fav']) out[k] = Object.assign({}, b[k], a[k]);
    out.notes = Object.assign({}, b.notes, a.notes);
    out.ex = Object.assign({}, b.ex);
    for (const [k, v] of Object.entries(a.ex || {})) {
      const w = out.ex[k];
      out.ex[k] = !w ? v : { ...w, ...v, best: Math.max(w.best || 0, v.best || 0), tries: Math.max(w.tries || 0, v.tries || 0), ts: Math.max(w.ts || 0, v.ts || 0) };
    }
    out.review = Object.assign({}, b.review, a.review);
    out.days = Object.assign({}, b.days);
    for (const [d, n] of Object.entries(a.days || {})) out.days[d] = Math.max(out.days[d] || 0, n);
    out.games = Object.assign({}, b.games);
    for (const [k, v] of Object.entries(a.games || {})) out.games[k] = Math.max(out.games[k] || 0, v);
    const seen = new Set();
    out.hist = [...(a.hist || []), ...(b.hist || [])].sort((x, y) => y.ts - x.ts).filter((x) => !seen.has(x.r) && seen.add(x.r)).slice(0, 40);
    return out;
  }
  G.merge = merge;

  G.setSync = function (state) {
    const el = $('#nav-foot');
    if (!el) return;
    const txt = state === 'on' ? 'Progression synchronisée sur votre compte' : state === 'err' ? 'Synchronisation momentanément indisponible' : 'Progression enregistrée dans ce navigateur';
    el.innerHTML = `<span class="sync"><i class="dot ${state === 'on' ? 'on' : ''}"></i>${txt}</span>`;
  };

  // ------------------------------------------------------------------ répétition espacée (boîtes de Leitner)
  // boîte 0 : à revoir ; un succès fait monter d'une boîte (1, 3, 7, 16, 35 jours) ; réussi depuis la boîte 5 : acquis
  const BOX_DAYS = [0, 1, 3, 7, 16, 35];
  G.BOX_DAYS = BOX_DAYS;
  G.review = {
    add(key, item) { const r = S.data.review; r[key] = Object.assign({ n: 0 }, r[key] || {}, item, { box: 0, due: today() }); },
    grade(key, ok) {
      const r = S.data.review[key]; if (!r) return;
      r.n = (r.n || 0) + 1;
      if (ok) {
        if (r.box >= BOX_DAYS.length - 1) { delete S.data.review[key]; S.data.games.acquis = (S.data.games.acquis || 0) + 1; return; }
        r.box += 1; r.due = addDays(BOX_DAYS[r.box]);
      } else { r.box = 0; r.due = addDays(1); }
    },
    due() { const t = today(); return Object.entries(S.data.review).filter(([, r]) => r.due <= t).map(([k, r]) => ({ key: k, ...r })); },
    count() { return Object.keys(S.data.review).length; },
  };
  G.streak = function () {
    // la série reste « en jeu » tant qu'aujourd'hui n'est pas terminé
    const d = new Date(); let n = 0;
    if (S.data.days[ymd(d)] == null) d.setDate(d.getDate() - 1);
    while (S.data.days[ymd(d)] != null) { n++; d.setDate(d.getDate() - 1); }
    return { n, today: S.data.days[today()] != null };
  };

  // ------------------------------------------------------------------ routeur
  const R = (G.R = { stack: [], cur: null });
  G.parseRoute = function (hash) {
    let h = String(hash || '').replace(/^#/, '');
    if (!h.startsWith('/')) h = '/' + h;
    const [path, query] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { path, parts, q: new URLSearchParams(query || '') };
  };
  G.go = function (route, opts = {}) {
    if (!route.startsWith('#')) route = '#' + route;
    if (R.cur === route && !opts.force) return;
    if (R.cur && !opts.replace) R.stack.push({ r: R.cur, y: window.scrollY });
    try {
      if (opts.replace) history.replaceState({ r: route }, '', route);
      else history.pushState({ r: route }, '', route);
    } catch (e) { /* cadre restreint : l'historique interne suffit */ }
    render(route, opts);
  };
  G.back = function () {
    const prev = R.stack.pop();
    if (prev) { try { history.replaceState({ r: prev.r }, '', prev.r); } catch (e) { /* ignoré */ } render(prev.r, { restoreY: prev.y }); }
    else G.go('#/');
  };
  window.addEventListener('popstate', (ev) => {
    const r = (ev.state && ev.state.r) || location.hash || '#/';
    if (R.stack.length && R.stack[R.stack.length - 1].r === r) R.stack.pop();
    render(r);
  });
  window.addEventListener('hashchange', () => {
    const r = location.hash || '#/';
    if (r === R.cur) return;
    if (R.cur) R.stack.push({ r: R.cur, y: window.scrollY });
    render(/^#[A-Za-z0-9._~-]+$/.test(r) ? '#/' + r.slice(1) : r);
  });

  function render(route, opts = {}) {
    R.cur = route;
    G.closePeek();
    const rt = G.parseRoute(route);
    const name = rt.parts[0] || 'home';
    const view = G.views[name] || G.views.notfound;
    const main = $('#main');
    if (G.cleanup) { try { G.cleanup(); } catch (e) { /* ignoré */ } G.cleanup = null; }
    main.innerHTML = '';
    let page;
    try { page = view(rt); } catch (e) { console.error(e); page = h(`<div class="page"><div class="empty"><strong>Cette page n'a pas pu s'afficher.</strong>${esc(e.message)}</div></div>`); }
    if (page) main.appendChild(page);
    G.enhance(main);
    $$('#sidenav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === (VIEW_NAV[name] || name)));
    G.closeNav();
    if (opts.restoreY != null) window.scrollTo(0, opts.restoreY);
    else if (!rt.parts[2] || name !== 'regle') window.scrollTo(0, 0);
    if (G.afterRender) { const f = G.afterRender; G.afterRender = null; f(); }
    const t = $('h1', main); document.title = (t ? t.textContent.trim() + ' · ' : '') + 'Grammaire en réseau';
    G.updateBadge();
  }
  const VIEW_NAV = { regle: 'sommaire', exercice: 'exercices', jeu: 'jeux', theme: 'themes', recherche: 'home' };
  G.refresh = () => render(R.cur || '#/', { restoreY: window.scrollY });

  // interception des liens internes
  document.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-search]')) { G.openPalette(); return; }
    const a = ev.target.closest('a[href^="#/"], a[href="#"]');
    if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    const href = a.getAttribute('href');
    if (a.closest('#drawer') && href.startsWith('#/regle/')) { G.openDrawer(href); return; }
    if (a.closest('#drawer')) G.closeDrawer();
    G.go(href);
  });

  // ------------------------------------------------------------------ amélioration du contenu (tableaux, aperçus)
  G.enhance = function (root) {
    $$('.prose table.tbl', root).forEach((t) => { if (!t.parentElement.classList.contains('tbl-wrap')) { const w = document.createElement('div'); w.className = 'tbl-wrap'; t.replaceWith(w); w.appendChild(t); } });
    $$('.prose a[href^="http"]', root).forEach((a) => { a.target = '_blank'; a.rel = 'noopener'; });
  };

  // aperçu au survol d'un lien de fiche
  let peekTimer = null;
  const peek = () => $('#peek');
  G.closePeek = () => { clearTimeout(peekTimer); const p = peek(); if (p) p.hidden = true; };
  document.addEventListener('mouseover', (ev) => {
    if (!matchMedia('(hover: hover)').matches) return;
    const a = ev.target.closest && ev.target.closest('a[href^="#/regle/"], a[href^="#/exercice/"]');
    if (!a || a.closest('#sidenav, .palette, .peek')) return;
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => showPeek(a), 380);
  });
  document.addEventListener('mouseout', (ev) => { const a = ev.target.closest && ev.target.closest('a'); if (a) { clearTimeout(peekTimer); peekTimer = setTimeout(() => { peek().hidden = true; }, 120); } });
  function showPeek(a) {
    const rt = G.parseRoute(a.getAttribute('href'));
    const p = peek(); let html = '';
    if (rt.parts[0] === 'regle') {
      const r = G.rule(rt.parts[1]); if (!r) return;
      html = `<div class="k">${G.T('Fiche', 'Fiche')}</div><b>${esc(r.title)}</b><p>${esc(G.excerpt(r, 320))}</p><div class="m">${r.ex.length ? G.plural(r.ex.length, 'exercice lié', 'exercices liés') + ' · ' : ''}${G.plural(r.in.length + r.out.length, 'lien')}</div>`;
    } else {
      const e = G.ex(rt.parts[1]); if (!e) return;
      const res = S.exResult(e.id);
      html = `<div class="k">${G.TYPE_LABEL[e.type]}</div><b>${esc(G.exTitle(e))}</b><p>${esc(strip(G.tx(e.instructions) || G.tx(e.subtitle) || ''))}</p><div class="m">${G.plural(e.n, 'item')}${res ? G.T(' · meilleur score ', ' · Bestwert ') + res.best + ' %' : ''}</div>`;
    }
    p.innerHTML = html; p.hidden = false;
    const b = a.getBoundingClientRect(); const pw = p.offsetWidth, ph = p.offsetHeight;
    let x = Math.min(window.innerWidth - pw - 16, Math.max(16, b.left));
    let y = b.bottom + 10; if (y + ph > window.innerHeight - 12) y = b.top - ph - 10;
    p.style.left = x + 'px'; p.style.top = Math.max(12, y) + 'px';
  }

  // ------------------------------------------------------------------ tiroir latéral (fiche ouverte à côté)
  G.openDrawer = function (href) {
    const rt = G.parseRoute(href); const r = G.rule(rt.parts[1]); if (!r) return;
    const d = $('#drawer');
    d.innerHTML = `<div class="drawer-head"><span class="chip accent">Fiche</span><span class="t">${esc(r.title)}</span>
      <a class="icon-btn" href="#/regle/${r.id}" title="Ouvrir en pleine page" aria-label="Ouvrir en pleine page">${ICON.open}</a>
      <button class="icon-btn" data-close aria-label="Fermer">${ICON.close}</button></div>
      <div class="drawer-body"><div class="prose">${r.html}</div></div>`;
    d.hidden = false; $('#scrim').hidden = false;
    G.enhance(d);
    $('[data-close]', d).onclick = G.closeDrawer;
    const body = $('.drawer-body', d); body.scrollTop = 0;
    if (rt.parts[2]) { const t = $('#a-' + CSS.escape(rt.parts[2]), d); if (t) t.scrollIntoView({ block: 'start' }); }
  };
  G.closeDrawer = function () { $('#drawer').hidden = true; if (!$('#sidenav').classList.contains('open')) $('#scrim').hidden = true; };

  // ------------------------------------------------------------------ navigation mobile, toast, thème
  G.closeNav = function () { $('#sidenav').classList.remove('open'); $('#menu-btn').setAttribute('aria-expanded', 'false'); if ($('#drawer').hidden) $('#scrim').hidden = true; };
  G.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(G._tt); G._tt = setTimeout(() => (t.hidden = true), 2600); };
  G.applyPrefs = function () {
    const p = S.data.prefs || {};
    const root = document.documentElement;
    if (p.theme) root.dataset.theme = p.theme; else delete root.dataset.theme;
    if (p.size) root.dataset.size = p.size; else delete root.dataset.size;
  };
  G.isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; };
  G.updateBadge = function () { const n = G.review.due().length; const b = $('#review-badge'); if (b) { b.hidden = !n; b.textContent = n; } };

  // ------------------------------------------------------------------ recherche plein texte
  let INDEX = null;
  G.resetIndex = () => { INDEX = null; };
  G.buildIndex = function () {
    if (INDEX) return INDEX;
    INDEX = [];
    for (const r of Object.values(D.rules)) {
      if (r.stub) continue;
      const rr = G.rule(r.id);
      const text = strip(rr.html);
      // les deux langues sont cherchables : titre allemand + titre français
      INDEX.push({ kind: 'rule', id: r.id, title: rr.title, ft: fold(rr.title + (rr.title !== r.title ? ' ' + r.title : '')), text, fx: fold(text + (rr.html !== r.html ? ' ' + strip(r.html) : '')), href: '#/regle/' + r.id, w: 1 + Math.min(r.in.length, 30) / 30 });
    }
    for (const e of Object.values(D.exercises)) {
      const title = G.exTitle(e);
      const text = strip([G.tx(e.subtitle), G.tx(e.instructions), G.tx(e.cat), G.lang === 'de' ? strip(e.title) : '', e.body ? e.body.replace(/<gap[^>]*><\/gap>/g, ' … ') : '', (e.questions || []).map((q) => q.q).join(' '), (e.pairs || []).map((p) => p.join(' ')).join(' · ')].join(' '));
      INDEX.push({ kind: 'ex', id: e.id, title, ft: fold(title + ' ' + (e.cat || '')), text, fx: fold(text), href: '#/exercice/' + e.id, w: .8 });
    }
    for (const s of D.sommaire) {
      if (!s.href) continue;
      const m = /#\/regle\/([^/]+)/.exec(s.href); const target = m && G.rule(m[1]);
      if (target && fold(target.title) === fold(s.label)) continue;
      INDEX.push({ kind: 'alias', id: s.href, title: s.label, ft: fold(s.label), text: target ? 'Voir : ' + target.title : '', fx: '', href: s.href, w: 1.1 });
    }
    return INDEX;
  };
  G.search = function (q, limit = 40) {
    const terms = fold(q).split(/[^a-z0-9'\-]+/).filter((t) => t.length > 1 || /^[aàyô]$/.test(t));
    if (!terms.length) return [];
    const phrase = fold(q).trim();
    const out = [];
    for (const it of G.buildIndex()) {
      let s = 0, all = true;
      for (const t of terms) {
        const inT = it.ft.indexOf(t);
        const inX = it.fx.indexOf(t);
        if (inT < 0 && inX < 0) { all = false; break; }
        if (inT >= 0) s += inT === 0 || it.ft[inT - 1] === ' ' || it.ft[inT - 1] === "'" ? 12 : 6;
        if (inX >= 0) s += 1 + Math.min(4, countOcc(it.fx, t) * .5);
      }
      if (!all) continue;
      if (it.ft === phrase) s += 40; else if (it.ft.startsWith(phrase)) s += 18; else if (it.ft.includes(phrase)) s += 10;
      else if (phrase.length > 4 && it.fx.includes(phrase)) s += 6;
      out.push({ it, s: s * it.w });
    }
    out.sort((a, b) => b.s - a.s);
    return out.slice(0, limit).map((o) => Object.assign({ terms }, o.it));
  };
  function countOcc(s, t) { let n = 0, i = 0; while ((i = s.indexOf(t, i)) >= 0 && n < 20) { n++; i += t.length; } return n; }
  G.snippet = function (it, terms, len = 180) {
    const text = it.text || ''; if (!text) return '';
    const f = it.fx || fold(text);
    let pos = -1; for (const t of terms) { pos = f.indexOf(t); if (pos >= 0) break; }
    let start = Math.max(0, pos - 60); if (pos < 0) start = 0;
    let sn = text.slice(start, start + len);
    return (start > 0 ? '…' : '') + G.mark(sn, terms) + (start + len < text.length ? '…' : '');
  };
  G.mark = function (s, terms) {
    const f = fold(s); const marks = [];
    for (const t of terms) { let i = 0; while ((i = f.indexOf(t, i)) >= 0) { marks.push([i, i + t.length]); i += t.length; } }
    marks.sort((a, b) => a[0] - b[0]);
    let out = '', last = 0;
    for (const [a, b] of marks) { if (a < last) continue; out += esc(s.slice(last, a)) + '<mark>' + esc(s.slice(a, b)) + '</mark>'; last = b; }
    return out + esc(s.slice(last));
  };

  // palette de commande
  const pal = { sel: 0, items: [] };
  G.openPalette = function (q = '') {
    const p = $('#palette'); p.hidden = false;
    const inp = $('#palette-q'); inp.value = q; inp.focus(); inp.select();
    paletteRender();
  };
  G.closePalette = () => { $('#palette').hidden = true; };
  function paletteRender() {
    const q = $('#palette-q').value.trim();
    const box = $('#palette-results');
    if (!q) {
      const hist = (S.data.hist || []).slice(0, 6);
      pal.items = hist.map((x) => ({ href: x.r, title: x.t, kind: x.r.includes('/exercice/') ? 'ex' : 'rule', text: '' }));
      box.innerHTML = (hist.length ? '<div class="pr-group">Consultés récemment</div>' + pal.items.map(prItem).join('') : `<div class="pr-empty">${G.T('Tapez un mot-clé', 'Gib ein Stichwort ein')} : <b>subjonctif</b>, <b>quoique</b>, <b>participe passé</b>, <b>leur</b>…</div>`) +
        '<div class="pr-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Maj</kbd>+<kbd>Entrée</kbd> ouvrir à côté</span></div>';
    } else {
      const res = G.search(q, 30);
      const rules = res.filter((r) => r.kind !== 'ex').slice(0, 8), exs = res.filter((r) => r.kind === 'ex').slice(0, 6);
      pal.items = [...rules, ...exs];
      box.innerHTML = (rules.length ? '<div class="pr-group">Fiches</div>' + rules.map(prItem).join('') : '') +
        (exs.length ? '<div class="pr-group">Exercices</div>' + exs.map(prItem).join('') : '') +
        (pal.items.length ? `<a class="pr" href="#/recherche?q=${encodeURIComponent(q)}" data-all><span class="ic">${ICON.search}</span><span class="tx"><b>${G.T(`Tous les résultats pour « ${esc(q)} »`, `Alle Treffer für „${esc(q)}“`)}</b><span>${G.plural(G.search(q, 500).length, 'résultat')}</span></span></a>` : `<div class="pr-empty">${G.T(`Aucun résultat pour « ${esc(q)} ». Essayez un mot plus court ou sans accent.`, `Keine Treffer für „${esc(q)}“. Versuch ein kürzeres Wort oder ohne Akzente.`)}</div>`);
      if (pal.items.length) pal.items.push({ href: `#/recherche?q=${encodeURIComponent(q)}` });
    }
    pal.sel = 0; paletteSel();
  }
  function prItem(it) {
    const terms = it.terms || [];
    return `<a class="pr" href="${esc(it.href)}"><span class="ic">${it.kind === 'ex' ? ICON.ex : ICON.rule}</span><span class="tx"><b>${terms.length ? G.mark(it.title, terms) : esc(it.title)}</b>${it.text ? `<span>${G.snippet(it, terms, 140)}</span>` : ''}</span></a>`;
  }
  function paletteSel() { $$('#palette-results .pr').forEach((a, i) => a.classList.toggle('sel', i === pal.sel)); const s = $('#palette-results .pr.sel'); if (s) s.scrollIntoView({ block: 'nearest' }); }
  G.initPalette = function () {
    const inp = $('#palette-q');
    inp.addEventListener('input', debounce(paletteRender, 90));
    inp.addEventListener('keydown', (ev) => {
      const n = $$('#palette-results .pr').length;
      if (ev.key === 'ArrowDown') { pal.sel = Math.min(n - 1, pal.sel + 1); paletteSel(); ev.preventDefault(); }
      else if (ev.key === 'ArrowUp') { pal.sel = Math.max(0, pal.sel - 1); paletteSel(); ev.preventDefault(); }
      else if (ev.key === 'Enter') {
        const a = $$('#palette-results .pr')[pal.sel]; if (!a) return;
        ev.preventDefault(); G.closePalette();
        const href = a.getAttribute('href');
        if (ev.shiftKey && href.startsWith('#/regle/')) G.openDrawer(href); else G.go(href);
      } else if (ev.key === 'Escape') G.closePalette();
    });
    $('#palette').addEventListener('click', (ev) => {
      if (ev.target.id === 'palette') return G.closePalette();
      if (ev.target.closest('a')) G.closePalette();
    });
  };

  // ------------------------------------------------------------------ barre d'accents pour la saisie
  const ACC = ['à', 'â', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'œ', 'ù', 'û', 'ü', 'ÿ', '’', '«', '»'];
  let accTarget = null, accUpper = false;
  G.initAccents = function () {
    const bar = $('#accent-bar');
    const draw = () => { bar.innerHTML = ACC.map((c) => `<button type="button" tabindex="-1" data-c="${c}">${accUpper && c !== '’' && c !== '«' && c !== '»' ? c.toUpperCase() : c}</button>`).join('') + `<button type="button" tabindex="-1" class="shift" data-shift>${accUpper ? 'abc' : 'ABC'}</button>`; };
    draw();
    bar.addEventListener('mousedown', (ev) => ev.preventDefault());
    bar.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.dataset.shift != null) { accUpper = !accUpper; draw(); return; }
      if (!accTarget) return;
      const ch = b.textContent; const el = accTarget;
      const s = el.selectionStart ?? el.value.length, e = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, s) + ch + el.value.slice(e);
      el.setSelectionRange(s + ch.length, s + ch.length);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
    });
    document.addEventListener('focusin', (ev) => {
      const el = ev.target;
      if (el.matches && el.matches('input[data-acc]')) { accTarget = el; placeAcc(el); }
    });
    document.addEventListener('focusout', (ev) => { if (ev.target === accTarget) setTimeout(() => { if (document.activeElement !== accTarget) { bar.hidden = true; accTarget = null; } }, 60); });
    window.addEventListener('scroll', () => { if (accTarget) placeAcc(accTarget); }, { passive: true });
    function placeAcc(el) {
      if (S.data.prefs.noAccents) { bar.hidden = true; return; }
      // barre fixe en bas de l'écran (au-dessus de la barre d'actions), pour ne jamais cacher le texte
      bar.hidden = false;
      const vv = window.visualViewport;
      const bottom = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
      const ab = document.querySelector('.actionbar:not([hidden])');
      const lift = ab && ab.getBoundingClientRect().top < window.innerHeight ? window.innerHeight - ab.getBoundingClientRect().top + 8 : 14;
      bar.style.left = '50%'; bar.style.transform = 'translateX(-50%)';
      bar.style.top = 'auto'; bar.style.bottom = (bottom + lift) + 'px';
    }
  };

  // ------------------------------------------------------------------ historique de consultation
  G.visit = function (route, title) {
    const H = S.data.hist.filter((x) => x.r !== route);
    H.unshift({ r: route, t: title, ts: Date.now() });
    S.data.hist = H.slice(0, 40);
    S.save();
  };

  // ------------------------------------------------------------------ comparaison des réponses
  G.normAnswer = function (s, cs) {
    let t = String(s || '').replace(/[’‘ʼ`´]/g, "'").replace(/[  ]/g, ' ').replace(/\s+/g, ' ').replace(/\s*'\s*/g, "'").replace(/\s*-\s*/g, '-').trim();
    t = t.replace(/[«»"“”]/g, '"').replace(/\s*\.$/, '');
    return cs ? t : t.toLowerCase();
  };
  G.isCorrect = function (val, answers, cs) {
    const v = G.normAnswer(val, cs);
    if (!v) return false;
    return answers.some((a) => G.normAnswer(a, cs) === v || (/^\s*x+\s*$/i.test(a) && /^(x+|-|—|0|ø|∅)$/i.test(v)));
  };
})();

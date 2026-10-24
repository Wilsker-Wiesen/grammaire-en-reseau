/* Vues : accueil, thèmes, sommaire, fiches, listes d'exercices, recherche, progression, à propos. */
(function () {
  'use strict';
  const { D, S, $, $$, esc, strip, fold, fmt, plural, h, ICON } = G;
  const V = G.views;
  const page = (inner, cls = '') => h(`<div class="page ${cls}">${inner}</div>`);

  function ring(p, done) {
    if (p == null) return '<span class="ring none" data-v=""></span>';
    return `<span class="ring ${p >= 80 ? 'ok' : ''}" style="--p:${p}" data-v="${p}"></span>`;
  }
  G.ring = ring;
  function exRow(id, i, desc) {
    const e = G.ex(id); if (!e) return '';
    const r = S.exResult(id);
    const sub = desc && fold(strip(desc)) !== fold(G.exTitle(e)) ? desc : (e.cat || G.TYPE_LABEL[e.type]);
    return `<a class="ex-row" href="#/exercice/${id}"><span class="i">${i != null ? String(i + 1).padStart(2, '0') : ''}</span>
      <span class="t"><b>${esc(G.exTitle(e))}</b><span>${esc(strip(sub))} · ${plural(e.n, 'item')}</span></span>
      <span class="s">${ring(r ? r.best : null)}</span></a>`;
  }
  G.exRow = exRow;
  function themeProgress(ids) {
    const total = ids.length || 1; const read = ids.filter((id) => S.data.read[id]).length;
    return Math.round((read / total) * 100);
  }

  // ------------------------------------------------------------------ accueil
  V.home = function () {
    const st = D.stats;
    const last = (S.data.hist || [])[0];
    const due = G.review.due().length;
    const dayDone = S.data.games['defi:' + G.today()];
    const streak = G.streak();
    const acts = S.data.days[G.today()] || 0, GOAL = 3;
    const firstRun = !S.data.prefs.onboarded && !(S.data.hist || []).length;
    const resume = last ? `<a class="card" href="${esc(last.r)}"><span class="ic">${last.r.includes('/exercice/') ? ICON.ex : ICON.rule}</span><span class="txt"><span>Reprendre</span><b>${esc(last.t)}</b></span></a>`
      : `<a class="card" href="#/regle/${D.themes[0].intro || ''}"><span class="ic">${ICON.rule}</span><span class="txt"><span>Pour commencer</span><b>Les grandes notions grammaticales</b></span></a>`;
    const el = page(`
      ${firstRun ? `<section class="panel welcome" id="welcome"><div><div class="eyebrow">Bienvenue</div><h2>Par où commencer ?</h2>
        <ol><li><b>Lisez une fiche</b> depuis un thème ou le sommaire. Les mots soulignés mènent aux notions voisines.</li>
        <li><b>Entraînez-vous</b> : chaque fiche propose ses exercices ; dans un exercice, la fiche d’aide s’ouvre à côté.</li>
        <li><b>Revenez chaque jour</b> : défi du jour, puis « À revoir », où vos erreurs reviennent au bon moment.</li></ol></div>
        <div class="welcome-act"><a class="btn primary" href="#/guide">Mode d’emploi</a><a class="btn" href="#/themes">Voir le plan</a><a class="btn" href="#/jeu/defi">Faire le défi du jour</a><button class="btn ghost" id="wclose">Masquer</button></div></section>` : ''}
      <section class="daily" aria-label="Aujourd’hui">
        <div class="daily-goal"><span class="ring ${acts >= GOAL ? 'ok' : ''}" style="--p:${Math.min(100, (acts / GOAL) * 100)}" data-v="${Math.min(acts, GOAL)}/${GOAL}"></span>
          <span class="txt"><b>${acts >= GOAL ? 'Objectif du jour atteint' : 'Objectif du jour'}</b><span>${acts >= GOAL ? 'Bravo. Tout le reste est du bonus.' : `${GOAL} activités : exercice, défi, révision ou jeu`}</span></span></div>
        <div class="daily-streak"><b class="num">${streak.n}</b><span>${streak.n > 1 ? 'jours de suite' : 'jour de suite'}${!streak.today && streak.n ? ' · en jeu aujourd’hui' : ''}</span></div>
      </section>
      <div class="today">
        ${resume}
        <a class="card" href="#/revision"><span class="ic">${ICON.redo}</span><span class="txt"><span>À revoir aujourd'hui</span><b>${due ? plural(due, 'item') : 'Rien en attente'}</b></span></a>
        <a class="card" href="#/jeu/defi"><span class="ic">${ICON.cal}</span><span class="txt"><span>Défi du jour</span><b>${dayDone != null ? 'Fait : ' + dayDone + ' %' : '10 questions, à faire'}</b></span></a>
      </div>
      <section class="hero" style="margin-top:18px">
        <canvas id="hero-net" aria-hidden="true"></canvas>
        <div class="eyebrow">Grammaire française · Jan Wilsker-Wiesen</div>
        <h1>La grammaire française, <em>en réseau.</em></h1>
        <p>Chaque règle renvoie aux notions qu'elle suppose et aux exercices qui l'entraînent. Lisez, cliquez, vérifiez, revenez.</p>
        <button class="hero-search" id="hero-search">${ICON.search}<span>Chercher : quoique, leur, accord du participe…</span><kbd>Ctrl K</kbd></button>
        <div class="hero-stats">
          <div><b>${fmt(st.rules)}</b><span>fiches de règles</span></div>
          <div><b>${fmt(st.exercises)}</b><span>exercices</span></div>
          <div><b>${fmt(st.items)}</b><span>items à résoudre</span></div>
          <div><b>${fmt(st.links)}</b><span>renvois entre textes</span></div>
        </div>
      </section>
      <div class="section-title"><h2>Les grands thèmes</h2><a href="#/themes">Tout le plan →</a></div>
      <div class="theme-cards">${D.themes.map((t, i) => {
        const ids = t.sections.flatMap((s) => s.children.map((c) => c.id));
        const p = themeProgress(ids);
        return `<a class="card theme-card" href="#/themes/${i}"><span class="swatch" style="background:${G.themeColor(i)}"></span>
          <span class="tnum num">${i + 1}.</span><h3>${esc(t.title)}</h3>
          <ul>${t.sections.map((s) => `<li>${esc(s.title)}</li>`).join('')}</ul>
          <div class="meta"><span class="chip">${plural(ids.length, 'fiche')}</span>${p ? `<span class="chip ok">${p} % lues</span>` : ''}</div></a>`;
      }).join('')}
        <a class="card theme-card" href="#/sommaire"><span class="swatch" style="background:var(--map-x)"></span><span class="tnum num">A–Z</span><h3>Sommaire alphabétique</h3>
          <ul><li>Accord</li><li>Concordance</li><li>Participe</li><li>Subjonctif</li><li>…</li></ul>
          <div class="meta"><span class="chip">${plural(D.sommaire.length, 'entrée')}</span></div></a>
      </div>
      <div class="section-title"><h2>S'entraîner</h2><a href="#/exercices">Tous les exercices →</a></div>
      <div class="grid col-cards">${D.collections.map((c) => colCard(c)).join('')}</div>
      <div class="section-title"><h2>Jouer avec la grammaire</h2><a href="#/jeux">Tous les jeux →</a></div>
      <div class="grid game-cards">${G.gameCards ? G.gameCards(3) : ''}</div>
    `);
    $('#hero-search', el).onclick = () => G.openPalette();
    const wc = $('#wclose', el); if (wc) wc.onclick = () => { S.data.prefs.onboarded = 1; S.save(); $('#welcome').remove(); };
    G.afterRender = () => G.heroNet && G.heroNet($('#hero-net'));
    return el;
  };
  function colCard(c) {
    const ids = c.groups.flatMap((g) => g.items.map((i) => i.id));
    const done = ids.filter((id) => S.exResult(id)).length;
    return `<a class="card" href="#/exercices/${c.id}"><span class="count num">${ids.length}</span><h3>${esc(c.title)}</h3><p>${esc(c.desc)}</p>
      <div class="meta"><div class="bar" style="flex:1"><i style="width:${ids.length ? (done / ids.length) * 100 : 0}%"></i></div><span class="num" style="font-size:12px;color:var(--muted)">${done}/${ids.length}</span></div></a>`;
  }

  // ------------------------------------------------------------------ thèmes
  V.themes = function (rt) {
    const only = rt.parts[1] != null ? +rt.parts[1] : null;
    const themes = only != null ? [D.themes[only]].filter(Boolean) : D.themes;
    const el = page(`
      <div class="page-head">
        <div class="crumbs"><a href="#/themes">Thèmes</a>${only != null ? `<span class="sep">/</span><span>${only + 1}</span>` : ''}</div>
        <h1>${only != null ? esc(themes[0].title) : 'Le plan de la grammaire'}</h1>
        <p class="lead">${only != null ? 'Toutes les fiches de ce thème, dans l’ordre du programme. Un point vert signale les fiches déjà lues.' : 'Cinq grands thèmes, découpés en sections numérotées. Choisissez une section, puis lisez les fiches dans l’ordre ou au gré des renvois.'}</p>
      </div>
      ${only == null ? `<div class="toolbar">${D.themes.map((t, i) => `<a class="btn small" href="#/themes/${i}"><span class="num" style="color:${G.themeColor(i)}">●</span> ${esc(t.title)}</a>`).join('')}</div>` : ''}
      <div class="tree">${themes.map((t) => {
        const ti = D.themes.indexOf(t);
        return `${only == null ? `<div class="section-title" style="margin-top:22px"><h2><span class="num" style="color:${G.themeColor(ti)}">${ti + 1}.</span> ${esc(t.title)}</h2>${t.intro ? `<a href="#/regle/${t.intro}">Introduction →</a>` : ''}</div>` : (t.intro ? `<p><a class="btn small" href="#/regle/${t.intro}">${ICON.rule} Lire l’introduction du thème</a></p>` : '')}
        ${t.sections.map((s, si) => {
          const ids = s.children.map((c) => c.id);
          const p = themeProgress(ids);
          return `<section class="panel tree-sec" id="sec-${ti}-${si}"><header><span class="num">${ti + 1}.${si + 1}</span><h2>${s.id ? `<a href="#/regle/${s.id}" style="color:inherit;text-decoration:none">${esc(s.title)}</a>` : esc(s.title)}</h2>
            <span class="chip">${plural(ids.length, 'fiche')}</span><div class="bar" title="${p} % lues"><i style="width:${p}%"></i></div></header>
            <ul class="tree-items">${s.children.map((c, ci) => `<li><a href="#/regle/${c.id}" class="${S.data.read[c.id] ? 'read' : ''}"><span class="num">${String(ci + 1).padStart(2, '0')}</span><span class="t">${esc(c.title || G.ruleTitle(c.id))}</span></a></li>`).join('')}</ul></section>`;
        }).join('')}`;
      }).join('')}</div>`);
    return el;
  };
  V.theme = V.themes;

  // ------------------------------------------------------------------ sommaire
  V.sommaire = function (rt) {
    const mode = rt.q.get('vue') || 'sommaire';
    let entries;
    if (mode === 'toutes') {
      entries = Object.values(D.rules).filter((r) => !r.stub).map((r) => ({ label: r.title, href: '#/regle/' + r.id, sub: [] }));
      entries.sort((a, b) => fold(a.label).replace(/^(l'|le |la |les )/, '').localeCompare(fold(b.label).replace(/^(l'|le |la |les )/, ''), 'fr'));
    } else entries = D.sommaire;
    const letterOf = (s) => { const f = fold(s).replace(/^[^a-z0-9]+/, ''); const g = mode === 'toutes' ? f.replace(/^(l'|le |la |les )/, '') : f; return (g[0] || '#').toUpperCase(); };
    const groups = {};
    entries.forEach((e) => { const L = /[A-Z]/.test(letterOf(e.label)) ? letterOf(e.label) : '#'; (groups[L] = groups[L] || []).push(e); });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const readMark = (href) => { const m = /#\/regle\/([^/]+)/.exec(href || ''); return m && S.data.read[(D.alias[m[1]] || m[1])] ? '<i class="read-tick" title="Lue"></i>' : ''; };
    const el = page(`
      <div class="page-head"><div class="eyebrow">Index des règles</div><h1>Sommaire de A à Z</h1>
        <p class="lead">Toutes les notions de A à Z, avec leurs regroupements par mot-clé. Le mode « Toutes les fiches » liste aussi les fiches qu'il ne mentionne pas.</p></div>
      <div class="toolbar">
        <label class="filter">${ICON.search}<input id="az-filter" type="search" placeholder="Filtrer : participe, que, accord…" autocomplete="off"></label>
        <div class="seg" role="tablist"><button data-mode="sommaire" class="${mode !== 'toutes' ? 'on' : ''}">Sommaire (${D.sommaire.length})</button><button data-mode="toutes" class="${mode === 'toutes' ? 'on' : ''}">Toutes les fiches (${D.stats.rules})</button></div>
      </div>
      <nav class="letters" aria-label="Lettres">${letters.map((L) => `<a href="#" data-l="${L}" class="${groups[L] ? '' : 'off'}">${L}</a>`).join('')}</nav>
      <div id="az">${letters.concat(['#']).filter((L) => groups[L]).map((L) => `<div class="az-letter" id="L-${L}">${L}</div><div class="az-list">${groups[L].map((e) => `
        <div class="az-item" data-f="${esc(fold(e.label + ' ' + e.sub.map((s) => s.label).join(' ')))}">
          ${e.href ? `<a href="${esc(e.href)}">${esc(e.label)}</a>${readMark(e.href)}` : `<span>${esc(e.label)}</span>`}
          ${e.sub.length ? `<ul>${e.sub.map((s) => `<li><a href="${esc(s.href)}">${esc(s.label)}</a>${readMark(s.href)}</li>`).join('')}</ul>` : ''}
        </div>`).join('')}</div>`).join('')}</div>`);
    $$('.letters a', el).forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); const t = $('#L-' + a.dataset.l); if (t) t.scrollIntoView({ behavior: 'smooth' }); }));
    $$('.seg button', el).forEach((b) => b.onclick = () => G.go('#/sommaire' + (b.dataset.mode === 'toutes' ? '?vue=toutes' : ''), { replace: true }));
    const f = $('#az-filter', el);
    f.addEventListener('input', G.debounce(() => {
      const q = fold(f.value.trim());
      $$('.az-item', el).forEach((it) => { it.hidden = q && !it.dataset.f.includes(q); });
      $$('.az-list', el).forEach((l) => { const any = $$('.az-item', l).some((i) => !i.hidden); l.hidden = !any; l.previousElementSibling.hidden = !any; });
    }, 80));
    return el;
  };

  // ------------------------------------------------------------------ fiche (règle)
  V.regle = function (rt) {
    const id = rt.parts[1]; const r = G.rule(id);
    if (!r) return V.notfound(rt);
    S.markDay(0);
    G.visit('#/regle/' + r.id, r.title);
    // fil d'Ariane et voisins dans la section
    let crumbs = '<a href="#/sommaire">Sommaire</a>', prev = null, next = null;
    if (r.th) {
      const t = D.themes[r.th[0]]; const sec = t && t.sections[r.th[1]];
      crumbs = `<a href="#/themes/${r.th[0]}">${r.th[0] + 1}. ${esc(t.title)}</a>` + (sec ? `<span class="sep">/</span><a href="#/themes/${r.th[0]}">${esc(sec.title)}</a>` : '');
      if (sec) { const k = sec.children.findIndex((c) => c.id === r.id); if (k >= 0) { prev = sec.children[k - 1]; next = sec.children[k + 1]; } }
    }
    const fav = !!S.data.fav[r.id];
    const minutes = Math.max(1, Math.round(r.words / 200));
    const exs = r.ex.map(G.ex).filter(Boolean);
    const outs = r.out.filter((x) => G.rule(x));
    const ins = r.in.filter((x) => G.rule(x) && !r.out.includes(x));
    const where = (x) => { const o = G.rule(x); return o && o.th ? D.themes[o.th[0]].sections[o.th[1]]?.title || D.themes[o.th[0]].title : 'Sommaire'; };
    const linkItem = (x) => `<li><a href="#/regle/${x}"><span class="dot-ic ${S.data.read[x] ? 'done' : ''}"></span><span class="t">${esc(G.ruleTitle(x))}${G.ruleTitle(x) === r.title || (r.sim || []).includes(x) ? ` <span style="color:var(--muted);font-size:12px">· ${esc(where(x))}</span>` : ''}</span></a></li>`;
    const list = (arr, fn, n = 8) => arr.length ? `<ul class="linklist">${arr.slice(0, n).map(fn).join('')}${arr.length > n ? `<li><button class="btn ghost small" data-more>+ ${arr.length - n} autres</button></li><template>${arr.slice(n).map(fn).join('')}</template>` : ''}</ul>` : '<p style="margin:0;color:var(--muted);font-size:14px">Aucun.</p>';
    const el = page(`
      <div class="reader">
        <article>
          <div class="fiche-head">
            <div class="crumbs">${crumbs}</div>
            <h1>${esc(r.title)}</h1>
            <div class="fiche-tools">
              <span class="chip">${minutes} min de lecture</span>
              ${exs.length ? `<a class="chip accent" href="#ex-liste">${ICON.ex} ${plural(exs.length, 'exercice')}</a>` : ''}
              <span class="spacer"></span>
              <button class="btn small ${fav ? 'on' : ''}" id="fav-btn" aria-pressed="${fav}">${ICON.star}<span>${fav ? 'Favori' : 'Ajouter aux favoris'}</span></button>
              <button class="btn small ${S.data.read[r.id] ? 'on' : ''}" id="read-btn" aria-pressed="${!!S.data.read[r.id]}">${ICON.check}<span>${S.data.read[r.id] ? 'Lue' : 'Marquer comme lue'}</span></button>
              <button class="btn small" id="note-btn">${ICON.note}<span>Note</span></button>
            </div>
          </div>
          <div class="prose" id="fiche-prose">${r.stub ? '<p><em>Cette fiche est encore vide.</em></p>' : r.html}</div>
          ${prev || next ? `<nav class="pager">${prev ? `<a href="#/regle/${prev.id}"><span>← Précédente</span><b>${esc(prev.title || G.ruleTitle(prev.id))}</b></a>` : ''}${next ? `<a class="next" href="#/regle/${next.id}"><span>Suivante →</span><b>${esc(next.title || G.ruleTitle(next.id))}</b></a>` : ''}</nav>` : ''}
        </article>
        <aside class="rail" aria-label="Réseau de la fiche">
          <div class="rail-box" id="note-box" ${S.data.notes[r.id] ? '' : 'hidden'}><h3>Ma note</h3><textarea class="note-area" id="note-area" placeholder="Vos remarques, exemples, questions…">${esc(S.data.notes[r.id] || '')}</textarea></div>
          <div class="rail-box" id="ex-liste"><h3>S'entraîner <span class="n num">${exs.length + (r.ex2 || []).length}</span></h3>
            ${exs.length ? list(exs.map((e) => e.id), (id) => { const e = G.ex(id); const res = S.exResult(id); return `<li><a href="#/exercice/${id}"><span class="dot-ic ex ${res && res.best >= 80 ? 'done' : ''}"></span><span class="t">${esc(G.exTitle(e))}</span><span class="score ${res && res.best >= 80 ? 'ok' : ''}">${res ? res.best + ' %' : ''}</span></a></li>`; }, 10) : (r.ex2 || []).length ? '' : '<p style="margin:0;color:var(--muted);font-size:14px">Aucun exercice ne renvoie à cette fiche.</p>'}
            ${(r.ex2 || []).length ? `<p style="margin:${exs.length ? '12px' : '0'} 0 6px;font-size:12.5px;color:var(--muted)">Par les fiches voisines :</p><ul class="linklist">${r.ex2.map(G.ex).filter(Boolean).map((e) => { const res = S.exResult(e.id); return `<li><a href="#/exercice/${e.id}"><span class="dot-ic ex ${res && res.best >= 80 ? 'done' : ''}" style="opacity:.6"></span><span class="t">${esc(G.exTitle(e))}</span><span class="score ${res && res.best >= 80 ? 'ok' : ''}">${res ? res.best + ' %' : ''}</span></a></li>`; }).join('')}</ul>` : ''}
          </div>
          ${outs.length + ins.length ? `<div class="rail-box"><h3>Réseau <a class="n" href="#/carte?f=${r.id}" title="Voir sur la carte">${ICON.map}</a></h3><canvas class="ego" id="ego" width="560" height="486" aria-label="Voisinage de la fiche dans le réseau"></canvas></div>` : ''}
          ${(r.sim || []).length ? `<div class="rail-box"><h3>Fiches apparentées <span class="n num">${r.sim.length}</span></h3><ul class="linklist">${r.sim.map(linkItem).join('')}</ul><p style="margin:8px 0 0;font-size:12px;color:var(--muted)">Même sujet, traité ailleurs dans le programme.</p></div>` : ''}
          <div class="rail-box"><h3>Renvoie à <span class="n num">${outs.length}</span></h3>${list(outs, linkItem)}</div>
          <div class="rail-box"><h3>Citée par <span class="n num">${ins.length}</span></h3>${list(ins, linkItem)}</div>
        </aside>
      </div>`);
    $('#fav-btn', el).onclick = () => {
      if (S.data.fav[r.id]) delete S.data.fav[r.id]; else S.data.fav[r.id] = Date.now();
      S.save(); G.toast(S.data.fav[r.id] ? 'Ajoutée aux favoris' : 'Retirée des favoris'); G.refresh();
    };
    const markRead = (on) => {
      if (on) S.data.read[r.id] = S.data.read[r.id] || Date.now(); else delete S.data.read[r.id];
      S.save(); const b = $('#read-btn', el); if (!b) return;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); $('span', b).textContent = on ? 'Lue' : 'Marquer comme lue';
    };
    $('#read-btn', el).onclick = () => markRead(!S.data.read[r.id]);
    // lue automatiquement après 25 s sur la page ou en arrivant à la fin du texte
    if (!S.data.read[r.id]) {
      const timer = setTimeout(() => markRead(true), 25000);
      const onScroll = () => { const p = $('#fiche-prose'); if (p && p.getBoundingClientRect().bottom < window.innerHeight + 40 && window.scrollY > 200) { markRead(true); off(); } };
      const off = () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
      window.addEventListener('scroll', onScroll, { passive: true });
      const prev = G.cleanup; G.cleanup = () => { off(); prev && prev(); };
    }
    $('#note-btn', el).onclick = () => { const b = $('#note-box', el); b.hidden = false; $('#note-area', el).focus(); };
    $('#note-area', el).addEventListener('input', G.debounce((ev) => { const v = ev.target.value; if (v.trim()) S.data.notes[r.id] = v; else delete S.data.notes[r.id]; S.save(); }, 500));
    $$('[data-more]', el).forEach((b) => b.onclick = () => { const tpl = b.parentElement.nextElementSibling; b.parentElement.outerHTML = tpl.innerHTML; tpl.remove(); });
    G.afterRender = () => {
      const c = $('#ego'); if (c && G.egoNet) G.egoNet(c, r.id);
      if (rt.parts[2]) {
        const t = document.getElementById('a-' + rt.parts[2]);
        if (t) { t.scrollIntoView({ block: 'start' }); const p = t.closest('p, li, div, td') || t; p.classList.add('flash'); }
      }
    };
    S.save();
    return el;
  };

  // ------------------------------------------------------------------ exercices (collections)
  V.exercices = function (rt) {
    const cid = rt.parts[1];
    if (!cid) {
      return page(`<div class="page-head"><div class="eyebrow">Entraînement</div><h1>Exercices</h1>
        <p class="lead">${fmt(D.stats.exercises)} exercices, regroupés par notion et par cours. Votre meilleur score s'affiche à droite de chaque exercice.</p></div>
        <div class="grid col-cards">${D.collections.map(colCard).join('')}</div>
        <div class="section-title"><h2>Par notion</h2></div>
        <div class="chips">${D.collections[0].groups.map((g, i) => `<a class="btn small" href="#/exercices/themes?g=${i}">${esc(g.title)} <span class="num" style="color:var(--muted)">${g.items.length}</span></a>`).join('')}</div>`);
    }
    const c = D.collections.find((x) => x.id === cid); if (!c) return V.notfound(rt);
    const gsel = rt.q.get('g');
    const filter = rt.q.get('etat') || 'tous';
    const groups = gsel != null ? [c.groups[+gsel]].filter(Boolean) : c.groups;
    const state = (id) => { const r = S.exResult(id); return !r ? 'afaire' : r.best >= 80 ? 'reussi' : 'arevoir'; };
    const el = page(`<div class="page-head"><div class="crumbs"><a href="#/exercices">Exercices</a><span class="sep">/</span><a href="#/exercices/${c.id}">${esc(c.title)}</a></div>
      <h1>${gsel != null && groups[0] ? esc(groups[0].title) : esc(c.title)}</h1><p class="lead">${esc(c.desc)}</p></div>
      <div class="toolbar"><div class="seg">${[['tous', 'Tous'], ['afaire', 'À faire'], ['arevoir', 'À retravailler'], ['reussi', 'Réussis']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${gsel != null ? `<a class="btn small ghost" href="#/exercices/${c.id}">Voir toutes les notions</a>` : ''}</div>
      ${groups.map((g, gi) => {
        const items = g.items.filter((it) => filter === 'tous' || state(it.id) === filter);
        if (!items.length && !(g.refs || []).length) return '';
        const gIndex = c.groups.indexOf(g);
        return `<section class="ex-group">${c.groups.length > 1 ? `<h2><a href="#/exercices/${c.id}?g=${gIndex}" style="color:inherit;text-decoration:none">${esc(g.title)}</a> <span class="chip">${g.items.length}</span></h2>` : ''}
          ${(g.rules || []).length ? `<div class="refs">Fiches de référence : ${g.rules.map((x) => `<a href="#/regle/${x}">${esc(G.ruleTitle(x))}</a>`).join('')}</div>` : ''}
          ${(g.refs || []).length ? `<div class="refs">À lire : ${g.refs.map((x) => `<a href="${esc(x.href)}">${esc(x.desc || 'Explications')}</a>`).join('')}</div>` : ''}
          ${items.length ? `<div class="ex-rows">${items.map((it) => exRow(it.id, g.items.indexOf(it), it.desc)).join('')}</div>` : ''}</section>`;
      }).join('') || '<div class="empty"><strong>Aucun exercice dans cet état.</strong>Changez de filtre pour voir les autres.</div>'}`);
    $$('.seg button', el).forEach((b) => b.onclick = () => { const q = new URLSearchParams(rt.q); q.set('etat', b.dataset.f); G.go(`#/exercices/${c.id}?${q}`, { replace: true }); });
    return el;
  };

  // ------------------------------------------------------------------ recherche
  V.recherche = function (rt) {
    const q = rt.q.get('q') || '';
    const res = q ? G.search(q, 400) : [];
    const kind = rt.q.get('type') || 'tout';
    const shown = res.filter((r) => kind === 'tout' || (kind === 'ex' ? r.kind === 'ex' : r.kind !== 'ex'));
    const el = page(`<div class="page-head"><div class="eyebrow">Recherche</div><h1>${q ? `« ${esc(q)} »` : 'Rechercher'}</h1></div>
      <div class="toolbar"><label class="filter">${ICON.search}<input id="sq" type="search" value="${esc(q)}" placeholder="Mot, expression, règle…" autocomplete="off"></label>
      <div class="seg">${[['tout', 'Tout', res.length], ['rule', 'Fiches', res.filter((r) => r.kind !== 'ex').length], ['ex', 'Exercices', res.filter((r) => r.kind === 'ex').length]].map(([k, l, n]) => `<button data-k="${k}" class="${kind === k ? 'on' : ''}">${l} <span class="num">${n}</span></button>`).join('')}</div></div>
      <div style="max-width:820px">${shown.map((r) => `<a class="search-hit" href="${esc(r.href)}"><small>${r.kind === 'ex' ? 'Exercice' : 'Fiche'}</small><b>${G.mark(r.title, r.terms)}</b><span>${G.snippet(r, r.terms, 240)}</span></a>`).join('') || (q ? `<div class="empty"><strong>Aucun résultat.</strong>Essayez sans accents, au singulier, ou avec un seul mot.</div>` : '')}</div>`);
    const inp = $('#sq', el);
    inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') G.go('#/recherche?q=' + encodeURIComponent(inp.value.trim()), { replace: true }); });
    $$('.seg button', el).forEach((b) => b.onclick = () => G.go(`#/recherche?q=${encodeURIComponent(q)}&type=${b.dataset.k}`, { replace: true }));
    return el;
  };

  // ------------------------------------------------------------------ progression
  V.progres = function () {
    const exDone = Object.keys(S.data.ex).filter((k) => G.ex(k));
    const scores = exDone.map((k) => S.data.ex[k].best);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const mastered = scores.filter((s) => s >= 80).length;
    const read = Object.keys(S.data.read).filter((k) => G.rule(k)).length;
    const st = G.streak(); const streak = st.n;
    // carte de chaleur des 20 dernières semaines
    const cells = []; const start = new Date(); start.setDate(start.getDate() - 7 * 20 + 1 - ((start.getDay() + 6) % 7) + 6);
    const day0 = new Date(); day0.setDate(day0.getDate() - (7 * 20 - 1) - ((day0.getDay() + 6) % 7));
    for (let i = 0; i < 7 * 20 + ((new Date().getDay() + 6) % 7) + 1; i++) {
      const d = new Date(day0); d.setDate(d.getDate() + i); const k = G.ymd(d); const n = S.data.days[k];
      cells.push(`<i title="${k} : ${n || 0} activité(s)" data-l="${n == null ? 0 : n === 0 ? 1 : n < 3 ? 2 : n < 8 ? 3 : 4}"></i>`);
    }
    const colRows = D.collections.map((c) => { const ids = c.groups.flatMap((g) => g.items.map((i) => i.id)); const d = ids.filter((id) => S.exResult(id)).length; return `<div class="row"><a href="#/exercices/${c.id}">${esc(c.title)}</a><div class="bar"><i style="width:${(d / ids.length) * 100}%"></i></div><span class="num">${d}/${ids.length}</span></div>`; }).join('');
    const themeRows = D.themes.map((t, i) => { const ids = t.sections.flatMap((s) => s.children.map((c) => c.id)); const d = ids.filter((x) => S.data.read[x]).length; return `<div class="row"><a href="#/themes/${i}">${i + 1}. ${esc(t.title)}</a><div class="bar"><i style="width:${(d / ids.length) * 100}%"></i></div><span class="num">${d}/${ids.length}</span></div>`; }).join('');
    const favs = Object.keys(S.data.fav).filter((k) => G.rule(k)).sort((a, b) => S.data.fav[b] - S.data.fav[a]);
    const notes = Object.keys(S.data.notes).filter((k) => G.rule(k));
    const weak = exDone.filter((k) => S.data.ex[k].best < 80).sort((a, b) => S.data.ex[a].best - S.data.ex[b].best).slice(0, 8);
    const el = page(`<div class="page-head"><div class="eyebrow">Tableau de bord</div><h1>Ma progression</h1>
      <p class="lead">${S.remote ? 'Votre progression est enregistrée sur votre compte et vous suit d’un appareil à l’autre.' : 'Votre progression est enregistrée dans ce navigateur. Copiez une sauvegarde pour la transférer ailleurs.'}</p></div>
      <div class="kpis">
        <div class="panel kpi"><span>Fiches lues</span><b>${fmt(read)}</b><div class="bar"><i style="width:${(read / D.stats.rules) * 100}%"></i></div><small>sur ${fmt(D.stats.rules)}</small></div>
        <div class="panel kpi"><span>Exercices faits</span><b>${fmt(exDone.length)}</b><div class="bar"><i style="width:${(exDone.length / D.stats.exercises) * 100}%"></i></div><small>${plural(mastered, 'réussi', 'réussis')} à 80 % ou plus</small></div>
        <div class="panel kpi"><span>Score moyen</span><b>${scores.length ? avg + ' %' : '–'}</b><small>meilleurs scores</small></div>
        <div class="panel kpi"><span>Série en cours</span><b>${plural(streak, 'jour')}</b><small>${st.today || !streak ? '' : 'en jeu aujourd’hui · '}${plural(G.review.count(), 'item')} en révision${S.data.games.acquis ? ', ' + plural(S.data.games.acquis, 'acquis', 'acquis') : ''}</small></div>
      </div>
      <div class="section-title"><h2>Activité</h2></div>
      <div class="panel" style="padding:18px"><div class="heat">${cells.join('')}</div></div>
      <div class="two-col" style="margin-top:18px">
        <div class="panel"><h3>Exercices par collection</h3><div class="bars">${colRows}</div></div>
        <div class="panel"><h3>Lecture par thème</h3><div class="bars">${themeRows}</div></div>
        <div class="panel"><h3>À retravailler</h3>${weak.length ? `<div class="ex-rows">${weak.map((k) => exRow(k)).join('')}</div>` : '<p style="color:var(--muted);margin:0">Les exercices sous 80 % apparaîtront ici.</p>'}</div>
        <div class="panel"><h3>Favoris</h3>${favs.length ? `<ul class="linklist">${favs.map((x) => `<li><a href="#/regle/${x}">${ICON.star}<span class="t">${esc(G.ruleTitle(x))}</span></a></li>`).join('')}</ul>` : '<p style="color:var(--muted);margin:0">Ajoutez une fiche aux favoris avec l’étoile en haut de la fiche.</p>'}</div>
        <div class="panel"><h3>Mes notes</h3>${notes.length ? `<ul class="linklist">${notes.map((x) => `<li><a href="#/regle/${x}">${ICON.note}<span class="t"><b>${esc(G.ruleTitle(x))}</b><br><span style="color:var(--muted);font-size:13px">${esc(S.data.notes[x].slice(0, 120))}</span></span></a></li>`).join('')}</ul>` : '<p style="color:var(--muted);margin:0">Le bouton « Note » d’une fiche ouvre un bloc-notes personnel.</p>'}</div>
        <div class="panel"><h3>Réglages</h3>
          <div style="display:flex;flex-direction:column;gap:14px">
            <div><div class="eyebrow" style="margin-bottom:6px">Taille du texte</div><div class="seg" id="size-seg">${[['s', 'Petite'], ['', 'Normale'], ['l', 'Grande']].map(([k, l]) => `<button data-s="${k}" class="${(S.data.prefs.size || '') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
            <div><div class="eyebrow" style="margin-bottom:6px">Thème</div><div class="seg" id="theme-seg">${[['', 'Système'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button data-t="${k}" class="${(S.data.prefs.theme || '') === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
            <label style="display:flex;gap:10px;align-items:center"><input type="checkbox" id="acc-pref" ${S.data.prefs.noAccents ? '' : 'checked'}> Afficher la barre d’accents pendant la saisie</label>
          </div></div>
        <div class="panel"><h3>Sauvegarde</h3>
          <p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Copiez votre progression (scores, fiches lues, favoris, notes) pour la conserver ou la reprendre dans un autre navigateur.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" id="exp">Copier la sauvegarde</button><button class="btn small" id="imp">Importer…</button><button class="btn small danger" id="rst">Tout effacer…</button></div>
          <div id="io-zone" style="margin-top:12px"></div></div>
      </div>`);
    $$('#size-seg button', el).forEach((b) => b.onclick = () => { S.data.prefs.size = b.dataset.s || undefined; S.save(); G.applyPrefs(); G.refresh(); });
    $$('#theme-seg button', el).forEach((b) => b.onclick = () => { S.data.prefs.theme = b.dataset.t || undefined; S.save(); G.applyPrefs(); G.refresh(); });
    $('#acc-pref', el).onchange = (ev) => { S.data.prefs.noAccents = !ev.target.checked; S.save(); };
    const zone = $('#io-zone', el);
    $('#exp', el).onclick = async () => {
      const json = JSON.stringify(S.data);
      try { await navigator.clipboard.writeText(json); G.toast('Sauvegarde copiée dans le presse-papiers'); }
      catch (e) { zone.innerHTML = '<textarea class="io" readonly></textarea><p style="font-size:13px;color:var(--muted)">Sélectionnez le texte et copiez-le.</p>'; const t = $('textarea', zone); t.value = json; t.select(); }
    };
    $('#imp', el).onclick = () => {
      zone.innerHTML = '<textarea class="io" placeholder="Collez ici une sauvegarde…"></textarea><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn small primary" data-go>Fusionner avec ma progression</button><label class="btn small">Depuis un fichier<input type="file" accept=".json,application/json,text/plain" hidden></label></div>';
      const ta = $('textarea', zone);
      $('input[type=file]', zone).onchange = (ev) => { const f = ev.target.files[0]; if (f) f.text().then((t) => (ta.value = t)); };
      $('[data-go]', zone).onclick = () => {
        try { const other = JSON.parse(ta.value); if (!other || typeof other !== 'object' || !other.ex) throw new Error(); S.data = G.merge(S.data, Object.assign({ ex: {}, read: {}, fav: {}, notes: {}, review: {}, hist: [], days: {}, games: {}, prefs: {} }, other)); S.save(); G.toast('Sauvegarde importée'); G.refresh(); }
        catch (e) { G.toast('Ce texte n’est pas une sauvegarde valide.'); }
      };
    };
    $('#rst', el).onclick = () => {
      zone.innerHTML = '<div class="confirm">Effacer toute la progression de cet appareil et du compte ? <button class="btn small danger" data-yes>Oui, tout effacer</button><button class="btn small" data-no>Annuler</button></div>';
      $('[data-no]', zone).onclick = () => (zone.innerHTML = '');
      $('[data-yes]', zone).onclick = () => { const prefs = S.data.prefs; S.data = { v: 1, ex: {}, read: {}, fav: {}, notes: {}, review: {}, hist: [], days: {}, games: {}, prefs }; S.save(); G.toast('Progression effacée'); G.refresh(); };
    };
    return el;
  };

  // ------------------------------------------------------------------ à propos
  V.apropos = function () {
    return page(`<div class="page-head"><div class="eyebrow">À propos</div><h1>Grammaire en réseau</h1></div>
      <div class="about prose">
        <p>Grammaire en réseau est un programme de Jan Wilsker-Wiesen, réalisé avec Claude. Il réunit des fiches de règles, des exercices et des jeux de grammaire française, reliés entre eux : chaque règle renvoie aux notions qu'elle suppose et aux exercices qui l'entraînent.</p>
        <h2>Comment travailler</h2>
        <ul>
          <li><strong>Lire</strong> : partez d'un thème ou du sommaire. Les liens soulignés mènent aux notions voisines ; survolez-les pour un aperçu.</li>
          <li><strong>Vérifier</strong> : dans un exercice, ouvrez la fiche d'aide à côté avec le bouton ${ICON.side.replace('<svg', '<svg style="width:16px;height:16px;vertical-align:-3px"')} sans quitter l'exercice.</li>
          <li><strong>S'entraîner</strong> : le score baisse à chaque erreur et à chaque indice. Les lacunes manquées partent dans « À revoir ».</li>
          <li><strong>Revenir</strong> : la révision espacée vous repropose les erreurs après 1, 3, 7, 16 puis 35 jours.</li>
        </ul>
        <h2>Raccourcis clavier</h2>
        <div class="shortcuts">
          <kbd>Ctrl K</kbd><span>ou <kbd>/</kbd> : rechercher partout</span>
          <kbd>Entrée</kbd><span>dans une lacune : passer à la suivante</span>
          <kbd>Ctrl Entrée</kbd><span>vérifier l'exercice</span>
          <kbd>Alt ←</kbd><span>revenir à la page précédente</span>
          <kbd>Échap</kbd><span>fermer la recherche ou la fiche ouverte à côté</span>
        </div>
      </div>`);
  };

  // ------------------------------------------------------------------ mode d'emploi
  V.guide = function () {
    const firstSec = (ti) => { const t = D.themes[ti]; const c = t && t.sections[0] && t.sections[0].children[0]; return c ? '#/regle/' + c.id : '#/themes/' + ti; };
    const step = (n, title, body) => `<div class="guide-step"><span class="num">${n}</span><div><h3>${title}</h3>${body}</div></div>`;
    return page(`<div class="page-head"><div class="eyebrow">Mode d’emploi</div><h1>Comment utiliser ce programme</h1>
      <p class="lead">Inutile de lire les fiches au hasard : le programme a une table des matières, un index et une recherche. Voici comment s’y retrouver, et une façon simple de travailler chaque jour.</p></div>
      <div class="guide">
        <section class="panel guide-box"><h2>1. Trouver ce que l’on cherche</h2>
          <div class="guide-grid">
            <a class="card" href="#/themes"><h3>${ICON.rule} Le plan</h3><p>La table des matières : cinq grands thèmes, découpés en sections numérotées. Pour apprendre dans l’ordre.</p></a>
            <a class="card" href="#/sommaire"><h3>${ICON.cards} Le sommaire A–Z</h3><p>L’index alphabétique : « accord », « participe », « que »… Pour une question précise.</p></a>
            <button class="card" type="button" data-search><h3>${ICON.search} La recherche</h3><p>Ctrl K ou la loupe : un mot, une expression, une règle. Les accents ne sont pas nécessaires.</p></button>
            <a class="card" href="#/carte"><h3>${ICON.map} La carte</h3><p>Toutes les fiches et leurs renvois sur une seule carte. Pour voir quelles notions vont ensemble.</p></a>
          </div></section>
        <section class="panel guide-box"><h2>2. Une séance type (15 minutes)</h2>
          ${step(1, 'Le défi du jour', '<p>Dix questions, sans chronomètre. <a href="#/jeu/defi">Faire le défi</a></p>')}
          ${step(2, 'À revoir', '<p>Les erreurs des jours précédents reviennent au bon moment. <a href="#/revision">Ouvrir la révision</a></p>')}
          ${step(3, 'Une notion nouvelle', '<p>Lisez une fiche, puis faites un exercice de la colonne « S’entraîner » à droite de la fiche.</p>')}
          <p class="guide-note">Trois activités par jour remplissent l’objectif du jour sur la page d’accueil.</p></section>
        <section class="panel guide-box"><h2>3. Un parcours conseillé</h2>
          <p>Pour tout reprendre depuis le début, suivez les thèmes dans cet ordre. Chaque fiche a des boutons « Précédente » et « Suivante » en bas de page.</p>
          <ol class="guide-path">${D.themes.map((t, i) => `<li><a href="${firstSec(i)}"><b>${esc(t.title)}</b></a><span>${t.sections.map((s) => esc(s.title)).join(' · ')}</span></li>`).join('')}</ol></section>
        <section class="panel guide-box"><h2>4. Lire une fiche</h2>
          <ul>
            <li>Les mots soulignés mènent aux notions voisines ; survolez-les pour un aperçu.</li>
            <li>À droite : les exercices liés, la carte des voisins, les fiches citées et celles qui citent celle-ci.</li>
            <li>En haut : ajouter aux favoris, marquer comme lue, écrire une note personnelle.</li>
          </ul></section>
        <section class="panel guide-box"><h2>5. Faire un exercice</h2>
          <ul>
            <li>Remplissez les lacunes, puis <b>Vérifier</b> (Ctrl Entrée). <b>Entrée</b> passe à la lacune suivante.</li>
            <li><b>Indice</b> montre la lettre suivante ; après deux erreurs, <b>voir</b> donne la réponse d’une seule lacune. Chaque aide coûte des points.</li>
            <li>La fiche d’aide s’ouvre à côté de l’exercice, sans le quitter. La barre d’accents (é, è, ç, œ…) apparaît pendant la saisie.</li>
            <li>Tout ce qui est manqué part dans « À revoir ».</li>
          </ul></section>
        <section class="panel guide-box"><h2>6. Suivre ses progrès</h2>
          <p><a href="#/progres">Ma progression</a> montre les fiches lues, les scores, le calendrier d’activité, les favoris et les notes. On peut y copier une sauvegarde et changer la taille du texte ou le thème clair/sombre.</p></section>
      </div>`);
  };

  V.notfound = function () {
    return page(`<div class="empty" style="margin-top:40px"><strong>Page introuvable</strong>Ce lien ne mène à aucune fiche ni aucun exercice. <a href="#/">Retour à l'accueil</a></div>`);
  };
})();

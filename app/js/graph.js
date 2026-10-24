/* Réseau des notions : carte interactive, voisinage d'une fiche, animation d'accueil. */
(function () {
  'use strict';
  const { D, S, $, $$, esc, fold, plural, h, ICON } = G;
  const N = D.graph.nodes.map(([id, x, y, th, deg], k) => ({ id, x, y, th, deg, k }));
  const BY_ID = Object.fromEntries(N.map((n) => [n.id, n]));
  const ADJ = N.map(() => []);
  D.graph.edges.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const themeVar = (th) => (th >= 0 && th < 5 ? `--map-${th}` : '--map-x');
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function fitCanvas(c) {
    const r = c.getBoundingClientRect(); const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }

  // ------------------------------------------------------------------ animation de l'accueil
  G.heroNet = function (c) {
    if (!c) return;
    let { ctx, w, h: H } = fitCanvas(c);
    const pad = 30;
    const sx = (x) => w * 0.32 + (x / 1000) * (w * 0.68 - pad), sy = (y) => pad + (y / 1000) * (H - pad * 2);
    const pulses = [];
    let raf = 0, t0 = performance.now();
    const draw = (now) => {
      ctx.clearRect(0, 0, w, H);
      ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(109,220,205,0.13)';
      ctx.beginPath();
      for (const [a, b] of D.graph.edges) { ctx.moveTo(sx(N[a].x), sy(N[a].y)); ctx.lineTo(sx(N[b].x), sy(N[b].y)); }
      ctx.stroke();
      for (const n of N) {
        const r = 1 + Math.min(5, Math.sqrt(n.deg) * 0.7);
        ctx.fillStyle = n.th >= 0 ? `rgba(${[ '44,196,178', '109,220,205', '95,179,221', '143,167,239', '169,200,106'][n.th] || '159,184,180'},0.55)` : 'rgba(159,184,180,0.35)';
        ctx.beginPath(); ctx.arc(sx(n.x), sy(n.y), r, 0, 7); ctx.fill();
      }
      if (!reduced()) {
        if (pulses.length < 18 && Math.random() < 0.25) { const e = D.graph.edges[Math.floor(Math.random() * D.graph.edges.length)]; pulses.push({ a: e[0], b: e[1], t: 0, s: 0.006 + Math.random() * 0.01 }); }
        for (let i = pulses.length - 1; i >= 0; i--) {
          const p = pulses[i]; p.t += p.s; if (p.t >= 1) { pulses.splice(i, 1); continue; }
          const A = N[p.a], B = N[p.b]; const x = sx(A.x + (B.x - A.x) * p.t), y = sy(A.y + (B.y - A.y) * p.t);
          const g = ctx.createRadialGradient(x, y, 0, x, y, 7); g.addColorStop(0, 'rgba(211,246,240,0.95)'); g.addColorStop(1, 'rgba(211,246,240,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
        }
        raf = requestAnimationFrame(draw);
      }
    };
    draw(t0);
    const onResize = () => { ({ ctx, w, h: H } = fitCanvas(c)); if (reduced()) draw(); };
    window.addEventListener('resize', onResize);
    const prev = G.cleanup; G.cleanup = () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); prev && prev(); };
  };

  // ------------------------------------------------------------------ voisinage d'une fiche
  G.egoNet = function (c, id) {
    const r = G.rule(id); if (!r) return;
    const outs = r.out.filter((x) => G.rule(x)), ins = r.in.filter((x) => G.rule(x) && !r.out.includes(x));
    const neigh = [...outs.map((x) => ({ id: x, dir: 'out' })), ...ins.map((x) => ({ id: x, dir: 'in' }))].slice(0, 16);
    const { ctx, w, h: H } = fitCanvas(c);
    const cx = w / 2, cy = H / 2, R = Math.min(w, H) * 0.36;
    neigh.forEach((n, i) => { const a = -Math.PI / 2 + (i / neigh.length) * Math.PI * 2; n.x = cx + Math.cos(a) * R; n.y = cy + Math.sin(a) * R * 0.92; n.a = a; });
    const ink = css('--ink'), muted = css('--muted'), line = css('--line-2'), acc = css('--accent'), surface = css('--surface');
    let hover = -1;
    const draw = () => {
      ctx.clearRect(0, 0, w, H);
      // liens entre voisins
      const set = new Set(neigh.map((n) => n.id));
      ctx.strokeStyle = line; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.6;
      neigh.forEach((n) => (G.rule(n.id).out || []).forEach((o) => { if (set.has(o)) { const m = neigh.find((z) => z.id === o); ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke(); } }));
      ctx.globalAlpha = 1;
      neigh.forEach((n, i) => {
        ctx.strokeStyle = i === hover ? acc : n.dir === 'out' ? css('--t-400') : line; ctx.lineWidth = i === hover ? 2 : 1.3;
        ctx.setLineDash(n.dir === 'in' ? [3, 3] : []);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.x, n.y); ctx.stroke();
      });
      ctx.setLineDash([]);
      neigh.forEach((n, i) => {
        const th = (G.rule(n.id).th || [-1])[0];
        ctx.fillStyle = css(themeVar(th)); ctx.beginPath(); ctx.arc(n.x, n.y, i === hover ? 7 : 5, 0, 7); ctx.fill();
        if (S.data.read[n.id]) { ctx.strokeStyle = surface; ctx.lineWidth = 2; ctx.stroke(); }
      });
      ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.fill();
      ctx.strokeStyle = css('--accent-soft'); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 7); ctx.stroke();
      const label = (txt, x, y, color, bold) => {
        ctx.font = `${bold ? 600 : 500} 11.5px ${css('--f-ui')}`; ctx.fillStyle = color;
        const t = txt.length > 26 ? txt.slice(0, 25) + '…' : txt; const tw = ctx.measureText(t).width;
        let lx = Math.min(w - tw - 4, Math.max(4, x - tw / 2)); let ly = y;
        ctx.fillText(t, lx, ly);
      };
      if (hover >= 0) { const n = neigh[hover]; label(G.ruleTitle(n.id), n.x, n.y + (n.y > cy ? 20 : -12), ink, true); }
      else label(r.title, cx, cy + 30, ink, true);
      ctx.font = `500 10px ${css('--f-mono')}`; ctx.fillStyle = muted;
      ctx.fillText(G.T('— renvoie à   ┄ citée par', '— verweist auf   ┄ zitiert von'), 8, H - 8);
    };
    draw();
    const hit = (ev) => { const b = c.getBoundingClientRect(); const x = ev.clientX - b.left, y = ev.clientY - b.top; let best = -1, bd = 18 * 18; neigh.forEach((n, i) => { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
    c.addEventListener('mousemove', (ev) => { const k = hit(ev); if (k !== hover) { hover = k; c.style.cursor = k >= 0 ? 'pointer' : 'default'; draw(); } });
    c.addEventListener('mouseleave', () => { hover = -1; draw(); });
    c.addEventListener('click', (ev) => { const k = hit(ev); if (k >= 0) G.go('#/regle/' + neigh[k].id); else G.go('#/carte?f=' + id); });
  };

  // ------------------------------------------------------------------ carte complète
  G.views.carte = function (rt) {
    const focusId = rt.q.get('f');
    const el = h(`<div class="page" style="max-width:none"><div class="page-head" style="max-width:none;margin-bottom:16px"><div class="eyebrow">${G.T('Réseau', 'Netz')}</div><h1>${G.T('Carte des notions', 'Regelnetz')}</h1>
      <p class="lead">${G.T(`${plural(N.length, 'fiche')} et ${plural(D.graph.edges.length, 'renvoi')}. Les fiches proches se citent souvent ; la taille d’un point dit combien de fiches y renvoient. Faites glisser pour vous déplacer, molette ou pincement pour zoomer.`, `${plural(N.length, 'fiche')} mit Querverweisen und ${plural(D.graph.edges.length, 'renvoi')} (Regeln ohne Verweise sind hier nicht dargestellt). Fiches, die nah beieinander liegen, verweisen oft aufeinander; die Größe eines Punktes zeigt, wie viele Fiches auf ihn verweisen. Ziehen zum Verschieben, Mausrad oder zwei Finger zum Zoomen.`)}</p></div>
      <div class="map-wrap" id="mw"><canvas id="map" aria-label="Carte interactive des fiches de grammaire"></canvas>
        <div class="map-tools"><label class="filter">${ICON.search}<input id="mq" type="search" placeholder="Trouver une fiche sur la carte…" autocomplete="off"></label>
          <button class="btn small" id="mread" title="Mettre en évidence les fiches lues">${ICON.check} Mes lectures</button><button class="btn small" id="mreset">Recentrer</button></div>
        <div class="map-legend" id="mleg">${D.themes.map((t, i) => `<button data-th="${i}"><i style="background:var(${themeVar(i)})"></i>${esc(G.tx(t.title))}</button>`).join('')}<button data-th="-1"><i style="background:var(--map-x)"></i>${G.T('Fiches du sommaire', 'Fiches aus dem Register')}</button></div>
        <div class="map-card" id="mcard" hidden></div>
        <div class="peek" id="mpeek" hidden style="pointer-events:none"></div>
      </div></div>`);
    G.afterRender = () => mountMap(el, focusId);
    return el;
  };

  function mountMap(el, focusId) {
    const c = $('#map', el); const wrap = $('#mw', el);
    let { ctx, w, h: H } = fitCanvas(c);
    const view = { s: 1, x: 0, y: 0 };
    const hidden = new Set(); let sel = focusId && BY_ID[focusId] ? BY_ID[focusId].k : -1; let hover = -1; let showRead = false; let match = null;
    const colors = {};
    const loadColors = () => { for (let t = -1; t < 5; t++) colors[t] = css(themeVar(t)); Object.assign(colors, { ink: css('--ink'), muted: css('--muted'), line: css('--line-2'), acc: css('--accent'), bg: css('--surface'), ok: css('--ok') }); };
    loadColors();
    const fit = () => { const pad = 40; const s = Math.min((w - pad * 2) / 1000, (H - pad * 2) / 1000); view.s = s; view.x = (w - 1000 * s) / 2; view.y = (H - 1000 * s) / 2 + 10; };
    fit();
    const X = (n) => view.x + n.x * view.s, Y = (n) => view.y + n.y * view.s;
    const rad = (n) => (2 + Math.sqrt(n.deg) * 0.95) * Math.max(0.8, Math.min(1.8, view.s * 1.4));
    const visible = (n) => !hidden.has(n.th < 0 || n.th > 4 ? -1 : n.th);
    let pending = false;
    const draw = () => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; paint(); }); };
    function paint() {
      ctx.clearRect(0, 0, w, H);
      const focus = sel >= 0 ? sel : hover;
      const nb = focus >= 0 ? new Set([focus, ...ADJ[focus]]) : null;
      // arêtes
      ctx.lineWidth = 0.6; ctx.strokeStyle = colors.line; ctx.globalAlpha = nb ? 0.12 : 0.35;
      ctx.beginPath();
      for (const [a, b] of D.graph.edges) { if (!visible(N[a]) || !visible(N[b])) continue; ctx.moveTo(X(N[a]), Y(N[a])); ctx.lineTo(X(N[b]), Y(N[b])); }
      ctx.stroke();
      if (nb) {
        ctx.globalAlpha = 0.9; ctx.strokeStyle = colors.acc; ctx.lineWidth = 1.4; ctx.beginPath();
        for (const b of ADJ[focus]) { ctx.moveTo(X(N[focus]), Y(N[focus])); ctx.lineTo(X(N[b]), Y(N[b])); }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // nœuds
      for (const n of N) {
        if (!visible(n)) continue;
        const dim = (nb && !nb.has(n.k)) || (match && !match.has(n.k)) || (showRead && !S.data.read[n.id]);
        ctx.globalAlpha = dim ? 0.18 : 1;
        ctx.fillStyle = colors[n.th >= 0 && n.th < 5 ? n.th : -1];
        ctx.beginPath(); ctx.arc(X(n), Y(n), rad(n), 0, 7); ctx.fill();
        if (showRead && S.data.read[n.id]) { ctx.strokeStyle = colors.ok; ctx.lineWidth = 2; ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
      // étiquettes
      const labelled = [];
      const minDeg = view.s > 2.2 ? 0 : view.s > 1.3 ? 6 : view.s > 0.8 ? 14 : 24;
      for (const n of N) {
        if (!visible(n)) continue;
        const must = n.k === focus || (nb && nb.has(n.k) && view.s > 0.5) || (match && match.has(n.k) && match.size < 30);
        if (!must && (n.deg < minDeg || nb || match)) continue;
        labelled.push(n);
      }
      ctx.font = `600 11.5px ${css('--f-ui')}`; ctx.textBaseline = 'middle';
      const boxes = [];
      labelled.sort((a, b) => (b.k === focus) - (a.k === focus) || b.deg - a.deg);
      for (const n of labelled) {
        let t = G.ruleTitle(n.id); if (t.length > 34) t = t.slice(0, 33) + '…';
        const tw = ctx.measureText(t).width; const x = X(n) + rad(n) + 5, y = Y(n);
        const box = [x - 2, y - 8, x + tw + 2, y + 8];
        if (n.k !== focus && boxes.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
        boxes.push(box);
        ctx.fillStyle = colors.bg; ctx.globalAlpha = 0.8; ctx.fillRect(box[0], box[1], box[2] - box[0], 16); ctx.globalAlpha = 1;
        ctx.fillStyle = n.k === focus ? colors.acc : colors.ink; ctx.fillText(t, x, y);
      }
    }
    draw();

    // interactions
    const at = (ev) => { const b = c.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
    const pick = (x, y) => { let best = -1, bd = 14 * 14; for (const n of N) { if (!visible(n)) continue; const d = (X(n) - x) ** 2 + (Y(n) - y) ** 2; const rr = Math.max(bd, rad(n) ** 2); if (d < rr && d < bd + rad(n) ** 2) { bd = d; best = n.k; } } return best; };
    let drag = null; const pointers = new Map(); let pinch = null;
    c.addEventListener('pointerdown', (ev) => { c.setPointerCapture(ev.pointerId); pointers.set(ev.pointerId, at(ev)); if (pointers.size === 1) drag = { p: at(ev), v: { ...view }, moved: false }; else if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), v: { ...view }, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; drag = null; } });
    c.addEventListener('pointermove', (ev) => {
      const p = at(ev);
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, p);
      if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); zoomAt(pinch.m[0], pinch.m[1], (pinch.v.s * d) / pinch.d, pinch.v); return; }
      if (drag) { const dx = p[0] - drag.p[0], dy = p[1] - drag.p[1]; if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; c.classList.add('drag'); } view.x = drag.v.x + dx; view.y = drag.v.y + dy; draw(); return; }
      const k = pick(...p); if (k !== hover) { hover = k; c.style.cursor = k >= 0 ? 'pointer' : 'grab'; draw(); showPeek(k, p); }
    });
    const up = (ev) => {
      pointers.delete(ev.pointerId); if (pointers.size < 2) pinch = null;
      if (drag && !drag.moved) { const k = pick(...at(ev)); select(k); }
      drag = null; c.classList.remove('drag');
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('mouseleave', () => { hover = -1; $('#mpeek', el).hidden = true; draw(); });
    c.addEventListener('wheel', (ev) => { ev.preventDefault(); const [x, y] = at(ev); zoomAt(x, y, view.s * Math.exp(-ev.deltaY * 0.0015), view); }, { passive: false });
    function zoomAt(x, y, s, base) { s = Math.max(0.25, Math.min(8, s)); view.x = x - ((x - base.x) / base.s) * s; view.y = y - ((y - base.y) / base.s) * s; view.s = s; draw(); }
    function showPeek(k, p) {
      const pk = $('#mpeek', el); if (k < 0 || sel >= 0) { pk.hidden = true; return; }
      const r = G.rule(N[k].id); pk.innerHTML = `<div class="k">${r.th ? esc(G.tx(D.themes[r.th[0]].title)) : G.T('Sommaire', 'Register')}</div><b>${esc(r.title)}</b><div class="m">${plural(ADJ[k].length, 'voisin')} · ${plural(r.ex.length, 'exercice')}</div>`;
      pk.hidden = false; pk.style.position = 'absolute'; pk.style.left = Math.min(p[0] + 16, w - 340) + 'px'; pk.style.top = Math.min(p[1] + 16, H - 110) + 'px';
    }
    function select(k) {
      sel = k; const card = $('#mcard', el); $('#mpeek', el).hidden = true;
      if (k < 0) { card.hidden = true; draw(); return; }
      const n = N[k]; const r = G.rule(n.id);
      card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><span class="eyebrow">${r.th ? esc(G.tx(D.themes[r.th[0]].title)) : G.T('Sommaire', 'Register')}</span><button class="icon-btn" style="width:30px;height:30px" data-x aria-label="Fermer">${ICON.close}</button></div>
        <h3>${esc(r.title)}</h3><p>${esc(G.excerpt(r, 200))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><a class="btn small primary" href="#/regle/${r.id}">Lire la fiche</a><button class="btn small" data-side="#/regle/${r.id}">${ICON.side} À côté</button></div>
        <div class="eyebrow" style="margin-bottom:6px">Voisins (${ADJ[k].length})</div>
        <ul class="linklist">${ADJ[k].slice(0, 14).map((j) => `<li><a href="#" data-k="${j}"><span class="dot-ic" style="background:var(${themeVar(N[j].th)})"></span><span class="t">${esc(G.ruleTitle(N[j].id))}</span></a></li>`).join('')}</ul>`;
      card.hidden = false;
      $('[data-x]', card).onclick = () => select(-1);
      $('[data-side]', card).onclick = () => G.openDrawer('#/regle/' + r.id);
      $$('[data-k]', card).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); centerOn(+a.dataset.k); select(+a.dataset.k); });
      draw();
    }
    function centerOn(k, s) { const n = N[k]; view.s = s || Math.max(view.s, 1.6); view.x = w / 2 - n.x * view.s - (w > 700 ? 120 : 0); view.y = H / 2 - n.y * view.s; draw(); }
    $('#mreset', el).onclick = () => { fit(); select(-1); match = null; $('#mq', el).value = ''; };
    $('#mread', el).onclick = (ev) => { showRead = !showRead; ev.currentTarget.classList.toggle('on', showRead); draw(); };
    $$('#mleg button', el).forEach((b) => b.onclick = () => { const t = +b.dataset.th; if (hidden.has(t)) hidden.delete(t); else hidden.add(t); b.classList.toggle('off', hidden.has(t)); draw(); });
    const mq = $('#mq', el);
    mq.addEventListener('input', G.debounce(() => {
      const q = fold(mq.value.trim());
      if (!q) { match = null; draw(); return; }
      match = new Set(N.filter((n) => fold(G.ruleTitle(n.id)).includes(q)).map((n) => n.k));
      draw();
    }, 120));
    mq.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && match && match.size) { const k = [...match].sort((a, b) => N[b].deg - N[a].deg)[0]; centerOn(k, 2.2); select(k); } });
    const ro = new ResizeObserver(() => { ({ ctx, w, h: H } = fitCanvas(c)); draw(); });
    ro.observe(wrap);
    const mqDark = matchMedia('(prefers-color-scheme: dark)'); const onScheme = () => { loadColors(); draw(); }; mqDark.addEventListener('change', onScheme);
    G.onTheme = onScheme;
    const prev = G.cleanup; G.cleanup = () => { ro.disconnect(); mqDark.removeEventListener('change', onScheme); G.onTheme = null; prev && prev(); };
    if (sel >= 0) { centerOn(sel, 2); select(sel); }
  }
})();

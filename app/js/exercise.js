/* Exercices : textes à compléter, questionnaires, associations ; contexte des lacunes pour les jeux. */
(function () {
  'use strict';
  const { D, S, $, $$, esc, strip, fold, plural, h, ICON } = G;

  // ------------------------------------------------------------------ contexte d'une lacune (phrase isolée)
  // Le corps est découpé en lignes ; la mise en forme utile (souligné, gras, italique) est conservée.
  const ctxCache = {};
  const KEEP = new Set(['U', 'B', 'STRONG', 'EM', 'I', 'SUP', 'SUB']);
  function cleanInline(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    const walk = (node) => {
      for (const c of [...node.childNodes]) {
        if (c.nodeType === 1) { walk(c); if (!KEEP.has(c.tagName)) c.replaceWith(...c.childNodes); else [...c.attributes].forEach((a) => c.removeAttribute(a.name)); }
      }
    };
    walk(t.content);
    return t.innerHTML.replace(/\s+/g, ' ').trim();
  }
  G.clozeLines = function (e) {
    if (ctxCache[e.id]) return ctxCache[e.id];
    const html = e.body.replace(/<gap data-i="(\d+)"><\/gap>/g, '⟦$1⟧');
    const lines = html.split(/<span class="pb"><\/span>|<br\/?>|<\/?(?:p|div|li|td|tr|table|h\d)(?: [^>]*)?>/).map(cleanInline).filter((l) => l.replace(/<[^>]+>/g, '').trim());
    const byGap = {};
    lines.forEach((l, n) => { (l.match(/⟦(\d+)⟧/g) || []).forEach((m) => { byGap[m.slice(1, -1)] = l; byGap['prev' + m.slice(1, -1)] = lines[n - 1] || ''; }); });
    return (ctxCache[e.id] = byGap);
  };
  /** Phrase contenant la lacune gi : { before, after (HTML), plain, siblings, answers, opts, clue } ; les autres lacunes deviennent « … ». */
  G.gapContext = function (e, gi) {
    const line = G.clozeLines(e)[gi];
    if (!line) return null;
    const siblings = (line.match(/⟦\d+⟧/g) || []).length - 1;
    const parts = line.split('⟦' + gi + '⟧');
    const dots = (x) => x.replace(/⟦\d+⟧/g, '<span class="sib">…</span>');
    let before = cleanInline(dots(parts[0])), after = cleanInline(dots(parts[1] || ''));
    const plainB = before.replace(/<[^>]+>/g, ''), plainA = after.replace(/<[^>]+>/g, '');
    if (plainB.length > 190) before = '…' + esc(plainB.slice(-160).replace(/^\S*\s/, ''));
    if (plainA.length > 170) after = esc(plainA.slice(0, 150).replace(/\s\S*$/, '')) + '…';
    const g = e.gaps[gi];
    // ligne précédente : utile pour les dialogues (« - Oui, il y en a … ») et les phrases coupées par un saut de ligne
    let prev = cleanInline(dots(G.clozeLines(e)['prev' + gi] || ''));
    if (prev.replace(/<[^>]+>/g, '').length > 220) prev = '…' + esc(prev.replace(/<[^>]+>/g, '').slice(-200));
    const needPrev = /^\s*(-|–|—|«)/.test(plainB) || plainB.trim().length < 12;
    return { before, after, prev, needPrev, plain: (plainB + ' ' + plainA).trim(), siblings, answers: g.a, opts: g.opts, clue: g.clue };
  };

  // Une lacune peut-elle se travailler hors de son exercice ? (pas de tableau, de mot souligné à transformer, de verbe absent)
  const UNFIT = /remplacez|transformez|repondez|tableau|classez|identifiez|reformulez|faites de ces|trouvez les verbes|indiquez|ecrivez entre|ecrivez a quel|precisez la nature|associez|terminez les phrases/;
  const VERBAL = /conjug|mettez les verbes|temps|futur|passe simple|imparfait|subjonctif|conditionnel|present|indicatif/;
  G.fitsAlone = function (e, i) {
    if (!e || e.type !== 'cloze') return !!e;
    const consigne = fold(strip([e.title, e.subtitle, e.instructions].join(' ')));
    if (UNFIT.test(consigne) || /^tableau|imperatif/.test(e.id)) return false;
    const g = e.gaps[i]; if (!g || !g.a.length || /^x+$/i.test(g.a[0]) || g.a[0].length > 40) return false;
    const c = G.gapContext(e, i);
    if (!c || c.siblings > 2) return false;
    const words = c.plain.split(/\s+/).filter((w) => /[a-zà-ÿ]{2,}/i.test(w)).length;
    if (words < 4 || c.plain.length > 340) return false;
    if (VERBAL.test(consigne) && !g.opts && !/\(/.test(c.plain + (c.needPrev ? c.prev : ''))) return false;
    return true;
  };

  // ------------------------------------------------------------------ page d'un exercice
  G.views.exercice = function (rt) {
    const e = G.ex(rt.parts[1]);
    if (!e) return G.views.notfound(rt);
    G.visit('#/exercice/' + e.id, G.exTitle(e));
    const res = S.exResult(e.id);
    // position dans sa collection
    let col = null, list = [], k = -1;
    for (const c of D.collections) { for (const g of c.groups) { const i = g.items.findIndex((x) => x.id === e.id); if (i >= 0) { col = c; list = g.items; k = i; break; } } if (col) break; }
    const prev = list[k - 1], next = list[k + 1];
    const helps = (e.help || []).filter((x) => /^#\/regle\//.test(x.href));
    const rulesExtra = (e.rules || []).filter((id) => !helps.some((x) => x.href.includes('/' + id)));
    const el = h(`<div class="page"><div class="ex-layout">
      <div>
        <div class="ex-head">
          <div class="crumbs"><a href="#/exercices">Exercices</a>${col ? `<span class="sep">/</span><a href="#/exercices/${col.id}">${esc(col.title)}</a>` : ''}${e.cat && col && col.id === 'themes' ? `<span class="sep">/</span><a href="#/exercices/themes?g=${col.groups.findIndex((g) => g.title === e.cat)}">${esc(e.cat)}</a>` : ''}</div>
          <h1>${e.title}</h1>
          <div class="chips"><span class="chip accent">${G.TYPE_LABEL[e.type]}</span><span class="chip">${plural(e.n, 'item')}</span>${res ? `<span class="chip ${res.best >= 80 ? 'ok' : 'warn'}">Meilleur score : ${res.best} %</span>` : ''}</div>
        </div>
        ${helps.length + rulesExtra.length ? `<div class="help-strip"><span>Aide :</span>${helps.map((x) => `<button class="chip accent" data-side="${esc(x.href)}">${esc(x.label)}</button>`).join('')}${rulesExtra.map((id) => `<button class="chip accent" data-side="#/regle/${id}">${esc(G.ruleTitle(id))}</button>`).join('')}</div>` : ''}
        ${e.subtitle ? `<div class="ex-instr">${e.subtitle}</div>` : ''}
        ${e.instructions ? `<div class="ex-instr" style="margin-top:8px">${e.instructions}</div>` : ''}
        ${e.reading ? `<details class="ex-reading" open><summary>${esc(e.readingTitle || 'Texte de lecture')}</summary><div class="prose">${e.reading}</div></details>` : ''}
        <div id="ex-zone" style="margin-top:18px"></div>
        ${prev || next ? `<nav class="pager" style="max-width:none">${prev ? `<a href="#/exercice/${prev.id}"><span>← Précédent</span><b>${esc(G.exTitle(G.ex(prev.id)))}</b></a>` : ''}${next ? `<a class="next" href="#/exercice/${next.id}"><span>Suivant →</span><b>${esc(G.exTitle(G.ex(next.id)))}</b></a>` : ''}</nav>` : ''}
      </div>
      <aside class="rail">
        <div class="rail-box"><h3>Aide <span class="n num">${helps.length + rulesExtra.length}</span></h3>
          ${helps.length + rulesExtra.length ? `<ul class="linklist">${helps.map((x) => helpItem(x.href, x.label)).join('')}${rulesExtra.map((id) => helpItem('#/regle/' + id, G.ruleTitle(id))).join('')}</ul>
          <p style="margin:10px 0 0;font-size:12.5px;color:var(--muted)">${ICON.side.replace('<svg', '<svg style="width:14px;height:14px;vertical-align:-2px"')} ouvre la fiche à côté, sans quitter l’exercice.</p>` : '<p style="margin:0;color:var(--muted);font-size:14px">Pas de fiche d’aide associée. Utilisez la recherche (Ctrl K).</p>'}
        </div>
        ${(e.nav || []).length ? `<div class="rail-box"><h3>Voir aussi</h3><ul class="linklist">${e.nav.map((x) => `<li><a href="${esc(x.href)}"><span class="t">${esc(x.label)}</span></a></li>`).join('')}</ul></div>` : ''}
        <div class="rail-box"><h3>Comment ça marche</h3><p style="margin:0;font-size:13.5px;color:var(--ink-2);line-height:1.5">${HOWTO[e.type]}</p></div>
      </aside></div></div>`);
    $$('[data-side]', el).forEach((b) => b.onclick = (ev) => { ev.preventDefault(); G.openDrawer(b.dataset.side); });
    const zone = $('#ex-zone', el);
    ({ cloze: runCloze, quiz: runQuiz, match: runMatch })[e.type](e, zone);
    return el;
  };
  function helpItem(href, label) {
    return `<li style="display:flex;align-items:center;gap:2px"><a href="${esc(href)}" style="flex:1"><span class="dot-ic ${S.data.read[(href.split('/')[2])] ? 'done' : ''}"></span><span class="t">${esc(label)}</span></a><button class="icon-btn" style="width:32px;height:32px" data-side="${esc(href)}" title="Ouvrir à côté" aria-label="Ouvrir ${esc(label)} à côté">${ICON.side}</button></li>`;
  }
  const HOWTO = {
    cloze: 'Remplissez les lacunes puis cliquez sur <b>Vérifier</b> (Ctrl Entrée). <b>Entrée</b> passe à la lacune suivante. <b>Indice</b> révèle la lettre suivante dans la lacune active. Chaque erreur et chaque indice coûtent des points.',
    quiz: 'Choisissez la bonne réponse. Une première réponse juste rapporte tous les points ; chaque essai supplémentaire en coûte.',
    match: 'Cliquez sur le début d’une expression, puis sur sa fin. Les paires trouvées se fixent en vert.',
  };

  function finish(e, score, wrongKeys) {
    const prev = S.data.ex[e.id];
    S.data.ex[e.id] = { best: Math.max(prev ? prev.best : 0, score), last: score, tries: (prev ? prev.tries : 0) + 1, ts: Date.now() };
    wrongKeys.forEach((w) => G.review.add(w.key, w.item));
    S.markDay(1);
    S.save();
    G.updateBadge();
  }
  function resultBox(score, wrong, e, again) {
    const msg = score === 100 ? 'Parfait, du premier coup.' : score >= 80 ? 'Très bien. Encore un peu de précision et c’est acquis.' : score >= 50 ? 'C’est en bonne voie. Relisez la fiche d’aide, puis recommencez.' : 'Relisez la fiche d’aide avant de recommencer.';
    const rule = (e.rules || [])[0];
    const box = h(`<div class="result"><span class="big num">${score} %</span><p><b>${msg}</b>${wrong ? `<br><span style="color:var(--ink-2)">${plural(wrong, 'item')} ${wrong > 1 ? 'rejoignent' : 'rejoint'} « À revoir ».</span>` : ''}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${rule && score < 100 ? `<button class="btn" data-rule>${ICON.side} ${esc(G.ruleTitle(rule))}</button>` : ''}<button class="btn" data-again>${ICON.redo} Recommencer</button></div></div>`);
    $('[data-again]', box).onclick = again;
    const rb = $('[data-rule]', box); if (rb) rb.onclick = () => G.openDrawer('#/regle/' + rule);
    return box;
  }

  // ------------------------------------------------------------------ texte à compléter
  function runCloze(e, zone) {
    const st = e.gaps.map(() => ({ tries: 0, hints: 0, ok: false, shown: false, last: '', wrong: [] }));
    const width = (g) => { const L = Math.max(...g.a.map((a) => a.length), 3); return Math.min(32, Math.ceil((L + 2) / 4) * 4); };
    const allOpts = e.gaps.some((g) => g.opts);
    zone.innerHTML = `<div class="ex-paper">
      ${e.wordList && e.wordList.length && !allOpts ? `<div class="wordbank" aria-label="Mots à placer">${e.wordList.map((w) => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
      <div class="cloze" id="cloze">${e.body.replace(/<gap data-i="(\d+)"><\/gap>/g, (m, i) => {
        const g = e.gaps[i];
        const input = g.opts
          ? `<select data-i="${i}" aria-label="Lacune ${+i + 1}"><option value=""></option>${g.opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>`
          : `<input data-i="${i}" data-acc type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Lacune ${+i + 1}" style="width:${width(g)}ch">`;
        return `<span class="gap" id="gap-${i}">${input}${g.clue ? `<button class="clue" type="button" title="${esc(g.clue)}" aria-label="Indice : ${esc(g.clue)}">?</button>` : ''}</span>`;
      })}</div></div>
      <div class="actionbar" id="abar">
        <button class="btn primary" id="check">${ICON.check} Vérifier</button>
        <button class="btn" id="hint">${ICON.bulb} Indice</button>
        <button class="btn ghost" id="show">${ICON.eye} Solutions</button>
        <div class="score"><span id="filled">0/${e.gaps.length}</span><b id="sc" class="num">–</b></div>
      </div><div id="res" aria-live="polite"></div>`;
    const fields = $$('#cloze [data-i]', zone);
    let active = fields[0], done = false;
    $$('.clue', zone).forEach((b) => b.onclick = () => G.toast(b.title));
    const updFilled = () => { $('#filled', zone).textContent = `${fields.filter((f) => f.value.trim()).length}/${fields.length}`; };
    fields.forEach((f, idx) => {
      f.addEventListener('focus', () => (active = f));
      f.addEventListener('input', () => { f.parentElement.classList.remove('ko'); f.removeAttribute('aria-invalid'); updFilled(); if (e.wordList) markBank(); });
      f.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); check(); }
        else if (ev.key === 'Enter') { ev.preventDefault(); const n = fields.slice(idx + 1).find((x) => !st[x.dataset.i].ok) || fields.find((x) => !st[x.dataset.i].ok); if (n && n !== f) n.focus(); else check(); }
      });
      if (f.tagName === 'SELECT') f.addEventListener('change', updFilled);
    });
    function markBank() {
      const used = fields.map((f) => fold(f.value.trim())).filter(Boolean);
      $$('.wordbank span', zone).forEach((s) => s.classList.toggle('used', used.includes(fold(s.textContent))));
    }
    function score() {
      let s = 0;
      st.forEach((x) => { if (x.ok && !x.shown) s += Math.max(0, 1 - 0.25 * x.tries - 0.15 * x.hints); });
      return Math.round((s / st.length) * 100);
    }
    const reviewKey = (i) => `c:${e.id}:${i}`;
    let counted = false;
    function check() {
      if (done) return;
      if (!counted) { counted = true; S.markDay(1); }
      let wrongNow = 0;
      fields.forEach((f) => {
        const i = +f.dataset.i, x = st[i]; if (x.ok) return;
        const v = f.value.trim(); if (!v) return;
        if (G.isCorrect(v, e.gaps[i].a, e.caseSensitive)) { x.ok = true; lock(f, 'ok'); return; }
        wrongNow++;
        const p = f.parentElement; p.classList.remove('ko'); void p.offsetWidth; p.classList.add('ko'); f.setAttribute('aria-invalid', 'true');
        // une réponse inchangée n'est pas pénalisée deux fois
        if (G.normAnswer(v) !== G.normAnswer(x.last)) {
          x.tries++; x.wrong.push(v); x.last = v;
          G.review.add(reviewKey(i), { t: 'c', ex: e.id, i });
          if (x.tries >= 2 && !$('.peek-ans', p)) {
            const b = h(`<button class="peek-ans" type="button" title="Voir la réponse de cette lacune" aria-label="Voir la réponse de la lacune ${i + 1}">voir</button>`);
            b.onclick = () => revealOne(f); p.appendChild(b);
          }
        }
      });
      S.save(); G.updateBadge();
      const remaining = st.filter((x) => !x.ok).length;
      $('#sc', zone).textContent = score() + ' %';
      if (!remaining) end();
      else {
        G.toast(wrongNow ? `${plural(wrongNow, 'erreur')} · ${plural(remaining, 'lacune')} encore à trouver` : `${plural(remaining, 'lacune')} encore à remplir`);
        const n = fields.find((f) => !st[f.dataset.i].ok && (!f.value.trim() || f.getAttribute('aria-invalid'))) || fields.find((f) => !st[f.dataset.i].ok); if (n) n.focus();
      }
    }
    function revealOne(f) {
      const i = +f.dataset.i; if (st[i].ok) return;
      st[i].shown = true; st[i].ok = true; f.value = e.gaps[i].a[0];
      lock(f, 'shown'); G.review.add(reviewKey(i), { t: 'c', ex: e.id, i }); S.save();
      $('#sc', zone).textContent = score() + ' %';
      if (st.every((x) => x.ok)) end(); else { const n = fields.find((x) => !st[x.dataset.i].ok); if (n) n.focus(); }
    }
    function lock(f, cls) {
      const p = f.parentElement; p.classList.remove('ko'); p.classList.add(cls); f.removeAttribute('aria-invalid');
      f.readOnly = true; if (f.tagName === 'SELECT') f.disabled = true; f.tabIndex = -1;
      const pa = $('.peek-ans', p); if (pa) pa.remove();
      if (document.activeElement === f) f.blur();
    }
    function end() {
      done = true;
      const sc = score();
      const wrong = st.map((x, i) => (x.tries || x.hints || x.shown ? i : -1)).filter((i) => i >= 0);
      // sous chaque lacune manquée : la première réponse fausse, barrée
      st.forEach((x, i) => { if (x.wrong.length) $('#gap-' + i, zone).insertAdjacentHTML('beforeend', `<s class="was" title="Votre réponse">${esc(x.wrong[0])}</s>`); });
      finish(e, sc, wrong.map((i) => ({ key: reviewKey(i), item: { t: 'c', ex: e.id, i } })));
      $('#abar', zone).hidden = true;
      if (document.activeElement && zone.contains(document.activeElement)) document.activeElement.blur();
      $('#res', zone).replaceChildren(resultBox(sc, wrong.length, e, () => runCloze(e, zone)));
      G.updateBadge();
    }
    $('#check', zone).onclick = check;
    $('#hint', zone).onclick = () => {
      const f = active && !st[active.dataset.i].ok ? active : fields.find((x) => !st[x.dataset.i].ok);
      if (!f) return;
      const i = +f.dataset.i, ans = e.gaps[i].a[0] || '';
      if (f.tagName === 'SELECT') { f.value = ans; st[i].hints += 2; f.focus(); updFilled(); return; }
      // garde le préfixe juste, ajoute la lettre suivante (comme le bouton « Ajout » d'origine)
      let k = 0; const v = f.value; while (k < v.length && k < ans.length && G.normAnswer(v[k]) === G.normAnswer(ans[k])) k++;
      f.value = ans.slice(0, k + 1); st[i].hints++;
      f.focus(); f.setSelectionRange(f.value.length, f.value.length); updFilled();
    };
    $('#show', zone).onclick = () => {
      const btn = $('#show', zone);
      if (!btn.dataset.sure) { btn.dataset.sure = '1'; btn.innerHTML = `${ICON.eye} Confirmer : tout afficher`; setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.innerHTML = `${ICON.eye} Solutions`; } }, 3000); return; }
      fields.forEach((f) => { const i = +f.dataset.i; if (!st[i].ok) { st[i].shown = true; st[i].ok = true; if (f.value.trim() && !st[i].wrong.length) st[i].wrong.push(f.value.trim()); f.value = e.gaps[i].a.join(' / '); lock(f, 'shown'); } });
      end();
    };
    updFilled();
  }

  // ------------------------------------------------------------------ questionnaire
  function runQuiz(e, zone) {
    const st = e.questions.map(() => ({ tries: 0, ok: false }));
    zone.innerHTML = `<div class="quiz">${e.questions.map((q, qi) => {
      const kind = q.kind;
      let body;
      if (kind === 'short') body = `<div class="qinput"><input data-acc data-q="${qi}" type="text" autocomplete="off" spellcheck="false" aria-label="Réponse à la question ${qi + 1}"><button class="btn" data-qcheck="${qi}">Vérifier</button></div>`;
      else body = `<div class="qopts">${G.shuffle(q.answers.map((a, ai) => [a, ai])).map(([a, ai]) => `<button class="qopt" data-q="${qi}" data-a="${ai}">${esc(a.t)}</button>`).join('')}</div>${kind === 'multi' ? `<button class="btn small" style="margin-top:10px" data-multi="${qi}">Valider la sélection</button>` : ''}`;
      return `<div class="qcard" id="q-${qi}"><div class="qn">Question ${qi + 1} / ${e.questions.length}</div><div class="qt">${q.q}</div>${body}<div class="qfb" id="fb-${qi}"></div></div>`;
    }).join('')}</div>
    <div class="actionbar" id="abar"><span style="color:var(--muted);font-size:14px">Répondez à toutes les questions.</span><div class="score"><span id="qdone">0/${e.questions.length}</span><b id="sc" class="num">–</b></div></div><div id="res"></div>`;
    const sc = () => Math.round((st.reduce((s, x) => s + (x.ok ? Math.max(0, 1 - 0.34 * x.tries) : 0), 0) / st.length) * 100);
    const upd = () => {
      $('#qdone', zone).textContent = `${st.filter((x) => x.ok).length}/${st.length}`; $('#sc', zone).textContent = sc() + ' %';
      if (st.every((x) => x.ok)) {
        const wrong = st.map((x, i) => (x.tries ? i : -1)).filter((i) => i >= 0);
        finish(e, sc(), wrong.map((i) => ({ key: `q:${e.id}:${i}`, item: { t: 'q', ex: e.id, i } })));
        $('#abar', zone).hidden = true;
        $('#res', zone).replaceChildren(resultBox(sc(), wrong.length, e, () => runQuiz(e, zone)));
      }
    };
    const rule = (e.rules || [])[0];
    const feedback = (qi, a, wrong) => {
      const fb = $('#fb-' + qi, zone);
      fb.innerHTML = (a && a.fb ? esc(a.fb) + ' ' : '') + (wrong && rule ? `<button class="chip accent" style="border:0;cursor:pointer" data-rule>${ICON.side} Voir la règle : ${esc(G.ruleTitle(rule))}</button>` : '');
      const b = $('[data-rule]', fb); if (b) b.onclick = () => G.openDrawer('#/regle/' + rule);
    };
    const miss = (qi) => { G.review.add(`q:${e.id}:${qi}`, { t: 'q', ex: e.id, i: qi }); S.save(); G.updateBadge(); };
    zone.addEventListener('click', (ev) => {
      const b = ev.target.closest('.qopt');
      if (b) {
        const qi = +b.dataset.q, q = e.questions[qi], a = q.answers[+b.dataset.a];
        if (st[qi].ok || b.classList.contains('ko')) return;
        if (q.kind === 'multi') { b.classList.toggle('sel'); return; }
        if (a.ok) { b.classList.add('ok'); st[qi].ok = true; $$(`.qopt[data-q="${qi}"]`, zone).forEach((x) => (x.disabled = x !== b)); }
        else { b.classList.add('ko'); b.setAttribute('aria-invalid', 'true'); st[qi].tries++; miss(qi); }
        feedback(qi, a, !a.ok && st[qi].tries === 1 ? true : !a.ok); upd(); return;
      }
      const m = ev.target.closest('[data-multi]');
      if (m) {
        const qi = +m.dataset.multi, q = e.questions[qi]; if (st[qi].ok) return;
        const sel = $$(`.qopt[data-q="${qi}"]`, zone);
        const good = sel.every((x) => x.classList.contains('sel') === !!q.answers[+x.dataset.a].ok);
        if (good) { st[qi].ok = true; sel.forEach((x) => { x.classList.remove('sel'); if (q.answers[+x.dataset.a].ok) x.classList.add('ok'); x.disabled = true; }); m.remove(); }
        else { st[qi].tries++; miss(qi); feedback(qi, null, true); G.toast('Pas encore : vérifiez votre sélection.'); }
        upd(); return;
      }
      const c = ev.target.closest('[data-qcheck]'); if (c) checkShort(+c.dataset.qcheck);
    });
    zone.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.dataset.q != null && ev.target.tagName === 'INPUT') { ev.preventDefault(); checkShort(+ev.target.dataset.q); } });
    function checkShort(qi) {
      const inp = $(`input[data-q="${qi}"]`, zone); if (st[qi].ok || !inp.value.trim()) return;
      const q = e.questions[qi]; const okAns = q.answers.filter((a) => a.ok).map((a) => a.t);
      if (G.isCorrect(inp.value, okAns)) { st[qi].ok = true; inp.readOnly = true; inp.style.borderColor = 'var(--ok)'; inp.style.background = 'var(--ok-soft)'; }
      else { st[qi].tries++; miss(qi); feedback(qi, null, true); inp.parentElement.classList.remove('ko'); inp.animate([{ transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }], 250); if (st[qi].tries >= 3) { $('#fb-' + qi, zone).innerHTML = `Réponse attendue : <b>${esc(okAns[0])}</b>`; st[qi].ok = true; inp.value = okAns[0]; inp.readOnly = true; } }
      upd();
    }
  }

  // ------------------------------------------------------------------ associations (locutions), par séries de 8 paires
  function runMatch(e, zone) {
    const all = G.shuffle(e.pairs.map((p, i) => ({ a: p[0], b: p[1], i })));
    const byI = Object.fromEntries(all.map((p) => [p.i, p]));
    const ROUND = 8; const rounds = Math.ceil(all.length / ROUND);
    let round = 0, errors = 0, found = 0; const missed = new Set();
    const expl = (D.collections.find((c) => c.id === 'locutions')?.groups[0].refs || []).find((x) => (x.href || '').includes(e.id + '-explications'));
    const sc = () => Math.max(0, Math.round(100 * (1 - errors / (all.length * 2))));
    zone.innerHTML = `${expl ? `<p><button class="btn small" data-side="${esc(expl.href)}">${ICON.side} Signification des locutions</button></p>` : ''}
      <div class="ex-paper"><div class="eyebrow" id="mround" style="margin-bottom:12px"></div><div class="match" id="mgrid"></div></div>
      <div class="actionbar" id="abar"><span style="color:var(--muted);font-size:14px">Associez chaque début à sa fin.</span><div class="score"><span id="mf">0/${all.length}</span><b id="sc" class="num">–</b></div></div><div id="res" aria-live="polite"></div>`;
    const eb = $('[data-side]', zone); if (eb) eb.onclick = () => G.openDrawer(eb.dataset.side);
    let sel = null, inRound = 0;
    const drawRound = () => {
      const pairs = all.slice(round * ROUND, round * ROUND + ROUND); inRound = pairs.length; sel = null;
      $('#mround', zone).textContent = rounds > 1 ? `Série ${round + 1} / ${rounds}` : '';
      $('#mgrid', zone).innerHTML = `<div class="match-col">${G.shuffle(pairs).map((p) => `<button class="mitem start" data-col="a" data-i="${p.i}">${esc(p.a)}</button>`).join('')}</div>
        <div class="match-col">${G.shuffle(pairs).map((p) => `<button class="mitem" data-col="b" data-i="${p.i}">${esc(p.b)}</button>`).join('')}</div>`;
    };
    drawRound();
    zone.addEventListener('click', (ev) => {
      const b = ev.target.closest('.mitem'); if (!b || b.classList.contains('done')) return;
      if (!sel || sel.dataset.col === b.dataset.col) { $$('.mitem.sel', zone).forEach((x) => x.classList.remove('sel')); sel = b; b.classList.add('sel'); return; }
      const A = sel.dataset.col === 'a' ? sel : b;
      if (sel.dataset.i === b.dataset.i) {
        [sel, b].forEach((x) => { x.classList.remove('sel'); x.classList.add('done'); x.insertAdjacentHTML('afterbegin', `<span class="pair-n">${found + 1}</span>`); });
        found++; inRound--; sel = null;
        $('#mf', zone).textContent = `${found}/${all.length}`; $('#sc', zone).textContent = sc() + ' %';
        if (!inRound) {
          if (round + 1 < rounds) { round++; setTimeout(drawRound, 500); return; }
          finish(e, sc(), []);
          $('#abar', zone).hidden = true; $('#res', zone).replaceChildren(resultBox(sc(), missed.size, e, () => runMatch(e, zone)));
        }
      } else {
        if (!errors) S.markDay(1);
        errors++;
        const p = byI[+A.dataset.i];
        if (!missed.has(p.i)) { missed.add(p.i); G.review.add(G.pairKey(p.a, p.b), { t: 'p', s: p.a, e: p.b }); S.save(); G.updateBadge(); }
        b.classList.add('ko'); setTimeout(() => b.classList.remove('ko'), 350);
        $('#sc', zone).textContent = sc() + ' %';
      }
    });
  }
})();

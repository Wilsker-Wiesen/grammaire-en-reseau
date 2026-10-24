/* Jeux construits sur les exercices existants, et révision espacée. */
(function () {
  'use strict';
  const { D, S, $, $$, esc, strip, fold, plural, h, ICON } = G;

  const GAMES = [
    { id: 'sprint', title: 'Course contre la montre', desc: 'Soixante secondes, une phrase à la fois. Les bonnes réponses en série rapportent des points bonus.', ic: ICON.bolt, color: 'linear-gradient(140deg,var(--t-800),var(--t-500))' },
    { id: 'express', title: 'Locution express', desc: 'Un début d’expression, quatre fins possibles. Ou l’inverse, en mode retourné.', ic: ICON.quote, color: 'linear-gradient(140deg,#134e4a,#2f8fb8)' },
    { id: 'defi', title: 'Défi du jour', desc: 'Dix questions tirées de tout le programme, les mêmes pour tout le monde aujourd’hui. Seul le premier essai compte.', ic: ICON.cal, color: 'linear-gradient(140deg,var(--t-900),var(--t-600))' },
    { id: 'chemin', title: 'Le chemin des notions', desc: 'Reliez deux fiches en suivant leurs renvois. Lisez les extraits pour choisir la bonne direction.', ic: ICON.path, color: 'linear-gradient(140deg,#0b4f6b,var(--t-500))' },
    { id: 'memo', title: 'Mémo des locutions', desc: 'Retournez les cartes, reformez les expressions et découvrez leur sens.', ic: ICON.cards, color: 'linear-gradient(140deg,var(--t-700),var(--t-300))' },
    { id: 'revision', title: 'Révision espacée', desc: 'Vos erreurs reviennent au bon moment, jusqu’à ce qu’elles soient acquises.', ic: ICON.redo, color: 'linear-gradient(140deg,var(--t-950),var(--t-700))', href: '#/revision' },
  ];
  const GAMES_DE = {
    sprint: ['Wettlauf gegen die Zeit', 'Sechzig Sekunden, ein Satz nach dem anderen. Richtige Antworten in Serie bringen Bonuspunkte.'],
    defi: ['Tagesquiz', 'Zehn Fragen aus dem ganzen Programm, heute für alle gleich. Nur der erste Versuch zählt.'],
    chemin: ['Regelpfad', 'Verbinde zwei Regeln über ihre Querverweise. Die Auszüge helfen dir, die richtige Richtung zu finden.'],
    memo: ['Redewendungs-Memo', 'Karten aufdecken, Redewendungen zusammensetzen und ihre Bedeutung entdecken.'],
    express: ['Redewendungs-Express', 'Vier Spielarten: Ende finden, Anfang finden, Bedeutung erkennen oder die passende Redewendung zur Bedeutung wählen.'],
    revision: ['Wiederholung mit Abstand', 'Deine Fehler kommen zur richtigen Zeit zurück, bis sie sitzen.'],
  };
  GAMES.forEach((g) => { const fr = [g.title, g.desc]; Object.defineProperty(g, 'title', { get: () => G.T(fr[0], GAMES_DE[g.id][0]) }); Object.defineProperty(g, 'desc', { get: () => G.T(fr[1], GAMES_DE[g.id][1]) }); });
  const lkey = (t) => fold(t).replace(/[^a-z]/g, '');
  G.meaning = (a, b) => (G.lang === 'de' && G.DE && G.DE.meanings && G.DE.meanings[lkey(a + ' ' + b)]) || (D.meanings || {})[lkey(a + ' ' + b)] || '';
  G.pairKey = (a, b) => 'p:' + lkey(a) + '|' + lkey(b);

  function gameStatus(g) {
    if (g.id === 'revision') return `<span class="chip accent">${plural(G.review.due().length, 'item')} à revoir</span>`;
    if (g.id === 'defi') { const t = S.data.games['defi:' + G.today()]; return t != null ? `<span class="chip ok">Fait aujourd’hui : ${t} %</span>` : '<span class="chip accent">À faire aujourd’hui</span>'; }
    if (g.id === 'express') { const n = G.locMastered ? G.locMastered() : 0; return `<span class="chip ${n ? 'ok' : ''}">${G.T(`${n}/${pool().pairs.length} maîtrisées`, `${n}/${pool().pairs.length} sicher`)}</span>`; }
    if (g.id === 'sprint') { const b = S.data.games['sprint:']; return b != null ? `<span class="chip">Record (tout le programme) : ${b}</span>` : '<span class="chip">Jouer</span>'; }
    const best = S.data.games[g.id];
    return best != null ? `<span class="chip">Record : ${best}${g.id === 'memo' ? ' coups' : ''}</span>` : '<span class="chip">Jouer</span>';
  }
  G.gameCards = (n) => GAMES.slice(0, n || GAMES.length).map((g) => `<a class="card" href="${g.href || '#/jeu/' + g.id}"><span class="gic" style="background:${g.color}">${g.ic}</span><h3>${g.title}</h3><p>${g.desc}</p><div class="meta">${gameStatus(g)}</div></a>`).join('');

  G.views.jeux = () => h(`<div class="page"><div class="page-head"><div class="eyebrow">Jeux &amp; défis</div><h1>Jouer avec la grammaire</h1>
    <p class="lead">${G.T('Tous les jeux puisent dans les exercices et les locutions du programme. Les erreurs rejoignent votre pile de révision.', 'Alle Spiele nutzen die Übungen und Redewendungen des Programms. Fehler kommen in deinen Wiederholungsstapel.')}</p></div>
    <div class="grid game-cards">${G.gameCards()}</div></div>`);

  // ------------------------------------------------------------------ réserve de questions
  // Seules les lacunes compréhensibles hors de leur exercice entrent dans les jeux (G.fitsAlone, exercise.js).
  const GAME_SKIP = /^encul/; // locution grossière : gardée dans l'exercice, pas dans les jeux
  let POOL = null;
  function pool() {
    if (POOL) return POOL;
    POOL = { gaps: [], quiz: [], pairs: [] };
    for (const e of Object.values(D.exercises)) {
      if (e.type === 'cloze') e.gaps.forEach((g, i) => { if (G.fitsAlone(e, i)) POOL.gaps.push({ t: 'c', ex: e.id, i, cat: e.cat || '' }); });
      else if (e.type === 'quiz') e.questions.forEach((q, i) => { if (q.kind === 'mc' && q.answers.some((a) => a.ok) && strip(q.q)) POOL.quiz.push({ t: 'q', ex: e.id, i }); });
      else if (e.type === 'match') e.pairs.forEach((p) => { if (!GAME_SKIP.test(lkey(p[0])) && !POOL.pairs.some((x) => lkey(x[0]) === lkey(p[0]) && lkey(x[1]) === lkey(p[1]))) POOL.pairs.push(p); });
    }
    return POOL;
  }
  G.pool = pool;

  // ------------------------------------------------------------------ carte-question réutilisable
  /** Affiche un item dans host. onDone(ok, firstTry, skipped) est appelé une fois la réponse trouvée ou donnée.
      opts.onReveal() : la bonne réponse est affichée et le jeu attend l'apprenant (pour suspendre un chronomètre). */
  function askItem(host, item, onDone, opts = {}) {
    if (item.t === 'p') return askPair(host, item, onDone, opts);
    const e = G.ex(item.ex);
    if (!e) { onDone(true, true); return; }
    const rule = (e.rules || [])[0];
    const head = `<div class="consigne">${esc(G.exTitle(e))}</div>`;
    const src = `<div class="src">${G.T('Tiré de', 'Aus der Übung')} <a href="#/exercice/${e.id}">${G.T('', '„')}${esc(G.exTitle(e))}${G.T('', '“')}</a>${rule ? ` · <button class="linkish" data-sidehref="#/regle/${rule}">${ICON.side} ${esc(G.ruleTitle(rule))}</button>` : ''}</div>`;
    let over = false;
    const finishWith = (ok, first, delay) => { over = true; setTimeout(() => onDone(ok, first), delay); };
    if (item.t === 'c' && !G.fitsAlone(e, item.i)) {
      // lacune liée à un tableau ou à une consigne particulière : on la refait dans son exercice
      host.innerHTML = `<div class="flash-card">${head}<p style="font:18px/1.55 var(--f-read);margin:0 0 14px">${G.T('Cette lacune dépend de son exercice (tableau, mot souligné ou consigne). Refaites-la dans son contexte, puis revenez.', 'Diese Lücke hängt an ihrer Übung (Tabelle, unterstrichenes Wort oder Anweisung). Mach sie dort noch einmal und komm dann zurück.')}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="#/exercice/${e.id}">${ICON.open} Ouvrir l’exercice</a><button class="btn" id="did">C’est fait, je l’ai réussie</button><button class="btn ghost" id="notyet">Pas encore</button></div>${src}</div>`;
      $('#did', host).onclick = () => onDone(true, true);
      $('#notyet', host).onclick = () => onDone(false, false, true);
      $$('[data-sidehref]', host).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); G.openDrawer(a.dataset.sidehref); });
      return;
    }
    if (item.t === 'c') {
      const c = G.gapContext(e, item.i);
      if (!c) { onDone(true, true); return; }
      const field = c.opts ? `<select id="fa" aria-label="Réponse"><option value=""></option>${c.opts.map((o) => `<option>${esc(o)}</option>`).join('')}</select>` : `<input id="fa" data-acc type="text" autocomplete="off" spellcheck="false" aria-label="Réponse">`;
      host.innerHTML = `<div class="flash-card" id="fc">${head}${c.prev && (c.needPrev || opts.wide) ? `<div class="ctx-prev">${c.prev}</div>` : ''}<div class="ctx">${c.before} ${field} ${c.after}</div>
        <div class="reveal" id="rv" aria-live="polite"></div>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center"><button class="btn primary" id="ok">${ICON.check} Valider</button>${opts.skip ? `<button class="btn ghost" id="sk">Passer ${opts.skipCost ? `<span class="num" style="color:var(--muted)">−${opts.skipCost} s</span>` : ''}</button>` : ''}${c.clue ? `<span class="chip">Indice : ${esc(c.clue)}</span>` : ''}</div>${src}</div>`;
      const inp = $('#fa', host), fc = $('#fc', host);
      if (inp.tagName === 'INPUT') inp.style.width = Math.max(7, Math.min(24, Math.max(...c.answers.map((a) => a.length)) + 3)) + 'ch';
      let tries = 0;
      const submit = () => {
        if (over) return;
        if (fc.dataset.wait) { over = true; onDone(false, false); return; }
        if (!inp.value.trim()) return;
        if (G.isCorrect(inp.value, c.answers, e.caseSensitive)) { fc.classList.add('good'); $('#rv', host).innerHTML = tries ? 'Juste.' : '<b>Juste !</b>'; finishWith(true, tries === 0, opts.fast ? 350 : 650); }
        else {
          tries++; fc.classList.remove('bad'); void fc.offsetWidth; fc.classList.add('bad'); inp.setAttribute('aria-invalid', 'true');
          if (tries >= (opts.maxTries || 2)) {
            fc.dataset.wait = '1'; inp.readOnly = true; if (inp.tagName === 'SELECT') inp.disabled = true;
            $('#rv', host).innerHTML = `Votre réponse : <s>${esc(inp.value)}</s> · attendu : <b>${esc(c.answers.join(' / '))}</b>`;
            $('#ok', host).innerHTML = `${ICON.arrow} Continuer`; $('#ok', host).focus();
            opts.onReveal && opts.onReveal();
          } else $('#rv', host).innerHTML = '<span style="color:var(--ko)">Pas tout à fait. Encore un essai.</span>';
        }
      };
      inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
      $('#ok', host).onclick = submit;
      if (opts.skip) $('#sk', host).onclick = () => { if (!over) { over = true; onDone(false, false, true); } };
      setTimeout(() => inp.focus(), 30);
    } else if (item.t === 'q') {
      const q = e.questions[item.i];
      host.innerHTML = `<div class="flash-card" id="fc">${head}<div class="ctx" style="font-size:20px;line-height:1.5">${q.q}</div><div class="qopts" style="margin-top:16px">${G.shuffle(q.answers.map((a, ai) => [a, ai])).map(([a, ai]) => `<button class="qopt" data-a="${ai}">${esc(a.t)}</button>`).join('')}</div><div class="reveal" id="rv" aria-live="polite"></div>${src}</div>`;
      let tries = 0;
      $$('.qopt', host).forEach((b) => b.onclick = () => {
        if (over) return;
        over = true;
        const a = q.answers[+b.dataset.a];
        $$('.qopt', host).forEach((x) => { x.disabled = true; if (q.answers[+x.dataset.a].ok) x.classList.add('ok'); });
        if (a.ok) { finishWith(true, true, 650); return; }
        b.classList.add('ko');
        $('#rv', host).innerHTML = `<span class="loc-no">${G.T('Dommage. La bonne réponse est en vert.', 'Leider nicht. Die richtige Antwort ist grün markiert.')}</span><div style="margin-top:12px"><button class="btn primary" id="qnext">${ICON.arrow} ${G.T('Continuer', 'Weiter')}</button></div>`;
        $('#qnext', host).onclick = () => onDone(false, false); $('#qnext', host).focus();
      });
    }
    $$('[data-sidehref]', host).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); G.openDrawer(a.dataset.sidehref); });
  }
  G.askItem = askItem;

  // ------------------------------------------------------------------ Redewendungen : Aussprache, Lernstand, Frage
  // Aussprache über die Sprachausgabe des Browsers (französische Stimme, falls vorhanden)
  G.speak = function (text) {
    try {
      const u = new SpeechSynthesisUtterance(text); u.lang = 'fr-FR'; u.rate = 0.92;
      const v = speechSynthesis.getVoices().find((x) => /^fr/i.test(x.lang)); if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* keine Sprachausgabe */ }
  };
  const canSpeak = () => 'speechSynthesis' in window;
  // Lernstand je Redewendung : n = gesehen, ok = Serie richtiger Antworten, last = letzter Kontakt (Datum)
  const pk = (p) => G.pairKey(p[0], p[1]);
  const peekStat = (p) => (S.data.loc || {})[pk(p)] || { n: 0, ok: 0, last: '' };
  const writeStat = (p, ok, soft) => {
    const loc = (S.data.loc = S.data.loc || {}); const st = loc[pk(p)] || { n: 0, ok: 0, last: '' };
    st.n++; if (!soft) st.ok = ok ? st.ok + 1 : 0; st.last = G.today(); loc[pk(p)] = st; return st;
  };
  G.locSeen = (p) => writeStat(p, false, true);
  const mastered = (p) => peekStat(p).ok >= 2;
  G.locMastered = () => pool().pairs.filter(mastered).length;
  // kurze Bedeutung fürs Spiel : erster Teil, ohne Klammern und ohne Zitate, die die Lösung verraten
  G.meaningShort = function (a, b) {
    let m = G.meaning(a, b).split(' / ')[0];
    const words = fold(a + ' ' + b).split(/[^a-z]+/).filter((w) => w.length > 3);
    m = m.replace(/\s*\([^)]*\)/g, (x) => (words.some((w) => fold(x).includes(w)) ? '' : x));
    m = m.replace(/\s*[„«"][^“»"]*[“»"]/g, (x) => (words.some((w) => fold(x).includes(w)) ? '' : x));
    if (m.length > 150) { const k = m.slice(0, 150).lastIndexOf(','); m = (k > 60 ? m.slice(0, k) : m.slice(0, 147)) + ' …'; }
    return m.trim().replace(/[:;,]$/, '');
  };

  /** Eine Frage zu einer Redewendung. opts.mode : 'end' (Ende finden), 'start' (Anfang finden),
      'meaning' (Bedeutung erkennen), 'expr' (Redewendung zur Bedeutung finden). */
  function askPair(host, item, onDone, opts = {}) {
    const all = pool().pairs;
    let mode = opts.mode || (opts.reverse ? 'start' : 'end');
    if (mode === 'start' && item.s.trim().split(/\s+/).length < 2) mode = 'end'; // ein einzelnes Wort als Anfang wäre zu leicht
    const full = `${item.s} ${item.e}`; const m = G.meaning(item.s, item.e), ms = G.meaningShort(item.s, item.e);
    const others = all.filter((p) => lkey(p[0]) !== lkey(item.s));
    const label = { end: (p) => p[1], start: (p) => p[0], meaning: (p) => G.meaningShort(p[0], p[1]), expr: (p) => `${p[0]} ${p[1]}` }[mode];
    const right = label([item.s, item.e]);
    const near = others.filter((p) => label(p) && lkey(label(p)) !== lkey(right)).sort((a, b) => Math.abs(label(a).length - right.length) - Math.abs(label(b).length - right.length));
    const choices = G.shuffle([[item.s, item.e], ...G.shuffle(near.slice(0, 9)).slice(0, 3)]);
    const q = { end: `${esc(item.s)} <span class="dim">…</span>`, start: `<span class="dim">…</span> ${esc(item.e)}`, meaning: `« ${esc(full)} »`, expr: esc(ms) }[mode];
    const ask = { end: G.T('Comment se termine cette expression ?', 'Wie endet diese Redewendung?'), start: G.T('Quel est le début de cette expression ?', 'Wie beginnt diese Redewendung?'),
      meaning: G.T('Que signifie cette expression ?', 'Was bedeutet diese Redewendung?'), expr: G.T('Quelle expression a ce sens ?', 'Welche Redewendung hat diese Bedeutung?') }[mode];
    host.innerHTML = `<div class="flash-card loc-card"><div class="consigne">${ask}</div>
      <div class="ctx loc-q ${mode === 'expr' ? 'is-meaning' : ''}">${q}${mode !== 'expr' && canSpeak() ? ` <button class="icon-btn speak" type="button" data-say="${esc(mode === 'meaning' ? full : mode === 'start' ? item.e : item.s)}" title="${G.T('Écouter', 'Anhören')}" aria-label="${G.T('Écouter', 'Anhören')}">${ICON.sound}</button>` : ''}</div>
      <div class="qopts loc-opts ${mode === 'meaning' || mode === 'expr' ? 'long' : ''}">${choices.map((p, k) => `<button class="qopt" data-k="${k}"><span class="key">${k + 1}</span><span>${esc(label(p))}</span></button>`).join('')}</div>
      <div class="reveal" id="rv" aria-live="polite"></div>
      <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap" id="nx" hidden><button class="btn primary" data-next>${ICON.arrow} ${G.T('Continuer', 'Weiter')} <kbd class="hide-touch">Enter</kbd></button>${canSpeak() ? `<button class="btn" type="button" data-say="${esc(full)}">${ICON.sound} ${G.T('Écouter', 'Anhören')}</button>` : ''}</div></div>`;
    let over = false, timer = 0;
    const done = (ok) => { cleanup(); clearTimeout(timer); onDone(ok, ok); };
    const choose = (b) => {
      if (over || !b) return;
      over = true;
      const picked = choices[+b.dataset.k]; const ok = lkey(label(picked)) === lkey(right);
      const rightBtn = $$('.qopt', host).find((x) => lkey(label(choices[+x.dataset.k])) === lkey(right));
      $$('.qopt', host).forEach((x) => (x.disabled = true));
      rightBtn.classList.add('ok'); if (!ok) b.classList.add('ko');
      writeStat([item.s, item.e], ok);
      const wrongInfo = !ok ? `<div class="loc-wrong">${G.T('Votre choix', 'Deine Wahl')} : <span lang="fr">« ${esc(picked[0])} ${esc(picked[1])} »</span> – ${esc(G.meaningShort(picked[0], picked[1]))}</div>` : '';
      $('#rv', host).innerHTML = `${ok ? '' : `<span class="loc-no">${G.T('Dommage. La bonne réponse :', 'Leider nicht. Richtig ist:')}</span><br>`}<b lang="fr">« ${esc(full)} »</b><br><span style="color:var(--ink-2)">${m ? esc(m) : G.T('Signification non donnée dans le programme.', 'Bedeutung im Programm nicht angegeben.')}</span>${wrongInfo}`;
      const nx = $('#nx', host); nx.hidden = false; $('[data-next]', nx).focus({ preventScroll: true });
      $('[data-next]', nx).onclick = () => done(ok);
      // richtige Antwort : nach kurzer Pause automatisch weiter (Express)
      if (ok && opts.auto !== false) timer = setTimeout(() => { if (host.isConnected) done(true); }, 1400);
    };
    $$('.qopt', host).forEach((b) => b.onclick = () => choose(b));
    $$('[data-say]', host).forEach((b) => b.onclick = () => { clearTimeout(timer); G.speak(b.dataset.say); });
    const onKey = (ev) => {
      if (!host.isConnected) return cleanup();
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.target.closest && ev.target.closest('input, textarea, select, [contenteditable]')) return;
      if (!$('#palette').hidden || !$('#drawer').hidden) return;
      if (/^[1-4]$/.test(ev.key) && !over) { ev.preventDefault(); choose($(`.qopt[data-k="${+ev.key - 1}"]`, host)); }
      else if (ev.key === 'Enter' && over) { ev.preventDefault(); done($$('.qopt.ko', host).length === 0); }
    };
    const cleanup = () => document.removeEventListener('keydown', onKey);
    document.addEventListener('keydown', onKey);
  }

  function stage(title) {
    return h(`<div class="page"><div class="stage"><div class="crumbs" style="margin-bottom:10px"><a href="#/jeux">Jeux</a></div><h1 style="font:800 clamp(26px,3.6vw,38px)/1.1 var(--f-display);margin:0 0 18px">${title}</h1><div id="st"></div></div></div>`);
  }
  function summary(host, { big, label, text, again, items, extra, againLabel, extraButtons, after }) {
    host.innerHTML = `<div class="flash-card" style="text-align:center"><div class="eyebrow">${label}</div><div class="big-num">${big}</div><p style="font:18px/1.5 var(--f-read);margin:0 auto 18px;max-width:46ch">${text}</p>
      ${extra || ''}<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${extraButtons || ''}<button class="btn ${extraButtons ? '' : 'primary'}" id="again">${ICON.redo} ${againLabel || G.T('Rejouer', 'Nochmal spielen')}</button><a class="btn" href="#/jeux">${G.T('Autres jeux', 'Andere Spiele')}</a>${G.review.due().length ? `<a class="btn" href="#/revision">${G.T('À revoir', 'Wiederholen')} (${G.review.due().length})</a>` : ''}</div></div>
      ${after || ''}
      ${items && items.filter((x) => x.ex).length ? `<div class="section-title"><h2>${G.T('À retravailler', 'Nacharbeiten')}</h2></div><div class="ex-rows">${[...new Set(items.filter((x) => x.ex).map((x) => x.ex))].map((id) => G.exRow(id)).join('')}</div>` : ''}`;
    $('#again', host).onclick = again;
  }
  const keyOf = (it) => it.t === 'p' ? G.pairKey(it.s, it.e) : `${it.t}:${it.ex}:${it.i}`;

  // ------------------------------------------------------------------ jeux
  G.views.jeu = function (rt) {
    const fn = { sprint, defi, memo, express, chemin }[rt.parts[1]];
    return fn ? fn(rt) : G.views.notfound(rt);
  };

  function sprint() {
    const g = GAMES.find((x) => x.id === 'sprint'); const el = stage(g.title); const host = $('#st', el);
    const cats = [...new Set(pool().gaps.map((x) => x.cat).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    const count = (c) => pool().gaps.filter((x) => !c || x.cat === c).length;
    const rec = (c) => S.data.games['sprint:' + c];
    const intro = (cat = S.data.prefs.sprintCat || '') => {
      host.innerHTML = `<div class="flash-card"><p style="font:18px/1.55 var(--f-read);margin:0 0 12px">${g.desc}</p>
        <ul style="margin:0 0 16px;padding-left:1.2em;color:var(--ink-2);line-height:1.6">${G.T('<li>Bonne réponse du premier coup : 1 point, +1 bonus tous les 5 d’affilée.</li><li>Erreur : −3 secondes. Passer : −2 secondes.</li><li>Le chronomètre s’arrête pendant que la correction s’affiche.</li>', '<li>Richtig beim ersten Versuch: 1 Punkt, +1 Bonus alle 5 in Folge.</li><li>Fehler: −3 Sekunden. Überspringen: −2 Sekunden.</li><li>Die Uhr steht, solange die Korrektur angezeigt wird.</li>')}</ul>
        <label style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:18px"><span class="eyebrow">Notion</span><select id="cat" style="height:40px;border-radius:10px;border:1px solid var(--line-2);background:var(--bg);padding:0 10px;max-width:100%"><option value="">Tout le programme (${count('')} phrases)</option>${cats.map((c) => `<option ${c === cat ? 'selected' : ''} value="${esc(c)}">${esc(G.tx(c))} (${count(c)})</option>`).join('')}</select></label>
        <button class="btn primary" id="go">${ICON.play} Commencer</button> <span class="chip" id="rec" style="margin-left:8px"></span></div>`;
      const sel = $('#cat', host); const showRec = () => { const r = rec(sel.value); $('#rec', host).textContent = r != null ? 'Record ici : ' + r : 'Pas encore de record ici'; };
      sel.onchange = showRec; showRec();
      $('#go', host).onclick = () => { S.data.prefs.sprintCat = sel.value; run(sel.value); };
    };
    const run = (cat) => {
      const items = G.shuffle(pool().gaps.filter((x) => !cat || x.cat === cat));
      let t = 60, pts = 0, k = 0, combo = 0, best = 0, paused = false; const missed = [];
      host.innerHTML = `<div class="stage-top"><span class="timer" id="tm" aria-live="off">60</span><div class="stat"><span>Points</span><b id="pt">0</b></div><div class="stat"><span>Série</span><b id="cb">0</b></div><span class="grow"></span><button class="btn small ghost" id="stop">Arrêter</button></div><div id="q"></div>`;
      const tick = setInterval(() => { if (paused) return; t--; const tm = $('#tm', host); if (!tm) return clearInterval(tick); tm.textContent = Math.max(0, t); if (t <= 0) end(false); }, 1000);
      G.cleanup = () => clearInterval(tick);
      const nextQ = () => {
        if (t <= 0) return;
        paused = false;
        const it = items[k++ % items.length];
        askItem($('#q', host), it, (ok, first, skipped) => {
          if (ok && first) { combo++; best = Math.max(best, combo); pts += 1 + (combo % 5 === 0 ? 1 : 0); if (combo % 5 === 0) G.toast(`Série de ${combo} : +1 bonus`); }
          else { combo = 0; missed.push(it); t = Math.max(1, t - (skipped ? 2 : 3)); }
          $('#pt', host).textContent = pts; $('#cb', host).textContent = combo; $('#tm', host).textContent = t;
          nextQ();
        }, { skip: true, skipCost: 2, fast: true, maxTries: 1, onReveal: () => { paused = true; } });
      };
      function end(stopped) {
        clearInterval(tick); G.cleanup = null;
        if (stopped && k <= 1 && !pts && !missed.length) { G.refresh(); return; }
        missed.forEach((it) => G.review.add(keyOf(it), it));
        const key = 'sprint:' + cat; const isRec = !stopped && pts > (S.data.games[key] || 0);
        if (!stopped) S.data.games[key] = Math.max(S.data.games[key] || 0, pts);
        S.markDay(1); S.save(); G.updateBadge();
        summary(host, { big: pts, label: stopped ? 'Partie arrêtée' : isRec ? 'Nouveau record !' : 'Temps écoulé', text: G.T(`${plural(pts, 'point')}, meilleure série : ${best}.${missed.length ? ` ${plural(missed.length, 'phrase')} ${missed.length > 1 ? 'rejoignent' : 'rejoint'} la révision.` : ''}${stopped ? ' Une partie arrêtée ne compte pas pour le record.' : ''}`, `${plural(pts, 'point')}, längste Serie: ${best}.${missed.length ? ` ${plural(missed.length, 'phrase')} ${missed.length > 1 ? 'kommen' : 'kommt'} in die Wiederholung.` : ''}${stopped ? ' Ein beendetes Spiel zählt nicht für den Rekord.' : ''}`), again: () => intro(cat), items: missed });
      }
      $('#stop', host).onclick = () => end(true);
      nextQ();
    };
    intro();
    return el;
  }

  function defi() {
    const g = GAMES.find((x) => x.id === 'defi'); const el = stage(g.title); const host = $('#st', el);
    const day = G.today(); const r = G.rng(G.hashStr('defi' + day));
    const P = pool();
    const order = G.shuffle([...G.shuffle(P.gaps, r).slice(0, 8), ...G.shuffle(P.quiz, r).slice(0, 2)], r);
    // une partie officielle abandonnée compte : les questions non faites sont fausses
    const run = S.data.games['defi-run:' + day];
    if (run && S.data.games['defi:' + day] == null) { S.data.games['defi:' + day] = Math.round((run.good / 10) * 100); delete S.data.games['defi-run:' + day]; S.save(); }
    const official = S.data.games['defi:' + day];
    const yesterday = S.data.games['defi:' + G.addDays(-1)];
    const start = (practice) => {
      let k = 0, good = 0; const missed = [];
      host.innerHTML = `<div class="stage-top"><div class="stat"><span>Question</span><b id="qk">1/10</b></div><div class="stat"><span>Justes</span><b id="gd">0</b></div>${practice ? '<span class="chip">Entraînement</span>' : ''}<span class="grow"></span><div class="bar" style="width:160px"><i id="pb" style="width:0%"></i></div></div><div id="q"></div>`;
      if (!practice) { S.data.games['defi-run:' + day] = { good: 0 }; S.save(); }
      const step = () => {
        if (k >= order.length) {
          const pct = Math.round((good / order.length) * 100);
          if (!practice) { S.data.games['defi:' + day] = pct; S.data.games.defi = Math.max(S.data.games.defi || 0, good); delete S.data.games['defi-run:' + day]; }
          missed.forEach((it) => G.review.add(keyOf(it), it)); S.markDay(1); S.save(); G.updateBadge();
          return summary(host, { big: good + '/10', label: G.T((practice ? 'Entraînement · ' : '') + 'Défi du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }), (practice ? 'Training · ' : '') + 'Tagesquiz vom ' + new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })), text: good === 10 ? G.T('Sans faute. Revenez demain pour un nouveau défi.', 'Fehlerfrei. Morgen gibt es ein neues Tagesquiz.') : G.T('Les questions manquées sont dans votre révision. Nouveau défi demain.', 'Verpasste Fragen liegen jetzt in deiner Wiederholung. Morgen gibt es ein neues Tagesquiz.'), again: () => start(true), againLabel: 'S’entraîner sur ce défi', items: missed });
        }
        $('#qk', host).textContent = `${k + 1}/10`; $('#pb', host).style.width = (k / 10) * 100 + '%';
        const it = order[k];
        askItem($('#q', host), it, (ok, first) => {
          if (ok && first) { good++; $('#gd', host).textContent = good; } else missed.push(it);
          if (!practice) { S.data.games['defi-run:' + day] = { good }; S.save(); }
          k++; step();
        });
      };
      step();
    };
    if (official != null) {
      host.innerHTML = `<div class="flash-card"><p style="font:18px/1.5 var(--f-read);margin:0 0 14px">${G.T(`Défi d’aujourd’hui relevé : <b>${official} %</b>${yesterday != null ? ` (hier : ${yesterday} %)` : ''}. Vous pouvez le refaire pour vous entraîner ; seul le premier essai compte.`, `Tagesquiz für heute erledigt: <b>${official} %</b>${yesterday != null ? ` (gestern: ${yesterday} %)` : ''}. Du kannst es zum Üben noch einmal spielen – gewertet wird nur der erste Durchgang.`)}</p><button class="btn primary" id="go">${ICON.redo} S’entraîner sur ce défi</button></div>`;
      $('#go', host).onclick = () => start(true);
    } else {
      host.innerHTML = `<div class="flash-card"><p style="font:18px/1.5 var(--f-read);margin:0 0 14px">${G.T(`Dix questions, sans limite de temps. Seul le premier essai compte pour votre score du jour. Si vous quittez le défi, les questions restantes comptent comme fausses.${yesterday != null ? ` Hier : <b>${yesterday} %</b>.` : ''}`, `Zehn Fragen, ohne Zeitlimit. Nur der erste Versuch zählt für dein Tagesergebnis. Wenn du das Quiz verlässt, zählen offene Fragen als falsch.${yesterday != null ? ` Gestern: <b>${yesterday} %</b>.` : ''}`)}</p><button class="btn primary" id="go">${ICON.play} Relever le défi</button></div>`;
      $('#go', host).onclick = () => start(false);
    }
    return el;
  }

  function memo() {
    const g = GAMES.find((x) => x.id === 'memo'); const el = stage(g.title); const host = $('#st', el);
    const play = () => {
      const pairs = G.shuffle(pool().pairs).slice(0, 8);
      const cards = G.shuffle(pairs.flatMap((p, i) => [{ i, t: p[0], side: 'début' }, { i, t: p[1], side: 'fin' }]));
      let open = [], found = 0, moves = 0; const learned = [];
      host.innerHTML = `<div class="stage-top"><div class="stat"><span>Paires</span><b id="fd">0/8</b></div><div class="stat"><span>Coups</span><b id="mv">0</b></div></div>
        <div class="memo">${cards.map((c, k) => `<button data-k="${k}" class="${c.side === 'début' ? 'is-start' : 'is-end'}" aria-label="${G.T(`Carte ${k + 1}, ${c.side} d’expression, face cachée`, `Karte ${k + 1}, ${c.side === 'début' ? 'Anfang' : 'Ende'}, verdeckt`)}"><small>${c.side === 'début' ? G.T('début', 'Anfang') : G.T('fin', 'Ende')}</small><span></span></button>`).join('')}</div>
        <div class="memo-meaning" id="mm" aria-live="polite"></div>`;
      const face = (b, up) => { const c = cards[+b.dataset.k]; $('span', b).textContent = up ? c.t : ''; b.setAttribute('aria-label', up ? `${c.side === 'début' ? G.T('début', 'Anfang') : G.T('fin', 'Ende')} : ${c.t}` : G.T(`Carte ${+b.dataset.k + 1}, ${c.side} d’expression, face cachée`, `Karte ${+b.dataset.k + 1}, ${c.side === 'début' ? 'Anfang' : 'Ende'}, verdeckt`)); };
      $$('.memo button', host).forEach((b) => b.onclick = () => {
        if (b.classList.contains('up') || b.classList.contains('found') || open.length === 2) return;
        if (open.length === 1 && cards[+open[0].dataset.k].side === cards[+b.dataset.k].side) { G.toast(G.T(`Choisissez maintenant une carte « ${cards[+open[0].dataset.k].side === 'début' ? 'fin' : 'début'} ».`, `Wähle jetzt eine „${cards[+open[0].dataset.k].side === 'début' ? 'Ende' : 'Anfang'}“-Karte.`)); return; }
        b.classList.add('up'); face(b, true); open.push(b);
        if (open.length < 2) return;
        moves++; $('#mv', host).textContent = moves;
        const [x, y] = open; const cx = cards[+x.dataset.k], cy = cards[+y.dataset.k];
        const st = cx.side === 'début' ? cx : cy, en = cx.side === 'début' ? cy : cx;
        // valide si le texte forme une locution connue (deux fins identiques possibles)
        const valid = cx.side !== cy.side && pool().pairs.some((p) => lkey(p[0]) === lkey(st.t) && lkey(p[1]) === lkey(en.t));
        if (valid) {
          setTimeout(() => {
            x.classList.add('found'); y.classList.add('found'); open = []; found++; $('#fd', host).textContent = `${found}/8`;
            const m = G.meaning(st.t, en.t); learned.push([st.t, en.t, m]); G.locSeen([st.t, en.t]);
            $('#mm', host).innerHTML = `<b>« ${esc(st.t)} ${esc(en.t)} »</b>${m ? ` : ${esc(m)}` : ''}`;
            if (found === 8) {
              const best = S.data.games.memo; if (best == null || moves < best) S.data.games.memo = moves; S.markDay(1); S.save();
              setTimeout(() => summary(host, { big: moves, label: G.T('coups', 'Züge'), text: G.T(`Toutes les locutions sont reformées${best == null || moves < best ? ' : nouveau record' : ''}.`, `Alle Wendungen sind zusammengesetzt${best == null || moves < best ? ': neuer Rekord' : ''}.`), again: play,
                extra: `<div style="text-align:left;margin:0 0 18px"><ul class="linklist">${learned.map(([a, b, m]) => `<li style="padding:6px 0;border-top:1px solid var(--line)"><b>${esc(a)} ${esc(b)}</b>${m ? `<br><span style="color:var(--ink-2);font-size:14px">${esc(m)}</span>` : ''}</li>`).join('')}</ul></div>` }), 700);
            }
          }, 300);
        } else {
          setTimeout(() => { x.classList.add('miss'); y.classList.add('miss'); setTimeout(() => { [x, y].forEach((z) => { z.classList.remove('up', 'miss'); face(z, false); }); open = []; }, 450); }, 650);
        }
      });
    };
    play();
    return el;
  }

  function express() {
    const g = GAMES.find((x) => x.id === 'express'); const el = stage(g.title); const host = $('#st', el);
    const MODES = [
      ['end', G.T('Trouver la fin', 'Ende finden'), 'Joindre … → les deux bouts'],
      ['start', G.T('Trouver le début', 'Anfang finden'), '… les deux bouts → Joindre'],
      ['meaning', G.T('Comprendre le sens', 'Bedeutung erkennen'), G.T('expression → sens', 'Redewendung → Bedeutung')],
      ['expr', G.T('Du sens à l’expression', 'Von der Bedeutung zur Redewendung'), G.T('sens → expression', 'Bedeutung → Redewendung')],
    ];
    const total = pool().pairs.length;
    const daysAgo = (d) => (d ? Math.round((new Date(G.today()) - new Date(d)) / 864e5) : 999);
    // Runde : etwa 50 % in Arbeit, 30 % neu, 20 % sichere Redewendungen, die wieder fällig sind (≥ 3 Tage)
    const choosePairs = (n) => {
      const P = G.shuffle(pool().pairs);
      const working = P.filter((p) => { const s = peekStat(p); return s.n > 0 && s.ok < 2; }).sort((a, b) => peekStat(a).last.localeCompare(peekStat(b).last));
      const fresh = P.filter((p) => peekStat(p).n === 0);
      const due = P.filter((p) => mastered(p) && daysAgo(peekStat(p).last) >= 3);
      const rest = P.filter((p) => mastered(p) && daysAgo(peekStat(p).last) < 3);
      const out = [...working.slice(0, Math.ceil(n * 0.5)), ...fresh.slice(0, Math.ceil(n * 0.3)), ...due.slice(0, Math.ceil(n * 0.2))];
      for (const p of [...working, ...fresh, ...due, ...rest]) { if (out.length >= n) break; if (!out.includes(p)) out.push(p); }
      return G.shuffle(out.slice(0, n));
    };
    const recKey = (mode, len) => `express:${mode}:${len}`;
    const menu = () => {
      const prefs = S.data.prefs; const mode = prefs.exMode || 'end', len = Math.min(prefs.exLen || 12, total);
      const rec = S.data.games[recKey(mode, len)];
      host.innerHTML = `<div class="flash-card">
        <div class="loc-progress"><span class="ring ${G.locMastered() === total ? 'ok' : ''}" style="--p:${(G.locMastered() / total) * 100}" data-v="${G.locMastered()}"></span>
          <span><b>${G.T(`${G.locMastered()} expressions sur ${total} maîtrisées`, `${G.locMastered()} von ${total} Redewendungen sicher`)}</b><br><span style="color:var(--muted);font-size:14px">${G.T('Maîtrisée après deux bonnes réponses de suite ; elle revient ensuite pour vérification après quelques jours.', 'Sicher nach zwei richtigen Antworten in Folge; nach ein paar Tagen kommt sie zur Kontrolle wieder.')}</span></span></div>
        <div class="eyebrow" style="margin:20px 0 8px">${G.T('Variante', 'Spielart')}</div>
        <div class="mode-grid" id="modes">${MODES.map(([k, l, ex]) => `<button data-m="${k}" class="mode-tile ${mode === k ? 'on' : ''}"><b>${l}</b><span lang="fr">${esc(ex)}</span></button>`).join('')}<button data-m="mix" class="mode-tile wide ${mode === 'mix' ? 'on' : ''}"><b>${G.T('Mélange', 'Gemischt')}</b><span>${G.T('les quatre variantes en alternance', 'alle vier Spielarten abwechselnd')}</span></button></div>
        <div class="eyebrow" style="margin:16px 0 8px">${G.T('Nombre de questions', 'Anzahl der Fragen')}</div>
        <div class="seg" id="lens">${[12, 20, total].map((n) => `<button data-n="${n}" class="${len === n ? 'on' : ''}">${n === total ? G.T('Toutes', 'Alle') + ` (${n})` : n}</button>`).join('')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px"><button class="btn primary" id="go">${ICON.play} ${G.T('Jouer', 'Spielen')}</button><button class="btn" id="cards">${ICON.cards} ${G.T('Cartes d’apprentissage', 'Lernkarten')}</button><button class="btn ghost" id="list">${G.T('Voir toutes les expressions', 'Alle Redewendungen ansehen')}</button></div>
        ${rec != null ? `<p style="margin:14px 0 0;color:var(--muted);font-size:14px">${G.T(`Record pour cette variante et ce nombre de questions : ${rec}`, `Rekord für diese Spielart und Länge: ${rec}`)}</p>` : ''}</div>`;
      $$('#modes button', host).forEach((b) => b.onclick = () => { S.data.prefs.exMode = b.dataset.m; S.save(); menu(); });
      $$('#lens button', host).forEach((b) => b.onclick = () => { S.data.prefs.exLen = +b.dataset.n; S.save(); menu(); });
      $('#go', host).onclick = () => play(mode, len, choosePairs(len));
      $('#cards', host).onclick = () => cards(false);
      $('#list', host).onclick = list;
    };
    // Lernkarten : Vorderseite französisch, Bedeutung aufdecken, Selbsteinschätzung zählt für den Lernstand
    const cards = (onlyOpen) => {
      let P = G.shuffle(pool().pairs); if (onlyOpen) P = P.filter((p) => !mastered(p));
      let k = 0, knew = 0;
      const draw = () => {
        if (k >= P.length || !P.length) {
          S.markDay(1); S.save();
          host.innerHTML = `<div class="flash-card" style="text-align:center"><div class="eyebrow">${G.T('Cartes terminées', 'Karten durchgearbeitet')}</div><div class="big-num">${knew}/${P.length}</div><p>${G.T(`${G.locMastered()} expressions sur ${total} maîtrisées.`, `${G.locMastered()} von ${total} Redewendungen sicher.`)}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn primary" id="again">${G.T('Revoir celles à apprendre', 'Nur die offenen wiederholen')}</button><button class="btn" id="back">${G.T('Retour', 'Zurück')}</button></div></div>`;
          $('#again', host).onclick = () => cards(true); $('#back', host).onclick = menu; return;
        }
        const p = P[k];
        host.innerHTML = `<div class="stage-top"><button class="btn small ghost" id="back">${ICON.back} ${G.T('Retour', 'Zurück')}</button><span class="grow"></span><div class="seg"><button data-f="0" class="${onlyOpen ? '' : 'on'}">${G.T('Toutes', 'Alle')}</button><button data-f="1" class="${onlyOpen ? 'on' : ''}">${G.T('À apprendre', 'Noch nicht sicher')}</button></div><span class="chip">${k + 1}/${P.length}</span></div>
          <div class="flash-card loc-flip"><div class="loc-q" lang="fr">${esc(p[0])} <b>${esc(p[1])}</b>${canSpeak() ? ` <button class="icon-btn speak" data-say="${esc(p[0] + ' ' + p[1])}" aria-label="${G.T('Écouter', 'Anhören')}">${ICON.sound}</button>` : ''}</div>
          <div class="loc-back" id="back-side" hidden>${esc(G.meaning(p[0], p[1]))}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px" id="acts"><button class="btn primary" id="show">${G.T('Montrer le sens', 'Bedeutung zeigen')} <kbd class="hide-touch">Enter</kbd></button></div></div>`;
        $('#back', host).onclick = menu;
        $$('[data-f]', host).forEach((b) => b.onclick = () => cards(b.dataset.f === '1'));
        $$('[data-say]', host).forEach((b) => b.onclick = () => G.speak(b.dataset.say));
        $('#show', host).onclick = () => {
          $('#back-side', host).hidden = false;
          $('#acts', host).innerHTML = `<button class="btn primary" data-r="1">${ICON.check} ${G.T('Je savais', 'Wusste ich')} <kbd class="hide-touch">1</kbd></button><button class="btn" data-r="0">${G.T('Je ne savais pas', 'Wusste ich nicht')} <kbd class="hide-touch">2</kbd></button>`;
          $$('[data-r]', host).forEach((b) => b.onclick = () => { const ok = b.dataset.r === '1'; writeStat(p, ok); if (ok) knew++; else G.review.add(keyOf({ t: 'p', s: p[0], e: p[1] }), { t: 'p', s: p[0], e: p[1] }); S.save(); k++; draw(); });
        };
      };
      const onKey = (ev) => {
        if (!host.isConnected) return document.removeEventListener('keydown', onKey);
        if (ev.target.closest && ev.target.closest('input, textarea, select')) return;
        const sh = $('#show', host); const r1 = $('[data-r="1"]', host), r0 = $('[data-r="0"]', host);
        if (ev.key === 'Enter' && sh) { ev.preventDefault(); sh.click(); } else if (ev.key === '1' && r1) r1.click(); else if (ev.key === '2' && r0) r0.click();
      };
      document.addEventListener('keydown', onKey);
      draw();
    };
    const list = () => {
      const P = [...pool().pairs].sort((a, b) => fold(a[0]).localeCompare(fold(b[0])));
      const back = `<button class="btn small ghost" data-back>${ICON.back} ${G.T('Retour', 'Zurück')}</button>`;
      host.innerHTML = `<div class="stage-top">${back}<span class="grow"></span><span class="chip">${G.T(`${G.locMastered()} / ${total} maîtrisées`, `${G.locMastered()} / ${total} sicher`)}</span></div>
        <div class="loc-list">${P.map((p) => `<div class="loc-item ${mastered(p) ? 'ok' : ''}"><div class="loc-expr" lang="fr">${esc(p[0])} <b>${esc(p[1])}</b>${canSpeak() ? ` <button class="icon-btn speak" data-say="${esc(p[0] + ' ' + p[1])}" aria-label="${G.T('Écouter', 'Anhören')}">${ICON.sound}</button>` : ''}</div><div class="loc-mean">${esc(G.meaning(p[0], p[1]))}</div></div>`).join('')}</div>
        <div style="margin-top:14px">${back}</div>`;
      $$('[data-back]', host).forEach((b) => b.onclick = menu);
      $$('[data-say]', host).forEach((b) => b.onclick = () => G.speak(b.dataset.say));
    };
    const play = (mode, len, rounds) => {
      const before = G.locMastered();
      let k = 0, good = 0, combo = 0, best = 0; const missed = [];
      host.innerHTML = `<div class="stage-top sticky"><div class="stat"><span>${G.T('Expression', 'Redewendung')}</span><b id="qk"></b></div><div class="stat"><span>${G.T('Justes', 'Richtig')}</span><b id="gd">0</b></div><div class="stat"><span>${G.T('Série', 'Serie')}</span><b id="cb">0</b></div><span class="grow"></span><button class="btn small ghost" id="stop">${G.T('Arrêter', 'Beenden')}</button></div><div class="bar" style="margin-bottom:14px"><i id="pb" style="width:0%"></i></div><div id="q"></div>`;
      $('#stop', host).onclick = () => finish(true);
      const step = () => {
        if (k >= rounds.length) return finish(false);
        $('#qk', host).textContent = `${k + 1}/${rounds.length}`; $('#pb', host).style.width = (k / rounds.length) * 100 + '%';
        const p = rounds[k]; const it = { t: 'p', s: p[0], e: p[1] };
        const m = mode === 'mix' ? MODES[Math.floor(Math.random() * MODES.length)][0] : mode;
        askPair($('#q', host), it, (ok) => {
          if (ok) { good++; combo++; best = Math.max(best, combo); } else { combo = 0; missed.push(it); }
          $('#gd', host).textContent = good; $('#cb', host).textContent = combo; k++; S.save(); step();
        }, { mode: m });
      };
      const finish = (stopped) => {
        if (stopped && k === 0) return menu(); // sofort beendet : zählt nicht
        const key = recKey(mode, rounds.length);
        const isRec = !stopped && good > (S.data.games[key] || 0);
        if (!stopped) S.data.games[key] = Math.max(S.data.games[key] || 0, good);
        missed.forEach((it) => G.review.add(keyOf(it), it)); S.markDay(1); S.save(); G.updateBadge();
        const gained = G.locMastered() - before; const n = stopped ? k : rounds.length;
        const label = good === n && !stopped ? G.T('Parfait !', 'Perfekt!') : isRec ? G.T('Nouveau record !', 'Neuer Rekord!') : stopped ? G.T('Partie arrêtée', 'Spiel beendet') : g.title;
        summary(host, { big: `${good}/${n}`, label,
          text: G.T(`Meilleure série : ${best}. ${gained > 0 ? `+${gained} maîtrisées · ` : ''}${G.locMastered()}/${total} expressions maîtrisées.`,
            `Längste Serie: ${best}. ${gained > 0 ? `+${gained} neu sicher · ` : ''}${G.locMastered()}/${total} Redewendungen sicher.`),
          again: menu, againLabel: G.T('Nouvelle partie', 'Neue Runde'),
          extraButtons: missed.length ? `<button class="btn primary" id="retry">${ICON.redo} ${G.T('Rejouer les erreurs', 'Fehler nochmal üben')} (${missed.length})</button>` : '',
          after: missed.length ? `<div class="section-title"><h2>${G.T('À retenir', 'Zum Merken')}</h2></div><div class="loc-list">${missed.map((it) => `<div class="loc-item"><div class="loc-expr" lang="fr">${esc(it.s)} <b>${esc(it.e)}</b></div><div class="loc-mean">${esc(G.meaning(it.s, it.e))}</div></div>`).join('')}</div>` : '' });
        const r = $('#retry', host); if (r) r.onclick = () => play(mode, missed.length, missed.map((it) => [it.s, it.e]));
      };
      step();
    };
    menu();
    return el;
  }

  // ------------------------------------------------------------------ le chemin des notions (graphe des renvois)
  function bfs(from) {
    const dist = { [from]: 0 }, prev = {}; const q = [from];
    while (q.length) { const x = q.shift(); for (const y of (G.rule(x).out || [])) { if (G.rule(y) && !G.rule(y).stub && dist[y] == null) { dist[y] = dist[x] + 1; prev[y] = x; q.push(y); } } }
    return { dist, prev };
  }
  function chemin() {
    const g = GAMES.find((x) => x.id === 'chemin'); const el = stage(g.title); const host = $('#st', el);
    const play = () => {
      const cand = Object.values(D.rules).filter((r) => !r.stub && r.out.length >= 3 && r.in.length >= 2);
      let start, target, best, tries = 0;
      do {
        start = cand[Math.floor(Math.random() * cand.length)].id;
        const { dist } = bfs(start);
        const far = Object.keys(dist).filter((k) => dist[k] >= 3 && dist[k] <= 4);
        if (far.length) { target = far[Math.floor(Math.random() * far.length)]; best = dist[target]; }
      } while (!target && ++tries < 60);
      if (!target) { host.innerHTML = '<div class="empty">Impossible de tirer un chemin, réessayez.</div>'; return; }
      let cur = start, hinted = false, hintPath = null; const trail = [start];
      const draw = () => {
        const r = G.rule(cur);
        if (cur === target) {
          const steps = trail.length - 1; const score = Math.max(0, 100 - (steps - best) * 20 - (hinted ? 50 : 0));
          S.data.games.chemin = Math.max(S.data.games.chemin || 0, score); S.markDay(1); S.save();
          return summary(host, { big: score, label: steps === best && !hinted ? G.T('points · chemin optimal !', 'Punkte · kürzester Weg!') : G.T(`points · ${plural(steps, 'étape')} (le plus court : ${best})${hinted ? ' · avec aide' : ''}`, `Punkte · ${plural(steps, 'étape')} (kürzester: ${best})${hinted ? ' · mit Hilfe' : ''}`), text: trail.map((x) => esc(G.ruleTitle(x))).join(' → '), again: play });
        }
        const outs = (r.out || []).filter((x) => G.rule(x) && !G.rule(x).stub);
        host.innerHTML = `<div class="stage-top"><div class="stat"><span>Étapes</span><b>${trail.length - 1}</b></div><div class="stat"><span>Minimum</span><b>${best}</b></div><span class="grow"></span>${hinted ? '<span class="chip warn">Aide utilisée : −50 pts</span>' : ''}<button class="btn small ghost" id="giveup">Montrer un chemin (−50 pts)</button></div>
          <div class="flash-card"><div class="eyebrow">Objectif</div><div class="path-now" style="color:var(--accent)">${esc(G.ruleTitle(target))}</div><p class="path-ex">${esc(G.excerpt(G.rule(target), 150))}</p>
          <div class="eyebrow" style="margin-top:14px">Vous êtes sur</div><div class="path-now">${esc(r.title)} <button class="btn small ghost" data-side="#/regle/${cur}">${ICON.side} Lire</button></div>
          <div class="path-trail">${trail.map((x) => `<span>${esc(G.ruleTitle(x))}</span>`).join('→')}</div>
          <div id="hint"></div>
          <div class="eyebrow" style="margin-top:18px">Cette fiche renvoie à…</div>
          <div class="path-opts">${outs.map((x) => `<button class="qopt path-opt" data-to="${x}"><b>${esc(G.ruleTitle(x))}</b><span>${esc(G.excerpt(G.rule(x), 90))}</span></button>`).join('') || '<p>Impasse ! Revenez en arrière.</p>'}</div>
          ${trail.length > 1 ? `<button class="btn small" id="undo" style="margin-top:12px">${ICON.back} Revenir</button>` : ''}</div>`;
        $$('[data-to]', host).forEach((b) => b.onclick = () => { cur = b.dataset.to; trail.push(cur); draw(); });
        $$('[data-side]', host).forEach((b) => b.onclick = () => G.openDrawer(b.dataset.side));
        const u = $('#undo', host); if (u) u.onclick = () => { trail.pop(); cur = trail[trail.length - 1]; draw(); };
        const showHint = () => { if (hintPath) $('#hint', host).innerHTML = `<div class="path-trail" style="margin-top:10px"><span style="background:var(--accent-soft);color:var(--accent)">Un chemin possible</span>${hintPath.map((y) => `<span>${esc(G.ruleTitle(y))}</span>`).join('→')}</div>`; };
        // le chemin conseillé reste affiché tant qu'on le suit
        if (hintPath) { const k = hintPath.indexOf(cur); hintPath = k >= 0 ? hintPath.slice(k + 1) : null; showHint(); }
        $('#giveup', host).onclick = () => {
          hinted = true;
          const { prev } = bfs(cur); const p = []; let x = target; while (x && x !== cur) { p.unshift(x); x = prev[x]; }
          hintPath = [cur, ...p]; draw();
        };
      };
      draw();
    };
    play();
    return el;
  }

  // ------------------------------------------------------------------ révision espacée
  G.views.revision = function () {
    const el = h(`<div class="page"><div class="stage"><div class="page-head"><div class="eyebrow">${G.T('Révision espacée', 'Wiederholung mit Abstand')}</div><h1>${G.T('À revoir', 'Wiederholen')}</h1>
      <p class="lead">${G.T('Les items manqués reviennent après 1, 3, 7, 16 puis 35 jours ; une erreur les renvoie au début. Une séance compte au plus 20 items, mélangés entre les exercices.', 'Verpasste Aufgaben kommen nach 1, 3, 7, 16 und 35 Tagen wieder; ein Fehler schickt sie an den Anfang zurück. Eine Sitzung hat höchstens 20 Aufgaben, gemischt aus verschiedenen Übungen.')}</p></div><div id="st"></div></div></div>`);
    const host = $('#st', el);
    const valid = (x) => (x.t === 'p' ? x.s && x.e : G.ex(x.ex));
    const dueAll = G.review.due().filter(valid);
    // mélange : on alterne les exercices d'origine, puis on limite à 20
    const byEx = {}; G.shuffle(dueAll).forEach((x) => { const k = x.ex || 'locutions'; (byEx[k] = byEx[k] || []).push(x); });
    const queue = []; const groups = Object.values(byEx);
    while (queue.length < 20 && groups.some((gq) => gq.length)) groups.forEach((gq) => { if (gq.length && queue.length < 20) queue.push(gq.shift()); });
    const total = G.review.count();
    if (!queue.length) {
      const next = Object.values(S.data.review).map((r) => r.due).sort()[0];
      const nextTxt = next ? new Date(next + 'T12:00').toLocaleDateString(G.T('fr-FR', 'de-DE'), { day: 'numeric', month: 'long' }) : '';
      host.innerHTML = `<div class="empty"><strong>${total ? G.T('Rien à revoir aujourd’hui.', 'Heute ist nichts zu wiederholen.') : G.T('Votre pile de révision est vide.', 'Dein Wiederholungsstapel ist leer.')}</strong>${total ? G.T(`${plural(total, 'item')} en attente, prochain rendez-vous le ${nextTxt}.`, `${plural(total, 'item')} warten, nächster Termin am ${nextTxt}.`) : G.T('Faites quelques exercices : les lacunes manquées viendront s’y ranger.', 'Mach ein paar Übungen – verpasste Lücken landen dann hier.')}${S.data.games.acquis ? `<br>${G.T(`${plural(S.data.games.acquis, 'item acquis', 'items acquis')} jusqu’ici.`, `Bisher sicher gelernt: ${plural(S.data.games.acquis, 'item')}.`)}` : ''}<div style="margin-top:14px"><a class="btn primary" href="#/jeu/sprint">${ICON.bolt} ${G.T('Une course contre la montre ?', 'Wie wär’s mit einem Wettlauf gegen die Zeit?')}</a></div></div>`;
      return el;
    }
    const n0 = queue.length; let doneN = 0, good = 0; const graded = new Set();
    host.innerHTML = `<div class="stage-top"><div class="stat"><span>Restants</span><b id="qk"></b></div><div class="stat"><span>Réussis</span><b id="gd">0</b></div><span class="grow"></span><div class="bar" style="width:160px"><i id="pb"></i></div></div><div id="q"></div>`;
    const step = () => {
      if (!queue.length) {
        S.markDay(1); S.save(); G.updateBadge();
        host.innerHTML = `<div class="flash-card" style="text-align:center"><div class="eyebrow">Séance terminée</div><div style="font:800 56px/1 var(--f-display);color:var(--accent);margin:12px 0">${good}/${n0}</div><p style="font:18px/1.5 var(--f-read)">${G.T('Réussis du premier coup : ils montent d’une boîte. Les autres ont été retravaillés jusqu’à la bonne réponse et reviendront demain.', 'Was beim ersten Versuch richtig war, rückt eine Stufe weiter. Den Rest hast du bis zur richtigen Antwort geübt; er kommt morgen wieder.')}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${G.review.due().length ? `<a class="btn primary" href="#/revision" data-reload>${G.T('Encore', 'Noch')} ${plural(Math.min(20, G.review.due().length), 'item')}</a>` : ''}<a class="btn" href="#/">Retour à l’accueil</a></div></div>`;
        const rl = $('[data-reload]', host); if (rl) rl.onclick = (ev) => { ev.preventDefault(); G.refresh(); };
        return;
      }
      $('#qk', host).textContent = queue.length; $('#pb', host).style.width = (doneN / (doneN + queue.length)) * 100 + '%';
      const it = queue.shift();
      askItem($('#q', host), it, (ok, first, skipped) => {
        const success = ok && first;
        // seule la première réponse de la séance décide de la boîte ; un échec revient en fin de séance
        if (!graded.has(it.key)) { graded.add(it.key); G.review.grade(it.key, success); if (success) { good++; $('#gd', host).textContent = good; } }
        if (!success && !skipped) queue.splice(Math.min(3, queue.length), 0, it); else doneN++;
        S.save(); step();
      }, { wide: true, auto: false, mode: it.t === 'p' ? ['end', 'start', 'meaning', 'expr'][(it.n || 0) % 4] : undefined });
    };
    step();
    return el;
  };
})();

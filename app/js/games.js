/* Jeux construits sur les exercices existants, et révision espacée. */
(function () {
  'use strict';
  const { D, S, $, $$, esc, strip, fold, plural, h, ICON } = G;

  const GAMES = [
    { id: 'sprint', title: 'Course contre la montre', desc: 'Soixante secondes, une phrase à la fois. Les bonnes réponses en série rapportent des points bonus.', ic: ICON.bolt, color: 'linear-gradient(140deg,var(--t-800),var(--t-500))' },
    { id: 'defi', title: 'Défi du jour', desc: 'Dix questions tirées de tout le programme, les mêmes pour tout le monde aujourd’hui. Seul le premier essai compte.', ic: ICON.cal, color: 'linear-gradient(140deg,var(--t-900),var(--t-600))' },
    { id: 'chemin', title: 'Le chemin des notions', desc: 'Reliez deux fiches en suivant leurs renvois. Lisez les extraits pour choisir la bonne direction.', ic: ICON.path, color: 'linear-gradient(140deg,#0b4f6b,var(--t-500))' },
    { id: 'memo', title: 'Mémo des locutions', desc: 'Retournez les cartes, reformez les expressions et découvrez leur sens.', ic: ICON.cards, color: 'linear-gradient(140deg,var(--t-700),var(--t-300))' },
    { id: 'express', title: 'Locution express', desc: 'Un début d’expression, quatre fins possibles. Ou l’inverse, en mode retourné.', ic: ICON.quote, color: 'linear-gradient(140deg,#134e4a,#2f8fb8)' },
    { id: 'revision', title: 'Révision espacée', desc: 'Vos erreurs reviennent au bon moment, jusqu’à ce qu’elles soient acquises.', ic: ICON.redo, color: 'linear-gradient(140deg,var(--t-950),var(--t-700))', href: '#/revision' },
  ];
  const GAMES_DE = {
    sprint: ['Zeitrennen', 'Sechzig Sekunden, ein Satz nach dem anderen. Richtige Antworten in Serie bringen Bonuspunkte.'],
    defi: ['Tagesaufgabe', 'Zehn Fragen aus dem ganzen Programm, heute für alle gleich. Nur der erste Versuch zählt.'],
    chemin: ['Der Weg durch die Begriffe', 'Verbinde zwei Fiches über ihre Verweise. Lies die Auszüge, um die richtige Richtung zu wählen.'],
    memo: ['Memo der Wendungen', 'Decke Karten auf, setze die Redewendungen zusammen und erfahre ihre Bedeutung.'],
    express: ['Wendung express', 'Ein Anfang, vier mögliche Enden. Oder umgekehrt im umgedrehten Modus.'],
    revision: ['Wiederholung mit Abstand', 'Deine Fehler kommen zur richtigen Zeit zurück, bis sie sitzen.'],
  };
  GAMES.forEach((g) => { const fr = [g.title, g.desc]; Object.defineProperty(g, 'title', { get: () => G.T(fr[0], GAMES_DE[g.id][0]) }); Object.defineProperty(g, 'desc', { get: () => G.T(fr[1], GAMES_DE[g.id][1]) }); });
  const lkey = (t) => fold(t).replace(/[^a-z]/g, '');
  G.meaning = (a, b) => (D.meanings || {})[lkey(a + ' ' + b)] || '';
  G.pairKey = (a, b) => 'p:' + lkey(a) + '|' + lkey(b);

  function gameStatus(g) {
    if (g.id === 'revision') return `<span class="chip accent">${plural(G.review.due().length, 'item')} à revoir</span>`;
    if (g.id === 'defi') { const t = S.data.games['defi:' + G.today()]; return t != null ? `<span class="chip ok">Fait aujourd’hui : ${t} %</span>` : '<span class="chip accent">À faire aujourd’hui</span>'; }
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
    const head = `<div class="consigne">${esc(strip(e.title))}</div>`;
    const src = `<div class="src">Tiré de <a href="#/exercice/${e.id}">${esc(G.exTitle(e))}</a>${rule ? ` · <button class="linkish" data-sidehref="#/regle/${rule}">${ICON.side} ${esc(G.ruleTitle(rule))}</button>` : ''}</div>`;
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
        const a = q.answers[+b.dataset.a];
        if (a.ok) { b.classList.add('ok'); $$('.qopt', host).forEach((x) => (x.disabled = true)); finishWith(tries === 0, tries === 0, 650); }
        else { b.classList.add('ko'); b.disabled = true; tries++; if (rule) $('#rv', host).innerHTML = '<span style="color:var(--ko)">Non. Relisez la règle si besoin.</span>'; }
      });
    }
    $$('[data-sidehref]', host).forEach((a) => a.onclick = (ev) => { ev.preventDefault(); G.openDrawer(a.dataset.sidehref); });
  }
  G.askItem = askItem;

  // locution : trouver la fin (ou le début en mode retourné) parmi quatre propositions
  function askPair(host, item, onDone, opts = {}) {
    const all = pool().pairs; const rev = !!opts.reverse;
    const shown = rev ? item.e : item.s, right = rev ? item.s : item.e;
    const same = (p) => lkey(p[0]) === lkey(item.s);
    const others = all.filter((p) => !same(p) && lkey(rev ? p[0] : p[1]) !== lkey(right));
    // distracteurs de longueur proche, pour éviter les réponses absurdes
    const near = others.map((p) => rev ? p[0] : p[1]).sort((a, b) => Math.abs(a.length - right.length) - Math.abs(b.length - right.length));
    const opts4 = G.shuffle([right, ...G.shuffle(near.slice(0, 9)).slice(0, 3)]);
    host.innerHTML = `<div class="flash-card"><div class="consigne">${rev ? 'Quel est le début de cette expression ?' : 'Comment se termine cette expression ?'}</div>
      <div class="ctx" style="font-size:26px">${rev ? '<span style="color:var(--muted)">…</span> ' + esc(shown) : esc(shown) + ' <span style="color:var(--muted)">…</span>'}</div>
      <div class="qopts" style="margin-top:18px">${opts4.map((o) => `<button class="qopt">${esc(o)}</button>`).join('')}</div><div class="reveal" id="rv" aria-live="polite"></div>
      <div style="margin-top:14px" id="nx" hidden><button class="btn primary">${ICON.arrow} Continuer</button></div></div>`;
    let first = true, over = false;
    $$('.qopt', host).forEach((b) => b.onclick = () => {
      if (over) return;
      if (lkey(b.textContent) === lkey(right)) {
        over = true; b.classList.add('ok'); $$('.qopt', host).forEach((x) => (x.disabled = true));
        const m = G.meaning(item.s, item.e);
        $('#rv', host).innerHTML = `<b>« ${esc(item.s)} ${esc(item.e)} »</b><br><span style="color:var(--${m ? 'ink-2' : 'muted'})">${m ? esc(m) : 'Signification non donnée dans le programme.'}</span>`;
        const nx = $('#nx', host); nx.hidden = false; const btn = $('button', nx); btn.focus();
        btn.onclick = () => onDone(first, first);
      } else { b.classList.add('ko'); b.disabled = true; first = false; }
    });
  }

  function stage(title) {
    return h(`<div class="page"><div class="stage"><div class="crumbs" style="margin-bottom:10px"><a href="#/jeux">Jeux</a></div><h1 style="font:800 clamp(26px,3.6vw,38px)/1.1 var(--f-display);margin:0 0 18px">${title}</h1><div id="st"></div></div></div>`);
  }
  function summary(host, { big, label, text, again, items, extra, againLabel }) {
    host.innerHTML = `<div class="flash-card" style="text-align:center"><div class="eyebrow">${label}</div><div style="font:800 64px/1 var(--f-display);color:var(--accent);margin:12px 0">${big}</div><p style="font:18px/1.5 var(--f-read);margin:0 auto 18px;max-width:46ch">${text}</p>
      ${extra || ''}<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn primary" id="again">${ICON.redo} ${againLabel || 'Rejouer'}</button><a class="btn" href="#/jeux">Autres jeux</a>${G.review.due().length ? `<a class="btn" href="#/revision">À revoir (${G.review.due().length})</a>` : ''}</div></div>
      ${items && items.filter((x) => x.ex).length ? `<div class="section-title"><h2>À retravailler</h2></div><div class="ex-rows">${[...new Set(items.filter((x) => x.ex).map((x) => x.ex))].map((id) => G.exRow(id)).join('')}</div>` : ''}`;
    $('#again', host).onclick = again;
  }
  const keyOf = (it) => it.t === 'p' ? G.pairKey(it.s, it.e) : `${it.t}:${it.ex}:${it.i}`;

  // ------------------------------------------------------------------ jeux
  G.views.jeu = function (rt) {
    const fn = { sprint, defi, memo, express, chemin }[rt.parts[1]];
    return fn ? fn(rt) : G.views.notfound(rt);
  };

  function sprint() {
    const g = GAMES[0]; const el = stage(g.title); const host = $('#st', el);
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
    const g = GAMES[1]; const el = stage(g.title); const host = $('#st', el);
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
          return summary(host, { big: good + '/10', label: G.T((practice ? 'Entraînement · ' : '') + 'Défi du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }), (practice ? 'Training · ' : '') + 'Tagesaufgabe vom ' + new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })), text: good === 10 ? G.T('Sans faute. Revenez demain pour un nouveau défi.', 'Fehlerfrei. Morgen gibt es eine neue Tagesaufgabe.') : G.T('Les questions manquées sont dans votre révision. Nouveau défi demain.', 'Verpasste Fragen sind in deiner Wiederholung. Morgen gibt es eine neue Tagesaufgabe.'), again: () => start(true), againLabel: 'S’entraîner sur ce défi', items: missed });
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
      host.innerHTML = `<div class="flash-card"><p style="font:18px/1.5 var(--f-read);margin:0 0 14px">${G.T(`Défi d’aujourd’hui relevé : <b>${official} %</b>${yesterday != null ? ` (hier : ${yesterday} %)` : ''}. Vous pouvez le refaire pour vous entraîner ; seul le premier essai compte.`, `Heutige Tagesaufgabe erledigt: <b>${official} %</b>${yesterday != null ? ` (gestern: ${yesterday} %)` : ''}. Du kannst sie zum Üben wiederholen; nur der erste Versuch zählt.`)}</p><button class="btn primary" id="go">${ICON.redo} S’entraîner sur ce défi</button></div>`;
      $('#go', host).onclick = () => start(true);
    } else {
      host.innerHTML = `<div class="flash-card"><p style="font:18px/1.5 var(--f-read);margin:0 0 14px">${G.T(`Dix questions, sans limite de temps. Seul le premier essai compte pour votre score du jour.${yesterday != null ? ` Hier : <b>${yesterday} %</b>.` : ''}`, `Zehn Fragen, ohne Zeitlimit. Nur der erste Versuch zählt für dein Tagesergebnis.${yesterday != null ? ` Gestern: <b>${yesterday} %</b>.` : ''}`)}</p><button class="btn primary" id="go">${ICON.play} Relever le défi</button></div>`;
      $('#go', host).onclick = () => start(false);
    }
    return el;
  }

  function memo() {
    const g = GAMES[3]; const el = stage(g.title); const host = $('#st', el);
    const play = () => {
      const pairs = G.shuffle(pool().pairs).slice(0, 8);
      const cards = G.shuffle(pairs.flatMap((p, i) => [{ i, t: p[0], side: 'début' }, { i, t: p[1], side: 'fin' }]));
      let open = [], found = 0, moves = 0; const learned = [];
      host.innerHTML = `<div class="stage-top"><div class="stat"><span>Paires</span><b id="fd">0/8</b></div><div class="stat"><span>Coups</span><b id="mv">0</b></div></div>
        <div class="memo">${cards.map((c, k) => `<button data-k="${k}" class="${c.side === 'début' ? 'is-start' : 'is-end'}" aria-label="Carte ${k + 1}, ${c.side} d’expression, face cachée"><small>${c.side}</small><span></span></button>`).join('')}</div>
        <div class="memo-meaning" id="mm" aria-live="polite"></div>`;
      const face = (b, up) => { const c = cards[+b.dataset.k]; $('span', b).textContent = up ? c.t : ''; b.setAttribute('aria-label', up ? `${c.side} : ${c.t}` : `Carte ${+b.dataset.k + 1}, ${c.side} d’expression, face cachée`); };
      $$('.memo button', host).forEach((b) => b.onclick = () => {
        if (b.classList.contains('up') || b.classList.contains('found') || open.length === 2) return;
        if (open.length === 1 && cards[+open[0].dataset.k].side === cards[+b.dataset.k].side) { G.toast(G.T(`Choisissez maintenant une carte « ${cards[+open[0].dataset.k].side === 'début' ? 'fin' : 'début'} ».`, `Wähle jetzt eine Karte „${cards[+open[0].dataset.k].side === 'début' ? 'Ende' : 'Anfang'}“.`)); return; }
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
            const m = G.meaning(st.t, en.t); learned.push([st.t, en.t, m]);
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
    const g = GAMES[4]; const el = stage(g.title); const host = $('#st', el);
    const play = (reverse) => {
      const rounds = G.shuffle(pool().pairs).slice(0, 12);
      let k = 0, good = 0; const missed = [];
      host.innerHTML = `<div class="stage-top"><div class="stat"><span>Locution</span><b id="qk">1/12</b></div><div class="stat"><span>Justes</span><b id="gd">0</b></div><span class="grow"></span>
        <div class="seg"><button data-r="0" class="${reverse ? '' : 'on'}">Trouver la fin</button><button data-r="1" class="${reverse ? 'on' : ''}">Trouver le début</button></div></div><div id="q"></div>`;
      $$('.seg button', host).forEach((b) => b.onclick = () => play(b.dataset.r === '1'));
      const step = () => {
        if (k >= rounds.length) {
          const key = reverse ? 'express-r' : 'express'; S.data.games[key] = Math.max(S.data.games[key] || 0, good);
          missed.forEach((it) => G.review.add(keyOf(it), it)); S.markDay(1); S.save(); G.updateBadge();
          return summary(host, { big: `${good}/12`, label: 'Locution express', text: missed.length ? G.T(`${plural(missed.length, 'expression')} ${missed.length > 1 ? 'rejoignent' : 'rejoint'} la révision.`, `${plural(missed.length, 'expression')} ${missed.length > 1 ? 'kommen' : 'kommt'} in die Wiederholung.`) : G.T('Aucune erreur.', 'Kein Fehler.'), again: () => play(reverse) });
        }
        $('#qk', host).textContent = `${k + 1}/12`;
        const p = rounds[k]; const it = { t: 'p', s: p[0], e: p[1] };
        askPair($('#q', host), it, (ok) => { if (ok) { good++; $('#gd', host).textContent = good; } else missed.push(it); k++; step(); }, { reverse });
      };
      step();
    };
    play(false);
    return el;
  }

  // ------------------------------------------------------------------ le chemin des notions (graphe des renvois)
  function bfs(from) {
    const dist = { [from]: 0 }, prev = {}; const q = [from];
    while (q.length) { const x = q.shift(); for (const y of (G.rule(x).out || [])) { if (G.rule(y) && !G.rule(y).stub && dist[y] == null) { dist[y] = dist[x] + 1; prev[y] = x; q.push(y); } } }
    return { dist, prev };
  }
  function chemin() {
    const g = GAMES[2]; const el = stage(g.title); const host = $('#st', el);
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
      host.innerHTML = `<div class="empty"><strong>${total ? G.T('Rien à revoir aujourd’hui.', 'Heute ist nichts zu wiederholen.') : G.T('Votre pile de révision est vide.', 'Dein Wiederholungsstapel ist leer.')}</strong>${total ? G.T(`${plural(total, 'item')} en attente, prochain rendez-vous le ${nextTxt}.`, `${plural(total, 'item')} warten, nächster Termin am ${nextTxt}.`) : G.T('Faites quelques exercices : les lacunes manquées viendront s’y ranger.', 'Mach ein paar Übungen: Verpasste Lücken landen hier.')}${S.data.games.acquis ? `<br>${plural(S.data.games.acquis, 'item acquis', 'items acquis')}${G.T(' jusqu’ici.', ' bisher.')}` : ''}<div style="margin-top:14px"><a class="btn primary" href="#/jeu/sprint">${ICON.bolt} ${G.T('Une course contre la montre ?', 'Wie wär’s mit einem Zeitrennen?')}</a></div></div>`;
      return el;
    }
    const n0 = queue.length; let doneN = 0, good = 0; const graded = new Set();
    host.innerHTML = `<div class="stage-top"><div class="stat"><span>Restants</span><b id="qk"></b></div><div class="stat"><span>Réussis</span><b id="gd">0</b></div><span class="grow"></span><div class="bar" style="width:160px"><i id="pb"></i></div></div><div id="q"></div>`;
    const step = () => {
      if (!queue.length) {
        S.markDay(1); S.save(); G.updateBadge();
        host.innerHTML = `<div class="flash-card" style="text-align:center"><div class="eyebrow">Séance terminée</div><div style="font:800 56px/1 var(--f-display);color:var(--accent);margin:12px 0">${good}/${n0}</div><p style="font:18px/1.5 var(--f-read)">${G.T('Réussis du premier coup : ils montent d’une boîte. Les autres ont été retravaillés jusqu’à la bonne réponse et reviendront demain.', 'Beim ersten Versuch richtig: Sie rücken ein Fach weiter. Die anderen hast du bis zur richtigen Antwort geübt; sie kommen morgen wieder.')}</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">${G.review.due().length ? `<a class="btn primary" href="#/revision" data-reload>${G.T('Encore', 'Noch')} ${plural(Math.min(20, G.review.due().length), 'item')}</a>` : ''}<a class="btn" href="#/">Retour à l’accueil</a></div></div>`;
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
      }, { wide: true });
    };
    step();
    return el;
  };
})();

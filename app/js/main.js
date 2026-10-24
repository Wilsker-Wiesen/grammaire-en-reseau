/* Démarrage de l'application. */
(function () {
  'use strict';
  const { S, $ } = G;
  S.load();
  G.lang = S.data.prefs.lang || 'de';
  document.documentElement.lang = G.lang;
  G.applyPrefs();
  G.setSync('local');
  G.initPalette();
  G.initAccents();

  $('#search-trigger').onclick = () => G.openPalette();
  $('#back-btn').onclick = () => G.back();
  $('#theme-btn').onclick = () => {
    S.data.prefs.theme = G.isDark() ? 'light' : 'dark';
    S.save(); G.applyPrefs();
    if (G.onTheme) G.onTheme(); else G.refresh();
  };
  $('#menu-btn').onclick = () => {
    const nav = $('#sidenav'); const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); $('#menu-btn').setAttribute('aria-expanded', String(open)); $('#scrim').hidden = !open;
  };
  $('#scrim').onclick = () => { G.closeDrawer(); G.closeNav(); };

  document.addEventListener('keydown', (ev) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if ((ev.key === 'k' || ev.key === 'K') && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); G.openPalette(); }
    else if (ev.key === '/' && !typing && $('#palette').hidden) { ev.preventDefault(); G.openPalette(); }
    else if (ev.key === 'Escape') { if (!$('#palette').hidden) G.closePalette(); else if (!$('#drawer').hidden) G.closeDrawer(); else G.closeNav(); }
    else if (ev.altKey && ev.key === 'ArrowLeft') { ev.preventDefault(); G.back(); }
  });

  $('#lang-btn').onclick = () => G.setLang(G.lang === 'de' ? 'fr' : 'de');
  const setLangBtn = () => { const b = $('#lang-btn'); b.textContent = G.lang === 'de' ? 'FR' : 'DE'; b.title = G.lang === 'de' ? 'Version française' : 'Deutsche Fassung'; };
  setLangBtn();

  // Sprache laden (deutsche Fassung der Fiches bei Bedarf nachladen), dann erste Seite anzeigen
  (G.lang === 'de' ? G.loadDE() : Promise.resolve()).then(() => {
    G.translate(document.body);
    G.startTranslateObserver();
    // route initiale : « #/… » interne, ou ancre simple transmise par le lien de l'artefact (#carte, #jeux…)
    let start = location.hash || '#/';
    if (/^#[A-Za-z0-9._~-]+$/.test(start)) start = '#/' + start.slice(1).replace(/\./g, '/');
    try { history.replaceState({ r: start }, '', start); } catch (e) { /* ignoré */ }
    G.R.cur = null;
    G.go(start, { replace: true, force: true });

  });

  // demande au navigateur de ne pas effacer la progression (Safari vide sinon le stockage après 7 jours sans visite)
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* ignoré */ }

  // synchronisation avec le compte, si la page est ouverte comme artefact claude.ai
  S.connect();
})();

/* Zweisprachigkeit : Bedienung auf Deutsch oder Französisch. Die Lerninhalte (Beispiele, Übungssätze, Lösungen) bleiben immer französisch. */
(function () {
  'use strict';
  const G = window.G;

  G.lang = 'de';
  /** Text je nach Sprache : T('français', 'Deutsch'). */
  G.T = (fr, de) => (G.lang === 'de' ? de : fr);

  // ------------------------------------------------------------------ Mengenangaben (plural)
  const NOUNS = {
    item: ['Aufgabe', 'Aufgaben'], fiche: ['Fiche', 'Fiches'], exercice: ['Übung', 'Übungen'], lien: ['Verweis', 'Verweise'],
    renvoi: ['Verweis', 'Verweise'], jour: ['Tag', 'Tage'], point: ['Punkt', 'Punkte'], erreur: ['Fehler', 'Fehler'],
    lacune: ['Lücke', 'Lücken'], entrée: ['Eintrag', 'Einträge'], résultat: ['Treffer', 'Treffer'], 'bonne réponse': ['richtige Antwort', 'richtige Antworten'],
    phrase: ['Satz', 'Sätze'], voisin: ['Nachbar', 'Nachbarn'], étape: ['Schritt', 'Schritte'], expression: ['Wendung', 'Wendungen'],
    'exercice lié': ['verknüpfte Übung', 'verknüpfte Übungen'], réussi: ['geschafft', 'geschafft'], acquis: ['sicher gelernt', 'sicher gelernt'],
    'item acquis': ['Aufgabe sicher gelernt', 'Aufgaben sicher gelernt'],
  };
  G.plural = function (n, s, p) {
    if (G.lang === 'de' && NOUNS[s]) return `${G.fmt(n)} ${NOUNS[s][n === 1 ? 0 : 1]}`;
    return `${G.fmt(n)} ${n > 1 ? (p || s + 's') : s}`;
  };

  // ------------------------------------------------------------------ Inhalte : deutsche Fassung der Fiches und Bezeichnungen
  G.DE = null; // { rules: {id: {title, html}}, str: {fr: de} }
  /** Deutsche Fassung eines Inhaltstextes (Titel, Anweisung, Registerbegriff), sonst das Original. */
  G.tx = (s) => (G.lang === 'de' && G.DE && s && G.DE.str[s]) || s;
  G.loadDE = function () {
    if (G.DE || window.GRAMMAIRE_DE) { G.DE = G.DE || window.GRAMMAIRE_DE; return Promise.resolve(); }
    return new Promise((res) => {
      const sc = document.createElement('script');
      const v = (document.querySelector('script[src*="js/i18n.js"]') || {}).src || '';
      sc.src = 'data_de.js' + (v.includes('?') ? v.slice(v.indexOf('?')) : '');
      sc.onload = () => { G.DE = window.GRAMMAIRE_DE || null; res(); };
      sc.onerror = () => res();
      document.head.appendChild(sc);
    });
  };

  // ------------------------------------------------------------------ Wörterbuch der kurzen Bedientexte (genaue Übereinstimmung, {x} = Platzhalter)
  const DICT = {
    'Grammaire en réseau': 'Grammaire en réseau', 'en réseau': 'en réseau',
    'Rechercher une règle, un mot, un exercice…': 'Regel, Wort oder Übung suchen …',
    'Accueil': 'Start', 'Thèmes': 'Themen', 'Sommaire A–Z': 'Register A–Z', 'Exercices': 'Übungen', 'Jeux & défis': 'Spiele', 'Jeux': 'Spiele',
    'À revoir': 'Wiederholen', 'Carte des notions': 'Begriffskarte', 'Ma progression': 'Mein Fortschritt', 'Mode d’emploi': 'Anleitung', 'À propos': 'Über das Programm',
    'Chargement du programme…': 'Programm wird geladen …', 'Ouvrir le menu': 'Menü öffnen', 'Changer de thème': 'Hell/Dunkel wechseln', 'Thème clair / sombre': 'Hell / Dunkel',
    'Navigation principale': 'Hauptnavigation', 'Fiche ouverte à côté': 'Fiche in der Seitenleiste', 'Retour': 'Zurück', 'Retour (Alt ←)': 'Zurück (Alt ←)', 'Rechercher (Ctrl+K)': 'Suchen (Strg+K)',
    'subjonctif, accord du participe, quoique…': 'subjonctif, Angleichung, quoique …', 'Échap': 'Esc', 'Ctrl K': 'Strg K', 'Ctrl Entrée': 'Strg Enter', 'Entrée': 'Enter', 'Maj': 'Umschalt',
    'Consultés récemment': 'Zuletzt angesehen', 'naviguer': 'auswählen', 'ouvrir': 'öffnen', 'ouvrir à côté': 'daneben öffnen', 'Fiches': 'Fiches',
    'Fiche': 'Fiche', 'Ouvrir en pleine page': 'Als ganze Seite öffnen', 'Fermer': 'Schließen', 'Ouvrir à côté': 'Daneben öffnen',
    'Texte à compléter': 'Lückentext', 'Questionnaire': 'Quiz', 'Associations': 'Zuordnung',
    'Sommaire': 'Register', 'Thème': 'Thema', 'Système': 'System', 'Clair': 'Hell', 'Sombre': 'Dunkel', 'Petite': 'Klein', 'Normale': 'Normal', 'Grande': 'Groß',
    // fiche
    'Ajouter aux favoris': 'Zu Favoriten', 'Favori': 'Favorit', 'Note': 'Notiz', 'Marquer comme lue': 'Als gelesen markieren', 'Lue': 'Gelesen',
    '← Précédente': '← Vorherige', 'Suivante →': 'Nächste →', 'Ma note': 'Meine Notiz', "S'entraîner": 'Üben', 'S’entraîner': 'Üben', 'Réseau': 'Netz',
    'Renvoie à': 'Verweist auf', 'Citée par': 'Zitiert von', 'Fiches apparentées': 'Verwandte Fiches', 'Aucun.': 'Keine.',
    'Même sujet, traité ailleurs dans le programme.': 'Gleiches Thema, an anderer Stelle behandelt.',
    'Aucun exercice ne renvoie à cette fiche.': 'Zu dieser Fiche gibt es keine eigene Übung.', 'Par les fiches voisines :': 'Über verwandte Fiches:',
    'Vos remarques, exemples, questions…': 'Deine Anmerkungen, Beispiele, Fragen …', 'Voir sur la carte': 'Auf der Karte zeigen',
    'Voisinage de la fiche dans le réseau': 'Umgebung der Fiche im Netz', 'Réseau de la fiche': 'Netz der Fiche', 'Cette fiche est encore vide.': 'Diese Fiche ist noch leer.',
    '{x} min de lecture': '{x} Min. Lesezeit', 'Ajoutée aux favoris': 'Zu Favoriten hinzugefügt', 'Retirée des favoris': 'Aus Favoriten entfernt',
    '+ {x} autres': '+ {x} weitere',
    // listes, sommaire, thèmes
    'Index des règles': 'Register der Regeln', 'Sommaire de A à Z': 'Register von A bis Z',
    'Filtrer : participe, que, accord…': 'Filtern: participe, que, accord …', 'Sommaire ({x})': 'Register ({x})', 'Toutes les fiches ({x})': 'Alle Fiches ({x})',
    'Thèmes': 'Themen', 'Le plan de la grammaire': 'Gliederung der Grammatik', 'Introduction →': 'Einführung →', 'Lire l’introduction du thème': 'Einführung zum Thema lesen',
    // accueil
    'Bienvenue': 'Willkommen', 'Par où commencer ?': 'Wo fange ich an?', 'Voir le plan': 'Gliederung ansehen', 'Faire le défi du jour': 'Tagesaufgabe machen', 'Masquer': 'Ausblenden',
    'Objectif du jour': 'Tagesziel', 'Objectif du jour atteint': 'Tagesziel erreicht', 'Bravo. Tout le reste est du bonus.': 'Super. Alles Weitere ist Bonus.',
    '{x} activités : exercice, défi, révision ou jeu': '{x} Aktivitäten: Übung, Tagesaufgabe, Wiederholung oder Spiel',
    'jours de suite': 'Tage in Folge', 'jour de suite': 'Tag in Folge', 'jours de suite · en jeu aujourd’hui': 'Tage in Folge · heute noch offen', 'jour de suite · en jeu aujourd’hui': 'Tag in Folge · heute noch offen',
    'Reprendre': 'Weitermachen', 'Pour commencer': 'Zum Einstieg', "À revoir aujourd'hui": 'Heute wiederholen', 'Rien en attente': 'Nichts offen',
    'Défi du jour': 'Tagesaufgabe', '10 questions, à faire': '10 Fragen, noch offen', 'Fait : {x}': 'Erledigt: {x}',
    'Grammaire française · Jan Wilsker-Wiesen': 'Französische Grammatik · Jan Wilsker-Wiesen',
    'fiches de règles': 'Regelfiches', 'exercices': 'Übungen', 'items à résoudre': 'Aufgaben', 'renvois entre textes': 'Verweise zwischen Texten',
    'Les grands thèmes': 'Die großen Themen', 'Tout le plan →': 'Ganze Gliederung →', 'Sommaire alphabétique': 'Alphabetisches Register',
    'Tous les exercices →': 'Alle Übungen →', 'Jouer avec la grammaire': 'Mit Grammatik spielen', 'Tous les jeux →': 'Alle Spiele →',
    '{x} lues': '{x} gelesen', 'Accord': 'Accord', 'Concordance': 'Concordance', 'Participe': 'Participe', 'Subjonctif': 'Subjonctif',
    // exercices
    'Entraînement': 'Training', 'Par notion': 'Nach Thema', 'Tous': 'Alle', 'À faire': 'Offen', 'À retravailler': 'Nacharbeiten', 'Réussis': 'Geschafft',
    'Voir toutes les notions': 'Alle Themen anzeigen', 'Aucun exercice dans cet état.': 'Keine Übung in diesem Zustand.', 'Changez de filtre pour voir les autres.': 'Wähle einen anderen Filter.',
    'Fiches de référence :': 'Passende Fiches:', 'À lire :': 'Zum Lesen:', 'Explications': 'Erklärungen',
    'Aide': 'Hilfe', 'Aide :': 'Hilfe:', 'Voir aussi': 'Siehe auch', 'Comment ça marche': 'So funktioniert’s',
    'Pas de fiche d’aide associée. Utilisez la recherche (Ctrl K).': 'Keine Hilfe-Fiche zugeordnet. Nutze die Suche (Strg K).',
    'ouvre la fiche à côté, sans quitter l’exercice.': 'öffnet die Fiche daneben, ohne die Übung zu verlassen.',
    '← Précédent': '← Vorherige', 'Suivant →': 'Nächste →', 'Texte de lecture': 'Lesetext', 'Mots à placer': 'Einzusetzende Wörter',
    'Vérifier': 'Prüfen', 'Indice': 'Tipp', 'Solutions': 'Lösungen', 'Confirmer : tout afficher': 'Bestätigen: alles zeigen', 'voir': 'zeigen',
    'Voir la réponse de cette lacune': 'Lösung dieser Lücke zeigen', 'Votre réponse': 'Deine Antwort', 'Recommencer': 'Noch einmal',
    'Parfait, du premier coup.': 'Perfekt, beim ersten Versuch.', 'Très bien. Encore un peu de précision et c’est acquis.': 'Sehr gut. Noch etwas genauer, dann sitzt es.',
    'C’est en bonne voie. Relisez la fiche d’aide, puis recommencez.': 'Auf gutem Weg. Lies die Hilfe-Fiche und versuch es noch einmal.',
    'Relisez la fiche d’aide avant de recommencer.': 'Lies die Hilfe-Fiche, bevor du es noch einmal versuchst.',
    '{x} rejoint « À revoir ».': '{x} kommt in „Wiederholen“.', '{x} rejoignent « À revoir ».': '{x} kommen in „Wiederholen“.',
    'Répondez à toutes les questions.': 'Beantworte alle Fragen.', 'Associez chaque début à sa fin.': 'Ordne jedem Anfang das passende Ende zu.',
    'Valider la sélection': 'Auswahl prüfen', 'Pas encore : vérifiez votre sélection.': 'Noch nicht ganz: Prüfe deine Auswahl.',
    'Question {x} / {y}': 'Frage {x} / {y}', 'Série {x} / {y}': 'Runde {x} / {y}', 'Signification des locutions': 'Bedeutung der Wendungen',
    '{x} · {y} encore à trouver': '{x} · {y} noch offen', '{x} encore à remplir': '{x} noch auszufüllen',
    'Meilleur score : {x}': 'Bestwert: {x}', 'Voir la règle : {x}': 'Regel ansehen: {x}', 'Réponse attendue :': 'Erwartete Antwort:',
    // jeux
    'Jouer': 'Spielen', 'Record : {x}': 'Rekord: {x}', 'Record : {x} coups': 'Rekord: {x} Züge', 'Record (tout le programme) : {x}': 'Rekord (alles): {x}',
    'Fait aujourd’hui : {x}': 'Heute erledigt: {x}', 'À faire aujourd’hui': 'Heute noch offen', '{x} à revoir': '{x} zu wiederholen',
    'Tiré de': 'Aus', 'Valider': 'Prüfen', 'Continuer': 'Weiter', 'Passer': 'Überspringen', 'Juste !': 'Richtig!', 'Juste.': 'Richtig.',
    'Pas tout à fait. Encore un essai.': 'Nicht ganz. Noch ein Versuch.', 'Non. Relisez la règle si besoin.': 'Nein. Lies bei Bedarf die Regel.',
    '· attendu :': '· erwartet:', 'Indice : {x}': 'Tipp: {x}', 'Rejouer': 'Nochmal spielen', 'Autres jeux': 'Andere Spiele', 'À revoir ({x})': 'Wiederholen ({x})',
    'Notion': 'Thema', 'Commencer': 'Starten', 'Arrêter': 'Beenden', 'Points': 'Punkte', 'Série': 'Serie', 'Record ici : {x}': 'Rekord hier: {x}', 'Pas encore de record ici': 'Hier noch kein Rekord',
    'Tout le programme ({x} phrases)': 'Alles ({x} Sätze)',
    'Partie arrêtée': 'Spiel beendet', 'Nouveau record !': 'Neuer Rekord!', 'Temps écoulé': 'Zeit abgelaufen', 'Série de {x} : +1 bonus': 'Serie von {x}: +1 Bonus',
    'Question': 'Frage', 'Justes': 'Richtig', 'Relever le défi': 'Tagesaufgabe starten', 'S’entraîner sur ce défi': 'Mit dieser Aufgabe üben',
    'Paires': 'Paare', 'Coups': 'Züge', 'coups': 'Züge', 'début': 'Anfang', 'fin': 'Ende', 'Locution': 'Wendung', 'Trouver la fin': 'Ende finden', 'Trouver le début': 'Anfang finden',
    'Quel est le début de cette expression ?': 'Wie beginnt diese Wendung?', 'Comment se termine cette expression ?': 'Wie endet diese Wendung?',
    'Signification non donnée dans le programme.': 'Bedeutung im Programm nicht angegeben.', 'Aucune erreur.': 'Kein Fehler.',
    'Étapes': 'Schritte', 'Minimum': 'Minimum', 'Objectif': 'Ziel', 'Vous êtes sur': 'Du bist auf', 'Lire': 'Lesen', 'Cette fiche renvoie à…': 'Diese Fiche verweist auf …',
    'Impasse ! Revenez en arrière.': 'Sackgasse! Geh einen Schritt zurück.', 'Revenir': 'Zurück', 'Montrer un chemin (−50 pts)': 'Weg zeigen (−50 Punkte)',
    'Aide utilisée : −50 pts': 'Hilfe genutzt: −50 Punkte', 'Un chemin possible': 'Ein möglicher Weg', 'Impossible de tirer un chemin, réessayez.': 'Kein Weg gefunden, bitte neu starten.',
    'Restants': 'Übrig', 'Séance terminée': 'Sitzung beendet', 'Retour à l’accueil': 'Zur Startseite', "Retour à l'accueil": 'Zur Startseite',
    'Rien à revoir aujourd’hui.': 'Heute ist nichts zu wiederholen.', 'Votre pile de révision est vide.': 'Dein Wiederholungsstapel ist leer.',
    'Faites quelques exercices : les lacunes manquées viendront s’y ranger.': 'Mach ein paar Übungen: Verpasste Lücken landen hier.',
    'Une course contre la montre ?': 'Wie wär’s mit einem Zeitrennen?', 'Ouvrir l’exercice': 'Übung öffnen', 'C’est fait, je l’ai réussie': 'Erledigt, ich habe sie geschafft', 'Pas encore': 'Noch nicht',
    'Encore {x}': 'Noch {x}',
    // carte
    'Trouver une fiche sur la carte…': 'Fiche auf der Karte finden …', 'Mes lectures': 'Gelesenes', 'Recentrer': 'Zentrieren', 'Mettre en évidence les fiches lues': 'Gelesene Fiches hervorheben',
    'Fiches du sommaire': 'Fiches aus dem Register', 'Lire la fiche': 'Fiche lesen', 'À côté': 'Daneben', 'Voisins ({x})': 'Nachbarn ({x})', 'Carte interactive des fiches de grammaire': 'Interaktive Karte der Grammatik-Fiches',
    // progression
    'Tableau de bord': 'Übersicht', 'Fiches lues': 'Gelesene Fiches', 'Exercices faits': 'Erledigte Übungen', 'Score moyen': 'Durchschnitt', 'meilleurs scores': 'Bestwerte',
    'Série en cours': 'Aktuelle Serie', 'Activité': 'Aktivität', 'Exercices par collection': 'Übungen nach Sammlung', 'Lecture par thème': 'Lesen nach Thema',
    'Les exercices sous 80 % apparaîtront ici.': 'Übungen unter 80 % erscheinen hier.', 'Favoris': 'Favoriten',
    'Ajoutez une fiche aux favoris avec l’étoile en haut de la fiche.': 'Mit dem Stern oben auf einer Fiche fügst du sie zu den Favoriten hinzu.', 'Mes notes': 'Meine Notizen',
    'Le bouton « Note » d’une fiche ouvre un bloc-notes personnel.': 'Der Knopf „Notiz“ auf einer Fiche öffnet einen persönlichen Notizblock.',
    'Réglages': 'Einstellungen', 'Taille du texte': 'Schriftgröße', 'Langue': 'Sprache', 'Afficher la barre d’accents pendant la saisie': 'Akzentleiste beim Tippen anzeigen',
    'Sauvegarde': 'Sicherung', 'Copier la sauvegarde': 'Sicherung kopieren', 'Importer…': 'Importieren …', 'Tout effacer…': 'Alles löschen …',
    'Sélectionnez le texte et copiez-le.': 'Markiere den Text und kopiere ihn.', 'Collez ici une sauvegarde…': 'Sicherung hier einfügen …', 'Fusionner avec ma progression': 'Mit meinem Fortschritt zusammenführen',
    'Depuis un fichier': 'Aus einer Datei', 'Effacer toute la progression de cet appareil et du compte ?': 'Gesamten Fortschritt auf diesem Gerät und im Konto löschen?',
    'Oui, tout effacer': 'Ja, alles löschen', 'Annuler': 'Abbrechen', 'Sauvegarde copiée dans le presse-papiers': 'Sicherung in die Zwischenablage kopiert',
    'Sauvegarde importée': 'Sicherung importiert', 'Ce texte n’est pas une sauvegarde valide.': 'Dieser Text ist keine gültige Sicherung.', 'Progression effacée': 'Fortschritt gelöscht',
    'sur {x}': 'von {x}', '{x} à 80 % ou plus': '{x} mit 80 % oder mehr',
    'Votre progression est enregistrée sur votre compte et vous suit d’un appareil à l’autre.': 'Dein Fortschritt wird in deinem Konto gespeichert und begleitet dich auf allen Geräten.',
    'Votre progression est enregistrée dans ce navigateur. Copiez une sauvegarde pour la transférer ailleurs.': 'Dein Fortschritt wird in diesem Browser gespeichert. Kopiere eine Sicherung, um ihn woanders weiterzuführen.',
    'Progression synchronisée sur votre compte': 'Fortschritt im Konto gespeichert', 'Synchronisation momentanément indisponible': 'Synchronisierung gerade nicht möglich',
    'Progression enregistrée dans ce navigateur': 'Fortschritt in diesem Browser gespeichert',
    // recherche
    'Recherche': 'Suche', 'Rechercher': 'Suchen', 'Tout': 'Alles', 'Mot, expression, règle…': 'Wort, Wendung, Regel …', 'Aucun résultat.': 'Keine Treffer.',
    'Essayez sans accents, au singulier, ou avec un seul mot.': 'Versuch es ohne Akzente, im Singular oder mit einem einzigen Wort.', 'Exercice': 'Übung',
    'Page introuvable': 'Seite nicht gefunden', 'Ce lien ne mène à aucune fiche ni aucun exercice.': 'Dieser Link führt zu keiner Fiche und keiner Übung.',
  };
  const PATTERNS = [];
  const PLAIN = {};
  for (const [k, v] of Object.entries(DICT)) {
    if (k.includes('{x}')) {
      const re = new RegExp('^' + k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('\\{x\\}', '(.+?)').replace('{x}', '(.+?)').replace('{y}', '(.+?)') + '$');
      PATTERNS.push([re, v]);
    } else PLAIN[k] = v;
  }
  function tr(s) {
    const t = s.replace(/\s+/g, ' ').trim();
    if (!t) return null;
    if (PLAIN[t] != null) return PLAIN[t];
    for (const [re, v] of PATTERNS) { const m = re.exec(t); if (m) return v.replace('{x}', m[1]).replace('{y}', m[2] || ''); }
    return null;
  }
  G.tr = (s) => (G.lang === 'de' ? tr(s) || s : s);

  // Lerninhalte nie übersetzen
  const SKIP = '.prose, .cloze, .ctx, .ctx-prev, .qt, .qopts, .match, .memo, .wordbank, .reveal b, .reveal s, .was, .flash-card .consigne, .memo-meaning, [data-raw], script, style, textarea, .gap, .mitem, .linklist .t, .ex-row .t b, .az-item, .tree-items, .search-hit, .pr .tx, .peek b, .peek p, .path-now, .path-opt, .path-trail, .path-ex, .map-card p, .map-card h3';
  G.translate = function (root) {
    if (G.lang !== 'de' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest(SKIP) && /[a-zà-ÿ]/i.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const r = tr(n.nodeValue);
      if (r != null) n.nodeValue = n.nodeValue.replace(/\S[\s\S]*\S|\S/, r);
    }
    const els = root.querySelectorAll ? root.querySelectorAll('[placeholder], [aria-label], [title]') : [];
    for (const el of [root, ...els]) {
      if (!el.getAttribute || (el.closest && el.closest('.prose, .cloze'))) continue;
      for (const a of ['placeholder', 'aria-label', 'title']) { const v = el.getAttribute(a); if (v) { const r = tr(v); if (r != null) el.setAttribute(a, r); } }
    }
  };
  // nachträglich eingefügte Bedienelemente (Toasts, Rückmeldungen, Seitenleiste) ebenfalls übersetzen
  const mo = new MutationObserver((muts) => {
    if (G.lang !== 'de') return;
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) G.translate(n);
        else if (n.nodeType === 3 && n.parentElement && !n.parentElement.closest(SKIP)) { const r = tr(n.nodeValue); if (r != null) n.nodeValue = r; }
      }
    }
  });
  G.startTranslateObserver = () => mo.observe(document.body, { childList: true, subtree: true, characterData: false });

  // Sprachwechsel : Einstellung speichern, Seite neu laden (Bedienelemente, Suche und Fiches in der neuen Sprache)
  G.setLang = function (lang) {
    G.S.data.prefs.lang = lang; G.S.save();
    if (G.S.remote) G.S._push();
    setTimeout(() => location.reload(), G.S.remote ? 400 : 0);
  };
})();

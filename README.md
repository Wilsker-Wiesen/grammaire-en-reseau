# Grammaire en réseau

Französische Grammatik als Netz: Regeln, Übungen und Spiele, die aufeinander verweisen. Ein Programm von Jan Wilsker-Wiesen, erstellt mit Claude.

**Web-App:** https://wilsker-wiesen.github.io/grammaire-en-reseau/ (installierbar, offline nutzbar). Jeder Push auf `main` veröffentlicht sie automatisch neu.

**Als Artifact:** https://claude.ai/artifact/RJpL9DiriCm42kpKqjq44T (nur mit eigenem Claude-Konto). Lokal: `python3 tools/build_site.py && python3 -m http.server 8765 --directory _site`.

## Inhalt

- **745 Regeln**, thematisch (fünf große Themen mit nummerierten Abschnitten) und alphabetisch (Sommaire von A bis Z).
- **380 Übungen** mit **5 874 Aufgaben**: Lückentexte (mit Eingabe oder Auswahlmenü), Fragebögen und Zuordnungen.
- **4 034 Verweise** zwischen den Texten, in beide Richtungen sichtbar.

## Funktionen

- Suche über alles (Strg K), akzentunabhängig.
- Passende Regel seitlich neben der Übung, Vorschau beim Überfahren von Links.
- Akzentleiste beim Tippen (à â ç é è ê ë î ï ô œ ù û ü …).
- Wiederholung mit Abstand (1, 3, 7, 16, 35 Tage), Tagesziel und Serie.
- Spiele: Redewendungs-Express (vier Spielarten, Lernkarten, Aussprache), Tagesquiz, Wettlauf gegen die Zeit, Redewendungs-Memo, Regelpfad.
- Regelnetz: Karte aller Regeln und ihrer Querverweise.
- Zweisprachig: Bedienung, Erklärungen und Anweisungen auf Deutsch oder Französisch (Umschalter oben); Beispiele, Übungssätze und Lösungen immer Französisch.
- Anleitung, Fortschrittsseite, Merkliste, Notizen, Hell- und Dunkelmodus, Offline-Modus.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `app/` | die App (läuft auch als Claude-Artifact), Daten in `app/data.js` |
| `tools/extract.py`, `tools/build.py` | erzeugen `app/data.js` aus dem Quellmaterial (nur lokal vorhanden) |
| `tools/build_de.py`, `tools/check_de.py` | bauen und prüfen die deutsche Fassung (`app/data_de.js`) aus `build/de/` |
| `tools/build_site.py` | baut `_site/` für GitHub Pages |
| `tools/make_icons.py` | erzeugt die App-Symbole |
| `KORREKTUREN.md` | Liste der korrigierten Tippfehler und Lösungen |

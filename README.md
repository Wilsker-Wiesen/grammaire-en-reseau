# Grammaire en réseau

Französische Grammatik als Netz: Regelfiches, Übungen und Spiele, die aufeinander verweisen. Ein Programm von Jan Wilsker-Wiesen, erstellt mit Claude.

Probeversion für den eigenen Gebrauch.

**Öffnen:** https://claude.ai/artifact/RJpL9DiriCm42kpKqjq44T (privat, nur mit eigenem Claude-Konto). Lokal: `python3 tools/build_site.py && python3 -m http.server 8765 --directory _site`.

Das Repository ist privat; GitHub Pages ist deshalb abgeschaltet und der Workflow `pages.yml` deaktiviert. Er lässt sich wieder einschalten, sobald das Programm öffentlich werden soll.

## Inhalt

- **745 Regelfiches**, thematisch (fünf große Themen mit nummerierten Abschnitten) und alphabetisch (Sommaire von A bis Z).
- **380 Übungen** mit **5 874 Aufgaben**: Lückentexte (mit Eingabe oder Auswahlmenü), Fragebögen und Zuordnungen.
- **4 034 Verweise** zwischen den Texten, in beide Richtungen sichtbar.

## Funktionen

- Suche über alles (Strg K), akzentunabhängig.
- Hilfe-Fiche seitlich neben der Übung, Vorschau beim Überfahren von Links.
- Akzentleiste beim Tippen (à â ç é è ê ë î ï ô œ ù û ü …).
- Wiederholung mit Abstand (1, 3, 7, 16, 35 Tage), Tagesziel und Serie.
- Spiele: Course contre la montre, Défi du jour, Le chemin des notions, Mémo und Locution express.
- Carte des notions: Karte aller Fiches und ihrer Verweise.
- Mode d’emploi, Fortschrittsseite, Favoriten, Notizen, Hell- und Dunkelmodus, Offline-Modus.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `app/` | die App (läuft auch als Claude-Artifact), Daten in `app/data.js` |
| `tools/extract.py`, `tools/build.py` | erzeugen `app/data.js` aus dem Quellmaterial (nur lokal vorhanden) |
| `tools/build_site.py` | baut `_site/` für GitHub Pages |
| `tools/make_icons.py` | erzeugt die App-Symbole |
| `KORREKTUREN.md` | Liste der korrigierten Tippfehler und Lösungen |

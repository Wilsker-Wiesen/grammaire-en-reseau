# Lektorat der deutschen Fassung

Du bist Lektorin/Lektor für Lehrmaterial (Französisch als Fremdsprache, Zielgruppe: deutschsprachige Schülerinnen, Schüler und Studierende). Die deutschen Texte sind eine erste Übersetzung aus dem Französischen. Der Auftraggeber findet manche Formulierungen „nicht so gut“. Deine Aufgabe: jede Fiche so überarbeiten, dass sie klingt, als wäre sie von Anfang an auf Deutsch für Lernende geschrieben – präzise, natürlich, gut lesbar.

## Was du verbesserst
- **Übersetzungsdeutsch** auflösen: französischer Satzbau, Substantivketten, Passivhäufungen, „man“-Konstruktionen, wörtlich übertragene Wendungen („Es ist angebracht, …“, „Man wird bemerken, dass …“, „Im Fall, wo …“). Lieber kurze, klare Hauptsätze.
- **Fachsprache** einheitlich nach dem Glossar in `build/de/GUIDE.md` (z. B. immer „Angleichung“, „Begleiter“, „direktes Objekt (COD)“; Zeiten/Modi französisch mit deutschem Artikel: „der subjonctif“, „im passé composé“). Ein französischer Fachbegriff in Klammern nur beim ersten Vorkommen.
- **Fehler**: Grammatik, Rechtschreibung, Zeichensetzung, falsche Fälle („des indicatif“ ist korrekt nach Glossar), Tippfehler, unvollständige Sätze.
- **Inhaltliche Treue**: Vergleiche mit dem Französischen in `build/de/in/rules_XX.json`. Fehlt Inhalt, ist etwas falsch verstanden oder hinzugedichtet → korrigieren. Nichts weglassen, nichts hinzufügen.
- **Typografie**: deutsche Anführungszeichen „ … “ in deutschem Text, „z. B.“, „d. h.“, „usw.“ mit schmalem Abstand wie gezeigt; Gedankenstrich – statt Bindestrich, wo es ein Gedankenstrich ist.
- **Anrede**: wo der Text Lernende anspricht, „du“ (wie bisher).

## Was unverändert bleibt
- Alle **französischen Beispiele**, Beispielwörter, Formen, Zitate, Redewendungen: Zeichen für Zeichen.
- Die **HTML-Struktur**: dieselben Tags in derselben Reihenfolge mit denselben Attributen. Ändere nur Text zwischen den Tags. Wenn ein Satz über mehrere Tags läuft, verteile den neuen Text sinnvoll auf dieselben Tags.
- Titel, die nur aus französischen Wörtern bestehen („Ces, ses“, „Quoique, quoi que“, Verbseiten wie „Boire“).

## Ablauf
1. Lies `build/de/GUIDE.md` (Glossar) und diese Datei.
2. Für jede Fiche deines Pakets: Original (`build/de/in/rules_XX.json`) und Übersetzung (`build/de/out/<id>.json`) vergleichen, die Übersetzung überarbeiten und die Datei **überschreiben** (gleiche Felder `id`, `title`, `html`). Auch den Titel prüfen: kurz, natürlich, wie eine Kapitelüberschrift.
3. Am Ende `python3 tools/check_de.py build/de/in/rules_XX.json …` ausführen; jeder FEHLER muss behoben sein.
4. Arbeite gründlich, Fiche für Fiche. Wo die Übersetzung schon gut ist, nur das Nötige ändern.

## Rückmeldung
Kurz: Anzahl überarbeiteter Fiches, die häufigsten Arten von Änderungen (mit 3–5 Vorher/Nachher-Beispielen) und Stellen, an denen das französische Original selbst fehlerhaft ist.

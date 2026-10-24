"""Baut app/data_de.js: deutsche Fassung der Fiches und Bezeichnungen.

Liest build/de/out/<id>.json (Fiches) und build/de/out/strings_*.json (Titel, Anweisungen, Register).
Eine Fiche wird nur übernommen, wenn ihre HTML-Struktur exakt der französischen entspricht;
sonst bleibt sie französisch (und wird gemeldet).

Aufruf: .venv/bin/python tools/build_de.py   (nach tools/build.py)
"""
import glob
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
from check_de import tags  # noqa: E402

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'build', 'de', 'out')

# deutsche Knopfnamen der App statt der französischen in übersetzten Anweisungen
# einzelne Titel, die alleinstehend besser so lauten
OVERRIDES = {
    "Présent de l'indicatif": 'Présent (indicatif)',
    "Conjugaison - Présent de l'indicatif": 'Konjugation – présent (indicatif)',
}
UI_TERMS = [('„Vérifier“', '„Prüfen“'), ('"Vérifier"', '„Prüfen“'), ('„Indice“', '„Tipp“'), ('"Indice"', '„Tipp“')]


def main():
    data = json.loads(open(os.path.join(ROOT, 'app', 'data.js')).read()[len('window.GRAMMAIRE='):-2])
    rules, ok, bad, missing = {}, 0, [], []
    for rid, r in data['rules'].items():
        if r.get('stub'):
            continue
        p = os.path.join(OUT, rid + '.json')
        if not os.path.exists(p):
            missing.append(rid); continue
        try:
            t = json.load(open(p))
        except ValueError:
            bad.append(rid); continue
        if tags(t.get('html', '')) != tags(r['html']) or not t.get('title'):
            bad.append(rid); continue
        rules[rid] = {'title': t['title'].strip(), 'html': t['html']}
        ok += 1
    strings = {}
    for f in sorted(glob.glob(os.path.join(OUT, 'strings_*.json'))):
        strings.update(json.load(open(f)))
    strings.update(OVERRIDES)
    for k, v in list(strings.items()):
        for a, b in UI_TERMS:
            v = v.replace(a, b)
        strings[k] = v
    js = 'window.GRAMMAIRE_DE=' + json.dumps({'rules': rules, 'str': strings}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'app', 'data_de.js'), 'w').write(js)
    print(f'data_de.js : {ok} Fiches übernommen, {len(bad)} wegen Strukturabweichung ausgelassen, {len(missing)} fehlen ; {len(strings)} Bezeichnungen ; {len(js) / 1e6:.2f} MB')
    if bad:
        print('  abweichend:', ', '.join(bad[:30]) + (' …' if len(bad) > 30 else ''))


if __name__ == '__main__':
    main()

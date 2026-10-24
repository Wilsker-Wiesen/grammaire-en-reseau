"""Prüft übersetzte Fiches gegen das französische Original.

Aufruf: python3 tools/check_de.py build/de/in/rules_03.json   (prüft alle Fiches dieses Pakets)
Erwartet je Fiche build/de/out/<id>.json mit {"id", "title", "html"}.
Fehler (FEHLER) müssen behoben werden; Hinweise (HINWEIS) prüfen.
"""
import json
import os
import re
import sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'build', 'de', 'out')
TAG = re.compile(r'<(/?)([a-zA-Z0-9]+)([^>]*)>')
DE_WORDS = re.compile(r'\b(der|die|das|und|ist|nicht|wird|werden|ein|eine|mit|bei|nach|auch|sich|dem|den|des|im|zum|zur|wenn|oder|man)\b', re.I)


def tags(h):
    return [(m.group(1), m.group(2).lower(), re.sub(r'\s+', ' ', m.group(3)).strip()) for m in TAG.finditer(h)]


def plain(h):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()


def check(src):
    bad = 0
    for r in json.load(open(src)):
        p = os.path.join(OUT, r['id'] + '.json')
        if not os.path.exists(p):
            print('FEHLER fehlt:', r['id']); bad += 1; continue
        try:
            t = json.load(open(p))
        except Exception as e:  # noqa
            print('FEHLER JSON:', r['id'], e); bad += 1; continue
        if t.get('id') != r['id'] or not t.get('title') or 'html' not in t:
            print('FEHLER Felder:', r['id']); bad += 1; continue
        a, b = tags(r['html']), tags(t['html'])
        if a != b:
            k = next((i for i, (x, y) in enumerate(zip(a, b)) if x != y), min(len(a), len(b)))
            print(f'FEHLER HTML-Struktur: {r["id"]} (Tag {k}: original {a[k] if k < len(a) else "-"} / übersetzt {b[k] if k < len(b) else "-"})'); bad += 1
            continue
        fr, de = plain(r['html']), plain(t['html'])
        if len(fr) > 200:
            ratio = len(de) / max(1, len(fr))
            if ratio < 0.6 or ratio > 1.9:
                print(f'HINWEIS Länge {ratio:.2f}: {r["id"]}')
            if len(DE_WORDS.findall(de)) < max(3, len(de.split()) // 40):
                print(f'HINWEIS wenig Deutsch erkennbar: {r["id"]}')
    print(f'{src}: {"OK" if not bad else str(bad) + " Fehler"}')
    return bad


if __name__ == '__main__':
    sys.exit(1 if sum(check(s) for s in sys.argv[1:]) else 0)

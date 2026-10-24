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

MOJIBAKE = {'à' + ch: chr(ord(ch.encode('cp1252')) + 0x40) for ch in '§¹Š»¢€«ˆ'}

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
        html = t['html']
        for a, b in MOJIBAKE.items():
            html = html.replace(a, b)
        html = html.replace('dans répétée. mon café', 'dans mon café')
        title = t['title'].strip()
        # Verbseiten heißen in beiden Sprachen nach dem französischen Infinitiv
        if not title or title.startswith(('Inhalt', 'Sommaire', 'Register')) or rid.startswith('verbe-') or rid == 'finir':
            title = r['title']  # Fehltitel des Originals : korrigierter (französischer) Titel
        rules[rid] = {'title': title, 'html': html}
        ok += 1
    strings = {}
    for f in sorted(glob.glob(os.path.join(OUT, 'strings_*.json'))):
        strings.update(json.load(open(f)))
    strings.update(OVERRIDES)
    for k, v in list(strings.items()):
        for a, b in UI_TERMS:
            v = v.replace(a, b)
        strings[k] = v
    # deutsche Bedeutungen der Redewendungen : Tabellenzeilen der übersetzten Erklärseiten, Zeile für Zeile neben der französischen
    import unicodedata
    lkey = lambda t: re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', t.lower()).encode('ascii', 'ignore').decode())
    plain = lambda h: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h.replace('<br/>', ' / '))).strip()
    meanings = {}
    for n in (1, 2):
        rid = f'locutions{n}-explications'
        if rid not in rules: continue
        fr_rows = re.findall(r'<tr>(.*?)</tr>', data['rules'][rid]['html'], re.S)
        de_rows = re.findall(r'<tr>(.*?)</tr>', rules[rid]['html'], re.S)
        for fr, de in zip(fr_rows, de_rows):
            fc, dc = re.findall(r'<td[^>]*>(.*?)</td>', fr, re.S), re.findall(r'<td[^>]*>(.*?)</td>', de, re.S)
            if len(fc) >= 3 and '«' in fc[1] and len(dc) >= 3:
                meanings[lkey(plain(fc[1]))] = plain(dc[2])
    extra = {k: v for k, v in json.load(open(os.path.join(ROOT, 'tools', 'locutions_sens.json'))).items() if not k.startswith('_')}
    for expr, v in extra.items():
        meanings[lkey(expr)] = v['de']
    if 'locutions3-explications' in data['rules']:
        from html import escape
        rows = ''.join(f'<tr><td><p class="center">{i}</p></td><td>« {escape(expr)} »</td><td>{escape(v["de"])} <a href="{v["src"]}">Quelle</a></td></tr>'
                       for i, (expr, v) in enumerate(extra.items(), 41))
        rules['locutions3-explications'] = {'title': 'Bedeutung der Wendungen 3', 'html': '<p><a href="#/exercice/locutions3">locutions3.htm</a></p><div class="box t-blue"><p>Ergänzte Bedeutungen: Die ursprüngliche Seite enthielt versehentlich die Wendungen aus Teil 2.</p></div><table class="tbl"><tr><td class="t-orange" colspan="2"><p class="center">Wendungen</p></td><td class="t-orange"><p class="center">Bedeutung</p></td></tr>' + rows + '</table>'}
    js = 'window.GRAMMAIRE_DE=' + json.dumps({'rules': rules, 'str': strings, 'meanings': meanings}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'app', 'data_de.js'), 'w').write(js)
    print(f'data_de.js : {ok} Fiches übernommen, {len(bad)} wegen Strukturabweichung ausgelassen, {len(missing)} fehlen ; {len(strings)} Bezeichnungen ; {len(js) / 1e6:.2f} MB')
    if bad:
        print('  abweichend:', ', '.join(bad[:30]) + (' …' if len(bad) > 30 else ''))


if __name__ == '__main__':
    main()

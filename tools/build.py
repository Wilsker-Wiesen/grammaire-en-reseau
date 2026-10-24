"""Assemble l'application : enrichit les données (réseau de liens, parcours, carte) et écrit app/data.js.

Usage : .venv/bin/python tools/build.py   (après tools/extract.py) ; écrit app/data.js et app/assets/
"""
import os, re, json, shutil, hashlib, collections, unicodedata
from html import escape as html_esc
import numpy as np

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
BUILD = os.path.join(ROOT, 'build')
APP = os.path.join(ROOT, 'app')

LINK = re.compile(r'href="#/(regle|exercice)/([^"/]+)(?:/[^"]*)?"')


def plain(h):
    t = re.sub(r'<[^>]+>', ' ', h)
    return re.sub(r'\s+', ' ', t).strip()


def sortkey(s):
    s = unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9 ]', '', s).strip()


# Tippfehler des Originals (nur eindeutige Fälle). Angewandt auf Titel, Anweisungen, Register und Texte.
TYPOS = [
    ('Complétez les phases', 'Complétez les phrases'),
    ('conjurgaison', 'conjugaison'),
    ('Complétez Ies phrases', 'Complétez les phrases'),
    ('futur simpleet', 'futur simple et'),
    ('terminaisonau', 'terminaison au'),
    ('numéralou', 'numéral ou'),
    ('typede pronom', 'type de pronom'),
    ('approprié.Afin', 'approprié. Afin'),
    ('l’indicatifen', 'l’indicatif en'),
    ('les motspar', 'les mots par'),
    ('subordonné complétive', 'subordonnée complétive'),
    ('Subjonctif present-Subjonctif passe', 'Subjonctif présent – subjonctif passé'),
    ('Subjonctif et l-expression de la pensee', "Subjonctif et l'expression de la pensée"),
    ("l-ordre, le désir", "l'ordre, le désir"),
    ('Pronom personnels', 'Pronoms personnels'),
    ('L-article', "L'article"),
    ('Verbes defectifs', 'Verbes défectifs'),
    ('VOS PARTICIPES PASSES?', 'VOS PARTICIPES PASSÉS ?'),
    ('Avec, à , et', 'Avec, à, et'),
    ('Ça, çà , sa', 'Ça, çà, sa'),
    ('Ca ne casse pas', 'Ça ne casse pas'),
    ('Etre un ours', 'Être un ours'),
    ('). le subjonctif est essentiellement', '). Le subjonctif est essentiellement'),
    ('Participe passé précédé de "en "', 'Participe passé précédé de "en"'),
]
TITLE_TYPOS = {'Sommaire': None, 'Hair': 'Haïr', 'Vetir': 'Vêtir', 'Ensuivre s': "S'ensuivre", 'Participe passé précédé de "en': 'Participe passé précédé de "en"'}
FIXED = collections.Counter()
# Fehler im Lösungsschlüssel des Originals (Übung, Lücke): (falsch, richtig)
ANSWER_FIX = {
    ('conjugaison-futur-3', 12): ('rendrons', 'rendront'),  # « Tes amis te (rendre) … visite »
    ('conditionnel-2', 1): ('se seraient pas trompés', 'ne se seraient pas trompés'),  # « ils (ne pas SE TROMPER) »
}
ANSWERS_FIXED = []


# Zeichen, die im Quellmaterial durch eine falsche Kodierung zerstört wurden: « à » + Folgezeichen
# (z. B. « àŠtre » → « Être », « coà»ts » → « coûts »). « à… » ist echt (« voilà… ») und bleibt.
MOJIBAKE = {'à' + ch: chr(ord(ch.encode('cp1252')) + 0x40) for ch in '§¹Š»¢€«ˆ'}
# in eine Nachbarzelle verrutschter Text
SHIFTED = [(re.compile(r'(ou souvent)(\s*</td>\s*<td><em>Je ne prends jamais de lait dans) répétée\. (mon café\.)'), r'\1 répétée.\2 \3')]


def fix_text(t):
    if not t: return t
    for a, b in TYPOS:
        if a in t:
            FIXED[f'{a} → {b}'] += t.count(a); t = t.replace(a, b)
    for a, b in MOJIBAKE.items():
        if a in t:
            FIXED[f'Kodierungsfehler {a} → {b}'] += t.count(a); t = t.replace(a, b)
    for rx, rep in SHIFTED:
        t, n = rx.subn(rep, t)
        if n: FIXED['verrutschtes « répétée. » in den Erklärtext zurückgesetzt'] += n
    return t


# Fiches ohne brauchbaren Titel im Quellmaterial
TITLE_BY_ID = {
    'meme-adjectif-pronom-adverbe-2': 'Même – adjectif, pronom, adverbe',
    'subjonctif-conjonctions-de-subordination-tableau': 'Subjonctif – conjonctions de subordination (tableau)',
    'finir': 'Finir',
}


def fix_title(t, rid=None):
    if rid in TITLE_BY_ID:
        FIXED[f'Titel „{t}“ → „{TITLE_BY_ID[rid]}“'] += 1
        return TITLE_BY_ID[rid]
    t = fix_text(t)
    if t.startswith('Sommaire') and rid and rid.startswith('verbe-'):
        new = {'acquerir': 'Acquérir'}.get(rid[6:], rid[6:].replace('-', ' ').capitalize())
        FIXED[f'Titel „{t}“ → „{new}“'] += 1
        return new
    if TITLE_TYPOS.get(t):
        FIXED[f'{t} → {TITLE_TYPOS[t]}'] += 1; t = TITLE_TYPOS[t]
    return t


def main():
    d = json.load(open(os.path.join(BUILD, 'data.json')))
    rules, exercises, nav = d['rules'], d['exercises'], d['nav']

    # ---------------------------------------------------------------- tippfehler
    for r in rules.values():
        r['title'] = fix_title(r['title'], r['id']); r['html'] = fix_text(r['html'])
    for e in exercises.values():
        for key in ('title', 'subtitle', 'instructions', 'body', 'reading'):
            if e.get(key): e[key] = fix_text(e[key])
        for h_ in e.get('help', []): h_['label'] = fix_title(h_['label'])
        if e.get('pairs'): e['pairs'] = [[fix_text(a), fix_text(b)] for a, b in e['pairs']]
    for (eid, gi), (bad, good) in ANSWER_FIX.items():
        g = exercises[eid]['gaps'][gi]
        if bad in g['a']:
            g['a'] = [good if a == bad else a for a in g['a']]
            ANSWERS_FIXED.append(f'| {exercises[eid]["file"]} | Lücke {gi + 1} | {bad} | {good} |')
    for en in nav['sommaire']:
        en['label'] = fix_title(en['label'])
        for sb in en['sub']: sb['label'] = fix_title(sb['label'])
    for th in nav['themes']:
        for sec in th['sections']:
            for c in sec['children']:
                if c.get('title'): c['title'] = fix_title(c['title'])
    for c in nav['catalogue']:
        for it in c['items']: it['desc'] = fix_text(it['desc'])
    for key in ('coursI', 'coursII', 'textes', 'locutions'):
        for it in nav[key]: it['desc'] = fix_text(it['desc'])

    # ---------------------------------------------------------------- titres : numérotation retirée (le plan l'affiche)
    for r in rules.values():
        r['title'] = re.sub(r'^\d+(\.\d+)*\.?\s+(?=\D)', '', r['title']).strip()
    for th in nav['themes']:
        for sec in th['sections']:
            for c in sec['children']:
                if c.get('title'): c['title'] = re.sub(r'^\d+(\.\d+)*\.?\s+(?=\D)', '', c['title']).strip()

    # ---------------------------------------------------------------- doublons et fiches vides
    alias = {}
    groups = collections.defaultdict(list)
    for k, r in rules.items():
        groups[hashlib.md5(re.sub(r'\s', '', r['html']).encode()).hexdigest()].append(k)
    for ks in groups.values():
        if len(ks) > 1 and plain(rules[ks[0]]['html']):
            ks.sort(key=lambda k: (k.endswith('-2'), len(k)))
            for k in ks[1:]:
                alias[k] = ks[0]
    for k, r in rules.items():
        txt = plain(r['html'])
        if len(txt) < 40 or txt.startswith('HTML PUBLIC'):
            r['stub'] = True
    for k in alias:
        rules.pop(k)

    def canon_html(h):
        return re.sub(r'href="#/regle/([^"/]+)', lambda m: f'href="#/regle/{alias.get(m.group(1), m.group(1))}', h)

    for r in rules.values():
        r['html'] = canon_html(r['html'])
    for e in exercises.values():
        for key in ('body', 'instructions', 'subtitle', 'reading'):
            if e.get(key): e[key] = canon_html(e[key])
        for h in e.get('help', []) + e.get('nav', []):
            h['href'] = canon_html(f'href="{h["href"]}"')[6:-1]

    def fix_href(h):
        m = re.match(r'#/regle/([^/]+)(.*)', h or '')
        return f'#/regle/{alias.get(m.group(1), m.group(1))}{m.group(2)}' if m else h

    # ---------------------------------------------------------------- graphe des liens
    out_r = collections.defaultdict(set); out_e = collections.defaultdict(set)
    for k, r in rules.items():
        for kind, t in LINK.findall(r['html']):
            if kind == 'regle' and t in rules and t != k: out_r[k].add(t)
            if kind == 'exercice' and t in exercises: out_e[k].add(t)
    ex_rules = collections.defaultdict(list)
    for k, e in exercises.items():
        seen = []
        for h in e.get('help', []):
            m = re.match(r'#/regle/([^/]+)', h['href'])
            if m and m.group(1) in rules and m.group(1) not in seen: seen.append(m.group(1))
        for key in ('body', 'instructions', 'reading', 'subtitle'):
            for kind, t in LINK.findall(e.get(key, '')):
                if kind == 'regle' and t in rules and t not in seen: seen.append(t)
        ex_rules[k] = seen
    in_r = collections.defaultdict(set)
    for a, ts in out_r.items():
        for t in ts: in_r[t].add(a)
    rule_ex = collections.defaultdict(set)
    for e, rs in ex_rules.items():
        for r in rs: rule_ex[r].add(e)
    for k, ts in out_e.items():
        for t in ts: rule_ex[k].add(t)

    # ---------------------------------------------------------------- parcours thématiques
    theme_of = {}
    for ti, th in enumerate(nav['themes']):
        if th.get('intro'): th['intro'] = alias.get(th['intro'], th['intro'])
        for si, sec in enumerate(th['sections']):
            if sec.get('id'): sec['id'] = alias.get(sec['id'], sec['id'])
            sec['children'] = [c for c in sec['children'] if alias.get(c['id'], c['id']) in rules]
            for c in sec['children']:
                c['id'] = alias.get(c['id'], c['id'])
                theme_of.setdefault(c['id'], [ti, si])
            if sec.get('id'): theme_of.setdefault(sec['id'], [ti, si])
        if th.get('intro'): theme_of.setdefault(th['intro'], [ti, -1])

    for e in nav['sommaire']:
        e['href'] = fix_href(e['href'])
        for s in e['sub']: s['href'] = fix_href(s['href'])
    in_sommaire = set()
    for e in nav['sommaire']:
        for h in [e['href']] + [s['href'] for s in e['sub']]:
            m = re.match(r'#/regle/([^/]+)', h or '')
            if m: in_sommaire.add(m.group(1))

    # ---------------------------------------------------------------- exercices : collections
    ex_meta = {k: {'cols': []} for k in exercises}
    collections_ = []

    def add_col(cid, title, desc, groups_):
        col = {'id': cid, 'title': title, 'desc': desc, 'groups': []}
        for gtitle, items in groups_:
            g = {'title': gtitle, 'items': []}
            for it in items:
                m = re.match(r'#/exercice/([^/]+)', it['href'])
                if m and m.group(1) in exercises:
                    eid = m.group(1)
                    g['items'].append({'id': eid, 'desc': it.get('desc', '')})
                    if cid not in ex_meta[eid]['cols']: ex_meta[eid]['cols'].append(cid)
                elif it.get('href', '').startswith('#/regle/'):
                    g.setdefault('refs', []).append({'href': fix_href(it['href']), 'desc': it.get('desc', '')})
            if g['items'] or g.get('refs'): col['groups'].append(g)
        collections_.append(col)
        return col

    add_col('themes', 'Exercices par thème',
            "L'index des exercices de grammaire, classés par notion.",
            [(c['title'], c['items']) for c in nav['catalogue']])
    add_col('cours-1', 'Cours de grammaire I', 'Les exercices du premier cours, dans leur ordre de progression.',
            [('Cours I', nav['coursI'])])

    def strip_num(desc):
        return re.sub(r'^(GrammII\.\d+\s*(Grammaire)?\s*)', '', desc).strip()
    add_col('cours-2', 'Cours de grammaire II', 'Les exercices du second cours, avec leurs variantes « aide » (menu déroulant).',
            [('Cours II', [dict(i, desc=strip_num(i['desc'])) for i in nav['coursII']])])
    add_col('textes', 'Textes à trous', 'Des textes complets à compléter, en trois niveaux : avec menu, avec vocabulaire, sans aide.',
            [('Textes', nav['textes'])])
    add_col('locutions', 'Expressions et locutions', 'Retrouvez la fin des expressions françaises, puis lisez leur signification.',
            [('Locutions', nav['locutions'])])
    # exercices hors index
    orphans = sorted((k for k, m in ex_meta.items() if not m['cols']), key=lambda k: sortkey(exercises[k]['title']))
    if orphans:
        add_col('autres', 'Autres exercices', "Exercices supplémentaires, hors des grandes collections.",
                [('Autres', [{'href': '#/exercice/' + k, 'desc': ''} for k in orphans])])

    for k, m in ex_meta.items():
        e = exercises[k]
        e['cols'] = m['cols']
        e['rules'] = ex_rules.get(k, [])
        e['help'] = [dict(h, href=fix_href(h['href'])) for h in e.get('help', [])]
        n = 0
        if e['type'] == 'cloze': n = len(e['gaps'])
        elif e['type'] == 'quiz': n = len(e['questions'])
        elif e['type'] == 'match': n = len(e['pairs'])
        e['n'] = n
    for col in collections_:
        if col['id'] == 'themes':
            for g in col['groups']:
                for it in g['items']:
                    exercises[it['id']].setdefault('cat', g['title'])
                # fiches de référence de la catégorie : règles les plus citées par ses exercices
                cnt = collections.Counter(r for it in g['items'] for r in exercises[it['id']]['rules'])
                g['rules'] = [r for r, _ in cnt.most_common(6)]

    # ---------------------------------------------------------------- fiches : métadonnées
    for k, r in rules.items():
        r['out'] = sorted(out_r.get(k, ()))
        r['in'] = sorted(in_r.get(k, ()))
        r['ex'] = sorted(rule_ex.get(k, ()), key=lambda e: sortkey(exercises[e]['title']))
        if k in theme_of: r['th'] = theme_of[k]
        r['words'] = len(plain(r['html']).split())
    # fiches apparentées : titres presque identiques entre la partie thématique et le sommaire
    STOP = {'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'au', 'aux', 'en', 'avec', 'par', 'pour', 'sur',
            'tableau', 'definition', 'generalites', 'regles', 'generales', 'cas', 'particuliers', 'principales', 'emploi', 'l', 'd'}
    def toks(t):
        return {w for w in re.split(r"[^a-z]+", sortkey(t).replace("'", ' ')) if len(w) > 1 and w not in STOP}
    TK = {k: toks(r['title']) for k, r in rules.items() if not r.get('stub')}
    for k, r in rules.items():
        a = TK.get(k)
        if not a: continue
        cand = []
        for k2, b in TK.items():
            if k2 == k or not b or k2 in r['out'] or k2 in r['in']: continue
            j = len(a & b) / len(a | b)
            if j >= 0.6 and (k.startswith(tuple('0123456789')) != k2.startswith(tuple('0123456789'))):
                cand.append((j, k2))
        r['sim'] = [k2 for _, k2 in sorted(cand, reverse=True)[:3]]
    # exercices voisins : ceux des fiches reliées, quand la fiche n'en a pas (ou peu) en propre
    for k, r in rules.items():
        if len(r['ex']) >= 4: continue
        cnt = collections.Counter()
        for n in set(r['out']) | set(r['in']) | set(r.get('sim', [])):
            for e in rules[n]['ex'] if n in rules else []:
                if e not in r['ex']: cnt[e] += 2 if n in r.get('sim', []) else 1
        r['ex2'] = [e for e, _ in sorted(cnt.items(), key=lambda x: (-x[1], sortkey(exercises[x[0]]['title'])))[:6]]

    # ---------------------------------------------------------------- carte des notions (disposition par forces)
    nodes = [k for k, r in rules.items() if not r.get('stub') and (out_r.get(k) or in_r.get(k))]
    idx = {k: i for i, k in enumerate(nodes)}
    edges = sorted({tuple(sorted((idx[a], idx[b]))) for a, ts in out_r.items() if a in idx for b in ts if b in idx})
    pos = force_layout(len(nodes), edges, [rules[k].get('th', [9, 0])[0] for k in nodes])
    graph = {'nodes': [[k, round(float(x), 1), round(float(y), 1), rules[k].get('th', [-1])[0],
                        len(in_r.get(k, ())) + len(out_r.get(k, ()))] for k, (x, y) in zip(nodes, pos)],
             'edges': [list(e) for e in edges]}

    # significations des locutions (tableaux des pages « explications ») : clé = expression sans ponctuation
    meanings = {}
    lkey = lambda t: re.sub(r'[^a-z]', '', sortkey(t))
    for n in (1, 2, 3):
        r = rules.get(f'locutions{n}-explications')
        if not r: continue
        for row in re.findall(r'<tr>(.*?)</tr>', r['html'], re.S):
            cells = re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)
            if len(cells) >= 3 and '«' in cells[1]:
                meanings[lkey(plain(cells[1]))] = plain(cells[2].replace('<br/>', ' / '))
    # ergänzte Bedeutungen (Locutions 3 : die Erklärseite des Quellmaterials war eine Kopie von Teil 2)
    extra = {k: v for k, v in json.load(open(os.path.join(ROOT, 'tools', 'locutions_sens.json'))).items() if not k.startswith('_')}
    for expr, v in extra.items():
        meanings[lkey(expr)] = v['fr']
    if 'locutions3-explications' in rules:
        rows = ''.join(f'<tr><td><p class="center">{i}</p></td><td>« {html_esc(expr)} »</td><td>{html_esc(v["fr"])} <a href="{v["src"]}">source</a></td></tr>'
                       for i, (expr, v) in enumerate(extra.items(), 41))
        rules['locutions3-explications']['html'] = ('<p><a href="#/exercice/locutions3">locutions3.htm</a></p><div class="box t-blue"><p>Significations ajoutées : '
            'la page d’origine reprenait par erreur les locutions de la série 2.</p></div><table class="tbl"><tr><td class="t-orange" colspan="2"><p class="center">Expressions, locutions</p></td>'
            '<td class="t-orange"><p class="center">Significations</p></td></tr>' + rows + '</table>')
        rules['locutions3-explications']['added'] = True
    found = sum(1 for e in exercises.values() for a, b in e.get('pairs', []) if lkey(a + ' ' + b) in meanings)
    print(f'significations : {len(meanings)} (dont {found} reliées aux paires) ; ', end='')

    data = {
        'version': 1,
        'rules': rules, 'exercises': exercises,
        'themes': nav['themes'], 'sommaire': nav['sommaire'],
        'collections': collections_, 'graph': graph, 'alias': alias, 'meanings': meanings,
        'stats': {'rules': sum(1 for r in rules.values() if not r.get('stub')), 'exercises': len(exercises),
                  'items': sum(e['n'] for e in exercises.values()),
                  'links': sum(len(v) for v in out_r.values()) + sum(len(v) for v in ex_rules.values())},
    }

    # ---------------------------------------------------------------- sortie (fichiers générés dans app/)
    js = 'window.GRAMMAIRE=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(APP, 'data.js'), 'w').write(js)
    if os.path.isdir(os.path.join(BUILD, 'assets')):
        shutil.copytree(os.path.join(BUILD, 'assets'), os.path.join(APP, 'assets'), dirs_exist_ok=True)
    with open(os.path.join(ROOT, 'KORREKTUREN.md'), 'w') as fh:
        fh.write('# Korrekturen\n\nAutomatisch erzeugt von `tools/build.py`: korrigierte Tippfehler, Lösungen und zusammengeführte Doppelseiten im Quellmaterial.\n\n')
        fh.write('## Tippfehler\n\n| Korrektur | Vorkommen |\n|---|---|\n')
        for k, v in sorted(FIXED.items()): fh.write(f'| {k} | {v} |\n')
        fh.write('\n## Fehler im Lösungsschlüssel\n\n| Übung | Lücke | vorher | korrigiert |\n|---|---|---|---|\n')
        for line in ANSWERS_FIXED: fh.write(line + '\n')
        fh.write('\n## Zusammengeführte Doppelseiten\n\n| Doppel | ersetzt durch |\n|---|---|\n')
        for k, v in sorted(alias.items()): fh.write(f'| `{k}` | `{v}` |\n')
    print(f"Korrekturen : {sum(FIXED.values())} ; ", end='')
    print(f"app/data.js : {data['stats']} ; data.js {len(js) / 1e6:.2f} Mo ; carte {len(nodes)} nœuds / {len(edges)} liens ; alias {len(alias)}")


def force_layout(n, edges, groups, iters=900, seed=7):
    """Disposition de type ForceAtlas2 (répulsion pondérée par le degré, attraction lin-log,
    légère attraction vers le centre du thème), normalisée sur [0, 1000]."""
    rng = np.random.default_rng(seed)
    groups = np.array(groups)
    e = np.array(edges) if edges else np.zeros((0, 2), int)
    deg = np.zeros(n)
    if len(e):
        np.add.at(deg, e[:, 0], 1); np.add.at(deg, e[:, 1], 1)
    mass = deg + 1
    ug = sorted(set(groups.tolist()))
    ang = {g: i * 2 * np.pi / len(ug) for i, g in enumerate(ug)}
    p = np.array([[np.cos(ang[g]), np.sin(ang[g])] for g in groups]) * 6 + rng.normal(0, 2.5, (n, 2))
    speed = 1.0
    for it in range(iters):
        delta = p[:, None, :] - p[None, :, :]
        d2 = (delta ** 2).sum(-1) + 0.01
        rep = (mass[:, None] * mass[None, :]) / d2  # = kr*mi*mj/d, réparti sur le vecteur unitaire
        disp = (delta * rep[..., None]).sum(1) * 0.6
        if len(e):
            dv = p[e[:, 0]] - p[e[:, 1]]
            dl = np.sqrt((dv ** 2).sum(-1)) + 1e-6
            f = dv / dl[:, None] * np.log1p(dl)[:, None] * 3.0
            np.add.at(disp, e[:, 0], -f); np.add.at(disp, e[:, 1], f)
        # gravité (forte, proportionnelle à la distance) et cohésion des thèmes
        disp -= p * mass[:, None] * 0.045
        for g in ug:
            m = groups == g
            if m.sum() > 2 and g >= 0 and g < 5:
                c = p[m].mean(0)
                disp[m] += (c - p[m]) * 0.35
        step = disp / mass[:, None]
        L = np.sqrt((step ** 2).sum(-1)) + 1e-9
        p += step / L[:, None] * np.minimum(L, speed)[:, None]
        speed = max(0.02, speed * 0.995)
    lo = np.percentile(p, 1.5, axis=0); hi = np.percentile(p, 98.5, axis=0)
    p = (p - lo) / (hi - lo).max()
    p = np.clip(p, -0.04, (hi - lo) / (hi - lo).max() + 0.04)
    p -= p.min(0); p /= p.max()
    return p * 1000


if __name__ == '__main__':
    main()

"""Extraction des pages de grammaire et des exercices sources vers des données JSON propres.

Usage : .venv/bin/python tools/extract.py
Produit build/data.json (pages, exercices, navigation) et copie les images utilisées.
"""
import sys, os, re, json, html, shutil, unicodedata, collections, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from common import SRC, read, page_files, resolve, nfc
from hotpot import parse_I, js_var, text as jtext
from bs4 import BeautifulSoup, NavigableString, Comment, Tag

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'build')
APP = os.path.join(ROOT, 'app')

LOG = collections.defaultdict(list)

# --------------------------------------------------------------------------- ids

def slug(name):
    base = nfc(name)
    base = re.sub(r'\.(s?html?)$', '', base, flags=re.I)
    base = re.sub(r'\.(s?html?)$', '', base, flags=re.I)  # « .htm.htm »
    base = unicodedata.normalize('NFKD', base).encode('ascii', 'ignore').decode()
    base = re.sub(r"[^A-Za-z0-9]+", '-', base).strip('-').lower()
    return base or 'page'


IDS = {}


def pid(fname):
    if fname not in IDS:
        s = slug(fname); cand = s; n = 2
        used = set(IDS.values())
        while cand in used:
            cand = f'{s}-{n}'; n += 1
        IDS[fname] = cand
    return IDS[fname]

# --------------------------------------------------------------------------- classes

NAV_FILES = {'sommaire.htm', 'sommaire-2.htm', 'sommaire-3.htm', 'sommaire-4.htm', 'sommaire-5.htm',
             'sommaire--.htm', 'index.htm', 'index-1.htm', 'index.shtml', 'index-tat.htm',
             'index-locutions.htm', 'index-exercices-grammaire-ii.htm', '1111-a-point-de-depart.htm',
             'cours-de-grammaire-i.htm', 'index.cgi.htm', 'modèle.htm', 'modèle-regle.htm'}

GENERIC_TITLES = {'', 'modèle', 'modele', 'untitled', 'sans titre', 'document sans titre', 'nouvelle page 1'}


def kind_of(fname, src):
    if 'Half-Baked' in src:
        if 'QsToShow' in src: return 'quiz'
        if 'GapSpan' in src or 'ClozeDiv' in src: return 'cloze'
        return 'hp-other'
    if nfc(fname).lower() in NAV_FILES:
        return 'nav'
    return 'rule'


COLOR_CLASS = {}
for c in ['red', '#f01f1f', '#ff0000', '#e3211d', '#cc0000']: COLOR_CLASS[c] = 'c-red'
for c in ['#ff6600', '#ff9900', 'orange']: COLOR_CLASS[c] = 'c-orange'
for c in ['blue', '#0066ff', '#0033cc', '#3399ff', '#3399cc', '#003399', '#0000ff', 'navy']: COLOR_CLASS[c] = 'c-blue'
for c in ['#009900', 'lime', 'green', '#00cc00', '#008000']: COLOR_CLASS[c] = 'c-green'
for c in ['teal', '#008080']: COLOR_CLASS[c] = 'c-teal'
for c in ['purple', '#666699', '#800080']: COLOR_CLASS[c] = 'c-purple'
for c in ['gray', '#888888', 'grey', '#808080']: COLOR_CLASS[c] = 'c-muted'

BG_CLASS = {}
for c in ['#ccffcc', '#99ffcc', '#66ffcc', 'lime']: BG_CLASS[c] = 't-green'
for c in ['#cccccc', 'silver', 'gray', '#ccccff']: BG_CLASS[c] = 't-gray'
for c in ['yellow', '#ffff99', '#ffff66']: BG_CLASS[c] = 't-yellow'
for c in ['#ffcc99', '#ff9900']: BG_CLASS[c] = 't-orange'
for c in ['#00ccff', '#ccffff', '#0099ff']: BG_CLASS[c] = 't-blue'
for c in ['red']: BG_CLASS[c] = 't-red'
# white / #ffffcc = fond de page d'origine : ignorés

KEEP = {'p', 'br', 'strong', 'em', 'u', 's', 'sup', 'sub', 'ul', 'ol', 'li', 'blockquote',
        'table', 'thead', 'tbody', 'tr', 'td', 'th', 'caption', 'h2', 'h3', 'h4', 'hr', 'a',
        'span', 'div', 'img', 'mark', 'pre', 'dl', 'dt', 'dd'}
DROP = {'script', 'style', 'meta', 'link', 'applet', 'object', 'param', 'embed', 'input', 'select',
        'option', 'textarea', 'form', 'button', 'head', 'title', 'noscript', 'iframe', 'o:p', 'map', 'area'}
RENAME = {'b': 'strong', 'i': 'em', 'strike': 's', 'h1': 'h2', 'h5': 'h4', 'h6': 'h4', 'big': None,
          'center': None, 'font': None, 'spaan': None, 'small': None, 'nobr': None, 'tt': None,
          'address': 'p', 'cite': 'em', 'var': 'em', 'code': None, 'dfn': 'em', 'ins': None, 'del': 's',
          'abbr': None, 'acronym': None, 'label': None, 'hta:application': None, 'body': None,
          'html': None, 'section': 'div', 'article': 'div', 'main': 'div'}

USED_IMAGES = set()


def link_target(href, cur):
    """Retourne une route de l'application, une URL externe ou None."""
    href = (href or '').strip()
    if re.match(r'https?://', href, re.I):
        if 'yourserver.com' in href:
            return None
        return href
    if href.startswith('mailto:'):
        return None
    f, anchor = resolve(href, cur)
    if not f:
        if href and not href.startswith('#'):
            LOG['liens-cassés'].append(f'{cur} -> {href}')
        return None
    if nfc(f).lower() in NAV_FILES:
        return 'NAV:' + nfc(f).lower()
    k = KIND.get(f)
    if k is None:
        LOG['liens-non-html'].append(f'{cur} -> {f}')
        return None
    pre = '#/exercice/' if k in ('cloze', 'quiz', 'match') else '#/regle/'
    route = pre + pid(f)
    if anchor:
        route += '/' + slug(html.unescape(urllib.parse.unquote(anchor)))
    return route


def style_props(st):
    props = {}
    for part in (st or '').split(';'):
        if ':' in part:
            k, v = part.split(':', 1)
            props[k.strip().lower()] = v.strip().lower()
    return props


def color_class(tag):
    classes = []
    c = (tag.get('color') or '').lower()
    st = style_props(tag.get('style'))
    c = c or st.get('color', '')
    if c in COLOR_CLASS: classes.append(COLOR_CLASS[c])
    bg = st.get('background-color') or st.get('background') or ''
    if bg in ('yellow', '#ffff00', 'lime', '#00ff00'): classes.append('hl')
    return classes


def is_layout_table(t):
    """Table à une seule colonne servant de cadre de mise en page."""
    rows = t.find_all('tr', recursive=False) or [r for tb in t.find_all(['tbody', 'thead'], recursive=False) for r in tb.find_all('tr', recursive=False)]
    if not rows:
        return True
    return all(len(r.find_all(['td', 'th'], recursive=False)) <= 1 for r in rows)


def clean_fragment(node, cur, *, unbold=False):
    """Nettoie récursivement un fragment (in-place)."""
    for c in node.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for t in list(node.find_all(True)):
        if t.decomposed if hasattr(t, 'decomposed') else False:
            continue
        name = t.name.lower() if t.name else ''
        if name in DROP:
            t.decompose()
    # liens JavaScript d'Hot Potatoes : onclick="window.open('page.htm')"
    for t in node.find_all(onclick=True):
        m = re.search(r"window\.open\(\s*'([^']+)'", t['onclick'])
        if m:
            t.name = 'a'; t.attrs = {'href': m.group(1)}
    # tables d'abord (de l'intérieur vers l'extérieur)
    for t in reversed(node.find_all('table')):
        bgc = (t.get('bgcolor') or '').lower()
        if is_layout_table(t):
            cells = t.find_all(['td', 'th'])
            direct = [c for c in cells if c.find_parent('table') is t]
            if len(direct) <= 1:
                cell = direct[0] if direct else None
                cls = BG_CLASS.get(((cell.get('bgcolor') if cell else '') or bgc).lower())
                if cell is not None and cls:
                    wrapper = BeautifulSoup('', 'lxml').new_tag('div')
                    wrapper['class'] = ['box', cls]
                    for ch in list(cell.contents): wrapper.append(ch.extract())
                    t.replace_with(wrapper)
                else:
                    frag = list(cell.contents) if cell is not None else []
                    for ch in frag: t.insert_before(ch.extract())
                    t.decompose()
            else:
                wrapper = BeautifulSoup('', 'lxml').new_tag('div'); wrapper['class'] = ['stack']
                for c in direct:
                    d = BeautifulSoup('', 'lxml').new_tag('div')
                    cls = BG_CLASS.get((c.get('bgcolor') or '').lower())
                    d['class'] = ['box'] + ([cls] if cls else [])
                    for ch in list(c.contents): d.append(ch.extract())
                    wrapper.append(d)
                t.replace_with(wrapper)
        else:
            t.attrs = {'class': ['tbl']}
            for c in t.find_all(['td', 'th']):
                if c.find_parent('table') is not t: continue
                cls = BG_CLASS.get((c.get('bgcolor') or '').lower()) or BG_CLASS.get((c.find_parent('tr').get('bgcolor') or '').lower())
                attrs = {k: c[k] for k in ('colspan', 'rowspan') if c.get(k) and c[k] != '1'}
                if cls: attrs['class'] = [cls]
                c.attrs = attrs
            for r in t.find_all('tr'):
                if r.find_parent('table') is t: r.attrs = {}
    for t in list(node.find_all(True)):
        if getattr(t, 'decomposed', False) or t.parent is None:
            continue
        name = t.name.lower()
        if name in ('table', 'tr', 'td', 'th', 'tbody', 'thead') and t.attrs.get('class') in (None,) and name != 'table':
            pass
        if name == 'a':
            if t.get('name') and not t.get('href'):
                anchor = slug(html.unescape(urllib.parse.unquote(t['name'])))
                t.name = 'span'; t.attrs = {'id': 'a-' + anchor, 'class': ['anchor']}
                continue
            target = link_target(t.get('href'), cur)
            if target is not None and target.startswith('NAV:'):
                t.decompose(); continue
            if target is None:
                t.unwrap(); continue
            t.attrs = {'href': target}
            if target.startswith('http'):
                t.attrs.update({'target': '_blank', 'rel': 'noopener'})
            continue
        if name == 'img':
            src = t.get('src') or ''
            f, _ = resolve(src, cur)
            if f and re.search(r'\.(jpe?g|gif|png)$', f, re.I):
                USED_IMAGES.add(f)
                t.attrs = {'src': 'assets/' + slug(f.rsplit('.', 1)[0]) + '.' + f.rsplit('.', 1)[1].lower(), 'alt': t.get('alt', '')}
            else:
                t.decompose()
            continue
        if name in ('font', 'span'):
            cls = color_class(t)
            if cls and t.get_text(strip=True):
                t.name = 'span'; t.attrs = {'class': cls}
            elif name == 'span' and t.get('class') == ['anchor']:
                pass
            else:
                t.unwrap()
            continue
        if name in RENAME:
            new = RENAME[name]
            if new is None:
                t.unwrap(); continue
            t.name = new
            name = new
        if name not in KEEP:
            LOG['balises-inconnues'].append(f'{cur}: {name}')
            t.unwrap(); continue
        keep = {}
        if name in ('td', 'th', 'table', 'div', 'span') and t.get('class'):
            ok = [c for c in t['class'] if c in ('box', 'stack', 'tbl', 'anchor', 'hl') or c.startswith(('t-', 'c-'))]
            if 'greenbox' in t['class']: ok += ['box', 't-green']
            if ok: keep['class'] = ok
        if name in ('td', 'th'):
            for k in ('colspan', 'rowspan'):
                if t.get(k): keep[k] = t[k]
        if name == 'span' and t.get('id'): keep['id'] = t['id']
        if name in ('p', 'div') and (t.get('align') or '').lower() == 'center':
            keep['class'] = (keep.get('class') or []) + ['center']
        cls = color_class(t)
        if cls: keep['class'] = (keep.get('class') or []) + cls
        t.attrs = keep
    if unbold:
        for t in node.find_all('strong'):
            t.unwrap()
    return node


INLINE = {'strong', 'em', 'u', 's', 'sup', 'sub', 'a', 'span', 'mark', 'br', 'img'}


def tidy_html(h):
    """Normalisation textuelle finale du HTML nettoyé."""
    h = h.replace('\xa0', ' ').replace('\r', '')
    h = re.sub(r'[ \t\n]+', ' ', h)
    # balises inline vides
    for _ in range(4):
        h = re.sub(r'<(strong|em|u|s|span|sup|sub|mark)(?: [^>]*)?>\s*</\1>', ' ', h)
        h = re.sub(r'</(strong|em|u|s|sup|sub)>(\s*)<\1>', r'\2', h)
    h = re.sub(r'(<br/?>\s*){3,}', '<br/><br/>', h)
    h = re.sub(r'<p(?: [^>]*)?>\s*(<br/?>\s*)*</p>', '', h)
    for _ in range(3):
        h = re.sub(r'<(h[234])(?: [^>]*)?>\s*(<(strong|em)>\s*</\3>\s*)*</\1>', '', h)
        h = re.sub(r'<div class="center">\s*</div>', '', h)
    h = re.sub(r'<div(?: class="[^"]*")?>\s*(<br/?>\s*)*</div>', '', h)
    h = re.sub(r'<(p|div|li|td|th|h[234])( [^>]*)?>\s*(<br/>\s*)+', r'<\1\2>', h)
    h = re.sub(r'(\s*<br/>)+\s*</(p|div|li|td|th|h[234])>', r'</\2>', h)
    h = re.sub(r'\s+(</(?:p|div|li|td|th|h[234])>)', r'\1', h)
    h = re.sub(r'(<(?:p|div|li|td|th|h[234])(?: [^>]*)?>)\s+', r'\1', h)
    # conteneurs sans attributs imbriqués / vides
    for _ in range(6):
        h2 = re.sub(r'<div>\s*</div>', '', h)
        h2 = re.sub(r'<div>\s*(<div[^>]*>.*?</div>)\s*</div>', r'\1', h2) if False else h2
        if h2 == h: break
        h = h2
    # double saut de ligne -> séparateur de paragraphe
    h = re.sub(r'<br/>\s*<br/>', '<span class="pb"></span>', h)
    h = re.sub(r'^(\s*<br/>)+|(<br/>\s*)+$', '', h.strip())
    return h.strip()


def bold_ratio(node):
    total = len(node.get_text(' ', strip=True)) or 1
    bold = sum(len(b.get_text(' ', strip=True)) for b in node.find_all(['b', 'strong']) if not b.find_parent(['b', 'strong']))
    return bold / total

# --------------------------------------------------------------------------- pages de règles


def page_title(soup, fname):
    t = soup.title.get_text(' ', strip=True) if soup.title else ''
    t = re.sub(r'\s+', ' ', t)
    if t.lower() in GENERIC_TITLES or t == fname or re.match(r'^\d_\d', t):
        t = ''
    h = soup.find(['h1'], class_='header') or soup.find('h1')
    if h and h.get_text(strip=True):
        return re.sub(r'\s+', ' ', h.get_text(' ', strip=True)), h
    # premier texte en grande police
    for f in soup.find_all('font'):
        try:
            size = int(re.sub(r'\D', '', f.get('size') or '0') or 0)
        except ValueError:
            size = 0
        if size >= 5 and f.get_text(strip=True):
            # titre sur plusieurs balises : on prend le bloc entier s'il reste court
            blk = f.find_parent(['p', 'h1', 'h2', 'h3', 'center', 'td', 'div'])
            if blk is not None:
                txt = re.sub(r'\s+', ' ', blk.get_text(' ', strip=True)).strip()
                if 0 < len(txt) <= 140 and txt.startswith(re.sub(r'\s+', ' ', f.get_text(' ', strip=True)).strip()[:6]):
                    return txt, blk
            return re.sub(r'\s+', ' ', f.get_text(' ', strip=True)).strip(), f
    if t:
        return t, None
    base = re.sub(r'\.(s?html?)$', '', nfc(fname), flags=re.I)
    base = re.sub(r'^\d+_\d+(_\d+)?_', '', base).replace('_', ' ').replace('-', ' ')
    return base[:1].upper() + base[1:], None


# Titres mal découpés dans l'original : (titre complet, début de texte à retirer car il appartient au titre)
TITLE_FIX = {
    '1_2_03_Les_propositions_independante_principale_et_subordonnee.shtml': ('Les propositions indépendante, principale et subordonnée', 'principale et subordonnée'),
    'Liste alphabétique des verbes du 3e groupe.htm': ('Liste alphabétique des verbes du 3e groupe', None),
    'Liste des verbes du 2 groupe.htm': ('Liste alphabétique des verbes du 2e groupe', None),
    'Liste mots nouvelle orthographe.htm': ('Mots concernés par les recommandations orthographiques', None),
    'Quiu.htm': ('Qui', None),
    'après les verbes de pensée et de déclaration à la forme négative ou interrogative.htm': ('Le subjonctif après les verbes de pensée et de déclaration à la forme négative ou interrogative', None),
    'catégories.htm': ('Comment accorder ?', None),
    'Choix entre le subjonctif présent et le subjonctif passé.htm': ('Choix entre le subjonctif présent et le subjonctif passé', 'le subjonctif présent et le subjonctif passé'),
    'locutions1-explications.htm': ('Signification des locutions 1', None),
    'locutions2-explications.htm': ('Signification des locutions 2', None),
    'locutions3-explications.htm': ('Signification des locutions 3', None),
    'Dictionnaire-genre-3.htm': ('Le genre des noms : dictionnaire (exercice Genre 3)', None),
    "Accord de l'adjectif - Règles générales.htm": ("Accord de l'adjectif – Règles générales", None),
    'Accord de l-adjectif - Règles générales.htm': ("Accord de l'adjectif – Règles générales", None),
}
# Pages non reprises : copies d'un autre site, et la notice d'installation du CD (avec adresse e-mail)
FOREIGN = {'ex_articles1.html', 'essai1.htm', 'C-test-Athenes.html', 'A-LIRE-CECI.htm'}


def extract_rule(fname, src):
    soup = BeautifulSoup(src, 'lxml')
    body = soup.body or soup
    for bc in body.find_all(id='breadcrumb'):
        bc.decompose()
    title, title_el = page_title(soup, fname)
    title = title.strip(' -: ')
    if title_el is not None:
        # retire le bloc du titre (le paragraphe qui le contient s'il ne contient rien d'autre)
        blk = title_el
        while blk.parent is not None and blk.parent.name in ('b', 'strong', 'font', 'p', 'center', 'div', 'h1', 'h2') \
                and blk.parent.get_text(strip=True) == title_el.get_text(strip=True):
            blk = blk.parent
        blk.decompose()
    fix = TITLE_FIX.get(nfc(fname))
    if fix:
        title = fix[0]
    unbold = bold_ratio(body) > 0.55
    clean_fragment(body, fname, unbold=unbold)
    flatten_divs(body)
    inner = ''.join(str(c) for c in body.contents)
    h = tidy_html(inner)
    if fix and fix[1]:
        h = tidy_html(re.sub(r'^((?:<[^>]+>\s*)*)' + re.escape(fix[1]) + r'\s*', r'\1', h, count=1))
    return title, h


def flatten_divs(node):
    """Supprime les <div> sans classe qui n'apportent aucune structure."""
    for d in reversed(node.find_all('div')):
        if not d.attrs:
            d.unwrap()


# --------------------------------------------------------------------------- exercices


def inner_html(el, cur):
    if el is None:
        return ''
    el = BeautifulSoup(str(el), 'lxml').find(el.name)
    clean_fragment(el, cur)
    h = tidy_html(''.join(str(c) for c in el.contents))
    return '' if re.fullmatch(r'(\s|<br/?>|&nbsp;)*', h) else h


def nav_buttons(soup, fname):
    out = []
    for b in soup.find_all('button', class_='NavButton'):
        m = re.search(r"location='([^']+)'", b.get('onclick') or '')
        if not m: continue
        target = link_target(m.group(1), fname)
        if target and not target.startswith('NAV:'):
            out.append({'label': b.get_text(' ', strip=True), 'href': target})
    return out


def extract_cloze(fname, src):
    soup = BeautifulSoup(src, 'lxml')
    I = parse_I(src)
    body = soup.find(class_='ClozeBody') or soup.find(id='ClozeDiv')
    gaps = []
    holder = BeautifulSoup(str(body), 'lxml').find(body.name)
    for i, span in enumerate(holder.find_all('span', class_='GapSpan')):
        m = re.search(r'\d+', span.get('id', ''))
        n = int(m.group(0)) if m else i
        entry = I[n] if n < len(I) and I[n] else [None, [], '']
        answers = []
        for a in (entry[1] or []):
            if a and a[0] is not None:
                answers.append(jtext(a[0]))
        clue = jtext(entry[2]) if len(entry) > 2 and isinstance(entry[2], str) else ''
        sel = span.find('select')
        options = [jtext(o.get_text()) for o in sel.find_all('option') if o.get_text(strip=True)] if sel else None
        g = {'a': answers}
        if clue: g['clue'] = clue
        if options: g['opts'] = options
        gaps.append(g)
        span.replace_with(NavigableString(f'⟦{len(gaps) - 1}⟧'))
    clean_fragment(holder, fname, unbold=bold_ratio(holder) > 0.55)
    trailing = []
    for node in reversed(list(holder.contents)):
        if isinstance(node, NavigableString) and not node.strip():
            continue
        if isinstance(node, Tag) and node.name == 'br':
            node.extract(); continue
        if isinstance(node, Tag) and node.name == 'a' and node.get('href', '').startswith('#/'):
            trailing.insert(0, {'label': text_of(node), 'href': node['href']}); node.extract(); continue
        if isinstance(node, Tag) and node.name in ('p', 'div', 'strong') and node.find('a') and \
                not node.find('gap') and len(node.get_text(strip=True)) <= sum(len(a.get_text(strip=True)) for a in node.find_all('a')) + 12:
            for a in node.find_all('a', href=True):
                if a['href'].startswith('#/'):
                    trailing.insert(0, {'label': text_of(a), 'href': a['href']})
            node.extract(); continue
        break
    text_html = tidy_html(''.join(str(c) for c in holder.contents))
    text_html = re.sub(r'⟦(\d+)⟧', r'<gap data-i="\1"></gap>', text_html)
    wl = soup.find(class_='ClozeWordList')
    ex = base_exercise(soup, fname)
    for t in trailing:
        if not any(h['href'] == t['href'] for h in ex.setdefault('help', [])):
            ex['help'].append(t)
    ex.update({'type': 'cloze', 'body': text_html, 'gaps': gaps,
               'caseSensitive': bool(js_var(src, 'CaseSensitive', False))})
    if wl and wl.get_text(strip=True):
        ex['wordList'] = [w.strip() for w in re.split(r'\s{2,}|,| ', wl.get_text('  ')) if w.strip()]
    empty = [i for i, g in enumerate(gaps) if not g['a']]
    if empty:
        LOG['lacunes-sans-réponse'].append(f'{fname}: {empty}')
    return ex


def extract_quiz(fname, src):
    soup = BeautifulSoup(src, 'lxml')
    I = parse_I(src)
    qtexts = soup.find_all(class_='QuestionText')
    qs = []
    for n, entry in enumerate(I):
        if not entry: continue
        qhtml = inner_html(qtexts[n], fname) if n < len(qtexts) else ''
        qtype = {'0': 'mc', '1': 'short', '2': 'hybrid', '3': 'multi'}.get(str(entry[2] if len(entry) > 2 else '0'), 'mc')
        answers = []
        for a in (entry[3] if len(entry) > 3 and entry[3] else []):
            if not a: continue
            fb = jtext(a[1]) if len(a) > 1 else ''
            if fb in ('>', '<'): fb = ''
            answers.append({'t': jtext(a[0]), 'ok': bool(a[2]) if len(a) > 2 else False, 'fb': fb})
        qs.append({'q': qhtml, 'kind': qtype, 'answers': answers})
    ex = base_exercise(soup, fname)
    ex.update({'type': 'quiz', 'questions': qs})
    return ex


def base_exercise(soup, fname):
    title = inner_html(soup.find(class_='ExerciseTitle'), fname)
    sub = inner_html(soup.find(class_='ExerciseSubtitle'), fname)
    instr = inner_html(soup.find(id='Instructions'), fname)
    reading = ''
    rd = soup.find(id='ReadingDiv') or soup.find(class_='ReadingText')
    rtitle = ''
    if rd is not None:
        rt = rd.find(class_='ReadingTitle')
        if rt is not None:
            rtitle = rt.get_text(' ', strip=True); rt.decompose()
        reading = inner_html(rd, fname)
    helps = []
    def pull_links(h):
        """Sort les liens vers les règles du titre et les range dans « aides »."""
        frag = BeautifulSoup(h, 'lxml')
        for a in frag.find_all('a', href=True):
            if a['href'].startswith('#/') and not any(x['href'] == a['href'] for x in helps):
                helps.append({'label': text_of(a), 'href': a['href']})
            a.decompose()
        b = frag.body or frag
        out = tidy_html(''.join(str(c) for c in b.contents))
        out = re.sub(r'^(\s*<br/>|\s*<span class="pb"></span>)+|(<br/>\s*|<span class="pb"></span>\s*)+$', '', out).strip(' -–:')
        return out
    title = pull_links(title)
    sub = pull_links(sub) if sub else sub
    ex = {'title': title, 'file': nfc(fname)}
    if not ex['title']:
        t = soup.title.get_text(' ', strip=True) if soup.title else ''
        ex['title'] = t or nfc(fname)
    if helps: ex['help'] = helps
    if sub: ex['subtitle'] = sub
    if instr: ex['instructions'] = instr
    if reading: ex['reading'] = reading; ex['readingTitle'] = rtitle
    nb = nav_buttons(soup, fname)
    if nb: ex['nav'] = nb
    creator = soup.find('meta', attrs={'name': 'author'})
    return ex

def extract_jqz(fname):
    """Quiz Hot Potatoes au format source XML (.jqz) jamais exporté en HTML."""
    x = BeautifulSoup(read(fname), 'xml')
    dec = lambda t: html.unescape(html.unescape(t or '')).strip()
    qs = []
    for qr in x.find_all('question-record'):
        kind = {'1': 'mc', '2': 'short', '3': 'hybrid', '4': 'multi'}.get(qr.find('question-type').text.strip(), 'mc')
        answers = [{'t': dec(a.find('text').text), 'ok': a.find('correct').text.strip() == '1',
                    'fb': dec(a.find('feedback').text)} for a in qr.find_all('answer')]
        qs.append({'q': html.escape(dec(qr.find('question').text)), 'kind': kind, 'answers': answers})
    title = dec(x.find('data').find('title').text) if x.find('data') else nfc(fname)
    return {'title': title, 'file': nfc(fname), 'type': 'quiz', 'questions': qs}


# --------------------------------------------------------------------------- locutions (applet Java -> appariement)


def extract_locutions():
    out = []
    for n in (1, 2, 3):
        fn = f'locutions{n}.txt'
        raw = open(os.path.join(SRC, fn), 'rb').read().decode('cp1252')
        pairs = []
        for line in raw.splitlines():
            if '<->' in line:
                a, b = line.split('<->', 1)
                a, b = re.sub(r'\s+', ' ', a).strip(), re.sub(r'\s+', ' ', b).strip()
                if a and b: pairs.append([a, b])
        out.append((f'locutions{n}.htm', pairs))
    return out

# --------------------------------------------------------------------------- navigation


def text_of(el):
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)).strip()


def link_route(a, cur):
    t = link_target(a.get('href'), cur)
    return t if t and not t.startswith('NAV:') else None


def themes_tree():
    """Arbre thématique d'après la numérotation des fichiers .shtml et index.shtml."""
    soup = BeautifulSoup(read('index.shtml'), 'lxml')
    themes = []
    cur_theme = None
    for a in soup.find_all('a', href=True):
        f, _ = resolve(a['href'], 'index.shtml')
        label = text_of(a)
        if not f or f == 'index.shtml' or nfc(f).lower().startswith('sommaire'):
            continue
        prev = a.find_previous(string=lambda t: t.strip())
        in_li = prev is not None and prev.strip().endswith('*')
        if not in_li:
            cur_theme = {'title': label, 'intro': f, 'sections': []}
            themes.append(cur_theme)
        else:
            m = re.match(r'(\d+_\d+)', f)
            cur_theme['sections'].append({'title': label, 'file': f, 'prefix': m.group(1) if m else None})
    # enfants de chaque section : liste lue dans la page de section, complétée par la numérotation
    shtml = sorted(f for f in os.listdir(SRC) if f.endswith('.shtml'))
    for th in themes:
        for sec in th['sections']:
            pre = sec['prefix']
            children = []
            seen = set()
            try:
                ss = BeautifulSoup(read(sec['file']), 'lxml')
                for bc in ss.find_all(id='breadcrumb'): bc.decompose()
                for a in ss.find_all('a', href=True):
                    f, _ = resolve(a['href'], sec['file'])
                    if f and f not in seen and f != sec['file'] and pre and nfc(f).startswith(pre + '_') and f.endswith('.shtml'):
                        seen.add(f); children.append({'title': text_of(a), 'file': f})
            except FileNotFoundError:
                pass
            for f in shtml:
                if pre and f.startswith(pre + '_') and f not in seen and f != sec['file'] and re.match(rf'{pre}_\d', f):
                    seen.add(f); children.append({'title': None, 'file': f})
            children.sort(key=lambda c: [int(x) for x in re.findall(r'\d+', c['file'][:12])][:3])
            sec['children'] = children
    return themes


def sommaire():
    """Sommaire alphabétique : lettres -> entrées -> sous-entrées."""
    entries = []
    for fn in ['Sommaire.htm', 'Sommaire-2.htm', 'Sommaire-3.htm', 'Sommaire-4.htm', 'Sommaire-5.htm']:
        soup = BeautifulSoup(read(fn), 'lxml')
        # cellules d'entrée : td contenant un lien principal, hors tables imbriquées de sous-entrées
        for td in soup.find_all('td'):
            inner = td.find('table')
            links_direct = [a for a in td.find_all('a', href=True) if (inner is None or a.find_parent('table') is not inner and not (inner in a.parents))]
            # seulement les cellules « de premier niveau » (pas dans une table imbriquée de sous-entrées)
            if td.find_parent('td') is not None and td.find_parent('td').find('table') is td.find_parent('table'):
                continue
            head = None
            for a in links_direct:
                r = link_route(a, fn)
                if r and r.startswith('#/'):
                    head = {'label': text_of(a), 'href': r}
                    break
            subs = []
            if inner is not None:
                for a in inner.find_all('a', href=True):
                    r = link_route(a, fn)
                    if r: subs.append({'label': text_of(a).lstrip('* ').strip(), 'href': r})
            if head is None and subs:
                # en-tête sans lien
                p = td.find(['p', 'b'])
                lab = text_of(p) if p else ''
                if inner is not None and p is not None and inner in p.parents: lab = ''
                head = {'label': lab or subs[0]['label'], 'href': None}
            if head is None:
                continue
            if any(e['label'] == head['label'] and e['href'] == head['href'] for e in entries):
                continue
            head['sub'] = subs
            entries.append(head)
    for e in entries:
        e['label'] = re.sub(r'\s+', ' ', e['label']).strip(' -')
    entries = [e for e in entries if len(e['label']) > 1 and not re.fullmatch(r'[A-Z]', e['label'])]
    entries.sort(key=lambda e: sortkey(e['label']))
    return entries


def sortkey(s):
    s = unicodedata.normalize('NFKD', s.lower()).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9 ]', '', s).strip()


def exercise_catalogue():
    """Catalogue des exercices : Index.htm + Index-1.htm (catégories), cours I et II, textes, locutions."""
    cats = []
    for fn in ['Index.htm', 'Index-1.htm']:
        soup = BeautifulSoup(read(fn), 'lxml')
        cur = None
        for tr in soup.find_all('tr'):
            tds = tr.find_all('td', recursive=False)
            for td in tds:
                if td.find('a', attrs={'name': True}) is not None and not td.find('a', href=True):
                    cur = {'title': text_of(td), 'items': []}
                    cats.append(cur)
            cells = [td for td in tds if td.find('a', href=True)]
            if not cells or cur is None:
                continue
            cell = cells[-1]
            a = cell.find('a', href=True)
            r = link_route(a, fn)
            desc = text_of(cell)
            desc = re.sub(r'^\S+\.(s?html?|doc)\s*', '', desc).strip()
            if r:
                item = {'href': r, 'desc': desc}
                if not r.startswith('#/exercice/'): item['help'] = True
                if not any(i['href'] == r for i in cur['items']):
                    cur['items'].append(item)
            else:
                LOG['catalogue-sans-lien'].append(f'{fn}: {desc}')
    cats = [c for c in cats if c['items']]
    return cats


def simple_list(fn, label_re=None):
    soup = BeautifulSoup(read(fn), 'lxml')
    items = []
    for tr in soup.find_all('tr'):
        links = tr.find_all('a', href=True)
        if not links: continue
        for a in links:
            r = link_route(a, fn)
            if not r: continue
            tds = tr.find_all('td', recursive=False)
            desc = text_of(tr)
            desc = re.sub(r'\S+\.(s?html?|doc)\b', '', desc).strip()
            items.append({'href': r, 'desc': re.sub(r'\s+', ' ', desc)})
    return items

# --------------------------------------------------------------------------- principal


KIND = {}


def main():
    os.makedirs(OUT, exist_ok=True)
    files = page_files()
    sources = {}
    for f in files:
        s = read(f); sources[f] = s; KIND[f] = kind_of(f, s)
    for f in ('locutions1.htm', 'locutions2.htm', 'locutions3.htm'):
        KIND[f] = 'match'
    JQZ = 'Vocabulaire-Le cri des animaux.jqz'
    KIND[JQZ] = 'quiz'
    # ids stables, triés
    for f in files: pid(f)

    rules, exercises = {}, {}
    for f in files:
        k = KIND[f]
        try:
            if nfc(f) in FOREIGN:
                continue
            if k == 'rule':
                title, h = extract_rule(f, sources[f])
                rules[pid(f)] = {'id': pid(f), 'title': title, 'html': h, 'file': nfc(f)}
            elif k == 'cloze':
                exercises[pid(f)] = dict(extract_cloze(f, sources[f]), id=pid(f))
            elif k == 'quiz':
                exercises[pid(f)] = dict(extract_quiz(f, sources[f]), id=pid(f))
        except Exception as e:  # noqa
            LOG['erreurs'].append(f'{f}: {type(e).__name__}: {e}')
            raise
    exercises[pid(JQZ)] = dict(extract_jqz(JQZ), id=pid(JQZ))
    for f, pairs in extract_locutions():
        exercises[pid(f)] = {'id': pid(f), 'type': 'match', 'file': f,
                             'title': 'Expressions et locutions françaises – ' + f[9],
                             'instructions': 'Associez le début de chaque locution à sa fin.',
                             'pairs': pairs}
        rules.pop(pid(f), None)

    nav = {
        'themes': themes_tree(),
        'sommaire': sommaire(),
        'catalogue': exercise_catalogue(),
        'coursI': simple_list('Cours-de-grammaire-I.htm'),
        'coursII': simple_list('Index-Exercices-Grammaire-II.htm'),
        'textes': simple_list('Index-TaT.htm'),
        'locutions': simple_list('Index-Locutions.htm'),
    }
    # résout fichiers -> ids dans l'arbre thématique
    for th in nav['themes']:
        th['intro'] = pid(th['intro']) if th['intro'] in KIND and KIND[th['intro']] == 'rule' else None
        for sec in th['sections']:
            sec['id'] = pid(sec['file']) if KIND.get(sec['file']) == 'rule' else None
            for c in sec['children']:
                c['id'] = pid(c['file'])
                if not c['title'] and c['id'] in rules: c['title'] = rules[c['id']]['title']
                del c['file']
            del sec['file']

    for k, v in LOG.items():
        print(f'{k}: {len(v)}')
    json.dump({'rules': rules, 'exercises': exercises, 'nav': nav},
              open(os.path.join(OUT, 'data.json'), 'w'), ensure_ascii=False, indent=0)
    json.dump(LOG, open(os.path.join(OUT, 'log.json'), 'w'), ensure_ascii=False, indent=1)
    os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)
    for f in USED_IMAGES:
        shutil.copy(os.path.join(SRC, f), os.path.join(OUT, 'assets', slug(f.rsplit('.', 1)[0]) + '.' + f.rsplit('.', 1)[1].lower()))
    print('règles', len(rules), 'exercices', len(exercises), 'images', len(USED_IMAGES))


if __name__ == '__main__':
    main()

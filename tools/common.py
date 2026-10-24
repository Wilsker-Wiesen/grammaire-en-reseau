"""Gemeinsame Hilfsfunktionen für die Extraktion des alten Programms."""
import os, re, unicodedata, urllib.parse, warnings
from bs4 import XMLParsedAsHTMLWarning
warnings.filterwarnings('ignore', category=XMLParsedAsHTMLWarning)

SRC = os.path.join(os.path.dirname(__file__), '..', 'Grammaire-Programm V. 2')
SRC = os.path.normpath(SRC)


def read(name):
    raw = open(os.path.join(SRC, name), 'rb').read()
    try:
        return raw.decode('utf-8')
    except UnicodeDecodeError:
        return raw.decode('cp1252', errors='replace')


def nfc(s):
    return unicodedata.normalize('NFC', s)


def key(s):
    return nfc(s).lower().replace('\u2019', "'")


def page_files():
    return sorted(f for f in os.listdir(SRC)
                  if f.lower().endswith(('.htm', '.html', '.shtml')))


_lower = None


def resolve(href, cur=None):
    """Lien relatif -> (fichier existant | None, ancre)."""
    global _lower
    if _lower is None:
        _lower = {key(f): f for f in os.listdir(SRC)}
    href = (href or '').strip()
    if not href or href.startswith(('mailto:', 'javascript:')) or re.match(r'https?://', href):
        return None, None
    path, _, anchor = href.partition('#')
    path = path.strip()
    if not path:
        return cur, anchor
    path = urllib.parse.unquote(path, encoding='utf-8', errors='replace')
    if '�' in path:
        path = urllib.parse.unquote(href.partition('#')[0], encoding='cp1252')
    path = path.replace('\\', '/').split('/')[-1]
    f = _lower.get(key(path))
    if f is None:
        alias = ALIASES.get(key(path))
        if alias is None:
            m = re.fullmatch(r'v(s?)([a-z]+)\.htm', key(path))
            if m:
                alias = 'verbe-' + ('s-' if m.group(1) else '') + m.group(2) + '.htm'
                if key(alias) not in _lower and m.group(1):
                    alias = 'verbe-' + m.group(1) + m.group(2) + '.htm'
        f = _lower.get(key(alias)) if alias else None
    return f, anchor


# Liens cassés de l'original dont la cible voulue est certaine.
ALIASES = {
    'pronoms personnels.htm': '1_1_11_Le_pronom_personnel.shtml',
    'vocabulaire-le cri des animaux.htm': 'Vocabulaire-Le cri des animaux.jqz',
    'feminin_noms.htm': 'Féminin des noms.htm',
    'feminin_adjectifs.htm': 'Féminin des adjectifs.htm',
    'adjectifs_possessifs.htm': 'Adjectifs possessifs.htm',
    'adjectifs_demonstratifs.htm': 'Adjectifs démonstratifs.htm',
    'pronoms_possessifs.htm': 'Pronoms possessifs.htm',
    'pronoms_demonstratifs.htm': 'Pronoms démonstratifs.htm',
}

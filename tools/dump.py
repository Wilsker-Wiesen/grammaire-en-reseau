"""Affiche une page en texte avec ses liens (diagnostic)."""
import sys, re
sys.path.insert(0, 'tools')
from common import *
from bs4 import BeautifulSoup
for f in sys.argv[1:]:
    s = BeautifulSoup(read(f), 'lxml')
    for a in s.find_all('a', href=True):
        t, anc = resolve(a['href'], f)
        a.replace_with(f"[{a.get_text(' ', strip=True)} -> {t or '!'+a['href']}{'#'+anc if anc else ''}]")
    for b in s.find_all(['script', 'style']): b.decompose()
    txt = re.sub(r'\n\s*\n+', '\n', s.get_text('\n'))
    txt = re.sub(r'[ \t]+', ' ', txt)
    print('=====', f); print(txt)

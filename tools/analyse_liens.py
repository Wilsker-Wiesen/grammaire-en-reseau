"""Analyse du graphe de liens (diagnostic)."""
import sys, re, json, collections
sys.path.insert(0, 'tools')
from common import *
from bs4 import BeautifulSoup

files = page_files(); graph = {}; broken = collections.Counter(); titles = {}
for f in files:
    s = BeautifulSoup(read(f), 'lxml')
    titles[f] = s.title.get_text(' ', strip=True) if s.title else ''
    outs = set()
    for a in s.find_all('a', href=True):
        t, _ = resolve(a['href'], f)
        if t: outs.add(t)
        elif not re.match(r'(https?:|mailto:|#|javascript)', a['href']): broken[a['href']] += 1
    for m in re.finditer(r"location='([^']+)'", str(s)):
        t, _ = resolve(m.group(1), f)
        if t: outs.add(t)
    graph[f] = outs


def reach(roots):
    seen = set(roots); st = list(roots)
    while st:
        x = st.pop()
        for y in graph.get(x, ()):
            if y not in seen and y in graph: seen.add(y); st.append(y)
    return seen

if __name__ == '__main__':
    for r in ['index.shtml', 'Sommaire.htm', 'Index.htm', 'Index-Locutions.htm', 'Index-TaT.htm', 'Index-Exercices-Grammaire-II.htm']:
        print(r, len(reach([r])), 'direct', len(graph[r]))
    allr = reach(['index.shtml', 'Sommaire.htm', 'Index.htm'])
    orph = [f for f in files if f not in allr]
    print('unreached:', len(orph)); print(orph)
    print('broken links:', sum(broken.values()), len(broken), broken.most_common(40))

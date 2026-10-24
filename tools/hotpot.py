"""Lecture des exercices Hot Potatoes 6 exportés en HTML (JCloze, JQuiz)."""
import re, html

_ASSIGN = re.compile(r'(?<![\w.\]])I((?:\[\d+\])+)\s*=(?!=)\s*')


def _js_string(s, i):
    """Lit un littéral chaîne JS à partir de s[i] (guillemet)."""
    q = s[i]; i += 1; out = []
    while i < len(s):
        c = s[i]
        if c == '\\':
            n = s[i + 1]
            if n == 'u':
                out.append(chr(int(s[i + 2:i + 6], 16))); i += 6; continue
            if n == 'x':
                out.append(chr(int(s[i + 2:i + 4], 16))); i += 4; continue
            out.append({'n': '\n', 't': '\t', 'r': ''}.get(n, n)); i += 2; continue
        if c == q:
            return ''.join(out), i + 1
        out.append(c); i += 1
    raise ValueError('chaîne non terminée')


def _js_value(s, i):
    while s[i] in ' \t\r\n': i += 1
    if s[i] in '\'"':
        return _js_string(s, i)
    if s.startswith('new Array', i):
        i += len('new Array')
        while s[i] in ' \t': i += 1
        assert s[i] == '('; i += 1
        items = []
        while True:
            while s[i] in ' \t\r\n,': i += 1
            if s[i] == ')':
                return items, i + 1
            v, i = _js_value(s, i); items.append(v)
    m = re.compile(r'-?\d+(?:\.\d+)?|true|false|null').match(s, i)
    if m:
        t = m.group(0)
        v = {'true': True, 'false': False, 'null': None}.get(t, t)
        if isinstance(v, str): v = float(v) if '.' in v else int(v)
        return v, m.end()
    raise ValueError('valeur JS inattendue: ' + s[i:i + 30])


def parse_I(src):
    """Reconstruit le tableau I des exercices sous forme de listes Python."""
    root = {}
    for m in _ASSIGN.finditer(src):
        idx = [int(x) for x in re.findall(r'\d+', m.group(1))]
        try:
            val, _ = _js_value(src, m.end())
        except (ValueError, IndexError, AssertionError):
            continue
        if not idx:
            continue
        node = root
        for k in idx[:-1]:
            node = node.setdefault(k, {})
            if not isinstance(node, dict):
                break
        else:
            if isinstance(val, list):
                val = {n: v for n, v in enumerate(val)} if val else {}
            node[idx[-1]] = val if not (isinstance(val, dict) and idx[-1] in node and isinstance(node[idx[-1]], dict) and node[idx[-1]]) else node[idx[-1]]
    def tolist(d):
        if isinstance(d, dict):
            n = max(d) + 1 if d else 0
            return [tolist(d.get(k)) for k in range(n)]
        return d
    return tolist(root)


def js_var(src, name, default=None):
    m = re.search(r'var\s+' + name + r'\s*=\s*', src)
    if not m:
        return default
    try:
        return _js_value(src, m.end())[0]
    except Exception:
        return default


def text(s):
    """Chaîne JS (pouvant contenir des entités HTML) -> texte brut."""
    return html.unescape(s or '').replace('\xa0', ' ').strip()

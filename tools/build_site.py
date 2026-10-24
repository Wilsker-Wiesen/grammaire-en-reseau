"""Baut die Pages-Seite aus app/ nach _site/.

app/index.html ist ohne Dokumentrahmen geschrieben (für das Claude-Artifact).
Für GitHub Pages bekommt sie Doctype, Kopfzeilen für die App-Installation
(Manifest, Symbole) und die Anmeldung des Offline-Moduls (sw.js).

Aufruf: python3 tools/build_site.py [Versionskennung]
"""
import json
import re
import pathlib
import shutil
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"
SITE = ROOT / "_site"
VERSION = sys.argv[1] if len(sys.argv) > 1 else "lokal-" + str(int(time.time()))

src = (APP / "index.html").read_text(encoding="utf-8")
cut = src.index('<div class="shell"')
links, body = src[:cut], src[cut:]
links = links.replace("<title>Grammaire en réseau</title>\n", "")

head = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Grammaire en réseau</title>
<meta name="author" content="Jan Wilsker-Wiesen">
<meta name="theme-color" content="#0b4f4a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Grammaire">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{links.strip()}
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}</style>
</head>
<body>
"""

register = """
<script>
// Fonctionne aussi sans Internet après la première visite
if('serviceWorker' in navigator&&!/^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})})}
</script>
</body>
</html>
"""

if SITE.exists():
    shutil.rmtree(SITE)
shutil.copytree(APP, SITE, ignore=shutil.ignore_patterns("index.html", "sw.js", ".DS_Store"))
page = head + body.rstrip() + register
# Versionskennung an Skripte und Stylesheet hängen, damit Browser keine alte Fassung weiterverwenden
page = re.sub(r'(src|href)="((?:js/[^"]+\.js)|data\.js|styles\.css)"', lambda m: f'{m.group(1)}="{m.group(2)}?v={VERSION}"', page)
(SITE / "index.html").write_text(page, encoding="utf-8")
# alle Dateien für den Offline-Betrieb vormerken
files = ["./", "index.html"] + sorted(
    p.relative_to(SITE).as_posix() for p in SITE.rglob("*") if p.is_file() and p.name != "index.html")
sw = (APP / "sw.js").read_text(encoding="utf-8").replace("__VERSION__", VERSION)
sw = sw.replace("__FILES__", json.dumps(files, ensure_ascii=False))
(SITE / "sw.js").write_text(sw, encoding="utf-8")
(SITE / ".nojekyll").touch()
print(f"_site/ gebaut (Version {VERSION}, {len(files)} Dateien)")

"""Erzeugt die App-Symbole (app/icons/): Netz aus Knoten auf Türkis-Verlauf.

Aufruf: .venv/bin/python tools/make_icons.py
"""
import pathlib
from PIL import Image, ImageDraw

OUT = pathlib.Path(__file__).resolve().parent.parent / "app" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
# Knoten (x, y, Radius) im 32er-Raster wie das Logo der Kopfzeile
NODES = [(8, 9, 3.2), (23, 7, 2.4), (17, 20, 4), (6, 24, 2), (27, 22, 2.6)]
EDGES = [(0, 2), (1, 2), (3, 2), (4, 2), (0, 1)]


def icon(size, maskable=False, radius=0.22):
    S = size * 4
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    grad = Image.new("RGBA", (S, S))
    a, b = (11, 79, 74), (20, 163, 148)
    px = grad.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=0 if maskable else int(S * radius), fill=255)
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)
    inner = 0.56 if maskable else 0.72
    off = S * (1 - inner) / 2
    k = S * inner / 32
    P = lambda n: (off + n[0] * k, off + n[1] * k)
    for i, j in EDGES:
        d.line([P(NODES[i]), P(NODES[j])], fill=(166, 236, 226, 255), width=max(2, int(1.5 * k)))
    for n in NODES:
        x, y = P(n); r = n[2] * k
        d.ellipse([x - r, y - r, x + r, y + r], fill=(211, 246, 240, 255))
    return img.resize((size, size), Image.LANCZOS)


icon(512).save(OUT / "icon-512.png")
icon(192).save(OUT / "icon-192.png")
icon(512, maskable=True).save(OUT / "icon-maskable-512.png")
icon(180, maskable=True).convert("RGB").save(OUT / "apple-touch-icon.png")
icon(32, radius=0.18).save(OUT / "favicon-32.png")
print("Symbole in", OUT)

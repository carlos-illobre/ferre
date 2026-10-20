"""Pone capturas una al lado de la otra, cada una con su título arriba, para comparar la
aplicación con su maqueta (o el antes con el después) en una sola imagen.

    python tests/capturas/lado-a-lado.py <salida.png> "<título>" <captura.png> "<título>" <captura.png> ... [--ancho 780]

Cada captura se lleva al mismo ancho (por omisión, el de la primera). Necesita Pillow.
"""
import sys

from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
ancho = None
if "--ancho" in args:
    i = args.index("--ancho")
    ancho = int(args[i + 1])
    del args[i:i + 2]
salida, pares = args[0], args[1:]
if not pares or len(pares) % 2:
    sys.exit(__doc__)


def fuente(tam):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", tam)
    except OSError:
        return ImageFont.load_default()


paneles = [(pares[i], Image.open(pares[i + 1]).convert("RGB")) for i in range(0, len(pares), 2)]
ancho = ancho or paneles[0][1].width
paneles = [(t, im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS)) for t, im in paneles]
margen, cabeza = 32, 64
total = Image.new("RGB", (margen + len(paneles) * (ancho + margen), cabeza + max(im.height for _, im in paneles) + margen), (236, 233, 225))
dibujo = ImageDraw.Draw(total)
x = margen
for titulo, im in paneles:
    dibujo.text((x, 20), titulo, fill=(26, 29, 27), font=fuente(26))
    total.paste(im, (x, cabeza))
    x += ancho + margen
total.save(salida, optimize=True)
print(salida, total.size)

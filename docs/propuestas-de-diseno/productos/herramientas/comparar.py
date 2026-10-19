# uv run --with pillow python herramientas/comparar.py  -> comparacion-compu.png y comparacion-celu.png
import pathlib
from PIL import Image, ImageDraw, ImageFont
B = pathlib.Path(__file__).resolve().parent.parent
FUENTE = str(B.parent / "_comun/fuentes/manrope-latin.woff2")
def fuente(t):
    try: return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", t)
    except Exception: return ImageFont.load_default()
def armar(paneles, salida, ancho):
    ims = [(t, Image.open(B / p).convert("RGB")) for t, p in paneles]
    ims = [(t, im.resize((ancho, int(im.height * ancho / im.width)), Image.LANCZOS)) for t, im in ims]
    m, cab = 32, 64
    W = m + sum(im.width + m for _, im in ims); H = cab + max(im.height for _, im in ims) + m
    out = Image.new("RGB", (W, H), (236, 233, 225)); d = ImageDraw.Draw(out); x = m
    for t, im in ims:
        d.text((x, 20), t, fill=(26, 29, 27), font=fuente(26)); out.paste(im, (x, cab)); x += im.width + m
    out.save(B / salida, optimize=True); print(salida, out.size)
armar([("1 · Evolución: lista y ficha lado a lado", "compu/variante-1-lado-a-lado/captura.png"),
       ("2 · Reinvención: la bandeja de lo que hay que atender", "compu/variante-2-bandeja/captura.png"),
       ("3 · Audaz: planilla de proveedores + vista rápida", "compu/variante-3-planilla/captura.png")], "comparacion-compu.png", 1366)
armar([("1 · Evolución: lista", "celu/variante-1-ficha/captura-lista.png"),
       ("1 · Evolución: ficha", "celu/variante-1-ficha/captura.png"),
       ("2 · Reinvención: apuntá y sabé", "celu/variante-2-apunta/captura.png"),
       ("3 · Audaz: la etiqueta (frente)", "celu/variante-3-etiqueta/captura.png"),
       ("3 · Audaz: dada vuelta", "celu/variante-3-etiqueta/captura-dorso.png")], "comparacion-celu.png", 780)

# Arma comparacion-compu.png y comparacion-celu.png con las capturas lado a lado.
import sys, os
from PIL import Image, ImageDraw, ImageFont
A = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
def armar(modo, titulos, ancho_obj):
    dirs = sorted(os.listdir(os.path.join(A, modo)))
    ims = [Image.open(os.path.join(A, modo, d, "captura.png")).convert("RGB") for d in dirs]
    ims = [im.resize((ancho_obj, int(im.height * ancho_obj / im.width)), Image.LANCZOS) for im in ims]
    pad, cab = 40, 90
    W = pad + sum(im.width + pad for im in ims); H = cab + max(im.height for im in ims) + pad
    out = Image.new("RGB", (W, H), (244, 242, 236)); d = ImageDraw.Draw(out)
    f = ImageFont.truetype(F, 34 if modo == "compu" else 30)
    x = pad
    for im, t in zip(ims, titulos):
        d.text((x, 28), t, font=f, fill=(26, 29, 27))
        out.paste(im, (x, cab)); x += im.width + pad
    out.save(os.path.join(A, f"comparacion-{modo}.png"), optimize=True)
armar("compu", ["1 · La evolución: bandeja y detalle", "2 · La reinvención: qué hay que contar", "3 · La audaz: la tarde de Ana"], 1366)
armar("celu", ["1 · Tarjetas que se abren", "2 · De a una, deslizando", "3 · Sobres y a contar"], 780)

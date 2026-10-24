# Arma comparacion-compu.png y comparacion-celu.png con las capturas lado a lado y su título.
# uso: python3 comparar.py   (necesita Pillow)
import os, glob
from PIL import Image, ImageDraw, ImageFont
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = os.path.join(B, "..", "_comun", "fuentes", "manrope-latin.woff2")
TITULOS = {
 "compu": ["1 · Evolución: la hoja con el código", "2 · Reinvención: el código en la venta", "3 · Audaz: el gemelo del celular"],
 "celu": ["1 · Evolución: la cámara adentro", "2 · Reinvención: lector siempre listo", "3 · Audaz: la isla de la venta"],
}
def fuente(t):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f): return ImageFont.truetype(f, t)
    return ImageFont.load_default()
for disp, ancho in (("compu", 1040), ("celu", 780)):
    ims = [Image.open(f).convert("RGB") for f in sorted(glob.glob(f"{B}/{disp}/variante-*/captura.png"))]
    ims = [im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS) for im in ims]
    m, cab = 32, 64
    W = m + sum(i.width + m for i in ims); H = cab + max(i.height for i in ims) + m
    lienzo = Image.new("RGB", (W, H), (244, 242, 236)); d = ImageDraw.Draw(lienzo); x = m
    for im, t in zip(ims, TITULOS[disp]):
        d.text((x, 18), t, fill=(26, 29, 27), font=fuente(30))
        lienzo.paste(im, (x, cab)); d.rectangle([x - 1, cab - 1, x + im.width, cab + im.height], outline=(206, 200, 186))
        x += im.width + m
    lienzo.save(f"{B}/comparacion-{disp}.png", optimize=True); print(disp, lienzo.size)

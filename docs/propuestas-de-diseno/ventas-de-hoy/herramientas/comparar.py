# Arma comparacion-compu.png y comparacion-celu.png con las capturas lado a lado y un título arriba.
import os, sys
from PIL import Image, ImageDraw, ImageFont
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
fuente = os.path.join(base, "..", "_comun", "fuentes", "manrope-latin.woff2")
TIT = {
 "compu": [("variante-1-el-dia", "1 · Evolución: el día arriba, la venta al lado"), ("variante-2-cuaderno", "2 · Reinvención: se corrige como en el cuaderno"), ("variante-3-cajones", "3 · Audaz: los cuatro cajones")],
 "celu": [("variante-1-el-dia", "1 · Evolución: el día"), ("variante-2-hoja", "2 · Reinvención: una hoja"), ("variante-3-camara", "3 · Audaz: se escanea")],
}
def letra(t):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f): return ImageFont.truetype(f, t)
    return ImageFont.load_default()
for modo, items in TIT.items():
    imgs = [Image.open(os.path.join(base, modo, d, "captura.png")).convert("RGB") for d, _ in items]
    w, h = imgs[0].size
    pad, cab = 40, 90
    lienzo = Image.new("RGB", (pad + len(imgs) * (w + pad), cab + h + pad), (244, 242, 236))
    d = ImageDraw.Draw(lienzo); f = letra(40 if modo == "compu" else 36)
    for k, (im, (_, t)) in enumerate(zip(imgs, items)):
        x = pad + k * (w + pad)
        d.text((x, 28), t, fill=(26, 29, 27), font=f)
        lienzo.paste(im, (x, cab))
    if modo == "compu": lienzo = lienzo.resize((lienzo.width * 3 // 4, lienzo.height * 3 // 4), Image.LANCZOS)
    lienzo.save(os.path.join(base, f"comparacion-{modo}.png"), optimize=True)
    print(modo, lienzo.size)

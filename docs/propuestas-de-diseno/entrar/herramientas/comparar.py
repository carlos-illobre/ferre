# Arma comparacion-compu.png (arriba la entrada, abajo un estado) y comparacion-celu.png.
from PIL import Image, ImageDraw, ImageFont
import glob, os
B = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
F = "/tmp/claude-0/-home-user-ferre/1f0bdfe8-1b7f-5abe-8606-b593dc3334ae/scratchpad/maquetas/_comun/fuentes/manrope-latin.woff2"
try: fuente = ImageFont.truetype(F, 30); chica = ImageFont.truetype(F, 22)
except Exception: fuente = ImageFont.load_default(); chica = fuente
try: fuente.set_variation_by_axes([800]); chica.set_variation_by_axes([650])
except Exception: pass
FONDO = (244, 242, 236); TINTA = (26, 29, 27)
def lamina(filas, nombres, ancho, salida, sub=None):
    pad, cab = 28, 56
    alto_f = [int(max(Image.open(p).height * ancho / Image.open(p).width for p in fila)) for fila in filas]
    W = pad + len(nombres) * (ancho + pad); H = pad + sum(cab + h + pad for h in alto_f)
    L = Image.new("RGB", (W, H), FONDO); d = ImageDraw.Draw(L); y = pad
    for k, fila in enumerate(filas):
        for i, p in enumerate(fila):
            x = pad + i * (ancho + pad)
            t = nombres[i] if k == 0 else (sub[i] if sub else "")
            d.text((x, y + 8), t, fill=TINTA, font=fuente if k == 0 else chica)
            im = Image.open(p).convert("RGB"); im = im.resize((ancho, int(im.height * ancho / im.width)), Image.LANCZOS)
            L.paste(im, (x, y + cab)); d.rectangle([x - 1, y + cab - 1, x + ancho, y + cab + im.height], outline=(206, 200, 186))
        y += cab + alto_f[k] + pad
    L.save(os.path.join(B, salida), optimize=True); print(salida, L.size)
cv = sorted(glob.glob(f"{B}/compu/variante-*"))
lamina([[f"{v}/captura.png" for v in cv], [f"{v}/estados.png" for v in cv]],
       ["1 · Evolución: el mostrador", "2 · Reinvención: ¿quién atiende?", "3 · Audaz: el cartel del local"], 900, "comparacion-compu.png",
       ["Estado: cuenta sin permiso", "Estado: esperando la huella en el celular", "Estado: código leído, falta la huella"])
ce = sorted(glob.glob(f"{B}/celu/variante-*"))
lamina([[f"{v}/captura.png" for v in ce]], ["1 · Evolución: el mostrador", "2 · Reinvención: la huella es la puerta", "3 · Audaz: pantalla bloqueada"], 600, "comparacion-celu.png")
lamina([[f"{v}/estados.png" for v in ce]], ["1 · Oferta · sin permiso · código leído", "2 · Celular nuevo · oferta · sin permiso", "3 · Adentro en los dos · cámara · sin permiso"], 1100, "comparacion-celu-estados.png")

# uso: comparar.py salida.png ancho_cada "Título 1" img1 "Título 2" img2 ...
import sys
from PIL import Image, ImageDraw, ImageFont
out, w = sys.argv[1], int(sys.argv[2]); pares = list(zip(sys.argv[3::2], sys.argv[4::2]))
fuente = "/tmp/claude-0/-home-user-ferre/1f0bdfe8-1b7f-5abe-8606-b593dc3334ae/scratchpad/maquetas/_comun/fuentes/manrope-latin.woff2"
try:
    f = ImageFont.truetype(fuente, 34); f.set_variation_by_axes([800])
except Exception:
    f = ImageFont.load_default()
ims = [Image.open(p).convert("RGB") for _, p in pares]
ims = [im.resize((w, int(im.height * w / im.width)), Image.LANCZOS) for im in ims]
h = max(i.height for i in ims); pad = 40; top = 80
C = Image.new("RGB", (pad + len(ims) * (w + pad), top + h + pad), (236, 233, 225))
d = ImageDraw.Draw(C)
for k, ((t, _), im) in enumerate(zip(pares, ims)):
    x = pad + k * (w + pad); d.text((x, 22), t, font=f, fill=(26, 29, 27)); C.paste(im, (x, top))
C.save(out, optimize=True); print(out, C.size)

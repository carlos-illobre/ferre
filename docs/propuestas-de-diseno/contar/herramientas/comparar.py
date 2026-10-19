# uso: comparar.py salida.png columnas "titulo|captura.png" ...
import sys
from PIL import Image, ImageDraw, ImageFont
out, cols, items = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
fuente = "/tmp/claude-0/-home-user-ferre/1f0bdfe8-1b7f-5abe-8606-b593dc3334ae/scratchpad/maquetas/_comun/fuentes/manrope-latin.woff2"
try:
    f = ImageFont.truetype(fuente, 40); f.set_variation_by_axes([800])
except Exception:
    f = ImageFont.load_default()
ims = [(t, Image.open(p).convert("RGB")) for t, p in (x.split("|") for x in items)]
w = max(i.width for _, i in ims); h = max(i.height for _, i in ims)
esc = 1.0
if w > 1400: esc = 1366 / w
w, h = int(w*esc), int(h*esc)
pad, tit = 28, 64
rows = (len(ims)+cols-1)//cols
lienzo = Image.new("RGB", (cols*w + (cols+1)*pad, rows*(h+tit) + (rows+1)*pad - pad + pad), "#F4F2EC")
d = ImageDraw.Draw(lienzo)
for k, (t, im) in enumerate(ims):
    r, c = divmod(k, cols)
    x = pad + c*(w+pad); y = pad + r*(h+tit+pad)
    d.text((x, y), t, fill="#1A1D1B", font=f)
    lienzo.paste(im.resize((w, h)), (x, y+tit))
lienzo.save(out, optimize=True)
print(lienzo.size)

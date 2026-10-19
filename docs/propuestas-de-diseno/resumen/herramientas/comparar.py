import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
# uso: comparar.py carpeta-resumen compu|celu
B, modo = sys.argv[1], sys.argv[2]
vs = sorted(glob.glob(os.path.join(B, modo, "variante-*", "captura.png")))
ims = [Image.open(v).convert("RGB") for v in vs]
if modo == "celu":
    ims = [im.resize((im.width//2, im.height//2), Image.LANCZOS) for im in ims]
else:
    ims = [im.resize((int(im.width*.6), int(im.height*.6)), Image.LANCZOS) for im in ims]
gap, top = 32, 56
W = sum(i.width for i in ims) + gap*(len(ims)+1); H = max(i.height for i in ims) + top + gap
out = Image.new("RGB", (W, H), (236, 233, 225)); d = ImageDraw.Draw(out)
f = os.path.join(B, "..", "_comun", "fuentes")
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except Exception: font = ImageFont.load_default()
x = gap
for v, im in zip(vs, ims):
    nombre = {"1-tablero":"1 · Tablero (evolución)","2-el-dia":"2 · El día contado (reinvención)","3-la-cuenta":"3 · La cuenta del mes (audaz)","2-deslizar":"2 · Deslizá (reinvención)","3-conversacion":"3 · Te cuenta (audaz)"}.get(os.path.basename(os.path.dirname(v)).replace("variante-",""), "")
    d.text((x, 18), nombre, fill=(26, 29, 27), font=font)
    out.paste(im, (x, top)); x += im.width + gap
out.save(os.path.join(B, f"comparacion-{modo}.png"), optimize=True)
print(out.size)

# Arma comparacion-compu.png y comparacion-celu.png con las capturas de cada variante, lado a lado.
import os
from PIL import Image, ImageDraw, ImageFont
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.dirname(AQUI)
FUENTE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
TIT = {"compu": ["1 · Evolución: grilla", "2 · Reinvención: lo pendiente", "3 · Audaz: Ir a…"],
       "celu": ["1 · Evolución: lista", "2 · Reinvención: mosaico", "3 · Audaz: hoja encima"]}
for disp in ("compu", "celu"):
    dirs = sorted(d for d in os.listdir(os.path.join(RAIZ, disp)) if d.startswith("variante-"))
    ims = [Image.open(os.path.join(RAIZ, disp, d, "captura.png")).convert("RGB") for d in dirs]
    if disp == "celu": ims = [i.resize((i.width * 3 // 4, i.height * 3 // 4)) for i in ims]
    m, cab = 32, 72
    W = sum(i.width for i in ims) + m * (len(ims) + 1); H = max(i.height for i in ims) + cab + m
    o = Image.new("RGB", (W, H), "#F4F2EC"); d = ImageDraw.Draw(o); f = ImageFont.truetype(FUENTE, 30)
    x = m
    for t, i in zip(TIT[disp], ims):
        d.text((x, 22), t, fill="#1A1D1B", font=f); o.paste(i, (x, cab)); x += i.width + m
    o.save(os.path.join(RAIZ, "comparacion-" + disp + ".png"), optimize=True)

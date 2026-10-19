# Arma comparacion-compu.png y comparacion-celu.png con las capturas lado a lado.
import sys, pathlib
from PIL import Image, ImageDraw, ImageFont
P = pathlib.Path(__file__).resolve().parent.parent
F = ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 34)
FONDO = (244, 242, 236)
TIT = {
  'compu': ['1 · La evolución: el tablero de dibujo', '2 · La reinvención: el recorrido escrito', '3 · La audaz: contalo y se dibuja'],
  'celu': ['1 · Diagrama y hoja', '2 · La línea', '3 · ¿Y después?'],
}
for modo, ancho in (('compu', 1000), ('celu', 420)):
    vs = sorted((P / modo).glob('variante-*'))
    ims = []
    for v in vs:
        im = Image.open(v / 'captura.png').convert('RGB')
        ims.append(im.resize((ancho, round(im.height * ancho / im.width)), Image.LANCZOS))
    gap, top, mar = 40, 80, 32
    W = mar * 2 + sum(i.width for i in ims) + gap * (len(ims) - 1)
    H = top + max(i.height for i in ims) + mar
    out = Image.new('RGB', (W, H), FONDO)
    d = ImageDraw.Draw(out)
    x = mar
    for t, im in zip(TIT[modo], ims):
        d.text((x, 24), t, font=F if modo == 'compu' else ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Bold.otf', 26), fill=(26, 29, 27))
        out.paste(im, (x, top))
        d.rectangle([x - 1, top - 1, x + im.width, top + im.height], outline=(206, 200, 186))
        x += im.width + gap
    out.save(P / f'comparacion-{modo}.png', optimize=True)
    print(modo, out.size)

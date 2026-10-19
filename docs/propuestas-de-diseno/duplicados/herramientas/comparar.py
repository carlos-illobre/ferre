import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
D = Path(sys.argv[1]); C = D.parent / "_comun" / "fuentes"
def fuente(t):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if Path(p).exists(): return ImageFont.truetype(p, t)
    return ImageFont.load_default()
def armar(disp, items, ancho, out):
    ims = [Image.open(D/disp/c/"captura.png").convert("RGB") for c,_ in items]
    ims = [im.resize((ancho, round(im.height*ancho/im.width)), Image.LANCZOS) for im in ims]
    g, cab = 24, 64; h = max(i.height for i in ims)
    lienzo = Image.new("RGB", (g + len(ims)*(ancho+g), cab + h + g), (240,237,229))
    dr = ImageDraw.Draw(lienzo); f = fuente(30)
    for k,(im,(c,t)) in enumerate(zip(ims, items)):
        x = g + k*(ancho+g); lienzo.paste(im, (x, cab)); dr.text((x, 16), t, fill=(26,29,27), font=f)
    lienzo.save(D/out, optimize=True); print(out, lienzo.size)
armar("compu", [("variante-1-bandeja","1 · Evolución: la bandeja"),("variante-2-asi-queda","2 · Reinvención: así queda"),("variante-3-de-a-uno","3 · Audaz: de a uno, sin marco")], 1024, "comparacion-compu.png")
armar("celu", [("variante-1-renovada","1 · Evolución: renovada"),("variante-2-pila","2 · Reinvención: la pila"),("variante-3-escaner","3 · Audaz: recorré el estante")], 640, "comparacion-celu.png")

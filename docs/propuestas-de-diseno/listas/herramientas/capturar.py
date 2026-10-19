# Captura cada variante de Listas y arma las comparaciones lado a lado.
# uso (desde cualquier lado): uv run --with playwright==1.56.0 --with pillow python capturar.py [compu|celu|todo]
import sys, asyncio, glob, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FUENTE = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

TITULOS = {
    "compu": ["1 · La evolución: la bandeja y la revisión", "2 · La reinvención: qué pasa en el mostrador", "3 · La audaz: la planilla tal cual llegó"],
    "celu": ["1 · Evolución: listas", "2 · Reinvención: el impacto", "3 · Audaz: remarcar caminando"],
}

async def capturar(modo):
    carpetas = sorted(glob.glob(os.path.join(BASE, modo, "variante-*")))
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        if modo == "compu":
            ctx = await b.new_context(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
        else:
            ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        for c in carpetas:
            pg = await ctx.new_page()
            msgs = []
            pg.on("console", lambda m: msgs.append(m.text))
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            await pg.goto("file://" + os.path.join(c, "index.html"))
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            # textos de menos de 14 px y desbordes horizontales
            chicos = await pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<14).map(e=>e.textContent.trim().slice(0,30))""")
            ancho = await pg.evaluate("document.documentElement.scrollWidth")
            await pg.screenshot(path=os.path.join(c, "captura.png"))
            print(os.path.basename(c), "ancho", ancho, "| <14px:", chicos[:5], *msgs)
            await pg.close()
        await b.close()
    return carpetas

def comparar(modo, carpetas):
    imgs = [Image.open(os.path.join(c, "captura.png")).convert("RGB") for c in carpetas]
    esc = 0.6 if modo == "compu" else 0.5
    imgs = [i.resize((int(i.width * esc), int(i.height * esc)), Image.LANCZOS) for i in imgs]
    gap, top, marg = 24, 64, 24
    W = sum(i.width for i in imgs) + gap * (len(imgs) - 1) + marg * 2
    H = max(i.height for i in imgs) + top + marg
    lienzo = Image.new("RGB", (W, H), (236, 233, 225))
    d = ImageDraw.Draw(lienzo)
    f = ImageFont.truetype(FUENTE, 26 if modo == "compu" else 22)
    x = marg
    for n, i in enumerate(imgs):
        d.text((x, 20), TITULOS[modo][n] if n < len(TITULOS[modo]) else os.path.basename(carpetas[n]), fill=(26, 29, 27), font=f)
        lienzo.paste(i, (x, top))
        x += i.width + gap
    lienzo.save(os.path.join(BASE, f"comparacion-{modo}.png"), optimize=True)

modos = ["compu", "celu"] if len(sys.argv) < 2 or sys.argv[1] == "todo" else [sys.argv[1]]
for m in modos:
    cs = asyncio.run(capturar(m))
    if cs:
        comparar(m, cs)

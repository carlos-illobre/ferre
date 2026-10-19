# Captura cada variante (compu 1366×768, celu 390×844 a escala 2) y arma las comparaciones.
# uso: uv run --with playwright==1.56.0 --with pillow python capturar.py <carpeta mejoras-y-errores> [filtro]
import sys, asyncio, glob, os
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont
P = sys.argv[1]; filtro = sys.argv[2] if len(sys.argv) > 2 else ""
FUENTE = os.path.join(P, "..", "_comun", "fuentes", "manrope-latin.woff2")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for modo in ("compu", "celu"):
            ctx = await b.new_context(viewport={"width": 1366, "height": 768} if modo == "compu" else {"width": 390, "height": 844},
                                      device_scale_factor=1 if modo == "compu" else 2)
            for html in sorted(glob.glob(f"{P}/{modo}/*/index.html")):
                if filtro not in html: continue
                pg = await ctx.new_page(); msgs = []
                pg.on("console", lambda m: msgs.append(m.text)); pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
                await pg.goto("file://" + html); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(300)
                chicos = await pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<14&&e.getClientRects().length).map(e=>e.textContent.trim().slice(0,30)+' '+getComputedStyle(e).fontSize)""")
                desb = await pg.evaluate("document.documentElement.scrollWidth > innerWidth")
                await pg.screenshot(path=os.path.join(os.path.dirname(html), "captura.png"))
                print(html.split(P)[1], "| chicos:", chicos[:6], "| desborda:", desb, *msgs)
                await pg.close()
        await b.close()
asyncio.run(main())

NOMBRES = {"variante-1-buzon": "1 · Evolución: el buzón", "variante-2-bandeja": "2 · Reinvención: la bandeja",
           "variante-3-sobre-la-pantalla": "3 · Audaz: F1 sobre la pantalla", "variante-2-charla": "2 · Reinvención: la charla",
           "variante-3-sacudir": "3 · Audaz: sacudí y marcá"}
def comparar(modo):
    caps = sorted(glob.glob(f"{P}/{modo}/*/captura.png"))
    if not caps: return
    ims = [Image.open(c).convert("RGB") for c in caps]
    w = 1000 if modo == "compu" else 600
    ims = [im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) for im in ims]
    pad, cab = 24, 64; h = max(i.height for i in ims)
    lienzo = Image.new("RGB", (pad + len(ims) * (w + pad), cab + h + pad), (244, 242, 236))
    d = ImageDraw.Draw(lienzo)
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except Exception: f = ImageFont.load_default()
    for k, (c, im) in enumerate(zip(caps, ims)):
        x = pad + k * (w + pad)
        clave = os.path.basename(os.path.dirname(c))
        nombre = NOMBRES.get(clave, clave)
        d.text((x, 18), nombre, fill=(26, 29, 27), font=f)
        lienzo.paste(im, (x, cab))
    lienzo.save(f"{P}/comparacion-{modo}.png", optimize=True)
comparar("compu"); comparar("celu")

# Captura las variantes de Pedidos y arma las comparaciones.
# uso: uv run --with playwright==1.56.0 --with pillow python capturas.py [compu|celu] [nombre-de-carpeta]
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path(__file__).resolve().parent.parent

NOMBRES = {
    "variante-1-mesa": "Evolución: la mesa de pedidos",
    "variante-2-una-pasada": "Reinvención: reponer en una pasada",
    "variante-3-radar": "Audaz: el radar de entregas",
    "variante-1-lista": "Evolución",
    "variante-2-el-mensaje": "Reinvención: el mensaje",
    "variante-3-sobres": "Audaz: los sobres",
}

async def variantes(b, solo_disp=None, solo=None):
    for disp in ("compu", "celu"):
        if solo_disp and disp != solo_disp:
            continue
        for d in sorted((BASE / disp).iterdir()):
            html = d / "index.html"
            if not html.exists() or (solo and solo not in d.name):
                continue
            if disp == "compu":
                ctx = await b.new_context(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
            else:
                ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            pg = await ctx.new_page()
            msgs = []
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            pg.on("console", lambda m: msgs.append("CONSOLA " + m.type + " " + m.text) if m.type in ("error", "warning") else None)
            pg.on("pageerror", lambda e: msgs.append("ERROR " + str(e)))
            await pg.goto("file://" + str(html))
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            chicos = await pg.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType==3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14 && !e.classList.contains('peso')).map(e => e.textContent.trim().slice(0,30))""")
            await pg.screenshot(path=str(d / "captura.png"))
            await ctx.close()
            print(disp, d.name, *msgs, ("CHICOS: " + "|".join(chicos[:8])) if chicos else "")

def comparar(disp):
    dirs = [d for d in sorted((BASE / disp).iterdir()) if (d / "captura.png").exists()]
    imgs = [Image.open(d / "captura.png").convert("RGB") for d in dirs]
    escala = 0.62 if disp == "compu" else 0.5
    imgs = [im.resize((int(im.width * escala), int(im.height * escala)), Image.LANCZOS) for im in imgs]
    pad, cab = 24, 64
    W = sum(i.width for i in imgs) + pad * (len(imgs) + 1)
    H = max(i.height for i in imgs) + cab + pad
    lienzo = Image.new("RGB", (W, H), (236, 233, 225))
    dr = ImageDraw.Draw(lienzo)
    f = ImageFont.truetype(str(BASE / "herramientas" / "Manrope.ttf"), 30)
    try:
        f.set_variation_by_axes([800])
    except Exception:
        pass
    x = pad
    for d, im in zip(dirs, imgs):
        n = d.name.split("-")[1]
        dr.text((x, 16), f"{n} · " + NOMBRES[d.name], fill=(26, 29, 27), font=f)
        lienzo.paste(im, (x, cab))
        x += im.width + pad
    lienzo.save(BASE / f"comparacion-{disp}.png", optimize=True)

async def main():
    disp = sys.argv[1] if len(sys.argv) > 1 else None
    solo = sys.argv[2] if len(sys.argv) > 2 else None
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        await variantes(b, disp, solo)
        await b.close()
    if not solo:
        for dd in ("compu", "celu"):
            if not disp or dd == disp:
                comparar(dd)

asyncio.run(main())

# Captura todas las variantes de Compras y arma las comparaciones.
# uso: uv run --with playwright==1.56.0 --with pillow python capturas.py [factura]
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path(__file__).resolve().parent.parent
FUENTE = BASE.parent / "_comun" / "fuentes" / "manrope-latin.woff2"

async def factura(b):
    ctx = await b.new_context(viewport={"width": 600, "height": 800}, device_scale_factor=1.5)
    pg = await ctx.new_page()
    await pg.goto("file://" + str(BASE / "herramientas" / "factura.html"))
    await pg.evaluate("document.fonts.ready")
    png = BASE / "herramientas" / "factura.png"
    await pg.locator(".hoja").screenshot(path=str(png))
    Image.open(png).convert("RGB").save(BASE / "propio" / "factura.webp", "WEBP", quality=80)
    print("factura", (BASE / "propio" / "factura.webp").stat().st_size)

async def variantes(b):
    salidas = {}
    for disp in ("compu", "celu"):
        for d in sorted((BASE / disp).iterdir()):
            html = d / "index.html"
            if not html.exists():
                continue
            if disp == "compu":
                ctx = await b.new_context(viewport={"width": 1366, "height": 768}, device_scale_factor=1)
            else:
                ctx = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
            pg = await ctx.new_page()
            msgs = []
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            await pg.goto("file://" + str(html))
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            # textos de menos de 14 px (fuera de la factura, que es una foto)
            chicos = await pg.evaluate("""() => [...document.querySelectorAll('body *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType==3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 14 && !e.closest('.sin-control') && !e.classList.contains('peso')).map(e => e.textContent.trim().slice(0,30))""")
            await pg.screenshot(path=str(d / "captura.png"))
            await ctx.close()
            salidas.setdefault(disp, []).append(d)
            print(disp, d.name, *msgs, ("CHICOS: " + "|".join(chicos[:8])) if chicos else "")
    return salidas

NOMBRES = {
    "variante-1-escritorio": "Evolución: el escritorio de compras",
    "variante-2-bandeja": "Reinvención: la bandeja de facturas",
    "variante-3-camino": "Audaz: el camino de la mercadería",
    "variante-1-resumen": "Evolución",
    "variante-2-camara": "Reinvención: cámara",
    "variante-3-conversacion": "Audaz: un chat",
}

def comparar(disp, dirs):
    imgs = [Image.open(d / "captura.png").convert("RGB") for d in dirs]
    escala = 0.62 if disp == "compu" else 0.5
    imgs = [im.resize((int(im.width * escala), int(im.height * escala)), Image.LANCZOS) for im in imgs]
    pad, cab = 24, 64
    W = sum(i.width for i in imgs) + pad * (len(imgs) + 1)
    H = max(i.height for i in imgs) + cab + pad
    lienzo = Image.new("RGB", (W, H), (236, 233, 225))
    dr = ImageDraw.Draw(lienzo)
    try:
        f = ImageFont.truetype(str(BASE / "herramientas" / "Manrope.ttf"), 30)
        f.set_variation_by_axes([800])
    except Exception:
        f = ImageFont.load_default(size=30)
    x = pad
    for d, im in zip(dirs, imgs):
        n = d.name.split("-")[1]
        dr.text((x, 16), f"{n} · " + NOMBRES[d.name], fill=(26, 29, 27), font=f)
        lienzo.paste(im, (x, cab))
        x += im.width + pad
    lienzo.save(BASE / f"comparacion-{disp}.png", optimize=True)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        if "factura" in sys.argv:
            await factura(b)
        else:
            s = await variantes(b)
            for disp, dirs in s.items():
                comparar(disp, dirs)
        await b.close()

asyncio.run(main())

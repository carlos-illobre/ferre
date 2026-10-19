# Captura cada variante: captura.png (pantalla) y, en el celular, captura-entera.png (todo el largo).
# uso: uv run --with playwright==1.56.0 python capturar.py [filtro]
import sys, asyncio, glob, os
from playwright.async_api import async_playwright
B = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
filtro = sys.argv[1] if len(sys.argv) > 1 else ""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for html in sorted(glob.glob(f"{B}/*/variante-*/index.html")):
            if filtro not in html: continue
            d = os.path.dirname(html); celu = "/celu/" in html
            vp = {"width": 390, "height": 844} if celu else {"width": 1366, "height": 768}
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if celu else 1)
            pg = await ctx.new_page(); msgs = []
            pg.on("console", lambda m: msgs.append(m.text))
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            await pg.goto("file://" + html); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=f"{d}/captura.png")
            if celu:
                await pg.goto("file://" + html + "?entera"); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(300)
                await pg.screenshot(path=f"{d}/captura-entera.png", full_page=True)
            # textos de menos de 14 px y desbordes horizontales
            chicos = await pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<14).map(e=>e.textContent.trim().slice(0,30))""")
            ancho = await pg.evaluate("document.documentElement.scrollWidth")
            print(os.path.relpath(d, B), "| ancho", ancho, "| <14px:", chicos[:5], *msgs)
            await ctx.close()
        await b.close()
asyncio.run(main())

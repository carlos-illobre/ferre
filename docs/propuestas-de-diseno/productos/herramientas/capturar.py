# Captura cada variante: uv run --with playwright==1.56.0 python herramientas/capturar.py [filtro]
import sys, asyncio, pathlib
from playwright.async_api import async_playwright
BASE = pathlib.Path(__file__).resolve().parent.parent
async def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else ""
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for html in sorted(BASE.glob("*/variante-*/*.html")):
            rel = str(html.relative_to(BASE))
            if filtro not in rel: continue
            celu = rel.startswith("celu")
            ctx = await b.new_context(viewport={"width": 390, "height": 844} if celu else {"width": 1366, "height": 768}, device_scale_factor=2 if celu else 1)
            pg = await ctx.new_page()
            msgs = []
            pg.on("console", lambda m: msgs.append(m.text))
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            await pg.goto(html.as_uri())
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(300)
            nombre = "captura.png" if html.name == "index.html" else "captura-" + html.stem + ".png"
            await pg.screenshot(path=str(html.parent / nombre))
            # textos de menos de 14 px y desbordes horizontales
            chicos = await pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<14&&!e.classList.contains('peso')).map(e=>e.textContent.trim().slice(0,30))""")
            print(rel, "->", nombre, *msgs, ("CHICOS: " + str(chicos[:8])) if chicos else "", sep="  ")
            await ctx.close()
        await b.close()
asyncio.run(main())

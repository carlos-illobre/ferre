# Captura cada página de entrar/ con Playwright.
# uso: uv run --with playwright==1.56.0 python herramientas/capturar.py [filtro]
import sys, asyncio, glob, os
from playwright.async_api import async_playwright
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
async def main():
    filtro = sys.argv[1] if len(sys.argv) > 1 else ""
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for html in sorted(glob.glob(f"{BASE}/*/variante-*/*.html")):
            if filtro not in html: continue
            celu = "/celu/" in html; estados = html.endswith("estados.html")
            if celu and not estados: vp, dsf = {"width": 390, "height": 844}, 2
            elif celu: vp, dsf = {"width": 1290, "height": 960}, 1
            else: vp, dsf = {"width": 1366, "height": 768}, 1
            ctx = await b.new_context(viewport=vp, device_scale_factor=dsf)
            pg = await ctx.new_page(); msgs = []
            pg.on("console", lambda m: msgs.append(m.text))
            pg.on("requestfailed", lambda r: msgs.append("FALLÓ " + r.url))
            await pg.goto("file://" + html)
            await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(300)
            out = os.path.join(os.path.dirname(html), "captura.png" if not estados else "estados.png")
            await pg.screenshot(path=out, full_page=estados)
            # textos de menos de 14 px y desbordes horizontales
            chicos = await pg.evaluate("""[...document.querySelectorAll('body *')].filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType==3&&n.textContent.trim())&&parseFloat(getComputedStyle(e).fontSize)<14&&e.offsetParent).map(e=>e.textContent.trim().slice(0,30))""")
            print(os.path.relpath(out, BASE), *msgs, ("CHICOS: %s" % chicos[:5]) if chicos else "")
            await ctx.close()
        await b.close()
asyncio.run(main())

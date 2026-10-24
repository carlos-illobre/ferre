# Abre cada variante una vez, junta lo que diga la consola y saca una captura después de tocar el primer botón que abre algo (para mirar).
import sys, asyncio, glob, os
from playwright.async_api import async_playwright
SALIDA = sys.argv[1] if len(sys.argv) > 1 else "."
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for html in sorted(glob.glob(os.path.abspath("../*/variante-*/index.html"))):
            celu = "/celu/" in html
            ctx = await b.new_context(viewport={"width": 390 if celu else 1366, "height": 844 if celu else 768}, device_scale_factor=1)
            pg = await ctx.new_page(); msgs = []
            pg.on("console", lambda m: msgs.append(m.type + ": " + m.text))
            pg.on("pageerror", lambda e: msgs.append("ERROR " + str(e)))
            await pg.goto("file://" + html); await pg.wait_for_timeout(500)
            await pg.locator("[data-avisar], [data-ir=anomalias]").first.click(); await pg.wait_for_timeout(450)
            n = html.split("/")[-3] + "-" + html.split("/")[-2]
            await pg.screenshot(path=os.path.join(SALIDA, n + "-tocado.png"))
            print(n, msgs or "consola limpia")
            await ctx.close()
        await b.close()
asyncio.run(main())

import sys, asyncio
from playwright.async_api import async_playwright
# uso: capturar.py modo html salida [alto]   modo = compu | celu | pagina
async def main():
    modo, html, out = sys.argv[1], sys.argv[2], sys.argv[3]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        if modo == "compu":
            ctx = await b.new_context(viewport={"width":1366,"height":768}, device_scale_factor=1)
        elif modo == "celu":
            ctx = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2)
        else:
            ctx = await b.new_context(viewport={"width":int(sys.argv[4]) if len(sys.argv)>4 else 1366,"height":900}, device_scale_factor=1)
        pg = await ctx.new_page()
        msgs=[]
        pg.on("console", lambda m: msgs.append(m.text))
        pg.on("requestfailed", lambda r: msgs.append("FALLÓ "+r.url))
        await pg.goto("file://"+html)
        await pg.evaluate("document.fonts.ready")
        await pg.wait_for_timeout(400)
        fam = await pg.evaluate("document.fonts.check('16px Manrope') && [...document.fonts].filter(f=>f.status=='loaded').length")
        await pg.screenshot(path=out, full_page=(modo=="pagina"))
        print("fuentes cargadas:", fam, *msgs, sep="\n")
        await b.close()
asyncio.run(main())

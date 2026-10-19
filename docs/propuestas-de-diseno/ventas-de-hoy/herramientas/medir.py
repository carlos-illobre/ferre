import sys, asyncio
from playwright.async_api import async_playwright
# uso: medir.py modo html "expresión js"
async def main():
    modo, html, js = sys.argv[1:4]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        vp = {"width":1366,"height":768} if modo=="compu" else {"width":390,"height":844}
        pg = await (await b.new_context(viewport=vp)).new_page()
        await pg.goto("file://"+html); await pg.wait_for_timeout(300)
        print(await pg.evaluate(js)); await b.close()
asyncio.run(main())

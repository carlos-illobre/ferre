# Arma comparacion-compu.png y comparacion-celu.png con las capturas lado a lado.
import asyncio, os
from playwright.async_api import async_playwright
U = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRUPOS = {
 "compu": [("1 · La evolución: tabla y ficha", "compu/variante-1-tabla-y-ficha"),
           ("2 · La reinvención: la planilla de llaves", "compu/variante-2-planilla"),
           ("3 · La audaz: la puerta", "compu/variante-3-la-puerta")],
 "celu":  [("1 · La evolución: tarjetas", "celu/variante-1-tarjetas"),
           ("2 · La reinvención: la hoja de la persona", "celu/variante-2-hoja"),
           ("3 · La audaz: mostrale el código", "celu/variante-3-mostrale-el-codigo")],
}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for modo, vs in GRUPOS.items():
            w = 1366 if modo == "compu" else 780
            cols = "".join(f'<figure><figcaption>{t}</figcaption><img src="file://{U}/{c}/captura.png" style="width:{w}px"></figure>' for t, c in vs)
            html = f'''<html><head><style>@font-face{{font-family:M;src:url(file://{U}/../_comun/fuentes/manrope-latin.woff2)}}
            body{{margin:0;background:#F4F2EC;font-family:M;padding:40px;display:flex;gap:40px;width:max-content}}
            figure{{margin:0}} figcaption{{font-size:44px;font-weight:800;margin:0 0 20px;color:#1A1D1B;letter-spacing:-.02em}}
            img{{border-radius:{16 if modo=="compu" else 36}px;box-shadow:0 12px 40px -12px rgba(0,0,0,.25);display:block}}</style></head><body>{cols}</body></html>'''
            f = f"{U}/herramientas/_comp_{modo}.html"; open(f, "w").write(html)
            ctx = await b.new_context(viewport={"width": 800, "height": 600}, device_scale_factor=1 if modo=="compu" else 1)
            pg = await ctx.new_page(); await pg.goto("file://" + f); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f"{U}/comparacion-{modo}.png", full_page=True)
        await b.close()
asyncio.run(main())

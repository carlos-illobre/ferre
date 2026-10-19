"""Captura las seis maquetas quietas (sin tocar nada) para comparar antes y después.
Uso: uv run --with playwright==1.56.0 --with pillow python quieta.py <carpeta-salida> [<carpeta-a-comparar>]"""
import sys, pathlib
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
VARIANTES = sorted(RAIZ.glob("*/variante-*/index.html"))
salida = pathlib.Path(sys.argv[1]); salida.mkdir(parents=True, exist_ok=True)
CONGELAR = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for html in VARIANTES:
        celu = html.parent.parent.name == "celu"
        ctx = nav.new_context(viewport={"width": 390, "height": 844} if celu else {"width": 1366, "height": 768},
                              device_scale_factor=2 if celu else 1, has_touch=celu)
        pg = ctx.new_page()
        pg.goto(html.as_uri()); pg.add_style_tag(content=CONGELAR); pg.wait_for_timeout(400)
        nombre = f"{html.parent.parent.name}-{html.parent.name}.png"
        pg.screenshot(path=str(salida / nombre)); ctx.close()
    nav.close()

if len(sys.argv) > 2:
    from PIL import Image, ImageChops
    otra = pathlib.Path(sys.argv[2])
    for f in sorted(salida.glob("*.png")):
        a, b = Image.open(f).convert("RGB"), Image.open(otra / f.name).convert("RGB")
        caja = ImageChops.difference(a, b).getbbox()
        print(("IGUAL   " if caja is None else f"DISTINTA {caja} ") + f.name)

"""Genera los archivos del logo de Ferrebress (la F-tornillo dentro de su tuerca) a partir de
una sola definición: los SVG y los íconos de la app en clientes/gestion-del-local-web/public/,
la marca dentro de los estilos de la v5 y una hoja de prueba en tests/capturas/salida/.
Uso: python tests/capturas/logo.py   (necesita Playwright)"""
import os, re, urllib.parse
from playwright.sync_api import sync_playwright

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
WEB = os.path.join(RAIZ, "clientes", "gestion-del-local-web")
VERDE, NARANJA, AMARILLO, CLARO = "#17312b", "#d83f0e", "#f7c445", "#f5f6f2"
# Cuánto ocupa la F dentro del hexágono, y dónde queda centrada.
ADENTRO = "translate(13.500 13) scale(0.68)"

def efe(tronco, brazo):
    borde = lambda c: f'stroke="{c}" stroke-width="2.500" stroke-linejoin="round"'
    return (f'<g transform="{ADENTRO} translate(6 0) skewX(-6)">'
            f'<path d="M42 38H68L58 50H42Z" fill="{brazo}" {borde(brazo)}/>'
            f'<path d="M26 16H78L66 30H40V62H26Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M28.500 60H37.500V86H28.500Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M19 68.500 47 63V67.500L19 73ZM21 78 45 73.500V78L21 82.500ZM24 87 42 83.500V88L24 91.500Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M29.500 92 36.500 90.500 33 96Z" fill="{tronco}" {borde(tronco)}/></g>')

# Lo que acompaña a la F abajo a la derecha, para que ese rincón no quede vacío.
DETALLES = {
    "tuerca": '<path d="M66 59.500 72.500 63.250V70.750L66 74.500 59.500 70.750V63.250Z" transform="rotate(14 66 67)" fill="none" stroke="{c}" stroke-width="4.200" stroke-linejoin="round"/>',
    "arandela": '<circle cx="66" cy="67" r="7.200" fill="none" stroke="{c}" stroke-width="4.200"/>',
    "tilde": '<path d="M57.500 66.500 63.500 72.500 75 59.500" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    "nada": "",
}
DETALLE = "tuerca"

def logo(fondo, tronco, brazo, detalle=None):
    return (f'<path d="M50 6 88.100 28V72L50 94 11.900 72V28Z" fill="{fondo}" stroke="{fondo}" stroke-width="8" stroke-linejoin="round"/>'
            + efe(tronco, brazo) + DETALLES[detalle or DETALLE].format(c=brazo))

def svg(contenido, lado=None):
    medida = f' width="{lado}" height="{lado}"' if lado else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"{medida}>{contenido}</svg>'

SOBRE_CLARO, SOBRE_OSCURO, EN_NARANJA = logo(VERDE, "#fff", NARANJA), logo(CLARO, VERDE, NARANJA), logo(NARANJA, "#fff", AMARILLO)

def escribir(ruta, texto):
    with open(os.path.join(WEB, ruta), "w") as f: f.write(texto)

def en_estilos(ruta, patron, regla):
    camino = os.path.join(WEB, ruta); s = open(camino).read()
    assert re.search(patron, s), f"no encontré la regla de la marca en {ruta}"
    open(camino, "w").write(re.sub(patron, lambda m: regla, s))

escribir("public/logo-ferrebress.svg", "<!-- Ferrebress: la F que es un tornillo, dentro de su tuerca. Para fondo claro. Lo genera tests/capturas/logo.py -->\n" + svg(SOBRE_CLARO) + "\n")
escribir("public/icono-v5.svg", "<!-- Ferrebress: el ícono de la pestaña del navegador. Lo genera tests/capturas/logo.py -->\n" + svg(SOBRE_CLARO) + "\n")
dato = "data:image/svg+xml," + urllib.parse.quote(svg(SOBRE_OSCURO).replace('"', "'"), safe="/:=' ()")
en_estilos("src/v5/compu/tema.css", r"\.marca::before \{[^}]*\}", f'.marca::before {{ content: ""; flex: none; width: 1.9em; height: 1.9em; background: url("{dato}") center / contain no-repeat; }}')
en_estilos("src/v5/celular/tema.css", r"\.entrar \.logo \{[^}]*\}", f'.entrar .logo {{ font-size: 0; width: 76px; height: 76px; border-radius: 0; background: url("{dato}") center / contain no-repeat; }}')

fila = lambda fondo, color, c: (f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;padding:20px;border-radius:14px;background:{fondo};color:{color};margin-top:10px">'
    + "".join(svg(c, n) for n in (150, 64, 32, 16)) + f'<span style="display:inline-flex;align-items:center;gap:12px;font-weight:700;font-size:2.2rem">{svg(c, 60)}Ferrebress</span>{svg(EN_NARANJA, 110)}</div>')
hoja = (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ferrebress: el logo</title></head>'
        f'<body style="margin:0;background:{CLARO};color:#18201e;font:17px/1.5 system-ui,sans-serif"><main style="max-width:980px;margin:0 auto;padding:28px 16px 56px">'
        f'<h1 style="font-size:1.6rem;margin:0 0 4px">Ferrebress: el logo</h1><p style="margin:0 0 12px;color:#4a5451">La F que es un tornillo, dentro de su tuerca. Sobre claro, sobre oscuro, con el nombre, en naranja y en tamaño chico.</p>'
        + fila("#fff", "#18201e", SOBRE_CLARO) + fila(VERDE, "#fff", SOBRE_OSCURO)
        + '<h2 style="font-size:1.2rem;margin:32px 0 0">Otras ideas para ese rincón</h2>'
        + "".join(f'<p style="margin:14px 0 0;color:#4a5451">{texto}</p>' + fila("#fff", "#18201e", logo(VERDE, "#fff", NARANJA, d)) for d, texto in [("arandela", "Una arandela."), ("tilde", "Un tilde: todo en orden."), ("nada", "Sin nada, como estaba.")])
        + "</main></body></html>")
escribir("public/logo.html", hoja)

# Íconos de la app instalada: el logo sobre fondo claro, con margen para el recorte «maskable».
cuadro = f'<rect width="100" height="100" fill="{CLARO}"/><g transform="translate(15 15) scale(0.7)">{SOBRE_CLARO}</g>'
os.makedirs(os.path.join(RAIZ, "tests", "capturas", "salida"), exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for lado in (192, 512):
        p = b.new_page(viewport={"width": lado, "height": lado}); p.set_content(f'<body style="margin:0">{svg(cuadro, lado)}</body>'); p.screenshot(path=os.path.join(WEB, "public", f"icono-{lado}.png")); p.close()
    p = b.new_page(viewport={"width": 1000, "height": 520}); p.set_content(hoja); p.wait_for_timeout(200); p.screenshot(path=os.path.join(RAIZ, "tests", "capturas", "salida", "logo.png"), full_page=True); b.close()
print("logo generado")

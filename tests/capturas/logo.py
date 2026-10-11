"""Genera los archivos del logo de Ferrebress (la F-tornillo dentro de su tuerca) a partir de
una sola definición: los SVG y los íconos de la app en clientes/gestion-del-local-web/public/,
el isotipo y el logotipo que dibuja la aplicación (src/principal) y una hoja de prueba en tests/capturas/salida/.
Uso: python tests/capturas/logo.py   (necesita Playwright)"""
import os, re, urllib.parse
from playwright.sync_api import sync_playwright

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
WEB = os.path.join(RAIZ, "clientes", "gestion-del-local-web")
VERDE, NARANJA, AMARILLO, CLARO = "#17312b", "#d83f0e", "#f7c445", "#f5f6f2"
# Cuánto ocupa la F dentro del hexágono, y dónde queda centrada.
# Para cada marco: cuánto ocupa la F adentro y dónde queda.
MARCOS = {
    # Un triángulo con la punta hacia abajo, como una plomada: acompaña la forma de la F, ancha arriba y en punta abajo.
    "triangulo": ('<path d="M10 12H90L50 92Z" fill="{f}" stroke="{f}" stroke-width="12" stroke-linejoin="round"/>', "translate(18.500 6) scale(0.7)"),
    # Triángulo rectángulo, como una escuadra: el ángulo recto arriba a la izquierda, donde arranca la F.
    # El cateto de arriba es más corto que el vertical, en la proporción de la F (más alta que ancha),
    # y todo el marco está inclinado igual que la F.
    "escuadra": ('<path d="M18 11H86L18 92Z" transform="translate(5.500 0) skewX(-6)" fill="{f}" stroke="{f}" stroke-width="12" stroke-linejoin="round"/>', "translate(10.500 7.500) scale(0.7)"),
    # El marco que pidió Carlos: sigue el contorno de la F a la misma distancia en los tres lados.
    # Arriba es horizontal, a la izquierda va paralelo al tronco y la diagonal pasa por la punta del
    # brazo y la punta del tornillo, todo a 13 de distancia de la F (en sus coordenadas). La esquina
    # de abajo se redondea con más radio (20) para que debajo de la punta quede el mismo aire.
    "envolvente": ('<path d="M22 3H81.300A13 13 0 0 1 92.400 22.700L46.200 99.400A20 20 0 0 1 9 89V16A13 13 0 0 1 22 3Z" transform="translate(5.600 1.900) scale(0.86) translate(6 0) skewX(-6)" fill="{f}"/>', "translate(5.600 1.900) scale(0.86)"),
    # Triángulo rectángulo, como una escuadra: el ángulo recto arriba a la izquierda, donde arranca la F.
    # El cateto de arriba es más corto que el vertical, en la proporción de la F (más alta que ancha),
    # y todo el marco está inclinado igual que la F.
    "escuadra": ('<path d="M18 11H86L18 92Z" transform="translate(5.500 0) skewX(-6)" fill="{f}" stroke="{f}" stroke-width="12" stroke-linejoin="round"/>', "translate(10.500 7.500) scale(0.7)"),
    # El marco que pidió Carlos: sigue el contorno de la F a la misma distancia en los tres lados.
    # Arriba es horizontal, a la izquierda va paralelo al tronco y la diagonal pasa por la punta del
    # brazo y la punta del tornillo, todo a 13 de distancia de la F (en sus coordenadas). La esquina
    # de abajo se redondea con más radio (20) para que debajo de la punta quede el mismo aire.
    "hexagono": ('<path d="M50 6 88.100 28V72L50 94 11.900 72V28Z" fill="{f}" stroke="{f}" stroke-width="8" stroke-linejoin="round"/>', "translate(13.500 13) scale(0.68)"),
}
MARCO = "envolvente"

def efe(tronco, brazo, ADENTRO):
    borde = lambda c: f'stroke="{c}" stroke-width="2.500" stroke-linejoin="round"'
    return (f'<g transform="{ADENTRO} translate(6 0) skewX(-6)">'
            f'<path d="M42 38H68L58 50H42Z" fill="{brazo}" {borde(brazo)}/>'
            f'<path d="M26 16H78L66 30H40V62H26Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M28.500 60H37.500V86H28.500Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M22 68 44.500 63.500V68L22 72.500ZM23.500 77.500 43 73.500V78L23.500 82ZM26 86.500 40.500 83.500V88L26 91Z" fill="{tronco}" {borde(tronco)}/>'
            f'<path d="M29.500 92 36.500 90.500 33 96Z" fill="{tronco}" {borde(tronco)}/></g>')

# Lo que acompaña a la F abajo a la derecha, para que ese rincón no quede vacío.
DETALLES = {
    # Una abrazadera doble (la grampa que sujeta dos caños): una planchuela con dos lomos. Es una B.
    "abrazadera": '<g transform="translate(4 0) skewX(-6)" fill="none" stroke="{c}" stroke-width="4.600" stroke-linecap="round" stroke-linejoin="round"><path d="M61 54.500V79.500"/><path d="M61 54.500H67.500A6 6 0 0 1 67.500 66.500H61"/><path d="M61 66.500H68.500A6.500 6.500 0 0 1 68.500 79.500H61"/></g>',
    "llave": '<g transform="translate(63.500 69) rotate(-42)"><path d="M-2 0H12" stroke="{c}" stroke-width="4.400" stroke-linecap="round"/><circle cx="-4" cy="0" r="5.600" fill="{c}"/><path d="M-11 -2.300H-4V2.300H-11Z" fill="{f}"/><circle cx="13" cy="0" r="4" fill="{c}"/><circle cx="13" cy="0" r="1.600" fill="{f}"/></g>',
    "nada": "",
}
DETALLE = "nada"

def logo(fondo, tronco, brazo, detalle=None, marco=None):
    forma, adentro = MARCOS[marco or MARCO]
    return forma.format(f=fondo) + efe(tronco, brazo, adentro) + DETALLES[detalle or DETALLE].format(c=brazo, f=fondo)

def svg(contenido, lado=None):
    medida = f' width="{lado}" height="{lado}"' if lado else ""
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"{medida}>{contenido}</svg>'

SOBRE_CLARO, SOBRE_OSCURO, EN_NARANJA = logo(VERDE, "#fff", NARANJA), logo(CLARO, VERDE, NARANJA), logo(NARANJA, "#fff", AMARILLO)

import base64
FUENTE = "data:font/woff2;base64," + base64.b64encode(open(os.path.join(WEB, "node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2"), "rb").read()).decode()

def escribir(ruta, texto):
    with open(os.path.join(WEB, ruta), "w") as f: f.write(texto)

def en_estilos(ruta, patron, regla):
    camino = os.path.join(WEB, ruta); s = open(camino).read()
    assert re.search(patron, s), f"no encontré la regla de la marca en {ruta}"
    open(camino, "w").write(re.sub(patron, lambda m: regla, s))

escribir("public/logo-ferrebress.svg", "<!-- Ferrebress: la F que es un tornillo, dentro de su tuerca. Para fondo claro. Lo genera tests/capturas/logo.py -->\n" + svg(SOBRE_CLARO) + "\n")
escribir("public/icono-v5.svg", "<!-- Ferrebress: el ícono de la pestaña del navegador. Lo genera tests/capturas/logo.py -->\n" + svg(SOBRE_CLARO) + "\n")
# El isotipo para dibujarlo dentro de la aplicación (sobre fondo claro y sobre fondo oscuro).
escribir("src/principal/isotipo.ts", "// El isotipo de Ferrebress: la F que es un tornillo, dentro de su marco. Lo genera\n// tests/capturas/logo.py a partir de una sola definición: no se edita a mano.\n"
         f"export const ISOTIPO_SOBRE_CLARO = `{svg(SOBRE_CLARO)}`;\nexport const ISOTIPO_SOBRE_OSCURO = `{svg(SOBRE_OSCURO)}`;\n")

# El logotipo: el isotipo hace de F en la palabra Ferrebress (decisión 48). El isotipo no cambia;
# el resto de la palabra va en la tipografía de la marca, inclinada igual que la F y pegada a su
# diagonal. Estas medidas son las mismas que usa la aplicación (src/principal/logotipo.css).
LOGOTIPO_CSS = (".logotipo{display:inline-flex;align-items:baseline;font-family:'Space Grotesk Variable','Segoe UI',system-ui,sans-serif;font-weight:700;line-height:1;letter-spacing:-.01em;white-space:nowrap}"
                ".logotipo-isotipo,.logotipo>svg{flex:none;display:inline-block;width:1.5em;height:1.5em;transform:translateY(.36em);margin-right:-.2em}.logotipo-isotipo svg{display:block;width:100%;height:100%}"
                ".logotipo>span:last-child{display:inline-block;transform:skewX(-6deg)}"
                "")
logotipo = lambda isotipo: f'<span class="logotipo" role="img" aria-label="Ferrebress">{isotipo}<span aria-hidden="true">errebress</span></span>'
escribir("src/principal/logotipo.css", "/* El logotipo de Ferrebress: el isotipo hace de F en la palabra. Lo genera tests/capturas/logo.py. */\n" + LOGOTIPO_CSS.replace("}", "}\n"))

fila = lambda fondo, color, c: (f'<div style="display:flex;flex-wrap:wrap;align-items:center;gap:22px;padding:20px;border-radius:14px;background:{fondo};color:{color};margin-top:10px">'
    + "".join(svg(c, n) for n in (150, 64, 32, 16)) + f'<span style="font-size:2.6rem">{logotipo(svg(c))}</span>{svg(EN_NARANJA, 110)}</div>')
hoja = (f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ferrebress: el logo</title></head>'
        f'<style>@font-face{{font-family:"Space Grotesk Variable";src:url("{FUENTE}");font-weight:300 700}}{LOGOTIPO_CSS}</style>'
        f'<body style="margin:0;background:{CLARO};color:#18201e;font:17px/1.5 system-ui,sans-serif"><main style="max-width:980px;margin:0 auto;padding:28px 16px 56px">'
        f'<h1 style="font-size:1.6rem;margin:0 0 4px">Ferrebress: el logo</h1><p style="margin:0 0 12px;color:#4a5451">La F que es un tornillo, dentro de un triángulo que sigue su contorno. Sobre claro, sobre oscuro, con el nombre, en naranja y en tamaño chico.</p>'
        + fila("#fff", "#18201e", SOBRE_CLARO) + fila(VERDE, "#fff", SOBRE_OSCURO)
        + '<h2 style="font-size:1.2rem;margin:32px 0 0">Para comparar: la escuadra anterior</h2>'
        + fila("#fff", "#18201e", logo(VERDE, "#fff", NARANJA, marco="escuadra"))
        + "</main></body></html>")
escribir("public/logo.html", hoja)

# Íconos de la app instalada: el logo sobre fondo claro, con margen para el recorte «maskable».
cuadro = f'<rect width="100" height="100" fill="{CLARO}"/><g transform="translate(15 15) scale(0.7)">{SOBRE_CLARO}</g>'
os.makedirs(os.path.join(RAIZ, "tests", "capturas", "salida"), exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    for lado in (192, 512):
        p = b.new_page(viewport={"width": lado, "height": lado}); p.set_content(f'<body style="margin:0">{svg(cuadro, lado)}</body>'); p.screenshot(path=os.path.join(WEB, "public", f"icono-{lado}.png")); p.close()
    for nombre, isotipo, color in (("logotipo-ferrebress", SOBRE_CLARO, VERDE), ("logotipo-ferrebress-sobre-oscuro", SOBRE_OSCURO, "#ffffff")):
        p = b.new_page(viewport={"width": 1400, "height": 400}, device_scale_factor=2)
        p.set_content(f'<style>@font-face{{font-family:"Space Grotesk Variable";src:url("{FUENTE}");font-weight:300 700}}{LOGOTIPO_CSS}body{{margin:0;background:transparent}}#l{{display:inline-block;padding:10px 24px 70px 24px;font-size:160px;color:{color}}}</style><div id="l">{logotipo(svg(isotipo))}</div>')
        p.wait_for_timeout(300); p.locator("#l").screenshot(path=os.path.join(WEB, "public", f"{nombre}.png"), omit_background=True); p.close()
    p = b.new_page(viewport={"width": 1000, "height": 520}); p.set_content(hoja); p.wait_for_timeout(200); p.screenshot(path=os.path.join(RAIZ, "tests", "capturas", "salida", "logo.png"), full_page=True); b.close()
print("logo generado")

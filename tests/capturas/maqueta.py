"""Una maqueta sobre la pantalla real: abre una pantalla de la aplicación con la API de mentira
(tests/capturas/levantar.sh), le aplica los cambios que se proponen (un script) y la guarda como
un HTML suelto, con todos los estilos adentro y sin código. Así la maqueta se ve exactamente como
la aplicación, salvo lo que cambia.

    uv run --with playwright==1.56.0 python tests/capturas/maqueta.py <ruta> <cambios.js> <salida.html> [--compu]

<cambios.js> es el cuerpo de una función que recibe `document`. Saca también la captura
<salida>.png, del celular (390 px) o de la computadora (1366 px). Con `--antes "<código>"`
(repetible) corre código de Playwright sobre `page` antes de los cambios, para dejar la pantalla
en el estado que se quiere maquetar (abrir una ficha, una hoja):

    ... maqueta.py catalogo cambios.js ficha.html --antes "page.get_by_test_id('producto').first.click()"
"""
import os
import sys

from playwright.sync_api import sync_playwright

ruta, cambios, salida = sys.argv[1:4]
compu = "--compu" in sys.argv
antes = [sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--antes"]
# `--alto N`: el celular con N px de alto, para ver una hoja larga entera en una sola captura.
alto = int(sys.argv[sys.argv.index("--alto") + 1]) if "--alto" in sys.argv else 844
BASE = os.environ.get("BASE", "http://localhost:5199/")
UA_CELU = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"

with sync_playwright() as pw:
    nav = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
    opciones = {"viewport": {"width": 1366, "height": 768}} if compu else {"viewport": {"width": 390, "height": alto}, "is_mobile": True, "has_touch": True, "user_agent": UA_CELU}
    c = nav.new_context(locale="es-AR", device_scale_factor=2, **opciones)
    c.add_init_script("try { localStorage.setItem('ferre.sesion.desarrollo', 'x'); } catch (e) {}")
    p = c.new_page()
    p.goto(BASE + "#/" + ruta.lstrip("#/"))
    p.wait_for_timeout(2500)
    for codigo in antes:
        exec(codigo, {"page": p})
        p.wait_for_timeout(400)
    p.evaluate("(codigo) => { document.querySelector('.marco-de-prueba')?.remove(); new Function('document', codigo)(document); }", open(cambios).read())
    p.wait_for_timeout(300)
    css = p.evaluate("""() => [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join('\\n'); } catch (e) { return ''; } }).join('\\n')""")
    cuerpo = p.evaluate("() => { document.querySelectorAll('script').forEach((s) => s.remove()); return document.body.innerHTML; }")
    raiz = p.evaluate("() => [...document.documentElement.attributes].map((a) => `${a.name}=\"${a.value}\"`).join(' ')")
    titulo = os.path.splitext(os.path.basename(salida))[0]
    ancho = 1366 if compu else 390
    with open(salida, "w") as f:
        f.write(f'<!doctype html>\n<html {raiz}>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width={ancho}">\n<title>Maqueta: {titulo}</title>\n<style>\n{css}\n</style>\n</head>\n<body>\n{cuerpo}\n</body>\n</html>\n')
    p.screenshot(path=os.path.splitext(salida)[0] + ".png")
    nav.close()
print("listo:", salida)

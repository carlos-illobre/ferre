#!/usr/bin/env python
"""Captura una pantalla de la maqueta v4 y avisa de los defectos que se pueden medir.

  python capturar.py vender                         # las dos medidas, estado normal
  python capturar.py vender --estado sin-precio     # un estado de maqueta
  python capturar.py vender --celu                  # solo celular (390×844); --compu: solo 1366×768
  python capturar.py vender --clic "Cobrar"         # toca algo antes de capturar (se puede repetir)
  python capturar.py vender --escribir "mecha"      # escribe en el primer buscador antes de capturar
  python capturar.py vender --nombre buscando       # sufijo para el nombre del archivo
  python capturar.py vender --entera                # la página entera, no solo lo que se ve

Guarda en $CAPTURAS (por defecto el scratchpad …/v4/) como <ruta>[-estado][-nombre]-celu|compu.png.
Avisa: desborde hacia el costado, letra de menos de 14 px, cosas que se tocan de menos de 44 px
de alto y errores de la consola. El servidor tiene que estar corriendo (puerto 5301, o $PUERTO).
"""
import argparse
import os
import sys

from playwright.sync_api import sync_playwright

CAPTURAS = os.environ.get("CAPTURAS", "/tmp/claude-1002/-home-claude-work/9fb71fa3-36ad-5d3a-9933-f5eb814b7981/scratchpad/v4")
PUERTO = os.environ.get("PUERTO", "5301")
MEDIDAS = {
    "compu": dict(viewport={"width": 1366, "height": 768}),
    "celu": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2),
}

MEDIR = """() => {
  const ancho = document.documentElement.clientWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const nombre = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' «' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28) + '»');
  const escondido = (e) => { const r = e.getBoundingClientRect(); return r.width <= 2 || r.height <= 2; };
  const desbordes = [], chicas = new Map(), bajos = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('svg')) continue;
    const r = e.getBoundingClientRect();
    const recortado = (() => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const pr = p.getBoundingClientRect(); if (getComputedStyle(p).overflowX !== 'visible' && pr.right <= ancho + 1 && pr.left >= -1) return true; } return false; })();
    if (!recortado && (r.right > ancho + 1 || r.left < -1)) desbordes.push(nombre(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    const propio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (propio && !escondido(e)) { const t = parseFloat(getComputedStyle(e).fontSize); if (t < 14) chicas.set(nombre(e), t); }
    if (e.matches('button, a[href], input, select, textarea, [role=button], [role=option]') && !e.closest('.maqueta') && r.height < 43.5) bajos.push(nombre(e) + ' ' + Math.round(r.height) + 'px');
  }
  return { ancho, anchoTotal: document.documentElement.scrollWidth, desbordes: desbordes.slice(0, 8), chicas: [...chicas].slice(0, 8), bajos: bajos.slice(0, 8) };
}"""


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("ruta", help="la pantalla: entrar, vender, ventas, productos, recibir, mas, listas, …")
    a.add_argument("--estado", help="estado de maqueta (la clave)")
    a.add_argument("--celu", action="store_true")
    a.add_argument("--compu", action="store_true")
    a.add_argument("--clic", action="append", default=[], help="texto o nombre accesible de algo para tocar antes (repetible)")
    a.add_argument("--escribir", help="texto para escribir en el primer buscador antes de los clics")
    a.add_argument("--nombre", help="sufijo para el nombre del archivo")
    a.add_argument("--entera", action="store_true", help="captura la página entera")
    o = a.parse_args()

    medidas = [m for m in MEDIDAS if (m == "celu" and o.celu) or (m == "compu" and o.compu)] or list(MEDIDAS)
    os.makedirs(CAPTURAS, exist_ok=True)
    url = f"http://127.0.0.1:{PUERTO}/#/{o.ruta}" + (f"?estado={o.estado}" if o.estado else "")
    base = "-".join(x for x in [o.ruta, o.estado, o.nombre] if x)
    problemas = 0

    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        for medida in medidas:
            pagina = navegador.new_context(**MEDIDAS[medida]).new_page()
            errores = []
            pagina.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
            pagina.on("pageerror", lambda e: errores.append(str(e)))
            pagina.goto(url)
            pagina.wait_for_load_state("networkidle")
            pagina.evaluate("document.fonts.ready")
            if o.escribir:
                pagina.locator(".buscador__entrada").first.fill(o.escribir)
            for texto in o.clic:
                boton = pagina.get_by_role("button", name=texto).or_(pagina.get_by_role("link", name=texto)).or_(pagina.get_by_role("option", name=texto))
                destino = boton.first if boton.count() else pagina.get_by_text(texto).first
                destino.click()
                pagina.wait_for_timeout(350)
            pagina.wait_for_timeout(450)
            archivo = f"{CAPTURAS}/{base}-{medida}.png"
            pagina.screenshot(path=archivo, full_page=o.entera)
            m = pagina.evaluate(MEDIR)
            avisos = []
            if m["anchoTotal"] > m["ancho"] + 1 or m["desbordes"]:
                avisos.append(f"DESBORDE hacia el costado (ancho {m['anchoTotal']} > {m['ancho']}): {m['desbordes']}")
            if m["chicas"]:
                avisos.append(f"LETRA de menos de 14 px: {m['chicas']}")
            if m["bajos"]:
                avisos.append(f"TOQUE de menos de 44 px de alto: {m['bajos']}")
            if errores:
                avisos.append(f"CONSOLA: {errores[:4]}")
            problemas += len(avisos)
            print(f"{archivo}" + ("  bien" if not avisos else ""))
            for x in avisos:
                print("   ! " + x)
        navegador.close()
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main())

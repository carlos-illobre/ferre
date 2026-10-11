#!/usr/bin/env python
"""Captura una pantalla de la app real v4 (http://localhost:5199/v4/) y avisa de lo que se puede medir.

  python captura-v4.py vender                        # las dos medidas (1366×768 y 390×844)
  python captura-v4.py stock --celu                  # solo celular; --compu: solo computadora
  python captura-v4.py vender --nombre buscando --py 'page.get_by_test_id("busqueda").fill("mecha")'
  python captura-v4.py entrar --sin-sesion           # sin sembrar la sesión (pantalla de entrada)
  python captura-v4.py vender --sin-conexion         # corta la red después de cargar
  python captura-v4.py productos --entera            # la página entera, no solo lo que se ve
  python captura-v4.py 'vincular-celular?codigo=ABC123' --nombre vincular

--py recibe código Python que usa `page` (Playwright, API sincrónica); también tiene `contexto`,
`medida` ("compu" o "celu") y `google(credencial)`, que simula que Google devolvió una
credencial (el mock rechaza la credencial "no" con 403). Se puede repetir.
Guarda en $CAPTURAS (por defecto tests/capturas/salida/, que no se sube) como <nombre>-compu.png y <nombre>-celu.png
(nombre = --nombre o la ruta). Avisa: desplazamiento hacia el costado, textos de menos de 14 px,
objetivos táctiles de menos de 44 px (solo en el celular) y errores de consola. Tiene que decir «bien».
Hacen falta la API de mentira (8799) y el Vite del cliente (5199); ver tests/capturas/README.md; con BASE=http://localhost:5199/v1/ (o v2) captura otra versión.
"""
import argparse
import os
import re
import sys

from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
CAPTURAS = os.environ.get("CAPTURAS", os.path.join(AQUI, "salida"))
BASE = os.environ.get("BASE", "http://localhost:5199/v4/")
MEDIDAS = {
    "compu": dict(viewport={"width": 1366, "height": 768}),
    "celu": dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, device_scale_factor=2,
                 user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"),
}

# El script de Google no se carga de verdad: se reemplaza por uno que dibuja un botón parecido
# y guarda el `callback`, para poder simular la respuesta con google("credencial").
GOOGLE = """
window.google = { accounts: { id: {
  initialize(c) { window.__google = c; },
  renderButton(el, o) {
    el.innerHTML = '<div role="button" tabindex="0" style="display:flex;align-items:center;gap:12px;box-sizing:border-box;width:' + o.width + 'px;height:40px;padding:0 12px;border:1px solid #dadce0;border-radius:4px;background:#fff;font:500 14px Roboto,Arial,sans-serif;color:#3c4043">'
      + '<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
      + '<span style="flex:1;text-align:center">Continuar con Google</span></div>';
  },
} } };
"""

MEDIR = """(celular) => {
  const ancho = document.documentElement.clientWidth;
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const nombre = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' «' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 28) + '»');
  const escondido = (e) => { const r = e.getBoundingClientRect(); return r.width <= 2 || r.height <= 2; };
  const desbordes = [], chicas = new Map(), bajos = [];
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('svg') || e.closest('.entrar__google')) continue;
    if (e.closest('dialog:not([open])')) continue;
    const r = e.getBoundingClientRect();
    const recortado = (() => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const pr = p.getBoundingClientRect(); if (getComputedStyle(p).overflowX !== 'visible' && pr.right <= ancho + 1 && pr.left >= -1) return true; } return false; })();
    if (!recortado && (r.right > ancho + 1 || r.left < -1)) desbordes.push(nombre(e) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    const propio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (propio && !escondido(e) && e.tagName !== 'OPTION') { const t = parseFloat(getComputedStyle(e).fontSize); if (t < 14) chicas.set(nombre(e), t); }
    if (celular && e.matches('button, a[href], input, select, textarea, [role=button], [role=option]') && r.height < 43.5) bajos.push(nombre(e) + ' ' + Math.round(r.height) + 'px');
  }
  return { ancho, anchoTotal: document.documentElement.scrollWidth, desbordes: desbordes.slice(0, 8), chicas: [...chicas].slice(0, 8), bajos: bajos.slice(0, 8) };
}"""


def main() -> int:
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument("ruta", help="la dirección después de #/: vender, ventas, productos, mas, stock, 'vincular-celular?codigo=ABC123'…")
    a.add_argument("--celu", action="store_true")
    a.add_argument("--compu", action="store_true")
    a.add_argument("--nombre", help="nombre del archivo (por defecto, la ruta)")
    a.add_argument("--sin-sesion", action="store_true", help="no siembra la sesión")
    a.add_argument("--sin-conexion", action="store_true", help="corta la red después de cargar (antes de --py)")
    a.add_argument("--py", action="append", default=[], help="código Python con `page` para dejar la pantalla como hace falta (repetible)")
    a.add_argument("--entera", action="store_true", help="captura la página entera")
    o = a.parse_args()

    medidas = [m for m in MEDIDAS if (m == "celu" and o.celu) or (m == "compu" and o.compu)] or list(MEDIDAS)
    os.makedirs(CAPTURAS, exist_ok=True)
    base = o.nombre or re.sub(r"[^a-z0-9-]+", "-", o.ruta.lower()).strip("-")
    problemas = 0

    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        for medida in medidas:
            contexto = navegador.new_context(locale="es-AR", **MEDIDAS[medida])
            contexto.route("https://accounts.google.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=GOOGLE))
            if not o.sin_sesion:
                contexto.add_init_script("try { localStorage.setItem('ferre.sesion', 'x'); } catch (e) {}")
            page = contexto.new_page()
            errores = []
            page.on("console", lambda m: errores.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e: errores.append(str(e)))
            page.goto(f"{BASE}#/{o.ruta}")
            page.wait_for_load_state("networkidle")
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(350)
            if o.sin_conexion:
                contexto.set_offline(True)
                page.wait_for_timeout(250)
                errores.clear()  # los pedidos que fallan por el corte no son defectos

            def google(credencial="si"):
                page.evaluate("(c) => window.__google.callback({ credential: c })", credencial)
                page.wait_for_timeout(500)

            for codigo in o.py:
                exec(codigo, {"page": page, "contexto": contexto, "medida": medida, "google": google})
                page.wait_for_timeout(350)
            page.wait_for_timeout(450)
            archivo = f"{CAPTURAS}/{base}-{medida}.png"
            page.screenshot(path=archivo, full_page=o.entera)
            m = page.evaluate(MEDIR, medida == "celu")
            if o.sin_conexion:
                errores = [e for e in errores if "ERR_INTERNET_DISCONNECTED" not in e and "Failed to fetch" not in e]
            avisos = []
            if m["anchoTotal"] > m["ancho"] + 1 or m["desbordes"]:
                avisos.append(f"DESPLAZAMIENTO hacia el costado (ancho {m['anchoTotal']} > {m['ancho']}): {m['desbordes']}")
            if m["chicas"]:
                avisos.append(f"TEXTO de menos de 14 px: {m['chicas']}")
            if m["bajos"]:
                avisos.append(f"TOQUE de menos de 44 px de alto: {m['bajos']}")
            if errores:
                avisos.append(f"CONSOLA: {errores[:4]}")
            problemas += len(avisos)
            print(f"{archivo}" + ("  bien" if not avisos else ""))
            for x in avisos:
                print("   ! " + x)
            contexto.close()
        navegador.close()
    return 1 if problemas else 0


if __name__ == "__main__":
    sys.exit(main())

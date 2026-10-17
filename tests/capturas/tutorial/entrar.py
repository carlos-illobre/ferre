"""Lo común a los recorridos del manual de uso: el puntero y el toque que se ven en los clips, la
API de mentira y cómo se mueve el puntero. Las capturas y los clips del capítulo
«Entrar» los arma formas_de_entrar.py (012-T010); el del espejo, espejo.py.

    python3 tests/capturas/tutorial/entrar.py   # lo mismo que formas_de_entrar.py
"""
import json
import os
import sys
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BASE = os.environ.get("BASE", "http://localhost:5199/")
API = os.environ.get("API", "http://localhost:8799")
COMPU = {"width": 1366, "height": 768}
CELU = {"width": 390, "height": 844}
UA_CELU = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36"

# El puntero en la computadora y el toque en el celular: los videos de Playwright no los muestran.
PUNTERO = """
addEventListener('DOMContentLoaded', () => {
  const p = document.createElement('div');
  p.style.cssText = 'position:fixed;z-index:2147483647;left:-40px;top:-40px;width:26px;height:26px;margin:-4px 0 0 -4px;pointer-events:none;transition:transform 120ms ease-out';
  p.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 11-6.5 1.2L16 21l-3 1.4-3.4-6.6L4 20z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  document.body.appendChild(p);
  addEventListener('mousemove', (e) => { p.style.left = e.clientX + 'px'; p.style.top = e.clientY + 'px'; }, true);
  addEventListener('mousedown', () => { p.style.transform = 'scale(0.82)'; }, true);
  addEventListener('mouseup', () => { p.style.transform = ''; }, true);
});
"""
TOQUE = """
addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent = '@keyframes toque{from{transform:scale(.4);opacity:.9}to{transform:scale(1.6);opacity:0}}';
  document.head.appendChild(s);
  addEventListener('pointerdown', (e) => {
    const c = document.createElement('div');
    c.style.cssText = `position:fixed;z-index:2147483647;left:${e.clientX - 28}px;top:${e.clientY - 28}px;width:56px;height:56px;border-radius:50%;background:rgba(240,120,47,.45);border:3px solid #f0782f;pointer-events:none;animation:toque 650ms ease-out forwards`;
    document.body.appendChild(c); setTimeout(() => c.remove(), 700);
  }, true);
});
"""
SIN_MARCO = ".marco-de-prueba{display:none!important}"


def mentira(ruta, cuerpo=None):
    datos = json.dumps(cuerpo or {}).encode()
    urllib.request.urlopen(urllib.request.Request(API + ruta, data=datos, method="PUT", headers={"Content-Type": "application/json"}), timeout=5)


def mover(page, selector, pasos=28):
    caja = page.locator(selector).first.bounding_box()
    page.mouse.move(caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2, steps=pasos)


if __name__ == "__main__":
    import formas_de_entrar
    formas_de_entrar.main()

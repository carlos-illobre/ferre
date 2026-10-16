"""El capítulo «Entrar» del manual de uso: graba el clip y saca las capturas, con la API de
mentira y el cliente de tests/capturas (tests/capturas/levantar.sh).

    uv run --with playwright==1.56.0 python tests/capturas/tutorial/entrar.py [carpeta]

Deja en la carpeta (por defecto specs/012-manual-de-uso/maquetas/entrar/):
- clip.mp4: la computadora y el celular uno al lado del otro. La computadora muestra su código, el
  celular lo lee y deja entrar, y la computadora entra sola.
- las capturas que usa el manual (computadora y celular).

El recorrido va al ritmo de una persona, con el puntero a la vista en la computadora y un círculo
donde se toca en el celular. Se vuelve a correr cuando cambia alguna de estas pantallas.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from capturar import GOOGLE  # noqa: E402  el botón de Google de mentira

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "specs/012-manual-de-uso/maquetas/entrar")
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


def main():
    os.makedirs(SALIDA, exist_ok=True)
    videos = tempfile.mkdtemp()
    mentira("/mentira/permisos", {"permisos": []})
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
        compu = nav.new_context(locale="es-AR", viewport=COMPU, record_video_dir=videos + "/compu", record_video_size=COMPU)
        celu = nav.new_context(locale="es-AR", viewport=CELU, is_mobile=True, has_touch=True, user_agent=UA_CELU,
                               record_video_dir=videos + "/celu", record_video_size=CELU)
        compu.add_init_script(PUNTERO)
        celu.add_init_script(TOQUE)
        # El celular ya tiene su sesión; la computadora todavía no.
        celu.add_init_script("try { localStorage.setItem('ferre.sesion', 'x'); } catch (e) {}")
        pc, pm = compu.new_page(), celu.new_page()
        for p in (pc, pm):
            p.goto(BASE + ("#/" if p is pc else "#/vender"))
            p.add_style_tag(content=SIN_MARCO)
        pc.wait_for_selector("[data-testid=qr-entrar] img")
        pm.wait_for_timeout(1200)
        pc.mouse.move(683, 384)

        # 1. La computadora muestra su código.
        mover(pc, "[data-testid=qr-entrar]")
        pc.wait_for_timeout(1800)
        pc.screenshot(path=f"{SALIDA}/compu-codigo.png")
        mover(pc, ".entrar-pasos li:first-child", 22)
        pc.wait_for_timeout(1400)

        # 2. El celular lo lee (con la cámara del teléfono o desde Ferrebress) y pregunta.
        pm.goto(BASE + "#/entrar-compu?codigo=codigo-de-mentira")
        pm.add_style_tag(content=SIN_MARCO)
        pm.wait_for_selector("[data-testid=dejar-entrar]")
        pm.wait_for_timeout(2800)
        pm.screenshot(path=f"{SALIDA}/celu-dejar-entrar.png")

        # 3. Se toca «Entrar en la computadora»: la computadora entra sola.
        boton = pm.get_by_test_id("dejar-entrar").bounding_box()
        pm.touchscreen.tap(boton["x"] + boton["width"] / 2, boton["y"] + boton["height"] / 2)
        mentira("/mentira/aprobar-codigo")
        pc.wait_for_selector("[data-testid=qr-entrar]", state="detached", timeout=10000)
        pc.add_style_tag(content=SIN_MARCO)
        pc.mouse.move(683, 300, steps=10)
        pc.wait_for_timeout(3600)
        pc.screenshot(path=f"{SALIDA}/compu-adentro.png")
        pm.screenshot(path=f"{SALIDA}/celu-despues.png")
        pm.wait_for_timeout(400)

        video_compu, video_celu = pc.video.path(), pm.video.path()
        compu.close(); celu.close()

        # Las capturas sueltas: la entrada del celular y lo que pasa si el correo no está autorizado.
        suelta = nav.new_context(locale="es-AR", viewport=CELU, is_mobile=True, has_touch=True, user_agent=UA_CELU, device_scale_factor=2)
        p = suelta.new_page(); p.goto(BASE); p.add_style_tag(content=SIN_MARCO); p.wait_for_timeout(1200)
        p.screenshot(path=f"{SALIDA}/celu-entrada.png")
        suelta.close()
        error = nav.new_context(locale="es-AR", viewport=COMPU)
        error.route("https://accounts.google.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=GOOGLE))
        p = error.new_page(); p.goto(BASE); p.add_style_tag(content=SIN_MARCO); p.wait_for_timeout(1500)
        p.evaluate("() => window.__google && window.__google.callback({ credential: 'no' })")
        p.wait_for_timeout(800)
        p.locator("[data-testid=error-google]").scroll_into_view_if_needed()
        tarjeta = p.locator(".entrar-cc-tarjeta").bounding_box()
        p.screenshot(path=f"{SALIDA}/compu-no-autorizado.png", clip=tarjeta)
        error.close()
        nav.close()

    # El clip: la computadora a la izquierda y el celular a la derecha, sobre el verde de la marca.
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video_compu, "-i", video_celu, "-filter_complex",
                    "[0:v]scale=1280:720,setsar=1[c];[1:v]scale=333:720,setsar=1[m];"
                    "color=c=0x0b342c:s=1704x800:r=25[f];[f][c]overlay=30:40:shortest=1[a];[a][m]overlay=1341:40:shortest=1,format=yuv420p",
                    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", f"{SALIDA}/clip.mp4"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1.5", "-i", f"{SALIDA}/clip.mp4", "-frames:v", "1", f"{SALIDA}/clip-portada.jpg"], check=True)
    shutil.rmtree(videos, ignore_errors=True)
    print("listo:", SALIDA, sorted(os.listdir(SALIDA)))


if __name__ == "__main__":
    main()

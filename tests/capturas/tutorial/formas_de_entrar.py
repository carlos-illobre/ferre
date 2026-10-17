"""El capítulo «Entrar» del manual de uso, una sección por cada forma de entrar (012-T010): saca
las capturas y graba los clips con la API de mentira y el cliente de tests/capturas
(tests/capturas/levantar.sh).

    python3 tests/capturas/tutorial/formas_de_entrar.py [carpeta]

Deja en la carpeta (por defecto microservices/web/public/manual/entrar/, de donde las toma la
pantalla del manual) las capturas, los clips y `marcas.json`: dónde va cada marca numerada, en
porcentaje de la imagen. Los clips:
- clip-celular.mp4: la computadora y el celular uno al lado del otro; el celular, con Ferrebress
  abierto, toca «Vincular», apunta al código y deja entrar a la computadora.
- clip-google-compu.mp4: la computadora entra con «Continuar con Google».
- clip-google-celu.mp4: el celular entra con Google por primera vez y ofrece usar la huella.
Con la huella no hay clip: el lector de huella es del teléfono y no se puede grabar.

La ventana de Google no se graba: es de Google y en las capturas se usa un botón de mentira
(capturar.GOOGLE). Se vuelve a correr cuando cambia alguna de estas pantallas.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from capturar import GOOGLE  # noqa: E402  el botón de Google de mentira
from entrar import BASE, CELU, COMPU, PUNTERO, RAIZ, SIN_MARCO, TOQUE, UA_CELU, mentira, mover  # noqa: E402

SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "microservices/web/public/manual/entrar")
WEB = os.path.join(RAIZ, "microservices/web")
HUELLA_ACA = "try { localStorage.setItem('ferre.huella-en-este-dispositivo', '1'); } catch (e) {}"
CON_SESION = "try { localStorage.setItem('ferre.sesion', 'x'); } catch (e) {}"
MARCAS = {}


def marcar(page, captura, localizador, texto, contenedor=None, punto=False):
    """La marca numerada de una captura: un recuadro alrededor de lo que se toca (o un punto, con
    punto=True). Se llama justo antes de la captura, con la pantalla quieta."""
    caja = localizador.first.bounding_box()
    base = contenedor.bounding_box() if contenedor else {"x": 0, "y": 0, **page.viewport_size}
    if punto:  # en el centro de lo que se señala
        m = {"x": (caja["x"] + caja["width"] / 2 - base["x"]) / base["width"] * 100, "y": (caja["y"] + caja["height"] / 2 - base["y"]) / base["height"] * 100}
    else:
        m = {"x": (caja["x"] - base["x"]) / base["width"] * 100, "y": (caja["y"] - base["y"]) / base["height"] * 100,
             "ancho": caja["width"] / base["width"] * 100, "alto": caja["height"] / base["height"] * 100}
    MARCAS.setdefault(captura, []).append({k: round(v, 1) for k, v in m.items()} | {"texto": texto})


def tocar(page, localizador):
    caja = localizador.first.bounding_box()
    page.touchscreen.tap(caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2)


def nueva(nav, celular, video=None, sesion=False, huella=False, google=False, escala=1):
    opciones = {"locale": "es-AR", "viewport": CELU if celular else COMPU, "device_scale_factor": escala}
    if celular:
        opciones |= {"is_mobile": True, "has_touch": True, "user_agent": UA_CELU, "permissions": ["camera"]}
    if video:
        opciones |= {"record_video_dir": video, "record_video_size": CELU if celular else COMPU}
    ctx = nav.new_context(**opciones)
    ctx.add_init_script(TOQUE if celular else PUNTERO)
    if sesion:
        ctx.add_init_script(CON_SESION)
    if huella:
        ctx.add_init_script(HUELLA_ACA)
    if google:
        ctx.route("https://accounts.google.com/**", lambda r: r.fulfill(status=200, content_type="application/javascript", body=GOOGLE))
    return ctx


def abrir(page, hash_="#/", espera=1200):
    page.goto(BASE + hash_)
    page.add_style_tag(content=SIN_MARCO)
    page.wait_for_timeout(espera)


def camara_falsa(carpeta):
    """La cámara del celular, de mentira: un video con el código de la computadora en el medio."""
    png, y4m = os.path.join(carpeta, "qr.png"), os.path.join(carpeta, "camara.y4m")
    subprocess.run(["node", "-e", "require('qrcode').toFile(process.argv[1], process.argv[2], { width: 420, margin: 2, color: { dark: '#17312b' } }, (e) => { if (e) throw e; })",
                    png, BASE + "#/entrar-compu?codigo=codigo-de-mentira"], check=True, cwd=WEB)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-t", "30", "-r", "15",
                    "-vf", "pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x3a3f3d,format=yuv420p", y4m], check=True)
    return y4m


def recortar(entrada, desde, salida, ancho=None):
    filtro = f"scale={ancho}:-2," if ancho else ""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{desde:.2f}", "-i", entrada, "-vf", filtro + "format=yuv420p",
                    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", salida], check=True)


def portada(clip):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", clip, "-frames:v", "1", clip.replace(".mp4", "-portada.jpg")], check=True)


def lado_a_lado(compu, celu, desde, salida):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{desde:.2f}", "-i", compu, "-ss", f"{desde:.2f}", "-i", celu, "-filter_complex",
                    "[0:v]scale=1280:720,setsar=1[c];[1:v]scale=333:720,setsar=1[m];"
                    "color=c=0x0b342c:s=1704x800:r=25[f];[f][c]overlay=30:40:shortest=1[a];[a][m]overlay=1341:40:shortest=1,format=yuv420p",
                    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", salida], check=True)


def con_el_celular(nav, tmp):
    """1. En la computadora, con el celular que ya tiene Ferrebress abierto: «Vincular», la cámara,
    «Entrar en la computadora»."""
    compu = nueva(nav, False, tmp + "/c1")
    celu = nueva(nav, True, tmp + "/m1", sesion=True)
    inicio = time.monotonic()
    pc, pm = compu.new_page(), celu.new_page()
    abrir(pc); abrir(pm, "#/vender", 1500)
    pc.wait_for_selector("[data-testid=qr-entrar] img")
    listo = time.monotonic() - inicio
    pc.mouse.move(683, 384)
    mover(pc, "[data-testid=qr-entrar]")
    pc.wait_for_timeout(1500)
    marcar(pc, "compu-codigo", pc.get_by_test_id("qr-entrar"), "El código que lee el celular.")
    marcar(pc, "compu-codigo", pc.locator(".entrar-cc-tarjeta [role=button]").filter(has_text="Continuar con Google"), "La otra forma: con tu cuenta de Google.")
    pc.screenshot(path=f"{SALIDA}/compu-codigo.png")

    vincular = pm.get_by_role("button", name="Vincular").first
    marcar(pm, "celu-vincular", vincular, "Tocá «Vincular»: se abre la cámara.")
    pm.screenshot(path=f"{SALIDA}/celu-vincular.png")
    pm.wait_for_timeout(900)
    tocar(pm, vincular)
    pm.wait_for_timeout(2600)
    marcar(pm, "celu-camara", pm.locator(".escaner video"), "Apuntá al código de la computadora: lo lee solo.", punto=True)
    pm.screenshot(path=f"{SALIDA}/celu-camara.png")
    # La lectura del código, de mentira (la cámara falsa no lo descifra): el celular va a donde iría.
    pm.evaluate("() => { location.hash = '#/entrar-compu?codigo=codigo-de-mentira'; }")
    pm.wait_for_selector("[data-testid=dejar-entrar]")
    pm.add_style_tag(content=SIN_MARCO)
    pm.wait_for_timeout(2400)
    marcar(pm, "celu-dejar-entrar", pm.get_by_test_id("dejar-entrar"), "Deja entrar a la computadora con tu usuario.")
    marcar(pm, "celu-dejar-entrar", pm.get_by_role("button", name="Ahora no"), "No la deja entrar.")
    pm.screenshot(path=f"{SALIDA}/celu-dejar-entrar.png")
    tocar(pm, pm.get_by_test_id("dejar-entrar"))
    mentira("/mentira/aprobar-codigo")
    pc.wait_for_selector("[data-testid=qr-entrar]", state="detached", timeout=10000)
    pc.add_style_tag(content=SIN_MARCO)
    pc.mouse.move(683, 300, steps=10)
    pc.wait_for_timeout(3400)
    marcar(pc, "compu-adentro", pc.get_by_test_id("usuario").locator(".."), "Tu nombre: la computadora entró como vos. «Salir» la cierra.")
    marcar(pm, "celu-despues", pm.get_by_text("Listo: la computadora entró"), "El aviso de que la computadora entró.")
    pc.screenshot(path=f"{SALIDA}/compu-adentro.png")
    pm.screenshot(path=f"{SALIDA}/celu-despues.png")
    pm.wait_for_timeout(500)
    v_compu, v_celu = pc.video.path(), pm.video.path()
    compu.close(); celu.close()
    lado_a_lado(v_compu, v_celu, listo, f"{SALIDA}/clip-celular.mp4")
    portada(f"{SALIDA}/clip-celular.mp4")


def celular_sin_sesion(nav):
    """2. Igual, pero el celular todavía no entró: «Escanear el código de la computadora» y la huella."""
    ctx = nueva(nav, True, huella=True, escala=2)
    p = ctx.new_page()
    abrir(p)
    marcar(p, "celu-entrada-escanear", p.get_by_test_id("escanear-codigo-de-la-compu"), "Tocá acá y apuntá al código de la computadora.")
    p.screenshot(path=f"{SALIDA}/celu-entrada-escanear.png")
    abrir(p, "#/entrar-compu?codigo=codigo-de-mentira", 1500)
    marcar(p, "celu-entrar-los-dos", p.get_by_test_id("entrar-huella"), "Poné la huella: entran el celular y la computadora.")
    p.screenshot(path=f"{SALIDA}/celu-entrar-los-dos.png")
    ctx.close()


def google_en_la_compu(nav, tmp):
    """3. En la computadora, con «Continuar con Google»."""
    ctx = nueva(nav, False, tmp + "/c3", google=True)
    inicio = time.monotonic()
    p = ctx.new_page()
    abrir(p, "#/", 1500)
    listo = time.monotonic() - inicio
    boton = p.locator(".entrar-cc-tarjeta [role=button]").filter(has_text="Continuar con Google")
    p.mouse.move(683, 384)
    marcar(p, "compu-google", boton, "Hacé clic en «Continuar con Google».")
    p.screenshot(path=f"{SALIDA}/compu-google.png")
    mover(p, ".entrar-cc-tarjeta [role=button] >> text=Continuar con Google")
    p.wait_for_timeout(700)
    p.mouse.down(); p.mouse.up()
    p.wait_for_timeout(900)
    # Google pregunta la cuenta en su ventana, que no se graba; vuelve con la cuenta elegida.
    p.evaluate("() => window.__google && window.__google.callback({ credential: 'carlos' })")
    p.wait_for_selector("[data-testid=usuario]", timeout=10000)
    p.add_style_tag(content=SIN_MARCO)
    p.mouse.move(683, 300, steps=10)
    p.wait_for_timeout(2600)
    v = p.video.path()
    ctx.close()
    recortar(v, listo, f"{SALIDA}/clip-google-compu.mp4", 1280)
    portada(f"{SALIDA}/clip-google-compu.mp4")


def huella_en_la_compu(nav):
    """4. En la computadora, con la huella: solo si esa computadora tiene lector y ya se vinculó."""
    ctx = nueva(nav, False, huella=True)
    p = ctx.new_page()
    abrir(p, "#/", 1500)
    marcar(p, "compu-huella", p.get_by_test_id("entrar-huella"), "Hacé clic en «Entrar con la huella» y poné el dedo en el lector.")
    p.screenshot(path=f"{SALIDA}/compu-huella.png")
    ctx.close()


def google_en_el_celular(nav, tmp):
    """5. En el celular, con Google: la primera vez. Después ofrece usar la huella."""
    ctx = nueva(nav, True, tmp + "/m5", google=True)
    inicio = time.monotonic()
    p = ctx.new_page()
    abrir(p, "#/", 1500)
    listo = time.monotonic() - inicio
    boton = p.locator("[role=button]").filter(has_text="Continuar con Google")
    marcar(p, "celu-google", boton, "Tocá «Continuar con Google» y elegí tu cuenta.")
    p.screenshot(path=f"{SALIDA}/celu-google.png")
    p.wait_for_timeout(600)
    tocar(p, boton)
    p.wait_for_timeout(900)
    p.evaluate("() => window.__google && window.__google.callback({ credential: 'carlos' })")
    p.wait_for_selector("[data-testid=ofrecer-huella]", timeout=10000)
    p.add_style_tag(content=SIN_MARCO)
    p.wait_for_timeout(1800)
    marcar(p, "celu-ofrecer-huella", p.get_by_test_id("aceptar-huella"), "Tocá «Sí, usar la huella»: la próxima vez entrás con el dedo.")
    marcar(p, "celu-ofrecer-huella", p.get_by_role("button", name="Ahora no"), "Si preferís, «Ahora no»: lo podés hacer después.")
    p.screenshot(path=f"{SALIDA}/celu-ofrecer-huella.png")
    p.wait_for_timeout(600)
    v = p.video.path()
    ctx.close()
    recortar(v, listo, f"{SALIDA}/clip-google-celu.mp4")
    portada(f"{SALIDA}/clip-google-celu.mp4")


def huella_en_el_celular(nav):
    """6. En el celular, con la huella: todas las veces después de la primera."""
    ctx = nueva(nav, True, huella=True, escala=2)
    p = ctx.new_page()
    abrir(p)
    marcar(p, "celu-huella", p.get_by_test_id("entrar-huella"), "Tocá «Entrar con la huella» y apoyá el dedo, como para desbloquear el teléfono.")
    p.screenshot(path=f"{SALIDA}/celu-huella.png")
    ctx.close()


def no_autorizado(nav):
    ctx = nueva(nav, False, google=True)
    p = ctx.new_page()
    abrir(p, "#/", 1500)
    p.evaluate("() => window.__google && window.__google.callback({ credential: 'no' })")
    p.wait_for_timeout(800)
    p.locator("[data-testid=error-google]").scroll_into_view_if_needed()
    p.wait_for_timeout(600)
    marcar(p, "compu-no-autorizado", p.get_by_test_id("error-google"), "El aviso: ese correo de Google no está autorizado.", p.locator(".entrar-cc-tarjeta"))
    p.locator(".entrar-cc-tarjeta").screenshot(path=f"{SALIDA}/compu-no-autorizado.png")
    ctx.close()


def main():
    os.makedirs(SALIDA, exist_ok=True)
    tmp = tempfile.mkdtemp()
    mentira("/mentira/permisos", {"permisos": []})
    y4m = camara_falsa(tmp)
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None, args=[
            "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", f"--use-file-for-fake-video-capture={y4m}"])
        con_el_celular(nav, tmp)
        celular_sin_sesion(nav)
        google_en_la_compu(nav, tmp)
        huella_en_la_compu(nav)
        google_en_el_celular(nav, tmp)
        huella_en_el_celular(nav)
        no_autorizado(nav)
        nav.close()
    with open(f"{SALIDA}/marcas.json", "w") as f:
        json.dump(MARCAS, f, indent=1, ensure_ascii=False)
    shutil.rmtree(tmp, ignore_errors=True)
    print("listo:", SALIDA, sorted(os.listdir(SALIDA)))


if __name__ == "__main__":
    main()

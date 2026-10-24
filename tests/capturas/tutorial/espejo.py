"""El clip del espejo, para el aviso «De paso, quedan vinculados» del capítulo «Entrar»: en el
celular se va de una parte a otra y la computadora va sola a la misma. Con la API de mentira y el
cliente de tests/capturas (tests/capturas/levantar.sh), que pasa el espejo de un lado al otro
(api-de-mentira/rutas-w-espejo.mjs).

    uv run --with playwright==1.56.0 python tests/capturas/tutorial/espejo.py [carpeta]

Deja en la carpeta (por defecto microservices/web/public/manual/entrar/) clip-espejo.mp4 y su
portada, con la computadora y el celular uno al lado del otro, como el clip principal.
"""
import os
import shutil
import subprocess
import sys
import tempfile
import time

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from entrar import API, BASE, CELU, COMPU, RAIZ, SIN_MARCO, TOQUE, UA_CELU, mentira  # noqa: E402

SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "microservices/web/public/manual/entrar")
# Lo que se toca en el celular, en orden: la computadora va sola a cada parte.
RECORRIDO = ["menu-vender", "menu-deposito", "menu-catalogo"]


def sesion(token, dispositivo):
    return f"try {{ localStorage.setItem('ferre.sesion.desarrollo', '{token}'); localStorage.setItem('ferre.dispositivo', '{dispositivo}'); }} catch (e) {{}}"


def tocar(page, testid):
    caja = page.get_by_test_id(testid).bounding_box()
    page.touchscreen.tap(caja["x"] + caja["width"] / 2, caja["y"] + caja["height"] / 2)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    videos = tempfile.mkdtemp()
    mentira("/mentira/permisos", {"permisos": []})
    mentira("/mentira/espejo")
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
        inicio = time.monotonic()
        compu = nav.new_context(locale="es-AR", viewport=COMPU, record_video_dir=videos + "/compu", record_video_size=COMPU)
        celu = nav.new_context(locale="es-AR", viewport=CELU, is_mobile=True, has_touch=True, user_agent=UA_CELU,
                               record_video_dir=videos + "/celu", record_video_size=CELU)
        compu.add_init_script(sesion("compu", "con-celular-mostrador"))
        celu.add_init_script(sesion("celular-de-mentira", "celular-vinculado-1"))
        celu.add_init_script(TOQUE)
        pc, pm = compu.new_page(), celu.new_page()
        for p in (pc, pm):
            p.goto(BASE)
            p.add_style_tag(content=SIN_MARCO)
        pm.get_by_test_id("menu-catalogo").wait_for()
        pm.wait_for_timeout(1500)
        listo = time.monotonic() - inicio
        pm.wait_for_timeout(1200)

        for toque in RECORRIDO:
            antes = pc.evaluate("location.hash")
            tocar(pm, toque)
            pc.wait_for_function("(antes) => location.hash !== antes", arg=antes, timeout=8000)
            print(toque, "→ computadora en", pc.evaluate("location.hash"), "/ celular en", pm.evaluate("location.hash"))
            pm.wait_for_timeout(2600)

        video_compu, video_celu = pc.video.path(), pm.video.path()
        compu.close(); celu.close()
        nav.close()

    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{listo:.2f}", "-i", video_compu, "-ss", f"{listo:.2f}", "-i", video_celu, "-filter_complex",
                    "[0:v]scale=1280:720,setsar=1[c];[1:v]scale=333:720,setsar=1[m];"
                    "color=c=0x0b342c:s=1704x800:r=25[f];[f][c]overlay=30:40:shortest=1[a];[a][m]overlay=1341:40:shortest=1,format=yuv420p",
                    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", f"{SALIDA}/clip-espejo.mp4"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", f"{SALIDA}/clip-espejo.mp4", "-frames:v", "1", f"{SALIDA}/clip-espejo-portada.jpg"], check=True)
    shutil.rmtree(videos, ignore_errors=True)
    print("listo:", SALIDA)


if __name__ == "__main__":
    main()

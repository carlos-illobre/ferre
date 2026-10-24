"""El capítulo «Catálogo» del manual de uso en el celular (012-T014): saca las capturas y graba los
clips de Catálogo → Productos en el teléfono, con la API de mentira y el cliente de tests/capturas
(tests/capturas/levantar.sh).

    uv run --with playwright==1.56.0 python tests/capturas/tutorial/catalogo_celular.py [carpeta]

Deja en la carpeta (por defecto microservices/web/public/manual/catalogo-celular/) las capturas y
los clips; las marcas, en `manual-catalogo-celular-marcas.json`, al lado de la pantalla del manual
(con otra carpeta, en ella, como `marcas.json`). Con SOLO_CAPTURAS=1 deja los clips como están.

La cámara del teléfono es de mentira: un video con un código de barras EAN-13 de verdad (el del
taladro, 7791234000005, o el que se le carga al clavo, 7791234000098), que el lector de la
aplicación lee como leería uno impreso. La cámara de fotos del teléfono no se graba: en el clip,
la foto llega como un archivo elegido.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from entrar import API, BASE, CELU, RAIZ, SIN_MARCO, TOQUE, UA_CELU, mentira  # noqa: E402

SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "microservices/web/public/manual/catalogo-celular")
MARCAS_DEL_MANUAL = os.path.join(RAIZ, "microservices/web/src/pantallas/compu/base/pantallas/manual-catalogo-celular-marcas.json")
CON_SESION = "try { localStorage.setItem('ferre.sesion.desarrollo', 'x'); } catch (e) {}"
MARCAS = {}
TALADRO, NUEVO = "7791234000005", "7791234000098"
# Para la captura de la cámara abierta: un código con el dígito verificador mal, que se ve pero no se lee.
QUIETO = "7791234000013"


# ---------- La cámara de mentira ----------

L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"]
G = ["0100111", "0110011", "0011011", "0100001", "0011101", "0111001", "0000101", "0010001", "0001001", "0010111"]
R = ["1110010", "1100110", "1101100", "1000010", "1011100", "1001110", "1010000", "1000100", "1001000", "1110100"]
PARIDAD = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"]


def ean13(codigo, ruta):
    """Un código de barras EAN-13 impreso sobre una etiqueta blanca, con sus números abajo."""
    bits = "101" + "".join((L if p == "L" else G)[int(d)] for p, d in zip(PARIDAD[int(codigo[0])], codigo[1:7])) + "01010" + "".join(R[int(d)] for d in codigo[7:]) + "101"
    modulo, alto, margen = 5, 260, 60
    img = Image.new("RGB", (len(bits) * modulo + 2 * margen, alto + 2 * margen + 40), "white")
    d = ImageDraw.Draw(img)
    for i, b in enumerate(bits):
        if b == "1":
            d.rectangle([margen + i * modulo, margen, margen + (i + 1) * modulo - 1, margen + alto], fill="black")
    d.text((margen, margen + alto + 10), f"{codigo[0]}  {codigo[1:7]}  {codigo[7:]}", fill="black")
    img.save(ruta)


def camara(carpeta, codigo):
    png, y4m = os.path.join(carpeta, f"{codigo}.png"), os.path.join(carpeta, f"{codigo}.y4m")
    ean13(codigo, png)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-t", "40", "-r", "15",
                    "-vf", "scale=600:-2,pad=720:1280:(ow-iw)/2:(oh-ih)/2:color=0x6b675f,format=yuv420p", y4m], check=True)
    return y4m


def foto_de_ejemplo(ruta):
    """La foto que «saca» el teléfono: una mecha sobre el mostrador."""
    img = Image.new("RGB", (900, 900), "#d9d2c3")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 620, 900, 900], fill="#b9ad97")
    d.rounded_rectangle([170, 400, 560, 470], 20, fill="#4a4f55")
    for x in range(560, 780, 36):
        d.polygon([(x, 400), (x + 30, 412), (x + 18, 470), (x - 12, 458)], fill="#8a9097")
    d.polygon([(780, 400), (840, 435), (780, 470)], fill="#8a9097")
    img.save(ruta)


# ---------- Ayudas ----------

def reiniciar():
    urllib.request.urlopen(urllib.request.Request(API + "/mock-a/reiniciar", data=b"{}", method="POST", headers={"Content-Type": "application/json"}), timeout=5)
    mentira("/mentira/permisos", {"permisos": []})


def celular(nav, video=None):
    """El Catálogo del celular, ya cargado. Devuelve el contexto, la página y cuánto tardó (el clip empieza ahí)."""
    reiniciar()
    opciones = {"locale": "es-AR", "viewport": CELU, "device_scale_factor": 1 if video else 2, "is_mobile": True, "has_touch": True,
                "user_agent": UA_CELU, "permissions": ["camera", "clipboard-read", "clipboard-write"]}
    if video:
        opciones |= {"record_video_dir": video, "record_video_size": CELU}
    ctx = nav.new_context(**opciones)
    ctx.add_init_script(TOQUE)
    ctx.add_init_script(CON_SESION)
    inicio = time.monotonic()
    p = ctx.new_page()
    p.goto(BASE + "#/catalogo")
    p.add_style_tag(content=SIN_MARCO)
    p.wait_for_selector("[data-testid=producto]")
    p.wait_for_timeout(1500)
    return ctx, p, time.monotonic() - inicio


def marcar(page, captura, localizador, texto, punto=False):
    caja = localizador.first.bounding_box()
    v = page.viewport_size
    if punto:
        m = {"x": (caja["x"] + caja["width"] / 2) / v["width"] * 100, "y": (caja["y"] + caja["height"] / 2) / v["height"] * 100}
    else:
        m = {"x": caja["x"] / v["width"] * 100, "y": caja["y"] / v["height"] * 100, "ancho": caja["width"] / v["width"] * 100, "alto": caja["height"] / v["height"] * 100}
    MARCAS.setdefault(captura, []).append({k: round(n, 1) for k, n in m.items()} | {"texto": texto})


def foto(page, nombre):
    page.wait_for_timeout(400)
    page.screenshot(path=f"{SALIDA}/{nombre}.png")


def tocar(page, localizador, espera=700):
    # Al medio de la pantalla: abajo, «Listo» y «Agregar a la venta» tapan lo que quede detrás.
    localizador.first.evaluate("(e) => { const r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight - 110) e.scrollIntoView({ block: 'center' }); }")
    page.wait_for_timeout(250)
    c = localizador.first.bounding_box()
    page.touchscreen.tap(c["x"] + c["width"] / 2, c["y"] + c["height"] / 2)
    page.wait_for_timeout(espera)


def escribir(page, texto, espera=900):
    page.keyboard.type(texto, delay=110)
    page.wait_for_timeout(espera)


def buscador(page):
    return page.locator("input[type=search]").first


def tarjeta(page, texto):
    return page.locator(".tarjeta-producto").filter(has_text=texto).first


def a_la_vista(page, localizador):
    """Lleva al medio de la pantalla algo que está más abajo en la ficha (que se desplaza sola),
    para que no quede tapado por «Listo» y «Agregar a la venta», que van fijos abajo."""
    localizador.first.evaluate("(e) => e.scrollIntoView({ block: 'center' })")
    page.wait_for_timeout(500)


def terminar_clip(ctx, page, listo, nombre):
    page.wait_for_timeout(1400)
    v = page.video.path()
    ctx.close()
    salida = f"{SALIDA}/clip-{nombre}.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{listo:.2f}", "-i", v, "-vf", "format=yuv420p",
                    "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-movflags", "+faststart", salida], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "1", "-i", salida, "-frames:v", "1", salida.replace(".mp4", "-portada.jpg")], check=True)


# ---------- Capturas ----------

def capturas(nav, archivo_de_foto):
    ctx, p, _ = celular(nav)
    primera = p.locator(".tarjeta-producto").first
    marcar(p, "pantalla", buscador(p), "El buscador: escribí lo que buscás.")
    marcar(p, "pantalla", p.get_by_test_id("escanear"), "Buscá escaneando el código de barras.")
    marcar(p, "pantalla", p.get_by_test_id("filtros"), "Filtros: con stock, sin stock o de una marca.")
    marcar(p, "pantalla", primera.get_by_test_id("agregar"), "«Agregar»: lo suma a la venta.")
    foto(p, "pantalla")

    # Buscar.
    buscador(p).fill("mecha")
    p.wait_for_timeout(700)
    marcar(p, "buscar", buscador(p), "Escribí parte del nombre, la marca o el código.")
    marcar(p, "buscar", p.get_by_test_id("producto").first, "Tocá el producto para abrir su ficha.")
    foto(p, "buscar")
    buscador(p).fill("")
    p.wait_for_timeout(500)

    # Filtros.
    tocar(p, p.get_by_test_id("filtros"), 900)
    hoja = p.get_by_test_id("hoja-filtros")
    tocar(p, hoja.get_by_test_id("disponibilidad-con-stock"), 400)
    marcar(p, "filtros", hoja.get_by_role("radiogroup").first, "Elegí ver los que hay o los que faltan.")
    marcar(p, "filtros", hoja.get_by_test_id("buscar-marca"), "Escribí la marca para encontrarla rápido.")
    marcar(p, "filtros", hoja.get_by_test_id("ver-productos"), "«Ver …» cierra y muestra la lista filtrada.")
    foto(p, "filtros")
    tocar(p, hoja.get_by_test_id("ver-productos"), 800)
    marcar(p, "filtros-puestos", p.get_by_test_id("filtros"), "El número dice cuántos filtros hay puestos.")
    marcar(p, "filtros-puestos", p.get_by_test_id("sacar-filtros"), "«Sacar filtros» vuelve a mostrar todos.")
    foto(p, "filtros-puestos")
    tocar(p, p.get_by_test_id("sacar-filtros"), 600)

    # Agregar.
    tocar(p, primera.get_by_test_id("agregar"), 500)
    marcar(p, "agregar", primera.get_by_test_id("agregar"), "Tocá «Agregar».")
    marcar(p, "agregar", p.get_by_test_id("agregado"), "El aviso: ya está en la venta.")
    foto(p, "agregar")
    p.wait_for_timeout(3200)

    # La ficha, de arriba a abajo (con el clavo: dos proveedores y sin código).
    buscador(p).fill("clavo")
    p.wait_for_timeout(700)
    tocar(p, p.get_by_test_id("producto").first, 1200)
    ficha = p.get_by_test_id("ficha-producto")
    marcar(p, "ficha", ficha.get_by_test_id("cambiar-foto"), "La foto: «Sacar foto» o «Cambiar foto».")
    marcar(p, "ficha", ficha.get_by_test_id("stock"), "Cuánto hay en el local.")
    marcar(p, "ficha", ficha.get_by_test_id("escanear-codigo"), "Cargar el código de barras.")
    marcar(p, "ficha", ficha.get_by_test_id("proveedor-en-uso"), "El proveedor y lo que cobra.")
    foto(p, "ficha")
    tocar(p, ficha.get_by_test_id("proveedor-en-uso"), 700)
    a_la_vista(p, ficha.get_by_test_id("proveedor-de-producto"))
    marcar(p, "ficha-proveedores", ficha.get_by_test_id("proveedor-en-uso"), "Tocá el proveedor para ver los otros.")
    marcar(p, "ficha-proveedores", ficha.get_by_test_id("proveedor-de-producto"), "«Usar» toma el costo de ese.")
    foto(p, "ficha-proveedores")
    tocar(p, ficha.get_by_test_id("abrir-calculo"), 700)
    a_la_vista(p, ficha.get_by_test_id("se-cobra"))
    marcar(p, "ficha-calculo", ficha.get_by_test_id("abrir-calculo"), "Tocá «Así se calcula».")
    marcar(p, "ficha-calculo", ficha.get_by_test_id("cuenta"), "Costo, más margen, más IVA.")
    marcar(p, "ficha-calculo", ficha.get_by_test_id("se-cobra"), "Lo que se cobra, redondeado.")
    foto(p, "ficha-calculo")
    a_la_vista(p, ficha.get_by_test_id("archivo-de-origen"))
    marcar(p, "lista", ficha.get_by_test_id("archivo-de-origen"), "La lista de donde salió el costo.")
    marcar(p, "lista", ficha.get_by_test_id("bajar-lista"), "Baja el Excel que mandó el proveedor.")
    marcar(p, "lista", ficha.get_by_test_id("ficha-agregar"), "«Agregar a la venta», desde la ficha.")
    foto(p, "lista")
    tocar(p, ficha.get_by_test_id("ficha-listo"), 700)

    # El margen, en un producto que no tiene.
    buscador(p).fill("hormigón")
    p.wait_for_timeout(700)
    marcar(p, "sin-margen", p.get_by_test_id("producto").first.locator(".derecha"), "Sin margen no hay precio.")
    foto(p, "sin-margen")
    tocar(p, p.get_by_test_id("producto").first, 1200)
    ficha = p.get_by_test_id("ficha-producto")
    a_la_vista(p, ficha.get_by_test_id("otro-margen"))
    marcar(p, "margen", ficha.locator(".cuadricula-5"), "Tocá un porcentaje.")
    marcar(p, "margen", ficha.get_by_test_id("otro-margen"), "O escribí otro y tocá Listo en el teclado.")
    marcar(p, "margen", ficha.get_by_test_id("sin-precio"), "Sin margen no hay precio.")
    foto(p, "margen")
    tocar(p, ficha.locator(".cuadricula-5 button").filter(has_text="100"), 800)
    marcar(p, "margen-listo", ficha.locator(".cuadricula-5 button").filter(has_text="100"), "El margen elegido, en verde oscuro.")
    marcar(p, "margen-listo", ficha.get_by_test_id("precio-de-venta"), "El precio de venta nuevo, al instante.")
    foto(p, "margen-listo")

    # La foto: «Sacar foto» abre la cámara del teléfono; llega como un archivo.
    ficha.get_by_test_id("cambiar-foto").scroll_into_view_if_needed()
    p.wait_for_timeout(400)
    marcar(p, "foto", ficha.get_by_test_id("cambiar-foto"), "Tocá «Sacar foto»: se abre la cámara.")
    foto(p, "foto")
    ficha.get_by_test_id("archivo-foto-ficha").set_input_files(archivo_de_foto)
    p.wait_for_timeout(1500)
    marcar(p, "foto-lista", ficha.locator(".ficha-foto"), "La foto, ya en el producto.")
    marcar(p, "foto-lista", ficha.get_by_test_id("cambiar-foto"), "«Cambiar foto» saca otra.")
    foto(p, "foto-lista")
    ctx.close()


def capturas_con_camara(nav_quieto, nav_taladro, nav_nuevo):
    # La cámara abierta, apuntando a un código.
    ctx, p, _ = celular(nav_quieto)
    tocar(p, p.get_by_test_id("escanear"), 2500)
    marcar(p, "escanear", p.locator(".escaner video"), "Apuntá al código de barras: lo lee solo.", punto=True)
    marcar(p, "escanear", p.get_by_test_id("codigo-manual"), "Si no lo lee, tipealo acá.")
    foto(p, "escanear")
    ctx.close()
    # Buscar escaneando: la cámara ve el código del taladro y se abre su ficha.
    ctx, p, _ = celular(nav_taladro)
    tocar(p, p.get_by_test_id("escanear"), 300)
    p.get_by_test_id("ficha-producto").wait_for(timeout=15000)
    p.wait_for_timeout(1000)
    marcar(p, "escanear-ficha", p.get_by_test_id("ficha-producto").locator("h2").first, "Se abre la ficha del producto escaneado.")
    foto(p, "escanear-ficha")
    ctx.close()

    # Cargar el código: en la ficha del clavo, «Escanear código».
    ctx, p, _ = celular(nav_nuevo)
    buscador(p).fill("clavo")
    p.wait_for_timeout(700)
    tocar(p, p.get_by_test_id("producto").first, 1200)
    ficha = p.get_by_test_id("ficha-producto")
    marcar(p, "codigo", ficha.get_by_test_id("escanear-codigo"), "Tocá «Escanear código» y apuntá a las barras.")
    foto(p, "codigo")
    tocar(p, ficha.get_by_test_id("escanear-codigo"), 300)
    p.get_by_test_id("codigo-guardado").wait_for(timeout=15000)
    p.wait_for_timeout(800)
    cb = p.get_by_test_id("codigo-de-barras")
    marcar(p, "codigo-listo", cb.get_by_test_id("copiar-codigo"), "Lo copia, para pegarlo en un mensaje.")
    marcar(p, "codigo-listo", cb.get_by_test_id("codigo-guardado"), "El aviso, con la fecha y la hora.")
    foto(p, "codigo-listo")
    ctx.close()


# ---------- Clips ----------

def clip_buscar(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/buscar")
    tocar(p, buscador(p), 400)
    escribir(p, "mecha", 2000)
    buscador(p).fill("")
    p.wait_for_timeout(600)
    escribir(p, "papaiz", 2200)
    terminar_clip(ctx, p, listo, "buscar")


def clip_escanear(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/escanear")
    tocar(p, p.get_by_test_id("escanear"), 300)
    p.get_by_test_id("ficha-producto").wait_for(timeout=15000)
    p.wait_for_timeout(2400)
    terminar_clip(ctx, p, listo, "escanear")


def clip_filtros(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/filtros")
    tocar(p, p.get_by_test_id("filtros"), 900)
    hoja = p.get_by_test_id("hoja-filtros")
    tocar(p, hoja.get_by_test_id("disponibilidad-con-stock"), 900)
    tocar(p, hoja.get_by_test_id("buscar-marca"), 300)
    escribir(p, "stan", 700)
    tocar(p, hoja.get_by_test_id("marca").filter(has_text="Stanley"), 900)
    tocar(p, hoja.get_by_test_id("ver-productos"), 1800)
    tocar(p, p.get_by_test_id("sacar-filtros"), 1200)
    terminar_clip(ctx, p, listo, "filtros")


def clip_agregar(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/agregar")
    tocar(p, p.locator(".tarjeta-producto").first.get_by_test_id("agregar"), 1500)
    tocar(p, p.locator(".tarjeta-producto").nth(2).get_by_test_id("agregar"), 1800)
    tocar(p, p.get_by_test_id("menu-vender"), 2600)
    terminar_clip(ctx, p, listo, "agregar")


def clip_ficha(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/ficha")
    tocar(p, buscador(p), 300)
    escribir(p, "clavo", 900)
    tocar(p, p.get_by_test_id("producto").first, 1600)
    ficha = p.get_by_test_id("ficha-producto")
    tocar(p, ficha.get_by_test_id("proveedor-en-uso"), 1800)
    a_la_vista(p, ficha.get_by_test_id("abrir-calculo"))
    tocar(p, ficha.get_by_test_id("abrir-calculo"), 600)
    a_la_vista(p, ficha.get_by_test_id("se-cobra"))
    p.wait_for_timeout(1600)
    a_la_vista(p, ficha.get_by_test_id("archivo-de-origen"))
    p.wait_for_timeout(1200)
    tocar(p, ficha.get_by_test_id("ficha-listo"), 900)
    terminar_clip(ctx, p, listo, "ficha")


def clip_margen(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/margen")
    tocar(p, buscador(p), 300)
    escribir(p, "hormigón", 900)
    tocar(p, p.get_by_test_id("producto").first, 1400)
    ficha = p.get_by_test_id("ficha-producto")
    a_la_vista(p, ficha.get_by_test_id("otro-margen"))
    tocar(p, ficha.locator(".cuadricula-5 button").filter(has_text="100"), 1600)
    tocar(p, ficha.locator(".cuadricula-5 button").filter(has_text="50"), 1600)
    tocar(p, ficha.get_by_test_id("ficha-listo"), 1200)
    terminar_clip(ctx, p, listo, "margen")


def clip_codigo(nav, tmp):
    ctx, p, listo = celular(nav, tmp + "/codigo")
    tocar(p, buscador(p), 300)
    escribir(p, "clavo", 900)
    tocar(p, p.get_by_test_id("producto").first, 1400)
    tocar(p, p.get_by_test_id("ficha-producto").get_by_test_id("escanear-codigo"), 300)
    p.get_by_test_id("codigo-guardado").wait_for(timeout=15000)
    p.wait_for_timeout(1500)
    tocar(p, p.get_by_test_id("copiar-codigo"), 1600)
    terminar_clip(ctx, p, listo, "codigo")


def clip_foto(nav, tmp, archivo_de_foto):
    ctx, p, listo = celular(nav, tmp + "/foto")
    tocar(p, buscador(p), 300)
    escribir(p, "hormigón", 900)
    tocar(p, p.get_by_test_id("producto").first, 1400)
    ficha = p.get_by_test_id("ficha-producto")
    with p.expect_file_chooser() as elegir:
        tocar(p, ficha.get_by_test_id("cambiar-foto"), 300)
    elegir.value.set_files(archivo_de_foto)
    p.wait_for_timeout(2600)
    terminar_clip(ctx, p, listo, "foto")


def main():
    os.makedirs(SALIDA, exist_ok=True)
    tmp = tempfile.mkdtemp()
    archivo_de_foto = os.path.join(tmp, "mecha.png")
    foto_de_ejemplo(archivo_de_foto)
    lanzar = lambda pw, y4m=None: pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None, args=[
        "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] + ([f"--use-file-for-fake-video-capture={y4m}"] if y4m else []))
    quieto, taladro, nuevo = camara(tmp, QUIETO), camara(tmp, TALADRO), camara(tmp, NUEVO)
    with sync_playwright() as pw:
        nav = lanzar(pw)
        nav_quieto, nav_taladro, nav_nuevo = lanzar(pw, quieto), lanzar(pw, taladro), lanzar(pw, nuevo)
        capturas(nav, archivo_de_foto)
        capturas_con_camara(nav_quieto, nav_taladro, nav_nuevo)
        if not os.environ.get("SOLO_CAPTURAS"):
            for clip in (clip_buscar, clip_filtros, clip_agregar, clip_ficha, clip_margen):
                clip(nav, tmp)
            clip_escanear(nav_taladro, tmp)
            clip_codigo(nav_nuevo, tmp)
            clip_foto(nav, tmp, archivo_de_foto)
        for n in (nav, nav_quieto, nav_taladro, nav_nuevo):
            n.close()
    reiniciar()
    destinos = [MARCAS_DEL_MANUAL] if len(sys.argv) <= 1 else [f"{SALIDA}/marcas.json"]
    for destino in destinos:
        with open(destino, "w") as f:
            json.dump(MARCAS, f, indent=1, ensure_ascii=False)
            f.write("\n")
    shutil.rmtree(tmp, ignore_errors=True)
    print("listo:", SALIDA, sorted(os.listdir(SALIDA)))


if __name__ == "__main__":
    main()

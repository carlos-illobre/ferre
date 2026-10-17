"""El capítulo «Catálogo» del manual de uso, la pantalla Productos de la computadora (012-T012): saca
las capturas y graba los clips con la API de mentira y el cliente de tests/capturas
(tests/capturas/levantar.sh).

    uv run --with playwright==1.56.0 python tests/capturas/tutorial/catalogo.py [carpeta]

Deja en la carpeta (por defecto microservices/web/public/manual/catalogo/, de donde las toma la
pantalla del manual) las capturas y los clips; y las marcas numeradas (dónde va cada una, en
porcentaje de la imagen, y su leyenda) en `manual-catalogo-marcas.json`, al lado de la pantalla del
manual. Con otra carpeta, las marcas quedan en ella, en `marcas.json`.

Una captura de una parte de la pantalla (un panel, una fila) se saca al doble de resolución, para
que se lea en la hoja; la pantalla entera, a su tamaño. Cada clip arranca con la pantalla ya
cargada. La lectura del celular vinculado es de mentira (`PUT /mentira/escanear`): el clip muestra
solo la computadora.
"""
import json
import os
import shutil
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from entrar import API, RAIZ, mentira, mover  # noqa: E402
from formas_de_entrar import MARCAS, abrir, marcar, nueva, portada, recortar  # noqa: E402

SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, "microservices/web/public/manual/catalogo")
MARCAS_DEL_MANUAL = os.path.join(RAIZ, "microservices/web/src/pantallas/compu/base/pantallas/manual-catalogo-marcas.json")
VINCULADA = "try { localStorage.setItem('ferre.dispositivo', 'con-celular-1'); } catch (e) {}"


def reiniciar(permisos=()):
    """Los productos como al principio (márgenes, proveedores y fotos) y la sesión con esos permisos (o todos)."""
    urllib.request.urlopen(urllib.request.Request(API + "/mock-a/reiniciar", data=b"{}", method="POST", headers={"Content-Type": "application/json"}), timeout=5)
    mentira("/mentira/permisos", {"permisos": list(permisos)})


def productos(nav, video=None, permisos=(), vinculada=False):
    """La pantalla Productos, ya cargada. Devuelve el contexto, la página y cuánto tardó en cargar
    (para que el clip empiece ahí)."""
    reiniciar(permisos)
    ctx = nueva(nav, False, video, sesion=True, escala=1 if video else 2)
    if vinculada:
        ctx.add_init_script(VINCULADA)
    inicio = time.monotonic()
    p = ctx.new_page()
    abrir(p, "#/productos", 1800)
    p.wait_for_selector("[data-testid=producto]")
    return ctx, p, time.monotonic() - inicio


def foto(page, nombre, region=None):
    """La captura: la pantalla entera a su tamaño, o una parte (un localizador) al doble."""
    # El puntero de los clips (entrar.PUNTERO) no va en las capturas.
    page.evaluate("() => document.querySelectorAll('body > div').forEach((d) => { if (d.style.zIndex === '2147483647') d.style.display = 'none'; })")
    page.wait_for_timeout(350)
    if region is None:
        page.screenshot(path=f"{SALIDA}/{nombre}.png", scale="css")
    else:
        page.screenshot(path=f"{SALIDA}/{nombre}.png", clip=region.bounding_box())


def caja(page, x, y, ancho, alto):
    """Una parte de la pantalla dada a mano, como región para marcar y capturar."""
    return Region({"x": x, "y": y, "width": ancho, "height": alto})


class Region:
    def __init__(self, c):
        self.c = c

    def bounding_box(self):
        return self.c


def union(*localizadores, margen=12):
    """La región que abarca a varios elementos, con un margen."""
    cajas = [l.first.bounding_box() for l in localizadores]
    x0, y0 = min(c["x"] for c in cajas) - margen, min(c["y"] for c in cajas) - margen
    x1, y1 = max(c["x"] + c["width"] for c in cajas) + margen, max(c["y"] + c["height"] for c in cajas) + margen
    return Region({"x": max(x0, 0), "y": max(y0, 0), "width": x1 - max(x0, 0), "height": y1 - max(y0, 0)})


def clic(page, localizador, espera=500):
    """Un clic como el de una persona: el puntero va hasta ahí, espera y aprieta."""
    c = localizador.first.bounding_box()
    page.mouse.move(c["x"] + c["width"] / 2, c["y"] + c["height"] / 2, steps=24)
    page.wait_for_timeout(350)
    page.mouse.down(); page.mouse.up()
    page.wait_for_timeout(espera)


def escribir(page, texto, espera=900):
    page.keyboard.type(texto, delay=110)
    page.wait_for_timeout(espera)


def buscar(page, texto):
    caja_ = page.get_by_label("Buscar productos")
    caja_.fill("")
    caja_.fill(texto)
    page.wait_for_timeout(700)


def fila(page, texto):
    return page.get_by_test_id("producto").filter(has_text=texto).first


def terminar_clip(ctx, page, listo, nombre):
    page.wait_for_timeout(1400)
    v = page.video.path()
    ctx.close()
    recortar(v, listo, f"{SALIDA}/clip-{nombre}.mp4", 1280)
    portada(f"{SALIDA}/clip-{nombre}.mp4")


# ---------- Capturas ----------

def capturas(nav):
    ctx, p, _ = productos(nav)
    # La pantalla de un vistazo: sin el menú de la izquierda y con la primera fila; las columnas,
    # marcadas en su título para que los números no se pisen.
    primera = p.get_by_test_id("producto").first
    region = union(p.locator(".pestanas"), primera, margen=10)
    columna = lambda nombre: p.locator("thead th").filter(has_text=nombre).first
    marcar(p, "pantalla", p.get_by_label("Buscar productos"), "El buscador: escribí lo que buscás.", region)
    marcar(p, "pantalla", p.get_by_test_id("filtros"), "Filtros: con stock, sin stock o de una marca.", region)
    marcar(p, "pantalla", p.locator(".pastilla").filter(has_text="sin margen"), "Cuántos productos todavía no tienen margen.", region)
    marcar(p, "pantalla", columna("Stock"), "Cuánto hay en el local.", region, punto=True)
    marcar(p, "pantalla", columna("Costo"), "El costo: lo que cobra el proveedor, sin IVA.", region, punto=True)
    marcar(p, "pantalla", columna("Margen"), "El margen: cuánto le sumás al costo.", region, punto=True)
    marcar(p, "pantalla", columna("Precio de venta"), "El precio de venta, con IVA y redondeado.", region, punto=True)
    marcar(p, "pantalla", primera.get_by_test_id("agregar"), "«Agregar»: lo suma a la venta.", region)
    foto(p, "pantalla", region)

    # Buscar.
    p.get_by_label("Buscar productos").click()
    escribir(p, "mecha")
    region = caja(p, 210, 120, 1146, 420)
    marcar(p, "buscar", p.get_by_label("Buscar productos"), "Escribí parte del nombre, la marca o el código.", region)
    marcar(p, "buscar", p.get_by_test_id("producto").first.locator(".nombre"), "Aparecen los que coinciden, al instante.", region)
    foto(p, "buscar", region)
    buscar(p, "tuerca mariposa")
    region = union(p.get_by_label("Buscar productos"), p.get_by_test_id("sin-resultados"))
    marcar(p, "sin-resultados", p.get_by_test_id("sin-resultados").locator("h2, h3, strong").first, "No hay ninguno con esas palabras: probá con menos.", region)
    foto(p, "sin-resultados", region)
    buscar(p, "")

    # Filtros.
    p.get_by_test_id("filtros").click()
    p.wait_for_timeout(500)
    p.get_by_test_id("buscar-marca").fill("st")
    p.wait_for_timeout(400)
    panel = p.get_by_test_id("panel-filtros")
    region = union(p.get_by_test_id("filtros"), panel)
    marcar(p, "filtros", p.get_by_test_id("filtros"), "Hacé clic en «Filtros».", region)
    marcar(p, "filtros", panel.get_by_role("radiogroup").first, "Elegí si querés ver los que hay o los que faltan.", region)
    marcar(p, "filtros", p.get_by_test_id("buscar-marca"), "Escribí la marca para encontrarla rápido.", region)
    marcar(p, "filtros", p.get_by_test_id("marca").filter(has_text="Stanley"), "Hacé clic en la marca.", region)
    foto(p, "filtros", region)
    p.get_by_test_id("disponibilidad-con-stock").click()
    p.get_by_test_id("marca").filter(has_text="Stanley").click()
    p.keyboard.press("Escape")
    p.wait_for_timeout(600)
    region = caja(p, 210, 120, 1146, 400)
    marcar(p, "filtros-puestos", p.get_by_test_id("cuantos-filtros"), "Cuántos filtros hay puestos.", region)
    marcar(p, "filtros-puestos", p.get_by_test_id("con-filtros"), "Cuántos productos quedan a la vista.", region)
    marcar(p, "filtros-puestos", p.get_by_test_id("sacar-filtros"), "«Sacar filtros» vuelve a mostrar todos.", region)
    foto(p, "filtros-puestos", region)
    p.get_by_test_id("sacar-filtros").click()

    # De dónde sale el precio.
    primera.get_by_test_id("explicacion").nth(1).click()
    hoja = p.get_by_test_id("hoja-explicacion")
    hoja.wait_for()
    p.wait_for_timeout(500)
    marcar(p, "precio", hoja.locator(".pasos"), "La cuenta, paso por paso.", hoja)
    marcar(p, "precio", hoja.get_by_role("button", name="Entendido"), "«Entendido» la cierra.", hoja)
    foto(p, "precio", hoja)
    hoja.get_by_role("button", name="Entendido").click()
    p.wait_for_timeout(400)

    # El margen.
    buscar(p, "hormigón")
    f = fila(p, "hormigón")
    region = union(p.locator("thead th").filter(has_text="Margen"), f.locator("td").nth(5), f.locator("td").nth(6), margen=8)
    marcar(p, "margen", f.locator(".margenes"), "Hacé clic en un porcentaje.", region)
    marcar(p, "margen", f.get_by_test_id("otro-margen"), "O escribí otro y apretá Enter.", region)
    marcar(p, "margen", f.get_by_test_id("sin-precio"), "Sin margen no hay precio.", region)
    foto(p, "margen", region)
    f.get_by_test_id("margen-100").click()
    p.wait_for_timeout(700)
    marcar(p, "margen-listo", f.get_by_test_id("margen-100"), "El margen elegido queda marcado.", region)
    marcar(p, "margen-listo", f.get_by_test_id("explicacion").nth(1), "El precio de venta nuevo, al instante.", region)
    foto(p, "margen-listo", region)

    # El proveedor y la lista.
    buscar(p, "clavo")
    f = fila(p, "Clavo")
    celda = f.locator("td").nth(2)
    marcar(p, "proveedores", f.get_by_test_id("bajar-lista"), "Baja el Excel que mandó el proveedor.", celda)
    marcar(p, "proveedores", f.locator(".pastilla").filter(has_text="el más barato"), "El que cobra menos.", celda)
    marcar(p, "proveedores", f.get_by_text("en uso"), "El costo que se usa hoy.", celda)
    marcar(p, "proveedores", f.get_by_role("button", name="Usar el costo de"), "«Usar» toma el costo de ese otro proveedor.", celda)
    foto(p, "proveedores", celda)

    # La foto.
    buscar(p, "mecha")
    con, sin = fila(p, "madera"), fila(p, "hormigón")
    region = union(con.locator("td").nth(0), con.locator("td").nth(1), sin.locator("td").nth(1), margen=8)
    marcar(p, "foto-chica", con.get_by_test_id("foto-chica"), "Con foto: hacé clic para verla grande.", region)
    marcar(p, "foto-chica", sin.get_by_test_id("foto-chica"), "Sin foto: hacé clic para agregarle una.", region)
    foto(p, "foto-chica", region)
    sin.get_by_test_id("foto-chica").click()
    grande = p.get_by_test_id("foto-grande")
    grande.wait_for()
    p.wait_for_timeout(900)
    figura = grande.locator("figure")
    marcar(p, "foto-grande", grande.get_by_test_id("foto-con-celular"), "Sacá la foto con el celular.", figura)
    marcar(p, "foto-grande", grande.get_by_test_id("sacar-foto"), "O elegí una foto guardada en la computadora.", figura)
    marcar(p, "foto-grande", grande.get_by_role("button", name="Cerrar"), "«Cerrar» vuelve a la lista.", figura)
    foto(p, "foto-grande", figura)
    grande.get_by_test_id("foto-con-celular").click()
    pedido = grande.get_by_test_id("pedido-de-foto")
    pedido.locator("img").wait_for(timeout=5000)
    grande.get_by_role("button", name="Cerrar").scroll_into_view_if_needed()
    p.wait_for_timeout(700)
    pie = grande.locator("figcaption")
    marcar(p, "foto-qr", pedido.locator("img"), "Apuntá la cámara del celular a este código.", pie)
    marcar(p, "foto-qr", pedido.locator("ol"), "Los pasos: la foto aparece sola.", pie)
    marcar(p, "foto-qr", pedido.get_by_role("button", name="Cancelar"), "«Cancelar» deja de esperarla.", pie)
    foto(p, "foto-qr", pie)
    p.keyboard.press("Escape")
    p.wait_for_timeout(500)

    # Agregar a la venta.
    buscar(p, "")
    primera = p.get_by_test_id("producto").first
    primera.get_by_test_id("agregar").click()
    p.get_by_test_id("agregado").wait_for()
    p.wait_for_timeout(300)
    marcar(p, "agregar", primera.get_by_test_id("agregar"), "Hacé clic en «Agregar».")
    marcar(p, "agregar", p.get_by_test_id("agregado"), "El aviso: ya está en la venta.")
    foto(p, "agregar")

    # La ficha: abrirla.
    buscar(p, "clavo")
    f = fila(p, "Clavo")
    f.locator(".nombre").click()
    region = union(p.get_by_label("Buscar productos"), f, margen=8)
    marcar(p, "ficha-abrir", f, "Hacé clic en la fila del producto y apretá Enter.", region)
    foto(p, "ficha-abrir", region)
    p.keyboard.press("Enter")
    ficha = p.get_by_test_id("ficha-producto")
    ficha.wait_for()
    p.wait_for_timeout(900)
    marcar(p, "ficha", ficha.get_by_test_id("cambiar-foto"), "La foto: «Subir foto» o «Cambiar foto».", ficha)
    marcar(p, "ficha", ficha.get_by_test_id("stock"), "Cuánto hay en el local.", ficha)
    marcar(p, "ficha", ficha.get_by_test_id("codigo-de-barras"), "El código de barras.", ficha)
    marcar(p, "ficha", ficha.get_by_test_id("proveedor-en-uso"), "El proveedor y lo que cobra.", ficha)
    marcar(p, "ficha", ficha.get_by_test_id("archivo-de-origen"), "La lista de donde salió el costo.", ficha)
    marcar(p, "ficha", ficha.locator(".ficha-tarjeta").filter(has=p.get_by_test_id("abrir-calculo")), "El precio de venta y el margen.", ficha)
    marcar(p, "ficha", ficha.get_by_test_id("ficha-agregar"), "«Agregar a la venta».", ficha)
    foto(p, "ficha", ficha)

    # La ficha: la cuenta y los otros proveedores.
    ficha.get_by_test_id("abrir-calculo").click()
    p.wait_for_timeout(500)
    tarjeta = ficha.locator(".ficha-tarjeta").filter(has=p.get_by_test_id("abrir-calculo"))
    marcar(p, "ficha-calculo", ficha.get_by_test_id("abrir-calculo"), "Hacé clic en «Así se calcula».", tarjeta)
    marcar(p, "ficha-calculo", ficha.get_by_test_id("cuenta"), "Costo, más margen, más IVA.", tarjeta)
    marcar(p, "ficha-calculo", ficha.get_by_test_id("se-cobra"), "Lo que se cobra, redondeado.", tarjeta)
    foto(p, "ficha-calculo", tarjeta)
    ficha.get_by_test_id("abrir-calculo").click()
    ficha.get_by_test_id("proveedor-en-uso").click()
    p.wait_for_timeout(500)
    tarjeta = ficha.locator(".ficha-tarjeta").filter(has=p.get_by_test_id("proveedor-en-uso"))
    marcar(p, "ficha-proveedores", ficha.get_by_test_id("proveedor-en-uso"), "Hacé clic en el proveedor para ver los otros.", tarjeta)
    marcar(p, "ficha-proveedores", ficha.get_by_test_id("proveedor-de-producto"), "«Usar» toma el costo de ese.", tarjeta)
    foto(p, "ficha-proveedores", tarjeta)

    # El código de barras.
    cb = ficha.get_by_test_id("codigo-de-barras")
    cb.get_by_test_id("escanear-codigo").click()
    p.wait_for_timeout(400)
    cb.get_by_test_id("codigo-tipeado").fill("7791234000099")
    marcar(p, "codigo-tipear", cb.get_by_test_id("codigo-tipeado"), "Escribí el número que está debajo de las barras.", cb)
    marcar(p, "codigo-tipear", cb.get_by_test_id("guardar-codigo"), "Hacé clic en «Guardar el código».", cb)
    foto(p, "codigo-tipear", cb)
    cb.get_by_test_id("guardar-codigo").click()
    p.wait_for_timeout(800)
    marcar(p, "codigo-listo", cb.get_by_test_id("copiar-codigo"), "Lo copia, para pegarlo en un pedido o un mensaje.", cb)
    marcar(p, "codigo-listo", cb.get_by_test_id("codigo-guardado"), "El aviso, con la fecha y la hora.", cb)
    foto(p, "codigo-listo", cb)

    ficha.get_by_test_id("ficha-listo").click()
    ctx.close()

    # Con el celular vinculado: lo que se escanea abre la ficha.
    ctx, p, _ = productos(nav, vinculada=True)
    p.wait_for_timeout(1500)
    mentira("/mentira/escanear", {"codigo": "7791234000013"})
    ficha = p.get_by_test_id("ficha-producto")
    ficha.wait_for(timeout=10000)
    p.wait_for_timeout(900)
    marcar(p, "escanear", ficha.locator("h2, h1").first, "Se abre la ficha del producto que escaneaste.")
    foto(p, "escanear")
    ctx.close()

    # Lo que ve quien no puede ver costos ni cambiar márgenes.
    ctx, p, _ = productos(nav, permisos=["ventas.registrar"])
    primera = p.get_by_test_id("producto").first
    region = union(p.locator("thead"), p.get_by_test_id("producto").nth(1), margen=0)
    marcar(p, "sin-permisos", primera.get_by_test_id("margen-fijo"), "El margen solo se lee: no se puede cambiar.", region)
    marcar(p, "sin-permisos", primera.locator("td").nth(2), "Sin costo, ni lista, ni otros proveedores.", region)
    foto(p, "sin-permisos", region)
    ctx.close()


# ---------- Clips ----------

def clip_buscar(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/buscar")
    clic(p, p.get_by_label("Buscar productos"))
    escribir(p, "mecha", 2200)
    p.keyboard.press("Escape")
    p.wait_for_timeout(900)
    escribir(p, "papaiz", 2000)
    p.keyboard.press("Escape")
    p.wait_for_timeout(600)
    escribir(p, "7791234000005", 2200)
    terminar_clip(ctx, p, listo, "buscar")


def clip_filtros(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/filtros")
    clic(p, p.get_by_test_id("filtros"), 800)
    clic(p, p.get_by_test_id("disponibilidad-con-stock"), 900)
    clic(p, p.get_by_test_id("buscar-marca"), 300)
    escribir(p, "stan", 700)
    clic(p, p.get_by_test_id("marca").filter(has_text="Stanley"), 1200)
    p.keyboard.press("Escape")
    p.wait_for_timeout(1800)
    clic(p, p.get_by_test_id("sacar-filtros"), 1200)
    terminar_clip(ctx, p, listo, "filtros")


def clip_precio(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/precio")
    primera = p.get_by_test_id("producto").first
    clic(p, primera.get_by_test_id("explicacion").nth(1), 2600)
    clic(p, p.get_by_test_id("hoja-explicacion").get_by_role("button", name="Entendido"), 800)
    clic(p, primera.get_by_test_id("explicacion").first, 2400)
    clic(p, p.get_by_test_id("hoja-explicacion").get_by_role("button", name="Entendido"), 600)
    terminar_clip(ctx, p, listo, "precio")


def clip_margen(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/margen")
    clic(p, p.get_by_label("Buscar productos"), 200)
    escribir(p, "hormigón", 1000)
    f = fila(p, "hormigón")
    clic(p, f.get_by_test_id("margen-100"), 1600)
    clic(p, f.get_by_test_id("margen-50"), 1600)
    clic(p, f.get_by_test_id("otro-margen"), 200)
    escribir(p, "120", 400)
    p.keyboard.press("Enter")
    p.wait_for_timeout(1500)
    terminar_clip(ctx, p, listo, "margen")


def clip_proveedor(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/proveedor")
    clic(p, p.get_by_label("Buscar productos"), 200)
    escribir(p, "clavo", 1200)
    f = fila(p, "Clavo")
    mover(p, "[data-testid=producto] >> text=el más barato")
    p.wait_for_timeout(900)
    clic(p, f.get_by_role("button", name="Usar el costo de"), 2200)
    clic(p, f.get_by_role("button", name="Usar el costo de"), 1800)
    terminar_clip(ctx, p, listo, "proveedor")


def clip_foto(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/foto")
    clic(p, p.get_by_label("Buscar productos"), 200)
    escribir(p, "hormigón", 900)
    clic(p, fila(p, "hormigón").get_by_test_id("foto-chica"), 1300)
    clic(p, p.get_by_test_id("foto-con-celular"), 1000)
    # La API de mentira manda la foto sola a los ocho segundos, como si el celular la hubiera sacado.
    p.get_by_test_id("foto-grande").locator("img[alt='Mecha 6 mm para hormigón']").wait_for(timeout=15000)
    p.wait_for_timeout(1800)
    clic(p, p.get_by_test_id("foto-grande").get_by_role("button", name="Cerrar"), 1200)
    terminar_clip(ctx, p, listo, "foto")


def clip_agregar(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/agregar")
    clic(p, p.get_by_test_id("producto").first.get_by_test_id("agregar"), 1500)
    clic(p, p.get_by_test_id("producto").nth(2).get_by_test_id("agregar"), 1800)
    clic(p, p.get_by_test_id("menu-vender"), 2600)
    terminar_clip(ctx, p, listo, "agregar")


def clip_ficha(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/ficha")
    clic(p, p.get_by_label("Buscar productos"), 200)
    escribir(p, "clavo", 900)
    clic(p, fila(p, "Clavo").locator(".nombre"), 500)
    p.keyboard.press("Enter")
    ficha = p.get_by_test_id("ficha-producto")
    ficha.wait_for()
    p.wait_for_timeout(1500)
    clic(p, ficha.get_by_test_id("abrir-calculo"), 2600)
    clic(p, ficha.get_by_test_id("proveedor-en-uso"), 2000)
    clic(p, ficha.get_by_test_id("ficha-listo"), 1000)
    terminar_clip(ctx, p, listo, "ficha")


def clip_codigo(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/codigo")
    clic(p, p.get_by_label("Buscar productos"), 200)
    escribir(p, "clavo", 900)
    clic(p, fila(p, "Clavo").locator(".nombre"), 500)
    p.keyboard.press("Enter")
    ficha = p.get_by_test_id("ficha-producto")
    ficha.wait_for()
    p.wait_for_timeout(1200)
    clic(p, ficha.get_by_test_id("escanear-codigo"), 600)
    escribir(p, "7791234000099", 500)
    clic(p, ficha.get_by_test_id("guardar-codigo"), 1800)
    clic(p, ficha.get_by_test_id("copiar-codigo"), 1800)
    terminar_clip(ctx, p, listo, "codigo")


def clip_escanear(nav, tmp):
    ctx, p, listo = productos(nav, tmp + "/escanear", vinculada=True)
    p.mouse.move(683, 420)
    p.wait_for_timeout(1800)
    mentira("/mentira/escanear", {"codigo": "7791234000013"})
    p.get_by_test_id("ficha-producto").wait_for(timeout=10000)
    p.wait_for_timeout(2600)
    terminar_clip(ctx, p, listo, "escanear")


def main():
    os.makedirs(SALIDA, exist_ok=True)
    tmp = tempfile.mkdtemp()
    with sync_playwright() as pw:
        nav = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or None)
        capturas(nav)
        # SOLO_CAPTURAS=1: deja los clips como están.
        for clip in () if os.environ.get("SOLO_CAPTURAS") else (clip_buscar, clip_filtros, clip_precio, clip_margen, clip_proveedor, clip_foto, clip_agregar, clip_ficha, clip_codigo, clip_escanear):
            clip(nav, tmp)
        nav.close()
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

"""Prueba las interacciones de las seis maquetas de «Ventas de hoy».

Abre cada variante (computadora 1366 × 768; celular 390 × 844, escala 2, táctil), toca cada control
conectado y comprueba: ningún error de JavaScript, cada diálogo u hoja abre y cierra (con su botón,
tocando afuera y con Escape; las hojas, también bajando el agarre), lo que confirma deja su estado
de después y cada data-ir nombra una pantalla que existe. Los data-ir no navegan durante la prueba:
se anotan.

    uv run --with playwright==1.56.0 python herramientas/probar-interacciones.py
"""
import pathlib
import sys
import traceback

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PANTALLAS = {"entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar",
             "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"}
ANOTAR_IR = """
window.__ir = [];
document.addEventListener('click', function (e) {
  var el = e.target.closest && e.target.closest('[data-ir]');
  if (el) { window.__ir.push(el.getAttribute('data-ir')); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
"""

fallas, pruebas = [], 0


def ok(cond, msg):
    global pruebas
    pruebas += 1
    if not cond:
        fallas.append(msg)
        print("  FALLA:", msg)


class Maqueta:
    def __init__(self, nav, disp, carpeta):
        self.disp, self.nombre = disp, f"{disp}/{carpeta}"
        if disp == "celu":
            self.ctx = nav.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True)
        else:
            self.ctx = nav.new_context(viewport={"width": 1366, "height": 768})
        self.p = self.ctx.new_page()
        self.p.set_default_timeout(5000)
        self.errores = []
        self.p.on("pageerror", lambda e: self.errores.append(str(e)))
        self.p.on("console", lambda m: self.errores.append(m.text) if m.type == "error" else None)
        self.p.add_init_script(ANOTAR_IR)
        self.p.goto((RAIZ / disp / carpeta / "index.html").as_uri())
        self.p.wait_for_timeout(900)
        print("==", self.nombre)

    def ev(self, js):
        return self.p.evaluate(js)

    def clic(self, sel):
        self.p.locator(sel).first.click()
        self.p.wait_for_timeout(260)

    def tocar(self, x, y):
        self.p.mouse.click(x, y)
        self.p.wait_for_timeout(300)

    def tecla(self, k):
        self.p.keyboard.press(k)
        self.p.wait_for_timeout(260)

    def abiertas(self):
        return self.ev("VH.abiertas()")

    def arrastrar(self, sel, hacia, pasos=12):
        b = self.p.locator(sel).first.bounding_box()
        x0, y0 = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
        self.p.mouse.move(x0, y0)
        self.p.mouse.down()
        self.p.mouse.move(x0 + 10, y0 + 2)
        self.p.wait_for_timeout(120)
        if isinstance(hacia, str):
            d = self.p.locator(hacia).first.bounding_box()
            x1, y1 = d["x"] + d["width"] / 2, d["y"] + d["height"] / 2
        else:
            x1, y1 = hacia
        for k in range(1, pasos + 1):
            self.p.mouse.move(x0 + (x1 - x0) * k / pasos, y0 + (y1 - y0) * k / pasos)
            self.p.wait_for_timeout(16)
        self.p.mouse.up()
        self.p.wait_for_timeout(350)

    def cerrar_de(self, como):
        if como == "boton":
            sel = ".vh-dialogo [data-cerrar], .vh-hoja [data-cerrar], .hoja [data-cerrar]"
            self.p.locator(sel).last.click()
        elif como == "afuera":
            self.p.mouse.click(*((195, 70) if self.disp == "celu" else (20, 740)))
        elif como == "esc":
            self.p.keyboard.press("Escape")
        elif como == "agarre":
            hay = self.ev("document.querySelectorAll('.vh-hoja .agarre').length")
            self.arrastrar(".vh-hoja .agarre >> nth=-1" if hay else ".hoja .agarre", (195, 840))
        self.p.wait_for_timeout(330)

    def abre_y_cierra(self, abrir, que, formas=("boton", "afuera", "esc")):
        for como in formas:
            antes = self.abiertas()
            abrir() if callable(abrir) else self.clic(abrir)
            ok(self.abiertas() > antes, f"{self.nombre}: «{que}» no abre")
            self.cerrar_de(como)
            ok(self.abiertas() == antes, f"{self.nombre}: «{que}» no cierra con {como}")
        ok(self.ev("document.querySelectorAll('.vh-velo').length") == 0, f"{self.nombre}: «{que}» deja el fondo oscuro")

    def ir_anotado(self):
        return self.ev("window.__ir.slice()")

    def fin(self):
        irs = self.ev("Array.from(document.querySelectorAll('[data-ir]')).map(e => e.getAttribute('data-ir'))")
        malos = [x for x in set(irs + self.ir_anotado()) if x not in PANTALLAS]
        ok(not malos, f"{self.nombre}: data-ir sin pantalla: {malos}")
        ok(not self.errores, f"{self.nombre}: errores de JavaScript: {self.errores}")
        self.ctx.close()


def marco_compu(m, mas_sel):
    for sel, destino in ((".lateral [data-ir='vender']", "vender"), (".lateral [data-ir='productos']", "productos"),
                         (".lateral [data-ir='stock']", "stock"), (".lateral [data-ir='resumen']", "resumen"),
                         (".pestanas [data-ir='vender']", "vender")):
        m.clic(sel)
        ok(m.ir_anotado()[-1:] == [destino], f"{m.nombre}: {sel} no lleva a {destino}")
    m.abre_y_cierra(mas_sel, "Más", ("afuera", "esc"))
    m.clic(mas_sel)
    m.clic(".vh-menu [data-ir='procesos']")
    ok(m.ir_anotado()[-1:] == ["procesos"], f"{m.nombre}: Más → Procesos")
    m.tecla("Escape")


def marco_celu(m):
    for i, destino in ((0, "vender"), (1, "productos"), (2, "stock"), (3, "resumen")):
        m.clic(f".nav-inferior a >> nth={i}")
        ok(m.ir_anotado()[-1:] == [destino], f"{m.nombre}: menú de abajo {i} no lleva a {destino}")
    m.clic(".celu-pestanas [data-ir='vender']")
    ok(m.ir_anotado()[-1:] == ["vender"], f"{m.nombre}: pestaña Vender")
    m.abre_y_cierra(".nav-inferior a >> nth=4", "Más", ("boton", "afuera", "esc", "agarre"))
    m.clic(".nav-inferior a >> nth=4")
    m.clic(".vh-hoja [data-ir='configuracion']")
    ok(m.ir_anotado()[-1:] == ["configuracion"], f"{m.nombre}: Más → Configuración")
    m.tecla("Escape")


def total(m, sel):
    return m.ev(f"document.querySelector({sel!r}).textContent.replace(/\\s/g, '')")


def compu1(nav):
    m = Maqueta(nav, "compu", "variante-1-el-dia")
    marco_compu(m, ".lateral .nav-item >> nth=4")
    m.abre_y_cierra(".cabecera .acciones .btn >> nth=0", "Cambiar fecha")
    m.clic(".cabecera .acciones .btn >> nth=0"); m.clic("[data-dia='1710']")
    ok("Sábado" in m.ev("document.querySelector('.cabecera .sub').textContent"), "compu 1: otro día no cambia la fecha")
    m.p.mouse.move(655, 270); m.p.wait_for_timeout(200)
    ok(m.ev("document.querySelector('.grafico .globo').textContent").startswith("9 h"), "compu 1: el globo no sigue la barra")
    m.p.mouse.move(700, 600)
    m.clic(".fila[data-id='1722']")
    ok("Cinta métrica" in m.ev("document.querySelector('aside').textContent"), "compu 1: elegir una venta no muestra su detalle")
    m.clic("aside [data-acc='corregir']"); m.clic("aside [data-mas='0']")
    ok("$24.000" in m.ev("document.querySelector('aside').textContent"), "compu 1: + no recalcula")
    m.clic("aside [data-acc='guardar']")
    ok("corregida" in m.ev("document.querySelector('.fila[data-id=\"1722\"]').textContent"), "compu 1: corregir no marca la venta")
    ok(total(m, ".dia .t-total") == "$424.000", "compu 1: el total del día no sube al corregir")
    m.abre_y_cierra("aside [data-acc='cambio']", "Cambio (desde la venta)")
    m.abre_y_cierra("aside [data-acc='anular']", "Anular")
    m.clic("aside [data-acc='anular']"); m.clic(".vh-dialogo [data-si]")
    ok(m.ev("document.querySelector('.fila[data-id=\"1722\"]').classList.contains('anulada')"), "compu 1: anular no tacha la venta")
    ok(total(m, ".dia .t-total") == "$391.000", "compu 1: el total del día no baja al anular")
    m.abre_y_cierra(".cabecera .btn-accion", "Registrar un cambio")
    filas = m.ev("document.querySelectorAll('.fila[data-id]').length")
    m.clic(".cabecera .btn-accion"); m.clic(".vh-elige[data-venta='1615']"); m.clic(".vh-elige[data-lleva='1']"); m.clic(".vh-dialogo [data-si]")
    ok(m.ev("document.querySelectorAll('.fila[data-id]').length") == filas + 1, "compu 1: el cambio no agrega su renglón")
    m.clic(".filtros .chip >> nth=3")
    ok(m.ev("Array.from(document.querySelectorAll('.fila[data-id]')).filter(f => f.style.display !== 'none').every(f => f.classList.contains('anulada'))"), "compu 1: el filtro Anuladas")
    m.clic(".filtros .chip >> nth=0")
    m.clic(".filtros .buscar"); m.p.keyboard.type("lámpara"); m.p.wait_for_timeout(200)
    ok(m.ev("Array.from(document.querySelectorAll('.fila[data-id]')).filter(f => f.style.display !== 'none').length") == 2, "compu 1: buscar")
    m.tecla("Escape"); m.clic(".fila[data-id='1251']"); m.tecla("ArrowUp")
    ok(m.ev("document.querySelector('.fila.elegida').dataset.id") == "1615", "compu 1: ↑ no elige la anterior")
    m.tecla("e"); ok(m.ev("!!document.querySelector('aside [data-acc=\"guardar\"]')"), "compu 1: E no corrige")
    m.tecla("Escape"); ok(m.ev("!document.querySelector('aside [data-acc=\"guardar\"]')"), "compu 1: Esc no descarta")
    m.fin()


def compu2(nav):
    m = Maqueta(nav, "compu", "variante-2-cuaderno")
    marco_compu(m, ".lateral .nav-item >> nth=4")
    m.abre_y_cierra(".cabecera .acciones .btn", "Otro día")
    m.clic("[data-ed='0:cant']"); m.p.keyboard.press("Control+a"); m.p.keyboard.type("2"); m.tecla("Enter")
    ok("+$25.000" in m.ev("document.querySelector('.pie-b .btn-accion').textContent"), "compu 2: escribir encima no recalcula")
    rr = m.ev("document.querySelectorAll('.boleta .rr').length")
    m.clic("[data-agregar]")
    ok(m.ev("document.querySelectorAll('.boleta .rr').length") == rr + 1, "compu 2: agregar no suma el renglón")
    m.tecla("Control+Enter")
    ok("corregida" in m.ev("document.querySelector('.tl[data-id=\"1648\"]').textContent"), "compu 2: guardar no marca la venta")
    m.clic(".tl[data-id='1722']")
    ok(m.ev("document.querySelector('.verbos .elegido').textContent").startswith("Ver"), "compu 2: elegir una venta no la abre en Ver")
    m.clic(".verbos [data-modo='cambio']"); m.clic("[data-lleva='1']")
    tl = m.ev("document.querySelectorAll('.tl').length"); m.tecla("Control+Enter")
    ok(m.ev("document.querySelectorAll('.tl').length") == tl + 1, "compu 2: el cambio no agrega su renglón")
    m.clic(".tl[data-id='1615']"); m.tecla("Delete")
    ok(m.ev("!!document.querySelector('.pie-b .btn-peligro')"), "compu 2: Supr no abre Anular")
    m.tecla("Escape"); m.tecla("Delete"); m.tecla("Control+Enter")
    ok(m.ev("document.querySelector('.tl[data-id=\"1615\"]').classList.contains('anulada')"), "compu 2: anular no tacha la venta")
    m.fin()


def compu3(nav):
    m = Maqueta(nav, "compu", "variante-3-cajones")
    for sel in (".arriba .logo", ".miga [data-ir]"):
        m.clic(sel); ok(m.ir_anotado()[-1:] == ["vender"], f"compu 3: {sel} no lleva a Vender")
    m.clic(".arrastrada")
    ok(total(m, ".cajon.mp .ccab .va") == "$195.000", "compu 3: soltar la arrastrada no la pasa a Mercado Pago")
    ok(m.ev("getComputedStyle(document.querySelector('.zonas')).display") == "none", "compu 3: las zonas no se esconden")
    m.arrastrar(".vt[data-id='1722']", ".cajon.cuenta .ccab")
    ok(total(m, ".cajon.cuenta .ccab .va") == "$76.000", "compu 3: arrastrar a otro cajón no corrige el medio")
    m.arrastrar(".vt[data-id='1615']", (683, 714))
    ok(m.abiertas() == 1, "compu 3: soltar en Anular no pide confirmar")
    m.tecla("Escape")
    m.abre_y_cierra(".vt[data-id='1648']", "Detalle de la venta")
    m.clic(".vt[data-id='1648']"); m.clic(".vh-dialogo [data-acc='corregir']"); m.clic(".vh-dialogo [data-mas='1']"); m.clic(".vh-dialogo [data-acc='guardar']")
    ok("corregida" in m.ev("document.querySelector('.vt[data-id=\"1648\"]').textContent"), "compu 3: corregir no marca la tarjeta")
    m.tecla("Escape")
    m.abre_y_cierra(lambda: m.tecla("Control+k"), "Ir a… (Ctrl K)")
    m.tecla("Control+k"); m.p.keyboard.type("stock"); m.p.wait_for_timeout(150)
    m.clic(".vh-dialogo [data-ir='stock']"); ok(m.ir_anotado()[-1:] == ["stock"], "compu 3: Ir a… Stock")
    m.tecla("Escape")
    m.abre_y_cierra(".arriba .der .btn >> nth=0", "Fecha")
    m.abre_y_cierra(".arriba .der .btn-accion", "Registrar un cambio")
    m.fin()


def celu1(nav):
    m = Maqueta(nav, "celu", "variante-1-el-dia")
    marco_celu(m)
    m.abre_y_cierra(".dia-linea .btn", "Otro día", ("boton", "afuera", "esc", "agarre"))
    m.abre_y_cierra(".vr[data-id='1736']", "La venta", ("boton", "afuera", "esc", "agarre"))
    m.clic(".vr[data-id='1736']"); m.clic(".vh-hoja [data-modo='corregir']"); m.clic(".vh-hoja [data-mas='0']"); m.clic(".vh-hoja [data-guardar]")
    ok("corregida" in m.ev("document.querySelector('.vr[data-id=\"1736\"]').textContent"), "celu 1: corregir no marca la venta")
    m.clic(".vr[data-id='1615']"); m.clic(".vh-hoja [data-modo='anular']")
    ok(m.abiertas() == 2, "celu 1: Anular no pide confirmar")
    m.clic(".vh-hoja [data-si]")
    ok(m.ev("document.querySelector('.vr[data-id=\"1615\"]').classList.contains('anulada')"), "celu 1: anular no tacha la venta")
    n = m.ev("document.querySelectorAll('.vr[data-id]').length")
    m.clic(".vr[data-id='1722']"); m.clic(".vh-hoja [data-modo='cambio']"); m.clic(".vh-hoja [data-si]")
    ok(m.ev("document.querySelectorAll('.vr[data-id]').length") == n + 1, "celu 1: el cambio no agrega su renglón")
    m.ev("document.querySelector('.celu-pantalla').scrollTop = 0")
    b = m.p.locator(".resu .horas .h >> nth=2").bounding_box()
    m.tocar(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
    ok(m.ev("(document.querySelector('.resu .globo') || {}).textContent || ''").startswith("10 h"), "celu 1: tocar una barra no muestra la hora")
    m.fin()


def celu2(nav):
    m = Maqueta(nav, "celu", "variante-2-hoja")
    ok(m.abiertas() == 1, "celu 2: la hoja no empieza abierta")
    m.cerrar_de("agarre"); ok(m.abiertas() == 0, "celu 2: la hoja no baja con el agarre")
    marco_celu(m)
    m.tocar(100, 270)  # la que quedó deslizada: tocarla la cierra
    ok(m.ev("!document.querySelector('.desliz[data-abierta]')"), "celu 2: tocar la deslizada no la cierra")
    m.abre_y_cierra(".vr[data-id='1648']", "La venta", ("boton", "afuera", "esc", "agarre"))
    m.clic(".vr[data-id='1648']"); m.clic(".hoja [data-modo='corregir']"); m.clic(".hoja [data-mas='1']"); m.clic(".hoja [data-guardar]")
    ok("corregida" in m.ev("document.querySelector('.vr[data-id=\"1648\"]').textContent"), "celu 2: corregir no marca la venta")
    b = m.p.locator(".vr[data-id='1615']").bounding_box()
    m.arrastrar(".vr[data-id='1615']", (b["x"] + b["width"] / 2 - 110, b["y"] + b["height"] / 2))
    ok(m.ev("!!document.querySelector('.desliz[data-abierta] .vr[data-id=\"1615\"]')"), "celu 2: deslizar no muestra Cambio y Anular")
    m.abre_y_cierra(".desliz[data-abierta] .debajo .cam", "Cambio (deslizando)", ("boton",))
    b = m.p.locator(".vr[data-id='1251']").bounding_box()
    m.arrastrar(".vr[data-id='1251']", (b["x"] - 300, b["y"] + b["height"] / 2))
    ok(m.abiertas() == 1, "celu 2: deslizar hasta el final no pide confirmar")
    m.clic(".vh-hoja [data-si]")
    ok(m.ev("document.querySelector('.vr[data-id=\"1251\"]').classList.contains('anulada')"), "celu 2: anular no tacha la venta")
    m.fin()


def celu3(nav):
    m = Maqueta(nav, "celu", "variante-3-camara")
    n = m.ev("document.querySelectorAll('.cr').length")
    m.tocar(195, 200)
    ok(m.ev("document.querySelectorAll('.cr').length") == n + 1, "celu 3: tocar la cámara no escanea")
    ok("16.000" in m.ev("document.querySelector('.deslizar').textContent"), "celu 3: la diferencia no cambia")
    m.clic(".pasos span >> nth=0")
    ok(m.ev("document.querySelector('.pasos span').classList.contains('ahora')"), "celu 3: el paso Vuelve")
    m.clic(".medios .m.mp")
    ok(m.ev("document.querySelector('.medios .m.mp').classList.contains('elegido')"), "celu 3: elegir el medio")
    m.abre_y_cierra(".arriba .x", "Dejar el cambio", ("boton", "afuera", "esc", "agarre"))
    m.arrastrar(".pulgar", (385, 800))
    m.p.wait_for_timeout(500)
    ok(m.ev("!!document.querySelector('.vh-listo')"), "celu 3: deslizar no cobra")
    m.fin()


with sync_playwright() as pw:
    nav = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for f in (compu1, compu2, compu3, celu1, celu2, celu3):
        try:
            f(nav)
        except Exception as e:  # una que se traba no frena a las demás
            linea = [x for x in traceback.extract_tb(e.__traceback__) if x.name == f.__name__][-1:]
            ok(False, f"{f.__name__}: se trabó en «{linea[0].line if linea else '?'}»: {str(e).splitlines()[0]}")
    nav.close()

print(f"\n{pruebas} comprobaciones, {len(fallas)} fallas")
sys.exit(1 if fallas else 0)

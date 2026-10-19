"""Toca cada control conectado de las seis maquetas de Vender y comprueba que:
- no hay errores de JavaScript (pageerror),
- cada diálogo, hoja o menú abre y se cierra con su botón, tocando afuera y con Escape,
- lo que agrega suma renglones y cambia el total, y cobrar deja la venta vacía,
- cada data-ir (también los de adentro de los diálogos) nombra una pantalla que existe,
- un data-ir navega.
Uso (desde esta carpeta): uv run --with playwright==1.56.0 python probar.py [--sin-movimiento]
(--sin-movimiento prueba lo mismo con «reducir movimiento» prendido)
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PANTALLAS = {"entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar",
             "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"}
fallas = []
CAPA = ".v-fondo:not(.cerrando)"


class Prueba:
    def __init__(self, pg, nombre):
        self.pg, self.nombre, self.errores, self.irs = pg, nombre, [], set()
        pg.on("pageerror", lambda e: self.errores.append(str(e)))

    def mal(self, texto):
        fallas.append(f"{self.nombre}: {texto}")
        print("   FALLA", texto)

    def esperar(self, ms=380):
        self.pg.wait_for_timeout(ms)

    def juntar_irs(self):
        for v in self.pg.eval_on_selector_all("[data-ir]", "els => els.map(e => e.getAttribute('data-ir'))"):
            self.irs.add(v)

    def capas(self):
        return self.pg.locator(CAPA).count()

    def total(self, sel):
        return self.pg.locator(sel).first.inner_text().replace("\n", "").strip()

    def abre(self, que, accion, cerrar="esc"):
        antes = self.capas()
        accion()
        self.esperar()
        self.juntar_irs()
        if self.capas() <= antes:
            self.mal(f"«{que}» no abrió nada")
            return False
        if cerrar is None:
            return True
        if cerrar == "esc":
            self.pg.keyboard.press("Escape")
        elif cerrar == "afuera":
            self.pg.mouse.click(4, 4)
        elif cerrar == "boton":
            self.pg.locator(CAPA).last.locator("[data-cerrar]").first.click()
        self.esperar()
        if self.capas() > antes:
            self.mal(f"«{que}» no se cerró ({cerrar})")
            self.pg.keyboard.press("Escape"); self.esperar()
        else:
            print(f"   ok  {que} (abre y cierra: {cerrar})")
        return True

    def cambia(self, que, sel, accion, ms=450):
        antes = self.total(sel)
        accion()
        self.esperar(ms)
        despues = self.total(sel)
        if antes == despues:
            self.mal(f"«{que}» no cambió {sel} ({antes})")
        else:
            print(f"   ok  {que}: {antes} → {despues}")

    def cuenta(self, que, sel, accion, ms=450):
        antes = self.pg.locator(sel).count()
        accion()
        self.esperar(ms)
        despues = self.pg.locator(sel).count()
        if despues <= antes:
            self.mal(f"«{que}» no agregó ({sel}: {antes} → {despues})")
        else:
            print(f"   ok  {que}: {antes} → {despues} renglones")

    def cobrada(self, que, accion, total_sel, vacio="$0"):
        accion()
        self.esperar(900)
        if not self.pg.get_by_text("Venta registrada").count():
            self.mal(f"«{que}» no mostró «Venta registrada»")
        self.pg.keyboard.press("Escape"); self.esperar(500)
        t = self.total(total_sel)
        if t.replace(" ", "") != vacio:
            self.mal(f"después de cobrar el total quedó {t}")
        else:
            print(f"   ok  {que}: venta registrada y vacía ({t})")

    def navega(self, sel):
        self.juntar_irs()
        malos = sorted(v for v in self.irs if v not in PANTALLAS)
        if malos:
            self.mal(f"data-ir sin pantalla: {malos}")
        else:
            print(f"   ok  {len(self.irs)} destinos data-ir válidos: {', '.join(sorted(self.irs))}")
        destino = self.pg.locator(sel).first.get_attribute("data-ir")
        # Abierta sola, navegar.js va al navegador de versiones (/v2…/#pantalla/dispositivo), que aquí no
        # existe: se anota adónde iba y se frena la navegación.
        self.pg.evaluate("window.navigation.addEventListener('navigate', e => { window.__destino = e.destination.url; e.preventDefault(); })")
        self.pg.locator(sel).first.click()
        self.esperar(500)
        url = self.pg.evaluate("window.__destino || ''")
        if "#" + destino + "/" not in url:
            self.mal(f"{sel} no navegó a {destino} ({url})")
        else:
            print(f"   ok  {sel} navega a …/{url.split('/', 3)[-1].split('propuestas-de-diseno/')[-1]}")

    def fin(self):
        for e in self.errores:
            self.mal(f"error de JavaScript: {e}")


def arrastrar(pg, sel, dx, dy=0):
    bb = pg.locator(sel).first.bounding_box()
    x, y = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
    pg.mouse.move(x, y); pg.mouse.down()
    for i in range(1, 13):
        pg.mouse.move(x + dx * i / 12, y + dy * i / 12); pg.wait_for_timeout(16)
    pg.mouse.up()


# ------------------------------------------------------------------ computadora
def compu1(t, pg):
    k = pg.keyboard
    t.cuenta("buscar «lamp» + Enter", ".lista .item", lambda: (pg.click(".busqueda .campo"), k.type("lamp"), pg.wait_for_timeout(200), k.press("Enter")))
    t.cuenta("ítem libre desde la búsqueda (Ctrl Enter)", ".lista .item", lambda: (k.type("arena fina"), k.press("Control+Enter")))
    t.abre("precio a mano del ítem libre", lambda: pg.locator(".item.sinprecio [data-mano]").first.click(), "boton")
    t.cambia("escanear con el celular", ".cobro .t-total", lambda: pg.click("[data-escanear]"), 1700)
    t.cambia("+ de un renglón", ".cobro .t-total", lambda: pg.locator(".item:not(.sinprecio) [data-mas]").first.click())
    t.cambia("margen 50 del primer renglón", ".cobro .t-total", lambda: pg.locator('.item:not(.sinprecio) [data-m="300"]').first.click())
    t.abre("menú ⋯ del renglón", lambda: pg.locator(".item .menu").first.click(), "afuera")
    t.abre("De dónde sale (F1)", lambda: k.press("F1"), "boton")
    t.abre("Guardar como producto", lambda: pg.locator("[data-guardar]").first.click(), "esc")
    t.abre("Cliente (F9)", lambda: k.press("F9"), "afuera")
    t.abre("Pedidos y presupuestos", lambda: pg.click("[data-pyp]"), "boton")
    t.abre("A pedido", lambda: pg.click("[data-pedido]"), "esc")
    t.abre("Presupuesto", lambda: pg.click("[data-presupuesto]"), "afuera")
    t.abre("Más", lambda: pg.click("[data-menu-mas]"), "esc")
    t.abre("Usuario", lambda: pg.click("[data-usuario]"), "afuera")
    pg.click(".medios .m.mp"); t.esperar(150)
    if "elegido" not in pg.locator(".medios .m.mp").get_attribute("class"):
        t.mal("Mercado Pago no quedó elegido")
    k.press("F7"); t.esperar(150)
    if "elegido" not in pg.locator(".medios .m.tarjeta").get_attribute("class"):
        t.mal("F7 no eligió tarjeta")
    pg.click("[data-cobrar]"); t.esperar(600)
    if pg.get_by_text("Venta registrada").count():
        t.mal("cobró con un renglón sin precio")
    else:
        print("   ok  Cobrar con un renglón sin precio no cobra")
    for sel in ['.item.sinprecio [data-m="100"]']:
        while pg.locator(sel).count():
            pg.locator(sel).first.click(); t.esperar(300)
    while pg.locator(".item.sinprecio [data-mano]").count():
        pg.locator(".item.sinprecio [data-mano]").first.click(); t.esperar(300); k.type("2500"); k.press("Enter"); t.esperar(300)
    t.cobrada("Cobrar (F2)", lambda: k.press("F2"), ".cobro .t-total")
    t.cuenta("tecla de letra empieza a buscar", ".lista .item", lambda: (k.type("mecha"), k.press("Enter")))
    t.cambia("Vaciar", ".cobro .t-total", lambda: pg.click("[data-vaciar]"))
    t.navega(".pestanas [data-ir='ventas-de-hoy']")


def compu2(t, pg):
    k = pg.keyboard
    t.cuenta("Enter suma «2 llave comb 13»", "[data-filas] .fila", lambda: k.press("Enter"))
    t.cuenta("«0,7 kg clavos» suma (ya estaba: suma cantidad)", "[data-filas] .fila", lambda: (k.type("3 tornillos"), k.press("Enter")))
    t.cuenta("«$1500 cemento» como ítem libre", "[data-filas] .fila", lambda: (k.type("$1500 cemento"), k.press("Enter")))
    t.cambia("clic en una sugerencia", ".pie-cobro .t-numero", lambda: (k.type("pinza"), pg.wait_for_timeout(200), pg.locator(".sugerencias .sug").first.click()))
    t.cambia("margen 3 (100 %) en el renglón sin precio", ".pie-cobro .t-numero", lambda: (pg.click(".fila.falta"), k.press("3")))
    t.cambia("clic en el margen 25 de un renglón", ".pie-cobro .t-numero", lambda: pg.locator('.fila [data-m="25"]').first.click())
    t.abre("cantidad del renglón", lambda: pg.locator(".celda-cant").first.click(), "afuera")
    t.cambia("+ en el menú de cantidad", ".pie-cobro .t-numero", lambda: (pg.locator(".celda-cant").first.click(), pg.wait_for_timeout(350), pg.locator(CAPA + " [data-mas]").click(), pg.wait_for_timeout(200), k.press("Escape")))
    t.abre("Teclas ?", lambda: pg.click("[data-teclas]"), "boton")
    t.abre("De dónde sale (F1)", lambda: k.press("F1"), "esc")
    t.abre("Más", lambda: pg.click("[data-menu-mas]"), "afuera")
    t.abre("Usuario", lambda: pg.click("[data-usuario]"), "esc")
    pg.click(".medios-seg .ms.mp"); t.esperar(150)
    if "elegido" not in pg.locator(".medios-seg .ms.mp").get_attribute("class"):
        t.mal("Mercado Pago no quedó elegido")
    t.cobrada("Cobrar", lambda: pg.click("[data-cobrar]"), ".pie-cobro .t-numero")
    t.cuenta("escribir después de cobrar", "[data-filas] .fila", lambda: (k.type("2 mecha"), k.press("Enter")))
    t.cambia("No llevó (Esc con la línea vacía)", ".pie-cobro .t-numero", lambda: (pg.click(".comando"), k.press("Escape")))
    t.navega(".segmentos [data-ir='ventas-de-hoy']")


def compu3(t, pg):
    k = pg.keyboard
    t.cambia("clic en la foto de la lámpara", ".boleta .t-total", lambda: pg.click('[data-prod="lampara"]'))
    t.cambia("tecla 5 (martillo)", ".boleta .t-total", lambda: k.press("5"))
    t.cambia("el celular escanea", ".boleta .t-total", lambda: pg.click("[data-escanear]"), 1100)
    t.cambia("buscar «pinza» + Enter", ".boleta .t-total", lambda: (pg.click(".buscar"), k.type("pinza"), pg.wait_for_timeout(200), k.press("Enter")))
    t.cambia("margen 50 en la línea sin precio", ".boleta .t-total", lambda: pg.click('.linea.falta [data-m="50"]'))
    t.abre("menú de una línea de la boleta", lambda: pg.locator(".linea").first.click(), "afuera")
    t.abre("Ítem libre (+)", lambda: (k.press("+")), "esc")
    t.cuenta("Ítem libre: agregar «Bolsa de cal» a $2.000", ".linea", lambda: (pg.click("[data-libre]"), pg.wait_for_timeout(350), k.type("Bolsa de cal"), pg.locator(CAPA + " [data-precio]").fill("2000"), k.press("Enter")))
    t.abre("Pasar a pedido", lambda: pg.click("[data-pedido]"), "boton")
    t.abre("Presupuesto", lambda: pg.click("[data-presupuesto]"), "esc")
    t.abre("Ir a… (Ctrl K)", lambda: k.press("Control+k"), "afuera")
    t.abre("Ir a… (clic)", lambda: pg.click("[data-ira]"), "esc")
    t.abre("Usuario", lambda: pg.click("[data-usuario]"), "afuera")
    pg.click(".md.tarjeta"); t.esperar(200)
    if "con tarjeta" not in pg.locator("[data-cobrar]").inner_text():
        t.mal("Cobrar no dice el medio elegido")
    else:
        print("   ok  Cobrar dice «con tarjeta»")
    pg.click(".md.cuenta"); t.esperar(150)
    t.abre("Cuenta corriente sin cliente pide el cliente", lambda: k.press("F2"), "esc")
    k.press("F5"); t.esperar(150)
    t.cobrada("Cobrar (F2)", lambda: k.press("F2"), ".boleta .t-total")
    t.cambia("tecla 1 después de cobrar", ".boleta .t-total", lambda: k.press("1"))
    t.cambia("No llevó (Esc)", ".boleta .t-total", lambda: k.press("Escape"))
    t.navega("[data-hoy]")


# ------------------------------------------------------------------ celular
def celu1(t, pg):
    t.abre("cámara", lambda: pg.click("[data-escanear]"), "boton")
    t.cambia("la cámara lee (tocar el visor)", ".cobrar .num", lambda: (pg.click("[data-escanear]"), pg.wait_for_timeout(400), pg.mouse.click(195, 300), pg.wait_for_timeout(300), pg.locator(CAPA + " [data-cerrar]").first.click()), 900)
    t.abre("buscar", lambda: pg.click("[data-buscar]"), "boton")
    t.cuenta("buscar «martillo» y tocar", ".lista .card", lambda: (pg.click("[data-buscar]"), pg.wait_for_timeout(400), pg.keyboard.type("martillo"), pg.locator('.v-r[data-id="martillo"]').click()))
    t.cambia("+ de un renglón", ".cobrar .num", lambda: pg.locator(".card [data-mas]").first.click())
    t.abre("hoja del margen", lambda: pg.locator(".card [data-margen]").first.click(), "afuera")
    t.cambia("margen 200 desde la hoja", ".cobrar .num", lambda: (pg.locator(".card [data-margen]").first.click(), pg.wait_for_timeout(400), pg.locator('.v-opcion[data-m="200"]').click()))
    t.abre("ficha del renglón", lambda: pg.locator(".card [data-ficha]").first.click(), "esc")
    t.abre("Más", lambda: pg.click("[data-menu-mas]"), "afuera")
    pg.click(".mc.cuenta"); t.esperar(150)
    pg.click("[data-cobrar]"); t.esperar(600)
    if pg.get_by_text("Venta registrada").count():
        t.mal("cobró con un renglón sin precio")
    t.cambia("margen 100 en la tarjeta sin precio", ".cobrar .num", lambda: pg.click('.card.falta [data-m="100"]'))
    t.abre("cuenta corriente pide el cliente", lambda: pg.click("[data-cobrar]"), "afuera")
    pg.click(".mc.efectivo"); t.esperar(150)
    t.cobrada("Cobrar", lambda: pg.click("[data-cobrar]"), ".cobrar .num")
    t.navega(".nav-inferior [data-ir='productos']")


def celu2(t, pg):
    t.cambia("tocar el visor lee un código", ".hoja-cab .t-numero", lambda: pg.mouse.click(195, 200))
    t.cambia("deslizar un renglón lo quita", ".hoja-cab .t-numero", lambda: arrastrar(pg, ".v-desliz >> nth=1", -160), 600)
    t.abre("tocar un renglón abre su hoja", lambda: pg.locator(".v-desliz").first.click(), "afuera")
    t.abre("medio de pago", lambda: pg.click("[data-medio]"), "esc")
    pg.click("[data-medio]"); t.esperar(400); pg.click('[data-medio="mp"]'); t.esperar(300)
    t.abre("Buscar", lambda: pg.click('[data-modo="buscar"]'), "boton")
    t.abre("Dictar", lambda: pg.click('[data-modo="voz"]'), "esc")
    t.cambia("Dictar suma lo dicho", ".hoja-cab .t-numero", lambda: (pg.click('[data-modo="voz"]'), pg.wait_for_timeout(2300)), 300)
    pg.click("[data-luz]"); t.esperar(250)
    if "prendida" not in (pg.locator(".v-luz").get_attribute("class") or ""):
        t.mal("la linterna no se prendió")
    arrastrar(pg, ".pulgar", 320); t.esperar(900)
    if pg.get_by_text("Venta registrada").count():
        t.mal("cobró con un renglón sin precio")
    else:
        print("   ok  deslizar para cobrar con un renglón sin precio abre su margen")
    pg.locator('.v-opcion[data-m="100"]').click(); t.esperar(300); pg.mouse.click(195, 60); t.esperar(400)
    pg.click("[data-cerrar-cam]"); t.esperar(500)
    if "44px" not in (pg.locator(".hoja").get_attribute("style") or ""):
        t.mal("la × no subió la hoja de la venta")
    else:
        print("   ok  la × sube la hoja de la venta")
    pg.click("[data-volver]"); t.esperar(500)
    t.cobrada("Deslizá para cobrar", lambda: arrastrar(pg, ".pulgar", 320), ".hoja-cab .t-numero")
    t.juntar_irs()
    # Esta variante tapa el marco con la cámara: no tiene menú de abajo; navega desde «Venta registrada».
    t.cuenta("tocar el visor después de cobrar", ".v-desliz", lambda: pg.mouse.click(195, 200))
    arrastrar(pg, ".pulgar", 320); t.esperar(900)  # cobra otra vez y navega desde «Venta registrada»
    t.navega(CAPA + " [data-ir='ventas-de-hoy']")


def celu3(t, pg):
    t.cambia("tocar el micrófono dicta y suma", ".cab .total .t-numero", lambda: (pg.click("[data-mic]"), pg.wait_for_timeout(2300)), 300)
    t.cambia("elegir «Genérico» resuelve la duda", ".cab .total .t-numero", lambda: pg.click('[data-d="tarugos-g"]'))
    t.abre("tocar un renglón abre su hoja", lambda: pg.locator(".renglones .r").first.click(), "afuera")
    t.abre("la venta entera (Y N más)", lambda: pg.click(".previos"), "boton")
    t.abre("cámara", lambda: pg.click("[data-escanear]"), "boton")
    t.abre("teclado (buscar)", lambda: pg.click("[data-teclado]"), "esc")
    t.abre("menú", lambda: pg.click("[data-menu]"), "afuera")
    t.cambia("«sacá los tarugos»", ".cab .total .t-numero", lambda: pg.click('[data-frase="sacar"]'), 600)
    t.cobrada("«cobrá en efectivo»", lambda: pg.click('[data-frase="cobrar"]'), ".cab .total .t-numero")
    t.cambia("dictar otra vez", ".cab .total .t-numero", lambda: (pg.click("[data-mic]"), pg.wait_for_timeout(2300)), 300)
    t.cobrada("deslizar el micrófono hacia arriba cobra", lambda: arrastrar(pg, ".mic", 0, -110), ".cab .total .t-numero")
    t.abre("menú (para navegar)", lambda: pg.click("[data-menu]"), None)
    t.navega(CAPA + " [data-ir='resumen']")


CASOS = [("compu", "variante-1-mostrador", compu1), ("compu", "variante-2-teclado", compu2), ("compu", "variante-3-estante", compu3),
         ("celu", "variante-1-mostrador", celu1), ("celu", "variante-2-camara", celu2), ("celu", "variante-3-dictado", celu3)]

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    for disp, var, fn in CASOS:
        html = RAIZ / disp / var / "index.html"
        celu = disp == "celu"
        ctx = nav.new_context(viewport={"width": 390, "height": 844} if celu else {"width": 1366, "height": 768},
                              device_scale_factor=2 if celu else 1, has_touch=celu,
                              reduced_motion="reduce" if "--sin-movimiento" in sys.argv else "no-preference")
        pg = ctx.new_page()
        t = Prueba(pg, f"{disp}/{var}")
        print(f"\n== {disp}/{var}")
        pg.goto(html.as_uri()); pg.wait_for_timeout(400)
        t.juntar_irs()
        try:
            fn(t, pg)
        except Exception as e:  # noqa: BLE001
            t.mal("se cortó la prueba: " + " | ".join(l for l in str(e).splitlines() if "intercepts" in l or "Timeout" in l)[:400])
        t.fin()
        ctx.close()
    nav.close()

print("\n" + ("Todo bien." if not fallas else f"{len(fallas)} fallas:\n- " + "\n- ".join(fallas)))
sys.exit(1 if fallas else 0)

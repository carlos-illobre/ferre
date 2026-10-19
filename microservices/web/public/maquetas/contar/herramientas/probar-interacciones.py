"""Prueba las maquetas navegables de Contar: toca cada control conectado y revisa que no haya
errores de JavaScript, que cada diálogo u hoja abra y cierre (botón, afuera y Escape) y que cada
data-ir apunte a una pantalla válida.

uso: uv run --with playwright==1.56.0 python herramientas/probar-interacciones.py   (desde contar/)
"""
import pathlib, sys
from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent.parent
PANTALLAS = {"entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar",
             "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"}
fallas, hechas = [], 0


def ok(cond, que):
    global hechas
    hechas += 1
    if not cond:
        fallas.append(que)
        print("  FALLA:", que)


class Pagina:
    def __init__(self, ctx, ruta, celu):
        self.pg = ctx.new_page()
        self.nombre, self.celu, self.errores = ruta, celu, []
        self.pg.on("pageerror", lambda e: self.errores.append(str(e)))
        # navegar.js cambia de página: acá solo se anota adónde iría.
        self.pg.add_init_script("window.__fueA = []; (function(){ var p = window.postMessage; })();")
        self.pg.goto((AQUI / ruta / "index.html").as_uri())
        self.pg.wait_for_timeout(300)
        self.pg.evaluate("window.irAMaqueta && (window.irAMaqueta = function(d){ window.__fueA.push(d); })")
        # Los clics en data-ir no deben salir de la página durante la prueba.
        self.pg.evaluate("""document.addEventListener('click', function(e){ var a = e.target.closest('[data-ir]'); if (a) { e.stopImmediatePropagation(); e.preventDefault(); window.__fueA.push(a.getAttribute('data-ir')); } }, true)""")

    def capas(self):
        return self.pg.locator(".cx-capa").count()

    def esperar(self, ms=380):
        self.pg.wait_for_timeout(ms)

    def tocar(self, sel, n=0):
        loc = self.pg.locator(sel).nth(n)
        if self.celu:
            loc.tap()
        else:
            loc.click()
        self.esperar()

    def abre(self, sel, que, cerrar="boton", n=0):
        antes = self.capas()
        self.tocar(sel, n)
        ok(self.capas() > antes, f"{self.nombre}: «{que}» abre")
        if cerrar == "boton":
            b = self.pg.locator(".cx-capa [data-cerrar]").last
            if b.count():
                b.click()
            else:
                ok(False, f"{self.nombre}: «{que}» tiene botón de cerrar")
        elif cerrar == "afuera":
            self.pg.mouse.click(4, 60) if not self.celu else self.pg.locator(".cx-velo").last.tap(position={"x": 8, "y": 8})
        elif cerrar == "escape":
            self.pg.keyboard.press("Escape")
        if cerrar:
            self.esperar()
            ok(self.capas() == antes, f"{self.nombre}: «{que}» cierra con {cerrar}")

    def texto(self, sel):
        return self.pg.locator(sel).first.inner_text().strip()

    def revisar_ir(self):
        malos = self.pg.evaluate("[...document.querySelectorAll('[data-ir]')].map(e => e.getAttribute('data-ir'))")
        for d in malos:
            ok(d in PANTALLAS, f"{self.nombre}: data-ir «{d}» es una pantalla")
        return malos

    def fin(self):
        self.revisar_ir()
        ok(not self.errores, f"{self.nombre}: sin errores de JavaScript {self.errores}")
        print(f"  {self.nombre}: listo, {len(self.errores)} errores")
        self.pg.close()


def mas(p):
    p.abre("#mas", "Más", cerrar=None)
    irs = p.pg.evaluate("[...document.querySelectorAll('.cx-capa [data-ir]')].map(e => e.getAttribute('data-ir'))")
    ok(irs == ["anomalias", "procesos", "mejoras-y-errores", "configuracion"], f"{p.nombre}: Más lista las cuatro pantallas ({irs})")
    p.revisar_ir()
    p.pg.keyboard.press("Escape"); p.esperar()
    ok(p.capas() == 0, f"{p.nombre}: Más cierra con Escape")


def compu1(ctx):
    p = Pagina(ctx, "compu/variante-1-sectores", False); pg = p.pg
    ok(len(p.revisar_ir()) >= 7, "compu 1: marco con data-ir")
    mas(p)
    # contar el elegido: número y Enter
    pg.keyboard.press("Backspace"); pg.keyboard.press("9"); pg.keyboard.press("Enter"); p.esperar()
    ok(p.texto(".avance .fila b") == "25", "compu 1: Enter cuenta (25 de 64)")
    ok("Tarugos nylon S8" in p.texto(".listas .lista .r"), "compu 1: el contado entra primero en Contados")
    # tocar uno sin contar y contarlo
    p.tocar(".listas .lista >> nth=1 >> .r.sin")
    nombre = p.texto(".elegido-box .n")
    pg.keyboard.type("7"); pg.keyboard.press("Enter"); p.esperar()
    ok(p.texto(".avance .fila b") == "26" and nombre in p.texto(".listas .lista .r"), "compu 1: tocar un sin contar y contarlo")
    # uno ya contado muestra «Antes»
    p.tocar(".listas .lista .r", 1)
    ok("Antes" in p.texto(".elegido-box"), "compu 1: un contado muestra «Antes»")
    # buscador
    p.abre(".carga .campo", "buscador", cerrar="escape")
    p.tocar(".carga .campo"); pg.keyboard.type("tuerca"); pg.keyboard.press("Enter"); p.esperar()
    ok("Tuerca" in p.texto(".elegido-box .n"), "compu 1: el buscador elige")
    # escanear con el celular
    p.abre(".cabecera .acciones .btn >> nth=0", "Escanear con el celular", cerrar="boton")
    p.tocar(".cabecera .acciones .btn >> nth=0"); pg.wait_for_timeout(2200)
    ok(p.capas() == 0, "compu 1: el escaneo simulado llega y cierra")
    # nuevo sector
    p.abre(".col-titulo .btn", "Nuevo sector", cerrar="afuera")
    p.tocar(".col-titulo .btn"); pg.keyboard.type("Góndola de candados"); pg.keyboard.press("Enter"); p.esperar()
    ok(pg.locator(".sec").count() == 9, "compu 1: Nuevo sector agrega uno")
    # cerrar el sector
    p.abre(".cabecera .btn-accion", "Cerrar el sector", cerrar="boton")
    p.abre(".cabecera .btn-accion", "Cerrar el sector", cerrar="escape")
    p.tocar(".cabecera .btn-accion"); p.tocar("[data-ver]")
    ok(pg.locator(".cx-cierre .difs .f").count() >= 4, "compu 1: «Ver las diferencias» las muestra todas")
    p.tocar("[data-cierra=no]")
    ok(pg.locator(".cx-tilde").count() == 1, "compu 1: confirmar muestra el tilde")
    p.tocar(".cx-capa [data-cerrar]")
    ok("Contado hoy" in p.texto(".sec >> nth=0"), "compu 1: el sector queda «Contado hoy»")
    ok(p.texto(".kpis .resumen .va").startswith("10"), "compu 1: Stock cargado sube a 10")
    # abrir otro sector
    p.abre(".sec >> nth=2", "Abrir un sector", cerrar="escape")
    p.tocar(".sec >> nth=2"); p.tocar("[data-abrir]")
    ok(p.texto(".conteo-cab .t-seccion") == "Pared de electricidad", "compu 1: abrir otro sector rearma el panel")
    pg.keyboard.type("20"); pg.keyboard.press("Enter"); p.esperar()
    ok(p.texto(".avance .fila b") == "1", "compu 1: se cuenta en el sector nuevo")
    p.fin()


def compu2(ctx):
    p = Pagina(ctx, "compu/variante-2-plano", False); pg = p.pg
    mas(p)
    p.tocar(".mapa-cab .chip >> nth=1")
    ok("plan" in p.texto(".ley"), "compu 2: filtro Plan A B C cambia la leyenda")
    p.tocar(".mapa-cab .chip >> nth=2"); ok("movió" in p.texto(".ley"), "compu 2: filtro Diferencias")
    p.tocar(".mapa-cab .chip >> nth=0")
    p.abre(".plano .toque >> nth=1", "Sector del plano", cerrar="boton")
    p.tocar(".plano .toque >> nth=1"); p.tocar("[data-abrir]")
    ok(pg.locator('.plano rect[x="336"][y="20"]:not(.toque)').get_attribute("fill") == "#FDEDE4", "compu 2: abrir Electricidad la pinta en curso")
    p.abre(".dia >> nth=2", "Día de la semana", cerrar="escape")
    p.abre(".cabecera .acciones .btn", "Dibujar un sector", cerrar="afuera")
    p.tocar(".cabecera .acciones .btn"); pg.keyboard.type("Candados"); pg.keyboard.press("Enter"); p.esperar()
    ok(pg.locator(".plano .toque").count() == 11, "compu 2: dibujar agrega un sector")
    p.tocar(".quien .pastilla"); p.esperar(500)
    ok(int(p.texto(".anillo .c b")) >= 25, "compu 2: llega un conteo del celular")
    p.abre(".feed .f >> nth=0", "Corregir un conteo", cerrar="boton")
    p.tocar(".feed .f >> nth=0"); pg.keyboard.press("Control+A"); pg.keyboard.type("7"); pg.keyboard.press("Enter"); p.esperar()
    ok("Corregido: 7" in p.texto(".cx-tostadas"), "compu 2: corregir guarda")
    p.abre(".pie-vivo .btn", "Revisar y cerrar", cerrar="escape")
    p.tocar(".pie-vivo .btn"); p.tocar("[data-cierra=cero]"); p.tocar(".cx-capa [data-cerrar]")
    ok("quedó contada" in p.texto(".vivo"), "compu 2: cerrar deja el panel en listo")
    p.abre("[data-abrir-elec]", "Abrir Electricidad", cerrar="boton")
    p.fin()


def compu3(ctx):
    p = Pagina(ctx, "compu/variante-3-planilla", False); pg = p.pg
    mas(p)
    pg.keyboard.press("Enter"); p.esperar(150)
    ok(p.texto(".avance-n .t-numero") == "42", "compu 3: Enter anota y baja (42)")
    pg.keyboard.type("15"); pg.keyboard.press("Enter"); p.esperar(150)
    ok(p.texto(".avance-n .t-numero") == "43", "compu 3: segundo número (43)")
    pg.keyboard.press("ArrowUp"); pg.keyboard.press("Delete"); p.esperar(150)
    ok(p.texto(".avance-n .t-numero") == "42", "compu 3: Supr borra lo contado")
    p.tocar("tbody tr >> nth=3")
    ok("activa" in pg.locator("tbody tr").nth(3).get_attribute("class"), "compu 3: tocar una fila la elige")
    p.tocar(".hoja-cab .segmentos > span >> nth=1")
    ok(p.texto("tbody tr .prod").startswith("Arandela"), "compu 3: A–Z ordena")
    p.tocar(".hoja-cab .segmentos > span >> nth=2")
    vis = pg.evaluate("[...document.querySelectorAll('tbody tr')].filter(t => t.style.display !== 'none').length")
    ok(vis < 23, f"compu 3: Sin contar oculta los contados ({vis})")
    p.tocar(".hoja-cab .segmentos > span >> nth=0")
    p.abre(".hoja-cab .buscar", "Buscar", cerrar="escape")
    p.tocar(".hoja-cab .buscar"); p.tocar("[data-lector]"); p.esperar(500)
    ok("activa" in (pg.locator("tbody tr").nth(12).get_attribute("class") or ""), "compu 3: el lector simulado va a AP-14")
    p.abre(".cabecera .acciones .btn >> nth=1", "Imprimir", cerrar="boton")
    p.tocar(".op >> nth=1"); ok("si" in pg.locator(".op").nth(1).get_attribute("class"), "compu 3: elegir qué pasa con los sin contar")
    p.abre(".ciego .btn-accion", "Cerrar y ver diferencias", cerrar="afuera")
    p.tocar(".ciego .btn-accion"); p.tocar("[data-cierra=cero]"); p.tocar(".cx-capa [data-cerrar]")
    ok("oculto" not in p.texto("tbody"), "compu 3: al cerrar se ve la columna Sistema")
    p.abre(".cabecera .acciones .btn >> nth=0", "Volver: elegir sector", cerrar="escape")
    p.tocar(".cabecera .acciones .btn >> nth=0"); p.tocar("[data-s='2']")
    ok(p.texto(".cabecera .t-titulo") == "Pared de electricidad", "compu 3: abrir otro sector")
    p.fin()


def cierre_celu(p, pref):
    """La hoja de cerrar (la de la variante 4) abre, cierra tocando afuera, y confirma."""
    pg = p.pg
    ok(pg.locator(".cx-cierre .tres .va").count() == 3, f"{pref}: la hoja de cerrar tiene los tres números")
    ok(pg.locator(".cx-cierre .opciones .btn").count() >= 2, f"{pref}: la hoja de cerrar tiene las dos opciones")
    if pg.locator(".cx-cierre [data-ver]").count():
        p.tocar(".cx-cierre [data-ver]")
        ok(pg.locator(".cx-cierre .difs .f").count() > 3, f"{pref}: «Ver las diferencias»")
    p.tocar(".cx-cierre [data-cierra=no]")
    ok(pg.locator(".cx-tilde").count() >= 1, f"{pref}: confirmar muestra el tilde")
    p.tocar(".cx-capa [data-cerrar] >> nth=-1")


def celu1(ctx):
    p = Pagina(ctx, "celu/variante-1-retomar", True); pg = p.pg
    ok(len(p.revisar_ir()) >= 7, "celu 1: menú de abajo y pestañas con data-ir")
    mas(p)
    p.abre(".btn-vinculo", "En espejo", cerrar="afuera")
    p.abre(".hoy", "Hoy toca contar", cerrar="boton")
    p.abre(".sec-tit .btn", "Nuevo sector", cerrar="escape")
    p.tocar(".sec-tit .btn"); pg.keyboard.type("Góndola de plomería"); pg.keyboard.press("Enter"); p.esperar()
    ok(pg.locator(".lista .sec").count() == 6, "celu 1: Nuevo sector agrega uno")
    # seguir contando
    p.abre(".barra-accion .btn-accion", "Seguir contando (modo de contar)", cerrar="escape")
    p.tocar(".barra-accion .btn-accion")
    ok("24 de 64" in p.texto(".cc-av"), "celu 1: el modo de contar abre en 24 de 64")
    p.tocar("[data-mas]"); p.tocar("[data-mas]"); p.tocar("[data-sig]")
    ok("25 de 64" in p.texto(".cc-av") and pg.locator(".cc-r").count() == 5, "celu 1: + + y Siguiente cuenta (25 de 64)")
    p.tocar(".cc-elegido input"); pg.keyboard.type("6"); pg.keyboard.press("Enter"); p.esperar()
    ok("26 de 64" in p.texto(".cc-av"), "celu 1: teclear y Enter cuenta (26)")
    p.abre("[data-buscar]", "Buscar", cerrar="boton")
    p.tocar("[data-buscar]"); pg.keyboard.type("tuerca"); p.tocar(".cx-capa .cx-op")
    ok("Tuerca" in p.texto(".cc-elegido .n"), "celu 1: buscar elige")
    p.abre("[data-escanear]", "Cámara", cerrar="boton")
    p.tocar("[data-escanear]"); pg.wait_for_timeout(1700)
    ok(pg.locator(".cx-camara").count() == 0, "celu 1: la cámara lee y se cierra sola")
    p.tocar(".cc-r >> nth=1")
    ok("Antes" in p.texto(".cc-elegido"), "celu 1: un contado muestra «Antes»")
    p.abre("[data-cierre]", "Cerrar sector", cerrar="afuera")
    p.tocar("[data-cierre]"); cierre_celu(p, "celu 1"); p.esperar()
    ok(pg.locator(".cx-pantalla").count() == 0 and "Contado hoy" in p.texto(".seguir"), "celu 1: al cerrar vuelve a la lista con el sector contado")
    # abrir otro sector desde la lista
    p.abre(".lista .sec >> nth=2", "Abrir un sector", cerrar="boton")
    p.tocar(".lista .sec >> nth=2"); p.tocar("[data-abrir]"); p.esperar()
    ok("0 de 37" in p.texto(".cc-av"), "celu 1: abrir Electricidad empieza en 0 de 37")
    p.tocar(".cx-pantalla [data-cerrar]")
    ok(p.capas() == 0, "celu 1: la × del modo de contar vuelve")
    p.fin()


def celu2(ctx):
    p = Pagina(ctx, "celu/variante-2-teclado", True); pg = p.pg
    p.tocar(".tecla >> nth=11")  # borrar
    p.tocar(".tecla >> nth=6"); p.tocar(".tecla >> nth=10")  # 7 0
    ok(p.texto(".pantallita .q") == "70", "celu 2: el teclado escribe")
    p.tocar(".tecla >> nth=11"); p.tocar(".sig .btn-accion"); p.esperar(1200)
    ok(p.texto(".sector .num") == "26/64", "celu 2: Listo cuenta (26/64)")
    ok("Recién: Tarugos nylon S8" in p.texto(".ultimo"), "celu 2: «Recién» muestra el último")
    ok("Tornillo madera" in p.texto(".prod .n"), "celu 2: la cámara lee el próximo")
    p.tocar(".tecla >> nth=9"); p.esperar(1300)
    ok(p.texto(".sector .num") == "27/64", "celu 2: «No hay» pone cero y sigue")
    p.tocar(".ultimo")
    ok("Antes" in p.texto(".pantallita .antes"), "celu 2: tocar «Recién» lo corrige")
    p.tocar(".visor .pastilla"); p.tocar(".visor", 0); p.tocar(".visor", 0)
    ok("encendida" in pg.locator(".visor .pastilla").get_attribute("class"), "celu 2: Ráfaga se enciende")
    p.abre(".sig .btn-oscuro", "Buscar", cerrar="afuera")
    p.abre(".tope .redondo >> nth=1", "Lista del sector", cerrar="escape")
    p.abre(".tope .sector", "Elegí el sector", cerrar="afuera")
    p.tocar(".tope .sector"); p.tocar("[data-s='2']"); p.esperar(1200)
    ok(p.texto(".sector .num") == "0/37", "celu 2: abrir Electricidad")
    p.abre(".tope .redondo >> nth=0", "Salir", cerrar="boton")
    p.tocar(".tope .redondo >> nth=0"); p.tocar("[data-cierre]"); p.esperar()
    cierre_celu(p, "celu 2"); p.esperar()
    ok(p.capas() == 1, "celu 2: tras cerrar ofrece otro sector")
    p.pg.keyboard.press("Escape"); p.esperar()
    p.fin()


def celu3(ctx):
    p = Pagina(ctx, "celu/variante-3-una-por-una", True); pg = p.pg
    p.tocar(".rueda span >> nth=3")
    ok(p.texto(".rueda .c") == "15", "celu 3: tocar el número de al lado gira la rueda")
    p.abre(".rueda .c", "Tipear el número", cerrar="boton")
    p.tocar(".abajo .btn-accion"); p.esperar(500)
    ok("27 de 46" in p.texto(".arriba .tit span"), "celu 3: Listo cuenta (27 de 46)")
    ok("6 mm" in p.texto(".carta.frente .n"), "celu 3: sube la próxima tarjeta")
    # deslizar a la izquierda = no hay
    box = pg.locator(".carta.frente .n").bounding_box()
    pg.mouse.move(box["x"] + 150, box["y"]); pg.mouse.down(); pg.mouse.move(box["x"] - 30, box["y"], steps=6); pg.mouse.up(); p.esperar(500)
    ok("28 de 46" in p.texto(".arriba .tit span"), "celu 3: deslizar a la izquierda cuenta cero")
    p.abre(".mic", "Micrófono", cerrar="boton")
    p.tocar(".mic"); pg.wait_for_timeout(2400)
    ok(p.capas() == 0, "celu 3: el micrófono oye y cierra")
    p.abre(".arriba .btn >> nth=1", "Cámara", cerrar="boton")
    p.tocar(".arriba .btn >> nth=1"); pg.wait_for_timeout(1700)
    ok(p.capas() == 0, "celu 3: escanear trae el producto al frente")
    p.abre(".arriba .btn >> nth=0", "Salir", cerrar="escape")
    p.tocar(".arriba .btn >> nth=0"); p.tocar("[data-cierre]"); p.esperar()
    cierre_celu(p, "celu 3"); p.esperar()
    ok("quedó contado" in p.texto(".mazo"), "celu 3: al cerrar queda el sector contado")
    p.fin()


def celu4(ctx):
    p = Pagina(ctx, "celu/variante-4-cierre", True); pg = p.pg
    p.tocar(".difs .ver")
    ok(pg.locator(".difs .f").count() == 7, "celu 4: «Ver las 7 diferencias»")
    pg.locator(".velo").tap(position={"x": 20, "y": 20}); p.esperar()
    ok("sin-hoja" in pg.locator(".celu").get_attribute("class"), "celu 4: tocar afuera baja la hoja")
    p.tocar(".fondo-app")
    ok("sin-hoja" not in pg.locator(".celu").get_attribute("class"), "celu 4: tocar el fondo la sube")
    pg.keyboard.press("Escape"); p.esperar(); p.tocar(".fondo-app")
    p.tocar(".opciones .btn >> nth=1")
    ok(pg.locator(".cx-tilde").count() == 1, "celu 4: confirmar muestra el tilde")
    p.tocar("[data-listo]")
    ok("Contado hoy" in p.texto(".celu-estado"), "celu 4: queda contado hoy")
    p.fin()


def main():
    solo = sys.argv[1:] or ["compu1", "compu2", "compu3", "celu1", "celu2", "celu3", "celu4"]
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        compu = b.new_context(viewport={"width": 1366, "height": 768})
        celu = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
        for nombre in solo:
            print(nombre)
            globals()[nombre](compu if nombre.startswith("compu") else celu)
        b.close()
    print(f"\n{hechas} controles, {len(fallas)} fallas")
    for f in fallas:
        print(" -", f)
    sys.exit(1 if fallas else 0)


if __name__ == "__main__":
    main()

# Recorre las seis maquetas de Anomalías y toca cada control conectado.
# uso: uv run --with playwright==1.56.0 python herramientas/probar.py [compu-1 celu-2 ...] [--capturas DIR]
import os, sys
from playwright.sync_api import sync_playwright

A = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PANTALLAS = {"entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar",
             "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"}
VARIANTES = {"compu-1": "compu/variante-1-bandeja", "compu-2": "compu/variante-2-por-producto", "compu-3": "compu/variante-3-conciliacion",
             "celu-1": "celu/variante-1-tarjetas", "celu-2": "celu/variante-2-de-a-una", "celu-3": "celu/variante-3-a-contar"}
fallas = []
capturas = None


def ok(cond, msg):
    print(("  ok   " if cond else "  MAL  ") + msg)
    if not cond: fallas.append(msg)


def esperar(p, ms=450): p.wait_for_timeout(ms)


def abiertos(p): return p.locator(".velo").count()


def cerrar_de_tres_formas(p, abrir, nombre):
    """Abre con abrir() y cierra con su botón, tocando afuera y con Escape."""
    for modo in ("boton", "afuera", "escape"):
        abrir(); esperar(p)
        ok(abiertos(p) == 1, f"{nombre}: se abre ({modo})")
        if modo == "boton":
            b = p.locator(".hoja [data-cerrar], .dialogo [data-cerrar]").first
            if b.count(): b.click()
            else: p.keyboard.press("Escape")
        elif modo == "afuera": p.mouse.click(5, 5) if not p.locator(".celu").count() else p.locator(".velo").click(position={"x": 20, "y": 60})
        else: p.keyboard.press("Escape")
        esperar(p)
        ok(abiertos(p) == 0, f"{nombre}: se cierra ({modo})")


def tocar(p, sel, n=0):
    p.locator(sel).nth(n).click(); esperar(p)


def foto(p, nombre):
    if capturas: p.screenshot(path=os.path.join(capturas, nombre + ".png"))


def marco(p, celu):
    irs = p.eval_on_selector_all("[data-ir]", "els => els.map(e => e.getAttribute('data-ir'))")
    ok(len(irs) > 0 and all(i in PANTALLAS for i in irs), f"data-ir válidos: {sorted(set(irs))}")
    # Más abre su menú, con las cuatro pantallas
    cerrar_de_tres_formas(p, lambda: p.locator("[data-mas]").first.click(), "Más")
    p.locator("[data-mas]").first.click(); esperar(p)
    dentro = p.eval_on_selector_all(".menu-chico [data-ir], .hoja [data-ir]", "els => els.map(e => e.getAttribute('data-ir'))")
    ok(dentro == ["anomalias", "procesos", "mejoras-y-errores", "configuracion"], f"Más lista {dentro}")
    foto(p, "mas")
    p.keyboard.press("Escape"); esperar(p)


def navega(p, url, sel, destino):
    """Tocar un data-ir le pide al navegador de versiones (la página de afuera) ir a esa pantalla."""
    q = p.context.new_page()
    vp = p.viewport_size
    q.goto("file://" + os.path.join(A, "herramientas", "vacia.html"))
    q.evaluate("""([u, w, h]) => { window.pedido = null; addEventListener('message', e => { window.pedido = e.data; });
      const f = document.createElement('iframe'); f.src = u; f.style = `border:0;width:${w}px;height:${h}px`; document.body.style.margin = 0; document.body.appendChild(f); }""", [url, vp["width"], vp["height"]])
    q.wait_for_timeout(500)
    q.frame_locator("iframe").locator(sel).first.click(); q.wait_for_timeout(200)
    pedido = q.evaluate("window.pedido")
    ok(bool(pedido) and pedido.get("pantalla") == destino, f"{sel} lleva a {destino} ({pedido})")
    q.close()


# ---------------------------------------------------------------- computadora
def compu_1(p, url):
    marco(p, False)
    navega(p, url, ".nav-item[data-ir=vender]", "vender")
    navega(p, url, "[data-ir=actividad]", "actividad")
    t = lambda: p.locator(".detalle .det-cab .t-etiqueta").inner_text()
    tocar(p, ".item[data-id=a1]"); ok("Ajuste de Ana" in t(), "abrir el ajuste muestra su detalle")
    tocar(p, ".item[data-id=c1]"); ok(p.locator(".detalle [data-aceptar]").count() == 0, "el conteo de Julián solo deja descartar")
    tocar(p, ".item[data-id=v1]"); ok("Pinza" in p.locator(".detalle").inner_text(), "abrir la venta en efectivo muestra la pinza")
    p.keyboard.press("ArrowDown"); esperar(p); ok("2 de 5" in t(), "↓ pasa al siguiente")
    tocar(p, ".detalle [data-aceptar]")
    ok(p.locator(".item").count() == 4, "Aceptar saca el cambio de la lista")
    ok(p.locator("[data-r=cambios]").inner_text() == "4 cambios", "el resumen baja a 4 cambios")
    ok(p.locator(".nav-item [data-pendientes]").inner_text() == "4", "la insignia de Más baja a 4")
    ok(p.locator(".tostada").count() == 1, "sale la tostada")
    foto(p, "aceptado")
    p.locator(".tostada .deshacer").click(); esperar(p, 700)
    ok(p.locator(".item").count() == 5, "Deshacer lo devuelve")
    p.keyboard.press("d"); esperar(p, 600)
    ok(p.locator(".item").count() == 4 and "Descartado" in p.locator(".tostada").inner_text(), "D descarta")
    for _ in range(4):
        b = p.locator(".detalle [data-aceptar]")
        (b if b.count() else p.locator(".detalle [data-descartar]")).click(); esperar(p, 600)
    ok(p.locator(".item").count() == 0 and p.locator(".detalle .vacio").count() == 1, "sin pendientes queda «No queda nada»")
    ok(p.locator(".persona").count() == 0, "se van también las personas")
    foto(p, "vacio")
    p.goto(url); esperar(p, 300)
    tocar(p, "[data-tab=anotadas]")
    ok(p.locator('[data-vista=anotadas]').is_visible() and not p.locator('[data-vista=revisar]').is_visible(), "pestaña Anotadas cambia la vista")
    foto(p, "anotadas")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-prod=mecha] .an-t").click(), "detalle de la mecha")
    tocar(p, "[data-prod=mecha] [data-contar]"); ok(p.locator(".dialogo [data-guardar]").count() == 1, "Contar abre el conteo")
    tocar(p, ".dialogo [data-mas-uno]"); tocar(p, ".dialogo [data-guardar]")
    ok("hecho" in p.locator("[data-prod=mecha]").get_attribute("class"), "guardar el conteo tacha la mecha")
    ok(p.locator("[data-contados]").inner_text() == "3 de 6", "contados sube a 3 de 6")
    tocar(p, "[data-tab=revisar]"); ok(p.locator('[data-vista=revisar]').is_visible(), "vuelve a Para revisar")


def compu_2(p, url):
    marco(p, False)
    navega(p, url, "[data-ir=contar]", "contar")
    tocar(p, "[data-tab=revisar]")
    ok(p.locator('[data-vista=revisar]').is_visible(), "pestaña Para revisar cambia la vista")
    foto(p, "revisar")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-vista=revisar] .item").first.click(), "detalle de un cambio")
    n = p.locator("[data-vista=revisar] .item").count()
    p.locator("[data-vista=revisar] .item[data-id=v2]").click(); esperar(p)
    tocar(p, ".dialogo [data-aceptar]"); esperar(p, 300)
    ok(p.locator("[data-vista=revisar] .item").count() == n - 1, "Aceptar en el detalle lo saca de la lista")
    p.locator("[data-vista=revisar] .item").first.click(); esperar(p)
    tocar(p, ".dialogo [data-descartar]"); esperar(p, 300)
    ok(p.locator("[data-vista=revisar] .item").count() == n - 2, "Descartar lo saca de la lista")
    ok(p.locator(".nav-item [data-pendientes]").inner_text() == "3", "la insignia de Más baja a 3")
    tocar(p, "[data-tab=anotadas]")
    tocar(p, "[data-seg=orden]"); ok(p.locator("[data-lista=orden]").is_visible() and not p.locator("[data-lista=producto]").is_visible(), "En orden muestra el registro")
    foto(p, "en-orden")
    tocar(p, "[data-seg=producto]"); ok(p.locator("[data-lista=producto]").is_visible(), "Por producto vuelve")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-seg=periodo]").click(), "menú del período")
    tocar(p, "[data-seg=periodo]"); tocar(p, ".menu-chico [data-periodo='14']")
    ok("14 días" in p.locator("[data-seg=periodo]").inner_text(), "elegir el período cambia el rótulo")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-prod=puntas] .titulo").click(), "detalle de las puntas")
    tocar(p, "[data-prod=puntas] [data-contar]"); tocar(p, ".dialogo [data-guardar]")
    ok("hecho" in p.locator("[data-prod=puntas]").get_attribute("class"), "contar las puntas las tacha")
    ok("3" in p.locator("[data-contados]").inner_text(), "contados sube a 3")
    ok("3 que faltan" in p.locator("[data-ir=contar]").inner_text(), "el botón dice «Contar los 3 que faltan»")
    foto(p, "contado")
    cerrar_de_tres_formas(p, lambda: p.locator(".registro .ent").first.click(), "renglón del registro")


def compu_3(p, url):
    marco(p, False)
    navega(p, url, ".nav-item[data-ir=stock]", "stock")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-registro]").click(), "Vendido sin stock")
    filas = p.locator(".tabla .fila")
    filas.nth(3).locator(".seg3 span").nth(0).click(); esperar(p)
    ok("si" in filas.nth(3).locator(".seg3 span").nth(0).get_attribute("class"), "el selector del margen pasa a Aceptar")
    ok("4 decisiones" in p.locator(".panel .btn-accion").inner_text(), "el botón cuenta 4 decisiones")
    filas.nth(0).locator(".seg3 span").nth(2).click(); esperar(p)
    ok("480.000" not in p.locator(".imp").first.inner_text(), "el impacto se recalcula al dejar la venta para después")
    tocar(p, ".tabla .fila:nth-child(3) .t")
    ok("sel" in filas.nth(2).get_attribute("class"), "tocar una fila la elige")
    foto(p, "elegidas")
    tocar(p, ".panel .btn-accion"); esperar(p, 600)
    ok(p.locator(".tabla .fila").count() == 1, "Confirmar saca las decididas y deja la de después")
    ok(p.locator(".tostada").count() == 1, "sale la tostada de confirmado")
    ok(p.locator(".nav-item [data-pendientes]").inner_text() == "2", "la insignia de Más baja a 2")
    foto(p, "confirmado")
    tocar(p, ".sobre[data-sobre=julian]")
    ok("Julián" in p.locator(".tarde").inner_text(), "el sobre de Julián cambia la tarde")
    ok(p.locator(".tabla .fila .seg3 span").nth(0).get_attribute("aria-disabled") == "true", "a Julián no se le puede aceptar")
    foto(p, "julian")


# ---------------------------------------------------------------- celular
def celu_1(p, url):
    marco(p, True)
    navega(p, url, ".nav-inferior [data-ir=productos]", "productos")
    tocar(p, ".card[data-id=v1] .fila")
    ok(p.locator(".card[data-id=v1]").get_attribute("class").find("abierta") >= 0 and "Pinza" in p.locator(".card[data-id=v1]").inner_text(), "abrir la venta en efectivo muestra su detalle")
    ok(p.locator(".card.abierta").count() == 1, "se abre una por vez")
    tocar(p, ".card[data-id=v1] [data-aceptar]"); esperar(p, 300)
    ok(p.locator(".card").count() == 4, "Aceptar la saca")
    ok(p.locator(".celu-pestanas [data-pendientes]").inner_text() == "4", "la pestaña baja a 4")
    foto(p, "aceptada")
    tocar(p, ".card[data-id=a1] .fila"); tocar(p, ".card[data-id=a1] [data-descartar]"); esperar(p, 300)
    ok(p.locator(".card").count() == 3, "Descartar la saca")
    tocar(p, "[data-tab=anotadas]"); ok(p.locator("[data-vista=anotadas]").is_visible(), "pestaña Anotadas")
    foto(p, "anotadas")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-vista=anotadas] [data-prod]").first.click(), "detalle de un anotado")
    tocar(p, "[data-tab=revisar]"); ok(p.locator("[data-vista=revisar]").is_visible(), "vuelve a Para revisar")


def celu_2(p, url):
    marco(p, True)
    navega(p, url, ".nav-inferior [data-ir=resumen]", "resumen")
    prog = lambda: p.locator(".prog .tx b").inner_text()
    tocar(p, ".redondo.si"); esperar(p, 500)
    ok(prog() == "3 de 5" and "Ajuste" in p.locator(".ticket").first.inner_text(), "Aceptar pasa al ajuste (3 de 5)")
    ok(p.locator(".celu-pestanas [data-pendientes]").inner_text() == "3", "la pestaña baja a 3")
    # deslizar a la izquierda: descartar
    t = p.locator(".ticket").first.bounding_box()
    x, y = t["x"] + t["width"] / 2, t["y"] + t["height"] / 2
    p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x - 60, y, steps=4); p.mouse.move(x - 160, y, steps=6)
    foto(p, "deslizando")
    p.mouse.up(); esperar(p, 600)
    ok(prog() == "4 de 5", "deslizar a la izquierda descarta (4 de 5)")
    # soltar antes de la mitad vuelve
    p.mouse.move(x, y); p.mouse.down(); p.mouse.move(x + 40, y, steps=4); p.mouse.up(); esperar(p, 500)
    ok(prog() == "4 de 5", "soltar antes de la mitad vuelve a su lugar")
    tocar(p, ".redondo.luego"); esperar(p, 400)
    ok("Lámpara" in p.locator(".ticket").first.inner_text(), "Después pasa al conteo de Julián")
    ok(p.locator(".redondo.si").is_disabled(), "al de Julián no se lo puede aceptar")
    foto(p, "julian")
    tocar(p, ".redondo.no"); esperar(p, 500)
    tocar(p, ".redondo.si"); esperar(p, 600)
    ok(p.locator(".vacio").count() == 1, "al final queda «Listo»")
    foto(p, "listo")
    tocar(p, "[data-tab=anotadas]"); ok(p.locator("[data-vista=anotadas]").is_visible(), "pestaña Anotadas")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-vista=anotadas] [data-prod]").first.click(), "detalle de un anotado")


def celu_3(p, url):
    marco(p, True)
    navega(p, url, "[data-ir=contar]", "contar")
    cerrar_de_tres_formas(p, lambda: p.locator(".sobre .ver").click(), "sobre de Ana")
    tocar(p, ".sobre .ver")
    foto(p, "sobre")
    tocar(p, ".hoja [data-id=v1] [data-aceptar]"); esperar(p, 300)
    ok(p.locator(".hoja [data-id]").count() == 3, "Aceptar en el sobre lo saca")
    ok(p.locator(".sobre .n").inner_text() == "3", "el sobre baja a 3")
    p.keyboard.press("Escape"); esperar(p)
    cerrar_de_tres_formas(p, lambda: p.locator(".otro[data-sobre=julian]").click(), "sobre de Julián")
    tocar(p, ".otro[data-sobre=julian]"); ok(p.locator(".hoja [data-aceptar]").count() == 0, "a Julián solo se le puede descartar")
    tocar(p, ".hoja [data-descartar]"); esperar(p, 500)
    ok(p.locator(".otro[data-sobre=julian]").count() == 0, "descartar lo de Julián saca su sobre")
    cerrar_de_tres_formas(p, lambda: p.locator(".gt").first.click(), "contar la mecha")
    tocar(p, ".gt"); tocar(p, ".hoja [data-guardar]")
    ok(p.locator(".gt.ok").count() == 1 and "3/6" in p.locator(".anillo").inner_html(), "contar avanza el anillo a 3/6")
    ok("Contar estos 3" in p.locator(".barra-accion").inner_text(), "la acción dice «Contar estos 3»")
    foto(p, "contado")
    cerrar_de_tres_formas(p, lambda: p.locator("[data-registro]").click(), "registro")


def main():
    global capturas
    args = sys.argv[1:]
    if "--capturas" in args:
        i = args.index("--capturas"); capturas = args[i + 1]; del args[i:i + 2]; os.makedirs(capturas, exist_ok=True)
    elegidas = args or list(VARIANTES)
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
        for clave in elegidas:
            celu = clave.startswith("celu")
            ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True) if celu else b.new_context(viewport={"width": 1366, "height": 768})
            p = ctx.new_page()
            errores = []
            p.on("pageerror", lambda e: errores.append(str(e)))
            p.on("console", lambda m: m.type == "error" and errores.append(m.text))
            url = "file://" + os.path.join(A, VARIANTES[clave], "index.html")
            print(f"\n{clave}  {VARIANTES[clave]}")
            p.goto(url); esperar(p, 300)
            global foto
            base = foto
            foto = (lambda pp, n, c=clave: base(pp, c + "-" + n))
            try:
                globals()[clave.replace("-", "_")](p, url)
            except Exception as e:
                ok(False, f"se cortó: {e}")
            foto = base
            ok(not errores, "sin errores de JavaScript" + ("" if not errores else ": " + " | ".join(errores)))
            ctx.close()
        b.close()
    print("\n" + ("Todo bien." if not fallas else f"{len(fallas)} fallas:\n- " + "\n- ".join(fallas)))
    sys.exit(1 if fallas else 0)


main()

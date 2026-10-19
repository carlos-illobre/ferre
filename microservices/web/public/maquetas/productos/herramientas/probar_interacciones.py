"""Recorre las seis maquetas de Productos tocando lo que se conectó.

uv run --with playwright==1.56.0 python probar_interacciones.py [filtro] [--reducir]

Por variante: ningún error de JavaScript, cada data-ir con una pantalla válida, cada diálogo u
hoja abre y se cierra (con su botón, tocando afuera y con Escape) y lo que agrega cambia lo que
se ve. Termina con 0 si todo anduvo.
"""
import pathlib
import sys

from playwright.sync_api import sync_playwright

AQUI = pathlib.Path(__file__).resolve().parent.parent
PANTALLAS = {"entrar", "vender", "ventas-de-hoy", "productos", "listas", "duplicados", "stock", "compras", "contar",
             "resumen", "usuarios", "actividad", "anomalias", "procesos", "mejoras-y-errores", "configuracion"}
CAPA = ".mq-panel"


def c(sel):
    return ("click", sel)


def k(tecla):
    return ("key", tecla)


ABRE_CIERRA = "abre_cierra"   # (ABRE_CIERRA, selector que abre, cómo se cierra: boton | afuera | escape)
TEXTO = "texto"               # (TEXTO, selector, texto que tiene que aparecer)
NO_TEXTO = "no_texto"
CUENTA = "cuenta"             # (CUENTA, selector, cantidad)
ESPERA = "espera"


def abre(sel, como="escape", boton="[data-cerrar]"):
    return (ABRE_CIERRA, sel, como, boton)


CASOS = {
    "compu/variante-1-lado-a-lado/index.html": ("compu", [
        abre('[data-mq="mas"]', "afuera"), abre('[data-mq="mas"]', "escape"),
        abre('[data-mq="persona"]', "escape"), abre('[data-mq="espejo"]', "boton"),
        c('.fila[data-id="mecha"]'), (TEXTO, ".titulo-ficha", "Mecha acero"), (TEXTO, ".precio-fila .t-numero", "7.000"),
        k("ArrowDown"), (TEXTO, ".titulo-ficha", "Martillo"), k("ArrowUp"), k("ArrowUp"), (TEXTO, ".titulo-ficha", "Cinta"),
        c('.seg-margen [data-margen="100"]'), (TEXTO, ".precio-fila .t-numero", "23.000"), (TEXTO, '.fila[data-id="cinta"] .precio', "23.000"),
        k("Shift+Digit4"), (TEXTO, ".precio-fila .t-numero", "17.000"),
        abre('.seg-margen [data-margen="otro"]', "boton"),
        c('.seg-margen [data-margen="otro"]'), ("fill", ".mq-campo-margen input", "40"), c('[data-mq="aplicar"]'), (TEXTO, ".precio-fila .t-numero", "16.000"), (TEXTO, ".seg-margen", "40 %"),
        c('.seg-margen [data-margen="50"]'),
        c('[data-usar="B"]'), (TEXTO, ".prov .c", "9.980"), (TEXTO, ".precio-fila .t-numero", "19.000"), c('[data-usar="O"]'),
        (TEXTO, "[data-venta-insignia]", "3"), c('.fila[data-id="pinza"] .agregar'), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"), (TEXTO, ".mq-tostadas", "Pinza"),
        c(".mq-deshacer"), (TEXTO, "[data-venta-insignia]", "3"),
        k("+"), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"),
        abre(".fotazo img", "afuera"), abre('[data-mq="cambiar-foto"]', "escape"),
        c('[data-mq="cambiar-foto"]'), c('[data-mq="elegir"]'), (ESPERA, 500), (TEXTO, ".mq-tostadas", "Foto actualizada"),
        c('[data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "Código copiado"),
        abre('[data-mq="escanear-codigo"]', "boton"),
        c('[data-mq="escanear-codigo"]'), (ESPERA, 2600), (TEXTO, ".lectura", "Código actualizado"),
        c('[data-mq="escanear-buscar"]'), (ESPERA, 2600), (TEXTO, ".titulo-ficha", "Llave combinada"),
        abre('[data-mq="historial"]', "escape"), c('[data-mq="descargar"]'), (TEXTO, ".mq-tostadas", "Descargando"),
        c('[data-mq="plegar-cuenta"]'), c('[data-mq="plegar-cuenta"]'), c('[data-mq="listo"]'),
        c('[data-filtro="sinprecio"]'), (CUENTA, ".fila", 3), (TEXTO, ".titulo-ficha", "Tarugos"), c('[data-filtro="sinprecio"]'),
        c('[data-filtro="remarcar"]'), (TEXTO, ".cuenta", "Para remarcar"), c('[data-filtro="todos"]'), (CUENTA, ".fila", 7),
        abre('[data-mq="filtros"]', "escape"), c('[data-mq="filtros"]'), c('[data-f="marca:Bahco"]'), (CUENTA, ".fila", 2),
        c('[data-mq="filtros"]'), c('[data-f="todos"]'),
        c(".busca .campo"), ("type", ".busca .campo input", "látex"), (CUENTA, ".fila", 1), (TEXTO, ".titulo-ficha", "Látex"),
        ("fill", ".busca .campo input", "zzz"), (TEXTO, ".filas", "No hay productos"), ("fill", ".busca .campo input", ""), (CUENTA, ".fila", 7),
    ]),
    "compu/variante-2-bandeja/index.html": ("compu", [
        abre('[data-mq="mas"]', "escape"), abre('[data-mq="persona"]', "afuera"), abre('[data-mq="espejo"]', "boton"),
        c('.item[data-id="llave"]'), (TEXTO, ".nombre", "Llave combinada"), (TEXTO, ".porque", "subió el costo 9 %"),
        k("j"), (TEXTO, ".nombre", "Pinza"), k("k"), k("k"), (TEXTO, ".nombre", "Cinta"),
        c('[data-margen="25"]'), (TEXTO, ".salto .t-numero", "15.000"), (TEXTO, ".chip-ok", "cambiado"), k("Shift+Digit4"), (TEXTO, ".salto .t-numero", "17.000"),
        c('.pbar[data-usar="B"]'), (TEXTO, ".salto .t-numero", "19.000"), c('.pbar[data-usar="O"]'),
        (TEXTO, ".bandeja-cab", "18 de 46"), c('[data-mq="siguiente"]'), (TEXTO, ".bandeja-cab", "19 de 46"), (CUENTA, ".item.hecho", 3), (TEXTO, ".nombre", "Llave"),
        k("e"), (TEXTO, ".bandeja-cab", "20 de 46"), (TEXTO, ".nombre", "Pinza"),
        c('[data-mq="agregar"]'), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"), k("+"), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"), k("p"), (TEXTO, ".mq-tostadas", "impresora"),
        abre('.cabeza .foto', "boton"), c('[data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "copiado"), c('[data-mq="descargar"]'), (TEXTO, ".mq-tostadas", "Descargando"),
        c('[data-cola="sinprecio"]'), (CUENTA, ".item", 3), (TEXTO, ".nombre", "Tarugos"), (TEXTO, ".salto .t-numero", "Sin precio"),
        c('[data-mq="siguiente"]'), (TEXTO, ".mq-tostadas", "Elegí el margen"), k("Shift+Digit4"), (TEXTO, ".salto .t-numero", "8.000"), k("e"), (TEXTO, ".bandeja-cab", "1 de 28"),
        c('[data-cola="sincodigo"]'), (TEXTO, ".cabeza", "Sin código"), abre('[data-mq="siguiente"]', "escape"),
        c('[data-mq="siguiente"]'), (ESPERA, 2600), (TEXTO, ".bandeja-cab", "1 de 1.204"),
        c('[data-cola="costoviejo"]'), (TEXTO, ".porque", "más de 60 días"), c('[data-cola="todos"]'), (CUENTA, ".item", 13),
        c(".cabecera .campo"), ("type", ".cabecera .campo input", "pinza"), (CUENTA, ".item", 1), (TEXTO, ".nombre", "Pinza"), ("fill", ".cabecera .campo input", ""),
        c('[data-mq="escanear"]'), (ESPERA, 2600), (TEXTO, ".nombre", "Llave"),
        c('[data-cola="remarcar"]'), (TEXTO, ".bandeja-cab", "20 de 46"),
    ]),
    "compu/variante-3-planilla/index.html": ("compu", [
        abre('[data-mq="ir"]', "escape"), abre('[data-mq="persona"]', "escape"), abre('[data-mq="espejo"]', "boton"),
        k("Control+k"), ("type", ".mq-panel input", "stock"), ("js", "() => { const b=[...document.querySelectorAll('.mq-panel [data-ir]')].filter(b=>b.style.display!=='none'); if (b.length!==1 || b[0].dataset.ir!=='stock') throw new Error('Ctrl K no filtra'); }"), k("Escape"),
        c('tr[data-id="mecha"] .prod'), (TEXTO, ".rapida .nom", "Mecha"), (TEXTO, ".rapida .t-total", "7.000"),
        c('tr[data-id="mecha"] td.c[data-k="B"]'), (TEXTO, ".rapida .cuentita", "Bulonera"), (TEXTO, 'tr[data-id="mecha"]', "más barato") if False else (NO_TEXTO, 'tr[data-id="mecha"]', "más barato"),
        k("ArrowLeft"), k("u"), (TEXTO, ".rapida .cuentita", "Oeste"),
        k(" "), (ESPERA, 250), c('tr[data-id="mecha"] [data-margen="50"]'), k(" "), (TEXTO, 'tr[data-id="mecha"] .pr', "5.000"), (TEXTO, ".rapida .t-total", "5.000"),
        k("ArrowDown"), (TEXTO, ".rapida .nom", "Martillo"), k(" "), ("js", "() => new Promise(r=>setTimeout(r,300))"), ("js", "() => { if (getComputedStyle(document.querySelector('.rapida')).display!=='none') throw new Error('no cerró'); }"),
        k(" "), ("visible", ".rapida"), c("thead th"), ("js", "() => new Promise(r=>setTimeout(r,300))"), ("js", "() => { if (getComputedStyle(document.querySelector('.rapida')).display!=='none') throw new Error('afuera no cerró'); }"),
        k(" "), c('[data-mq="cerrar-rapida"]'), (ESPERA, 300), k(" "), k("Escape"), (ESPERA, 300), k(" "),
        k("Shift+Digit1"), (TEXTO, ".rapida .t-total", "77.000"),
        k("+"), (ESPERA, 600), (TEXTO, "[data-venta-chip]", "Venta: 4 · $122.500"),
        abre('[data-mq="ampliar"]', "afuera"), abre('[data-mq="cambiar-foto"]', "boton"), c('[data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "copiado"), c('[data-mq="descargar"]'), (TEXTO, ".mq-tostadas", "Descargando"),
        c('[data-mq="cambiar-foto"]'), c('[data-mq="sacar"]'), (ESPERA, 300), c('[data-mq="ya"]'), (ESPERA, 1000), (TEXTO, ".mq-tostadas", "Foto actualizada"),
        k("Enter"), ("visible", ".mq-dialogo .mq-ficha"), c('.mq-ficha [data-margen="100"]'), (TEXTO, ".mq-ficha", "Se cobra"), k("Escape"), (TEXTO, 'tr[data-id="martillo"] .pr', "39.000"),
        c('[data-chip="barato"]'), ("js", "() => { const v=[...document.querySelectorAll('tbody tr')].filter(t=>t.style.display!=='none').map(t=>t.dataset.id); if (v.join()!=='mecha') throw new Error(v.join()); }"),
        c('[data-chip="constock"]'), ("js", "() => { if (document.querySelector('tr[data-id=puntas]').style.display!=='none') throw new Error('puntas'); }"),
        c('[data-chip="marca"]'), c('[data-marca="Bahco"]'), ("js", "() => { const v=[...document.querySelectorAll('tbody tr')].filter(t=>t.style.display!=='none').map(t=>t.dataset.id); if (v.join()!=='martillo,llave') throw new Error(v.join()); }"),
        c('[data-chip="marca"]'), c('[data-marca="Todas"]'), c('[data-chip="todos"]'),
        c(".cab .campo"), ("type", ".cab .campo input", "látex"), (TEXTO, ".rapida .nom", "Látex"), ("fill", ".cab .campo input", ""),
    ]),
    "celu/variante-1-ficha/lista.html": ("celu", [
        abre('[data-mq="mas"]', "afuera"), abre('[data-mq="mas"]', "escape"), abre('[data-mq="espejo"]', "boton"), abre('[data-mq="filtros"]', "boton"),
        (TEXTO, '.prod[data-id="mecha"] .agregar', "Lleva 2"), c('.prod[data-id="cinta"] .agregar'), (TEXTO, '.prod[data-id="cinta"] .agregar', "Lleva 1"), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"),
        ("js", "() => { if (document.querySelector('[data-tostada-quieta]')) throw new Error('quedó la tostada quieta'); }"),
        c(".mq-deshacer"), (TEXTO, '.prod[data-id="cinta"] .agregar', "Agregar"), (TEXTO, "[data-venta-insignia]", "3"),
        c('[data-filtro="sinprecio"]'), (CUENTA, ".prod", 3), c('[data-filtro="sinprecio"]'), (CUENTA, ".prod", 5),
        c('[data-mq="filtros"]'), c('[data-f="Bahco"]'), c('[data-mq="aplicar"]'), (CUENTA, ".prod", 2), c('[data-mq="filtros"]'), c('[data-mq="quitar"]'), (CUENTA, ".prod", 5),
        c(".busca .campo"), ("type", ".busca .campo input", "látex"), (CUENTA, ".prod", 1), ("fill", ".busca .campo input", ""),
        abre('[data-mq="escanear"]', "boton"),
        c('.prod[data-id="mecha"] .n'), (ESPERA, 900), (TEXTO, ".nombre", "Mecha acero"), (TEXTO, ".precio-linea", "7.000"), (TEXTO, "[data-venta-insignia]", "3"),
        c('[data-mq="volver"]'), (ESPERA, 900), (TEXTO, ".celu-pestanas", "Duplicados"),
        c('[data-mq="escanear"]'), (ESPERA, 3000), (TEXTO, ".nombre", "Llave combinada"),
    ]),
    "celu/variante-1-ficha/index.html": ("celu", [
        abre('[data-mq="mas"]', "afuera"), abre('[data-mq="espejo"]', "escape"), abre('[data-mq="ampliar"]', "boton"), abre('[data-mq="cambiar-foto"]', "afuera"),
        c('[data-mq="cuenta"]'), c('[data-margen="100"]'), (TEXTO, ".precio-linea .t-numero", "23.000"), (TEXTO, ".precio-linea .mg", "margen 100 %"), (TEXTO, ".paso-c.cobra", "23.000"),
        c('[data-margen="otro"]'), ("fill", ".mq-campo-margen input", "40"), c('[data-mq="aplicar"]'), (TEXTO, ".precio-linea .t-numero", "16.000"), (TEXTO, '[data-margen="otro"]', "40 %"),
        c('[data-margen="50"]'), c('[data-mq="cuenta"]'),
        c('[data-mq="provs"]'), (CUENTA, "[data-otro]", 2), c('[data-usar="B"]'), (TEXTO, ".prov .n", "Bulonera"), (TEXTO, ".precio-linea .t-numero", "19.000"), c('[data-usar="O"]'), c('[data-mq="provs"]'), (CUENTA, "[data-otro]", 0),
        c('[data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "copiado"),
        c('[data-mq="escanear"]'), (ESPERA, 2600), (TEXTO, ".lectura", "Código actualizado"),
        c('[data-mq="cambiar-foto"]'), c('[data-mq="sacar"]'), (ESPERA, 400), c('[data-mq="disparo"]'), (ESPERA, 1000), (TEXTO, ".mq-tostadas", "Foto actualizada"),
        c('[data-mq="agregar"]'), (ESPERA, 600), (TEXTO, "[data-venta-insignia]", "4"),
        c('.barra-accion [data-mq="volver"]'), (ESPERA, 900), (TEXTO, '.prod[data-id="cinta"] .agregar', "Lleva 1"), (TEXTO, "[data-venta-insignia]", "4"),
    ]),
    "celu/variante-2-apunta/index.html": ("celu", [
        c(".camara .marco"), (ESPERA, 500), (TEXTO, ".quien .n", "Mecha acero"), (TEXTO, ".precio-g", "7.000"), (TEXTO, ".recientes", "Cinta"),
        c(".camara .leyenda"), (ESPERA, 500), (TEXTO, ".quien .n", "Martillo"), (TEXTO, ".resp", "2 un."),
        c('.reciente[data-id="cinta"]'), (ESPERA, 400), (TEXTO, ".quien .n", "Cinta"), (TEXTO, ".etiq", "7897065211580"),
        abre('.hoja [data-mq="ficha"]', "afuera"), abre('.quien [data-mq="ficha"]', "escape"), abre('[data-mq="ampliar"]', "boton"),
        c('.acc [data-mq="ficha"]'), c('.mq-ficha [data-margen="100"]'), (TEXTO, ".mq-ficha", "23.000"), k("Escape"), (ESPERA, 300), (TEXTO, ".precio-g .t-total", "23.000"), (TEXTO, ".precio-g", "margen 100 %"),
        c('.acc [data-mq="ficha"]'), c('.mq-ficha [data-margen="50"]'), c('[data-mq="agregar-ficha"]'), (TEXTO, ".mq-tostadas", "Agregado"),
        c('[data-mq="agregar"]'), (TEXTO, ".mq-tostadas", "Cinta"), c(".mq-deshacer"),
        c('[data-modo="codigo"]'), (TEXTO, ".leyenda", "código de barras"), c(".camara .marco"), (ESPERA, 500), (TEXTO, ".mq-tostadas", "Leído"),
        c('[data-modo="foto"]'), ("visible", '[data-mq="disparo"]'), c('[data-mq="disparo"]'), (TEXTO, ".mq-tostadas", "Foto guardada"),
        c('[data-modo="consultar"]'), (ESPERA, 400), c('[data-mq="linterna"]'), c('[data-mq="linterna"]'),
    ]),
    "celu/variante-3-etiqueta/index.html": ("celu", [
        c('[data-mq="siguiente"]'), (ESPERA, 600), (TEXTO, ".carta.frente .nom", "Tylon"), (TEXTO, ".busq .cuenta", "2 de 7"), (TEXTO, ".carta.frente .precio", "8.000"),
        ("js", """async () => { const c=document.querySelector('.carta.frente'), r=c.getBoundingClientRect(), y=r.top+300, x=r.left+r.width/2;
            const ev=(t,cx)=>c.dispatchEvent(new PointerEvent(t,{clientX:cx,clientY:y,pointerId:1,bubbles:true,isPrimary:true}));
            ev('pointerdown',x); for (let i=1;i<=6;i++){ ev('pointermove',x-i*25); await new Promise(r=>setTimeout(r,16)); } ev('pointerup',x-150); }"""),
        (ESPERA, 700), (TEXTO, ".busq .cuenta", "3 de 7"), (TEXTO, ".carta.frente .nom", "Global"),
        c('[data-mq="anterior"]'), (ESPERA, 600), c('[data-mq="anterior"]'), (ESPERA, 600), (TEXTO, ".carta.frente .nom", "PowerLock"),
        c('[data-mq="girar"]'), (ESPERA, 500), (TEXTO, ".carta.dorso", "Lo que el cliente no ve"), (TEXTO, ".ayuda", "vuelve sola"),
        c('.carta.dorso [data-margen="100"]'), (TEXTO, '.carta.dorso [data-mq="total"]', "23.000"), (TEXTO, ".carta.frente .precio", "23.000"),
        c('.carta.dorso [data-margen="otro"]'), ("fill", ".mq-campo-margen input", "40"), c('[data-mq="aplicar"]'), (TEXTO, '.carta.dorso [data-mq="total"]', "16.000"), c('.carta.dorso [data-margen="50"]'),
        c('.carta.dorso [data-usar]'), (TEXTO, ".carta.dorso .prov", "Bulonera"), (TEXTO, ".carta.frente .precio", "19.000"), c('.carta.dorso [data-usar]'),
        c('.carta.dorso [data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "copiado"), abre('.carta.dorso [data-mq="historial"]', "boton"), c('.carta.dorso [data-mq="descargar"]'), (TEXTO, ".mq-tostadas", "Descargando"),
        abre('[data-mq="foto"]', "afuera"),
        c('[data-mq="girar"]'), (ESPERA, 500), (TEXTO, ".ayuda", "Deslizá"),
        ("js", """async () => { const c=document.querySelector('.carta.frente'), r=c.getBoundingClientRect(), x=r.left+150, y=r.top+300;
            for (let k=0;k<2;k++){ c.dispatchEvent(new PointerEvent('pointerdown',{clientX:x,clientY:y,pointerId:1,bubbles:true})); c.dispatchEvent(new PointerEvent('pointerup',{clientX:x,clientY:y,pointerId:1,bubbles:true})); await new Promise(r=>setTimeout(r,90)); } }"""),
        (ESPERA, 500), (TEXTO, ".ayuda", "vuelve sola"), k("Enter"), (ESPERA, 500), (TEXTO, ".ayuda", "Deslizá"),
        abre('[data-mq="compartir"]', "afuera"), c('[data-mq="compartir"]'), c('[data-mq="enviar"]'), (TEXTO, ".mq-tostadas", "lista para mandar"),
        c('[data-mq="agregar"]'), (TEXTO, ".mq-tostadas", "Agregado"),
        abre('[data-mq="buscar"]', "escape"), c('[data-mq="buscar"]'), ("fill", ".mq-panel input", "martillo"), c('.mq-panel [data-id="martillo"]'), (ESPERA, 400), (TEXTO, ".carta.frente .nom", "Martillo"), (TEXTO, ".busq", "1 de 1"),
        c('[data-mq="buscar"]'), ("fill", ".mq-panel input", "cinta"), c('.mq-panel [data-id="cinta"]'), (ESPERA, 400), (TEXTO, ".busq", "1 de 7"),
        c('[data-mq="escanear"]'), (ESPERA, 2800), (TEXTO, ".busq .cuenta", "3 de 7"),
    ]),
    "celu/variante-3-etiqueta/dorso.html": ("celu", [
        c('[data-margen="100"]'), (TEXTO, ".paso.total", "23.000"), c('[data-margen="50"]'), (TEXTO, ".paso.total", "17.000"),
        c('[data-mq="usar"]'), (TEXTO, ".prov", "Bulonera"), c('[data-mq="usar"]'),
        c('[data-mq="copiar"]'), (TEXTO, ".mq-tostadas", "copiado"), abre('[data-mq="historial"]', "escape"), abre('[data-mq="foto"]', "boton"),
        c('[data-mq="agregar"]'), (TEXTO, ".mq-tostadas", "Agregado"),
        c('[data-mq="girar"]'), (ESPERA, 600), (TEXTO, ".ayuda", "Deslizá"),
    ]),
}


def probar(pw, ruta, disp, pasos, movimiento="no-preference"):
    navegador = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium")
    if disp == "compu":
        ctx = navegador.new_context(viewport={"width": 1366, "height": 768}, reduced_motion=movimiento)
    else:
        ctx = navegador.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, reduced_motion=movimiento)
    page = ctx.new_page()
    errores = []
    page.on("pageerror", lambda e: errores.append("pageerror: %s" % (e.stack or e)))
    page.on("console", lambda m: errores.append("console: %s" % m.text) if m.type == "error" else None)
    page.goto((AQUI / ruta).as_uri())
    page.wait_for_timeout(300)
    fallas = []
    destinos = page.eval_on_selector_all("[data-ir]", "els => els.map(e => e.getAttribute('data-ir'))")
    malos = [d for d in destinos if d not in PANTALLAS]
    if malos:
        fallas.append("data-ir inválidos: %s" % malos)
    for n, paso in enumerate(pasos):
        try:
            tipo = paso[0]
            if tipo == "click":
                page.locator(paso[1]).first.click(timeout=3000)
                page.wait_for_timeout(260)
            elif tipo == "tap":
                page.locator(paso[1]).first.tap(timeout=3000)
                page.wait_for_timeout(260)
            elif tipo == "key":
                page.keyboard.press(paso[1])
                page.wait_for_timeout(260)
            elif tipo == "fill":
                page.locator(paso[1]).first.fill(paso[2])
                page.wait_for_timeout(200)
            elif tipo == "type":
                page.locator(paso[1]).first.press_sequentially(paso[2])
                page.wait_for_timeout(200)
            elif tipo == ESPERA:
                page.wait_for_timeout(paso[1])
            elif tipo == "js":
                page.evaluate(paso[1])
                page.wait_for_timeout(200)
            elif tipo == TEXTO:
                page.wait_for_function("([s,t]) => { const e = document.querySelector(s); return e && e.textContent.includes(t); }", arg=[paso[1], paso[2]], timeout=2500)
            elif tipo == NO_TEXTO:
                page.wait_for_function("([s,t]) => { const e = document.querySelector(s); return !e || !e.textContent.includes(t); }", arg=[paso[1], paso[2]], timeout=2500)
            elif tipo == CUENTA:
                page.wait_for_function("([s,n]) => document.querySelectorAll(s).length === n", arg=[paso[1], paso[2]], timeout=2500)
            elif tipo == "visible":
                page.locator(paso[1]).first.wait_for(state="visible", timeout=2500)
            elif tipo == ABRE_CIERRA:
                _, sel, como, boton = paso
                page.locator(sel).first.click(timeout=3000)
                page.locator(CAPA).last.wait_for(state="visible", timeout=2000)
                page.wait_for_timeout(350)
                if como == "escape":
                    page.keyboard.press("Escape")
                elif como == "afuera":
                    page.mouse.click(4, 760 if disp == "compu" else 120) if disp == "compu" else page.locator(".mq-fondo").last.click(position={"x": 8, "y": 60}, force=True)
                else:
                    page.locator(CAPA).last.locator(boton).first.click()
                page.wait_for_function("() => !document.querySelector('.mq-panel')", timeout=2000)
                page.wait_for_timeout(100)
            else:
                raise ValueError("paso desconocido %r" % (paso,))
        except Exception as e:  # noqa: BLE001
            fallas.append("paso %d %r: %s" % (n, paso, str(e).splitlines()[0]))
            page.evaluate("() => window.Maq && Maq.cerrarTodo()")
    navegador.close()
    return fallas + errores


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    filtro = args[0] if args else ""
    movimiento = "reduce" if "--reducir" in sys.argv else "no-preference"
    malas = 0
    with sync_playwright() as pw:
        for ruta, (disp, pasos) in CASOS.items():
            if filtro not in ruta:
                continue
            fallas = probar(pw, ruta, disp, pasos, movimiento)
            print(("OK   " if not fallas else "FALLA") + " " + ruta + " (%d pasos)" % len(pasos))
            for f in fallas:
                print("      " + f)
            malas += bool(fallas)
    sys.exit(1 if malas else 0)


if __name__ == "__main__":
    main()

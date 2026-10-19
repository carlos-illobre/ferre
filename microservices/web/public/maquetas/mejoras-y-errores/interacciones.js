/* Mejoras y errores: piezas para que la maqueta se pueda tocar. Lo usan las seis variantes;
   lo propio de cada una está al pie de su index.html. Nada de esto es la lógica de verdad:
   muestra lo que pasaría. Las rutas de las imágenes son relativas a la variante. */
(function () {
  var IMG = "../../imagenes/", FOTO = "../../../_comun/fotos/";
  var esCelu = function () { return !!document.querySelector(".celu"); };
  var raiz = function () { return document.querySelector(".celu") || document.body; };

  // ---------------- Datos de la historia (los mismos en todas) ----------------
  var TICKETS = [
    { id: "t1", tipo: "error", texto: "Los tarugos nylon S8 me salen sin precio aunque Fischer mandó la lista nueva ayer",
      autor: "Rosa Benítez", corto: "Rosa", ini: "RB", cuando: "hace 12 min", hora: "Hoy 10:30", disp: "Samsung A15", version: "5.3.2", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [{ src: IMG + "cap-vender-celu.webp", pos: "50% 54%", marcada: true }, { src: FOTO + "tarugos.webp", producto: true }],
      charla: [{ ini: "RB", quien: "Rosa", hora: "lo abrió desde el celular", texto: "La caja dice $4.150 de costo. Saqué foto de la etiqueta." },
               { ini: "MG", quien: "Martín", hora: "10:52", texto: "Me pasó lo mismo con los S10." }],
      tambien: ["Julián", "Martín"], estado: "abierto" },
    { id: "t2", tipo: "idea", texto: "Al cobrar con Mercado Pago, que el QR salga grande para girar el monitor hacia el cliente",
      autor: "Martín Godoy", corto: "Martín", ini: "MG", cuando: "hoy 9:40", hora: "Hoy 9:40", disp: "Compu del mostrador", version: "5.3.2", pantalla: "Vender · cobro", icoPantalla: "shopping-cart",
      fotos: [{ src: IMG + "cap-compu-cobro.webp" }],
      charla: [{ ini: "MG", quien: "Martín", hora: "lo abrió desde la compu", texto: "El cliente no llega a ver el QR chiquito y me pide que gire la pantalla." },
               { ini: "CI", quien: "Carlos", hora: "10:05", texto: "Buena. ¿Te sirve que ocupe toda la pantalla hasta que pague?" }],
      tambien: [], estado: "abierto" },
    { id: "t3", tipo: "error", texto: "En el celular, el botón Cobrar queda tapado por el teclado cuando busco un producto", mio: true,
      autor: "Carlos Illobre", corto: "Vos", ini: "CI", cuando: "ayer 18:05", hora: "Ayer 18:05", disp: "Moto G54", version: "5.3.2", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [{ src: IMG + "cap-vender-celu.webp", pos: "50% 90%" }, { src: IMG + "cap-celu-cobrar.webp" }, { src: IMG + "cap-celu-camara.webp" }],
      charla: [{ ini: "CI", quien: "Carlos", hora: "lo abrió desde el celular", texto: "Pasa con el teclado de Samsung y con el de Google." }],
      tambien: ["Rosa"], estado: "abierto" },
    { id: "t4", tipo: "idea", texto: "Poder vender por metro la cadena y la soga, no solo por unidad",
      autor: "Julián Ferraro", corto: "Julián", ini: "JF", cuando: "ayer 11:20", hora: "Ayer 11:20", disp: "Compu del depósito", version: "5.3.2", pantalla: "Productos", icoPantalla: "tags",
      fotos: [], charla: [{ ini: "JF", quien: "Julián", hora: "lo abrió desde la compu", texto: "La cadena de 6 mm la piden por metro y hoy la cargo como 1 un. por metro." }],
      tambien: [], estado: "abierto" },
    { id: "t5", tipo: "error", texto: "Al contar el depósito, la balanza no toma los kilos de los clavos",
      autor: "Rosa Benítez", corto: "Rosa", ini: "RB", cuando: "lunes 16:10", hora: "Lunes 16:10", disp: "Samsung A15", version: "5.3.1", pantalla: "Contar", icoPantalla: "package", dias: 8,
      fotos: [{ src: FOTO + "clavos.webp", producto: true }],
      charla: [{ ini: "RB", quien: "Rosa", hora: "lo abrió desde el celular", texto: "Pongo la bolsa de clavos 2\" y queda en 0 kg." }],
      tambien: [], estado: "abierto" },
    { id: "r1", tipo: "error", texto: "El total no rodaba con 0,7 kg de clavos en la venta",
      autor: "Rosa Benítez", corto: "Rosa", ini: "RB", cuando: "hace 3 días", hora: "Jueves 12:15", disp: "Samsung A15", version: "5.3.0", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [{ src: IMG + "cap-celu-cobrar.webp" }], charla: [], tambien: [], estado: "resuelto", nota: "Arreglado en la 5.3.1.", resolvio: "Carlos", cuandoRes: "hoy 10:30" },
    { id: "r2", tipo: "idea", texto: "Que buscar «tornillo» encuentre también «tornillos»",
      autor: "Martín Godoy", corto: "Martín", ini: "MG", cuando: "hace 6 días", hora: "Lunes 9:10", disp: "Compu del mostrador", version: "5.2.9", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [], charla: [], tambien: ["Rosa"], estado: "resuelto", nota: "Ya busca por singular y plural.", resolvio: "Carlos", cuandoRes: "ayer" },
    { id: "r3", tipo: "error", texto: "La impresora del mostrador cortaba el último renglón del ticket",
      autor: "Julián Ferraro", corto: "Julián", ini: "JF", cuando: "hace 9 días", hora: "9 de octubre", disp: "Compu del mostrador", version: "5.2.8", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [{ src: IMG + "cap-compu-cobro.webp" }], charla: [], tambien: [], estado: "resuelto", nota: "Le cambié el margen a la Hasar.", resolvio: "Carlos", cuandoRes: "el martes" },
    { id: "r4", tipo: "idea", texto: "Ver el stock del depósito desde Vender, debajo del precio",
      autor: "Rosa Benítez", corto: "Rosa", ini: "RB", cuando: "hace 2 semanas", hora: "4 de octubre", disp: "Samsung A15", version: "5.2.7", pantalla: "Vender", icoPantalla: "shopping-cart",
      fotos: [{ src: FOTO + "tornillos.webp", producto: true }], charla: [], tambien: ["Martín", "Julián"], estado: "resuelto", nota: "Sale debajo del precio desde la 5.2.8.", resolvio: "Carlos", cuandoRes: "hace 10 días" }
  ];
  function ticket(id) { for (var k = 0; k < TICKETS.length; k++) if (TICKETS[k].id === id) return TICKETS[k]; return null; }
  var CAPTURAS_COMPU = [IMG + "cap-compu-estante.webp", IMG + "cap-compu-cuaderno.webp", IMG + "cap-vender-compu.webp", IMG + "cap-compu-cobro.webp"];
  var FOTOS = ["tarugos", "tornillos", "mecha", "clavos", "llave-combinada", "martillo", "pinza", "cinta-metrica"].map(function (n) { return FOTO + n + ".webp"; });
  var CAPTURAS_CELU = [IMG + "cap-celu-tarugos.webp", IMG + "cap-celu-cobrar.webp", IMG + "cap-vender-celu.webp", IMG + "cap-celu-camara.webp"];
  var cuenta = 0;
  function siguiente(lista) { cuenta++; return lista[cuenta % lista.length]; }

  // ---------------- Utilidades ----------------
  function h(html) {
    var d = document.createElement("div"); d.innerHTML = html.trim();
    if (window.pintarIconos) window.pintarIconos(d);
    return d.firstElementChild;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function animar(el, clase, ms, alFinal) {
    if (!el) return;
    el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); if (alFinal) alFinal(); }, ms || 400);
  }
  function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function sacudir(el) { animar(el, "ix-sacude", 340); vibrar(10); }

  // Los hermanos se corren a su lugar nuevo (solo transform).
  function flip(contenedor, cambiar) {
    var hijos = Array.prototype.slice.call(contenedor.children);
    var antes = hijos.map(function (c) { return c.getBoundingClientRect(); });
    cambiar();
    hijos.forEach(function (c, k) {
      if (!c.isConnected) return;
      var r = c.getBoundingClientRect(), dx = antes[k].left - r.left, dy = antes[k].top - r.top;
      if (!dx && !dy) return;
      c.style.transition = "none"; c.style.transform = "translate(" + dx + "px," + dy + "px)";
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        c.style.transition = "transform var(--t) var(--curva)"; c.style.transform = "";
        setTimeout(function () { c.style.transition = ""; }, 260);
      }); });
    });
  }
  function quitar(el, alFinal) {
    el.classList.add("ix-encoge");
    setTimeout(function () { var p = el.parentNode; if (p) flip(p, function () { el.remove(); }); if (alFinal) alFinal(); }, 200);
  }
  function sacarDeLista(el, alFinal) {
    el.classList.add("ix-sale");
    setTimeout(function () { var p = el.parentNode; if (p) flip(p, function () { el.remove(); }); if (alFinal) alFinal(); }, 260);
  }
  function entrar(el) { el.classList.add("ix-entra", "ix-recien"); setTimeout(function () { el.classList.remove("ix-entra", "ix-recien"); }, 1300); }

  // Un número que cambia: rueda hacia arriba si sube, hacia abajo si baja.
  function rodar(el, valor) {
    if (!el) return;
    var antes = parseInt(el.textContent, 10) || 0;
    el.textContent = valor;
    animar(el, valor >= antes ? "ix-sube" : "ix-baja", 220);
  }
  // Envuelve el número del final de un texto («Abiertos 7») para hacerlo rodar.
  function numero(el) {
    if (!el) return null;
    var n = el.querySelector(".ix-n"); if (n) return n;
    for (var k = el.childNodes.length - 1; k >= 0; k--) {
      var t = el.childNodes[k];
      if (t.nodeType === 3 && /\d+\s*$/.test(t.textContent)) {
        var m = t.textContent.match(/^([\s\S]*?)(\d+)(\s*)$/);
        var s = document.createElement("span"); s.className = "ix-n"; s.textContent = m[2];
        t.textContent = m[1]; el.insertBefore(s, t.nextSibling);
        if (m[3]) el.insertBefore(document.createTextNode(m[3]), s.nextSibling);
        return s;
      }
    }
    return null;
  }
  function sumar(el, d) { var n = numero(el) || el; rodar(n, (parseInt(n.textContent, 10) || 0) + d); }
  function fundir(el, texto) { el.textContent = texto; animar(el, "ix-funde", 220); }

  // Elegir uno de varios: la marca se desliza del elegido al nuevo (200 ms).
  function elegir(nuevo, clase) {
    clase = clase || "elegida";
    var grupo = nuevo.parentNode;
    if (grupo._pend) { clearTimeout(grupo._pend.reloj); grupo._pend.f.remove(); grupo._pend.nuevo.classList.add(clase); grupo._pend = null; }
    var viejo = grupo.querySelector("." + clase);
    if (viejo === nuevo) return false;
    if (viejo && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var cs = getComputedStyle(viejo), rg = grupo.getBoundingClientRect(), rv = viejo.getBoundingClientRect(), rn = nuevo.getBoundingClientRect();
      if (getComputedStyle(grupo).position === "static") grupo.style.position = "relative";
      var f = document.createElement("span"); f.className = "ix-fantasma-sel";
      f.style.cssText = "left:" + (rv.left - rg.left) + "px;top:" + (rv.top - rg.top) + "px;width:" + rv.width + "px;height:" + rv.height + "px;background:" + cs.backgroundColor + ";border:" + cs.borderTopWidth + " solid " + cs.borderTopColor + ";border-radius:" + cs.borderTopLeftRadius;
      grupo.appendChild(f);
      viejo.classList.remove(clase);
      requestAnimationFrame(function () { f.style.transform = "translate(" + (rn.left - rv.left) + "px," + (rn.top - rv.top) + "px) scale(" + rn.width / rv.width + "," + rn.height / rv.height + ")"; f.style.transformOrigin = "0 0"; });
      grupo._pend = { f: f, nuevo: nuevo, reloj: setTimeout(function () { nuevo.classList.add(clase); f.remove(); grupo._pend = null; }, 200) };
    } else { if (viejo) viejo.classList.remove(clase); nuevo.classList.add(clase); }
    return true;
  }

  // Una caja de texto de la maqueta pasa a ser editable al tocarla.
  function editable(el, opciones) {
    opciones = opciones || {};
    el.setAttribute("contenteditable", "true"); el.setAttribute("spellcheck", "false");
    if (opciones.ayuda) el.setAttribute("data-ayuda", opciones.ayuda);
    el.addEventListener("focus", function () {
      var c = el.querySelectorAll(".cursor"); for (var k = 0; k < c.length; k++) c[k].remove();
      if (el.hasAttribute("data-ejemplo")) { el.removeAttribute("data-ejemplo"); el.textContent = ""; }
      if (!el.textContent.trim()) el.innerHTML = "";
    });
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && opciones.unaLinea) { e.preventDefault(); if (opciones.alEnter) opciones.alEnter(); } });
    el.addEventListener("input", function () { if (!el.textContent.trim()) el.innerHTML = ""; if (opciones.alEscribir) opciones.alEscribir(el.textContent); });
    el.addEventListener("paste", function (e) { e.preventDefault(); var t = (e.clipboardData || window.clipboardData).getData("text"); document.execCommand("insertText", false, t); });
    return el;
  }
  function texto(el) { var c = el.cloneNode(true); var x = c.querySelectorAll(".cursor"); for (var k = 0; k < x.length; k++) x[k].remove(); return c.textContent.replace(/\s+/g, " ").trim(); }
  function enfocar(el) {
    el.focus();
    try { var r = document.createRange(); r.selectNodeContents(el); r.collapse(false); var s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { /* nada */ }
  }
  function vaciar(el) { el.innerHTML = ""; enfocar(el); }

  // ---------------- Fotos de un aviso (hasta 5) ----------------
  // contenedor: donde están las miniaturas; antes: el elemento antes del que entran;
  // botones: los que suman; contador(n): actualiza el «2 de 5».
  function fotos(o) {
    var max = o.max || 5;
    function minis() { return Array.prototype.slice.call(o.contenedor.querySelectorAll(".mini")); }
    function n() { return minis().length; }
    function pintar(rodando, alEmpezar) {
      var lleno = n() >= max;
      (o.botones || []).forEach(function (b) { b.classList.toggle("ix-apagado", lleno); });
      if (o.contador && !alEmpezar) o.contador(n(), rodando);
    }
    o.contenedor.addEventListener("click", function (e) {
      var q = e.target.closest(".quitar");
      if (q && o.contenedor.contains(q)) { e.stopPropagation(); quitar(q.closest(".mini"), function () { setTimeout(function () { pintar(true); }, 10); }); return; }
      var im = e.target.closest(".mini img");
      if (im && o.contenedor.contains(im)) { var lista = minis().map(function (m) { var i = m.querySelector("img"); return { src: i.getAttribute("src"), producto: m.classList.contains("producto") }; }); verFotos(lista, minis().indexOf(im.closest(".mini")), im); }
    });
    var api = {
      agregar: function (src, producto, boton) {
        if (n() >= max) { sacudir(boton || o.contenedor); return false; }
        var m = h('<div class="mini' + (producto ? " producto" : "") + '"><img src="' + src + '" alt=""><span class="quitar"><i class="i" data-i="x"></i></span></div>');
        if (o.claseMini) m.classList.add(o.claseMini);
        var antes = o.antes && o.antes.parentNode === o.contenedor ? o.antes : null;
        o.contenedor.insertBefore(m, antes);
        animar(m, "ix-crece", 280); vibrar(10); pintar(true);
        return true;
      },
      vaciar: function () { minis().forEach(function (m) { m.remove(); }); pintar(true); },
      lista: function () { return minis().map(function (m) { var i = m.querySelector("img"); return { src: i.getAttribute("src"), producto: m.classList.contains("producto") }; }); },
      cuantas: n, lleno: function () { return n() >= max; }, pintar: pintar
    };
    pintar(false, true);
    return api;
  }

  // ---------------- Capas ----------------
  var pila = [];
  function capa(clase, interior, opciones) {
    opciones = opciones || {};
    var c = h('<div class="ix-capa ' + clase + '"><div class="ix-velo"></div><div class="ix-caja" role="dialog" aria-modal="true">' + interior + "</div></div>");
    if (opciones.efimera !== false) c.dataset.efimera = "1";
    return c;
  }
  function abrir(c, opciones) {
    opciones = opciones || {};
    if (!c.isConnected) raiz().appendChild(c);
    c._alCerrar = opciones.alCerrar;
    void c.offsetWidth;
    c.classList.add("abierta");
    pila.push(c);
    var f = c.querySelector("[data-foco]"); if (f) setTimeout(function () { enfocar(f); }, 60);
    return c;
  }
  function cerrar(c) {
    c = c || pila[pila.length - 1]; if (!c) return;
    var k = pila.indexOf(c); if (k >= 0) pila.splice(k, 1);
    c.classList.remove("abierta");
    if (c._alCerrar) c._alCerrar();
    if (c.dataset.efimera) setTimeout(function () { c.remove(); }, 340);
  }
  function hayCapa() { return pila.length > 0; }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); }
  }, true);
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-cerrar]");
    if (b) { cerrar(b.closest(".ix-capa")); return; }
    if (e.target.classList && e.target.classList.contains("ix-velo")) cerrar(e.target.closest(".ix-capa"));
  });

  // ---------------- Tostada ----------------
  function tostada(txt, o) {
    o = o || {};
    var cont = raiz().querySelector(":scope > .ix-tostadas");
    if (!cont) { cont = document.createElement("div"); cont.className = "ix-tostadas"; raiz().appendChild(cont); }
    var t = h('<div class="tostada" role="status"><i class="i" data-i="' + (o.icono || "circle-check") + '"></i><span>' + txt + "</span>" + (o.deshacer ? '<button class="deshacer">Deshacer</button>' : "") + "</div>");
    cont.innerHTML = ""; cont.appendChild(t);
    var fuera = function () { if (!t.isConnected) return; t.classList.add("sale"); setTimeout(function () { t.remove(); }, 220); };
    var reloj = setTimeout(fuera, o.ms || (o.deshacer ? 4000 : 2600));
    if (o.deshacer) t.querySelector(".deshacer").addEventListener("click", function () { clearTimeout(reloj); fuera(); o.deshacer(); });
    return t;
  }

  function destello() { var d = document.createElement("div"); d.className = "ix-destello"; raiz().appendChild(d); setTimeout(function () { d.remove(); }, 160); }

  // ---------------- Más ----------------
  var MAS = [
    { ir: "anomalias", ico: "triangle-alert", nombre: "Anomalías", detalle: "3 para mirar", insignia: '<span class="pastilla urgente" style="height:24px">3</span>' },
    { ir: "procesos", ico: "workflow", nombre: "Procesos", detalle: "Lo que corre solo" },
    { ir: "mejoras-y-errores", ico: "lightbulb", nombre: "Mejoras y errores", detalle: "7 abiertos" },
    { ir: "configuracion", ico: "settings", nombre: "Configuración", detalle: "Negocio, impresora, cuentas" }
  ];
  function listaMas() {
    return '<nav class="ix-mas">' + MAS.map(function (m) {
      var aqui = m.ir === "mejoras-y-errores";
      return '<a data-ir="' + m.ir + '"' + (aqui ? ' class="activo" aria-current="page"' : "") + '><span class="ico"><i class="i" data-i="' + m.ico + '"></i></span><span><b>' + m.nombre + "</b><small>" + m.detalle + "</small></span>" + (m.insignia || '<i class="i" data-i="chevron-right" style="color:var(--texto-3)"></i>') + "</a>";
    }).join("") + "</nav>";
  }
  function mas(desde) {
    var c;
    if (esCelu()) {
      c = capa("ix-hoja", '<span class="agarre"></span><div class="ix-cab"><span class="t-seccion">Más</span><button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div><div class="ix-cuerpo">' + listaMas() + "</div>");
    } else {
      c = capa("ix-pop sin-velo", listaMas());
      var r = (desde || document.querySelector("[data-mas]")).getBoundingClientRect();
      var caja = c.querySelector(".ix-caja");
      caja.style.left = Math.min(r.right + 8, innerWidth - 316) + "px";
      caja.style.top = Math.max(8, Math.min(r.top - 8, innerHeight - 300)) + "px";
    }
    abrir(c);
    // Tocar Mejoras y errores estando acá solo cierra el menú.
    var aqui = c.querySelector('[data-ir="mejoras-y-errores"]');
    aqui.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); cerrar(c); }, true);
    return c;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-mas]");
    if (b) { e.preventDefault(); mas(b); }
  });

  // ---------------- Foto en grande ----------------
  function verFotos(lista, i, desde) {
    if (!lista.length) return;
    var celu = esCelu();
    var c = capa("ix-foto", '<img alt="">');
    var caja = c.querySelector(".ix-caja"), img = caja.querySelector("img");
    var cerrarB = h('<button class="ctrl" data-cerrar aria-label="Cerrar" style="right:16px;top:' + (celu ? 52 : 16) + 'px"><i class="i" data-i="x"></i></button>');
    var ant = h('<button class="ctrl" aria-label="Anterior" style="left:16px;top:50%"><i class="i" data-i="chevron-left"></i></button>');
    var sig = h('<button class="ctrl" aria-label="Siguiente" style="right:16px;top:50%"><i class="i" data-i="chevron-right"></i></button>');
    var cu = h('<span class="pastilla cuenta" style="background:var(--superficie);box-shadow:var(--sombra-1)"></span>');
    c.appendChild(cerrarB); if (lista.length > 1) { c.appendChild(ant); c.appendChild(sig); c.appendChild(cu); }
    var W = celu ? 358 : 880, H = celu ? 560 : 600;
    function medir() {
      var w = W, hh = H;
      if (!lista[i].producto && img.naturalWidth) { var e = Math.min(W / img.naturalWidth, H / img.naturalHeight); w = Math.round(img.naturalWidth * e); hh = Math.round(img.naturalHeight * e); }
      else if (lista[i].producto) { w = hh = Math.min(W, H, 480); }
      caja.style.width = w + "px"; caja.style.height = hh + "px"; caja.style.marginLeft = -w / 2 + "px"; caja.style.marginTop = -hh / 2 + "px";
    }
    function poner(k) {
      i = (k + lista.length) % lista.length;
      img.onload = medir;
      img.src = lista[i].src; caja.classList.toggle("producto", !!lista[i].producto);
      if (img.complete) medir();
      cu.textContent = (i + 1) + " de " + lista.length;
    }
    poner(i);
    if (desde) {
      var r = desde.getBoundingClientRect(), base = raiz().getBoundingClientRect();
      var cw = parseFloat(caja.style.width) || W, ch = parseFloat(caja.style.height) || H;
      var x0 = (base.left + base.width / 2) - cw / 2, y0 = (base.top + base.height / 2) - ch / 2;
      caja.style.transform = "translate(" + (r.left - x0) + "px," + (r.top - y0) + "px) scale(" + r.width / cw + "," + r.height / ch + ")";
    } else caja.style.transform = "scale(.9)";
    abrir(c);
    requestAnimationFrame(function () { requestAnimationFrame(function () { caja.style.transform = "none"; }); });
    ant.addEventListener("click", function () { poner(i - 1); animar(img, "ix-funde", 220); });
    sig.addEventListener("click", function () { poner(i + 1); animar(img, "ix-funde", 220); });
    function teclas(e) { if (!c.isConnected) return document.removeEventListener("keydown", teclas); if (e.key === "ArrowLeft") ant.click(); if (e.key === "ArrowRight") sig.click(); }
    document.addEventListener("keydown", teclas);
    var x = null;
    caja.addEventListener("pointerdown", function (e) { x = e.clientX; });
    caja.addEventListener("pointerup", function (e) { if (x === null) return; var d = e.clientX - x; x = null; if (Math.abs(d) > 40 && lista.length > 1) (d < 0 ? sig : ant).click(); });
    return c;
  }

  // ---------------- Cámara y galería (celular) ----------------
  function camara(alSacar) {
    var foto = siguiente(FOTOS);
    var c = capa("ix-camara", '<div class="visor"><img src="' + foto + '" alt=""><span class="marco-foco"></span></div>' +
      '<div class="arriba"><button class="redondo" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button><span class="pastilla" style="background:rgba(255,255,255,.14);color:#fff"><i class="i i-s" data-i="zap"></i>Automático</span></div>' +
      '<div class="pista-c">Encuadrá lo que querés mostrar</div>' +
      '<div class="abajo"><span></span><button class="disparo" aria-label="Sacar la foto"></button><span></span></div>');
    abrir(c);
    c.querySelector(".disparo").addEventListener("click", function () {
      destello(); vibrar(10);
      setTimeout(function () { cerrar(c); alSacar(foto, true); }, 140);
    });
  }
  function galeria(alElegir) {
    var items = CAPTURAS_CELU.map(function (s) { return { src: s }; }).concat(FOTOS.slice(0, 5).map(function (s) { return { src: s, producto: true }; }));
    var c = capa("ix-hoja", '<span class="agarre"></span><div class="ix-cab"><span class="t-seccion">Elegí una foto</span><button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<div class="ix-cuerpo"><div class="t-detalle">Capturas y fotos recientes</div><div class="ix-galeria">' +
      items.map(function (it, k) { return '<button data-k="' + k + '"' + (it.producto ? ' class="producto"' : "") + '><img src="' + it.src + '" alt=""></button>'; }).join("") + "</div></div>");
    abrir(c);
    c.querySelector(".ix-galeria").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var it = items[+b.dataset.k]; cerrar(c); setTimeout(function () { alElegir(it.src, !!it.producto); }, 120);
    });
  }

  // ---------------- Detalle de un ticket (compu 1 y celulares) ----------------
  function metas(t) {
    return '<span class="pastilla contorno"><span class="av" style="width:20px;height:20px">' + t.ini.charAt(0) + "</span>" + esc(t.autor) + "</span>" +
      '<span class="pastilla contorno"><i class="i i-s" data-i="clock"></i>' + t.hora + "</span>" +
      '<span class="pastilla contorno"><i class="i i-s" data-i="' + (/Compu/.test(t.disp) ? "monitor" : "smartphone") + '"></i>' + t.disp + " · " + t.version + "</span>" +
      '<span class="pastilla contorno"><i class="i i-s" data-i="' + t.icoPantalla + '"></i>Estaba en ' + t.pantalla + "</span>";
  }
  function estadoPastilla(t) {
    if (t.porEnviar) return '<span class="pastilla urgente estado"><i class="i i-s" data-i="cloud-upload"></i>Por enviar</span>';
    return t.estado === "resuelto" ? '<span class="pastilla logro estado"><i class="i i-s" data-i="circle-check"></i>Resuelto</span>' : '<span class="pastilla pino estado"><span class="punto"></span>Abierto</span>';
  }
  function tambienTxt(t) {
    if (!t.tambien.length) return "Nadie más lo sumó todavía";
    var varios = t.tambien.length > 1;
    var verbo = t.tipo === "idea" ? (varios ? "lo quieren" : "lo quiere") : (varios ? "lo vieron" : "lo vio");
    return "<b style=\"color:var(--tinta)\">" + t.tambien.join(" y ") + "</b> también " + verbo;
  }
  function detalle(t, o) {
    o = o || {};
    var celu = esCelu();
    var fotosH = "";
    if (t.fotos.length) {
      var f0 = t.fotos[0];
      fotosH = '<div class="ix-grande' + (f0.producto ? " producto" : "") + '"><img src="' + f0.src + '" alt=""' + (f0.pos ? ' style="object-position:' + f0.pos + '"' : "") + ">" +
        (f0.marcada ? '<span class="pastilla" style="position:absolute;left:10px;top:10px;background:var(--superficie);box-shadow:var(--sombra-1)"><i class="i i-s" data-i="pen-line"></i>Marcada por ' + t.corto + "</span>" : "") +
        '<span class="btn chico" style="position:absolute;right:10px;bottom:10px" data-ver><i class="i i-s" data-i="maximize-2"></i>Ver en grande</span></div>' +
        (t.fotos.length > 1 ? '<div class="ix-tira">' + t.fotos.map(function (f, k) { return '<div class="mini' + (f.producto ? " producto" : "") + (k ? "" : " sel") + '" data-k="' + k + '"><img src="' + f.src + '" alt=""></div>'; }).join("") + "</div>" : "");
    }
    var charla = t.charla.map(function (e) { return '<div class="ix-ev"><span class="av' + (e.ini === "CI" ? " c" : "") + '">' + e.ini + "</span><div><b>" + e.quien + "</b> " + (/^\d/.test(e.hora) ? "· " : "") + e.hora + (e.texto ? '<div class="burbuja">' + esc(e.texto) + "</div>" : "") + "</div></div>"; }).join("");
    var pie;
    if (t.porEnviar) pie = '<div class="aviso urgente" style="flex:1"><i class="i" data-i="cloud-upload"></i><span>Todavía no salió: sale solo cuando vuelva la conexión.</span></div>';
    else if (t.estado === "resuelto") pie = '<div class="aviso logro" style="flex:1"><i class="i" data-i="circle-check"></i><span><b>' + (t.resolvio || "Carlos") + " lo resolvió</b> " + (t.cuandoRes || "recién") + (t.nota ? ": " + esc(t.nota) : "") + '</span></div><button class="btn" data-reabrir><i class="i i-s" data-i="rotate-ccw"></i>Reabrir</button>';
    else pie = '<div class="campo ix-nota"><i class="i" data-i="message-square"></i><span data-nota data-ayuda="' + (celu ? "Nota (opcional)" : "Nota para quien lo avisó (opcional)") + '"></span></div><button class="btn btn-accion" data-resolver><i class="i" data-i="check"></i><span>' + (celu ? "Resuelto" : "Marcar resuelto") + "</span>" + (celu ? "" : ' <span class="kbd">E</span>') + "</button>";
    var interior = (celu ? '<span class="agarre"></span>' : "") +
      '<div class="ix-det-cab"><span class="tipo ' + t.tipo + (celu ? "" : " grande") + '"><i class="i' + (celu ? "" : " i-l") + '" data-i="' + (t.tipo === "idea" ? "lightbulb" : "bug") + '"></i></span><div><h2>' + esc(t.texto) + '</h2><div class="ix-metas">' + metas(t) + "</div></div>" + estadoPastilla(t) +
      '<button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar" style="margin:-4px -8px 0 -4px' + (celu ? ';grid-column:3;grid-row:1' : '') + '"><i class="i" data-i="x"></i></button>' + "</div>" +
      '<div class="ix-cuerpo" style="padding-top:12px">' + fotosH +
      (charla ? '<div class="ix-hilo"><div class="t-etiqueta">Lo que pasó</div>' + charla + "</div>" : "") +
      (t.porEnviar ? "" : '<div class="ix-tambien"><span class="t-detalle" data-tambien-txt>' + tambienTxt(t) + "</span>" + (t.mio ? "" : '<button class="btn chico btn-suave' + (t.yoTambien ? " si" : "") + '" data-tambien style="margin-left:auto"><i class="i i-s" data-i="thumbs-up"></i>A mí también</button>') + "</div>") +
      "</div>" + '<div class="ix-pie">' + pie + "</div>";
    var c = capa(celu ? "ix-hoja" : "ix-panel", interior);
    abrir(c);
    var grande = c.querySelector(".ix-grande");
    function verDesde(k, el) { verFotos(t.fotos.map(function (f) { return { src: f.src, producto: f.producto }; }), k, el); }
    var actual = 0;
    if (grande) grande.addEventListener("click", function () { verDesde(actual, grande.querySelector("img")); });
    var tira = c.querySelector(".ix-tira");
    if (tira) tira.addEventListener("click", function (e) {
      var m = e.target.closest(".mini"); if (!m) return;
      actual = +m.dataset.k; var f = t.fotos[actual];
      tira.querySelectorAll(".mini").forEach(function (x) { x.classList.toggle("sel", x === m); });
      var im = grande.querySelector("img"); im.src = f.src; im.style.objectPosition = f.pos || ""; grande.classList.toggle("producto", !!f.producto); animar(im, "ix-funde", 220);
    });
    var nota = c.querySelector("[data-nota]"); if (nota) editable(nota, { unaLinea: true, alEnter: function () { c.querySelector("[data-resolver]").click(); } });
    var bT = c.querySelector("[data-tambien]");
    if (bT) bT.addEventListener("click", function () {
      t.yoTambien = !t.yoTambien;
      if (t.yoTambien) t.tambien.push("Carlos"); else t.tambien = t.tambien.filter(function (x) { return x !== "Carlos"; });
      bT.classList.toggle("si", t.yoTambien); animar(bT, "ix-tilde", 300);
      var tx = c.querySelector("[data-tambien-txt]"); tx.innerHTML = tambienTxt(t); animar(tx, "ix-funde", 220);
      if (o.alTambien) o.alTambien(t);
    });
    var bR = c.querySelector("[data-resolver]");
    if (bR) bR.addEventListener("click", function () {
      var nt = nota ? texto(nota) : "";
      bR.querySelector("span").textContent = "Resuelto"; var ic = bR.querySelector("svg"); animar(ic, "ix-tilde", 300);
      vibrar([10, 40, 10]);
      setTimeout(function () { cerrar(c); if (o.alResolver) o.alResolver(t, nt); }, 360);
    });
    var bA = c.querySelector("[data-reabrir]");
    if (bA) bA.addEventListener("click", function () { cerrar(c); if (o.alReabrir) o.alReabrir(t); });
    c._ticket = t;
    return c;
  }
  // Atajo E en la compu: resuelve el ticket abierto en el panel.
  document.addEventListener("keydown", function (e) {
    if (e.key.toLowerCase() !== "e" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (document.activeElement && document.activeElement.isContentEditable) return;
    var c = pila[pila.length - 1]; if (!c || !c._ticket) return;
    var b = c.querySelector("[data-resolver]"); if (b) { e.preventDefault(); b.click(); }
  });

  window.MYE = {
    IMG: IMG, FOTO: FOTO, TICKETS: TICKETS, ticket: ticket, CAPTURAS_COMPU: CAPTURAS_COMPU, CAPTURAS_CELU: CAPTURAS_CELU, FOTOS: FOTOS, siguiente: siguiente,
    h: h, esc: esc, animar: animar, vibrar: vibrar, sacudir: sacudir, flip: flip, quitar: quitar, sacarDeLista: sacarDeLista, entrar: entrar,
    rodar: rodar, numero: numero, sumar: sumar, fundir: fundir, elegir: elegir, editable: editable, texto: texto, enfocar: enfocar, vaciar: vaciar,
    fotos: fotos, capa: capa, abrir: abrir, cerrar: cerrar, hayCapa: hayCapa, tostada: tostada, destello: destello, mas: mas, verFotos: verFotos,
    camara: camara, galeria: galeria, detalle: detalle, metas: metas, tambienTxt: tambienTxt
  };
})();

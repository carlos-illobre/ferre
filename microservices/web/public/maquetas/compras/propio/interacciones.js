// Compras: piezas que se abren al tocar, compartidas por las seis variantes.
// Es una maqueta: nada se guarda, solo se ve lo que pasaría. Cada index.html arma lo suyo al pie
// usando window.CP. Los datos son los de resumen.md (la factura de Bulonera Centro, la semana, lo
// que se debe y los pedidos).
(function () {
  "use strict";
  var CP = {};
  window.CP = CP;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  CP.$ = $; CP.$$ = $$;

  var celu = !!document.querySelector(".celu");
  CP.celu = celu;
  var quieto = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };
  CP.quieto = quieto;
  CP.raiz = function () { return document.querySelector(".celu") || document.body; };

  // Rutas relativas a la página (todas las variantes están a la misma profundidad)
  var FOTOS = "../../../_comun/fotos/";
  var FACTURA = "../../propio/factura.webp";
  var QR = "../../propio/qr.svg";
  CP.FACTURA = FACTURA;

  CP.miles = function (n) { var s = String(Math.round(Math.abs(n))); return (n < 0 ? "−" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  CP.plata = function (n) { return '<span class="peso">$</span>' + CP.miles(n); };
  var plata = CP.plata;
  function ico(n, c) { return '<i class="i ' + (c || "") + '" data-i="' + n + '"></i>'; }
  CP.ico = ico;
  function pintar(el) { if (window.pintarIconos) window.pintarIconos(el); }
  CP.pintar = pintar;
  CP.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------------------------------------------------------------- datos
  // La factura que llega (suma $253.220 sin IVA)
  CP.renglonesFactura = function () {
    return [
      { foto: "tornillos", nom: 'Autoperforante T2 8 × 1" × 100', cod: "TA8-100 · Fischer", cant: 20, u: "un.", costo: 3800, dif: "= lista", tipo: "igual", pedi: "20", marca: 30.3 },
      { foto: "tarugos", nom: "Tarugos nylon S8 con tope × 100", cod: "TS8-100 · Fischer · lista $3.950", cant: 15, u: "un.", costo: 4150, dif: "↑ +5 %", tipo: "sube", pedi: "15", marca: 34.5 },
      { foto: "mecha", nom: "Mecha acero rápido HSS 8 mm", cod: "MHS-080 · Ezeta", cant: 24, u: "un.", costo: 2480, dif: "= lista", tipo: "igual", pedi: "24", marca: 38.7 },
      { foto: "clavos", nom: 'Clavos punta París 2" por kilo', cod: "CP2-KG · Acindar · lista $3.050", cant: 12.5, u: "kg", costo: 2900, dif: "↓ −5 %", tipo: "baja", pedi: "12,5", marca: 42.9 },
      { foto: null, nom: "ARANDELA GROWER 8MM CJ x1000", cod: "AG8-1M · así dice la factura", cant: 2, u: "un.", costo: 9600, dif: "sin lista", tipo: "igual", dudoso: true, pedi: "no pedida", marca: 47.1 }
    ];
  };
  // El pedido que manda Distribuidora Oeste (9 renglones, $142.600)
  CP.renglonesOeste = function () {
    return [
      { foto: "pinza", nom: 'Pinza universal 8" Bahco', cod: "PU-8 · Bahco", cant: 4, u: "un.", costo: 9800 },
      { foto: "cinta-metrica", nom: "Cinta métrica 5 m × 19 mm", cod: "CM5-19 · Stanley", cant: 6, u: "un.", costo: 5400 },
      { foto: "llave-combinada", nom: "Llave combinada 13 mm", cod: "LC-13 · Bremen", cant: 10, u: "un.", costo: 2150 },
      { foto: "puntas", nom: "Puntas Phillips PH2 × 10", cod: "PH2-10 · Bremen", cant: 8, u: "un.", costo: 1900 },
      { foto: "lampara", nom: "Lámpara LED 9 W luz fría", cod: "LED9-F · Philips", cant: 10, u: "un.", costo: 1250 },
      { foto: "tarugos", nom: "Tarugos nylon S6 × 100", cod: "TS6-100 · Fischer", cant: 6, u: "un.", costo: 1600 },
      { foto: "clavos", nom: 'Clavos punta París 1" por kilo', cod: "CP1-KG · Acindar", cant: 2, u: "kg", costo: 2700 },
      { foto: "mecha", nom: "Mecha acero rápido HSS 6 mm", cod: "MHS-060 · Ezeta", cant: 4, u: "un.", costo: 1100 },
      { foto: "tornillos", nom: "Tornillo madera 4 × 40 × 50", cod: "TM440-50 · Fischer", cant: 2, u: "un.", costo: 1200 }
    ];
  };
  // Lo que falta de un pedido entregado a medias ($40.000)
  CP.renglonesResto = function () {
    return [
      { foto: null, icono: "package", nom: "Alambre galvanizado 17/15", cod: "AG17 · Acindar", cant: 5, u: "kg", costo: 3200 },
      { foto: "clavos", nom: 'Clavos punta París 3" por kilo', cod: "CP3-KG · Acindar", cant: 4, u: "kg", costo: 2950 },
      { foto: "tornillos", nom: "Bulón cabeza hexagonal 8 × 60 × 50", cod: "BH860 · Fischer", cant: 2, u: "un.", costo: 6100 }
    ];
  };
  // Lo que se va agregando a mano o escaneando, en este orden
  CP.PRODUCTOS = [
    { foto: "martillo", nom: "Martillo carpintero 27 mm mango fibra", cod: "MC27 · Bremen", cant: 3, u: "un.", costo: 8900 },
    { foto: "pintura", nom: "Látex interior blanco mate 4 l", cod: "LI4 · Alba", cant: 2, u: "un.", costo: 14500 },
    { foto: "cinta-metrica", nom: "Cinta métrica 5 m × 19 mm", cod: "CM5-19 · Stanley", cant: 4, u: "un.", costo: 5400 },
    { foto: "puntas", nom: "Puntas Phillips PH2 × 10", cod: "PH2-10 · Bremen", cant: 6, u: "un.", costo: 1900 },
    { foto: "lampara", nom: "Lámpara LED 9 W luz fría", cod: "LED9-F · Philips", cant: 10, u: "un.", costo: 1250 },
    { foto: "pinza", nom: 'Pinza universal 8" Bahco', cod: "PU-8 · Bahco", cant: 2, u: "un.", costo: 9800 }
  ];
  var siguiente = 0;
  CP.otroProducto = function () { var p = CP.PRODUCTOS[siguiente % CP.PRODUCTOS.length]; siguiente++; return Object.assign({}, p); };
  // Los candidatos para la arandela que no está en el catálogo
  CP.CANDIDATOS = [
    { nom: "Arandela grower 8 mm × 1000", cod: "AGR-08 · Fischer · Est. B-02-04" },
    { nom: "Arandela grower 8 mm × 100", cod: "AGR-08C · Fischer · Est. B-02-04" },
    { nom: "Arandela plana 8 mm × 1000", cod: "APL-08 · Fischer · Est. B-02-03" }
  ];
  CP.cant = function (r) { return String(r.cant).replace(".", ",") + " " + r.u; };
  CP.subtotal = function (r) { return Math.round(r.cant * r.costo); };
  CP.suma = function (rs) { return rs.reduce(function (a, r) { return a + CP.subtotal(r); }, 0); };

  // ------------------------------------------------------------ abrir y cerrar
  var pila = [];
  CP.abrir = function (html, o) {
    o = o || {};
    var tipo = o.tipo || (celu ? "hoja" : "dialogo");
    var raiz = CP.raiz();
    var velo = null;
    if (tipo !== "pantalla") {
      velo = document.createElement("div");
      velo.className = "cp-velo" + (tipo === "menu" ? " claro" : "");
      raiz.appendChild(velo);
    }
    var el = document.createElement("div");
    el.className = "cp-capa cp-" + tipo + " " + (o.clase || "");
    el.setAttribute("role", tipo === "menu" ? "menu" : "dialog");
    el.innerHTML = html;
    raiz.appendChild(el);
    pintar(el);
    var item = { el: el, velo: velo, alCerrar: o.alCerrar, cerrado: false };
    item.cerrar = function () { cerrar(item); };
    pila.push(item);
    if (velo) velo.addEventListener("click", item.cerrar);
    el.addEventListener("click", function (e) { if (e.target.closest("[data-cerrar]")) item.cerrar(); });
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    requestAnimationFrame(function () { el.classList.add("cp-abierto"); if (velo) velo.classList.add("cp-abierto"); });
    if (o.foco !== false) setTimeout(function () { var f = el.querySelector("input, [autofocus]"); if (f) f.focus(); }, 30);
    return item;
  };
  function cerrar(item) {
    if (item.cerrado) return;
    item.cerrado = true;
    pila.splice(pila.indexOf(item), 1);
    item.el.classList.add("cp-saliendo");
    item.el.classList.remove("cp-abierto");
    if (item.velo) item.velo.classList.remove("cp-abierto");
    var fin = function () { item.el.remove(); if (item.velo) item.velo.remove(); };
    if (quieto()) fin(); else setTimeout(fin, 240);
    if (item.alCerrar) item.alCerrar();
  }
  CP.cerrarTodo = function () { while (pila.length) cerrar(pila[pila.length - 1]); };
  CP.hayAbierto = function () { return pila.length > 0; };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pila.length) { e.preventDefault(); cerrar(pila[pila.length - 1]); }
  });

  // Teclas de la computadora: CP.tecla("Alt+N", fn)
  var teclas = {};
  CP.tecla = function (combo, fn) { teclas[combo.toLowerCase()] = fn; };
  document.addEventListener("keydown", function (e) {
    var k = (e.ctrlKey ? "ctrl+" : "") + (e.altKey ? "alt+" : "") + (e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase());
    if (e.altKey && e.code && e.code.indexOf("Key") === 0) k = (e.ctrlKey ? "ctrl+" : "") + "alt+" + e.code.slice(3).toLowerCase();
    var fn = teclas[k];
    if (fn && (!pila.length || k === "ctrl+k")) { e.preventDefault(); fn(e); }
  });

  // Cabecera de un diálogo u hoja
  function cab(titulo, sub, extra) {
    return '<div class="cp-cab"><div class="cp-tt"><b>' + titulo + "</b>" + (sub ? "<span>" + sub + "</span>" : "") + "</div>" + (extra || "") +
      '<button class="btn btn-fantasma btn-icono" data-cerrar aria-label="Cerrar">' + ico("x") + "</button></div>";
  }
  CP.cab = cab;

  // ------------------------------------------------------------ menús
  // items: [{texto, icono, ir, accion, sep, rotulo}]
  CP.menu = function (ancla, items, o) {
    o = o || {};
    var html = items.map(function (it, i) {
      if (it.sep) return '<div class="cp-sep"></div>';
      if (it.rotulo) return '<div class="cp-rotulo">' + it.rotulo + "</div>";
      return '<button class="cp-op" data-n="' + i + '"' + (it.ir ? ' data-ir="' + it.ir + '"' : "") + ">" + (it.icono ? ico(it.icono) : "") + "<span>" + it.texto + "</span></button>";
    }).join("");
    var m;
    if (celu) {
      m = CP.abrir(cab(o.titulo || "Más") + '<div class="cp-cuerpo"><div class="cp-lista-op tarjeta" style="padding:6px">' + html + "</div></div>", { tipo: "hoja" });
      $$(".cp-op", m.el).forEach(function (b) { b.style.minHeight = "52px"; });
    } else {
      m = CP.abrir(html, { tipo: "menu" });
      var r = ancla.getBoundingClientRect();
      var lateral = ancla.closest(".lateral");
      var w = 260;
      if (lateral) { m.el.style.left = (r.right + 8) + "px"; m.el.style.top = Math.min(r.top, innerHeight - 40 - items.length * 46) + "px"; }
      else { m.el.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + "px"; m.el.style.top = (r.bottom + 6) + "px"; m.el.style.transformOrigin = "top right"; }
      m.el.style.minWidth = w + "px";
    }
    m.el.addEventListener("click", function (e) {
      var b = e.target.closest(".cp-op");
      if (!b) return;
      var it = items[Number(b.getAttribute("data-n"))];
      if (it && it.accion) { m.cerrar(); it.accion(); }
      else if (it && it.ir) m.cerrar();
    });
    var primero = m.el.querySelector(".cp-op");
    if (primero && !celu) setTimeout(function () { primero.focus(); }, 30);
    return m;
  };
  CP.MAS = [
    { texto: "Anomalías", icono: "triangle-alert", ir: "anomalias" },
    { texto: "Procesos", icono: "workflow", ir: "procesos" },
    { texto: "Mejoras y errores", icono: "bug", ir: "mejoras-y-errores" },
    { texto: "Configuración", icono: "settings", ir: "configuracion" }
  ];
  CP.mas = function (ancla) { return CP.menu(ancla, CP.MAS, { titulo: "Más" }); };
  CP.persona = function (ancla) {
    return CP.menu(ancla, [{ rotulo: "Marcelo Ríos · Comprador" }, { texto: "Quién hizo qué", icono: "history", ir: "actividad" }, { sep: true }, { texto: "Cerrar sesión", icono: "log-out", ir: "entrar" }], { titulo: "Marcelo Ríos" });
  };

  // ------------------------------------------------------------ movimiento
  CP.rodar = function (el, html, sube) {
    if (!el) return;
    if (quieto() || !el.animate) { el.innerHTML = html; return; }
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    var d = sube ? -1 : 1;
    el.animate([{ transform: "none", opacity: 1 }, { transform: "translateY(" + (d * 40) + "%)", opacity: 0 }], { duration: 100, easing: "ease-in" }).onfinish = function () {
      el.innerHTML = html;
      el.animate([{ transform: "translateY(" + (-d * 40) + "%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 140, easing: "cubic-bezier(.2,.8,.2,1)" });
    };
  };
  CP.entrar = function (el) { el.classList.remove("cp-nuevo"); el.offsetWidth; el.classList.add("cp-nuevo"); setTimeout(function () { el.classList.remove("cp-nuevo"); }, 1300); };
  CP.salta = function (el) { if (!el) return; el.classList.remove("cp-salta"); el.offsetWidth; el.classList.add("cp-salta"); };
  CP.irse = function (el, fin) {
    if (quieto()) { el.remove(); if (fin) fin(); return; }
    el.classList.add("cp-sale");
    setTimeout(function () { el.remove(); if (fin) fin(); }, 210);
  };

  // ------------------------------------------------------------ tostada
  CP.tostada = function (texto, o) {
    o = o || {};
    var raiz = CP.raiz();
    var cont = raiz.querySelector(":scope > .cp-tostadas");
    if (!cont) { cont = document.createElement("div"); cont.className = "cp-tostadas"; raiz.appendChild(cont); }
    var t = document.createElement("div");
    t.className = "tostada";
    t.innerHTML = ico(o.icono || "circle-check") + "<span>" + texto + "</span>" + (o.deshacer ? "<button>Deshacer</button>" : "");
    cont.appendChild(t);
    pintar(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add("si"); }); });
    var quitar = function () { t.classList.remove("si"); setTimeout(function () { t.remove(); }, 260); };
    var timer = setTimeout(quitar, o.ms || 4000);
    if (o.deshacer) t.querySelector("button").addEventListener("click", function () { clearTimeout(timer); quitar(); o.deshacer(); });
    return t;
  };

  // ------------------------------------------------------------ renglones
  CP.renglonHTML = function (r, i, o) {
    o = o || {};
    var foto = r.foto ? '<div class="foto"><img src="' + FOTOS + r.foto + '.webp" alt=""></div>'
      : (r.dudoso ? '<div class="foto-icono ambar">' + ico("circle-help") + "</div>" : '<div class="foto-icono">' + ico(r.icono || "package") + "</div>");
    var det = r.dudoso ? "No está en el catálogo · " + CP.cant(r) + " × $" + CP.miles(r.costo)
      : CP.cant(r) + " × $" + CP.miles(r.costo) + (o.pedi && r.pedi ? " · pedí " + r.pedi : "");
    var dif = r.dif && !r.dudoso ? '<small class="' + (r.tipo || "igual") + '">' + r.dif + "</small>" : "";
    var salidas = r.dudoso && !o.soloVer ? '<div class="cp-salidas"><button class="btn chico" data-elegir>' + ico("search", "i-s") + "Es un producto que tengo</button><button class=\"btn chico\" data-crear>" + ico("package-plus", "i-s") + "Crear como nuevo</button></div>" : "";
    return '<div class="cp-ren' + (r.dudoso ? " cp-dudoso" : "") + '" data-r="' + i + '">' + foto +
      '<div style="min-width:0"><div class="cp-nom">' + esc(r.nom) + '</div><div class="cp-det">' + det + "</div></div>" +
      '<div class="cp-sub">' + plata(CP.subtotal(r)) + dif + "</div>" + salidas + "</div>";
  };

  // Elegir a qué producto corresponde un renglón que no se reconoció
  CP.elegirProducto = function (r, listo) {
    var html = cab("¿Qué producto es?", "La factura dice «" + esc(r.nom) + "»") +
      '<div class="cp-cuerpo"><div class="campo foco" style="margin-bottom:12px">' + ico("search") + '<span class="escrito">arandela grower 8</span><span class="cursor"></span></div><div class="cp-lista">' +
      CP.CANDIDATOS.map(function (c, i) {
        return '<button class="cp-fila" data-c="' + i + '"><span class="cp-ic">' + ico("package") + "</span><span style=\"min-width:0\"><b>" + c.nom + '</b><span class="cp-d">' + c.cod + "</span></span>" + ico("chevron-right") + "</button>";
      }).join("") + '</div></div><div class="cp-pie"><button class="btn" data-nuevo>' + ico("package-plus", "i-s") + 'Crear como nuevo</button><div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cancelar</button></div></div>';
    var d = CP.abrir(html, { clase: "chico" });
    d.el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]");
      if (b) { var c = CP.CANDIDATOS[Number(b.getAttribute("data-c"))]; d.cerrar(); listo({ nom: c.nom, cod: c.cod.split(" · Est")[0], nuevo: false }); }
      if (e.target.closest("[data-nuevo]")) { d.cerrar(); CP.crearProducto(r, listo); }
    });
    return d;
  };
  CP.crearProducto = function (r, listo) {
    var html = cab("Producto nuevo", "Se crea con lo que dice la factura; después lo completás en el catálogo") +
      '<div class="cp-cuerpo"><div class="cp-lista">' +
      '<div class="cp-dato"><small>Nombre</small><b>Arandela grower 8 mm × 1000</b></div>' +
      '<div class="cp-datos" style="grid-template-columns:1fr 1fr;margin:0"><div class="cp-dato"><small>Código del proveedor</small><b>AG8-1M</b></div><div class="cp-dato"><small>Costo</small><b>' + plata(r.costo) + "</b></div></div>" +
      '<div class="aviso urgente">' + ico("triangle-alert", "i-s") + "<span>Queda sin precio de venta hasta que lo pongas.</span></div></div></div>" +
      '<div class="cp-pie"><div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-oscuro" data-ok>' + ico("check", "i-s") + "Crear</button></div></div>";
    var d = CP.abrir(html, { clase: "chico" });
    d.el.querySelector("[data-ok]").addEventListener("click", function () { d.cerrar(); listo({ nom: "Arandela grower 8 mm × 1000", cod: "AG8-1M · nuevo, sin precio", nuevo: true }); });
    return d;
  };

  // ------------------------------------------------------------ vencimientos
  CP.vence = function (pago) { return pago === "Adelantado" ? "Pagada" : pago === "A 60 días" ? "Vence 17/12" : "Vence 17/11"; };

  // ------------------------------------------------------------ la revisión
  // compra: {proveedor, comprobante, fecha, renglones, foto (bool), banda, manual, pago}
  // o.alRegistrar(resultado) con {proveedor, comprobante, total, pago, renglones, nuevo}
  CP.revision = function (compra, o) {
    o = o || {};
    var rs = compra.renglones.slice();
    var pago = compra.pago || "A 30 días";
    var pagos = ["Adelantado", "A 30 días", "A 60 días"];
    var comprobantes = ["Factura A", "Remito", "Sin comprobante"];
    var comp = compra.comprobante || "Factura A";
    var foto = !!compra.foto && !celu;
    var cuantosDudosos = function () { return rs.filter(function (r) { return r.dudoso; }).length; };
    var nuevos = 0;

    var datos = compra.manual
      ? '<div class="cp-pago" style="margin-bottom:12px"><small>Comprobante</small><div class="segmentos" data-comp>' + comprobantes.map(function (c) { return "<button" + (c === comp ? ' class="elegido"' : "") + ">" + c + "</button>"; }).join("") + "</div></div>"
      : (celu ? "" : '<div class="cp-datos"><div class="cp-dato"><small>' + ico("circle-check", "i-s") + "Proveedor</small><b>" + compra.proveedor + '</b></div><div class="cp-dato"><small>' + ico("circle-check", "i-s") + "Comprobante</small><b>" + comp + '</b></div><div class="cp-dato"><small>' + ico("circle-check", "i-s") + "Fecha</small><b>" + (compra.fecha || "19/10/2026") + "</b></div></div>");
    var banda = compra.banda ? '<div class="cp-banda">' + ico("link", "i-s") + "<span>" + compra.banda + "</span></div>" : "";
    var agregar = compra.manual ? '<button class="btn btn-suave" data-agregar style="width:100%;margin-top:8px">' + ico(celu ? "scan-barcode" : "plus", "i-s") + (celu ? "Escanear un producto" : "Agregar producto (escaneá o buscá)") + "</button>" : "";
    var lista = '<div data-lista></div>' + agregar;
    var papel = foto ? '<div class="cp-papel"><div class="cp-hojita"><img src="' + FACTURA + '" alt="Foto de la factura">' +
      rs.map(function (r, i) { return r.marca == null ? "" : '<span class="cp-marca' + (r.dudoso ? " dudosa" : "") + '" data-m="' + i + '" style="top:' + r.marca + '%"></span>'; }).join("") +
      '<span class="cp-escaner"></span></div><div class="t-detalle" style="margin-top:10px;display:flex;gap:6px;align-items:center">' + ico("circle-check", "i-s") + "Los renglones suman lo mismo que el subtotal</div></div>" : "";
    var sub = compra.manual ? "Cargada a mano · " + compra.proveedor : (celu ? comp + " · " + (compra.fecha || "19/10/2026") : (compra.subtitulo || "Revisá lo leído y registrá"));
    var titulo = celu ? compra.proveedor : (compra.titulo || (compra.foto ? "Revisar la factura" : "Registrar la compra"));
    var pie = '<div class="cp-pago"><small>Cómo se paga · <span class="cp-vence" data-vence>' + CP.vence(pago) + '</span></small><div class="segmentos" data-pago>' +
      pagos.map(function (p) { return "<button" + (p === pago ? ' class="elegido"' : "") + ">" + p + "</button>"; }).join("") + "</div></div>";
    var total = '<div class="cp-total"><small data-cuenta></small><b data-total></b></div>';
    var boton = '<button class="btn btn-accion grande cp-llenar" data-registrar><span data-txt>Registrar</span>' + (celu ? "" : ' <span class="kbd">F2</span>') + "</button>";
    var html = cab(titulo, sub, celu ? '<div class="cp-total" style="margin-right:4px"><b data-total style="font-size:22px;line-height:26px"></b><small>sin IVA</small></div>' : "") +
      '<div class="cp-cuerpo">' + (foto ? '<div class="cp-rev">' + papel + "<div>" + datos + banda + lista + "</div></div>" : datos + banda + lista) + "</div>" +
      (celu ? '<div class="cp-pie">' + pie + '<button class="btn btn-accion grande cp-llenar" data-registrar style="justify-content:space-between"><span data-txt>Registrar compra</span><span data-cuenta style="font-size:15px;opacity:.9"></span></button></div>'
        : '<div class="cp-pie">' + pie + '<div class="cp-der">' + total + boton + "</div></div>");
    var d = CP.abrir(html, { clase: foto ? "ancho" : "medio" + (celu ? " alta" : ""), tipo: celu ? "hoja" : "dialogo", foco: false });
    var el = d.el;
    var listaEl = el.querySelector("[data-lista]");
    function pintarLista(animar) {
      listaEl.innerHTML = rs.length ? rs.map(function (r, i) { return CP.renglonHTML(r, i, { pedi: !celu && compra.pedido }); }).join("")
        : '<div class="aviso pino">' + ico("info", "i-s") + "<span>" + (celu ? "Escaneá cada producto que llegó." : "Todavía no hay productos. Escaneá o buscá cada uno.") + "</span></div>";
      pintar(listaEl);
      if (animar && foto) $$(".cp-ren", listaEl).forEach(function (f, i) { f.style.animationDelay = (i * 60) + "ms"; f.classList.add("cp-nuevo"); });
    }
    function totales(antes) {
      var t = CP.suma(rs);
      var tEl = $$("[data-total]", el);
      tEl.forEach(function (x) { if (antes == null) x.innerHTML = plata(t); else CP.rodar(x, plata(t), t > antes); });
      var dud = cuantosDudosos();
      $$("[data-cuenta]", el).forEach(function (x) {
        x.textContent = celu ? (dud ? dud + " para revisar" : rs.length + " renglones") : rs.length + " renglones" + (dud ? " · " + dud + " para revisar" : nuevos ? " · " + nuevos + " nuevo" : "");
      });
      var reg = el.querySelector("[data-registrar]");
      reg.disabled = !rs.length;
    }
    pintarLista(true);
    totales();
    // La foto se lee: una línea baja como un escáner y los renglones se pintan en orden
    if (foto) {
      var esc2 = el.querySelector(".cp-escaner");
      var hojita = el.querySelector(".cp-hojita");
      setTimeout(function () {
        esc2.style.setProperty("--alto", hojita.offsetHeight + "px");
        esc2.classList.add("va");
        $$(".cp-marca", el).forEach(function (m, i) { setTimeout(function () { m.classList.add("si"); }, quieto() ? 0 : 450 + i * 60 + (m.classList.contains("dudosa") ? 200 : 0)); });
      }, quieto() ? 0 : 150);
      // pasar por una fila resalta su renglón en la foto
      listaEl.addEventListener("mouseover", function (e) {
        var f = e.target.closest(".cp-ren"); if (!f) return;
        var i = f.getAttribute("data-r");
        $$(".cp-marca", el).forEach(function (m) { m.classList.toggle("foco", m.getAttribute("data-m") === i); });
        $$(".cp-ren", listaEl).forEach(function (x) { x.classList.toggle("cp-foco", x === f && !x.classList.contains("cp-dudoso")); });
      });
    }
    function resolver(i, prod) {
      var r = rs[i];
      var antes = CP.suma(rs);
      rs[i] = Object.assign({}, r, { dudoso: false, nom: prod.nom, cod: prod.cod, foto: null, icono: "package", tipo: prod.nuevo ? "sube" : "igual", dif: prod.nuevo ? "nuevo" : "sin lista" });
      if (prod.nuevo) nuevos++;
      var viejo = listaEl.querySelector('[data-r="' + i + '"]');
      var tmp = document.createElement("div"); tmp.innerHTML = CP.renglonHTML(rs[i], i, { pedi: !celu && compra.pedido }); pintar(tmp);
      var nuevo = tmp.firstChild;
      viejo.replaceWith(nuevo);
      CP.entrar(nuevo);
      var m = el.querySelector('.cp-marca[data-m="' + i + '"]'); if (m) m.classList.remove("dudosa");
      totales(antes);
      if (o.alResolver) o.alResolver(prod);
    }
    el.addEventListener("click", function (e) {
      var f = e.target.closest(".cp-ren");
      if (e.target.closest("[data-elegir]") || (celu && f && f.classList.contains("cp-dudoso") && !e.target.closest("[data-crear]"))) {
        var i = Number(f.getAttribute("data-r"));
        CP.elegirProducto(rs[i], function (p) { resolver(i, p); });
        return;
      }
      if (e.target.closest("[data-crear]")) { var j = Number(f.getAttribute("data-r")); CP.crearProducto(rs[j], function (p) { resolver(j, p); }); return; }
      var seg = e.target.closest(".segmentos > button");
      if (seg) {
        $$("button", seg.parentNode).forEach(function (b) { b.classList.toggle("elegido", b === seg); });
        if (seg.parentNode.hasAttribute("data-pago")) { pago = seg.textContent; CP.rodar(el.querySelector("[data-vence]"), CP.vence(pago), true); }
        else comp = seg.textContent;
        return;
      }
      if (e.target.closest("[data-agregar]")) {
        var antes = CP.suma(rs);
        rs.push(CP.otroProducto());
        var tmp = document.createElement("div"); tmp.innerHTML = CP.renglonHTML(rs[rs.length - 1], rs.length - 1); pintar(tmp);
        if (rs.length === 1) listaEl.innerHTML = "";
        var n = tmp.firstChild; listaEl.appendChild(n); CP.entrar(n); CP.vibrar(10);
        totales(antes);
        return;
      }
      if (e.target.closest("[data-registrar]")) registrar();
    });
    function registrar() {
      var reg = el.querySelector("[data-registrar]");
      if (reg.classList.contains("lleno") || !rs.length) return;
      var dud = cuantosDudosos();
      if (dud) {
        var f = listaEl.querySelector(".cp-dudoso");
        CP.salta(f);
        CP.tostada("Primero decí qué producto es la arandela", { icono: "circle-help" });
        return;
      }
      reg.classList.add("lleno");
      reg.querySelector("[data-txt]").innerHTML = '<svg class="i cp-tilde" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px;margin-right:6px"><path d="M20 6 9 17l-5-5"/></svg>Registrada';
      CP.vibrar([10, 40, 10]);
      var res = { proveedor: compra.proveedor, comprobante: comp, total: CP.suma(rs), pago: pago, renglones: rs, nuevos: nuevos, manual: !!compra.manual };
      setTimeout(function () { d.cerrar(); if (o.alRegistrar) o.alRegistrar(res); }, quieto() ? 200 : 650);
    }
    d.registrar = registrar;
    var f2 = function (e) {
      if (d.cerrado) { document.removeEventListener("keydown", f2); return; }
      if (e.key === "F2" && pila[pila.length - 1] === d) { e.preventDefault(); registrar(); }
    };
    document.addEventListener("keydown", f2);
    return d;
  };

  // La compra de Bulonera Centro, tal como se lee de la foto
  CP.compraFactura = function () {
    return { proveedor: "Bulonera Centro", comprobante: "Factura A", fecha: "18/10/2026", foto: true, pedido: true, renglones: CP.renglonesFactura(),
      banda: "Es el <b>pedido del 14/10</b>: llegó todo, más arandelas sin pedir.", subtitulo: "Factura A 0004-00012345 · leída de la foto" };
  };
  CP.compraPedido = function (proveedor, resto) {
    return { proveedor: proveedor, comprobante: "Remito", manual: true, renglones: resto ? CP.renglonesResto() : CP.renglonesOeste(),
      banda: resto ? "Es <b>lo que faltaba</b> del pedido: alambre, clavos 3\" y bulones." : "Armada con el <b>pedido del 14/10</b>: corregí lo que no llegó.",
      titulo: "Llegó el pedido de " + proveedor, pago: "A 30 días" };
  };
  CP.compraMano = function () { return { proveedor: "Ferretera del Sur", comprobante: "Sin comprobante", manual: true, renglones: [], titulo: "Cargar una compra a mano", pago: "Adelantado" }; };

  // ------------------------------------------------------------ esperar la foto (computadora)
  CP.esperarFoto = function (listo, o) {
    o = o || {};
    var html = cab(o.titulo || "Sacale una foto a la factura", "Con el celular vinculado o con cualquier celular") +
      '<div class="cp-cuerpo"><div class="cp-espera"><div class="cp-qr"><img src="' + QR + '" alt="Código QR"></div><div>' +
      '<div class="t-renglon">Apuntá el celular al código</div><ol class="cp-pasos"><li><b>1</b>Se abre la cámara en el celular</li><li><b>2</b>Sacale foto a la factura entera</li><li><b>3</b>La compra aparece acá, leída</li></ol>' +
      '<div class="pastilla pino" style="margin-top:14px"><span class="punto"></span><span data-estado>Esperando la foto…</span></div></div></div></div>' +
      '<div class="cp-pie"><span class="t-detalle">' + ico("clock", "i-s") + ' Vale 9 minutos</span><div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-oscuro" data-ya>' + ico("smartphone", "i-s") + "Simular la foto</button></div></div>";
    var d = CP.abrir(html, { clase: "medio" });
    var hecho = false;
    var ya = function () {
      if (hecho || d.cerrado) return; hecho = true;
      var e = d.el.querySelector("[data-estado]"); e.textContent = "Llegó la foto. Leyendo…";
      e.parentNode.className = "pastilla logro";
      setTimeout(function () { d.cerrar(); listo(); }, quieto() ? 100 : 600);
    };
    d.el.querySelector("[data-ya]").addEventListener("click", ya);
    setTimeout(ya, o.ms || 2600);
    return d;
  };

  // ------------------------------------------------------------ la cámara (celular)
  // o.modo: "factura" (dispara y lee) o "codigos" (cada disparo escanea un producto)
  CP.camara = function (listo, o) {
    o = o || {};
    var codigos = o.modo === "codigos";
    var modos = ["Factura", "Remito", "Sin papel"];
    var html = '<div class="cp-cam" style="display:flex;flex-direction:column;height:100%;position:relative">' +
      '<div class="cp-cam-arriba"><button class="cp-redondo" data-cerrar aria-label="Cerrar">' + ico("x") + "</button>" +
      (codigos ? '<div style="flex:1;text-align:center;font-weight:800;font-size:16px">Escaneá lo que llegó</div>' : '<div class="cp-modos">' + modos.map(function (m, i) { return "<button" + (i === 0 ? ' class="elegido"' : "") + ">" + m + "</button>"; }).join("") + "</div>") +
      '<button class="cp-redondo" data-linterna aria-label="Linterna">' + ico("flashlight") + "</button></div>" +
      '<div class="cp-visor">' + (codigos ? '<div class="cp-mira"></div><div class="cp-escaneados" data-esc></div>'
        : '<div class="cp-guia"></div><div class="cp-papel-cam"><img src="' + FACTURA + '" alt="Factura">' + CP.renglonesFactura().map(function (r, i) { return '<span class="cp-marca' + (r.dudoso ? " dudosa" : "") + '" data-m="' + i + '" style="top:' + r.marca + '%"></span>'; }).join("") + '<span class="cp-escaner" style="background:#39C484"></span></div><span class="cp-leida">' + ico("circle-check", "i-s") + "Leída · 5 renglones</span>") +
      '</div><div class="cp-texto-cam" data-texto>' + (codigos ? "Apuntá al código de barras de cada producto" : "Encuadrá la factura entera") + "</div>" +
      '<div class="cp-cam-pie"><span></span><button class="cp-disparar" data-disparar aria-label="Sacar la foto"></button>' +
      (codigos ? '<button class="cp-redondo" data-listo aria-label="Listo" style="background:var(--accion)">' + ico("check") + "</button>" : "<span></span>") + '</div><div class="cp-flash"></div></div>';
    var d = CP.abrir(html, { tipo: "pantalla" });
    var el = d.el;
    var escaneados = [];
    el.addEventListener("click", function (e) {
      var m = e.target.closest(".cp-modos button");
      if (m) { $$(".cp-modos button", el).forEach(function (b) { b.classList.toggle("elegido", b === m); }); el.querySelector("[data-texto]").textContent = m.textContent === "Sin papel" ? "Sin papel: tocá el botón y escaneá los productos" : "Encuadrá " + (m.textContent === "Remito" ? "el remito" : "la factura") + " entera"; return; }
      var l = e.target.closest("[data-linterna]");
      if (l) { var on = l.classList.toggle("on"); l.style.background = on ? "#fff" : ""; l.style.color = on ? "var(--tinta)" : ""; return; }
      if (e.target.closest("[data-disparar]")) disparar();
      if (e.target.closest("[data-listo]")) { d.cerrar(); listo(escaneados); }
    });
    var leyendo = false;
    function disparar() {
      var fl = el.querySelector(".cp-flash"); fl.classList.remove("va"); fl.offsetWidth; fl.classList.add("va");
      CP.vibrar(10);
      if (codigos) {
        var p = CP.otroProducto(); p.cant = 1; escaneados.push(p);
        var cont = el.querySelector("[data-esc]");
        var tmp = document.createElement("div"); tmp.innerHTML = CP.renglonHTML(p, escaneados.length - 1); pintar(tmp);
        var n = tmp.firstChild; cont.appendChild(n); CP.entrar(n);
        while (cont.children.length > 3) cont.removeChild(cont.firstChild);
        el.querySelector("[data-texto]").textContent = escaneados.length + (escaneados.length === 1 ? " producto" : " productos") + " · tocá ✓ cuando termines";
        return;
      }
      var sinPapel = (el.querySelector(".cp-modos .elegido") || {}).textContent === "Sin papel";
      if (sinPapel) { d.cerrar(); listo({ sinPapel: true }); return; }
      if (leyendo) return; leyendo = true;
      var esc3 = el.querySelector(".cp-escaner"), papel = el.querySelector(".cp-papel-cam");
      esc3.style.setProperty("--alto", papel.offsetHeight + "px"); esc3.classList.add("va");
      el.querySelector("[data-texto]").textContent = "Leyendo…";
      $$(".cp-marca", el).forEach(function (mm, i) { setTimeout(function () { mm.classList.add("si"); if (mm.classList.contains("dudosa")) CP.vibrar(10); }, quieto() ? 0 : 400 + i * 60 + (mm.classList.contains("dudosa") ? 200 : 0)); });
      setTimeout(function () { el.querySelector(".cp-leida").classList.add("si"); el.querySelector("[data-texto]").textContent = "Listo: revisá lo leído"; }, quieto() ? 0 : 1000);
      setTimeout(function () { d.cerrar(); listo({}); }, quieto() ? 200 : 1600);
    }
    d.disparar = disparar;
    return d;
  };

  // ------------------------------------------------------------ foto a pantalla completa
  CP.verFoto = function (titulo, sub) {
    var html = '<div class="cp-cab"><div class="cp-tt"><b>' + (titulo || "Factura A 0004-00012345") + "</b><span>" + (sub || "Bulonera Centro · 18/10/2026") + '</span></div><button class="cp-redondo" data-cerrar aria-label="Cerrar">' + ico("x") + '</button></div><div class="cp-visor-foto" data-cerrar><img src="' + FACTURA + '" alt="Foto de la factura"></div>';
    return CP.abrir(html, { tipo: "pantalla", clase: celu ? "" : "cp-foto-compu" });
  };

  // ------------------------------------------------------------ detalle de una compra
  // c: {proveedor, cuando, comprobante, renglones (n), total, pago/estado, foto (bool), anulada, muestra: [renglones]}
  CP.detalle = function (c, o) {
    o = o || {};
    var muestra = c.muestra || CP.renglonesFactura().slice(0, 3);
    var resto = (c.n || muestra.length) - muestra.length;
    var estado = c.anulada ? '<span class="pastilla error">' + ico("ban", "i-s") + "Anulada</span>" : c.pagada ? '<span class="pastilla logro">' + ico("check", "i-s") + "Pagada</span>" : '<span class="pastilla">' + ico("calendar", "i-s") + (c.vence || "Vence 18/11") + "</span>";
    var comp = c.foto ? '<div class="cp-comp" data-ver><img src="' + FACTURA + '" alt="Comprobante"' + (c.anulada ? ' style="opacity:.5"' : "") + "></div>" : '<div class="cp-comp sin">' + ico("notebook-pen", "i-l") + "Sin comprobante</div>";
    var html = cab(c.proveedor, c.cuando + " · " + c.comprobante + " · " + (c.n || muestra.length) + " renglones", estado) +
      '<div class="cp-cuerpo"><div class="cp-detalle">' + comp + "<div>" +
      muestra.map(function (r, i) { return CP.renglonHTML(r, i, { soloVer: true }); }).join("") +
      (resto > 0 ? '<div class="cp-mas-ren">y ' + resto + " renglones más</div>" : "") +
      '<div style="margin-top:12px"><div class="cp-linea"><span>Total sin IVA</span><b' + (c.anulada ? ' style="text-decoration:line-through;color:var(--texto-3)"' : "") + ">" + plata(c.total) + '</b></div><div class="cp-linea"><span>Cómo se paga</span><b>' + (c.pago || "A 30 días") + '</b></div><div class="cp-linea"><span>La registró</span><b>' + (c.quien || "Marcelo Ríos") + "</b></div>" +
      (c.anulada ? '<div class="aviso error" style="margin-top:8px">' + ico("ban", "i-s") + "<span>Anulada el lunes por Carlos: estaba duplicada. No suma en la semana.</span></div>" : "") + "</div></div></div></div>" +
      '<div class="cp-pie">' + (c.anulada ? "" : '<button class="btn btn-peligro" data-anular>' + ico("ban", "i-s") + "Anular</button>") +
      '<div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cerrar</button>' + (!c.anulada && !c.pagada ? '<button class="btn btn-oscuro" data-pagar>' + ico("check", "i-s") + "Marcar pagada</button>" : "") + "</div></div>";
    var d = CP.abrir(html, { clase: "medio" });
    d.el.addEventListener("click", function (e) {
      if (e.target.closest("[data-ver]")) CP.verFoto(c.comprobante, c.proveedor + " · " + c.cuando);
      if (e.target.closest("[data-pagar]")) { d.cerrar(); if (o.alPagar) o.alPagar(); }
      if (e.target.closest("[data-anular]")) CP.confirmar("¿Anular la compra de " + c.proveedor + "?", "El stock que sumó se descuenta y deja de contar en la semana. Queda a la vista, tachada.", "Anular", function () { d.cerrar(); if (o.alAnular) o.alAnular(); });
    });
    return d;
  };

  CP.confirmar = function (titulo, texto, boton, si, o) {
    o = o || {};
    var html = cab(titulo) + '<div class="cp-cuerpo"><p class="t-cuerpo" style="margin:0;color:var(--texto-2)">' + texto + "</p></div>" +
      '<div class="cp-pie"><div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn ' + (o.clase || "btn-peligro") + '" data-si>' + boton + "</button></div></div>";
    var d = CP.abrir(html, { clase: "chico" });
    d.el.querySelector("[data-si]").addEventListener("click", function () { d.cerrar(); si(); });
    return d;
  };

  // ------------------------------------------------------------ armar un pedido
  CP.pedido = function (o, listo) {
    o = o || {};
    var provs = ["Bulonera Centro", "Distribuidora Oeste", "Ferretera del Sur", "Electro Lumen"];
    var prov = o.proveedor || "Ferretera del Sur";
    var rs = (o.renglones || [
      { foto: "pinza", nom: 'Pinza universal 8" Bahco', cod: "Quedan 2 · mínimo 6", cant: 4, u: "un.", costo: 9800 },
      { foto: "cinta-metrica", nom: "Cinta métrica 5 m × 19 mm", cod: "Quedan 1 · mínimo 4", cant: 3, u: "un.", costo: 5400 },
      { foto: "llave-combinada", nom: "Llave combinada 13 mm", cod: "Quedan 3 · mínimo 8", cant: 5, u: "un.", costo: 600 },
      { foto: "puntas", nom: "Puntas Phillips PH2 × 10", cod: "Quedan 0 · mínimo 5", cant: 5, u: "un.", costo: 380 }
    ]).map(function (r) { return Object.assign({}, r); });
    function filas() {
      return rs.map(function (r, i) {
        return '<div class="cp-pedren" data-p="' + i + '"><div class="foto"><img src="' + FOTOS + r.foto + '.webp" alt=""></div><div style="min-width:0"><div class="cp-nom">' + r.nom + '</div><div class="cp-det">' + r.cod + '</div></div><div class="cantidad"><button data-baja aria-label="Uno menos">' + ico("minus", "i-s") + '</button><span class="n">' + r.cant + '</span><span class="u">un.</span><button data-sube aria-label="Uno más">' + ico("plus", "i-s") + "</button></div></div>";
      }).join("");
    }
    var html = cab(o.titulo || "Armar pedido", "Lo que está bajo el mínimo, con lo que conviene pedir") +
      '<div class="cp-cuerpo"><div class="cp-chips-p">' + provs.map(function (p) { return '<span class="chip' + (p === prov ? " elegido" : "") + '">' + p + "</span>"; }).join("") + '</div><div data-filas>' + filas() + "</div>" +
      '<button class="btn btn-suave" data-sumar style="width:100%;margin-top:8px">' + ico("plus", "i-s") + "Sumar un producto</button></div>" +
      '<div class="cp-pie"><div class="cp-total" style="text-align:left"><small data-n></small><b data-t style="font-size:22px"></b></div><div class="cp-der"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-oscuro" data-mandar>' + ico("send", "i-s") + "Mandar por WhatsApp</button></div></div>";
    var d = CP.abrir(html, { clase: "medio" + (celu ? " alta" : "") });
    var el = d.el;
    function tot(antes) {
      var t = CP.suma(rs);
      el.querySelector("[data-n]").textContent = rs.length + " renglones · a " + prov;
      if (antes == null) el.querySelector("[data-t]").innerHTML = plata(t); else CP.rodar(el.querySelector("[data-t]"), plata(t), t > antes);
    }
    tot();
    el.addEventListener("click", function (e) {
      var ch = e.target.closest(".cp-chips-p .chip");
      if (ch) { prov = ch.textContent; $$(".cp-chips-p .chip", el).forEach(function (c) { c.classList.toggle("elegido", c === ch); }); tot(); return; }
      var f = e.target.closest("[data-p]");
      if (f && (e.target.closest("[data-sube]") || e.target.closest("[data-baja]"))) {
        var i = Number(f.getAttribute("data-p")), antes = CP.suma(rs);
        rs[i].cant = Math.max(0, rs[i].cant + (e.target.closest("[data-sube]") ? 1 : -1));
        CP.rodar(f.querySelector(".n"), String(rs[i].cant), !!e.target.closest("[data-sube]"));
        tot(antes); return;
      }
      if (e.target.closest("[data-sumar]")) {
        var p = CP.otroProducto(); p.cod = "Quedan 2 · mínimo 5"; var antes2 = CP.suma(rs); rs.push(p);
        var tmp = document.createElement("div"); tmp.innerHTML = filas(); var n = tmp.lastChild; pintar(tmp);
        el.querySelector("[data-filas]").appendChild(n); CP.entrar(n); tot(antes2); return;
      }
      if (e.target.closest("[data-mandar]")) {
        var b = e.target.closest("[data-mandar]"); b.classList.add("cp-llenar", "lleno"); b.innerHTML = "<span>Mandado</span>";
        setTimeout(function () { d.cerrar(); listo({ proveedor: prov, total: CP.suma(rs), n: rs.filter(function (r) { return r.cant > 0; }).length }); }, quieto() ? 100 : 450);
      }
    });
    return d;
  };

  // ------------------------------------------------------------ listas en hojas o paneles
  CP.filaHTML = function (f) {
    var ic = f.foto ? '<span class="cp-ic"><img src="' + FACTURA + '" alt=""' + (f.pos ? ' style="object-position:' + f.pos + '"' : "") + "></span>" : '<span class="cp-ic' + (f.rojo ? " rojo" : "") + '">' + ico(f.icono || "notebook-pen") + "</span>";
    return '<button class="cp-fila' + (f.anulada ? " anulada" : "") + '"' + (f.id ? ' data-f="' + f.id + '"' : "") + ">" + ic + '<span style="min-width:0"><b>' + f.titulo + '</b><span class="cp-d' + (f.rojo ? " rojo" : "") + '">' + f.detalle + "</span></span>" +
      (f.imp != null ? '<span class="cp-imp"><span>' + plata(f.imp) + "</span>" + (f.chico ? "<small>" + f.chico + "</small>" : "") + "</span>" : f.boton ? '<span class="btn btn-suave chico">' + f.boton + "</span>" : ico("chevron-right")) + "</button>";
  };
  CP.lista = function (titulo, sub, secciones, alTocar, o) {
    o = o || {};
    var html = cab(titulo, sub) + '<div class="cp-cuerpo">' + secciones.map(function (s) {
      return (s.titulo ? '<div class="cp-sec">' + s.titulo + "</div>" : "") + '<div class="cp-lista">' + s.filas.map(CP.filaHTML).join("") + "</div>";
    }).join("") + "</div>";
    var d = CP.abrir(html, { tipo: celu ? "hoja" : (o.tipo || "panel"), clase: celu ? "alta" : "" });
    d.el.addEventListener("click", function (e) { var f = e.target.closest("[data-f]"); if (f && alTocar) alTocar(f.getAttribute("data-f"), f, d); });
    return d;
  };

  // Las compras de la semana (las mismas en todas las variantes)
  CP.COMPRAS = {
    bulonera: { proveedor: "Bulonera Centro", cuando: "Hoy 09:40", comprobante: "Factura A", n: 7, total: 184300, pago: "A 30 días", vence: "Vence 18/11", foto: true,
      muestra: [{ foto: "tornillos", nom: 'Autoperforante T2 8 × 1" × 100', cant: 20, u: "un.", costo: 3800 }, { foto: "tarugos", nom: "Tarugos nylon S8 con tope × 100", cant: 15, u: "un.", costo: 3950 }, { foto: "mecha", nom: "Mecha acero rápido HSS 6 mm", cant: 30, u: "un.", costo: 1100 }] },
    oeste: { proveedor: "Distribuidora Oeste", cuando: "Ayer", comprobante: "Remito", n: 4, total: 96750, pago: "Adelantado", pagada: true, foto: true,
      muestra: [{ foto: "pinza", nom: 'Pinza universal 8" Bahco', cant: 5, u: "un.", costo: 9800 }, { foto: "cinta-metrica", nom: "Cinta métrica 5 m × 19 mm", cant: 6, u: "un.", costo: 5400 }] },
    sur: { proveedor: "Ferretera del Sur", cuando: "Jueves", comprobante: "Sin comprobante", n: 3, total: 22400, pago: "Al recibir", pagada: true, foto: false,
      muestra: [{ foto: "clavos", nom: 'Clavos punta París 2" por kilo', cant: 4, u: "kg", costo: 3050 }, { foto: "tarugos", nom: "Tarugos nylon S6 × 100", cant: 5, u: "un.", costo: 1600 }, { foto: "llave-combinada", nom: "Llave combinada 13 mm", cant: 2, u: "un.", costo: 1100 }] },
    lumen: { proveedor: "Electro Lumen", cuando: "Miércoles 15", comprobante: "Factura A", n: 12, total: 311900, pago: "A 30 días", vence: "Vence 14/11", foto: true,
      muestra: [{ foto: "lampara", nom: "Lámpara LED 9 W luz fría", cant: 120, u: "un.", costo: 1250 }, { foto: "lampara", nom: "Lámpara LED 12 W luz cálida", cant: 60, u: "un.", costo: 1680 }] },
    acindar: { proveedor: "Acindar Distribución", cuando: "Lunes 13", comprobante: "Factura A", n: 2, total: 58000, pago: "A 30 días", anulada: true, foto: true,
      muestra: [{ foto: "clavos", nom: 'Clavos punta París 3" por kilo', cant: 10, u: "kg", costo: 2950 }, { foto: null, icono: "package", nom: "Alambre galvanizado 17/15", cant: 9, u: "kg", costo: 3167 }] }
  };
  // Una compra recién registrada, para el detalle
  CP.desdeRegistro = function (res) {
    return { proveedor: res.proveedor, cuando: "Hoy " + CP.hora(), comprobante: res.comprobante, n: res.renglones.length, total: res.total, pago: res.pago, pagada: res.pago === "Adelantado",
      vence: CP.vence(res.pago), foto: res.comprobante !== "Sin comprobante" && !res.manual, muestra: res.renglones.slice(0, 3) };
  };
  CP.hora = function () { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };

  // Un número que se lee del texto de un elemento («$615.350» → 615350)
  CP.leer = function (el) { return Number((el.textContent || "").replace(/[^\d]/g, "")) || 0; };
  CP.sumarA = function (el, delta, pre) {
    if (!el) return 0;
    var v = CP.leer(el) + delta;
    CP.rodar(el, (pre === false ? "" : '<span class="peso">$</span>') + CP.miles(v), delta > 0);
    return v;
  };
})();

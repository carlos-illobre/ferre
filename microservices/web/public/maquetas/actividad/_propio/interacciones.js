/* Piezas comunes de las maquetas navegables de «Quién hizo qué»:
   capas (hoja, diálogo, menú), tostada, el menú «Más», los datos ficticios de cada día
   y el detalle de una acción. Sin librerías. Cada maqueta lo usa desde su script al pie. */
(function () {
  "use strict";
  var A = window.ACT = {};
  var reducido = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  A.reducido = function () { return reducido; };
  A.$ = function (s, r) { return (r || document).querySelector(s); };
  A.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  A.pintar = function (el) { if (window.pintarIconos) window.pintarIconos(el); };
  A.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };
  A.miles = function (n) { return Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  A.pesos = function (n) { return (n < 0 ? "−" : "") + "$" + A.miles(n); };
  A.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  A.ico = function (n, c) { return '<i class="i ' + (c || "i-s") + '" data-i="' + n + '"></i>'; };
  A.celu = function () { return !!document.querySelector(".celu"); };
  function raiz() { return document.querySelector(".celu") || document.body; }

  // ---------------------------------------------------------------- movimiento
  // Reemplaza el contenido de una lista con fundido y filas que entran escalonadas.
  A.cambiarLista = function (cont, html, modo) {
    cont.innerHTML = html;
    A.pintar(cont);
    var hijos = Array.prototype.slice.call(cont.children);
    hijos.forEach(function (h, i) {
      h.classList.remove("act-entra", "act-entra-der", "act-entra-izq");
      void h.offsetWidth;
      if (modo === "der" || modo === "izq") h.classList.add(modo === "der" ? "act-entra-der" : "act-entra-izq");
      else { h.style.setProperty("--d", Math.min(i, 12) * 20 + "ms"); h.classList.add("act-entra"); }
    });
  };
  // Pasar de página: lo viejo sale hacia un lado y lo nuevo entra del otro.
  A.pasarPagina = function (cont, html, adelante, sinPrimera) {
    if (reducido) { A.cambiarLista(cont, html); return; }
    A.$$(":scope > *", cont).forEach(function (h, i) { if (sinPrimera && i === 0) return; h.classList.add(adelante ? "act-sale-izq" : "act-sale-der"); });
    setTimeout(function () { A.cambiarLista(cont, html, adelante ? "der" : "izq"); }, 140);
  };
  // Un número que cambia: rueda hacia arriba si sube, hacia abajo si baja.
  A.rodar = function (el, html, sube) {
    if (el.getAttribute("data-valor") === html) return;
    el.setAttribute("data-valor", html);
    el.innerHTML = '<span class="rueda"><span class="' + (sube ? "sube" : "baja") + '">' + html + "</span></span>";
  };
  A.rebotar = function (el) { el.classList.remove("act-rebote"); void el.offsetWidth; el.classList.add("act-rebote"); };
  A.fundir = function (el) { el.classList.remove("act-funde"); void el.offsetWidth; el.classList.add("act-funde"); };

  // ---------------------------------------------------------------- capas
  var pila = [];
  A.hayCapa = function () { return pila.length > 0; };
  A.cerrarTodo = function () { while (pila.length) pila[pila.length - 1].cerrar(); };
  A.abrir = function (o) {
    var r = raiz(), enCelu = r !== document.body;
    var velo = document.createElement("div");
    velo.className = "capa-velo" + (o.tipo === "menu" ? " transparente" : "") + (enCelu ? " en-celu" : "");
    var p = document.createElement("div");
    p.className = "capa capa-" + o.tipo + (enCelu ? " en-celu" : "") + (o.clase ? " " + o.clase : "");
    p.setAttribute("role", o.tipo === "menu" ? "menu" : "dialog");
    if (o.titulo) p.setAttribute("aria-label", o.titulo);
    p.innerHTML = (o.tipo === "hoja" ? '<div class="asa" data-cerrar title="Cerrar"></div>' : "") + o.html;
    r.appendChild(velo); r.appendChild(p);
    A.pintar(p);
    if (o.tipo === "menu" && o.ancla) posicionar(p, o.ancla, o.lado || "abajo");
    var previo = document.activeElement;
    var capa = { el: p, velo: velo, cerrar: cerrar, cerrada: false };
    velo.addEventListener("click", function () { cerrar(); });
    p.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cerrar]");
      if (c && p.contains(c)) cerrar();
    });
    pila.push(capa);
    requestAnimationFrame(function () { requestAnimationFrame(function () { velo.classList.add("abierto"); p.classList.add("abierto"); }); });
    setTimeout(function () {
      var f = p.querySelector("[autofocus]") || p.querySelector(".op, input, button:not(.asa)");
      if (f && !capa.cerrada) try { f.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    }, 40);
    function cerrar() {
      if (capa.cerrada) return;
      capa.cerrada = true;
      pila.splice(pila.indexOf(capa), 1);
      velo.classList.remove("abierto"); p.classList.remove("abierto"); p.classList.add("cerrando");
      setTimeout(function () { velo.remove(); p.remove(); }, reducido ? 0 : 280);
      if (o.alCerrar) o.alCerrar();
      if (previo && previo.focus && document.contains(previo)) try { previo.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    }
    if (o.alAbrir) o.alAbrir(p, capa);
    return capa;
  };
  function posicionar(p, ancla, lado) {
    var a = ancla.getBoundingClientRect(), w = p.offsetWidth, h = p.offsetHeight;
    var x, y;
    if (lado === "derecha") { x = a.right + 8; y = a.top - 6; }
    else if (lado === "arriba-derecha") { x = a.right + 8; y = a.bottom - h + 6; }
    else if (lado === "abajo-der") { x = a.right - w; y = a.bottom + 6; }
    else { x = a.left; y = a.bottom + 6; }
    x = Math.max(8, Math.min(x, innerWidth - w - 8));
    y = Math.max(8, Math.min(y, innerHeight - h - 8));
    p.style.left = x + "px"; p.style.top = y + "px";
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); pila[pila.length - 1].cerrar(); }
  }, true);

  A.tostada = function (html, ico) {
    var r = raiz(), t = document.createElement("div");
    t.className = "capa-tostada" + (r !== document.body ? " en-celu" : "");
    t.setAttribute("role", "status");
    t.innerHTML = '<span class="tostada">' + A.ico(ico || "check") + html + "</span>";
    r.appendChild(t); A.pintar(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add("abierto"); }); });
    setTimeout(function () { t.classList.remove("abierto"); setTimeout(function () { t.remove(); }, 260); }, 2600);
    return t;
  };

  // Elegir uno de varios: menú chico en la computadora, hoja en el celular.
  // ops: [{v, html, fin, apagada}]; elegido: v; alElegir(v)
  A.elegir = function (ancla, titulo, ops, elegido, alElegir, lado) {
    var lista = ops.map(function (o) {
      if (o.sep) return '<div class="sep"></div>';
      return '<button class="op' + (o.v === elegido ? " elegida" : "") + (o.apagada ? " apagada" : "") + '" data-v="' + A.esc(o.v) + '" data-cerrar role="menuitemradio" aria-checked="' + (o.v === elegido) + '">' + o.html +
        '<span class="fin">' + (o.fin || "") + (o.v === elegido ? A.ico("check") : "") + "</span></button>";
    }).join("");
    var celu = A.celu();
    var capa = A.abrir({
      tipo: celu ? "hoja" : "menu", ancla: ancla, lado: lado, titulo: titulo,
      html: celu ? '<div class="capa-tit"><span class="t-seccion">' + titulo + '</span></div><div class="opciones">' + lista + "</div>" : lista
    });
    capa.el.addEventListener("click", function (e) {
      var b = e.target.closest(".op[data-v]");
      if (b) alElegir(b.getAttribute("data-v"));
    });
    capa.el.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var bs = A.$$(".op", capa.el), i = bs.indexOf(document.activeElement);
      e.preventDefault(); e.stopPropagation();
      var n = bs[(i + (e.key === "ArrowDown" ? 1 : -1) + bs.length) % bs.length]; if (n) n.focus();
    });
    return capa;
  };

  // «Más»: Anomalías, Procesos, Mejoras y errores, Configuración.
  var MAS = [
    ["anomalias", "triangle-alert", "Anomalías", "3 para mirar", true],
    ["procesos", "workflow", "Procesos", "Lo que corre solo cada noche"],
    ["mejoras-y-errores", "bug", "Mejoras y errores", "Lo que se pidió o falló"],
    ["configuracion", "settings", "Configuración", "Negocio, impresora y copias"]
  ];
  A.menuMas = function (ancla) {
    if (A.celu()) {
      return A.abrir({ tipo: "hoja", titulo: "Más", html: '<div class="capa-tit"><span class="t-seccion">Más</span></div>' + MAS.map(function (m) {
        return '<a class="mas-item" data-ir="' + m[0] + '" data-cerrar><span class="foto-icono">' + A.ico(m[1], "i") + '</span><span><span class="t-renglon" style="display:block">' + m[2] + '</span><span class="t-detalle">' + m[3] + "</span></span>" +
          (m[4] ? '<span class="pastilla urgente" style="height:24px">3</span>' : "<span></span>") + A.ico("chevron-right") + "</a>";
      }).join("") });
    }
    return A.abrir({ tipo: "menu", ancla: ancla, lado: ancla.closest(".lateral") ? "arriba-derecha" : "abajo-der", titulo: "Más", html: MAS.map(function (m) {
      return '<a class="op" data-ir="' + m[0] + '" data-cerrar role="menuitem" tabindex="0">' + A.ico(m[1], "i") + m[2] + (m[4] ? '<span class="fin"><span class="pastilla urgente" style="height:24px">3</span></span>' : "") + "</a>";
    }).join("") });
  };

  // ---------------------------------------------------------------- personas y tipos
  A.PERS = {
    mb: { ini: "MB", nombre: "Marcos", completo: "Marcos Benítez", disp: "Moto G54 de Marcos" },
    ci: { ini: "CI", nombre: "Carlos", completo: "Carlos Illobre", disp: "Compu del mostrador" },
    lf: { ini: "LF", nombre: "Lucía", completo: "Lucía Ferreyra", disp: "Samsung A15 de Lucía" },
    si: { ini: "", nombre: "Sistema", completo: "El sistema", disp: "El servidor" }
  };
  A.av = function (q, extra, inicial) {
    var p = A.PERS[q];
    var txt = q === "si" ? A.ico("user-cog") : (inicial ? p.ini.charAt(0) : p.ini);
    return '<span class="av ' + q + (extra ? " " + extra : "") + '">' + txt + "</span>";
  };
  A.TIPOS = {
    venta: { que: "Venta cobrada", ico: "shopping-cart", tono: "" },
    anulada: { que: "Venta anulada", ico: "ban", tono: "error" },
    margen: { que: "Cambio de margen", ico: "percent", tono: "urgente" },
    precio: { que: "Cambio de precio", ico: "percent", tono: "urgente" },
    stock: { que: "Ajuste de stock", ico: "package", tono: "urgente" },
    lista: { que: "Lista aplicada", ico: "file-text", tono: "" },
    compra: { que: "Compra recibida", ico: "truck", tono: "" },
    usuario: { que: "Usuario desactivado", ico: "user-x", tono: "" },
    entrada: { que: "Entró", ico: "log-in", tono: "" }
  };
  A.tipoIco = function (a, extra) { var t = A.TIPOS[a.tipo]; return '<span class="tipo-ico ' + (t.tono || "") + (extra ? " " + extra : "") + '">' + A.ico(t.ico, extra === "l" ? "i" : "i-s") + "</span>"; };

  // ---------------------------------------------------------------- fechas
  A.HOY = "2026-10-19";
  A.AHORA = 10 * 60 + 42;
  var DIA_C = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  var DIA_L = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MES_L = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  A.fecha = function (k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], 12); };
  A.clave = function (d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  A.sumar = function (k, n) { var d = A.fecha(k); d.setDate(d.getDate() + n); return A.clave(d); };
  A.diaCorto = function (k) { var d = A.fecha(k); return k === A.HOY ? "Hoy" : DIA_C[d.getDay()] + " " + d.getDate(); };
  A.diaLargo = function (k) { var d = A.fecha(k); return DIA_L[d.getDay()] + " " + d.getDate() + " de " + MES_L[d.getMonth()]; };
  A.dow = function (k) { return A.fecha(k).getDay(); };
  A.dd = function (k) { return A.fecha(k).getDate(); };
  A.dmy = function (k) { var p = k.split("-"); return p[2] + "/" + p[1]; };
  A.hhmm = function (m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); };
  A.cuando = function (a) {
    if (a.fecha === A.HOY) {
      var d = A.AHORA - a.min;
      return "Hoy " + a.hora + " · hace " + (d < 60 ? d + " minutos" : Math.floor(d / 60) + " h " + (d % 60) + " min");
    }
    if (a.fecha === A.sumar(A.HOY, -1)) return "Ayer " + a.hora;
    return A.diaCorto(a.fecha) + " · " + a.hora;
  };

  // ---------------------------------------------------------------- productos y ventas
  var PROD = [
    ["Tarugos nylon S8 con tope × 100", 9000, 4150], ["Mecha acero rápido HSS 8 mm", 4000, 1900],
    ["Cinta métrica PowerLock 5 m", 17000, 8400], ["Martillo carpintero Bahco 500 g", 28000, 13800],
    ["Pinza universal 8\" Bremen", 15000, 7300], ["Lámpara LED 9 W luz fría E27", 3000, 2350],
    ["Tornillos autoperforantes 8 × 1\" × 100", 6000, 2800], ["Llave combinada 13 mm Stanley", 9000, 4300],
    ["Pintura látex interior Alba 4 l", 38000, 19500], ["Puntas Phillips PH2 × 10", 7000, 3200],
    ["Cinta aisladora 3M 20 m", 2000, 900], ["Silicona transparente Fischer 280 ml", 8000, 3900],
    ["Lija al agua grano 120", 1000, 420], ["Clavos punta París 2\" (kg)", 5000, 2400],
    ["Mecha widia 6 mm Bosch", 5000, 2300], ["Cable unipolar 2,5 mm (m)", 1000, 480]
  ];
  A.PROD = PROD;
  var MEDIO = {
    efectivo: ["Efectivo", "en efectivo", "efectivo"], mp: ["Mercado Pago", "con Mercado Pago", "M. Pago"],
    tarjeta: ["Tarjeta", "con tarjeta", "tarjeta"], cuenta: ["Cuenta corriente", "a cuenta", "a cuenta"]
  };
  A.MEDIO = MEDIO;
  A.medioPastilla = function (m) {
    return '<span class="pastilla medio ' + m + '" style="background:var(--' + (m === "mp" ? "mp" : m) + '-suave);color:var(--' + m + ');height:24px">' + MEDIO[m][0] + "</span>";
  };
  function nv(n) { return String(Math.max(1, n)).padStart(4, "0"); }
  function semilla(txt) {
    var h = 1779033703 ^ txt.length;
    for (var i = 0; i < txt.length; i++) { h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  }
  A.semilla = semilla;
  function medioAl(r) { var x = r(); return x < .5 ? "efectivo" : x < .8 ? "mp" : x < .95 ? "tarjeta" : "cuenta"; }
  function itemsAl(r) {
    var n = 1 + Math.floor(r() * r() * 5), usados = {}, items = [];
    for (var i = 0; i < n; i++) {
      var j = Math.floor(r() * PROD.length); if (usados[j]) continue; usados[j] = 1;
      items.push([PROD[j][0], PROD[j][1], 1 + Math.floor(r() * r() * 4)]);
    }
    return items;
  }
  function total(items) { return items.reduce(function (s, it) { return s + it[1] * it[2]; }, 0); }
  function unidad(it) { return it[0].indexOf("(kg)") >= 0 ? it[2] + " kg" : it[0].indexOf("(m)") >= 0 ? it[2] + " m" : it[2] + " un."; }
  function nombreItem(it) { return it[0].replace(/ \((kg|m)\)$/, ""); }
  function llevaba(items) {
    var s = nombreItem(items[0]) + " · " + unidad(items[0]);
    return items.length > 1 ? s + " y " + (items.length - 1) + " más" : s;
  }
  function bajo(t) { return t.charAt(0).toLowerCase() + t.slice(1); }
  function cambio(a, b) { return '<span class="cambio"><s>' + a + '</s><span class="flecha">→</span>' + b + "</span>"; }
  A.cambio = cambio;

  // ---------------------------------------------------------------- constructores de acciones
  var nId = 0;
  function base(fecha, hora, quien, tipo) {
    var p = hora.split(":");
    return { id: "a" + (++nId), fecha: fecha, hora: hora, min: +p[0] * 60 + +p[1], quien: quien, tipo: tipo, kv: [], atajos: [], monto: "", montoTono: "" };
  }
  var hace = { venta: function (f, h, q, n, items, medio, totalFijo) {
    var a = base(f, h, q, "venta"), t = totalFijo || total(items), m = MEDIO[medio];
    var k = items.reduce(function (s, it) { return s + (it[0].indexOf("(") >= 0 ? 1 : it[2]); }, 0);
    a.venta = { n: n, items: items, total: t, medio: medio };
    a.det = "Venta " + n + " · " + k + " producto" + (k > 1 ? "s" : "") + " · <b>" + A.pesos(t) + "</b> " + m[1];
    a.corto = "Venta cobrada · " + A.pesos(t);
    a.sub = k + " producto" + (k > 1 ? "s" : "") + " · " + (medio === "mp" ? "Mercado Pago" : m[2]);
    a.q2 = "Venta cobrada · " + n; a.d2 = k + " producto" + (k > 1 ? "s" : "") + " · " + m[2]; a.monto = A.pesos(t);
    a.c2q = "Venta " + n;
    a.kv = [["Desde", A.PERS[q].disp], ["Venta", n + ", a las " + h], ["Llevaba", llevaba(items)], ["Total", A.medioPastilla(medio) + " " + A.pesos(t)]];
    if (f === A.HOY) a.atajos = [{ t: "Ver la venta", ir: "ventas-de-hoy" }];
    return a;
  }, anulada: function (f, h, q, n, cobrada, items, medio, motivo) {
    var a = base(f, h, q, "anulada"), t = total(items);
    a.venta = { n: n, items: items, total: t, medio: medio };
    a.det = "Venta " + n + " · <b>" + A.pesos(t) + "</b> · «" + motivo + "»";
    a.corto = "Venta anulada · " + A.pesos(t); a.sub = "«" + motivo + "»";
    a.q2 = "Anuló la venta " + n; a.d2 = "«" + motivo.charAt(0).toUpperCase() + motivo.slice(1) + "» · de " + cobrada;
    a.monto = "−" + A.pesos(t); a.montoTono = "error"; a.c2q = "Anuló la venta " + n;
    a.kv = [["Desde", A.PERS[q].disp], ["Venta", n + ", cobrada a las " + cobrada], ["Llevaba", llevaba(items)], ["Total", A.medioPastilla(medio) + " " + A.pesos(t)]];
    a.cita = "«" + motivo.charAt(0).toUpperCase() + motivo.slice(1) + "»";
    a.atajos = f === A.HOY ? [{ t: "Ver la venta", ir: "ventas-de-hoy" }] : [];
    return a;
  }, margen: function (f, h, q, prod, de, a2, pDe, pA, costo) {
    var a = base(f, h, q, "margen");
    a.prod = prod;
    a.det = prod + " · " + cambio(de + " %", a2 + " %") + " · " + cambio(A.pesos(pDe), A.pesos(pA));
    a.corto = "Margen de " + bajo(prod.split(" ").slice(0, 2).join(" ")); a.sub = cambio(de + " %", a2 + " %");
    a.q2 = "Margen de " + bajo(prod.split(" ").slice(0, 3).join(" ")); a.d2 = cambio(de + " %", a2 + " %") + " · ahora " + A.pesos(pA);
    a.monto = (pA >= pDe ? "+" : "−") + A.pesos(Math.abs(pA - pDe)).replace("−", ""); a.c2q = a.q2;
    a.kv = [["Producto", prod], ["Margen", cambio(de + " %", a2 + " %")], ["Precio", cambio(A.pesos(pDe), A.pesos(pA))], ["Costo", A.pesos(costo)], ["Desde", A.PERS[q].disp]];
    a.atajos = [{ t: "Abrir la ficha", ir: "productos" }];
    return a;
  }, precio: function (f, h, q, prod, pDe, pA, costo, nota) {
    var a = base(f, h, q, "precio");
    a.prod = prod;
    a.det = prod + " · " + cambio(A.pesos(pDe), A.pesos(pA)) + (nota ? " · «" + nota + "»" : "");
    a.corto = "Precio de " + bajo(prod.split(" ").slice(0, 2).join(" ")); a.sub = cambio(A.pesos(pDe), A.pesos(pA));
    a.q2 = "Precio de " + bajo(prod.split(" ").slice(0, 3).join(" ")); a.d2 = cambio(A.pesos(pDe), A.pesos(pA)) + " · costo " + A.pesos(costo);
    a.monto = (pA >= pDe ? "+" : "−") + A.pesos(Math.abs(pA - pDe)); a.c2q = a.q2;
    a.kv = [["Producto", prod], ["Precio", cambio(A.pesos(pDe), A.pesos(pA))], ["Costo", A.pesos(costo) + (pA < costo ? ' <span class="pastilla error" style="height:24px">Bajo el costo</span>' : "")], ["Desde", A.PERS[q].disp]];
    if (nota) a.cita = "«" + nota + "»";
    a.atajos = [{ t: "Abrir la ficha", ir: "productos" }];
    return a;
  }, stock: function (f, h, q, prod, de, a2, u, motivo) {
    var a = base(f, h, q, "stock"), dif = a2 - de;
    var fm = function (x) { return String(x).replace(".", ","); };
    a.prod = prod;
    a.det = prod + " · " + cambio(fm(de) + " " + u, fm(a2) + " " + u) + " · «" + motivo + "»";
    a.corto = "Stock de " + bajo(prod.replace("punta ", "").split(" ").slice(0, 3).join(" ")); a.sub = cambio(fm(de), fm(a2) + " " + u);
    a.q2 = "Ajustó " + prod.charAt(0).toLowerCase() + prod.slice(1); a.d2 = cambio(fm(de) + " " + u, fm(a2) + " " + u) + " · «" + motivo + "»";
    a.monto = (dif < 0 ? "−" : "+") + fm(Math.round(Math.abs(dif) * 10) / 10) + " " + u; a.c2q = a.q2;
    a.kv = [["Producto", prod], ["Stock", cambio(fm(de) + " " + u, fm(a2) + " " + u)], ["Diferencia", a.monto], ["Desde", A.PERS[q].disp]];
    a.cita = "«" + motivo.charAt(0).toUpperCase() + motivo.slice(1) + "»";
    a.atajos = [{ t: "Ver el stock", ir: "stock" }];
    return a;
  }, lista: function (f, h, q, prov, prods, camb) {
    var a = base(f, h, q, "lista");
    a.det = prov + " · " + A.miles(prods) + " productos · <b>" + camb + "</b> cambiaron de precio";
    a.corto = "Lista de " + prov; a.sub = camb + " precios cambiaron";
    a.q2 = "Aplicó la lista de " + prov; a.d2 = A.miles(prods) + " productos · " + camb + " cambiaron de precio"; a.c2q = "Lista de " + prov;
    a.kv = [["Proveedor", prov], ["Productos", A.miles(prods)], ["Cambiaron", camb + " precios"], ["Subieron", Math.round(camb * .93) + " · bajaron " + (camb - Math.round(camb * .93))], ["Desde", A.PERS[q].disp]];
    a.atajos = [{ t: "Ver la lista", ir: "listas" }];
    return a;
  }, compra: function (f, h, q, prov, fact, prods, t) {
    var a = base(f, h, q, "compra");
    a.det = prov + " · Fact. " + fact + " · " + prods + " productos · <b>" + A.pesos(t) + "</b>";
    a.corto = "Compra de " + prov; a.sub = prods + " productos · " + A.pesos(t);
    a.q2 = "Recibió una compra"; a.d2 = prov + " · " + prods + " productos"; a.monto = A.pesos(t); a.c2q = a.q2;
    a.kv = [["Proveedor", prov], ["Factura", fact], ["Productos", prods + " (el stock ya sumó)"], ["Total", A.pesos(t)], ["Desde", A.PERS[q].disp]];
    a.atajos = [{ t: "Ver la compra", ir: "compras" }];
    return a;
  }, usuario: function (f, h, q, quien, ses) {
    var a = base(f, h, q, "usuario");
    a.det = quien + " · se le cerraron <b>" + ses + " sesiones</b>";
    a.corto = "Desactivó a " + quien.split(" ")[0]; a.sub = ses + " sesiones cerradas";
    a.q2 = "Desactivó a " + quien; a.d2 = "Se le cerraron " + ses + " sesiones"; a.c2q = a.q2;
    a.kv = [["Usuario", quien], ["Qué", "Desactivado: ya no puede entrar"], ["Sesiones", "Se le cerraron " + ses], ["Desde", A.PERS[q].disp]];
    a.atajos = [{ t: "Ver usuarios", ir: "usuarios" }];
    return a;
  }, entrada: function (f, h, q, como, disp) {
    var a = base(f, h, q, "entrada");
    a.det = como + " · " + disp;
    a.corto = "Entró"; a.sub = como.toLowerCase() + " · " + disp.replace(" de " + A.PERS[q].nombre, "");
    a.q2 = "Entró"; a.d2 = como + " · " + disp; a.c2q = "Entró"; a.icoEntrada = como.indexOf("huella") >= 0 ? "fingerprint" : "log-in";
    a.kv = [["Cómo", como], ["Dispositivo", disp], ["Sesión", "Sigue abierta"]];
    return a;
  } };
  A.hace = hace;

  // ---------------------------------------------------------------- hoy: las 38 acciones
  function hoy() {
    var f = A.HOY, L = [];
    L.push(hace.venta(f, "10:41", "mb", "0412", [["Pinza universal 8\" Bremen", 24500, 1], ["Silicona transparente Fischer 280 ml", 8000, 1], ["Tornillos autoperforantes 8 × 1\" × 100", 6000, 1], ["Cinta aisladora 3M 20 m", 2000, 2], ["Lija al agua grano 120", 1000, 3]], "efectivo", 45500));
    L[0].det = "Venta 0412 · 5 productos · <b>$45.500</b> en efectivo";
    L.push(hace.margen(f, "10:37", "ci", "Tarugos nylon S8 × 100", 50, 100, 7000, 9000, 4150));
    L[1].corto = "Margen de tarugos S8"; L[1].q2 = "Margen de tarugos S8 × 100";
    L.push(hace.anulada(f, "10:30", "mb", "0409", "10:12", [["Cinta métrica PowerLock 5 m", 17000, 1]], "efectivo", "el cliente se arrepintió"));
    L.push(hace.stock(f, "10:22", "mb", "Clavos punta París 2\"", 12.4, 10, "kg", "bolsa rota"));
    L[3].corto = "Stock de clavos París 2\""; L[3].q2 = "Ajustó clavos punta París 2\"";
    L.push(hace.lista(f, "10:15", "ci", "Bulonera Centro", 1284, 312));
    L.push(hace.venta(f, "10:02", "mb", "0408", [["Llave combinada 13 mm Stanley", 9000, 1], ["Pinza universal 8\" Bremen", 15000, 1]], "mp"));
    L.push(hace.usuario(f, "09:48", "ci", "Lucía Ferreyra", 2));
    L.push(hace.compra(f, "09:31", "mb", "Distribuidora Oeste", "A-0004-12345", 18, 425000));
    L.push(hace.entrada(f, "09:05", "mb", "Con la huella", "Moto G54 de Marcos"));
    L.push(hace.entrada(f, "08:58", "ci", "Compu del mostrador", "abierta desde su celular"));
    L[9].kv = [["Cómo", "Con la sesión de su celular"], ["Dispositivo", "Compu del mostrador"], ["Sesión", "Sigue abierta"]];
    // Las 28 de antes de las 08:58 (páginas 2 a 4)
    var r = semilla("hoy"), num = 407;
    var plan = [];
    for (var i = 0; i < 19; i++) plan.push(["mb", "venta"]);
    plan.push(["mb", "stock"]);
    plan.push(["ci", "venta"], ["ci", "venta"], ["ci", "margen", "Mecha acero rápido HSS 10 mm", 5000, 8000], ["ci", "margen", "Mecha acero rápido HSS 8 mm", 3000, 4000], ["ci", "margen", "Mecha acero rápido HSS 6 mm", 2000, 3000], ["ci", "entrada2"]);
    plan.sort(function () { return r() - .5; });
    var min = 8 * 60 + 56;
    plan.forEach(function (p) {
      var h = A.hhmm(min); min -= 1 + Math.floor(r() * 2);
      if (p[1] === "venta") L.push(hace.venta(f, h, p[0], nv(num--), itemsAl(r), medioAl(r)));
      else if (p[1] === "stock") L.push(hace.stock(f, h, "mb", "Cinta aisladora 3M 20 m", 14, 12, "un.", "se usaron en el local"));
      else if (p[1] === "margen") L.push(hace.margen(f, h, "ci", p[2], 50, 100, p[3], p[4], Math.round(p[4] / 2)));
      else L.push(hace.entrada(f, h, "ci", "Con la huella", "Moto G54 de Carlos"));
    });
    L.push(hace.entrada(f, "08:05", "ci", "Con Google", "Compu del mostrador"));
    L.push(hace.entrada(f, "08:02", "mb", "Con Google", "Compu del mostrador"));
    return L;
  }

  // ---------------------------------------------------------------- los otros días
  var DIAS = {
    "2026-10-17": { gente: { mb: 40, lf: 18 }, anul: "mb" },
    "2026-10-16": { gente: { mb: 38, ci: 25 } },
    "2026-10-15": { gente: { mb: 30, ci: 17 } },
    "2026-10-14": { gente: { mb: 28, ci: 12, lf: 12 }, anul: "mb", fischer: true },
    "2026-10-13": { gente: { mb: 26, lf: 15 } }
  };
  A.cerrado = function (k) { return A.dow(k) === 0; };
  A.futuro = function (k) { return k > A.HOY; };
  function config(k) {
    if (DIAS[k]) return DIAS[k];
    var r = semilla("cfg" + k), n = 35 + Math.floor(r() * 30), m = Math.round(n * .62);
    var g = { mb: m }; g[r() < .5 ? "ci" : "lf"] = n - m;
    return { gente: g, anul: r() < .3 ? "mb" : null };
  }
  var cache = {};
  A.dia = function (k) {
    if (k === A.HOY) return cache[k] || (cache[k] = hoy());
    if (A.futuro(k) || A.cerrado(k)) return [];
    if (cache[k]) return cache[k];
    var cfg = config(k), r = semilla(k), L = [];
    var num = 412 - 45 * Math.round((A.fecha(A.HOY) - A.fecha(k)) / 864e5) - 6;
    var marcas = [];
    Object.keys(cfg.gente).forEach(function (q) {
      var hasta = q === "lf" && k === "2026-10-17" ? 18 * 60 + 50 : 19 * 60 + 50;
      for (var i = 0; i < cfg.gente[q]; i++) marcas.push({ q: q, min: 8 * 60 + 2 + Math.floor(r() * (hasta - 8 * 60 - 2)) });
    });
    marcas.sort(function (a, b) { return b.min - a.min; });
    var primero = {}; marcas.forEach(function (m, i) { primero[m.q] = i; });
    var anulPuesta = !cfg.anul, fischer = !cfg.fischer, lampara = !(k === "2026-10-17");
    marcas.forEach(function (m, i) {
      var h = A.hhmm(m.min), x = r();
      if (primero[m.q] === i) { L.push(hace.entrada(k, h, m.q, x < .6 ? "Con la huella" : "Con Google", x < .6 ? A.PERS[m.q].disp.replace("Compu del mostrador", "Moto G54 de Carlos") : "Compu del mostrador")); return; }
      if (!lampara && m.q === "lf") { lampara = true; L.push(hace.precio(k, "18:52", "lf", "Lámpara LED 9 W luz fría E27", 3000, 2000, 2350, "para que salgan")); return; }
      if (!fischer && m.q === "ci" && m.min < 17 * 60) { fischer = true; L.push(hace.lista(k, "16:20", "ci", "Fischer Argentina", 642, 118)); return; }
      if (!anulPuesta && m.q === cfg.anul && x < .08) { anulPuesta = true; var it = itemsAl(r); L.push(hace.anulada(k, h, m.q, nv(num + 2), A.hhmm(m.min - 9), it, medioAl(r), "se cobró dos veces")); return; }
      if (m.q === "ci" && x < .14) { var p = PROD[Math.floor(r() * 8)]; L.push(hace.margen(k, h, "ci", p[0], 50, 80, p[1] - 1000, p[1], p[2])); return; }
      if (m.q === "lf" && x < .08) { var p2 = PROD[8 + Math.floor(r() * 6)]; L.push(hace.precio(k, h, "lf", p2[0], p2[1], p2[1] + 1000, p2[2])); return; }
      if (x > .96) { var p3 = PROD[10 + Math.floor(r() * 4)]; L.push(hace.stock(k, h, m.q, p3[0].replace(" (kg)", ""), 20, 18, "un.", "se rompió en el estante")); return; }
      L.push(hace.venta(k, h, m.q, nv(num--), itemsAl(r), medioAl(r)));
    });
    if (!anulPuesta && L.length > 4) { var v = L[3]; if (v.tipo === "venta") L[3] = hace.anulada(k, v.hora, v.quien, v.venta.n, A.hhmm(v.min - 9), v.venta.items, v.venta.medio, "se cobró dos veces"); }
    return (cache[k] = L);
  };
  A.rango = function (desde, hasta) {
    if (desde > hasta) { var t = desde; desde = hasta; hasta = t; }
    var L = [], k = hasta > A.HOY ? A.HOY : hasta, n = 0;
    while (k >= desde && n++ < 120) { L = L.concat(A.dia(k)); k = A.sumar(k, -1); }
    return L;
  };
  // Ventas sueltas para abrir un paquete armado a mano en la maqueta.
  A.ventasSueltas = function (clave, f, q, n, desde, hasta, tot, medios, num0) {
    var r = semilla(clave), L = [], resto = tot, lista = [];
    Object.keys(medios).forEach(function (m) { for (var i = 0; i < medios[m]; i++) lista.push(m); });
    lista.sort(function () { return r() - .5; });
    for (var i = 0; i < n; i++) {
      var min = Math.round(hasta - (hasta - desde) * i / Math.max(1, n - 1));
      var t = i === n - 1 ? resto : Math.max(1000, Math.round(tot / n * (.4 + r() * 1.2) / 1000) * 1000);
      if (i < n - 1 && resto - t < 1000 * (n - 1 - i)) t = 1000;
      resto -= t;
      var j = Math.floor(r() * PROD.length), p = PROD[j], c = Math.max(1, Math.round(t / p[1]));
      var items = [[p[0], p[1], c]];
      var a = hace.venta(f, A.hhmm(min), q, nv(num0 - i), items, lista[i % lista.length] || "efectivo", t);
      L.push(a);
    }
    return L;
  };

  // ---------------------------------------------------------------- grupos y paquetes
  // Grupo para filtrar por «Qué». Cada variante usa su juego.
  A.GRUPOS = {
    venta: ["venta"], anulada: ["anulada"], precios: ["margen", "precio"], stock: ["stock"],
    otros: ["compra", "lista", "usuario"], entrada: ["entrada"], compra: ["compra"], lista: ["lista"], usuario: ["usuario"],
    revisar: ["margen", "precio", "stock"], precios2: ["margen", "precio", "lista"], stockcompras: ["stock", "compra"], gente: ["usuario", "entrada"]
  };
  A.filtrar = function (L, f) {
    return L.filter(function (a) {
      if (f.quien && f.quien !== "todos" && a.quien !== f.quien) return false;
      if (f.grupo && f.grupo !== "todo" && A.GRUPOS[f.grupo].indexOf(a.tipo) < 0) return false;
      return true;
    });
  };
  A.contar = function (L, g) { return L.filter(function (a) { return A.GRUPOS[g].indexOf(a.tipo) >= 0; }).length; };
  // Junta lo repetido seguido: 3 o más ventas, 2 o más márgenes.
  A.agrupar = function (L) {
    var out = [], i = 0;
    while (i < L.length) {
      var t = L[i].tipo, j = i;
      while (j < L.length && L[j].tipo === t) j++;
      var n = j - i;
      if ((t === "venta" && n >= 3) || (t === "margen" && n >= 2)) out.push(paquete(L.slice(i, j)));
      else for (var k = i; k < j; k++) out.push(L[k]);
      i = j;
    }
    return out;
  };
  function paquete(items) {
    var t = items[0].tipo, p = { paquete: true, tipo: t, items: items, desde: items[items.length - 1].hora, hasta: items[0].hora, quien: items[0].quien };
    if (t === "venta") {
      var c = { efectivo: 0, mp: 0, tarjeta: 0, cuenta: 0 }, s = 0;
      items.forEach(function (a) { c[a.venta.medio]++; s += a.venta.total; });
      p.q = items.length + " ventas cobradas";
      p.d = Object.keys(c).filter(function (m) { return c[m]; }).map(function (m) { return c[m] + " " + MEDIO[m][2]; }).join(" · ");
      p.monto = A.pesos(s); p.total = s;
    } else {
      p.q = items.length + " márgenes";
      p.d = items.map(function (a) { return a.prod.replace("Mecha acero rápido ", "Mecha "); }).join(", ");
      p.monto = "";
    }
    return p;
  }
  A.paquete = paquete;

  // ---------------------------------------------------------------- detalle de una acción
  A.detalleHtml = function (a) {
    var t = A.TIPOS[a.tipo], p = A.PERS[a.quien];
    var kv = [["Quién", '<span style="display:flex;gap:6px;align-items:center">' + A.av(a.quien, "", true).replace('class="av', 'style="width:22px;height:22px;font-size:14px" class="av') + p.completo + "</span>"]].concat(a.kv);
    return '<div class="det-cab"><span class="tipo-ico l ' + (t.tono || "") + '">' + A.ico(a.icoEntrada || t.ico, "i") + '</span><div><div class="t-renglon">' + t.que + '</div><div class="t-detalle">' + A.cuando(a) + "</div></div></div>" +
      '<dl class="kv">' + kv.map(function (x) { return "<dt>" + x[0] + "</dt><dd>" + x[1] + "</dd>"; }).join("") + "</dl>" +
      (a.cita ? '<div class="cita">' + a.cita + "</div>" : "");
  };
  A.atajosHtml = function (a, extra) {
    return (a.atajos || []).map(function (x) { return '<button class="btn chico btn-suave" data-ir="' + x.ir + '">' + x.t + A.ico("arrow-up-right") + "</button>"; }).join("") + (extra || "");
  };
  // Diálogo (compu) u hoja (celu) con el detalle completo.
  A.abrirDetalle = function (a, extra) {
    var celu = A.celu();
    return A.abrir({
      tipo: celu ? "hoja" : "dialogo", titulo: A.TIPOS[a.tipo].que,
      html: (celu ? "" : '<div style="display:flex;justify-content:flex-end;margin:-8px -8px 0 0;height:0"><button class="btn chico btn-fantasma btn-icono" data-cerrar aria-label="Cerrar">' + A.ico("x", "i") + "</button></div>") +
        '<div class="detalle-acc">' + A.detalleHtml(a) + "</div>" +
        '<div class="capa-pie">' + A.atajosHtml(a, extra) + (celu ? "" : '<button class="btn chico der" data-cerrar>Cerrar <span class="kbd">Esc</span></button>') + "</div>"
    });
  };

  // Fila de la lista entera (diálogo ancho de la computadora)
  A.filaLista = function (a) {
    return '<div class="la" data-id="' + a.id + '"><span class="h">' + a.hora + '</span><span class="p">' + A.av(a.quien) + A.PERS[a.quien].nombre + '</span><span class="q">' + A.tipoIco(a) + A.TIPOS[a.tipo].que + '</span><span class="d">' + a.det + "</span></div>";
  };
  A.buscar = function (id) {
    for (var k in cache) { var L = cache[k]; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; }
    return A.extra && A.extra[id];
  };
  A.extra = {};
  A.registrar = function (L) { L.forEach(function (a) { A.extra[a.id] = a; }); return L; };
})();

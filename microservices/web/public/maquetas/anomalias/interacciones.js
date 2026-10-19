/* Anomalías · piezas compartidas por las seis maquetas para que se puedan tocar.
   Datos ficticios, hojas, diálogos, menú chico, tostadas y movimiento (solo transform y
   opacity; con «reducir movimiento», nada se mueve). Cada maqueta lo usa al pie. */
(function () {
  var A = window.Anom = {};
  var quieto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  A.CURVA = "cubic-bezier(.2,.8,.2,1)"; A.SALIDA = "cubic-bezier(.4,0,1,1)"; A.REBOTE = "cubic-bezier(.34,1.4,.64,1)";
  A.celu = function () { return document.querySelector(".celu"); };
  A.foto = function (n) { return '<div class="foto"><img src="../../../_comun/fotos/' + n + '.webp" alt=""></div>'; };
  A.pesos = function (n) { return '<span class="peso">$</span>' + A.miles(n); };
  A.miles = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };

  /* ---------------- Movimiento ---------------- */
  A.anim = function (el, cuadros, op) {
    if (quieto || !el || !el.animate) return Promise.resolve();
    var a = el.animate(cuadros, Object.assign({ duration: 200, easing: A.CURVA }, op || {}));
    return a.finished.catch(function () {});
  };
  // Mueve los hermanos a su lugar nuevo sin saltos (FLIP) después de cambiar el DOM.
  A.flip = function (els, cambiar) {
    var antes = els.map(function (e) { return e.getBoundingClientRect().top; });
    cambiar();
    els.forEach(function (e, i) {
      if (!e.isConnected) return;
      var d = antes[i] - e.getBoundingClientRect().top;
      if (d) A.anim(e, [{ transform: "translateY(" + d + "px)" }, { transform: "none" }], { duration: 200 });
    });
  };
  // Saca un elemento: «arriba» se pliega hacia arriba, «izq» se desliza y se apaga.
  A.sacar = function (el, modo, hermanos) {
    var cuadros = modo === "izq"
      ? [{ transform: "none", opacity: 1 }, { transform: "translateX(-64px)", opacity: 0 }]
      : [{ transform: "none", opacity: 1, transformOrigin: "top" }, { transform: "translateY(-6px) scaleY(.6)", opacity: 0, transformOrigin: "top" }];
    var quitar = function () { A.flip((hermanos || []).filter(function (h) { return h !== el; }), function () { el.remove(); }); };
    if (quieto || !el.animate) { quitar(); return Promise.resolve(); }
    var an = el.animate(cuadros, { duration: 200, easing: A.SALIDA, fill: "forwards" });
    return an.finished.catch(function () {}).then(function () { quitar(); an.cancel(); });
  };
  A.entrar = function (el) {
    return A.anim(el, [{ transform: "translateY(8px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: A.REBOTE });
  };
  A.fundido = function (el) { return A.anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 }); };
  // Cambia un número: rueda hacia arriba si sube, hacia abajo si baja.
  A.rodar = function (el, html, sube) {
    if (!el || el.innerHTML === html) return;
    el.innerHTML = html;
    A.anim(el, [{ transform: "translateY(" + (sube ? 8 : -8) + "px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200 });
  };
  A.sacudir = function (el) {
    A.anim(el, [{ transform: "none" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "none" }], { duration: 240 });
  };
  A.apretar = function (el) { A.anim(el, [{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 120 }); };
  A.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };

  /* ---------------- Hojas, diálogos y menús ---------------- */
  var pila = [];
  // tipo: "hoja" (celular), "dialogo" (computadora), "menu" (al lado de ancla). Devuelve el panel.
  A.abrir = function (html, op) {
    op = op || {};
    var tipo = op.tipo || (A.celu() ? "hoja" : "dialogo");
    var cont = A.celu() || document.body;
    var velo = document.createElement("div");
    velo.className = "velo" + (tipo === "menu" && !A.celu() ? " claro" : "");
    var panel = document.createElement("div");
    panel.className = (tipo === "menu" && A.celu() ? "hoja" : tipo === "menu" ? "menu-chico" : tipo) + (op.clase ? " " + op.clase : "");
    panel.setAttribute("role", "dialog"); panel.tabIndex = -1;
    panel.innerHTML = (panel.classList.contains("hoja") ? '<div class="asa"></div>' : "") + html;
    cont.appendChild(velo); cont.appendChild(panel);
    if (window.pintarIconos) pintarIconos(panel);
    if (panel.classList.contains("menu-chico") && op.ancla) {
      var r = op.ancla.getBoundingClientRect();
      if (op.lado === "abajo") { panel.style.left = r.left + "px"; panel.style.top = (r.bottom + 6) + "px"; }
      else { panel.style.left = (r.right + 8) + "px"; panel.style.top = r.top + "px"; }
    }
    var item = { velo: velo, panel: panel, alCerrar: op.alCerrar };
    pila.push(item);
    velo.addEventListener("click", function () { A.cerrar(item); });
    panel.addEventListener("click", function (e) { if (e.target.closest("[data-cerrar]")) A.cerrar(item); });
    A.anim(velo, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    if (panel.classList.contains("hoja")) A.anim(panel, [{ transform: "translateY(100%)" }, { transform: "none" }], { duration: 320 });
    else if (panel.classList.contains("menu-chico")) A.anim(panel, [{ transform: "translateY(-4px) scale(.98)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 160 });
    else A.anim(panel, [{ transform: "scale(.96)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200 });
    try { panel.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    return panel;
  };
  A.cerrar = function (item) {
    item = item || pila[pila.length - 1];
    if (!item || item.cerrando) return;
    item.cerrando = true;
    pila.splice(pila.indexOf(item), 1);
    var p = item.panel;
    var fin = p.classList.contains("hoja")
      ? A.anim(p, [{ transform: "none" }, { transform: "translateY(100%)" }], { duration: 240, easing: A.SALIDA, fill: "forwards" })
      : A.anim(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 140, easing: A.SALIDA, fill: "forwards" });
    A.anim(item.velo, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" });
    fin.then(function () { item.velo.remove(); p.remove(); if (item.alCerrar) item.alCerrar(); });
  };
  A.hayAbierto = function () { return pila.length > 0; };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pila.length) { e.preventDefault(); A.cerrar(); } });
  A.cabecera = function (etiqueta, titulo) {
    return '<div class="ov-cab"><div>' + (etiqueta ? '<div class="t-etiqueta">' + etiqueta + '</div>' : "") + '<span class="t-seccion">' + titulo + '</span></div>' +
      '<button class="btn btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>';
  };

  /* ---------------- Tostadas ---------------- */
  A.tostada = function (texto, op) {
    op = op || {};
    var celu = A.celu(), cont = celu || document.body;
    var caja = cont.querySelector(".tostadas");
    if (!caja) { caja = document.createElement("div"); caja.className = "tostadas"; cont.appendChild(caja); }
    if (celu) {
      var c = celu.getBoundingClientRect(), tope = Array.prototype.filter.call(celu.querySelectorAll("[data-tostada-sobre], .barra-accion, .nav-inferior"), function (x) { return x.offsetParent !== null; })[0];
      caja.style.left = "50%"; caja.style.bottom = (c.bottom - tope.getBoundingClientRect().top + 12) + "px";
    } else {
      var m = document.querySelector(".contenido").getBoundingClientRect();
      caja.style.left = (m.left + m.width / 2) + "px"; caja.style.bottom = "96px";
    }
    caja.innerHTML = "";
    var t = document.createElement("div");
    t.className = "tostada" + (op.ambar ? " ambar" : "");
    t.innerHTML = '<i class="i i-s" data-i="' + (op.icono || "circle-check") + '"></i><span>' + texto + "</span>" + (op.deshacer ? '<button class="deshacer">Deshacer</button>' : "");
    caja.appendChild(t);
    if (window.pintarIconos) pintarIconos(t);
    A.anim(t, [{ transform: "translateY(12px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200 });
    var irse = function () { A.anim(t, [{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }).then(function () { t.remove(); }); };
    var reloj = setTimeout(irse, op.dura || 4000);
    if (op.deshacer) t.querySelector(".deshacer").addEventListener("click", function () { clearTimeout(reloj); irse(); op.deshacer(); });
    return t;
  };

  /* ---------------- El marco: Más ---------------- */
  var MAS = [["anomalias", "triangle-alert", "Anomalías", "Lo que no coincide"], ["procesos", "workflow", "Procesos", "Lo que corre solo"], ["mejoras-y-errores", "bug", "Mejoras y errores", "Pedidos y fallas"], ["configuracion", "settings", "Configuración", "Negocio, medios, impresora"]];
  A.pendientes = 5;
  A.abrirMas = function (ancla) {
    if (A.celu()) {
      var h = A.cabecera("", "Más") + '<div class="lista-mas">' + MAS.map(function (m) {
        return '<a data-ir="' + m[0] + '"' + (m[0] === "anomalias" ? ' class="activo"' : "") + '><span class="ico"><i class="i i-l" data-i="' + m[1] + '"></i></span><span><b>' + m[2] + "</b><small>" + m[3] + "</small></span>" +
          (m[0] === "anomalias" && A.pendientes ? '<span class="pastilla urgente" style="height:24px">' + A.pendientes + "</span>" : "<span></span>") + '<i class="i i-s ch" data-i="chevron-right"></i></a>';
      }).join("") + "</div>";
      return A.abrir(h, { tipo: "hoja" });
    }
    return A.abrir(MAS.map(function (m) {
      return '<a data-ir="' + m[0] + '"' + (m[0] === "anomalias" ? ' class="activo"' : "") + '><i class="i" data-i="' + m[1] + '"></i>' + m[2] +
        (m[0] === "anomalias" && A.pendientes ? '<span class="pastilla urgente">' + A.pendientes + "</span>" : "") + "</a>";
    }).join(""), { tipo: "menu", ancla: ancla });
  };
  document.addEventListener("click", function (e) {
    var m = e.target.closest && e.target.closest("[data-mas]");
    if (m) { e.preventDefault(); A.abrirMas(m); }
  });
  // La insignia de Más y las de las pestañas siguen a lo que queda por revisar.
  A.marcarPendientes = function (n) {
    var sube = n > A.pendientes; A.pendientes = n;
    document.querySelectorAll("[data-pendientes]").forEach(function (el) {
      if (n <= 0) { A.anim(el, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.6)" }], { duration: 200, fill: "forwards" }).then(function () { el.style.visibility = "hidden"; }); return; }
      A.rodar(el, String(n), sube);
    });
  };

  /* ---------------- Datos ficticios (los mismos en las seis) ---------------- */
  A.CAMBIOS = [
    { id: "v1", quien: "ana", tipo: "venta", icono: "receipt", hora: "17:52", monto: 25000, medio: "efectivo", medioTxt: "Efectivo", medioIco: "banknote",
      titulo: "Venta · 2 productos", det: "jue 15/10 17:52 · Efectivo", cab: "Cobrada sin conexión, sin registrar",
      prods: [{ f: "pinza", n: 'Pinza universal 8" aislada', d: "1 un. · Bahco", p: 17000, st: "7 → 6 un.", corto: "Pinza" }, { f: "tornillos", n: "Tornillos fix 6 × 50 × 100", d: "1 un. · Fixser", p: 8000, st: "48 → 47 un.", corto: "Tornillos" }],
      pasos: [["Cobrada", "jue 15/10 17:52 · celular"], ["Sesión cerrada", "jue 15/10 18:40"], ["Llegó al servidor", "hoy 09:14"]],
      efecto: [["calendar", "Entra en las ventas del <b>jue 15/10, 17:52</b>, a nombre de Ana."], ["package", 'Pinza 8": <span class="stockcambio">7 → 6 un.</span>'], ["package", 'Tornillos 6 × 50: <span class="stockcambio">48 → 47 un.</span>']],
      boton: "Aceptar venta", ok: "Venta de Ana registrada en el jue 15/10" },
    { id: "v2", quien: "ana", tipo: "venta", icono: "receipt", hora: "18:21", monto: 43000, medio: "mp", medioTxt: "Mercado Pago", medioIco: "qr-code",
      titulo: "Venta · 2 productos", det: "jue 15/10 18:21 · Mercado Pago", cab: "Cobrada sin conexión, sin registrar",
      prods: [{ f: "pintura", n: "Látex interior mate blanco 4 L", d: "1 un. · Alba", p: 38000, st: "9 → 8 un.", corto: "Látex" }, { f: "puntas", n: "Puntas Phillips PH2 × 10", d: "1 un. · Bremen", p: 5000, st: "0 → 0 un.", corto: "Puntas", falta: true }],
      pasos: [["Cobrada", "jue 15/10 18:21 · celular"], ["Sesión cerrada", "jue 15/10 18:40"], ["Llegó al servidor", "hoy 09:14"]],
      efecto: [["calendar", "Entra en las ventas del <b>jue 15/10, 18:21</b>, a nombre de Ana."], ["package", 'Látex 4 L: <span class="stockcambio">9 → 8 un.</span>'], ["triangle-alert", 'Puntas PH2: <span class="stockcambio">0 → 0 un.</span> No hay: se anota <b>1 anomalía</b>.', "urg"]],
      aviso: "Sin stock de puntas: se anota 1 anomalía.", boton: "Aceptar venta", ok: "Venta de Ana registrada en el jue 15/10" },
    { id: "a1", quien: "ana", tipo: "ajuste", icono: "scale", hora: "18:30",
      titulo: "Ajuste de stock", det: 'Clavos punta París 2" · −1,5 kg', cab: "Ajuste de stock sin registrar", etiqueta: "Ajuste",
      prods: [{ f: "clavos", n: 'Clavos punta París 2" por kilo', d: "−1,5 kg · motivo «Bolsa rota»", p: null, st: "12,4 → 10,9 kg", corto: "Clavos" }],
      pasos: [["Ajustado", "jue 15/10 18:30 · celular"], ["Sesión cerrada", "jue 15/10 18:40"], ["Llegó al servidor", "hoy 09:14"]],
      efecto: [["package", 'Clavos 2": <span class="stockcambio">12,4 → 10,9 kg</span>'], ["calendar", "El ajuste queda con la fecha de <b>hoy</b>; el motivo, «Bolsa rota»."]],
      boton: "Aceptar ajuste", ok: "Ajuste de clavos registrado: quedan 10,9 kg" },
    { id: "m1", quien: "ana", tipo: "margen", icono: "percent", hora: "18:35",
      titulo: "Cambio de margen", det: "Martillo carpintero 27 mm · 50 → 100 %", cab: "Cambio de margen sin registrar", etiqueta: "Precio",
      prods: [{ f: "martillo", n: "Martillo carpintero 27 mm", d: "Margen de 50 % a 100 % · Stanley", p: 32000, st: "$24.000 → $32.000", corto: "Martillo" }],
      pasos: [["Cambiado", "jue 15/10 18:35 · celular"], ["Sesión cerrada", "jue 15/10 18:40"], ["Llegó al servidor", "hoy 09:14"]],
      efecto: [["tags", 'Precio de lista: <span class="stockcambio">$24.000 → $32.000</span>'], ["calendar", "Rige desde que lo aceptás; las ventas del jueves no cambian."]],
      boton: "Aceptar margen", ok: "Martillo 27 mm: ahora $32.000" },
    { id: "c1", quien: "julian", tipo: "conteo", icono: "git-merge", hora: "vie 16/10", no: true,
      titulo: "Renglón de conteo", det: "Lámpara LED 9 W · se unió con otra", cab: "No se puede aplicar", etiqueta: "Conteo",
      prods: [{ f: "lampara", n: "Lámpara LED 9 W luz fría E27", d: "Contó 6 un. · Est. D-04-02", p: null, st: "—", corto: "Lámpara" }],
      pasos: [["Contado", "vie 16/10 17:10 · celular"], ["Sesión cerrada", "vie 16/10 19:00"], ["Llegó al servidor", "hoy 09:14"]],
      razon: "Este producto se unió con «Lámpara LED 9 W fría Macroled» después del conteo: el renglón ya no tiene a qué aplicarse. Solo se puede descartar.",
      boton: null, ok: "" }
  ];
  A.PERSONAS = { ana: { ini: "AG", n: "Ana Gómez", est: "Desactivada", disp: "Samsung A15 del local" }, julian: { ini: "JP", n: "Julián Pereyra", est: "Desactivado", disp: "Moto E13 propio" } };

  // Lo vendido sin stock (las 9 de esta semana).
  A.REGISTRO = [
    ["Hoy, lunes 19", "10:31", "mecha", "Vendieron 3, había 1: <b>faltaron 2 un.</b> · Martín Sosa · venta 4.821"],
    ["Hoy, lunes 19", "09:58", "tarugos", "Vendieron 1, no había: <b>faltó 1 un.</b> · Carlos Illobre · venta 4.809"],
    ["Ayer, domingo 18", "17:20", "puntas", "Vendieron 6, había 2: <b>faltaron 4 un.</b> · Martín Sosa · venta 4.790"],
    ["Ayer, domingo 18", "11:02", "clavos", "Vendieron 1 kg, había 0,7: <b>faltaron 0,3 kg</b> · Lucía Ferreyra · venta 4.776"],
    ["Sábado 17", "16:44", "mecha", "Vendieron 2, no había: <b>faltaron 2 un.</b> · Lucía Ferreyra · venta 4.752"],
    ["Sábado 17", "10:15", "puntas", "Vendieron 1, no había: <b>faltó 1 un.</b> · Martín Sosa · venta 4.731"],
    ["Viernes 16", "18:05", "cinta", "Vendieron 1, no había: <b>faltó 1 un.</b> · Carlos Illobre · venta 4.702"],
    ["Viernes 16", "11:30", "mecha", "Vendieron 4, había 2: <b>faltaron 2 un.</b> · Martín Sosa · venta 4.688"],
    ["Jueves 15", "12:40", "lampara", "Vendieron 1, no había: <b>faltó 1 un.</b> · Ana Gómez · venta 4.655"]
  ];
  A.PRODUCTOS = {
    mecha: { f: "mecha", n: "Mecha acero rápido HSS 8 mm", c: "Ezeta", est: "A-03-12", falta: "6 un.", sistema: 0, u: "un." },
    puntas: { f: "puntas", n: "Puntas Phillips PH2 × 10", c: "Bremen", est: "B-02-01", falta: "5 un.", sistema: 0, u: "un." },
    tarugos: { f: "tarugos", n: "Tarugos nylon S8 con tope × 100", c: "Fischer", est: "C-01-04", falta: "1 un.", sistema: 0, u: "un." },
    lampara: { f: "lampara", n: "Lámpara LED 9 W luz fría E27", c: "Macroled", est: "D-04-02", falta: "1 un.", sistema: 0, u: "un." },
    clavos: { f: "clavos", n: 'Clavos punta París 2" por kilo', c: "Acindar", est: "C-03-07", falta: "0,3 kg", sistema: 0, u: "kg" },
    cinta: { f: "cinta-metrica", n: "Cinta métrica PowerLock 5 m", c: "Stanley", est: "A-01-09", falta: "1 un.", sistema: 0, u: "un." }
  };
  A.htmlRegistro = function (filtro) {
    var dia = "", h = "";
    A.REGISTRO.forEach(function (r) {
      if (filtro && r[2] !== filtro) return;
      if (r[0] !== dia) { dia = r[0]; h += '<div class="ov-dia">' + dia + "</div>"; }
      h += '<div class="ov-ent"><span class="h">' + r[1] + '</span><div><div class="n">' + A.PRODUCTOS[r[2]].n + '</div><div class="d">' + r[3] + "</div></div></div>";
    });
    return h;
  };
  // El registro completo, en hoja o diálogo.
  A.abrirRegistro = function () {
    return A.abrir(A.cabecera("38 anotadas · 9 esta semana", "Vendido sin stock") +
      '<div class="aviso pino" style="margin-bottom:12px"><i class="i i-s" data-i="lock" style="margin-top:2px"></i><div>No se edita ni se borra: es lo que pasó.</div></div>' + A.htmlRegistro(), {});
  };
  // Las veces que faltó un producto.
  A.abrirProducto = function (clave, alContar) {
    var p = A.PRODUCTOS[clave];
    var veces = A.REGISTRO.filter(function (r) { return r[2] === clave; }).length;
    var panel = A.abrir(A.cabecera(p.c + " · Est. " + p.est, p.n) +
      '<div class="contar-prod">' + A.foto(p.f) + '<div><div class="t-detalle">Se vendió sin stock ' + veces + (veces === 1 ? " vez" : " veces") + ' esta semana</div><div class="t-numero" style="color:var(--error-texto)">Faltó ' + p.falta + "</div></div></div>" +
      '<div style="margin-top:12px">' + A.htmlRegistro(clave) + "</div>" +
      '<div class="ov-pie"><button class="btn btn-fantasma" data-cerrar>Cerrar</button>' + (alContar ? '<button class="btn btn-accion" data-contar><i class="i i-s" data-i="list-checks"></i>Contar ahora</button>' : "") + "</div>", {});
    if (alContar) panel.querySelector("[data-contar]").addEventListener("click", function () { A.cerrar(); setTimeout(function () { A.abrirContar(clave, alContar); }, 160); });
    return panel;
  };
  // Contar un producto: cuántas hay en el estante.
  A.abrirContar = function (clave, alGuardar) {
    var p = A.PRODUCTOS[clave], kg = p.u === "kg", n = kg ? 4.5 : 3;
    var fmt = function (v) { return kg ? v.toFixed(1).replace(".", ",") : String(v); };
    var panel = A.abrir(A.cabecera("Contar · Est. " + p.est, p.n) +
      '<div class="contar-prod">' + A.foto(p.f) + '<div><div class="t-detalle">El sistema dice <b style="color:var(--tinta)">0 ' + p.u + '</b>, pero se vendió: faltó ' + p.falta + '.</div><div class="t-detalle">Contá lo que hay en el estante.</div></div></div>' +
      '<div class="contar-num"><span class="t-renglon">Hay en el estante</span><span class="cantidad"><button data-menos aria-label="Uno menos"><i class="i" data-i="minus"></i></button><span class="n" data-n>' + fmt(n) + '</span><span class="u">' + p.u + '</span><button data-mas-uno aria-label="Uno más"><i class="i" data-i="plus"></i></button></span></div>' +
      '<div class="ov-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion' + (A.celu() ? " grande" : "") + '" data-guardar><i class="i i-s" data-i="check"></i>Guardar conteo</button></div>', {});
    var nEl = panel.querySelector("[data-n]");
    var paso = kg ? 0.5 : 1;
    panel.querySelector("[data-menos]").addEventListener("click", function () { if (n - paso >= 0) { n -= paso; A.rodar(nEl, fmt(n), false); } });
    panel.querySelector("[data-mas-uno]").addEventListener("click", function () { n += paso; A.rodar(nEl, fmt(n), true); });
    panel.querySelector("[data-guardar]").addEventListener("click", function () {
      A.cerrar(); A.vibrar([10, 40, 10]);
      A.tostada(p.n.split(" ").slice(0, 2).join(" ") + ": " + fmt(n) + " " + p.u + " en el estante · stock al día", { icono: "circle-check" });
      if (alGuardar) alGuardar(clave, n);
    });
    return panel;
  };
})();

/* Renglón de un producto anotado (pestaña Anotadas armada al tocarla) y su conteo. */
(function (A) {
  var CONTADOS = { clavos: "Contado ayer", cinta: "Contado sáb" };
  A.contados = function () { return Object.keys(CONTADOS).length; };
  A.htmlAnotado = function (clave) {
    var p = A.PRODUCTOS[clave], hecho = CONTADOS[clave];
    var veces = A.REGISTRO.filter(function (r) { return r[2] === clave; });
    var ult = veces[0];
    return '<div class="an-renglon tocable' + (hecho ? " hecho" : "") + '" data-prod="' + clave + '">' + A.foto(p.f) +
      '<div><div class="an-t">' + p.n + '</div><div class="an-d">' + veces.length + (veces.length === 1 ? " vez" : " veces") + " · " + ult[0].split(",")[0].toLowerCase() + " " + ult[1] + " · Est. " + p.est + "</div></div>" +
      '<div class="dato' + (hecho ? "" : " error") + '"><span class="et">' + (p.falta.indexOf("1 ") === 0 ? "Faltó" : "Faltaron") + '</span><span class="va">' + p.falta + "</span></div>" +
      '<div style="width:132px;display:flex;justify-content:flex-end">' + (hecho ? '<span class="pastilla logro"><i class="i i-s" data-i="check"></i>' + hecho + "</span>" : '<button class="btn btn-suave chico" data-contar><i class="i i-s" data-i="list-checks"></i>Contar</button>') + "</div>" +
      '<i class="i i-s ch" data-i="chevron-right"></i></div>';
  };
  // Deja el renglón contado: tachado de izquierda a derecha y el dato en gris.
  A.marcarContado = function (row, clave) {
    CONTADOS[clave] = "Contado hoy";
    row.classList.add("hecho");
    var dato = row.querySelector(".dato"); dato.classList.remove("error");
    var va = dato.querySelector(".va"); va.style.textDecoration = "none"; va.classList.add("tachado");
    var acc = row.querySelector("[data-contar]");
    if (acc) { var c = acc.parentNode; c.innerHTML = '<span class="pastilla logro"><i class="i i-s" data-i="check"></i>Contado hoy</span>'; if (window.pintarIconos) pintarIconos(c); A.entrar(c.firstChild); }
  };
})(window.Anom);

/* Un cambio que llegó sin conexión, abierto en diálogo (compu) u hoja (celu), con Descartar y Aceptar. */
(function (A) {
  A.porId = function (id) { return A.CAMBIOS.filter(function (c) { return c.id === id; })[0]; };
  A.htmlCambio = function (c, conPie) {
    var per = A.PERSONAS[c.quien];
    var de = { venta: "Venta", ajuste: "Ajuste", margen: "Cambio", conteo: "Conteo" }[c.tipo];
    var pill = c.medio
      ? '<span class="pastilla" style="background:var(--' + c.medio + '-suave);color:var(--' + c.medio + ')"><i class="i i-s" data-i="' + c.medioIco + '"></i>' + c.medioTxt + "</span>"
      : '<span class="pastilla ' + (c.no ? "error" : "contorno") + '"><i class="i i-s" data-i="' + c.icono + '"></i>' + c.etiqueta + "</span>";
    var h = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:-4px 0 12px">' + pill +
      '<span class="pastilla contorno"><i class="i i-s" data-i="smartphone"></i>' + c.pasos[0][1].replace(" · celular", "") + '</span><span class="pastilla contorno"><i class="i i-s" data-i="cloud-upload"></i>Llegó hoy 09:14</span></div>';
    h += c.prods.map(function (p) {
      return '<div style="display:grid;grid-template-columns:48px 1fr auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--borde)">' + A.foto(p.f).replace('class="foto"', 'class="foto" style="width:48px;height:48px"') +
        '<div><div class="t-renglon" style="font-size:15px;line-height:20px">' + p.n + '</div><div class="t-detalle">' + p.d + '</div></div><b class="num">' + (c.tipo === "venta" ? "$" + A.miles(p.p) : p.st) + "</b></div>";
    }).join("");
    if (c.tipo === "venta") h += '<div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:10px"><span class="t-etiqueta">Total</span><span class="t-numero num">' + A.pesos(c.monto) + "</span></div>";
    if (c.no) h += '<div class="aviso error" style="margin-top:12px"><i class="i i-s" data-i="git-merge" style="margin-top:2px"></i><div>' + c.razon + "</div></div>";
    else {
      h += '<div style="margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--fondo);display:grid;gap:8px"><b style="font-size:15px">' + (c.tipo === "venta" ? "Si la aceptás" : "Si lo aceptás") + "</b>" +
        c.efecto.map(function (e) { return '<div style="display:grid;grid-template-columns:16px 1fr;gap:10px;font-size:14px;line-height:20px;color:var(--texto-2);font-weight:550"><i class="i i-s" data-i="' + e[0] + '" style="margin-top:2px;color:var(--' + (e[2] ? "urgente" : "logro") + '-texto)"></i><div>' + e[1] + "</div></div>"; }).join("") + "</div>";
    }
    if (conPie !== false) h += '<div class="ov-pie' + (c.no ? " uno" : "") + '"><button class="btn btn-peligro" data-descartar><i class="i i-s" data-i="x"></i>Descartar</button>' +
      (c.no ? "" : '<button class="btn btn-accion" data-aceptar><i class="i i-s" data-i="check"></i>' + c.boton + "</button>") + "</div>";
    return { etiqueta: de + " de " + per.n + " · " + c.hora, titulo: c.cab, html: h };
  };
  A.abrirCambio = function (c, alDecidir) {
    var x = A.htmlCambio(c);
    var panel = A.abrir(A.cabecera(x.etiqueta, x.titulo) + x.html, {});
    panel.addEventListener("click", function (e) {
      var si = e.target.closest("[data-aceptar]"), no = e.target.closest("[data-descartar]");
      if (!si && !no) return;
      A.apretar(si || no); A.cerrar();
      if (si) A.vibrar([10, 40, 10]);
      alDecidir(!!si);
    });
    return panel;
  };
})(window.Anom);

/* Anotadas en el celular (pestaña de las variantes 1 y 2): tarjetas por producto y el registro. */
(function (A) {
  A.armarAnotadasCelu = function (cont) {
    var orden = ["mecha", "puntas", "tarugos", "lampara", "clavos", "cinta"];
    cont.innerHTML = '<div class="resumen-l" style="display:flex;gap:8px;align-items:center;font-size:14px;color:var(--texto-2);font-weight:600;margin:2px 0 12px;white-space:nowrap"><i class="i i-s" data-i="triangle-alert"></i><span><b style="color:var(--tinta)">9 esta semana</b> · faltaron 14 un. y 0,3 kg</span></div>' +
      orden.map(function (k) {
        var p = A.PRODUCTOS[k], veces = A.REGISTRO.filter(function (r) { return r[2] === k; }), hecho = k === "clavos" || k === "cinta";
        return '<div class="tocable" data-prod="' + k + '" style="display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:10px 12px;margin-bottom:8px;background:#fff;border:1px solid var(--borde);border-radius:16px;box-shadow:var(--sombra-1)">' +
          A.foto(p.f).replace('class="foto"', 'class="foto" style="width:44px;height:44px;border-radius:10px"') +
          '<div style="min-width:0"><div style="font-weight:750;font-size:15px;line-height:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + p.n + '</div><div class="t-detalle" data-estado>' + (hecho ? "Contado esta semana" : veces.length + (veces.length === 1 ? " vez" : " veces") + " · Est. " + p.est) + "</div></div>" +
          '<b data-falta style="font-weight:800;color:var(--' + (hecho ? "texto-3" : "error-texto") + ')">−' + p.falta + "</b></div>";
      }).join("") +
      '<div class="tocable" data-registro style="display:flex;align-items:center;gap:10px;height:52px;padding:0 14px;border-radius:14px;background:#fff;border:1px solid var(--borde);box-shadow:var(--sombra-1);font-weight:700;font-size:15px"><i class="i" data-i="lock"></i>Registro: no se edita ni se borra<i class="i i-s" data-i="chevron-right" style="margin-left:auto;color:var(--texto-3)"></i></div>';
    pintarIconos(cont);
    cont.addEventListener("click", function (e) {
      if (e.target.closest("[data-registro]")) { A.abrirRegistro(); return; }
      var row = e.target.closest("[data-prod]"); if (!row) return;
      var k = row.getAttribute("data-prod"), hecho = /texto-3/.test(row.querySelector("[data-falta]").getAttribute("style"));
      A.abrirProducto(k, hecho ? null : function () {
        var f = row.querySelector("[data-falta]"); f.style.color = "var(--texto-3)"; f.classList.add("tachado");
        row.querySelector("[data-estado]").textContent = "Contado hoy";
      });
    });
  };
})(window.Anom);

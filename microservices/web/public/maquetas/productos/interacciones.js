/* Interacciones de la maqueta de Productos: lo común a las seis variantes.
   Datos ficticios del catálogo, la cuenta del precio, capas (diálogo, hoja, menú, pantalla),
   tostadas, la foto ampliada, la cámara simulada, «Más» y la venta en curso.
   Va con <script src="../../interacciones.js"></script> después de iconos.js, y la página
   escribe lo suyo al pie. Solo transform y opacity; con «reducir movimiento» no se mueve nada. */
(function () {
  var M = window.Maq = {};
  var reducir = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  M.reducir = reducir;
  M.FOTOS = "../../../_comun/fotos/";
  M.CURVA = "cubic-bezier(.2,.8,.2,1)";
  M.SALIDA = "cubic-bezier(.4,0,1,1)";
  M.REBOTE = "cubic-bezier(.34,1.4,.64,1)";
  M.esCelu = function () { return !!document.querySelector(".celu"); };
  M.raiz = function () { return document.querySelector(".celu") || document.body; };

  // ---------- Movimiento ----------
  M.animar = function (el, frames, ms, curva) {
    if (!el || reducir || !el.animate) return null;
    return el.animate(frames, { duration: ms, easing: curva || M.CURVA });
  };
  M.despues = function (anim, fn) { if (anim) anim.onfinish = fn; else fn(); };
  M.apretar = function (el) { M.animar(el, [{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], 120); };
  M.rebotar = function (el) { M.animar(el, [{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(1)" }], 360, M.REBOTE); };
  M.entrar = function (el, dy) { M.animar(el, [{ opacity: 0, transform: "translateY(" + (dy == null ? 8 : dy) + "px)" }, { opacity: 1, transform: "none" }], 200); };
  M.fundir = function (el, ms) { M.animar(el, [{ opacity: .15 }, { opacity: 1 }], ms || 120); };
  // Un número que cambia: rueda hacia arriba si sube, hacia abajo si baja.
  M.rodar = function (el, html, sube) {
    if (!el) return;
    if (el.innerHTML === html) return;
    el.innerHTML = html;
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    M.animar(el, [{ opacity: 0, transform: "translateY(" + (sube ? 10 : -10) + "px)" }, { opacity: 1, transform: "none" }], 200);
  };
  // Un borde verde que se apaga en 1 s, encima del elemento (no se mete adentro: no cambia su contenido).
  M.brillar = function (el) {
    if (!el || !el.getBoundingClientRect) return;
    var r = el.getBoundingClientRect();
    if (!r.width) return;
    var b = document.createElement("span");
    b.className = "mq-brillo";
    b.style.cssText = "position:fixed;left:" + (r.left - 3) + "px;top:" + (r.top - 3) + "px;width:" + (r.width + 6) + "px;height:" + (r.height + 6) + "px;border-radius:" + (parseFloat(getComputedStyle(el).borderRadius) + 3 || 10) + "px;z-index:45";
    document.body.appendChild(b);
    var a = M.animar(b, [{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], 1000);
    if (a) M.despues(a, function () { b.remove(); }); else setTimeout(function () { b.remove(); }, 1000);
  };
  M.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p || 10); } catch (e) { /* sin vibración */ } };
  // Una miniatura de la foto vuela hacia Vender.
  M.volar = function (img, destino) {
    if (!img || !destino || reducir) return;
    var a = img.getBoundingClientRect(), b = destino.getBoundingClientRect();
    if (!a.width || !b.width) return;
    var c = img.cloneNode(true);
    c.style.cssText = "position:fixed;z-index:80;pointer-events:none;margin:0;left:" + a.left + "px;top:" + a.top + "px;width:" + a.width + "px;height:" + a.height + "px;object-fit:contain";
    document.body.appendChild(c);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    var an = M.animar(c, [{ transform: "none", opacity: 1 }, { transform: "translate(" + dx + "px," + dy + "px) scale(.25)", opacity: .3 }], 460, "cubic-bezier(.5,0,.75,0)");
    M.despues(an, function () { c.remove(); });
  };

  // ---------- Números y cuenta ----------
  M.miles = function (n) { return String(Math.floor(n + 1e-6)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  M.centavos = function (n) {
    var e = Math.floor(n + 1e-9), c = Math.round((n - e) * 100);
    if (c === 100) { e++; c = 0; }
    return "$" + M.miles(e) + "," + (c < 10 ? "0" : "") + c;
  };
  M.peso = function (n) { return '<span class="peso">$</span>' + M.miles(n); };
  M.precio = function (costo, margen) { return Math.ceil(costo * (1 + margen / 100) * 1.21 / 1000 - 1e-9) * 1000; };
  M.costo = function (p) { return p.costos[p.uso]; };
  M.precioDe = function (p) { return p.margen == null ? null : M.precio(M.costo(p), p.margen); };
  M.conMargen = function (p) { return M.costo(p) * (1 + (p.margen || 0) / 100); };
  M.conIva = function (p) { return M.conMargen(p) * 1.21; };
  M.stockTxt = function (p) { return p.stock === 0 ? "Sin stock" : (p.u === "kg" ? String(p.stock).replace(".", ",") + " kg" : p.stock + " un."); };
  M.ahora = function () { var d = new Date(); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
  M.ean = function (b12) { var s = 0; for (var i = 0; i < 12; i++) s += (+b12[i]) * (i % 2 ? 3 : 1); return b12 + ((10 - s % 10) % 10); };
  M.MARGENES = [300, 200, 100, 50, 25];

  // ---------- Proveedores y productos (ficticios, cierran con la regla del precio) ----------
  M.PROV = { O: "Dist. Oeste", B: "Bulonera Centro", S: "Ferretera del Sur", R: "Rexxi" };
  M.PROV_CORTO = { O: "Oeste", B: "Bulonera", S: "Del Sur", R: "Rexxi" };
  M.LISTA = { O: "06/10", B: "29/09", S: "02/09", R: "15/09" };
  M.P = [
    { id: "cinta", nom: "Cinta métrica PowerLock 5 m", corto: "Cinta PowerLock 5 m", marca: "Stanley", cod: "33-158", est: "B-02-07", ean: "7897065211580", stock: 6, foto: "cinta-metrica", margen: 50, uso: "O", costos: { O: 9350.85, B: 9980, S: 10420 }, antes: 16000, hist: 18 },
    { id: "mecha", nom: "Mecha acero rápido HSS 8 mm", corto: "Mecha HSS 8 mm", marca: "Ezeta", cod: "ME080", est: "A-03-12", ean: M.ean("779801200080"), stock: 14, foto: "mecha", margen: 100, uso: "O", costos: { O: 2610, B: 2480, R: 2550 }, antes: 7000, hist: 4 },
    { id: "martillo", nom: "Martillo carpintero 27 mm mango tubular", corto: "Martillo 27 mm", marca: "Bahco", cod: "MC27", est: "C-01-04", ean: M.ean("731601200270"), stock: 2, foto: "martillo", margen: 25, uso: "B", costos: { O: 16400, B: 15800, R: 17100 }, antes: 23000, hist: 6 },
    { id: "tarugos", nom: "Tarugos nylon S8 con tope × 100", corto: "Tarugos S8", marca: "Fischer", cod: "S8T", est: "A-05-02", ean: M.ean("400603204808"), stock: 3, foto: "tarugos", margen: null, uso: "O", costos: { O: 4150 }, antes: null, hist: 0 },
    { id: "pinza", nom: "Pinza universal 8\" aislada 1000 V", corto: "Pinza 8\" aislada", marca: "Bremen", cod: "PU8-1000", est: "C-02-01", ean: M.ean("779123400811"), stock: 7, foto: "pinza", margen: 50, uso: "O", costos: { O: 10200, S: 10900 }, antes: 17000, hist: 14 },
    { id: "puntas", nom: "Puntas Phillips PH2 × 25 mm × 10", corto: "Puntas PH2 × 10", marca: "Bremen", cod: "PH2-10", est: "A-01-08", ean: M.ean("779123400250"), stock: 0, foto: "puntas", margen: 100, uso: "B", costos: { O: 2140, B: 1980 }, antes: 5000, hist: 0 },
    { id: "lampara", nom: "Lámpara LED 9 W luz fría E27", corto: "Lámpara LED 9 W", marca: "Philips", cod: "LED9-E27", est: "D-04-03", ean: M.ean("871869600912"), stock: 48, foto: "lampara", margen: 100, uso: "R", costos: { O: 1220, R: 1150 }, antes: 3000, hist: -3 },
    { id: "pintura", nom: "Látex interior mate blanco 4 L", corto: "Látex blanco 4 L", marca: "Alba", cod: "LX4-BL", est: "E-01-02", ean: M.ean("779050100404"), stock: 9, foto: "pintura", margen: 50, uso: "S", costos: { O: 21500, S: 20700 }, antes: 32000, hist: 22 },
    { id: "llave", nom: "Llave combinada 13 mm cromada", corto: "Llave combinada 13 mm", marca: "Bahco", cod: "LC13", est: "C-03-06", ean: M.ean("731601201313"), stock: 11, foto: "llave-combinada", margen: 50, uso: "O", costos: { O: 6400, B: 6700 }, antes: 11000, hist: 9 },
    { id: "clavos", nom: "Clavos punta París 2\" por kilo", corto: "Clavos 2\" × kg", marca: "Acindar", cod: "CPP2", est: "F-02-01", ean: M.ean("779030200200"), stock: 12.4, u: "kg", foto: "clavos", margen: 100, uso: "O", costos: { O: 3250 }, antes: 7000, hist: 6 },
    { id: "tornillos", nom: "Tornillo autoperforante 8 × 1\" × 100", corto: "Autoperforante 8 × 1\"", marca: "Fixser", cod: "TA81", est: "A-04-05", ean: M.ean("779812300810"), stock: 20, foto: "tornillos", margen: 100, uso: "O", costos: { O: 4100 }, antes: 9000, hist: 11 },
    { id: "mecha-widia", nom: "Mecha widia para hormigón 6 mm", corto: "Mecha widia 6 mm", marca: "Ezeta", cod: "MW06", est: "A-03-14", ean: M.ean("779801200062"), stock: 25, foto: "mecha", margen: null, uso: "B", costos: { B: 1890, O: 1960 }, antes: null, hist: 0 },
    { id: "tornillo-madera", nom: "Tornillo madera 6 × 1 1/2\" × 100", corto: "Tornillo madera 6 × 1 1/2\"", marca: "Fixser", cod: "TM615", est: "A-04-07", ean: M.ean("779812300615"), stock: 12, foto: "tornillos", margen: null, uso: "O", costos: { O: 3600 }, antes: null, hist: 0 }
  ];
  // Cuánto subió el costo con la última lista (la bandeja de «Para remarcar»)
  var SUBE = { cinta: 11, mecha: 8, tornillos: 11, llave: 9, pinza: 14, pintura: 22, clavos: 6, martillo: 4 };
  M.P.forEach(function (p) { p.sube = SUBE[p.id] || 0; });
  M.INI = { O: "D", B: "B", S: "F", R: "R" };
  M.ARCHIVO = { O: "Lista_Oeste_Oct2026.xlsx", B: "Lista_Bulonera_Sep2026.xlsx", S: "Lista_DelSur_Sep2026.xlsx", R: "Lista_Rexxi_Sep2026.xlsx" };
  M.CANT_LISTA = { O: "4.312", B: "2.870", S: "3.105", R: "1.940" };
  M.masBarato = function (p) { var k = null; for (var j in p.costos) if (k === null || p.costos[j] < p.costos[k]) k = j; return k; };
  M.paraRemarcar = function (p) { var pr = M.precioDe(p); return p.antes != null && pr != null && pr > p.antes; };
  // Mueve «elegido» a otro segmento: el blanco se desliza desde donde estaba (200 ms).
  M.elegirSegmento = function (nuevo, clase) {
    clase = clase || "elegido";
    var viejo = nuevo.parentNode.querySelector("." + clase);
    if (viejo === nuevo) return;
    var dx = viejo ? viejo.getBoundingClientRect().left - nuevo.getBoundingClientRect().left : 0;
    if (viejo) viejo.classList.remove(clase);
    nuevo.classList.add(clase);
    if (viejo) M.animar(nuevo, [{ transform: "translateX(" + dx + "px)" }, { transform: "none" }], 200);
  };
  M.porId = function (id) { for (var i = 0; i < M.P.length; i++) if (M.P[i].id === id) return M.P[i]; return null; };
  M.fotoDe = function (p) { return M.FOTOS + p.foto + ".webp"; };

  // ---------- Código de barras (el mismo dibujo que ean.js, para redibujar) ----------
  var L = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
  var G = L.map(function (c) { return c.split("").map(function (b) { return b === "1" ? "0" : "1"; }).reverse().join(""); });
  var R = L.map(function (c) { return c.split("").map(function (b) { return b === "1" ? "0" : "1"; }).join(""); });
  var PAR = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];
  M.dibujarEan = function (svg, code) {
    if (!svg) return;
    if (code) svg.setAttribute("data-ean", code);
    var d = svg.getAttribute("data-ean").split("").map(Number), p = PAR[d[0]], s = "101", i;
    for (i = 1; i <= 6; i++) s += (p[i - 1] === "L" ? L : G)[d[i]];
    s += "01010";
    for (i = 7; i <= 12; i++) s += R[d[i]];
    s += "101";
    var out = "";
    for (i = 0; i < s.length; i++) if (s[i] === "1") {
      var largo = i < 3 || (i >= 45 && i < 50) || i >= 92;
      out += '<rect x="' + i + '" y="0" width="1" height="' + (largo ? 100 : 90) + '"/>';
    }
    svg.setAttribute("viewBox", "0 0 95 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = out;
  };
  M.iconos = function (raiz) {
    if (window.pintarIconos) window.pintarIconos(raiz || document);
    (raiz || document).querySelectorAll("svg[data-ean]").forEach(function (s) { if (!s.innerHTML) M.dibujarEan(s); });
  };
  // Cambia el ícono de un botón (el <i data-i> ya es un <svg class="i …">).
  M.icono = function (boton, nombre) {
    var v = boton && boton.querySelector("svg.i, svg.i-s, svg.i-l");
    if (!v) return null;
    var i = document.createElement("i");
    i.className = v.getAttribute("class");
    i.setAttribute("data-i", nombre);
    v.replaceWith(i);
    M.iconos(boton);
    return boton.querySelector("svg");
  };

  // ---------- Capas: diálogo, hoja, menú y pantalla completa ----------
  var pila = [];
  M.abrir = function (html, op) {
    op = op || {};
    var tipo = op.tipo || (M.esCelu() ? "hoja" : "dialogo");
    var raiz = M.raiz();
    var fondo = document.createElement("div");
    fondo.className = "mq-fondo" + (tipo === "menu" || tipo === "pantalla" ? " claro" : "");
    var panel = document.createElement("div");
    panel.className = "mq-panel mq-" + tipo + (op.clase ? " " + op.clase : "");
    panel.setAttribute("role", tipo === "menu" ? "menu" : "dialog");
    panel.innerHTML = (tipo === "hoja" ? '<div class="mq-agarre"></div>' : "") + html;
    raiz.appendChild(fondo);
    raiz.appendChild(panel);
    M.iconos(panel);
    if (tipo === "menu" && op.ancla) colocarMenu(panel, op.ancla, op.lado);
    var capa = { el: panel, fondo: fondo, tipo: tipo, abierta: true };
    capa.cerrar = function (sinAnimar) {
      if (!capa.abierta) return;
      capa.abierta = false;
      pila.splice(pila.indexOf(capa), 1);
      if (op.alCerrar) op.alCerrar();
      var a = sinAnimar ? null : salida(panel, tipo);
      if (!sinAnimar) M.animar(fondo, [{ opacity: 1 }, { opacity: 0 }], tipo === "hoja" ? 240 : 160, M.SALIDA);
      M.despues(a, function () { panel.remove(); fondo.remove(); });
    };
    fondo.addEventListener("click", function () { capa.cerrar(); });
    panel.addEventListener("click", function (e) {
      var c = e.target.closest("[data-cerrar], [data-ir]");
      if (c) capa.cerrar(!!c.hasAttribute("data-ir"));
    });
    pila.push(capa);
    entrada(panel, tipo);
    if (tipo !== "menu" && tipo !== "pantalla") M.animar(fondo, [{ opacity: 0 }, { opacity: 1 }], tipo === "hoja" ? 320 : 200);
    var foco = panel.querySelector("[autofocus], input");
    if (foco) setTimeout(function () { foco.focus(); }, 30);
    return capa;
  };
  function entrada(el, tipo) {
    if (tipo === "hoja") M.animar(el, [{ transform: "translateY(100%)" }, { transform: "none" }], 320);
    else if (tipo === "menu") M.animar(el, [{ opacity: 0, transform: "translateY(-4px) scale(.98)" }, { opacity: 1, transform: "none" }], 140);
    else if (tipo === "pantalla") M.animar(el, [{ opacity: 0, transform: "scale(1.04)" }, { opacity: 1, transform: "none" }], 240);
    else M.animar(el, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "none" }], 200);
  }
  function salida(el, tipo) {
    if (tipo === "hoja") return M.animar(el, [{ transform: "none" }, { transform: "translateY(100%)" }], 240, M.SALIDA);
    if (tipo === "pantalla") return M.animar(el, [{ opacity: 1 }, { opacity: 0 }], 200, M.SALIDA);
    return M.animar(el, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.97)" }], 140, M.SALIDA);
  }
  function colocarMenu(panel, ancla, lado) {
    var r = ancla.getBoundingClientRect(), raiz = M.raiz(), base = raiz === document.body ? { left: 0, top: 0, width: innerWidth, height: innerHeight } : raiz.getBoundingClientRect();
    var w = panel.offsetWidth, h = panel.offsetHeight, x, y;
    if (lado === "derecha") { x = r.right + 8; y = r.top; }
    else { x = r.right - w; y = r.bottom + 6; if (lado === "izquierda") x = r.left; }
    x = Math.max(8, Math.min(x - base.left, base.width - w - 8));
    y = Math.max(8, Math.min(y - base.top, base.height - h - 8));
    panel.style.left = x + "px";
    panel.style.top = y + "px";
  }
  M.cerrarTodo = function () { while (pila.length) pila[pila.length - 1].cerrar(true); };
  M.hayCapa = function () { return pila.length > 0; };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); pila[pila.length - 1].cerrar(); }
  }, true);

  // ---------- Tostadas ----------
  var tostadaViva = null;
  M.tostada = function (html, op) {
    op = op || {};
    if (tostadaViva) tostadaViva.cerrar(true);
    var caja = document.createElement("div");
    caja.className = "mq-tostadas";
    var abajo = op.abajo != null ? op.abajo : M.tostadaAbajo;
    if (abajo != null) caja.style.bottom = abajo + "px";
    caja.innerHTML = '<div class="tostada"><i class="i" data-i="' + (op.icono || "circle-check") + '"></i><span>' + html + "</span>" +
      (op.deshacer ? '<button class="mq-deshacer">Deshacer</button>' : "") + (op.ir ? '<button class="mq-deshacer" data-ir="' + op.ir[0] + '">' + op.ir[1] + "</button>" : "") + "</div>";
    M.raiz().appendChild(caja);
    M.iconos(caja);
    var t = caja.firstChild;
    M.animar(t, [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], 240, M.REBOTE);
    var viva = { cerrar: function (ya) { clearTimeout(viva.t); if (tostadaViva === viva) tostadaViva = null; var a = ya ? null : M.animar(t, [{ opacity: 1 }, { opacity: 0, transform: "translateY(8px)" }], 160, M.SALIDA); M.despues(a, function () { caja.remove(); }); } };
    if (op.deshacer) t.querySelector(".mq-deshacer").addEventListener("click", function () { op.deshacer(); viva.cerrar(); });
    viva.t = setTimeout(function () { viva.cerrar(); }, op.ms || 3200);
    tostadaViva = viva;
    return viva;
  };

  // ---------- La venta en curso (insignia de Vender) ----------
  // Entre las páginas del mismo celular (lista y ficha) la venta se recuerda en la pestaña.
  M.venta = { renglones: 3, total: 45500, lleva: {} };
  var guardada = null;
  try { guardada = sessionStorage.getItem("mq-productos-venta"); if (guardada) M.venta = JSON.parse(guardada); } catch (e) { /* sin almacenamiento */ }
  M.guardarVenta = function () { try { sessionStorage.setItem("mq-productos-venta", JSON.stringify(M.venta)); } catch (e) { /* sin almacenamiento */ } };
  M.alCambiarVenta = [];
  function avisarVenta() {
    M.guardarVenta();
    document.querySelectorAll("[data-venta-insignia]").forEach(function (el) { el.textContent = M.venta.renglones; M.rebotar(el); });
    M.alCambiarVenta.forEach(function (f) { f(M.venta); });
  }
  if (guardada) document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-venta-insignia]").forEach(function (el) { el.textContent = M.venta.renglones; });
    var chip = document.querySelector("[data-venta-chip]");
    if (chip) chip.textContent = "Venta: " + M.venta.renglones + " · $" + M.miles(M.venta.total);
  });
  M.agregar = function (p, op) {
    op = op || {};
    var pr = M.precioDe(p) || 0, nuevo = !M.venta.lleva[p.id];
    M.venta.lleva[p.id] = (M.venta.lleva[p.id] || 0) + 1;
    if (nuevo) M.venta.renglones++;
    M.venta.total += pr;
    if (op.desde) M.volar(op.desde, document.querySelector("[data-venta-destino]"));
    setTimeout(avisarVenta, op.desde && !reducir ? 420 : 0);
    if (M.esCelu()) M.vibrar(10);
    if (op.sinTostada) return;
    M.tostada("Agregado: <b>" + p.corto + "</b>" + (pr ? " · " + M.peso(pr) : " · sin precio"), {
      abajo: op.abajo, deshacer: function () { M.quitar(p); if (op.alDeshacer) op.alDeshacer(); }
    });
  };
  M.quitar = function (p) {
    if (!M.venta.lleva[p.id]) return;
    M.venta.lleva[p.id]--;
    M.venta.total -= M.precioDe(p) || 0;
    if (!M.venta.lleva[p.id]) { delete M.venta.lleva[p.id]; M.venta.renglones--; }
    avisarVenta();
  };

  // ---------- Más ----------
  M.MAS = [
    ["anomalias", "triangle-alert", "Anomalías", "3 para revisar"],
    ["procesos", "workflow", "Procesos", "Cómo se hace cada cosa"],
    ["mejoras-y-errores", "bug", "Mejoras y errores", "Lo que pediste y lo que falló"],
    ["configuracion", "settings", "Configuración", "Negocio, impuestos, impresora"]
  ];
  M.menuMas = function (ancla) {
    if (M.esCelu()) {
      return M.abrir('<div class="mq-cab"><span class="t-seccion">Más</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar"><i class="i i-s" data-i="x"></i></button></div><div class="mq-tarjetas">' +
        M.MAS.map(function (m) { return '<button data-ir="' + m[0] + '"><span class="ico"><i class="i" data-i="' + m[1] + '"></i></span><span><b>' + m[2] + "</b><small>" + m[3] + '</small></span><i class="i flecha" data-i="chevron-right"></i></button>'; }).join("") + "</div>", { tipo: "hoja" });
    }
    return M.abrir('<div class="mq-tit">Más</div>' + M.MAS.map(function (m) { return '<button data-ir="' + m[0] + '"><i class="i" data-i="' + m[1] + '"></i>' + m[2] + (m[0] === "anomalias" ? '<span class="pastilla urgente" style="margin-left:auto;height:24px">3</span>' : "") + "</button>"; }).join(""), { tipo: "menu", ancla: ancla, lado: "derecha" });
  };
  M.menuPersona = function (ancla, lado) {
    return M.abrir('<div class="mq-tit">Carlos Illobre · Administrador</div><button data-ir="usuarios"><i class="i" data-i="users"></i>Usuarios</button><button data-ir="configuracion"><i class="i" data-i="settings"></i>Configuración</button><div class="mq-sep"></div><button data-ir="entrar"><i class="i" data-i="log-out"></i>Cerrar sesión</button>', { tipo: "menu", ancla: ancla, lado: lado || "derecha" });
  };
  M.espejo = function (ancla) {
    var html = '<div class="mq-cab"><span class="t-seccion">' + (M.esCelu() ? "En espejo con la compu" : "Celular en espejo") + '</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="aviso logro"><i class="i" data-i="' + (M.esCelu() ? "monitor" : "smartphone") + '"></i><span>' + (M.esCelu() ? "Lo que escaneás acá aparece en la compu del mostrador." : "Moto G54 de Carlos: lo que escanea aparece acá.") + "</span></div>" +
      '<div class="mq-pie"><button class="btn btn-peligro" data-cerrar data-mq="desvincular"><i class="i i-s" data-i="unlink"></i>Desvincular</button><button class="btn" data-cerrar>Listo</button></div>';
    var c = M.abrir(html, ancla && !M.esCelu() ? { tipo: "menu", ancla: ancla } : {});
    if (c.tipo === "menu") c.el.style.padding = "16px";
    c.el.querySelector('[data-mq="desvincular"]').addEventListener("click", function () { M.tostada("Lo dejo como está: es una maqueta", { icono: "info" }); });
    return c;
  };

  // ---------- Foto ampliada ----------
  M.ampliarFoto = function (p) {
    return M.abrir('<div class="mq-cab"><span class="t-seccion">' + p.nom + '</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar (Esc)"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="mq-foto-g"><img src="' + M.fotoDe(p) + '" alt=""></div><div class="t-detalle" style="margin-top:10px">' + p.marca + " · Cód. " + p.cod + " · foto del 13/10</div>",
      { tipo: "dialogo", clase: M.esCelu() ? "" : "ancho" });
  };

  // ---------- Cámara simulada ----------
  // op: { modo: "codigo" | "foto", p: producto apuntado, alLeer: fn(p) }
  M.camara = function (op) {
    op = op || {};
    var p = op.p || M.P[0], foto = op.modo === "foto";
    var vista = '<div class="mq-vista" data-mq="vista" style="height:100%"><img class="obj" src="' + M.fotoDe(p) + '" alt="">' +
      (foto ? "" : '<div class="etq"><svg data-ean="' + p.ean + '"></svg><div>' + p.ean + "</div></div>") +
      '<div class="mq-marco' + (foto ? " foto" : "") + '"><i></i><i></i><i></i><i></i><b></b></div><div class="mq-flash"></div></div>';
    var capa, leido = false;
    function leer() {
      if (leido || !capa.abierta) return;
      leido = true;
      var marco = capa.el.querySelector(".mq-marco");
      if (foto) M.animar(capa.el.querySelector(".mq-flash"), [{ opacity: .9 }, { opacity: 0 }], 260);
      marco.classList.add("leido");
      M.animar(marco, [{ transform: getComputedStyle(marco).transform }, { transform: getComputedStyle(marco).transform + " scale(.94)" }, { transform: getComputedStyle(marco).transform }], 260);
      M.vibrar(10);
      var pill = capa.el.querySelector(".mq-leido");
      if (pill) { pill.style.opacity = 1; M.entrar(pill); }
      setTimeout(function () { capa.cerrar(); if (op.alLeer) op.alLeer(p); }, reducir ? 300 : 650);
    }
    if (M.esCelu()) {
      capa = M.abrir(vista.replace('style="height:100%"', 'style="position:absolute;inset:0"') +
        '<div class="mq-cam-arriba"><button class="mq-redondo" data-cerrar title="Cerrar"><i class="i i-l" data-i="x"></i></button><span style="flex:1"></span><button class="mq-redondo" data-mq="linterna" title="Linterna"><i class="i i-l" data-i="flashlight"></i></button></div>' +
        '<div class="mq-cam-ley">' + (foto ? "Encuadrá el producto y sacá la foto" : "Apuntá al código de barras") + "</div>" +
        '<div class="mq-cam-abajo">' + (foto ? '<button class="mq-disparo" data-mq="disparo" title="Sacar la foto"></button>Tocá para sacarla' : '<span class="mq-leido"><i class="i i-s" data-i="circle-check" style="color:var(--logro)"></i>' + p.ean + "</span>") + "</div>",
        { tipo: "pantalla" });
      capa.el.querySelector('[data-mq="linterna"]').addEventListener("click", function (e) { e.stopPropagation(); var v = capa.el.querySelector(".mq-vista"); v.style.filter = v.style.filter ? "" : "brightness(1.35)"; });
    } else {
      capa = M.abrir('<div class="mq-cab"><span class="t-seccion">' + (foto ? "Sacá la foto con el celular" : "Escaneá con el celular") + '</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cancelar (Esc)"><i class="i i-s" data-i="x"></i></button></div>' +
        '<div class="mq-tel">' + vista + '</div><div class="mq-espera"><span class="punto"></span>' + (foto ? "Moto G54 de Carlos · con la cámara abierta" : "Moto G54 de Carlos · apuntá al código") + '</div><div style="display:flex;justify-content:center;margin-top:10px"><span class="mq-leido" style="border:1px solid var(--borde)"><i class="i i-s" data-i="circle-check" style="color:var(--logro)"></i>' + (foto ? "Foto recibida" : p.ean) + "</span></div>" +
        '<div class="mq-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn" data-mq="ya">' + (foto ? "Sacar la foto" : "Simular la lectura") + "</button></div>", { tipo: "dialogo" });
      capa.el.querySelector('[data-mq="ya"]').addEventListener("click", leer);
    }
    capa.el.querySelector('[data-mq="vista"]').addEventListener("click", leer);
    var disparo = capa.el.querySelector('[data-mq="disparo"]');
    if (disparo) disparo.addEventListener("click", leer);
    if (!foto) setTimeout(leer, reducir ? 600 : 1600);
    capa.leer = leer;
    return capa;
  };

  M.cambiarFoto = function (p, alCambiar) {
    function listo() { M.tostada("Foto actualizada: <b>" + p.corto + "</b>"); if (alCambiar) alCambiar(); }
    var c = M.abrir('<div class="mq-cab"><span class="t-seccion">Cambiar la foto</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="mq-tarjetas"><button data-mq="sacar"><span class="ico"><i class="i" data-i="camera"></i></span><span><b>' + (M.esCelu() ? "Sacar una foto" : "Sacarla con el celular") + "</b><small>Se recorta sola, sin el fondo</small></span><i class=\"i flecha\" data-i=\"chevron-right\"></i></button>" +
      '<button data-mq="elegir"><span class="ico"><i class="i" data-i="image"></i></span><span><b>' + (M.esCelu() ? "Elegir de la galería" : "Elegir un archivo") + "</b><small>JPG, PNG o WEBP</small></span><i class=\"i flecha\" data-i=\"chevron-right\"></i></button></div>", {});
    c.el.querySelector('[data-mq="sacar"]').addEventListener("click", function () { c.cerrar(true); M.camara({ modo: "foto", p: p, alLeer: listo }); });
    c.el.querySelector('[data-mq="elegir"]').addEventListener("click", function () { c.cerrar(); setTimeout(listo, 200); });
    return c;
  };

  // ---------- Margen a mano ----------
  M.pedirMargen = function (p, alElegir) {
    var c = M.abrir('<div class="mq-cab"><span class="t-seccion">Otro margen</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="t-detalle" style="margin-bottom:10px">' + p.nom + " · costo " + M.centavos(M.costo(p)) + '</div><div class="mq-campo-margen"><input type="number" min="0" max="999" value="' + (p.margen || 40) + '" autofocus><b style="font-size:22px">%</b><span class="t-detalle" data-mq="vista-previa" style="margin-left:auto;text-align:right"></span></div>' +
      '<div class="mq-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-mq="aplicar"><i class="i i-s" data-i="check"></i>Aplicar</button></div>', {});
    var inp = c.el.querySelector("input"), vp = c.el.querySelector('[data-mq="vista-previa"]');
    function ver() { var m = +inp.value || 0; vp.innerHTML = "Se cobra<br><b style=\"font-size:20px;color:var(--tinta)\">" + M.peso(M.precio(M.costo(p), m)) + "</b>"; }
    inp.addEventListener("input", ver); ver();
    function aplicar() { var m = Math.max(0, Math.min(999, Math.round(+inp.value || 0))); c.cerrar(); alElegir(m); }
    c.el.querySelector('[data-mq="aplicar"]').addEventListener("click", aplicar);
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") aplicar(); });
    return c;
  };

  // ---------- Historial del costo ----------
  M.historial = function (p) {
    var meses = ["jun.", "jul.", "ago.", "sep.", "oct."], hoy = M.costo(p), filas = "";
    for (var i = 0; i < 5; i++) {
      var f = 1 + (p.hist / 100) * (i / 4), c = hoy / (1 + p.hist / 100) * f;
      var pr = M.precio(c, p.margen || 50);
      filas += "<tr><td>" + meses[i] + " 2026</td><td>" + M.PROV[p.uso] + '</td><td class="der">' + M.centavos(c) + '</td><td class="der">' + (p.margen == null ? "—" : "$" + M.miles(pr)) + "</td></tr>";
    }
    return M.abrir('<div class="mq-cab"><span class="t-seccion">Historial del costo</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="t-detalle" style="margin-bottom:8px">' + p.nom + " · " + (p.hist >= 0 ? "+" : "") + p.hist + ' % desde junio</div><table class="mq-tabla"><thead><tr><th>Mes</th><th>Proveedor</th><th class="der">Costo</th><th class="der">Precio</th></tr></thead><tbody>' + filas + "</tbody></table>", {});
  };

  M.descargar = function (nombre) { M.tostada("Descargando <b>" + (nombre || "Lista_Oeste_Oct2026.xlsx") + "</b>", { icono: "download" }); };
  M.copiar = function (boton, p) {
    if (boton && !boton.mqCopiando) {
      boton.mqCopiando = true;
      var antes = boton.getAttribute("data-icono") || "copy";
      M.rebotar(M.icono(boton, "check"));
      setTimeout(function () { M.icono(boton, antes); boton.mqCopiando = false; }, 1200);
    }
    try { navigator.clipboard && navigator.clipboard.writeText(p.ean).catch(function () {}); } catch (e) { /* sin portapapeles */ }
    M.vibrar(10);
    M.tostada("Código copiado: <b>" + p.ean + "</b>", { icono: "copy" });
  };

  // ---------- Ficha completa (diálogo de la compu 3 y hoja del celular 2) ----------
  M.montarFicha = function (caja, p, alCambiar, op) {
    op = op || {};
    function pintar() {
      var pr = M.precioDe(p);
      var provs = Object.keys(p.costos).map(function (k) {
        var uso = k === p.uso;
        return '<div class="prov-f"><span class="ini-f' + (uso ? " uso" : "") + '">' + k + '</span><div style="min-width:0"><div style="font-weight:700;font-size:15px">' + M.PROV[k] + '</div><div class="t-detalle">Lista ' + M.LISTA[k] + (uso ? " · en uso" : "") + "</div></div>" +
          (uso ? '<b>$' + M.miles(p.costos[k]) + "</b>" : '<button class="btn chico btn-suave" data-usar="' + k + '">Usar · $' + M.miles(p.costos[k]) + "</button>") + "</div>";
      }).join("");
      caja.innerHTML = '<div class="mq-ficha' + (op.una ? " una" : "") + '">' +
        '<div class="cab-f"><div class="foto" data-mq="ampliar" title="Ampliar la foto"><img src="' + M.fotoDe(p) + '" alt=""></div><div style="min-width:0"><span class="pastilla ' + (p.stock ? "logro" : "error") + '"><span class="punto"></span>' + (p.stock ? M.stockTxt(p) + " en stock" : "Sin stock") + '</span><div class="nom-f" style="margin-top:6px">' + p.nom + '</div><div class="t-detalle">' + p.marca + " · Cód. " + p.cod + " · Est. " + p.est + "</div></div></div>" +
        '<div class="caja"><h4>Precio de venta<span>' + (p.margen == null ? "elegí el margen" : "margen " + p.margen + " %") + '</span></h4><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div class="t-numero" data-mq="precio" style="' + (pr ? "" : "color:var(--urgente-texto);font-size:24px") + '">' + (pr ? M.peso(pr) : "Sin precio") + '</div><div class="segmentos seg-f" style="flex:1;min-width:220px">' +
        M.MARGENES.map(function (m) { return '<button data-margen="' + m + '" class="' + (p.margen === m ? "elegido" : "") + '">' + m + "</button>"; }).join("") + "</div></div>" +
        '<div style="margin-top:8px"><div class="paso-f"><span>Costo de compra (' + M.PROV_CORTO[p.uso] + ')</span><b>' + M.centavos(M.costo(p)) + '</b></div><div class="paso-f"><span>+ ' + (p.margen || 0) + ' % de margen</span><b>' + M.centavos(M.conMargen(p)) + '</b></div><div class="paso-f"><span>+ IVA 21 %</span><b>' + M.centavos(M.conIva(p)) + '</b></div><div class="paso-f cobra" data-mq="cobra"><span>Se cobra (a $1.000)</span><b>' + (pr ? "$" + M.miles(pr) : "—") + "</b></div></div></div>" +
        '<div class="cod-f"><svg data-ean="' + p.ean + '"></svg><div style="flex:1;min-width:0"><b>' + p.ean + '</b><div class="t-detalle">Última lectura: 13/10 · 10:24</div></div><button class="btn chico btn-icono" data-mq="copiar" title="Copiar el código"><i class="i i-s" data-i="copy"></i></button></div>' +
        '<div class="dos-f"><div class="caja"><h4>Proveedores<span>costo</span></h4>' + provs + '</div><div class="caja" style="display:grid;gap:8px;align-content:start"><h4>Historial y archivo</h4><button class="btn chico" data-mq="historial" style="justify-content:flex-start"><i class="i i-s" data-i="trending-up"></i>' + (p.hist >= 0 ? "+" : "") + p.hist + ' % desde jun.</button><button class="btn chico" data-mq="archivo" style="justify-content:flex-start"><i class="i i-s" data-i="file-spreadsheet"></i>' + M.ARCHIVO[p.uso] + "</button></div></div></div>";
      M.iconos(caja);
    }
    caja.addEventListener("click", function (e) {
      var t = e.target.closest("[data-margen], [data-usar], [data-mq]");
      if (!t || !caja.contains(t)) return;
      var antes = M.precioDe(p) || 0;
      if (t.hasAttribute("data-margen")) { p.margen = +t.getAttribute("data-margen"); }
      else if (t.hasAttribute("data-usar")) { p.uso = t.getAttribute("data-usar"); M.tostada("Ahora el costo sale de <b>" + M.PROV[p.uso] + "</b>"); }
      else {
        var q = t.getAttribute("data-mq");
        if (q === "ampliar") M.ampliarFoto(p);
        else if (q === "copiar") M.copiar(t, p);
        else if (q === "historial") M.historial(p);
        else if (q === "archivo") M.descargar(M.ARCHIVO[p.uso]);
        return;
      }
      pintar();
      var ahora = M.precioDe(p) || 0;
      var el = caja.querySelector('[data-mq="precio"]');
      M.animar(el, [{ opacity: 0, transform: "translateY(" + (ahora >= antes ? 10 : -10) + "px)" }, { opacity: 1, transform: "none" }], 200);
      M.brillar(caja.querySelector('[data-mq="cobra"]'));
      if (alCambiar) alCambiar(p);
    });
    pintar();
    return { pintar: pintar, cambiar: function (q) { p = q; pintar(); } };
  };
  M.fichaCompleta = function (p, alCambiar) {
    var c = M.abrir('<div class="mq-cab"><span class="t-seccion">Ficha del producto</span><button class="btn btn-icono chico btn-suave" data-cerrar title="Cerrar (Esc)"><i class="i i-s" data-i="x"></i></button></div><div data-mq="cuerpo"></div>' +
      '<div class="mq-pie"><button class="btn btn-fantasma" data-cerrar>Listo</button><button class="btn btn-accion" data-mq="agregar"><i class="i" data-i="shopping-cart"></i>Agregar a la venta</button></div>', { tipo: "dialogo", clase: "ancho" });
    M.montarFicha(c.el.querySelector('[data-mq="cuerpo"]'), p, alCambiar);
    c.el.querySelector('[data-mq="agregar"]').addEventListener("click", function () { c.cerrar(); M.agregar(p, { desde: null }); if (alCambiar) alCambiar(p); });
    return c;
  };

  // ---------- Buscador: el campo de la maqueta pasa a escribirse ----------
  M.buscador = function (campo, alEscribir) {
    if (!campo) return;
    campo.setAttribute("data-mq", "buscar");
    campo.addEventListener("click", function () {
      var inp = campo.querySelector("input");
      if (!inp) {
        var sp = campo.querySelector("span");
        inp = document.createElement("input");
        inp.className = "mq-input";
        inp.placeholder = sp ? sp.textContent : "Buscar";
        inp.setAttribute("aria-label", inp.placeholder);
        if (sp) sp.replaceWith(inp); else campo.appendChild(inp);
        inp.addEventListener("input", function () { alEscribir(inp.value.trim().toLowerCase()); });
        inp.addEventListener("focus", function () { campo.classList.add("foco"); });
        inp.addEventListener("blur", function () { campo.classList.remove("foco"); });
        inp.addEventListener("keydown", function (e) { if (e.key === "Escape") { inp.value = ""; alEscribir(""); inp.blur(); e.stopPropagation(); } });
      }
      inp.focus();
    });
  };
  M.coincide = function (p, q) { return !q || (p.nom + " " + p.marca + " " + p.cod + " " + p.ean).toLowerCase().indexOf(q) >= 0; };
  M.escribiendo = function (e) { var t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
})();

/* Compu 3 · La planilla tal cual llegó: lo que pasa al tocar. */
(function () {
  var planilla = document.getElementById("lx-planilla");
  var menuCol = document.getElementById("lx-menu-col");
  var colG = document.getElementById("lx-col-g");
  var pie = document.getElementById("lx-pie");
  var pieOriginal = pie.innerHTML;
  var hoja = document.querySelector(".hoja");
  var est = { menu: true, foco: null, filtro: null, margenes: {}, pantalla: "revision" };
  // Margen de cada código (null: no tiene precio todavía)
  var MARGEN = { "TA8-1": 50, "ME080": 100, "TS8-100": null, "CP2-KG": 100, "VR38-1": 100, "AG8-100": 100, "BH14-2": null, "PT25-2": null, "LLC13": 50, "DS6-100": 50 };

  function filas() { return Array.prototype.filter.call(planilla.querySelectorAll(".fila"), function (f) { return !/letras|titulo|enc/.test(f.className) && f.children[1].textContent.trim(); }); }
  function celdas(f) { return f.children; }
  function tipo(f) {
    if (f.classList.contains("salteada")) return "salteada";
    if (f.querySelector(".var.nuevo")) return "nuevo";
    return "cambia";
  }
  function numero(txt) { return Number(txt.replace(/[^\d,]/g, "").replace(",", ".")); }

  // ---------------- La columna sin nombre ----------------
  function abrirMenu(abrir) {
    est.menu = abrir;
    menuCol.hidden = !abrir;
    if (abrir) Lx.reanimar(menuCol, "lx-entra-arriba");
  }
  function elegirTipo(nombre) {
    abrirMenu(false);
    colG.className = "col lx-fundido";
    colG.removeAttribute("id");
    colG.setAttribute("data-lx", "columna");
    colG.innerHTML = '<i class="i i-s" data-i="' + (nombre === "No usar" ? "ban" : "check") + '"></i>' + nombre;
    Lx.pintar(colG.parentNode);
    var sn = document.getElementById("lx-sin-nombre");
    sn.className = "pastilla logro lx-fundido";
    sn.removeAttribute("data-lx");
    sn.innerHTML = '<i class="i i-s" data-i="check"></i>Columnas listas';
    Lx.pintar(sn.parentNode);
    // La columna G parpadea en verde y las de Ferrebress se rellenan en cascada
    var g = planilla.querySelector(".fila.letras").children[7].getBoundingClientRect(), h = planilla.getBoundingClientRect();
    var flash = document.createElement("div");
    flash.style.cssText = "position:absolute;pointer-events:none;background:var(--logro-suave);mix-blend-mode:multiply;animation:lx-parpadeo-verde 700ms var(--curva) both;left:" + (g.left - h.left) + "px;top:0;width:" + g.width + "px;height:" + h.height + "px";
    planilla.appendChild(flash);
    setTimeout(function () { flash.remove(); }, 800);
    filas().forEach(function (f, i) {
      Array.prototype.forEach.call(f.querySelectorAll(".fb"), function (c) { c.style.animationDelay = (i * 30) + "ms"; Lx.reanimar(c, "lx-fundido"); });
    });
    Lx.tostada(nombre === "No usar" ? "La columna G no se usa: no se vuelve a preguntar" : "Columna G: " + nombre.toLowerCase() + ". La próxima lista de Bulonera Centro se lee sola", { icono: "check" });
  }
  menuCol.addEventListener("click", function (e) { var o = e.target.closest("[data-tipo]"); if (o) elegirTipo(o.getAttribute("data-tipo")); });
  var TIPOS = [["tag", "Código"], ["file-text", "Descripción"], ["tags", "Marca"], ["layout-grid", "Rubro"], ["badge-dollar-sign", "Precio lista"], ["percent", "Descuento"], ["scan-barcode", "Código de barras"], ["boxes", "Bulto"], ["ban", "No usar"]];

  // ---------------- Fila con foco y su explicación ----------------
  var FL = '<i class="i i-s" data-i="chevron-right"></i>';
  function paso(et, v, fin) { return '<span class="paso' + (fin ? " fin" : "") + '"><small>' + et + "</small>" + v + "</span>"; }
  function explicar(f) {
    var c = celdas(f), n = c[0].textContent.trim(), cod = c[1].textContent.trim();
    var ex = pie.querySelector(".explica");
    if (!ex) return;
    var h;
    if (tipo(f) === "salteada") h = '<span class="fn">Fila ' + n + "</span><span>Salteada: dice «" + c[5].textContent.trim() + "» donde va el precio. No cambia nada.</span>";
    else {
      var lista = numero(c[5].textContent), dto = numero(c[6].textContent), costo = lista * (1 - dto / 100) * 0.95;
      var m = est.margenes[cod] != null ? est.margenes[cod] : MARGEN[cod];
      h = '<span class="fn">Fila ' + n + "</span>" + paso("E", Lx.pesos(lista)) + FL + paso("F", "− " + dto + " %") + FL + paso("contado", "− 5 %") + FL + paso("costo", Lx.pesosC(costo)) + FL;
      if (m == null) h += '<button class="btn chico" data-lx="margen" style="height:30px"><i class="i i-s" data-i="percent"></i>Elegí el margen</button>';
      else h += paso("margen", m + " %") + FL + paso("IVA", "21 %") + FL + '<span class="paso fin">' + Lx.pesos(Lx.precio(costo, m)) + "</span>";
    }
    ex.innerHTML = h;
    ex.classList.add("lx-pasos");
    Array.prototype.forEach.call(ex.children, function (x, i) { x.style.animationDelay = (i * 30) + "ms"; });
    Lx.pintar(ex);
  }
  function enfocar(f) {
    if (!f) return;
    planilla.querySelectorAll(".fila.foco").forEach(function (x) { x.classList.remove("foco"); });
    f.classList.add("foco");
    est.foco = f;
    explicar(f);
  }
  function mover(d) {
    var v = filas().filter(function (f) { return !f.hidden; });
    var i = v.indexOf(est.foco || planilla.querySelector(".fila.foco"));
    enfocar(v[Math.max(0, Math.min(v.length - 1, i + d))]);
  }

  // ---------------- Aplicar y descartar ----------------
  var aplicando = false;
  function aplicar() {
    if (aplicando || est.pantalla !== "revision") return;
    aplicando = true;
    abrirMenu(false);
    var btn = pie.querySelector('[data-lx="aplicar"]');
    btn.classList.add("lx-llenando");
    btn.innerHTML = '<span class="lx-relleno"></span><span class="lx-txt">Aplicando… 0 de 7.096</span>';
    var rel = btn.querySelector(".lx-relleno"), txt = btn.querySelector(".lx-txt");
    Lx.avanzar(7096, 1800, function (v, f) { rel.style.transform = "scaleX(" + f + ")"; txt.textContent = "Aplicando… " + Lx.miles(v) + " de 7.096"; }, function () {
      txt.textContent = "Buscando duplicados…";
      setTimeout(function () { resultado(); aplicando = false; }, 600);
    });
  }
  function resultado() {
    est.pantalla = "resultado";
    Lx.vibrar([10, 40, 10]);
    var filasR = DATOS.remarcarDe("bulonera").map(function (r) {
      return '<div class="lx-tr" data-u="' + r[3][0] + '" style="grid-template-columns:40px minmax(0,1fr) 120px 170px 130px"><div class="foto chica"><img src="' + Dlg.FOTOS + r[0] + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + r[1] + '</div><div class="d">' + r[2] +
        '</div></div><span class="pastilla pino" style="height:26px;justify-self:start"><i class="i i-s" data-i="map-pin"></i>' + r[3] + '</span><span class="der"><s>' + Lx.pesos(r[4]) + "</s><b>" + Lx.pesos(r[5]) + '</b></span><span class="der"><button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button></span></div>';
    }).join("");
    var falta = ["BH14-2", "PT25-2"].filter(function (c) { return est.margenes[c] == null; }).length + 2;
    hoja.innerHTML = '<div class="lx-fundido" style="display:flex;flex-direction:column;gap:14px;height:100%;padding-bottom:16px;max-width:1080px;margin:0 auto">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-top:8px">' + Lx.tilde() + '<div><div class="t-seccion">641 precios actualizados · 4 nuevos</div><div class="t-detalle">Bulonera Centro, lista del 17/10/2026 · aplicada hoy 10:44 · 876 costos nuevos · las ofertas quedaron aparte, hasta el 31/10</div></div></div>' +
      '<div class="aviso urgente"><i class="i" data-i="triangle-alert"></i><span><b>' + falta + ' nuevos quedaron sin precio</b>: no se pueden vender hasta elegirles el margen.</span><button class="btn chico" data-lx="nuevos" style="margin-left:auto;background:#fff">Ponerles precio</button></div>' +
      '<div style="display:flex;align-items:center;gap:8px"><b style="font-size:16px;font-weight:800;margin-right:4px">Para remarcar</b><span class="chip elegido" data-pasillo="">Todos 641</span>' +
      DATOS.pasillos.map(function (p) { return '<span class="chip" data-pasillo="' + p[0] + '">Pasillo ' + p[0] + " " + p[1] + "</span>"; }).join("") + "</div>" +
      '<div class="tarjeta lx-tabla lx-entra">' + filasR + "</div></div>";
    Lx.pintar(hoja);
    pie.innerHTML = '<span class="t-detalle"><i class="i i-s" data-i="footprints"></i> Ordenado por pasillo, para recorrer el local una sola vez</span><div class="der"><button class="btn" data-ir="productos">Volver al catálogo</button><button class="btn btn-accion" data-lx="imprimir"><i class="i i-s" data-i="printer"></i>Imprimir las 641 etiquetas <span class="kbd">Ctrl P</span></button></div>';
    Lx.pintar(pie);
    var b = document.querySelector(".barra .der");
    b.innerHTML = '<span class="pastilla logro lx-fundido"><i class="i i-s" data-i="check"></i>Aplicada hoy 10:44</span>';
    Lx.pintar(b);
  }
  function descartar() {
    if (est.pantalla !== "revision") return;
    est.pantalla = "descartada";
    abrirMenu(false);
    hoja.style.transition = "opacity var(--t) var(--curva)";
    hoja.style.opacity = ".4";
    pie.innerHTML = '<div class="aviso error lx-fundido" style="align-items:center"><i class="i" data-i="trash-2"></i><span>Descartaste la lista de Bulonera Centro: no cambió ningún precio. Queda en Últimas cargas.</span></div><div class="der"><button class="btn" data-lx="deshacer">Deshacer</button><button class="btn" data-ir="productos">Volver al catálogo</button></div>';
    Lx.pintar(pie);
  }

  Lx.on({
    "columna-g": function () { abrirMenu(!est.menu); },
    columna: function (el) {
      var m = Lx.abrir('<div class="t-detalle" style="padding:4px 10px 6px">¿Qué es esta columna?</div>' + TIPOS.map(function (t) {
        return '<a class="lx-op" data-tipo="' + t[1] + '" data-cerrar><i class="i i-s" data-i="' + t[0] + '"></i>' + t[1] + (el.textContent.trim() === t[1] ? '<small>la de ahora</small>' : "") + "</a>";
      }).join(""), { tipo: "menu", junto: el });
      m.addEventListener("click", function (e) {
        var o = e.target.closest("[data-tipo]"); if (!o) return;
        el.innerHTML = '<i class="i i-s" data-i="check"></i>' + o.getAttribute("data-tipo");
        Lx.pintar(el.parentNode);
        Lx.reanimar(el, "lx-fundido");
      });
    },
    margen: function (el) {
      var f = est.foco || planilla.querySelector(".fila.foco"), c = celdas(f), cod = c[1].textContent.trim();
      var costo = numero(c[5].textContent) * (1 - numero(c[6].textContent) / 100) * 0.95;
      var m = Lx.abrir('<div class="t-detalle" style="padding:4px 10px 6px">Margen para ' + cod + "</div>" + [300, 200, 100, 50, 25].map(function (v) {
        return '<a class="lx-op" data-m="' + v + '" data-cerrar>' + v + " %<small>" + Lx.pesos(Lx.precio(costo, v)) + "</small></a>";
      }).join(""), { tipo: "menu", junto: el, arriba: true });
      m.addEventListener("click", function (e) {
        var o = e.target.closest("[data-m]"); if (!o) return;
        var v = Number(o.getAttribute("data-m"));
        est.margenes[cod] = v;
        var celda = c[11];
        celda.className = "fb r lx-fundido";
        celda.textContent = Lx.pesos(Lx.precio(costo, v));
        explicar(f);
      });
    },
    nuevos: function () {
      var l = DATOS.listas.bulonera;
      Dlg.margenes(l, {}, function () {});
    },
    aplicar: aplicar,
    descartar: descartar,
    deshacer: function () {
      est.pantalla = "revision";
      hoja.style.opacity = "";
      pie.innerHTML = pieOriginal;
      Lx.pintar(pie);
      if (est.foco) explicar(est.foco);
    },
    imprimir: function () { Lx.tostada("Mandé 641 etiquetas a la impresora del mostrador, por pasillo", { icono: "printer" }); },
    remarcado: function (el) {
      var fila = el.closest(".lx-tr"), hecho = !fila.classList.contains("lx-hecho");
      fila.classList.toggle("lx-hecho", hecho);
      el.outerHTML = hecho ? '<span class="pastilla logro lx-entra" data-lx="remarcado" style="height:30px"><i class="i i-s" data-i="check"></i>Remarcado</span>' : '<button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button>';
      Lx.pintar(fila);
    }
  });

  document.addEventListener("click", function (e) {
    var t = e.target;
    if (est.menu && !t.closest("#lx-menu-col") && !t.closest('[data-lx="columna-g"]')) abrirMenu(false);
    var c = t.closest(".mapa .col:not(.fb):not(.duda)");
    if (c && !c.hasAttribute("data-lx")) { c.setAttribute("data-lx", "columna"); c.click(); return; }
    var f = t.closest("#lx-planilla .fila");
    if (f && filas().indexOf(f) >= 0) { enfocar(f); return; }
    var fi = t.closest(".barra [data-filtro]");
    if (fi && est.pantalla === "revision") {
      var tp = fi.getAttribute("data-filtro");
      est.filtro = est.filtro === tp ? null : tp;
      document.querySelectorAll(".barra [data-filtro]").forEach(function (x) { x.style.opacity = est.filtro && x !== fi ? ".45" : ""; });
      filas().forEach(function (r) { r.hidden = !!est.filtro && tipo(r) !== est.filtro; });
      planilla.querySelectorAll(".fila.titulo").forEach(function (r) { if (r.children[0].textContent.trim() === "15") r.hidden = !!est.filtro; });
      return;
    }
    var pa = t.closest(".hoja [data-pasillo]");
    if (pa) {
      var u = pa.getAttribute("data-pasillo");
      hoja.querySelectorAll("[data-pasillo]").forEach(function (x) { x.classList.toggle("elegido", x === pa); });
      hoja.querySelectorAll(".lx-tr[data-u]").forEach(function (r) { r.hidden = !!u && r.getAttribute("data-u") !== u; });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (Lx.abiertos()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (est.menu) abrirMenu(false); else window.irAMaqueta && window.irAMaqueta("productos");
      return;
    }
    if (est.menu && e.key === "Enter") { e.preventDefault(); elegirTipo("Código de barras"); return; }
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); aplicar(); return; }
    if (e.altKey && (e.key === "d" || e.key === "D")) { e.preventDefault(); descartar(); return; }
    if (e.ctrlKey && (e.key === "p" || e.key === "P") && est.pantalla === "resultado") { e.preventDefault(); Lx.tostada("Mandé 641 etiquetas a la impresora del mostrador, por pasillo", { icono: "printer" }); return; }
    if (est.pantalla === "revision" && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); mover(e.key === "ArrowDown" ? 1 : -1); }
  });
})();

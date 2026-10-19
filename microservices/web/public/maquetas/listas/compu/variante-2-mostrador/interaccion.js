/* Compu 2 · Qué pasa en el mostrador: lo que pasa al tocar. Datos en ../../_propio/datos.js. */
(function () {
  var L = DATOS.listas, FOTOS = Dlg.FOTOS;
  var centro = document.getElementById("lx-centro");
  var bandeja = document.getElementById("lx-bandeja");
  var est = { lista: "bulonera", vista: "pasa", margenes: { "Puntas Torx T25 × 50 mm × 2": 100 }, elegidos: {}, imprimir: true, pantalla: "revision" };

  L.plata = JSON.parse(JSON.stringify(L.sur));
  Object.assign(L.plata, { prov: "Pinturas del Plata", fecha: "13/10/2026", corta: "13/10", icono: "file-text", archivo: "precios-oct-2026.pdf", llego: "llegó por correo el lunes", leidos: 2104, cambian: 342, pc: "+6,1 %", precios: 251, igual: 91, sin: 1740 });

  function grupo(nombre) {
    var g = Array.prototype.filter.call(bandeja.querySelectorAll(".grupo"), function (x) { return x.textContent.indexOf(nombre) === 0; })[0];
    return g;
  }
  function pendientes() { return bandeja.querySelectorAll(".it[data-lista]"); }
  function contar(nombre, n) {
    var p = grupo(nombre).querySelector(".pastilla");
    p.textContent = n; Lx.reanimar(p, "lx-salta");
  }
  function actualizarCuentas() {
    var n = pendientes().length;
    contar("Para revisar", n);
    var pe = document.querySelector(".pestanas a.activa .pastilla");
    pe.textContent = n; pe.style.display = n ? "" : "none"; Lx.reanimar(pe, "lx-salta");
  }
  function entrar(el) { el.classList.add("lx-entra", "lx-nuevo-borde"); setTimeout(function () { el.classList.remove("lx-nuevo-borde"); }, 1000); }
  function itHTML(k, d, h) {
    var l = L[k];
    return '<span class="ic"><i class="i i-s" data-i="' + l.icono + '"></i></span><div style="min-width:0"><div class="n">' + l.prov + '</div><div class="d">' + d + '</div></div><span class="h">' + h + "</span>";
  }

  // ---------------- El centro ----------------
  function segmentos() {
    return '<div class="segmentos">' + [["pasa", "Qué pasa"], ["filas", "Fila por fila"], ["planilla", "La planilla"]].map(function (v) {
      return '<button data-vista="' + v[0] + '"' + (v[0] === est.vista ? ' class="elegido"' : "") + ">" + v[1] + "</button>";
    }).join("") + "</div>";
  }
  function cabHTML(l) {
    return '<div class="cab"><div><div class="t-seccion">' + l.prov + " · lista del " + l.fecha + '</div><div class="t-detalle">' + l.llego.charAt(0).toUpperCase() + l.llego.slice(1) + " · " + Lx.miles(l.leidos) + " productos leídos · 25 % de línea y 5 % de contado</div></div>" + segmentos() + "</div>";
  }
  function sinElegir(l) { return l.nuevos - Object.keys(est.elegidos).filter(function (n) { return l.filas.nuevos.some(function (r) { return r.n === n; }); }).length; }
  function nvHTML(n) {
    var m = est.margenes[n.n];
    return '<div class="nv"><div class="foto chica"><img src="' + FOTOS + n.f + '.webp" alt=""></div><div style="min-width:0"><div class="nm">' + n.n + '</div><div class="dt">' + n.d.split(" · ")[0] + " · costo " + Lx.pesos(n.c) +
      '</div></div><div class="fila-m"><span class="segmentos">' + [300, 200, 100, 50, 25].map(function (v) { return "<button" + (m === v ? ' class="elegido"' : "") + ">" + v + "</button>"; }).join("") +
      '</span><span class="precio' + (m == null ? " falta" : "") + '">' + (m == null ? "Sin precio" : Lx.pesos(Lx.precio(n.c, m))) + "</span></div></div>";
  }
  function pasaHTML(l) {
    var fam = l.familias.map(function (f) {
      var baja = f[1] < 0;
      return '<div class="fam"><span class="nom">' + f[0] + '</span><span class="bar"><b' + (baja ? ' class="baja"' : "") + ' style="width:' + Math.abs(f[1]) + '%"></b></span><span class="pc"' + (baja ? ' style="color:var(--logro-texto)"' : "") + ">" + f[2] + '</span><span class="ct">' + f[3] + "</span></div>";
    }).join("");
    var subas = l.filas.subas.slice(0, 3).map(function (r) {
      return '<div class="sb"><div class="nm">' + r.n + '</div><span class="pastilla urgente">' + Lx.pct((r.c - r.a) / r.a * 100) + '</span><div class="dt">' + Lx.pesos(Lx.precio(r.a, r.m)) + " → " + Lx.pesos(Lx.precio(r.c, r.m)) + "</div></div>";
    }).join("") || '<div class="sb"><div class="nm">Ninguno sube tanto</div><span class="pastilla logro">Bien</span><div class="dt">La suba más grande es de 4,9 %</div></div>';
    var no = l.filas.noestan.slice(0, 2).map(function (r) {
      return '<div class="sb"><div class="nm">' + r.n + '</div><span class="pastilla ' + r.clase + '">' + (r.clase === "urgente" ? r.que.replace(" en stock", "") : r.clase === "logro" ? "Sigue" : "Sin stock") + '</span><div class="dt">' + (r.clase === "logro" ? "Lo trae otro proveedor" : "Solo lo traía " + l.prov.split(" ")[0]) + "</div></div>";
    }).join("") + (l.noestan > 2 ? '<div class="sb"><div class="nm">Y ' + (l.noestan - 2) + ' más</div><span class="pastilla">Sin stock</span><div class="dt">Ninguno tiene stock</div></div>' : "");
    return '<div class="tarjeta hero"><div><div class="et">Si aplicás, en la estantería cambian</div><div class="grande num">' + Lx.miles(l.precios) + ' <small>precios</small></div><div class="sube"><i class="i i-s" data-i="trending-up"></i>El costo sube ' + l.pc.replace("+", "") +
      ' en promedio</div><div class="t-detalle" style="margin-top:2px">Otros ' + l.igual + ' cambian de costo y no de precio</div></div><div class="familias">' + fam + "</div></div>" +
      '<div class="tarjetas"><div class="tarjeta t nuevos"><div class="t-cab"><span class="ico"><i class="i" data-i="package-plus"></i></span><span class="n">' + sinElegir(l) + '</span><b>' + (l.nuevos === 1 ? "nuevo" : "nuevos") + ': elegí el margen</b><span class="ver" data-lx="ver-nuevos">Ver</span></div>' +
      l.filas.nuevos.slice(0, 2).map(nvHTML).join("") + "</div>" +
      '<div class="tarjeta t subas"><div class="t-cab"><span class="ico"><i class="i" data-i="trending-up"></i></span><span class="n">' + l.subas + '</span><b>suben + de 15 %</b><span class="ver" data-lx="ver-subas">Ver</span></div>' + subas + "</div>" +
      '<div class="tarjeta t"><div class="t-cab"><span class="ico"><i class="i" data-i="circle-x"></i></span><span class="n">' + l.noestan + '</span><b>ya no están</b><span class="ver" data-lx="ver-noestan">Ver</span></div>' + no + "</div></div>";
  }
  function filasHTML(l) {
    var h = '<div class="tarjeta lx-tabla lx-fundido"><div class="lx-tr th"><span></span><span>Producto</span><span class="der">Costo antes</span><span class="der">Costo nuevo</span><span class="der">Cambio</span><span class="der">En estantería</span></div>';
    ["cambian", "nuevos", "noestan"].forEach(function (k) {
      l.filas[k].forEach(function (r) {
        var m = est.margenes[r.n] != null ? est.margenes[r.n] : r.m, cambio, est2;
        if (r.t === "nuevo") cambio = '<span class="lx-var nuevo">Nuevo</span>';
        else if (r.t === "noesta") cambio = '<span class="lx-var">Ya no</span>';
        else { var p = (r.c - r.a) / r.a * 100; cambio = '<span class="lx-var' + (p > 15 ? " grande" : p < 0 ? " baja" : "") + '">' + Lx.pct(p) + "</span>"; }
        if (r.t === "noesta") est2 = '<span class="der' + (r.clase === "urgente" ? " lx-falta" : "") + '">' + r.que.replace("Sigue con Distribuidora Oeste", "Sigue con otro") + "</span>";
        else if (m == null) est2 = '<span class="der lx-falta">Sin precio</span>';
        else if (r.a == null) est2 = '<span class="der"><b>' + Lx.pesos(Lx.precio(r.c, m)) + "</b></span>";
        else { var pa = Lx.precio(r.a, m), pn = Lx.precio(r.c, m); est2 = '<span class="der">' + (pa === pn ? Lx.pesos(pn) + " · igual" : "<s>" + Lx.pesos(pa) + "</s><b>" + Lx.pesos(pn) + "</b>") + "</span>"; }
        h += '<div class="lx-tr"><div class="foto chica"><img src="' + FOTOS + r.f + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + r.n + '</div><div class="d">' + r.d + '</div></div><span class="der antes">' + (r.a != null ? Lx.pesosC(r.a) : "—") +
          '</span><span class="der"><b>' + (r.c != null ? Lx.pesosC(r.c) : "—") + '</b></span><span class="der">' + cambio + "</span>" + est2 + "</div>";
      });
    });
    return h + "</div>";
  }
  function planillaHTML(l) {
    var h = '<div class="tarjeta lx-planilla lx-fundido"><div class="lx-pf letras"><span></span><span>A</span><span>B</span><span>C</span><span>E</span><span>F</span><span class="gap"></span><span class="fb">Costo</span><span class="fb">Cambio</span><span class="fb">En estantería</span></div>' +
      '<div class="lx-pf enc"><span>4</span><span>COD.</span><span>DESCRIPCION</span><span>MARCA</span><span class="r">P. LISTA</span><span class="r">DTO</span><span class="gap"></span><span class="fb"></span><span class="fb"></span><span class="fb"></span></div>';
    var fila = 5;
    l.filas.cambian.concat(l.filas.nuevos).forEach(function (r) {
      var cod = r.d.split(" · ")[1], marca = r.d.split(" · ")[0].toUpperCase();
      var lista = DATOS.lista(r).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      var m = est.margenes[r.n] != null ? est.margenes[r.n] : r.m;
      var cambio = r.t === "nuevo" ? '<span class="lx-var nuevo">Nuevo</span>' : '<span class="lx-var' + ((r.c - r.a) / r.a > 0.15 ? " grande" : "") + '">' + Lx.pct((r.c - r.a) / r.a * 100) + "</span>";
      var pr = m == null ? '<span class="lx-falta">Sin precio</span>' : (r.a != null && Lx.precio(r.a, m) !== Lx.precio(r.c, m) ? "<s style=\"color:var(--texto-3);margin-right:6px\">" + Lx.pesos(Lx.precio(r.a, m)) + "</s>" : "") + Lx.pesos(Lx.precio(r.c, m));
      h += '<div class="lx-pf"><span>' + (fila++) + "</span><span>" + cod + "</span><span>" + r.n.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "</span><span>" + marca + '</span><span class="r">' + lista + '</span><span class="r">25</span><span class="gap"></span><span class="fb">' + Lx.pesosC(r.c) + '</span><span class="fb">' + cambio + '</span><span class="fb">' + pr + "</span></div>";
      if (fila === 8) h += '<div class="lx-pf salteada"><span>' + (fila++) + '</span><span>TM6-100</span><span>TUERCA MARIPOSA M6 X100</span><span>BULONERA</span><span class="r">CONSULTAR</span><span class="r">25</span><span class="gap"></span><span class="fb lx-falta" style="grid-column:span 3">Salteada: no tiene precio</span></div>';
    });
    return h + "</div>";
  }
  function aplicarHTML(l) {
    return '<div class="tarjeta-2 aplicar"><div class="resto"><span><b>' + Lx.miles(l.sin) + "</b> sin cambio</span><span><b>" + l.salteadas + '</b> salteadas</span></div><span class="check" data-lx="check"><span class="cb"' + (est.imprimir ? "" : ' style="background:#fff;box-shadow:inset 0 0 0 1.5px var(--borde-fuerte);color:transparent"') + '><i class="i i-s" data-i="check"></i></span>Imprimir las etiquetas</span>' +
      '<button class="btn btn-fantasma chico" data-lx="descartar">Descartar <span class="kbd">D</span></button><button class="btn btn-accion" data-lx="aplicar">Aplicar y remarcar <span class="kbd">A</span></button></div>';
  }
  function pintar(fundido) {
    var l = L[est.lista];
    est.pantalla = "revision";
    var medio = est.vista === "pasa" ? pasaHTML(l) : est.vista === "filas" ? filasHTML(l) : planillaHTML(l);
    centro.innerHTML = cabHTML(l) + medio + aplicarHTML(l);
    Lx.pintar(centro);
    if (fundido) Lx.reanimar(centro, "lx-fundido");
  }
  function elegir(k) {
    est.lista = k;
    bandeja.querySelectorAll(".it").forEach(function (it) { it.classList.toggle("elegido", it.getAttribute("data-lista") === k); });
    pintar(true);
  }

  // ---------------- Elegir el margen de un nuevo ----------------
  centro.addEventListener("click", function (e) {
    var b = e.target.closest(".nv .segmentos button");
    if (!b) return;
    var nv = b.closest(".nv"), l = L[est.lista];
    var i = Array.prototype.indexOf.call(centro.querySelectorAll(".nv"), nv), n = l.filas.nuevos[i];
    var v = Number(b.textContent);
    est.margenes[n.n] = v;
    nv.querySelectorAll(".segmentos button").forEach(function (x) { x.classList.toggle("elegido", x === b); });
    var p = nv.querySelector(".precio");
    p.textContent = Lx.pesos(Lx.precio(n.c, v)); p.classList.remove("falta"); Lx.reanimar(p, "lx-entra-arriba");
    if (!est.elegidos[n.n]) {
      est.elegidos[n.n] = 1;
      var c = centro.querySelector(".t.nuevos .t-cab .n");
      c.textContent = sinElegir(l); Lx.reanimar(c, "lx-entra-arriba");
    }
  });

  // ---------------- Aplicar ----------------
  var aplicando = false;
  function aplicar() {
    if (aplicando || est.pantalla !== "revision") return;
    aplicando = true;
    var k = est.lista, l = L[k], btn = centro.querySelector('[data-lx="aplicar"]');
    btn.classList.add("lx-llenando");
    btn.innerHTML = '<span class="lx-relleno"></span><span class="lx-txt">Aplicando… 0 de ' + Lx.miles(l.leidos) + "</span>";
    var rel = btn.querySelector(".lx-relleno"), txt = btn.querySelector(".lx-txt");
    Lx.avanzar(l.leidos, 1800, function (v, f) { rel.style.transform = "scaleX(" + f + ")"; txt.textContent = "Aplicando… " + Lx.miles(v) + " de " + Lx.miles(l.leidos); }, function () {
      txt.textContent = "Buscando duplicados…";
      setTimeout(function () {
        resultado(k);
        Lx.vibrar([10, 40, 10]);
        var it = bandeja.querySelector('.it[data-lista="' + k + '"]');
        it.classList.add("lx-sale");
        setTimeout(function () {
          it.remove();
          actualizarCuentas();
          var g = grupo("Al día"), n = Number(g.querySelector(".pastilla").textContent) + 1;
          var d = document.createElement("div");
          d.className = "it"; d.setAttribute("data-aplicada", k);
          d.innerHTML = itHTML(k, "Aplicada hoy · " + Lx.miles(l.precios) + " precios", "10:44").replace(l.icono, "file-check");
          Lx.pintar(d);
          g.insertAdjacentElement("afterend", d);
          var al = d.nextElementSibling; if (al && al.classList.contains("it") && !al.hasAttribute("data-aplicada")) al.hidden = true;
          entrar(d);
          contar("Al día", n);
        }, 220);
        if (est.imprimir) Lx.tostada("Imprimiendo " + Lx.miles(l.precios) + " etiquetas, en el orden de los pasillos", { icono: "printer" });
        aplicando = false;
      }, 600);
    });
  }
  function resultado(k) {
    var l = L[k];
    est.pantalla = "resultado";
    var falta = l.filas.nuevos.filter(function (n) { return est.margenes[n.n] == null; }).length;
    var max = 202;
    var pasillos = (k === "bulonera" ? DATOS.pasillos : [["A", Math.round(l.precios * .4)], ["B", Math.round(l.precios * .35)], ["C", l.precios - Math.round(l.precios * .4) - Math.round(l.precios * .35)]]);
    max = Math.max.apply(null, pasillos.map(function (p) { return p[1]; }));
    var filas = DATOS.remarcarDe(k).map(function (r) {
      return '<div class="lx-tr" data-u="' + r[3][0] + '" style="grid-template-columns:40px minmax(0,1fr) 112px 150px 120px"><div class="foto chica"><img src="' + FOTOS + r[0] + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + r[1] + '</div><div class="d">' + r[2] +
        '</div></div><span class="pastilla pino" style="height:26px;justify-self:start"><i class="i i-s" data-i="map-pin"></i>' + r[3] + '</span><span class="der"><s>' + Lx.pesos(r[4]) + "</s><b>" + Lx.pesos(r[5]) + '</b></span><span class="der"><button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button></span></div>';
    }).join("");
    centro.innerHTML = '<div class="cab lx-fundido" style="gap:16px">' + Lx.tilde() + '<div><div class="t-seccion">' + Lx.miles(l.precios) + " precios actualizados · " + l.nuevos + (l.nuevos === 1 ? " nuevo" : " nuevos") + '</div><div class="t-detalle">' + l.prov + ", lista del " + l.fecha + " · aplicada hoy 10:44 · sin duplicados nuevos</div></div></div>" +
      (est.imprimir ? '<div class="aviso pino"><i class="i" data-i="printer"></i><span>Las <b>' + Lx.miles(l.precios) + " etiquetas</b> salen por la impresora del mostrador, en el orden de los pasillos.</span></div>" : "") +
      (falta ? '<div class="aviso urgente" id="lx-aviso-nuevos"><i class="i" data-i="triangle-alert"></i><span><b>' + falta + (falta === 1 ? " nuevo quedó" : " nuevos quedaron") + ' sin precio</b>: no se pueden vender hasta elegirles el margen.</span><button class="btn chico" data-lx="ver-nuevos" style="margin-left:auto;background:#fff">Ponerles precio</button></div>' : "") +
      '<div class="tarjeta hero lx-entra" style="grid-template-columns:280px minmax(0,1fr)"><div><div class="et">Para remarcar en la estantería</div><div class="grande num" style="font-size:48px;line-height:52px">' + Lx.miles(l.precios) + ' <small>etiquetas</small></div><div class="t-detalle">Tocá un pasillo para ver solo ese</div></div><div class="familias">' +
      pasillos.map(function (p) { return '<div class="fam lx-tocable" data-pasillo="' + p[0] + '"><span class="nom">Pasillo ' + p[0] + '</span><span class="bar"><b style="left:0;width:' + Math.round(p[1] / max * 100) + '%"></b></span><span class="pc">' + p[1] + '</span><span class="ct"></span></div>'; }).join("") + "</div></div>" +
      '<div class="tarjeta lx-tabla lx-entra">' + filas + "</div>";
    Lx.pintar(centro);
  }

  function descartar() {
    if (est.pantalla !== "revision") return;
    var k = est.lista, l = L[k];
    var it = bandeja.querySelector('.it[data-lista="' + k + '"]'), sig = it.nextElementSibling;
    it.classList.add("lx-sale");
    setTimeout(function () {
      it.remove(); it.classList.remove("lx-sale");
      actualizarCuentas();
      var p = pendientes()[0];
      if (p) elegir(p.getAttribute("data-lista"));
      else {
        est.pantalla = "vacia";
        centro.innerHTML = '<div style="margin:auto;text-align:center;display:grid;gap:12px;justify-items:center" class="lx-fundido">' + Lx.tilde() + '<div class="t-seccion">Todo revisado</div><div class="t-detalle">Las listas que lleguen por correo o de los portales aparecen solas en la bandeja.</div></div>';
        Lx.pintar(centro);
      }
    }, 220);
    Lx.tostada("Descartaste la lista de " + l.prov, { icono: "trash-2", deshacer: function () {
      sig.parentNode.insertBefore(it, sig); entrar(it); actualizarCuentas(); elegir(k);
    } });
  }

  function agregarPendiente(k, reemplaza) {
    var l = L[k];
    var d = document.createElement("div");
    d.className = "it"; d.setAttribute("data-lista", k);
    d.innerHTML = itHTML(k, Lx.miles(l.cambian) + " cambian · " + (k === "nueva" ? "la subiste vos" : l.nuevos + " nuevos"), l.hora === "recién" ? "ahora" : l.corta);
    Lx.pintar(d);
    if (reemplaza) {
      reemplaza.replaceWith(d);
      var g = grupo("¿De quién es?"); g.hidden = true;
      var lugar = pendientes()[pendientes().length - 2] || grupo("Para revisar");
      lugar.insertAdjacentElement("afterend", d);
    } else grupo("Para revisar").insertAdjacentElement("afterend", d);
    entrar(d);
    actualizarCuentas();
    elegir(k);
  }

  Lx.on({
    subir: function () { Dlg.cargar(function () { if (!bandeja.querySelector('[data-lista="nueva"]')) agregarPendiente("nueva"); else elegir("nueva"); }); },
    aplicar: aplicar,
    descartar: descartar,
    check: function (el) {
      est.imprimir = !est.imprimir;
      var cb = el.querySelector(".cb");
      cb.style.cssText = est.imprimir ? "" : "background:#fff;box-shadow:inset 0 0 0 1.5px var(--borde-fuerte);color:transparent";
      Lx.reanimar(cb, "lx-salta");
    },
    "ver-nuevos": function () {
      var l = L[est.lista];
      Dlg.margenes(l, est.margenes, function () {
        l.filas.nuevos.forEach(function (n) { if (est.margenes[n.n] != null) est.elegidos[n.n] = 1; });
        if (est.pantalla === "revision") pintar(false);
        else {
          var falta = l.filas.nuevos.filter(function (n) { return est.margenes[n.n] == null; }).length, av = document.getElementById("lx-aviso-nuevos");
          if (av && !falta) { av.outerHTML = '<div class="aviso logro lx-fundido"><i class="i" data-i="circle-check"></i><span>Los nuevos ya tienen precio: sus etiquetas salen con las demás.</span></div>'; Lx.pintar(centro); }
        }
      });
    },
    "ver-subas": function () { var l = L[est.lista]; Dlg.filas("Suben más de 15 %", l.prov + " · el costo, contra la lista anterior", l.filas.subas, l.subas); },
    "ver-noestan": function () { var l = L[est.lista]; Dlg.filas("Ya no están en la lista", "Si aplicás, dejan de tener costo de " + l.prov, l.filas.noestan, l.noestan); },
    remarcado: function (el) {
      var fila = el.closest(".lx-tr"), hecho = !fila.classList.contains("lx-hecho");
      fila.classList.toggle("lx-hecho", hecho);
      el.outerHTML = hecho ? '<span class="pastilla logro lx-entra" data-lx="remarcado" style="height:30px"><i class="i i-s" data-i="check"></i>Remarcado</span>' : '<button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button>';
      Lx.pintar(fila);
    },
    adjunto: function (el) { Dlg.adjunto(function (prov) { L.plata.prov = prov; agregarPendiente("plata", el); }); },
    "agregar-prov": function () {
      Dlg.agregarProv(function (nombre) {
        var g = grupo("Lista vieja");
        var d = document.createElement("div");
        d.className = "it"; d.setAttribute("data-prov", nombre);
        d.innerHTML = '<span class="ic"><i class="i i-s" data-i="building-2"></i></span><div style="min-width:0"><div class="n">' + nombre + '</div><div class="d">Sin listas todavía · se espera por correo</div></div><span class="h">nuevo</span>';
        Lx.pintar(d);
        g.insertAdjacentElement("beforebegin", d);
        entrar(d);
      });
    },
    correo: function () { Dlg.correo(L[est.lista]); }
  });

  document.addEventListener("click", function (e) {
    var t = e.target;
    var it = t.closest("#lx-bandeja .it[data-lista]");
    if (it) { elegir(it.getAttribute("data-lista")); return; }
    var pr = t.closest("#lx-bandeja .it[data-prov]");
    if (pr) { Dlg.fichaProv(pr.getAttribute("data-prov")); return; }
    var ap = t.closest("#lx-bandeja .it[data-aplicada]");
    if (ap) { var l = L[ap.getAttribute("data-aplicada")]; Lx.abrir(Dlg.cab(l.prov + " · lista del " + l.fecha, "Aplicada hoy 10:44 por Carlos") + '<div class="lx-lista">' + Dlg.r("tags", Lx.miles(l.precios) + " precios cambiaron", "El costo subió " + l.pc.replace("+", "") + " en promedio") + Dlg.r("package-plus", l.nuevos + " nuevos", "Con el margen elegido") + "</div>" + Dlg.pie()); return; }
    var v = t.closest("#lx-centro [data-vista]");
    if (v) { est.vista = v.getAttribute("data-vista"); pintar(false); return; }
    var pa = t.closest("#lx-centro [data-pasillo]");
    if (pa) {
      var u = pa.getAttribute("data-pasillo"), ya = pa.classList.contains("lx-elegido");
      centro.querySelectorAll("[data-pasillo]").forEach(function (x) { x.classList.toggle("lx-elegido", x === pa && !ya); x.style.opacity = !ya && x !== pa ? ".45" : ""; });
      centro.querySelectorAll(".lx-tr[data-u]").forEach(function (f) { f.hidden = !ya && f.getAttribute("data-u") !== u; });
    }
  });

  document.addEventListener("keydown", function (e) {
    if (Lx.abiertos() || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.altKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); Dlg.cargar(function () { if (!bandeja.querySelector('[data-lista="nueva"]')) agregarPendiente("nueva"); else elegir("nueva"); }); return; }
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === "a" || e.key === "A") { aplicar(); return; }
    if (e.key === "d" || e.key === "D") { descartar(); return; }
    if (e.key === "j" || e.key === "k" || e.key === "J" || e.key === "K") {
      var p = Array.prototype.slice.call(pendientes()), i = p.map(function (x) { return x.getAttribute("data-lista"); }).indexOf(est.lista);
      var n = p[Math.max(0, Math.min(p.length - 1, i + (e.key.toLowerCase() === "j" ? 1 : -1)))];
      if (n) elegir(n.getAttribute("data-lista"));
    }
  });
})();

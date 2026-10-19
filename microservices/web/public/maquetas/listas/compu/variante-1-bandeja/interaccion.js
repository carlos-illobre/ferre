/* Compu 1 · La bandeja y la revisión: lo que pasa al tocar. Datos en ../../_propio/datos.js. */
(function () {
  var L = DATOS.listas, FOTOS = "../../../_comun/fotos/";
  var rev = document.getElementById("lx-rev");
  var revisar = document.getElementById("lx-revisar");
  var ultimas = document.getElementById("lx-ultimas");
  var est = { lista: "bulonera", filtro: "cambian", foco: 1, contado: { bulonera: 5 }, vista: "revision", margenes: {} };
  var CHIPS = [["cambian", "Cambian"], ["subas", "Subas de más de 15 %"], ["nuevos", "Nuevos"], ["noestan", "Ya no están"], ["salteadas", "Salteadas"]];
  var CUENTA = { cambian: "cambian", subas: "subas", nuevos: "nuevos", noestan: "noestan", salteadas: "salteadas" };

  // L.plata se arma cuando se dice de quién es el adjunto
  L.plata = JSON.parse(JSON.stringify(L.sur));
  Object.assign(L.plata, { prov: "Pinturas del Plata", fecha: "13/10/2026", corta: "13/10", icono: "file-text", archivo: "precios-oct-2026.pdf", llego: "llegó por correo el lunes", leidos: 2104, cambian: 342, pc: "+6,1 %", precios: 251, sin: 1740, nuevos: 2, noestan: 3, salteadas: 3, subas: 4 });

  // ---------------- La revisión ----------------
  function contado(k) { return est.contado[k] || 5; }
  function filasDe(k, filtro) {
    var f = L[k].filas[filtro] || [];
    var cs = contado(k);
    return f.map(function (r) {
      var o = Object.assign({}, r);
      if (cs !== 5 && o.c != null) o.c = Math.round(o.c * (1 - cs / 100) / 0.95 * 100) / 100;
      if (est.margenes[o.n] != null) o.m = est.margenes[o.n];
      return o;
    });
  }
  function preciosQueCambian(k) { return contado(k) === 6 ? 598 : L[k].precios; }

  function estante(r) {
    if (r.t === "noesta") {
      var c = r.clase === "urgente" ? "sinprecio" : r.clase === "logro" ? "" : "estante igual";
      return '<span class="der ' + c + '"' + (r.clase === "logro" ? ' style="color:var(--logro-texto);font-weight:750"' : "") + ">" + r.que + "</span>";
    }
    if (r.m == null) return '<span class="der sinprecio">Sin precio</span>';
    var pn = Lx.precio(r.c, r.m);
    if (r.a == null) return '<span class="der estante">' + Lx.pesos(pn) + "</span>";
    var pa = Lx.precio(r.a, r.m);
    if (pa === pn) return '<span class="der estante igual">' + Lx.pesos(pn) + " · queda igual</span>";
    return '<span class="der estante"><s>' + Lx.pesos(pa) + '</s><i class="i i-s" data-i="arrow-right"></i>' + Lx.pesos(pn) + "</span>";
  }
  function filaHTML(r, k) {
    var foto = r.f ? '<div class="foto chica"><img src="' + FOTOS + r.f + '.webp" alt=""></div>'
      : '<div class="foto chica" style="color:var(--urgente-texto)"><i class="i i-s" data-i="circle-alert"></i></div>';
    var cuerpo = '<div style="min-width:0"><div class="n">' + r.n + "</div>" + (r.d ? '<div class="d">' + r.d + "</div>" : "") + "</div>";
    if (r.t === "saltea") return '<div class="tr" data-k="' + k + '">' + foto + cuerpo + '<span class="der sinprecio" style="grid-column:3 / -1">' + r.motivo + "</span></div>";
    var antes = r.a != null ? Lx.pesosC(r.a) : "—", nuevo = r.c != null ? Lx.pesosC(r.c) : "—", cambio;
    if (r.t === "nuevo") cambio = '<span class="var" style="background:var(--accion-suave);color:var(--accion-texto)">Nuevo</span>';
    else if (r.t === "noesta") cambio = '<span class="var">Ya no</span>';
    else { var p = (r.c - r.a) / r.a * 100; cambio = '<span class="var' + (p > 15 ? " grande" : p < 0 ? " baja" : "") + '">' + Lx.pct(p) + "</span>"; }
    return '<div class="tr" data-k="' + k + '">' + foto + cuerpo + '<span class="der antes">' + antes + '</span><span class="der' + (r.c != null ? " nuevo" : " antes") + '">' + nuevo +
      '</span><span class="der">' + cambio + "</span>" + estante(r) + "</div>";
  }
  function paso(et, v, fin) { return '<span class="paso' + (fin ? " fin" : "") + '"><small>' + et + "</small>" + v + "</span>"; }
  var FL = '<i class="i i-s" data-i="chevron-right"></i>';
  function explicaHTML(r) {
    var x;
    if (r.t === "saltea") x = '<span>La fila del Excel se salteó: ' + r.motivo.charAt(0).toLowerCase() + r.motivo.slice(1) + '. No cambia nada.</span>';
    else if (r.t === "noesta") x = "<span>No vino en esta lista: si aplicás, deja de tener costo de " + L[est.lista].prov + ". " + r.que + ".</span>";
    else {
      var cs = contado(est.lista), lista = r.c / (0.75 * (1 - cs / 100));
      x = paso("lista", Lx.pesosC(lista)) + FL + paso("línea", "− 25 %") + FL + paso("contado", "− " + cs + " %") + FL;
      if (r.m == null) x += paso("costo", Lx.pesosC(r.c)) + FL + '<button class="btn chico" data-lx="elegir-margen" style="height:30px"><i class="i i-s" data-i="percent"></i>Elegí el margen</button>';
      else x += paso("margen", r.m + " %") + FL + paso("IVA", "21 %") + FL + '<span class="paso fin">' + Lx.pesos(Lx.precio(r.c, r.m)) + "</span>";
    }
    return '<div class="explica lx-entra-arriba lx-pasos">' + x + "</div>";
  }
  function animarPasos(el) {
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.animationDelay = (i * 30) + "ms"; });
  }

  function tablaHTML() {
    var filas = filasDe(est.lista, est.filtro);
    var h = '<div class="tr th"><span></span><span>Producto</span><span class="der">Costo antes</span><span class="der">Costo nuevo</span><span class="der">Cambio</span><span class="der">Precio en estantería</span></div>';
    if (!filas.length) return h + '<div style="padding:32px;text-align:center" class="t-detalle">Ninguno sube más de 15 % en esta lista.</div>';
    filas.forEach(function (r, i) { h += filaHTML(r, i); });
    return h;
  }
  function ponerFoco(i, animar) {
    var tabla = rev.querySelector(".tabla");
    var filas = tabla.querySelectorAll(".tr:not(.th)");
    if (!filas.length) return;
    i = Math.max(0, Math.min(filas.length - 1, i));
    est.foco = i;
    tabla.querySelectorAll(".tr.foco").forEach(function (f) { f.classList.remove("foco"); });
    tabla.querySelectorAll(".explica").forEach(function (e) { e.remove(); });
    var fila = filas[i];
    fila.classList.add("foco");
    var foto = fila.querySelector(".foto");
    var r = filasDe(est.lista, est.filtro)[i];
    fila.insertAdjacentHTML("afterend", explicaHTML(r));
    var ex = fila.nextElementSibling;
    if (!animar) ex.classList.remove("lx-entra-arriba", "lx-pasos"); else animarPasos(ex);
    Lx.pintar(ex);
    if (foto) foto.style.background = "#fff";
    filas.forEach(function (f) { if (f !== fila) { var ft = f.querySelector(".foto"); if (ft) ft.style.background = ""; } });
  }
  function pintarTabla() {
    var tabla = rev.querySelector(".tabla");
    tabla.innerHTML = tablaHTML();
    Lx.pintar(tabla);
    ponerFoco(est.foco, false);
  }

  function revHTML(k) {
    var l = L[k], cs = contado(k);
    var acc = l.icono === "mail" ? '<button class="btn chico btn-suave" data-lx="correo"><i class="i i-s" data-i="mail-open"></i>Ver el correo</button>'
      : l.icono === "globe" ? '<button class="btn chico btn-suave" data-lx="portal"><i class="i i-s" data-i="globe"></i>Ver en el portal</button>'
      : l.icono === "file-text" ? '<button class="btn chico btn-suave" data-lx="correo"><i class="i i-s" data-i="mail-open"></i>Ver el correo</button>' : "";
    var aviso = "";
    if (l.aviso && cs === 5) aviso = '<div class="aviso urgente"><i class="i" data-i="triangle-alert"></i><span>La planilla dice <b>6 % de contado</b> y ' + l.prov + ' tiene <b>5 %</b>: se calculó con 5 %.</span><button class="btn chico" data-lx="usar6">Usar 6 %</button></div>';
    if (l.aviso && cs === 6) aviso = '<div class="aviso logro lx-fundido"><i class="i" data-i="circle-check"></i><span>' + l.prov + ' ahora tiene <b>6 % de contado</b>: la lista se recalculó.</span><button class="btn chico" data-lx="usar5" style="margin-left:auto;background:#fff">Deshacer</button></div>';
    var chips = CHIPS.map(function (c) {
      return '<span class="chip' + (c[0] === est.filtro ? " elegido" : "") + '" data-filtro="' + c[0] + '">' + c[1] + ' <span class="cta">' + l[CUENTA[c[0]]] + "</span></span>";
    }).join("");
    return '<div class="rev-cab"><span class="doc"><i class="i i-l" data-i="file-spreadsheet"></i></span><div><div class="t-seccion">' + l.prov + " · lista del " + l.fecha +
      '</div><div class="t-detalle">' + l.archivo + " · " + l.llego + ' · reconocida sola</div></div><div class="acc">' + acc + "</div></div>" +
      '<div class="numeros"><div class="nro"><div class="et">Leídos</div><div class="va">' + Lx.miles(l.leidos) + '</div></div><div class="nro cambian"><div class="et">Cambian</div><div class="va">' + Lx.miles(l.cambian) + "<small>" + l.pc +
      '</small></div></div><div class="nro"><div class="et">Nuevos</div><div class="va">' + l.nuevos + '</div></div><div class="nro"><div class="et">Sin cambio</div><div class="va">' + Lx.miles(l.sin) +
      '</div></div><div class="nro"><div class="et">Ya no están</div><div class="va">' + l.noestan + '</div></div><div class="nro saltea"><div class="et">Salteadas</div><div class="va">' + l.salteadas + "</div></div></div>" +
      aviso + '<div class="filtros">' + chips + '</div><div class="tabla"></div>' +
      '<div class="pie-rev"><button class="btn btn-fantasma chico" data-lx="descartar">Descartar <span class="kbd">Alt D</span></button><span class="nota"><i class="i i-s" data-i="lock"></i>Nada cambia hasta aplicar</span><span class="nota" style="color:var(--texto-3)"><span class="kbd">↑</span><span class="kbd">↓</span><span class="kbd">Espacio</span></span>' +
      '<button class="btn btn-accion" data-lx="aplicar">Aplicar · cambian ' + Lx.miles(preciosQueCambian(k)) + ' precios <span class="kbd">Ctrl Enter</span></button></div>';
  }
  function pintarRev(fundido) {
    est.vista = "revision";
    rev.innerHTML = revHTML(est.lista);
    Lx.pintar(rev);
    pintarTabla();
    if (fundido) Lx.reanimar(rev, "lx-fundido");
  }

  // ---------------- La bandeja de la izquierda ----------------
  function pendientes() { return revisar.querySelectorAll(".fila[data-lista]"); }
  function actualizarCuentas() {
    var n = pendientes().length;
    Array.prototype.forEach.call(pendientes(), function (f, i) { var k = f.querySelector(".kbd"); if (k) k.textContent = i + 1; });
    [revisar.querySelector(".cab .pastilla"), document.querySelector(".pestanas a.activa .pastilla")].forEach(function (p) {
      if (!p) return;
      p.textContent = n;
      p.style.display = n ? "" : "none";
      Lx.reanimar(p, "lx-salta");
    });
  }
  function elegir(k) {
    est.lista = k; est.filtro = "cambian"; est.foco = k === "bulonera" ? 1 : 0;
    revisar.querySelectorAll(".fila").forEach(function (f) { f.classList.toggle("elegida", f.getAttribute("data-lista") === k); });
    pintarRev(true);
  }
  function filaPendiente(k) {
    var l = L[k];
    var d = document.createElement("div");
    d.className = "fila";
    d.setAttribute("data-lista", k);
    d.innerHTML = '<span class="ic"><i class="i" data-i="' + l.icono + '"></i></span><div style="min-width:0"><div class="n">' + l.prov + '</div><div class="d">' + l.corta + " · " + l.llego + '</div></div><span class="kbd">' + (pendientes().length + 1) + "</span>";
    Lx.pintar(d);
    return d;
  }
  function entrar(el) {
    el.classList.add("lx-entra", "lx-nuevo-borde");
    setTimeout(function () { el.classList.remove("lx-nuevo-borde"); }, 1000);
  }
  function ponerUltima(k, estado) {
    var l = L[k];
    var vieja = ultimas.querySelector(".fila:not([hidden])");
    var d = document.createElement("div");
    d.className = "fila";
    d.setAttribute("data-ultima", k);
    d.innerHTML = '<span class="ic"><i class="i" data-i="file-spreadsheet"></i></span><div style="min-width:0"><div class="n">' + l.prov + '</div><div class="d">' + l.corta + " · " +
      (estado === "Aplicada" ? Lx.miles(preciosQueCambian(k)) + " cambiados" : "recién") + '</div></div><span class="pastilla' + (estado === "Aplicada" ? " logro" : "") + '">' + estado + "</span>";
    Lx.pintar(d);
    if (vieja) { vieja.hidden = true; vieja.parentNode.insertBefore(d, vieja); } else ultimas.appendChild(d);
    entrar(d);
    Dlg.HISTORIAL.unshift([l.prov, l.corta, estado, estado === "Aplicada" ? Lx.miles(preciosQueCambian(k)) + " cambiados" : Lx.miles(l.leidos) + " leídos"]);
    return { nueva: d, vieja: vieja };
  }
  function sacarPendiente(k, despues) {
    var f = revisar.querySelector('.fila[data-lista="' + k + '"]');
    if (!f) return null;
    var sig = f.nextElementSibling;
    f.classList.add("lx-sale");
    setTimeout(function () { f.remove(); f.classList.remove("lx-sale"); actualizarCuentas(); if (despues) despues(); }, 220);
    return { fila: f, sig: sig };
  }
  function siguienteOVacio() {
    var p = pendientes()[0];
    if (p) { elegir(p.getAttribute("data-lista")); return; }
    est.vista = "vacia";
    rev.innerHTML = '<div style="margin:auto;text-align:center;display:grid;gap:12px;justify-items:center" class="lx-fundido">' + Lx.tilde() +
      '<div class="t-seccion">No hay listas para revisar</div><div class="t-detalle">Las que lleguen por correo o del portal aparecen solas a la izquierda.</div>' +
      '<button class="btn" data-lx="subir"><i class="i i-s" data-i="upload"></i>Subir una lista</button></div>';
    Lx.pintar(rev);
  }

  // ---------------- Cargar una lista ----------------
  var subiendo = false;
  function subir() {
    if (subiendo) return;
    subiendo = true;
    var zona = document.querySelector(".soltar");
    var antes = zona.innerHTML;
    zona.classList.remove("arrastrando");
    zona.innerHTML = '<span class="ico"><i class="i" data-i="file-spreadsheet"></i></span><div class="lx-leyendo" style="flex:1;min-width:0"><b>herrajes-avellaneda-oct.xlsx</b><span class="lx-txt">Leyendo… 0 de 1.842</span><div class="barra"><b></b></div></div>';
    Lx.pintar(zona);
    var txt = zona.querySelector(".lx-txt"), barra = zona.querySelector(".barra > b");
    Lx.avanzar(1842, 1600, function (v, f) { txt.textContent = "Leyendo… " + Lx.miles(v) + " de 1.842"; barra.style.transform = "scaleX(" + f + ")"; }, function () {
      txt.textContent = "Buscando cada producto en el catálogo…";
      setTimeout(function () {
        zona.innerHTML = antes;
        Lx.pintar(zona);
        Lx.reanimar(zona, "lx-fundido");
        var ya = revisar.querySelector('.fila[data-lista="nueva"]');
        if (!ya) {
          var d = filaPendiente("nueva");
          revisar.querySelector(".cab").insertAdjacentElement("afterend", d);
          entrar(d);
          actualizarCuentas();
        }
        elegir("nueva");
        subiendo = false;
      }, 500);
    });
  }
  var zona = document.querySelector(".soltar");
  ["dragenter", "dragover"].forEach(function (ev) { document.addEventListener(ev, function (e) { e.preventDefault(); var z = document.querySelector(".soltar"); if (z && !subiendo) z.classList.add("arrastrando"); }); });
  document.addEventListener("dragleave", function (e) { if (!e.relatedTarget) { var z = document.querySelector(".soltar"); if (z) z.classList.remove("arrastrando"); } });
  document.addEventListener("drop", function (e) { e.preventDefault(); subir(); });

  // ---------------- Aplicar y su resultado ----------------
  var PASILLOS = [["A", 202], ["B", 188], ["C", 141], ["D", 77], ["E", 33]];
  function filasRemarcar(k) {
    var vistas = {}, out = [];
    ["cambian", "subas"].forEach(function (f) {
      filasDe(k, f).forEach(function (r) {
        if (r.m == null || vistas[r.n]) return;
        var pa = Lx.precio(r.a, r.m), pn = Lx.precio(r.c, r.m);
        if (pa === pn) return;
        vistas[r.n] = 1; out.push([r.f, r.n, r.d, r.u, pa, pn]);
      });
    });
    if (k === "bulonera") DATOS.remarcar.forEach(function (r) { if (!vistas[r[1]]) { vistas[r[1]] = 1; out.push([r[0], r[1], r[2], r[3], r[4], r[5]]); } });
    return out.sort(function (a, b) { return a[3] < b[3] ? -1 : 1; });
  }
  var COLS = 'style="grid-template-columns:40px minmax(0,1fr) 104px 84px 84px 132px"';
  function resultadoHTML(k) {
    var l = L[k], n = preciosQueCambian(k);
    var chips = '<span class="chip elegido" data-pasillo="">Todos <span class="cta">' + Lx.miles(n) + "</span></span>" +
      (k === "bulonera" ? PASILLOS.map(function (p) { return '<span class="chip" data-pasillo="' + p[0] + '">Pasillo ' + p[0] + ' <span class="cta">' + p[1] + "</span></span>"; }).join("") : "");
    var filas = filasRemarcar(k).map(function (r) {
      return '<div class="tr" ' + COLS + ' data-u="' + r[3][0] + '"><div class="foto chica"><img src="' + FOTOS + r[0] + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + r[1] + '</div><div class="d">' + r[2] +
        '</div></div><span class="pastilla pino" style="height:26px;justify-self:start"><i class="i i-s" data-i="map-pin"></i>' + r[3] + '</span><span class="der antes"><s>' + Lx.pesos(r[4]) + '</s></span><span class="der nuevo" style="border:0">' + Lx.pesos(r[5]) +
        '</span><span class="der"><button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button></span></div>';
    }).join("");
    var sinPrecio = l.nuevos - Object.keys(est.margenes).filter(function (n) { return l.filas.nuevos.some(function (r) { return r.n === n; }); }).length;
    var aviso = sinPrecio > 0 ? '<div class="aviso urgente" id="lx-aviso-nuevos"><i class="i" data-i="triangle-alert"></i><span><b>' + sinPrecio + (sinPrecio === 1 ? " nuevo quedó" : " nuevos quedaron") + ' sin precio</b>: no se pueden vender hasta elegirles el margen.</span><button class="btn chico" data-lx="margenes" style="margin-left:auto;background:#fff">Ponerles precio</button></div>'
      : '<div class="aviso logro" id="lx-aviso-nuevos"><i class="i" data-i="circle-check"></i><span>Los nuevos ya tienen precio.</span></div>';
    return '<div class="rev-cab lx-fundido">' + Lx.tilde() + '<div><div class="t-seccion">' + Lx.miles(n) + " precios actualizados · " + l.nuevos + (l.nuevos === 1 ? " nuevo" : " nuevos") +
      '</div><div class="t-detalle">Lista de ' + l.prov + " del " + l.fecha + " · aplicada hoy 10:44 · " + Lx.miles(l.cambian) + ' costos nuevos · sin duplicados nuevos</div></div></div>' + aviso +
      '<div class="filtros"><b style="font-size:16px;font-weight:800;margin-right:4px">Para remarcar</b>' + chips + '</div><div class="tabla lx-entra">' +
      '<div class="tr th" ' + COLS + '><span></span><span>Producto</span><span>Estantería</span><span class="der">Decía</span><span class="der">Ahora</span><span class="der"></span></div>' + filas + "</div>" +
      '<div class="pie-rev"><span class="nota"><i class="i i-s" data-i="footprints"></i>Por pasillo, en el orden del local</span>' +
      '<button class="btn chico" data-lx="al-celu" style="margin-left:auto"><i class="i i-s" data-i="smartphone"></i>Remarcar con el celular</button>' +
      '<button class="btn btn-accion" data-lx="imprimir" style="margin-left:0"><i class="i i-s" data-i="printer"></i>Imprimir las ' + Lx.miles(n) + ' etiquetas <span class="kbd">Ctrl P</span></button></div>';
  }
  var aplicando = false;
  function aplicar(btn) {
    if (aplicando || est.vista !== "revision") return;
    aplicando = true;
    var k = est.lista, l = L[k];
    btn = btn || rev.querySelector('[data-lx="aplicar"]');
    btn.classList.add("lx-llenando");
    btn.innerHTML = '<span class="lx-relleno"></span><span class="lx-txt">Aplicando… 0 de ' + Lx.miles(l.leidos) + "</span>";
    var rel = btn.querySelector(".lx-relleno"), txt = btn.querySelector(".lx-txt");
    Lx.avanzar(l.leidos, 1800, function (v, f) { rel.style.transform = "scaleX(" + f + ")"; txt.textContent = "Aplicando… " + Lx.miles(v) + " de " + Lx.miles(l.leidos); }, function () {
      txt.textContent = "Buscando duplicados…";
      setTimeout(function () {
        est.vista = "resultado";
        rev.innerHTML = resultadoHTML(k);
        Lx.pintar(rev);
        Lx.vibrar([10, 40, 10]);
        sacarPendiente(k);
        ponerUltima(k, "Aplicada");
        aplicando = false;
      }, 600);
    });
  }

  function descartar() {
    if (est.vista !== "revision") return;
    var k = est.lista, l = L[k];
    var quitada = sacarPendiente(k, siguienteOVacio);
    var ult = ponerUltima(k, "Descartada");
    Lx.tostada("Descartaste la lista de " + l.prov, { icono: "trash-2", deshacer: function () {
      ult.nueva.remove(); if (ult.vieja) ult.vieja.hidden = false;
      Dlg.HISTORIAL.shift();
      if (quitada) { if (quitada.sig && quitada.sig.parentNode) quitada.sig.parentNode.insertBefore(quitada.fila, quitada.sig); else revisar.appendChild(quitada.fila); entrar(quitada.fila); }
      actualizarCuentas();
      elegir(k);
    } });
  }

  Lx.on({
    subir: subir,
    aplicar: function (el) { aplicar(el); },
    descartar: descartar,
    usar6: function () { est.contado.bulonera = 6; pintarRev(false); Lx.tostada("Bulonera Centro: contado 6 %, guardado en su ficha", { icono: "percent" }); },
    usar5: function () { est.contado.bulonera = 5; pintarRev(false); },
    "elegir-margen": function (el) {
      var fila = filasDe(est.lista, est.filtro)[est.foco];
      var m = Lx.abrir('<div class="t-detalle" style="padding:4px 10px 6px">Margen para <b style="color:var(--tinta)">' + fila.n + "</b></div>" + [300, 200, 100, 50, 25].map(function (v) {
        return '<a class="lx-op" data-margen="' + v + '" data-cerrar>' + v + " %<small>" + Lx.pesos(Lx.precio(fila.c, v)) + "</small></a>";
      }).join(""), { tipo: "menu", junto: el });
      m.addEventListener("click", function (e) {
        var o = e.target.closest("[data-margen]"); if (!o) return;
        est.margenes[fila.n] = Number(o.getAttribute("data-margen"));
        pintarTabla();
        Lx.tostada(fila.n + ": " + Lx.pesos(Lx.precio(fila.c, est.margenes[fila.n])) + " al aplicar", { icono: "tag" });
      });
    },
    margenes: function () {
      var l = L[est.lista];
      Dlg.margenes(l, est.margenes, function () {
        if (est.vista !== "resultado") return;
        var falta = l.filas.nuevos.filter(function (n) { return est.margenes[n.n] == null; }).length;
        var av = document.getElementById("lx-aviso-nuevos");
        if (av && !falta) { av.outerHTML = '<div class="aviso logro lx-fundido" id="lx-aviso-nuevos"><i class="i" data-i="circle-check"></i><span>Los ' + l.nuevos + ' nuevos ya tienen precio: entran en las etiquetas.</span></div>'; Lx.pintar(rev); }
        else if (av) av.querySelector("b").textContent = falta + (falta === 1 ? " nuevo quedó" : " nuevos quedaron") + " sin precio";
      });
    },
    remarcado: function (el) {
      var fila = el.closest(".tr");
      var hecho = !fila.classList.contains("lx-hecho");
      fila.classList.toggle("lx-hecho", hecho);
      fila.style.opacity = hecho ? ".55" : "";
      fila.querySelector(".n").style.textDecoration = hecho ? "line-through" : "";
      el.outerHTML = hecho ? '<span class="pastilla logro lx-entra" data-lx="remarcado" style="height:30px"><i class="i i-s" data-i="check"></i>Remarcado</span>' : '<button class="btn chico btn-suave" data-lx="remarcado">Remarcado</button>';
      Lx.pintar(fila);
    },
    imprimir: function () { Lx.tostada("Mandé " + Lx.miles(preciosQueCambian(est.lista)) + " etiquetas a la impresora del mostrador", { icono: "printer" }); },
    "al-celu": function () { Lx.tostada("En el Moto G54: Listas › Remarcar, ordenado por pasillo", { icono: "smartphone" }); },
    correo: function () { Dlg.correo(L[est.lista]); },
    portal: function () { Dlg.portal(L[est.lista]); },
    adjunto: function (el) {
      Dlg.adjunto(function (prov) {
        L.plata.prov = prov;
        var nueva = filaPendiente("plata");
        el.replaceWith(nueva);
        entrar(nueva);
        actualizarCuentas();
        elegir("plata");
      });
    },
    "agregar-prov": function () {
      Dlg.agregarProv(function (nombre) {
        var tarjeta = document.getElementById("lx-prov");
        var c = tarjeta.querySelector(".cab .pastilla"); c.textContent = Dlg.PROVS.length; Lx.reanimar(c, "lx-salta");
        var d = document.createElement("div");
        d.className = "prov"; d.setAttribute("data-prov", nombre);
        d.innerHTML = '<span class="pt" style="background:var(--borde-fuerte)"></span><b>' + nombre + '</b><span class="pastilla contorno" style="height:24px">Sin listas</span>';
        var provs = tarjeta.querySelectorAll(".prov:not([hidden])");
        tarjeta.insertBefore(d, provs[0]);
        provs[provs.length - 1].hidden = true;
        entrar(d);
      });
    }
  });

  // Clics sueltos: elegir una lista, un filtro, una fila, un proveedor, un pasillo
  document.addEventListener("click", function (e) {
    var t = e.target;
    var lista = t.closest("#lx-revisar .fila[data-lista]");
    if (lista) { elegir(lista.getAttribute("data-lista")); return; }
    var prov = t.closest("#lx-prov .prov[data-prov]");
    if (prov) { Dlg.fichaProv(prov.getAttribute("data-prov")); return; }
    var chip = t.closest("#lx-rev .chip[data-filtro]");
    if (chip) { est.filtro = chip.getAttribute("data-filtro"); est.foco = 0; rev.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("elegido", c === chip); }); pintarTabla(); return; }
    var pas = t.closest("#lx-rev .chip[data-pasillo]");
    if (pas) {
      var u = pas.getAttribute("data-pasillo");
      rev.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("elegido", c === pas); });
      rev.querySelectorAll(".tr[data-u]").forEach(function (f) { f.hidden = !!u && f.getAttribute("data-u") !== u; });
      return;
    }
    var fila = t.closest("#lx-rev .tabla .tr:not(.th)");
    if (fila && est.vista === "revision" && !t.closest("button")) {
      var filas = Array.prototype.slice.call(rev.querySelectorAll(".tabla .tr:not(.th)"));
      ponerFoco(filas.indexOf(fila), true);
    }
  });

  document.addEventListener("keydown", function (e) {
    if (Lx.abiertos() || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.altKey && (e.key === "s" || e.key === "S")) { e.preventDefault(); subir(); return; }
    if (e.altKey && (e.key === "d" || e.key === "D")) { e.preventDefault(); descartar(); return; }
    if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); aplicar(); return; }
    if (e.ctrlKey && (e.key === "p" || e.key === "P") && est.vista === "resultado") { e.preventDefault(); rev.querySelector('[data-lx="imprimir"]').click(); return; }
    if (est.vista !== "revision") return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); ponerFoco(est.foco + (e.key === "ArrowDown" ? 1 : -1), true); return; }
    if (e.key === " ") {
      e.preventDefault();
      var ex = rev.querySelector(".tabla .explica");
      if (ex) ex.remove(); else ponerFoco(est.foco, true);
      return;
    }
    if (/^[1-9]$/.test(e.key)) { var p = pendientes()[Number(e.key) - 1]; if (p) elegir(p.getAttribute("data-lista")); }
  });
})();

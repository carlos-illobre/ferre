/* Celu 1 · Listas: lo que pasa al tocar. Datos en ../../_propio/datos.js. */
(function () {
  var L = DATOS.listas, FOTOS = Dlg.FOTOS;
  var pend = document.getElementById("lx-pend");
  var masPend = document.getElementById("lx-mas-pend");
  var ultimas = document.getElementById("lx-ultimas");
  var est = { pendientes: ["bulonera", "sur"], margenes: {}, contado: {} };
  var COMO = { mail: "Llegó por correo", globe: "Bajada de su portal", "file-up": "La subiste recién" };

  function precios(k) { return est.contado[k] === 6 ? 598 : L[k].precios; }

  // ---------------- La tarjeta de la lista pendiente ----------------
  function pintarPend(animar) {
    var k = est.pendientes[0];
    if (!k) {
      pend.innerHTML = '<div class="arr">' + Lx.tilde() + '<div><div class="nom">No hay listas para revisar</div><div class="d">Las que lleguen por correo o del portal aparecen solas acá.</div></div></div>';
      masPend.hidden = true;
    } else {
      var l = L[k], cambian = l.cambian / l.leidos * 100, nuevos = l.nuevos / l.leidos * 100;
      pend.innerHTML = '<div class="arr"><span class="ic"><i class="i i-l" data-i="' + l.icono + '"></i></span><div style="min-width:0"><div class="et">' + COMO[l.icono] + ' · para revisar</div><div class="nom">' + l.prov +
        '</div><div class="d">Lista del ' + l.fecha + " · " + l.hora.replace(/^(\d)/, "hoy $1") + '</div></div></div><div class="cifras"><div class="cifra pino"><div class="va">' + Lx.miles(l.cambian) + "<small>" + l.pc + '</small></div><div class="et2">cambian</div></div>' +
        '<div class="cifra"><div class="va">' + l.nuevos + '</div><div class="et2">' + (l.nuevos === 1 ? "nuevo" : "nuevos") + '</div></div><div class="cifra"><div class="va">' + l.noestan + '</div><div class="et2">no están</div></div></div>' +
        '<div class="franja"><b style="width:' + Math.max(2, Math.round(cambian)) + '%;background:var(--pino)"></b><b style="width:' + Math.max(1, Math.round(nuevos)) + '%;background:var(--accion)"></b><b style="flex:1;background:var(--hundido-2)"></b></div>' +
        '<button class="btn btn-accion grande" data-lx="revisar">Revisar y aplicar <i class="i" data-i="arrow-right"></i></button>';
      var otra = est.pendientes[1];
      masPend.hidden = !otra;
      if (otra) {
        var n = est.pendientes.length - 1;
        masPend.querySelector("span").innerHTML = "Y <b>" + n + " más</b>: " + L[otra].prov + ", " + (L[otra].icono === "globe" ? "de su portal" : L[otra].icono === "mail" ? "por correo" : "subida recién");
      }
    }
    Lx.pintar(pend); Lx.pintar(masPend);
    if (animar) Lx.reanimar(pend, "lx-entra");
  }

  function ponerUltima(k, estado) {
    var l = L[k];
    var d = document.createElement("div");
    d.className = "row";
    d.setAttribute("data-lx", "carga-hecha"); d.setAttribute("data-k", k); d.setAttribute("data-estado", estado);
    d.innerHTML = '<span class="ic"><i class="i" data-i="file-spreadsheet"></i></span><span class="n">' + l.prov + '</span><span class="pastilla' + (estado === "Aplicada" ? " logro" : "") + '">' + (estado === "Aplicada" ? '<i class="i i-s" data-i="check"></i>' : "") + estado +
      '</span><span class="d">Lista del ' + l.corta + " · <b>" + (estado === "Aplicada" ? Lx.miles(precios(k)) + "</b> cambiados" : Lx.miles(l.leidos) + "</b> leídos") + "</span>";
    Lx.pintar(d);
    ultimas.insertBefore(d, ultimas.firstChild);
    var sobra = ultimas.querySelectorAll(".row:not([hidden])");
    if (sobra.length > 2) sobra[sobra.length - 1].hidden = true;
    d.classList.add("lx-entra", "lx-nuevo-borde");
    setTimeout(function () { d.classList.remove("lx-nuevo-borde"); }, 1000);
    Dlg.HISTORIAL.unshift([l.prov, l.corta, estado, estado === "Aplicada" ? Lx.miles(precios(k)) + " cambiados" : Lx.miles(l.leidos) + " leídos"]);
    return d;
  }
  function quitarUltima(d) {
    d.remove(); Dlg.HISTORIAL.shift();
    var oculta = ultimas.querySelector(".row[hidden]"); if (oculta) oculta.hidden = false;
  }

  // ---------------- La revisión (entra desde la derecha) ----------------
  function fila(ic, n, d, der, attrs) {
    return '<div class="lx-r"' + (attrs || "") + '><span class="ic"><i class="i" data-i="' + ic + '"></i></span><div style="min-width:0"><div class="n">' + n + '</div><div class="d">' + d + '</div></div><span class="der">' + (der || "") + "</span></div>";
  }
  var FL = '<i class="i i-s" data-i="chevron-right" style="color:var(--texto-3)"></i>';
  function sinPrecio(k) { return L[k].filas.nuevos.filter(function (n) { return est.margenes[n.n] == null; }).length; }
  function avisoContado(k) {
    var l = L[k];
    if (!l.aviso) return "";
    if (est.contado[k] === 6) return '<div class="aviso logro lx-fundido" style="margin-top:12px"><i class="i" data-i="circle-check"></i><span>Ahora tiene <b>6 % de contado</b>: se recalculó.</span><button class="btn chico" data-lx="usar5" style="background:#fff">Deshacer</button></div>';
    return '<div class="aviso urgente" style="margin-top:12px"><i class="i" data-i="triangle-alert"></i><span>La planilla dice <b>6 % de contado</b> y tiene 5 %: se calculó con 5 %.</span><button class="btn chico" data-lx="usar6" style="background:#fff">Usar 6 %</button></div>';
  }
  function revCuerpo(k) {
    var l = L[k], sp = sinPrecio(k);
    var max = l.filas.subas.length ? Math.max.apply(null, l.filas.subas.map(function (r) { return (r.c - r.a) / r.a * 100; })) : 0;
    var tiene = l.filas.noestan.filter(function (r) { return r.clase === "urgente"; }).length;
    return '<div class="lx-hero"><div class="et">Si aplicás, en la estantería cambian</div><div class="num"><span class="lx-precios">' + Lx.miles(precios(k)) + '</span> <small>precios</small></div><div class="sube"><i class="i i-s" data-i="trending-up"></i>El costo sube ' + l.pc.replace("+", "") + " en promedio</div></div>" +
      avisoContado(k) +
      '<div class="lx-sec"><b>Antes de aplicar</b></div><div class="lx-lista">' +
      fila("package-plus", l.nuevos + (l.nuevos === 1 ? " nuevo" : " nuevos"), sp ? sp + " sin precio: elegí el margen" : "Todos con precio", sp ? Dlg.pas("Sin precio", "urgente") : Dlg.pas("Listo", "logro"), ' data-lx="r-nuevos" style="cursor:pointer"') +
      fila("trending-up", l.subas + " suben más de 15 %", l.subas ? "El que más sube: " + Lx.pct(max) : "Ninguno sube tanto", FL, ' data-lx="r-subas" style="cursor:pointer"') +
      fila("circle-x", l.noestan + " ya no están", tiene ? tiene + " con stock: " + l.filas.noestan.filter(function (r) { return r.clase === "urgente"; })[0].n.split(" ").slice(0, 2).join(" ").toLowerCase() : "Ninguno tiene stock", FL, ' data-lx="r-noestan" style="cursor:pointer"') +
      fila("ban", l.salteadas + " filas salteadas", "No se leyeron: falta el código o el precio", FL, ' data-lx="r-salteadas" style="cursor:pointer"') +
      "</div>" +
      '<div class="lx-sec"><b>Lo que cambia de costo</b><span>' + Lx.miles(l.cambian) + "</span></div>" + '<div class="lx-lista">' + l.filas.cambian.slice(0, 4).map(function (r) {
        var pa = r.m == null ? null : Lx.precio(r.a, r.m), pn = r.m == null ? null : Lx.precio(r.c, r.m);
        var der = r.m == null ? Dlg.pas("Sin precio", "urgente") : pa === pn ? '<span style="color:var(--texto-2);font-weight:650">Queda igual</span>' : "<s>" + Lx.pesos(pa) + "</s>" + Lx.pesos(pn);
        return Dlg.rf(r.f, r.n, "Costo " + Lx.pct((r.c - r.a) / r.a * 100), der);
      }).join("") + '<div class="lx-r"><span class="ic"><i class="i" data-i="ellipsis"></i></span><div class="n">Y ' + Lx.miles(l.cambian - 4) + ' más</div><span></span></div></div>' +
      '<div class="t-detalle" style="margin:12px 4px 0;display:flex;gap:6px;align-items:center"><i class="i i-s" data-i="lock"></i>Nada cambia hasta aplicar · ' + Lx.miles(l.sin) + " quedan sin cambio</div>";
  }
  function revHTML(k) {
    var l = L[k];
    return '<div class="lx-top"><a class="lx-volver" data-volver><i class="i i-l" data-i="chevron-left"></i>Listas</a><span style="margin-left:auto;display:flex;gap:8px"><span class="btn chico btn-suave btn-icono" data-lx="r-origen" aria-label="De dónde llegó"><i class="i i-s" data-i="' + (l.icono === "globe" ? "globe" : l.icono === "mail" ? "mail-open" : "file-spreadsheet") + '"></i></span></span></div>' +
      '<div class="lx-titulo"><div class="t-titulo" style="line-height:32px">' + l.prov + '</div><div class="t-detalle">Lista del ' + l.fecha + " · " + l.llego + "</div></div>" +
      '<div class="lx-cuerpo">' + revCuerpo(k) + "</div>" +
      '<div class="lx-barra"><button class="btn btn-accion grande" data-lx="r-aplicar">Aplicar · cambian <span class="lx-precios">' + Lx.miles(precios(k)) + '</span> precios</button><button class="btn btn-fantasma" data-lx="r-descartar">Descartar</button></div>';
  }

  var abierta = null; // { k, el, hecho }
  function revisar(k) {
    if (abierta) return;
    var s = Celu.sub(revHTML(k), { alCerrar: function () {
      var a = abierta; abierta = null;
      if (a && a.hecho) { est.pendientes.splice(est.pendientes.indexOf(a.k), 1); pintarPend(true); ponerUltima(a.k, "Aplicada"); }
    } });
    abierta = { k: k, el: s, hecho: false };
  }
  function repintarCuerpo() {
    if (!abierta || abierta.hecho) return;
    var c = abierta.el.querySelector(".lx-cuerpo"), top = c.scrollTop;
    c.innerHTML = revCuerpo(abierta.k); Lx.pintar(c); c.scrollTop = top;
    abierta.el.querySelectorAll(".lx-barra .lx-precios").forEach(function (p) { p.textContent = Lx.miles(precios(abierta.k)); Lx.reanimar(p, "lx-entra"); });
  }

  function aplicar(btn) {
    if (!abierta || abierta.hecho || btn.classList.contains("lx-llenando")) return;
    var a = abierta, l = L[a.k];
    a.el.querySelector('[data-lx="r-descartar"]').hidden = true;
    Celu.aplicando(btn, l, function () {
      a.hecho = true;
      l.precios = precios(a.k);
      a.el.querySelector(".lx-barra").remove();
      a.el.querySelector(".lx-titulo").hidden = true;
      var c = a.el.querySelector(".lx-cuerpo");
      c.scrollTop = 0;
      c.innerHTML = Celu.resultado(a.k, est.margenes);
      Lx.pintar(c);
      Celu.conectarResultado(c, a.k, est.margenes);
    });
  }

  function descartar() {
    if (!abierta || abierta.hecho) return;
    var k = abierta.k, l = L[k], i = est.pendientes.indexOf(k);
    abierta.hecho = false;
    Celu.cerrarSub();
    est.pendientes.splice(i, 1);
    pintarPend(true);
    var d = ponerUltima(k, "Descartada");
    Lx.tostada("Descartaste la lista de " + l.prov, { icono: "trash-2", deshacer: function () {
      quitarUltima(d);
      est.pendientes.splice(i, 0, k);
      pintarPend(true);
    } });
  }

  function cargar() {
    Dlg.cargar(function () {
      if (est.pendientes.indexOf("nueva") < 0) est.pendientes.unshift("nueva");
      else { est.pendientes.splice(est.pendientes.indexOf("nueva"), 1); est.pendientes.unshift("nueva"); }
      pintarPend(true);
      Lx.vibrar(10);
      setTimeout(function () { revisar("nueva"); }, 200);
    });
  }

  Lx.on({
    revisar: function () { if (est.pendientes[0]) revisar(est.pendientes[0]); },
    otra: function () { if (est.pendientes[1]) revisar(est.pendientes[1]); },
    cargar: cargar,
    "r-aplicar": function (el) { aplicar(el); },
    "r-descartar": descartar,
    "r-origen": function () { var l = L[abierta.k]; if (l.icono === "globe") Dlg.portal(l); else if (l.icono === "mail") Dlg.correo(l); else Lx.tostada("La subiste vos hoy 10:31 desde este celular", { icono: "file-up" }); },
    "r-nuevos": function () { var l = L[abierta.k]; Dlg.margenes(l, est.margenes, repintarCuerpo); },
    "r-subas": function () { var l = L[abierta.k]; if (!l.filas.subas.length) { Lx.tostada("Ninguno sube más de 15 % en esta lista"); return; } Dlg.filas("Suben más de 15 %", "Míralos antes de que lleguen a la estantería", l.filas.subas, l.subas); },
    "r-noestan": function () { var l = L[abierta.k]; Dlg.filas("Ya no están", "Dejan de tener costo de " + l.prov, l.filas.noestan, l.noestan); },
    "r-salteadas": function () {
      var l = L[abierta.k];
      Lx.abrir(Dlg.cab("Filas salteadas", "Del Excel, tal cual llegó") + '<div class="lx-lista">' + l.filas.salteadas.map(function (s) { return Dlg.r("circle-alert", s.n, s.motivo); }).join("") + "</div>" + Dlg.pie());
    },
    usar6: function () { est.contado[abierta.k] = 6; repintarCuerpo(); Lx.tostada("Contado 6 %, guardado en la ficha del proveedor", { icono: "percent" }); },
    usar5: function () { est.contado[abierta.k] = 5; repintarCuerpo(); },
    "carga-belgrano": function () {
      Lx.abrir(Dlg.cab("Eléctrica Belgrano · lista del 10/10", "PDF por correo · descartada el 10/10 por Carlos") + '<div class="lx-lista">' + Dlg.r("file-text", "1.284 leídos", "No se aplicó: era la lista de otra sucursal") + Dlg.r("rotate-ccw", "Se puede volver a revisar", "Hasta 60 días después de llegar") + "</div>" +
        Dlg.pie('<button class="btn btn-fantasma" data-cerrar>Cerrar</button><button class="btn" data-cerrar data-lx="revivir"><i class="i i-s" data-i="rotate-ccw"></i>Revisarla otra vez</button>'));
    },
    revivir: function () { Lx.tostada("Eléctrica Belgrano: la lista vieja se descartó por otra sucursal; pedí la nueva desde su ficha", { icono: "info" }); },
    "carga-hecha": function (el) {
      var l = L[el.getAttribute("data-k")], e = el.getAttribute("data-estado");
      Lx.abrir(Dlg.cab(l.prov + " · lista del " + l.corta, (e === "Aplicada" ? "Aplicada" : "Descartada") + " hoy 10:44 por Carlos") + '<div class="lx-lista">' +
        (e === "Aplicada" ? Dlg.r("tags", Lx.miles(l.precios) + " precios cambiaron", "El costo subió " + l.pc.replace("+", "") + " en promedio") + Dlg.r("printer", "Etiquetas", "Listas para imprimir", Dlg.pas("Por imprimir", "urgente"))
          : Dlg.r("file-spreadsheet", Lx.miles(l.leidos) + " leídos", "No se cambió ningún precio")) + "</div>" + Dlg.pie());
    }
  });
})();

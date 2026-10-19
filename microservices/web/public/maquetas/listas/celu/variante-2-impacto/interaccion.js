/* Celu 2 · El impacto: lo que pasa al tocar. Datos en ../../_propio/datos.js. */
(function () {
  var L = DATOS.listas, FOTOS = Dlg.FOTOS;
  var pantalla = document.getElementById("lx-pantalla");
  var titulo = document.getElementById("lx-titulo");
  var barra = document.getElementById("lx-barra");
  var est = { lista: "bulonera", estado: "revision", margenes: {}, pendientes: ["bulonera", "sur"], hechas: [] };
  var original = { pantalla: pantalla.innerHTML, titulo: titulo.innerHTML, barra: barra.innerHTML };

  function nuevosSin(k) { return L[k].filas.nuevos.filter(function (n) { return est.margenes[n.n] == null; }); }

  // ---------------- La revisión de una lista ----------------
  function nuevoHTML(k) {
    var l = L[k], sin = nuevosSin(k);
    if (!sin.length) {
      return '<div class="sec">Antes de aplicar · los nuevos</div><div class="nuevo lx-fundido" style="border-color:var(--borde)"><div class="arr"><div class="lx-ok" style="width:56px;height:56px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
        '<div><div class="n">' + (l.nuevos === 1 ? "El nuevo ya tiene precio" : "Los " + l.nuevos + " nuevos tienen precio") + '</div><div class="d">Entran con su etiqueta al aplicar</div></div><div class="cual" style="color:var(--pino-texto);cursor:pointer" data-lx="cambiar-margenes">Cambiar</div></div></div>';
    }
    var n = sin[0], i = l.nuevos - sin.length + 1;
    return '<div class="sec">Antes de aplicar · ' + i + " de " + l.nuevos + (l.nuevos === 1 ? " nuevo" : " nuevos") + '</div><div class="nuevo" data-nuevo="' + n.n + '"><div class="arr"><div class="foto"><img src="' + FOTOS + n.f + '.webp" alt=""></div><div><div class="n">' + n.n.replace(" × 50 mm", "") +
      '</div><div class="d">' + n.d.split(" · ")[0] + " · costo " + Lx.pesos(n.c) + '</div></div><div class="cual">Nuevo<br>sin precio</div></div><div class="margenes">' + [300, 200, 100, 50, 25].map(function (v) { return '<b data-m="' + v + '" style="cursor:pointer">' + v + "</b>"; }).join("") + "</div></div>";
  }
  function pantallaHTML(k) {
    var l = L[k];
    var fams = l.familias.slice(0, 2).map(function (f) { return '<div class="fam"><span>' + f[0].split(" ")[0] + '</span><span class="bar"><b style="width:' + Math.min(100, Math.abs(f[1]) * 1.43) + '%' + (f[1] < 0 ? ";background:var(--logro)" : "") + '"></b></span><span class="pc">' + f[2] + "</span></div>"; }).join("");
    var max = l.filas.subas.length ? Math.max.apply(null, l.filas.subas.map(function (r) { return (r.c - r.a) / r.a * 100; })) : 0;
    var conStock = l.filas.noestan.filter(function (r) { return r.clase === "urgente"; });
    return '<div class="hero"><div class="et">Si aplicás, en la estantería cambian</div><div class="num">' + Lx.miles(l.precios) + ' <small>precios</small></div><div class="sube"><i class="i i-s" data-i="trending-up"></i>El costo sube ' + l.pc.replace("+", "") + ' en promedio</div><div class="fams">' + fams + "</div></div>" +
      '<div id="lx-nuevo">' + nuevoHTML(k) + "</div>" +
      '<div class="lista"><div class="li" data-lx="ver-subas" style="cursor:pointer"><span class="ic" style="background:var(--urgente-suave);color:var(--urgente-texto)"><i class="i" data-i="trending-up"></i></span><div><div class="n">' + l.subas + ' suben más de 15 %</div><div class="d">' + (l.subas ? "El que más sube: " + Lx.pct(max) : "Ninguno sube tanto") + '</div></div><span></span><i class="i i-s" data-i="chevron-right"></i></div>' +
      '<div class="li" data-lx="ver-noestan" style="cursor:pointer"><span class="ic"><i class="i" data-i="circle-x"></i></span><div><div class="n">' + l.noestan + ' ya no están</div><div class="d">' + (conStock.length ? conStock.length + " tiene stock: " + conStock[0].n.split(" ").slice(0, 3).join(" ").toLowerCase() : "Ninguno tiene stock") + '</div></div><span></span><i class="i i-s" data-i="chevron-right"></i></div></div>';
  }
  function tituloHTML(k) { var l = L[k]; return '<div class="t-titulo">' + l.prov + '</div><div class="t-detalle">Lista del ' + l.fecha + " · " + l.llego.replace(" hoy", "") + "</div>"; }

  function mostrar(k) {
    est.lista = k; est.estado = "revision";
    if (k === "bulonera" && !est.tocada) { pantalla.innerHTML = original.pantalla; titulo.innerHTML = original.titulo; barra.innerHTML = original.barra; marcarOriginal(); }
    else { pantalla.innerHTML = pantallaHTML(k); titulo.innerHTML = tituloHTML(k); barra.innerHTML = original.barra; }
    barra.hidden = false;
    pantalla.scrollTop = 0;
    Lx.pintar(pantalla); Lx.pintar(titulo); Lx.pintar(barra);
    Lx.reanimar(pantalla, "lx-fundido");
    conectarDeslizar();
  }
  // La primera vez, la pantalla quieta es la del HTML: se le agregan los datos para tocarla.
  function marcarOriginal() {
    var nv = pantalla.querySelector(".nuevo");
    nv.parentNode.insertBefore(Object.assign(document.createElement("div"), { id: "lx-nuevo" }), nv);
    var cont = document.getElementById("lx-nuevo");
    cont.appendChild(pantalla.querySelector(".sec")); cont.appendChild(nv);
    nv.setAttribute("data-nuevo", L.bulonera.filas.nuevos[0].n);
    nv.querySelectorAll(".margenes b").forEach(function (b) { b.setAttribute("data-m", b.textContent.trim()); b.style.cursor = "pointer"; });
    var lis = pantalla.querySelectorAll(".lista .li");
    lis[0].setAttribute("data-lx", "ver-subas"); lis[1].setAttribute("data-lx", "ver-noestan");
    lis.forEach(function (li) { li.style.cursor = "pointer"; });
  }

  function elegirMargen(b) {
    var card = b.closest("[data-nuevo]"), l = L[est.lista];
    if (card.classList.contains("lx-eligiendo")) return;
    var n = l.filas.nuevos.filter(function (x) { return x.n === card.getAttribute("data-nuevo"); })[0], v = Number(b.getAttribute("data-m"));
    card.classList.add("lx-eligiendo");
    est.margenes[n.n] = v; est.tocada = true;
    card.querySelectorAll("[data-m]").forEach(function (x) { x.classList.toggle("lx-elegido", x === b); });
    var cual = card.querySelector(".cual");
    cual.innerHTML = '<span style="color:var(--tinta);font-size:20px;font-weight:800;line-height:24px">' + Lx.pesos(Lx.precio(n.c, v)) + '</span><br><span style="color:var(--texto-2)">margen ' + v + " %</span>";
    cual.style.color = "var(--tinta)";
    Lx.reanimar(cual, "lx-entra");
    card.style.borderColor = "var(--borde)";
    Lx.vibrar(10);
    setTimeout(function () {
      card.classList.add("lx-sale");
      setTimeout(function () {
        var c = document.getElementById("lx-nuevo");
        c.innerHTML = nuevoHTML(est.lista); Lx.pintar(c);
        var nv = c.querySelector(".nuevo"); if (nv) Lx.reanimar(nv, "lx-entra");
      }, 200);
    }, 650);
  }

  // ---------------- Deslizá para aplicar ----------------
  function conectarDeslizar() {
    var d = barra.querySelector(".deslizar"); if (!d) return;
    var p = d.querySelector(".pulgar");
    var txt = Array.prototype.filter.call(d.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (txt) { var s = document.createElement("span"); s.className = "lx-txt-d"; s.textContent = txt.textContent; d.replaceChild(s, txt); }
    var x0 = null, dx = 0, max = 0, movio = false;
    p.addEventListener("pointerdown", function (e) {
      if (est.estado !== "revision") return;
      x0 = e.clientX; dx = 0; movio = false; max = d.offsetWidth - p.offsetWidth - 12;
      d.classList.add("arrastrando"); p.setPointerCapture(e.pointerId);
    });
    p.addEventListener("pointermove", function (e) {
      if (x0 == null) return;
      dx = Math.max(0, Math.min(max, e.clientX - x0));
      if (dx > 4) movio = true;
      p.style.transform = "translateX(" + dx + "px)";
      d.querySelector(".lx-txt-d").style.opacity = String(1 - dx / max);
    });
    function soltar() {
      if (x0 == null) return;
      x0 = null; d.classList.remove("arrastrando");
      if (dx >= max * 0.85) { p.style.transform = "translateX(" + max + "px)"; aplicar(d); return; }
      p.style.transform = ""; d.querySelector(".lx-txt-d").style.opacity = "";
      if (!movio) { Lx.reanimar(p, "lx-empuje"); Lx.tostada("Deslizá el círculo hasta el final para aplicar", { icono: "arrow-right" }); }
    }
    p.addEventListener("pointerup", soltar);
    p.addEventListener("pointercancel", soltar);
    d.addEventListener("click", function (e) { if (!e.target.closest(".pulgar") && est.estado === "revision") { Lx.reanimar(p, "lx-empuje"); } });
  }

  function aplicar(d) {
    est.estado = "aplicando";
    var l = L[est.lista], t = d.querySelector(".lx-txt-d");
    d.insertAdjacentHTML("afterbegin", '<span class="lx-relleno"></span>');
    var rel = d.querySelector(".lx-relleno");
    t.style.opacity = "1"; d.querySelector(".flechas").style.opacity = "0";
    barra.querySelector(".bajo").style.opacity = ".4";
    Lx.avanzar(l.leidos, 1800, function (v, f) { rel.style.transform = "scaleX(" + f + ")"; t.textContent = "Aplicando… " + Lx.miles(v) + " de " + Lx.miles(l.leidos); }, function () {
      t.textContent = "Buscando duplicados…";
      setTimeout(function () {
        Lx.vibrar([10, 40, 10]);
        est.estado = "resultado";
        est.pendientes.splice(est.pendientes.indexOf(est.lista), 1);
        est.hechas.unshift([est.lista, "Aplicada"]);
        barra.hidden = true;
        titulo.innerHTML = tituloHTML(est.lista);
        titulo.querySelector(".t-detalle").textContent = "Aplicada hoy 10:44";
        pantalla.innerHTML = Celu.resultado(est.lista, est.margenes);
        pantalla.scrollTop = 0;
        Lx.pintar(pantalla); Lx.pintar(titulo);
        Celu.conectarResultado(pantalla, est.lista, est.margenes);
      }, 600);
    });
  }

  function descartar() {
    if (est.estado !== "revision") return;
    var k = est.lista, l = L[k], i = est.pendientes.indexOf(k);
    est.estado = "descartada";
    est.pendientes.splice(i, 1);
    est.hechas.unshift([k, "Descartada"]);
    barra.hidden = true;
    pantalla.innerHTML = '<div class="lx-fundido" style="display:grid;justify-items:center;text-align:center;gap:12px;padding:48px 16px"><span class="lx-ok" style="background:var(--hundido);color:var(--texto-2)"><i class="i i-xl" data-i="trash-2"></i></span><div class="t-seccion">Descartaste la lista de ' + l.prov +
      '</div><div class="t-detalle">No cambió ningún precio. Queda en Últimas cargas como «Descartada».</div><button class="btn" data-lx="listas" style="margin-top:8px"><i class="i i-s" data-i="chevron-left"></i>Volver a Listas</button></div>';
    Lx.pintar(pantalla);
    Lx.tostada("Descartaste la lista de " + l.prov, { icono: "trash-2", deshacer: function () {
      est.hechas.shift(); est.pendientes.splice(i, 0, k); mostrar(k);
    } });
  }

  // ---------------- Listas (al tocar «‹ Listas») ----------------
  function listasHTML() {
    var COMO = { mail: "por correo", globe: "de su portal", "file-up": "la subiste recién" };
    var p = est.pendientes.map(function (k) {
      var l = L[k];
      return '<div class="lx-r" data-abrir="' + k + '" style="cursor:pointer"><span class="ic" style="background:var(--urgente-suave);color:var(--urgente-texto)"><i class="i" data-i="' + l.icono + '"></i></span><div style="min-width:0"><div class="n">' + l.prov + '</div><div class="d">' + Lx.miles(l.cambian) + " cambian · " + COMO[l.icono] + '</div></div><span class="der">' + (k === est.lista && est.estado === "revision" ? Dlg.pas("Revisando", "pino") : '<i class="i i-s" data-i="chevron-right"></i>') + "</span></div>";
    }).join("") || '<div class="lx-r"><span class="ic" style="background:var(--logro-suave);color:var(--logro-texto)"><i class="i" data-i="check"></i></span><div><div class="n">No hay listas para revisar</div><div class="d">Las que lleguen aparecen solas acá</div></div><span></span></div>';
    var hechas = est.hechas.map(function (h) { var l = L[h[0]]; return Dlg.r("file-spreadsheet", l.prov, "Lista del " + l.corta + " · hoy", Dlg.pas(h[1], h[1] === "Aplicada" ? "logro" : "")); }).join("");
    return '<div class="lx-top"><a class="lx-volver" data-volver><i class="i i-l" data-i="chevron-left"></i>Volver</a></div><div class="lx-titulo"><div class="t-titulo" style="line-height:32px">Listas de precios</div></div><div class="lx-cuerpo">' +
      '<div class="lx-sec" style="margin-top:4px"><b>Para revisar</b><span>' + est.pendientes.length + "</span></div><div class=\"lx-lista\">" + p + "</div>" +
      '<button class="btn" data-lx="cargar" style="width:100%;margin-top:12px"><i class="i" data-i="file-up"></i>Cargar una lista</button>' +
      '<div class="lx-sec"><b>Últimas cargas</b><span data-lx="historial" style="color:var(--pino-texto);font-weight:750;cursor:pointer">Ver todas</span></div><div class="lx-lista">' + hechas +
      Dlg.r("file-spreadsheet", "Distribuidora Oeste", "Lista del 14/10 · 312 cambiados", Dlg.pas("Aplicada", "logro"), ' data-lx="carga-oeste" style="cursor:pointer"') + "</div>" +
      '<div class="lx-sec"><b>Proveedores</b><span data-lx="buscar-prov" style="color:var(--pino-texto);font-weight:750;cursor:pointer">Buscar</span></div><div class="lx-lista">' +
      Dlg.r("building-2", "Pinturas del Plata", "Lista del 08/09 · hace 41 días", Dlg.pas("Vieja", "urgente"), ' data-lx="ficha-prov" data-prov="Pinturas del Plata" style="cursor:pointer"') + "</div></div>";
  }
  var sub = null;
  function abrirListas() {
    if (sub) return;
    sub = Celu.sub(listasHTML(), { alCerrar: function () { sub = null; } });
    sub.addEventListener("click", function (e) {
      var a = e.target.closest("[data-abrir]"); if (!a) return;
      var k = a.getAttribute("data-abrir");
      Celu.cerrarSub();
      if (k !== est.lista || est.estado !== "revision") mostrar(k);
    });
  }

  Lx.on({
    listas: abrirListas,
    cargar: function () {
      Dlg.cargar(function () {
        if (est.pendientes.indexOf("nueva") < 0) est.pendientes.unshift("nueva");
        if (sub) Celu.cerrarSub();
        mostrar("nueva");
        Lx.vibrar(10);
      });
    },
    descartar: descartar,
    origen: function () { var l = L[est.lista]; if (l.icono === "globe") Dlg.portal(l); else if (l.icono === "mail") Dlg.correo(l); else Lx.tostada("La subiste vos hoy 10:31 desde este celular", { icono: "file-up" }); },
    planilla: function () {
      var l = L[est.lista];
      var filas = l.filas.cambian.slice(0, 4).map(function (r, i) {
        return Dlg.rf(r.f, "Fila " + (5 + i * 3) + " · " + r.d.split(" · ")[1], "Lista " + Lx.pesosC(DATOS.lista(r, l.contado)) + " → costo " + Lx.pesosC(r.c), Dlg.pas("Leída", "logro"));
      }).join("") + l.filas.salteadas.slice(0, 2).map(function (s) { return Dlg.r("circle-alert", s.n, s.motivo, Dlg.pas("Salteada", "urgente")); }).join("");
      Lx.abrir(Dlg.cab("La planilla", l.archivo + " · " + Lx.miles(l.leidos) + " filas leídas") + '<div class="aviso pino" style="margin-bottom:12px"><i class="i" data-i="sparkles"></i><span>Se reconocieron solas: código (A), descripción (B), precio de lista (E) y la fecha ' + l.fecha + ".</span></div>" +
        '<div class="lx-lista">' + filas + "</div>" + Dlg.pie());
    },
    "ver-subas": function () { var l = L[est.lista]; if (!l.filas.subas.length) { Lx.tostada("Ninguno sube más de 15 % en esta lista"); return; } Dlg.filas("Suben más de 15 %", "Miralos antes de que lleguen a la estantería", l.filas.subas, l.subas); },
    "ver-noestan": function () { var l = L[est.lista]; Dlg.filas("Ya no están", "Dejan de tener costo de " + l.prov, l.filas.noestan, l.noestan); },
    "cambiar-margenes": function () { Dlg.margenes(L[est.lista], est.margenes, function () { var c = document.getElementById("lx-nuevo"); c.innerHTML = nuevoHTML(est.lista); Lx.pintar(c); }); }
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("#lx-pantalla [data-m]");
    if (b && est.estado === "revision") elegirMargen(b);
  });

  marcarOriginal();
  conectarDeslizar();
})();

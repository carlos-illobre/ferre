/* Contar · ayudas comunes de las maquetas navegables (hojas, diálogos, menús, tostadas, cierre).
   Cada index.html las usa desde su <script> del pie. Sin librerías ni internet. */
(function () {
  var quieto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var esCelu = location.pathname.indexOf("/celu/") >= 0;
  var FOTOS = "../../../_comun/fotos/";
  var pila = [];

  function raiz() { return document.querySelector(".celu") || document.body; }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function pintar(n) { if (window.pintarIconos) window.pintarIconos(n); }
  function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } }
  function mover(n, cuadros, ms, curva) { if (quieto || !n || !n.animate) return; n.animate(cuadros, { duration: ms || 200, easing: curva || "cubic-bezier(.2,.8,.2,1)" }); }

  // Abre una capa (hoja, diálogo, menú o pantalla). Se cierra con su botón [data-cerrar],
  // tocando afuera y con Escape. Devuelve el elemento de adentro.
  function abrir(html, op) {
    op = op || {};
    var capa = el('<div class="cx-capa' + (op.sinVelo ? " sin-velo" : "") + '"><div class="cx-velo"></div></div>');
    var cont = typeof html === "string" ? el(html) : html;
    capa.appendChild(cont);
    (op.dentro || raiz()).appendChild(capa);
    pintar(capa);
    if (op.ancla && cont.classList.contains("cx-menu")) ubicar(cont, op.ancla, op.lado);
    capa._alCerrar = op.alCerrar;
    capa.querySelector(".cx-velo").addEventListener("click", function () { cerrar(capa); });
    capa.addEventListener("click", function (e) { var b = e.target.closest("[data-cerrar]"); if (b && capa.contains(b)) cerrar(capa); });
    pila.push(capa);
    void capa.offsetWidth;
    requestAnimationFrame(function () { capa.classList.add("abierta"); });
    var f = cont.querySelector("[autofocus]"); if (f) setTimeout(function () { f.focus(); }, 30);
    return cont;
  }
  function ubicar(menu, ancla, lado) {
    var r = ancla.getBoundingClientRect(), base = (raiz() === document.body) ? { left: 0, top: 0 } : raiz().getBoundingClientRect();
    if (lado === "derecha") { menu.style.left = (r.right - base.left + 8) + "px"; menu.style.top = (r.top - base.top) + "px"; }
    else { menu.style.left = (r.left - base.left) + "px"; menu.style.top = (r.bottom - base.top + 6) + "px"; menu.style.minWidth = Math.max(248, r.width) + "px"; }
  }
  function cerrar(capa) {
    capa = capa || pila[pila.length - 1];
    if (!capa || capa._cerrando) return;
    capa._cerrando = true;
    pila.splice(pila.indexOf(capa), 1);
    capa.classList.add("saliendo"); capa.classList.remove("abierta");
    setTimeout(function () { capa.remove(); }, quieto ? 0 : 330);
    if (capa._alCerrar) capa._alCerrar();
  }
  function capaDe(n) { return n && n.closest(".cx-capa"); }
  function abierto() { return pila.length > 0; }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } }, true);

  function hoja(cuerpo, op) { return abrir('<div class="cx-hoja' + ((op && op.clase) ? " " + op.clase : "") + '"><div class="cx-agarre"></div>' + cuerpo + "</div>", op); }
  function dialogo(cuerpo, op) { return abrir('<div class="cx-dialogo' + ((op && op.clase) ? " " + op.clase : "") + '">' + cuerpo + "</div>", op); }
  // Hoja en el celular, diálogo en la computadora.
  function ventana(cuerpo, op) { return esCelu ? hoja(cuerpo, op) : dialogo(cuerpo, op); }
  function cabeza(titulo, detalle) {
    return '<div class="cx-hoja-cab"><div><div class="t-seccion">' + titulo + "</div>" + (detalle ? '<div class="t-detalle">' + detalle + "</div>" : "") +
      '</div><button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  }

  var caja;
  function tostada(texto, icono) {
    if (!caja || !caja.isConnected) { caja = el('<div class="cx-tostadas"></div>'); raiz().appendChild(caja); }
    var t = el('<span class="tostada"><i class="i" data-i="' + (icono || "circle-check") + '"></i>' + texto + "</span>");
    caja.appendChild(t); pintar(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add("ve"); }); });
    setTimeout(function () { t.classList.remove("ve"); setTimeout(function () { t.remove(); }, 260); }, 2600);
  }

  // Algo nuevo en una lista: entra desde 8 px abajo; su borde verde dura 1 s.
  function nuevo(n, claseBorde) {
    n.classList.add("cx-entra");
    if (claseBorde) { n.classList.add(claseBorde); setTimeout(function () { n.classList.remove(claseBorde); }, 1000); }
    setTimeout(function () { n.classList.remove("cx-entra"); }, 400);
    vibrar(10);
  }
  // Un número que cambia rueda hacia arriba si sube y hacia abajo si baja.
  function rodar(n, texto, sube) {
    if (!n) return; n.textContent = texto;
    mover(n, [{ transform: "translateY(" + (sube === false ? "-" : "") + "40%)", opacity: 0 }, { transform: "none", opacity: 1 }], 200);
  }
  function rebotar(n) { mover(n, [{ transform: "scale(.8)", opacity: 0 }, { transform: "scale(1.06)", opacity: 1, offset: .7 }, { transform: "none", opacity: 1 }], 260); }
  function apretar(n) { mover(n, [{ transform: "scale(.97)" }, { transform: "none" }], 120); }

  // Números: «7,2», «−2», «+0,7», «=».
  function fmt(x) { var s = (Math.round(x * 10) / 10).toString().replace(".", ","); return s.replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function dif(c, h) { var d = Math.round((c - h) * 10) / 10; return d === 0 ? { t: "=", c: "ig", d: 0 } : d < 0 ? { t: "−" + fmt(-d), c: "menos", d: d } : { t: "+" + fmt(d), c: "mas", d: d }; }
  function foto(f, chica) { return f ? '<div class="foto' + (chica ? " chica" : "") + '"><img src="' + FOTOS + f + '.webp" alt=""></div>' : '<div class="foto-icono" style="width:' + (chica ? 40 : 56) + "px;height:" + (chica ? 40 : 56) + 'px;border-radius:8px"><i class="i" data-i="hash"></i></div>'; }

  // Productos verosímiles de cada sector (sistema = lo que dice el stock).
  var PRODUCTOS = {
    "Pared de tornillería": [
      { n: "Tornillo madera fresada 4 × 40 × 100", m: "Bulonera Centro · Cód. TF440", f: "tornillos", s: 9, u: "un." },
      { n: "Tarugos nylon S6 con tope × 100", m: "Fischer · Cód. 7780-S6", f: "tarugos", s: 11, u: "un." },
      { n: "Clavos punta París 2 1/2\" a granel", m: "Acindar · se cuenta en kg", f: "clavos", s: 4.2, u: "kg" },
      { n: "Tuerca hexagonal zincada 1/4\" × 100", m: "Bulonera Centro · Cód. TH14", f: "", s: 5, u: "un." },
      { n: "Tornillo autoperforante T2 8 × 1\" × 100", m: "Bulonera Centro · Cód. T281", f: "tornillos", s: 7, u: "un." },
      { n: "Tornillo drywall punta aguja 6 × 1\" × 100", m: "Bulonera Centro · Cód. TD61", f: "tornillos", s: 12, u: "un." },
      { n: "Tarugos nylon S10 con tope × 50", m: "Fischer · Cód. 7780-S10", f: "tarugos", s: 8, u: "un." },
      { n: "Clavos espiralados 2\" a granel", m: "Acindar · se cuenta en kg", f: "clavos", s: 2.5, u: "kg" },
      { n: "Arandela grower zincada 1/4\" × 100", m: "Bulonera Centro · Cód. AG14", f: "", s: 6, u: "un." },
      { n: "Bulón carrocero 1/4 × 2\" × 50", m: "Bulonera Centro · Cód. BC1420", f: "", s: 4, u: "un." }
    ],
    "Pared de electricidad": [
      { n: "Lámpara LED 12 W luz fría E27", m: "Macroled · Cód. LED12F", f: "lampara", s: 24, u: "un." },
      { n: "Cable unipolar 2,5 mm² rojo × 100 m", m: "Pirelli · se cuenta en m", f: "", s: 160, u: "m" },
      { n: "Toma doble con tierra 10 A blanco", m: "Cambre · Cód. 6810", f: "", s: 18, u: "un." },
      { n: "Lámpara LED 9 W luz cálida E27", m: "Macroled · Cód. LED9C", f: "lampara", s: 30, u: "un." },
      { n: "Cinta aisladora 20 m negra", m: "3M · Cód. 1710", f: "", s: 40, u: "un." }
    ],
    "Exhibidor de mechas y puntas": [
      { n: "Mecha acero rápido HSS 8 mm", m: "Ezeta · Cód. ME080 · blíster de 1", f: "mecha", s: 14, u: "un." },
      { n: "Mecha acero rápido HSS 6 mm", m: "Ezeta · Cód. ME060 · blíster de 1", f: "mecha", s: 11, u: "un." },
      { n: "Juego de puntas Phillips × 10", m: "Stanley · Cód. PH10", f: "puntas", s: 6, u: "un." },
      { n: "Mecha widia para hormigón 10 mm", m: "Bosch · Cód. WH10", f: "mecha", s: 9, u: "un." },
      { n: "Punta Phillips PH2 × 50 mm", m: "Stanley · Cód. PH250", f: "puntas", s: 22, u: "un." }
    ]
  };
  function productos(sector) {
    if (PRODUCTOS[sector]) return PRODUCTOS[sector];
    return [
      { n: "Martillo carpintero 27 mm mango fibra", m: "Bahco · Cód. 427", f: "martillo", s: 5, u: "un." },
      { n: "Pinza universal 8\" aislada", m: "Bahco · Cód. 2628", f: "pinza", s: 7, u: "un." },
      { n: "Cinta métrica 5 m × 19 mm", m: "Stanley · Cód. 30-496", f: "cinta-metrica", s: 12, u: "un." },
      { n: "Llave combinada 13 mm", m: "Bahco · Cód. 111M-13", f: "llave-combinada", s: 9, u: "un." },
      { n: "Látex interior blanco mate 4 l", m: "Alba · Cód. LX4", f: "pintura", s: 16, u: "un." }
    ];
  }

  // Menú «Más»: Anomalías, Procesos, Mejoras y errores, Configuración.
  var MAS = [["anomalias", "triangle-alert", "Anomalías", "3 para mirar"], ["procesos", "workflow", "Procesos", ""], ["mejoras-y-errores", "bug", "Mejoras y errores", ""], ["configuracion", "settings", "Configuración", ""]];
  function menuMas(ancla) {
    if (esCelu) {
      return hoja('<div class="t-seccion">Más</div><div class="cx-tarjetas">' + MAS.map(function (m) {
        return '<a class="renglon" data-ir="' + m[0] + '"><span class="foto-icono"><i class="i" data-i="' + m[1] + '"></i></span><div><div class="titulo">' + m[2] + "</div>" + (m[3] ? '<div class="detalle" style="color:var(--urgente-texto)">' + m[3] + "</div>" : "") + '</div><i class="i i-s" data-i="chevron-right" style="color:var(--texto-3)"></i></a>';
      }).join("") + "</div>");
    }
    return abrir('<div class="cx-menu">' + MAS.map(function (m) {
      return '<button class="cx-op" data-ir="' + m[0] + '"><i class="i" data-i="' + m[1] + '"></i><span class="txt">' + m[2] + "</span>" + (m[3] ? '<span class="pastilla urgente" style="height:24px">3</span>' : "") + "</button>";
    }).join("") + "</div>", { ancla: ancla, lado: "derecha", sinVelo: true });
  }

  // La hoja de cerrar el sector: la de la variante 4 del celular. En la computadora, en un diálogo.
  // d = { sector, contados, difs: [{n, c, h, u}], sinContar: [{f}], alCerrar(cero) }
  function cierre(d) {
    var difs = d.difs.slice().sort(function (a, b) { return Math.abs(b.c - b.h) - Math.abs(a.c - a.h); });
    var max = Math.max.apply(null, difs.map(function (x) { return Math.abs(x.c - x.h); }).concat([1]));
    function fila(x) {
      var r = dif(x.c, x.h), ancho = Math.max(8, Math.round(Math.abs(r.d) / max * 36)), lado = r.d < 0 ? "right:50%" : "left:50%";
      return '<div class="f"><span class="n">' + x.n + '</span><span class="bar"><span class="mid"></span><b class="' + (r.d < 0 ? "menos-b" : "mas-b") + '" style="' + lado + ";width:" + ancho + "%;background:var(--" + (r.d < 0 ? "urgente" : "pino") + ')"></b></span><span class="v ' + r.c + ' num">' + r.t + "</span></div>";
    }
    var sc = d.sinContar.length, fotos = d.sinContar.slice(0, 3).map(function (p) { return '<span class="foto">' + (p.f ? '<img src="' + FOTOS + p.f + '.webp" alt="">' : "") + "</span>"; }).join("") +
      (sc > 3 ? '<span class="foto-icono" style="font-weight:800;font-size:14px">+' + (sc - 3) + "</span>" : "");
    var cuerpo = '<div class="cx-hoja-cab"><div><div class="t-seccion">Cerrar ' + d.sector + '</div><div class="t-detalle">Lo que cambia en el stock al cerrar. No se deshace.</div></div>' + (esCelu ? "" : '<button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>') + "</div>" +
      '<div class="tres"><div class="ok"><div class="et">Contados</div><div class="va num">' + d.contados + '</div></div><div class="urg"><div class="et">Diferencias</div><div class="va num">' + difs.length + '</div></div><div><div class="et">Sin contar</div><div class="va num">' + sc + "</div></div></div>" +
      '<div class="difs">' + difs.slice(0, 3).map(fila).join("") + '<div class="mas-difs"></div>' + (difs.length > 3 ? '<div class="t-detalle ver" data-ver>Ver las ' + difs.length + " diferencias</div>" : "") + "</div>" +
      (sc ? '<div class="faltan"><div class="t-renglon">' + sc + ' que no contaste</div><div class="fotos">' + fotos + "</div></div>" : "") +
      '<div class="opciones"><button class="btn btn-accion" data-cierra="no"><i class="i" data-i="check"></i><span>' + (sc ? "Cerrar y dejar los " + sc + " como están<small>Su stock no cambia</small>" : "Cerrar el sector<small>Se ajustan las " + difs.length + " diferencias</small>") + "</span></button>" +
      (sc ? '<button class="btn" data-cierra="cero"><i class="i" data-i="circle-dashed"></i><span>Cerrar y poner en cero los ' + sc + "<small>Cada uno queda con su ajuste</small></span></button>" : "") +
      (esCelu ? '<button class="btn btn-fantasma" data-cerrar style="height:44px;justify-content:center">Seguir contando</button>' : "") + "</div>";
    var n = ventana(cuerpo, { clase: "cx-cierre" });
    n.addEventListener("click", function (e) {
      if (e.target.closest("[data-ver]")) {
        var extra = n.querySelector(".mas-difs"); extra.innerHTML = difs.slice(3).map(fila).join("");
        extra.querySelectorAll(".bar b").forEach(function (b) { requestAnimationFrame(function () { b.classList.add("ya"); }); });
        e.target.closest("[data-ver]").remove(); return;
      }
      var b = e.target.closest("[data-cierra]"); if (!b) return;
      var cero = b.getAttribute("data-cierra") === "cero";
      vibrar([10, 40, 10]);
      n.innerHTML = (esCelu ? '<div class="cx-agarre"></div>' : "") + '<div class="cx-listo"><span class="cx-tilde"><i class="i" data-i="check"></i></span><div class="t-seccion">' + d.sector + ' quedó contado</div><div class="t-detalle">Hoy, ' + (d.hora || "18:06") + " · " + difs.length + " ajustes de stock" + (cero && sc ? " y " + sc + " en cero" : "") + "</div></div>" +
        '<button class="btn btn-oscuro grande" data-cerrar style="width:100%">Listo</button>';
      pintar(n);
      var capa = capaDe(n); capa._alCerrar = function () { if (d.alCerrar) d.alCerrar(cero); };
    });
    return n;
  }

  // Cámara simulada a pantalla completa (celular): las esquinas se cierran y se ponen verdes.
  function camara(producto, alLeer) {
    var n = abrir('<div class="cx-pantalla" style="background:#120f0d"><div class="cx-camara">' + (producto.f ? '<img class="objeto" src="' + FOTOS + producto.f + '.webp" alt="">' : "") +
      '<div class="marco"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i></div><div class="arriba-cam"><button class="redondo" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button><span style="font-weight:750">Apuntá al código</span></div>' +
      '<div class="leyenda">Buscando el código…</div></div></div>', { sinVelo: true });
    var t = setTimeout(function () {
      if (!n.isConnected) return;
      n.querySelector(".marco").classList.add("leido"); n.querySelector(".leyenda").textContent = producto.n; vibrar(10);
      setTimeout(function () { var c = capaDe(n); if (c && !c._cerrando) { c._alCerrar = null; cerrar(c); alLeer(producto); } }, 520);
    }, 900);
    capaDe(n)._alCerrar = function () { clearTimeout(t); };
    return n;
  }

  window.Contar = {
    esCelu: esCelu, quieto: quieto, abrir: abrir, cerrar: cerrar, capaDe: capaDe, abierto: abierto, hoja: hoja, dialogo: dialogo, ventana: ventana, cabeza: cabeza,
    tostada: tostada, nuevo: nuevo, rodar: rodar, rebotar: rebotar, apretar: apretar, mover: mover, vibrar: vibrar, el: el, pintar: pintar,
    fmt: fmt, dif: dif, foto: foto, productos: productos, menuMas: menuMas, cierre: cierre, camara: camara, FOTOS: FOTOS
  };
})();

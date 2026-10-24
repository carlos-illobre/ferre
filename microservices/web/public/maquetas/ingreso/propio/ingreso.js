// Ingreso de mercadería: piezas comunes a las seis variantes. Es una maqueta: nada se guarda,
// solo se ve lo que pasaría. Cada index.html suma lo suyo al pie con window.IG.
(function () {
  "use strict";
  var IG = {};
  window.IG = IG;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  IG.$ = $; IG.$$ = $$;
  var celu = !!document.querySelector(".celu");
  IG.celu = celu;
  var raiz = function () { return document.querySelector(".celu") || document.body; };
  IG.FACTURA = "../../propio/factura.webp";

  IG.miles = function (n) { var s = String(Math.round(Math.abs(n))); return (n < 0 ? "−" : "") + s.replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  IG.plata = function (n) { return '<span class="peso">$</span>' + IG.miles(n); };
  IG.pintar = function (el) { if (window.pintarIconos) window.pintarIconos(el); };
  IG.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };

  // ------------------------------------------------------------ capas: diálogo u hoja
  var abiertas = [];
  IG.abrir = function (html, o) {
    o = o || {};
    var tipo = o.tipo || (celu ? "hoja" : "dialogo");
    var velo = document.createElement("div");
    velo.className = "ig-velo";
    var el = document.createElement("div");
    el.className = "ig-capa ig-" + tipo + " " + (o.clase || "");
    el.setAttribute("role", "dialog");
    el.innerHTML = html;
    raiz().appendChild(velo); raiz().appendChild(el);
    IG.pintar(el);
    var item = { el: el, velo: velo };
    item.cerrar = function () {
      if (item.cerrado) return; item.cerrado = true;
      el.classList.remove("ig-abierto"); velo.classList.remove("ig-abierto");
      setTimeout(function () { el.remove(); velo.remove(); }, 320);
      abiertas = abiertas.filter(function (x) { return x !== item; });
    };
    velo.addEventListener("click", item.cerrar);
    $$("[data-cerrar]", el).forEach(function (b) { b.addEventListener("click", item.cerrar); });
    abiertas.push(item);
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("ig-abierto"); velo.classList.add("ig-abierto"); }); });
    return item;
  };
  IG.cab = function (titulo, sub) {
    return '<div class="ig-cab"><div class="ig-tt"><b>' + titulo + "</b>" + (sub ? "<span>" + sub + "</span>" : "") +
      '</div><button class="btn btn-icono btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abiertas.length) { abiertas[abiertas.length - 1].cerrar(); e.stopPropagation(); }
  });

  // ------------------------------------------------------------ «Más»
  IG.mas = function () {
    var op = function (ir, ico, txt, extra) { return '<button class="ig-op" data-ir="' + ir + '"><i class="i" data-i="' + ico + '"></i>' + txt + (extra || "") + "</button>"; };
    IG.abrir(IG.cab("Más") + '<div class="ig-cuerpo"><div class="tarjeta" style="padding:6px">' +
      op("anomalias", "triangle-alert", "Anomalías", '<span class="pastilla urgente">3</span>') +
      op("procesos", "workflow", "Procesos") +
      op("mejoras-y-errores", "bug", "Mejoras y errores") +
      op("configuracion", "settings", "Configuración") + "</div></div>", { clase: celu ? "" : "chico", tipo: celu ? "hoja" : "dialogo" });
  };

  // ------------------------------------------------------------ la foto de la factura y el QR
  IG.verFactura = function () {
    IG.abrir(IG.cab("Factura A 0003-00004821", "Distribuidora Oeste · 24/10 · tocá para leer cualquier dato") +
      '<div class="ig-cuerpo"><div class="ig-factura"><img src="' + IG.FACTURA + '" alt="Foto de la factura"></div></div>', { clase: "ancho" });
  };
  IG.verQR = function (alLlegar) {
    var d = IG.abrir(IG.cab("Sacale la foto con el celular", "El código vale 10 minutos") +
      '<div class="ig-cuerpo"><div class="ig-qr"><img src="../../propio/qr.svg" alt="Código QR"><ol><li>Abrí Ferrebress en el celular.</li><li>Apuntá la cámara a este código.</li><li>Sacale la foto a la factura: aparece sola acá.</li></ol></div>' +
      '<div style="display:flex;gap:8px;margin-top:20px"><button class="btn" data-archivo><i class="i" data-i="image"></i>Elegir un archivo</button><button class="btn btn-fantasma" data-cerrar>Cancelar <span class="kbd">Esc</span></button></div></div>');
    setTimeout(function () { if (!d.cerrado) { d.cerrar(); IG.tostada("Llegó la foto de la factura", "image"); if (alLlegar) alLlegar(); } }, 2400);
    var a = $("[data-archivo]", d.el); if (a) a.addEventListener("click", function () { d.cerrar(); IG.tostada("Foto de la factura agregada", "image"); if (alLlegar) alLlegar(); });
  };

  // ------------------------------------------------------------ tostada
  IG.tostada = function (texto, icono, accion) {
    var cont = $(".ig-tostadas", raiz());
    if (!cont) { cont = document.createElement("div"); cont.className = "ig-tostadas"; raiz().appendChild(cont); }
    var t = document.createElement("div");
    t.className = "tostada";
    t.innerHTML = '<i class="i" data-i="' + (icono || "circle-check") + '"></i><span>' + texto + "</span>" + (accion ? '<button class="btn chico">' + accion + "</button>" : "");
    cont.appendChild(t); IG.pintar(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add("ig-abierto"); }); });
    var b = $("button", t); if (b) b.addEventListener("click", function () { t.remove(); });
    setTimeout(function () { t.classList.remove("ig-abierto"); setTimeout(function () { t.remove(); }, 240); }, 3200);
  };

  // ------------------------------------------------------------ segmentos y chips propios
  document.addEventListener("click", function (e) {
    var s = e.target.closest(".segmentos > *, [data-chips] > .chip");
    if (!s || s.hasAttribute("data-ir")) return;
    $$(":scope > *", s.parentElement).forEach(function (x) { x.classList.toggle("elegido", x === s); });
    s.parentElement.dispatchEvent(new CustomEvent("cambio", { detail: s, bubbles: true }));
  });

  // ------------------------------------------------------------ cantidades: − n +
  // Un renglón [data-ren] con data-costo; su .cantidad .n cambia y recalcula [data-sub] y IG.recalcular.
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".cantidad button");
    if (!b) return;
    var c = b.closest(".cantidad"), n = $(".n", c);
    var v = Math.max(0, (parseFloat(n.textContent) || 0) + (b === c.lastElementChild ? 1 : -1));
    n.textContent = v;
    var ren = b.closest("[data-ren]");
    if (ren) ren.dataset.cant = v;
    IG.vibrar(10);
    if (IG.recalcular) IG.recalcular(ren);
  });

  // ------------------------------------------------------------ marco
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-mas]")) { e.preventDefault(); IG.mas(); }
    else if (e.target.closest("[data-ver-factura]")) IG.verFactura();
  });
  // Ctrl B pliega el lateral (computadora)
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && (e.key === "b" || e.key === "B")) { var a = $(".app"); if (a) { a.classList.toggle("plegado"); e.preventDefault(); } }
  });
})();

// Más · interacciones compartidas de las seis maquetas (sin librerías). Quieta, la maqueta se ve igual.
// - [data-avisar] abre «Avisar de un error o una idea» y al enviar muestra la tostada.
// - [data-llave] prende y apaga una llave. [data-tramo] dentro de .tramos elige uno y avisa «Guardado».
// - Esc, tocar afuera o la × cierran lo abierto.
(function () {
  var M = window.MAS = {};
  M.celu = function () { return !!document.querySelector(".celu"); };
  M.raiz = function () { return document.querySelector(".celu") || document.body; };
  M.quieto = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };
  M.vibrar = function (p) { try { if (navigator.vibrate && !M.quieto()) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };

  var abierto = null;
  M.abrir = function (html) {
    M.cerrar(true);
    var raiz = M.raiz();
    var velo = document.createElement("div"); velo.className = "velo";
    var caja = document.createElement("div"); caja.className = M.celu() ? "hoja" : "dialogo";
    caja.setAttribute("role", "dialog");
    caja.innerHTML = (M.celu() ? '<div class="asa"></div>' : "") + html;
    raiz.appendChild(velo); raiz.appendChild(caja);
    if (window.pintarIconos) window.pintarIconos(caja);
    caja.offsetWidth;
    velo.classList.add("ver"); caja.classList.add("ver");
    velo.addEventListener("click", function () { M.cerrar(); });
    abierto = { velo: velo, caja: caja };
    return caja;
  };
  M.cerrar = function (ya) {
    if (!abierto) return;
    var a = abierto; abierto = null;
    a.velo.classList.remove("ver"); a.caja.classList.remove("ver");
    setTimeout(function () { a.velo.remove(); a.caja.remove(); }, ya || M.quieto() ? 0 : 320);
  };

  var tt;
  M.tostada = function (texto) {
    var t = document.querySelector(".tostada-mas");
    if (!t) { t = document.createElement("div"); t.className = "tostada tostada-mas"; M.raiz().appendChild(t); }
    t.innerHTML = '<i class="i" data-i="circle-check"></i>' + texto;
    if (window.pintarIconos) window.pintarIconos(t);
    t.offsetWidth; t.classList.add("ver");
    M.vibrar([10, 40, 10]);
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove("ver"); }, 2600);
  };

  // Sistema es su propia pantalla (maquetas/sistema); acá solo quedan los tramos sueltos de las audaces.
  M.sistema = { sesion: "1 min", celular: "1 min", dias: 30 };

  M.htmlAvisar = function (donde) {
    return '<div class="cab-hoja"><span class="ico-op chico"><i class="i" data-i="bug"></i></span><div class="t-seccion">Avisar de un error o una idea</div>' +
      (M.celu() ? "" : '<button class="btn btn-fantasma btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>') + "</div>" +
      '<div class="segmentos" style="margin-bottom:12px"><button class="elegido" data-tipo>Algo falla</button><button data-tipo>Tengo una idea</button></div>' +
      '<div class="campo foco" style="height:auto;min-height:96px;align-items:flex-start;padding-top:14px"><span class="escrito">La impresora corta el ticket por la mitad cuando la venta tiene más de 8 renglones</span><span class="cursor"></span></div>' +
      '<div style="display:flex;gap:12px;align-items:center;margin:12px 0 16px"><span class="foto" style="width:72px;height:56px"><i class="i i-l" data-i="image"></i></span><div class="t-detalle">Va con una captura de <b>' + (donde || "la pantalla de antes") + "</b>. Todos ven los avisos.</div></div>" +
      '<button class="btn btn-accion grande" style="width:100%" data-enviar><i class="i" data-i="send"></i>Enviar</button>';
  };
  M.abrirAvisar = function (donde) { M.abrir(M.htmlAvisar(donde)); };

  document.addEventListener("click", function (e) {
    var el = e.target.closest ? e.target : null; if (!el) return;
    var c;
    if ((c = el.closest("[data-avisar]"))) { e.preventDefault(); M.abrirAvisar(c.getAttribute("data-avisar")); return; }
    if (el.closest("[data-cerrar]")) { M.cerrar(); return; }
    if ((c = el.closest("[data-enviar]"))) { M.cerrar(); M.tostada("Aviso enviado · lo ven todos en Mejoras y errores"); return; }
    if ((c = el.closest("[data-tipo]"))) { c.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.toggle("elegido", b === c); }); return; }
    if ((c = el.closest("[data-tramo]"))) {
      var g = c.parentNode; g.querySelectorAll("[data-tramo]").forEach(function (b) { b.classList.toggle("elegido", b === c); });
      var cual = g.getAttribute("data-ajuste");
      if (cual) M.sistema[cual] = c.textContent;
      document.querySelectorAll("[data-ver-" + cual + "]").forEach(function (v) { v.textContent = c.textContent; });
      M.tostada("Guardado para todos · " + c.textContent);
      return;
    }
    if ((c = el.closest("[data-dias]"))) {
      var n = Math.max(1, Math.min(365, M.sistema.dias + Number(c.getAttribute("data-dias"))));
      M.sistema.dias = n;
      document.querySelectorAll("[data-n-dias]").forEach(function (v) { v.textContent = n; });
      document.querySelectorAll("[data-ver-dias]").forEach(function (v) { v.textContent = n + " días"; });
      return;
    }
    if ((c = el.closest("[data-llave]"))) { c.classList.toggle("si"); c.setAttribute("aria-checked", c.classList.contains("si")); M.vibrar(10); return; }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") M.cerrar(); });
})();

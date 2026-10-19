/* Listas de precios: piezas para que la maqueta se pueda tocar.
   Lx.abrir(html, {tipo})  abre un diálogo (compu), una hoja (celu) o un menú chico; se cierra con
                           su botón [data-cerrar], tocando afuera y con Escape.
   Lx.tostada(texto, {deshacer})  aviso oscuro abajo, 4 s.
   Lx.mas(boton)           el menú «Más» (Anomalías, Procesos, Mejoras y errores, Configuración).
   Lx.pesos(n), Lx.miles(n), Lx.precio(costo, margen)  números como los muestra la aplicación.
   Va con defer, después de _comun/iconos.js. Nada de esto se ve hasta que se toca algo. */
(function () {
  var celu = location.pathname.indexOf("/celu/") >= 0;
  document.documentElement.classList.toggle("lx-celu", celu);
  var abiertos = [];

  function pintar(el) { if (window.pintarIconos) window.pintarIconos(el); }
  function crear(html, clase) {
    var d = document.createElement("div");
    d.className = clase;
    d.innerHTML = html;
    return d;
  }
  function trasDos(fn) { requestAnimationFrame(function () { requestAnimationFrame(fn); }); }

  // tipo: "dialogo" (compu), "hoja" (celu), "menu" (junto a un elemento: opciones.junto)
  function abrir(html, op) {
    op = op || {};
    var tipo = op.tipo || (celu ? "hoja" : "dialogo");
    var velo = crear("", "lx-velo");
    if (tipo === "menu") velo.style.background = "transparent";
    var caja = crear(html, "lx-" + tipo + (op.clase ? " " + op.clase : ""));
    caja.setAttribute("role", tipo === "menu" ? "menu" : "dialog");
    if (op.ancho) caja.style.width = op.ancho + "px";
    document.body.appendChild(velo);
    document.body.appendChild(caja);
    pintar(caja);
    if (tipo === "menu" && op.junto) {
      var r = op.junto.getBoundingClientRect();
      var top = op.arriba ? r.top - caja.offsetHeight - 8 : r.bottom + 8;
      var left = op.alLado ? r.right + 12 : r.left;
      if (op.alLado) top = Math.max(8, Math.min(r.top - 8, innerHeight - caja.offsetHeight - 8));
      caja.style.top = Math.max(8, top) + "px";
      caja.style.left = Math.max(8, Math.min(left, innerWidth - caja.offsetWidth - 8)) + "px";
    }
    var capa = { velo: velo, caja: caja, alCerrar: op.alCerrar };
    abiertos.push(capa);
    velo.addEventListener("click", function () { cerrar(capa); });
    caja.addEventListener("click", function (e) {
      if (e.target.closest("[data-cerrar]")) cerrar(capa);
    });
    trasDos(function () { velo.classList.add("abierto"); caja.classList.add("abierto"); });
    var foco = caja.querySelector("input");
    if (foco && !celu) setTimeout(function () { foco.focus(); }, 60);
    return caja;
  }

  function cerrar(capa) {
    capa = capa || abiertos[abiertos.length - 1];
    if (!capa) return;
    var i = abiertos.indexOf(capa);
    if (i < 0) return;
    abiertos.splice(i, 1);
    capa.velo.classList.remove("abierto");
    capa.caja.classList.remove("abierto");
    setTimeout(function () { capa.velo.remove(); capa.caja.remove(); }, 340);
    if (capa.alCerrar) capa.alCerrar();
  }
  function cerrarTodo() { while (abiertos.length) cerrar(abiertos[abiertos.length - 1]); }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abiertos.length) { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); }
  }, true);

  var tTostada;
  function tostada(texto, op) {
    op = op || {};
    var vieja = document.querySelector(".lx-tostada");
    if (vieja) vieja.remove();
    var t = crear('<i class="i" data-i="' + (op.icono || "check") + '"></i><span>' + texto + "</span>" +
      (op.deshacer ? '<b class="deshacer">Deshacer</b>' : ""), "tostada lx-tostada");
    t.setAttribute("role", "status");
    document.body.appendChild(t);
    pintar(t);
    if (op.deshacer) t.querySelector(".deshacer").addEventListener("click", function () { op.deshacer(); quitar(); });
    function quitar() { t.classList.remove("abierto"); setTimeout(function () { t.remove(); }, 320); }
    trasDos(function () { t.classList.add("abierto"); });
    clearTimeout(tTostada);
    tTostada = setTimeout(quitar, op.ms || 4000);
    return t;
  }

  function mas(boton) {
    var ops = [["triangle-alert", "Anomalías", "anomalias", "3"], ["workflow", "Procesos", "procesos", ""],
      ["bug", "Mejoras y errores", "mejoras-y-errores", ""], ["settings", "Configuración", "configuracion", ""]];
    var html = (celu ? '<div class="t-seccion" style="padding:0 4px 4px">Más</div>' : "") + ops.map(function (o) {
      return '<a class="lx-op" data-ir="' + o[2] + '"><i class="i' + (celu ? " i-l" : "") + '" data-i="' + o[0] + '"></i>' + o[1] +
        (o[3] ? '<span class="pastilla urgente" style="margin-left:auto;height:24px">' + o[3] + "</span>" : "") + "</a>";
    }).join("");
    return abrir(html, celu ? { tipo: "hoja" } : { tipo: "menu", junto: boton, alLado: true });
  }

  function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } }
  function miles(n) {
    var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "−" : "") + s;
  }
  function pesos(n) { return "$" + miles(n); }
  function pesosC(n) { // con centavos, para las explicaciones
    var e = Math.floor(n), c = Math.round((n - e) * 100);
    if (c === 100) { e += 1; c = 0; }
    return "$" + miles(e) + (c ? "," + (c < 10 ? "0" : "") + c : "");
  }
  function precio(costo, margen) { return Math.ceil(costo * (1 + margen / 100) * 1.21 / 1000) * 1000; }
  function pct(n) { return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(1).replace(".", ",") + " %"; }

  // Avanza un número de a pasos (para «Leyendo… 2.310 de 7.096»). cada(v, fraccion); listo().
  function avanzar(total, ms, cada, listo) {
    var reducir = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var pasos = reducir ? 1 : Math.max(1, Math.round(ms / 120)), k = 0;
    (function paso() {
      k++;
      var f = k / pasos;
      cada(Math.round(total * f), f);
      if (k < pasos) setTimeout(paso, ms / pasos); else setTimeout(listo, reducir ? 0 : 160);
    })();
  }

  function tilde() { return '<span class="lx-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>'; }

  function reanimar(el, clase) { el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase); }

  // Acciones por nombre: un elemento con data-lx="nombre" llama a la función registrada.
  var acciones = {
    mas: function (el) { mas(el); },
    espejo: function (el) {
      var html = celu
        ? '<div class="t-seccion" style="padding:0 4px 4px">En espejo</div><p class="t-detalle" style="margin:0 4px 8px">Este celular y la computadora del mostrador muestran lo mismo.</p>' +
          '<a class="lx-op" data-cerrar><i class="i i-l" data-i="monitor"></i>Computadora del mostrador<small>juntos hace 2 h</small></a>' +
          '<a class="lx-op" data-lx="desvincular" data-cerrar><i class="i i-l" data-i="unlink"></i>Desvincular</a>'
        : '<a class="lx-op" data-cerrar><i class="i" data-i="smartphone"></i>Moto G54 de Carlos<small>juntos hace 2 h</small></a>' +
          '<a class="lx-op" data-lx="desvincular" data-cerrar><i class="i" data-i="unlink"></i>Desvincular</a>';
      abrir(html, celu ? { tipo: "hoja" } : { tipo: "menu", junto: el, alLado: true });
    },
    desvincular: function () { tostada("Se desvinculó el celular", { icono: "unlink", deshacer: function () { tostada("Vuelven a estar en espejo"); } }); },
    usuario: function (el) {
      abrir('<div style="padding:6px 10px 10px"><div style="font-weight:800">Carlos Illobre</div><div class="t-detalle">Administrador · carlos@ferrebress</div></div>' +
        '<a class="lx-op" data-ir="configuracion"><i class="i" data-i="settings"></i>Configuración</a>' +
        '<a class="lx-op" data-ir="entrar"><i class="i" data-i="log-out"></i>Cerrar sesión</a>', { tipo: "menu", junto: el, alLado: true });
    }
  };
  function on(mapa) { for (var k in mapa) acciones[k] = mapa[k]; }
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-lx]");
    if (!el || !acciones[el.getAttribute("data-lx")]) return;
    e.preventDefault();
    acciones[el.getAttribute("data-lx")](el, e);
  });

  window.Lx = { on: on, abrir: abrir, cerrar: cerrar, cerrarTodo: cerrarTodo, abiertos: function () { return abiertos.length; },
    tostada: tostada, mas: mas, vibrar: vibrar, miles: miles, pesos: pesos, pesosC: pesosC, precio: precio, pct: pct,
    avanzar: avanzar, tilde: tilde, reanimar: reanimar, pintar: pintar, celu: celu };
})();

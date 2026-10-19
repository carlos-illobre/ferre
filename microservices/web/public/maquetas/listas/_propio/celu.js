/* Listas de precios: piezas de las tres maquetas de celular.
   Celu.sub(html, op)        pantalla que entra desde la derecha dentro del celular; se cierra con
                             [data-volver] o Escape. op.completa la deja tapar el menú de abajo.
   Celu.resultado(k, m)      lo que queda después de aplicar la lista k: precios actualizados,
                             aviso de los nuevos sin precio y la lista para remarcar, por pasillo.
   Celu.conectarResultado(raiz, k, m)  hace andar los botones de ese resultado.
   Va después de interaccion.js, datos.js y dialogos.js. */
(function () {
  var L = DATOS.listas, FOTOS = Dlg.FOTOS;
  var celu = document.querySelector(".celu");
  var subs = [];

  function sub(html, op) {
    op = op || {};
    var s = document.createElement("div");
    s.className = "lx-sub" + (op.completa ? " completa" : "");
    s.innerHTML = html;
    celu.appendChild(s);
    Lx.pintar(s);
    var capa = { el: s, alCerrar: op.alCerrar };
    subs.push(capa);
    s.addEventListener("click", function (e) { if (e.target.closest("[data-volver]")) { e.preventDefault(); cerrarSub(capa); } });
    requestAnimationFrame(function () { requestAnimationFrame(function () { s.classList.add("abierto"); }); });
    return s;
  }
  function cerrarSub(capa) {
    capa = capa || subs[subs.length - 1];
    if (!capa) return;
    subs.splice(subs.indexOf(capa), 1);
    capa.el.classList.remove("abierto");
    setTimeout(function () { capa.el.remove(); }, 340);
    if (capa.alCerrar) capa.alCerrar();
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !Lx.abiertos() && subs.length) { e.preventDefault(); cerrarSub(); }
  });

  // Lo que hay que remarcar: los que cambian de precio y los nuevos a los que ya se les eligió margen.
  function paraRemarcar(k, margenes) {
    var out = DATOS.remarcarDe(k).map(function (r) { return { f: r[0], n: r[1], d: r[2], u: r[3], antes: r[4], ahora: r[5] }; });
    L[k].filas.nuevos.forEach(function (n) {
      if (margenes[n.n] != null) out.push({ f: n.f, n: n.n, d: n.d, u: n.u, antes: null, ahora: Lx.precio(n.c, margenes[n.n]) });
    });
    return out.sort(function (a, b) { return a.u < b.u ? -1 : 1; });
  }
  function faltan(k, margenes) { return L[k].filas.nuevos.filter(function (n) { return margenes[n.n] == null; }).length; }

  function avisoNuevos(k, margenes) {
    var f = faltan(k, margenes);
    if (!f) return '<div class="aviso logro lx-aviso-nuevos"><i class="i" data-i="circle-check"></i><span>Los nuevos ya tienen precio: entran en las etiquetas.</span></div>';
    return '<div class="aviso urgente lx-aviso-nuevos"><i class="i" data-i="triangle-alert"></i><span><b>' + f + (f === 1 ? " nuevo quedó" : " nuevos quedaron") + ' sin precio</b>: no se venden hasta elegirles el margen.</span><button class="btn chico" data-lx="c-margenes" style="background:#fff">Ponerles precio</button></div>';
  }
  function filaRemarcar(r, i) {
    return '<div class="lx-r" data-i-rem="' + i + '" data-u="' + r.u.charAt(0) + '" style="grid-template-columns:40px minmax(0,1fr) auto;cursor:pointer"><div class="foto chica"><img src="' + FOTOS + r.f + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + r.n +
      '</div><div class="d">Est. ' + r.u + (r.antes == null ? " · nuevo" : "") + '</div></div><span class="der">' + (r.antes != null ? "<s>" + Lx.pesos(r.antes) + "</s>" : "") + Lx.pesos(r.ahora) + "</span></div>";
  }
  function resultado(k, margenes) {
    var l = L[k], filas = paraRemarcar(k, margenes);
    var letras = [];
    filas.forEach(function (r) { var c = r.u.charAt(0); if (letras.indexOf(c) < 0) letras.push(c); });
    var chips = '<div class="lx-chips"><span class="chip elegido" data-pas="">Todos</span>' + letras.map(function (c) { return '<span class="chip" data-pas="' + c + '">Pasillo ' + c + "</span>"; }).join("") + "</div>";
    return '<div class="lx-res lx-fundido">' +
      '<div class="lx-res-cab">' + Lx.tilde() + '<div><div class="t-seccion">' + Lx.miles(l.precios) + " precios actualizados · " + l.nuevos + (l.nuevos === 1 ? " nuevo" : " nuevos") + '</div><div class="t-detalle">' + l.prov + " · lista del " + l.corta + " · aplicada hoy 10:44</div></div></div>" +
      avisoNuevos(k, margenes) +
      '<button class="btn btn-accion grande" data-lx="c-empezar" style="width:100%"><i class="i i-l" data-i="footprints"></i>Empezar a remarcar</button>' +
      '<div class="lx-sec"><b>Para remarcar</b><span>por pasillo · faltan <b class="lx-faltan">' + Lx.miles(l.precios) + "</b></span></div>" + chips +
      '<div class="lx-lista lx-rem">' + filas.map(filaRemarcar).join("") + '<div class="lx-r"><span class="ic"><i class="i" data-i="ellipsis"></i></span><div class="n">Y ' + Lx.miles(Math.max(0, l.precios - filas.length)) + ' más, en el mismo orden</div><span></span></div></div>' +
      '<button class="btn" data-lx="c-imprimir" style="width:100%;margin-top:12px"><i class="i" data-i="printer"></i>Imprimir las ' + Lx.miles(l.precios) + " etiquetas</button></div>";
  }

  function conectarResultado(raiz, k, margenes) {
    var l = L[k], filas = paraRemarcar(k, margenes), hechos = 0;
    function marcar(i, hecho) {
      var el = raiz.querySelector('[data-i-rem="' + i + '"]');
      if (!el || el.classList.contains("hecho") === hecho) return;
      el.classList.toggle("hecho", hecho);
      hechos += hecho ? 1 : -1;
      var f = raiz.querySelector(".lx-faltan");
      f.textContent = Lx.miles(l.precios - hechos);
      Lx.reanimar(f, "lx-salta");
    }
    function siguiente() {
      for (var i = 0; i < filas.length; i++) if (!raiz.querySelector('[data-i-rem="' + i + '"]').classList.contains("hecho")) return i;
      return -1;
    }
    function tarjeta(i) {
      var r = filas[i];
      var h = '<div class="lx-cab"><div class="t-seccion">Remarcar<div class="t-detalle" style="margin-top:2px">Faltan ' + Lx.miles(l.precios - hechos) + " de " + Lx.miles(l.precios) + '</div></div><button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
        '<div class="lx-carta-chica"><span class="pastilla pino" style="justify-self:start"><i class="i i-s" data-i="map-pin"></i>Est. ' + r.u + '</span><div class="ft"><img src="' + FOTOS + r.f + '.webp" alt=""></div><div class="t-renglon">' + r.n + '</div><div class="t-detalle">' + r.d + "</div>" +
        '<div class="pr"><div class="t-detalle">Decía<s>' + (r.antes != null ? Lx.pesos(r.antes) : "Sin precio") + '</s></div><div class="ah"><span class="t-etiqueta" style="color:var(--pino-texto)">Ahora</span><b>' + Lx.pesos(r.ahora) + "</b></div></div></div>" +
        '<div class="lx-pie"><button class="btn btn-fantasma" data-lx="c-saltar">Después</button><button class="btn btn-accion grande" data-lx="c-hecho"><i class="i i-l" data-i="check"></i>Remarcado</button></div>';
      var d = Lx.abrir(h, { tipo: "hoja" });
      d.setAttribute("data-actual", i);
    }
    raiz.addEventListener("click", function (e) {
      var t = e.target;
      var pas = t.closest("[data-pas]");
      if (pas) {
        var u = pas.getAttribute("data-pas");
        raiz.querySelectorAll("[data-pas]").forEach(function (c) { c.classList.toggle("elegido", c === pas); });
        raiz.querySelectorAll(".lx-rem [data-u]").forEach(function (f) { f.hidden = !!u && f.getAttribute("data-u") !== u; });
        return;
      }
      var fila = t.closest("[data-i-rem]");
      if (fila) { marcar(Number(fila.getAttribute("data-i-rem")), !fila.classList.contains("hecho")); Lx.vibrar(10); }
    });
    Lx.on({
      "c-empezar": function () { var i = siguiente(); if (i < 0) { Lx.tostada("Ya remarcaste todos los de la lista"); return; } tarjeta(i); },
      "c-hecho": function (el) {
        var hoja = el.closest(".lx-hoja"), i = Number(hoja.getAttribute("data-actual"));
        marcar(i, true); Lx.vibrar(10); Lx.cerrar();
        var s = siguiente();
        if (s >= 0) setTimeout(function () { tarjeta(s); }, 360); else Lx.tostada("Remarcaste los de esta tanda");
      },
      "c-saltar": function (el) {
        var i = Number(el.closest(".lx-hoja").getAttribute("data-actual")); Lx.cerrar();
        var s = -1;
        for (var j = i + 1; j < filas.length; j++) if (!raiz.querySelector('[data-i-rem="' + j + '"]').classList.contains("hecho")) { s = j; break; }
        if (s >= 0) setTimeout(function () { tarjeta(s); }, 360);
        Lx.tostada("Queda para después, al final de la lista", { icono: "skip-forward" });
      },
      "c-imprimir": function () { Lx.tostada("Mandé " + Lx.miles(l.precios) + " etiquetas a la impresora del mostrador", { icono: "printer" }); },
      "c-margenes": function () {
        Dlg.margenes(l, margenes, function () {
          var av = raiz.querySelector(".lx-aviso-nuevos");
          av.outerHTML = avisoNuevos(k, margenes);
          Lx.pintar(raiz);
        });
      }
    });
  }

  // Botón que se llena con el avance de aplicar; al terminar llama a listo().
  function aplicando(btn, l, listo) {
    btn.classList.add("lx-llenando");
    btn.innerHTML = '<span class="lx-relleno"></span><span class="lx-txt">Aplicando… 0 de ' + Lx.miles(l.leidos) + "</span>";
    var rel = btn.querySelector(".lx-relleno"), txt = btn.querySelector(".lx-txt");
    Lx.avanzar(l.leidos, 1800, function (v, f) { rel.style.transform = "scaleX(" + f + ")"; txt.textContent = "Aplicando… " + Lx.miles(v) + " de " + Lx.miles(l.leidos); }, function () {
      txt.textContent = "Buscando duplicados…";
      setTimeout(function () { Lx.vibrar([10, 40, 10]); listo(); }, 600);
    });
  }

  window.Celu = { sub: sub, cerrarSub: cerrarSub, resultado: resultado, conectarResultado: conectarResultado, aplicando: aplicando, paraRemarcar: paraRemarcar };
})();

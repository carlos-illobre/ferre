/* Interacciones de las maquetas de Duplicados: lo que cada variante comparte (hojas, diálogos,
   paneles, tostadas, el menú «Más», unir a mano, la lista de unidos, buscar en todo el catálogo).
   Se carga al pie, después de iconos.js. No hay lógica real: se ve lo que pasaría. */
(function () {
  var reducir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CURVA = "cubic-bezier(.2,.8,.2,1)", SALIDA = "cubic-bezier(.4,0,1,1)", REBOTE = "cubic-bezier(.34,1.4,.64,1)";
  var esCelu = function () { return !!document.querySelector(".celu"); };
  var FOTOS = "../../../_comun/fotos/";

  function anim(el, kf, o) {
    if (!el || reducir || !el.animate) return Promise.resolve();
    o = Object.assign({ duration: 200, easing: CURVA }, o || {});
    try { return el.animate(kf, o).finished.catch(function () {}); } catch (e) { return Promise.resolve(); }
  }
  function esperar(ms) { return new Promise(function (r) { setTimeout(r, reducir ? 0 : ms); }); }
  function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function crear(html) {
    var t = document.createElement("template"); t.innerHTML = html.trim();
    var el = t.content.firstElementChild;
    var caja = document.createElement("div"); caja.appendChild(el);
    if (window.pintarIconos) window.pintarIconos(caja);
    el = caja.firstElementChild; caja.removeChild(el); return el;
  }
  function pintar(el) { if (window.pintarIconos) window.pintarIconos(el); return el; }
  function miles(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function pesos(n) { return '<span class="peso">$</span>' + miles(n); }
  function marco() { return document.querySelector(".celu") || document.body; }

  // Entrar a una lista: desde 8 px abajo con fundido y rebote corto; el borde se pinta de logro.
  function entra(el, demora) {
    return anim(el, [{ transform: "translateY(8px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320, easing: REBOTE, delay: demora || 0, fill: "backwards" });
  }
  function marcarNuevo(el) {
    var sombra = document.createElement("span");
    sombra.style.cssText = "position:absolute;inset:-1px;border-radius:inherit;box-shadow:0 0 0 2px var(--logro);pointer-events:none";
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.appendChild(sombra);
    anim(sombra, [{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 1000 }).then(function () { sombra.remove(); });
  }

  // FLIP con transform: lo que queda en la lista se acomoda en vez de saltar.
  function acomodar(cont, cambiar) {
    var hijos = Array.prototype.slice.call(cont.children), antes = new Map();
    hijos.forEach(function (h) { antes.set(h, h.getBoundingClientRect()); });
    cambiar();
    Array.prototype.forEach.call(cont.children, function (h) {
      var a = antes.get(h); if (!a) return;
      var b = h.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) anim(h, [{ transform: "translate(" + dx + "px," + dy + "px)" }, { transform: "none" }], { duration: 200 });
    });
  }

  // Un número que cambia: rueda hacia arriba si sube y hacia abajo si baja.
  function numero(el, valor) {
    if (!el) return;
    var antes = parseInt(String(el.textContent).replace(/\./g, ""), 10) || 0;
    el.textContent = typeof valor === "number" ? miles(valor) : valor;
    if (getComputedStyle(el).display === "inline") el.style.display = "inline-block";
    var sube = (parseInt(String(valor).replace(/\./g, ""), 10) || 0) >= antes;
    anim(el, [{ transform: "translateY(" + (sube ? 60 : -60) + "%)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 200 });
  }
  // Envuelve el primer número de un elemento en <span class="dup-n"> (no cambia cómo se ve).
  function envolver(el) {
    if (!el) return null;
    var ya = el.querySelector(".dup-n"); if (ya) return ya;
    var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) {
      var m = n.nodeValue.match(/\d[\d.]*/);
      if (!m) continue;
      // Todo el texto va en un solo <span>: dentro de un flex no se parte en piezas con hueco.
      var t = document.createElement("span"); t.className = "dup-t"; n.parentNode.replaceChild(t, n); t.appendChild(n);
      var r = n.splitText(m.index); r.splitText(m[0].length);
      var s = document.createElement("span"); s.className = "dup-n"; t.replaceChild(s, r); s.appendChild(r);
      return s;
    }
    return null;
  }

  // ---- Capas: hoja, diálogo, panel, menú. Se cierran con su botón, tocando afuera y con Escape.
  var pila = [];
  function abrir(o) {
    var tipo = o.tipo || (esCelu() ? "hoja" : "dialogo");
    var capa = crear('<div class="dup-capa es-' + tipo + '" role="dialog" aria-modal="true"><div class="dup-velo"></div><div class="dup-' + tipo + '">' + (tipo === "hoja" ? '<span class="asa"></span>' : "") + o.html + "</div></div>");
    marco().appendChild(capa);
    var caja = capa.lastElementChild, velo = capa.firstElementChild;
    if (o.clase) caja.classList.add(o.clase);
    if (tipo === "menu" && o.ancla) {
      var r = o.ancla.getBoundingClientRect(), m = marco().getBoundingClientRect();
      caja.style.left = (r.right - m.left + 8) + "px";
      caja.style.top = Math.max(8, r.bottom - m.top - caja.offsetHeight + 6) + "px";
    }
    var api = {
      el: caja, capa: capa, abierta: true,
      cerrar: function () {
        if (!api.abierta) return Promise.resolve(); api.abierta = false;
        pila.splice(pila.indexOf(api), 1);
        var sale = tipo === "hoja" ? { transform: "translateY(100%)" } : tipo === "panel" ? { transform: "translateX(100%)" } : { transform: "scale(.97)", opacity: 0 };
        anim(velo, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: SALIDA, fill: "forwards" });
        return anim(caja, [{ transform: "none", opacity: 1 }, sale], { duration: tipo === "menu" ? 120 : 240, easing: SALIDA, fill: "forwards" }).then(function () {
          capa.remove(); if (o.alCerrar) o.alCerrar();
        });
      }
    };
    pila.push(api);
    velo.addEventListener("click", function () { api.cerrar(); });
    capa.addEventListener("click", function (e) {
      if (e.target === capa) { api.cerrar(); return; }
      var c = e.target.closest("[data-cerrar]"); if (c && capa.contains(c)) api.cerrar();
      if (e.target.closest("[data-ir]") && tipo === "menu") api.cerrar();
    });
    anim(velo, [{ opacity: 0 }, { opacity: 1 }], { duration: 320 });
    var entra = tipo === "hoja" ? { transform: "translateY(100%)" } : tipo === "panel" ? { transform: "translateX(100%)" } : tipo === "menu" ? { transform: "translateX(-4px)", opacity: 0 } : { transform: "translateY(8px) scale(.98)", opacity: 0 };
    anim(caja, [entra, { transform: "none", opacity: 1 }], { duration: tipo === "menu" ? 160 : 320 });
    if (o.alAbrir) o.alAbrir(caja, api);
    var foco = caja.querySelector("input, [autofocus]"); if (foco && !esCelu()) setTimeout(function () { foco.focus(); }, 30);
    return api;
  }
  function hayCapa() { return pila.length > 0; }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); pila[pila.length - 1].cerrar(); }
  }, true);

  // ---- Tostada: una sola por vez, con «Deshacer» opcional (6 s).
  var tostadaActual = null;
  function tostada(texto, o) {
    o = o || {};
    var zona = marco().querySelector(".dup-tostadas");
    if (!zona) { zona = crear('<div class="dup-tostadas" aria-live="polite"></div>'); marco().appendChild(zona); }
    if (o.abajo != null) zona.style.bottom = o.abajo + "px";
    if (tostadaActual) tostadaActual.quitar(true);
    var t = crear('<div class="tostada' + (o.deshacer ? "" : " sin-boton") + '"><i class="i i-s" data-i="' + (o.icono || "circle-check") + '"></i><span>' + texto + "</span>" + (o.deshacer ? '<button class="btn">Deshacer' + (o.tecla ? ' <span class="kbd" style="height:20px;background:transparent;color:#fff;border-color:rgba(255,255,255,.4)">' + o.tecla + "</span>" : "") + "</button>" : "") + "</div>");
    zona.appendChild(t);
    anim(t, [{ transform: "translateY(" + (esCelu() ? 12 : -12) + "px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 320 });
    var reloj, api = {
      el: t,
      quitar: function (ya) {
        clearTimeout(reloj); if (tostadaActual === api) tostadaActual = null;
        if (ya) { t.remove(); return; }
        anim(t, [{ opacity: 1 }, { transform: "translateY(" + (esCelu() ? 8 : -8) + "px)", opacity: 0 }], { duration: 200, easing: SALIDA, fill: "forwards" }).then(function () { t.remove(); });
      },
      deshacer: function () { if (o.deshacer) { api.quitar(); o.deshacer(); } }
    };
    if (o.deshacer) t.querySelector(".btn").addEventListener("click", api.deshacer);
    reloj = setTimeout(function () { api.quitar(); }, o.ms || 6000);
    tostadaActual = api;
    return api;
  }
  function tostadaVigente() { return tostadaActual; }

  // ---- «Más»: un menú chico en la computadora, una hoja con tarjetas en el celular.
  var MAS = [
    ["anomalias", "triangle-alert", "Anomalías", "3 para mirar", '<span class="pastilla urgente">3</span>'],
    ["procesos", "workflow", "Procesos", "Cómo se hace cada tarea", ""],
    ["mejoras-y-errores", "bug", "Mejoras y errores", "Lo que pediste y lo que falla", ""],
    ["configuracion", "settings", "Configuración", "Negocio, impresora, cuentas", ""]
  ];
  function abrirMas(ancla) {
    if (esCelu()) {
      return abrir({ tipo: "hoja", html: '<div class="dup-cab"><span class="t-seccion">Más</span><button class="btn btn-fantasma btn-icono" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
        MAS.map(function (m) { return '<a class="renglon" data-ir="' + m[0] + '" style="margin:0"><span class="foto-icono"><i class="i i-l" data-i="' + m[1] + '"></i></span><div><div class="titulo">' + m[2] + '</div><div class="detalle">' + m[3] + "</div></div>" + (m[4] || '<i class="i" data-i="chevron-right" style="color:var(--texto-3)"></i>') + "</a>"; }).join("") });
    }
    return abrir({ tipo: "menu", ancla: ancla, html: MAS.map(function (m) { return '<a data-ir="' + m[0] + '" tabindex="0"><i class="i" data-i="' + m[1] + '"></i>' + m[2] + m[4] + "</a>"; }).join("") });
  }

  // ---- Marco: menú lateral o de abajo, pestañas de Catálogo y «Más».
  function conectarMarco() {
    var IR = { "vender": "vender", "catálogo": "productos", "depósito": "stock", "negocio": "resumen", "productos": "productos", "listas de precios": "listas", "listas": "listas", "duplicados": "duplicados" };
    document.querySelectorAll(".lateral .nav-item, .nav-inferior a, .pestanas a, .celu-pestanas a").forEach(function (a) {
      var t = (a.querySelector(".txt") || a).textContent.replace(/\s+/g, " ").trim().toLowerCase().replace(/\s*\d+$/, "");
      if (t === "más") { a.setAttribute("data-mas", ""); return; }
      if (IR[t]) a.setAttribute("data-ir", IR[t]);
    });
    document.addEventListener("click", function (e) {
      var m = e.target.closest("[data-mas]"); if (!m) return;
      e.preventDefault(); abrirMas(m);
    });
  }

  // ---- Separar: la fila se parte en dos con un corte vertical que se abre y sale de la lista.
  function partir(fila) {
    var r = fila.getBoundingClientRect(), w = r.width;
    if (reducir) { return Promise.resolve(); }
    if (getComputedStyle(fila).position === "static") fila.style.position = "relative";
    var copia = function (izq) {
      var m = document.createElement("div"); m.className = "dup-mitad";
      m.style.left = izq ? "0" : (w / 2) + "px"; m.style.width = (w / 2) + "px";
      var c = fila.cloneNode(true); c.style.width = w + "px"; c.style.left = izq ? "0" : (-w / 2) + "px"; c.style.border = "0";
      m.appendChild(c); return m;
    };
    var a = copia(true), b = copia(false), corte = crear('<span class="dup-corte" style="left:50%"></span>');
    Array.prototype.forEach.call(fila.children, function (h) { h.style.opacity = "0"; });
    fila.appendChild(a); fila.appendChild(b); fila.appendChild(corte);
    return anim(corte, [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 120 }).then(function () {
      corte.remove();
      anim(a, [{ transform: "none", opacity: 1 }, { transform: "translateX(-24px) rotate(-2deg)", opacity: 0 }], { duration: 200, easing: SALIDA, fill: "forwards" });
      return anim(b, [{ transform: "none", opacity: 1 }, { transform: "translateX(24px) rotate(2deg)", opacity: 0 }], { duration: 200, easing: SALIDA, fill: "forwards" });
    });
  }
  function quitarFila(fila) {
    var cont = fila.parentNode;
    return partir(fila).then(function () { acomodar(cont, function () { fila.remove(); }); });
  }

  // ---- Lista de unidos, con buscador y «Separar» en cada uno.
  var UNIDOS = [
    ["llave-combinada", "Llave combinada 13 mm", "Bahco · 3 proveedores · ayer"],
    ["puntas", "Puntas Phillips PH2 × 25", "Stanley · 2 proveedores · 15/10"],
    ["pintura", "Látex interior mate blanco 4 L", "Alba · 2 proveedores · 12/10"],
    ["tornillos", "Tornillo autoperforante 8 × 1\"", "Fixser · 2 proveedores · 09/10"],
    ["clavos", "Clavos punta París 2\" × 1 kg", "Acindar · 2 proveedores · 06/10"],
    ["martillo", "Martillo de goma 450 g mango madera", "Bremen · 2 proveedores · 03/10"],
    ["cinta-metrica", "Cinta métrica 3 m traba automática", "Bremen · 3 proveedores · 29/09"],
    ["lampara", "Lámpara LED 12 W luz cálida E27", "Macroled · 2 proveedores · 25/09"]
  ];
  function filaUnido(u) {
    return crear('<div class="dup-fila"><span class="foto"><img src="' + FOTOS + u[0] + '.webp" alt=""></span><div class="n">' + u[1] + '</div><div class="d">' + u[2] + '</div><button class="btn btn-suave chico" style="color:var(--pino-texto);background:var(--pino-suave)"><i class="i i-s" data-i="split"></i>Separar</button></div>');
  }
  function abrirUnidos(o) {
    o = o || {};
    var lista = (o.recientes || []).concat(UNIDOS);
    var total = o.total || 38;
    var tipo = esCelu() ? "hoja" : "panel";
    return abrir({ tipo: tipo, html:
      '<div class="dup-cab"><span class="t-seccion">Productos unidos <span class="pastilla logro dup-total" style="vertical-align:middle">' + total + '</span><small>Separar los devuelve a como estaban</small></span><button class="btn btn-fantasma btn-icono" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<label class="campo dup-buscar"><i class="i i-s" data-i="search"></i><input type="search" spellcheck="false" placeholder="Buscar un unido…" aria-label="Buscar un unido"></label>' +
      '<div class="dup-lista"></div><div class="t-detalle" style="text-align:center">Se ven los últimos ' + lista.length + " de " + total + "</div>",
      alAbrir: function (caja) {
        var cont = caja.querySelector(".dup-lista"), cuenta = caja.querySelector(".dup-total");
        lista.forEach(function (u) { cont.appendChild(filaUnido(u)); });
        caja.querySelector("input").addEventListener("input", function (e) {
          var q = e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
          Array.prototype.forEach.call(cont.children, function (f) {
            if (!f.classList.contains("dup-fila")) return;
            f.style.display = f.textContent.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").indexOf(q) >= 0 ? "" : "none";
          });
        });
        cont.addEventListener("click", function (e) {
          var b = e.target.closest(".btn"); if (!b) return;
          var f = b.closest(".dup-fila"), sig = f.nextSibling, nombre = f.querySelector(".n").textContent;
          quitarFila(f).then(function () {
            total--; numero(cuenta, total); if (o.alSeparar) o.alSeparar(-1);
            tostada("Separado: " + nombre + ". Vuelven a ser 2 productos.", { icono: "split", abajo: esCelu() ? 40 : null, deshacer: function () {
              Array.prototype.forEach.call(f.children, function (h) { h.style.opacity = ""; });
              f.querySelectorAll(".dup-mitad").forEach(function (m) { m.remove(); });
              cont.insertBefore(f, sig && sig.parentNode === cont ? sig : null);
              entra(f); total++; numero(cuenta, total); if (o.alSeparar) o.alSeparar(1);
            } });
          });
        });
      } });
  }

  // ---- Unir a mano: dos productos, se elige cuál se conserva y se ve cómo queda.
  var CANDIDATOS = [
    { n: "Llave combinada 10 mm", f: "llave-combinada", d: "Bahco · Ferretera del Sur", c: 6900 },
    { n: "LLAVE COMB. 10MM BAHCO 111M", f: "llave-combinada", d: "Bahco · Distribuidora Oeste", c: 7150 },
    { n: "Llave combinada 10 mm cromo vanadio", f: "llave-combinada", d: "Bremen · Bulonera Centro", c: 5980 }
  ];
  function abrirUnirAMano(alUnir) {
    var a = 0, b = 1, cons = 0;
    var tarj = function (k) { return '<div class="dup-candidato"><span class="lbl">' + (k ? "Y este" : "Este producto") + '</span><div class="dup-lista"><div class="dup-fila elegible" data-k="' + k + '"></div></div></div>'; };
    return abrir({ tipo: esCelu() ? "hoja" : "dialogo", html:
      '<div class="dup-cab"><span class="t-seccion">Unir dos productos a mano<small>Tocá el que se conserva: su nombre queda</small></span><button class="btn btn-fantasma btn-icono" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<label class="campo dup-buscar"><i class="i i-s" data-i="search"></i><input type="search" spellcheck="false" value="llave combinada 10" aria-label="Buscar productos"></label>' +
      tarj(0) + tarj(1) +
      '<button class="btn btn-suave chico dup-otro" style="align-self:flex-start"><i class="i i-s" data-i="refresh-cw"></i>Probar con otro</button>' +
      '<div class="aviso pino dup-queda"></div>' +
      '<div class="dup-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion dup-unir"><i class="i" data-i="git-merge"></i>Unir los dos' + (esCelu() ? "" : ' <span class="kbd">Enter</span>') + "</button></div>",
      alAbrir: function (caja, api) {
        function pintarTodo() {
          [a, b].forEach(function (idx, k) {
            var c = CANDIDATOS[idx], f = caja.querySelector('[data-k="' + k + '"]');
            f.classList.toggle("si", cons === k);
            f.innerHTML = '<span class="foto"><img src="' + FOTOS + c.f + '.webp" alt=""></span><div class="n">' + c.n + '</div><div class="d">' + c.d + " · " + pesos(c.c) + '</div><span class="radio"></span>';
          });
          var x = CANDIDATOS[a], y = CANDIDATOS[b], barato = x.c <= y.c ? x : y;
          var q = caja.querySelector(".dup-queda");
          q.innerHTML = '<i class="i i-s" data-i="git-merge" style="margin-top:2px"></i><span>Queda <b>' + CANDIDATOS[cons ? b : a].n + "</b> con los 2 proveedores. El costo sale del más barato: <b>" + pesos(barato.c) + "</b>.</span>";
          pintar(q);
        }
        pintarTodo();
        caja.addEventListener("click", function (e) {
          var f = e.target.closest(".dup-fila.elegible");
          if (f) { cons = +f.getAttribute("data-k"); pintarTodo(); return; }
          if (e.target.closest(".dup-otro")) { b = b === 1 ? 2 : 1; pintarTodo(); entra(caja.querySelector('[data-k="1"]')); return; }
          if (e.target.closest(".dup-unir")) {
            var nombre = CANDIDATOS[cons ? b : a].n;
            api.cerrar(); if (alUnir) alUnir({ nombre: nombre, foto: "llave-combinada", detalle: "Bahco · 2 proveedores · recién" });
          }
        });
        caja.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); caja.querySelector(".dup-unir").click(); } });
      } });
  }

  // ---- Buscar en todo el catálogo: el botón se vuelve una barra que avanza con números.
  function buscarTodo(boton, o) {
    o = o || {};
    if (boton.classList.contains("dup-buscando")) return;
    var antes = boton.innerHTML, rotulo = o.rotulo || boton, rotuloAntes = rotulo.innerHTML;
    var ancho = boton.getBoundingClientRect().width;
    boton.classList.add("dup-buscando"); boton.style.minWidth = ancho + "px";
    var barra = crear('<span class="dup-avance"></span>'); boton.appendChild(barra);
    var total = 104500, paso = 0, pasos = 12;
    var tick = setInterval(function () {
      paso++;
      var hecho = Math.min(total, Math.round(total * paso / pasos / 10) * 10);
      barra.style.transform = "scaleX(" + paso / pasos + ")";
      var txt = miles(hecho) + " de " + miles(total) + (o.corto ? "" : " productos");
      if (rotulo === boton) setRotulo(txt); else rotulo.textContent = txt;
      if (paso >= pasos) {
        clearInterval(tick);
        setTimeout(function () {
          boton.classList.remove("dup-buscando"); boton.style.minWidth = "";
          boton.innerHTML = antes; rotulo.innerHTML = rotuloAntes; pintar(boton);
          if (o.alTerminar) o.alTerminar();
        }, reducir ? 0 : 300);
      }
    }, reducir ? 0 : 180);
    function setRotulo(txt) {
      var s = boton.querySelector(".dup-txt");
      if (!s) { Array.prototype.slice.call(boton.childNodes).forEach(function (n) { if (n !== barra && !(n.classList && n.classList.contains("i"))) n.remove(); }); s = document.createElement("span"); s.className = "dup-txt"; boton.insertBefore(s, barra); }
      s.textContent = txt;
    }
  }

  // ---- Las 12 sugerencias de todas las variantes (7 por código, 5 por descripción).
  function lado(n, marca, cod, prov, corto, pc, costo, lista, hace, stock, ventas, desde) {
    return { n: n, marca: marca, cod: cod, prov: prov, corto: corto, pc: pc, costo: costo, lista: lista, hace: hace, stock: stock, ventas: ventas, desde: desde };
  }
  var SUGERENCIAS = [
    { id: "mecha", motivo: "codigo", cuando: "hoy", foto: "mecha", seguro: 97,
      a: lado("Mecha acero rápido HSS 8 mm", "Ezeta", "7 791234 005081", "Bulonera Centro", "Bulonera Centro", "ME080", 2480, "14/10/2026", 5, 10, 35, 2018),
      b: lado("MECHA HSS 8MM P/METAL", "Ezeta", "7 791234 005081", "Distribuidora Oeste", "Distrib. Oeste", "40-HSS08", 2610, "02/10/2026", 17, 6, 0) },
    { id: "cinta", motivo: "codigo", cuando: "hoy", foto: "cinta-metrica", seguro: 96,
      a: lado("Cinta métrica PowerLock 5 m", "Stanley", "7 790123 450016", "Distribuidora Oeste", "Distrib. Oeste", "ST-30696", 9350, "14/10/2026", 5, 14, 41, 2019),
      b: lado("CINTA METRICA STANLEY POWERLOCK 5MTS 30-696", "Stanley", "7 790123 450016", "Ferretera del Sur", "Ferretera del Sur", "30696", 9120, "08/10/2026", 11, 8, 0) },
    { id: "tarugos", motivo: "texto", cuando: "hoy", foto: "tarugos", seguro: 88,
      a: lado("Tarugos nylon S8 con tope × 100", "Fischer", "7 791245 008123", "Fischer Argentina", "Fischer Arg.", "S8T100", 4150, "16/10/2026", 3, 3, 12, 2020),
      b: lado("TARUGO FISCHER S8 C/TOPE X100", "Fischer", "7 791245 008130", "Bulonera Centro", "Bulonera Centro", "TF-S8", 4390, "14/10/2026", 5, 0, 0) },
    { id: "martillo", motivo: "codigo", cuando: "14/10", foto: "martillo", seguro: 95,
      a: lado("Martillo carpintero 27 mm mango tubular", "Bahco", "7 311518 220734", "Bahco Argentina", "Bahco Arg.", "427-27", 18900, "14/10/2026", 5, 4, 9, 2021),
      b: lado("MARTILLO CARP. 27MM MANGO TUBO", "Bahco", "7 311518 220734", "Ferretera del Sur", "Ferretera del Sur", "MC27T", 19750, "09/10/2026", 10, 2, 0) },
    { id: "pinza", motivo: "texto", cuando: "14/10", foto: "pinza", seguro: 84,
      a: lado("Pinza universal 8\" aislada 1000 V", "Bahco", "7 311518 104546", "Distribuidora Oeste", "Distrib. Oeste", "PU8-1000", 15800, "14/10/2026", 5, 5, 7, 2020),
      b: lado("PINZA UNIV. 8 PULG AISLADA VDE", "Bahco", "7 311518 104553", "Bulonera Centro", "Bulonera Centro", "2628V-200", 17350, "30/09/2026", 19, 1, 0) },
    { id: "lampara", motivo: "codigo", cuando: "10/10", foto: "lampara", seguro: 98,
      a: lado("Lámpara LED 9 W luz fría E27", "Macroled", "7 798123 900094", "Eléctrica Moreno", "Eléctrica Moreno", "LED9F", 1890, "10/10/2026", 9, 36, 120, 2017),
      b: lado("LAMPARA LED 9W FRIA E27", "Macroled", "7 798123 900094", "Distribuidora Oeste", "Distrib. Oeste", "ML-9WF", 1950, "03/10/2026", 16, 12, 0) },
    { id: "esmalte", motivo: "texto", cuando: "10/10", foto: "pintura", seguro: 81,
      a: lado("Esmalte sintético blanco brillante 1 L", "Alba", "7 790960 112014", "Pinturería del Centro", "Pinturería Centro", "ES-BB1", 12400, "10/10/2026", 9, 4, 15, 2019),
      b: lado("ESMALTE SINT. BCO BTE 1LT", "Alba", "7 790960 112021", "Distribuidora Oeste", "Distrib. Oeste", "AL-1121", 12950, "01/10/2026", 18, 2, 0) },
    { id: "clavos", motivo: "codigo", cuando: "09/10", foto: "clavos", seguro: 94,
      a: lado("Clavos punta París 2\" × 1 kg", "Acindar", "7 790834 000215", "Bulonera Centro", "Bulonera Centro", "CP2-1K", 3200, "09/10/2026", 10, 7, 28, 2018),
      b: lado("CLAVO PTA PARIS 2\" X KG", "Acindar", "7 790834 000215", "Ferretera del Sur", "Ferretera del Sur", "CL-PP2", 3050, "05/10/2026", 14, 4, 0) },
    { id: "tornillos", motivo: "codigo", cuando: "09/10", foto: "tornillos", seguro: 96,
      a: lado("Tornillo autoperforante 8 × 1\" × 100", "Fixser", "7 798045 330812", "Bulonera Centro", "Bulonera Centro", "TA8-1", 5600, "09/10/2026", 10, 9, 22, 2019),
      b: lado("TORN. AUTOPERF. 8X1 X100 FIXSER", "Fixser", "7 798045 330812", "Distribuidora Oeste", "Distrib. Oeste", "FX-0801", 5480, "04/10/2026", 15, 3, 0) },
    { id: "puntas", motivo: "texto", cuando: "07/10", foto: "puntas", seguro: 86,
      a: lado("Puntas Phillips PH2 × 25 mm × 10", "Stanley", "7 790123 812043", "Ferretera del Sur", "Ferretera del Sur", "PH2-25", 3900, "07/10/2026", 12, 12, 30, 2020),
      b: lado("PUNTA PH2 25MM X10 STANLEY", "Stanley", "7 790123 812050", "Distribuidora Oeste", "Distrib. Oeste", "ST-68942", 4100, "29/09/2026", 20, 5, 0) },
    { id: "llave", motivo: "codigo", cuando: "05/10", foto: "llave-combinada", seguro: 97,
      a: lado("Llave combinada 10 mm", "Bahco", "7 311518 501109", "Ferretera del Sur", "Ferretera del Sur", "111M-10", 6900, "05/10/2026", 14, 6, 18, 2018),
      b: lado("LLAVE COMB. 10MM BAHCO 111M", "Bahco", "7 311518 501109", "Distribuidora Oeste", "Distrib. Oeste", "BH-11110", 7150, "28/09/2026", 21, 3, 0) },
    { id: "widia", motivo: "texto", cuando: "05/10", foto: "mecha", seguro: 79,
      a: lado("Mecha widia 6 mm para hormigón", "Ezeta", "7 791234 006064", "Bulonera Centro", "Bulonera Centro", "MW06", 1750, "05/10/2026", 14, 20, 64, 2017),
      b: lado("MECHA WIDIA 6MM HORMIGON EZETA", "Ezeta", "7 791234 006071", "Ferretera del Sur", "Ferretera del Sur", "EZ-W6", 1690, "30/09/2026", 19, 8, 0) }
  ];

  window.Dup = {
    SUGERENCIAS: SUGERENCIAS,
    reducir: reducir, CURVA: CURVA, SALIDA: SALIDA, REBOTE: REBOTE, FOTOS: FOTOS,
    anim: anim, esperar: esperar, vibrar: vibrar, crear: crear, pintar: pintar, miles: miles, pesos: pesos,
    entra: entra, marcarNuevo: marcarNuevo, acomodar: acomodar, numero: numero, envolver: envolver,
    abrir: abrir, hayCapa: hayCapa, tostada: tostada, tostadaVigente: tostadaVigente,
    abrirMas: abrirMas, conectarMarco: conectarMarco, partir: partir, quitarFila: quitarFila,
    abrirUnidos: abrirUnidos, abrirUnirAMano: abrirUnirAMano, buscarTodo: buscarTodo
  };
})();

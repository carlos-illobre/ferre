/* Interacciones de las maquetas de Entrar: que se pueda recorrer, sin lógica de verdad.
   Cada página carga este archivo al pie y llama a Entrar.iniciar("compu-1" | "compu-2" | "compu-3" |
   "celu-1" | "celu-2" | "celu-3"). Sirve igual para index.html y estados.html de cada variante: los
   clics se atienden por delegación, según lo que haya en la página.
   La navegación a otras pantallas la hace _comun/navegar.js (data-ir o window.irAMaqueta). */
(function () {
  var reducir = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function dur(ms) { return reducir.matches ? 0 : ms; }
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var R = "../../_recursos/";

  var G = "";
  function pintar(raiz) {
    if (window.pintarIconos) window.pintarIconos(raiz);
    if (!G) { var g = $(".g svg"); if (g) G = g.outerHTML; }
    if (G) $$(".g", raiz).forEach(function (e) { if (!e.innerHTML.trim()) e.innerHTML = G; });
  }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); var n = d.firstChild; pintar(d); return n; }
  function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } }
  function celuDe(x) { return (x && x.closest && x.closest(".celu")) || null; }
  function raiz(desde) { return celuDe(desde) || document.body; }
  function temblar(x) { if (!x) return; x.classList.remove("e-tiembla"); void x.offsetWidth; x.classList.add("e-tiembla"); }
  function entrar(x, clase) { if (!x) return; x.classList.remove(clase || "e-entra"); void x.offsetWidth; x.classList.add(clase || "e-entra"); }

  // ---------- Ir a otra pantalla, con un fundido corto ----------
  // Al final de cada recorrido simulado (huella leída, cuenta elegida) se toca un enlace con
  // data-ir, así la navegación pasa siempre por _comun/navegar.js, igual que el resto del marco.
  var yendo = false;
  function irPorEnlace(destino) {
    var a = document.createElement("a");
    a.setAttribute("data-ir", destino); a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function ir(destino) {
    if (yendo) return; yendo = true;
    document.documentElement.classList.add("e-saliendo");
    setTimeout(function () {
      if (window.irAMaqueta) irPorEnlace(destino);
      setTimeout(function () { document.documentElement.classList.remove("e-saliendo"); yendo = false; }, 900);
    }, dur(200));
  }

  // ---------- Capas: hojas, diálogos y pantallas que tapan ----------
  var pila = [];
  function abrir(html, o) {
    o = o || {};
    var cont = raiz(o.desde), fijo = cont === document.body, tipo = o.tipo || (fijo ? "dialogo" : "hoja");
    var velo = null;
    if (tipo !== "pantalla") {
      velo = document.createElement("div");
      velo.className = "e-velo" + (o.veloClaro ? " claro" : "");
      cont.appendChild(velo);
    }
    var panel = el('<div class="e-' + tipo + " " + (o.clase || "") + '" role="dialog" aria-modal="true">' + html + "</div>");
    cont.appendChild(panel);
    var capa = { panel: panel, velo: velo, celu: fijo ? null : cont, abierta: true };
    capa.cerrar = function (silencioso) {
      if (!capa.abierta) return; capa.abierta = false;
      pila.splice(pila.indexOf(capa), 1);
      panel.classList.remove("abierta"); if (velo) velo.classList.remove("abierta");
      if (capa.alCerrarTimers) capa.alCerrarTimers.forEach(clearTimeout);
      setTimeout(function () { panel.remove(); if (velo) velo.remove(); }, dur(tipo === "dialogo" ? 200 : 320));
      if (!silencioso && o.alCerrar) o.alCerrar();
    };
    capa.timer = function (fn, ms) { capa.alCerrarTimers = capa.alCerrarTimers || []; var t = setTimeout(fn, ms); capa.alCerrarTimers.push(t); return t; };
    if (velo) velo.addEventListener("click", function () { capa.cerrar(); });
    panel.addEventListener("click", function (e) { if (e.target.closest("[data-cerrar]")) { e.stopPropagation(); capa.cerrar(); } });
    void panel.offsetWidth;
    requestAnimationFrame(function () { panel.classList.add("abierta"); if (velo) velo.classList.add("abierta"); });
    pila.push(capa);
    return capa;
  }
  function capaDe(x) { for (var i = pila.length - 1; i >= 0; i--) if (pila[i].panel.contains(x)) return pila[i]; return null; }
  function cerrarTodas(celu) { pila.slice().reverse().forEach(function (c) { if (!celu || c.celu === celu) c.cerrar(true); }); }

  // ---------- Tostada ----------
  function tostada(texto, desde, icono) {
    var cont = raiz(desde);
    var t = el('<div class="e-tostada" role="status"><span class="tostada"><i class="i" data-i="' + (icono || "check") + '"></i>' + texto + "</span></div>");
    cont.appendChild(t); void t.offsetWidth;
    requestAnimationFrame(function () { t.classList.add("abierta"); });
    setTimeout(function () { t.classList.remove("abierta"); setTimeout(function () { t.remove(); }, dur(200)); }, 2400);
  }

  // ---------- El tilde que crece sobre lo que se tocó ----------
  function tilde(sobre) {
    if (!sobre) return;
    if (getComputedStyle(sobre).position === "static") sobre.style.position = "relative";
    sobre.appendChild(el('<span class="e-tilde"><i class="i" data-i="check"></i></span>'));
    vibrar([10, 40, 10]);
  }
  function huellaYEntrar(sobre, destino, demora) { tilde(sobre); setTimeout(function () { ir(destino || "vender"); }, dur(demora || 500)); }

  // ---------- Cuentas de Google ----------
  var CUENTAS = [
    { id: "marta", nombre: "Marta Gómez", correo: "marta.gomez.ferre@gmail.com", ini: "MG", c: "a" },
    { id: "lucas", nombre: "Lucas Ferreyra", correo: "lucas.ferreyra.dep@gmail.com", ini: "LF", c: "c" },
    { id: "jp", nombre: "Juan Pablo Ríos", correo: "juanpablo.rios88@gmail.com", ini: "JR", c: "d" },
  ];
  // o.directo(cuenta): true si esa cuenta entra derecho a Vender (lleva data-ir). Si no, o.alElegir(cuenta).
  function elegirCuenta(desde, o) {
    var filas = CUENTAS.map(function (c) {
      var ir = o.directo && o.directo(c) ? ' data-ir="vender"' : "";
      return '<button class="e-cuenta" data-cuenta="' + c.id + '"' + ir + '><span class="cara ' + c.c + '">' + c.ini + '</span><span><b>' + c.nombre + "</b><small>" + c.correo + '</small></span><i class="i i-s" data-i="chevron-right"></i></button>';
    }).join("");
    var celu = celuDe(desde);
    var capa = abrir(
      (celu ? '<span class="asa"></span>' : '<button class="btn btn-fantasma btn-icono e-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>') +
      '<div class="e-google"><span class="g"></span><h2>Elegí una cuenta</h2><p>para seguir a <b>Ferrebress</b></p><div class="e-cuentas">' + filas +
      '</div><small class="e-letra">Google le pasa a Ferrebress tu nombre y tu correo.</small></div>',
      { desde: desde, clase: "e-elegir" });
    capa.panel.addEventListener("click", function (e) {
      var f = e.target.closest(".e-cuenta"); if (!f || f.hasAttribute("data-ir")) return;
      e.stopPropagation();
      var c = CUENTAS.filter(function (x) { return x.id === f.getAttribute("data-cuenta"); })[0];
      capa.cerrar(true);
      setTimeout(function () { o.alElegir(c); }, dur(160));
    });
    return capa;
  }

  // ---------- El lector de huella del sistema (celular) ----------
  function lector(desde, o) {
    var capa = abrir(
      '<span class="asa"></span><div class="e-lector"><span class="marca"><img src="' + R + 'isotipo-claro.png" alt="">Ferrebress</span>' +
      "<h2>" + (o.titulo || "Usá tu huella") + "</h2><p>" + (o.texto || "Para entrar como Marta Gómez") + "</p>" +
      '<button class="e-sensor latiendo" aria-label="Apoyar el dedo"><i class="i" data-i="fingerprint"></i></button>' +
      '<small>Tocá el sensor para simular el dedo</small><button class="btn btn-fantasma" data-cerrar>Cancelar</button></div>',
      { desde: desde, clase: "e-lector-hoja", alCerrar: o.alCancelar });
    var s = $(".e-sensor", capa.panel);
    s.addEventListener("click", function (e) {
      e.stopPropagation(); s.classList.remove("latiendo"); tilde(s);
      capa.timer(function () { if (o.alLeer) o.alLeer(); else ir("vender"); }, dur(500));
    });
    return capa;
  }

  // ---------- La cámara del celular que lee el código de la compu (celu 1 y 2) ----------
  function camara(desde, o) {
    o = o || {};
    var cam = abrir(
      '<div class="pantalla-compu"><div class="qr"><img src="' + R + 'qr.svg" alt=""></div></div>' +
      '<div class="marco-lectura"><b></b><b></b><b></b><b></b></div>' +
      '<button class="cerrar" data-cerrar aria-label="Cerrar la cámara"><i class="i" data-i="x"></i></button>' +
      '<div class="leyenda">Apuntá al código de la compu</div><span class="home-ind" style="background:#fff"></span>',
      { desde: desde, tipo: "pantalla", clase: "e-cam" });
    cam.timer(function () {
      cam.panel.classList.add("leido"); $(".leyenda", cam.panel).textContent = "Código de la compu leído"; vibrar(10);
      var hoja = abrir(
        '<span class="asa"></span><div class="e-compu-leida"><span class="ic"><i class="i i-l" data-i="monitor"></i></span>' +
        '<div><b>Compu del mostrador · Caja 1</b><span>Entra con tu usuario apenas pongas la huella</span></div></div>' +
        '<button class="e-dedo latiendo" aria-label="Apoyar el dedo"><i class="i" data-i="fingerprint"></i></button>' +
        '<b class="titulo-dedo">Poné el dedo: entrás acá y en la compu</b>' +
        '<button class="btn btn-fantasma e-usar-google">Usar Google</button>',
        { desde: desde, veloClaro: true, alCerrar: function () { cam.cerrar(true); } });
      hoja.panel.addEventListener("click", function (e) {
        var d = e.target.closest(".e-dedo");
        if (d) { e.stopPropagation(); d.classList.remove("latiendo"); huellaYEntrar(d); return; }
        if (e.target.closest(".e-usar-google")) { e.stopPropagation(); hoja.cerrar(true); cam.cerrar(true); if (o.alGoogle) setTimeout(o.alGoogle, dur(200)); }
      });
    }, dur(1200) || 50);
    return cam;
  }

  // ---------- Compartir el pedido de alta (celu 1) ----------
  function compartir(desde) {
    var capa = abrir(
      '<span class="asa"></span><div class="e-google" style="gap:8px"><h2 style="margin-top:0">Pedir el alta</h2>' +
      '<p style="margin-bottom:8px">«Hola, ¿me das de alta en Ferrebress? Mi cuenta es juanpablo.rios88@gmail.com»</p><div class="e-cuentas">' +
      '<button class="e-cuenta" data-a="Carlos"><span class="cara b">CI</span><span><b>Carlos Illobre</b><small>Administrador · por mensaje</small></span><i class="i i-s" data-i="send"></i></button>' +
      '<button class="e-cuenta" data-a="copiar"><span class="cara" style="background:var(--hundido);color:var(--texto-2)"><i class="i" data-i="copy"></i></span><span><b>Copiar el mensaje</b><small>Para mandarlo por donde quieras</small></span></button>' +
      '</div><button class="btn btn-fantasma" data-cerrar style="width:100%">Cancelar</button></div>',
      { desde: desde });
    capa.panel.addEventListener("click", function (e) {
      var f = e.target.closest(".e-cuenta"); if (!f) return;
      capa.cerrar(true);
      if (f.getAttribute("data-a") === "copiar") { copiar("Hola, ¿me das de alta en Ferrebress? Mi cuenta es juanpablo.rios88@gmail.com"); tostada("Copiaste el mensaje", desde, "copy"); }
      else tostada("Le mandaste el pedido a Carlos", desde, "send");
    });
  }
  function copiar(t) { try { if (navigator.clipboard) navigator.clipboard.writeText(t).catch(function () {}); } catch (e) { /* sin portapapeles */ } }

  // ---------- Una hoja o diálogo con un código grande ----------
  function codigoGrande(desde, titulo, texto, alTocar) {
    var capa = abrir(
      (celuDe(desde) ? '<span class="asa"></span>' : '<button class="btn btn-fantasma btn-icono e-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>') +
      '<h2 style="margin:0;font-size:24px;line-height:30px;font-weight:800">' + titulo + '</h2><p style="margin:0;color:var(--texto-2);font-size:16px;line-height:24px">' + texto + "</p>" +
      '<div class="qr e-qr-grande"><img src="' + R + 'qr.svg" alt=""><span class="centro"><img src="' + R + 'isotipo-claro.png" alt=""></span></div>' +
      '<button class="btn" data-cerrar style="width:100%">Cerrar</button>',
      { desde: desde, clase: "e-codigo" });
    if (alTocar) { var q = $(".e-qr-grande", capa.panel); q.setAttribute("data-e-toca", ""); q.title = "Tocalo para simular que el celular lo lee"; q.addEventListener("click", function () { alTocar(q, capa); }); }
    return capa;
  }

  // ---------- El código de la compu: se cambia solo y se puede «leer» ----------
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function cuentaRegresiva(nums, anillos, desde, total, alVencer) {
    var s = desde;
    var id = setInterval(function () {
      s--;
      if (s < 0) { s = total; if (alVencer) alVencer(); }
      nums.forEach(function (n) { if (n.isConnected) n.textContent = fmt(s); });
      anillos.forEach(function (a) { a.setAttribute("stroke-dashoffset", (50.3 * (1 - s / total)).toFixed(1)); });
    }, 1000);
    return { reiniciar: function (v) { s = v; }, parar: function () { clearInterval(id); } };
  }
  function renovar(qr) {
    if (!qr) return;
    qr.classList.add("e-sale");
    setTimeout(function () { qr.classList.add("e-renueva"); void qr.offsetWidth; qr.classList.remove("e-sale", "e-renueva"); }, dur(200));
  }
  // Simula que un celular leyó el código: se apaga y aparece la cara; a los 3 s (o al tocarla), la huella.
  var PERSONA = { nombre: "Marta", ini: "MG", c: "a", cel: "Moto G54" };
  function leerCodigo(qr, o) {
    o = o || {};
    if (!qr || qr.querySelector(".e-qr-leido")) return null;
    var p = o.persona || PERSONA;
    qr.classList.add("e-apagado");
    var cara = el('<div class="e-qr-leido e-entra" role="status"><span class="cara ' + p.c + '">' + p.ini + "</span><b>" + p.nombre + ', poné la huella</b><span class="t">en tu ' + p.cel + '. La compu entra sola apenas la lea.</span><span class="e-puntos"><i></i><i></i><i></i></span></div>');
    qr.appendChild(cara);
    vibrar(10);
    var hecho = false;
    function listo() { if (hecho) return; hecho = true; clearTimeout(t); huellaYEntrar($(".cara", cara)); }
    var t = setTimeout(listo, dur(3000) || 600);
    cara.addEventListener("click", function (e) { e.stopPropagation(); listo(); });
    var ctl = {
      cancelar: function () { if (hecho) return; hecho = true; clearTimeout(t); cara.remove(); qr.classList.remove("e-apagado"); renovar(qr); },
    };
    return ctl;
  }

  // ---------- Escape: primero la capa de arriba, después lo de cada variante ----------
  var alEscape = null;
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (pila.length) { pila[pila.length - 1].cerrar(); return; }
    if (alEscape) alEscape(e);
  });

  // =====================================================================================
  // Computadora
  // =====================================================================================
  var TUTO =
    '<button class="btn btn-fantasma btn-icono e-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>' +
    '<h2>Cómo se entra</h2><p>Tres pasos, y desde el segundo día solo el último.</p>' +
    '<ol class="pasos">' +
    '<li><span class="n">1</span><div><b>Pedí el alta</b><span>Un Administrador te da de alta con tu cuenta de Google, en Más → Usuarios.</span></div></li>' +
    '<li><span class="n">2</span><div><b>Entrá una vez con Google</b><span>En el celular o acá. El celular te ofrece la huella.</span></div></li>' +
    '<li><span class="n">3</span><div><b>Después, celular y huella</b><span>Apuntá al código de esta pantalla y poné el dedo. La compu entra sola.</span></div></li>' +
    '</ol><button class="btn btn-accion" data-cerrar>Entendido</button>';

  function rechazoCompu() {
    return '<div class="e-rechazo e-entra"><span class="ic"><i class="i" data-i="user-x"></i></span><div><b>Esta cuenta no tiene permiso para entrar</b>' +
      '<span class="correo"><span class="g"></span>juanpablo.rios88@gmail.com</span>' +
      "<p>Pedile a un Administrador que te dé de alta en Más → Usuarios. Cuando lo haga, entrás con esta misma cuenta.</p></div></div>";
  }

  var VARIANTES = {};

  // ---------- Compu 1 · El mostrador ----------
  VARIANTES["compu-1"] = function () {
    var qr = $(".qr.grande"), col = $(".col-texto"), lectura = null;
    var cuenta = cuentaRegresiva($$(".vence .num"), $$(".vence .anillo .v"), 252, 300, function () { if (!lectura) renovar(qr); });
    if (qr) { qr.setAttribute("data-e-toca", ""); qr.title = "Tocalo para simular que el celular lo lee"; }
    var RECHAZO =
      '<h1 class="t-titulo">Entrá con tu celular</h1>' +
      '<p class="t-cuerpo bajada">O probá con otra cuenta de Google. El código de la izquierda sigue sirviendo.</p>' +
      '<div class="rechazo"><span class="ic"><i class="i" data-i="user-x"></i></span><div><b>Esta cuenta no tiene permiso para entrar</b>' +
      '<span class="correo"><span class="g" style="width:16px;height:16px;display:inline-grid"></span>juanpablo.rios88@gmail.com</span>' +
      "<p>Pedile a un Administrador que te dé de alta en Más → Usuarios. Cuando lo haga, entrás con esta misma cuenta.</p></div></div>" +
      '<div class="acciones"><button class="g-btn"><span class="g"></span>Probar con otra cuenta</button>' +
      '<button class="btn grande e-copiar" style="min-height:48px;border-radius:999px"><i class="i" data-i="copy"></i>Copiar el correo</button></div>' +
      '<div class="aviso pino quien"><i class="i" data-i="shield-check"></i><span>No se abrió ninguna sesión: sin una cuenta autorizada no se ve ningún dato del negocio.</span></div>';
    function sinPermiso() {
      if (!$(".rechazo", col)) { col.innerHTML = RECHAZO; pintar(col); $$(".rechazo .g svg", col).forEach(function (s) { s.style.width = s.style.height = "16px"; }); entrar(col); }
      temblar($(".rechazo", col));
    }
    function google() { elegirCuenta(null, { directo: function (c) { return c.id !== "jp"; }, alElegir: sinPermiso }); }
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest(".e-velo, .e-dialogo")) return;
      if (t.closest(".g-btn")) return google();
      if (t.closest(".acciones .btn:not(.g-btn)")) { copiar("juanpablo.rios88@gmail.com"); return tostada("Copiaste juanpablo.rios88@gmail.com", null, "copy"); }
      if (t.closest(".tuto")) return abrir(TUTO, { clase: "e-tuto" });
      if (t.closest(".qr.grande") && !lectura) { lectura = leerCodigo(qr); }
    });
    alEscape = function () { if (lectura) { lectura.cancelar(); lectura = null; cuenta.reiniciar(300); } };
  };

  // ---------- Compu 2 · ¿Quién atiende? ----------
  VARIANTES["compu-2"] = function () {
    var pagina = $(".pagina"), titular = $(".titular"), gente = $(".gente"), ayuda = $(".pie .ayuda");
    var personas = $$(".gente .persona"), foco = 0, espera = $(".espera"), avisoT = null;
    var ayudaOriginal = ayuda ? ayuda.innerHTML : "";
    var DATOS = [
      { nombre: "Marta", completo: "Marta Gómez", ini: "MG", c: "a", cel: "Moto G54" },
      { nombre: "Carlos", completo: "Carlos Illobre", ini: "CI", c: "b", cel: "Galaxy S23" },
      { nombre: "Lucas", completo: "Lucas Ferreyra", ini: "LF", c: "c", cel: "Galaxy A15" },
    ];
    var otroNum = $(".persona.otro .cel .num");
    cuentaRegresiva(otroNum ? [otroNum] : [], [], 252, 300);
    var aviso = null;
    function marcar(i) { foco = i; personas.forEach(function (p, j) { p.classList.toggle("foco", j === i); }); }
    function esperar(p) {
      if (titular) titular.style.display = "none";
      if (gente) gente.style.display = "none";
      if (espera && !espera.hasAttribute("data-e-mia")) espera.remove();
      espera = el(
        '<section class="espera e-crece" data-e-mia><div class="mini-celu"><div class="pant">' +
        '<div class="hora num">8:47</div><div class="fecha">lunes 19 de octubre</div>' +
        '<div class="noti"><img src="' + R + 'isotipo-claro.png" alt=""><div><b>Ferrebress · ahora</b><span>¿Entrás en la Caja 1 del mostrador? Poné la huella.</span></div>' +
        '<div class="acc"><em>No fui yo</em><em class="si">Entrar</em></div></div>' +
        '<span class="dedo" title="Tocalo para simular el dedo"><i class="i i-xl" data-i="fingerprint"></i></span></div></div>' +
        '<div><span class="cara ' + p.c + '" style="width:64px;height:64px;font-size:24px">' + p.ini + "</span>" +
        "<h2>Mirá tu celular, " + p.nombre + "</h2>" +
        "<p>Te llegó un aviso. Poné la huella ahí y esta compu entra sola, con tu usuario. No hace falta tocar nada acá.</p>" +
        '<div class="vence" style="margin-top:16px"><svg class="anillo" viewBox="0 0 20 20"><circle class="f" cx="10" cy="10" r="8"/><circle class="v" cx="10" cy="10" r="8" stroke-dasharray="50.3" stroke-dashoffset="18"/></svg>El aviso vence en <b class="num">1:48</b></div>' +
        '<div class="botones"><button class="btn e-otra-vez"><i class="i" data-i="bell-ring"></i>Mandar de nuevo</button>' +
        '<button class="btn e-mejor-codigo"><i class="i" data-i="qr-code"></i>Mejor leo el código</button>' +
        '<button class="btn btn-fantasma e-no-soy">No soy ' + p.nombre + ' <span class="kbd">Esc</span></button></div></div></section>');
      espera.dataset.cel = p.cel;
      pagina.insertBefore(espera, $(".pie", pagina));
      pagina.style.gridTemplateRows = "auto 1fr auto";
      if (ayuda) { ayuda.innerHTML = '<span><i class="i" data-i="shield-check"></i>Si alguien toca tu nombre sin vos, el aviso se ignora y no entra nadie.</span>'; pintar(ayuda); }
      empezarAviso();
    }
    function empezarAviso() {
      if (aviso) aviso.parar();
      aviso = cuentaRegresiva($$(".espera .vence .num"), $$(".espera .vence .anillo .v"), 108, 120, function () { volver(); tostada("El aviso venció. No entró nadie.", null, "timer"); });
    }
    function volver() {
      if (aviso) { aviso.parar(); aviso = null; }
      if (!gente) { location.href = "index.html"; return; }
      if (espera) { espera.remove(); espera = null; }
      titular.style.display = ""; gente.style.display = ""; entrar(gente);
      pagina.style.gridTemplateRows = "";
      if (ayuda) { ayuda.innerHTML = ayudaOriginal; }
    }
    function otraPersona() {
      codigoGrande(null, "Leé este código con tu celular", "Con la cámara o con «Escanear» en la entrada de Ferrebress. Se cambia solo y sirve una vez.", function (q) {
        leerCodigo(q, { persona: { nombre: "Sofía", ini: "SB", c: "d", cel: "Galaxy A05" } });
      });
    }
    function elegir(i) {
      if (i === 3) return otraPersona();
      marcar(i);
      setTimeout(function () { esperar(DATOS[i]); }, dur(120));
    }
    function sinPermiso() {
      var donde = (espera && espera.lastElementChild) || titular;
      var r = $(".e-rechazo"); if (r) return temblar(r);
      r = el(rechazoCompu()); r.style.maxWidth = "640px"; r.style.margin = "16px auto 0";
      if (donde === titular) titular.appendChild(r); else donde.insertBefore(r, donde.firstChild);
      setTimeout(function () { temblar(r); }, dur(200));
    }
    function google() { elegirCuenta(null, { directo: function (c) { return c.id !== "jp"; }, alElegir: sinPermiso }); }
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest(".e-velo, .e-dialogo")) return;
      if (t.closest(".g-btn")) return google();
      var p = t.closest(".gente .persona"); if (p) return elegir(personas.indexOf(p));
      if (t.closest(".noti .si, .mini-celu .dedo")) return huellaYEntrar($(".mini-celu .dedo"));
      if (t.closest(".noti em")) { volver(); return tostada("Aviso rechazado: no entró nadie", null, "shield-check"); }
      if (t.closest(".espera .botones .btn") && /Mandar/.test(t.closest(".btn").textContent)) { if (!aviso) empezarAviso(); aviso.reiniciar(120); return tostada("Te mandamos el aviso de nuevo al " + ((espera && espera.dataset.cel) || "Moto G54"), null, "bell-ring"); }
      if (t.closest(".espera .botones .btn") && /código/.test(t.closest(".btn").textContent)) { if (!gente) { location.href = "index.html"; return; } volver(); return otraPersona(); }
      if (t.closest(".espera .botones .btn-fantasma")) return volver();
    });
    document.addEventListener("keydown", function (e) {
      if (pila.length || !gente || gente.style.display === "none") return;
      if (/^[1-4]$/.test(e.key)) { elegir(Number(e.key) - 1); }
      else if (e.key === "ArrowRight") marcar(Math.min(personas.length - 1, foco + 1));
      else if (e.key === "ArrowLeft") marcar(Math.max(0, foco - 1));
      else if (e.key === "Enter") elegir(foco);
    });
    if (espera) empezarAviso();
    alEscape = function () { if (espera || !gente) volver(); };
  };

  // ---------- Compu 3 · El cartel del local ----------
  VARIANTES["compu-3"] = function () {
    var tarjeta = $(".tarjeta-qr"), qr = $(".tarjeta-qr .qr"), h1 = $(".tarjeta-qr h1");
    var timer = null, cuenta = null;
    var VENCE = '<span class="vence"><svg class="anillo" viewBox="0 0 20 20"><circle class="f" cx="10" cy="10" r="8"/><circle class="v" cx="10" cy="10" r="8" stroke-dasharray="50.3" stroke-dashoffset="8"/></svg><span class="num">4:12</span></span>';
    var LEIDO = '<span class="pastilla logro"><i class="i i-s" data-i="check"></i>Leído</span>';
    var GOOGLE = '<button class="g-btn"><span class="g"></span>Continuar con Google</button>';
    var NO_SOY = '<button class="btn btn-fantasma e-no-soy" style="justify-self:center">No soy Marta: mostrar otro código <span class="kbd">Esc</span></button>';
    function contar() { if (cuenta) cuenta.parar(); cuenta = cuentaRegresiva($$(".tarjeta-qr .vence .num"), $$(".tarjeta-qr .vence .anillo .v"), 252, 300, function () { renovar(qr); }); }
    function cambiar(sel, html) { var v = $(sel, tarjeta); if (!v) return; var n = el(html); v.replaceWith(n); }
    function leido(auto) {
      if (cuenta) { cuenta.parar(); cuenta = null; }
      h1.textContent = "Leído. Ahora, la huella";
      if (!$(".leido", qr)) {
        qr.appendChild(el('<div class="leido e-entra"><span class="cara a">MG</span><b>Marta, poné la huella</b><span>en tu Moto G54. La compu entra sola apenas la lea.</span><span class="puntos e-puntos"><i></i><i></i><i></i></span></div>'));
      }
      cambiar(".linea > .vence", LEIDO);
      cambiar(".g-btn", NO_SOY);
      vibrar(10);
      if (auto) timer = setTimeout(huella, dur(3000) || 600);
    }
    function huella() { clearTimeout(timer); var c = $(".leido .cara", qr); if (c && !$(".e-tilde", c)) huellaYEntrar(c); }
    function normal() {
      clearTimeout(timer);
      var l = $(".leido", qr); if (l) l.remove();
      h1.textContent = "Apuntá tu celular y poné la huella";
      cambiar(".linea > .pastilla", VENCE);
      cambiar(".e-no-soy", GOOGLE);
      var r = $(".e-rechazo", tarjeta); if (r) r.remove();
      renovar(qr); contar();
    }
    function sinPermiso() {
      if ($(".leido", qr)) normal();
      var r = $(".e-rechazo", tarjeta);
      if (!r) { r = el(rechazoCompu()); tarjeta.insertBefore(r, $(".g-btn", tarjeta)); }
      setTimeout(function () { temblar(r); }, dur(200));
    }
    function google() { elegirCuenta(null, { directo: function (c) { return c.id !== "jp"; }, alElegir: sinPermiso }); }
    if (qr) { qr.setAttribute("data-e-toca", ""); qr.title = "Tocalo para simular que el celular lo lee"; }
    if ($(".tarjeta-qr .vence")) contar();
    // En estados.html la tarjeta ya viene leída: el botón de «No soy Marta» es el que está dibujado.
    var dibujado = $(".tarjeta-qr > .btn-fantasma"); if (dibujado) dibujado.classList.add("e-no-soy");
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest(".e-velo, .e-dialogo")) return;
      if (t.closest(".tarjeta-qr .g-btn")) return google();
      if (t.closest(".e-no-soy")) return normal();
      if (t.closest(".leido")) return huella();
      if (t.closest(".tarjeta-qr .qr")) return leido(true);
    });
    alEscape = function () { if ($(".leido", qr)) normal(); };
  };

  // =====================================================================================
  // Celular
  // =====================================================================================

  // ---------- Celu 1 · El mostrador ----------
  VARIANTES["celu-1"] = function () {
    var RECHAZO =
      '<div class="rechazo"><div class="t"><span class="ic"><i class="i" data-i="user-x"></i></span>Esta cuenta no tiene permiso para entrar</div>' +
      '<span class="correo"><span class="g"></span>juanpablo.rios88@gmail.com</span>' +
      "<p>Pedile a un Administrador que te dé de alta. Después entrás con esta misma cuenta.</p></div>" +
      '<button class="g-btn ancho"><span class="g"></span>Probar con otra cuenta</button>' +
      '<button class="btn btn-suave" style="width:100%"><i class="i" data-i="share-2"></i>Avisarle al Administrador</button>';
    function oferta(celu, c) {
      return abrir(
        '<span class="pulso"><i class="i" data-i="fingerprint" style="width:52px;height:52px"></i></span>' +
        "<h2>¿Entrar con la huella?</h2>" +
        "<p>Entraste como " + c.nombre + ". La próxima vez entrás con el dedo, sin Google. Y con la compu: leés su código y listo.</p>" +
        '<div class="cosas"><span><i class="i" data-i="check"></i>Tu huella no sale de este celular</span><span><i class="i" data-i="check"></i>La podés quitar en Más → Configuración</span></div>' +
        '<button class="huella-btn">Sí, usar la huella</button><button class="btn btn-fantasma e-ahora-no">Ahora no</button>',
        { desde: celu, clase: "hoja e-oferta", alCerrar: function () { ir("vender"); } });
    }
    function sinPermiso(celu) {
      var panel = $(".panel", celu); if (!panel) return;
      if (!$(".rechazo", panel)) {
        panel.innerHTML = RECHAZO; pintar(panel);
        var c = $(".tarjeta.compu", celu); if (c) c.style.display = "none";
        var m = $(".marca-c p", celu); if (m) m.style.display = "none";
        var a = $(".abajo .seguro", celu); if (a) { a.innerHTML = '<i class="i i-s" data-i="shield-check"></i>No se abrió ninguna sesión'; pintar(a); }
        entrar(panel);
      }
      setTimeout(function () { temblar($(".rechazo", panel)); }, dur(200));
    }
    function google(celu) {
      elegirCuenta(celu, {
        directo: function (c) { return c.id === "marta"; },
        alElegir: function (c) { if (c.id === "jp") sinPermiso(celu); else oferta(celu, c); },
      });
    }
    // Quitar una hoja dibujada (estados.html) o abierta por la maqueta
    function quitarHoja(hoja, luego) {
      var capa = capaDe(hoja);
      if (capa) { capa.cerrar(true); }
      else {
        hoja.style.transition = "transform var(--t-nav) var(--curva-salida)"; hoja.style.transform = "translateY(105%)";
        var v = hoja.parentNode.querySelector(".velo"); if (v) { v.style.transition = "opacity var(--t-nav)"; v.style.opacity = "0"; }
      }
      if (luego) setTimeout(luego, dur(320));
    }
    document.addEventListener("click", function (e) {
      var t = e.target, celu = celuDe(t); if (!celu) return;
      if (t.closest(".e-velo") || t.closest(".e-elegir, .e-lector-hoja")) return;
      if (t.closest(".panel .huella-btn")) return lector(celu, { texto: "Para entrar como Marta Gómez" });
      if (t.closest(".g-btn")) return google(celu);
      if (t.closest(".tarjeta.compu")) return camara(celu, { alGoogle: function () { google(celu); } });
      if (t.closest(".panel .btn-suave")) return compartir(celu);
      var hoja = t.closest(".hoja");
      if (hoja && t.closest(".huella-btn")) return quitarHoja(hoja, function () { lector(celu, { titulo: "Vinculá tu huella", texto: "Apoyá el dedo para usarlo en Ferrebress", alCancelar: function () { ir("vender"); } }); });
      if (hoja && $(".camara", celu) && t.closest(".pulso")) return huellaYEntrar(t.closest(".pulso"));
      if (hoja && $(".camara", celu) && t.closest(".btn-fantasma")) return google(celu);
      if (hoja && t.closest(".btn-fantasma")) return quitarHoja(hoja, function () { ir("vender"); });
      if (t.closest(".camara .cerrar")) { location.href = "index.html"; }
    });
    // Estado dibujado: la hoja de la oferta se cierra tocando el fondo
    $$(".velo").forEach(function (v) { v.addEventListener("click", function () { var h = v.parentNode.querySelector(".hoja"); if (h) quitarHoja(h, function () { ir("vender"); }); }); });
    $$(".camara .cerrar, .celu .hoja .pulso").forEach(function (x) { x.setAttribute("data-e-toca", ""); });
    alEscape = function () { var v = $(".velo"); if (v) v.click(); };
  };

  // ---------- Celu 2 · La huella es la puerta ----------
  VARIANTES["celu-2"] = function () {
    var vinculado = !!$(".puerta:not(.nuevo)");
    setTimeout(function () { $$(".dedo .pulso").forEach(function (p) { p.classList.add("latiendo"); p.setAttribute("data-e-toca", ""); }); }, dur(300));
    var barra = '<div class="barra-estado"><span>8:47</span><span class="se"><i class="i i-s" data-i="wifi"></i></span></div>';
    function oferta(celu, c) {
      return abrir(barra +
        '<div class="oferta"><span class="pastilla logro ok"><i class="i i-s" data-i="check"></i>Entraste como ' + c.nombre + "</span>" +
        '<div class="grande-dedo"><i class="i" data-i="fingerprint"></i></div><h1>La próxima, con el dedo</h1>' +
        "<p>Vinculá este celular y entrás sin Google. La huella no sale del teléfono.</p>" +
        '<div class="cuenta"><div><b>4 toques</b><span>con Google</span></div><div class="mejor"><b>0 toques</b><span>con la huella</span></div></div>' +
        '<div class="botones"><button class="huella-btn"><i class="i i-l" data-i="fingerprint"></i>Vincular con mi huella</button><button class="btn btn-fantasma" style="width:100%">Ahora no</button></div></div><span class="home-ind"></span>',
        { desde: celu, tipo: "pantalla" });
    }
    function sinPermiso(celu) {
      return abrir(barra +
        '<div class="sinp"><span class="ic e-tiembla"><i class="i i-xl" data-i="user-x"></i></span><h1>Esta cuenta no tiene permiso</h1>' +
        '<span class="correo"><span class="g"></span>juanpablo.rios88@gmail.com</span>' +
        '<div class="tarjeta alta"><span class="qr"><img src="' + R + 'qr.svg" alt=""></span><div><b>Mostrale esto a un Administrador</b><span>Lo lee con su celular y te da de alta en un toque. Después entrás con esta cuenta.</span></div></div>' +
        '<div class="botones"><button class="g-btn"><span class="g"></span>Probar con otra cuenta</button><span class="seguro" style="justify-content:center;margin-top:8px"><i class="i i-s" data-i="shield-check"></i>No se abrió ninguna sesión</span></div></div><span class="home-ind"></span>',
        { desde: celu, tipo: "pantalla" });
    }
    function google(celu) {
      cerrarTodas(celu);
      elegirCuenta(celu, {
        directo: function (c) { return vinculado && c.id === "marta"; },
        alElegir: function (c) { if (c.id === "jp") sinPermiso(celu); else oferta(celu, c); },
      });
    }
    document.addEventListener("click", function (e) {
      var t = e.target, celu = celuDe(t); if (!celu) return;
      if (t.closest(".e-velo") || t.closest(".e-elegir, .e-lector-hoja, .e-codigo")) return;
      var dedo = t.closest(".dedo .pulso"); if (dedo) { dedo.classList.remove("latiendo"); return huellaYEntrar(dedo); }
      if (t.closest(".otras .btn") && $(".g", t.closest(".btn"))) return google(celu);
      if (t.closest(".otras .btn, .nuevo .link")) return camara(celu, { alGoogle: function () { google(celu); } });
      if (t.closest(".nuevo .g-btn, .sinp .g-btn")) return google(celu);
      if (t.closest(".oferta .huella-btn")) return lector(celu, { titulo: "Vinculá tu huella", texto: "Apoyá el dedo para usarlo en Ferrebress" });
      if (t.closest(".oferta .btn-fantasma")) return ir("vender");
      if (t.closest(".sinp .alta")) return codigoGrande(celu, "Mostrale esto a un Administrador", "Lo lee con su celular y te da de alta en un toque.");
    });
    $$(".sinp .alta").forEach(function (x) { x.setAttribute("data-e-toca", ""); });
  };

  // ---------- Celu 3 · Pantalla bloqueada ----------
  VARIANTES["celu-3"] = function () {
    var barra = '<div class="barra-estado"><span>8:47</span><span class="se"><i class="i i-s" data-i="wifi"></i></span></div>';
    function enLosDos(celu) { var i = $(".widget .interruptor", celu); return !i || !i.classList.contains("apagado"); }
    function listo(celu) {
      var dos = enLosDos(celu);
      cerrarTodas(celu);
      abrir('<img class="fondo" src="' + R + 'local-desenfocado.webp" alt="">' + barra +
        '<div class="listo"><span class="tilde e-crece"><i class="i" data-i="check"></i></span><h1>Adentro, Marta</h1><p>Se abre Vender en 1 segundo.</p>' +
        '<div class="equipos"><span class="e-entra"><i class="i i-s" data-i="circle-check"></i>Este celular</span>' +
        (dos ? '<span class="e-entra"><i class="i i-s" data-i="circle-check"></i>Compu · Caja 1</span>' : "") + "</div></div>" +
        '<span class="home-ind" style="background:#fff"></span>',
        { desde: celu, tipo: "pantalla", clase: "bloqueo" });
      vibrar([10, 40, 10]);
      setTimeout(function () { ir("vender"); }, dur(1000) || 300);
    }
    function leer(celu) {
      var cam = abrir(
        '<div class="cam"><div class="monitor"><div class="rayas"><i style="width:80%"></i><i style="width:60%"></i><i style="width:70%"></i><i style="width:40%"></i></div><div class="qr"><img src="' + R + 'qr.svg" alt=""></div></div>' +
        '<span class="mira"></span><div class="apunta">Apuntá al código de la compu</div>' +
        '<button class="redondo x" data-cerrar aria-label="Cerrar la cámara" style="border:0"><i class="i i-l" data-i="x"></i></button>' +
        '<button class="redondo linterna" aria-label="Linterna" style="border:0"><i class="i i-l" data-i="flashlight"></i></button>' +
        '<div class="chip-leido e-oculto"><span class="ic"><i class="i" data-i="check"></i></span><div><b>Compu del mostrador · Caja 1</b><span>Apoyá el dedo y entran las dos</span></div></div></div>' +
        '<span class="home-ind" style="background:#fff"></span>',
        { desde: celu, tipo: "pantalla", clase: "e-cam3" });
      cam.panel.style.background = "#0E1412";
      cam.timer(function () { var c = $(".chip-leido", cam.panel); c.classList.remove("e-oculto"); $(".apunta", cam.panel).textContent = "Código leído"; vibrar(10); }, dur(1200) || 50);
    }
    function sinPermiso(celu) {
      var w = $(".widget", celu), p = $(".pie-b", celu);
      if (w) w.style.display = "none"; if (p) p.style.display = "none";
      var no = $(".no", celu);
      if (!no) {
        no = el('<div class="no e-entra"><div class="t"><span class="ic"><i class="i" data-i="user-x"></i></span>Esta cuenta no puede entrar</div>' +
          '<span class="correo"><span class="g"></span>juanpablo.rios88@gmail.com</span>' +
          "<p>Nadie la autorizó todavía. Pedile el alta a un Administrador y volvé a entrar con esta cuenta.</p>" +
          '<button class="g-btn"><span class="g"></span>Probar con otra cuenta</button></div>');
        no.setAttribute("data-e-mio", "");
        $(".cab", celu).insertAdjacentElement("afterend", no);
      }
      setTimeout(function () { temblar(no); }, dur(200));
    }
    function restaurar(celu) {
      var no = $(".no[data-e-mio]", celu); if (!no) return;
      no.remove(); $(".widget", celu).style.display = ""; $(".pie-b", celu).style.display = "";
    }
    function google(celu) { elegirCuenta(celu, { directo: function (c) { return c.id !== "jp"; }, alElegir: function () { sinPermiso(celu); } }); }
    setTimeout(function () { $$(".sensor .pulso").forEach(function (p) { p.classList.add("latiendo"); p.setAttribute("data-e-toca", ""); }); }, dur(300));
    $$(".pie-b > div:not(.sensor), .listo, .widget .fila:last-child").forEach(function (x) { x.setAttribute("data-e-toca", ""); });
    document.addEventListener("click", function (e) {
      var t = e.target, celu = celuDe(t); if (!celu) return;
      if (t.closest(".e-velo") || t.closest(".e-elegir")) return;
      if (t.closest(".widget .fila:last-child")) { var i = $(".widget .interruptor", celu); i.classList.toggle("apagado"); return; }
      if (t.closest(".sensor")) { var p = $(".sensor .pulso", celu); p.classList.remove("latiendo"); tilde(p); return setTimeout(function () { listo(celu); }, dur(350)); }
      if (t.closest(".pie-b > div:first-child")) return leer(celu);
      if (t.closest(".pie-b > div:last-child")) return google(celu);
      if (t.closest(".no .g-btn")) return google(celu);
      if (t.closest(".cam .linterna")) { t.closest(".linterna").classList.toggle("e-prendida"); return; }
      if (t.closest(".cam .chip-leido")) return listo(celu);
      if (t.closest(".cam .x") && !capaDe(t)) { location.href = "index.html"; return; }
      if (t.closest(".listo") && !capaDe(t)) return ir("vender");
    });
    alEscape = function () { $$(".celu").forEach(restaurar); };
  };

  window.Entrar = {
    iniciar: function (v) {
      function correr() { pintar(document); if (VARIANTES[v]) VARIANTES[v](); document.documentElement.setAttribute("data-entrar", "listo"); }
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", correr); else correr();
    },
    abrir: abrir, tostada: tostada, ir: ir,
  };
})();

/* Listas de precios: diálogos (compu) u hojas (celu) que comparten las seis maquetas.
   Va después de interaccion.js y datos.js. Cada función abre la capa con Lx.abrir. */
(function () {
  var FOTOS = "../../../_comun/fotos/";
  function cab(titulo, sub) {
    return '<div class="lx-cab"><div class="t-seccion">' + titulo + (sub ? '<div class="t-detalle" style="margin-top:2px">' + sub + "</div>" : "") +
      '</div><button class="btn btn-icono chico btn-fantasma" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  }
  function r(ic, n, d, der, attrs) {
    return '<div class="lx-r"' + (attrs || "") + '><span class="ic"><i class="i" data-i="' + ic + '"></i></span><div style="min-width:0"><div class="n">' + n + '</div><div class="d">' + d + '</div></div><span class="der">' + (der || "") + "</span></div>";
  }
  function rf(f, n, d, der, attrs) {
    return '<div class="lx-r"' + (attrs || "") + '><div class="foto chica"><img src="' + FOTOS + f + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + n + '</div><div class="d">' + d + '</div></div><span class="der">' + (der || "") + "</span></div>";
  }
  function pas(txt, clase) { return '<span class="pastilla ' + (clase || "") + '" style="height:24px">' + txt + "</span>"; }
  function pie(botones) { return '<div class="lx-pie">' + (botones || '<button class="btn" data-cerrar>Cerrar</button>') + "</div>"; }

  var PROVS = [["Bulonera Centro", "Lista del 17/10 · por correo", "Para revisar", "urgente"], ["Ferretera del Sur", "Lista del 18/10 · de su portal", "Para revisar", "urgente"], ["Distribuidora Oeste", "Lista del 14/10 · por correo", "Al día", "logro"],
    ["Eléctrica Belgrano", "Lista del 10/10 · PDF por correo", "Al día", "logro"], ["Pinturas del Plata", "Lista del 08/09 · por correo", "Vieja · 41 días", "urgente"], ["Acindar Clavos", "Lista del 16/09 · de su portal", "Vieja · 33 días", "urgente"],
    ["Fischer Argentina", "Lista del 02/10 · de su portal", "Al día", "logro"], ["Bremen Herramientas", "Lista del 06/10 · por correo", "Al día", "logro"], ["Stanley Black & Decker", "Lista del 01/10 · de su portal", "Al día", "logro"],
    ["Ezeta Mechas", "Lista del 11/10 · por correo", "Al día", "logro"], ["Philips Iluminación", "Lista del 29/09 · por correo", "Al día", "logro"], ["Alba Pinturas", "Lista del 30/09 · de su portal", "Al día", "logro"],
    ["Tyrolit Abrasivos", "Lista del 25/09 · por correo", "Al día", "logro"], ["Bahco Argentina", "Lista del 03/10 · por correo", "Al día", "logro"]];
  var HISTORIAL = [["Distribuidora Oeste", "14/10", "Aplicada", "312 cambiados"], ["Eléctrica Belgrano", "10/10", "Descartada", "1.284 leídos"], ["Acindar Clavos", "16/09", "Aplicada", "188 cambiados"], ["Pinturas del Plata", "08/09", "Aplicada", "97 cambiados"]];

  function correoDe(nombre) { return nombre.toLowerCase().normalize("NFD").replace(/[^a-z]/g, ""); }
  function listaProvs(filtro) {
    return PROVS.filter(function (p) { return !filtro || p[0].toLowerCase().indexOf(filtro.toLowerCase()) >= 0; }).map(function (p) {
      return r("building-2", p[0], p[1], pas(p[2], p[3]), ' data-lx="ficha-prov" data-prov="' + p[0] + '"');
    }).join("") || '<div class="t-detalle" style="padding:16px">Ningún proveedor se llama así.</div>';
  }

  var D = {
    cab: cab, r: r, rf: rf, pas: pas, pie: pie, PROVS: PROVS, HISTORIAL: HISTORIAL, FOTOS: FOTOS,
    fichaProv: function (nombre) {
      var p = PROVS.filter(function (x) { return x[0] === nombre; })[0] || [nombre, "Sin listas todavía", "Nuevo", "contorno"];
      Lx.abrir(cab(nombre, p[1]) + '<div class="lx-lista">' + r("percent", "Descuento de línea", "Se resta del precio de lista", "25 %") + r("banknote", "Descuento de contado", "Se resta después del de línea", "5 %") +
        r("mail", "De dónde llegan las listas", "listas@" + correoDe(nombre) + ".com.ar") + r("history", "Última lista", p[1], pas(p[2], p[3])) + "</div>" +
        pie('<button class="btn btn-fantasma" data-cerrar>Cerrar</button><button class="btn" data-lx="pedir-lista" data-prov="' + nombre + '" data-cerrar><i class="i i-s" data-i="send"></i>Pedir la lista por correo</button>'));
    },
    buscarProv: function () {
      var d = Lx.abrir(cab("Proveedores", PROVS.length + " proveedores") + '<div class="lx-form" style="grid-template-columns:1fr;margin-bottom:12px"><label class="todo"><input placeholder="Buscá por nombre" aria-label="Buscar proveedor"></label></div><div class="lx-lista lx-provs">' + listaProvs("") + "</div>", { ancho: 600 });
      d.querySelector("input").addEventListener("input", function (e) { var c = d.querySelector(".lx-provs"); c.innerHTML = listaProvs(e.target.value); Lx.pintar(c); });
    },
    correo: function (l) {
      Lx.abrir(cab("Lista de precios " + (l.icono === "mail" ? "octubre" : "oct-2026"), "De " + l.prov + " · ventas@" + correoDe(l.prov) + ".com.ar") +
        '<div class="t-cuerpo" style="color:var(--texto-2)">Estimados:<br>Les adjuntamos la lista Nº 42, vigente desde el ' + l.fecha + ". Todos los precios son sin IVA. Recuerden el 6 % por pago de contado.<br><br>Saludos,<br>Marcela · " + l.prov + "</div>" +
        '<div class="lx-lista" style="margin-top:16px">' + r("file-spreadsheet", l.archivo, "Adjunto · 412 KB · se leyó solo", pas("Leído", "logro")) + "</div>" + pie());
    },
    portal: function (l) {
      Lx.abrir(cab("Portal de " + l.prov, "portal." + correoDe(l.prov) + ".com.ar · con el usuario de Ferrebress") + '<div class="lx-lista">' +
        r("globe", "Se bajó sola anoche 23:40", "El portal publica la lista los viernes", pas("Bien", "logro")) + r("history", "Próxima revisión", "Esta noche 23:30") + "</div>" + pie());
    },
    canales: function () {
      Lx.abrir(cab("Cómo llegan las listas", "Ferrebress las busca solo; acá ves si anda") + '<div class="lx-lista">' +
        r("mail", "Correo listas@ferrebress.com.ar", "Revisado hace 6 min · cada 15 min", pas("Bien", "logro")) + r("globe", "Portal de Ferretera del Sur", "Bajada anoche 23:40", pas("Bien", "logro")) +
        r("globe", "Portal de Acindar", "Bajada anoche 23:42 · sin lista nueva", pas("Bien", "logro")) + r("globe", "Portal de Alba", "Esta noche 23:50", pas("Esperando")) + "</div>" + pie());
    },
    cargaOeste: function () {
      Lx.abrir(cab("Distribuidora Oeste · lista del 14/10/2026", "Aplicada el 14/10 a las 11:02 por Carlos") + '<div class="lx-lista">' + r("tags", "312 precios cambiaron", "El costo subió 6,2 % en promedio") +
        r("package-plus", "2 nuevos", "Los dos con margen 100 %") + r("printer", "Etiquetas", "Impresas el 14/10", pas("Listo", "logro")) + "</div>" + pie());
    },
    historial: function () {
      Lx.abrir(cab("Últimas cargas", "Las listas de los últimos 60 días") + '<div class="lx-lista">' + HISTORIAL.map(function (h) {
        return r("file-spreadsheet", h[0], "Lista del " + h[1] + " · " + h[3], pas(h[2], h[2] === "Aplicada" ? "logro" : ""));
      }).join("") + "</div>" + pie());
    },
    // alElegir(nombreDelProveedor)
    adjunto: function (alElegir) {
      var d = Lx.abrir(cab("¿De quién es esta lista?", "precios-oct-2026.pdf · llegó el lunes desde info@pinturasdelplata.com.ar") +
        '<div class="aviso pino" style="margin-bottom:12px"><i class="i" data-i="sparkles"></i><span>Por el correo, parece de <b>Pinturas del Plata</b>. Se pregunta una sola vez: las próximas se reconocen solas.</span></div>' +
        '<div class="lx-lista">' + ["Pinturas del Plata", "Alba Pinturas", "Distribuidora Oeste"].map(function (p, i) {
          return '<div class="lx-r lx-tocable" data-de="' + p + '"><span class="ic"' + (i ? "" : ' style="background:var(--pino);color:#fff"') + '><i class="i" data-i="building-2"></i></span><div style="min-width:0"><div class="n">' + p + '</div><div class="d">' + (i ? "Otro proveedor" : "Sugerido por el correo") + '</div></div><span class="der"><i class="i i-s" data-i="chevron-right"></i></span></div>';
        }).join("") + "</div>" + pie('<button class="btn btn-fantasma" data-cerrar>Después</button><button class="btn" data-lx="agregar-prov" data-cerrar><i class="i i-s" data-i="building-2"></i>Es de un proveedor nuevo</button>'));
      d.addEventListener("click", function (e) {
        var o = e.target.closest("[data-de]"); if (!o) return;
        Lx.cerrar();
        alElegir(o.getAttribute("data-de"));
        Lx.tostada("Guardado: lo que llegue de info@pinturasdelplata.com.ar es de " + o.getAttribute("data-de"));
      });
    },
    // alGuardar(nombre)
    agregarProv: function (alGuardar) {
      var d = Lx.abrir(cab("Agregar proveedor", "Con esto, sus listas se reconocen solas") + '<div class="lx-form">' +
        '<label class="todo">Nombre<input value="Herrajes Avellaneda"></label><label class="todo">Correo del que mandan las listas<input value="listas@herrajesavellaneda.com.ar"></label>' +
        '<label>Descuento de línea<input value="20 %"></label><label>Descuento de contado<input value="5 %"></label></div>' +
        pie('<button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion lx-guardar">Guardar proveedor</button>'));
      d.querySelector(".lx-guardar").addEventListener("click", function () {
        var nombre = d.querySelector("input").value || "Proveedor nuevo";
        Lx.cerrar();
        PROVS.unshift([nombre, "Sin listas todavía", "Nuevo", "contorno"]);
        if (alGuardar) alGuardar(nombre);
        Lx.tostada(nombre + " quedó en Proveedores", { icono: "building-2" });
      });
    },
    // Los nuevos de una lista, con sus márgenes. margenes: {nombre: margen}; alCambiar() al elegir.
    margenes: function (l, margenes, alCerrar) {
      var celu = Lx.celu;
      var h = cab("Ponerles precio a los nuevos", celu ? "Elegí el margen de cada uno" : "Elegí el margen: el precio sale del costo, con IVA y redondeado a $1.000") + '<div class="lx-lista">' + l.filas.nuevos.map(function (n, i) {
        var m = margenes[n.n];
        var seg = '<span class="segmentos"' + (celu ? ' style="grid-column:1 / -1;display:grid;grid-template-columns:repeat(5,1fr)"' : "") + ">" + [300, 200, 100, 50, 25].map(function (v) {
          return '<button data-m="' + v + '"' + (m === v ? ' class="elegido"' : "") + ' style="min-height:' + (celu ? 40 : 32) + 'px;padding:0 8px">' + v + "</button>";
        }).join("") + "</span>";
        var precio = '<span class="der' + (m == null ? " sinprecio" : "") + '"' + (m == null ? ' style="color:var(--urgente-texto)"' : "") + ">" + (m == null ? "Sin precio" : Lx.pesos(Lx.precio(n.c, m))) + "</span>";
        return '<div class="lx-r" style="grid-template-columns:40px minmax(0,1fr) ' + (celu ? "auto" : "auto 80px") + ';row-gap:10px" data-nuevo="' + i + '"><div class="foto chica"><img src="' + FOTOS + n.f + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + n.n + '</div><div class="d">' + n.d.split(" · ")[0] + " · costo " + Lx.pesos(n.c) +
          "</div></div>" + (celu ? precio + seg : seg + precio) + "</div>";
      }).join("") + "</div>" + pie('<button class="btn btn-accion' + (celu ? " grande" : "") + '" data-cerrar>Listo</button>');
      var d = Lx.abrir(h, { ancho: 700, alCerrar: alCerrar });
      d.addEventListener("click", function (e) {
        var b = e.target.closest("[data-m]"); if (!b) return;
        var fila = b.closest("[data-nuevo]"), n = l.filas.nuevos[fila.getAttribute("data-nuevo")], v = Number(b.getAttribute("data-m"));
        margenes[n.n] = v;
        fila.querySelectorAll("[data-m]").forEach(function (x) { x.classList.toggle("elegido", x === b); });
        var p = fila.querySelector(".der"); p.textContent = Lx.pesos(Lx.precio(n.c, v)); p.classList.remove("sinprecio"); p.style.color = ""; Lx.reanimar(p, "lx-entra");
        Lx.vibrar(10);
      });
      return d;
    },
    // Cargar una lista: zona para soltar (compu) o elegir el archivo (celu). Lee y llama a alTerminar().
    cargar: function (alTerminar) {
      var celu = Lx.celu;
      var cuerpo = celu
        ? '<div class="t-detalle" style="margin:0 4px 8px">En Descargas</div><div class="lx-lista">' +
          r("file-spreadsheet", "herrajes-avellaneda-oct.xlsx", "Hoy 10:31 · 386 KB", '<i class="i i-s" data-i="chevron-right"></i>', ' data-archivo="1" style="cursor:pointer"') +
          r("file-text", "lista-electrica-belgrano.pdf", "10/10 · 1,2 MB", '<i class="i i-s" data-i="chevron-right"></i>', ' data-archivo="1" style="cursor:pointer"') + "</div>"
        : '<div class="lx-soltar" data-archivo="1"><span class="ico"><i class="i i-l" data-i="file-up"></i></span><b style="font-size:16px">Soltá el Excel o el PDF acá</b><span class="t-detalle">o tocá para elegirlo · herrajes-avellaneda-oct.xlsx</span></div>';
      var d = Lx.abrir(cab("Cargar una lista", "Se reconoce el proveedor y la fecha solos") + '<div class="lx-carga">' + cuerpo + "</div>" + pie('<button class="btn btn-fantasma" data-cerrar>Cancelar</button>'), { ancho: 520 });
      var leyendo = false;
      function leer() {
        if (leyendo) return;
        leyendo = true;
        var c = d.querySelector(".lx-carga");
        c.innerHTML = '<div class="lx-soltar" style="cursor:default"><span class="ico"><i class="i i-l" data-i="file-spreadsheet"></i></span><div class="lx-leyendo"><b>herrajes-avellaneda-oct.xlsx</b><span class="lx-txt t-detalle">Leyendo… 0 de 1.842</span><div class="barra"><b></b></div></div></div>';
        Lx.pintar(c);
        var txt = c.querySelector(".lx-txt"), barra = c.querySelector(".barra > b");
        Lx.avanzar(1842, 1600, function (v, f) { txt.textContent = "Leyendo… " + Lx.miles(v) + " de 1.842"; barra.style.transform = "scaleX(" + f + ")"; }, function () {
          txt.textContent = "Buscando cada producto en el catálogo…";
          setTimeout(function () { Lx.cerrar(); alTerminar(); }, 500);
        });
      }
      d.addEventListener("click", function (e) { if (e.target.closest("[data-archivo]")) leer(); });
      var z = d.querySelector(".lx-soltar");
      if (z) {
        z.addEventListener("dragover", function (e) { e.preventDefault(); z.classList.add("arrastrando"); });
        z.addEventListener("dragleave", function () { z.classList.remove("arrastrando"); });
        z.addEventListener("drop", function (e) { e.preventDefault(); e.stopPropagation(); leer(); });
      }
      return d;
    },
    // Lista de filas de un tipo (subas, ya no están…) en un diálogo o una hoja.
    filas: function (titulo, sub, filas, total) {
      var h = cab(titulo, sub) + '<div class="lx-lista">' + filas.map(function (f) {
        var der;
        if (f.t === "noesta") der = pas(f.que.replace("Sigue con Distribuidora Oeste", "Sigue"), f.clase);
        else if (f.t === "nuevo") der = pas("Sin precio", "urgente");
        else if (f.m == null) der = pas("Sin precio", "urgente");
        else { var pa = Lx.precio(f.a, f.m), pn = Lx.precio(f.c, f.m); der = pa === pn ? Lx.pesos(pn) : "<s>" + Lx.pesos(pa) + "</s>" + Lx.pesos(pn); }
        var det = f.t === "noesta" ? f.d.split(" · ")[0] + " · costo " + Lx.pesos(f.a) : f.t === "nuevo" ? f.d.split(" · ")[0] + " · costo " + Lx.pesos(f.c) : f.d.split(" · ")[0] + " · costo " + Lx.pct((f.c - f.a) / f.a * 100);
        return rf(f.f, f.n, det, der);
      }).join("") + (total > filas.length ? '<div class="lx-r"><span class="ic"><i class="i" data-i="ellipsis"></i></span><div class="n">Y ' + (total - filas.length) + ' más</div><span></span></div>' : "") + "</div>" + pie();
      Lx.abrir(h, { ancho: 620 });
    }
  };

  Lx.on({
    "ficha-prov": function (el) { var n = el.getAttribute("data-prov"); Lx.cerrarTodo(); setTimeout(function () { D.fichaProv(n); }, 60); },
    "pedir-lista": function (el) { Lx.tostada("Le escribimos a " + el.getAttribute("data-prov") + " para pedir la lista nueva", { icono: "send" }); },
    "buscar-prov": D.buscarProv,
    historial: D.historial,
    "carga-oeste": D.cargaOeste,
    canales: D.canales
  });
  window.Dlg = D;
})();

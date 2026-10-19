/* Celu 3 · Remarcar caminando: lo que pasa al tocar. Datos en ../../_propio/datos.js. */
(function () {
  var FOTOS = Dlg.FOTOS;
  var pila = document.getElementById("lx-pila");
  var pasillos = document.getElementById("lx-pasillos");
  var top = document.querySelector(".top .t b");
  var TOTAL = 641;
  // La maqueta arranca con el pasillo A listo y 11 de 188 en el B: faltan 428.
  var est = { faltan: 428, hechosB: 11, ocupado: false };

  // Las tarjetas que siguen, en el orden de los pasillos (la primera es la que ya se ve).
  var cola = DATOS.remarcar.map(function (r) { return { f: r[0], n: r[1], d: r[2], u: r[3], antes: r[4], ahora: r[5], pc: r[6], stock: r[7] }; });
  var MARGEN = { "Tarugos nylon S8 con tope × 100": 100, "Llave combinada 10 mm": 50 };
  // Si la pila se termina, se repite con estanterías que siguen (es una maqueta).
  var vuelta = 0;
  function rellenar() {
    if (cola.length > 2) return;
    vuelta++;
    DATOS.remarcar.forEach(function (r, i) {
      var est2 = Number(r[3].split("-")[1]) + vuelta * 2, est3 = (Number(r[3].split("-")[2]) + i) % 20 + 1;
      cola.push({ f: r[0], n: r[1], d: r[2], u: "B-" + String(Math.min(est2, 12)).padStart(2, "0") + "-" + String(est3).padStart(2, "0"), antes: r[4], ahora: r[5], pc: r[6], stock: r[7] });
    });
  }

  function cartaHTML(r, sig) {
    return '<div class="lugar"><span class="pastilla pino"><i class="i i-s" data-i="map-pin"></i>Est. ' + r.u + '</span><span class="cuenta">' + (sig ? "la que sigue: " + sig.u : "") + "</span></div>" +
      '<div class="foto-g"><img src="' + FOTOS + r.f + '.webp" alt=""></div><div class="nom">' + r.n + '</div><div class="det">' + r.d + " · margen " + (MARGEN[r.n] || 100) + " %</div>" +
      '<div class="hechos"><span class="pastilla">Costo ' + r.pc + '</span><span class="pastilla logro">Stock ' + r.stock + " un.</span></div>" +
      '<div class="precio"><div class="antes">Decía<s>' + Lx.pesos(r.antes) + '</s></div><div class="nuevo"><div class="et">Ahora</div><div class="v num"><span class="peso">$</span>' + Lx.miles(r.ahora) + "</div></div></div>";
  }
  function frente() { return pila.querySelector(".carta:not(.atras)"); }
  function atras() { return pila.querySelector(".carta.atras"); }

  // Saca la tarjeta del frente (como: "va" arriba a la derecha, "fondo" a la izquierda) y sube la de atrás.
  function pasar(como, alTerminar) {
    if (est.ocupado) return;
    est.ocupado = true;
    var f = frente(), a = atras();
    var actual = cola.shift();
    if (como === "fondo") cola.push(actual);
    rellenar();
    f.style.transform = "";
    f.classList.remove("lx-vuelve");
    f.classList.add(como === "va" ? "lx-va" : "lx-al-fondo");
    a.innerHTML = cartaHTML(cola[0], cola[1]);
    Lx.pintar(a);
    a.classList.add("lx-sube");
    setTimeout(function () {
      f.remove();
      a.classList.remove("atras", "lx-sube");
      var n = document.createElement("div");
      n.className = "carta atras";
      pila.insertBefore(n, a);
      conectarArrastre(a);
      est.ocupado = false;
      if (alTerminar) alTerminar();
    }, 380);
  }

  function avanzarPasillo() {
    est.faltan--; est.hechosB++;
    top.textContent = "Faltan " + Lx.miles(est.faltan) + " de " + Lx.miles(TOTAL);
    Lx.reanimar(top, "lx-entra");
    var b = pasillos.querySelectorAll(".pas")[1];
    var em = b.querySelector("em"), barra = b.querySelector(".barra > b");
    em.textContent = est.hechosB + "/188";
    barra.style.width = "100%";
    barra.style.transformOrigin = "left";
    barra.style.transform = "scaleX(" + (est.hechosB / 188) + ")";
    if (est.hechosB >= 188) {
      b.classList.remove("ahora"); b.classList.add("listo");
      b.querySelector("span").innerHTML = 'B <i class="i i-s" data-i="check"></i>'; Lx.pintar(b);
    }
  }

  function remarcado() {
    if (est.ocupado) return;
    Lx.vibrar(10);
    pasar("va", avanzarPasillo);
  }
  function dejarParaDespues() {
    if (est.ocupado) return;
    pasar("fondo");
    Lx.tostada("Lo dejaste para después: vuelve al final de la pila", { icono: "skip-forward" });
  }

  // Deslizar la tarjeta a la izquierda la deja para después.
  function conectarArrastre(c) {
    var x0 = null, dx = 0;
    c.addEventListener("pointerdown", function (e) { if (est.ocupado) return; x0 = e.clientX; dx = 0; c.classList.remove("lx-vuelve"); c.setPointerCapture(e.pointerId); });
    c.addEventListener("pointermove", function (e) {
      if (x0 == null) return;
      dx = Math.min(40, e.clientX - x0);
      c.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 40) + "deg)";
    });
    function soltar() {
      if (x0 == null) return;
      x0 = null;
      if (dx < -90) { dejarParaDespues(); return; }
      c.classList.add("lx-vuelve"); c.style.transform = "";
    }
    c.addEventListener("pointerup", soltar);
    c.addEventListener("pointercancel", soltar);
  }

  // La cámara para confirmar la etiqueta: se simula con la foto y una línea que barre.
  function escanear() {
    if (est.ocupado || document.querySelector(".lx-camara")) return;
    var r = cola[0];
    var cam = document.createElement("div");
    cam.className = "lx-camara";
    cam.setAttribute("role", "dialog");
    cam.innerHTML = '<div class="arr"><button class="btn btn-icono" data-cam="cerrar" aria-label="Cerrar la cámara"><i class="i" data-i="x"></i></button>Escaneá la etiqueta de la estantería</div>' +
      '<div class="vista"><img src="' + FOTOS + r.f + '.webp" alt=""><span class="marco-esc"></span><span class="linea"></span></div><div class="abj">Est. ' + r.u + " · " + r.n + "</div>";
    document.body.appendChild(cam);
    Lx.pintar(cam);
    requestAnimationFrame(function () { requestAnimationFrame(function () { cam.classList.add("abierto"); }); });
    function cerrar() { document.removeEventListener("keydown", tecla, true); cam.classList.remove("abierto"); setTimeout(function () { cam.remove(); }, 220); clearTimeout(t); }
    function tecla(e) { if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } }
    document.addEventListener("keydown", tecla, true);
    cam.addEventListener("click", function (e) { if (e.target.closest('[data-cam="cerrar"]') || e.target === cam) cerrar(); });
    var t = setTimeout(function () {
      cam.querySelector(".abj").innerHTML = '<span class="pastilla logro" style="height:36px;font-size:16px"><i class="i i-s" data-i="check"></i>Es la etiqueta correcta</span>';
      Lx.pintar(cam);
      Lx.vibrar([10, 40, 10]);
      t = setTimeout(function () { cerrar(); remarcado(); }, 800);
    }, 1500);
  }

  Lx.on({
    remarcado: remarcado,
    escanear: escanear,
    "imprimir-una": function () { var r = cola[0]; Lx.tostada("Imprimiendo la etiqueta: " + r.n.split(" ").slice(0, 3).join(" ") + " · " + Lx.pesos(r.ahora), { icono: "printer" }); },
    "imprimir-varias": function () {
      Lx.abrir('<div class="t-seccion" style="padding:0 4px 4px">Imprimir etiquetas</div><p class="t-detalle" style="margin:0 4px 8px">En la impresora del mostrador, en el orden de los pasillos.</p>' +
        '<a class="lx-op" data-imp="Las ' + Lx.miles(est.faltan) + ' que faltan" data-cerrar><i class="i i-l" data-i="printer"></i>Las que faltan<small>' + Lx.miles(est.faltan) + "</small></a>" +
        '<a class="lx-op" data-imp="Las ' + (188 - est.hechosB) + ' del pasillo B" data-cerrar><i class="i i-l" data-i="map-pin"></i>Solo el pasillo B<small>' + (188 - est.hechosB) + "</small></a>" +
        '<a class="lx-op" data-imp="La de esta tarjeta" data-cerrar><i class="i i-l" data-i="tag"></i>Solo esta<small>1</small></a>', { tipo: "hoja" })
        .addEventListener("click", function (e) { var o = e.target.closest("[data-imp]"); if (o) Lx.tostada(o.getAttribute("data-imp") + ": a la impresora del mostrador", { icono: "printer" }); });
    },
    salir: function () {
      Lx.abrir('<div class="t-seccion" style="padding:0 4px 4px">¿Dejás de remarcar?</div><p class="t-cuerpo" style="margin:0 4px 16px;color:var(--texto-2)">Faltan ' + Lx.miles(est.faltan) + ". Queda guardado dónde ibas: seguís desde Listas cuando quieras.</p>" +
        '<div class="lx-pie"><button class="btn btn-fantasma" data-ir="productos">Salir</button><button class="btn btn-accion grande" data-cerrar>Seguir remarcando</button></div>', { tipo: "hoja" });
    }
  });

  // Tocar un pasillo dice cuánto falta en él.
  pasillos.addEventListener("click", function (e) {
    var p = e.target.closest(".pas"); if (!p) return;
    var i = Array.prototype.indexOf.call(pasillos.children, p), letra = "ABCDE"[i], tot = [202, 188, 141, 77, 33][i];
    var txt = i === 0 ? "Pasillo A: listo, los 202" : i === 1 ? "Pasillo B: " + est.hechosB + " de 188, estás acá" : "Pasillo " + letra + ": " + tot + " para después del B";
    Lx.tostada(txt, { icono: "map-pin" });
  });
  pasillos.querySelectorAll(".pas").forEach(function (p) { p.style.cursor = "pointer"; });

  document.addEventListener("keydown", function (e) {
    if (Lx.abiertos() || document.querySelector(".lx-camara")) return;
    if (e.key === "Enter") { e.preventDefault(); remarcado(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); dejarParaDespues(); }
    if (e.key === "Escape") { e.preventDefault(); document.querySelector('[data-lx="salir"]').click(); }
  });

  conectarArrastre(frente());
})();

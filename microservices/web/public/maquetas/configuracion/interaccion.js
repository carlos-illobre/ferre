// Piezas de interacción de las maquetas de Configuración (sin librerías). Cada variante las usa
// desde su script al pie: window.CF. Quieta, la maqueta se ve igual; todo el movimiento es
// transform y opacity, y con «reducir movimiento» o Animaciones apagadas no se mueve nada.
(function () {
  var CF = {};
  var pila = [];

  CF.quieto = function () {
    return document.body.classList.contains('sin-animaciones') ||
      (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  };
  CF.ms = function (n) { return CF.quieto() ? 0 : n; };
  CF.luego = function (n, fn) { return setTimeout(fn, CF.ms(n)); };
  CF.vibrar = function (p) { try { if (navigator.vibrate && !CF.quieto()) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };
  CF.raiz = function () { return document.querySelector('.celu') || document.body; };
  CF.esCelu = function () { return !!document.querySelector('.celu'); };
  CF.pintar = function (el) { if (window.pintarIconos) window.pintarIconos(el); };
  CF.reflow = function (el) { return el.offsetWidth; };

  // ---- Llaves ---------------------------------------------------------------------------------
  CF.prepararLlaves = function (root) {
    (root || document).querySelectorAll('.llave').forEach(function (l) {
      l.setAttribute('role', 'switch');
      l.setAttribute('tabindex', '0');
      l.setAttribute('aria-checked', l.classList.contains('si') ? 'true' : 'false');
    });
  };
  CF.llave = function (l, valor) {
    var si = valor === undefined ? !l.classList.contains('si') : !!valor;
    l.classList.toggle('si', si);
    l.setAttribute('aria-checked', si ? 'true' : 'false');
    return si;
  };
  CF.alTocar = function (el, fn) {
    if (!el) return;
    el.addEventListener('click', function (e) { fn(e); });
    el.addEventListener('keydown', function (e) {
      if ((e.key === ' ' || e.key === 'Enter') && !/^(BUTTON|A|INPUT)$/.test(el.tagName)) { e.preventDefault(); fn(e); }
    });
  };

  // ---- Texto que cambia con fundido -----------------------------------------------------------
  CF.fundir = function (el, fn) {
    if (!el) return;
    if (CF.quieto()) { fn(); return; }
    el.classList.add('cf-fundido', 'fuera');
    setTimeout(function () { fn(); CF.reflow(el); el.classList.remove('fuera'); }, 100);
  };
  CF.texto = function (el, html) { CF.fundir(el, function () { el.innerHTML = html; CF.pintar(el); }); };

  CF.rodar = function (el, html, sube) {
    if (!el) return;
    el.innerHTML = html;
    CF.pintar(el);
    if (CF.quieto()) return;
    el.classList.remove('cf-rueda-arriba', 'cf-rueda-abajo');
    CF.reflow(el);
    el.classList.add(sube ? 'cf-rueda-arriba' : 'cf-rueda-abajo');
  };

  // Número que corre de un valor a otro (pasos de texto), y rueda al terminar
  CF.contar = function (el, pasos, ms, fin) {
    if (CF.quieto() || !pasos.length) { if (pasos.length) el.innerHTML = pasos[pasos.length - 1]; if (fin) fin(); return; }
    var i = 0, cada = ms / pasos.length;
    var t = setInterval(function () {
      el.innerHTML = pasos[i++];
      if (i >= pasos.length) { clearInterval(t); if (fin) fin(); }
    }, cada);
  };

  // ---- Plegar / desplegar hacia arriba --------------------------------------------------------
  CF.plegar = function (els, fin) {
    els = [].concat(els).filter(Boolean);
    els.forEach(function (el) { el.classList.remove('cf-despliega'); el.classList.add('cf-plegando'); });
    CF.luego(200, function () {
      els.forEach(function (el) { el.hidden = true; el.classList.remove('cf-plegando'); });
      if (fin) fin();
    });
  };
  CF.desplegar = function (els) {
    [].concat(els).filter(Boolean).forEach(function (el) {
      el.hidden = false;
      if (CF.quieto()) return;
      el.classList.remove('cf-despliega'); CF.reflow(el); el.classList.add('cf-despliega');
    });
  };
  CF.entrar = function (el) {
    if (!el || CF.quieto()) return;
    el.classList.remove('cf-entra'); CF.reflow(el); el.classList.add('cf-entra');
  };
  // Un renglón que se va: se achica hacia arriba y desaparece
  CF.colapsar = function (el, fin) {
    el.classList.add('cf-colapsa');
    CF.luego(200, function () { el.hidden = true; el.classList.remove('cf-colapsa'); if (fin) fin(); });
  };

  // ---- Barra que se llena o se vacía (solo scaleX) -------------------------------------------
  CF.barra = function (b, desde, hasta, ms) {
    if (!b) return;
    if (CF.quieto()) { b.style.width = hasta + '%'; b.style.transform = ''; return; }
    b.style.transition = 'none';
    if (hasta >= desde) {
      b.style.width = hasta + '%';
      b.style.transform = 'scaleX(' + (desde / hasta) + ')';
      CF.reflow(b);
      b.style.transition = 'transform ' + ms + 'ms var(--curva)';
      b.style.transform = 'scaleX(1)';
    } else {
      b.style.width = desde + '%';
      b.style.transform = 'scaleX(1)';
      CF.reflow(b);
      b.style.transition = 'transform ' + ms + 'ms var(--curva)';
      b.style.transform = 'scaleX(' + (hasta / desde) + ')';
      setTimeout(function () { b.style.transition = 'none'; b.style.width = hasta + '%'; b.style.transform = ''; }, ms);
    }
  };

  // ---- Los cuatro botones con el segmento que se desliza --------------------------------------
  CF.cuatro = function (cont, alElegir) {
    if (!cont) return;
    var bs = [].slice.call(cont.children).filter(function (b) { return b.tagName === 'B'; });
    bs.forEach(function (b, i) {
      b.setAttribute('role', 'button'); b.setAttribute('tabindex', '0');
      CF.alTocar(b, function (e) { e.stopPropagation(); CF.elegirCuatro(cont, i); if (alElegir) alElegir(b.textContent.trim(), i); });
    });
  };
  CF.elegirCuatro = function (cont, i) {
    var bs = [].slice.call(cont.children).filter(function (b) { return b.tagName === 'B'; });
    var viejo = cont.querySelector('b.elegido'), nuevo = bs[i];
    if (!nuevo || viejo === nuevo) return;
    if (!viejo || CF.quieto()) { if (viejo) viejo.classList.remove('elegido'); nuevo.classList.add('elegido'); return; }
    var seg = document.createElement('span');
    seg.className = 'cf-segmento';
    seg.style.left = viejo.offsetLeft + 'px'; seg.style.top = viejo.offsetTop + 'px';
    seg.style.width = viejo.offsetWidth + 'px'; seg.style.height = viejo.offsetHeight + 'px';
    cont.appendChild(seg);
    cont.classList.add('moviendo');
    viejo.classList.remove('elegido'); nuevo.classList.add('elegido');
    CF.reflow(seg);
    seg.style.transform = 'translateX(' + (nuevo.offsetLeft - viejo.offsetLeft) + 'px)';
    setTimeout(function () { cont.classList.remove('moviendo'); seg.remove(); }, 200);
  };
  CF.cuatroHtml = function (elegido) {
    return ['5 min', '15 min', '1 hora', '24 horas'].map(function (t) {
      return '<b' + (t === elegido ? ' class="elegido"' : '') + '>' + t + '</b>';
    }).join('');
  };

  // ---- Capas: hoja, diálogo, menú ------------------------------------------------------------
  // CF.abrir({ html, tipo: 'hoja' | 'dialogo' | 'menu', ancla, etiqueta, alCerrar })
  CF.abrir = function (op) {
    var tipo = op.tipo || (CF.esCelu() ? 'hoja' : 'dialogo');
    var capa = document.createElement('div');
    capa.className = 'cf-capa cf-' + tipo;
    capa.innerHTML = '<div class="cf-velo"></div><div class="cf-panel" role="dialog" aria-modal="true" tabindex="-1"></div>';
    var panel = capa.querySelector('.cf-panel');
    if (op.etiqueta) panel.setAttribute('aria-label', op.etiqueta);
    panel.innerHTML = op.html;
    CF.pintar(panel);
    CF.prepararLlaves(panel);
    (op.dentro || CF.raiz()).appendChild(capa);
    if (tipo === 'menu' && op.ancla) {
      var r = op.ancla.getBoundingClientRect();
      panel.style.left = Math.max(8, r.left) + 'px';
      panel.style.bottom = (window.innerHeight - r.top + 8) + 'px';
    }
    var previo = document.activeElement;
    var h = {
      el: panel, capa: capa,
      cerrar: function (motivo) {
        if (h.cerrada) return; h.cerrada = true;
        pila.splice(pila.indexOf(h), 1);
        capa.classList.add('cerrando'); capa.classList.remove('abierta');
        setTimeout(function () { capa.remove(); }, CF.ms(tipo === 'hoja' ? 320 : 200));
        if (previo && previo.focus) try { previo.focus({ preventScroll: true }); } catch (e) { /* nada */ }
        if (op.alCerrar) op.alCerrar(motivo);
      },
      cambiar: function (html) {
        CF.fundir(panel, function () { panel.innerHTML = html; CF.pintar(panel); CF.prepararLlaves(panel); if (op.alCambiar) op.alCambiar(h); });
      }
    };
    capa.querySelector('.cf-velo').addEventListener('click', function () { h.cerrar('afuera'); });
    panel.addEventListener('click', function (e) {
      var x = e.target.closest('[data-cerrar]');
      if (x && panel.contains(x)) h.cerrar(x.getAttribute('data-cerrar') || 'boton');
    });
    pila.push(h);
    CF.reflow(capa);
    capa.classList.add('abierta');
    try { panel.focus({ preventScroll: true }); } catch (e) { /* nada */ }
    return h;
  };
  CF.abiertas = function () { return pila.length; };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); pila[pila.length - 1].cerrar('escape'); }
  }, true);

  CF.cab = function (titulo) {
    return '<div class="cf-cab"><div class="cf-tt">' + titulo + '</div><button class="btn btn-suave cf-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  };

  // Pregunta antes de algo que no se deshace solo: CF.confirmar({ titulo, texto, extra, si, peligro, alSi })
  CF.confirmar = function (op) {
    var celu = CF.esCelu();
    var botonSi = '<button class="btn ' + (op.peligro ? 'btn-peligro' : 'btn-accion') + (celu ? ' grande' : '') + '" data-si>' + op.si + '</button>';
    var botonNo = '<button class="btn btn-fantasma' + (celu ? ' grande' : '') + '" data-cerrar>Cancelar</button>';
    var h = CF.abrir({
      etiqueta: op.titulo,
      html: CF.cab(op.titulo) + '<p class="cf-texto">' + op.texto + '</p>' + (op.extra || '') +
        '<div class="cf-botones">' + (celu ? botonSi + botonNo : botonNo + botonSi) + '</div>',
      alCerrar: function (m) { if (m !== 'si' && op.alNo) op.alNo(); }
    });
    h.el.querySelector('[data-si]').addEventListener('click', function () { h.cerrar('si'); op.alSi(); });
    return h;
  };

  // ---- Tostada --------------------------------------------------------------------------------
  CF.tostada = function (texto, op) {
    op = op || {};
    var raiz = CF.raiz();
    var cont = raiz.querySelector(':scope > .cf-tostadas');
    if (!cont) { cont = document.createElement('div'); cont.className = 'cf-tostadas'; raiz.appendChild(cont); }
    cont.innerHTML = '';
    var t = document.createElement('div');
    t.className = 'tostada'; t.setAttribute('role', 'status');
    t.innerHTML = (op.tilde ? '<svg class="i cf-tilde" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>' : '<i class="i" data-i="' + (op.icono || 'check') + '"></i>') +
      '<span>' + texto + '</span>' + (op.deshacer ? '<button class="cf-deshacer">Deshacer</button>' : '');
    CF.pintar(t);
    cont.appendChild(t);
    function irse() { t.classList.add('sale'); setTimeout(function () { t.remove(); }, CF.ms(200)); }
    var reloj = setTimeout(irse, op.dura || 4000);
    if (op.deshacer) t.querySelector('.cf-deshacer').addEventListener('click', function () { clearTimeout(reloj); irse(); op.deshacer(); });
    return t;
  };

  // ---- Más: la lista de la quinta parte (Anomalías, Procesos, Mejoras y errores, Configuración) --
  CF.abrirMas = function () {
    var filas = [
      ['anomalias', 'triangle-alert', 'urgente', 'Anomalías', '3 para mirar'],
      ['procesos', 'workflow', '', 'Procesos', 'Lo que corre solo'],
      ['mejoras-y-errores', 'bug', '', 'Mejoras y errores', 'Lo que pediste y su estado'],
      ['configuracion', 'settings', '', 'Configuración', 'Este celular y tu cuenta']
    ];
    var h = CF.abrir({
      tipo: 'hoja', etiqueta: 'Más',
      html: CF.cab('Más') + '<div class="cf-lista">' + filas.map(function (f) {
        return '<div class="cf-renglon' + (f[0] === 'configuracion' ? ' elegido' : '') + '" data-ir="' + f[0] + '"><span class="ico ' + f[2] + '"><i class="i" data-i="' + f[1] + '"></i></span><div><div class="tt">' + f[3] + '</div><div class="dd">' + f[4] + '</div></div><i class="i ch" data-i="chevron-right"></i></div>';
      }).join('') + '</div>'
    });
    // Configuración es esta misma pantalla: cierra la hoja en lugar de navegar
    var aca = h.el.querySelector('[data-ir="configuracion"]');
    aca.addEventListener('click', function (e) { e.stopPropagation(); h.cerrar('aca'); });
    return h;
  };

  // Lo que lleva a esta misma pantalla no navega (navegar.js escucha en document)
  CF.noSalir = function (el, fn) {
    if (el) el.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); if (fn) fn(); });
  };


  // ---- El vínculo con la computadora ---------------------------------------------------------
  // Botón de la cabecera del celular: verde «En espejo», gris «Desconectado», contorno «Vincular»
  CF.botonVinculo = function (btn, estado) {
    if (!btn) return;
    var t = { espejo: ['monitor', 'En espejo', ''],
      desconectado: ['monitor', 'Desconectado', 'border-color:var(--borde-fuerte);background:var(--hundido);color:var(--texto-2)'],
      vincular: ['qr-code', 'Vincular', 'border-color:var(--borde-fuerte);background:var(--superficie);color:var(--tinta)'] }[estado];
    CF.fundir(btn, function () {
      btn.innerHTML = '<i class="i i-s" data-i="' + t[0] + '"></i>' + t[1];
      btn.setAttribute('style', t[2]);
      CF.pintar(btn);
    });
  };
  // Escanear el código de la computadora: la cámara se simula con un recuadro y una línea que barre
  CF.escanearVinculo = function (alListo) {
    var celu = CF.esCelu();
    var h = CF.abrir({
      etiqueta: 'Vincular con la computadora',
      html: CF.cab(celu ? 'Escaneá el código de la computadora' : 'Escaneá este código con el celular') +
        (celu ? '<div class="cf-camara"><span class="cf-mira"></span><span class="cf-barre"></span></div><p class="cf-texto">Está en la computadora, abajo del menú: «Vincular celular».</p>'
              : '<div class="cf-qr"><i class="i i-xl" data-i="qr-code"></i></div><p class="cf-texto">Abrí Ferrebress en el celular y tocá «Vincular». Este código cambia cada minuto.</p>') +
        '<div class="cf-botones"><button class="btn btn-fantasma" data-cerrar>Cancelar</button></div>'
    });
    var reloj = setTimeout(function () { if (!h.cerrada) { h.cerrar('listo'); CF.vibrar([10, 40, 10]); alListo(); } }, 1800);
    var cerrar = h.cerrar; h.cerrar = function (m) { clearTimeout(reloj); cerrar(m); };
    return h;
  };

  window.CF = CF;
})();

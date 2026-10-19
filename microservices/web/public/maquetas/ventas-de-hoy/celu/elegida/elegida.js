/* «Ventas de hoy», celular elegido: lo que cambia sobre ../../interacciones.js, sin tocarlo.
   - Anular: el motivo es una lista desplegable («Sin motivo» y cinco) más un comentario opcional.
   - Otro día: sus ventas también se anulan, con el permiso «Anular ventas de cualquier día».
   Se carga después de interacciones.js y reemplaza VH.confirmarAnular y VH.otroDia. */
(function () {
  'use strict';
  var VH = window.VH;

  VH.MOTIVOS = ['Sin motivo', 'Se arrepintió', 'Error al cobrar', 'Producto equivocado', 'Devolución', 'Cobrada dos veces'];
  var ICO_MOTIVO = ['circle-help', 'undo-2', 'calculator', 'package', 'arrow-left-right', 'copy'];
  // En la maqueta, quien la usa tiene el permiso (Mariela, encargada).
  VH.permisoOtroDia = true;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function diaDe() { return VH.DIAS.filter(function (y) { return y[0] === VH.diaActual; })[0]; }

  VH.confirmarAnular = function (v, alConfirmar) {
    var t = VH.total(v), m = VH.MEDIOS[v.medio].nom, otro = VH.diaActual !== 'hoy';
    var dia = otro ? diaDe()[1].replace(/^Ayer, /, '') : '';
    var que = v.medio === 'cuenta' ? 'Se devuelve el stock y se descuentan ' + VH.plata(t) + ' de lo que debe ' + v.cliente + '.'
      : v.medio === 'efectivo' ? 'Se devuelve el stock y salen ' + VH.plata(t) + ' de la caja' + (otro ? ' de hoy.' : '.')
        : 'Se devuelve el stock. La devolución con ' + m + ' se hace aparte.';
    var elegido = 0;
    function opciones() {
      return VH.MOTIVOS.map(function (x, i) {
        return (i === 1 ? '<div class="sep"></div>' : '') + '<button class="vh-op' + (i === elegido ? ' elegido' : '') + '" role="option" aria-selected="' + (i === elegido) + '" data-op="' + i + '">' +
          '<i class="i" data-i="' + ICO_MOTIVO[i] + '"></i>' + x + (i === elegido ? '<i class="i i-s chk" data-i="check"></i>' : '') + '</button>';
      }).join('');
    }
    var html = VH.cab('¿Anular esta venta?', (otro ? dia + ' · ' : '') + v.hora + ' · ' + VH.titulo(v) + ' · ' + VH.plata(t), VH.mico(v.medio)) +
      '<div class="aviso error"><i class="i i-s" data-i="triangle-alert" style="margin-top:2px"></i><span>' + que + ' La venta no se borra: queda tachada y en Quién hizo qué.</span></div>' +
      (otro && VH.permisoOtroDia ? '<div class="vh-permiso"><i class="i i-s" data-i="lock"></i>Venta de otro día · tenés el permiso «Anular ventas de cualquier día»</div>' : '') +
      '<div class="vh-et" id="vh-mot-et">Motivo</div>' +
      '<div class="vh-sel">' +
      '<button type="button" aria-haspopup="listbox" aria-expanded="false" data-sel><span class="val vacio">Sin motivo</span><i class="i" data-i="chevron-down"></i></button></div>' +
      '<label class="vh-coment"><i class="i i-s" data-i="message-circle"></i><input type="text" maxlength="120" placeholder="Agregá un comentario (opcional)" data-coment></label>' +
      '<div class="vh-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-peligro" data-si><i class="i i-s" data-i="ban"></i>Anular · ' + VH.signo(-t) + '</button></div>';
    var capa = VH.abrir({ html: html, clase: 'vh-chico' });
    var sel = capa.el.querySelector('.vh-sel'), boton = sel.querySelector('[data-sel]');
    /* La lista flota sobre el celular (no dentro de la hoja, que la recortaría): sube desde el campo */
    var marco = document.querySelector('.celu') || document.body;
    var lista = document.createElement('div');
    lista.className = 'vh-sel-lista'; lista.setAttribute('role', 'listbox'); lista.setAttribute('aria-labelledby', 'vh-mot-et');
    lista.innerHTML = opciones(); marco.appendChild(lista); VH.iconos(lista);
    function abrirLista(si) {
      sel.classList.toggle('abierto', si); lista.classList.toggle('abierta', si); boton.setAttribute('aria-expanded', String(si));
      if (!si) return;
      var rm = marco.getBoundingClientRect(), rb = boton.getBoundingClientRect();
      lista.style.left = (rb.left - rm.left) + 'px'; lista.style.width = rb.width + 'px';
      var alto = lista.offsetHeight, arriba = rb.top - rm.top - 6 - alto;
      lista.style.top = Math.max(12, arriba) + 'px';
      var e = lista.querySelector('.elegido'); if (e) e.focus();
    }
    lista.addEventListener('click', function (e) {
      var o = e.target.closest('[data-op]');
      if (!o) return;
      elegido = Number(o.dataset.op);
      lista.innerHTML = opciones(); VH.iconos(lista);
      var val = boton.querySelector('.val');
      val.textContent = VH.MOTIVOS[elegido]; val.classList.toggle('vacio', elegido === 0);
      abrirLista(false); boton.focus();
      VH.vibrar(10);
    });
    // Tocar fuera de la lista la cierra sin cerrar la hoja
    function afuera(e) { if (sel.classList.contains('abierto') && !lista.contains(e.target) && !boton.contains(e.target)) { e.stopPropagation(); e.preventDefault(); abrirLista(false); } }
    marco.addEventListener('click', afuera, true);
    // Escape cierra primero la lista, después la hoja (window va antes que el document de interacciones.js)
    function tecla(e) {
      if (e.key === 'Escape' && sel.classList.contains('abierto')) { e.preventDefault(); e.stopImmediatePropagation(); abrirLista(false); boton.focus(); }
    }
    window.addEventListener('keydown', tecla, true);
    var alCerrar = capa.op.alCerrar;
    capa.op.alCerrar = function () { window.removeEventListener('keydown', tecla, true); marco.removeEventListener('click', afuera, true); lista.remove(); if (alCerrar) alCerrar(); };

    capa.el.addEventListener('click', function (e) {
      if (e.target.closest('[data-sel]')) { abrirLista(!sel.classList.contains('abierto')); return; }
      if (e.target.closest('[data-si]')) {
        var com = capa.el.querySelector('[data-coment]').value.trim();
        v.motivo = elegido ? VH.MOTIVOS[elegido] : '';
        v.comentario = com;
        if (com) v.motivo = (v.motivo ? v.motivo + ' · ' : '') + '«' + com + '»';
        capa.cerrar();
        VH.anular(v);
        VH.vibrar([10, 40, 10]);
        VH.avisar((otro ? 'Venta del ' + dia.split(' ')[1] : 'Venta de las ' + v.hora) + ' anulada · ' + VH.signo(-t), 'ban');
        if (alConfirmar) alConfirmar(v);
      }
    });
    return capa;
  };

  VH.otroDia = function (alElegir) {
    var html = VH.cab('Otro día', 'Sus ventas se miran y se pueden anular') + '<div style="display:grid;gap:2px">' +
      VH.DIAS.map(function (x) {
        var el = x[0] === VH.diaActual;
        return '<button class="vh-op' + (el ? ' elegido' : '') + '" data-dia="' + x[0] + '"><i class="i" data-i="calendar"></i><span>' + x[1] + '<small>' + x[2] + '</small></span>' +
          (el ? '<i class="i i-s" data-i="check" style="margin-left:auto;color:var(--pino)"></i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="vh-permiso" style="margin-top:12px"><i class="i i-s" data-i="lock"></i>Con tu permiso «Anular ventas de cualquier día»</div>';
    var capa = VH.abrir({ html: html, clase: 'vh-chico' });
    capa.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dia]');
      if (!b) return;
      var x = VH.DIAS.filter(function (y) { return y[0] === b.dataset.dia; })[0];
      VH.diaActual = x[0];
      capa.cerrar();
      if (alElegir) alElegir(x);
      VH.avisar(x[0] === 'hoy' ? 'De vuelta en hoy' : esc(x[1].replace(/^Ayer, /, '')) + ' · tocá una para anularla', 'calendar');
    });
    return capa;
  };
})();

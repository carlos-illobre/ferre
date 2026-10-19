/* Interacciones de «Ventas de hoy»: lo común a las seis maquetas.
   Datos de mentira del día (los del resumen.md), números que ruedan, diálogos y hojas, el menú
   «Más», «Otro día», corregir, anular y registrar un cambio. Cada variante lo usa desde su pie.
   Sin librerías. Movimiento solo con transform y opacity (las clases están en interacciones.css). */
(function () {
  'use strict';
  var VH = window.VH = {};
  var celu = function () { return document.querySelector('.celu'); };
  VH.esCelu = function () { return !!celu(); };
  VH.reducido = function () { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  VH.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  VH.iconos = function (root) { if (window.pintarIconos) window.pintarIconos(root); };

  // ---------------- Números ----------------
  function miles(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  VH.miles = miles;
  VH.plata = function (n) { return (n < 0 ? '−' : '') + '$' + miles(n); };
  VH.signo = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + '$' + miles(n); };
  VH.cant = function (n) { return String(Math.round(n * 100) / 100).replace('.', ','); };
  function num(s) { var n = Number(String(s).replace(/[^\d]/g, '')) || 0; return /[−-]\$?\d/.test(s) ? -n : n; }
  VH.num = num;

  /* Pone un texto en el elemento haciendo rodar sus caracteres: hacia arriba si sube, hacia abajo
     si baja. Si el elemento tenía el «$» chico (.peso), lo conserva. */
  VH.rodar = function (el, texto, dir, escalon) {
    if (!el) return;
    var peso = !!el.querySelector('.peso');
    var clase = dir > 0 ? 'vh-d vh-sube' : dir < 0 ? 'vh-d vh-baja' : 'vh-d';
    var h = '', k = 0;
    Array.prototype.forEach.call(String(texto), function (ch) {
      if (ch === '$' && peso) { h += '<span class="peso">$</span>'; return; }
      if (ch === ' ') { h += ' '; return; }
      h += '<vh-d class="' + clase + '" style="animation-delay:' + (k++ * (escalon || 0)) + 'ms">' + ch + '</vh-d>';
    });
    el.innerHTML = '<vh-r style="white-space:nowrap">' + h + '</vh-r>';
    // Terminado el giro, vuelve a ser texto común (así queda igual, letra por letra, que antes)
    var rueda = el.firstChild, limpio = peso ? '<span class="peso">$</span>' + String(texto).replace('$', '') : String(texto);
    setTimeout(function () { if (el.firstChild === rueda) { if (peso) el.innerHTML = limpio; else el.textContent = limpio; } }, k * (escalon || 0) + 260);
  };

  // ---------------- El día ----------------
  VH.MEDIOS = {
    efectivo: { nom: 'Efectivo', ico: 'banknote', corto: 'Efectivo' },
    mp: { nom: 'Mercado Pago', ico: 'qr-code', corto: 'M. Pago' },
    tarjeta: { nom: 'Tarjeta', ico: 'credit-card', corto: 'Tarjeta' },
    cuenta: { nom: 'Cuenta corriente', ico: 'notebook-pen', corto: 'Cta. cte.' },
  };
  var d = VH.dia = {
    total: 412000, ventas: 23, productos: 41,
    medios: { efectivo: 148000, mp: 171000, tarjeta: 38000, cuenta: 55000 },
    cuantas: { efectivo: 11, mp: 7, tarjeta: 2, cuenta: 3 },
  };
  var ligados = [];
  /* Liga un elemento a un número del día: cuando cambia, rueda. */
  VH.ligar = function (el, fn) { if (el) ligados.push({ el: el, fn: fn, ult: fn(d) }); };
  VH.pintar = function () {
    ligados.forEach(function (l) {
      var v = l.fn(d);
      if (v === l.ult) return;
      VH.rodar(l.el, v, num(v) >= num(l.ult) ? 1 : -1, 20);
      l.ult = v;
    });
  };
  VH.mover = function (medio, delta, dventas, dprod) {
    d.total += delta; d.medios[medio] += delta;
    d.cuantas[medio] += dventas || 0; d.ventas += dventas || 0; d.productos += dprod || 0;
    VH.pintar();
  };
  VH.ticket = function () { return '$' + miles(d.total / d.ventas); };

  var minuto = 41;
  VH.hora = function () { return '17:' + String(minuto++).padStart(2, '0'); };

  // ---------------- Las ventas de hoy ----------------
  function it(nom, det, foto, cant, precio, u) { return { nom: nom, det: det, foto: foto, cant: cant, precio: precio, u: u || 'un.' }; }
  VH.it = it;
  VH.ventas = [
    { id: '1736', hora: '17:36', medio: 'mp', quien: 'Mariela', items: [it('Juego de llaves combinadas × 12', 'Stanley · Cód. STMT80942', 'llave-combinada', 1, 78000)] },
    { id: '1722', hora: '17:22', medio: 'efectivo', quien: 'Mariela', items: [it('Cinta métrica 5 m', 'Stanley · Cód. 30-496', 'cinta-metrica', 1, 12000), it('Puntas Phillips PH2 × 10', 'Bremen · Cód. 5512', 'puntas', 1, 9000)] },
    { id: '1705', hora: '17:05', medio: 'efectivo', quien: 'Mariela', tipo: 'cambio', vuelve: it('Pinza universal 8" aislada', 'Bremen · vendida hoy 10:25', 'pinza', 1, 14000), items: [it('Pinza de punta larga 8"', 'Bremen · Cód. 4021', 'pinza', 1, 18000)] },
    { id: '1648', hora: '16:48', medio: 'cuenta', quien: 'Mariela', cliente: 'Constructora Martínez', items: [it('Látex interior mate blanco 4 L', 'Alba · Cód. LX4B', 'pintura', 1, 22000), it('Clavos punta París 2"', 'Acindar · por kilo', 'clavos', 1, 8000, 'kg'), it('Tarugos nylon S8 con tope × 100', 'Fischer · Cód. S8T', 'tarugos', 1, 8000)] },
    { id: '1630', hora: '16:30', medio: 'tarjeta', quien: 'Mariela', estado: 'anulada', anuladaA: '16:31', motivo: 'se cobró dos veces', items: [it('Martillo carpintero 27 mm', 'Bahco · Cód. 428', 'martillo', 1, 24000)] },
    { id: '1615', hora: '16:15', medio: 'mp', quien: 'Mariela', items: [it('Lámpara LED 9 W luz fría E27', 'Philips · Cód. 929001', 'lampara', 4, 5000)] },
    { id: '1251', hora: '12:51', medio: 'efectivo', quien: 'Julián', items: [it('Tornillos autoperforantes 8 × 1" × 100', 'Fischer · Cód. T81', 'tornillos', 1, 9000), it('Tarugos nylon S6 × 50', 'Fischer · Cód. S6', 'tarugos', 1, 6000)] },
    { id: '1230', hora: '12:30', medio: 'mp', quien: 'Julián', estado: 'corregida', nota: 'eran 4', corregidaA: '12:34', items: [it('Mecha acero rápido HSS 8 mm', 'Ezeta · Cód. HSS8', 'mecha', 3, 7000)] },
    // Las que solo se ven en los cajones (computadora 3)
    { id: '1210', hora: '12:10', medio: 'efectivo', quien: 'Julián', extra: 1, items: [it('Tornillos autoperforantes × 100', 'Fischer · Cód. T61', 'tornillos', 1, 10000)] },
    { id: '1152', hora: '11:52', medio: 'efectivo', quien: 'Julián', extra: 1, items: [it('Clavos punta París 2"', 'Acindar · por kilo', 'clavos', 1, 8000, 'kg'), it('Lija al agua grano 120', 'Norton', null, 2, 2000), it('Cinta de papel 24 mm', 'Tacsa', null, 1, 3000)] },
    { id: '1140', hora: '11:40', medio: 'tarjeta', quien: 'Mariela', extra: 1, items: [it('Pintura látex interior 1 L', 'Alba · Cód. LX1B', 'pintura', 1, 16000), it('Pinceleta 2"', 'El Galgo', null, 1, 8000)] },
    { id: '1120', hora: '11:20', medio: 'cuenta', quien: 'Mariela', cliente: 'Plomería Don Tito', extra: 1, items: [it('Llave de paso 1/2" esférica', 'FV · Cód. 0386', null, 1, 8000), it('Cinta teflón 3/4"', 'Sellotape', null, 2, 2000)] },
    { id: '1025', hora: '10:25', medio: 'tarjeta', quien: 'Mariela', extra: 1, nota: 'después se cambió', items: [it('Pinza universal 8" aislada', 'Bremen · Cód. 4011', 'pinza', 1, 14000)] },
    { id: '0915', hora: '09:15', medio: 'cuenta', quien: 'Julián', cliente: 'Electricidad Ojeda', extra: 1, items: [it('Cinta aisladora × 3', '3M Temflex 20 m', null, 1, 5000)] },
  ];
  VH.buscar = function (id) { return VH.ventas.filter(function (v) { return v.id === id; })[0]; };
  VH.total = function (v) {
    var s = (v.ed || v.items).reduce(function (a, x) { return a + x.cant * x.precio; }, 0);
    return v.vuelve ? s - v.vuelve.cant * v.vuelve.precio : s;
  };
  VH.totalOrig = function (v) { var ed = v.ed; v.ed = null; var t = VH.total(v); v.ed = ed; return t; };
  VH.titulo = function (v) {
    if (v.cliente) return v.cliente;
    if (v.tipo === 'cambio') return 'Cambio';
    if (v.items.length === 1) return VH.cant(v.items[0].cant) + ' × ' + v.items[0].nom;
    return v.items.length + ' productos';
  };
  VH.cuales = function (v) {
    if (v.tipo === 'cambio') return corto(v.vuelve.nom) + ' → ' + corto(v.items[0].nom).toLowerCase();
    return v.items.map(function (x, i) { var p = x.nom.split(' ')[0]; return i ? p.toLowerCase() : p; }).join(', ');
  };
  function corto(n) { return n.replace(/ 8" aislada| larga 8"| 8"/, '').replace('Pinza de punta', 'Pinza de punta'); }
  VH.mico = function (medio, chico) {
    return '<span class="mico medio ' + medio + (chico ? ' chico' : '') + '"><i class="i' + (chico ? ' i-s' : '') + '" data-i="' + VH.MEDIOS[medio].ico + '"></i></span>';
  };
  VH.foto = function (f, clase) {
    return f ? '<span class="foto ' + (clase || '') + '"><img src="../../../_comun/fotos/' + f + '.webp" alt=""></span>'
      : '<span class="foto-icono ' + (clase || '') + '"><i class="i" data-i="package"></i></span>';
  };
  VH.pastillaEstado = function (v) {
    if (v.estado === 'anulada') return '<span class="pastilla error">anulada</span>';
    if (v.estado === 'corregida') return '<span class="pastilla urgente">corregida</span>';
    if (v.tipo === 'cambio') return '<span class="pastilla contorno">cambio</span>';
    if (v.medio === 'cuenta') return '<span class="pastilla urgente">debe</span>';
    return '';
  };

  // ---------------- Capas: diálogo, hoja, menú ----------------
  var pila = [];
  VH.abiertas = function () { return pila.length; };
  VH.cab = function (titulo, detalle, previo) {
    return '<div class="vh-dcab">' + (previo || '') + '<div style="min-width:0;flex:1"><div class="t">' + titulo + '</div>' +
      (detalle ? '<div class="d">' + detalle + '</div>' : '') + '</div>' +
      '<button class="btn btn-icono chico btn-suave vh-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  };
  /* op: { tipo: 'dialogo' | 'hoja' | 'menu', html, clase, ancla, alCerrar } */
  VH.abrir = function (op) {
    var cont = celu() || document.body;
    var tipo = op.tipo || (celu() ? 'hoja' : 'dialogo');
    var velo = document.createElement('div');
    velo.className = 'vh-velo' + (tipo === 'menu' ? ' claro' : '');
    var el = document.createElement('div');
    el.className = (tipo === 'hoja' ? 'vh-hoja' : tipo === 'menu' ? 'vh-menu' : 'vh-dialogo') + ' ' + (op.clase || '');
    el.setAttribute('role', 'dialog');
    el.innerHTML = (tipo === 'hoja' ? '<div class="agarre"></div>' : '') + (op.html || '');
    cont.appendChild(velo); cont.appendChild(el);
    VH.iconos(el);
    var capa = { el: el, velo: velo, op: op, tipo: tipo };
    capa.cerrar = function () { VH.cerrar(capa); };
    conectarCapa(capa);
    if (tipo === 'menu' && op.ancla) {
      var r = op.ancla.getBoundingClientRect(), h = el.offsetHeight;
      el.style.left = Math.round(r.right + 8) + 'px';
      el.style.top = Math.round(Math.max(16, Math.min(r.top - 8, window.innerHeight - h - 16))) + 'px';
    }
    pila.push(capa);
    if (!celu()) { var f = el.querySelector('input[autofocus]'); if (f) setTimeout(function () { f.focus(); }, 30); }
    return capa;
  };
  function conectarCapa(capa) {
    capa.velo.addEventListener('click', capa.cerrar);
    capa.el.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cerrar]');
      if (c && capa.el.contains(c)) capa.cerrar();
    });
    var ag = capa.el.querySelector('.agarre');
    if (ag) VH.arrastrarHoja(ag, capa.el, capa.cerrar);
  }
  /* Una capa que ya está en la página (la hoja abierta del celular 2): se oculta en vez de borrarse. */
  VH.registrar = function (el, velo, op) {
    op = op || {}; op.ocultar = true;
    var capa = { el: el, velo: velo, op: op, tipo: 'hoja' };
    capa.cerrar = function () { VH.cerrar(capa); };
    conectarCapa(capa);
    pila.push(capa);
    return capa;
  };
  VH.mostrar = function (capa) {
    if (pila.indexOf(capa) >= 0) return;
    capa.cerrada = false;
    capa.el.style.display = ''; capa.velo.style.display = '';
    capa.el.style.transform = '';
    capa.el.classList.remove('vh-saliendo', 'vh-subiendo'); capa.velo.classList.remove('vh-saliendo');
    void capa.el.offsetWidth;
    capa.el.classList.add('vh-subiendo'); capa.velo.classList.add('vh-fundir');
    pila.push(capa);
  };
  VH.cerrar = function (capa) {
    capa = capa || pila[pila.length - 1];
    if (!capa || capa.cerrada) return;
    capa.cerrada = true;
    pila.splice(pila.indexOf(capa), 1);
    var fin = function () {
      if (capa.op.ocultar) {
        capa.el.style.display = 'none'; capa.velo.style.display = 'none';
        capa.el.classList.remove('vh-saliendo'); capa.velo.classList.remove('vh-saliendo', 'vh-fundir');
        capa.el.style.transform = '';
      } else { capa.el.remove(); capa.velo.remove(); }
    };
    if (VH.reducido()) fin();
    else {
      capa.el.classList.remove('vh-subiendo');
      capa.el.classList.add('vh-saliendo'); capa.velo.classList.add('vh-saliendo');
      setTimeout(fin, 210);
    }
    if (capa.op.alCerrar) capa.op.alCerrar();
  };
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !pila.length) return;
    if (e.target && e.target.classList && e.target.classList.contains('vh-in')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    VH.cerrar();
  }, true);

  /* La hoja sigue al dedo desde el agarre; pasados 80 px, se cierra. */
  VH.arrastrarHoja = function (agarre, hoja, cerrar) {
    var y0 = null, dy = 0;
    agarre.addEventListener('pointerdown', function (e) {
      y0 = e.clientY; dy = 0; hoja.style.transition = 'none';
      try { agarre.setPointerCapture(e.pointerId); } catch (x) { /* nada */ }
    });
    agarre.addEventListener('pointermove', function (e) {
      if (y0 === null) return;
      dy = Math.max(0, e.clientY - y0);
      hoja.style.transform = 'translateY(' + dy + 'px)';
    });
    function soltar() {
      if (y0 === null) return;
      y0 = null;
      hoja.style.transition = 'transform var(--t) var(--curva)';
      if (dy > 80) cerrar(); else hoja.style.transform = '';
    }
    agarre.addEventListener('pointerup', soltar);
    agarre.addEventListener('pointercancel', soltar);
  };

  // ---------------- Tostada ----------------
  VH.avisar = function (texto, icono) {
    var cont = celu() || document.body;
    var t = document.querySelector('.vh-tostada');
    if (t) t.remove();
    t = document.createElement('div');
    t.className = 'vh-tostada';
    t.innerHTML = '<span class="tostada"><i class="i" data-i="' + (icono || 'circle-check') + '"></i>' + texto + '</span>';
    cont.appendChild(t); VH.iconos(t);
    clearTimeout(VH._tt);
    VH._tt = setTimeout(function () { t.classList.add('vh-saliendo'); setTimeout(function () { t.remove(); }, 220); }, 2600);
  };

  // ---------------- Más ----------------
  VH.MAS = [['anomalias', 'triangle-alert', 'Anomalías', '3'], ['procesos', 'workflow', 'Procesos'], ['mejoras-y-errores', 'bug', 'Mejoras y errores'], ['configuracion', 'settings', 'Configuración']];
  VH.abrirMas = function (ancla) {
    var c = !!celu();
    var html = (c ? VH.cab('Más') : '') + VH.MAS.map(function (m) {
      return '<button class="vh-op" data-ir="' + m[0] + '"><i class="i' + (c ? ' i-l' : '') + '" data-i="' + m[1] + '"></i>' + m[2] +
        (m[3] ? '<span class="pastilla urgente">' + m[3] + '</span>' : '') + '</button>';
    }).join('');
    return VH.abrir({ tipo: c ? 'hoja' : 'menu', html: html, ancla: ancla });
  };
  /* Conecta el menú del marco: data-ir en cada parte y «Más» abre su menú. */
  VH.marco = function () {
    var partes = { 'Vender': 'vender', 'Catálogo': 'productos', 'Depósito': 'stock', 'Negocio': 'resumen' };
    document.querySelectorAll('.lateral .nav-item, .nav-inferior a').forEach(function (a) {
      var t = a.textContent.replace(/\d+/g, '').trim();
      if (partes[t]) a.setAttribute('data-ir', partes[t]);
      if (t === 'Más') {
        a.setAttribute('data-no-ir', '');
        a.addEventListener('click', function (e) { e.preventDefault(); VH.abrirMas(a); });
      }
    });
    document.querySelectorAll('.pestanas a, .celu-pestanas a').forEach(function (a) {
      if (a.classList.contains('activa')) a.setAttribute('data-no-ir', '');
      else if (/^Vender/.test(a.textContent.trim())) a.setAttribute('data-ir', 'vender');
    });
  };

  // ---------------- Otro día ----------------
  VH.DIAS = [
    ['hoy', 'Hoy, lunes 19/10', '$412.000 · 23 ventas hasta las 17:40'],
    ['1810', 'Ayer, domingo 18/10', 'Cerrado'],
    ['1710', 'Sábado 17/10', '$538.000 · 31 ventas'],
    ['1610', 'Viernes 16/10', '$397.000 · 22 ventas'],
    ['1510', 'Jueves 15/10', '$421.000 · 24 ventas'],
    ['1410', 'Miércoles 14/10', '$366.000 · 20 ventas'],
  ];
  VH.diaActual = 'hoy';
  VH.otroDia = function (alElegir) {
    var html = VH.cab('Otro día', 'Las de otro día se miran; corregir y anular, solo hoy') + '<div style="display:grid;gap:2px">' +
      VH.DIAS.map(function (x) {
        var el = x[0] === VH.diaActual;
        return '<button class="vh-op' + (el ? ' elegido' : '') + '" data-dia="' + x[0] + '"><i class="i" data-i="calendar"></i><span>' + x[1] + '<small>' + x[2] + '</small></span>' +
          (el ? '<i class="i i-s" data-i="check" style="margin-left:auto;color:var(--pino)"></i>' : '') + '</button>';
      }).join('') + '</div>';
    var capa = VH.abrir({ html: html, clase: 'vh-chico' });
    capa.el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-dia]');
      if (!b) return;
      var x = VH.DIAS.filter(function (y) { return y[0] === b.dataset.dia; })[0];
      VH.diaActual = x[0];
      capa.cerrar();
      if (alElegir) alElegir(x);
      VH.avisar(x[0] === 'hoy' ? 'De vuelta en hoy' : x[1] + ': solo para mirar', 'calendar');
    });
    return capa;
  };

  // ---------------- Corregir ----------------
  VH.empezar = function (v) {
    if (!v.ed) v.ed = v.items.map(function (x) { var y = Object.assign({}, x); y.o = x; return y; });
  };
  VH.descartar = function (v) { v.ed = null; };
  VH.difer = function (v) { return v.ed ? VH.total(v) - VH.totalOrig(v) : 0; };
  VH.cambio = function (x) { return { cant: x.cant !== x.o.cant, precio: x.precio !== x.o.precio }; };
  VH.guardar = function (v) {
    var delta = VH.difer(v), nota = '';
    v.ed.forEach(function (x) {
      var c = VH.cambio(x);
      if (!nota && c.cant) nota = 'eran ' + VH.cant(x.o.cant) + ' ' + x.u;
      if (!nota && c.precio) nota = 'precio a mano';
    });
    v.items = v.ed.map(function (x) { var y = Object.assign({}, x); delete y.o; delete y.r; return y; });
    v.ed = null;
    if (nota) { v.estado = 'corregida'; v.nota = nota; v.corregidaA = VH.hora(); }
    if (delta) VH.mover(v.medio, delta, 0, 0);
    VH.vibrar([10, 40, 10]);
    return delta;
  };
  /* Lo que cambia, en palabras: deuda, caja, stock y total del día. */
  VH.loQueCambia = function (v) {
    var dif = VH.difer(v), l = [];
    if (dif) l.push(v.medio === 'cuenta' ? ['Lo que debe el cliente', VH.signo(dif)] : [v.medio === 'efectivo' ? (dif > 0 ? 'Entra a la caja' : 'Sale de la caja') : 'Se cobra con ' + VH.MEDIOS[v.medio].nom, VH.signo(dif)]);
    (v.ed || []).forEach(function (x) {
      if (x.cant !== x.o.cant) l.push(['Stock de ' + x.nom.split(' ')[0].toLowerCase(), (x.cant > x.o.cant ? '−' : '+') + VH.cant(Math.abs(x.cant - x.o.cant)) + ' ' + x.u]);
    });
    l.push(['Total de hoy', VH.plata(d.total + dif)]);
    return l;
  };
  /* Clic en − + o en el precio de un renglón que se corrige. */
  VH.editorClic = function (e, v, repintar) {
    var b = e.target.closest('[data-menos],[data-mas],[data-precio]');
    if (!b || !v.ed) return false;
    var i = Number(b.getAttribute('data-menos') || b.getAttribute('data-mas') || b.getAttribute('data-precio'));
    var x = v.ed[i];
    if (b.hasAttribute('data-precio')) { editarPrecio(b, x, repintar); return true; }
    var paso = x.u === 'kg' ? 0.5 : 1;
    x.cant = Math.max(paso, Math.round((x.cant + (b.hasAttribute('data-mas') ? paso : -paso)) * 2) / 2);
    VH.vibrar(10);
    repintar();
    return true;
  };
  function editarPrecio(b, x, repintar) {
    if (b.querySelector('input')) return;
    b.classList.add('vh-foco');
    b.innerHTML = '$<input class="vh-in" inputmode="numeric" aria-label="Precio" value="' + miles(x.precio) + '">';
    var inp = b.querySelector('input'), listo = false;
    inp.focus(); inp.select();
    function fin(ok) {
      if (listo) return;
      listo = true;
      if (ok) { var n = Number(inp.value.replace(/\D/g, '')); if (n > 0) x.precio = n; }
      repintar();
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); fin(true); }
      if (e.key === 'Escape') { e.preventDefault(); fin(false); }
    });
    inp.addEventListener('blur', function () { fin(true); });
    inp.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  /* El valor viejo tachado: la raya se dibuja la primera vez y después queda quieta. */
  VH.raya = function (x, clave, texto, estilo) {
    x.r = x.r || {};
    var ya = x.r[clave];
    x.r[clave] = true;
    return '<span class="' + (ya ? 'viejo' : 'vh-raya') + '"' + (estilo ? ' style="' + estilo + '"' : '') + '>' + texto + '</span>';
  };
  VH.sinRaya = function (x, clave) { if (x.r) x.r[clave] = false; };

  // ---------------- Anular ----------------
  VH.MOTIVOS = ['Se cobró dos veces', 'Se equivocó de producto', 'El cliente se arrepintió', 'Otro'];
  VH.anular = function (v) {
    v.estado = 'anulada'; v.anuladaA = VH.hora();
    VH.mover(v.medio, -VH.total(v), v.tipo === 'cambio' ? 0 : -1, 0);
  };
  VH.confirmarAnular = function (v, alConfirmar) {
    var t = VH.total(v), m = VH.MEDIOS[v.medio].nom;
    var que = v.medio === 'cuenta' ? 'Se devuelve el stock y se descuentan ' + VH.plata(t) + ' de lo que debe ' + v.cliente + '.'
      : v.medio === 'efectivo' ? 'Se devuelve el stock y salen ' + VH.plata(t) + ' de la caja.'
        : 'Se devuelve el stock. La devolución con ' + m + ' se hace aparte.';
    var html = VH.cab('¿Anular esta venta?', v.hora + ' · ' + VH.titulo(v) + ' · ' + VH.plata(t), VH.mico(v.medio)) +
      '<div class="aviso error"><i class="i i-s" data-i="triangle-alert" style="margin-top:2px"></i><span>' + que + ' La venta no se borra: queda tachada y en Quién hizo qué.</span></div>' +
      '<div class="vh-et">Por qué</div><div class="vh-chips">' + VH.MOTIVOS.map(function (x, i) { return '<button class="chip' + (i ? '' : ' elegido') + '" data-motivo>' + x + '</button>'; }).join('') + '</div>' +
      '<div class="vh-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-peligro" data-si><i class="i i-s" data-i="ban"></i>Anular · ' + VH.signo(-t) + '</button></div>';
    var capa = VH.abrir({ html: html, clase: 'vh-chico' });
    capa.el.addEventListener('click', function (e) {
      var ch = e.target.closest('[data-motivo]');
      if (ch) { capa.el.querySelectorAll('[data-motivo]').forEach(function (c) { c.classList.toggle('elegido', c === ch); }); return; }
      if (e.target.closest('[data-si]')) {
        v.motivo = (capa.el.querySelector('[data-motivo].elegido') || {}).textContent;
        capa.cerrar();
        VH.anular(v);
        VH.vibrar([10, 40, 10]);
        VH.avisar('Venta de las ' + v.hora + ' anulada · ' + VH.signo(-t), 'ban');
        if (alConfirmar) alConfirmar(v);
      }
    });
    return capa;
  };

  // ---------------- Registrar un cambio ----------------
  VH.SUGERIDOS = [
    it('Pinza de punta larga 8"', 'Bremen · 6 un. en stock', 'pinza', 1, 18000),
    it('Cinta métrica 8 m', 'Stanley · 4 un. en stock', 'cinta-metrica', 1, 16000),
    it('Martillo carpintero 27 mm', 'Bahco · 3 un. en stock', 'martillo', 1, 24000),
    it('Mecha acero rápido HSS 6 mm', 'Ezeta · 12 un. en stock', 'mecha', 1, 6000),
    it('Tarugos nylon S10 con tope × 50', 'Fischer · 20 un. en stock', 'tarugos', 1, 9000),
  ];
  function elige(x, clase, valor, attr) {
    return '<button class="vh-elige ' + (clase || '') + '" ' + attr + '>' + VH.foto(x.foto, 'chica') + '<span style="min-width:0"><span class="nom" style="display:block">' + x.nom +
      '</span><span class="det" style="display:block">' + x.det + '</span></span><span class="v num">' + valor + '</span></button>';
  }
  VH.abrirCambio = function (v, alConfirmar) {
    var st = { v: v || null, vuelve: 0, lleva: 0, medio: 'efectivo', buscaV: '', buscaP: '' };
    var capa = VH.abrir({ html: '', clase: 'vh-cambio' });
    var caja = document.createElement('div');
    capa.el.appendChild(caja);
    function ventasPosibles() {
      var q = st.buscaV.toLowerCase();
      return VH.ventas.filter(function (x) {
        return x.estado !== 'anulada' && x.tipo !== 'cambio' && (!q || (VH.titulo(x) + ' ' + x.items.map(function (y) { return y.nom; }).join(' ')).toLowerCase().indexOf(q) >= 0);
      }).slice(0, 6);
    }
    function productos() {
      var q = st.buscaP.toLowerCase();
      return VH.SUGERIDOS.filter(function (x) { return !q || x.nom.toLowerCase().indexOf(q) >= 0; });
    }
    function pintar(foco) {
      var h = VH.cab('Registrar un cambio', 'Lo que vuelve se toma al precio que se pagó');
      if (!st.v) {
        h += '<div class="vh-et"><i class="i i-s" data-i="search"></i>¿De qué venta de hoy?</div>' +
          '<label class="vh-campo vh-foco"><i class="i i-s" data-i="search"></i><input data-buscav autofocus placeholder="Producto o cliente" value="' + st.buscaV + '"></label>' +
          '<div class="vh-lista" style="margin-top:8px">' + ventasPosibles().map(function (x) {
          return '<button class="vh-elige" data-venta="' + x.id + '">' + VH.mico(x.medio) + '<span style="min-width:0"><span class="nom" style="display:block">' + VH.titulo(x) +
            '</span><span class="det" style="display:block">' + x.hora + ' · ' + VH.cuales(x) + '</span></span><span class="v num">' + VH.plata(VH.total(x)) + '</span></button>';
        }).join('') + '</div>';
      } else {
        var ps = productos(), vu = st.v.items[st.vuelve], ll = ps[st.lleva] || ps[0];
        var dif = (ll ? ll.precio : 0) - vu.precio;
        h += '<div class="vh-et"><i class="i i-s" data-i="rotate-ccw"></i>Vuelve, de la venta de las ' + st.v.hora + ' · ' + VH.MEDIOS[st.v.medio].nom +
          ' <button class="btn btn-fantasma chico" data-otra style="margin-left:auto;min-height:28px;padding:0 6px">Otra venta</button></div>' +
          st.v.items.map(function (x, i) { return elige(x, i === st.vuelve ? 'elegido' : '', '−' + VH.plata(x.precio), 'data-vuelve="' + i + '"'); }).join('') +
          '<div class="vh-et"><i class="i i-s" data-i="shopping-bag"></i>Se lleva</div>' +
          '<label class="vh-campo"><i class="i i-s" data-i="scan-barcode"></i><input data-buscap placeholder="Escaneá o escribí el producto" value="' + st.buscaP + '"></label>' +
          '<div class="vh-lista" style="margin-top:6px;max-height:190px">' + (ps.length ? ps.map(function (x, i) { return elige(x, x === ll ? 'elegido' : '', '+' + VH.plata(x.precio), 'data-lleva="' + i + '"'); }).join('')
          : '<div class="t-detalle" style="padding:8px 4px">No hay un producto con ese nombre</div>') + '</div>' +
          '<div class="vh-difer"><div><div class="t-etiqueta">' + (dif >= 0 ? 'Diferencia a cobrar' : 'Diferencia a devolver') + '</div><div class="t-numero num" data-dif><span class="peso">$</span>' + miles(dif) + '</div></div>' +
          '<div class="vh-medios">' + ['efectivo', 'mp', 'tarjeta'].concat(st.v.medio === 'cuenta' ? ['cuenta'] : []).map(function (m) {
            return '<button class="m medio ' + m + (m === st.medio ? ' elegido' : '') + '" data-medio="' + m + '">' + VH.mico(m) + (m === st.medio ? VH.MEDIOS[m].corto : '') + '</button>';
          }).join('') + '</div></div>' +
          '<div class="vh-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-si' + (ll ? '' : ' disabled') + '><i class="i i-s" data-i="check"></i>' +
          (dif > 0 ? 'Cobrar ' + VH.plata(dif) : dif < 0 ? 'Devolver ' + VH.plata(-dif) : 'Registrar el cambio') + '</button></div>';
        st.dif = dif; st.ll = ll; st.vu = vu;
      }
      caja.innerHTML = h;
      VH.iconos(caja);
      var f = caja.querySelector(foco ? '[' + foco + ']' : '[autofocus]');
      if (f && (foco || !celu())) { f.focus(); var n = f.value.length; f.setSelectionRange(n, n); }
    }
    caja.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-buscav')) { st.buscaV = e.target.value; pintar('data-buscav'); }
      if (e.target.hasAttribute('data-buscap')) { st.buscaP = e.target.value; st.lleva = 0; pintar('data-buscap'); }
    });
    caja.addEventListener('click', function (e) {
      var b;
      if ((b = e.target.closest('[data-venta]'))) { st.v = VH.buscar(b.dataset.venta); st.vuelve = 0; pintar(); return; }
      if (e.target.closest('[data-otra]')) { st.v = null; pintar(); return; }
      if ((b = e.target.closest('[data-vuelve]'))) { st.vuelve = +b.dataset.vuelve; pintar(); return; }
      if ((b = e.target.closest('[data-lleva]'))) { st.lleva = +b.dataset.lleva; VH.vibrar(10); pintar(); return; }
      if ((b = e.target.closest('[data-medio]'))) { st.medio = b.dataset.medio; pintar(); return; }
      if (e.target.closest('[data-si]') && st.ll) {
        var vu = Object.assign({}, st.vu, { det: VH.MEDIOS[st.v.medio].nom + ' · vendida hoy ' + st.v.hora, cant: 1 });
        var c = { id: 'c' + Date.now(), hora: VH.hora(), medio: st.medio, quien: 'Mariela', tipo: 'cambio', vuelve: vu, items: [Object.assign({}, st.ll)], nueva: true };
        VH.ventas.unshift(c);
        capa.cerrar();
        if (st.dif) VH.mover(st.medio, st.dif, 0, 0);
        VH.vibrar([10, 40, 10]);
        VH.avisar('Cambio registrado · ' + (st.dif ? VH.signo(st.dif) + ' en ' + VH.MEDIOS[st.medio].nom.toLowerCase() : 'sin diferencia'));
        if (alConfirmar) alConfirmar(c);
      }
    });
    pintar();
    return capa;
  };

  // ---------------- La venta en la computadora (panel de la 1, diálogo de la 3) ----------------
  /* Pinta la venta dentro de «cont» y maneja Corregir, Cambio y Anular.
     ganchos: { cambio(v), guardado(v, delta), anulada(v), cambioHecho(c), cerrar } */
  VH.panelVenta = function (cont, v, ganchos, conCerrar) {
    var modo = 'ver';
    cont.classList.add('vh-venta');
    function filaVer(x, i, resta) {
      return '<div class="rv"' + ' style="animation-delay:' + (i * 30) + 'ms">' + VH.foto(x.foto, 'chica') + '<div style="min-width:0"><div class="nom">' + x.nom + '</div><div class="det">' +
        (resta ? 'Volvió · se había pagado ' + VH.plata(x.precio) : VH.cant(x.cant) + ' ' + x.u + ' × ' + VH.plata(x.precio)) + '</div></div><span class="st num">' + (resta ? '−' : '') + VH.plata(x.cant * x.precio) + '</span></div>';
    }
    function filaEd(x, i) {
      var c = VH.cambio(x);
      if (!c.cant) VH.sinRaya(x, 'c');
      if (!c.precio) VH.sinRaya(x, 'p');
      if (!c.cant && !c.precio) VH.sinRaya(x, 's');
      return '<div class="rv">' + VH.foto(x.foto, 'chica') + '<div style="min-width:0"><div class="nom">' + x.nom + '</div><div class="ed">' +
        '<span class="cantidad' + (c.cant ? ' vh-foco' : '') + '"><button data-menos="' + i + '" aria-label="Menos"><i class="i i-s" data-i="minus"></i></button><span class="n">' + VH.cant(x.cant) + '<span class="u">' + x.u + '</span></span>' +
        '<button data-mas="' + i + '" aria-label="Más"><i class="i i-s" data-i="plus"></i></button></span>× <button class="vh-precio' + (c.precio ? ' vh-foco' : '') + '" data-precio="' + i + '">' + VH.plata(x.precio) + '</button></div></div>' +
        '<span class="st num">' + (c.cant || c.precio ? VH.raya(x, 's', VH.plata(x.o.cant * x.o.precio)) : '') + VH.plata(x.cant * x.precio) + '</span></div>';
    }
    function pintar(animar) {
      var h = '<div class="cab">' + VH.mico(v.medio) + '<div style="flex:1;min-width:0"><div class="t">' + VH.titulo(v) + '</div><div class="d">' + v.hora + ' · ' + VH.MEDIOS[v.medio].nom + ' · ' + v.quien + '</div></div>' +
        VH.pastillaEstado(v) +
        (conCerrar ? '<button class="btn btn-icono chico btn-suave" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>' : '') + '</div>';
      if (modo === 'ver') {
        h += '<div class="renglones' + (animar ? ' vh-anim' : '') + '">' + (v.vuelve ? filaVer(v.vuelve, 0, true) : '') + v.items.map(function (x, i) { return filaVer(x, i + (v.vuelve ? 1 : 0)); }).join('') + '</div>';
        h += '<div class="tot"><span class="t-etiqueta">' + (v.tipo === 'cambio' ? 'Diferencia' : 'Total') + '</span><b class="num' + (v.estado === 'anulada' ? ' viejo' : '') + '">' + (v.tipo === 'cambio' && VH.total(v) > 0 ? '+' : '') + '<span class="peso">$</span>' + miles(VH.total(v)) + '</b></div>';
        if (v.estado === 'anulada') {
          h += '<div class="aviso error"><i class="i i-s" data-i="ban" style="margin-top:2px"></i><span>Anulada a las ' + v.anuladaA + ' por ' + (v.quien) + (v.motivo ? ' · ' + v.motivo.toLowerCase() : '') + '. El stock volvió; la venta queda a la vista.</span></div>';
        } else {
          h += '<div class="acciones3"' + (v.tipo === 'cambio' ? ' style="grid-template-columns:1fr 1fr"' : '') + '>' + (v.tipo === 'cambio' ? '' : '<button class="btn" data-acc="corregir"><i class="i i-s" data-i="square-pen"></i>Corregir</button>') + '<button class="btn" data-acc="cambio"><i class="i i-s" data-i="arrow-left-right"></i>Cambio</button><button class="btn btn-peligro" data-acc="anular"><i class="i i-s" data-i="ban"></i>Anular</button></div>';
        }
        h += '<div class="rastro"><i class="i i-s" data-i="history"></i>' + (v.estado === 'corregida' ? 'Corregida a las ' + v.corregidaA + ' · ' + v.nota : v.estado === 'anulada' ? 'Queda en Quién hizo qué' : 'Sin correcciones · se corrige hasta el cierre') + '</div>';
      } else {
        var dif = VH.difer(v);
        h += '<div class="renglones">' + v.ed.map(filaEd).join('') + '</div>';
        h += '<div class="tot"><span class="t-etiqueta">Total</span><span style="display:flex;align-items:baseline;gap:8px">' + (dif ? '<span class="vh-raya vh-ya" style="font-size:16px">' + VH.plata(VH.totalOrig(v)) + '</span>' : '') +
          '<b class="num"><span class="peso">$</span>' + miles(VH.total(v)) + '</b>' + (dif ? '<span class="pastilla urgente' + (v._ud !== dif ? ' vh-rebota' : '') + '" style="align-self:center">' + VH.signo(dif) + '</span>' : '') + '</span></div>';
        v._ud = dif;
        h += '<div class="cambia-l">' + VH.loQueCambia(v).slice(0, 1).concat([VH.loQueCambia(v).pop()]).filter(function (l, i, t) { return dif || i; }).map(function (l) { return '<span>' + l[0] + ' <b>' + l[1] + '</b></span>'; }).join('') + '</div>';
        h += '<div class="acciones2"><button class="btn btn-fantasma" data-acc="descartar">Descartar</button><button class="btn btn-accion" data-acc="guardar"' + (dif || cambioAlguno() ? '' : ' disabled') + '><i class="i i-s" data-i="check"></i>Guardar' + (dif ? ' · ' + VH.signo(dif) : '') + '</button></div>';
      }
      cont.innerHTML = h;
      VH.iconos(cont);
      if (animar && !VH.reducido()) {
        cont.querySelectorAll('.renglones .rv').forEach(function (r) { r.classList.add('vh-entra'); });
      }
    }
    function cambioAlguno() { return v.ed && v.ed.some(function (x) { var c = VH.cambio(x); return c.cant || c.precio; }); }
    cont.onclick = function (e) {
      if (VH.editorClic(e, v, function () { pintar(); })) return;
      var b = e.target.closest('[data-acc]');
      if (!b || b.disabled) return;
      var a = b.dataset.acc;
      if (a === 'corregir') api.corregir();
      if (a === 'descartar') { VH.descartar(v); modo = 'ver'; pintar(); }
      if (a === 'guardar') {
        var delta = VH.guardar(v); modo = 'ver'; pintar();
        VH.avisar('Corrección guardada' + (delta ? ' · ' + VH.signo(delta) : ''));
        if (ganchos.guardado) ganchos.guardado(v, delta);
      }
      if (a === 'cambio') api.cambio();
      if (a === 'anular') api.anular();
    };
    var api = {
      v: v,
      modo: function () { return modo; },
      corregir: function () { if (v.estado === 'anulada' || v.tipo === 'cambio') return; VH.empezar(v); modo = 'corregir'; pintar(); },
      cambio: function () { if (v.estado === 'anulada') return; if (ganchos.antesDeCambio) ganchos.antesDeCambio(); VH.abrirCambio(v.tipo === 'cambio' ? null : v, ganchos.cambioHecho); },
      anular: function () { if (v.estado === 'anulada') return; VH.confirmarAnular(v, function () { modo = 'ver'; pintar(); if (ganchos.anulada) ganchos.anulada(v); }); },
      descartar: function () { if (modo === 'corregir') { VH.descartar(v); modo = 'ver'; pintar(); return true; } return false; },
      guardar: function () { var g = cont.querySelector('[data-acc="guardar"]'); if (g && !g.disabled) g.click(); },
      pintar: pintar,
    };
    pintar(!ganchos.quieta);
    return api;
  };

  // ---------------- La venta en el celular (hoja de la 1 y la 2) ----------------
  /* Pinta la venta en una hoja con los tres verbos. op: { el, velo, modo, sinPintar, ganchos } */
  VH.hojaVenta = function (v, op) {
    op = op || {};
    var g = op.ganchos || {}, modo = op.modo || 'ver', capa, el;
    if (op.el) {
      el = op.el;
      capa = op.capa || VH.registrar(op.el, op.velo, {});
      capa.op.alCerrar = alCerrar;
      if (op.capa) VH.mostrar(capa);
    } else {
      capa = VH.abrir({ tipo: 'hoja', html: '', alCerrar: alCerrar });
      el = capa.el;
    }
    function alCerrar() { if (v.ed && modo === 'corregir') VH.descartar(v); if (g.cerrada) g.cerrada(); }
    function rh(x, i) {
      var nom = '<div class="q" style="min-width:0">' + x.nom + '</div>';
      if (modo !== 'corregir') {
        return '<div class="rh">' + VH.foto(x.foto) + nom + '<span class="st num">' + (x.vuelta ? '−' : '') + VH.plata(x.cant * x.precio) + '</span><div class="ed"><span class="d">' +
          (x.vuelta ? 'Volvió · se había pagado ' + VH.plata(x.precio) : VH.cant(x.cant) + ' ' + x.u + ' × ' + VH.plata(x.precio)) + '</span></div></div>';
      }
      var c = VH.cambio(x);
      if (!c.cant) VH.sinRaya(x, 'c');
      if (!c.precio) VH.sinRaya(x, 'p');
      if (!c.cant && !c.precio) VH.sinRaya(x, 's');
      return '<div class="rh">' + VH.foto(x.foto) + nom + '<span class="st num">' + (c.cant || c.precio ? VH.raya(x, 's', VH.plata(x.o.cant * x.o.precio), 'font-size:14px') + ' ' : '') + VH.plata(x.cant * x.precio) + '</span>' +
        '<div class="ed"><span class="cantidad' + (c.cant ? ' tocada' : '') + '"><button data-menos="' + i + '" aria-label="Menos"><i class="i i-s" data-i="minus"></i></button><span class="n">' + VH.cant(x.cant) + '<span class="u">' + x.u + '</span></span>' +
        '<button data-mas="' + i + '" aria-label="Más"><i class="i i-s" data-i="plus"></i></button></span>' +
        (c.cant ? VH.raya(x, 'c', VH.cant(x.o.cant) + ' ' + x.u, 'font-size:14px') : '') +
        (c.precio ? VH.raya(x, 'p', VH.plata(x.o.precio), 'font-size:14px;margin-left:auto') : '') +
        '<span class="precio' + (c.precio ? ' tocada' : '') + '" data-precio="' + i + '"' + (c.cant && !c.precio ? ' style="margin-left:auto"' : '') + '>' + VH.plata(x.precio) + (c.precio ? ' <i class="i i-s" data-i="pencil"></i>' : '') + '</span></div></div>';
    }
    function pintar() {
      var seg = function (m, ico, txt, st) { return '<button data-modo="' + m + '"' + (modo === m ? ' class="elegido"' : '') + (st ? ' style="' + st + '"' : '') + '><i class="i i-s" data-i="' + ico + '"></i>' + txt + '</button>'; };
      var h = '<div class="agarre"></div><div class="hcab">' + VH.mico(v.medio) + '<div style="min-width:0"><div class="t">' + VH.titulo(v) + '</div><div class="d">' + v.hora + ' · ' + VH.MEDIOS[v.medio].nom + ' · ' + v.quien + '</div></div>' +
        '<button class="btn btn-icono chico btn-suave" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
      if (v.estado !== 'anulada') h += '<div class="segmentos">' + (v.tipo === 'cambio' ? '' : seg('corregir', 'square-pen', 'Corregir')) + seg('cambio', 'arrow-left-right', 'Cambio') + seg('anular', 'ban', 'Anular', 'color:var(--error-texto)') + '</div>';
      var filas = modo === 'corregir' ? v.ed : (v.vuelve ? [Object.assign({ vuelta: 1 }, v.vuelve)] : []).concat(v.items);
      h += filas.map(rh).join('');
      if (modo === 'corregir') {
        var dif = VH.difer(v), l = VH.loQueCambia(v);
        h += '<div class="aviso pino" style="margin-top:12px"><i class="i i-s" data-i="history" style="margin-top:2px"></i><span>' +
          (dif ? (v.medio === 'cuenta' ? 'Debe ' + VH.plata(Math.abs(dif)) + (dif > 0 ? ' más' : ' menos') : l[0][0] + ' ' + l[0][1]) + ' · lo de antes queda guardado' : 'Tocá − + o el precio · lo de antes queda tachado') + '</span></div>';
        h += '<div class="barra-accion"><button class="btn btn-accion grande" data-guardar style="width:100%;justify-content:space-between"' + (dif || alguno() ? '' : ' disabled') + '><span><i class="i" data-i="check"></i> Guardar · queda ' + VH.plata(VH.total(v)) + '</span>' +
          (dif ? '<span class="pastilla' + (v._ud !== dif ? ' vh-rebota' : '') + '" style="background:rgba(255,255,255,.2);color:#fff">' + VH.signo(dif) + '</span>' : '') + '</button></div>';
        v._ud = dif;
      } else {
        h += '<div class="resumen-h"><span class="t-etiqueta">' + (v.tipo === 'cambio' ? 'Diferencia' : 'Total') + '</span><span class="t-numero num' + (v.estado === 'anulada' ? ' viejo' : '') + '"><span class="peso">$</span>' + miles(VH.total(v)) + '</span></div>';
        h += v.estado === 'anulada'
          ? '<div class="aviso error" style="margin-top:12px"><i class="i i-s" data-i="ban" style="margin-top:2px"></i><span>Anulada a las ' + v.anuladaA + (v.motivo ? ' · ' + v.motivo.toLowerCase() : '') + '. Queda a la vista, tachada.</span></div>'
          : '<div class="aviso pino" style="margin-top:12px"><i class="i i-s" data-i="history" style="margin-top:2px"></i><span>' + (v.estado === 'corregida' ? 'Corregida a las ' + v.corregidaA + ' · ' + v.nota : 'Se corrige hasta el cierre de hoy') + '</span></div>';
        if (op.el) h += '<div style="height:28px;flex:none"></div>';
      }
      el.innerHTML = h;
      VH.iconos(el);
      var ag = el.querySelector('.agarre');
      VH.arrastrarHoja(ag, el, capa.cerrar);
      if (op.el && !primera) { el.style.top = 'auto'; el.style.maxHeight = '760px'; el.style.overflow = 'auto'; }
      primera = false;
    }
    var primera = !!op.quieta;
    function alguno() { return v.ed && v.ed.some(function (x) { var c = VH.cambio(x); return c.cant || c.precio; }); }
    el.onclick = function (e) {
      if (VH.editorClic(e, v, pintar)) return;
      var b = e.target.closest('[data-modo]');
      if (b) {
        var m = b.dataset.modo;
        if (m === 'corregir') { VH.empezar(v); modo = 'corregir'; pintar(); }
        if (m === 'cambio') { capa.cerrar(); VH.abrirCambio(v.tipo === 'cambio' ? null : v, g.cambioHecho); }
        if (m === 'anular') VH.confirmarAnular(v, function () { capa.cerrar(); if (g.anulada) g.anulada(v); });
        return;
      }
      var gu = e.target.closest('[data-guardar]');
      if (gu && !gu.disabled) {
        var delta = VH.guardar(v);
        modo = 'ver';
        capa.cerrar();
        VH.avisar('Corrección guardada' + (delta ? ' · ' + VH.signo(delta) : ''));
        if (g.guardado) g.guardado(v, delta);
      }
    };
    pintar();
    return { capa: capa, pintar: pintar, v: v, modo: function () { return modo; } };
  };

  // ---------------- Barras por hora ----------------
  VH.HORAS = { 8: 18000, 9: 52000, 10: 71000, 11: 64000, 12: 46000, 16: 58000, 17: 103000 };
  /* Señalar una barra: sale el globo con «10 h · $71.000» y las demás bajan a 40 %. */
  VH.barras = function (cont) {
    if (!cont) return;
    var hs = Array.prototype.slice.call(cont.querySelectorAll('.h'));
    var fijo = cont.querySelector('.globo'), casa = fijo && fijo.parentNode, textoFijo = fijo && fijo.textContent, vFijo = fijo && fijo.style.getPropertyValue('--v');
    var globo = fijo || document.createElement('span');
    if (!fijo) globo.className = 'globo';
    var actual = null;
    function texto(h) {
      var n = Number(h.lastElementChild.textContent);
      if (h.classList.contains('sin')) return n + ' h · cerrado';
      if (h.classList.contains('fut')) return n + ' h · falta';
      return n + ' h · ' + VH.plata(VH.HORAS[n] || 0);
    }
    function senalar(h) {
      if (h === actual) return;
      actual = h;
      var b = h.querySelector('b'), col = h.querySelector('.col, .c');
      globo.textContent = texto(h);
      globo.style.setProperty('--v', h.classList.contains('fut') ? '22%' : h.classList.contains('sin') ? '3%' : (b.style.getPropertyValue('--v') || (b.parentNode.offsetHeight ? Math.round(100 * Array.prototype.reduce.call(col.children, function (a, x) { return a + (x.tagName === 'B' ? x.offsetHeight + 2 : 0); }, 0) / col.offsetHeight) + '%' : '50%')));
      col.appendChild(globo);
      globo.classList.remove('vh-globo'); void globo.offsetWidth; globo.classList.add('vh-globo');
      hs.forEach(function (x) { x.classList.toggle('vh-tenue', x !== h); });
    }
    function salir() {
      actual = null;
      hs.forEach(function (x) { x.classList.remove('vh-tenue'); });
      if (fijo) { globo.textContent = textoFijo; globo.style.setProperty('--v', vFijo); casa.appendChild(globo); globo.classList.remove('vh-globo'); }
      else globo.remove();
    }
    if (VH.esCelu()) {
      cont.style.touchAction = 'none';
      var tocando = false, t;
      var bajo = function (e) {
        var x = document.elementFromPoint(e.clientX, e.clientY), h = x && x.closest('.h');
        if (h && cont.contains(h) && h !== actual) { senalar(h); VH.vibrar(10); }
      };
      cont.addEventListener('pointerdown', function (e) { tocando = true; clearTimeout(t); bajo(e); });
      cont.addEventListener('pointermove', function (e) { if (tocando) bajo(e); });
      var fin = function () { tocando = false; clearTimeout(t); t = setTimeout(salir, 1500); };
      cont.addEventListener('pointerup', fin); cont.addEventListener('pointercancel', fin);
    } else {
      hs.forEach(function (h) { h.addEventListener('mouseenter', function () { senalar(h); }); });
      cont.addEventListener('mouseleave', salir);
    }
  };
  /* Al abrir la pestaña: el total rueda y las barras crecen escalonadas; la marca de ayer, después. */
  VH.entrada = function (total, barras) {
    if (VH.reducido()) return;
    if (total) VH.rodar(total, total.textContent.replace(/\s+/g, ''), 1, 30);
    if (barras) barras.querySelectorAll('.h').forEach(function (h, i) {
      var b = h.querySelector('.col b, .c'); if (!b) return;
      b.classList.add('vh-crece'); b.style.animationDelay = (i * 20) + 'ms';
      var col = h.querySelector('.col'); if (col) col.classList.add('vh-ayer');
    });
    // Terminada la entrada, se quitan las clases: quieta queda igual que antes.
    setTimeout(function () {
      document.querySelectorAll('.vh-crece, .vh-ayer').forEach(function (x) { x.classList.remove('vh-crece', 'vh-ayer'); x.style.animationDelay = ''; });
    }, 900);
  };
})();

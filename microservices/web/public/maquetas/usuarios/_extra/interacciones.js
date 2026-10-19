/* Interacciones de las maquetas de Usuarios (sin librerías). Cada variante lo carga al pie, antes de su
   propio script. Da: los datos ficticios (personas, roles), las capas (diálogo, panel, hoja, menú) que se
   cierran con su botón, tocando afuera y con Escape, la tostada, el menú «Más» y la ficha de una persona. */
(function () {
  var U = window.U = {};
  var celuEl = document.querySelector('.celu');
  U.celu = !!celuEl;
  U.raiz = celuEl || document.body;
  U.quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (U.quieto) document.documentElement.classList.add('u-quieto');

  U.$ = function (s, r) { return (r || document).querySelector(s); };
  U.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  U.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  U.iconos = function (el) { if (window.pintarIconos) window.pintarIconos(el); };
  U.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* nada */ } };
  U.animar = function (el, clase, ms) {
    if (!el) return;
    el.classList.remove(clase); void el.offsetWidth; el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, ms || 700);
  };
  // Algo nuevo en una lista: entra desde abajo y su borde queda verde 1 s.
  U.nuevo = function (el, arriba) {
    U.animar(el, arriba ? 'u-nuevo-arriba' : 'u-nuevo', 500);
    el.classList.add('u-logro');
    setTimeout(function () { el.classList.remove('u-logro'); }, 1000);
    if (U.celu) U.vibrar(10);
  };
  // Algo que se va: se achica y se apaga; después deja de ocupar lugar.
  U.sacar = function (el, cb, clase) {
    if (!el) return;
    el.classList.add(clase || 'u-sale');
    setTimeout(function () { el.remove(); if (cb) cb(); }, U.quieto ? 0 : 210);
  };
  // Un número que cambia: rueda hacia arriba si sube, hacia abajo si baja.
  U.rodar = function (el, valor) {
    if (!el) return;
    var antes = parseInt(el.textContent, 10), ahora = parseInt(valor, 10);
    el.textContent = valor;
    if (!isNaN(antes) && !isNaN(ahora) && antes !== ahora) U.animar(el, ahora > antes ? 'u-rueda-sube' : 'u-rueda-baja', 260);
  };
  U.miles = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };

  /* ---------- Datos ficticios ---------- */
  U.ORDEN_ROLES = ['vendedor', 'comprador', 'recepcion', 'admin', 'gerente'];
  U.ROLES = {
    vendedor: { n: 'Vendedor', i: 'shopping-cart', frase: 'vende, cobra y anula', corto: 'Vende y anula' },
    comprador: { n: 'Comprador', i: 'truck', frase: 'encarga compras y ve costos', corto: 'Pide, listas' },
    recepcion: { n: 'Recepción', i: 'package', frase: 'recibe mercadería y cuenta stock', corto: 'Recibe, cuenta' },
    gerente: { n: 'Gerente', i: 'chart-column', frase: 've los números del negocio', corto: 'Ve los números' },
    admin: { n: 'Administrador', i: 'shield-check', frase: 'autoriza personas y arma roles', corto: 'Autoriza personas y arma roles' }
  };
  // Los 21 permisos, por grupo, con qué roles los tienen y qué dejan hacer.
  U.GRUPOS = ['Vender', 'Catálogo', 'Depósito', 'Negocio'];
  U.PERMISOS = [
    { n: 'Vender', g: 'Vender', r: ['vendedor'], e: 'armar una venta, cobrarla y entregar el comprobante.' },
    { n: 'Anular ventas', g: 'Vender', r: ['vendedor'], e: 'anular una venta del día; el stock vuelve solo.' },
    { n: 'Ver ventas de hoy', g: 'Vender', r: ['vendedor', 'gerente'], e: 'ver las ventas del día de todos, con su medio de pago.' },
    { n: 'Cuenta corriente', g: 'Vender', r: ['gerente'], e: 'cobrar a cuenta y ver lo que debe cada cliente.' },
    { n: 'Ver costos', g: 'Catálogo', r: ['recepcion', 'gerente'], e: 'ver el costo de cada producto y la última factura.' },
    { n: 'Fijar márgenes', g: 'Catálogo', r: ['comprador', 'gerente'], e: 'cambiar el margen de un producto o de una marca entera.' },
    { n: 'Cargar listas', g: 'Catálogo', r: ['comprador'], e: 'subir la lista de precios de un proveedor y aplicarla.' },
    { n: 'Unir duplicados', g: 'Catálogo', r: ['gerente'], e: 'juntar dos productos que son el mismo, con su stock.' },
    { n: 'Registrar ingresos', g: 'Depósito', r: ['recepcion'], e: 'cargar lo que llegó de un proveedor y sumarlo al stock.' },
    { n: 'Ver las compras', g: 'Depósito', r: ['recepcion', 'gerente'], e: 'ver los pedidos a proveedores y en qué estado están.' },
    { n: 'Contar y corregir stock', g: 'Depósito', r: ['recepcion'], e: 'contar una estantería y corregir lo que no coincide.' },
    { n: 'Encargar compras', g: 'Depósito', r: ['comprador'], e: 'armar pedidos a proveedores, mandarlos, cancelarlos y cerrarlos.' },
    { n: 'Ver las anomalías', g: 'Negocio', r: ['recepcion', 'gerente'], e: 'ver los avisos de stock negativo, precios raros y ventas anuladas.' },
    { n: 'Ventas del negocio', g: 'Negocio', r: ['gerente'], e: 'ver cuánto se vendió por día, mes y medio de pago.' },
    { n: 'Ver el resumen', g: 'Negocio', r: ['gerente'], e: 'ver cómo va el negocio: ventas, margen y compras.' },
    { n: 'Quién hizo qué', g: 'Negocio', r: ['gerente'], e: 'ver el registro de lo que hizo cada persona.' },
    { n: 'Exportar', g: 'Negocio', r: ['gerente'], e: 'bajar las ventas y el stock a una planilla.' },
    { n: 'Ver márgenes', g: 'Negocio', r: ['gerente'], e: 'ver la ganancia de cada venta y de cada producto.' },
    { n: 'Cerrar la caja', g: 'Negocio', r: ['gerente'], e: 'cerrar la caja del día y ver las diferencias.' },
    { n: 'Autorizar personas', g: 'Negocio', r: ['admin'], e: 'sumar y desactivar personas y cerrarles las sesiones.' },
    { n: 'Armar roles', g: 'Negocio', r: ['admin'], e: 'dar y quitar roles y cambiar qué deja hacer cada uno.' }
  ];
  U.permisosDe = function (r) { return U.PERMISOS.filter(function (x) { return x.r.indexOf(r) >= 0; }); };
  U.cuantosPermisos = function (r) { return U.permisosDe(r).length; };
  U.PERSONAS = [
    { id: 'ci', n: 'Carlos Illobre', ini: 'CI', t: 't1', mail: 'carlos.ferrebress@gmail.com', roles: ['admin', 'gerente'], yo: true, vivo: false, desde: 'Desde el 12/03/2026',
      sesiones: [{ n: 'Compu del mostrador', i: 'monitor', d: 'Chrome · ahora · esta compu', vivo: true, esta: true }],
      huellas: [{ n: 'Moto G54', d: 'Entró hoy 8:02' }], ultimo: 'cambió el precio de Tarugos nylon S8 × 100 · hoy 9:30' },
    { id: 'gb', n: 'Graciela Benítez', ini: 'GB', t: 't5', mail: 'graciela.benitez.ferre@gmail.com', roles: ['admin', 'gerente'], desde: 'Desde el 12/03/2026',
      sesiones: [{ n: 'Notebook de casa', i: 'laptop', d: 'Chrome · hace 41 días', viejo: true }, { n: 'Galaxy S23', i: 'smartphone', d: 'App · ayer 19:20' }],
      huellas: [{ n: 'Galaxy S23', d: 'Entró ayer 19:20' }], ultimo: 'miró el resumen de octubre · ayer 19:24' },
    { id: 'ms', n: 'Martín Sosa', ini: 'MS', t: 't2', mail: 'martin.sosa.deposito@gmail.com', roles: ['recepcion', 'comprador'], vivo: true, desde: 'Desde el 03/08/2026',
      sesiones: [{ n: 'Compu del depósito', i: 'monitor', d: 'Chrome · ahora', vivo: true }, { n: 'Samsung A34', i: 'smartphone', d: 'App · hace 2 h' }],
      huellas: [{ n: 'Samsung A34', d: 'Entró hoy 7:58' }], ultimo: 'registró el ingreso de Fischer · hoy 9:12',
      puedeFijo: 'Recibe mercadería, cuenta stock, encarga compras y ve costos. <b style="color:var(--tinta)">No vende.</b>' },
    { id: 'lf', n: 'Lucía Fernández', ini: 'LF', t: 't3', mail: 'lucia.fernandez.mostrador@gmail.com', roles: ['vendedor'], vivo: true, desde: 'Desde el 20/05/2026',
      sesiones: [{ n: 'Mostrador', i: 'monitor', d: 'Chrome · ahora', vivo: true }, { n: 'Galaxy A15', i: 'smartphone', d: 'App · hace 3 h' }],
      huellas: [{ n: 'Galaxy A15', d: 'Entró hoy 8:30' }], ultimo: 'vendió Mecha acero rápido HSS 8 mm × 2 un. · hoy 10:38' },
    { id: 'no', n: 'Nahuel Ortiz', ini: 'NO', t: 't4', mail: 'nahuel.ortiz.95@gmail.com', roles: ['vendedor', 'recepcion'], desde: 'Desde el 01/07/2026',
      sesiones: [{ n: 'Moto G32', i: 'smartphone', d: 'App · hace 20 min' }, { n: 'Compu del depósito', i: 'monitor', d: 'Chrome · ayer 18:40' }],
      huellas: [{ n: 'Moto G32', d: 'Entró hoy 8:10' }], ultimo: 'contó la estantería B · hoy 10:15' },
    { id: 'sa', n: 'Sofía Acosta', ini: 'SA', t: 't1', mail: 'sofi.acosta.ventas@gmail.com', roles: ['vendedor'], nuevo: true, desde: 'Autorizada el 15/10/2026',
      sesiones: [], huellas: [], ultimo: null },
    { id: 'dp', n: 'Diego Pereyra', ini: 'DP', t: 'apagado', mail: 'dpereyra.mostrador@gmail.com', roles: ['vendedor'], inactivo: true, desde: 'Desactivado el 30/09/2026',
      sesiones: [], huellas: [], ultimo: 'cerró la caja del 29/09 · hace 20 días' }
  ];
  // Quienes se van sumando al autorizar (uno por vez).
  U.NUEVOS = [
    { id: 'rg', n: 'Ramiro Giménez', ini: 'RG', t: 't3', mail: 'ramiro.gimenez.ferre@gmail.com', aparato: 'Moto E13' },
    { id: 'jr', n: 'Julieta Romero', ini: 'JR', t: 't4', mail: 'juli.romero.arq@gmail.com', aparato: 'iPhone 12' },
    { id: 'pl', n: 'Pablo Ledesma', ini: 'PL', t: 't2', mail: 'pablo.ledesma.fz@gmail.com', aparato: 'Galaxy A05' },
    { id: 'vq', n: 'Valeria Quiroga', ini: 'VQ', t: 't5', mail: 'vale.quiroga.caja@gmail.com', aparato: 'Moto G24' }
  ];
  U.persona = function (id) { return U.PERSONAS.filter(function (p) { return p.id === id; })[0]; };
  U.primerNombre = function (p) { return p.n.split(' ')[0]; };
  U.siguienteNuevo = function () {
    var usados = U.PERSONAS.map(function (p) { return p.mail; });
    return U.NUEVOS.filter(function (x) { return usados.indexOf(x.mail) < 0; })[0] ||
      { id: 'x' + Date.now(), n: 'Gustavo Medina', ini: 'GM', t: 't1', mail: 'gus.medina.' + U.PERSONAS.length + '@gmail.com', aparato: 'Moto G04' };
  };
  U.agregarPersona = function (x, roles) {
    var p = { id: x.id, n: x.n, ini: x.ini, t: x.t, mail: x.mail, roles: roles.slice(), nuevo: true, desde: 'Autorizado hoy', sesiones: [], huellas: [], ultimo: null };
    U.PERSONAS.push(p);
    return p;
  };
  U.puedeN = function (p) {
    if (p.inactivo) return 0;
    return U.PERMISOS.filter(function (x) { return x.r.some(function (r) { return p.roles.indexOf(r) >= 0; }); }).length;
  };
  U.puedeTexto = function (p) {
    if (p.puedeFijo) return p.puedeFijo;
    if (!p.roles.length) return 'Sin roles: puede entrar pero no hacer nada.';
    var f = U.ORDEN_ROLES.filter(function (r) { return p.roles.indexOf(r) >= 0; }).map(function (r) { return U.ROLES[r].frase; });
    var t = f.length > 1 ? f.slice(0, -1).join(', ') + ' y ' + f[f.length - 1] : f[0];
    t = t.charAt(0).toUpperCase() + t.slice(1) + '.';
    if (p.roles.indexOf('vendedor') < 0) t += ' <b style="color:var(--tinta)">No vende.</b>';
    return t;
  };
  U.rolesOrdenados = function (p) { return p.roles.filter(function (r) { return r === 'admin'; }).concat(p.roles.filter(function (r) { return r !== 'admin'; })); };
  U.rolHTML = function (r) { var R = U.ROLES[r]; return '<span class="rol' + (r === 'admin' ? ' admin' : '') + '"><i data-i="' + R.i + '"></i>' + R.n + '</span>'; };
  U.avHTML = function (p, tam) { return '<span class="av ' + (tam || '') + ' ' + (p.inactivo ? 'apagado' : p.t) + '">' + p.ini + (p.vivo ? '<span class="vivo"></span>' : '') + '</span>'; };

  /* ---------- Capas ---------- */
  var pila = [];
  U.capa = function (o) {
    var velo = null;
    if (o.velo !== false) {
      velo = document.createElement('div');
      velo.className = 'u-velo' + (o.tipo === 'menu' ? ' transparente' : '');
      U.raiz.appendChild(velo);
    }
    var el = document.createElement('div');
    el.className = 'u-' + (o.tipo || 'dialogo') + (o.clase ? ' ' + o.clase : '');
    el.setAttribute('role', o.tipo === 'menu' ? 'menu' : 'dialog');
    el.innerHTML = (o.tipo === 'hoja' ? '<div class="asa"></div>' : '') + o.html;
    U.raiz.appendChild(el);
    U.iconos(el);
    if (o.ancla) ubicar(el, o.ancla, o.lado);
    var capa = { el: el, velo: velo, cerrada: false };
    capa.cerrar = function (motivo) {
      if (capa.cerrada) return;
      capa.cerrada = true;
      pila.splice(pila.indexOf(capa), 1);
      el.classList.remove('abierto');
      if (velo) velo.classList.remove('abierto');
      setTimeout(function () { el.remove(); if (velo) velo.remove(); }, U.quieto ? 0 : 330);
      if (o.alCerrar) o.alCerrar(motivo);
    };
    if (velo) velo.addEventListener('click', function () { capa.cerrar('afuera'); });
    el.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) capa.cerrar('boton'); });
    if (o.tipo === 'hoja') arrastrarParaCerrar(capa);
    pila.push(capa);
    void el.offsetWidth;
    requestAnimationFrame(function () { el.classList.add('abierto'); if (velo) velo.classList.add('abierto'); });
    var foco = el.querySelector('[autofocus]');
    if (foco) setTimeout(function () { foco.focus(); if (foco.select) foco.select(); }, 30);
    return capa;
  };
  U.cerrarTodo = function () { pila.slice().reverse().forEach(function (c) { c.cerrar('todo'); }); };
  U.hayCapa = function () { return pila.length > 0; };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pila.length) { e.preventDefault(); pila[pila.length - 1].cerrar('escape'); }
  });
  function ubicar(el, ancla, lado) {
    var r = ancla.getBoundingClientRect(), base = U.celu ? U.raiz.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    var w = el.offsetWidth, h = el.offsetHeight, x, y;
    if (lado === 'derecha') { x = r.right + 8 - base.left; y = r.top - base.top; }
    else if (lado === 'arriba') { x = r.left - base.left; y = r.top - base.top - h - 8; }
    else { x = r.right - base.left - w; y = r.bottom - base.top + 6; }
    x = Math.max(8, Math.min(x, base.width - w - 8));
    y = Math.max(8, Math.min(y, base.height - h - 8));
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }
  function arrastrarParaCerrar(capa) {
    var el = capa.el, asa = el.querySelector('.asa'), y0 = null, dy = 0;
    if (!asa) return;
    asa.style.touchAction = 'none';
    asa.style.cursor = 'grab';
    asa.style.padding = '0';
    asa.addEventListener('pointerdown', function (e) { y0 = e.clientY; dy = 0; el.classList.add('arrastrando'); asa.setPointerCapture(e.pointerId); });
    asa.addEventListener('pointermove', function (e) { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = 'translateY(' + dy + 'px)'; });
    function fin() { if (y0 === null) return; y0 = null; el.classList.remove('arrastrando'); el.style.transform = ''; if (dy > 100) capa.cerrar('arrastre'); }
    asa.addEventListener('pointerup', fin); asa.addEventListener('pointercancel', fin);
  }

  /* ---------- Tostada ---------- */
  var zona = null, ultima = null;
  U.tostada = function (texto, op) {
    op = op || {};
    if (!zona) { zona = document.createElement('div'); zona.className = 'u-tostadas'; U.raiz.appendChild(zona); }
    if (ultima) ultima.quitar();
    var t = document.createElement('div');
    t.className = 'tostada' + (op.mal ? ' mal' : '');
    t.setAttribute('role', 'status');
    t.innerHTML = '<i class="i" data-i="' + (op.icono || (op.mal ? 'circle-alert' : 'circle-check')) + '"></i><span>' + texto + '</span>' +
      (op.deshacer ? '<button class="deshacer">Deshacer' + (U.celu ? '' : ' · Ctrl Z') + '</button>' : '');
    zona.appendChild(t);
    U.iconos(t);
    requestAnimationFrame(function () { t.classList.add('abierto'); });
    var obj = { el: t, deshacer: op.deshacer };
    obj.quitar = function () { clearTimeout(obj.timer); t.classList.remove('abierto'); setTimeout(function () { t.remove(); }, 220); if (ultima === obj) ultima = null; };
    obj.timer = setTimeout(obj.quitar, op.ms || 4000);
    if (op.deshacer) t.querySelector('.deshacer').addEventListener('click', function () { obj.quitar(); op.deshacer(); });
    ultima = obj;
    return obj;
  };
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && ultima && ultima.deshacer && !/INPUT|TEXTAREA/.test((e.target || {}).tagName)) {
      e.preventDefault(); var d = ultima.deshacer; ultima.quitar(); d();
    }
  });

  /* ---------- «Más» ---------- */
  var MAS = [['anomalias', 'triangle-alert', 'Anomalías', '<span class="pastilla urgente">3</span>'], ['procesos', 'workflow', 'Procesos', ''],
    ['mejoras-y-errores', 'bug', 'Mejoras y errores', ''], ['configuracion', 'settings', 'Configuración', '']];
  U.abrirMas = function (ancla) {
    if (U.celu) {
      return U.capa({ tipo: 'hoja', html: '<div class="u-cab"><div class="t-seccion">Más</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
        MAS.map(function (m) { return '<div class="renglon" data-ir="' + m[0] + '" style="grid-template-columns:44px 1fr auto;padding:10px 12px;margin:0"><span class="foto-icono" style="width:44px;height:44px"><i class="i" data-i="' + m[1] + '"></i></span><div class="titulo">' + m[2] + '</div>' + (m[3] || '<i class="i" data-i="chevron-right" style="color:var(--texto-3)"></i>') + '</div>'; }).join('') });
    }
    return U.capa({ tipo: 'menu', ancla: ancla, lado: 'derecha', html: MAS.map(function (m) { return '<button class="u-op" data-ir="' + m[0] + '"><i class="i" data-i="' + m[1] + '"></i>' + m[2] + m[3] + '</button>'; }).join('') });
  };
  document.addEventListener('click', function (e) {
    var m = e.target.closest('[data-mas]');
    if (m) { e.preventDefault(); U.abrirMas(m); }
  });

  /* ---------- Diálogos comunes ---------- */
  U.confirmar = function (o) {
    var c = U.capa({ tipo: 'dialogo', html:
      '<div class="u-cab"><div class="t-seccion">' + o.titulo + '</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="t-cuerpo" style="color:var(--texto-2)">' + o.texto + '</div>' + (o.extra || '') +
      '<div class="u-pie">' + (o.soloOk ? '' : '<button class="btn btn-fantasma" data-cerrar>Cancelar</button>') +
      '<button class="btn ' + (o.peligro ? 'btn-peligro' : o.soloOk ? '' : 'btn-accion') + '" data-ok>' + (o.boton || 'Entendido') + '</button></div>',
      alCerrar: o.alCerrar });
    c.el.querySelector('[data-ok]').addEventListener('click', function () { c.cerrar('ok'); if (o.alOk) o.alOk(); });
    return c;
  };

  // Elegir los roles de una persona (o de alguien nuevo). Devuelve la lista con alGuardar.
  U.filasRoles = function (sel, bloqAdmin) {
    return '<div class="u-lista-roles">' + U.ORDEN_ROLES.map(function (r) {
      var R = U.ROLES[r], si = sel.indexOf(r) >= 0, bl = bloqAdmin && r === 'admin';
      return '<div class="u-rolfila' + (si ? ' si' : '') + (bl ? ' bloq' : '') + '" data-rol="' + r + '"><span class="casilla' + (si ? ' si' : '') + (bl ? ' bloq' : '') + '"></span>' +
        '<span class="ico"><i class="i" data-i="' + R.i + '"></i></span><div><div class="n">' + R.n + '</div><div class="d">' + R.corto + '</div></div><span class="t-detalle">' + U.cuantosPermisos(r) + ' permisos</span></div>';
    }).join('') + '</div>' + (bloqAdmin ? '<div class="t-detalle lineal"><i class="i i-s" data-i="lock-keyhole"></i>Tu Administrador no te lo podés quitar vos.</div>' : '');
  };
  U.conectarFilasRoles = function (cont, sel) {
    cont.addEventListener('click', function (e) {
      var f = e.target.closest('.u-rolfila'); if (!f) return;
      if (f.classList.contains('bloq')) { U.animar(f, 'u-no', 260); return; }
      var r = f.getAttribute('data-rol'), i = sel.indexOf(r), cas = f.querySelector('.casilla');
      if (i >= 0) sel.splice(i, 1); else sel.push(r);
      f.classList.toggle('si', i < 0); cas.classList.toggle('si', i < 0);
      if (i < 0) U.animar(cas, 'u-pop', 260);
      if (U.celu) U.vibrar(10);
    });
  };
  U.dialogoRoles = function (p, alGuardar) {
    var sel = p.roles.slice();
    var c = U.capa({ tipo: U.celu ? 'hoja' : 'dialogo', html:
      '<div class="u-cab"><div class="t-seccion">Roles de ' + U.esc(U.primerNombre(p)) + '</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      U.filasRoles(sel, p.yo) +
      '<div class="u-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-guardar>Guardar</button></div>' });
    U.conectarFilasRoles(c.el, sel);
    c.el.querySelector('[data-guardar]').addEventListener('click', function () { c.cerrar('ok'); alGuardar(sel); });
    return c;
  };

  // Autorizar a alguien: nombre, correo de Google y roles. Un correo repetido muestra el error en el lugar.
  U.dialogoAutorizar = function (alAutorizar, previo) {
    var x = previo || U.siguienteNuevo(), sel = ['vendedor'];
    var c = U.capa({ tipo: U.celu ? 'hoja' : 'dialogo', html:
      '<div class="u-cab"><div class="t-seccion">Autorizar a alguien</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<label><span class="u-et">Nombre</span><input class="u-input" data-nombre value="' + U.esc(x.n) + '"></label>' +
      '<label><span class="u-et">Correo de Google</span><input class="u-input" data-mail type="email" autofocus value="' + U.esc(x.mail) + '"><span class="u-error u-oculto" data-error></span></label>' +
      '<div><span class="u-et">Qué va a hacer</span>' + U.filasRoles(sel, false) + '</div>' +
      '<div class="aviso pino"><i class="i i-s" data-i="info" style="margin-top:2px"></i><span>Entra con ese Google, sin contraseña. Hasta que entre, figura «No entró aún».</span></div>' +
      '<div class="u-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-ok><i class="i i-s" data-i="user-plus"></i>Autorizar</button></div>' });
    U.conectarFilasRoles(c.el, sel);
    var mail = c.el.querySelector('[data-mail]'), err = c.el.querySelector('[data-error]');
    function ok() {
      var m = mail.value.trim().toLowerCase(), n = c.el.querySelector('[data-nombre]').value.trim() || m.split('@')[0];
      var ya = U.PERSONAS.filter(function (p) { return p.mail === m; })[0];
      var msj = !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(m) ? 'Escribí un correo completo, como nombre@gmail.com.' :
        ya ? 'Ese correo ya está autorizado: es de ' + ya.n + '.' : !sel.length ? 'Elegí al menos un rol.' : '';
      if (msj) { err.innerHTML = '<i class="i i-s" data-i="circle-alert"></i>' + msj; U.iconos(err); err.classList.remove('u-oculto'); mail.classList.toggle('mal', !!(ya || msj.indexOf('correo') >= 0)); U.animar(mail, 'u-no', 260); return; }
      var ini = n.split(/\s+/).map(function (s) { return s.charAt(0); }).join('').slice(0, 2).toUpperCase();
      var datos = { id: x.mail === m ? x.id : 'p' + Date.now(), n: n, ini: ini, t: x.t || 't3', mail: m };
      c.cerrar('ok');
      alAutorizar(U.agregarPersona(datos, sel));
    }
    mail.addEventListener('input', function () { err.classList.add('u-oculto'); mail.classList.remove('mal'); });
    c.el.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); ok(); } });
    c.el.querySelector('[data-ok]').addEventListener('click', ok);
    return c;
  };

  // Los permisos agrupados, prendidos los que cumplen tiene(permiso).
  U.permisosHTML = function (tiene) {
    return U.GRUPOS.map(function (g) {
      var ps = U.PERMISOS.filter(function (x) { return x.g === g; });
      var si = ps.filter(tiene).length;
      return '<div><div class="u-et" style="display:flex;justify-content:space-between">' + g + '<span style="font-weight:600">' + si + ' de ' + ps.length + '</span></div><div class="roles">' +
        ps.map(function (x) { var s = tiene(x); return '<span class="rol" style="' + (s ? 'background:var(--pino-suave);color:var(--pino-texto)' : 'background:transparent;border:1px solid var(--borde);color:var(--texto-3)') + '">' + (s ? '<i data-i="check"></i>' : '') + x.n + '</span>'; }).join('') + '</div></div>';
    }).join('');
  };
  U.dialogoPuede = function (p) {
    return U.capa({ tipo: U.celu ? 'hoja' : 'dialogo', html:
      '<div class="u-cab"><div class="t-seccion">' + U.esc(U.primerNombre(p)) + ' puede ' + U.puedeN(p) + ' de 21</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="t-detalle">Por sus roles: ' + (p.roles.map(function (r) { return U.ROLES[r].n; }).join(', ') || 'ninguno') + '.</div>' +
      U.permisosHTML(function (x) { return !p.inactivo && x.r.some(function (r) { return p.roles.indexOf(r) >= 0; }); }) });
  };
  // Roles y permisos: cada rol con quién lo tiene; al tocarlo, sus permisos.
  U.dialogoRolesYPermisos = function () {
    var c = U.capa({ tipo: U.celu ? 'hoja' : 'dialogo', clase: 'u-ancho', html:
      '<div class="u-cab"><div class="t-seccion">Roles y permisos</div><button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i i-s" data-i="x"></i></button></div>' +
      '<div class="t-detalle">Tocá un rol para ver qué deja hacer. Quien tiene varios, suma lo de todos.</div>' +
      '<div class="u-lista-roles">' + U.ORDEN_ROLES.map(function (r) {
        var R = U.ROLES[r], quien = U.PERSONAS.filter(function (p) { return !p.inactivo && p.roles.indexOf(r) >= 0; });
        return '<div class="u-rolfila" data-ver="' + r + '" style="grid-template-columns:36px 1fr auto"><span class="ico"><i class="i" data-i="' + R.i + '"></i></span><div><div class="n">' + R.n + ' <span class="t-detalle">· ' + U.cuantosPermisos(r) + ' permisos</span></div><div class="d">' + quien.map(function (p) { return U.primerNombre(p); }).join(', ') + '</div></div><i class="i u-chev" data-i="chevron-down" style="color:var(--texto-3)"></i></div>' +
          '<div class="u-oculto" data-perm="' + r + '" style="display:grid;gap:10px;padding:4px 4px 8px">' + U.permisosHTML(function (x) { return x.r.indexOf(r) >= 0; }) + '</div>';
      }).join('') + '</div>' });
    c.el.style.width = U.celu ? '' : '560px';
    c.el.addEventListener('click', function (e) {
      var f = e.target.closest('[data-ver]'); if (!f) return;
      var r = f.getAttribute('data-ver'), box = c.el.querySelector('[data-perm="' + r + '"]'), abre = box.classList.contains('u-oculto');
      U.$$('[data-perm]', c.el).forEach(function (b) { b.classList.add('u-oculto'); });
      U.$$('[data-ver]', c.el).forEach(function (b) { b.classList.remove('si'); var ch = b.querySelector('.u-chev'); if (ch) ch.classList.remove('girado'); });
      if (abre) { box.classList.remove('u-oculto'); U.animar(box, 'u-nuevo', 400); f.classList.add('si'); f.querySelector('.u-chev').classList.add('girado'); }
    });
    return c;
  };

  /* ---------- Ficha de una persona (compu) ---------- */
  function dispHTML(d, k, tipo) {
    return '<div class="disp' + (d.viejo ? ' viejo' : '') + '" data-disp="' + tipo + k + '"><span class="ico"><i class="i" data-i="' + (tipo === 'h' ? 'fingerprint' : d.i) + '"></i>' + (d.vivo ? '<span class="vivo"></span>' : '') + '</span>' +
      '<div><div class="n">' + d.n + '</div><div class="d"' + (d.viejo ? ' style="color:var(--urgente-texto)"' : '') + '>' + d.d + '</div></div>' +
      '<button class="btn chico btn-suave" data-accion="' + (tipo === 'h' ? 'quitar-huella' : 'cerrar-sesion') + '" data-k="' + k + '">' + (tipo === 'h' ? 'Quitar' : 'Cerrar') + '</button></div>';
  }
  U.fichaHTML = function (p, conCerrar) {
    var h = '<div class="quien">' + U.avHTML(p, 'l') + '<div class="grow"><div class="nombre">' + U.esc(p.n) + (p.yo ? ' <span class="yo" style="vertical-align:3px">Vos</span>' : '') + '</div><div class="t-detalle ellipsis">' + U.esc(p.mail) + '</div><div class="t-detalle">' + p.desde + '</div></div>' +
      (conCerrar ? '<button class="btn btn-suave btn-icono chico" data-cerrar aria-label="Cerrar" style="align-self:flex-start"><i class="i i-s" data-i="x"></i></button>' : '') + '</div>';
    h += '<div class="sep"></div><div><h3>Roles <button class="btn btn-suave chico" style="min-height:32px" data-accion="cambiar"' + (p.inactivo ? ' disabled' : '') + '><i class="i i-s" data-i="pencil"></i>Cambiar <span class="kbd">R</span></button></h3>' +
      '<div class="roles" style="margin-top:8px">' + (p.roles.length ? U.rolesOrdenados(p).map(U.rolHTML).join('') : '<span class="t-detalle">Sin roles</span>') + '</div>' +
      '<div class="puede" style="margin-top:8px">' + (p.inactivo ? 'Inactivo: no puede entrar. Sus ventas y movimientos quedan como estaban.' : U.puedeTexto(p)) + '</div></div><div class="sep"></div>';
    if (p.inactivo) {
      h += '<div class="aviso" style="background:var(--hundido);color:var(--texto-2)"><i class="i i-s" data-i="user-x" style="margin-top:2px"></i><span>No tiene sesiones ni celulares con huella. Si lo reactivás, entra de nuevo con su Google.</span></div>';
    } else if (p.nuevo && !p.sesiones.length) {
      h += '<div class="aviso urgente"><i class="i i-s" data-i="hourglass" style="margin-top:2px"></i><span><b>Todavía no entró.</b> Avisale que abra la app y entre con ' + U.esc(p.mail) + '.</span></div>';
    } else {
      h += '<div><h3>Sesiones abiertas (' + p.sesiones.length + ')</h3><div style="margin-top:8px">' + (p.sesiones.length ? p.sesiones.map(function (d, k) { return dispHTML(d, k, 's'); }).join('') : '<div class="t-detalle">Ninguna abierta.</div>') + '</div></div>';
      h += '<div><h3>Celular con huella (' + p.huellas.length + ')</h3><div style="margin-top:8px">' + (p.huellas.length ? p.huellas.map(function (d, k) { return dispHTML(d, k, 'h'); }).join('') : '<div class="t-detalle">Ninguno.</div>') + '</div></div>';
    }
    if (p.ultimo) h += '<div class="t-detalle" style="display:flex;gap:8px;align-items:center"><i class="i i-s" data-i="history"></i>Último: ' + p.ultimo + '</div>';
    h += '<div class="pie-ficha">' + (p.inactivo ? '<button class="btn chico" style="flex:1" data-accion="reactivar"><i class="i i-s" data-i="user-check"></i>Reactivar</button>' :
      '<button class="btn btn-peligro chico" style="flex:1" data-accion="desactivar"><i class="i i-s" data-i="user-x"></i>Desactivar</button>') +
      '<button class="btn btn-fantasma chico" data-ir="actividad">Todo lo que hizo</button></div>';
    return h;
  };

  // Lo que se toca dentro de una ficha. hooks.cambio(p, que, dato) avisa a la variante para que actualice lo suyo.
  U.accionesFicha = function (cont, getP, hooks) {
    cont.addEventListener('click', function (e) {
      var b = e.target.closest('[data-accion]'); if (!b || b.disabled) return;
      var p = getP(), a = b.getAttribute('data-accion'), k = +b.getAttribute('data-k');
      if (a === 'cambiar') U.dialogoRoles(p, function (sel) { var antes = p.roles.slice(); p.roles = sel; delete p.puedeFijo; hooks.cambio(p, 'roles', antes); });
      else if (a === 'cerrar-sesion') {
        var s = p.sesiones[k];
        if (s.esta) { U.tostada('Es esta compu: para salir, usá Salir abajo a la izquierda.', { mal: true, icono: 'info' }); return; }
        U.sacar(b.closest('.disp'), function () {
          p.sesiones.splice(k, 1); if (!p.sesiones.some(function (x) { return x.vivo; })) p.vivo = false;
          hooks.cambio(p, 'sesion', s);
          U.tostada('Cerraste la sesión de ' + U.primerNombre(p) + ' en ' + s.n + '. Ahí vuelve a la entrada.', { deshacer: function () { p.sesiones.splice(k, 0, s); if (s.vivo) p.vivo = true; hooks.cambio(p, 'sesion-vuelve', s); } });
        });
      } else if (a === 'quitar-huella') {
        var h = p.huellas[k];
        U.sacar(b.closest('.disp'), function () {
          p.huellas.splice(k, 1); hooks.cambio(p, 'huella', h);
          U.tostada('El ' + h.n + ' de ' + U.primerNombre(p) + ' ya no entra con huella.', { deshacer: function () { p.huellas.splice(k, 0, h); hooks.cambio(p, 'huella-vuelve', h); } });
        });
      } else if (a === 'desactivar') U.desactivar(p, function () { hooks.cambio(p, 'estado'); });
      else if (a === 'reactivar') { p.inactivo = false; p.t = p.tAntes || 't4'; p.desde = 'Reactivado hoy'; hooks.cambio(p, 'estado'); U.tostada(U.primerNombre(p) + ' puede volver a entrar con su Google.'); }
    });
  };
  U.desactivar = function (p, alOk) {
    if (p.yo) return U.confirmar({ titulo: 'No te podés desactivar vos', soloOk: true, texto: 'Pedile a otra persona que administre que lo haga. Así el negocio nunca queda sin nadie que autorice.' });
    U.confirmar({ titulo: '¿Desactivar a ' + U.esc(U.primerNombre(p)) + '?', peligro: true, boton: 'Desactivar',
      texto: 'Se cierran sus ' + (p.sesiones.length === 1 ? 'sesión' : p.sesiones.length + ' sesiones') + ' y no puede volver a entrar. Lo que hizo queda registrado y lo podés reactivar cuando quieras.',
      alOk: function () {
        p.tAntes = p.t; p.inactivo = true; p.vivo = false; p.sesiones = []; p.huellas = []; p.desde = 'Desactivado hoy';
        alOk(); U.tostada(U.primerNombre(p) + ' quedó inactivo y se cerraron sus sesiones.');
      } });
  };
})();

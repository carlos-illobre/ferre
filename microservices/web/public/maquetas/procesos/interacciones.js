/* Procesos · lo común a las seis maquetas para que se puedan tocar.
   window.PI: capas (hoja, diálogo, menú), tostada, el marco (menú y «Más»), el estado del borrador,
   el historial (deshacer y rehacer), y las cuentas del dibujo (orden de los pasos, avisos, lugar libre).
   No dibuja nada al cargar: quieta, la maqueta se ve igual que sin este archivo. */
(function () {
  var PI = window.PI = {};
  var celu = function () { return document.querySelector('.celu'); };
  var reducir = function () { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; };
  PI.reducir = reducir;
  PI.esCelu = function () { return !!celu(); };
  PI.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* sin vibración */ } };
  function pintar(el) { if (window.pintarIconos) pintarIconos(el); if (window.pintarFiguras) pintarFiguras(); }
  PI.pintar = pintar;
  PI.esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  PI.animar = function (el, clase) {
    if (!el) return;
    el.classList.remove(clase); void el.getBoundingClientRect(); el.classList.add(clase);
    setTimeout(function () { el.classList.remove(clase); }, 1100);
  };

  /* ---------- Capas ---------- */
  var pila = [];
  PI.abrir = function (op) {
    var capa = document.createElement('div');
    capa.className = 'pi-capa pi-' + op.tipo + (celu() ? ' pi-en-celu' : '');
    capa.innerHTML = '<div class="pi-velo" data-cerrar></div><div class="pi-caja ' + (op.clase || '') + '" role="dialog" aria-modal="true"' + (op.titulo ? ' aria-label="' + PI.esc(op.titulo) + '"' : '') + '>' +
      (op.tipo === 'hoja' ? '<div class="pi-agarre"></div>' : '') + op.html + '</div>';
    (celu() || document.body).appendChild(capa);
    pintar(capa);
    var caja = capa.querySelector('.pi-caja');
    if (op.tipo === 'menu') posicionar(caja, op.ancla, op.lado);
    capa.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cerrar]');
      if (c && capa.contains(c)) { e.preventDefault(); PI.cerrar(capa); }
    });
    capa._alCerrar = op.alCerrar;
    pila.push(capa);
    void capa.offsetWidth;
    capa.classList.add('abierta');
    var f = caja.querySelector('[data-foco]');
    if (f) setTimeout(function () { f.focus(); colocarAlFinal(f); }, 30);
    return capa;
  };
  PI.cerrar = function (capa) {
    capa = capa || pila[pila.length - 1];
    if (!capa || capa._cerrando) return;
    capa._cerrando = true;
    pila.splice(pila.indexOf(capa), 1);
    capa.classList.remove('abierta'); capa.classList.add('cerrando');
    setTimeout(function () { capa.remove(); }, reducir() ? 0 : 220);
    if (capa._alCerrar) capa._alCerrar();
  };
  PI.cerrarTodo = function () { pila.slice().forEach(function (c) { PI.cerrar(c); }); };
  PI.hayCapa = function () { return pila.length > 0; };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); PI.cerrar(); }
  }, true);
  function colocarAlFinal(el) {
    if (!el.isContentEditable) return;
    var r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
    var s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  PI.colocarAlFinal = colocarAlFinal;
  function posicionar(caja, ancla, lado) {
    if (!ancla) return;
    var marco = celu(), base = marco ? marco.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    var r = ancla.getBoundingClientRect(), w = caja.offsetWidth, h = caja.offsetHeight, x, y;
    if (lado === 'derecha') { x = r.right + 8; y = r.top; }
    else if (lado === 'arriba') { x = r.left; y = r.top - h - 8; }
    else { x = r.left; y = r.bottom + 6; }
    x -= base.left; y -= base.top;
    if (x + w > base.width - 8) x = Math.max(8, (r.right - base.left) - w);
    if (y + h > base.height - 8) y = Math.max(8, base.height - h - 8);
    caja.style.left = x + 'px'; caja.style.top = y + 'px';
  }
  /* Menú chico (compu) u hoja (celu) con renglones. items: [{t, d, i | fig, activo, ir, accion, kbd} | '-' | {et}] */
  PI.menu = function (ancla, items, op) {
    op = op || {};
    var hoja = op.hoja != null ? op.hoja : !!celu();
    var html = (hoja && op.titulo ? '<div class="pi-cab"><b>' + op.titulo + '</b><button class="pi-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' : '') +
      items.map(function (it, n) {
        if (it === '-') return '<div class="pi-linea"></div>';
        if (it.et) return '<span class="pi-et">' + it.et + '</span>';
        var ico = it.fig ? '<i class="i" data-fig="' + it.fig + '"></i>' : (it.i ? '<i class="i" data-i="' + it.i + '"></i>' : '');
        if (hoja && ico) ico = '<span class="pi-ico">' + ico + '</span>';
        return '<button class="pi-item' + (it.activo ? ' activo' : '') + '" data-n="' + n + '"' + (it.ir ? ' data-ir="' + it.ir + '"' : '') + '>' + ico +
          '<span class="tx">' + it.t + (it.d ? '<small>' + it.d + '</small>' : '') + '</span>' +
          (it.kbd && !hoja ? '<span class="kbd">' + it.kbd + '</span>' : '') + (it.tilde ? '<i class="i i-s tilde" data-i="check"></i>' : '') +
          (hoja && it.ir ? '<i class="i i-s" data-i="chevron-right" style="margin-left:auto"></i>' : '') + '</button>';
      }).join('');
    var capa = PI.abrir({ tipo: hoja ? 'hoja' : 'menu', html: html, ancla: ancla, lado: op.lado, clase: op.clase, titulo: op.titulo });
    capa.addEventListener('click', function (e) {
      var b = e.target.closest('.pi-item'); if (!b) return;
      var it = items[+b.getAttribute('data-n')];
      PI.cerrar(capa);
      if (it.accion) it.accion(it);
    });
    return capa;
  };

  /* ---------- Tostada ---------- */
  var caja;
  PI.tostada = function (texto, op) {
    op = op || {};
    if (!caja || !caja.isConnected) { caja = document.createElement('div'); caja.className = 'pi-tostadas'; (celu() || document.body).appendChild(caja); }
    caja.innerHTML = '';
    var t = document.createElement('div');
    t.className = 'tostada'; t.setAttribute('role', 'status');
    t.innerHTML = '<i class="i" data-i="' + (op.i || 'circle-check') + '"></i><span>' + texto + '</span>' + (op.accion ? '<button class="pi-tostada-accion">' + op.accion + '</button>' : '');
    caja.appendChild(t); pintar(t);
    if (op.accion) t.querySelector('button').addEventListener('click', function () { quitar(); op.alHacer && op.alHacer(); });
    var reloj = setTimeout(quitar, op.dura || 3600);
    function quitar() { clearTimeout(reloj); t.classList.add('sale'); setTimeout(function () { t.remove(); }, reducir() ? 0 : 200); }
    return t;
  };

  /* ---------- El marco: menú de la aplicación y «Más» ---------- */
  PI.MAS = [
    { t: 'Anomalías', d: '3 para revisar', i: 'triangle-alert', ir: 'anomalias' },
    { t: 'Procesos', d: 'Cómo se hace cada tarea', i: 'workflow', ir: 'procesos', activo: true },
    { t: 'Mejoras y errores', d: 'Lo que pidieron y lo que falló', i: 'bug', ir: 'mejoras-y-errores' },
    { t: 'Configuración', d: 'Negocio, impresora y copias', i: 'settings', ir: 'configuracion' }
  ];
  PI.menuMas = function (ancla, lado) { return PI.menu(ancla, PI.MAS, { titulo: 'Más', lado: lado || 'derecha' }); };
  PI.marco = function () {
    var destinos = ['vender', 'productos', 'stock', 'resumen'];
    var items = document.querySelectorAll('.lateral .nav-item, .nav-inferior a');
    var porLugar = { lateral: 0, inferior: 0 };
    Array.prototype.forEach.call(items, function (a) {
      var lugar = a.closest('.lateral') ? 'lateral' : 'inferior', n = porLugar[lugar]++;
      a.setAttribute('role', 'button'); a.setAttribute('tabindex', '0'); a.style.cursor = 'pointer';
      if (n < 4) a.setAttribute('data-ir', destinos[n]);
      else a.addEventListener('click', function (e) { e.preventDefault(); PI.menuMas(a, lugar === 'lateral' ? 'derecha' : 'arriba'); });
    });
  };

  /* ---------- Procesos guardados (el selector del título) ---------- */
  PI.PROCESOS = [
    { t: 'Venta en el mostrador', d: 'Vigente · 10 pasos · 3 carriles' },
    { t: 'Recibir una compra', d: 'Vigente · 8 pasos · 2 carriles' },
    { t: 'Contar una estantería', d: 'Borrador · 6 pasos · 2 carriles' },
    { t: 'Cerrar la caja', d: 'Vigente · 7 pasos · 2 carriles' },
    { t: 'Pedir a un proveedor', d: 'Vigente · 9 pasos · 3 carriles' }
  ];
  PI.menuProcesos = function (ancla, actual, alElegir, alNuevo) {
    var items = [{ et: 'Procesos' }].concat(PI.PROCESOS.map(function (p) {
      return { t: p.t, d: p.d, i: 'workflow', activo: p.t === actual, tilde: p.t === actual, accion: function () { if (p.t !== actual) alElegir(p.t); } };
    }));
    items.push('-', { t: 'Proceso nuevo', i: 'plus', accion: alNuevo });
    return PI.menu(ancla, items, { titulo: 'Procesos', lado: 'abajo' });
  };

  /* ---------- Estado del borrador y «Guardado» ---------- */
  var est = { pastillas: [], guardados: [], botones: [], vigente: false };
  PI.estado = function (op) { est.pastillas = op.pastillas || []; est.guardados = op.guardados || []; est.botones = op.botones || []; est.alCambiar = op.alCambiar;
    est.pastillas.forEach(function (p) { p._original = p.innerHTML; p._clase = p.className; }); };
  PI.cambio = function () {
    est.guardados.forEach(function (g) {
      if (!g._original) g._original = g.innerHTML;
      g.innerHTML = '<span style="color:var(--texto-3)">Guardando…</span>';
      clearTimeout(g._reloj);
      g._reloj = setTimeout(function () { g.innerHTML = g._original; pintar(g); var s = g.querySelector('svg'); if (s) PI.animar(s, 'pi-fundido-lento'); }, 650);
    });
    if (est.vigente) {
      est.vigente = false;
      est.pastillas.forEach(function (p) { p.className = p._clase; p.innerHTML = p._original; PI.animar(p, 'pi-fundido-lento'); });
      est.botones.forEach(function (b) { b.disabled = false; });
      if (est.alCambiar) est.alCambiar(false);
    }
  };
  PI.marcarVigente = function (nombre) {
    if (est.vigente) { PI.tostada('Ya está vigente: no hay cambios en borrador', { i: 'info' }); return; }
    est.vigente = true;
    est.pastillas.forEach(function (p) { p.className = p._clase.replace(/urgente/, 'logro'); p.innerHTML = '<i class="i i-s" data-i="circle-check"></i>Vigente'; pintar(p); PI.animar(p, 'pi-fundido-lento'); });
    est.botones.forEach(function (b) { b.disabled = true; });
    PI.vibrar([10, 40, 10]);
    PI.tostada('«' + nombre + '» quedó vigente. La versión anterior queda en el historial');
    if (est.alCambiar) est.alCambiar(true);
  };
  PI.esVigente = function () { return est.vigente; };

  /* ---------- Historial ---------- */
  PI.historial = function (tomar, poner) {
    var atras = [], adelante = [];
    return {
      guardar: function () { atras.push(JSON.stringify(tomar())); if (atras.length > 60) atras.shift(); adelante = []; },
      deshacer: function () { if (!atras.length) { PI.tostada('No hay nada para deshacer', { i: 'info', dura: 1800 }); return false; } adelante.push(JSON.stringify(tomar())); poner(JSON.parse(atras.pop())); PI.cambio(); return true; },
      rehacer: function () { if (!adelante.length) { PI.tostada('No hay nada para rehacer', { i: 'info', dura: 1800 }); return false; } atras.push(JSON.stringify(tomar())); poner(JSON.parse(adelante.pop())); PI.cambio(); return true; }
    };
  };

  /* ---------- Diálogos comunes: importar, exportar, proceso nuevo ---------- */
  PI.importar = function (alImportar) {
    var capa = PI.abrir({ tipo: PI.esCelu() ? 'hoja' : 'dialogo', titulo: 'Importar un proceso', html:
      '<div class="pi-cab"><b>Importar un proceso</b><button class="pi-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<div class="t-detalle">Un archivo BPMN 2.0 (.bpmn), hecho en bpmn.io, Camunda o Bizagi. Se carga como borrador.</div>' +
      '<div class="pi-soltar"><span><i class="i i-l" data-i="upload"></i><br>' + (PI.esCelu() ? 'Tocá para elegir el archivo' : 'Soltá el archivo acá o tocá para elegirlo') + '</span></div>' +
      '<div class="pi-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-importar disabled>Importar</button></div>' });
    var zona = capa.querySelector('.pi-soltar'), boton = capa.querySelector('[data-importar]');
    zona.addEventListener('click', function () {
      zona.outerHTML = '<div class="pi-archivo pi-entra"><span class="pi-ico"><i class="i" data-i="file-text"></i></span><span class="tx">recibir-una-compra.bpmn<small>14 KB · 8 pasos · 2 carriles</small></span><i class="i" data-i="circle-check" style="color:var(--logro)"></i></div>';
      pintar(capa); boton.disabled = false;
    });
    boton.addEventListener('click', function () { PI.cerrar(capa); alImportar ? alImportar() : PI.tostada('Importado como borrador: «Recibir una compra», 8 pasos'); });
  };
  PI.exportar = function (ancla, nombre) {
    var base = (nombre || 'Venta en el mostrador').toLowerCase().replace(/ /g, '-');
    PI.menu(ancla, [
      { et: 'Bajar el proceso' },
      { t: 'BPMN 2.0', d: base + '.bpmn · se abre en bpmn.io', i: 'file-text', accion: function () { PI.tostada('Se bajó ' + base + '.bpmn', { i: 'download' }); } },
      { t: 'Imagen', d: base + '.png · para imprimir o mandar', i: 'image', accion: function () { PI.tostada('Se bajó ' + base + '.png', { i: 'download' }); } },
      { t: 'Los pasos, en orden', d: base + '.pdf · con quién y dónde', i: 'list-ordered', accion: function () { PI.tostada('Se bajó ' + base + '.pdf', { i: 'download' }); } }
    ], { titulo: 'Exportar', lado: 'abajo' });
  };
  PI.nuevo = function (alCrear) {
    var capa = PI.abrir({ tipo: PI.esCelu() ? 'hoja' : 'dialogo', titulo: 'Proceso nuevo', html:
      '<div class="pi-cab"><b>Proceso nuevo</b><button class="pi-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<div class="pi-f"><label>Nombre</label><div class="campo"><span contenteditable="true" data-foco data-vacio="Por ejemplo, Recibir una compra">Recibir una compra</span></div></div>' +
      '<div class="pi-f"><label>Quiénes participan</label><div class="chips"><span class="chip elegido">Cliente</span><span class="chip elegido">Vendedor</span><span class="chip elegido">Ferrebress</span><span class="chip">Proveedor</span></div></div>' +
      '<div class="pi-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar</button><button class="btn btn-accion" data-crear>Crear el borrador</button></div>' });
    capa.querySelectorAll('.chip').forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('elegido'); }); });
    function crear() { var n = capa.querySelector('[contenteditable]').textContent.trim() || 'Proceso sin nombre'; PI.cerrar(capa); alCrear(n); }
    capa.querySelector('[data-crear]').addEventListener('click', crear);
    capa.querySelector('[contenteditable]').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); crear(); } });
  };

  /* ---------- Las cuentas del dibujo ---------- */
  PI.QUIEN = { cli: { t: 'Cliente', i: 'user-round' }, ven: { t: 'Vendedor', i: 'user' }, sis: { t: 'Ferrebress', i: 'monitor' } };
  PI.DONDE = {
    'Vender': { i: 'shopping-cart', parte: 'Vender', ruta: 'Vender › Vender' }, 'Ventas de hoy': { i: 'shopping-cart', parte: 'Vender', ruta: 'Vender › Ventas de hoy' },
    'Productos': { i: 'tags', parte: 'Catálogo', ruta: 'Catálogo › Productos' }, 'Stock': { i: 'package', parte: 'Depósito', ruta: 'Depósito › Stock' },
    'Compras': { i: 'truck', parte: 'Depósito', ruta: 'Depósito › Compras' }, 'Contar': { i: 'package', parte: 'Depósito', ruta: 'Depósito › Contar' }
  };
  PI.menuDonde = function (ancla, actual, alElegir) {
    PI.menu(ancla, [{ et: 'Dónde se hace, en Ferrebress' }].concat(Object.keys(PI.DONDE).map(function (k) {
      return { t: PI.DONDE[k].ruta, i: PI.DONDE[k].i, activo: k === actual, accion: function () { alElegir(k); } };
    }), ['-', { t: 'Fuera de Ferrebress', d: 'En el mostrador, en el depósito o por teléfono', i: 'store', activo: !actual, accion: function () { alElegir(null); } }]), { titulo: 'Dónde, en Ferrebress' });
  };
  PI.menuQuien = function (ancla, m, actual, alElegir) {
    PI.menu(ancla, [{ et: 'Quién lo hace (el carril)' }].concat(m.carriles.map(function (c) {
      return { t: c.nombre, i: c.icono, activo: c.id === actual, accion: function () { alElegir(c.id); } };
    })), { titulo: 'Quién lo hace' });
  };
  PI.menuTipo = function (ancla, actual, alElegir) {
    var g = [['Lo que se hace', ['tarea', 'persona', 'sistema', 'subproceso']], ['El camino', ['decision', 'paralelo']], ['Empieza, espera y termina', ['inicio', 'espera', 'fin']], ['Lo demás', ['documento', 'nota']]];
    var items = [];
    g.forEach(function (gr) { items.push({ et: gr[0] }); gr[1].forEach(function (id) { items.push({ t: PI.nombreFigura(id), fig: id, activo: id === actual, accion: function () { alElegir(id); } }); }); });
    PI.menu(ancla, items, { titulo: 'Tipo de paso' });
  };
  PI.INFO = {
    ini: { como: 'Empieza cuando alguien entra al local y se acerca al mostrador.' },
    pide: { como: 'Dice qué necesita; si no sabe el nombre, lo muestra o trae el viejo.' },
    busca: { donde: 'Vender', como: 'Escaneá el código o buscá por nombre, marca o código del proveedor.' },
    gp: { como: 'Si el producto no tiene precio de venta, sigue por «Elige el margen».' },
    margen: { donde: 'Vender', como: 'Si no tiene precio, tocá un margen sobre el costo (300 a 25 %) o escribí el precio.' },
    suma: { donde: 'Vender', como: 'Lo agrega al ticket con la cantidad en un. o kg y recalcula el total.' },
    gm: { como: 'Si lleva algo más, vuelve a buscar; si no, se cobra.' },
    cobra: { donde: 'Vender', como: 'F5 efectivo, F6 Mercado Pago, F7 tarjeta, F8 cuenta corriente. Después, F2.' },
    espera: { donde: 'Ventas de hoy', como: 'La venta queda «por acreditar» hasta que entra la transferencia.' },
    gt: { como: 'Si paga con transferencia, espera que acredite; si no, se registra.' },
    reg: { donde: 'Stock', como: 'Guarda la venta, baja el stock de cada producto y la suma a la caja.' },
    fin: { como: 'La venta queda en «Ventas de hoy».' }
  };
  PI.info = function (id) { return PI.INFO[id] || (PI.INFO[id] = { como: '' }); };
  PI.nombreFigura = function (tipo) { var f = (window.FIGURAS || []).filter(function (x) { return x.id === tipo; })[0]; return f ? f.nombre : tipo; };
  PI.esTarea = function (t) { return /^(tarea|persona|sistema|subproceso)$/.test(t); };

  /* El recorrido en orden: desde el inicio, sin las vueltas atrás (orden topológico). */
  PI.orden = function (m) {
    var ids = m.pasos.filter(function (p) { return p.tipo !== 'nota'; }).map(function (p) { return p.id; });
    var ini = m.pasos.filter(function (p) { return p.tipo === 'inicio'; })[0];
    if (!ini) return [];
    var sal = {}; ids.forEach(function (id) { sal[id] = []; });
    m.flechas.forEach(function (f) { if (sal[f.de] && sal[f.a] !== undefined) sal[f.de].push(f); });
    var visto = {}, enPila = {}, atras = [];
    (function dfs(id) {
      visto[id] = enPila[id] = true;
      sal[id].forEach(function (f) { if (enPila[f.a]) atras.push(f); else if (!visto[f.a]) dfs(f.a); });
      enPila[id] = false;
    })(ini.id);
    var gr = {}; ids.forEach(function (id) { if (visto[id]) gr[id] = 0; });
    m.flechas.forEach(function (f) { if (atras.indexOf(f) < 0 && visto[f.de] && visto[f.a]) gr[f.a]++; });
    var out = [], listos = [ini.id];
    while (listos.length) {
      listos.sort(function (a, b) { return ids.indexOf(a) - ids.indexOf(b); });
      var id = listos.shift(); out.push(id);
      sal[id].forEach(function (f) { if (atras.indexOf(f) < 0 && visto[f.a]) { gr[f.a]--; if (gr[f.a] === 0) listos.push(f.a); } });
    }
    return out;
  };
  PI.avisos = function (m) {
    var ord = PI.orden(m), av = {};
    m.pasos.forEach(function (p) {
      if (p.tipo === 'nota') return;
      var sale = m.flechas.some(function (f) { return f.de === p.id; });
      if (ord.indexOf(p.id) < 0) av[p.id] = 'Ninguna flecha llega a este paso';
      else if (!sale && p.tipo !== 'fin') av[p.id] = 'No sale ninguna flecha de este paso';
    });
    return av;
  };
  PI.resumen = function (m) {
    var ord = PI.orden(m);
    return { pasos: ord.length, carriles: m.carriles.length, decisiones: ord.filter(function (id) { return /decision|paralelo/.test(PI.paso(m, id).tipo); }).length, avisos: Object.keys(PI.avisos(m)).length };
  };
  PI.paso = function (m, id) { return m.pasos.filter(function (p) { return p.id === id; })[0]; };
  PI.carrilDe = function (pos, y) { var c = null; Object.keys(pos.carriles).forEach(function (k) { var r = pos.carriles[k]; if (y >= r[0] && y < r[1]) c = k; }); return c || Object.keys(pos.carriles).slice(-1)[0]; };
  PI.mitad = function (pos, carril) { var r = pos.carriles[carril]; return Math.round((r[0] + r[1]) / 2); };
  /* Un lugar libre cerca de un paso (o de un punto), dentro de los carriles. */
  PI.lugarLibre = function (m, pos, cerca, o) {
    o = Object.assign({ dx: 120, dy: 140, xmin: 60, xmax: 1000, carril: null }, o || {});
    var cand = [[1, 0], [2, 0], [0, 1], [1, 1], [0, -1], [1, -1], [-1, 1], [2, 1], [-1, 0], [2, -1], [3, 0], [3, 1], [0, 2], [1, 2]];
    var ys = Object.keys(pos.carriles).map(function (k) { return pos.carriles[k]; });
    var ymin = Math.min.apply(null, ys.map(function (r) { return r[0]; })) + 30, ymax = Math.max.apply(null, ys.map(function (r) { return r[1]; })) - 30;
    function libre(x, y) {
      if (x < o.xmin || x > o.xmax || y < ymin || y > ymax) return false;
      if (o.carril && PI.carrilDe(pos, y) !== o.carril) return false;
      return !Object.keys(pos).some(function (k) { if (k === 'carriles' || !pos[k] || !PI.paso(m, k)) return false; return Math.abs(pos[k][0] - x) < o.dx * .8 && Math.abs(pos[k][1] - y) < o.dy * .55; });
    }
    for (var i = 0; i < cand.length; i++) {
      var x = cerca[0] + cand[i][0] * o.dx, y = cerca[1] + cand[i][1] * o.dy;
      if (libre(x, y)) return [x, y];
    }
    return [cerca[0] + o.dx, cerca[1] + 30];
  };
  /* Puertos de una flecha nueva según dónde queda un paso respecto del otro */
  PI.puertos = function (a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dy) < 12) return { s: dx >= 0 ? 'r' : 'l', e: dx >= 0 ? 'l' : 'r' };
    if (Math.abs(dx) < 12) return { s: dy > 0 ? 'b' : 't', e: dy > 0 ? 't' : 'b' };
    if (dx > 0) return { s: 'r', e: dy > 0 ? 't' : 'b' };
    return { s: dy > 0 ? 'b' : 't', e: 'r' };
  };
  var cuenta = 0;
  PI.nuevoId = function () { return 'n' + (++cuenta) + Date.now().toString(36).slice(-3); };
  PI.NOMBRES = { tarea: 'Tarea nueva', persona: 'Avisa al cliente que está listo', sistema: 'Imprime el ticket', decision: '¿Paga con transferencia?', paralelo: 'Al mismo tiempo', espera: 'Espera que acredite la transferencia', fin: 'Termina', inicio: 'Empieza', subproceso: 'Entrega con envío', documento: 'Factura B', nota: 'Una nota', carril: 'Proveedor' };
  /* Agrega un paso después de otro (lo intercala en su flecha) o suelto en un punto. */
  PI.agregarPaso = function (m, pos, o) {
    var id = PI.nuevoId(), tipo = o.tipo || 'persona';
    var lugar = o.en, ante = o.despuesDe && PI.paso(m, o.despuesDe);
    if (!lugar) lugar = PI.lugarLibre(m, pos, pos[o.despuesDe] || [200, 200], o.lugar);
    var carril = PI.carrilDe(pos, lugar[1]);
    if (tipo === 'carril') tipo = 'persona';
    m.pasos.splice(ante ? m.pasos.indexOf(ante) + 1 : m.pasos.length, 0, { id: id, tipo: tipo, nombre: o.nombre || PI.NOMBRES[tipo] || 'Paso nuevo', carril: carril });
    pos[id] = lugar;
    if (ante && tipo !== 'nota') {
      var sigue = m.flechas.filter(function (f) { return f.de === ante.id; });
      var ord = PI.orden(m);
      if (!/decision|paralelo/.test(ante.tipo) && sigue.length === 1 && tipo !== 'fin' && ord.indexOf(sigue[0].a) > ord.indexOf(ante.id)) {
        var f0 = sigue[0], dest = f0.a;
        m.flechas.splice(m.flechas.indexOf(f0), 1);
        m.flechas.push(Object.assign({ de: id, a: dest }, PI.puertos(lugar, pos[dest])));
      }
      var f = Object.assign({ de: ante.id, a: id }, PI.puertos(pos[ante.id], lugar));
      if (/decision/.test(ante.tipo)) f.et = m.flechas.some(function (x) { return x.de === ante.id && x.et === 'Sí'; }) ? 'No' : 'Sí';
      m.flechas.push(f);
    }
    PI.info(id).como = o.como || '';
    return id;
  };
  PI.quitarPaso = function (m, pos, id) {
    var p = PI.paso(m, id); if (!p) return;
    var ent = m.flechas.filter(function (f) { return f.a === id; }), sal = m.flechas.filter(function (f) { return f.de === id; });
    m.flechas = m.flechas.filter(function (f) { return f.de !== id && f.a !== id; });
    if (ent.length === 1 && sal.length === 1 && ent[0].de !== sal[0].a) m.flechas.push(Object.assign({ de: ent[0].de, a: sal[0].a, et: ent[0].et, etp: null }, PI.puertos(pos[ent[0].de], pos[sal[0].a])));
    m.pasos.splice(m.pasos.indexOf(p), 1);
    (m.asociaciones || []).slice().forEach(function (a) { if (a.de === id || a.a === id) m.asociaciones.splice(m.asociaciones.indexOf(a), 1); });
    delete pos[id];
  };
  PI.unir = function (m, pos, de, a) {
    if (de === a || m.flechas.some(function (f) { return f.de === de && f.a === a; })) return false;
    var f = Object.assign({ de: de, a: a }, PI.puertos(pos[de], pos[a]));
    if (/decision/.test(PI.paso(m, de).tipo)) f.et = m.flechas.some(function (x) { return x.de === de && x.et === 'Sí'; }) ? 'No' : 'Sí';
    m.flechas.push(f);
    return true;
  };

  /* Otros procesos guardados, para que el selector y «Importar» muestren algo propio. */
  PI.OTROS = {
    'Recibir una compra': [
      ['inicio', 'Llega el pedido del proveedor', 'ven'], ['persona', 'Cuenta lo que llegó', 'ven', 'Compras'],
      ['decision', '¿Coincide con la factura?', 'ven'], ['persona', 'Carga la factura de compra', 'ven', 'Compras'],
      ['sistema', 'Suma lo recibido al stock', 'sis', 'Stock'], ['sistema', 'Actualiza los costos', 'sis', 'Productos'],
      ['persona', 'Acomoda en la estantería', 'ven'], ['fin', 'Compra recibida', 'sis']],
    'Contar una estantería': [
      ['inicio', 'Elige la estantería', 'ven'], ['persona', 'Escanea cada producto', 'ven', 'Stock'], ['persona', 'Anota cuántos hay', 'ven', 'Stock'],
      ['sistema', 'Compara con el stock', 'sis', 'Stock'], ['sistema', 'Ajusta las diferencias', 'sis', 'Stock'], ['fin', 'Estantería contada', 'sis']],
    'Cerrar la caja': [
      ['inicio', 'Termina el turno', 'ven'], ['persona', 'Cuenta el efectivo', 'ven'], ['sistema', 'Suma las ventas del día', 'sis', 'Ventas de hoy'],
      ['decision', '¿Da justo?', 'ven'], ['persona', 'Anota la diferencia', 'ven', 'Ventas de hoy'], ['sistema', 'Guarda el cierre', 'sis'], ['fin', 'Caja cerrada', 'sis']],
    'Pedir a un proveedor': [
      ['inicio', 'Algo quedó con stock bajo', 'sis'], ['sistema', 'Arma la lista de faltantes', 'sis', 'Stock'], ['persona', 'Revisa la lista', 'ven', 'Compras'],
      ['persona', 'Elige el proveedor', 'ven', 'Compras'], ['persona', 'Manda el pedido', 'ven', 'Compras'], ['espera', 'Espera la confirmación', 'sis'],
      ['sistema', 'Registra el pedido', 'sis', 'Compras'], ['persona', 'Avisa cuándo llega', 'ven'], ['fin', 'Pedido hecho', 'sis']]
  };
  /* Un proceso escrito como lista, dibujado en fila: x0 + i·dx, en el medio de su carril. */
  PI.modeloLineal = function (def, geo) {
    var m = { carriles: JSON.parse(JSON.stringify(geo.carriles)), pasos: [], flechas: [], asociaciones: [] }, pos = { carriles: JSON.parse(JSON.stringify(geo.pos)) };
    def.forEach(function (d, i) {
      var id = 'p' + i; m.pasos.push({ id: id, tipo: d[0], nombre: d[1], carril: d[2] });
      pos[id] = [geo.x0 + i * geo.dx, PI.mitad(pos, d[2])];
      PI.INFO[id] = { donde: d[3], como: d[4] || '' };
      if (i) { var a = 'p' + (i - 1); m.flechas.push(Object.assign({ de: a, a: id }, PI.puertos(pos[a], pos[id]), def[i - 1][0] === 'decision' ? { et: 'Sí' } : {})); }
    });
    return { m: m, pos: pos };
  };
  /* El carril que se suma al soltar la figura «Carril» */
  PI.agregarCarril = function (m, pos) {
    if (m.carriles.some(function (c) { return c.id === 'prov'; })) return false;
    var ultimo = pos.carriles[m.carriles[m.carriles.length - 1].id], alto = 150;
    m.carriles.push({ id: 'prov', nombre: 'Proveedor', icono: 'truck' });
    pos.carriles.prov = [ultimo[1], ultimo[1] + alto];
    return true;
  };
  /* Coordenadas del dibujo para un evento */
  PI.punto = function (svg, e) {
    var pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    var r = pt.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(r.x), Math.round(r.y)];
  };
  /* Zoom y paneo sobre un dibujo: devuelve el estado { x, y, z } y la vista para dibujar(). */
  PI.camara = function (lienzo, x, y, alCambiar) {
    var c = { x: x, y: y, z: 1 };
    c.vista = function () { return [c.x, c.y, lienzo.clientWidth / c.z, lienzo.clientHeight / c.z]; };
    c.escala = function () { return c.z; };
    c.zoom = function (f) {
      var w = lienzo.clientWidth, h = lienzo.clientHeight, cx = c.x + w / c.z / 2, cy = c.y + h / c.z / 2;
      c.z = Math.max(.5, Math.min(2, Math.round(c.z * f * 100) / 100)); if (Math.abs(c.z - 1) < .03) c.z = 1;
      c.x = cx - w / c.z / 2; c.y = cy - h / c.z / 2; alCambiar();
    };
    c.encuadrar = function (caja) {
      var w = lienzo.clientWidth, h = lienzo.clientHeight;
      c.z = Math.max(.5, Math.min(1.5, Math.floor(Math.min(w / caja[2], h / caja[3]) * 10) / 10));
      c.x = caja[0] - (w / c.z - caja[2]) / 2; c.y = caja[1] - (h / c.z - caja[3]) / 2; alCambiar();
    };
    var arr = null;
    lienzo.addEventListener('pointerdown', function (e) {
      if (e.button || e.target.closest('[data-paso], .flota, .pad, .pi-pad, .controles, .zoom, .pi-lista, .pi-pista, button') || lienzo.classList.contains('pi-armado')) return;
      arr = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y, movio: false };
    });
    window.addEventListener('pointermove', function (e) {
      if (!arr) return;
      var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
      if (!arr.movio && Math.hypot(dx, dy) < 4) return;
      arr.movio = true; lienzo.style.cursor = 'grabbing';
      c.x = arr.cx - dx / c.z; c.y = arr.cy - dy / c.z; alCambiar(true);
    });
    window.addEventListener('pointerup', function () { if (arr && arr.movio) { lienzo._recienPaneo = true; setTimeout(function () { lienzo._recienPaneo = false; }, 0); } arr = null; lienzo.style.cursor = ''; });
    return c;
  };
  /* Arrastrar una figura desde una paleta al dibujo. alSoltar(punto|null, sinMover) */
  PI.arrastrarFigura = function (el, figura, lienzo, svg, op) {
    op = op || {};
    el.classList.add('pi-arrastrable');
    el.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      e.preventDefault();
      var x0 = e.clientX, y0 = e.clientY, fan = null, marco = celu(), base = marco ? marco.getBoundingClientRect() : { left: 0, top: 0 };
      function mover(ev) {
        if (!fan && Math.hypot(ev.clientX - x0, ev.clientY - y0) > 6) {
          fan = document.createElement('div'); fan.className = 'pi-fantasma';
          fan.style.width = (op.ancho || 56) + 'px'; fan.style.height = (op.alto || 52) + 'px';
          fan.innerHTML = window.glifo(figura(), 'i i-l');
          (marco || document.body).appendChild(fan);
          if (op.alEmpezar) op.alEmpezar();
        }
        if (fan) { fan.style.left = (ev.clientX - base.left) + 'px'; fan.style.top = (ev.clientY - base.top) + 'px'; }
      }
      function soltar(ev) {
        window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); window.removeEventListener('pointercancel', soltar);
        if (!fan) { op.alSoltar(null, true); return; }
        fan.remove();
        var r = lienzo.getBoundingClientRect();
        var dentro = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
        op.alSoltar(dentro ? PI.punto(svg, ev) : null, false);
      }
      window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar); window.addEventListener('pointercancel', soltar);
    });
  };
  /* Al pasar un paso nuevo al dibujo: cae desde 8 px con rebote */
  PI.caer = function (svg, id) { var g = svg.querySelector('[data-paso="' + id + '"]'); if (g) { g.classList.add('pi-svg-anim'); PI.animar(g, 'pi-cae'); } };
  /* Una figura que se suma o cambia: un halo que se apaga (verde) o parpadea (ámbar) */
  PI.halo = function (svg, id, color, clase) {
    var g = svg.querySelector('[data-paso="' + id + '"]'); if (!g || PI.reducir()) return;
    var b = g.getBBox(), ns = 'http://www.w3.org/2000/svg', r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', b.x - 6); r.setAttribute('y', b.y - 6); r.setAttribute('width', b.width + 12); r.setAttribute('height', b.height + 12);
    r.setAttribute('rx', 14); r.setAttribute('fill', 'none'); r.setAttribute('stroke', color); r.setAttribute('stroke-width', 2.5);
    r.setAttribute('class', clase || 'pi-apaga'); r.style.pointerEvents = 'none';
    svg.appendChild(r); setTimeout(function () { r.remove(); }, 1200);
  };
  /* FLIP: lo que cambia de lugar se corre a su lugar nuevo en 200 ms */
  PI.flip = function (elementos, cambiar) {
    var antes = new Map();
    elementos().forEach(function (el) { antes.set(el.getAttribute('data-k'), el.getBoundingClientRect().top); });
    cambiar();
    if (PI.reducir()) return;
    elementos().forEach(function (el) {
      var t = antes.get(el.getAttribute('data-k')); if (t == null) return;
      var d = t - el.getBoundingClientRect().top; if (!d) return;
      el.style.transition = 'none'; el.style.transform = 'translateY(' + d + 'px)';
      requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transition = 'transform var(--t) var(--curva)'; el.style.transform = ''; }); });
    });
  };
  /* ---------- Celular: la hoja del paso elegido, la de figuras y el menú «…» ---------- */
  /* op: { m, id, alCambiar(fn que muta), alQuitar(), alSiguiente(id), alAgregarDespues() } */
  PI.hojaPaso = function (op) {
    var m = op.m, id = op.id, p = PI.paso(m, id); if (!p) return null;
    var o = PI.orden(m), n = o.indexOf(id), inf = PI.info(id), c = m.carriles.filter(function (x) { return x.id === p.carril; })[0] || m.carriles[0], d = inf.donde && PI.DONDE[inf.donde];
    var sale = m.flechas.filter(function (f) { return f.de === id && o.indexOf(f.a) > n; })[0] || m.flechas.filter(function (f) { return f.de === id; })[0], sp = sale && PI.paso(m, sale.a);
    function campo(l, html, acc, area) { return '<div class="pi-f"><label>' + l + '</label><div class="campo' + (area ? ' area' : '') + '"' + (acc ? ' data-acc="' + acc + '" role="button" style="cursor:pointer"' : '') + '>' + html + '</div></div>'; }
    var fl = '<i class="i i-s" data-i="chevron-down" style="margin-left:auto;color:var(--texto-3)"></i>';
    var capa = PI.abrir({ tipo: 'hoja', titulo: 'Paso elegido', html:
      '<div class="pi-cab"><span class="pi-ico" style="background:var(--accion-suave);color:var(--accion-texto)">' + glifo(p.tipo, 'i') + '</span><div style="flex:1;min-width:0"><b data-eco style="display:block">' + PI.esc(p.nombre) + '</b><span class="t-detalle">' + (n >= 0 ? 'Paso ' + (n + 1) + ' de ' + o.length : 'Fuera del recorrido') + ' · ' + c.nombre + '</span></div><button class="pi-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      campo('Nombre', '<span contenteditable="true" data-campo="nombre" data-vacio="Cómo se llama el paso">' + PI.esc(p.nombre) + '</span>') +
      campo('Tipo', glifo(p.tipo, 'i i-s') + PI.nombreFigura(p.tipo) + fl, 'tipo') +
      campo('Quién lo hace', '<i class="i i-s" data-i="' + c.icono + '"></i>' + c.nombre + fl, 'quien') +
      campo('Dónde, en Ferrebress', (d ? '<span class="pild"><i class="i i-s" data-i="' + d.i + '"></i>' + d.parte + '</span><span class="t-detalle">' + d.ruta.split(' › ').pop() + '</span>' : '<span class="t-detalle">Fuera de Ferrebress</span>') + fl, 'donde') +
      campo('Cómo se hace', '<span contenteditable="true" data-campo="como" data-vacio="Contalo en una o dos líneas">' + PI.esc(inf.como) + '</span>', null, true) +
      (sp ? campo('Con qué sigue', glifo(sp.tipo, 'i i-s') + '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + PI.esc(sp.nombre) + '</span><i class="i i-s" data-i="arrow-right" style="color:var(--texto-3)"></i>', 'sigue') : '') +
      '<div class="pi-pie"><button class="btn btn-peligro" data-acc="quitar"><i class="i i-s" data-i="trash-2"></i>Quitar</button>' + (op.alAgregarDespues ? '<button class="btn" data-acc="despues"><i class="i i-s" data-i="plus"></i>Uno después</button>' : '') + '<button class="btn btn-accion" data-cerrar>Listo</button></div>' });
    var escribiendo = false;
    capa.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-campo'); if (!k) return;
      var t = e.target.textContent, primero = !escribiendo; escribiendo = true;
      op.alCambiar(function () { if (k === 'nombre') p.nombre = t; else inf.como = t; }, primero);
      if (k === 'nombre') capa.querySelector('[data-eco]').textContent = t;
    });
    capa.addEventListener('focusout', function () { escribiendo = false; });
    capa.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-campo') === 'nombre') { e.preventDefault(); e.target.blur(); } });
    capa.addEventListener('click', function (e) {
      var a = e.target.closest('[data-acc]'); if (!a) return;
      var acc = a.getAttribute('data-acc');
      function rehacer() { PI.cerrar(capa); setTimeout(function () { PI.hojaPaso(op); }, 0); }
      if (acc === 'quitar') { PI.cerrar(capa); op.alQuitar(); }
      else if (acc === 'despues') { PI.cerrar(capa); op.alAgregarDespues(); }
      else if (acc === 'sigue') { PI.cerrar(capa); op.id = sp.id; if (op.alSiguiente) op.alSiguiente(sp.id); setTimeout(function () { PI.hojaPaso(op); }, 240); }
      else if (acc === 'tipo') PI.menuTipo(a, p.tipo, function (t) { op.alCambiar(function () { p.tipo = t; }, true); rehacer(); });
      else if (acc === 'donde') PI.menuDonde(a, inf.donde, function (k) { op.alCambiar(function () { inf.donde = k; }, true); rehacer(); });
      else if (acc === 'quien') PI.menuQuien(a, m, p.carril, function (k) { op.alCambiar(function () { p.carril = k; if (op.alMoverCarril) op.alMoverCarril(id, k); }, true); rehacer(); });
    });
    return capa;
  };
  /* Las doce figuras en una hoja: alElegir(id) */
  PI.hojaFiguras = function (alElegir, titulo) {
    var capa = PI.abrir({ tipo: 'hoja', titulo: titulo || 'Agregar un paso', html:
      '<div class="pi-cab"><b>' + (titulo || 'Agregar un paso') + '</b><button class="pi-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<div class="t-detalle">Se agrega después del paso elegido.</div>' +
      '<div class="pi-figs">' + (window.FIGURAS || []).map(function (f) { return '<button data-fig-id="' + f.id + '">' + glifo(f.id, 'i i-l') + f.corto + '</button>'; }).join('') + '</div>' });
    capa.addEventListener('click', function (e) { var b = e.target.closest('[data-fig-id]'); if (!b) return; PI.cerrar(capa); alElegir(b.getAttribute('data-fig-id')); });
    return capa;
  };
  /* El «…» de la cabecera en el celular */
  PI.menuOpciones = function (ancla, op) {
    PI.menu(ancla, [
      { t: 'Cambiar de proceso', d: op.titulo(), i: 'workflow', accion: function () { PI.menuProcesos(ancla, op.titulo(), op.alElegirProceso, op.alNuevo); } },
      { t: 'Proceso nuevo', i: 'plus', accion: op.alNuevo },
      '-',
      { t: 'Importar un BPMN', i: 'upload', accion: function () { PI.importar(op.alImportar); } },
      { t: 'Exportar', i: 'download', accion: function () { PI.exportar(ancla, op.titulo()); } },
      { t: 'Marcar vigente', i: 'circle-check', accion: function () { PI.marcarVigente(op.titulo()); } }
    ], { titulo: 'Este proceso' });
  };
})();

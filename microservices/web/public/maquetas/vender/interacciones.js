// Vender · lo común a las seis maquetas para que se puedan tocar: números y precios, el catálogo
// ficticio, capas (diálogo, hoja, menú), tostadas, movimiento y los diálogos de la venta.
// Cada variante lo carga con <script src="../../interacciones.js"></script> y arma lo suyo al pie.
// No hay lógica de verdad: alcanza con que se vea lo que pasaría.
(function () {
  var V = window.V = {};
  var celu = document.querySelector('.celu');
  V.esCelu = !!celu;
  V.raiz = celu || document.body;
  V.mover = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  V.fotos = '../../../_comun/fotos/';
  V.ajustes = { tostadaAbajo: 28 };
  function pintar(el) { if (window.pintarIconos) window.pintarIconos(el); }
  V.pintar = pintar;
  V.html = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ---------------- Números y precios ----------------
  V.miles = function (n) { var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '−' : '') + s; };
  V.dec = function (n) { var e = Math.floor(n + 1e-9), c = Math.round((n - e) * 100); if (c >= 100) { e++; c = 0; } return V.miles(e) + ',' + (c < 10 ? '0' : '') + c; };
  V.pesos = function (n) { return '$' + V.miles(n); };
  V.pesosG = function (n) { return '<span class="peso">$</span>' + V.miles(n); };
  V.num = function (n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); };
  V.redondeo = function (n) { return Math.ceil(n / 1000 - 1e-9) * 1000; };
  V.MARGENES = [300, 200, 100, 50, 25];
  V.precioMargen = function (costo, m) { return V.redondeo(costo * (1 + m / 100) * 1.21); };
  V.precio = function (it) {
    if (it.mano != null) return it.mano;
    if (it.margen == null || it.costo == null) return null;
    return V.precioMargen(it.costo, it.margen);
  };
  V.subtotal = function (it) {
    var p = V.precio(it); if (p == null) return null;
    return it.mano != null ? Math.round(it.cant * p) : V.redondeo(it.cant * p);
  };
  V.subio = function (it) { var p = V.precio(it); return p != null && it.mano == null && V.subtotal(it) - it.cant * p > .5; };
  V.total = function (items) { return items.reduce(function (s, it) { return s + (V.subtotal(it) || 0); }, 0); };
  V.faltan = function (items) { return items.filter(function (it) { return V.precio(it) == null; }); };
  V.noMultiplo = function (it) { var s = V.subtotal(it); return s != null && s % 1000 !== 0; };
  // Lo que se gana: costo contra precio sin IVA, escalado para que la venta de muestra diga lo de la maqueta.
  var escalaGanancia = 1;
  function gananciaCruda(items) { return items.reduce(function (s, it) { var x = V.subtotal(it); return s + (x != null && it.costo != null ? x / 1.21 - it.costo * it.cant : 0); }, 0); }
  V.fijarGanancia = function (items, valor) { var g = gananciaCruda(items); escalaGanancia = g > 0 ? valor / g : 1; };
  V.ganancia = function (items) { return Math.round(gananciaCruda(items) * escalaGanancia / 100) * 100; };
  V.paso = function (it) { return it.unidad === 'kg' ? .1 : 1; };
  V.cantTexto = function (it) { return it.unidad === 'kg' ? V.num(it.cant) + ' kg' : V.num(it.cant); };

  V.MEDIOS = {
    efectivo: { nombre: 'Efectivo', corto: 'Efectivo', en: 'en efectivo', icono: 'banknote', tecla: 'F5' },
    mp: { nombre: 'Mercado Pago', corto: 'M. Pago', en: 'con Mercado Pago', icono: 'qr-code', tecla: 'F6' },
    tarjeta: { nombre: 'Tarjeta', corto: 'Tarjeta', en: 'con tarjeta', icono: 'credit-card', tecla: 'F7' },
    cuenta: { nombre: 'Cuenta corriente', corto: 'Cta. cte.', en: 'a cuenta corriente', icono: 'notebook-pen', tecla: 'F8' }
  };
  V.ORDEN_MEDIOS = ['efectivo', 'mp', 'tarjeta', 'cuenta'];

  // ---------------- Catálogo ficticio ----------------
  V.CATALOGO = [
    { id: 'mecha', nombre: 'Mecha acero rápido HSS 8 mm', corto: 'la mecha', marca: 'Ezeta', prov: 'Bulonera Centro', foto: 'mecha', costo: 2480, margen: 100, stock: 14 },
    { id: 'cinta', nombre: 'Cinta métrica PowerLock 5 m', corto: 'la cinta', marca: 'Stanley', prov: 'Distribuidora Oeste', foto: 'cinta-metrica', costo: 9350, margen: 50, stock: 6 },
    { id: 'clavos', nombre: 'Clavos punta París 2" por kilo', corto: 'los clavos', marca: 'Acindar', prov: 'Bulonera Centro', foto: 'clavos', costo: 2900, margen: 100, stock: 12.4, unidad: 'kg' },
    { id: 'tarugos', nombre: 'Tarugos nylon S8 con tope × 100', corto: 'los tarugos', marca: 'Fischer', prov: 'Ferretera del Sur', foto: 'tarugos', costo: 4150, margen: null, stock: 3 },
    { id: 'lampara', nombre: 'Lámpara LED 9 W luz fría E27', corto: 'la lámpara', marca: 'Philips', prov: 'Distribuidora Oeste', foto: 'lampara', costo: 1180, margen: 100, stock: 48 },
    { id: 'martillo', nombre: 'Martillo carpintero 27 mm mango tubular', corto: 'el martillo', marca: 'Stanley', prov: 'Ferretera del Sur', foto: 'martillo', costo: 12900, margen: 50, stock: 2 },
    { id: 'pinza', nombre: 'Pinza universal 8" aislada', corto: 'la pinza', marca: 'Bahco', prov: 'Distribuidora Oeste', foto: 'pinza', costo: 10200, margen: 50, stock: 7 },
    { id: 'pintura', nombre: 'Látex interior mate blanco 4 L', corto: 'el látex', marca: 'Alba', prov: 'Distribuidora Oeste', foto: 'pintura', costo: 20800, margen: 50, stock: 9 },
    { id: 'puntas', nombre: 'Puntas Phillips PH2 × 25 mm × 10', corto: 'las puntas', marca: 'Bahco', prov: 'Bulonera Centro', foto: 'puntas', costo: 1900, margen: 100, stock: 0 },
    { id: 'tornillos', nombre: 'Tornillos autoperforantes 8 × 1" × 100', corto: 'los tornillos', marca: 'Fischer', prov: 'Bulonera Centro', foto: 'tornillos', costo: 3100, margen: 100, stock: 25 },
    { id: 'llave', nombre: 'Llave combinada 13 mm', corto: 'la llave', marca: 'Bahco', prov: 'Distribuidora Oeste', foto: 'llave-combinada', costo: 3600, margen: 100, stock: 8 },
    { id: 'llave-c', nombre: 'Llave combinada 13 mm cromada', corto: 'la llave', marca: 'Crossmaster', prov: 'Bulonera Centro', foto: 'llave-combinada', costo: 2400, margen: 100, stock: 21 },
    { id: 'llaves', nombre: 'Juego de llaves combinadas 6 a 22 mm × 12', corto: 'el juego de llaves', marca: 'Stanley', prov: 'Distribuidora Oeste', foto: 'llave-combinada', costo: 23900, margen: 100, stock: 2 },
    { id: 'tarugos-g', nombre: 'Tarugos nylon 8 mm genéricos × 100', corto: 'los tarugos', marca: 'Genérico', prov: 'Ferretera del Sur', foto: 'tarugos', costo: 2100, margen: 100, stock: 11 }
  ];
  V.FRECUENTES = ['lampara', 'mecha', 'tornillos', 'cinta'];
  V.producto = function (id) { for (var i = 0; i < V.CATALOGO.length; i++) if (V.CATALOGO[i].id === id) return V.CATALOGO[i]; return null; };
  var uid = 100;
  V.item = function (id, cant, extra) {
    var p = V.producto(id), it = { k: 'r' + (uid++), ref: id, cant: cant == null ? 1 : cant, mano: null };
    for (var c in p) if (c !== 'id') it[c] = p[c];
    it.unidad = p.unidad || 'un.';
    if (extra) for (var e in extra) it[e] = extra[e];
    return it;
  };
  V.libre = function (nombre, mano) { return { k: 'r' + (uid++), libre: true, nombre: nombre, corto: 'el ítem libre', cant: 1, unidad: 'un.', costo: null, margen: null, mano: mano == null ? null : mano }; };
  V.stockTexto = function (p) { if (p.stock == null) return ''; if (!p.stock) return 'Sin stock'; return p.unidad === 'kg' ? V.num(p.stock) + ' kg' : V.num(p.stock) + ' un.'; };
  V.stockClase = function (p) { return !p.stock ? '' : p.stock <= 2 ? 'urgente' : 'logro'; };
  // Agrega a la venta: si ya está, suma (RF-108). Devuelve el renglón.
  V.sumar = function (items, id, cant, extra, alPrincipio) {
    for (var i = 0; i < items.length; i++) if (items[i].ref === id && items[i].mano == null) { items[i].cant = Math.round((items[i].cant + (cant || 1)) * 10) / 10; return items[i]; }
    var it = V.item(id, cant, extra);
    if (alPrincipio) items.unshift(it); else items.push(it);
    return it;
  };

  function normal(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[×"]/g, ' ').replace(/\s+/g, ' ').trim(); }
  V.buscar = function (q, max) {
    q = normal(q || '');
    if (!q) return V.FRECUENTES.map(V.producto);
    var t = q.split(' '), letras = t.filter(function (x) { return !/^\d+$/.test(x); }), nums = t.filter(function (x) { return /^\d+$/.test(x); });
    var exigir = letras.length ? letras : nums;
    function pega(palabras, x) { return palabras.some(function (w) { return w.indexOf(x) === 0; }); }
    return V.CATALOGO.map(function (p, i) {
      var palabras = normal(p.nombre + ' ' + p.marca).split(' ');
      if (!exigir.every(function (x) { return pega(palabras, x); })) return null;
      return { p: p, i: i, nota: nums.filter(function (x) { return palabras.indexOf(x) >= 0; }).length };
    }).filter(Boolean).sort(function (a, b) { return b.nota - a.nota || a.i - b.i; }).map(function (r) { return r.p; }).slice(0, max || 4);
  };

  // ---------------- Capas ----------------
  var pila = [];
  V.abierta = function () { return pila.length > 0; };
  V.capaArriba = function () { return pila[pila.length - 1] || null; };
  function posicionar(caja, ancla, lado) {
    var r = ancla.getBoundingClientRect(), base = V.esCelu ? V.raiz.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    var w = caja.offsetWidth, h = caja.offsetHeight, x, y;
    if (lado === 'derecha') { x = r.right + 8; y = r.top; } else if (lado === 'arriba') { x = r.left; y = r.top - h - 8; } else if (lado === 'izquierda-abajo') { x = r.right - w; y = r.bottom + 6; } else { x = r.left; y = r.bottom + 6; }
    x -= base.left; y -= base.top;
    x = Math.max(8, Math.min(x, base.width - w - 8)); y = Math.max(8, Math.min(y, base.height - h - 8));
    caja.style.left = x + 'px'; caja.style.top = y + 'px';
  }
  // o: { tipo: 'dialogo' | 'hoja' | 'menu' | 'pantalla', html, clase, ancla, lado, alCerrar(motivo), alAbrir(caja, capa) }
  V.abrir = function (o) {
    var fondo = document.createElement('div');
    fondo.className = 'v-fondo' + (o.tipo === 'menu' || o.tipo === 'pantalla' ? ' claro' : '');
    var caja = document.createElement('div');
    caja.className = 'v-' + o.tipo + (o.clase ? ' ' + o.clase : '');
    caja.setAttribute('role', o.tipo === 'menu' ? 'menu' : 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.innerHTML = (o.tipo === 'hoja' ? '<div class="v-agarre"></div>' : '') + o.html;
    fondo.appendChild(caja);
    V.raiz.appendChild(fondo);
    pintar(caja);
    if (o.tipo === 'menu' && o.ancla) posicionar(caja, o.ancla, o.lado);
    var capa = { fondo: fondo, el: caja, o: o, abierta: true };
    capa.cerrar = function (motivo) {
      if (!capa.abierta) return; capa.abierta = false;
      var i = pila.indexOf(capa); if (i >= 0) pila.splice(i, 1);
      fondo.classList.remove('abierta'); fondo.classList.add('cerrando');
      setTimeout(function () { fondo.remove(); }, V.mover ? 330 : 0);
      if (o.alCerrar) o.alCerrar(motivo || 'codigo');
    };
    fondo.addEventListener('click', function (e) {
      if (e.target === fondo) { capa.cerrar('afuera'); return; }
      var c = e.target.closest('[data-cerrar]');
      if (c && caja.contains(c) && !c.hasAttribute('data-ir')) capa.cerrar('boton');
    });
    pila.push(capa);
    requestAnimationFrame(function () { requestAnimationFrame(function () { fondo.classList.add('abierta'); }); });
    if (o.alAbrir) o.alAbrir(caja, capa);
    var foco = caja.querySelector('[autofocus]');
    if (foco && !V.esCelu) setTimeout(function () { foco.focus(); }, 30);
    return capa;
  };
  V.cerrarTodo = function () { while (pila.length) pila[pila.length - 1].cerrar('codigo'); };
  // Escape cierra lo de arriba; Enter confirma el botón [data-ok] de la capa de arriba.
  window.addEventListener('keydown', function (e) {
    var capa = V.capaArriba(); if (!capa) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); capa.cerrar('esc'); return; }
    if (e.key === 'Enter' && !(e.target && /TEXTAREA|BUTTON/.test(e.target.tagName))) {
      var ok = capa.el.querySelector('[data-ok]');
      if (ok) { e.preventDefault(); e.stopImmediatePropagation(); ok.click(); }
    }
    if (capa.o.alTecla && capa.o.alTecla(e) === true) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  // Menú de acciones chico: ops = [{ icono, texto, kbd, peligro, ir, fn }]
  V.menu = function (ancla, ops, o) {
    o = o || {};
    var hoja = V.esCelu && !o.flotante;
    var html = (o.titulo ? (hoja ? '<div class="t-seccion" style="margin:0 4px 8px">' : '<div class="tit">') + o.titulo + '</div>' : '') + ops.map(function (op, i) {
      if (op === '-') return '<div class="v-sep"></div>';
      return '<button class="v-op' + (op.peligro ? ' peligro' : '') + '" data-op="' + i + '"' + (op.ir ? ' data-ir="' + op.ir + '"' : '') + ' role="menuitem">' +
        (op.icono ? '<i class="i" data-i="' + op.icono + '"></i>' : '') + '<span>' + op.texto + '</span>' + (op.extra || '') + (op.kbd ? '<span class="kbd">' + op.kbd + '</span>' : '') + '</button>';
    }).join('');
    if (hoja) return V.abrir({ tipo: 'hoja', html: html, alAbrir: enganchar });
    return V.abrir({ tipo: 'menu', html: html, ancla: ancla, lado: o.lado, alAbrir: enganchar });
    function enganchar(caja, capa) {
      caja.addEventListener('click', function (e) {
        var b = e.target.closest('[data-op]'); if (!b) return;
        var op = ops[+b.getAttribute('data-op')];
        if (op.ir) return; // lo lleva navegar.js
        capa.cerrar('elegido'); if (op.fn) op.fn();
      });
    }
  };

  // «Más»: Anomalías, Procesos, Mejoras y errores, Configuración
  V.MAS = [
    { ir: 'anomalias', icono: 'triangle-alert', texto: 'Anomalías', det: '3 para mirar', extra: '<span class="pastilla urgente" style="height:24px;padding:0 8px">3</span>' },
    { ir: 'procesos', icono: 'workflow', texto: 'Procesos', det: 'Lo que corre solo, cada noche' },
    { ir: 'mejoras-y-errores', icono: 'bug', texto: 'Mejoras y errores', det: 'Contale al programador qué falla' },
    { ir: 'configuracion', icono: 'settings', texto: 'Configuración', det: 'Datos del negocio, IVA y equipos' }
  ];
  V.mas = function (ancla) {
    if (!V.esCelu) return V.menu(ancla, V.MAS, { lado: 'derecha', titulo: 'Más' });
    var html = '<div class="t-seccion" style="margin:0 4px 12px">Más</div><div class="v-lista">' + V.MAS.map(function (m) {
      return '<a class="v-r grande" data-ir="' + m.ir + '"><span class="v-icono"><i class="i i-l" data-i="' + m.icono + '"></i></span><div><div class="n">' + m.texto + '</div><div class="d">' + m.det + '</div></div><span style="display:flex;gap:8px;align-items:center">' + (m.ir === 'anomalias' ? m.extra : '') + '<i class="i" data-i="chevron-right" style="color:var(--texto-3)"></i></span></a>';
    }).join('') + '</div>';
    return V.abrir({ tipo: 'hoja', html: html });
  };
  V.menuUsuario = function (ancla, lado) {
    return V.menu(ancla, [{ icono: 'user-round', texto: 'Mis datos', fn: function () { V.tostada('Tus datos están en Usuarios', { icono: 'user-round' }); } }, '-', { icono: 'log-out', texto: 'Cerrar sesión', ir: 'entrar' }], { titulo: 'Carlos Illobre · Administrador', lado: lado || 'derecha', flotante: true });
  };

  // ---------------- Tostadas ----------------
  var tostadas = null;
  V.tostada = function (texto, o) {
    o = o || {};
    if (!tostadas) { tostadas = document.createElement('div'); tostadas.className = 'v-tostadas'; tostadas.setAttribute('role', 'status'); V.raiz.appendChild(tostadas); }
    tostadas.style.bottom = (o.abajo != null ? o.abajo : V.ajustes.tostadaAbajo) + 'px';
    while (tostadas.children.length > 1) tostadas.firstChild.remove();
    var t = document.createElement('div'); t.className = 'tostada';
    t.innerHTML = (o.icono ? '<i class="i" data-i="' + o.icono + '"></i>' : '') + '<span>' + texto + '</span>' + (o.accion ? '<button class="v-deshacer">' + o.accion + '</button>' : '');
    tostadas.appendChild(t); pintar(t);
    var ido = false;
    function sacar() { if (ido) return; ido = true; t.classList.add('sale'); setTimeout(function () { t.remove(); }, V.mover ? 200 : 0); }
    if (o.accion) t.querySelector('.v-deshacer').addEventListener('click', function () { sacar(); if (o.alAccion) o.alAccion(); });
    setTimeout(sacar, o.ms || (o.accion ? 4000 : 2600));
    return t;
  };
  V.vibrar = function (p) { if (V.esCelu && navigator.vibrate) try { navigator.vibrate(p || 10); } catch (e) { /* sin vibración */ } };

  // ---------------- Movimiento ----------------
  var CURVA = 'cubic-bezier(.2,.8,.2,1)', REBOTE = 'cubic-bezier(.34,1.4,.64,1)';
  V.animar = function (el, cuadros, ms, curva) { if (!V.mover || !el || !el.animate) return null; return el.animate(cuadros, { duration: ms || 200, easing: curva || CURVA }); };
  function valor(t) { var d = String(t).replace(/[^\d,]/g, '').replace(',', '.'); return d ? parseFloat(d) : NaN; }
  // Cambia el contenido y, si cambió, los dígitos ruedan: hacia arriba si sube, hacia abajo si baja.
  V.poner = function (el, html) {
    if (!el || el.innerHTML === html) return;
    var antes = valor(el.textContent); el.innerHTML = html; pintar(el);
    var ahora = valor(el.textContent), sube = !(ahora < antes);
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    V.animar(el, [{ transform: 'translateY(' + (sube ? '.4em' : '-.4em') + ')', opacity: 0 }, { transform: 'none', opacity: 1 }], 200);
  };
  V.saltar = function (el) { V.animar(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], 320, REBOTE); };
  V.entra = function (el) {
    if (!el) return;
    V.animar(el, [{ transform: 'translateY(8px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 320, REBOTE);
    el.classList.add('v-nuevo'); setTimeout(function () { el.classList.remove('v-nuevo'); }, 1250);
  };
  V.sacudir = function (el) { V.animar(el, [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], 320); };
  V.sale = function (els, cb) {
    els = Array.prototype.slice.call(els || []);
    if (!V.mover || !els.length) { cb(); return; }
    els.forEach(function (el, i) { el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-14px)', opacity: 0 }], { duration: 200, delay: i * 30, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }); });
    setTimeout(cb, 200 + els.length * 30);
  };
  // Vuelve a dibujar una lista con renglones [data-k]: lo que se movió se desliza a su lugar,
  // lo nuevo entra (si se pide) y los [data-rueda] que cambiaron ruedan.
  V.redibujar = function (cont, html, nuevos) {
    var antes = {};
    Array.prototype.forEach.call(cont.querySelectorAll('[data-k]'), function (el) {
      antes[el.getAttribute('data-k')] = { top: el.getBoundingClientRect().top, ruedas: Array.prototype.map.call(el.querySelectorAll('[data-rueda]'), function (r) { return r.textContent; }) };
    });
    cont.innerHTML = html; pintar(cont);
    Array.prototype.forEach.call(cont.querySelectorAll('[data-k]'), function (el) {
      var k = el.getAttribute('data-k'), a = antes[k];
      if (!a) { if (!nuevos || nuevos.indexOf(k) >= 0) V.entra(el); return; }
      var dy = a.top - el.getBoundingClientRect().top;
      if (Math.abs(dy) > 1) V.animar(el, [{ transform: 'translateY(' + dy + 'px)' }, { transform: 'none' }], 320);
      Array.prototype.forEach.call(el.querySelectorAll('[data-rueda]'), function (r, i) {
        if (a.ruedas[i] != null && a.ruedas[i] !== r.textContent) {
          var sube = !(valor(r.textContent) < valor(a.ruedas[i]));
          if (getComputedStyle(r).display === 'inline') r.style.display = 'inline-block';
          V.animar(r, [{ transform: 'translateY(' + (sube ? '.4em' : '-.4em') + ')', opacity: 0 }, { transform: 'none', opacity: 1 }], 200);
        }
      });
    });
  };
  // El botón se llena de izquierda a derecha y después pasa lo que sigue.
  V.llenar = function (btn, cb) {
    if (!V.mover) { cb(); return; }
    btn.classList.add('v-llena'); var r = document.createElement('span'); r.className = 'v-relleno'; btn.appendChild(r);
    setTimeout(function () { r.remove(); btn.classList.remove('v-llena'); cb(); }, 330);
  };
  V.vacia = function (titulo, detalle) {
    return '<div class="v-vacia"><span class="ic"><i class="i i-l" data-i="shopping-cart"></i></span><b>' + (titulo || 'La venta está vacía') + '</b><span class="t-detalle">' + (detalle || 'Buscá o escaneá un producto para empezar.') + '</span></div>';
  };
  V.sinBarras = function (el, eje) { if (!el) return; el.classList.add('v-sin-barras'); el.style[eje === 'x' ? 'overflowX' : 'overflowY'] = 'auto'; };

  // ---------------- Diálogos de la venta ----------------
  function cab(titulo, detalle) {
    return '<div class="v-cab"><div><div class="t-seccion">' + titulo + '</div>' + (detalle ? '<div class="t-detalle">' + detalle + '</div>' : '') + '</div>' +
      '<button class="btn btn-fantasma btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>';
  }
  V.cab = cab;
  function pie(ok, cancelar, clase) {
    return '<div class="v-pie">' + (cancelar === false ? '' : '<button class="btn btn-fantasma" data-cerrar>' + (cancelar || 'Cancelar') + '</button>') +
      '<button class="btn ' + (clase || 'btn-accion') + '" data-ok>' + ok + (V.esCelu ? '' : ' <span class="kbd">Enter</span>') + '</button></div>';
  }
  V.pie = pie;
  function capa(html, o) { o = o || {}; o.tipo = V.esCelu ? 'hoja' : 'dialogo'; o.html = html; return V.abrir(o); }
  V.capa = capa;
  function enOk(caja, fn) { caja.querySelector('[data-ok]').addEventListener('click', fn); }
  function soloNumero(s) { var n = parseInt(String(s).replace(/\D/g, ''), 10); return isNaN(n) ? 0 : n; }

  V.precioAMano = function (it, cb) {
    var html = cab('Precio a mano', V.html(it.nombre)) +
      '<label class="campo v-campo"><span class="peso" style="font-size:18px;vertical-align:0">$</span><input class="v-entrada" inputmode="numeric" autofocus placeholder="Importe de cada uno" value="' + (it.mano ? V.miles(it.mano) : '') + '"></label>' +
      '<p class="t-detalle" style="margin:10px 2px 0">Vale solo para esta venta: no cambia el margen guardado. Si no es múltiplo de $1.000 se avisa, pero se cobra igual.</p>' + pie('Poner el precio');
    capa(html, { alAbrir: function (caja, c) {
      var inp = caja.querySelector('input');
      inp.addEventListener('input', function () { var n = soloNumero(inp.value); inp.value = n ? V.miles(n) : ''; });
      enOk(caja, function () { var n = soloNumero(inp.value); if (!n) { V.sacudir(inp.parentNode); return; } c.cerrar('ok'); cb(n); });
    } });
  };
  V.pasos = function (it) {
    if (it.libre || it.mano != null) return [['Precio a mano, solo para esta venta', '$' + V.dec(it.mano || 0)], ['× ' + V.cantTexto(it), '$' + V.dec((it.mano || 0) * it.cant)], ['Sin redondeo: es a mano', V.pesos(V.subtotal(it) || 0)]];
    var c = it.costo, f = 1 + it.margen / 100, p = [['Costo · ' + it.prov + ', lista del 14/10', '$' + V.dec(c)]];
    if (it.margen == null) { p.push(['Sin margen elegido', '—']); return p; }
    p.push(['+ margen ' + it.margen + ' % (× ' + V.num(f) + ')', '$' + V.dec(c * f)]);
    p.push(['+ IVA 21 % (× 1,21)', '$' + V.dec(c * f * 1.21)]);
    p.push(['Precio, para arriba a $1.000', '$' + V.dec(V.precio(it))]);
    if (it.cant !== 1) { p.push(['× ' + V.cantTexto(it), '$' + V.dec(it.cant * V.precio(it))]); p.push([V.subio(it) ? 'Para arriba a $1.000, para no dar vuelto' : 'Subtotal', V.pesos(V.subtotal(it))]); }
    else p.push(['Subtotal', V.pesos(V.subtotal(it))]);
    return p;
  };
  V.pasosHtml = function (it) { return V.pasos(it).map(function (p) { return '<div class="v-paso"><span>' + p[0] + '</span><b class="num">' + p[1] + '</b></div>'; }).join(''); };
  V.dondeSale = function (it) {
    var html = cab('De dónde sale el precio', V.html(it.nombre)) + '<div class="v-pasos">' + V.pasosHtml(it) + '</div>' +
      (it.margen == null && it.mano == null ? '<div class="aviso urgente" style="margin-top:12px"><i class="i" data-i="triangle-alert"></i><div>Todavía no tiene margen: elegilo para que tenga precio.</div></div>' : '') +
      '<div class="v-pie"><button class="btn btn-oscuro" data-cerrar>Entendido</button></div>';
    capa(html);
  };
  V.CLIENTES = [
    { n: 'Constructora Ríos Hnos.', d: 'Debe $184.000 · última compra el 12/10', c: 'urgente' },
    { n: 'Electricidad Miño', d: 'Debe $32.500 · última compra ayer', c: 'urgente' },
    { n: 'Juan Carlos Pérez', d: 'Al día', c: 'logro' },
    { n: 'Escuela N.º 14 «Gral. San Martín»', d: 'Al día', c: 'logro' }
  ];
  V.elegirCliente = function (cb) {
    var html = cab('Cliente', 'Para cuenta corriente o para que figure en la venta') +
      '<label class="campo v-campo"><i class="i" data-i="search"></i><input class="v-entrada" autofocus placeholder="Buscá por nombre"></label>' +
      '<div class="v-lista" style="margin-top:12px">' + V.CLIENTES.map(function (c, i) {
        return '<button class="v-r" data-cli="' + i + '"><span class="avatar">' + c.n.replace(/[^A-ZÁÉÍÓÚ]/g, '').slice(0, 2) + '</span><div><div class="n">' + c.n + '</div><div class="d">' + c.d + '</div></div><span class="pastilla ' + c.c + '">' + (c.c === 'logro' ? 'Al día' : 'Debe') + '</span></button>';
      }).join('') + '</div><div class="v-pie"><button class="btn btn-fantasma" data-sin>Sin cliente</button></div>';
    capa(html, { alAbrir: function (caja, c) {
      var inp = caja.querySelector('input');
      inp.addEventListener('input', function () { var q = normal(inp.value); caja.querySelectorAll('[data-cli]').forEach(function (b) { b.style.display = normal(b.textContent).indexOf(q) >= 0 ? '' : 'none'; }); });
      caja.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cli]'); if (b) { c.cerrar('ok'); cb(V.CLIENTES[+b.getAttribute('data-cli')].n); }
        if (e.target.closest('[data-sin]')) { c.cerrar('ok'); cb(null); }
      });
    } });
  };
  function mini(items) {
    return '<div class="v-mini">' + items.map(function (it) {
      var s = V.subtotal(it);
      return '<div><span class="q num">' + (it.unidad === 'kg' ? V.num(it.cant) + ' kg' : V.num(it.cant) + ' ×') + '</span><span class="nm">' + V.html(it.nombre) + '</span><span class="im num"' + (s == null ? ' style="color:var(--urgente-texto)"' : '') + '>' + (s == null ? 'Sin precio' : V.pesos(s)) + '</span></div>';
    }).join('') + '<div class="tot"><span></span><span>Total</span><span class="num">' + V.pesos(V.total(items)) + '</span></div></div>';
  }
  V.pasarAPedido = function (items, cb) {
    if (!items.length) { V.tostada('La venta está vacía: no hay nada para pedir', { icono: 'info' }); return; }
    var html = cab('Pasar a pedido', items.length + (items.length === 1 ? ' producto' : ' productos') + ' que hoy no se lleva: no se cobra ni se pide seña') +
      '<span class="v-et" style="margin-top:0">Para quién</span><label class="campo v-campo"><i class="i" data-i="user-round"></i><input class="v-entrada" data-nombre autofocus placeholder="Nombre del cliente" value=""></label>' +
      '<span class="v-et">Teléfono</span><label class="campo v-campo"><i class="i" data-i="smartphone"></i><input class="v-entrada" inputmode="tel" placeholder="11 5555-5555"></label>' +
      '<span class="v-et">Qué día va a estar</span><div class="segmentos" style="display:flex"><button style="flex:1">Mañana</button><button style="flex:1" class="elegido">Jueves 22</button><button style="flex:1">Lunes 26</button></div>' +
      pie('Guardar el pedido');
    capa(html, { alAbrir: function (caja, c) {
      var dia = 'el jueves 22';
      caja.querySelectorAll('.segmentos button').forEach(function (b) { b.addEventListener('click', function () { caja.querySelectorAll('.segmentos button').forEach(function (x) { x.classList.toggle('elegido', x === b); }); dia = b.textContent === 'Mañana' ? 'mañana' : 'el ' + b.textContent.toLowerCase(); }); });
      enOk(caja, function () { var n = caja.querySelector('[data-nombre]'); if (!n.value.trim()) { V.sacudir(n.parentNode); n.focus(); return; } c.cerrar('ok'); cb({ nombre: n.value.trim(), dia: dia }); });
    } });
  };
  V.presupuesto = function (items, cb) {
    if (!items.length) { V.tostada('La venta está vacía: no hay nada para presupuestar', { icono: 'info' }); return; }
    var faltan = V.faltan(items);
    var html = cab('Presupuesto P-0042', 'Vale hasta el lunes 26 de octubre · no toca el stock') + mini(items) +
      (faltan.length ? '<div class="aviso urgente" style="margin-top:12px"><i class="i" data-i="triangle-alert"></i><div>' + cap(faltan[0].corto) + (faltan.length > 1 ? ' y ' + (faltan.length - 1) + ' más' : '') + ' no ' + (faltan.length > 1 || /^los |^las /.test(faltan[0].corto) ? 'tienen' : 'tiene') + ' precio: elegilo antes de mandarlo.</div></div>' : '') +
      '<div class="v-pie"><button class="btn" data-pdf' + (faltan.length ? ' disabled' : '') + '><i class="i i-s" data-i="file-text"></i>Bajar PDF</button><button class="btn btn-accion" data-wa' + (faltan.length ? ' disabled' : '') + '><i class="i i-s" data-i="message-circle"></i>Mandar por WhatsApp</button></div>';
    capa(html, { alAbrir: function (caja, c) {
      caja.addEventListener('click', function (e) {
        if (e.target.closest('[data-pdf]:not([disabled])')) { c.cerrar('ok'); cb('pdf'); }
        if (e.target.closest('[data-wa]:not([disabled])')) { c.cerrar('ok'); cb('whatsapp'); }
      });
    } });
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  V.cap = cap;
  V.avisoFaltan = function (faltan) {
    if (!faltan.length) return '';
    if (faltan.length === 1) return cap(faltan[0].corto) + ' no ' + (/^los |^las /.test(faltan[0].corto) ? 'tienen' : 'tiene') + ' precio';
    return 'Faltan ' + faltan.length + ' precios: ' + faltan.map(function (f) { return f.corto; }).join(' y ');
  };
  V.itemLibre = function (cb, texto) {
    var html = cab('Ítem libre', 'Algo que no está en el catálogo: se cobra con el precio que pongas') +
      '<span class="v-et" style="margin-top:0">Qué es</span><label class="campo v-campo"><i class="i" data-i="package-plus"></i><input class="v-entrada" data-nombre autofocus placeholder="Bolsa de arena × 25 kg" value="' + V.html(texto || '') + '"></label>' +
      '<span class="v-et">Precio</span><label class="campo v-campo"><span class="peso" style="font-size:18px;vertical-align:0">$</span><input class="v-entrada" data-precio inputmode="numeric" placeholder="Importe"></label>' + pie('Agregar a la venta');
    capa(html, { alAbrir: function (caja, c) {
      var p = caja.querySelector('[data-precio]');
      p.addEventListener('input', function () { var n = soloNumero(p.value); p.value = n ? V.miles(n) : ''; });
      enOk(caja, function () {
        var n = caja.querySelector('[data-nombre]');
        if (!n.value.trim()) { V.sacudir(n.parentNode); return; }
        c.cerrar('ok'); cb(n.value.trim(), soloNumero(p.value) || null);
      });
    } });
  };
  V.guardarProducto = function (it, cb) {
    var html = cab('Guardar como producto', 'Queda en el catálogo; la venta sigue igual') +
      '<span class="v-et" style="margin-top:0">Descripción</span><label class="campo v-campo"><input class="v-entrada" data-nombre autofocus value="' + V.html(it.nombre) + '"></label>' +
      '<span class="v-et">Familia (opcional)</span><div class="chips"><button class="chip elegido">Construcción</button><button class="chip">Ferretería</button><button class="chip">Pinturería</button></div>' +
      '<span class="v-et">Costo sin IVA (opcional)</span><label class="campo v-campo"><span class="peso" style="font-size:18px;vertical-align:0">$</span><input class="v-entrada" inputmode="numeric" placeholder="Si lo sabés"></label>' + pie('Guardar en el catálogo');
    capa(html, { alAbrir: function (caja, c) {
      caja.querySelectorAll('.chip').forEach(function (b) { b.addEventListener('click', function () { caja.querySelectorAll('.chip').forEach(function (x) { x.classList.toggle('elegido', x === b); }); }); });
      enOk(caja, function () { var n = caja.querySelector('[data-nombre]').value.trim() || it.nombre; c.cerrar('ok'); cb(n); });
    } });
  };
  V.pedidosYPresupuestos = function () {
    var filas = [
      ['clock', 'Pedido · Juan Carlos Pérez', '2 Látex interior mate blanco 4 L · para el jueves 22', 'Jueves 22', 'pino'],
      ['clock', 'Pedido · Electricidad Miño', '10 Lámparas LED 9 W · venció el viernes', 'Vencido', 'error'],
      ['file-text', 'Presupuesto P-0041 · Constructora Ríos', '12 productos · $612.000 · vale hasta el 24/10', 'Vigente', 'logro']
    ];
    var html = cab('Pedidos y presupuestos', 'Lo que quedó anotado para después') + '<div class="v-lista">' + filas.map(function (f, i) {
      return '<button class="v-r" data-f="' + i + '"><span class="v-icono"><i class="i" data-i="' + f[0] + '"></i></span><div><div class="n">' + f[1] + '</div><div class="d">' + f[2] + '</div></div><span class="pastilla ' + f[4] + '">' + f[3] + '</span></button>';
    }).join('') + '</div><div class="v-pie"><button class="btn btn-oscuro" data-cerrar>Listo</button></div>';
    capa(html, { clase: 'ancho', alAbrir: function (caja, c) {
      caja.addEventListener('click', function (e) { var b = e.target.closest('[data-f]'); if (!b) return; c.cerrar('ok'); V.tostada(+b.getAttribute('data-f') === 2 ? 'El presupuesto P-0041 pasó a la venta' : 'Abrís el pedido para cobrarlo cuando llegue', { icono: 'check' }); }); } });
  };

  // Venta registrada: tilde, total y medio; la venta ya quedó vacía detrás.
  V.listo = function (o) {
    var m = V.MEDIOS[o.medio];
    var html = '<div class="v-listo"><span class="v-tilde"><i class="i i-xl" data-i="check" data-trazo="3"></i></span>' +
      '<div class="t-seccion">Venta registrada</div><div class="t-total num">' + V.pesosG(o.total) + '</div>' +
      '<div class="t-detalle"><span class="v-pt medio ' + o.medio + '"></span>' + m.nombre + (o.cliente ? ' · ' + V.html(o.cliente) : '') + ' · ' + o.cantidad + (o.cantidad === 1 ? ' producto' : ' productos') + ' · 10:43</div>' +
      '<div class="v-pie"><button class="btn" data-ir="ventas-de-hoy"><i class="i i-s" data-i="receipt"></i>Ver en Ventas de hoy</button><button class="btn btn-oscuro" data-ok data-cerrar>Seguir vendiendo' + (V.esCelu ? '' : ' <span class="kbd">Enter</span>') + '</button></div></div>';
    V.vibrar([10, 40, 10]);
    var c = V.abrir({ tipo: 'dialogo', clase: V.esCelu ? '' : 'ancho', html: html, alCerrar: o.alCerrar });
    c.el.querySelector('[data-ok]').addEventListener('click', function () { c.cerrar('ok'); });
    setTimeout(function () { c.cerrar('solo'); }, 4000);
    return c;
  };
  // Cuenta corriente sin cliente: no se cobra (spec 003, E de medios de pago).
  V.puedeCobrar = function (items, medio, cliente, alFaltar) {
    if (!items.length) { V.tostada('La venta está vacía', { icono: 'info' }); return false; }
    var f = V.faltan(items);
    if (f.length) { V.tostada('Hay productos sin precio', { icono: 'triangle-alert' }); if (alFaltar) alFaltar(f); return false; }
    if (medio === 'cuenta' && !cliente) { V.tostada('Cuenta corriente: elegí el cliente', { icono: 'user-round' }); return 'cliente'; }
    return true;
  };

  // ---------------- Atajos (compu) y búsqueda en línea ----------------
  // Convierte un .campo de búsqueda en una entrada con sugerencias. o: { alElegir(id), alLibre(texto), ancho }
  V.buscador = function (campo, o) {
    var input = null, caja = null, res = [], sel = 0, q = '';
    function activar(ch, soloFoco) {
      if (!input) {
        var sp = campo.querySelector('span'), ph = sp ? sp.textContent.trim() : '';
        input = document.createElement('input'); input.className = 'v-entrada'; input.placeholder = ph; input.setAttribute('aria-label', ph);
        if (sp) sp.replaceWith(input); else campo.appendChild(input);
        campo.classList.add('foco');
        input.addEventListener('input', mostrar);
        input.addEventListener('keydown', teclas);
        input.addEventListener('blur', function () { setTimeout(function () { if (document.activeElement !== input) ocultar(); }, 120); });
      }
      if (document.activeElement !== input) input.focus();
      if (ch) input.value += ch;
      if (!soloFoco) mostrar();
    }
    function mostrar() {
      q = input.value; res = V.buscar(q, 4); sel = 0;
      if (!caja) { caja = document.createElement('div'); caja.className = 'v-sug'; caja.setAttribute('role', 'listbox'); document.body.appendChild(caja); caja.addEventListener('mousedown', function (e) { e.preventDefault(); var b = e.target.closest('[data-n]'); if (b) elegir(+b.getAttribute('data-n')); }); }
      var r = campo.getBoundingClientRect();
      caja.style.left = r.left + 'px'; caja.style.top = (r.bottom + 8) + 'px'; caja.style.width = Math.max(o.ancho || 0, r.width, 620) + 'px';
      dibujar();
    }
    function dibujar() {
      var h = (q.trim() ? '' : '<div class="t-etiqueta" style="padding:6px 10px 4px">Lo que más sale a esta hora</div>') + res.map(function (p, i) {
        var pr = p.margen == null ? null : V.precioMargen(p.costo, p.margen);
        return '<button class="v-sug-r' + (i === sel ? ' elegida' : '') + '" data-n="' + i + '" role="option"><div class="foto chica"><img src="' + V.fotos + p.foto + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + p.nombre + '</div><div class="d">' + p.marca + ' · ' + p.prov + '</div></div><span class="pastilla ' + V.stockClase(p) + '">' + V.stockTexto(p) + '</span><div class="p num"' + (pr == null ? ' style="color:var(--urgente-texto);font-size:15px"' : '') + '>' + (pr == null ? 'Sin precio' : V.pesos(pr)) + '</div></button>';
      }).join('');
      if (q.trim()) h += '<button class="v-sug-r libre' + (sel === res.length ? ' elegida' : '') + '" data-n="' + res.length + '"><span class="v-icono"><i class="i" data-i="package-plus"></i></span><div><div class="n">Agregar «' + V.html(q.trim()) + '» como ítem libre</div><div class="d">No está en el catálogo: le ponés el precio a mano</div></div><span class="kbd">Ctrl Enter</span></button>';
      h += '<div class="v-sug-pie"><span><span class="kbd">↑</span><span class="kbd">↓</span> elegir</span><span><span class="kbd">Enter</span> agrega</span><span><span class="kbd">Esc</span> cierra</span><span style="margin-left:auto">' + (q.trim() ? res.length + ' de 11.240 productos' : 'Escribí para buscar') + '</span></div>';
      caja.innerHTML = h; pintar(caja);
    }
    function ocultar() { if (caja) { caja.remove(); caja = null; } }
    function elegir(i) {
      var texto = input.value.trim();
      if (i < res.length) o.alElegir(res[i].id); else if (texto) o.alLibre(texto);
      input.value = ''; ocultar();
    }
    function teclas(e) {
      var total = res.length + (q.trim() ? 1 : 0);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!caja) mostrar(); else { sel = (sel + 1) % total; dibujar(); } }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (caja) { sel = (sel - 1 + total) % total; dibujar(); } }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (e.ctrlKey && q.trim()) elegir(res.length); else if (caja && total) elegir(sel); }
      else if (e.key === 'Escape') { if (input.value) { e.preventDefault(); e.stopPropagation(); input.value = ''; mostrar(); } else if (caja) { e.preventDefault(); e.stopPropagation(); ocultar(); } else input.blur(); }
    }
    campo.addEventListener('click', function () { activar(); });
    return { activar: activar, ocultar: ocultar, activo: function () { return !!input && document.activeElement === input; } };
  };
  V.escribiendo = function (e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); };
  V.letra = function (e) { return e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && /[a-záéíóúñü]/i.test(e.key); };

  // ---------------- Celular: buscar, cámara, margen, medio, dictado ----------------
  // Hoja de búsqueda: cb(id) o cb(null, texto) para un ítem libre.
  V.buscarHoja = function (cb, inicial) {
    var html = '<div class="v-cab" style="margin-bottom:12px"><label class="campo v-campo" style="flex:1"><i class="i" data-i="search"></i><input class="v-entrada" placeholder="Producto, código o marca" value="' + V.html(inicial || '') + '"></label><button class="btn btn-fantasma" data-cerrar style="padding:0 8px">Cancelar</button></div><div class="t-etiqueta" data-rot style="margin:0 2px 8px">Lo que más sale a esta hora</div><div class="v-lista" data-res></div>';
    return V.abrir({ tipo: 'hoja', clase: 'alta', html: html, alAbrir: function (caja, c) {
      var inp = caja.querySelector('input'), lista = caja.querySelector('[data-res]'), rot = caja.querySelector('[data-rot]');
      function dib() {
        var q = inp.value.trim(), r = V.buscar(q, 6);
        rot.textContent = q ? (r.length ? r.length + ' de 11.240 productos' : 'No está en el catálogo') : 'Lo que más sale a esta hora';
        lista.innerHTML = r.map(function (p) {
          var pr = p.margen == null ? null : V.precioMargen(p.costo, p.margen);
          return '<button class="v-r grande" data-id="' + p.id + '"><div class="foto"><img src="' + V.fotos + p.foto + '.webp" alt=""></div><div style="min-width:0"><div class="n">' + p.nombre + '</div><div class="d">' + p.marca + ' · <span style="color:var(--' + (V.stockClase(p) || 'texto-3').replace(/^(logro|urgente)$/, '$1-texto') + ');font-weight:700">' + V.stockTexto(p) + '</span></div></div><div class="p num"' + (pr == null ? ' style="color:var(--urgente-texto);font-size:14px"' : '') + '>' + (pr == null ? 'Sin precio' : V.pesos(pr)) + '</div></button>';
        }).join('') + (q ? '<button class="v-r grande" data-libre><span class="v-icono"><i class="i i-l" data-i="package-plus"></i></span><div><div class="n">Agregar «' + V.html(q) + '»</div><div class="d">Como ítem libre, con precio a mano</div></div><i class="i" data-i="plus"></i></button>' : '');
        pintar(lista);
      }
      inp.addEventListener('input', dib); dib();
      setTimeout(function () { inp.focus({ preventScroll: true }); }, 60);
      lista.addEventListener('click', function (e) {
        var b = e.target.closest('[data-id]'); if (b) { c.cerrar('ok'); cb(b.getAttribute('data-id')); return; }
        if (e.target.closest('[data-libre]')) { var t = inp.value.trim(); c.cerrar('ok'); cb(null, t); }
      });
    } });
  };
  // Cámara a pantalla completa: cada lectura llama a alLeer(id) y devuelve el renglón para la tarjeta.
  V.camara = function (o) {
    var orden = o.secuencia || ['lampara', 'tornillos', 'martillo', 'mecha', 'pinza'], n = 0, timer = null;
    var html = '<div class="visor" data-visor><img class="objeto" src="' + V.fotos + V.producto(orden[0]).foto + '.webp" alt=""><div class="marco"><i class="a"></i><i class="b"></i><i class="c"></i><i class="d"></i><span class="v-laser"></span></div><div class="ayuda">Apuntá al código de barras · tocá para leer</div><div class="leidos" data-leidos></div></div>' +
      '<div class="tope"><button class="v-redondo" data-cerrar aria-label="Cerrar la cámara"><i class="i" data-i="x"></i></button><b>Escanear</b></div>' +
      '<div class="abajo"><span class="t-detalle" data-cuenta>Cada código que lee se suma solo</span><button class="btn btn-accion grande" data-cerrar style="width:100%">Listo, volver a la venta</button></div>';
    return V.abrir({ tipo: 'pantalla', clase: 'v-camara', html: html, alCerrar: function () { clearTimeout(timer); if (o.alCerrar) o.alCerrar(n); }, alAbrir: function (caja) {
      var visor = caja.querySelector('[data-visor]'), marco = caja.querySelector('.marco'), obj = caja.querySelector('.objeto'), leidos = caja.querySelector('[data-leidos]');
      function leer() {
        var id = orden[n % orden.length]; n++;
        marco.classList.add('cierra'); V.vibrar(10);
        var it = o.alLeer(id), p = V.precio(it);
        var t = document.createElement('div'); t.className = 'v-leido';
        t.innerHTML = '<span class="ok"><i class="i" data-i="check"></i></span><div style="min-width:0"><div class="n">' + it.nombre + '</div><div class="d">' + it.marca + ' · sumada a la venta</div></div><span class="mas num">' + (p == null ? 'Sin precio' : '+ ' + V.pesos(p)) + '</span>';
        pintar(t); leidos.insertBefore(t, leidos.firstChild); while (leidos.children.length > 2) leidos.lastChild.remove();
        caja.querySelector('[data-cuenta]').textContent = n + (n === 1 ? ' producto leído' : ' productos leídos') + ' · seguí apuntando';
        setTimeout(function () { marco.classList.remove('cierra'); obj.classList.add('cambia'); }, 260);
        setTimeout(function () { obj.src = V.fotos + V.producto(orden[n % orden.length]).foto + '.webp'; obj.classList.remove('cambia'); }, 520);
      }
      visor.addEventListener('click', leer);
      timer = setTimeout(leer, o.esperar == null ? 1100 : o.esperar);
    } });
  };
  // Margen (y cantidad) de un renglón, en una hoja. o: { alCambiar(), alQuitar(), conCantidad }
  V.margenHoja = function (it, o) {
    o = o || {};
    function cuerpo() {
      return (it.costo != null ? '<span class="v-et" style="margin-top:0">Margen · costo ' + V.pesos(it.costo) + (it.unidad === 'kg' ? ' el kg' : '') + '</span><div class="v-opciones">' + V.MARGENES.map(function (m) {
        return '<button class="v-opcion' + (it.mano == null && it.margen === m ? ' elegido' : '') + '" data-m="' + m + '">' + m + '<small>' + V.pesos(V.precioMargen(it.costo, m)) + '</small></button>';
      }).join('') + '</div>' : '') +
        '<button class="btn' + (it.mano != null ? ' btn-oscuro' : '') + '" data-mano style="width:100%;margin-top:8px"><i class="i i-s" data-i="pencil"></i>' + (it.mano != null ? 'A mano: ' + V.pesos(it.mano) + ' · cambiar' : 'Precio a mano') + '</button>' +
        (o.conCantidad ? '<span class="v-et">Cantidad</span><div style="display:flex;align-items:center;gap:12px"><span class="cantidad" style="height:48px"><button data-menos style="width:52px"><i class="i" data-i="minus"></i></button><span class="n">' + V.num(it.cant) + (it.unidad === 'kg' ? '<span class="u">kg</span>' : '') + '</span><button data-mas style="width:52px"><i class="i" data-i="plus"></i></button></span><span style="margin-left:auto;font-weight:800;font-size:20px" class="num">' + (V.subtotal(it) == null ? '<span style="color:var(--urgente-texto);font-size:16px">Sin precio</span>' : V.pesos(V.subtotal(it))) + '</span></div>' : '') +
        (o.alQuitar ? '<button class="btn btn-peligro" data-quitar style="width:100%;margin-top:16px"><i class="i i-s" data-i="trash-2"></i>Quitar de la venta</button>' : '');
    }
    var html = '<div class="v-cab"><div><div class="t-renglon">' + V.html(it.nombre) + '</div><div class="t-detalle">' + (V.precio(it) == null ? 'Sin precio: elegí el margen' : V.pesos(V.precio(it)) + (it.unidad === 'kg' ? ' el kg' : ' cada uno')) + '</div></div><button class="btn btn-fantasma btn-icono chico" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div><div data-cuerpo>' + cuerpo() + '</div>';
    return V.abrir({ tipo: 'hoja', html: html, alAbrir: function (caja, c) {
      var cu = caja.querySelector('[data-cuerpo]'), det = caja.querySelector('.v-cab .t-detalle');
      function rehacer() { cu.innerHTML = cuerpo(); pintar(cu); det.textContent = V.precio(it) == null ? 'Sin precio: elegí el margen' : V.pesos(V.precio(it)) + (it.unidad === 'kg' ? ' el kg' : ' cada uno'); if (o.alCambiar) o.alCambiar(); }
      caja.addEventListener('click', function (e) {
        var m = e.target.closest('[data-m]');
        if (m) { it.margen = +m.getAttribute('data-m'); it.mano = null; rehacer(); V.vibrar(10); if (!o.conCantidad) setTimeout(function () { c.cerrar('ok'); }, 180); return; }
        if (e.target.closest('[data-mano]')) { c.cerrar('ok'); V.precioAMano(it, function (n) { it.mano = n; if (o.alCambiar) o.alCambiar(); }); return; }
        if (e.target.closest('[data-menos]')) { if (it.cant - V.paso(it) > 0.05) { it.cant = Math.round((it.cant - V.paso(it)) * 10) / 10; rehacer(); } return; }
        if (e.target.closest('[data-mas]')) { it.cant = Math.round((it.cant + V.paso(it)) * 10) / 10; rehacer(); return; }
        if (e.target.closest('[data-quitar]')) { c.cerrar('ok'); o.alQuitar(); }
      });
    } });
  };
  V.medioHoja = function (actual, cb) {
    var html = '<div class="t-seccion" style="margin:0 4px 12px">Cómo paga</div><div class="v-medios">' + V.ORDEN_MEDIOS.map(function (k) {
      var m = V.MEDIOS[k]; return '<button class="v-medio medio ' + k + (k === actual ? ' elegido' : '') + '" data-medio="' + k + '"><span class="ic"><i class="i i-s" data-i="' + m.icono + '"></i></span>' + m.nombre + '</button>';
    }).join('') + '</div>';
    return V.abrir({ tipo: 'hoja', html: html, alAbrir: function (caja, c) { caja.addEventListener('click', function (e) { var b = e.target.closest('[data-medio]'); if (b) { c.cerrar('ok'); cb(b.getAttribute('data-medio')); } }); } });
  };
  // Escribe una frase palabra por palabra en el elemento; las [entendidas] van marcadas.
  // frase: [['dos', true], ['lámparas LED', true], ['de nueve', false]...]; cb al terminar.
  V.escribirFrase = function (el, frase, cb, ms) {
    var i = 0; el.innerHTML = '«';
    var t = setInterval(function () {
      if (i >= frase.length) { clearInterval(t); el.insertAdjacentHTML('beforeend', '»'); if (cb) cb(); return; }
      var w = frase[i++], s = document.createElement('span'); s.className = 'v-palabra';
      s.innerHTML = (i > 1 ? ' ' : '') + (w[1] ? '<mark>' + w[0] + '</mark>' : w[0]);
      el.appendChild(s);
    }, V.mover ? (ms || 170) : 1);
    return function () { clearInterval(t); };
  };
  V.dictadoHoja = function (frase, cb) {
    var html = '<div class="v-dicho"><div class="oido"><i class="i i-s" data-i="mic"></i>Te escucho…</div><div data-f></div></div><div style="display:grid;justify-items:center;margin-top:20px"><span class="btn btn-accion v-escucha" style="width:88px;height:88px;border-radius:99px;padding:0"><i class="i i-xl" data-i="mic"></i></span><span class="t-detalle" style="margin-top:12px">Decí qué lleva · cuando terminás, lo sumo</span></div>';
    var parar;
    return V.abrir({ tipo: 'hoja', html: html, alCerrar: function (m) { if (parar) parar(); }, alAbrir: function (caja, c) {
      parar = V.escribirFrase(caja.querySelector('[data-f]'), frase, function () { caja.querySelector('.oido').innerHTML = '<i class="i i-s" data-i="check"></i>Entendí'; pintar(caja); setTimeout(function () { if (c.abierta) { c.cerrar('ok'); cb(); } }, 500); });
    } });
  };
  // Arrastre horizontal simple con puntero (deslizar para quitar, deslizar para cobrar).
  V.arrastre = function (el, o) {
    var x0 = null, y0 = 0, dx = 0, activo = false, id = null;
    el.addEventListener('pointerdown', function (e) { if (o.desde && !e.target.closest(o.desde)) return; x0 = e.clientX; y0 = e.clientY; dx = 0; activo = false; id = e.pointerId; });
    el.addEventListener('pointermove', function (e) {
      if (x0 == null || e.pointerId !== id) return;
      var mx = e.clientX - x0, my = e.clientY - y0;
      if (!activo && Math.abs(o.eje === 'y' ? my : mx) > 8 && Math.abs(o.eje === 'y' ? mx : my) < Math.abs(o.eje === 'y' ? my : mx)) { activo = true; try { el.setPointerCapture(id); } catch (er) { /* nada */ } }
      if (activo) { dx = o.eje === 'y' ? my : mx; o.mover(dx); e.preventDefault(); }
    });
    function fin() { if (x0 == null) return; var a = activo; x0 = null; if (a) { o.soltar(dx); el.addEventListener('click', tragar, true); setTimeout(function () { el.removeEventListener('click', tragar, true); }, 0); } }
    function tragar(e) { e.stopPropagation(); e.preventDefault(); }
    el.addEventListener('pointerup', fin); el.addEventListener('pointercancel', fin);
  };
})();

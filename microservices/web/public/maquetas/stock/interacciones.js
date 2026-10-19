// Stock: piezas que comparten las seis maquetas para simular lo que pasa al tocar.
// Diálogos (compu), hojas (celu), menús, tostadas, números que ruedan, renglones que entran,
// y los datos ficticios de los productos (los movimientos de cada uno suman su stock).
// Sin librerías ni internet. Lo usa el script al pie de cada index.html.
(function () {
  var St = {};
  var celu = function () { return document.querySelector('.celu'); };
  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  St.reducir = reducir;
  St.FOTOS = '../../../_comun/fotos/';

  // ---------- Números ----------
  St.num = function (n) {
    var neg = n < 0, a = Math.abs(n);
    var ent = Math.floor(a), dec = Math.round((a - ent) * 10);
    var s = String(ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (dec) s += ',' + dec;
    return (neg ? '−' : '') + s;
  };
  St.signo = function (n) { return (n > 0 ? '+' : '') + St.num(n); };
  St.pesos = function (n) { return '<span class="peso">$</span>' + St.num(n); };
  St.hora = function () { var d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };

  // ---------- Movimiento ----------
  St.rodar = function (el, html, sube) {
    if (!el) return;
    el.innerHTML = '<span class="st-rueda ' + (sube ? 'sube' : 'baja') + '">' + html + '</span>';
  };
  St.entrar = function (el) {
    if (!el) return;
    el.classList.remove('st-nuevo'); void el.offsetWidth; el.classList.add('st-nuevo');
    setTimeout(function () { el.classList.remove('st-nuevo'); }, 1100);
  };
  St.fundir = function (el) { if (!el) return; el.classList.remove('st-fundir'); void el.offsetWidth; el.classList.add('st-fundir'); };
  St.pulsar = function (el) { if (!el) return; el.classList.remove('st-pulsar'); void el.offsetWidth; el.classList.add('st-pulsar'); };
  St.plegar = function (el, luego) {
    if (!el) return;
    el.classList.add('st-plegar');
    setTimeout(function () { if (luego) luego(); else el.remove(); }, reducir ? 0 : 200);
  };
  St.vibrar = function (p) { try { if (navigator.vibrate && celu()) navigator.vibrate(p || 10); } catch (e) {} };

  // ---------- Tostada ----------
  St.tostada = function (texto, icono) {
    var cont = document.querySelector('.st-tostadas');
    if (!cont) { cont = document.createElement('div'); cont.className = 'st-tostadas'; (celu() || document.body).appendChild(cont); }
    var t = document.createElement('div');
    t.className = 'tostada';
    t.innerHTML = '<i class="i" data-i="' + (icono || 'circle-check') + '"></i><span>' + texto + '</span>';
    cont.appendChild(t); window.pintarIconos(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('ver'); }); });
    setTimeout(function () { t.classList.remove('ver'); setTimeout(function () { t.remove(); }, 250); }, 2600);
    return t;
  };

  // ---------- Capas: diálogo, hoja y menú ----------
  var pila = [];
  St.hayCapa = function () { return pila.length > 0; };
  // tipo: 'dialogo' | 'hoja' | 'menu'. ancla: elemento junto al que va el menú.
  St.abrir = function (o) {
    var capa = document.createElement('div');
    capa.className = 'st-capa ' + o.tipo;
    var clase = o.tipo === 'dialogo' ? 'st-dialogo' : o.tipo === 'hoja' ? 'st-hoja' : 'st-menu';
    capa.innerHTML = '<div class="st-velo" data-cerrar></div><div class="' + clase + ' ' + (o.clase || '') + '" role="dialog" aria-modal="true">' +
      (o.tipo === 'hoja' ? '<div class="agarre-h"></div>' : '') + o.html + '</div>';
    (o.tipo === 'menu' ? document.body : (celu() || document.body)).appendChild(capa);
    var caja = capa.lastElementChild;
    if (o.tipo === 'menu' && o.ancla) {
      var r = o.ancla.getBoundingClientRect();
      if (o.lado === 'derecha') { caja.style.left = (r.right + 8) + 'px'; caja.style.top = Math.max(8, r.top - 8) + 'px'; }
      else if (o.lado === 'arriba') { caja.style.left = r.left + 'px'; caja.style.bottom = (innerHeight - r.top + 8) + 'px'; }
      else { caja.style.left = Math.min(r.left, innerWidth - 340) + 'px'; caja.style.top = (r.bottom + 8) + 'px'; }
    }
    window.pintarIconos(capa);
    var cerrada = false;
    var api = {
      el: caja, capa: capa,
      cerrar: function (motivo) {
        if (cerrada) return; cerrada = true;
        pila.splice(pila.indexOf(api), 1);
        capa.classList.add('cerrando'); capa.classList.remove('abierta');
        setTimeout(function () { capa.remove(); }, reducir ? 0 : (o.tipo === 'hoja' ? 220 : 200));
        if (o.alCerrar) o.alCerrar(motivo);
      }
    };
    capa.addEventListener('click', function (e) {
      var c = e.target.closest('[data-cerrar]');
      if (c && capa.contains(c)) { e.preventDefault(); api.cerrar('boton'); }
    });
    pila.push(api);
    requestAnimationFrame(function () { requestAnimationFrame(function () { capa.classList.add('abierta'); }); });
    var foco = caja.querySelector('[autofocus], input');
    if (foco) setTimeout(function () { foco.focus(); }, 30);
    return api;
  };
  St.cerrarTodo = function () { while (pila.length) pila[pila.length - 1].cerrar('todo'); };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pila.length) { e.preventDefault(); e.stopImmediatePropagation(); pila[pila.length - 1].cerrar('escape'); }
  }, true);

  St.botonX = '<button class="st-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button>';
  St.cabecera = function (titulo, sub, foto) {
    return '<div class="st-cab">' + (foto ? '<span class="foto"><img src="' + St.FOTOS + foto + '.webp" alt=""></span>' : '') +
      '<div class="tt"><b>' + titulo + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</div>' + St.botonX + '</div>';
  };

  // ---------- Menú «Más» y «Ir a…» ----------
  var MAS = [['anomalias', 'triangle-alert', 'Anomalías', '3'], ['procesos', 'workflow', 'Procesos'], ['mejoras-y-errores', 'bug', 'Mejoras y errores'], ['configuracion', 'settings', 'Configuración']];
  function itemsMas() {
    return MAS.map(function (m) {
      return '<a data-ir="' + m[0] + '"><i class="i" data-i="' + m[1] + '"></i>' + m[2] + (m[3] ? '<span class="pastilla urgente" style="margin-left:auto;height:24px">' + m[3] + '</span>' : '') + '</a>';
    }).join('');
  }
  St.menuMas = function (ancla) {
    if (celu()) return St.abrir({ tipo: 'hoja', html: '<div class="st-cab"><div class="tt"><b>Más</b></div>' + St.botonX + '</div><div class="st-menu" style="position:static;opacity:1;transform:none;box-shadow:none;border:0;padding:0">' + itemsMas() + '</div>' });
    return St.abrir({ tipo: 'menu', ancla: ancla, lado: 'derecha', html: itemsMas() });
  };
  // Para las maquetas sin marco (celu 2 y 3, compu 3): a dónde ir desde acá.
  St.menuIrA = function (ancla, titulo) {
    var partes = '<a data-ir="vender"><i class="i" data-i="shopping-cart"></i>Vender</a>' +
      '<a data-ir="productos"><i class="i" data-i="tags"></i>Catálogo</a>' +
      '<a data-ir="compras"><i class="i" data-i="package"></i>Depósito · Compras</a>' +
      '<a data-ir="contar"><i class="i" data-i="list-checks"></i>Depósito · Contar</a>' +
      '<a data-ir="resumen"><i class="i" data-i="chart-column"></i>Negocio</a><div class="sep"></div>' + itemsMas();
    if (celu()) return St.abrir({ tipo: 'hoja', html: '<div class="st-cab"><div class="tt"><b>' + (titulo || 'Ir a…') + '</b><span>Salís de Stock</span></div>' + St.botonX + '</div><div class="st-menu" style="position:static;opacity:1;transform:none;box-shadow:none;border:0;padding:0">' + partes + '</div>' });
    return St.abrir({ tipo: 'menu', ancla: ancla, html: partes });
  };
  St.pop = function (ancla, html, lado) { return St.abrir({ tipo: 'menu', ancla: ancla, lado: lado, clase: 'pop', html: html }); };

  // ---------- Datos ficticios ----------
  // movs: del más nuevo al más viejo; [tipo, título, detalle, cantidad]. El saldo se calcula.
  var P = {
    puntas: { nombre: 'Puntas Phillips PH2 × 25 mm × 10', corto: 'Puntas Phillips PH2 × 10', marca: 'Bremen', codigo: 'PH2-25', est: 'B-02-01', prov: 'Bremen Herramientas', foto: 'puntas', stock: -1, min: 5, costo: 2900, sug: 10,
      movs: [['ajuste', 'Compra anulada · mar 14/10', 'Se anuló la factura B-0003-1102 · Laura', -6], ['venta', 'Venta 4760 · jue 16/10', 'Mostrador · Carlos', -3], ['compra', 'Compra · mar 14/10', 'Factura B-0003-1102 · Bremen', 6], ['venta', 'Venta 4610 · lun 06/10', 'Mostrador · Laura', -2], ['compra', 'Compra · jue 02/10', 'Remito R-0002-0871 · Bremen', 4]] },
    latex: { nombre: 'Látex interior mate blanco 4 L', corto: 'Látex mate blanco 4 L', marca: 'Alba', codigo: 'LX4B', est: 'C-01-05', prov: 'Pinturerías Alba', foto: 'pintura', stock: 0, min: 2, costo: 20500, sug: 2, espera: 'Rosa, jue 22',
      movs: [['venta', 'Venta 4733 · jue 16/10', 'Mostrador · Carlos', -1], ['venta', 'Venta 4598 · lun 06/10', 'Cuenta corriente · Obras Ramírez', -3], ['venta', 'Venta 4412 · sáb 27/09', 'Mostrador · Laura', -2], ['compra', 'Compra · sáb 20/09', 'Factura A-0012-3301 · Pinturerías Alba', 6]] },
    martillo: { nombre: 'Martillo carpintero 27 mm mango tubular', corto: 'Martillo carpintero 27 mm', marca: 'Bahco', codigo: 'MC27', est: 'A-03-12', prov: 'Distribuidora Oeste', foto: 'martillo', stock: 9, min: 10, costo: 13500, sug: 6, porque: '31 vendidas en 90 días',
      movs: [['venta', 'Venta 4821 · hoy 10:12', 'Mostrador · Carlos', -3], ['compra', 'Compra · sáb 18/10', 'Remito R-0012-0388 · Distribuidora Oeste', 4], ['ajuste', 'Ajuste · mié 15/10', '«había 9, hay 8: rotura, mango partido» · Mati', -1], ['venta', 'Venta 4702 · sáb 11/10', 'Mostrador · Laura', -1], ['venta', 'Venta 4655 · vie 03/10', 'Mostrador · Carlos', -2], ['compra', 'Compra · jue 02/10', 'Factura A-0012-0350 · Distribuidora Oeste', 12]] },
    tarugos: { nombre: 'Tarugos nylon S8 con tope × 100', corto: 'Tarugos nylon S8 × 100', marca: 'Fischer', codigo: 'S8T100', est: 'B-04-02', prov: 'Bulonera Centro', foto: 'tarugos', stock: 3, min: 10, costo: 4150, sug: 12, porque: '28 vendidas en 90 días',
      movs: [['venta', 'Venta 4777 · vie 17/10', 'Mostrador · Laura', -2], ['venta', 'Venta 4640 · jue 09/10', 'Mostrador · Carlos', -3], ['venta', 'Venta 4480 · mar 30/09', 'Cuenta corriente · Obras Ramírez', -4], ['compra', 'Compra · lun 22/09', 'Factura A-0007-54810 · Bulonera Centro', 12]] },
    mecha: { nombre: 'Mecha acero rápido HSS 8 mm', corto: 'Mecha HSS 8 mm', marca: 'Ezeta', codigo: 'ME080', est: 'B-02-04', prov: 'Bulonera Centro', foto: 'mecha', stock: 14, min: 20, costo: 2480, sug: 24, porque: '41 vendidas en 90 días',
      movs: [['venta', 'Venta 4821 · hoy 10:12', 'Mostrador · Carlos', -3], ['venta', 'Venta 4790 · sáb 18/10', 'Mostrador · Laura', -2], ['venta', 'Venta 4744 · jue 16/10', 'Mostrador · Carlos', -5], ['compra', 'Compra · lun 13/10', 'Factura A-0007-55120 · Bulonera Centro', 24], ['venta', 'Venta 4680 · vie 10/10', 'se quedó sin stock · Carlos', -2], ['ajuste', 'Ajuste · rotura', '«había 3, hay 2: rotura» · Mati', -1], ['venta', 'Venta 4655 · vie 03/10', 'Mostrador · Laura', -4], ['venta', 'Venta 4510 · lun 22/09', 'Mostrador · Carlos', -5], ['compra', 'Compra · lun 01/09', 'Factura A-0007-53980 · Bulonera Centro', 12]] },
    tornillo: { nombre: 'Tornillo autoperforante T2 8 × 1/2" × 100', corto: 'Tornillo T2 8 × 1/2" × 100', marca: 'Genérico', codigo: '', est: 'B-05-03', prov: 'Bulonera Centro', foto: 'tornillos', stock: 23, min: 15, costo: 2740, sug: 10, sinCodigo: true,
      movs: [['venta', 'Venta 4778 · vie 17/10', 'Mostrador · Laura', -2], ['venta', 'Venta 4701 · sáb 11/10', 'Mostrador · Carlos', -5], ['compra', 'Compra · dom 05/10', 'Remito R-0007-1209 · Bulonera Centro', 30]] },
    cinta: { nombre: 'Cinta métrica PowerLock 5 m', corto: 'Cinta métrica PowerLock 5 m', marca: 'Stanley', codigo: '7790' + '43210', est: 'A-03-14', prov: 'Distribuidora Oeste', foto: 'cinta-metrica', stock: 6, min: 4, costo: 9800, sug: 4,
      movs: [['venta', 'Venta 4815 · hoy 9:40', 'Mostrador · Carlos', -1], ['venta', 'Venta 4730 · jue 16/10', 'Mostrador · Laura', -1], ['compra', 'Compra · jue 02/10', 'Factura A-0012-0350 · Distribuidora Oeste', 8]] },
    lampara: { nombre: 'Lámpara LED 9 W luz fría E27', corto: 'Lámpara LED 9 W fría E27', marca: 'Philips', codigo: 'LED9F', est: 'D-01-02', prov: 'Distribuidora Oeste', foto: 'lampara', stock: 48, min: 20, costo: 1900, sug: 20,
      movs: [['venta', 'Venta 4819 · hoy 10:02', 'Mostrador · Laura', -4], ['venta', 'Venta 4720 · mié 15/10', 'Cuenta corriente · Obras Ramírez', -8], ['compra', 'Compra · jue 09/10', 'Factura A-0012-0371 · Distribuidora Oeste', 60]] },
    clavos: { nombre: 'Clavos punta París 2" por kilo', corto: 'Clavos punta París 2"', marca: 'Acindar', codigo: 'CPP2', est: 'B-06-01', prov: 'Bulonera Centro', foto: 'clavos', stock: 4.5, min: 10, costo: 3600, sug: 15, unidad: 'kg',
      movs: [['venta', 'Venta 4801 · sáb 18/10', 'Mostrador · Carlos', -8.5], ['venta', 'Venta 4699 · sáb 11/10', 'Mostrador · Laura', -12], ['compra', 'Compra · lun 29/09', 'Factura A-0007-54990 · Bulonera Centro', 25]] },
    pinza: { nombre: 'Pinza universal 8" aislada', corto: 'Pinza universal 8" aislada', marca: 'Bahco', codigo: 'PU8A', est: 'A-02-06', prov: 'Distribuidora Oeste', foto: 'pinza', stock: 7, min: 5, costo: 11200, sug: 4,
      movs: [['venta', 'Venta 4760 · jue 16/10', 'Mostrador · Carlos', -3], ['compra', 'Compra · jue 02/10', 'Factura A-0012-0350 · Distribuidora Oeste', 10]] },
    llave: { nombre: 'Llave combinada 13 mm cromada', corto: 'Llave combinada 13 mm', marca: 'Bremen', codigo: 'LC13', est: 'A-01-07', prov: 'Distribuidora Oeste', foto: 'llave-combinada', stock: -2, min: 4, costo: 5200, sug: 6,
      movs: [['venta', 'Venta 4788 · sáb 18/10', 'vendida sin stock cargado · Laura', -1], ['venta', 'Venta 4706 · sáb 11/10', 'vendida sin stock cargado · Carlos', -1]] }
  };
  Object.keys(P).forEach(function (k) { P[k].id = k; P[k].unidad = P[k].unidad || 'un.'; });
  St.P = P;
  St.estado = function (p) { return p.stock < 0 ? 'error' : p.stock < p.min ? 'urgente' : p.stock === 0 ? '' : 'logro'; };
  St.estadoDato = function (p) { return p.stock < 0 ? 'error' : p.stock === 0 ? '' : p.stock < p.min ? 'urgente' : 'logro'; };
  St.estadoTexto = function (p) { return p.stock < 0 ? 'negativo' : p.stock === 0 ? 'sin stock' : p.stock < p.min ? 'bajo el mínimo' : 'bien'; };
  // Movimientos con su saldo, del más nuevo al más viejo.
  St.conSaldo = function (p) {
    var s = p.stock;
    return p.movs.map(function (m) { var r = { tipo: m[0], t: m[1], n: m[2], q: m[3], s: s }; s = Math.round((s - m[3]) * 10) / 10; return r; });
  };
  St.ICONO_MOV = { venta: 'shopping-cart', compra: 'truck', ajuste: 'square-pen' };
  St.movHtml = function (m) {
    return '<div class="st-mov"><span class="ic ' + (m.tipo === 'venta' ? '' : m.tipo) + '"><i class="i i-s" data-i="' + St.ICONO_MOV[m.tipo] + '"></i></span><div><span class="tt">' + m.t + '</span><span class="nn">' + m.n + '</span></div><span class="q' + (m.q > 0 ? ' mas' : '') + '">' + St.signo(m.q) + '</span><span class="s">' + St.num(m.s) + '</span></div>';
  };
  // Guarda una corrección: suma el movimiento de ajuste arriba.
  St.ajustar = function (p, hay, motivo, quien) {
    var habia = p.stock, q = Math.round((hay - habia) * 10) / 10;
    p.movs.unshift(['ajuste', 'Ajuste · hoy ' + St.hora(), '«había ' + St.num(habia) + ', hay ' + St.num(hay) + ': ' + motivo.toLowerCase() + '» · ' + (quien || 'Carlos'), q]);
    p.stock = hay;
    return q;
  };
  St.difTexto = function (habia, hay) {
    var d = Math.round((hay - habia) * 10) / 10;
    if (d === 0) return 'coincide con el sistema';
    var pal = { 1: 'una', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco' }[Math.abs(d)] || St.num(Math.abs(d));
    return pal + (Math.abs(d) === 1 ? (d > 0 ? ' más' : ' menos') : (d > 0 ? ' más' : ' menos'));
  };

  // ---------- Diálogo / hoja de un producto: movimientos y corrección ----------
  // o: { corregir: true (abre con la corrección a la vista), alGuardar(p, q) }
  St.fichaProducto = function (p, o) {
    o = o || {};
    var hay = p.stock, motivo = 'Conté la estantería';
    var enCelu = !!celu();
    var html = St.cabecera(p.corto, p.marca + ' · ' + (p.codigo || 'sin código') + ' · Est. ' + p.est, p.foto) +
      '<div class="st-saldo"><div class="t-total" data-saldo>' + St.num(p.stock) + '<small>' + p.unidad + '</small></div><div class="cuenta">Es la suma de sus <b data-cuenta>' + p.movs.length + ' movimientos</b><br>Mínimo <b>' + St.num(p.min) + '</b>' + (p.porque ? ': ' + p.porque : '') + '</div></div>' +
      '<div class="st-lista" data-movs></div>' +
      '<button class="btn btn-fantasma chico" data-ver-todos style="justify-self:start;color:var(--pino-texto)"><i class="i i-s" data-i="history"></i><span>Ver los ' + p.movs.length + '</span></button>' +
      '<div class="st-corr">' +
        '<div class="fila-c"><span class="t-etiqueta" style="color:var(--tinta)">¿Cuántas hay?</span><span class="cantidad"><button data-menos aria-label="Una menos"><i class="i i-s" data-i="minus"></i></button><span class="n" data-hay>' + St.num(hay) + '</span><button data-mas aria-label="Una más"><i class="i i-s" data-i="plus"></i></button></span><span class="vista" data-vista>coincide con el sistema</span></div>' +
        '<div class="chips" data-motivos><span class="chip elegido" data-tocable>Conté la estantería</span><span class="chip" data-tocable>Rotura</span><span class="chip" data-tocable>Pérdida</span>' + (enCelu ? '' : '<span class="chip" data-tocable>Otro…</span>') + '</div>' +
      '</div>' +
      '<div class="st-pie"><button class="btn btn-oscuro" data-guardar>Guardar corrección' + (enCelu ? '' : ' <span class="kbd">Enter</span>') + '</button><button class="btn btn-fantasma" data-cerrar>Cancelar' + (enCelu ? '' : ' <span class="kbd">Esc</span>') + '</button></div>';
    var d = St.abrir({ tipo: enCelu ? 'hoja' : 'dialogo', html: html });
    var el = d.el, todos = false;
    function pintarMovs() {
      var ms = St.conSaldo(p);
      el.querySelector('[data-movs]').innerHTML = (todos ? ms : ms.slice(0, 3)).map(St.movHtml).join('');
      var b = el.querySelector('[data-ver-todos]');
      b.style.display = ms.length > 3 ? '' : 'none';
      b.querySelector('span').textContent = todos ? 'Ver menos' : 'Ver los ' + ms.length;
      window.pintarIconos(el);
    }
    pintarMovs();
    el.querySelector('[data-ver-todos]').addEventListener('click', function () { todos = !todos; pintarMovs(); });
    function poner(n) {
      var sube = n > hay; hay = Math.round(n * 10) / 10;
      St.rodar(el.querySelector('[data-hay]'), St.num(hay), sube);
      el.querySelector('[data-vista]').innerHTML = hay === p.stock ? 'coincide con el sistema' : 'había <b>' + St.num(p.stock) + '</b>, hay <b>' + St.num(hay) + '</b>';
      St.vibrar(10);
    }
    el.querySelector('[data-menos]').addEventListener('click', function () { poner(hay - 1); });
    el.querySelector('[data-mas]').addEventListener('click', function () { poner(hay + 1); });
    St.chipsUno(el.querySelector('[data-motivos]'), function (c) { motivo = c.textContent.replace('…', ''); });
    function guardar() {
      var q = St.ajustar(p, hay, motivo);
      St.rodar(el.querySelector('[data-saldo]'), St.num(p.stock) + '<small>' + p.unidad + '</small>', q > 0);
      el.querySelector('[data-cuenta]').textContent = p.movs.length + ' movimientos';
      pintarMovs(); St.entrar(el.querySelector('[data-movs] .st-mov'));
      St.vibrar([10, 40, 10]);
      if (o.alGuardar) o.alGuardar(p, q);
      setTimeout(function () { d.cerrar('guardar'); }, reducir ? 300 : 700);
    }
    el.querySelector('[data-guardar]').addEventListener('click', guardar);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.target.matches('input, button')) { e.preventDefault(); guardar(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); poner(hay + 1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); poner(hay - 1); }
    });
    el.tabIndex = -1; setTimeout(function () { el.focus(); }, 30);
    if (o.corregir) setTimeout(function () { el.querySelector('.st-corr').scrollIntoView({ block: 'nearest' }); }, 60);
    return d;
  };

  // Todos los movimientos de un producto.
  St.dialogoMovs = function (p) {
    var ms = St.conSaldo(p);
    var html = St.cabecera('Movimientos', p.corto + ' · hay ' + St.num(p.stock) + ' ' + p.unidad + ', la suma de los ' + ms.length, p.foto) +
      '<div style="display:flex;justify-content:space-between" class="t-detalle"><span>Del más nuevo al más viejo</span><span>queda</span></div>' +
      '<div class="st-lista">' + ms.map(St.movHtml).join('') + '</div>';
    return St.abrir({ tipo: celu() ? 'hoja' : 'dialogo', html: html });
  };

  // Un grupo de chips donde se elige uno solo.
  St.chipsUno = function (cont, alElegir, clase) {
    clase = clase || 'elegido';
    if (!cont) return;
    Array.prototype.forEach.call(cont.children, function (c) {
      c.setAttribute('data-tocable', '');
      c.addEventListener('click', function (e) {
        if (c.hasAttribute('data-ir')) return;
        Array.prototype.forEach.call(cont.children, function (x) { x.classList.remove(clase); });
        c.classList.add(clase); St.pulsar(c);
        if (alElegir) alElegir(c, e);
      });
    });
  };

  // ---------- Buscar cualquier producto (Ctrl K) ----------
  St.paleta = function (alElegir, o) {
    o = o || {};
    var html = '<div class="st-cab"><div class="campo" style="flex:1;height:52px"><i class="i" data-i="search"></i><input class="st-escribir" placeholder="Buscá por nombre, código o estantería" aria-label="Buscar"></div>' + St.botonX + '</div>' +
      '<div class="st-lista" data-res></div>' +
      (o.escanear !== false ? '<button class="btn btn-oscuro" data-escanear><i class="i" data-i="scan-barcode"></i>Escanear con el celular</button>' : '');
    var d = St.abrir({ tipo: celu() ? 'hoja' : 'dialogo', html: html });
    var el = d.el, input = el.querySelector('input'), lista = [], elegido = 0;
    function pintar() {
      var q = input.value.trim().toLowerCase();
      lista = Object.keys(P).map(function (k) { return P[k]; }).filter(function (p) {
        return !q || (p.nombre + ' ' + p.codigo + ' ' + p.est + ' ' + p.marca).toLowerCase().indexOf(q) >= 0;
      });
      elegido = Math.min(elegido, Math.max(0, lista.length - 1));
      el.querySelector('[data-res]').innerHTML = lista.length ? lista.map(function (p, i) {
        return '<div class="st-ren boton" data-k="' + p.id + '" style="padding:8px;' + (i === elegido ? 'background:var(--pino-suave)' : '') + '"><span class="foto"><img src="' + St.FOTOS + p.foto + '.webp" alt=""></span><div><span class="tt">' + p.nombre + '</span><span class="nn">' + p.marca + ' · Est. ' + p.est + ' · ' + St.estadoTexto(p) + '</span></div><span class="dato ' + St.estadoDato(p) + '" style="padding:2px 10px"><span class="va" style="font-size:17px">' + St.num(p.stock) + ' ' + p.unidad + '</span></span></div>';
      }).join('') : '<div class="t-detalle" style="padding:16px 4px">No hay ningún producto con «' + input.value + '».</div>';
    }
    pintar();
    input.addEventListener('input', function () { elegido = 0; pintar(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); elegido = Math.min(lista.length - 1, elegido + 1); pintar(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); elegido = Math.max(0, elegido - 1); pintar(); }
      if (e.key === 'Enter' && lista[elegido]) { e.preventDefault(); var p = lista[elegido]; d.cerrar('elegir'); alElegir(p); }
    });
    el.querySelector('[data-res]').addEventListener('click', function (e) {
      var r = e.target.closest('[data-k]'); if (!r) return;
      d.cerrar('elegir'); alElegir(P[r.getAttribute('data-k')]);
    });
    var esc = el.querySelector('[data-escanear]');
    if (esc) esc.addEventListener('click', function () { d.cerrar('escanear'); St.esperarCelular(alElegir); });
    return d;
  };

  // ---------- Escanear desde la compu con el celular en espejo ----------
  St.esperarCelular = function (alLeer, producto) {
    var p = producto || P.cinta;
    var html = St.cabecera('Escaneá con el celular', 'Moto G54 de Carlos · en espejo') +
      '<div data-paso style="display:grid;justify-items:center;gap:12px;padding:16px 0">' +
        '<span class="st-pulsar" style="width:72px;height:72px;border-radius:99px;background:var(--pino-suave);color:var(--pino-texto);display:grid;place-items:center"><i class="i i-xl" data-i="smartphone"></i></span>' +
        '<div class="t-cuerpo" style="text-align:center">El celular abrió la cámara.<br>Apuntá al código de barras del producto.</div>' +
        '<span class="pastilla contorno"><span class="punto" style="background:var(--logro)"></span>Esperando la lectura…</span></div>' +
      '<div class="st-pie"><button class="btn btn-fantasma" data-cerrar>Cancelar <span class="kbd">Esc</span></button></div>';
    var d = St.abrir({ tipo: 'dialogo', html: html });
    var t = setTimeout(function () {
      if (!d.capa.isConnected) return;
      var paso = d.el.querySelector('[data-paso]');
      paso.innerHTML = '<span class="st-listo"><span class="tilde"><i class="i i-xl" data-i="check"></i></span></span><div class="t-renglon">' + p.nombre + '</div><div class="t-detalle">Leyó ' + (p.codigo || 'la etiqueta') + ' · hay ' + St.num(p.stock) + ' ' + p.unidad + '</div>';
      window.pintarIconos(paso);
      setTimeout(function () { d.cerrar('leido'); alLeer(p); }, reducir ? 400 : 900);
    }, 1400);
    return d;
  };

  // ---------- Cámara del celular (pantalla completa) ----------
  St.camaraCelu = function (alLeer, producto) {
    var p = producto || P.cinta;
    var c = document.createElement('div');
    c.className = 'st-capa camara';
    c.style.cssText = 'background:#0B110F;align-items:stretch;z-index:60';
    c.innerHTML = '<div style="position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 45%, #4a4038 0%, #2a2420 45%, #120f0d 100%)"></div>' +
      '<img src="' + St.FOTOS + p.foto + '.webp" alt="" style="position:absolute;left:50%;top:230px;width:220px;margin-left:-110px;filter:drop-shadow(0 18px 18px rgba(0,0,0,.55))">' +
      '<div data-marco style="position:absolute;left:75px;top:300px;width:240px;height:140px;border:4px solid #fff;border-radius:18px;transition:transform 200ms var(--curva)"></div>' +
      '<div data-linea style="position:absolute;left:85px;top:310px;width:220px;height:2px;background:var(--accion);box-shadow:0 0 8px var(--accion)"></div>' +
      '<button class="st-x" data-cerrar-cam aria-label="Cerrar la cámara" style="position:absolute;left:16px;top:56px;background:rgba(0,0,0,.42);color:#fff;border:1px solid rgba(255,255,255,.18);width:48px;height:48px"><i class="i" data-i="x"></i></button>' +
      '<div style="position:absolute;left:0;right:0;top:470px;text-align:center;color:#fff;font-weight:700">Apuntá al código de barras</div>';
    celu().appendChild(c); window.pintarIconos(c);
    var linea = c.querySelector('[data-linea]');
    var anim = (!reducir && linea.animate) ? linea.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(118px)' }], { duration: 900, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }) : null;
    var abierta = true;
    function cerrar() { if (!abierta) return; abierta = false; if (anim) anim.cancel(); c.remove(); document.removeEventListener('keydown', esc, true); }
    function esc(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); cerrar(); } }
    document.addEventListener('keydown', esc, true);
    c.querySelector('[data-cerrar-cam]').addEventListener('click', cerrar);
    setTimeout(function () {
      if (!abierta) return;
      c.querySelector('[data-marco]').style.transform = 'scale(.8)';
      St.vibrar(10);
      setTimeout(function () { cerrar(); alLeer(p); }, reducir ? 100 : 300);
    }, 1300);
    return { cerrar: cerrar };
  };

  // ---------- Qué pedir: lo sugerido por proveedor, y sumarlo al pedido ----------
  var PROV = [
    { id: 'BC', nombre: 'Bulonera Centro', n: 9, items: ['mecha', 'tarugos', 'clavos', 'tornillo'], total: 252000 },
    { id: 'DO', nombre: 'Distribuidora Oeste', n: 7, items: ['martillo', 'llave', 'cinta'], total: 118000 },
    { id: 'BR', nombre: 'Bremen Herramientas', n: 11, items: ['puntas'], total: 96000 },
    { id: 'AL', nombre: 'Pinturerías Alba', n: 1, items: ['latex'], total: 41000 }
  ];
  St.PROV = PROV;
  St.quePedir = function () {
    var enCelu = !!celu(), prov = PROV[0], pedido = [];
    var html = St.cabecera('Qué pedir', '28 bajo el mínimo · a 4 proveedores, por el más barato') +
      '<div class="segmentos" data-provs style="display:flex">' + PROV.map(function (pr, i) { return '<span class="' + (i ? '' : 'elegido') + '" data-p="' + i + '" style="flex:1;justify-content:center">' + (enCelu ? pr.id : pr.nombre.split(' ')[0]) + ' · ' + pr.n + '</span>'; }).join('') + '</div>' +
      '<div class="st-lista" data-sug></div>' +
      '<div class="tarjeta" style="padding:12px 14px;display:grid;gap:4px"><div class="t-etiqueta" style="color:var(--tinta)">Pedido a <span data-pnom>Bulonera Centro</span></div><div class="st-lista" data-ped><div class="t-detalle" data-vacio>Todavía nada. Tocá «Sumar» en lo que quieras pedir.</div></div>' +
        '<div class="st-total"><span class="t-etiqueta">Costo estimado, sin IVA</span><span class="t-numero" data-tot>' + St.pesos(0) + '</span></div></div>' +
      '<div class="st-pie"><button class="btn btn-accion' + (enCelu ? ' grande' : '') + '" data-ir="compras"><i class="i" data-i="truck"></i>Seguir en Compras</button><button class="btn btn-fantasma" data-cerrar>Cerrar</button></div>';
    var d = St.abrir({ tipo: enCelu ? 'hoja' : 'dialogo', html: html, clase: 'ancho' });
    var el = d.el;
    function total() { return pedido.reduce(function (a, p) { return a + p.costo * p.sug; }, 0); }
    function pintarSug() {
      el.querySelector('[data-sug]').innerHTML = prov.items.map(function (k) {
        var p = P[k], ya = pedido.indexOf(p) >= 0;
        return '<div class="st-ren"><span class="foto"><img src="' + St.FOTOS + p.foto + '.webp" alt=""></span><div><span class="tt">' + p.corto + '</span><span class="nn">Hay ' + St.num(p.stock) + ' de ' + St.num(p.min) + ' · pedí ' + p.sug + ' · ' + St.pesos(p.costo * p.sug) + '</span></div>' +
          (ya ? '<span class="pastilla logro"><i class="i i-s" data-i="check"></i>Sumado</span>' : '<button class="btn chico" data-sumar="' + k + '"><i class="i i-s" data-i="plus"></i>Sumar</button>') + '</div>';
      }).join('') + (prov.n > prov.items.length ? '<div class="t-detalle" style="padding:6px 0">y ' + (prov.n - prov.items.length) + ' productos más de ' + prov.nombre + '</div>' : '');
      window.pintarIconos(el);
    }
    pintarSug();
    St.chipsUno(el.querySelector('[data-provs]'), function (c) {
      prov = PROV[+c.getAttribute('data-p')];
      pedido = []; el.querySelector('[data-pnom]').textContent = prov.nombre;
      el.querySelector('[data-ped]').innerHTML = '<div class="t-detalle" data-vacio>Todavía nada. Tocá «Sumar» en lo que quieras pedir.</div>';
      el.querySelector('[data-tot]').innerHTML = St.pesos(0);
      pintarSug(); St.fundir(el.querySelector('[data-sug]'));
    });
    el.querySelector('[data-sug]').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sumar]'); if (!b) return;
      var p = P[b.getAttribute('data-sumar')];
      pedido.push(p);
      var v = el.querySelector('[data-vacio]'); if (v) v.remove();
      var r = document.createElement('div');
      r.className = 'st-ren'; r.style.gridTemplateColumns = '1fr auto auto';
      r.innerHTML = '<span class="tt">' + p.corto + '</span><span class="pastilla contorno" style="height:24px">' + p.sug + ' ' + p.unidad + '</span><span class="der">' + St.pesos(p.costo * p.sug) + '</span>';
      el.querySelector('[data-ped]').appendChild(r); St.entrar(r);
      St.rodar(el.querySelector('[data-tot]'), St.pesos(total()), true);
      pintarSug(); St.vibrar(10);
    });
    return d;
  };

  // ---------- Imprimir etiquetas ----------
  St.dialogoEtiquetas = function (opciones, alImprimir) {
    var enCelu = !!celu(), elegida = opciones[0];
    var html = St.cabecera('Imprimir etiquetas', 'Precio, código de barras y estantería · A4, 24 por hoja') +
      '<div class="st-lista" data-ops>' + opciones.map(function (op, i) {
        return '<div class="st-ren boton" data-o="' + i + '" style="grid-template-columns:28px 1fr auto;padding:10px 8px"><span data-marca style="width:22px;height:22px;border-radius:99px;border:2px solid ' + (i ? 'var(--borde-fuerte)' : 'var(--pino)') + ';display:grid;place-items:center">' + (i ? '' : '<span style="width:10px;height:10px;border-radius:9px;background:var(--pino)"></span>') + '</span><div><span class="tt">' + op[0] + '</span><span class="nn">' + op[1] + '</span></div><span class="der">' + op[2] + '</span></div>';
      }).join('') + '</div>' +
      '<div class="st-pie"><button class="btn btn-oscuro" data-imprimir><i class="i" data-i="printer"></i><span>Imprimir ' + elegida[2] + '</span></button><button class="btn btn-fantasma" data-cerrar>Cancelar' + (enCelu ? '' : ' <span class="kbd">Esc</span>') + '</button></div>';
    var d = St.abrir({ tipo: enCelu ? 'hoja' : 'dialogo', html: html });
    var el = d.el;
    el.querySelector('[data-ops]').addEventListener('click', function (e) {
      var r = e.target.closest('[data-o]'); if (!r) return;
      elegida = opciones[+r.getAttribute('data-o')];
      el.querySelectorAll('[data-marca]').forEach(function (m) { m.style.borderColor = 'var(--borde-fuerte)'; m.innerHTML = ''; });
      var m = r.querySelector('[data-marca]'); m.style.borderColor = 'var(--pino)'; m.innerHTML = '<span style="width:10px;height:10px;border-radius:9px;background:var(--pino)"></span>';
      el.querySelector('[data-imprimir] span').textContent = 'Imprimir ' + elegida[2];
    });
    el.querySelector('[data-imprimir]').addEventListener('click', function () {
      el.innerHTML = '<div class="st-listo"><span class="tilde"><i class="i i-xl" data-i="check"></i></span><div class="t-seccion">Se mandaron ' + elegida[2] + ' etiquetas</div><div class="t-detalle">A la impresora del mostrador · ' + Math.max(1, Math.ceil(parseInt(String(elegida[2]).replace(/\D/g, ''), 10) / 24)) + ' hoja(s) A4</div></div><div class="st-pie"><button class="btn" data-cerrar>Listo</button></div>';
      window.pintarIconos(el); St.vibrar([10, 40, 10]);
      if (alImprimir) alImprimir(elegida);
    });
    return d;
  };

  window.St = St;
})();

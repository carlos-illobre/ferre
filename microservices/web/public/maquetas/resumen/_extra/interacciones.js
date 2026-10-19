/* Interacciones de las maquetas de Negocio → Resumen. Lo comparten las seis variantes.
   Nada de lógica de verdad: abre hojas, paneles y diálogos con el lenguaje común, rueda números,
   muestra tostadas y arma «la cuenta» de un número. Solo transform y opacity; con «reducir
   movimiento» no se mueve nada. Va al pie de cada index.html, después de iconos.js. */
(function () {
  var R = window.RES = {};
  var enCelu = !!document.querySelector('.celu');
  R.enCelu = enCelu;
  R.quieto = function () { return matchMedia('(prefers-reduced-motion: reduce)').matches; };
  R.anim = function (el, frames, opts) {
    if (!el || !el.animate || R.quieto()) return null;
    return el.animate(frames, Object.assign({ duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }, opts || {}));
  };
  R.vibrar = function (p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} };

  /* ---------- Números ---------- */
  R.miles = function (n) { var s = String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (n < 0 ? '−' : '') + s; };
  R.pesos = function (n) { return (n < 0 ? '−' : '') + '$' + R.miles(Math.abs(n)); };
  R.pesosH = function (n) { return (n < 0 ? '−' : '') + '<span class="peso">$</span>' + R.miles(Math.abs(n)); };
  function valor(t) { var m = String(t).replace(/<[^>]+>/g, '').replace(/\./g, '').match(/−?-?\d+/); return m ? Number(m[0].replace('−', '-')) : 0; }

  /* Un número que cambia: los dígitos ruedan hacia arriba si sube y hacia abajo si baja. */
  R.rodar = function (el, html) {
    if (!el) return;
    if (el.innerHTML === html) return;
    var sube = valor(html) >= valor(el.innerHTML);
    if (R.quieto() || !el.animate) { el.innerHTML = html; return; }
    var d = sube ? 1 : -1;
    var a = el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(' + (-d * 40) + '%)', opacity: 0 }], { duration: 100, easing: 'cubic-bezier(.4,0,1,1)' });
    a.onfinish = function () {
      el.innerHTML = html; window.pintarIconos && pintarIconos(el);
      el.animate([{ transform: 'translateY(' + (d * 40) + '%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 160, easing: 'cubic-bezier(.2,.8,.2,1)' });
    };
  };
  /* Cambia el contenido de un bloque con un fundido corto. */
  R.fundir = function (el, html) {
    if (!el) return;
    el.innerHTML = html; window.pintarIconos && pintarIconos(el);
    R.anim(el, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 200 });
  };
  /* Algo nuevo: entra desde 8 px abajo con rebote y su borde se pinta de verde 1 s. */
  R.nuevo = function (el) {
    if (!el) return;
    el.classList.add('r-recien');
    setTimeout(function () { el.classList.remove('r-recien'); }, 1000);
    R.anim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.34,1.4,.64,1)' });
  };
  /* Tarjetas que aparecen de arriba abajo, 40 ms entre una y otra. No corre en las capturas. */
  R.entrada = function (sel) {
    if (navigator.webdriver) return;
    Array.prototype.forEach.call(document.querySelectorAll(sel), function (el, i) {
      R.anim(el, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: i * 40 });
    });
  };
  /* El segmento elegido se desliza al nuevo (200 ms). */
  R.segmento = function (btn) {
    var cont = btn.parentElement, viejo = cont.querySelector('.elegido');
    if (viejo === btn) return false;
    if (viejo && !R.quieto() && btn.animate) {
      var a = viejo.getBoundingClientRect(), b = btn.getBoundingClientRect();
      btn.classList.add('elegido');
      btn.animate([{ transform: 'translateX(' + (a.left - b.left) * 0.25 + 'px)' }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    } else btn.classList.add('elegido');
    if (viejo) viejo.classList.remove('elegido');
    return true;
  };

  /* ---------- Estilos de lo que se abre ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '[data-toca]{cursor:pointer}',
    '[data-toca]:not(button){transition:transform 200ms var(--curva)}',
    '[data-toca].r-levantada{transform:translateY(-2px)}',
    '.r-recien{position:relative}',
    '.r-recien::after{content:"";position:absolute;inset:-1px;border-radius:inherit;box-shadow:0 0 0 2px var(--logro);pointer-events:none;animation:r-apagar 1s var(--curva-salida) forwards}',
    '@keyframes r-apagar{0%,60%{opacity:1}100%{opacity:0}}',
    '.r-velo{position:fixed;inset:0;background:rgba(26,29,27,.3);z-index:60;opacity:0;transition:opacity 320ms var(--curva)}',
    '.r-velo.abierto{opacity:1}',
    '.r-capa{position:fixed;z-index:61;background:var(--superficie);display:flex;flex-direction:column;box-shadow:var(--sombra-3);border:1px solid var(--borde)}',
    '.r-panel{top:0;right:0;bottom:0;width:440px;border-width:0 0 0 1px;border-radius:24px 0 0 24px;transform:translateX(100%);transition:transform 320ms var(--curva)}',
    '.r-panel.abierto{transform:none}',
    '.r-dialogo{left:50%;top:50%;width:520px;max-height:calc(100vh - 80px);border-radius:24px;opacity:0;transform:translate(-50%,-48%) scale(.97);transition:transform 200ms var(--curva),opacity 200ms var(--curva)}',
    '.r-dialogo.abierto{opacity:1;transform:translate(-50%,-50%)}',
    '.celu .r-velo,.celu .r-capa{position:absolute}',
    '.r-hoja{left:0;right:0;bottom:0;max-height:88%;border-radius:24px 24px 0 0;border-width:1px 0 0;transform:translateY(100%);transition:transform 320ms var(--curva)}',
    '.r-hoja.abierto{transform:none}',
    '.r-asa{width:40px;height:5px;border-radius:99px;background:var(--hundido-2);margin:8px auto 0;flex:none}',
    '.r-cab{display:flex;align-items:flex-start;gap:12px;padding:20px 20px 12px;flex:none}',
    '.r-hoja .r-cab{padding:12px 16px 10px}',
    '.r-cab .r-tit{font-size:20px;line-height:26px;font-weight:800;letter-spacing:-.01em}',
    '.r-cab .r-sub{font-size:14px;line-height:20px;color:var(--texto-2);font-weight:550;margin-top:2px}',
    '.r-cab .r-x{margin-left:auto;flex:none}',
    '.r-cuerpo{flex:1;min-height:0;overflow:auto;padding:0 20px 16px;scrollbar-width:thin}',
    '.r-hoja .r-cuerpo{padding:0 16px 16px}',
    '.r-pie{flex:none;display:flex;gap:8px;padding:12px 20px 20px;border-top:1px solid var(--borde)}',
    '.r-hoja .r-pie{padding:12px 16px 28px}',
    '.r-pie .btn{flex:1}',
    '.r-grande{font-size:40px;line-height:46px;font-weight:800;letter-spacing:-.03em;margin:4px 0 8px}',
    '.r-cuenta{display:grid;margin-top:4px}',
    '.r-fila{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:8px;min-height:44px;padding:6px 0;border-bottom:1px solid var(--borde);font-size:15px;font-weight:650}',
    '.r-fila .op{color:var(--texto-3);font-weight:800;text-align:center}',
    '.r-fila small{display:block;font-size:14px;font-weight:550;color:var(--texto-2)}',
    '.r-fila .v{font-weight:800;text-align:right;white-space:nowrap}',
    '.r-fila.total{border-bottom:0;border-top:2px solid var(--tinta);font-size:17px;font-weight:800;margin-top:-1px}',
    '.r-fila.total .v{font-size:20px}',
    '.r-fila.resta .v{color:var(--error-texto)}',
    '.r-fila.logro .v{color:var(--logro-texto)}',
    '.r-fila.urgente .v{color:var(--urgente-texto)}',
    '.r-nota{margin-top:12px;font-size:14px;line-height:20px;color:var(--texto-2);font-weight:550}',
    '.r-titulo-lista{font-size:14px;font-weight:700;color:var(--texto-2);margin:16px 0 6px}',
    '.r-ren{display:grid;grid-template-columns:40px minmax(0,1fr) auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid var(--borde)}',
    '.r-ren:last-child{border-bottom:0}',
    '.r-ren .ic{width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--hundido);color:var(--texto-2)}',
    '.r-ren .tt{font-weight:700;font-size:15px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.r-ren .dd{font-size:14px;line-height:20px;color:var(--texto-2);font-weight:550;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.r-ren .v{font-weight:800;font-size:15px;text-align:right;white-space:nowrap}',
    '.r-ren .v small{display:block;font-size:14px;font-weight:600;color:var(--texto-3)}',
    '.r-menu{position:fixed;z-index:61;min-width:260px;padding:6px;background:var(--superficie);border:1px solid var(--borde);border-radius:16px;box-shadow:var(--sombra-3);opacity:0;transform:scale(.97);transform-origin:top left;transition:opacity 200ms var(--curva),transform 200ms var(--curva)}',
    '.r-menu.abierto{opacity:1;transform:none}',
    '.r-menu a,.r-menu button{display:flex;align-items:center;gap:12px;width:100%;height:44px;padding:0 12px;border:0;border-radius:10px;background:none;font-weight:650;font-size:15px;color:var(--tinta);text-decoration:none;cursor:pointer;text-align:left}',
    '.r-menu a:hover,.r-menu button:hover{background:var(--hundido)}',
    '.r-menu .elegido{background:var(--pino-suave);color:var(--pino);font-weight:750}',
    '.r-menu .sep{height:1px;background:var(--borde);margin:4px 6px}',
    '.r-menu .det{margin-left:auto;font-size:14px;color:var(--texto-3);font-weight:600}',
    '.r-mas{display:grid;gap:8px}',
    '.r-mas a{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border-radius:16px;background:var(--superficie);border:1px solid var(--borde);box-shadow:var(--sombra-1);color:var(--tinta);text-decoration:none}',
    '.r-mas .ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--hundido);color:var(--texto-2)}',
    '.r-mas .ic.urg{background:var(--urgente-suave);color:var(--urgente-texto)}',
    '.r-mas .tt{font-weight:750;font-size:16px;line-height:22px}',
    '.r-mas .dd{font-size:14px;line-height:20px;color:var(--texto-2);font-weight:550}',
    '.r-tostada{position:fixed;left:50%;bottom:28px;z-index:70;opacity:0;transform:translate(-50%,16px);transition:opacity 200ms var(--curva),transform 320ms var(--curva);pointer-events:none}',
    '.celu .r-tostada{position:absolute;bottom:100px;max-width:358px}',
    '.r-tostada.abierto{opacity:1;transform:translate(-50%,0)}',
    '.r-bloq{position:relative}',
    '.r-bloq>*:not(.r-candado){opacity:.15;transition:opacity 200ms var(--curva)}',
    '.r-candado{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity 200ms var(--curva)}',
    '.r-bloq>.r-candado{opacity:1}',
    '.r-candado span{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:99px;background:var(--superficie);border:1px solid var(--borde);box-shadow:var(--sombra-1);font-size:14px;font-weight:700;color:var(--texto-2)}',
    '.r-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
    '.r-chips .chip{height:40px;cursor:pointer}',
    '.r-campo{width:100%;min-height:52px;margin-top:8px;padding:12px 16px;border-radius:var(--r);border:1px solid var(--borde-fuerte);background:var(--superficie);font:500 16px/24px var(--letra);color:var(--tinta);resize:none}',
    '.r-campo:focus{outline:none;border-color:var(--pino);box-shadow:0 0 0 4px rgba(18,56,47,.12)}',
    '@media (prefers-reduced-motion: reduce){.r-velo,.r-capa,.r-menu,.r-tostada,[data-toca]{transition:none!important}.r-recien::after{animation:none!important;opacity:0}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- Hojas, paneles y diálogos ---------- */
  var raiz = function () { return document.querySelector('.celu') || document.body; };
  var abierta = null;

  R.cerrar = function (inmediato) {
    if (!abierta) return;
    var a = abierta; abierta = null;
    a.capa.classList.remove('abierto'); a.velo.classList.remove('abierto');
    if (a.origen) a.origen.classList.remove('r-levantada');
    var quitar = function () { a.capa.remove(); a.velo.remove(); };
    if (inmediato || R.quieto()) quitar(); else setTimeout(quitar, 320);
    if (a.alCerrar) a.alCerrar();
    if (a.foco && a.foco.focus) try { a.foco.focus({ preventScroll: true }); } catch (e) {}
  };

  /* o: {titulo, sub, cuerpo, pie, tipo: 'hoja'|'panel'|'dialogo', origen, ancho, alAbrir, alCerrar} */
  R.abrir = function (o) {
    R.cerrarMenu();
    R.cerrar(true);
    var tipo = o.tipo || (enCelu ? 'hoja' : 'panel');
    if (enCelu && tipo !== 'hoja') tipo = 'hoja';
    var velo = document.createElement('div'); velo.className = 'r-velo';
    var capa = document.createElement('div'); capa.className = 'r-capa r-' + tipo;
    capa.setAttribute('role', 'dialog'); capa.setAttribute('aria-modal', 'true'); capa.setAttribute('aria-label', o.titulo || '');
    if (o.ancho) capa.style.width = o.ancho + 'px';
    capa.innerHTML = (tipo === 'hoja' ? '<div class="r-asa"></div>' : '') +
      '<div class="r-cab"><div><div class="r-tit">' + (o.titulo || '') + '</div>' + (o.sub ? '<div class="r-sub">' + o.sub + '</div>' : '') + '</div>' +
      '<button class="btn btn-icono chico btn-fantasma r-x" data-cerrar aria-label="Cerrar"><i class="i" data-i="x"></i></button></div>' +
      '<div class="r-cuerpo">' + (o.cuerpo || '') + '</div>' + (o.pie ? '<div class="r-pie">' + o.pie + '</div>' : '');
    var r = raiz(); r.appendChild(velo); r.appendChild(capa);
    window.pintarIconos && pintarIconos(capa);
    velo.addEventListener('click', function () { R.cerrar(); });
    capa.addEventListener('click', function (e) { if (e.target.closest('[data-cerrar]')) R.cerrar(); });
    if (o.origen) o.origen.classList.add('r-levantada');
    abierta = { capa: capa, velo: velo, origen: o.origen, alCerrar: o.alCerrar, foco: document.activeElement };
    capa.getBoundingClientRect();
    requestAnimationFrame(function () { velo.classList.add('abierto'); capa.classList.add('abierto'); });
    // cada término de la cuenta entra uno tras otro, como sumando
    Array.prototype.forEach.call(capa.querySelectorAll('.r-fila, .r-ren'), function (f, i) {
      R.anim(f, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 140 + i * 60 });
    });
    var x = capa.querySelector('.r-x'); if (x) x.focus({ preventScroll: true });
    if (o.alAbrir) o.alAbrir(capa);
    return capa;
  };
  R.capa = function () { return abierta && abierta.capa; };

  /* ---------- Menú chico (computadora) ---------- */
  var menu = null;
  R.cerrarMenu = function () {
    if (!menu) return; var m = menu; menu = null;
    m.classList.remove('abierto'); setTimeout(function () { m.remove(); }, R.quieto() ? 0 : 200);
  };
  /* items: [{texto, icono, ir, det, elegido, accion, sep}] */
  R.menu = function (ancla, items, lado) {
    if (menu && menu._ancla === ancla) { R.cerrarMenu(); return; }
    R.cerrarMenu();
    var m = document.createElement('div'); m.className = 'r-menu'; m.setAttribute('role', 'menu'); m._ancla = ancla;
    items.forEach(function (it, i) {
      if (it.sep) { var s = document.createElement('div'); s.className = 'sep'; m.appendChild(s); return; }
      var b = document.createElement(it.ir ? 'a' : 'button'); b.setAttribute('role', 'menuitem');
      if (it.ir) b.setAttribute('data-ir', it.ir);
      if (it.elegido) b.className = 'elegido';
      b.innerHTML = (it.icono ? '<i class="i" data-i="' + it.icono + '"></i>' : '') + '<span>' + it.texto + '</span>' + (it.det ? '<span class="det">' + it.det + '</span>' : '');
      b.addEventListener('click', function () { R.cerrarMenu(); if (it.accion) it.accion(); });
      m.appendChild(b);
    });
    document.body.appendChild(m); window.pintarIconos && pintarIconos(m);
    var a = ancla.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
    var x, y;
    if (lado === 'derecha') { x = a.right + 8; y = Math.min(a.top, innerHeight - h - 12); m.style.transformOrigin = 'left center'; }
    else { x = Math.min(a.left, innerWidth - w - 12); y = a.bottom + 6; if (a.left + w > innerWidth - 12) { x = a.right - w; m.style.transformOrigin = 'top right'; } }
    m.style.left = Math.max(12, x) + 'px'; m.style.top = Math.max(12, y) + 'px';
    menu = m;
    requestAnimationFrame(function () { m.classList.add('abierto'); });
    var f = m.querySelector('a,button'); if (f) f.focus({ preventScroll: true });
  };
  document.addEventListener('pointerdown', function (e) {
    if (menu && !menu.contains(e.target) && !(menu._ancla && menu._ancla.contains(e.target))) R.cerrarMenu();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (menu) { R.cerrarMenu(); e.preventDefault(); } else if (abierta) { R.cerrar(); e.preventDefault(); } }
  });

  /* «Más»: en la computadora, un menú al costado; en el celular, una hoja con tarjetas. */
  var MAS = [
    { texto: 'Anomalías', icono: 'triangle-alert', ir: 'anomalias', det: '3 para mirar', urg: true },
    { texto: 'Procesos', icono: 'workflow', ir: 'procesos', det: 'Todo al día' },
    { texto: 'Mejoras y errores', icono: 'bug', ir: 'mejoras-y-errores', det: '2 respuestas nuevas' },
    { texto: 'Configuración', icono: 'settings', ir: 'configuracion', det: 'Local, impresora, medios' }
  ];
  R.mas = function (ancla) {
    if (!enCelu) { R.menu(ancla, MAS, 'derecha'); return; }
    R.abrir({ titulo: 'Más', sub: 'Lo que se usa de vez en cuando', cuerpo: '<div class="r-mas">' + MAS.map(function (it) {
      return '<a data-ir="' + it.ir + '"><span class="ic' + (it.urg ? ' urg' : '') + '"><i class="i i-l" data-i="' + it.icono + '"></i></span><div><div class="tt">' + it.texto + '</div><div class="dd">' + it.det + '</div></div><i class="i" data-i="chevron-right" style="color:var(--texto-3)"></i></a>';
    }).join('') + '</div>' });
  };
  document.addEventListener('click', function (e) {
    var m = e.target.closest && e.target.closest('[data-mas]');
    if (m) { e.preventDefault(); R.mas(m); }
    // al ir a otra pantalla desde una hoja o un menú, se cierran
    if (e.target.closest && e.target.closest('.r-capa [data-ir], .r-menu [data-ir]')) setTimeout(function () { R.cerrar(true); }, 0);
  });

  /* ---------- Tostada ---------- */
  var tostT = null, tost = null;
  R.tostada = function (texto, icono) {
    if (tost) tost.remove();
    var t = document.createElement('div'); t.className = 'r-tostada'; t.setAttribute('role', 'status');
    t.innerHTML = '<span class="tostada"><i class="i" data-i="' + (icono || 'circle-check') + '"></i>' + texto + '</span>';
    raiz().appendChild(t); window.pintarIconos && pintarIconos(t); tost = t;
    requestAnimationFrame(function () { t.classList.add('abierto'); });
    clearTimeout(tostT);
    tostT = setTimeout(function () { t.classList.remove('abierto'); setTimeout(function () { t.remove(); }, 320); }, 2600);
  };

  /* Lo que un rol no ve baja a 15 % con un candado al centro (200 ms); lo que sí ve no se mueve. */
  R.bloquear = function (el, si, texto) {
    var c = el.querySelector(':scope > .r-candado');
    if (si && !c) {
      c = document.createElement('div'); c.className = 'r-candado';
      c.innerHTML = '<span><i class="i i-s" data-i="lock-keyhole"></i>' + (texto || 'No lo ve') + '</span>';
      el.appendChild(c); window.pintarIconos && pintarIconos(c);
      c.getBoundingClientRect();
    } else if (c && texto) c.querySelector('span').lastChild.textContent = texto;
    el.classList.toggle('r-bloq', !!si);
  };

  /* ---------- Piezas para armar lo que se abre ---------- */
  /* filas: [[texto, valor, tipo, detalle]] tipo: '' | 'suma' | 'resta' | 'total' | 'logro' | 'urgente' */
  R.cuenta = function (filas) {
    return '<div class="r-cuenta">' + filas.map(function (f, i) {
      var t = f[2] || '', op = t.indexOf('resta') >= 0 ? '−' : (t.indexOf('total') >= 0 ? '=' : (i > 0 && t.indexOf('suma') >= 0 ? '+' : ''));
      return '<div class="r-fila ' + t + '"><span class="op">' + op + '</span><span>' + f[0] + (f[3] ? '<small>' + f[3] + '</small>' : '') + '</span><span class="v num">' + f[1] + '</span></div>';
    }).join('') + '</div>';
  };
  /* renglones: [{foto, icono, color, titulo, detalle, valor, sub, extra}] */
  R.renglones = function (rs) {
    return '<div>' + rs.map(function (r) {
      var ic = r.foto ? '<span class="foto chica"><img src="' + r.foto + '" alt=""></span>' :
        '<span class="ic"' + (r.color ? ' style="background:var(--' + r.color + '-suave);color:var(--' + r.color + ')"' : '') + '><i class="i i-s" data-i="' + (r.icono || 'receipt') + '"></i></span>';
      return '<div class="r-ren"' + (r.attr || '') + '>' + ic + '<div><div class="tt">' + r.titulo + '</div>' + (r.detalle ? '<div class="dd">' + r.detalle + '</div>' : '') + '</div><div class="v num">' + (r.valor || '') + (r.sub ? '<small>' + r.sub + '</small>' : '') + (r.extra || '') + '</div></div>';
    }).join('') + '</div>';
  };

  /* Ventas ficticias que suman un total: n ventas, múltiplos de $1.000, horas del local. */
  var COSAS = ['Látex interior mate blanco 4 L', 'Mecha acero rápido HSS 8 mm × 2', 'Tarugos nylon S8 con tope × 100', 'Cinta métrica PowerLock 5 m', 'Clavos punta París 2" · 1,5 kg', 'Pinza universal 8" Bahco', 'Lámpara LED 12 W luz fría × 3', 'Llave combinada 13 mm', 'Tornillos autoperforantes 8 × 1" × 100', 'Martillo galponero 27 mm', 'Puntas Phillips PH2 × 10', 'Silicona acética transparente'];
  var MEDIO = { efectivo: ['Efectivo', 'banknote'], mp: ['Mercado Pago', 'qr-code'], tarjeta: ['Tarjeta', 'credit-card'], cuenta: ['Cuenta corriente', 'notebook-pen'] };
  R.MEDIO = MEDIO;
  R.ventas = function (n, total, medio, semilla) {
    var s = semilla || 7, rnd = function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    var pesos = [], suma = 0, i;
    for (i = 0; i < n; i++) { var p = 0.4 + rnd() * 1.6; pesos.push(p); suma += p; }
    var miles = total / 1000, acc = 0, montos = pesos.map(function (p, i) { var m = i === n - 1 ? miles - acc : Math.max(1, Math.round(p / suma * miles)); acc += m; return m * 1000; });
    var horas = [], mins = [];
    for (i = 0; i < n; i++) { var h = rnd() < 0.55 ? 8 + Math.floor(rnd() * 5) : 16 + Math.floor(rnd() * 3); horas.push(h * 60 + Math.floor(rnd() * 60)); }
    horas.sort(function (a, b) { return b - a; });
    return montos.map(function (m, i) {
      var h = horas[i], hh = Math.floor(h / 60), mm = ('0' + (h % 60)).slice(-2);
      var c = COSAS[Math.floor(rnd() * COSAS.length)], otros = Math.floor(rnd() * 4);
      return { titulo: c + (otros ? ' y ' + otros + ' más' : ''), detalle: hh + ':' + mm + ' · ' + (medio ? MEDIO[medio][0] : 'Mariela'), valor: R.pesos(m), icono: medio ? MEDIO[medio][1] : 'receipt', color: medio === 'cuenta' ? 'cuenta' : medio };
    });
  };

  /* El cierre de caja: el mismo diálogo en todas las variantes. alGuardar(motivo) */
  R.caja = function (origen, alGuardar, anotado) {
    var motivos = ['Vuelto mal dado', 'Retiro sin anotar', 'Billete falso', 'No sé todavía'];
    var capa = R.abrir({
      tipo: 'dialogo', origen: origen,
      titulo: 'Cierre de caja', sub: 'Hoy, lunes 19/10 · 19:05 · lo cerró Mariela',
      cuerpo: '<div style="display:flex;align-items:center;gap:10px"><span class="r-grande num" style="color:var(--urgente-texto)">−<span class="peso">$</span>2.000</span><span class="pastilla urgente">de menos</span></div>' +
        R.cuenta([['Ventas en efectivo', '$186.000', 'suma', '11 ventas, de 8:12 a 18:47'], ['Esperado en la caja', '$186.000', 'total'], ['Contado por Mariela', '$184.000', ''], ['Diferencia', '−$2.000', 'urgente']]) +
        '<div class="r-nota">La diferencia es un dato, no una acusación: se anota el motivo si se sabe, y queda en Quién hizo qué.</div>' +
        '<div class="r-titulo-lista">Motivo</div>' +
        (anotado ? '<div class="aviso logro"><i class="i i-s" data-i="circle-check"></i>Anotado: ' + anotado + '</div>' :
          '<div class="r-chips">' + motivos.map(function (m) { return '<button class="chip" data-motivo="' + m + '">' + m + '</button>'; }).join('') + '</div>'),
      pie: '<a class="btn" data-ir="ventas-de-hoy"><i class="i i-s" data-i="receipt"></i>Ver las 11 ventas</a>' +
        (anotado ? '<button class="btn" data-cerrar>Listo</button>' : '<button class="btn btn-accion" data-guardar disabled><i class="i i-s" data-i="check"></i>Anotar el motivo</button>')
    });
    var elegido = null;
    capa.addEventListener('click', function (e) {
      var c = e.target.closest('[data-motivo]');
      if (c) { capa.querySelectorAll('[data-motivo]').forEach(function (x) { x.classList.toggle('elegido', x === c); }); elegido = c.getAttribute('data-motivo'); capa.querySelector('[data-guardar]').disabled = false; }
      if (e.target.closest('[data-guardar]') && elegido) { R.cerrar(); R.tostada('Motivo anotado: ' + elegido.toLowerCase()); R.vibrar([10, 40, 10]); if (alGuardar) alGuardar(elegido); }
    });
  };

  /* Un producto: lo vendido, lo que gana y su stock, con el botón a su ficha. */
  R.producto = function (origen, p, periodo) {
    R.abrir({
      origen: origen, titulo: p.nombre, sub: p.marca + ' · ' + p.codigo + ' · Est. ' + p.est,
      cuerpo: '<div style="display:flex;gap:16px;align-items:center;margin-bottom:8px"><span class="foto grande"><img src="' + p.foto + '" alt=""></span><div><div class="t-etiqueta">Vendido ' + (periodo || 'hoy') + '</div><div class="t-numero num">' + R.pesosH(p.vendido) + '</div><div class="t-detalle">' + p.cant + ' a ' + R.pesos(p.precio) + '</div></div></div>' +
        R.cuenta([['Vendido', R.pesos(p.vendido), 'suma', p.cant], ['Costo de lo vendido', R.pesos(Math.round(p.vendido * 0.63 / 100) * 100), 'resta', 'al costo de cada venta'], ['Ganancia', R.pesos(p.vendido - Math.round(p.vendido * 0.63 / 100) * 100), 'total logro']]) +
        '<div class="r-titulo-lista">Stock</div>' + R.renglones([{ icono: 'package', titulo: p.stock + ' en el local', detalle: 'Mínimo ' + p.minimo, valor: p.stock <= p.minimo ? '<span class="pastilla urgente">Pedir</span>' : '<span class="pastilla logro">Alcanza</span>' }]),
      pie: '<a class="btn" data-ir="productos"><i class="i i-s" data-i="tags"></i>Abrir la ficha</a>' + (p.stock <= p.minimo ? '<a class="btn" data-ir="compras"><i class="i i-s" data-i="truck"></i>Pedir</a>' : '')
    });
  };
  var F = '../../../_comun/fotos/';
  R.PRODUCTOS = {
    latex: { nombre: 'Látex interior mate blanco 4 L', marca: 'Alba', codigo: '7790345001234', est: 'P-01-02', foto: F + 'pintura.webp', precio: 23000, stock: 9, minimo: 6 },
    mecha: { nombre: 'Mecha acero rápido HSS 8 mm', marca: 'Ezeta', codigo: '7798112004561', est: 'A-03-12', foto: F + 'mecha.webp', precio: 7000, stock: 22, minimo: 10 },
    cinta: { nombre: 'Cinta métrica PowerLock 5 m', marca: 'Stanley', codigo: '7790678003212', est: 'B-02-04', foto: F + 'cinta-metrica.webp', precio: 17000, stock: 5, minimo: 4 },
    clavos: { nombre: 'Clavos punta París 2"', marca: 'Acindar', codigo: 'CL-2P', est: 'C-01-01', foto: F + 'clavos.webp', precio: 8000, stock: 41, minimo: 20 },
    lampara: { nombre: 'Lámpara LED 12 W luz fría', marca: 'Philips', codigo: '8718699772345', est: 'E-04-01', foto: F + 'lampara.webp', precio: 3500, stock: 3, minimo: 10 },
    pinza: { nombre: 'Pinza universal 8"', marca: 'Bahco', codigo: '7311518123456', est: 'B-01-07', foto: F + 'pinza.webp', precio: 18000, stock: 7, minimo: 3 },
    tarugos: { nombre: 'Tarugos nylon S8 con tope × 100', marca: 'Fischer', codigo: '4006209012345', est: 'A-02-05', foto: F + 'tarugos.webp', precio: 5000, stock: 14, minimo: 8 },
    martillo: { nombre: 'Martillo galponero 27 mm', marca: 'Bahco', codigo: '7311518654321', est: 'B-01-02', foto: F + 'martillo.webp', precio: 21000, stock: 4, minimo: 2 }
  };
})();

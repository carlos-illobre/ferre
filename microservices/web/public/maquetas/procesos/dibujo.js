/* Procesos · dibujo BPMN con el lenguaje «Mostrador».
   Lo usan todas las variantes de esta carpeta: dibuja carriles, pasos y flechas en un <svg>.
   window.FIGURAS: las doce figuras (glifo, nombre, nombre corto).
   window.dibujar(svg, modelo, posiciones, opciones). */
(function () {
  var C = {
    tinta: '#1A1D1B', t2: '#545955', t3: '#6B706B', borde: '#E6E2D8', bordeF: '#CEC8BA',
    hundido: '#ECE9E1', fondo: '#F4F2EC', sup: '#FFFFFF', pino: '#12382F', pinoT: '#17614E', pinoS: '#E3EEE8',
    accion: '#E8541C', accionS: '#FDEDE4', urg: '#F0A20F', urgS: '#FFF3D8', urgT: '#845400', logro: '#1E9E62', logroS: '#E2F4EA',
    linea: '#8E938C'
  };
  window.COLORES_DIBUJO = C;

  /* Glifos de las figuras: notación BPMN dibujada con trazo 2, como un ícono de Lucide. */
  var G = {
    inicio: '<circle cx="12" cy="12" r="8"/>',
    tarea: '<rect x="3" y="6" width="18" height="12" rx="3"/>',
    persona: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><circle cx="8" cy="10" r="1.8"/><path d="M5.2 15.4a3 3 0 0 1 5.6 0"/>',
    sistema: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><circle cx="8.2" cy="11.2" r="2.2"/><path d="M8.2 7.6v1.2M8.2 13.6v1.2M4.6 11.2h1.2M10.6 11.2h1.2"/>',
    decision: '<path d="M12 3 21 12 12 21 3 12Z"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
    paralelo: '<path d="M12 3 21 12 12 21 3 12Z"/><path d="M12 8.5v7M8.5 12h7"/>',
    espera: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6.5"/><path d="M12 8.8V12l2 1.4"/>',
    fin: '<circle cx="12" cy="12" r="7.5" stroke-width="3.6"/>',
    subproceso: '<rect x="3" y="5" width="18" height="14" rx="3"/><rect x="9.5" y="13" width="5" height="5" rx="1"/><path d="M12 14.2v2.6M10.7 15.5h2.6"/>',
    carril: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M7 5v14M7 12h14.5"/>',
    documento: '<path d="M6 3h8l4 4v11.5c-2 1.5-4-1.2-6 0s-4 1.4-6 0Z"/><path d="M14 3v4h4"/>',
    nota: '<path d="M9 4H5v16h4"/><path d="M12 9h7M12 13h7M12 17h4"/>'
  };
  window.FIGURAS = [
    { id: 'inicio', nombre: 'Inicio', corto: 'Inicio' },
    { id: 'tarea', nombre: 'Tarea', corto: 'Tarea' },
    { id: 'persona', nombre: 'Tarea de una persona', corto: 'Persona' },
    { id: 'sistema', nombre: 'Tarea del sistema', corto: 'Sistema' },
    { id: 'decision', nombre: 'Decisión', corto: 'Decisión' },
    { id: 'paralelo', nombre: 'En paralelo', corto: 'Paralelo' },
    { id: 'espera', nombre: 'Espera', corto: 'Espera' },
    { id: 'fin', nombre: 'Fin', corto: 'Fin' },
    { id: 'subproceso', nombre: 'Subproceso', corto: 'Subproc.' },
    { id: 'carril', nombre: 'Carril', corto: 'Carril' },
    { id: 'documento', nombre: 'Documento', corto: 'Docum.' },
    { id: 'nota', nombre: 'Nota', corto: 'Nota' }
  ];
  window.glifo = function (id, clase, trazo) {
    return '<svg class="' + (clase || 'i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (trazo || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + G[id] + '</svg>';
  };
  /* Pinta <i data-fig="persona"> con el glifo de la figura. */
  function pintarFiguras() {
    document.querySelectorAll('i[data-fig]').forEach(function (el) {
      el.outerHTML = window.glifo(el.getAttribute('data-fig'), el.className || 'i', el.getAttribute('data-trazo'));
    });
  }
  window.pintarFiguras = pintarFiguras;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pintarFiguras); else pintarFiguras();

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function icono(nombre, x, y, s, color) {
    var p = (window.ICONOS || {})[nombre] || '';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + (s / 24) + ')" fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</g>';
  }

  /* Camino con esquinas redondeadas */
  function camino(pts, r) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = pts[i - 1], b = pts[i], c = pts[i + 1];
      var l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      var rr = Math.min(r, l1 / 2, l2 / 2);
      var p1 = [b[0] - (b[0] - a[0]) / l1 * rr, b[1] - (b[1] - a[1]) / l1 * rr];
      var p2 = [b[0] + (c[0] - b[0]) / l2 * rr, b[1] + (c[1] - b[1]) / l2 * rr];
      d += ' L' + p1[0] + ' ' + p1[1] + ' Q' + b[0] + ' ' + b[1] + ' ' + p2[0] + ' ' + p2[1];
    }
    var z = pts[pts.length - 1];
    return d + ' L' + z[0] + ' ' + z[1];
  }

  /* modelo: { carriles:[{id,nombre,icono}], pasos:[{id,tipo,nombre,carril}], flechas:[{de,a,s,e,via,et}] }
     pos: { idPaso: [x, y] } (centro) · { carriles: { id: [y0, y1] } }
     o: { tw, th, g, r, fs, cab, x1, sel, avisos:{id:texto}, atenuar:[ids], vista:[x,y,w,h], pantallas:{id:'Vender'} } */
  window.dibujar = function (svg, m, pos, o) {
    o = Object.assign({ fantasmas: [], tw: 132, th: 64, g: 48, r: 18, fs: 14, cab: 104, x0: 0, x1: 1400, sel: null, avisos: {}, atenuar: [], radio: 12, rotulos: true }, o || {});
    var W = svg.clientWidth || svg.parentNode.clientWidth, H = svg.clientHeight || svg.parentNode.clientHeight;
    var v = o.vista || [0, 0, W, H];
    svg.setAttribute('viewBox', v.join(' '));
    svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');
    var out = [];
    out.push('<defs><marker id="punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5 9 5 1 8.5Z" fill="' + C.linea + '"/></marker>' +
      '<marker id="punta-sel" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1.5 9 5 1 8.5Z" fill="' + C.accion + '"/></marker>' +
      '<filter id="sombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#1A1D1B" flood-opacity=".08"/></filter>' +
      '<filter id="sombra-sel" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#E8541C" flood-opacity=".22"/></filter></defs>');

    /* Carriles */
    if (o.carriles !== false) {
      m.carriles.forEach(function (c, i) {
        var y = pos.carriles[c.id];
        out.push('<rect x="' + o.x0 + '" y="' + y[0] + '" width="' + (o.x1 - o.x0) + '" height="' + (y[1] - y[0]) + '" fill="' + C.sup + '" fill-opacity="' + (o.carrilOpacidad || .82) + '" stroke="' + C.borde + '"/>');
        if (o.chipCarril) {
          var w2 = c.nombre.length * o.fs * .62 + 40;
          out.push('<rect x="' + (o.chipX || 8) + '" y="' + (y[0] + 10) + '" width="' + w2 + '" height="28" rx="14" fill="' + C.pinoS + '"/>' + icono(c.icono, (o.chipX || 8) + 9, y[0] + 16, 16, C.pinoT) + '<text x="' + ((o.chipX || 8) + 30) + '" y="' + (y[0] + 29) + '" font-size="' + o.fs + '" font-weight="750" fill="' + C.pinoT + '">' + esc(c.nombre) + '</text>');
        }
        if (o.cab) {
          out.push('<rect x="' + o.x0 + '" y="' + y[0] + '" width="' + o.cab + '" height="' + (y[1] - y[0]) + '" fill="#F8F6F1" stroke="' + C.borde + '"/>');
          var cy = y[0] + 16;
          out.push('<circle cx="' + (o.x0 + 26) + '" cy="' + (cy + 14) + '" r="14" fill="' + C.pinoS + '"/>' + icono(c.icono, o.x0 + 26 - 9, cy + 5, 18, C.pinoT));
          out.push('<text x="' + (o.x0 + 16) + '" y="' + (cy + 50) + '" font-size="' + o.fs + '" font-weight="750" fill="' + C.tinta + '">' + esc(c.nombre) + '</text>');
          if (c.detalle) out.push('<text x="' + (o.x0 + 16) + '" y="' + (cy + 50 + o.fs * 1.35) + '" font-size="' + o.fs + '" font-weight="550" fill="' + C.t3 + '">' + esc(c.detalle) + '</text>');
        }
      });
    }

    var P = {};
    m.pasos.forEach(function (p) { if (pos[p.id]) P[p.id] = Object.assign({}, p, { x: pos[p.id][0], y: pos[p.id][1] }); });
    function caja(p) {
      if (/^(tarea|persona|sistema|subproceso)$/.test(p.tipo)) return [o.tw / 2, o.th / 2];
      if (p.tipo === 'decision' || p.tipo === 'paralelo') return [o.g / 2, o.g / 2];
      if (p.tipo === 'documento') return [18, 22];
      if (p.tipo === 'nota') return [0, 0];
      return [o.r, o.r];
    }
    function puerto(p, s) {
      var k = caja(p);
      return { r: [p.x + k[0], p.y], l: [p.x - k[0], p.y], t: [p.x, p.y - k[1]], b: [p.x, p.y + k[1]] }[s];
    }

    /* Flechas */
    m.flechas.forEach(function (f) {
      var a = P[f.de], b = P[f.a];
      if (!a || !b) return;
      var s = f.s || 'r', e = f.e || 'l';
      var p0 = puerto(a, s), p1 = puerto(b, e), pts = [p0];
      if (f.via) pts = pts.concat(f.via);
      else {
        var hs = s === 'r' || s === 'l', he = e === 'r' || e === 'l';
        if (hs && !he) pts.push([p1[0], p0[1]]);
        else if (!hs && he) pts.push([p0[0], p1[1]]);
        else if (hs && he && p0[1] !== p1[1]) { var mx = (p0[0] + p1[0]) / 2; pts.push([mx, p0[1]], [mx, p1[1]]); }
        else if (!hs && !he && p0[0] !== p1[0]) { var my = (p0[1] + p1[1]) / 2; pts.push([p0[0], my], [p1[0], my]); }
      }
      pts.push(p1);
      var sel = o.sel && (f.de === o.sel || f.a === o.sel) && o.flechaSel !== false;
      var at = o.atenuar.indexOf(f.de) >= 0 || o.atenuar.indexOf(f.a) >= 0;
      var fa = o.fantasmas.indexOf(f.de) >= 0 || o.fantasmas.indexOf(f.a) >= 0;
      if (fa) { sel = true; f.punteada = true; }
      out.push('<path d="' + camino(pts, 10) + '" fill="none" stroke="' + (sel ? C.accion : C.linea) + '" stroke-width="' + (sel ? 2 : 1.6) + '" marker-end="url(#' + (sel ? 'punta-sel' : 'punta') + ')"' + (f.punteada ? ' stroke-dasharray="4 4"' : '') + (at ? ' opacity=".35"' : '') + '/>');
      if (f.et) {
        var q = f.etp || [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
        var w = f.et.length * o.fs * .62 + 16;
        out.push('<rect x="' + (q[0] - w / 2) + '" y="' + (q[1] - o.fs * .8 - 2) + '" width="' + w + '" height="' + (o.fs * 1.6 + 4) + '" rx="' + (o.fs * .8 + 2) + '" fill="' + C.sup + '" stroke="' + C.bordeF + '"/>');
        out.push('<text x="' + q[0] + '" y="' + (q[1] + o.fs * .36) + '" text-anchor="middle" font-size="' + o.fs + '" font-weight="750" fill="' + C.t2 + '">' + esc(f.et) + '</text>');
      }
    });
    (m.asociaciones || []).forEach(function (f) {
      var a = P[f.de], b = P[f.a];
      if (!a || !b) return;
      out.push('<path d="M' + (f.p0 || [a.x, a.y]).join(' ') + ' L' + (f.p1 || [b.x, b.y]).join(' ') + '" stroke="' + C.bordeF + '" stroke-width="1.6" stroke-dasharray="3 4" fill="none"/>');
    });

    /* Pasos */
    Object.keys(P).forEach(function (id) {
      var p = P[id], sel = o.sel === id, at = o.atenuar.indexOf(id) >= 0;
      var fa = o.fantasmas.indexOf(id) >= 0;
      var stroke = sel || fa ? C.accion : C.bordeF, sw = sel ? 2.5 : (fa ? 2 : 1.5);
      var g = ['<g data-paso="' + id + '"' + (at ? ' opacity=".35"' : '') + '>'];
      var rot = function (dy, ancho) {
        if (!o.rotulos) return '';
        ancho = ancho || 136;
        return '<foreignObject x="' + (p.x - ancho / 2) + '" y="' + (p.y + dy) + '" width="' + ancho + '" height="' + (o.fs * 3) + '"><div xmlns="http://www.w3.org/1999/xhtml" style="font:650 ' + o.fs + 'px/1.25 Manrope,sans-serif;color:' + C.t2 + ';text-align:center;overflow-wrap:break-word">' + esc(p.nombre) + '</div></foreignObject>';
      };
      if (/^(tarea|persona|sistema|subproceso)$/.test(p.tipo)) {
        var x = p.x - o.tw / 2, y = p.y - o.th / 2;
        if (sel) g.push('<rect x="' + (x - 5) + '" y="' + (y - 5) + '" width="' + (o.tw + 10) + '" height="' + (o.th + 10) + '" rx="' + (o.radio + 4) + '" fill="' + C.accionS + '"/>');
        g.push('<rect x="' + x + '" y="' + y + '" width="' + o.tw + '" height="' + o.th + '" rx="' + o.radio + '" fill="' + C.sup + '" stroke="' + stroke + '" stroke-width="' + sw + '" filter="url(#' + (sel ? 'sombra-sel' : 'sombra') + ')"/>');
        var pad = 10, conIcono = p.tipo === 'persona' || p.tipo === 'sistema';
        if (conIcono) g.push(icono(p.tipo === 'persona' ? 'user' : 'monitor', x + 8, y + 8, 16, sel ? C.accion : C.t3));
        if (p.tipo === 'subproceso') g.push('<rect x="' + (p.x - 7) + '" y="' + (y + o.th - 16) + '" width="14" height="14" rx="3" fill="none" stroke="' + C.t3 + '" stroke-width="1.5"/><path d="M' + p.x + ' ' + (y + o.th - 13) + 'v8M' + (p.x - 4) + ' ' + (y + o.th - 9) + 'h8" stroke="' + C.t3 + '" stroke-width="1.5"/>');
        var pant = o.pantallas && o.pantallas[id];
        var alto = o.th - (pant ? 26 : 0);
        g.push('<foreignObject x="' + (x + pad + (conIcono ? 14 : 0)) + '" y="' + y + '" width="' + (o.tw - pad * 2 - (conIcono ? 14 : 0)) + '" height="' + alto + '"><div xmlns="http://www.w3.org/1999/xhtml" style="height:' + alto + 'px;display:flex;align-items:center;justify-content:center;text-align:center;font:700 ' + o.fs + 'px/1.25 Manrope,sans-serif;color:' + C.tinta + ';overflow:hidden">' + esc(p.nombre) + '</div></foreignObject>');
        if (pant) {
          var pw = pant.length * o.fs * .6 + 30;
          g.push('<rect x="' + (p.x - pw / 2) + '" y="' + (y + o.th - 30) + '" width="' + pw + '" height="22" rx="11" fill="' + C.pinoS + '"/>' + icono(o.iconosPantalla[pant], p.x - pw / 2 + 7, y + o.th - 26, 14, C.pinoT) + '<text x="' + (p.x - pw / 2 + 25) + '" y="' + (y + o.th - 14) + '" font-size="' + (o.fs - .5) + '" font-weight="700" fill="' + C.pinoT + '">' + esc(pant) + '</text>');
        }
      } else if (p.tipo === 'decision' || p.tipo === 'paralelo') {
        var h = o.g / 2;
        if (sel) g.push('<path d="M' + p.x + ' ' + (p.y - h - 7) + ' L' + (p.x + h + 7) + ' ' + p.y + ' L' + p.x + ' ' + (p.y + h + 7) + ' L' + (p.x - h - 7) + ' ' + p.y + 'Z" fill="' + C.accionS + '"/>');
        g.push('<path d="M' + p.x + ' ' + (p.y - h) + ' L' + (p.x + h) + ' ' + p.y + ' L' + p.x + ' ' + (p.y + h) + ' L' + (p.x - h) + ' ' + p.y + 'Z" fill="' + C.sup + '" stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round" filter="url(#sombra)"/>');
        var k = h * .34;
        g.push(p.tipo === 'decision'
          ? '<path d="M' + (p.x - k) + ' ' + (p.y - k) + 'l' + 2 * k + ' ' + 2 * k + 'M' + (p.x + k) + ' ' + (p.y - k) + 'l' + (-2 * k) + ' ' + 2 * k + '" stroke="' + C.t2 + '" stroke-width="2.4" stroke-linecap="round"/>'
          : '<path d="M' + p.x + ' ' + (p.y - k * 1.3) + 'v' + 2.6 * k + 'M' + (p.x - k * 1.3) + ' ' + p.y + 'h' + 2.6 * k + '" stroke="' + C.t2 + '" stroke-width="2.4" stroke-linecap="round"/>');
        g.push(p.rotuloArriba ? rot(-h - o.fs * 2.8, 150) : rot(h + 6, 150));
      } else if (p.tipo === 'documento') {
        g.push('<path d="M' + (p.x - 16) + ' ' + (p.y - 22) + 'h22l10 10v28c-6 4-10-3-16 0s-10 4-16 0Z" fill="' + C.sup + '" stroke="' + stroke + '" stroke-width="' + sw + '" filter="url(#sombra)"/>');
        g.push(rot(28));
      } else if (p.tipo === 'nota') {
        var nw = p.ancho || 180;
        g.push('<path d="M' + (p.x + 10) + ' ' + (p.y - 26) + 'h-10v52h10" fill="none" stroke="' + C.bordeF + '" stroke-width="2"/>');
        g.push('<foreignObject x="' + (p.x + 10) + '" y="' + (p.y - 30) + '" width="' + nw + '" height="60"><div xmlns="http://www.w3.org/1999/xhtml" style="height:60px;display:flex;align-items:center;font:550 ' + o.fs + 'px/1.3 Manrope,sans-serif;color:' + C.t2 + '">' + esc(p.nombre) + '</div></foreignObject>');
      } else {
        var r = o.r;
        if (sel) g.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + (r + 7) + '" fill="' + C.accionS + '"/>');
        if (p.tipo === 'inicio') g.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + r + '" fill="' + C.sup + '" stroke="' + (sel ? C.accion : C.pinoT) + '" stroke-width="2" filter="url(#sombra)"/>');
        if (p.tipo === 'fin') g.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + r + '" fill="' + C.sup + '" stroke="' + (sel ? C.accion : C.tinta) + '" stroke-width="4.5" filter="url(#sombra)"/>');
        if (p.tipo === 'espera') g.push('<circle cx="' + p.x + '" cy="' + p.y + '" r="' + r + '" fill="' + C.sup + '" stroke="' + stroke + '" stroke-width="1.5" filter="url(#sombra)"/><circle cx="' + p.x + '" cy="' + p.y + '" r="' + (r - 4) + '" fill="none" stroke="' + stroke + '" stroke-width="1.5"/><path d="M' + p.x + ' ' + (p.y - r * .45) + 'V' + p.y + 'l' + r * .3 + ' ' + r * .22 + '" stroke="' + C.t2 + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>');
        g.push(rot(r + 6));
      }
      if (o.avisos[id]) {
        var k2 = caja(p), ax = p.x + k2[0] - 2, ay = p.y - k2[1] + 2;
        g.push('<circle cx="' + ax + '" cy="' + ay + '" r="11" fill="' + C.urg + '" stroke="#fff" stroke-width="2.5"/><path d="M' + ax + ' ' + (ay - 5) + 'v5.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="' + ax + '" cy="' + (ay + 4.4) + '" r="1.4" fill="#fff"/>');
      }
      g.push('</g>');
      var gs = g.join('');
      if (fa) gs = gs.replace(/fill="#FFFFFF" stroke="#E8541C"/g, 'fill="#FFF8F4" stroke="#E8541C" stroke-dasharray="6 4"').replace(/stroke="#E8541C" stroke-width="1.5"/g, 'stroke="#E8541C" stroke-width="1.5" stroke-dasharray="6 4"');
      out.push(gs);
    });
    svg.innerHTML = out.join('');
  };
})();

#!/usr/bin/env python
"""Auditoría de contraste (WCAG 2) de la maqueta, sobre lo que se dibuja de verdad.

  python contraste.py            # recorre las pantallas y sus estados principales, en las dos medidas
  python contraste.py vender     # solo una pantalla

Para cada texto visible calcula el color y el fondo efectivos (con transparencias y `opacity`),
y avisa lo que no llega: 4,5:1 el texto normal; 3:1 el texto grande (24 px, o 18,66 px en
negrita) y los bordes de campos y botones contra lo que tienen detrás. También los placeholders.
El servidor tiene que estar corriendo (puerto 5301, o $PUERTO). Devuelve 1 si algo no cumple.
"""
import os
import sys

from playwright.sync_api import sync_playwright

PUERTO = os.environ.get("PUERTO", "5301")
RUTAS = [
    "entrar", "entrar?estado=no-autorizado", "entrar?estado=sin-conexion",
    "vender", "vender?estado=con-productos", "vender?estado=sin-precio", "vender?estado=codigo-desconocido", "vender?estado=cobrada",
    "vender?estado=cobrada-sin-conexion", "vender?estado=cargando", "vender?estado=error",
    "ventas", "ventas?estado=sin-conexion", "productos", "productos?producto=mecha-6-madera", "recibir", "recibir?estado=vacio", "mas",
    "listas", "listas?estado=sin-conexion", "duplicados", "stock", "contar", "negocio", "usuarios", "usuarios?estado=sin-conexion", "actividad",
]
MEDIR = r"""() => {
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return [0,0,0,0]; const p = m[1].split(/[,\s\/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const sobre = (a, b) => { const al = a[3]; return [a[0]*al + b[0]*(1-al), a[1]*al + b[1]*(1-al), a[2]*al + b[2]*(1-al), 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); }; return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2]); };
  const razon = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
  const hex = (c) => '#' + c.slice(0,3).map((v) => Math.round(v).toString(16).padStart(2,'0')).join('');
  // Fondo efectivo: se apilan los fondos de los ancestros, de afuera hacia adentro, con su opacidad.
  const fondoDe = (e) => { const capas = []; for (let p = e; p; p = p.parentElement) { const s = getComputedStyle(p); const c = rgba(s.backgroundColor); if (c[3] > 0) capas.push(c); if (c[3] === 1) break; } let f = [255,255,255,1]; for (const c of capas.reverse()) f = sobre(c, f); return f; };
  const opacidadDe = (e) => { let o = 1; for (let p = e; p; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity); return o; };
  const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const nombre = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ').join('.') : '');
  const fallas = new Map();
  const anotar = (tipo, fg, bg, r, min, e, texto) => { const k = tipo + ' ' + hex(fg) + ' sobre ' + hex(bg); if (!fallas.has(k)) fallas.set(k, { r: Math.round(r*100)/100, min, donde: nombre(e), texto: (texto || '').trim().slice(0, 30) }); };
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || e.closest('svg') || e.closest('.maqueta, .escaner__maqueta, .qr, [aria-hidden=true].entrar__arte')) continue;
    const s = getComputedStyle(e); const bg = fondoDe(e); const op = opacidadDe(e);
    const propio = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (propio || (e.tagName === 'INPUT' && e.value)) {
      const c = rgba(s.color); c[3] *= op; const fg = sobre(c, bg);
      const t = parseFloat(s.fontSize), peso = parseInt(s.fontWeight) || 400;
      const min = (t >= 24 || (t >= 18.66 && peso >= 700)) ? 3 : 4.5;
      const r = razon(fg, bg); if (r < min) anotar('TEXTO', fg, bg, r, min, e, e.textContent || e.value);
    }
    if (e.matches('input, textarea') && e.placeholder && !e.value) {
      const c = rgba(getComputedStyle(e, '::placeholder').color); c[3] *= op; const fg = sobre(c, bg);
      const r = razon(fg, bg); if (r < 4.5) anotar('PLACEHOLDER', fg, bg, r, 4.5, e, e.placeholder);
    }
    // Íconos: el trazo del SVG contra el fondo.
    if (e.tagName === 'svg') continue;
    // Borde de lo que se toca: tiene que verse dónde termina el control (salvo que el relleno ya contraste).
    if (e.matches('button, input:not(.campo__entrada):not(.buscador__entrada), select, textarea, .campo__caja, .buscador, a.mas__tarjeta') && !e.disabled) { // lo deshabilitado queda exento del borde (su texto no)
      const detras = e.parentElement ? fondoDe(e.parentElement) : [255,255,255,1];
      const relleno = razon(bg, detras);
      const ancho = parseFloat(s.borderTopWidth);
      if (ancho > 0 && s.borderTopStyle !== 'none') { const c = rgba(s.borderTopColor); c[3] *= op; const bc = sobre(c, detras); const r = Math.max(razon(bc, detras), razon(bc, bg) > 1.05 ? razon(bc, detras) : 0); if (r < 3 && relleno < 3 && c[3] > 0.05) anotar('BORDE', bc, detras, r, 3, e, e.textContent || e.getAttribute('aria-label')); }
    }
  }
  for (const v of document.querySelectorAll('svg')) {
    if (!visible(v) || v.closest('.maqueta, .escaner__maqueta, .qr') || v.getAttribute('fill') !== 'none') continue;
    const padre = v.parentElement; const bg = fondoDe(padre); const c = rgba(getComputedStyle(v).color); c[3] *= opacidadDe(v); const fg = sobre(c, bg);
    const r = razon(fg, bg); if (r < 3) anotar('ICONO', fg, bg, r, 3, padre, padre.textContent || padre.getAttribute('aria-label'));
  }
  return [...fallas].map(([k, v]) => ({ k, ...v }));
}"""


def main() -> int:
    solo = sys.argv[1] if len(sys.argv) > 1 else None
    rutas = [r for r in RUTAS if not solo or r.split("?")[0] == solo]
    vistas = {}
    with sync_playwright() as pw:
        navegador = pw.chromium.launch()
        for medida, ctx in (("compu", dict(viewport={"width": 1366, "height": 768})), ("celu", dict(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True))):
            pagina = navegador.new_context(**ctx).new_page()
            for ruta in rutas:
                pagina.goto(f"http://127.0.0.1:{PUERTO}/#/{ruta}")
                pagina.wait_for_timeout(1700)  # que terminen las animaciones de entrada
                for f in pagina.evaluate(MEDIR):
                    vistas.setdefault(f["k"], {**f, "en": f"{ruta} ({medida})"})
        navegador.close()
    for k, f in sorted(vistas.items(), key=lambda x: x[1]["r"]):
        print(f"{f['r']:5.2f} (mín {f['min']})  {k:38}  {f['donde'][:48]:48} «{f['texto']}»  {f['en']}")
    print("Todo cumple." if not vistas else f"{len(vistas)} pares no llegan.")
    return 1 if vistas else 0


if __name__ == "__main__":
    sys.exit(main())

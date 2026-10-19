import re, glob, os, json, sys
d = sys.argv[1]
icons = {}
for f in sorted(glob.glob(os.path.join(d, "iconos", "*.svg"))):
    s = open(f).read()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    inner = re.sub(r"\s+", " ", inner).strip()
    icons[os.path.basename(f)[:-4]] = inner
js = """/* Íconos de Ferrebress: Lucide 0.460 (licencia ISC), trazo 2 px, color = currentColor.
   Uso: <i class="i" data-i="scan-barcode"></i>  (el tamaño lo da la clase: .i 20 px, .i-s 16, .i-l 24, .i-xl 32)
   Este archivo reemplaza cada <i data-i> por el SVG al cargar la página. */
window.ICONOS = %s;
(function () {
  function pintar(root) {
    (root || document).querySelectorAll('i[data-i]').forEach(function (el) {
      var n = el.getAttribute('data-i'), p = window.ICONOS[n];
      if (!p) { console.warn('Falta el ícono', n); return; }
      var sw = el.getAttribute('data-trazo') || '2';
      el.outerHTML = '<svg class="' + (el.className || 'i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
    });
  }
  window.pintarIconos = pintar;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pintar(); });
  else pintar();
})();
""" % json.dumps(icons, ensure_ascii=False, indent=0)
open(os.path.join(d, "iconos.js"), "w").write(js)
print(len(icons), "íconos")

# Arma configuracion/iconos-extra.js con los SVG de configuracion/iconos/ (Lucide 0.460, ISC).
# Se carga ANTES de _comun/iconos.js y este los suma a window.ICONOS.
import re, glob, os, json, sys
d = sys.argv[1]
icons = {}
for f in sorted(glob.glob(os.path.join(d, "iconos", "*.svg"))):
    inner = re.search(r"<svg[^>]*>(.*)</svg>", open(f).read(), re.S).group(1)
    icons[os.path.basename(f)[:-4]] = re.sub(r"\s+", " ", inner).strip()
js = "/* Íconos que faltaban en _comun (Lucide 0.460, ISC). Se cargan después de _comun/iconos.js y se pintan de nuevo. */\nObject.assign(window.ICONOS, %s);\nif (window.pintarIconos) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ window.pintarIconos(); }); else window.pintarIconos(); }\n" % json.dumps(icons, ensure_ascii=False)
open(os.path.join(d, "iconos-extra.js"), "w").write(js)
print(len(icons))

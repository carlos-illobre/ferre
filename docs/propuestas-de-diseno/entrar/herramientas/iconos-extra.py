# Suma a window.ICONOS los íconos Lucide que le faltan a _comun (se carga después de _comun/iconos.js).
import re, glob, os, json
d = os.path.join(os.path.dirname(__file__), "..", "_recursos")
icons = {}
for f in sorted(glob.glob(os.path.join(d, "iconos", "*.svg"))):
    inner = re.search(r"<svg[^>]*>(.*)</svg>", open(f).read(), re.S).group(1)
    icons[os.path.basename(f)[:-4]] = re.sub(r"\s+", " ", inner).strip()
open(os.path.join(d, "iconos-extra.js"), "w").write("/* Lucide 0.460 (ISC): los que faltan en _comun. */\nObject.assign(window.ICONOS, %s);\n" % json.dumps(icons, ensure_ascii=False, indent=0))
print(len(icons))

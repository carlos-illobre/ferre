# Rearma ../iconos-extra.js con los SVG de ../iconos/ (se suman a window.ICONOS de _comun)
import re, glob, json, os
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
out = ["/* Íconos que agrega Ventas de hoy (Lucide 0.460, ISC). Se carga en el head DESPUÉS de ../../../_comun/iconos.js */", "Object.assign(window.ICONOS, {"]
for f in sorted(glob.glob(os.path.join(base, "iconos/*.svg"))):
    inner = re.search(r'<svg[^>]*>(.*)</svg>', open(f).read(), re.S).group(1)
    out.append(json.dumps(os.path.basename(f)[:-4]) + ": " + json.dumps(re.sub(r'\s+', ' ', inner).strip()) + ",")
out.append("});")
open(os.path.join(base, "iconos-extra.js"), "w").write("\n".join(out))

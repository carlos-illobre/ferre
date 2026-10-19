import re, glob, os, json, sys
d = sys.argv[1]
icons = {}
for f in sorted(glob.glob(os.path.join(d, "iconos", "*.svg"))):
    inner = re.search(r"<svg[^>]*>(.*)</svg>", open(f).read(), re.S).group(1)
    icons[os.path.basename(f)[:-4]] = re.sub(r"\s+", " ", inner).strip()
open(os.path.join(d, "iconos-extra.js"), "w").write("/* Íconos que faltaban en _comun (Lucide 0.460, ISC). Se carga después de iconos.js. */\nObject.assign(window.ICONOS, %s);\n" % json.dumps(icons, ensure_ascii=False))
print(len(icons))

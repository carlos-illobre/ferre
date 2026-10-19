import re, glob, os, json, sys
d = sys.argv[1]
icons = {}
for f in sorted(glob.glob(os.path.join(d, "iconos", "*.svg"))):
    s = open(f).read()
    inner = re.sub(r"\s+", " ", re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)).strip()
    icons[os.path.basename(f)[:-4]] = inner
open(os.path.join(d, "iconos-extra.js"), "w").write(
 "/* Íconos que le faltaban a _comun (Lucide 0.460, ISC). Va después de iconos.js. */\nObject.assign(window.ICONOS, %s);\n" % json.dumps(icons, ensure_ascii=False, indent=0))
print(len(icons))

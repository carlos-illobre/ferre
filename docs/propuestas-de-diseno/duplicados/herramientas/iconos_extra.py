import re, json, pathlib, sys
d = pathlib.Path(sys.argv[1])
out = ["/* Íconos extra de Duplicados (Lucide 0.460, ISC). Se cargan DESPUÉS de _comun/iconos.js y antes de pintar. */"]
items = {}
for f in sorted((d/"iconos").glob("*.svg")):
    s = f.read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    items[f.stem] = " ".join(inner.split())
out.append("Object.assign(window.ICONOS, " + json.dumps(items, ensure_ascii=False, indent=0) + ");")
out.append("if (window.pintarIconos) window.pintarIconos();")
(d/"iconos-extra.js").write_text("\n".join(out))
print(len(items))

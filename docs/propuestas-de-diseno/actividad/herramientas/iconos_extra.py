import re, json, pathlib, sys
d = pathlib.Path(sys.argv[1])
out = {}
for f in sorted((d/"iconos").glob("*.svg")):
    s = f.read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    out[f.stem] = " ".join(inner.split())
js = "/* Íconos que faltaban en _comun (Lucide 0.460, ISC). Se carga después de _comun/iconos.js. */\nObject.assign(window.ICONOS, " + json.dumps(out, ensure_ascii=False, indent=0) + ");\n"
(d/"iconos-extra.js").write_text(js)
print(len(out))

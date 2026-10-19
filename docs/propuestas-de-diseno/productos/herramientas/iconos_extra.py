import re, json, pathlib, sys
d = pathlib.Path(sys.argv[1])
out = {}
for f in sorted(d.glob("*.svg")):
    s = f.read_text()
    inner = re.search(r"<svg[^>]*>(.*)</svg>", s, re.S).group(1)
    out[f.stem] = " ".join(inner.split())
js = "/* Íconos que le faltan a _comun (Lucide 0.460, ISC). Va DESPUÉS de _comun/iconos.js. */\nObject.assign(window.ICONOS, " + json.dumps(out, ensure_ascii=False, indent=0) + ");\n"
(d.parent / "iconos-extra.js").write_text(js)
print(len(out))

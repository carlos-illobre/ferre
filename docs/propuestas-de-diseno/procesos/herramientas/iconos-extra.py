import re, json, pathlib, sys
d = pathlib.Path(sys.argv[1])
out = {}
for f in sorted((d/'iconos').glob('*.svg')):
    s = f.read_text()
    m = re.search(r'<svg[^>]*>(.*)</svg>', s, re.S)
    out[f.stem] = ' '.join(m.group(1).split())
js = "/* Íconos que suma Procesos (Lucide 0.460, ISC). Se carga después de _comun/iconos.js. */\nObject.assign(window.ICONOS, " + json.dumps(out, ensure_ascii=False, indent=0) + ");\n"
(d/'iconos-extra.js').write_text(js)
print(len(out))

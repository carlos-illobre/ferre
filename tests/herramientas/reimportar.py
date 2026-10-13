# Reescribe las importaciones relativas después de mover archivos. Uso: reimportar.py viejo=nuevo ...
# (rutas relativas a src/, con o sin extensión). Sirve para todas las etapas del reordenamiento.
import os, re, sys
SRC='src'
pares=[a.split('=') for a in sys.argv[1:]]
sin=lambda p: re.sub(r'\.(tsx?|css)$','',p)
movidos={os.path.normpath(os.path.join(SRC,a)): os.path.normpath(os.path.join(SRC,b)) for a,b in pares}
movidos_sin={sin(a): sin(b) for a,b in movidos.items() if not a.endswith('.css')}
alreves={b:a for a,b in movidos.items()}
patron=re.compile(r'''((?:from|import|mock|importActual|import\()\s*\(?\s*["'])(\.{1,2}/[^"']*)(["'])''')
tocados=0
for raiz,_,archivos in os.walk(SRC):
    for n in archivos:
        if not re.search(r'\.(tsx?|css)$', n): continue
        f=os.path.normpath(os.path.join(raiz,n)); viejo=alreves.get(f,f)
        s=open(f,encoding='utf-8').read()
        def cambiar(m):
            spec=m.group(2)
            destino=os.path.normpath(os.path.join(os.path.dirname(viejo),spec))
            nuevo=movidos.get(destino) or movidos_sin.get(destino) or destino
            if nuevo==destino and viejo==f: return m.group(0)
            rel=os.path.relpath(nuevo, os.path.dirname(f)).replace(os.sep,'/')
            if not rel.startswith('.'): rel='./'+rel
            return m.group(1)+rel+m.group(3)
        t=patron.sub(cambiar,s)
        if f.endswith('.css'): t=re.sub(r'''(@import\s+["'])(\.{1,2}/[^"']*)(["'])''', cambiar, t)
        if t!=s: open(f,'w',encoding='utf-8').write(t); tocados+=1
print('archivos con importaciones actualizadas:', tocados)

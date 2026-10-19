import pathlib
D=pathlib.Path(__file__).resolve().parent.parent/'compu'/'variante-3-planilla'
# Arma index.html (la tabla se genera para que los números cierren).
F='../../../_comun/fotos/'
P=['Dist. Oeste','Bulonera Centro','Ferretera del Sur','Rexxi']
# foto, nombre, marca, stock, unidad, costos(dict idx->costo), uso, margen, precio, tendencia
rows=[
('cinta-metrica','Cinta métrica PowerLock 5 m','Stanley',6,'un.',{0:9350,1:9980,2:10420},0,50,17000,[30,26,26,18,12]),
('mecha','Mecha acero rápido HSS 8 mm','Ezeta',14,'un.',{0:2610,1:2480,3:2550},0,100,7000,[24,24,20,20,20]),
('martillo','Martillo carpintero 27 mm mango tubular','Bahco',2,'un.',{0:16400,1:15800,3:17100},1,25,24000,[22,22,22,20,20]),
('tarugos','Tarugos nylon S8 con tope × 100','Fischer',3,'un.',{0:4150},0,None,None,[20,20,20,20,20]),
('pinza','Pinza universal 8" aislada 1000 V','Bremen',7,'un.',{0:10200,2:10900},0,50,19000,[30,28,22,18,10]),
('puntas','Puntas Phillips PH2 × 25 mm × 10','Bremen',0,'un.',{0:2140,1:1980},1,100,5000,[18,18,18,18,18]),
('lampara','Lámpara LED 9 W luz fría E27','Philips',48,'un.',{0:1220,3:1150},3,100,3000,[14,16,18,20,22]),
('pintura','Látex interior mate blanco 4 L','Alba',9,'un.',{0:21500,2:20700},2,50,38000,[32,30,26,16,6]),
('llave-combinada','Llave combinada 13 mm cromada','Bahco',11,'un.',{0:6400,1:6700},0,50,12000,[22,22,20,20,18]),
('clavos','Clavos punta París 2" por kilo','Acindar',12.4,'kg',{0:3250},0,100,8000,[24,22,22,20,20]),
]
def m(n): return f"{n:,.0f}".replace(",",".")
for r in rows:
    c=r[5][r[6]]
    if r[7]:
        import math
        assert math.ceil(c*(1+r[7]/100)*1.21/1000)*1000==r[8], r
trs=[]
for i,(f,n,mar,st,u,cs,uso,mg,pr,tr) in enumerate(rows):
    barato=min(cs,key=cs.get)
    celdas=''
    for k in range(4):
        if k not in cs: celdas+='<td class="c vacio">—</td>'; continue
        cl='c'
        if k==uso: cl+=' uso'
        if k==barato: cl+=' barato'
        extra=''
        if k==barato and k!=uso: extra='<span class="mas-barato">más barato</span>'
        celdas+=f'<td class="{cl}"><span class="v"><span class="peso">$</span>{m(cs[k])}</span>{extra}</td>'
    stv=(str(st).replace('.',',')+' '+u) if st else 'Sin stock'
    stc='hay' if st else 'no'
    if mg:
        seg=''.join(f'<span class="{"el" if v==mg else ""}">{v}</span>' for v in (300,200,100,50,25))
        prec=f'<td class="pr"><span class="peso">$</span>{m(pr)}</td>'
    else:
        seg=''.join(f'<span class="vacio-m">{v}</span>' for v in (300,200,100,50,25))
        prec='<td class="pr sin">Sin precio</td>'
    pts=' '.join(f'{x*14},{y}' for x,y in enumerate(tr))
    col='var(--accion)' if tr[0]-tr[-1]>10 else 'var(--texto-3)'
    sel=' class="sel"' if i==0 else ''
    trs.append(f'<tr{sel}><td><div class="prod"><div class="foto chica"><img src="{F}{f}.webp" alt=""></div><div><div class="n">{n}</div><div class="d">{mar}</div></div></div></td><td class="st {stc}">{stv}</td>{celdas}<td><div class="mg">{seg}</div></td>{prec}<td><svg width="56" height="34" viewBox="-2 0 60 34"><polyline points="{pts}" fill="none" stroke="{col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></td></tr>')
html=open(pathlib.Path(__file__).parent/'planilla.tpl').read().replace('<!--FILAS-->','\n'.join(trs))
open(D/'index.html','w').write(html)
print('ok')

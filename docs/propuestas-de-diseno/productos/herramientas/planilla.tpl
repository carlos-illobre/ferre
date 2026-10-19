<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Productos · la planilla de proveedores y la vista rápida</title>
<link rel="stylesheet" href="../../../_comun/comun.css">
<script src="../../../_comun/iconos.js"></script>
<script src="../../iconos-extra.js"></script>
<script src="../../ean.js"></script>
<style>
  body { height: 768px; overflow: hidden; }
  .barra-sup { height: 56px; background: var(--pino); color: #fff; display: flex; align-items: center; gap: 16px; padding: 0 20px; }
  .barra-sup .logo { width: 32px; height: 32px; border-radius: 9px; background: rgba(255,255,255,.12); display: grid; place-items: center; }
  .barra-sup b { font-size: 17px; font-weight: 800; }
  .ir { display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 8px 0 12px; border-radius: 10px; background: rgba(255,255,255,.1); color: rgba(255,255,255,.8); font-size: 14px; font-weight: 600; width: 300px; }
  .ir .kbd { margin-left: auto; background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.3); color: #fff; }
  .migas { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 15px; }
  .migas span { color: rgba(255,255,255,.66); }
  .barra-sup .der { margin-left: auto; display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 650; }
  .barra-sup .chip-sup { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 12px; border-radius: 99px; background: rgba(255,255,255,.1); }
  .barra-sup .chip-sup .punto { width: 8px; height: 8px; border-radius: 99px; background: #5BD69A; }
  .barra-sup .chip-sup.venta { background: var(--accion); }
  .avatar-s { width: 32px; height: 32px; border-radius: 99px; background: var(--accion-suave); color: var(--accion-texto); display: grid; place-items: center; font-weight: 800; font-size: 14px; }

  .zona { padding: 16px 24px 0; }
  .cab { display: flex; align-items: center; gap: 12px; }
  .cab .campo { width: 380px; height: 44px; }
  .chips .chip { height: 36px; font-size: 14px; padding: 0 14px; }
  .cab .nota { margin-left: auto; display: flex; gap: 14px; font-size: 14px; color: var(--texto-2); align-items: center; }
  .cab .nota span { display: inline-flex; align-items: center; gap: 6px; }

  .hoja { margin-top: 12px; background: var(--superficie); border: 1px solid var(--borde); border-radius: 16px; box-shadow: var(--sombra-1); overflow: hidden; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  th { text-align: left; font-size: 14px; font-weight: 650; color: var(--texto-2); padding: 10px 8px; border-bottom: 1px solid var(--borde); background: #FCFBF8; white-space: nowrap; }
  th.cg { text-align: right; }
  th .grupo { display: block; font-size: 14px; color: var(--texto-3); font-weight: 600; }
  td { padding: 6px 8px; border-bottom: 1px solid var(--borde); white-space: nowrap; height: 52px; }
  tr.sel td { background: var(--pino-suave); }
  tr.sel td:first-child { box-shadow: inset 4px 0 0 var(--pino); }
  .prod { display: flex; align-items: center; gap: 10px; height: 40px; }
  .prod .n { font-weight: 700; font-size: 15px; line-height: 19px; max-width: 232px; overflow: hidden; text-overflow: ellipsis; }
  .prod .d { font-size: 14px; color: var(--texto-2); line-height: 18px; }
  .st { font-weight: 700; }
  .st.hay { color: var(--logro-texto); }
  .st.no { color: var(--error-texto); }
  .c { text-align: right; font-weight: 600; color: var(--texto-2); position: relative; }
  .c.vacio { color: var(--borde-fuerte); }
  .c.barato { color: var(--logro-texto); font-weight: 800; }
  .c.uso { color: var(--tinta); font-weight: 800; }
  .c.uso .v { display: inline-block; padding: 3px 8px; margin-right: -4px; border: 2px solid var(--pino); border-radius: 9px; }
  .mas-barato { display: block; font-size: 14px; line-height: 16px; font-weight: 700; color: var(--urgente-texto); }
  .mg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 9px; background: var(--hundido); }
  .mg span { min-width: 32px; height: 28px; display: grid; place-items: center; border-radius: 7px; font-size: 14px; font-weight: 700; color: var(--texto-3); }
  .mg span.el { background: var(--superficie); color: var(--tinta); box-shadow: var(--sombra-1); }
  .mg span.vacio-m { color: var(--urgente-texto); background: var(--urgente-suave); }
  .pr { text-align: right; font-weight: 800; font-size: 17px; }
  .pr.sin { color: var(--urgente-texto); font-size: 15px; }

  /* Vista rápida (Espacio), flota sobre la planilla */
  .rapida { position: absolute; right: 24px; top: 132px; width: 400px; z-index: 2; background: var(--superficie); border-radius: 24px; box-shadow: var(--sombra-3), 0 0 0 1px rgba(18,56,47,.06); overflow: hidden; }
  .rapida .foto-g { height: 188px; background: var(--hundido); display: grid; place-items: center; position: relative; }
  .rapida .foto-g img { height: 160px; filter: drop-shadow(0 12px 14px rgba(26,29,27,.25)); }
  .rapida .foto-g .pastilla { position: absolute; left: 16px; top: 16px; }
  .rapida .foto-g .cerrar { position: absolute; right: 12px; top: 12px; }
  .rapida .foto-g .cambiar { position: absolute; right: 14px; bottom: 14px; }
  .rapida .cuerpo { padding: 16px 20px 18px; display: grid; gap: 12px; }
  .rapida .nom { font-size: 20px; line-height: 25px; font-weight: 800; text-transform: uppercase; letter-spacing: -.01em; }
  .rapida .precio { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 14px; align-items: end; }
  .cuentita { font-size: 14px; color: var(--texto-2); line-height: 20px; text-align: right; }
  .cuentita b { color: var(--tinta); }
  .cod { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: var(--hundido); }
  .cod .ean { width: 64px; height: 30px; fill: var(--tinta); }
  .cod b { font-size: 16px; letter-spacing: .05em; flex: 1; }
  .rapida .acciones { display: flex; gap: 8px; }
  .rapida .acciones .btn-accion { flex: 1; }
  .hint { position: absolute; left: 24px; bottom: 10px; display: flex; gap: 16px; font-size: 14px; color: var(--texto-2); align-items: center; }
  .hint span { display: inline-flex; gap: 6px; align-items: center; }
</style>
</head>
<body>
  <div class="barra-sup">
    <span class="logo"><i class="i" data-i="store"></i></span><b>Ferrebress</b>
    <div class="migas"><span>Catálogo</span><i class="i i-s" data-i="chevron-right" style="opacity:.6"></i>Productos</div>
    <div class="ir"><i class="i i-s" data-i="command"></i>Ir a… Vender, Stock, Listas<span class="kbd">Ctrl K</span></div>
    <div class="der">
      <span class="chip-sup"><span class="punto"></span>En línea</span>
      <span class="chip-sup"><i class="i i-s" data-i="smartphone"></i>Celular en espejo</span>
      <span class="chip-sup venta"><i class="i i-s" data-i="shopping-cart"></i>Venta: 3 · $45.500</span>
      <span class="avatar-s">CI</span>
    </div>
  </div>
  <div class="zona">
    <div class="cab">
      <div class="campo"><i class="i" data-i="search"></i><span style="white-space:nowrap">Buscar productos, códigos o marcas…</span></div>
      <div class="chips"><span class="chip elegido">Lo que más sale</span><span class="chip">Con stock</span><span class="chip">Proveedor más barato sin usar <span class="pastilla urgente" style="height:22px;padding:0 8px">37</span></span><span class="chip"><i class="i i-s" data-i="sliders-horizontal"></i>Marca</span></div>
      <div class="nota"><span><span class="kbd">Espacio</span>vista rápida</span></div>
    </div>
    <div class="hoja">
      <table>
        <thead><tr><th>Producto</th><th>Stock</th><th class="cg"><span class="grupo">Costo de compra por proveedor</span>Dist. Oeste</th><th class="cg">Bulonera Centro</th><th class="cg">Ferretera del Sur</th><th class="cg">Rexxi</th><th>Margen %</th><th class="cg">Precio</th><th>Costo</th></tr></thead>
        <tbody>
<!--FILAS-->
        </tbody>
      </table>
    </div>
  </div>

  <aside class="rapida">
    <div class="foto-g">
      <span class="pastilla logro"><span class="punto"></span>6 un. en stock</span>
      <button class="btn chico btn-icono cerrar" title="Cerrar (Espacio)"><i class="i i-s" data-i="x"></i></button>
      <img src="../../../_comun/fotos/cinta-metrica.webp" alt="">
      <button class="btn chico cambiar"><i class="i i-s" data-i="camera"></i>Cambiar foto</button>
    </div>
    <div class="cuerpo">
      <div><div class="nom">Cinta métrica PowerLock 5 m</div><div class="t-detalle">Stanley · Cód. 33-158 · Est. B-02-07</div></div>
      <div class="precio">
        <div><div class="t-etiqueta">Se cobra</div><div class="t-total" style="font-size:44px;line-height:48px"><span class="peso">$</span>17.000</div></div>
        <div class="cuentita">Costo $9.350,85 (Oeste ★)<br>+ 50 % + IVA = <b>$16.971,79</b><br>para arriba a $1.000</div>
      </div>
      <div class="cod"><svg class="ean" data-ean="7897065211580"></svg><div style="flex:1"><b>7897065211580</b><div class="t-detalle">Última lectura: 13/10 · 10:24</div></div><button class="btn chico btn-icono" title="Copiar"><i class="i i-s" data-i="copy"></i></button></div>
      <div class="acciones"><button class="btn btn-icono" title="Descargar la lista de origen (06/10)"><i class="i" data-i="file-spreadsheet"></i></button><button class="btn btn-accion"><i class="i" data-i="shopping-cart"></i>Agregar a la venta <span class="kbd">+</span></button></div>
    </div>
  </aside>
  <div class="hint"><span><span class="kbd">↑</span><span class="kbd">↓</span>producto</span><span><span class="kbd">←</span><span class="kbd">→</span>proveedor · <span class="kbd">U</span> usar</span><span><span class="kbd">Mayús</span><span class="kbd">1–5</span>margen</span><span><span class="kbd">Enter</span>ficha completa</span></div>
</body>
</html>

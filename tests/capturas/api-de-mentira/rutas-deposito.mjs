// Depósito de mentira: stock con movimientos, compras, sectores y conteos. Guarda estado en
// memoria para que registrar, anular, contar y cerrar se vean en las capturas.
import { productos } from "./rutas-00-base.mjs";

const dia = (n, h = 10, m = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString(); };
const fecha = (n) => dia(n).slice(0, 10);
const uuid = () => crypto.randomUUID();

const cantidades = [14, 3, 0, 22, 40, 2, 12.5, 180, 950, 4, -2, 1, 6.5, 9, 0, 120];
const stock = new Map(productos.slice(0, 16).map((p, i) => [p.id, cantidades[i]]));
const movimientos = new Map();
const mover = (id, tipo, cantidad, n, nota = null, referencia_tipo = null) => {
  if (!movimientos.has(id)) movimientos.set(id, []);
  movimientos.get(id).unshift({ id: uuid(), tipo, cantidad: String(cantidad), referencia_tipo, fecha: typeof n === "number" ? dia(n) : n, nota });
};
for (const [id, total] of stock) {
  // Una historia creíble que suma exactamente el stock.
  const compra = Math.max(Math.ceil(Math.abs(total)) + 10, 12);
  mover(id, "compra", compra, 21, "Factura 0003-00018822", "compra");
  mover(id, "venta", -4, 12, null, "venta");
  mover(id, "ajuste", -1, 9, "había " + (compra - 4) + ", hay " + (compra - 5) + ": rotura", "ajuste");
  mover(id, "venta", -(compra - 5 - total - 2), 5, null, "venta");
  mover(id, "ajuste", 2, 2, "conteo de Estantería 1", "conteo");
}

const proveedores = [
  { id: "pv-0", nombre: "Comodo", activo: true }, { id: "pv-1", nombre: "Tresge", activo: true }, { id: "pv-2", nombre: "Erpa", activo: true },
  { id: "pv-3", nombre: "Ixnova", activo: true }, { id: "pv-9", nombre: "Dimetal", activo: true }, { id: "pv-8", nombre: "Ferretera del Sur (cerró)", activo: false },
];
const item = (i, cantidad, costo) => ({ producto_id: productos[i].id, descripcion: productos[i].descripcion, cantidad: String(cantidad), costo_unitario: String(costo ?? productos[i].costo_neto) });
const compras = [
  { id: "co-1", fecha: fecha(1), comprobante_tipo: "factura", comprobante_numero: "0003-00018954", estado: "confirmada", proveedor: "Comodo", items: [item(0, 20), item(4, 30, 438.5), item(8, 500), item(12, 12)] },
  { id: "co-2", fecha: fecha(2), comprobante_tipo: "remito", comprobante_numero: "0001-00004410", estado: "confirmada", proveedor: "Tresge", items: [item(5, 2), item(9, 4, 28150)] },
  { id: "co-3", fecha: fecha(4), comprobante_tipo: "sin_comprobante", comprobante_numero: null, estado: "confirmada", proveedor: "Erpa", items: [item(6, 25), item(10, 6), item(14, 24)] },
  { id: "co-4", fecha: fecha(6), comprobante_tipo: "factura", comprobante_numero: "0002-00090117", estado: "anulada", proveedor: "Ixnova", items: [item(3, 10), item(7, 100)] },
  { id: "co-5", fecha: fecha(11), comprobante_tipo: "factura", comprobante_numero: "0003-00018822", estado: "confirmada", proveedor: "Comodo", items: [item(0, 14), item(4, 40), item(16, 3.5)] },
];
const totalDe = (c) => c.items.reduce((s, i) => s + Number(i.cantidad) * Number(i.costo_unitario), 0);
const filaCompra = (c) => ({ ...c, total: totalDe(c).toFixed(2), renglones: String(c.items.length) });

const sectores = [
  { id: "se-1", nombre: "Estantería 1", ultimo_conteo: dia(2), productos: ["p-0", "p-1", "p-2", "p-3"] },
  { id: "se-2", nombre: "Estantería 2", ultimo_conteo: dia(34), productos: ["p-4", "p-8", "p-10", "p-13", "p-14", "p-15"] },
  { id: "se-3", nombre: "Pared de herramientas", ultimo_conteo: null, productos: ["p-5", "p-9"] },
  { id: "se-4", nombre: "Mostrador", ultimo_conteo: dia(0, 8), productos: ["p-17"] },
  { id: "se-5", nombre: "Depósito del fondo", ultimo_conteo: null, productos: [] },
];
// Estantería 2 quedó a medio contar.
const conteos = new Map([["ct-1", { id: "ct-1", estado: "abierto", sector_id: "se-2", renglones: new Map([["p-4", { cantidad: 38, contado_en: dia(0, 9, 5) }], ["p-8", { cantidad: 950, contado_en: dia(0, 9, 7) }], ["p-10", { cantidad: 1, contado_en: dia(0, 9, 9) }]]) }]]);
const abiertoDe = (sectorId) => [...conteos.values()].find((c) => c.sector_id === sectorId && c.estado === "abierto");
const teorico = (id) => String(stock.get(id) ?? 0);
const verConteo = (c) => {
  const s = sectores.find((x) => x.id === c.sector_id);
  const desc = (id) => { const p = productos.find((x) => x.id === id); return { producto_id: id, descripcion: p?.descripcion ?? id, marca: p?.marca ?? null, stock_teorico: teorico(id) }; };
  return {
    id: c.id, estado: c.estado, sector_id: c.sector_id, sector: s.nombre,
    renglones: [...c.renglones].map(([id, r]) => ({ ...desc(id), cantidad_contada: String(r.cantidad), contado_en: r.contado_en })).sort((a, b) => b.contado_en.localeCompare(a.contado_en)),
    sin_contar: s.productos.filter((id) => !c.renglones.has(id)).map(desc),
  };
};

export default {
  "GET /stock": () => {
    const filas = [...stock].map(([id, n]) => { const p = productos.find((x) => x.id === id); return { id, stock: String(n), costo_neto: id === "p-13" ? null : p.costo_neto, proveedor: p.proveedor, valor: id === "p-13" ? "0" : String(Number(p.costo_neto) * Math.max(0, n)), ultimo_movimiento: movimientos.get(id)?.[0]?.fecha ?? null }; });
    const por_proveedor = {};
    for (const f of filas) { const g = (por_proveedor[f.proveedor] ??= { unidades: 0, valor: 0, productos: 0 }); g.unidades += Math.max(0, Number(f.stock)); g.valor += Number(f.valor); g.productos += 1; }
    return { productos: filas, valor_total: filas.reduce((s, f) => s + Number(f.valor), 0), por_proveedor };
  },
  "GET /stock/:id/movimientos": ({ params }) => movimientos.get(params.id) ?? [],
  "POST /stock/:id/ajustes": ({ params, body }) => {
    const real = Number(body?.cantidad_real);
    if (!Number.isFinite(real) || real < 0) return [400, { error: "La cantidad tiene que ser un número mayor o igual a cero." }];
    const habia = stock.get(params.id) ?? 0;
    if (real !== habia) { stock.set(params.id, real); mover(params.id, "ajuste", real - habia, 0, `había ${habia}, hay ${real}: ${body.motivo}`, "ajuste"); }
    return { stock: real, diferencia: real - habia };
  },

  "GET /proveedores": () => proveedores,
  "GET /compras": () => compras.map(filaCompra),
  "GET /compras/semana": () => {
    const desde = fecha(6);
    const g = new Map();
    for (const c of compras.filter((c) => c.estado === "confirmada" && c.fecha >= desde)) { const x = g.get(c.proveedor) ?? { proveedor: c.proveedor, total: 0, compras: 0 }; x.total += totalDe(c); x.compras += 1; g.set(c.proveedor, x); }
    const por_proveedor = [...g.values()].sort((a, b) => b.total - a.total).map((x) => ({ proveedor: x.proveedor, total: x.total.toFixed(2), compras: String(x.compras) }));
    return { desde, por_proveedor, total: por_proveedor.reduce((s, x) => s + Number(x.total), 0) };
  },
  "POST /compras": ({ body }) => {
    const p = proveedores.find((x) => x.id === body?.proveedor_id && x.activo);
    if (!p) return [404, { error: "Ese proveedor no existe o está inactivo." }];
    if (body.comprobante_numero === "0000") return [400, { error: "Ya hay una factura de Comodo con el número 0000: revisá el número." }];
    const c = { id: body.id ?? uuid(), fecha: body.fecha, comprobante_tipo: body.comprobante_tipo, comprobante_numero: body.comprobante_numero, estado: "confirmada", proveedor: p.nombre, items: body.items.map((i) => ({ producto_id: i.producto_id, descripcion: i.descripcion, cantidad: String(i.cantidad), costo_unitario: String(i.costo_unitario) })) };
    compras.unshift(c);
    let costos = 0;
    for (const i of body.items) { if (i.producto_id) { stock.set(i.producto_id, (stock.get(i.producto_id) ?? 0) + Number(i.cantidad)); mover(i.producto_id, "compra", i.cantidad, 0, `${body.comprobante_tipo} ${body.comprobante_numero ?? ""}`.trim(), "compra"); if (Number(productos.find((x) => x.id === i.producto_id)?.costo_neto) !== Number(i.costo_unitario)) costos += 1; } }
    return [201, { id: c.id, total: totalDe(c), productos_nuevos: body.items.filter((i) => !i.producto_id).length, costos_actualizados: costos }];
  },
  "POST /compras/:id/anular": ({ params }) => {
    const c = compras.find((x) => x.id === params.id);
    if (!c || c.estado === "anulada") return [409, { error: "Esa compra no existe o ya está anulada." }];
    c.estado = "anulada";
    return undefined;
  },

  "GET /sectores": () => sectores.map((s) => ({ id: s.id, nombre: s.nombre, productos: String(s.productos.length), ultimo_conteo: s.ultimo_conteo, conteo_abierto: abiertoDe(s.id)?.id ?? null })),
  "POST /sectores": ({ body }) => {
    const nombre = String(body?.nombre ?? "").trim();
    if (!nombre) return [400, { error: "Escribí el nombre del sector." }];
    if (sectores.some((s) => s.nombre.toLowerCase() === nombre.toLowerCase())) return [409, { error: `Ya hay un sector que se llama «${nombre}». Elegí otro nombre.` }];
    const s = { id: `se-${uuid().slice(0, 6)}`, nombre, ultimo_conteo: null, productos: [] };
    sectores.push(s);
    return [201, { id: s.id, nombre }];
  },
  "POST /conteos": ({ body }) => {
    const ya = abiertoDe(body?.sector_id);
    if (ya) return { id: ya.id, retomado: true };
    const c = { id: `ct-${uuid().slice(0, 6)}`, estado: "abierto", sector_id: body.sector_id, renglones: new Map() };
    conteos.set(c.id, c);
    return [201, { id: c.id, retomado: false }];
  },
  "GET /conteos/:id": ({ params }) => { const c = conteos.get(params.id); return c ? verConteo(c) : [404, { error: "Ese conteo no existe." }]; },
  "PUT /conteos/:id/renglones/:productoId": ({ params, body }) => {
    const c = conteos.get(params.id);
    if (!c || c.estado !== "abierto") return [409, { error: "Ese conteo ya se cerró desde otro dispositivo. Volvé y empezá uno nuevo." }];
    const n = Number(body?.cantidad);
    if (!Number.isFinite(n) || n < 0) return [400, { error: "La cantidad tiene que ser un número mayor o igual a cero." }];
    c.renglones.set(params.productoId, { cantidad: n, contado_en: new Date().toISOString() });
    const s = sectores.find((x) => x.id === c.sector_id);
    if (!s.productos.includes(params.productoId)) s.productos.push(params.productoId);
    return undefined;
  },
  "DELETE /conteos/:id/renglones/:productoId": ({ params }) => { conteos.get(params.id)?.renglones.delete(params.productoId); return undefined; },
  "POST /conteos/:id/cerrar": ({ params, body }) => {
    const c = conteos.get(params.id);
    if (!c || c.estado !== "abierto") return [409, { error: "Ese conteo ya se cerró desde otro dispositivo." }];
    const v = verConteo(c);
    const s = sectores.find((x) => x.id === c.sector_id);
    let ajustados = 0, diferencia = 0;
    for (const r of v.renglones) { const d = Number(r.cantidad_contada) - Number(r.stock_teorico); if (d !== 0) { ajustados += 1; diferencia += d; stock.set(r.producto_id, Number(r.cantidad_contada)); mover(r.producto_id, "ajuste", d, 0, `conteo de ${s.nombre}`, "conteo"); } }
    let enCero = 0;
    if (body?.faltantes_en_cero) for (const p of v.sin_contar) { if (Number(p.stock_teorico) !== 0) { enCero += 1; stock.set(p.producto_id, 0); } }
    c.estado = "cerrado"; s.ultimo_conteo = new Date().toISOString();
    return { sector: s.nombre, contados: v.renglones.length, ajustados, sin_contar: v.sin_contar.length, puestos_en_cero: enCero, diferencia_unidades: diferencia };
  },
};

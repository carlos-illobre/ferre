const prov = ["Comodo", "Tresge", "Erpa", "Ixnova"];
const base = [
  ["Mecha 6 mm madera", "Bosch", 1649.14, 100, "unidad"], ["Mecha 6 mm acero rápido", "Stanley", 2480, 100, "unidad"], ["Mecha 6 mm para hormigón", "Irwin", 6012, null, "unidad"],
  ["Mecha 8 mm widia", "Bosch", 3120.5, 200, "unidad"], ["Cinta aisladora negra 20 m", "3M", 420, 200, "unidad"], ["Taladro inalámbrico 18 V", "Stanley", 122500, 50, "unidad"],
  ["Clavo punta París 2 pulgadas", null, 3890, 100, "kg"], ["Cable unipolar 2,5 mm rojo", "Erpla", 512.3, 100, "m"], ["Tornillo autoperforante 8 x 1", "Fischer", 18.4, 300, "unidad"],
  ["Llave francesa 10 pulgadas", "Bahco", 27400, 50, "unidad"], ["Destornillador Phillips PH2", "Stanley", 4200, 138, "unidad"], ["Pintura látex blanca 20 l", "Alba", 74000, null, "unidad"],
  ["Thinner sello de oro", "Sinteplast", 5100, 100, "l"], ["Candado bronce 40 mm", "Papaiz", 8900, 100, "unidad"], ["Sellador siliconado transparente", "Fischer", 3650, 200, "unidad"],
  ["Disco de corte 115 mm", "Tyrolit", 990, 300, "unidad"], ["Electrodo 2,5 mm punta azul", "Conarco", 9800, 50, "kg"], ["Lija al agua grano 220", "Doble A", 310, 300, "unidad"],
];
export const productos = base.map(([descripcion, marca, costo, margen, unidad], i) => {
  const p = prov[i % 4];
  const otros = i % 5 === 1 ? [{ proveedor_id: "pv-0", proveedor: p, costo_neto: String(costo), fecha_lista: "2026-09-02", codigo_proveedor: `A${1000 + i}` }, { proveedor_id: "pv-9", proveedor: "Dimetal", costo_neto: String(costo * 1.08), fecha_lista: "2026-08-20", codigo_proveedor: `D${200 + i}` }] : undefined;
  return { id: `p-${i}`, descripcion, marca, codigo_barras: i % 3 ? `77912340${String(i).padStart(5, "0")}` : null, unidad, margen_elegido: margen, proveedor: p, codigo_proveedor: `${p.slice(0, 2).toUpperCase()}-${60123 + i}`,
    costo_neto: String(costo), iva: "0.21", fecha_lista: "2026-09-0" + (1 + (i % 8)), lista_importada_id: `l-${i % 4}`, explicacion_costo: [`Precio de lista ${p}: $${(costo / 0.8).toFixed(2)}`, "Descuento del proveedor 20 %", `Costo sin IVA $${costo.toFixed(2)}`], sector_id: null, foto_url: null, proveedores: otros };
});
export const clientes = [{ id: "c-1", nombre: "Constructora Martínez", telefono: "11 5555-0101", cuenta_corriente: true, deuda: "184000" }, { id: "c-2", nombre: "Herrería Gómez", telefono: null, cuenta_corriente: true, deuda: "0" }];
const hoy = new Date(); const a = (h, m) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), h, m).toISOString();
export const ventas = [
  { id: "v-1", fecha: a(9, 12), medio_pago: "efectivo", total: "12000", estado: "confirmada", cliente: null, items: [{ descripcion: "Mecha 6 mm madera", cantidad: "2", precio_unitario: "4000" }, { descripcion: "Cinta aisladora negra 20 m", cantidad: "2", precio_unitario: "2000" }] },
  { id: "v-2", fecha: a(10, 40), medio_pago: "mercado_pago", total: "223000", estado: "confirmada", cliente: null, items: [{ descripcion: "Taladro inalámbrico 18 V", cantidad: "1", precio_unitario: "223000" }] },
  { id: "v-3", fecha: a(11, 5), medio_pago: "cuenta_corriente", total: "58000", estado: "confirmada", cliente: "Constructora Martínez", items: [{ descripcion: "Clavo punta París 2 pulgadas", cantidad: "2.5", precio_unitario: "10000" }, { descripcion: "Electrodo 2,5 mm punta azul", cantidad: "1", precio_unitario: "18000" }, { descripcion: "Disco de corte 115 mm", cantidad: "3", precio_unitario: "5000" }] },
  { id: "v-4", fecha: a(11, 48), medio_pago: "tarjeta", total: "6000", estado: "anulada", cliente: null, items: [{ descripcion: "Lija al agua grano 220", cantidad: "3", precio_unitario: "2000" }] },
];
export const usuario = { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", rol: "dueño" };
export default {
  "GET /health": () => ({ ok: true, db: "ok", version: "mock" }),
  "GET /sesiones/actual": () => ({ id: "s-1", usuario }),
  "DELETE /sesiones/actual": () => undefined,
  "GET /productos": () => productos,
  "PATCH /productos/:id": () => ({}),
  "GET /stock": () => ({ productos: productos.slice(0, 12).map((p, i) => ({ id: p.id, stock: String([14, 3, 0, 22, 40, 2, 12.5, 180, 950, 4, -2, 1][i]), costo_neto: p.costo_neto, proveedor: p.proveedor, valor: String(Number(p.costo_neto) * Math.max(0, [14, 3, 0, 22, 40, 2, 12.5, 180, 950, 4, -2, 1][i])), ultimo_movimiento: a(8, i) })), total: "1284500" }),
  "GET /clientes": () => clientes,
  "GET /ventas": () => ({ ventas, totales: { efectivo: 12000, mercado_pago: 223000, cuenta_corriente: 58000 }, total: 293000 }),
  "POST /ventas": () => [201, { ok: true }],
  "POST /ventas/:id/anular": () => ({}),
  "POST /consultas": () => [201, { ok: true }],
  "POST /puestos": () => ({ id: "pu-1", codigo: "ABC123", expiraEnSegundos: 300 }),
  "GET /puestos/:id": () => ({ vinculado_en: null, expira_en: new Date(Date.now() + 3e5).toISOString() }),
};

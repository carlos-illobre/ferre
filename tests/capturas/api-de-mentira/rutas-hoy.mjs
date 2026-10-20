import { ventas } from "./rutas-00-base.mjs";

// «Hoy» renovada (specs/017): como el servidor, cada renglón de una venta trae su subtotal
// (precio × cantidad, redondeado para arriba a $1.000).
ventas.forEach((v) => v.items.forEach((i) => { i.subtotal ??= Math.ceil((Number(i.precio_unitario) * Number(i.cantidad)) / 1000 - 1e-9) * 1000; }));

// Corregir una venta (specs/019): cada renglón con su id y su producto, la versión de la venta y el
// cliente de la cuenta corriente, como los manda el servidor.
const PRODUCTOS = { "Mecha 6 mm madera": "p-3", "Cinta aisladora negra 20 m": "p-4", "Taladro inalámbrico 18 V": "p-5", "Clavo punta París 2 pulgadas": "p-6", "Electrodo 2,5 mm punta azul": "p-16", "Disco de corte 115 mm": "p-15", "Lija al agua grano 220": "p-7" };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let renglones = 0;
ventas.forEach((v) => {
  v.version ??= v.fecha; v.correcciones ??= 0;
  if (v.cliente === "Constructora Martínez") v.cliente_id = "c-1";
  v.items.forEach((i) => { i.id ??= uuid(++renglones); i.producto_id ??= PRODUCTOS[i.descripcion] ?? null; i.devuelto ??= "0"; i.margen_aplicado ??= null; i.foto_url ??= null; });
});

const plata = (i) => (i.margen_aplicado == null ? Number(i.precio_unitario) * Number(i.cantidad) : Math.ceil((Number(i.precio_unitario) * Number(i.cantidad)) / 1000 - 1e-9) * 1000);
export default {
  "GET /ventas/para-cambio": ({ query }) => {
    const q = String(query?.get?.("q") ?? "").toLowerCase();
    return ventas.filter((v) => v.estado === "confirmada" && v.items.some((i) => i.descripcion.toLowerCase().includes(q))).map((v) => ({
      id: v.id, fecha: v.fecha, medio_pago: v.medio_pago, cliente: v.cliente, total: v.total,
      items: v.items.map((i) => ({ id: i.id, producto_id: i.producto_id, descripcion: i.descripcion, cantidad: i.cantidad, foto_url: null, por_devolver: Number(i.cantidad) - Number(i.devuelto), pagado: plata(i) / Number(i.cantidad) })),
    }));
  },
  "POST /ventas/:id/cambio": ({ params, body }) => {
    const v = ventas.find((x) => x.id === params.id);
    if (!v) return [404, { error: "No existe la venta" }];
    let vuelve = 0;
    for (const x of body.vuelve) { const i = v.items.find((y) => y.id === x.item_id); vuelve += (plata(i) / Number(i.cantidad)) * x.cantidad; i.devuelto = String(Number(i.devuelto) + x.cantidad); }
    const lleva = (body.se_lleva ?? []).reduce((s, i) => s + plata(i), 0);
    const diferencia = lleva - vuelve;
    return [201, { id: `c-${Date.now()}`, venta_id: v.id, vuelve, se_lleva: lleva, diferencia, resuelto: v.medio_pago === "cuenta_corriente" ? "cuenta_corriente" : diferencia > 0 ? "cobrado" : diferencia < 0 ? "devuelto" : "sin_diferencia" }];
  },
  "POST /ventas/:id/corregir": ({ params, body }) => {
    const v = ventas.find((x) => x.id === params.id);
    if (!v) return [404, { error: "No existe la venta" }];
    const subtotal = (i) => (i.margen_aplicado == null ? Math.round(i.precio_unitario * i.cantidad * 100) / 100 : Math.ceil((i.precio_unitario * i.cantidad) / 1000 - 1e-9) * 1000);
    const total = body.items.reduce((s, i) => s + subtotal(i), 0);
    const diferencia = total - Number(v.total);
    v.items = body.items.map((i) => ({ id: i.id ?? uuid(++renglones), producto_id: i.producto_id ?? null, descripcion: i.descripcion, cantidad: String(i.cantidad), precio_unitario: String(i.precio_unitario), margen_aplicado: i.margen_aplicado == null ? null : String(i.margen_aplicado), devuelto: "0", foto_url: null, explicacion: null, subtotal: subtotal(i) }));
    v.total = String(total); v.medio_pago = body.medio_pago; v.cliente_id = body.cliente_id ?? null; v.correcciones += 1; v.version = new Date().toISOString();
    return { id: v.id, total, diferencia, resuelta: body.medio_pago === "cuenta_corriente" ? "cuenta_corriente" : diferencia > 0 ? "cobrada" : diferencia < 0 ? "devuelta" : "sin_diferencia", version: v.version };
  },
};

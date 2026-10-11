// Rutas del desarrollador A (ventas del día, productos, listas) para las capturas de la v4.
import { ventas as deHoy, productos as base } from "./rutas-00-base.mjs";

// ---- Productos: con estado (margen, proveedor preferido, foto), una foto de ejemplo y uno sin costo.
const dibujo = (color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${color}"/><rect x="40" y="90" width="120" height="20" rx="10" fill="#fff" opacity=".85"/><circle cx="150" cy="100" r="24" fill="#fff" opacity=".6"/></svg>`)}`;
const cambios = new Map();
function productos() {
  const lista = base.map((p, i) => {
    const propios = p.proveedores ?? [{ proveedor_id: `pv-${i % 4}`, proveedor: p.proveedor, costo_neto: p.costo_neto, fecha_lista: p.fecha_lista, codigo_proveedor: p.codigo_proveedor }];
    const c = cambios.get(p.id) ?? {};
    const preferido = propios.find((x) => x.proveedor_id === c.proveedor_preferido_id);
    const { proveedor_preferido_id, ...resto } = c;
    return { ...p, foto_url: i === 0 ? dibujo("#c8552d") : i === 3 ? dibujo("#2d6a8c") : null, proveedores: propios.slice().sort((a, b) => Number(a.costo_neto) - Number(b.costo_neto)),
      ...(preferido ? { proveedor: preferido.proveedor, costo_neto: preferido.costo_neto, fecha_lista: preferido.fecha_lista, codigo_proveedor: preferido.codigo_proveedor, explicacion_costo: [`Precio de lista ${preferido.proveedor}: $${Number(preferido.costo_neto).toFixed(2)}`, "Sin descuentos", `Costo sin IVA $${Number(preferido.costo_neto).toFixed(2)}`] } : {}), ...resto };
  });
  lista.push({ id: "p-sin-costo", descripcion: "Zócalo de PVC blanco 2 m", marca: "Atrim", codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: null, codigo_proveedor: null, costo_neto: null, iva: null, fecha_lista: null, lista_importada_id: null, explicacion_costo: [], sector_id: null, foto_url: null, proveedores: [], ...(cambios.get("p-sin-costo") ?? {}) });
  return lista.sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));
}

const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const anuladas = new Set();
const MOLDES = [
  ["18:12", "efectivo", null, 6000, [["Cinta aisladora negra 20 m", 3, 2000]]],
  ["16:48", "mercado_pago", null, 53000, [["Llave francesa 10 pulgadas", 1, 41000], ["Mecha 8 mm widia", 1, 12000]]],
  ["15:20", "cuenta_corriente", "Constructora Martínez", 40000, [["Clavo punta París 2 pulgadas", 4, 10000]]],
  ["12:05", "tarjeta", null, 223000, [["Taladro inalámbrico 18 V con dos baterías", 1, 223000]]],
  ["09:14", "efectivo", null, 12000, [["Cable unipolar 2,5 mm", 12, 1000]]],
];
function ventasDe(dia) {
  if (!dia || dia === clave(new Date())) return deHoy.slice().reverse();
  const d = new Date(`${dia}T12:00:00`);
  if (d.getDay() === 0) return []; // los domingos no se abre
  return MOLDES.map(([hora, medio_pago, cliente, total, items], i) => ({
    id: `otro-${dia}-${i}`, fecha: new Date(`${dia}T${hora}:00`).toISOString(), medio_pago, total: String(total), estado: "confirmada", cliente,
    items: items.map(([descripcion, cantidad, precio]) => ({ descripcion, cantidad: String(cantidad), precio_unitario: String(precio) })),
  }));
}

export default {
  "GET /productos": () => productos(),
  "PATCH /productos/:id": ({ params, body }) => { cambios.set(params.id, { ...cambios.get(params.id), ...body }); return { ok: true }; },
  "POST /productos/:id/foto": ({ params }) => { const foto_url = dibujo("#4a7c59"); cambios.set(params.id, { ...cambios.get(params.id), foto_url }); return { foto_url }; },
  "GET /listas/:id/archivo": () => ({ mock: "planilla" }),
  "GET /ventas": ({ query }) => {
    if (query.get("dia") === "2026-01-01") return [500, { error: "(mock) el servidor no pudo armar las ventas" }];
    const ventas = ventasDe(query.get("dia")).map((v) => (anuladas.has(v.id) ? { ...v, estado: "anulada" } : v));
    return { dia: query.get("dia") ?? clave(new Date()), ventas, totales: {}, total: 0 };
  },
  "POST /ventas/:id/anular": ({ params }) => {
    if (anuladas.has(params.id)) return [409, { error: "La venta no existe o ya está anulada" }];
    anuladas.add(params.id);
    return { ok: true };
  },
  // Para volver a capturar desde cero.
  "POST /mock-a/reiniciar": () => { anuladas.clear(); cambios.clear(); return { ok: true }; },
};

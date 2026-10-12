// Pedidos a proveedores (RF-55): uno de cada estado, para ver la lista y cada pedido.
import { productos } from "./rutas-00-base.mjs";
const hace = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
const item = (i, cantidad, recibido = 0) => { const p = productos[i]; return { producto_id: p.id, descripcion: p.descripcion, marca: p.marca, unidad: p.unidad, codigo_proveedor: p.codigo_proveedor, cantidad: String(cantidad), costo_estimado: p.costo_neto, recibido: String(recibido) }; };
const pedido = (id, estado, proveedor, dias, items, extra = {}) => ({ id, estado, proveedor_id: `pv-${id}`, proveedor, whatsapp: null, creado_en: hace(dias + 1), enviado_en: estado === "borrador" ? null : hace(dias), cerrado_en: null, enviado_por: estado === "borrador" ? null : "Marta", cerrado_por: null, items, ...extra });
let pedidos = [
  pedido("00000000-0000-4000-8000-00000000e001", "enviado", "Tresge", 3, [item(1, 24), item(15, 50), item(14, 12), item(6, 7.5)], { whatsapp: "5491155550101" }),
  pedido("00000000-0000-4000-8000-00000000e002", "recibido_parcial", "Distribuidora Industrial del Oeste", 6, [item(0, 20, 20), item(3, 10, 4), item(9, 2, 0)], { enviado_por: "Carlos" }),
  pedido("00000000-0000-4000-8000-00000000e003", "borrador", "Comodo", 0, [item(4, 30), item(12, 6)]),
  pedido("00000000-0000-4000-8000-00000000e004", "recibido", "Erpa", 13, [item(6, 10, 10), item(16, 5, 5)]),
  pedido("00000000-0000-4000-8000-00000000e005", "cerrado_incompleto", "Ixnova", 20, [item(7, 100, 100), item(11, 2, 0)], { cerrado_en: hace(15), cerrado_por: "Carlos" }),
  pedido("00000000-0000-4000-8000-00000000e006", "cancelado", "Tresge", 27, [item(5, 1)], { cerrado_en: hace(25), cerrado_por: "Carlos" }),
];
const uno = (id) => pedidos.find((p) => p.id === id);
const pasar = (id, estado, extra = {}) => { pedidos = pedidos.map((p) => (p.id === id ? { ...p, estado, ...extra } : p)); };
export default {
  "GET /pedidos": () => pedidos,
  "GET /pedidos/:id": ({ params }) => uno(params.id) ?? [404, { error: "No existe ese pedido" }],
  "PUT /pedidos/:id": ({ params, body }) => {
    const items = (body.items ?? []).map((it) => item(productos.findIndex((p) => p.id === it.producto_id), it.cantidad));
    if (uno(params.id)) pedidos = pedidos.map((p) => (p.id === params.id ? { ...p, items } : p));
    else pedidos = [pedido(params.id, "borrador", "Comodo", 0, items, { proveedor_id: body.proveedor_id }), ...pedidos];
    return { id: params.id };
  },
  "DELETE /pedidos/:id": ({ params }) => { pedidos = pedidos.filter((p) => p.id !== params.id); },
  "POST /pedidos/:id/enviar": ({ params }) => { pasar(params.id, "enviado", { enviado_en: hace(0), enviado_por: "Carlos" }); },
  "POST /pedidos/:id/cancelar": ({ params }) => { pasar(params.id, "cancelado", { cerrado_en: hace(0), cerrado_por: "Carlos" }); },
  "POST /pedidos/:id/cerrar": ({ params }) => { pasar(params.id, "cerrado_incompleto", { cerrado_en: hace(0), cerrado_por: "Carlos" }); },
};

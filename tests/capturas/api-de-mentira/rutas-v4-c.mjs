// Datos de mentira para las pantallas de (C) en la v4: Cómo va el negocio, Usuarios y sesiones,
// Quién hizo qué. Mismas formas que el servidor real (microservices/gestion-del-local/src/rutas).
import deA from "./rutas-v4-a.mjs";

const ahora = Date.now();
const hace = (min) => new Date(ahora - min * 60000).toISOString();
const hoy = new Date();
const a = (diasAtras, h, m) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - diasAtras, h, m).toISOString();
const dia = (d) => new Date(ahora - d * 86400000).toISOString().slice(0, 10);

let usuarios = [
  { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", rol: "dueño", activo: true, creado_en: "2026-08-01T12:00:00Z" },
  { id: "u-2", email: "marta.bress@ferre.test", nombre: "Marta", rol: "admin", activo: true, creado_en: "2026-08-03T12:00:00Z" },
  { id: "u-3", email: "nico.mostrador@ferre.test", nombre: "Nicolás", rol: "admin", activo: true, creado_en: "2026-08-20T12:00:00Z" },
  { id: "u-4", email: "ramiro.deposito@ferre.test", nombre: "Ramiro", rol: "mostrador", activo: false, creado_en: "2026-09-02T12:00:00Z" },
];
const SESIONES = () => [
  { id: "s-1", dispositivo: "computadora · Chrome", creada_en: hace(600), ultimo_uso_en: hace(0), expira_en: hace(-40000), email: "carlos@ferre.test", nombre: "Carlos" },
  { id: "s-4", dispositivo: "celular · Chrome", creada_en: hace(3000), ultimo_uso_en: hace(125), expira_en: hace(-40000), email: "carlos@ferre.test", nombre: "Carlos" },
  { id: "s-2", dispositivo: "computadora · Firefox", creada_en: hace(9000), ultimo_uso_en: hace(1500), expira_en: hace(-40000), email: "marta.bress@ferre.test", nombre: "Marta" },
];
let sesiones = SESIONES();
const CREDENCIALES = () => [{ id: "c-1", dispositivo: "Motorola del depósito", creada_en: "2026-06-02T14:00:00Z", ultimo_uso_en: hace(60 * 24 * 61) }];
let credenciales = CREDENCIALES();
const USUARIOS = usuarios;

const U = { c: ["u-1", "carlos@ferre.test", "Carlos"], m: ["u-2", "marta.bress@ferre.test", "Marta"], n: ["u-3", "nico.mostrador@ferre.test", "Nicolás"], r: ["u-4", "ramiro.deposito@ferre.test", "Ramiro"], s: [null, null, null] };
// [quién, cuándo, tipo, contenido]: el contenido es el que registra cada ruta del servidor.
const moldes = [
  ["c", a(0, 10, 32), "venta.registrada", { id: "v-9", total: 8000, medio_pago: "efectivo", cliente_id: null, items: 2 }],
  ["m", a(0, 10, 18), "venta.registrada", { id: "v-2", total: 223000, medio_pago: "mercado_pago", cliente_id: null, items: 1 }],
  ["n", a(0, 10, 15), "compra.registrada", { id: "co-7", proveedor: "Comodo", fecha: dia(0), comprobante: "A-0003-00018822", total: 84091, items: 4, productos_nuevos: 0, costos_actualizados: 2 }],
  ["c", a(0, 9, 54), "venta.registrada", { id: "v-3", total: 25000, medio_pago: "cuenta_corriente", cliente_id: "c-1", items: 1 }],
  ["m", a(0, 9, 44), "lista.aplicada", { id: "l-2", proveedorId: "pv-2", fechaLista: "2026-10-06", nuevos: 3, modificados: 42, sin_cambio: 1340, dados_de_baja: 0, variacion_promedio: 4.2 }],
  ["n", a(0, 9, 31), "venta.registrada", { id: "v-5", total: 53000, medio_pago: "tarjeta", cliente_id: null, items: 2 }],
  ["m", a(0, 9, 12), "venta.anulada", { id: "v-4", motivo: "Se equivocó de mecha" }],
  ["m", a(0, 9, 5), "venta.registrada", { id: "v-4", total: 12000, medio_pago: "efectivo", cliente_id: null, items: 1 }],
  ["c", a(0, 8, 47), "venta.registrada", { id: "v-1", total: 6000, medio_pago: "efectivo", cliente_id: null, items: 1 }],
  ["c", a(0, 8, 31), "sesion.iniciada", { sesionId: "s-1", dispositivo: "computadora · Chrome", medio: "google" }],
  ["c", a(1, 18, 6), "stock.ajustado", { productoId: "p-9", antes: 8, despues: 7, motivo: "Una vino fallada y se devolvió" }],
  ["n", a(1, 17, 40), "conteo.cerrado", { id: "ct-3", sector: "Mostrador", contados: 18, ajustados: 2, sin_contar: 0, puestos_en_cero: 0, diferencia_unidades: -1.5 }],
  ["n", a(1, 15, 22), "venta.registrada", { id: "v-8", total: 58000, medio_pago: "cuenta_corriente", cliente_id: "c-1", items: 3 }],
  ["c", a(1, 12, 10), "producto.precio_elegido", { id: "p-5", margen_elegido: 50 }],
  ["m", a(1, 11, 48), "producto.unido", { conservar: "p-4", absorber: "p-88", manual: true }],
  ["c", a(1, 10, 5), "sesion.revocada", { sesionId: "s-9" }],
  ["n", a(1, 9, 15), "compra.anulada", { id: "co-5", motivo: null }],
  ["m", a(1, 8, 40), "venta.registrada", { id: "v-7", total: 41000, medio_pago: "mercado_pago", cliente_id: null, items: 1 }],
  ["n", a(2, 17, 55), "conteo.abierto", { id: "ct-3", sectorId: "se-4" }],
  ["c", a(2, 16, 30), "lista.cargada", { id: "l-3", proveedor: "Tresge", archivo: "tresge-lista-10.xlsx", fechaLista: "2026-10-05", filas: 864, con_error: 3 }],
  ["m", a(2, 15, 2), "venta.registrada", { id: "v-6", total: 16000, medio_pago: "efectivo", cliente_id: null, items: 2 }],
  ["c", a(2, 11, 20), "usuario.modificado", { id: "u-4", cambios: { activo: false } }],
  ["r", a(2, 10, 12), "venta.registrada", { id: "v-0", total: 9000, medio_pago: "efectivo", cliente_id: null, items: 2 }],
  ["r", a(3, 10, 30), "stock.ajustado", { productoId: "p-12", antes: 3, despues: 0, motivo: null }],
  ["m", a(3, 9, 2), "producto.precio_elegido", { id: "p-7", margen_elegido: 50 }],
  ["n", a(3, 8, 35), "sesion.iniciada", { sesionId: "s-3", dispositivo: "celular · Safari", medio: "huella", credencial: "c-9" }],
  ["c", a(4, 12, 0), "usuario.creado", { id: "u-4", email: "ramiro.deposito@ferre.test", rol: "mostrador" }],
  ["s", a(40, 12, 0), "usuario.creado", { id: "u-1", email: "carlos@ferre.test", rol: "dueño", medio: "comando" }],
];
const eventos = moldes.map(([q, fecha, tipo, contenido], i) => {
  const [uid, email, nombre] = U[q];
  return { id: `e-${i}`, tipo, fecha, dispositivo_id: null, contenido, email, nombre, _uid: uid };
});

export default {
  // El servidor real suma los totales de las confirmadas: se agregan a lo que arma (A).
  "GET /ventas": (ctx) => {
    const r = deA["GET /ventas"](ctx);
    if (Array.isArray(r)) return r;
    const totales = {};
    for (const v of r.ventas) if (v.estado === "confirmada") totales[v.medio_pago] = (totales[v.medio_pago] ?? 0) + Number(v.total);
    return { ...r, totales, total: Object.values(totales).reduce((x, y) => x + y, 0) };
  },
  "GET /compras/semana": () => ({ desde: dia(6), por_proveedor: [{ proveedor: "Tresge", total: "126900.00", compras: "1" }, { proveedor: "Comodo", total: "84091.20", compras: "1" }, { proveedor: "Erpa", total: "47600.00", compras: "1" }], total: 258591.2 }),
  "GET /consultas": () => [
    { id: "q-1", fecha: hace(35), descripcion: "Amoladora 115 mm", precio_ofrecido: "89000", motivo: null },
    { id: "q-2", fecha: hace(110), descripcion: "Pintura látex exterior 4 litros", precio_ofrecido: "46000", motivo: null },
    { id: "q-3", fecha: hace(180), descripcion: "Escalera de aluminio 5 escalones", precio_ofrecido: "118000", motivo: null },
    { id: "q-4", fecha: hace(1500), descripcion: "Amoladora 115 mm", precio_ofrecido: "86000", motivo: null },
    { id: "q-5", fecha: hace(1620), descripcion: "Pintura látex exterior 4 litros", precio_ofrecido: "46000", motivo: null },
    { id: "q-6", fecha: hace(4500), descripcion: "amoladora 115 mm", precio_ofrecido: null, motivo: null },
  ],

  "GET /usuarios": () => usuarios,
  "POST /usuarios": ({ body }) => {
    if (!body?.email?.includes("@")) return [400, { error: "Hace falta un correo válido" }];
    if (!["dueño", "admin", "mostrador"].includes(body.rol)) return [400, { error: "El rol es dueño, admin o mostrador" }];
    if (body.email === "rechazado@ferre.test") return [403, { error: "Solo puede hacerlo un dueño o un admin" }];
    if (usuarios.some((u) => u.email === body.email)) return [409, { error: `${body.email} ya existe` }];
    const u = { id: `u-${Date.now()}`, email: body.email, nombre: body.nombre, rol: body.rol, activo: true };
    usuarios = [...usuarios, u]; return [201, u];
  },
  "PATCH /usuarios/:id": ({ params, body }) => {
    if (params.id === "u-1" && (body.activo === false || body.rol)) return [400, { error: "No podés desactivarte ni cambiarte el rol a vos mismo" }];
    if (params.id === "u-3" && body.activo === false) return [403, { error: "Un admin no puede cambiar a un dueño" }];
    usuarios = usuarios.map((u) => (u.id === params.id ? { ...u, ...body } : u));
    if (body.activo === false) { const u = usuarios.find((x) => x.id === params.id); sesiones = sesiones.filter((s) => s.email !== u.email); }
  },
  "GET /sesiones": () => sesiones,
  "DELETE /sesiones/:id": ({ params }) => { sesiones = sesiones.filter((s) => s.id !== params.id); },
  "GET /credenciales": () => credenciales,
  "DELETE /credenciales/:id": ({ params }) => { credenciales = credenciales.filter((c) => c.id !== params.id); },
  "POST /credenciales/registro": ({ body }) => { const c = { id: `c-${Date.now()}`, dispositivo: body.dispositivo, creada_en: new Date().toISOString(), ultimo_uso_en: null }; credenciales = [c, ...credenciales]; return [201, c]; },
  // Para volver a capturar desde cero.
  "POST /mock-c/reiniciar": () => { usuarios = USUARIOS; sesiones = SESIONES(); credenciales = CREDENCIALES(); return { ok: true }; },

  "GET /auditoria": ({ query }) => {
    const pagina = Math.max(1, Number(query.get("pagina")) || 1);
    const [usuario, tipo, desde, hasta] = ["usuario", "tipo", "desde", "hasta"].map((k) => query.get(k));
    const filtrados = eventos.filter((e) => (!usuario || e._uid === usuario) && (!tipo || e.tipo.startsWith(tipo)) && (!desde || e.fecha >= desde) && (!hasta || e.fecha < hasta));
    return { eventos: filtrados.slice((pagina - 1) * 10, pagina * 10).map(({ _uid, ...e }) => e), total: filtrados.length, pagina, por_pagina: 10 };
  },
};

// Datos de mentira para la entrada y la parte Negocio de /v2/.
const ahora = Date.now();
const hace = (min) => new Date(ahora - min * 60000).toISOString();
const dia = (d) => new Date(ahora - d * 86400000).toISOString().slice(0, 10);

let usuarios = [
  { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", rol: "dueño", activo: true, creado_en: "2026-08-01T12:00:00Z" },
  { id: "u-2", email: "marta.bress@ferre.test", nombre: "Marta", rol: "admin", activo: true, creado_en: "2026-08-03T12:00:00Z" },
  { id: "u-3", email: "nico.mostrador@ferre.test", nombre: "Nicolás", rol: "admin", activo: true, creado_en: "2026-08-20T12:00:00Z" },
  { id: "u-4", email: "lucia.fernandez.deposito@ferre.test", nombre: "Lucía Fernández", rol: "mostrador", activo: false, creado_en: "2026-09-02T12:00:00Z" },
];
let sesiones = [
  { id: "s-1", dispositivo: "computadora · Chrome", creada_en: hace(600), ultimo_uso_en: hace(0), expira_en: hace(-40000), email: "carlos@ferre.test", nombre: "Carlos" },
  { id: "s-2", dispositivo: "celular · Chrome", creada_en: hace(3000), ultimo_uso_en: hace(12), expira_en: hace(-40000), email: "marta.bress@ferre.test", nombre: "Marta" },
  { id: "s-3", dispositivo: "celular · Safari", creada_en: hace(9000), ultimo_uso_en: hace(190), expira_en: hace(-40000), email: "nico.mostrador@ferre.test", nombre: "Nicolás" },
  { id: "s-4", dispositivo: "celular · Chrome", creada_en: hace(20000), ultimo_uso_en: hace(4400), expira_en: hace(-40000), email: "carlos@ferre.test", nombre: "Carlos" },
];
let credenciales = [
  { id: "c-1", dispositivo: "Samsung de Carlos", creada_en: "2026-08-02T14:00:00Z", ultimo_uso_en: hace(4400) },
  { id: "c-2", dispositivo: "celular · Chrome", creada_en: "2026-09-15T14:00:00Z", ultimo_uso_en: null },
];

const U = { c: ["u-1", "carlos@ferre.test", "Carlos"], m: ["u-2", "marta.bress@ferre.test", "Marta"], n: ["u-3", "nico.mostrador@ferre.test", "Nicolás"], s: [null, null, null] };
const moldes = [
  ["m", "venta.registrada", { id: "v-3", total: 58000, medio_pago: "cuenta_corriente", cliente_id: "c-1", items: 3 }],
  ["c", "producto.precio_elegido", { id: "p-5", margen_elegido: 50 }],
  ["m", "venta.anulada", { id: "v-4", motivo: "Se equivocó de lija" }],
  ["m", "venta.registrada", { id: "v-4", total: 6000, medio_pago: "tarjeta", cliente_id: null, items: 1 }],
  ["n", "venta.registrada", { id: "v-2", total: 223000, medio_pago: "mercado_pago", cliente_id: null, items: 1 }],
  ["n", "sesion.iniciada", { sesionId: "s-3", dispositivo: "celular · Safari", medio: "huella", credencial: "c-9" }],
  ["c", "lista.aplicada", { id: "l-2", proveedorId: "pv-2", fechaLista: "2026-10-06", actualizados: 7096, nuevos: 212, sin_cambios: 1340 }],
  ["c", "lista.cargada", { id: "l-2", proveedor: "Erpa", archivo: "lista-erpa-octubre.xlsx", fechaLista: "2026-10-06", filas: 8648, con_error: 3 }],
  ["m", "venta.registrada", { id: "v-1", total: 12000, medio_pago: "efectivo", cliente_id: null, items: 2 }],
  ["m", "sesion.iniciada", { sesionId: "s-2", dispositivo: "celular · Chrome", medio: "google" }],
  ["c", "compra.registrada", { id: "co-7", proveedor: "Comodo", fecha: dia(1), comprobante: "A-0003-00018822", total: 412500, items: 14 }],
  ["c", "usuario.modificado", { id: "u-4", cambios: { activo: false } }],
  ["n", "stock.ajustado", { productoId: "p-6", antes: 14.5, despues: 12.5, motivo: "Se mojó una caja" }],
  ["n", "conteo.cerrado", { id: "ct-3", sector: "Estantería 4 · Bulonería", contados: 86, con_diferencia: 5 }],
  ["n", "conteo.abierto", { id: "ct-3", sectorId: "se-4" }],
  ["c", "producto.unido", { conservar: "p-1", absorber: "p-88", manual: true }],
  ["c", "usuario.creado", { id: "u-4", email: "lucia.fernandez.deposito@ferre.test", rol: "mostrador" }],
  ["s", "usuario.creado", { id: "u-1", email: "carlos@ferre.test", rol: "dueño", medio: "comando" }],
  ["c", "credencial.vinculada", { id: "c-1", dispositivo: "Samsung de Carlos", tipo: "multiDevice" }],
  ["m", "compra.anulada", { id: "co-5", motivo: null }],
  ["c", "sesion.revocada", { sesionId: "s-9" }],
  ["m", "cliente.creado", { id: "c-2", nombre: "Herrería Gómez" }],
  ["c", "proveedor.creado", { id: "pv-9", nombre: "Dimetal", descuento: 12 }],
  ["n", "producto.foto", { id: "p-9", foto_url: "/fotos/p-9.jpg" }],
  ["m", "venta.pagada", { id: "v-0" }],
  ["n", "puesto.vinculado", { puestoId: "pu-1" }],
];
const eventos = Array.from({ length: 37 }, (_, i) => {
  const [q, tipo, contenido] = moldes[i % moldes.length];
  const [uid, email, nombre] = U[q];
  return { id: `e-${i}`, tipo, fecha: hace(8 + i * 97), dispositivo_id: null, contenido, email, nombre, _uid: uid };
});

export default {
  "POST /sesiones/google": ({ body }) => body?.credencial === "no"
    ? [403, { error: "juan.perez@ferre.test no está autorizado. Pedile al dueño que te dé de alta." }]
    : [201, { token: "token-de-mentira", usuario: { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", rol: "dueño" } }],
  "GET /usuarios": () => usuarios,
  "POST /usuarios": ({ body }) => {
    if (usuarios.some((u) => u.email === body.email)) return [409, { error: `${body.email} ya existe` }];
    const u = { id: `u-${Date.now()}`, email: body.email, nombre: body.nombre, rol: body.rol, activo: true };
    usuarios = [...usuarios, u]; return [201, u];
  },
  "PATCH /usuarios/:id": ({ params, body }) => {
    if (params.id === "u-1" && (body.activo === false || body.rol)) return [400, { error: "No podés desactivarte ni cambiarte el rol a vos mismo" }];
    usuarios = usuarios.map((u) => (u.id === params.id ? { ...u, ...body } : u));
    if (body.activo === false) { const u = usuarios.find((x) => x.id === params.id); sesiones = sesiones.filter((s) => s.email !== u.email); }
  },
  "GET /sesiones": () => sesiones,
  "DELETE /sesiones/:id": ({ params }) => { sesiones = sesiones.filter((s) => s.id !== params.id); },
  "GET /credenciales": () => credenciales,
  "DELETE /credenciales/:id": ({ params }) => { credenciales = credenciales.filter((c) => c.id !== params.id); },
  "POST /credenciales/registro/opciones": () => ({ desafioId: "d-1", opciones: { challenge: "YWJj", rp: { name: "Ferrebress", id: "localhost" }, user: { id: "dS0x", name: "carlos@ferre.test", displayName: "Carlos" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { residentKey: "required", userVerification: "required" } } }),
  "POST /credenciales/registro": ({ body }) => { const c = { id: `c-${Date.now()}`, dispositivo: body.dispositivo, creada_en: new Date().toISOString(), ultimo_uso_en: null }; credenciales = [...credenciales, c]; return [201, c]; },
  "GET /auditoria": ({ query }) => {
    const pagina = Math.max(1, Number(query.get("pagina")) || 1);
    const [usuario, tipo, desde, hasta] = ["usuario", "tipo", "desde", "hasta"].map((k) => query.get(k));
    const filtrados = eventos.filter((e) => (!usuario || e._uid === usuario) && (!tipo || e.tipo.startsWith(tipo)) && (!desde || e.fecha >= desde) && (!hasta || e.fecha < hasta));
    return { eventos: filtrados.slice((pagina - 1) * 10, pagina * 10).map(({ _uid, ...e }) => e), total: filtrados.length, pagina, por_pagina: 10 };
  },
  "GET /compras/semana": () => ({ desde: dia(6), por_proveedor: [{ proveedor: "Comodo", total: "412500.00", compras: "2" }, { proveedor: "Erpa", total: "238900.50", compras: "1" }, { proveedor: "Tresge", total: "96000.00", compras: "3" }], total: 747400.5 }),
  "GET /consultas": () => [
    { id: "q-1", fecha: hace(35), descripcion: "Taladro inalámbrico 18 V", precio_ofrecido: "223000", motivo: "Lo vio más barato en otro lado" },
    { id: "q-2", fecha: hace(110), descripcion: "Pintura látex blanca 20 l", precio_ofrecido: "148000", motivo: null },
    { id: "q-3", fecha: hace(180), descripcion: "Bisagra vaivén 4 pulgadas", precio_ofrecido: null, motivo: "No la tenemos" },
    { id: "q-4", fecha: hace(1500), descripcion: "Llave francesa 10 pulgadas", precio_ofrecido: "41100", motivo: null },
    { id: "q-5", fecha: hace(1620), descripcion: "Electrodo 2,5 mm punta azul", precio_ofrecido: "14700", motivo: "Quería por unidad" },
    { id: "q-6", fecha: hace(4500), descripcion: "Candado bronce 40 mm", precio_ofrecido: "17800", motivo: null },
  ],
  "POST /puestos/:codigo/vincular": ({ params }) => params.codigo === "VENCIDO" ? [404, { error: "El código venció o ya se usó. Generá otro en la computadora." }] : { id: "pu-1", nombre: "computadora del mostrador", horas: 12 },
};

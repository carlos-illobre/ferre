// Datos de mentira para Listas de precios y Duplicados. Con estado, para poder recorrer
// los caminos: POST /_mock/listas { escenario } lo reinicia ("normal", "sin-listas",
// "sin-proveedores", "sin-duplicados").
// El archivo que se sube decide qué pasa, por su nombre: "desconocido…" no reconoce el
// proveedor, "sin-fecha…" pide la fecha, "roto…" no se puede leer; cualquier otro se lee.
const dia = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const momento = (n, h = 10) => { const d = new Date(Date.now() - n * 864e5); d.setHours(h, 24, 0, 0); return d.toISOString(); };

const PROVEEDORES = [
  { id: "pv-0", nombre: "Comodo", precios_incluyen_iva: false, descuento_general: "0.25", descuento_contado: "0.05", lector: "comodo", activo: true },
  { id: "pv-1", nombre: "Dimetal", precios_incluyen_iva: true, descuento_general: "0.1", descuento_contado: "0", lector: "dimetal", activo: true },
  { id: "pv-2", nombre: "Tresge", precios_incluyen_iva: false, descuento_general: "0.2", descuento_contado: "0.03", lector: "tresge", activo: true },
  { id: "pv-3", nombre: "Erpa", precios_incluyen_iva: false, descuento_general: "0", descuento_contado: "0", lector: null, activo: true },
  { id: "pv-4", nombre: "Ixnova", precios_incluyen_iva: true, descuento_general: "0.15", descuento_contado: "0", lector: "generico", activo: true },
];

const resumen = (leidas, nuevos, modificados, variacion, baja = 0, salteadas = 0) => ({ leidas, salteadas, nuevos, modificados, sin_cambio: leidas - nuevos - modificados, dados_de_baja: baja, variacion_promedio: variacion });
const SALTEADAS = [
  { fila: 14, motivo: "no tiene precio", contenido: ["600410", "Mecha escalonada 4-20 mm", ""] },
  { fila: 2231, motivo: "el precio no es un número", contenido: ["771520", "Tornillo fix 6 x 50 zincado", "consultar"] },
  { fila: 5102, motivo: "no tiene código", contenido: ["", "Oferta del mes: amoladoras", "89.900,00"] },
];
const lista = (id, pv, diasLista, diasCarga, estado, res, extra = {}) => ({
  id, archivo_nombre: `${PROVEEDORES[pv].nombre.toLowerCase()}-${dia(diasLista)}.xlsx`, fecha_lista: dia(diasLista), estado, resumen: res, avisos: [], importada_en: estado === "aplicada" ? momento(diasCarga) : null,
  creado_en: momento(diasCarga), proveedor_id: PROVEEDORES[pv].id, proveedor: PROVEEDORES[pv].nombre, ...extra,
});
const LISTAS = () => [
  lista("l-pend", 0, 1, 0, "pendiente", { ...resumen(7096, 12, 1340, 8.2, 3, 3), salteadas_detalle: SALTEADAS }, { avisos: ["La planilla trae 38 ofertas con vencimiento: se cargan como precio de oferta hasta su fecha."] }),
  lista("l-1", 1, 6, 5, "aplicada", resumen(5310, 4, 876, 4.1)),
  lista("l-2", 2, 19, 18, "aplicada", resumen(3120, 0, 412, 6.7)),
  lista("l-3", 4, 23, 22, "descartada", resumen(1894, 1894, 0, 0)),
  lista("l-4", 4, 31, 30, "aplicada", resumen(1894, 1894, 0, 0)),
  lista("l-5", 0, 62, 61, "aplicada", resumen(7084, 31, 1544, 11.3, 9)),
  lista("l-6", 1, 40, 39, "aplicada", resumen(5306, 12, 856, 3.9)),
];

const FILAS = [
  ["600123", "Mecha 6 mm madera", "Bosch", 1782.5, 1649.14], ["452788", "Llave francesa 8 pulgadas", "Stanley", 2790, 2850], ["312055", "Cinta aisladora 3M blanca 20 m", "3M", 420, 380],
  ["600131", "Mecha 8 mm widia", "Bosch", 3399.9, 3120.5], ["881204", "Taladro inalámbrico 18 V con dos baterías", "Stanley", 134750, 122500], ["120077", "Disco de corte 115 mm", "Tyrolit", 1069.2, 990],
  ["540310", "Candado bronce 40 mm", "Papaiz", 8455, 8900], ["771002", "Tornillo autoperforante 8 x 1 punta aguja", "Fischer", 19.87, 18.4], ["903318", "Sellador siliconado transparente 280 ml", "Fischer", 3942, 3650],
  ["600410", "Mecha escalonada 4-20 mm titanio", "Irwin", 21480, null], ["330912", "Amoladora angular 115 mm 820 W", "Bosch", 96300, null], ["218840", "Pinza pico de loro 10 pulgadas", "Bahco", 31200, null],
  ["771015", "Tornillo 4 x 30 zincado", "Ferrofix", 9.5, 9.5], ["640021", "Lija al agua grano 220", "Doble A", 310, 310], ["415500", "Thinner sello de oro 1 l", "Sinteplast", 5100, 5100],
].map(([codigo_proveedor, descripcion, marca, costo, anterior]) => ({
  codigo_proveedor, descripcion, marca, costo_neto: String(costo), costo_anterior: anterior === null ? null : String(anterior),
  explicacion: [`Precio de lista de Comodo: $${(costo / 0.7125).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Menos el descuento general del 25 %", "Menos el descuento por pago de contado del 5 %", `Costo sin IVA: $${costo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
}));

const prod = (id, descripcion, marca, codigo_barras, proveedor, costo, diasLista) => ({ id, descripcion, marca, codigo_barras, proveedor, costo_neto: costo === null ? null : String(costo), fecha_lista: dia(diasLista) });
const SUGERENCIAS = () => [
  { id: "s-1", motivo: "codigo_barras", creado_en: momento(0), a: prod("p-0", "Mecha 6 mm madera", "Bosch", "7791234000017", "Comodo", 1649.14, 1), b: prod("d-0", "MECHA P/MADERA 6MM BOSCH", "Bosch", "7791234000017", "Dimetal", 1702.3, 6) },
  { id: "s-2", motivo: "descripcion", creado_en: momento(0), a: prod("p-4", "Cinta aisladora negra 20 m", "3M", "7791234000048", "Comodo", 420, 1), b: prod("d-4", "Cinta aisladora negra 20 m", "3M", null, "Tresge", 398.5, 19) },
  { id: "s-3", motivo: "codigo_barras", creado_en: momento(1), a: prod("p-13", "Candado bronce 40 mm", "Papaiz", "7791234000130", "Tresge", 8900, 19), b: prod("d-13", "Candado de bronce 40 mm arco normal", "Papaiz", "7791234000130", "Ixnova", 9240, 31) },
  { id: "s-4", motivo: "descripcion", creado_en: momento(1), a: prod("p-15", "Disco de corte 115 mm", "Tyrolit", null, "Erpa", 990, 40), b: prod("d-15", "Disco de corte 115 mm", null, null, "Dimetal", null, 6) },
];
const UNIDOS = () => [
  { absorbido_id: "d-9", absorbido: "LLAVE FRANCESA 10\" BAHCO", conservado_id: "p-9", conservado: "Llave francesa 10 pulgadas", unido_en: momento(3), proveedores: "Comodo, Dimetal" },
  { absorbido_id: "d-12", absorbido: "Thinner sello oro x 1 lt", conservado_id: "p-12", conservado: "Thinner sello de oro", unido_en: momento(12), proveedores: "Comodo, Tresge, Ixnova" },
];

import { productos } from "./rutas-00-base.mjs";
const nombres = new Map(productos.map((p) => [p.id, p.descripcion]));
let proveedores, listas, sugerencias, unidos, aplicando, buscadas;
const separados = new Map();
function reiniciar(escenario = "normal") {
  proveedores = escenario === "sin-proveedores" ? [] : PROVEEDORES.map((p) => ({ ...p }));
  listas = escenario === "sin-listas" || escenario === "sin-proveedores" ? [] : LISTAS();
  sugerencias = escenario === "sin-duplicados" ? [] : SUGERENCIAS();
  unidos = escenario === "sin-duplicados" ? [] : UNIDOS();
  aplicando = new Map();
  buscadas = 0;
}
reiniciar();

// La aplicación simulada: 6 segundos guardando precios, 3 buscando duplicados.
function avanzar(l) {
  const desde = aplicando.get(l.id);
  if (!desde) return l;
  const seg = (Date.now() - desde) / 1000;
  if (seg >= 9) { aplicando.delete(l.id); l.estado = "aplicada"; l.importada_en = new Date().toISOString(); delete l.resumen.progreso; return l; }
  l.resumen.progreso = seg < 6 ? { procesadas: Math.min(l.resumen.leidas, Math.floor((seg / 6) * l.resumen.leidas / 500) * 500), total: l.resumen.leidas, etapa: "precios" } : { procesadas: l.resumen.leidas, total: l.resumen.leidas, etapa: "duplicados" };
  return l;
}
const campo = (crudo, nombre) => (typeof crudo === "string" ? crudo.match(new RegExp(`name="${nombre}"\\r?\\n\\r?\\n([^\\r\\n]*)`))?.[1] : undefined);

export default {
  "POST /_mock/listas": ({ body }) => { reiniciar(body?.escenario); return { ok: true }; },

  "GET /proveedores": () => proveedores,
  "POST /proveedores": ({ body }) => {
    if (!body?.nombre) return [400, { error: "Falta el nombre del proveedor" }];
    if (proveedores.some((p) => p.nombre.toLowerCase() === String(body.nombre).toLowerCase())) return [409, { error: "Ya existe un proveedor con ese nombre" }];
    const p = { id: `pv-${Date.now()}`, nombre: body.nombre, precios_incluyen_iva: Boolean(body.precios_incluyen_iva), descuento_general: String(body.descuento_general ?? 0), descuento_contado: String(body.descuento_contado ?? 0), lector: body.lector ?? null, activo: true };
    proveedores.push(p);
    return [201, p];
  },
  "GET /listas/lectores": () => ["comodo", "dimetal", "tresge", "generico"],
  "GET /listas": () => listas.map(avanzar),
  "POST /listas": async ({ body }) => {
    await new Promise((r) => setTimeout(r, 1200));
    const crudo = typeof body === "string" ? body : "";
    const nombre = crudo.match(/filename="([^"]*)"/)?.[1] ?? "lista.xlsx";
    const proveedorId = campo(crudo, "proveedor_id");
    const fechaLista = campo(crudo, "fecha_lista");
    if (/roto/.test(nombre)) return [422, { error: "No se pudo leer la planilla: no encontré la columna de precios. Revisá que sea la lista del proveedor y volvé a elegirla." }];
    if (/grande/.test(nombre)) return [413, { error: "El archivo pesa más de 30 MB" }];
    if (/desconocid/.test(nombre) && !proveedorId) return [422, { error: "No reconocí de qué proveedor es la planilla. Elegilo a mano." }];
    if (/sin-fecha/.test(nombre) && !fechaLista) return [422, { error: "La planilla no dice su fecha: indicá la fecha de la lista" }];
    const pv = proveedores.find((p) => p.id === proveedorId) ?? proveedores[0];
    if (!pv) return [422, { error: "No reconocí de qué proveedor es la planilla. Elegilo a mano." }];
    const l = { id: `l-${Date.now()}`, archivo_nombre: nombre, fecha_lista: fechaLista ?? dia(0), estado: "pendiente", resumen: { ...resumen(7096, 12, 1340, 8.2, 3, 3), salteadas_detalle: SALTEADAS }, avisos: [], importada_en: null, creado_en: new Date().toISOString(), proveedor_id: pv.id, proveedor: pv.nombre };
    listas.unshift(l);
    return [201, { id: l.id, proveedor: pv.nombre, fecha_lista: l.fecha_lista, resumen: l.resumen, avisos: l.avisos, salteadas: SALTEADAS }];
  },
  "GET /listas/:id": ({ params }) => { if (params.id === "lectores") return ["comodo", "dimetal", "tresge", "generico"]; const l = listas.find((x) => x.id === params.id); return l ? avanzar(l) : [404, { error: "La lista no existe" }]; },
  "GET /listas/:id/filas": ({ query }) => {
    const desde = Number(query.get("desde") ?? 0);
    return { total: 7096, filas: desde === 0 ? FILAS : FILAS.map((f) => ({ ...f, codigo_proveedor: `${f.codigo_proveedor}-${desde}`, costo_anterior: f.costo_neto })) };
  },
  "POST /listas/:id/aplicar": ({ params }) => {
    const l = listas.find((x) => x.id === params.id);
    if (!l || l.estado !== "pendiente") return [409, { error: "La lista no existe o ya no está pendiente" }];
    l.estado = "aplicando"; aplicando.set(l.id, Date.now());
    return [202, { ok: true }];
  },
  "POST /listas/:id/descartar": ({ params }) => {
    const l = listas.find((x) => x.id === params.id);
    if (!l || l.estado !== "pendiente") return [409, { error: "La lista no existe o ya no está pendiente" }];
    l.estado = "descartada";
    return undefined;
  },

  "GET /equivalencias": () => sugerencias,
  "POST /equivalencias/buscar": async () => {
    await new Promise((r) => setTimeout(r, 1500));
    if (buscadas++ > 0 || sugerencias.length > 0) return { nuevas: 0 };
    sugerencias = SUGERENCIAS().slice(0, 2);
    return { nuevas: 2 };
  },
  "POST /equivalencias/unir": ({ body }) => {
    if (!body?.conservar_id || !body?.absorber_id || body.conservar_id === body.absorber_id) return [400, { error: "Hacen falta dos productos distintos" }];
    const antes = separados.get(body.absorber_id);
    unidos.unshift(antes ?? { absorbido_id: body.absorber_id, absorbido: nombres.get(body.absorber_id) ?? "Producto absorbido", conservado_id: body.conservar_id, conservado: nombres.get(body.conservar_id) ?? "Producto conservado", unido_en: new Date().toISOString(), proveedores: "Comodo, Dimetal" });
    return { ok: true };
  },
  "GET /equivalencias/unidos": () => unidos,
  "POST /equivalencias/separar": ({ body }) => {
    const i = unidos.findIndex((u) => u.absorbido_id === body?.absorbido_id);
    if (i < 0) return [409, { error: "Ese producto no está unido a otro" }];
    const [u] = unidos.splice(i, 1);
    separados.set(u.absorbido_id, u);
    return { ok: true };
  },
  "POST /equivalencias/:id/unir": ({ params, body }) => {
    const i = sugerencias.findIndex((s) => s.id === params.id);
    if (i < 0) return [409, { error: "La sugerencia no existe o ya se resolvió" }];
    const [s] = sugerencias.splice(i, 1);
    const queda = body?.conservar === "b" ? s.b : s.a; const sale = body?.conservar === "b" ? s.a : s.b;
    unidos.unshift({ absorbido_id: sale.id, absorbido: sale.descripcion, conservado_id: queda.id, conservado: queda.descripcion, unido_en: new Date().toISOString(), proveedores: [s.a.proveedor, s.b.proveedor].join(", ") });
    return { ok: true };
  },
  "POST /equivalencias/:id/rechazar": ({ params }) => {
    const i = sugerencias.findIndex((s) => s.id === params.id);
    if (i < 0) return [409, { error: "La sugerencia no existe o ya se resolvió" }];
    sugerencias.splice(i, 1);
    return { ok: true };
  },
};

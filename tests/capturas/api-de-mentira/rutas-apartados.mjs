// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados): tres cambios de Ana
// López hechos sin conexión, uno de ellos con el motivo de por qué no se pudo aceptar. Aceptar y
// descartar los sacan de la lista mientras la API corre; se reinicia volviendo a levantar.
const hace = (minutos) => new Date(Date.now() - minutos * 60_000).toISOString();
const ANA = "u-ana";
const de = { usuario_id: ANA, usuario: "Ana López", desactivado_en: hace(50), dispositivo: "celular del mostrador" };
const pendientes = [
  { id: "apa-1", tipo: "venta", metodo: "POST", ruta: "/ventas", hecho_en: hace(75), llegado_en: hace(2), error: null, producto: null, ...de,
    cuerpo: { medio_pago: "efectivo", items: [{ descripcion: "Candado bronce 40 mm", cantidad: 2, precio_unitario: 11000 }, { descripcion: "Disco de corte 115 mm", cantidad: 1, precio_unitario: 5000 }] } },
  { id: "apa-2", tipo: "stock.ajuste", metodo: "POST", ruta: "/stock/00000000-0000-0000-0000-000000000001/ajustes", hecho_en: hace(70), llegado_en: hace(2), error: null, producto: "Thinner sello de oro", ...de,
    cuerpo: { cantidad_real: 6, motivo: "conté la estantería" } },
  { id: "apa-3", tipo: "venta", metodo: "POST", ruta: "/ventas", hecho_en: hace(59), llegado_en: hace(2), producto: null, ...de,
    error: "«Tornillo autoperforante 8 × 1\"» se unió con «Tornillo autoperf. 8x1 punta mecha». Si querés, descartala y cargá la venta de nuevo",
    cuerpo: { medio_pago: "mercado_pago", items: [{ descripcion: "Tornillo autoperforante 8 × 1\"", cantidad: 3, precio_unitario: 1400 }] } },
];
const sacar = (id) => { const i = pendientes.findIndex((p) => p.id === id); if (i >= 0) pendientes.splice(i, 1); };
export default {
  "GET /apartados": () => ({ apartados: pendientes }),
  "POST /apartados/:id/aceptar": ({ params }) => {
    const p = pendientes.find((x) => x.id === params.id);
    if (p?.error) return [409, { error: `No se pudo aceptar: ${p.error}` }];
    sacar(params.id); return { aceptado: true };
  },
  "POST /apartados/:id/descartar": ({ params }) => { sacar(params.id); return { descartado: true }; },
};

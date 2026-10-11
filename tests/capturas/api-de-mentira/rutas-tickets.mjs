// Datos de mentira para Más > Mejoras y errores (RF-80).
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
let tickets = [
  { id: "t-1", tipo: "error", descripcion: "Al cobrar con tarjeta la pantalla quedó en blanco y tuve que volver a cargar la venta.", dispositivo: "celular · Chrome", version: "a1b2c3d", creado_en: hace(50), estado: "abierto", resuelto_en: null, nota: null, usuario: "Marta", resuelto_por: null, fotos: ["/tickets/fotos/captura-1", "/tickets/fotos/captura-2"] },
  { id: "t-2", tipo: "mejora", descripcion: "Estaría bueno ver cuánto stock queda cuando busco un producto para vender.", dispositivo: "computadora · Chrome", version: "a1b2c3d", creado_en: hace(1500), estado: "abierto", resuelto_en: null, nota: null, usuario: "Nicolás", resuelto_por: null, fotos: [] },
  { id: "t-3", tipo: "error", descripcion: "El botón de imprimir etiquetas no hacía nada.", dispositivo: "computadora · Edge", version: "9f8e7d6", creado_en: hace(9000), estado: "resuelto", resuelto_en: hace(4000), nota: "Corregido: ya imprime desde Estantería.", usuario: "Carlos", resuelto_por: "Carlos", fotos: ["/tickets/fotos/captura-3"] },
];
const captura = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="#f5f6f2"/><rect width="360" height="64" fill="#17312b"/><rect x="24" y="96" width="312" height="120" rx="12" fill="#fff" stroke="#dfe5e1"/><rect x="24" y="240" width="312" height="56" rx="12" fill="#d83f0e"/><text x="24" y="40" fill="#fff" font-family="sans-serif" font-size="20">Captura ${n}</text></svg>`;
export default {
  "GET /tickets": () => tickets,
  "POST /tickets": () => { tickets = [{ id: `t-${tickets.length + 1}`, tipo: "mejora", descripcion: "Ticket recién enviado desde la captura.", dispositivo: "computadora · Chrome", version: "local", creado_en: hace(0), estado: "abierto", resuelto_en: null, nota: null, usuario: "Carlos", resuelto_por: null, fotos: [] }, ...tickets]; return [201, { id: tickets[0].id }]; },
  "POST /tickets/:id/resolver": ({ params, body }) => { tickets = tickets.map((t) => t.id === params.id ? { ...t, estado: "resuelto", resuelto_en: hace(0), resuelto_por: "Carlos", nota: body?.nota || null } : t); return { ok: true }; },
  "POST /tickets/:id/reabrir": ({ params }) => { tickets = tickets.map((t) => t.id === params.id ? { ...t, estado: "abierto", resuelto_en: null, resuelto_por: null, nota: null } : t); return { ok: true }; },
  "GET /tickets/fotos/:nombre": ({ params }) => ({ tipo: "image/svg+xml", cuerpo: captura(params.nombre.slice(-1)) }),
};

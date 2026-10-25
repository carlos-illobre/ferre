import type { Texto } from "./base";

export const negocio = {
  // Más → Cómo va el negocio y sus secciones (decisión 95).
  queHayEnElNegocio: { largo: "Lo vendido, los gastos, las compras y el dinero invertido", corto: "Lo vendido, los gastos y el inventario" },
  seccionVentas: {
    largo: "Lo vendido hoy, cómo se cobró y lo que preguntaron y no llevaron.",
    corto: "Lo vendido hoy y lo que no llevaron.",
  },
  seccionCompras: {
    largo: "Lo gastado en compras en la semana y las últimas compras, con su comprobante.",
    corto: "Los gastos de la semana y las últimas compras.",
  },
  seccionInventario: {
    largo: "Cuánta plata hay puesta en el depósito, por proveedor.",
    corto: "La plata puesta en el depósito.",
  },
} satisfies Record<string, Texto>;

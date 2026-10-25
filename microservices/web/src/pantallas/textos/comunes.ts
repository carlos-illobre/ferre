import type { Comprobante } from "../../negocio/deposito";

export type Medio = "efectivo" | "mercado_pago" | "tarjeta" | "cuenta_corriente";
export const MEDIOS: { valor: Medio; nombre: string; corto: string; tecla: string }[] = [
  { valor: "efectivo", nombre: "Efectivo", corto: "Efectivo", tecla: "F5" },
  { valor: "mercado_pago", nombre: "Mercado Pago", corto: "M. Pago", tecla: "F6" },
  { valor: "tarjeta", nombre: "Tarjeta", corto: "Tarjeta", tecla: "F7" },
  { valor: "cuenta_corriente", nombre: "Cuenta corriente", corto: "Cta. cte.", tecla: "F8" },
];
export type { Comprobante };
export const COMPROBANTES: { valor: Comprobante; nombre: string; corto: string }[] = [
  { valor: "factura", nombre: "Factura", corto: "Factura" },
  { valor: "remito", nombre: "Remito", corto: "Remito" },
  { valor: "sin_comprobante", nombre: "Sin comprobante", corto: "Sin" },
];
// Por qué se corrige un stock. El motivo es obligatorio en las dos interfaces (RF-53).
export const MOTIVOS_DE_AJUSTE = ["Conté la estantería", "Rotura", "Se usó en el local", "Estaba mal cargado"];

// Cómo se llama cada pantalla y cada parte, igual en el menú, en el título y en las dos interfaces.
export const NOMBRES = {
  comoVaElNegocio: "Cómo va el negocio",
  // La parte Negocio del menú, como la v2 (decisión 148): Resumen · Usuarios · Quién hizo qué.
  negocio: "Negocio",
  resumen: "Resumen",
  rolesYPermisos: "Roles y permisos",
  usuarios: "Usuarios",
  quienHizoQue: "Quién hizo qué",
  actividad: "Actividad",
  anomalias: "Anomalías",
  mejorasYErrores: "Mejoras y errores",
  roles: "Roles",
  usuariosAutorizados: "Usuarios autorizados",
  sesionesAbiertas: "Sesiones abiertas",
  celularesConHuella: "Mis celulares con huella",
  gastosDeLaSemana: "Gastos de la semana",
  // Las secciones de «Cómo va el negocio» (decisión 95).
  ventas: "Ventas",
  compras: "Compras",
  inventario: "Inventario",
  ventasDeHoy: "Ventas de hoy",
  // Las pestañas de Anomalías (014).
  paraRevisar: "Para revisar",
  anotadas: "Anotadas",
};


// «1 producto», «1.250 productos»: igual en las dos interfaces.
export const cuantosProductos = (n: number) => `${n.toLocaleString("es-AR")} ${n === 1 ? "producto" : "productos"}`;

// Los botones del vínculo (decisiones 73 y 75): «Desconectar» para que cada uno trabaje por su lado
// un rato y «Reconectar» para volver a trabajar en espejo; «Desvincular», el corte definitivo.
export const TEXTOS_DEL_VINCULO = { separar: "Desconectar", juntar: "Reconectar", vincular: "Vincular", desvincular: "Desvincular" };

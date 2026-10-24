// Qué puede hacer quien está usando la aplicación (RF-72, ADR-017). Los permisos son los del
// servidor, que es quien decide de verdad: acá sirven para mostrar solo lo que se puede usar.
// Es el mismo criterio en el celular y en la computadora (decisión 47).
export const PERMISOS = {
  "ventas.registrar": "Vender",
  "ventas.ver": "Ver las ventas del día",
  "ventas.anular": "Anular ventas del día",
  "ventas.anular_cualquiera": "Anular ventas de cualquier día",
  "catalogo.costos": "Ver costos",
  "catalogo.margenes": "Fijar márgenes",
  "catalogo.listas": "Cargar listas de precios",
  "catalogo.duplicados": "Unir duplicados",
  "deposito.pedidos": "Encargar compras",
  "deposito.ingresos": "Registrar ingresos",
  "deposito.compras": "Ver las compras",
  "deposito.stock": "Contar y corregir stock",
  "negocio.ventas": "Ver las ventas del negocio",
  "negocio.gastos": "Ver los gastos",
  "negocio.invertido": "Ver el dinero invertido",
  "negocio.anomalias": "Ver las anomalías",
  "negocio.actividad": "Ver quién hizo qué",
  "procesos.ver": "Ver procesos",
  "procesos.dibujar": "Dibujar procesos",
  "admin.usuarios": "Administrar usuarios",
  "admin.roles": "Administrar roles",
  "admin.sistema": "Administrar el sistema",
} as const;
export type Permiso = keyof typeof PERMISOS;

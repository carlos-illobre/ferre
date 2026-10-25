// La venta en curso, su búsqueda y lo que comparten el celular y la computadora al vender.
export * from "./venta";
export { ventaActual, useVentaEnCurso, type Item } from "./venta-en-curso";
export * from "./llegados-del-celular";
export * from "./busqueda-de-venta";
export * from "./celular-que-escanea";
export * from "./deshacer";
export * from "./cantidad";
export * from "./lista-del-dia";
export * from "./corrigiendo";
export { buscarVentas, confirmadas, fueSinConexion, hoyLocal, MOTIVOS_DE_ANULACION, plano, SIN_MOTIVO, useVentasDelDia, ventasCambiaron, type VentaDelDia } from "./ventas-del-dia";
export { diaAnterior, nombreDelDia, resumenDelDia, useResumenDelDia, type Comparacion, type ResumenDelDia } from "./resumen-del-dia";
export { aEntrada, conCantidad, conPrecio, empezarCorreccion, subtotalCorregido, useCorregirVenta, type Correccion, type RenglonCorregido } from "./correccion";
export { aEntradaDeCambio, diferenciaDelCambio, paraVolver, paraVolverDeLaBusqueda, resolucionDelCambio, sePuedeCambiar, useRegistrarCambio, useVentasParaCambio, valorQueVuelve, type ParaVolver, type SeLleva, type VentaParaCambio, type Vuelve } from "./cambio";

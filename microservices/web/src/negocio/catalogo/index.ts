export type { Producto } from "../../datos/almacenamiento";
export * from "./catalogo";
export * from "./unidades";
export { descargar, subirFoto, urlDeFoto } from "../../datos/conexion";
export * from "./precio";
export * from "./ficha";
export * from "./stock-y-filtros";
export * from "./resumen";
export * from "./carga-de-lista";
export {
  buscarProveedores, descuentosDe, fraccionAplicada, pendientes, retomar, situacionDelProveedor, ultimaAplicada, useFilasDeLista, useLectores, useListas, variacion,
  type Avance, type Cargada, type Fila, type ListaFila, type Proveedor,
} from "./listas";
export {
  buscarDuplicados, buscarUniones, resolverSugerencia, separar as separarProductos, unir as unirProductos, useDuplicados,
  type Lado, type Resumen, type Sugerencia, type Union,
} from "./duplicados";
export * from "./cola-de-duplicados";

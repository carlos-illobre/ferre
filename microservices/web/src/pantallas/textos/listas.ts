import { igual, type Texto } from "./base";

// Listas de precios como la v2 (decisión 148).
export const listas = {
  cargarUnaLista: igual("Cargar una lista"),
  soltaElExcel: { largo: "Soltá el Excel acá, o", corto: "Excel del proveedor" },
  subirLista: igual("Subir lista"),
  agregarProveedor: igual("Agregar proveedor"),
  paraRevisar: igual("Para revisar"),
  ultimasCargas: igual("Últimas cargas"),
  proveedores: igual("Proveedores"),
  buscar: igual("Buscar"),
  buscarProveedor: igual("Buscar proveedor"),
  revisarYAplicar: igual("Revisar y aplicar"),
  nadaCambiaHastaAplicar: igual("Nada cambia hasta aplicar"),
  descartar: igual("Descartar"),
  sinListasParaRevisar: igual("No hay listas para revisar"),
  queHacer: { largo: "Cargá la planilla de un proveedor: antes de guardar vas a ver qué cambia, fila por fila, con de dónde sale cada costo.", corto: "Cargá la planilla de un proveedor para ver qué cambia." },
  precioEnEstanteria: igual("Precio en estantería"),
} satisfies Record<string, Texto>;

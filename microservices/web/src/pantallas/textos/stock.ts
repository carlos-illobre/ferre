import { igual, type Texto } from "./base";

// Depósito → Stock como la v2 (decisión 148).
export const stock = {
  buscar: { largo: "Buscá por nombre, código o estantería", corto: "Producto, código o estante" },
  conStock: igual("Con stock"),
  bajoElMinimo: { largo: "Bajo el mínimo", corto: "Bajo" },
  sinStock: igual("Sin stock"),
  negativo: { largo: "Stock negativo", corto: "Negativo" },
  dineroInvertido: { largo: "Dinero invertido · costo sin IVA", corto: "Dinero invertido" },
  todos: igual("Todos"),
  paraRevisar: igual("Para revisar"),
  sinCodigo: igual("Sin código"),
  revisar: igual("Revisar"),
  conElCelular: igual("Con el celular"),
  exportar: igual("Exportar a Excel"),
  etiquetas: igual("Etiquetas"),
  etiqueta: igual("Etiqueta"),
  corregir: igual("Corregir"),
  quePedir: igual("Qué pedir"),
  paraPedir: igual("para pedir"),
  aProveedores: igual("a — proveedores"),
  todaviaNo: { largo: "Todavía no está: se agrega cuando se programe.", corto: "Todavía no está." },
} satisfies Record<string, Texto>;

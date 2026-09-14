// Librería compartida entre la API y los clientes (ADR-001, ADR-010): cálculo de precios
// con su explicación (issue #13, #47) y búsqueda sobre el catálogo (issue #14).
export const VERSION_CALCULO_DE_PRECIOS = "0.3.0";
export * from "./precio.js";
export * from "./busqueda.js";

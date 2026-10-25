import type { Producto } from "../../../negocio/catalogo";

// Debajo del nombre: la marca y el proveedor.
export const detalleDe = (p: Producto) => [p.marca, p.proveedor].filter(Boolean).join(" · ");

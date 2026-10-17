// Lo que el servidor responde sobre los duplicados (el mismo artículo en varias listas). Solo
// tipos: el cliente web los toma al compilar (ADR-018), así que acá no va código ni nombres de
// tablas. Lo que manda el front sale de la validación del servidor (decisión 89).
import type { z } from "zod";
import type { resolverSugerencia, separar, unirAMano } from "../duplicados/esquemas.js";

// Un producto de una sugerencia, con su último costo.
export type ProductoAUnir = { id: string; descripcion: string; marca: string | null; codigo_barras: string | null; proveedor: string | null; costo_neto: string | null; fecha_lista: string | null };

// GET /equivalencias: las sugerencias pendientes, de la más nueva a la más vieja.
export type Sugerencia = { id: string; motivo: string; creado_en: string; a: ProductoAUnir; b: ProductoAUnir };

// POST /equivalencias/buscar
export type BusquedaDeDuplicados = { nuevas: number };

// POST /equivalencias/:id/unir y /:id/rechazar: qué producto se conserva.
export type ResolverSugerencia = z.input<typeof resolverSugerencia>;
// POST /equivalencias/unir: unir dos productos a mano.
export type UnirAMano = z.input<typeof unirAMano>;

// GET /equivalencias/unidos: lo ya unido, que se puede separar.
// La marca y la foto son las del producto conservado.
export type Union = { absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; marca: string | null; foto_url: string | null; unido_en: string; proveedores: string | null };
// POST /equivalencias/separar
export type Separar = z.input<typeof separar>;

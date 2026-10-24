// Lo que el servidor responde sobre los productos. Solo tipos: el cliente web los toma al
// compilar (ADR-018), así que acá no va código ni nombres de tablas.
import type { z } from "zod";
import type { cambiosDeProducto } from "../productos/esquemas.js";

// Cada proveedor que tiene el producto, con su último costo.
export type CostoDeProveedor = { proveedor_id: string; proveedor: string; costo_neto: string; fecha_lista: string; codigo_proveedor: string };

// GET /productos: cada producto activo con el costo de su proveedor preferido (o el último) y el
// precio ya calculado en el servidor: el del margen elegido, con su explicación y el margen para
// el que se calculó, y el de cada uno de los cinco márgenes. Los importes que salen de la base
// llegan como texto, con sus decimales.
export type ProductoDelCatalogo = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  // Cuándo se cargó o se cambió el código (specs/016); null si se cargó antes de guardarlo. Puede
  // faltar en un catálogo guardado en el dispositivo antes de que existiera.
  codigo_leido_en?: string | null;
  margen_elegido: number | null;
  sector_id: string | null; foto_url: string | null; modificado_en: string;
  proveedor_id: string | null; proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id: string | null; explicacion_costo: string[];
  proveedores: CostoDeProveedor[];
  precio: number | null; explicacion_precio: string[]; margen_del_precio: number | null; precios: Record<string, number> | null;
};

// GET /productos/pagina?buscar=&codigo=&ids=&marca=&disponibilidad=&primero=&desde=&limite= (specs/018): solo
// los productos de esa consulta, de a 50, con el stock de cada uno (los que nunca tuvieron
// movimientos no vienen), si hay más y cuántos son en total.
export type PaginaDeProductos = { productos: ProductoDelCatalogo[]; stock: Record<string, string>; hay_mas: boolean; total: number };

// GET /productos/descarga?marca=&desde=&limite= (specs/018, historia 5): lo que se baja a mano para
// trabajar sin conexión, de a 500. Sin marca, todo; con la marca de la descarga anterior, lo que
// cambió desde entonces y los que hay que borrar. `siguiente` va como `desde` de la próxima página;
// `marca` se guarda para la próxima descarga: es «<base>.<transacción>», y la de otra base no vale
// (022-E23).
// Cada producto lleva todos sus códigos de proveedor (para escanear sin conexión) y la respuesta, la
// versión del cálculo del precio: si cambió desde la descarga anterior, se vuelve a bajar todo.
export type DescargaDeProductos = { productos: (ProductoDelCatalogo & { codigos: string[] })[]; quitados: string[]; hay_mas: boolean; siguiente: string | null; marca: string; calculo: string };

// GET /productos/resumen: cuántos productos hay y cuántos tienen costo pero no margen elegido.
export type ResumenDelCatalogo = { productos: number; sin_margen: number };

// GET /productos/marcas?buscar=: las marcas del catálogo (o de lo encontrado), sin repetir y en orden alfabético.
export type MarcasDelCatalogo = string[];

// PATCH /productos/:id: lo único que se cambia de un producto desde la aplicación. La forma
// sale de la validación del servidor (decisión 89).
export type CambiosDeProducto = z.input<typeof cambiosDeProducto>;

// POST /productos/:id/foto
export type FotoSubida = { foto_url: string };

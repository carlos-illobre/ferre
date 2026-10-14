import { z } from "zod";

// Lo que llega sobre los productos (decisión 89). Solo Zod: el contrato toma de acá la forma de
// lo que manda el front, así que este archivo no importa nada del servidor.

const MARGEN = "El margen es un porcentaje entero mayor que cero (por ejemplo 20) o ninguno";
const UNIDAD = "La unidad es unidad, kg, m o l";
const CODIGO = "El código de barras tiene que tener entre 4 y 32 letras o números";
const FOTO = "La foto tiene que ser una dirección https o una foto subida";

// Un texto que también puede llegar como número (un código de barras tipeado), sin espacios.
const texto = (mensaje: string) => z.union([z.string(), z.number()], mensaje).transform((v) => String(v).trim());

// PATCH /productos/:id: lo único que se cambia de un producto desde la aplicación. Margen: uno
// de los botones (300/200/100/50/25), cualquier porcentaje entero tipeado a mano, o ninguno.
export const cambiosDeProducto = z.object({
  margen_elegido: z.number(MARGEN).int(MARGEN).positive(MARGEN).max(10000, MARGEN).nullable().optional(),
  unidad: z.enum(["unidad", "kg", "m", "l"], UNIDAD).optional(),
  codigo_barras: texto(CODIGO).pipe(z.string().regex(/^[0-9A-Za-z-]{4,32}$/, CODIGO)).nullable().optional(),
  proveedor_preferido_id: z.string("El proveedor preferido es un id o ninguno").nullable().optional(),
  foto_url: texto(FOTO).pipe(z.string().regex(/^(https?:\/\/|\/fotos\/).{4,500}$/, FOTO)).nullable().optional(),
}, "Nada que cambiar: mandá margen_elegido, unidad, codigo_barras, proveedor_preferido_id o foto_url")
  .refine((c) => Object.keys(c).length > 0, "Nada que cambiar: mandá margen_elegido, unidad, codigo_barras, proveedor_preferido_id o foto_url");

import type { Producto } from "../catalogo";
import type { TipoDeComprobante } from "@servidor/compras";

export type Comprobante = TipoDeComprobante;
export type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };

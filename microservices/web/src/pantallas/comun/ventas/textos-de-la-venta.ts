import type { MotivoDeNoCobrar } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";

// Por qué no se pudo cobrar, con el largo de cada interfaz (decisión 47).
const CLAVE = { "sin-precio": "sinPrecio", "sin-medio": "elegiComoPaga", "sin-cliente": "faltaElCliente" } as const;
export const textoDeNoCobrar = (motivo: MotivoDeNoCobrar, largo: "largo" | "corto"): string => TEXTOS.vender[CLAVE[motivo]][largo];

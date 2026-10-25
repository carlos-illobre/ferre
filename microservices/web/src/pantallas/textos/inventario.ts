import type { Texto } from "./base";

export const inventario = {
  faltaCuantasHay: { largo: "Escribí cuántas hay: un número, cero o más.", corto: "Escribí cuántas hay." },
  faltaElMotivo: { largo: "Elegí un motivo o escribilo: sin motivo no se guarda.", corto: "Falta el motivo: sin motivo no se guarda." },
} satisfies Record<string, Texto>;

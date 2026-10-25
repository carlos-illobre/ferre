import { useState } from "react";
import { useCatalogo } from "../catalogo";
import { diferenciaDe, porQueNoSeGuarda, quitar, resolucionDe, totalCorregido, type Correccion, type RenglonCorregido } from "./correccion";
import type { VentaDelDia } from "./ventas-del-dia";

// Una venta que se está corrigiendo, igual en el celular y en la computadora: el total nuevo, la
// diferencia, cómo se resuelve, si se puede guardar, el cliente y los cambios de cada renglón.
export type CobroDeDiferencia = "efectivo" | "mercado_pago" | "tarjeta";
export const COBROS_DE_DIFERENCIA = ["efectivo", "mercado_pago", "tarjeta"] as const;

export function useCorrigiendo(v: VentaDelDia, c: Correccion, alCambiar: (c: Correccion) => void) {
  const { clientes } = useCatalogo();
  const [medioDif, setMedioDif] = useState<CobroDeDiferencia>("efectivo");
  const diferencia = diferenciaDe(v, c);
  return {
    total: totalCorregido(c), diferencia, resuelta: resolucionDe(c.medio, diferencia), falta: porQueNoSeGuarda(v, c),
    cliente: clientes.find((x) => x.id === c.clienteId), clientes, medioDif, setMedioDif,
    cambiarRenglon: (i: number, r: RenglonCorregido) => alCambiar({ ...c, renglones: c.renglones.map((x, j) => (j === i ? r : x)) }),
    quitarRenglon: (i: number) => alCambiar(quitar(c, i)),
    volverAPoner: (r: RenglonCorregido) => alCambiar({ ...c, quitados: c.quitados.filter((x) => x !== r), renglones: [...c.renglones, r] }),
    agregar: (r: RenglonCorregido) => alCambiar({ ...c, renglones: [...c.renglones, r] }),
    elegirCliente: (id: string) => alCambiar({ ...c, clienteId: id || null }),
  };
}
export type Corrigiendo = ReturnType<typeof useCorrigiendo>;

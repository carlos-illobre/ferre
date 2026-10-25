import { useState } from "react";
import { useSeVaSolo } from "../../plataforma/tiempo";
import { nombreDeProducto } from "../formato";
import type { Item } from "./venta-en-curso";

// Quitar un renglón o vaciar la venta no pregunta: avisa y deja deshacer (003, historia 1,
// escenario 20). El aviso se va solo.
export type AvisoDeVenta = { texto: string; deshacer?: () => void };
type LaVenta = { items: Item[]; vaciar: () => void; quitar: (clave: string) => void; devolver: (items: Item[]) => void };
type Textos = { vaciaste: string; quitaste: string };

export function useQuitarConDeshacer(venta: LaVenta, textos: Textos, ms: number) {
  const [aviso, setAviso] = useState<AvisoDeVenta | null>(null);
  useSeVaSolo(aviso, () => setAviso(null), ms);
  const conDeshacer = (texto: string, hacer: () => void) => {
    const copia = venta.items;
    hacer();
    setAviso({ texto, deshacer: () => venta.devolver(copia) });
  };
  return {
    aviso, setAviso,
    vaciar: () => { if (venta.items.length) conDeshacer(textos.vaciaste, venta.vaciar); },
    quitar: (it: Item) => conDeshacer(`${textos.quitaste} ${nombreDeProducto(it.descripcion)}`, () => venta.quitar(it.clave)),
    deshacer: () => { aviso?.deshacer?.(); setAviso(null); },
  };
}

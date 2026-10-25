import type { RefObject } from "react";
import { useQuitarConDeshacer, type Item } from "../../../negocio/ventas";
import { sale } from "../../../plataforma/animacion";
import { TEXTOS } from "../../textos";

type LaVenta = Parameters<typeof useQuitarConDeshacer>[0];

// Quitar y vaciar con «Deshacer»; en la computadora, lo que se va sube y se desvanece antes de
// irse, como la maqueta (decisión 134).
export function useQuitarConAnimacion(venta: LaVenta, lista: RefObject<HTMLUListElement>) {
  const deshacer = useQuitarConDeshacer(venta, { vaciaste: TEXTOS.vender.vaciaste.largo, quitaste: TEXTOS.vender.quitaste.largo }, 6000);
  const renglones = () => [...(lista.current?.querySelectorAll<HTMLElement>(":scope > [data-clave]") ?? [])];
  return {
    ...deshacer,
    vaciar: () => { if (venta.items.length) sale(renglones(), deshacer.vaciar); },
    quitar: (it: Item) => sale(renglones().filter((r) => r.dataset.clave === it.clave), () => deshacer.quitar(it)),
  };
}

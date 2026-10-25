import { useState } from "react";
import { pesosCortos } from "../../../negocio/formato";
import { precioDe, type Item } from "../../../negocio/ventas";
import { Icono } from "../base/ui";
import { HojaPrecioAMano } from "./HojaPrecioAMano";
import { PrecioAMano } from "./PrecioAMano";
import css from "./PrecioDelRenglon.module.css";

// El precio por unidad, una sola vez (decisión 127). Con un precio a mano, el botón «A mano $X»
// (como la maqueta), que vuelve a abrir la caja; elegir un margen vuelve al precio del margen. Un
// ítem libre tiene la caja a la vista.
type Props = { item: Item; alCambiar: (c: Partial<Item>) => void; claseDelValor?: string };

export function PrecioDelRenglon({ item: it, alCambiar, claseDelValor }: Props) {
  const [aMano, setAMano] = useState(false);
  const unitario = precioDe(it).unitario;
  const abrir = (texto: string, clase: string | undefined, titulo = "Un precio distinto solo para esta venta") => (
    <button type="button" className={`${css.aMano} ${clase ?? ""}`} onClick={() => setAMano(true)} title={titulo} data-testid="habilitar-precio-manual"><Icono nombre="editar" tam={16} />{texto}</button>
  );
  return (
    <span className={css.precio}>
      {!it.producto ? <>Precio <PrecioAMano item={it} alCambiar={alCambiar} falta={unitario === null} /></>
        : it.precioManual !== null ? abrir(`A mano ${pesosCortos(it.precioManual)}`, css.grande, "Precio a mano, solo para esta venta: tocá para cambiarlo")
          : unitario === null ? abrir("Precio a mano", css.grande)
            : <>Precio <b className={claseDelValor}>{pesosCortos(unitario)}</b>{abrir("Precio a mano", css.fantasma)}</>}
      {aMano && <HojaPrecioAMano item={it} alPoner={(v) => { alCambiar({ precioManual: v }); setAMano(false); }} alCerrar={() => setAMano(false)} />}
    </span>
  );
}

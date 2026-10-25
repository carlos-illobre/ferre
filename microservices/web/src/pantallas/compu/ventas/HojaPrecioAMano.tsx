import { useEffect, useRef, useState } from "react";
import type { Item } from "../../../negocio/ventas";
import { nombreDeProducto, numero } from "../../../negocio/formato";
import { Boton, Hoja } from "../base/ui";
import { soloDigitos } from "./soloDigitos";
import css from "./HojaPrecioAMano.module.css";

// «Precio a mano», como la maqueta (decisión 127): una ventana con el producto, la caja con el
// «$» y «Poner el precio» (Enter). Vale solo para esta venta.
export function HojaPrecioAMano({ item, alPoner, alCerrar }: { item: Item; alPoner: (v: number | null) => void; alCerrar: () => void }) {
  const [valor, setValor] = useState<number | null>(item.precioManual);
  const poner = () => { if (valor !== null) alPoner(valor); };
  // El diálogo pone el foco en su primer botón (la ×): la caja lo toma apenas se abre.
  const caja = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => { caja.current?.focus(); caja.current?.select(); }, 0); return () => clearTimeout(t); }, []);
  return (
    <Hoja titulo="Precio a mano" alCerrar={alCerrar} testId="hoja-precio-manual" bajoTitulo={<span className="detalle">{nombreDeProducto(item.descripcion)}</span>}
      pie={<><Boton onClick={alCerrar}>Cancelar</Boton><Boton variante="principal" disabled={valor === null} onClick={poner} data-testid="poner-precio">Poner el precio <kbd className="tecla">Enter</kbd></Boton></>}>
      <form onSubmit={(e) => { e.preventDefault(); poner(); }}>
        <label className={`con-prefijo ${css.grande}`}>
          <span aria-hidden="true">$</span>
          <input ref={caja} inputMode="numeric" aria-label={`Precio a mano de ${item.descripcion}, solo para esta venta`} value={valor === null ? "" : numero(valor)}
            onChange={(e) => setValor(soloDigitos(e.target.value))} data-testid="precio-manual" />
        </label>
      </form>
      <p className="detalle">Vale solo para esta venta: no cambia el margen guardado. Se cobra tal cual, sin redondear.</p>
    </Hoja>
  );
}

import { useId, type RefObject } from "react";
import { useCatalogo } from "../../../negocio/catalogo";
import { conSaldo as saldoDe, useMovimientos, type StockFila } from "../../../negocio/deposito";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { CorregirStock } from "./CorregirStock";
import { FotoDeProducto } from "./FotoDeProducto";
import { MovimientosDelProducto } from "./MovimientosDelProducto";
import { SaldoDelProducto } from "./SaldoDelProducto";
import { mensajeDe, type Producto } from "./deposito-comun";
import css from "./Inventario.module.css";

// La cuenta de un producto, fija a la derecha de la lista: su stock grande, los movimientos que lo
// explican con lo que queda después de cada uno, y la corrección a mano.
type Props = {
  producto: Producto; fila: StockFila | null; cantidad: number; porEnviar: boolean; panelRef?: RefObject<HTMLElement>;
  alCorregir: (habia: number, hay: number, encolado: boolean) => void; alTerminar: () => void;
};
const SIN_MOVIMIENTOS = "Sin conexión: los movimientos se ven cuando vuelve internet. Corregir el stock se puede igual.";

export function CuentaDelProducto({ producto: p, fila, cantidad, porEnviar, panelRef, alCorregir, alTerminar }: Props) {
  const corrige = usePuede()("deposito.stock");
  const { actualizarProducto } = useCatalogo();
  const { movimientos, error: fallo } = useMovimientos(p.id);
  const id = useId();
  return (
    <aside ref={panelRef} className={css.panel} data-testid="detalle-stock" aria-label={`Stock de ${p.descripcion}`}>
      <div className={css.pCab}>
        <FotoDeProducto producto={p} alCambiar={(f) => { actualizarProducto(p.id, { foto_url: f }).catch(() => undefined); }} />
        <div className={css.pTitulo}><h2>{p.descripcion}</h2><span className="detalle">{[p.marca, fila?.proveedor ?? p.proveedor].filter(Boolean).join(" · ") || "Sin marca ni proveedor"}</span></div>
        <Boton tam="chico" className={css.icono} disabled title={TEXTOS.stock.todaviaNo.largo} aria-label="Imprimir su etiqueta"><Icono nombre="printer" tam={16} /></Boton>
      </div>
      <SaldoDelProducto producto={p} fila={fila} cantidad={cantidad} movimientos={movimientos} porEnviar={porEnviar} />
      <MovimientosDelProducto id={id} movimientos={movimientos} conSaldo={saldoDe(movimientos, Number(fila?.stock ?? cantidad))} error={fallo ? mensajeDe(fallo, SIN_MOVIMIENTOS) : null} />
      {corrige && <CorregirStock producto={p} cantidad={cantidad} alCorregir={alCorregir} alTerminar={alTerminar} />}
    </aside>
  );
}

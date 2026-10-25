import { AvisosDeLaBusqueda } from "./AvisosDeLaBusqueda";
import { BusquedaDeLaVenta } from "./BusquedaDeLaVenta";
import { CabezaDeLaVenta } from "./CabezaDeLaVenta";
import { ListaDeLaVenta } from "./ListaDeLaVenta";
import { TeclasDeVender } from "./TeclasDeVender";
import { VentaVacia } from "./VentaVacia";
import type { EstadoDeVender } from "./useVender";
import css from "./Vender.module.css";

// La columna de la venta: la búsqueda, sus avisos y los renglones (o la venta vacía).
export function ColumnaDeLaVenta({ v }: { v: EstadoDeVender }) {
  const { venta } = v;
  return (
    <div className={css.izq}>
      <BusquedaDeLaVenta v={v} />
      <TeclasDeVender />
      <AvisosDeLaBusqueda v={v} />
      <CabezaDeLaVenta items={venta.items} alNoLlevo={venta.noLlevo} alVaciar={v.quitar.vaciar} />
      {venta.items.length === 0
        ? <VentaVacia catalogo={v.catalogo.catalogo} cobro={venta.cobro} alAgregar={(p) => v.conEntrada(() => venta.agregar(p))} />
        : <ListaDeLaVenta v={v} />}
    </div>
  );
}

import type { Item } from "../../../negocio/ventas";
import { useDeslizar } from "../../../plataforma/animacion";
import { RenglonDeVenta } from "./RenglonDeVenta";
import type { EstadoDeVender } from "./useVender";
import css from "./RenglonDeVenta.module.css";
import { useLlegadosDelCelular } from "../../../negocio/ventas";

// Los renglones de la venta, uno debajo del otro. Elegir uno lo muestra en «De dónde sale».
export function ListaDeLaVenta({ v }: { v: EstadoDeVender }) {
  const { venta, elegido, entrada } = v;
  const llegados = useLlegadosDelCelular();
  useDeslizar(v.lista, venta.items);
  const deRenglon = (it: Item) => ({
    stock: it.producto ? v.catalogo.stock.get(it.producto.id) : undefined, marcar: Boolean(venta.error) && venta.sinPrecio,
    alCambiar: (c: Partial<Item>) => venta.cambiarItem(it.clave, c), alQuitar: () => v.quitar.quitar(it), alElegirMargen: (m: number) => venta.elegirMargen(it, m),
    alCambiarUnidad: (u: Item["unidad"]) => venta.cambiarUnidad(it, u), alSubirFoto: it.producto ? (a: File) => venta.subirFotoDe(it, a) : undefined,
    elegido: it.clave === elegido.elegida, alElegir: () => elegido.setElegida(it.clave), llegado: llegados.has(it.clave), entrada: entrada.clave === it.clave ? entrada.n : 0,
  });
  return (
    <ul className={`lista ${css.items}`} ref={v.lista} data-testid="venta">
      {venta.items.map((it) => <RenglonDeVenta key={it.clave} item={it} {...deRenglon(it)} />)}
    </ul>
  );
}

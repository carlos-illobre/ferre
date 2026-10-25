import { irA } from "../base/rutas";
import { Pagina } from "../base/ui";
import { BarraDeCobro } from "./BarraDeCobro";
import { ColumnaDeLaVenta } from "./ColumnaDeLaVenta";
import { ElegirCliente } from "./ElegirCliente";
import { PanelDeLaVenta } from "./PanelDeLaVenta";
import { VentaRegistrada } from "./VentaRegistrada";
import { useVender } from "./useVender";
import css from "./Vender.module.css";

// La venta, en el orden del mostrador: buscar → costo, margen y precio → cantidad → cobro. Nada
// obligatorio que el cuaderno no tenga. En la computadora todo sale con el teclado: Enter agrega,
// F5 a F8 eligen cómo paga, F2 (o Enter con la búsqueda vacía) cobra.
export function Vender() {
  const v = useVender();
  const { venta, panel } = v;
  return (
    <Pagina titulo="Vender" testId="vender" className={`vender ${css.pagina}`}>
      <div className={`${css.grid} ${panel.visible ? "" : css.sinPanel}`}>
        <ColumnaDeLaVenta v={v} />
        <PanelDeLaVenta panel={panel} renglon={v.elegido.renglon} items={venta.items} total={venta.total} />
      </div>
      <BarraDeCobro aviso={v.quitar.aviso} mensaje={venta.mensaje} alDeshacer={v.quitar.deshacer} error={venta.error}
        medio={venta.medio} alElegirMedio={venta.elegirMedio} cliente={venta.cliente} alElegirCliente={() => v.setEligiendoCliente(true)}
        total={venta.total} hayItems={venta.items.length > 0} ocupado={venta.ocupado} alCobrar={() => void venta.cobrar()} />
      {v.eligiendoCliente && <ElegirCliente clientes={v.catalogo.clientes} elegido={venta.clienteId} soloCuentaCorriente={venta.medio === "cuenta_corriente"}
        alCerrar={() => v.setEligiendoCliente(false)} alElegir={(id) => { venta.setClienteId(id); v.setEligiendoCliente(false); }} />}
      {venta.cobro && <VentaRegistrada cobro={venta.cobro} alVerHoy={() => { venta.cerrarCobro(); irA("hoy"); }}
        alCerrar={() => { venta.cerrarCobro(); setTimeout(() => v.caja.current?.focus(), 0); }} />}
    </Pagina>
  );
}

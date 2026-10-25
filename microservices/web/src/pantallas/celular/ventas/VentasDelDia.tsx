import { hoyLocal } from "../../../negocio/ventas";
import { Icono } from "../componentes/base";
import { BuscarVenta } from "./BuscarVenta";
import { HojaDeCambio } from "./HojaDeCambio";
import { HojaDeLaVenta } from "./HojaDeLaVenta";
import { OtroDia } from "./OtroDia";
import { ElDia } from "./ElDia";
import { useVentasDelDia } from "./useVentasDelDia";
import css from "./VentasDelDia.module.css";

// «Ventas de hoy» en el celular (specs/017; decisión 120, maqueta
// specs/003-ventas/maquetas/celular-ventas-de-hoy-v2.png): el día y «Cambiar fecha»; el resumen en
// una tarjeta clara con el total, la comparación, lo vendido por hora y los cuatro medios; los
// tres números; y cada venta en un renglón corto que abre su hoja, desde donde se anula. El
// buscador encuentra una venta por un producto, el importe o el cliente.
export function VentasDelDia({ anulaHoy = false, anulaCualquierDia = false }: { anulaHoy?: boolean; anulaCualquierDia?: boolean }) {
  const d = useVentasDelDia(anulaHoy, anulaCualquierDia);
  return (
    <div className="hoy" data-testid="hoy">
      <ElDia d={d} />
      {d.panel === "otro-dia" && <OtroDia dia={d.r.dia} alElegir={(x) => { d.setDia(x === hoyLocal() ? null : x); d.setPanel(null); }} alCerrar={() => d.setPanel(null)} />}
      {d.panel === "buscar" && <BuscarVenta d={d} />}
      {d.venta && <HojaDeLaVenta venta={d.venta} anula={d.anula} cambia={d.cambia} esHoy={d.r.esHoy} alCerrar={() => d.setAbierta(null)} alAviso={d.setAviso}
        alCambio={() => { d.setCambio({ venta: d.venta }); d.setAbierta(null); }} />}
      {d.cambio && <HojaDeCambio venta={d.cambio.venta} alCerrar={() => d.setCambio(null)} alListo={(m) => { d.setCambio(null); d.setAviso(m); }} />}
      {d.aviso && <div className={`toast ${css.aviso}`} role="status" data-testid="mensaje"><Icono nombre="tilde" tam={20} /><span>{d.aviso}</span></div>}
    </div>
  );
}

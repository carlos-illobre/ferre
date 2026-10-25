import type { ReactNode } from "react";
import { irA } from "../../../rutas";
import { usePuede } from "../../permisos";
import { BarraDeCobro } from "./BarraDeCobro";
import { CabezaDeVender } from "./CabezaDeVender";
import { HojasDeVender } from "./HojasDeVender";
import { ListaDeLaVenta } from "./ListaDeLaVenta";
import { PIDE } from "./permisos-de-vender";
import { VentaRegistrada } from "./VentaRegistrada";
import { useVender } from "./useVender";
import css from "./Vender.module.css";

// La venta en el celular (decisión 119, maqueta specs/003-ventas/maquetas/celular-vender-v2-con-v3.png):
// la v2 del director de arte («Mostrador») con, de la v3, cobrar deslizando y la cámara arriba, que
// empuja la venta hacia abajo. El orden es el del mostrador (specs/003-ventas/research.md): buscar →
// precio → cantidad → cobro.
export function Vender({ pestanas = null }: { pestanas?: ReactNode }) {
  const v = useVender();
  const puede = usePuede();
  const { venta } = v;
  const cerrarCobro = (despues?: () => void) => { venta.cerrarCobro(); venta.setMensaje(null); despues?.(); };
  return (
    <main className={`contenido vender-ancho ${css.pantalla} ${css.vender}`}>
      <CabezaDeVender v={v} pestanas={pestanas} />
      <ListaDeLaVenta v={v} />
      <BarraDeCobro v={v} />
      <HojasDeVender v={v} />
      {venta.cobro && <VentaRegistrada cobro={venta.cobro} veHoy={puede(...PIDE.hoy)} alCerrar={() => cerrarCobro()} alVerHoy={() => cerrarCobro(() => irA("vender/hoy"))} />}
    </main>
  );
}

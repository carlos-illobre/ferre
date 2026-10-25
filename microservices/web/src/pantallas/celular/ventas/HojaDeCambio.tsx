import type { VentaDelDia } from "../../../negocio/ventas";
import { pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { AvisoError, Hoja, Icono } from "../componentes/base";
import { BuscarVentaParaCambio } from "./BuscarVentaParaCambio";
import { DiferenciaDelCambio } from "./DiferenciaDelCambio";
import { LoQueSeLleva } from "./LoQueSeLleva";
import { LoQueVuelve } from "./LoQueVuelve";
import { textoDelBoton, useCambio, useRegistrarElCambio, valorDe, valorQueVuelveDe } from "./useCambio";
import css from "./VentasDelDia.module.css";

// El cambio (o la devolución), en su hoja. `venta`: la venta de la que vuelve (desde su hoja); sin
// venta, primero se busca por el producto (E11). Lo que vuelve se toma al precio que se pagó.
const t = TEXTOS.hoy;

export function HojaDeCambio({ venta, alCerrar, alListo }: { venta: VentaDelDia | null; alCerrar: () => void; alListo: (mensaje: string) => void }) {
  const k = useCambio(venta);
  const g = useRegistrarElCambio(k, alListo);
  return (
    <Hoja titulo={t.registrarCambio.largo} alCerrar={alCerrar} testId="hoja-cambio">
      <p className={css.hojaDetalle}>Lo que vuelve se toma al precio que se pagó.</p>
      {!k.original ? <BuscarVentaParaCambio alElegir={k.elegir} /> : <>
        <LoQueVuelve k={k} desdeLaVenta={Boolean(venta)} />
        <LoQueSeLleva k={k} />
        <DiferenciaDelCambio k={k} />
        <p className={`${css.hojaDetalle} ${css.valores}`}>Vuelve {pesosCortos(valorQueVuelveDe(k))}{k.lleva.length ? ` · se lleva ${pesosCortos(k.lleva.reduce((s, l) => s + valorDe(l), 0))}` : ""}</p>
        <AvisoError texto={g.error} />
        <button type="button" className={`boton ${css.principal}`} disabled={g.registrando || k.vuelve.length === 0} onClick={() => void g.confirmar()} data-testid="confirmar-cambio">
          <Icono nombre="tilde" tam={20} />{g.registrando ? "Registrando…" : textoDelBoton(k)}
        </button>
      </>}
    </Hoja>
  );
}

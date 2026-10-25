import type { Medio } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import type { Cliente } from "../../../negocio/catalogo";
import { useRueda } from "../../../plataforma/animacion";
import { Aviso, Boton } from "../base/ui";
import { AvisoDeLaVenta } from "./AvisoDeLaVenta";
import { BotonDeCliente } from "./BotonDeCliente";
import { MediosDePago } from "./MediosDePago";
import css from "./BarraDeCobro.module.css";

// La barra del cobro, abajo: el aviso de lo último que pasó, cómo paga (F5 a F8), el cliente (F9)
// y «Cobrar» con el total (F2).
type Props = {
  aviso: { texto: string; deshacer?: () => void } | null; mensaje: string | null; alDeshacer: () => void; error: string | null;
  medio: Medio | null; alElegirMedio: (m: Medio) => void; cliente: Cliente | undefined; alElegirCliente: () => void;
  total: number; hayItems: boolean; ocupado: boolean; alCobrar: () => void;
};

export function BarraDeCobro(b: Props) {
  const rueda = useRueda<HTMLSpanElement>(b.total);
  return (
    <section className={css.cobro} aria-label="Cobro" data-testid="cobro">
      <AvisoDeLaVenta aviso={b.aviso} mensaje={b.mensaje} alDeshacer={b.alDeshacer} />
      {b.error && <div className={css.fila}><Aviso tipo="error" testId="error-cobro">{b.error}</Aviso></div>}
      <div className={css.medios} role="radiogroup" aria-label="Cómo paga">
        <MediosDePago medio={b.medio} alElegir={b.alElegirMedio} />
        <BotonDeCliente cliente={b.cliente} falta={b.medio === "cuenta_corriente"} alElegir={b.alElegirCliente} />
      </div>
      <Boton variante="principal" tam="grande" disabled={b.ocupado || !b.hayItems} onClick={b.alCobrar} tecla="F2" data-testid="cobrar">
        {b.ocupado ? "Cobrando…" : <>Cobrar <span className={`importe anim-rueda-valor ${css.total}`} ref={rueda} data-testid="total">{pesosCortos(b.total)}</span></>}
      </Boton>
    </section>
  );
}

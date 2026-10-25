import { comoVieneElPedido, type Pedido } from "../../../negocio/compras";
import { fecha } from "../../../negocio/formato";
import { irA } from "../../../rutas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Compras.module.css";

// Los pedidos por llegar, cada uno con su «Llegó» (que abre el ingreso con lo que falta).
const t = TEXTOS.compras;
const cuantos = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function PorLlegar({ porLlegar, encarga, anula }: { porLlegar: Pedido[] | null; encarga: boolean; anula: boolean }) {
  return (
    <section className={css.seccion} data-testid="por-llegar">
      <h2 className={css.titulo}><span>{t.porLlegar.corto}</span>{encarga && <button type="button" className={css.enlace} onClick={() => irA("deposito/pedidos")}>{t.pedidos.corto} ({porLlegar ? porLlegar.length : "—"})</button>}</h2>
      {porLlegar?.length === 0 && <div className="aviso-suave">{t.nadaPorLlegar.corto}</div>}
      {porLlegar?.map((p) => {
        const como = comoVieneElPedido(p, cuantos, (iso) => fecha(iso).slice(0, 5));
        return (
          <div key={p.id} className={css.tarjeta}>
            <span className={css.ico}><Icono nombre="truck" /></span>
            <span className={css.texto}><b>{p.proveedor}</b><span className={como.aMedias ? css.aMedias : ""}>{como.texto}</span></span>
            {anula && <button type="button" className={css.llego} onClick={() => irA(`deposito/ingreso?pedido=${p.id}`)} data-testid="llego">{t.llego.corto}</button>}
          </div>
        );
      })}
    </section>
  );
}

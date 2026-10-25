import { comoVieneElPedido, type Pedido } from "../../../negocio/compras";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { irA } from "../base/rutas";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { plural } from "../deposito/deposito-comun";
import css from "./Compras.module.css";

// A la derecha: sacarle foto a la factura, lo que está por llegar (con «Llegó») y lo que vence primero.
const t = TEXTOS.compras;

export function CostadoDeCompras({ registra, porLlegar }: { registra: boolean; porLlegar: Pedido[] | null }) {
  return (
    <aside className={css.costado}>
      <section className={`${css.tarjeta} ${css.foto}`} aria-labelledby="cv-foto-titulo">
        <div className={css.fotoArriba}>
          <span className={css.qr} aria-hidden="true"><Icono nombre="qr-code" tam={40} grosor={1.5} /></span>
          <div><h2 id="cv-foto-titulo">{t.sacaleFoto.largo}</h2><p className="detalle">{t.sacaleFotoDetalle.largo}</p></div>
        </div>
        <div className={css.fotoBotones}>
          <Boton tam="chico" disabled={!registra} onClick={() => irA("ingreso")}><Icono nombre="image" tam={16} />{t.elegirArchivo.largo}</Boton>
          <Boton tam="chico" disabled={!registra} onClick={() => irA("ingreso")}><Icono nombre="keyboard" tam={16} />{t.cargarAMano.largo}</Boton>
        </div>
      </section>
      <section className={css.tarjeta} aria-labelledby="cv-llegar" data-testid="por-llegar">
        <h2 id="cv-llegar" className={css.tarjetaTitulo}><Icono nombre="truck" tam={18} />{t.porLlegar.largo}</h2>
        <PorLlegar registra={registra} porLlegar={porLlegar} />
      </section>
      <section className={css.tarjeta} aria-labelledby="cv-vence" data-testid="vence-primero">
        <h2 id="cv-vence" className={css.tarjetaTitulo}><Icono nombre="landmark" tam={18} />{t.vencePrimero.largo}</h2>
        <p className="detalle">— {t.todaviaNo.largo}</p>
      </section>
    </aside>
  );
}

function PorLlegar({ registra, porLlegar }: { registra: boolean; porLlegar: Pedido[] | null }) {
  if (porLlegar === null) return <p className="detalle">—</p>;
  if (porLlegar.length === 0) return <p className="detalle">{t.nadaPorLlegar.largo}</p>;
  return (
    <ul className={css.renglones}>
      {porLlegar.slice(0, 3).map((p) => {
        const como = comoVieneElPedido(p, plural, (iso) => fecha(iso).slice(0, 5));
        return (
          <li key={p.id}>
            <span className={css.icoChico}><Icono nombre="clipboard-list" tam={18} /></span>
            <span className={css.texto}><b>{p.proveedor}</b><span className={como.aMedias ? css.aMedias : ""}>{como.texto}</span></span>
            {registra && <Boton tam="chico" className={css.llego} onClick={() => irA(`ingreso?pedido=${p.id}`)} data-testid="llego">{t.llego.largo}</Boton>}
          </li>
        );
      })}
    </ul>
  );
}

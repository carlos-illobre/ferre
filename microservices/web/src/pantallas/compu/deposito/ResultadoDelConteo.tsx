import { abreviarUnidad, conUnidad } from "../../../negocio/catalogo";
import { claseDeDiferencia, diferenciaDe, type Cierre, type Contado } from "../../../negocio/deposito";
import { irA } from "../base/rutas";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { FotoChica } from "./FotoChica";
import { conSigno, plural } from "./deposito-comun";
import css from "./Contar.module.css";

// El sector cerrado: cuántos se contaron, ajustaron y pusieron en cero, y los ajustes que se aplicaron.
type Props = { sector: string; resultado: { cierre: Cierre; ajustes: Contado[] }; id: string; alOtro: () => void };

export function ResultadoDelConteo({ sector, resultado: { cierre, ajustes }, id, alOtro }: Props) {
  return (
    <div className={css.conteo}>
      <section className={css.resultado}>
        <div className={css.tilde}><Icono nombre="tilde" tam={34} grosor={3} /></div>
        <h2>{sector}: conteo cerrado</h2>
        <p role="status" data-testid="resultado-conteo">{plural(cierre.contados, "producto contado", "productos contados")}, {cierre.ajustados} con diferencia ajustada{cierre.puestos_en_cero ? `, ${plural(cierre.puestos_en_cero, "puesto", "puestos")} en cero` : ""}.</p>
        <div className={css.resultadoBotones}>
          <Boton variante="principal" tam="grande" autoFocus onClick={alOtro} data-testid="otro-sector">Contar otro sector</Boton>
          <Boton icono="stock" onClick={() => irA("stock")}>Ver el stock</Boton>
        </div>
      </section>
      {ajustes.length > 0 ? (
        <section className={css.ajustes} aria-labelledby={`${id}-ajustes`}>
          <h3 id={`${id}-ajustes`} className={css.colTitulo}>Ajustes que se aplicaron al stock</h3>
          <ul className={css.renglones} data-testid="ajustes">
            {ajustes.map((r) => {
              const dif = diferenciaDe(r);
              return (
                <li key={r.producto_id} className={css.renglon}>
                  <FotoChica id={r.producto_id} />
                  <span className={css.rTexto}><b>{r.descripcion}</b><span>Había {conUnidad(r.stock_teorico, r.unidad)}, hay {conUnidad(r.cantidad_contada, r.unidad)}</span></span>
                  <span className={`${css.dif} ${claseDeDiferencia(dif)}`}><b>{conSigno(dif)}</b><small>{abreviarUnidad(r.unidad || "unidad")}</small></span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : <p className="detalle">Todo lo contado coincidía con el sistema: no hizo falta ningún ajuste.</p>}
    </div>
  );
}

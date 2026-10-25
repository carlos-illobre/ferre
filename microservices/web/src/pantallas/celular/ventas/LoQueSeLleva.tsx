import { nombreDeProducto, pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import { FotoChica } from "./FotoChica";
import { MasMenos } from "./MasMenos";
import { SumarProducto } from "./SumarProducto";
import { valorDe, type Cambio } from "./useCambio";
import css from "./VentasDelDia.module.css";

// Lo que se lleva a cambio: cada producto con su cantidad y el tacho, y el buscador para sumar otro.
const t = TEXTOS.hoy;

export function LoQueSeLleva({ k }: { k: Cambio }) {
  const { lleva, setLleva } = k;
  return (
    <>
      <div className={css.ccTitulo}><Icono nombre="carrito" tam={18} />{t.seLleva.corto}</div>
      {lleva.map((l, i) => (
        <div key={i} className={css.renglon} data-testid="renglon-que-se-lleva">
          <FotoChica url={l.foto_url} />
          <span className={css.nom}><b>{nombreDeProducto(l.descripcion)}</b>
            <span className={css.ed}><MasMenos valor={l.cantidad} min={Number.isInteger(l.cantidad) ? 1 : 0.5} alCambiar={(n) => setLleva(lleva.map((x, j) => (j === i ? { ...x, cantidad: n } : x)))} unidad={l.unidad} etiqueta={l.descripcion} />
              <button type="button" className={css.tacho} aria-label={`Sacar ${l.descripcion}`} onClick={() => setLleva(lleva.filter((_, j) => j !== i))}><Icono nombre="basura" tam={18} /></button></span>
          </span>
          <strong className={`importe ${css.sub}`}>+{pesosCortos(valorDe(l))}</strong>
        </div>
      ))}
      <SumarProducto etiqueta={t.seLleva.corto} alSumar={(p) => setLleva([...lleva, p])} />
      {lleva.length === 0 && <p className={css.hojaDetalle}>{t.nadaQueSeLleva.corto}</p>}
    </>
  );
}

import { masBaratoDe, plano, type Resumen, type Sugerencia, type useColaDeDuplicados } from "../../../negocio/catalogo";
import { fecha, pesos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import css from "./Duplicados.module.css";

// «Por revisar»: cuántas hay, la siguiente y la sugerencia de a una, con sus dos lados.
type Props = { sugerencias: Sugerencia[]; cola: ReturnType<typeof useColaDeDuplicados> };
const t = TEXTOS.duplicados;

export function SugerenciaDelCelular({ sugerencias, cola }: Props) {
  const s = cola.actual;
  return (
    <>
      <h2 className={css.sec}>
        <b>{t.porRevisar.corto}</b><span className={`${css.cuenta} ambar`}>{sugerencias.length}</span>
        {sugerencias.length > 1 && <button type="button" className={css.siguiente} onClick={() => cola.mover(1)} aria-label={`La siguiente: ${cola.posicion + 1} de ${sugerencias.length}`}>{cola.posicion + 1} de {sugerencias.length} ›</button>}
      </h2>
      {!s ? (
        <div className="dp-vacio">
          <span className="dp-circulo"><Icono nombre="reloj" tam={20} /></span>
          <span><b>No hay sugerencias pendientes</b><small>Tocá «Buscar» para revisar el catálogo.</small></span>
        </div>
      ) : <ElPar s={s} cola={cola} />}
    </>
  );
}

function ElPar({ s, cola }: { s: Sugerencia; cola: Props["cola"] }) {
  const codigo = s.motivo === "codigo_barras";
  const barato = masBaratoDe(s);
  const conserva = cola.conservar(s);
  return (
    <div className={css.sug} data-testid="sugerencia">
      <span className={`${css.motivo} ${codigo ? "codigo" : ""}`}><Icono nombre={codigo ? "codigoDeBarras" : "lector"} tam={16} />{codigo ? t.mismoCodigo.corto : t.descripcionParecida.corto}</span>
      <div className={css.par} role="radiogroup" aria-label="Qué producto se conserva si son el mismo">
        <Lado p={s.a} otro={s.b} conserva={conserva === "a"} barato={barato === "a"} alElegir={() => cola.elegirLado(s, "a")} />
        <Lado p={s.b} otro={s.a} conserva={conserva === "b"} barato={barato === "b"} alElegir={() => cola.elegirLado(s, "b")} />
        <span className={css.igual} aria-hidden="true">=</span>
      </div>
    </div>
  );
}

// Un lado de la sugerencia: la foto, el nombre, la marca, el proveedor y la fecha de la lista con
// su ícono, el costo y si se conserva. Lo que difiere del que se conserva va en ámbar.
function Lado({ p, otro, conserva, barato, alElegir }: { p: Resumen; otro: Resumen; conserva: boolean; barato: boolean; alElegir: () => void }) {
  // Lo distinto se marca del lado que no se conserva, como en la computadora.
  const marca = (valor: string | null, del: string | null) => (!conserva && plano(valor) !== plano(del) ? <span className={css.difiere}>{valor ?? "—"}</span> : valor);
  return (
    <button type="button" role="radio" aria-checked={conserva} className={`${css.lado} ${conserva ? "si" : ""}`} onClick={alElegir}
      aria-label={`${conserva ? "Se conserva" : "Conservar"} «${p.descripcion}»`}>
      <span className={css.foto} aria-hidden="true"><Icono nombre="imagen" tam={22} /></span>
      <span className={css.n}>{marca(p.descripcion, otro.descripcion)}</span>
      <span className={css.dato}><Icono nombre="marca" tam={16} />{marca(p.marca, otro.marca) ?? "Sin marca"}</span>
      <span className={css.dato}><Icono nombre="camion" tam={16} /><span className={css.elipsis}>{p.proveedor ?? "Sin proveedor"}</span></span>
      <span className={css.dato}><Icono nombre="calendario" tam={16} />{p.fecha_lista ? marca(fecha(p.fecha_lista), fechaDe(otro)) : "—"}</span>
      <Costo p={p} barato={barato} />
      <span className={`${css.cons} ${conserva ? "si" : ""}`}><span className={css.radio} aria-hidden="true" />{conserva ? t.seConserva.corto : t.conservarEste.corto}</span>
    </button>
  );
}

const fechaDe = (p: Resumen) => (p.fecha_lista ? fecha(p.fecha_lista) : null);

function Costo({ p, barato }: { p: Resumen; barato: boolean }) {
  return <span className={css.costo}>{p.costo_neto ? pesos(p.costo_neto) : "Sin costo"}{barato && <span className={css.barato}><Icono nombre="tilde" tam={14} grosor={3} />{t.elMasBarato.corto}</span>}</span>;
}

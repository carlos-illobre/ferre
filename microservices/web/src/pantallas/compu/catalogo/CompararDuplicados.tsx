import { masBaratoDe, type Lado, type Sugerencia } from "../../../negocio/catalogo";
import { pesos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import { FilasDelPar } from "./FilasDelPar";
import css from "./Duplicados.module.css";

// El par, en una tabla lado a lado: la columna que se conserva en verde suave, lo que difiere del
// otro en ámbar y lo que coincide con un tilde. Abajo, qué queda si son el mismo y las decisiones.
type Props = {
  s: Sugerencia; posicion: number; total: number; conservar: Lado; quieto: boolean;
  alConservar: (lado: Lado) => void; alResolver: (accion: "unir" | "rechazar") => void; alMover: (paso: number) => void;
};
const t = TEXTOS.duplicados;

export function CompararDuplicados({ s, posicion, total, conservar, quieto, alConservar, alResolver, alMover }: Props) {
  const codigo = s.motivo === "codigo_barras";
  return (
    <section className={css.comparar} aria-labelledby="dv-titulo">
      <header className={css.compCab}>
        <h2 id="dv-titulo">{t.esElMismoArticulo.largo}</h2>
        <span className={`${css.motivo} ${codigo ? "codigo" : ""}`}><Icono nombre={codigo ? "codigo-de-barras" : "texto"} tam={16} />{codigo ? t.mismoCodigo.largo : t.descripcionParecida.largo}</span>
        <span className={css.nav}>
          <button type="button" className={css.teclaBoton} onClick={() => alMover(1)} aria-label="La siguiente (J)" aria-keyshortcuts="J"><kbd className="tecla">J</kbd></button>
          <button type="button" className={css.teclaBoton} onClick={() => alMover(-1)} aria-label="La anterior (K)" aria-keyshortcuts="K"><kbd className="tecla">K</kbd></button>
          {posicion + 1} de {total}
        </span>
      </header>
      <FilasDelPar s={s} conservar={conservar} quieto={quieto} alConservar={alConservar} />
      <QuedaUnSolo s={s} conservar={conservar} />
      <footer className={css.pie}>
        <button type="button" className={css.mismo} disabled={quieto} onClick={() => alResolver("unir")} aria-keyshortcuts="E" data-testid="unir"><Icono nombre="unir" />{t.esElMismo.largo}<kbd className="tecla" aria-hidden="true">E</kbd></button>
        <button type="button" className={css.distintos} disabled={quieto} onClick={() => alResolver("rechazar")} aria-keyshortcuts="D" data-testid="rechazar"><Icono nombre="cerrar" />{t.sonDistintos.largo}<kbd className="tecla" aria-hidden="true">D</kbd></button>
        <button type="button" className={css.saltar} onClick={() => alMover(1)} aria-keyshortcuts="J">{t.saltar.largo}<kbd className="tecla" aria-hidden="true">J</kbd></button>
        <span className={css.ayuda}><span className={css.difiere}>ámbar</span>{t.loQueCambia.largo}</span>
      </footer>
    </section>
  );
}

// Qué queda si son el mismo: un solo producto, con el nombre del que se conserva y el costo del más barato.
function QuedaUnSolo({ s, conservar }: { s: Sugerencia; conservar: Lado }) {
  const barato = masBaratoDe(s);
  const queda = barato ? s[barato] : s[conservar];
  return (
    <p className={css.queda}><Icono nombre="unir" tam={18} />
      <span>Queda <b>un solo producto</b> con {[s.a.proveedor, s.b.proveedor].filter(Boolean).length === 2 ? "2 proveedores" : "sus proveedores"}, con el nombre «{s[conservar].descripcion}». El costo sale de <b>{queda.proveedor ?? "el más barato"}{queda.costo_neto ? ` (${pesos(queda.costo_neto)})` : ""}</b>. Si te equivocás, lo separás en Unidos.</span>
    </p>
  );
}

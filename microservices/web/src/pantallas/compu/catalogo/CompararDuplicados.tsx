import { masBaratoDe, type Lado, type Sugerencia } from "../../../negocio/catalogo";
import { pesos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono } from "../base/ui";
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
  const [mismo, distintos, siguiente] = [useEtiqueta("duplicados.mismo"), useEtiqueta("duplicados.distintos"), useEtiqueta("duplicados.siguiente")];
  return (
    <section className={css.comparar} aria-labelledby="dv-titulo">
      <header className={css.compCab}>
        <h2 id="dv-titulo">{t.esElMismoArticulo.largo}</h2>
        <span className={`${css.motivo} ${codigo ? "codigo" : ""}`}><Icono nombre={codigo ? "codigo-de-barras" : "texto"} tam={16} />{codigo ? t.mismoCodigo.largo : t.descripcionParecida.largo}</span>
        <span className={css.nav}>
          <BotonDeMover accion="duplicados.siguiente" nombre="La siguiente" alTocar={() => alMover(1)} />
          <BotonDeMover accion="duplicados.anterior" nombre="La anterior" alTocar={() => alMover(-1)} />
          {posicion + 1} de {total}
        </span>
      </header>
      <FilasDelPar s={s} conservar={conservar} quieto={quieto} alConservar={alConservar} />
      <QuedaUnSolo s={s} conservar={conservar} />
      <footer className={css.pie}>
        <button type="button" className={css.mismo} disabled={quieto} onClick={() => alResolver("unir")} aria-keyshortcuts={mismo} data-testid="unir"><Icono nombre="unir" />{t.esElMismo.largo}<Atajo accion="duplicados.mismo" /></button>
        <button type="button" className={css.distintos} disabled={quieto} onClick={() => alResolver("rechazar")} aria-keyshortcuts={distintos} data-testid="rechazar"><Icono nombre="cerrar" />{t.sonDistintos.largo}<Atajo accion="duplicados.distintos" /></button>
        <button type="button" className={css.saltar} onClick={() => alMover(1)} aria-keyshortcuts={siguiente}>{t.saltar.largo}<Atajo accion="duplicados.siguiente" /></button>
        <span className={css.ayuda}><span className={css.difiere}>ámbar</span>{t.loQueCambia.largo}</span>
      </footer>
    </section>
  );
}

// J y K, arriba: pasan a la siguiente y a la anterior. El botón es su tecla.
function BotonDeMover({ accion, nombre, alTocar }: { accion: string; nombre: string; alTocar: () => void }) {
  const tecla = useEtiqueta(accion);
  return (
    <button type="button" className={css.teclaBoton} onClick={alTocar} aria-label={tecla ? `${nombre} (${tecla})` : nombre} aria-keyshortcuts={tecla}><Atajo accion={accion} kbd /></button>
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

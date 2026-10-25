import type { ListaFila } from "../../../negocio/catalogo";
import { fecha, porcentaje } from "../../../formato";
import { TEXTOS } from "../../textos";
import { subida } from "../../comun/catalogo/fechas-de-listas";
import { Icono } from "../componentes/base";
import css from "./Listas.module.css";

// Las listas que esperan revisión: la primera como la tarjeta principal de la v2 y, si hay más,
// una fila que dice cuántas y de quién.
const miles = (n: number | string) => Number(n).toLocaleString("es-AR");

export function PendientesDeRevisar({ sinAplicar, alAbrir }: { sinAplicar: ListaFila[]; alAbrir: (l: ListaFila) => void }) {
  const [primera, ...resto] = sinAplicar;
  return (
    <>
      {primera && <Pendiente l={primera} alAbrir={() => alAbrir(primera)} />}
      {resto.length > 0 && (
        <button type="button" className={css.masPend} onClick={() => alAbrir(resto[0]!)} data-testid="lista-pendiente">
          <Icono nombre="bandeja" tam={18} /><span>Y <b>{resto.length} más</b>: {resto.map((l) => l.proveedor).join(", ")}</span><Icono nombre="derecha" tam={18} />
        </button>
      )}
    </>
  );
}

// Tres cifras, la franja de proporción y «Revisar y aplicar» a todo el ancho.
function Pendiente({ l, alAbrir }: { l: ListaFila; alAbrir: () => void }) {
  const r = l.resumen;
  const parte = (n: number) => `${r.leidas ? Math.max(n > 0 ? 1 : 0, (n / r.leidas) * 100) : 0}%`;
  return (
    <div className={css.pend} data-testid="lista-pendiente">
      <div className={css.pendArr}>
        <span className={css.pendIc}><Icono nombre="excel" tam={24} /></span>
        <span className={css.pendTexto}>
          <span className={css.pendEt}>{TEXTOS.listas.paraRevisar.corto}</span>
          <span className={css.pendNom}>{l.proveedor}</span>
          <span className={css.pendD}>Lista del {fecha(l.fecha_lista)} · subida {subida(l.creado_en)}</span>
        </span>
      </div>
      <div className={css.cifras}>
        <div className={`${css.cifra} verde`}><b>{miles(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b><span>cambian</span></div>
        <div className={css.cifra}><b>{miles(r.nuevos)}</b><span>nuevos</span></div>
        <div className={css.cifra}><b>{miles(r.dados_de_baja)}</b><span>no están</span></div>
      </div>
      <div className={css.franja} aria-hidden="true"><i style={{ width: parte(r.modificados), background: "var(--p-verde)" }} /><i style={{ width: parte(r.nuevos), background: "var(--p-naranja)" }} /><i style={{ flex: 1 }} /></div>
      <button type="button" className={css.revisar} onClick={alAbrir} aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`}>{TEXTOS.listas.revisarYAplicar.corto}<Icono nombre="flecha" tam={22} /></button>
    </div>
  );
}

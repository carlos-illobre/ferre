import type { ListaFila } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { diaYMes } from "../../comun/catalogo/fechas-de-listas";
import { Icono } from "../base/ui";
import css from "./Listas.module.css";

// Las últimas tres cargas, con qué cambió y su estado.
const queCambio = (l: ListaFila) => (l.estado === "aplicada" ? `${numero(l.resumen.modificados)} cambiados` : `${numero(l.resumen.leidas)} leídos`);
const PASTILLA: Record<string, [string, string]> = { aplicada: ["verde", "Aplicada"], pendiente: ["ambar", "Sin revisar"], aplicando: ["ambar", "Aplicándose"], descartada: ["", "Descartada"] };

export function UltimasCargas({ historial, hayProveedores }: { historial: ListaFila[]; hayProveedores: boolean }) {
  const ultimas = historial.filter((l) => l.estado !== "pendiente").slice(0, 3);
  return (
    <section aria-labelledby="lv-ultimas">
      <h2 id="lv-ultimas" className={css.cab}><b>{TEXTOS.listas.ultimasCargas.largo}</b></h2>
      {ultimas.length === 0 ? (
        hayProveedores && <p className={css.nada}>Todavía no se cargó ninguna lista. Cuando cargues la primera, acá queda anotado qué cambió.</p>
      ) : (
        <ul className={css.filas} data-testid="historial">
          {ultimas.map((l) => (
            <li key={l.id} className={css.fila} title={l.archivo_nombre}>
              <span className={css.ic}><Icono nombre={l.estado === "descartada" ? "archivo" : "excel"} /></span>
              <span className={css.texto}><b>{l.proveedor}</b><span>{diaYMes(l.fecha_lista)} · {queCambio(l)}</span></span>
              <EstadoDeCarga estado={l.estado} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EstadoDeCarga({ estado }: { estado: string }) {
  const [clase, texto] = PASTILLA[estado] ?? ["", estado];
  return <span className={`${css.pastilla} ${clase}`.trim()}>{texto}</span>;
}

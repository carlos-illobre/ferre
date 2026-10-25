import { useCallback, useEffect, useRef, useState } from "react";
import { useRevisionDeLista, type Cargada } from "../../../negocio/catalogo";
import { fecha } from "../../../formato";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import { Aviso, Icono, numero } from "../base/ui";
import { FiltrosDeLaRevision, type FiltroDeRevision } from "./FiltrosDeLaRevision";
import { FilasDeLaRevision } from "./FilasDeLaRevision";
import { NumerosDeLaLista } from "./NumerosDeLaLista";
import { PieDeLaRevision } from "./PieDeLaRevision";
import type { Resultado } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// La revisión de la lista elegida: el resumen, los avisos, la tabla (o las filas salteadas) y
// «Aplicar» (Ctrl Enter) o «Descartar» (Alt D). Nada se guarda hasta «Aplicar».
type Props = { cargada: Cargada; origen: string; alDescartar: () => void; alAplicar: (r: Resultado) => void };

const resultadoDe = (cargada: Cargada, x: { nuevos: number; modificados: number; sin_cambio: number }): Resultado => ({
  titulo: `Listo: ${numero(x.nuevos + x.modificados)} precios actualizados`,
  detalle: `Lista de ${cargada.proveedor} del ${fecha(cargada.fecha_lista)} aplicada: ${numero(x.nuevos)} productos nuevos, ${numero(x.modificados)} con precio nuevo y ${numero(x.sin_cambio)} sin cambio.`,
});

export function Revision({ cargada, origen, alDescartar, alAplicar }: Props) {
  const rev = useRevisionDeLista(cargada);
  const [filtro, setFiltro] = useState<FiltroDeRevision>("cambian");
  const aplicar = async () => { const x = await rev.aplicar("La aplicación se interrumpió y no se terminó de guardar. La lista sigue acá: volvé a tocar «Aplicar»."); if (x) alAplicar(resultadoDe(cargada, x)); };
  const descartar = async () => { if (await rev.descartar()) alDescartar(); };
  useTeclasDeLaRevision(() => void aplicar(), () => void descartar());
  return (
    <section className={`${css.der} ${css.rev}`} aria-labelledby="lv-rev-titulo" data-testid="revision">
      <header className={css.revCab}>
        <span className={css.doc} aria-hidden="true"><Icono nombre="excel" tam={24} /></span>
        <div className={css.texto}>
          <h2 id="lv-rev-titulo">{cargada.proveedor} · lista del {fecha(cargada.fecha_lista)}</h2>
          <span>{origen}</span>
        </div>
      </header>
      <NumerosDeLaLista r={cargada.resumen} />
      {cargada.avisos.map((a, i) => <div key={i} className={css.aviso} role="status"><Icono nombre="alerta" tam={18} /><span>{a}</span></div>)}
      <FiltrosDeLaRevision r={cargada.resumen} filtro={filtro} alElegir={setFiltro} />
      <FilasDeLaRevision cargada={cargada} filtro={filtro} />
      <Aviso tipo="error">{rev.error}</Aviso>
      <PieDeLaRevision r={cargada.resumen} progreso={rev.progreso} ocupado={rev.ocupado} alAplicar={() => void aplicar()} alDescartar={() => void descartar()} />
    </section>
  );
}

// Alt D descarta y Ctrl Enter aplica, salvo con una ventana abierta.
function useTeclasDeLaRevision(aplicar: () => void, descartar: () => void) {
  const actual = useRef({ aplicar, descartar });
  useEffect(() => { actual.current = { aplicar, descartar }; });
  useTeclasGlobales(useCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.altKey && e.code === "KeyD") { e.preventDefault(); actual.current.descartar(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); actual.current.aplicar(); }
  }, []));
}

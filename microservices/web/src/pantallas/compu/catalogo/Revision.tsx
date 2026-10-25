import { useState } from "react";
import { useRevisionDeLista, type Cargada } from "../../../negocio/catalogo";
import { fecha, numero } from "../../../negocio/formato";
import { useComandos } from "../../../plataforma/comandos";
import { Aviso, hayUnaVentanaAbierta, Icono } from "../base/ui";
import { FiltrosDeLaRevision, type FiltroDeRevision } from "./FiltrosDeLaRevision";
import { FilasDeLaRevision } from "./FilasDeLaRevision";
import { NumerosDeLaLista } from "./NumerosDeLaLista";
import { PieDeLaRevision } from "./PieDeLaRevision";
import type { Resultado } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// La revisión de la lista elegida: el resumen, los avisos, la tabla (o las filas salteadas) y
// «Aplicar» o «Descartar». Nada se guarda hasta «Aplicar».
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
  useAccionesDeLaRevision(() => void aplicar(), () => void descartar());
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

// Lo que ofrece la revisión: aplicar y descartar, salvo con una ventana abierta.
function useAccionesDeLaRevision(aplicar: () => void, descartar: () => void) {
  const libre = (hacer: () => void) => () => (hayUnaVentanaAbierta() ? false : hacer());
  useComandos({ "listas.aplicar": libre(aplicar), "listas.descartar": libre(descartar) });
}

import { useState } from "react";
import { useFilasDeLista, useRevisionDeLista, type Cargada } from "../../../negocio/catalogo";
import { fecha } from "../../../negocio/formato";
import { AvisoError, Hoja, Lista } from "../componentes/base";
import { AplicarODescartar } from "./AplicarODescartar";
import { NumerosDeLaLista } from "./NumerosDeLaLista";
import { PreviaDeLaLista } from "./PreviaDeLaLista";

// La revisión de la lista, en una hoja: el resumen, las filas salteadas, «Aplicar» o «Descartar»
// y la vista previa. Nada se guarda hasta «Aplicar».
type Props = { cargada: Cargada; alTerminar: (mensaje?: string) => void };

const aplicada = (c: Cargada, x: { nuevos: number; modificados: number; sin_cambio: number }) =>
  `Lista de ${c.proveedor} del ${fecha(c.fecha_lista)} aplicada: ${x.nuevos + x.modificados} precios actualizados (${x.nuevos} productos nuevos, ${x.modificados} con precio nuevo, ${x.sin_cambio} sin cambio).`;

export function Revision({ cargada, alTerminar }: Props) {
  const rev = useRevisionDeLista(cargada);
  const { filas, total, error: falloDeFilas } = useFilasDeLista(cargada.id);
  const aplicar = async () => { const x = await rev.aplicar("La aplicación se interrumpió. Volvé a intentar."); if (x) alTerminar(aplicada(cargada, x)); };
  const descartar = async () => { if (await rev.descartar()) alTerminar("Lista descartada. No se guardó ningún precio."); };
  return (
    <Hoja alCerrar={() => !rev.ocupado && alTerminar()} testId="revision">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="seccion" style={{ padding: 0 }}>Lista de precios</span>
        <span className="titulo-hoja" role="heading" aria-level={2}>{cargada.proveedor} · {fecha(cargada.fecha_lista)}</span>
      </div>
      {cargada.avisos.map((a, i) => <div key={i} className="aviso-suave">{a}</div>)}
      <NumerosDeLaLista r={cargada.resumen} />
      <Salteadas cargada={cargada} />
      <AplicarODescartar r={cargada.resumen} progreso={rev.progreso} ocupado={rev.ocupado} alAplicar={aplicar} alDescartar={descartar} />
      <AvisoError texto={rev.error ?? (falloDeFilas ? falloDeFilas.message : null)} />
      <PreviaDeLaLista filas={filas ?? []} total={total} />
    </Hoja>
  );
}

function Salteadas({ cargada }: { cargada: Cargada }) {
  const [ver, setVer] = useState(false);
  if (cargada.salteadas.length === 0) return null;
  return (
    <>
      <button type="button" className="enlace" onClick={() => setVer((v) => !v)}>{ver ? "Ocultar" : "Ver"} las filas salteadas</button>
      {ver && <Lista>{cargada.salteadas.map((s) => <div key={s.fila} className="fila"><span className="nombre">Fila {s.fila}: {s.motivo}</span><span /><span className="detalle">{s.contenido.join(" | ")}</span></div>)}</Lista>}
    </>
  );
}

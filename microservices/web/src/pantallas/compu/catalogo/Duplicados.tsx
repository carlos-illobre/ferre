import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../textos";
import { Aviso, Boton, Hoja, Pagina, Progreso } from "../base/ui";
import { BandejaDeDuplicados } from "./BandejaDeDuplicados";
import { CompararDuplicados } from "./CompararDuplicados";
import { HechoDeDuplicados } from "./HechoDeDuplicados";
import { NumerosDeDuplicados } from "./NumerosDeDuplicados";
import { SinDuplicados } from "./SinDuplicados";
import { UnidosDeLaCompu } from "./UnidosDeLaCompu";
import { UnionManual } from "./UnionManual";
import { useDuplicadosDeLaCompu, type DuplicadosDeLaCompu } from "./useDuplicadosDeLaCompu";
import { useAccionesDeDuplicados } from "./useAccionesDeDuplicados";
import css from "./Duplicados.module.css";

// Un mismo artículo en varios proveedores (RF-06): quien administra ve las sugerencias lado
// a lado y decide «es el mismo» o «son distintos». También une dos a mano y separa. Unir y
// separar se deshacen una con la otra, por eso ninguna pide confirmar. Como la v2 (decisión 148,
// «La bandeja»): arriba los números, a la izquierda la cola y a la derecha el par en una tabla.
export function Duplicados() {
  const x = useDuplicadosDeLaCompu();
  useAccionesDeDuplicados(x);
  const actual = x.elegida.actual;
  return (
    <Pagina titulo="Duplicados" testId="duplicados" className={css.v2} acciones={<AccionesDeDuplicados x={x} />}>
      {!x.enLinea && <Aviso tipo="alerta">Sin conexión. Unir, separar y buscar duplicados necesitan internet.</Aviso>}
      <Aviso tipo="error" accion={x.sugerencias === null ? <Boton tam="chico" icono="repetir" onClick={x.recargar}>Reintentar</Boton> : undefined}>{x.error}</Aviso>
      {x.buscando && <div className="tarjeta relleno"><Progreso texto="Buscando duplicados en todo el catálogo: comparo códigos de barras y descripciones…" /></div>}
      <NumerosDeDuplicados todas={x.todas} unidos={x.uniones.length} />
      <div className="dv">
        <BandejaDeDuplicados x={x} />
        {actual ? (
          <CompararDuplicados s={actual} posicion={x.elegida.posicion} total={x.cola.length} conservar={x.elegida.conservar(actual)} quieto={x.quieto}
            alConservar={(lado) => x.elegida.elegirLado(actual, lado)} alResolver={(accion) => void x.resolver(actual, accion)} alMover={x.elegida.mover} />
        ) : <SinDuplicados cargadas={x.sugerencias !== null} quieto={x.quieto} alBuscar={() => void x.buscar()} />}
      </div>
      {x.hecho && <HechoDeDuplicados hecho={x.hecho} quieto={x.quieto} alDeshacer={(h) => void x.deshacer(h)} alCerrar={() => x.setHecho(null)} />}
      {x.panel === "unir" && (
        <Hoja titulo="Unir dos productos a mano" alCerrar={() => x.setPanel(null)} ancha testId="union-manual">
          <UnionManual quieto={x.quieto} alUnir={x.unirAMano} />
        </Hoja>
      )}
      {x.panel === "unidos" && <UnidosDeLaCompu uniones={x.uniones} quieto={x.quieto} alSeparar={x.separar} alCerrar={() => x.setPanel(null)} />}
    </Pagina>
  );
}

// Arriba, al lado de las pestañas: buscar en todo, unir a mano y los unidos (para separar).
function AccionesDeDuplicados({ x }: { x: DuplicadosDeLaCompu }) {
  const t = TEXTOS.duplicados;
  return (
    <AlLadoDeLasPestanas>
      <div className={`fila ${css.arriba}`}>
        <Boton icono="buscar" disabled={x.quieto} onClick={() => void x.buscar()} accion="duplicados.buscar" data-testid="buscar-duplicados">{t.buscarEnTodo.largo}</Boton>
        <Boton icono="unir" onClick={() => x.setPanel("unir")} accion="duplicados.unir" data-testid="unir-a-mano">{t.unirAMano.largo}</Boton>
        <Boton icono="separar" onClick={() => x.setPanel("unidos")} accion="duplicados.unidos" data-testid="unidos">{t.unidosYSeparar.largo}</Boton>
      </div>
    </AlLadoDeLasPestanas>
  );
}

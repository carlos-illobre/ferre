import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { Aviso, Boton, Pagina, Progreso } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { AccionElegida } from "./AccionElegida";
import { FiltrosDelRegistro } from "./FiltrosDelRegistro";
import { HojaDelEvento } from "./HojaDelEvento";
import { PaginadorDelRegistro } from "./PaginadorDelRegistro";
import { QuePaso } from "./QuePaso";
import { SinAcciones, TotalDelRegistro } from "./TotalDelRegistro";
import { TablaDelRegistro } from "./TablaDelRegistro";
import { useActividadDeLaCompu, type ActividadDeLaCompu } from "./useActividadDeLaCompu";
import "./negocio.css";
import css from "./Actividad.module.css";

// «Quién hizo qué» como la v2 («Registro», decisión 148): los filtros en una fila (quién, el
// período en segmentos y qué), la tabla de a 10 con la acción elegida a la derecha, «Qué pasó»
// con cuántas de cada tipo y el paginador. Es de solo lectura.
function hoyTexto() {
  const ahora = new Date();
  const t = `${ahora.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} · ${ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function Actividad() {
  const x = useActividadDeLaCompu();
  return (
    <Pagina titulo="Quién hizo qué" testId="actividad" className="actividad av2" bajada={<span className="solo-lectores">Cada venta, compra, cambio de precio o de usuario queda anotado con quién lo hizo y cuándo. No se puede editar ni borrar.</span>}>
      <AlLadoDeLasPestanas>
        <span className={css.hoy}>{hoyTexto()}</span>
        <button type="button" className={css.boton} disabled title="Bajar el registro en planilla todavía no se puede"><Icono nombre="file-down" tam={16} />Bajar en planilla</button>
      </AlLadoDeLasPestanas>
      {!x.enLinea && <Aviso tipo="alerta" testId="actividad-sin-conexion">Sin conexión: el registro necesita internet. Se actualiza solo cuando vuelva.</Aviso>}
      <div className={css.pantalla}>
        <div className={css.izq}>
          <FiltrosDelRegistro x={x} />
          <TotalDelRegistro x={x} />
          <ErrorOCargando x={x} />
          <SinAcciones x={x} />
          {x.eventos.length > 0 && <TablaDelRegistro x={x} />}
          {Boolean(x.datos?.total) && <PaginadorDelRegistro x={x} />}
        </div>
        <div className={css.der}>
          <QuePaso x={x} />
          {x.elegido && <AccionElegida x={x} elegido={x.elegido} />}
        </div>
      </div>
      {x.abierto && <HojaDelEvento evento={x.abierto} alCerrar={() => x.setAbierto(null)} />}
    </Pagina>
  );
}

function ErrorOCargando({ x }: { x: ActividadDeLaCompu }) {
  return (
    <>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={x.registro.recargar}>Reintentar</Boton>}>{x.error}</Aviso>
      {!x.datos && !x.error && <Progreso texto="Trayendo las últimas acciones…" />}
    </>
  );
}

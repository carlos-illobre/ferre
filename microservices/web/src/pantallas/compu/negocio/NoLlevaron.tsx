import { useState } from "react";
import { agruparNoLlevados, type Consulta } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { ErrorDeBloque, Esqueleto } from "./Cargas";
import { Pesos } from "./Pesos";
import { diaYHora, type Carga } from "./negocio-comun";
import css from "./Resumen.module.css";

const CONSULTAS_A_LA_VISTA = 3;

// Lo que preguntaron y no compraron, agrupado como la v2 («Disco de corte × 3»): demanda que hoy
// se pierde. Se anota en Vender con «No llevó». «Ver las N» abre cada consulta, con cuándo, el
// precio que se dijo y el motivo.
export function NoLlevaron({ consultas, deHoy }: { consultas: Carga<Consulta[]>; deHoy: number }) {
  const [todas, setTodas] = useState(false);
  const lista = consultas.datos ?? [];
  return (
    <section className={css.card} data-testid="consultas" aria-labelledby="resumen-consultas">
      <header className={css.cardCab}>
        <h2 id="resumen-consultas">{TEXTOS.tablero.noLlevaron.largo}</h2>
        {consultas.datos && <DeHoy deHoy={deHoy} />}
        {lista.length > CONSULTAS_A_LA_VISTA && <VerTodas cuantas={lista.length} todas={todas} alTocar={() => setTodas((t) => !t)} />}
      </header>
      <ErrorDeBloque carga={consultas} />
      <MientrasCarga consultas={consultas} />
      {todas ? <TodasLasConsultas lista={lista} /> : <Agrupadas lista={lista} />}
    </section>
  );
}

// Agrupadas como la v2 («Disco de corte × 3»): las primeras tres.
function Agrupadas({ lista }: { lista: Consulta[] }) {
  const grupos = agruparNoLlevados(lista);
  if (grupos.length === 0) return null;
  return (
    <ul className={css.listaSimple}>
      {grupos.slice(0, CONSULTAS_A_LA_VISTA).map((g, i) => (
        <li key={g.descripcion} className={i === CONSULTAS_A_LA_VISTA - 1 ? "ultima" : ""} data-testid="consulta">
          <Icono nombre="package" tam={16} /><span className={css.listaNombre}>{g.descripcion}</span><span className={css.pastilla}>× {g.veces}</span>
        </li>
      ))}
    </ul>
  );
}

// Todas, cada una con cuándo, el motivo y el precio que se dijo.
function TodasLasConsultas({ lista }: { lista: Consulta[] }) {
  return (
    <ul className={`${css.renglones} ${css.consultas}`}>
      {lista.map((c) => (
        <li key={c.id} data-testid="consulta">
          <span className={css.renglonIco}><Icono nombre="package" tam={16} /></span>
          <span className={css.renglonNombre}>{c.descripcion}<small>{diaYHora(c.fecha)} · {c.motivo ?? "No se anotó el motivo"}</small></span>
          <span className={css.renglonImporte}>{c.precio_ofrecido ? <Pesos valor={Number(c.precio_ofrecido)} /> : <span className={css.sinDato}>Sin precio</span>}</span>
        </li>
      ))}
    </ul>
  );
}

const DeHoy = ({ deHoy }: { deHoy: number }) => <span className={`${css.pastilla} ${deHoy ? "urgente" : ""}`} title="Hoy">{deHoy ? `${deHoy} hoy` : "Ninguna hoy"}</span>;
const VerTodas = ({ cuantas, todas, alTocar }: { cuantas: number; todas: boolean; alTocar: () => void }) =>
  <span className={css.der}><button type="button" className={css.enlace} aria-expanded={todas} onClick={alTocar}>{todas ? "Ver menos" : `Ver las ${cuantas}`}</button></span>;

function MientrasCarga({ consultas }: { consultas: Carga<Consulta[]> }) {
  if (!consultas.datos) return consultas.error ? null : <Esqueleto renglones={3} />;
  return consultas.datos.length === 0 ? <p className={css.vacioChico}>Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender y queda anotado acá.</p> : null;
}

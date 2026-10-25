import { useState } from "react";
import { fecha, pesosCortos } from "../../../negocio/formato";
import { agruparNoLlevados, cuandoFueLaConsulta, type Consulta } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Resumen.module.css";

// Lo que preguntaron y no llevaron, agrupado («Disco de corte × 3»); «Ver las N» abre cada consulta.
export function NoLlevaronHoy({ consultas, deHoy }: { consultas: Consulta[] | null; deHoy: number }) {
  const [todas, setTodas] = useState(false);
  if (!consultas) return null;
  return (
    <div className={`${css.tarjeta} ${css.noLlevaron}`} data-testid="consultas">
      <div className={css.mediosCab}><span className={css.renglon}>{TEXTOS.tablero.noLlevaron.corto}</span><span className={`${css.pastilla} ${deHoy ? "urgente" : ""}`}>{deHoy ? `${deHoy} hoy` : "Ninguna hoy"}</span>
        {consultas.length > 3 && <button type="button" className={css.enlace} aria-expanded={todas} onClick={() => setTodas((t) => !t)}>{todas ? "Ver menos" : `Ver las ${consultas.length}`}</button>}
      </div>
      {consultas.length === 0 && <p className={css.detalle}>Cuando alguien pregunta un precio y no compra, tocá «No llevó» en Vender.</p>}
      {todas ? <Todas consultas={consultas} /> : <Agrupadas consultas={consultas} />}
    </div>
  );
}

function Agrupadas({ consultas }: { consultas: Consulta[] }) {
  return agruparNoLlevados(consultas).slice(0, 3).map((g) => (
    <div key={g.descripcion} className={css.lrow} data-testid="consulta"><Icono nombre="package" tam={16} /><span className={css.lrowNombre}>{g.descripcion}</span><span className={css.pastilla}>× {g.veces}</span></div>
  ));
}

function Todas({ consultas }: { consultas: Consulta[] }) {
  return consultas.map((c) => (
    <div key={c.id} className={`${css.lrow} con-detalle`} data-testid="consulta">
      <Icono nombre="package" tam={16} />
      <span className={css.lrowNombre}>{c.descripcion}<small>{cuandoFueLaConsulta(c.fecha, fecha)}{c.motivo ? ` · ${c.motivo}` : ""}</small></span>
      <b>{c.precio_ofrecido ? pesosCortos(c.precio_ofrecido) : "—"}</b>
    </div>
  ));
}

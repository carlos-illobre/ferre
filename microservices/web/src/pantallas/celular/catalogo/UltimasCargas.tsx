import type { ListaFila } from "../../../negocio/catalogo";
import { fecha } from "../../../formato";
import { TEXTOS } from "../../textos";
import { diaYMes } from "../../comun/catalogo/fechas-de-listas";
import { mayuscula } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import css from "./Listas.module.css";

// Las últimas tres cargas, con su estado y cuánto cambió (o cuánto se leyó, si no se aplicó).
const miles = (n: number | string) => Number(n).toLocaleString("es-AR");

export function UltimasCargas({ ultimas }: { ultimas: ListaFila[] }) {
  if (ultimas.length === 0) return null;
  return (
    <>
      <h2 className={css.sec}><b>{TEXTOS.listas.ultimasCargas.corto}</b></h2>
      <ul className={css.grupo} data-testid="historial">
        {ultimas.map((l) => (
          <li key={l.id} className={css.row} aria-label={`${l.proveedor}, lista del ${fecha(l.fecha_lista)}, ${l.archivo_nombre}`}>
            <span className={css.ic}><Icono nombre={l.estado === "descartada" ? "archivo" : "excel"} tam={20} /></span>
            <span className={css.n}>{l.proveedor}</span>
            <EstadoDeCarga estado={l.estado} />
            <span className={css.d}>Lista del {diaYMes(l.fecha_lista)} · <CuantoCambio l={l} /></span>
          </li>
        ))}
      </ul>
    </>
  );
}

function CuantoCambio({ l }: { l: ListaFila }) {
  if (l.estado !== "aplicada") return <><b>{miles(l.resumen.leidas)}</b> leídos</>;
  return <><b>{miles(l.resumen.modificados)}</b> cambiados{l.resumen.nuevos > 0 && <> · <b>{miles(l.resumen.nuevos)}</b> nuevos</>}</>;
}

// El estado de una carga, como pastilla: aplicada (verde, con tilde), pendiente o aplicándose
// (amarilla, con reloj) o descartada (gris).
function EstadoDeCarga({ estado }: { estado: ListaFila["estado"] }) {
  if (estado === "aplicada") return <span className={`${css.pastilla} verde`}><Icono nombre="tilde" tam={14} grosor={3} />Aplicada</span>;
  if (estado === "pendiente" || estado === "aplicando") return <span className={`${css.pastilla} ambar`}><Icono nombre="reloj" tam={14} />{estado === "aplicando" ? "Aplicándose…" : "Pendiente"}</span>;
  return <span className={css.pastilla}>{mayuscula(estado)}</span>;
}

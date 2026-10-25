import { useState } from "react";
import { conUnidad } from "../../../negocio/catalogo";
import { anularCompra, nombreDelComprobante, type CompraFila } from "../../../negocio/compras";
import { fecha, pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { VerComprobante } from "../../FotoDeFactura";
import { useAbiertas } from "../../comun/compras/useAbiertas";
import { Icono } from "../../../ui/iconos";
import css from "./Compras.module.css";

// Las compras recientes (las últimas cinco y, a un toque, todas): cada una se abre para ver sus
// renglones y se anula con su motivo.
const t = TEXTOS.compras;
type Props = { filas: CompraFila[] | null; anula: boolean; alError: (m: string) => void };

export function ComprasDelCelular({ filas, anula, alError }: Props) {
  const { abiertas, alternar } = useAbiertas();
  const [todas, setTodas] = useState(false);
  async function anular(c: CompraFila) {
    const motivo = window.prompt(`¿Anular la compra de ${pesos(c.total)} a ${c.proveedor}? Motivo (opcional):`);
    if (motivo === null) return;
    await anularCompra(c.id, motivo).catch((e: Error) => alError(e.message));
  }
  const visibles = todas ? (filas ?? []) : (filas ?? []).slice(0, 5);
  return (
    <section className={css.seccion} data-testid="compras-recientes">
      <h2 className={css.titulo}><span>{t.comprasRecientes.corto}</span><VerTodas cuantas={filas?.length ?? 0} todas={todas} alTocar={() => setTodas((x) => !x)} /></h2>
      {filas?.length === 0 && <div className="aviso-suave">Todavía no hay compras registradas.</div>}
      {visibles.map((c) => <Compra key={c.id} c={c} abierta={abiertas.has(c.id)} anula={anula} alAlternar={() => alternar(c.id)} alAnular={() => void anular(c)} />)}
    </section>
  );
}

function Compra({ c, abierta, anula, alAlternar, alAnular }: { c: CompraFila; abierta: boolean; anula: boolean; alAlternar: () => void; alAnular: () => void }) {
  const anulada = c.estado === "anulada";
  return (
    <div className={`${css.tarjeta} ${css.compra} ${anulada ? "anulada" : ""}`} data-testid="compra-reciente">
      <div className={css.fila}>
        <span className={css.mini}>{c.foto ? <VerComprobante ruta={c.foto} /> : <Icono nombre="notebook-pen" />}</span>
        <button type="button" className={css.abrir} onClick={alAlternar} aria-expanded={abierta}>
          <span className={css.texto}><b>{c.proveedor}</b><span className={anulada ? css.anulada : ""}>{fecha(c.fecha).slice(0, 5)} · {nombreDelComprobante(c)}{anulada ? " · anulada" : ""}</span></span>
          <b className={`${css.importe} ${anulada ? "tachado" : ""}`}>{pesosCortos(c.total)}</b>
        </button>
      </div>
      {abierta && <RenglonesDeLaCompra c={c} puedeAnular={!anulada && anula} alAnular={alAnular} />}
    </div>
  );
}

const VerTodas = ({ cuantas, todas, alTocar }: { cuantas: number; todas: boolean; alTocar: () => void }) =>
  cuantas > 5 ? <button type="button" className={css.enlace} onClick={alTocar}>{todas ? "Ver menos" : t.verTodas.corto}</button> : null;

function RenglonesDeLaCompra({ c, puedeAnular, alAnular }: { c: CompraFila; puedeAnular: boolean; alAnular: () => void }) {
  return (
    <div className={css.detalle}>
      <ul className={css.items}>
        {c.items.map((i, n) => <li key={n}><span>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}</span><b>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</b></li>)}
      </ul>
      {puedeAnular && <button type="button" className="boton texto" onClick={alAnular}>Anular esta compra</button>}
    </div>
  );
}

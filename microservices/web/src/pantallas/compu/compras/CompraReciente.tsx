import type { KeyboardEvent } from "react";
import { conUnidad } from "../../../negocio/catalogo";
import type { CompraFila } from "../../../negocio/compras";
import { fecha, pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { VerComprobante } from "../../FotoDeFactura";
import { Boton } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { plural } from "../deposito/deposito-comun";
import css from "./Compras.module.css";

// Una compra: proveedor, fecha, comprobante, renglones y total (tachado si se anuló); abierta, sus
// renglones y «Anular esta compra».
const t = TEXTOS.compras;
const nombreComprobante = (c: CompraFila) => (c.comprobante_tipo === "sin_comprobante" ? "Sin comprobante" : `${c.comprobante_tipo === "factura" ? "Factura" : "Remito"}${c.comprobante_numero ? ` ${c.comprobante_numero}` : ""}`);
type Props = { c: CompraFila; abierta: boolean; anula: boolean; alAlternar: () => void; alTeclear: (e: KeyboardEvent<HTMLButtonElement>) => void; alAnular: () => void };

export { nombreComprobante };

export function CompraReciente({ c, abierta, anula, alAlternar, alTeclear, alAnular }: Props) {
  const anulada = c.estado === "anulada";
  return (
    <li className={`${css.compra} ${anulada ? "anulada" : ""} ${abierta ? "abierta" : ""}`} data-testid="compra-reciente">
      <div className={css.fila}>
        <span className={css.mini}>{c.foto ? <VerComprobante ruta={c.foto} /> : <Icono nombre="notebook-pen" />}</span>
        <button type="button" className={css.abrir} data-abre-compra onClick={alAlternar} onKeyDown={alTeclear} aria-expanded={abierta}
          aria-label={`${abierta ? "Plegar" : "Ver"} los renglones de la compra a ${c.proveedor} del ${fecha(c.fecha)}`} aria-keyshortcuts={anulada ? undefined : "Delete"}>
          <span className={css.texto}><b>{c.proveedor}</b><span>{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}</span></span>
          <ImporteYEstado c={c} anulada={anulada} />
          <Icono nombre="chevron-right" className={css.flecha} />
        </button>
      </div>
      {abierta && <RenglonesDeLaCompra c={c} puedeAnular={!anulada && anula} alAnular={alAnular} />}
    </li>
  );
}

function ImporteYEstado({ c, anulada }: { c: CompraFila; anulada: boolean }) {
  return (
    <>
      <span className={css.importe}><b className={anulada ? "tachado" : ""}>{pesosCortos(c.total)}</b><small>{anulada ? t.noSuma.largo : t.sinIva.largo}</small></span>
      <span className={css.estado}>{anulada && <span className={`${css.pastilla} error`}><Icono nombre="ban" tam={16} />{t.anulada.largo}</span>}</span>
    </>
  );
}

function RenglonesDeLaCompra({ c, puedeAnular, alAnular }: { c: CompraFila; puedeAnular: boolean; alAnular: () => void }) {
  return (
    <div className={css.detalle}>
      <ul className={css.items}>
        {c.items.map((i, n) => (
          <li key={n}><span>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}<span className="detalle"> · {pesos(i.costo_unitario)} c/u</span></span><strong>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></li>
        ))}
      </ul>
      {puedeAnular && <Boton tam="chico" variante="peligro" icono="basura" onClick={alAnular} data-testid="anular">Anular esta compra</Boton>}
    </div>
  );
}

import { useState } from "react";
import { NOMBRE_DE_MEDIO, useVentasParaCambio, type VentaParaCambio } from "../../../negocio/ventas";
import { nombreDeProducto, pesosCortos } from "../../../formato";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { hora } from "../../comun/ventas/textos-del-dia";
import { Icono } from "../componentes/base";
import css from "./VentasDelDia.module.css";

// Sin venta, primero se busca de cuál vuelve, por el producto, entre las de los últimos 15 días (E11).
const t = TEXTOS.hoy;
export const fechaCorta = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });

export function BuscarVentaParaCambio({ alElegir }: { alElegir: (v: VentaParaCambio) => void }) {
  const [buscado, setBuscado] = useState("");
  const halladas = useVentasParaCambio(buscado);
  return (
    <>
      <label className={css.buscarCaja}><Icono nombre="buscar" tam={20} />
        <input type="search" autoFocus value={buscado} onChange={(e) => setBuscado(e.target.value)} placeholder="Producto que vuelve" aria-label={t.deQueVenta.corto} data-testid="buscar-venta-cambio" />
      </label>
      <p className={css.hojaDetalle}>{t.deQueVenta.corto}</p>
      {halladas.ventas?.map((v) => <VentaParaElegir key={v.id} venta={v} alElegir={() => alElegir(v)} />)}
      {buscado.trim().length >= 2 && halladas.ventas?.length === 0 && !halladas.buscando && <p className="detalle">Ninguna venta de los últimos 15 días con «{buscado.trim()}».</p>}
    </>
  );
}

function VentaParaElegir({ venta: v, alElegir }: { venta: VentaParaCambio; alElegir: () => void }) {
  return (
    <button type="button" className={`${css.renglon} ${css.ccVenta}`} onClick={alElegir} data-testid="venta-para-cambio">
      <IconoDeMedio medio={v.medio_pago} tam={18} conFondo />
      <span className={css.nom}><b>{v.cliente ?? v.items.map((i) => nombreDeProducto(i.descripcion)).join(", ")}</b><small>{fechaCorta(v.fecha)} · {hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago]}</small></span>
      <strong className="importe">{pesosCortos(v.total)}</strong>
    </button>
  );
}

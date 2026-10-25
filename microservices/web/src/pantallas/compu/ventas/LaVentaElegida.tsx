import { NOMBRE_DE_MEDIO, type Medio, type VentaDelDia } from "../../../negocio/ventas";
import { nombreDeProducto, hora } from "../../../negocio/formato";
import { IconoDeMedio } from "../../IconoDeMedio";
import { TEXTOS } from "../../textos";
import { Pastilla } from "../base/ui";
import { CorrigiendoLaVenta } from "./CorrigiendoLaVenta";
import { DetalleDeLaVenta } from "./DetalleDeLaVenta";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// La venta elegida, a la derecha: arriba el medio, quién o qué se llevó y la hora; debajo, la venta
// (con «Corregir» y «Anular») o, corrigiéndola, sus renglones para cambiar (specs/019, E01 a E10).
const t = TEXTOS.hoy;
const tituloDe = (v: VentaDelDia) => v.cliente ?? (v.items.length === 1 ? nombreDeProducto(v.items[0]!.descripcion) : `${v.items.length} ${t.productos.largo}`);

export function LaVentaElegida({ venta: v, l }: { venta: VentaDelDia; l: ListaDelDia }) {
  const c = l.corrigiendo;
  const medio = v.medio_pago as Medio;
  return (
    <aside className={`${css.venta} ${c ? "corrigiendo" : ""}`} aria-label="La venta elegida" data-testid="venta-elegida">
      <div className="cab">
        <IconoDeMedio medio={c?.medio ?? medio} tam={20} conFondo />
        <div className="tit"><b>{tituloDe(v)}</b><small>{hora(v.fecha)} · {NOMBRE_DE_MEDIO[medio]}</small></div>
        <EstadoDeLaVenta venta={v} />
      </div>
      {c ? <CorrigiendoLaVenta venta={v} c={c} l={l} />
        : <DetalleDeLaVenta venta={v} anula={l.anula} alCorregir={l.empezar} alAnular={() => l.setPorAnular(v)} />}
    </aside>
  );
}

// Anulada, o con cuenta corriente que todavía se debe.
function EstadoDeLaVenta({ venta: v }: { venta: VentaDelDia }) {
  if (v.estado === "anulada") return <Pastilla tipo="mal" sinPunto>{t.anulada.largo}</Pastilla>;
  if (v.medio_pago === "cuenta_corriente" && !v.pagada_en) return <Pastilla tipo="alerta" sinPunto>{t.debe.largo}</Pastilla>;
  return null;
}

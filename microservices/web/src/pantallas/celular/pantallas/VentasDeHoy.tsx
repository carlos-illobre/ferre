import { Lista } from "../componentes/base";
import { pesos, pesosCortos } from "../../../formato";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../../negocio/ventas/venta";
import { confirmadas, useVentasDelDia, type VentaDelDia } from "../../../negocio/ventas/ventas-del-dia";

// La pestaña «Hoy» de Vender (decisión 72); «Anular» está en AnularVentas.

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Cada venta con sus productos (uno por renglón), el medio de pago y "Anular".
export function ListaDeVentas({ ventas, alAnular, sinVentas = "Todavía no hay ventas hoy." }: { ventas: VentaDelDia[]; alAnular: ((v: VentaDelDia) => void) | null; sinVentas?: string }) {
  if (ventas.length === 0) return <div className="aviso-suave">{sinVentas}</div>;
  return (
    <Lista data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        return (
          <div key={v.id} className={`fila ${anulada ? "apagada" : ""}`} data-testid="venta-dia">
            <span className="nombre" style={{ textDecoration: anulada ? "line-through" : undefined }}>
              {v.items.map((i, n) => <span key={n} style={{ display: "block" }}>{Number(i.cantidad)} × {i.descripcion}</span>)}
            </span>
            <span className="derecha">
              <strong className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesos(v.total)}</strong>
              {anulada ? <small>anulada</small> : alAnular && <button type="button" className="enlace" onClick={() => alAnular(v)}>Anular</button>}
            </span>
            <span className="detalle">{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</span>
          </div>
        );
      })}
    </Lista>
  );
}

// Pestaña «Hoy»: lo vendido en el día y cada venta, sin nada para tocar.
export function VentasDeHoy() {
  const { datos: hoy } = useVentasDelDia();
  if (!hoy) return <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>;
  return (
    <>
      <div className="tarjeta oscura" data-testid="resumen-hoy">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><small>Ventas de hoy</small><small>{confirmadas(hoy.ventas).length} ventas</small></div>
        <span className="importe" style={{ fontSize: 44, lineHeight: 1 }} data-testid="total-de-hoy">{pesosCortos(hoy.total)}</span>
        <div className="totales-hoy">
          {MEDIOS.map((m) => <div key={m}><small>{NOMBRE_DE_MEDIO[m]}</small><span className="importe">{pesosCortos(hoy.totales[m] ?? 0)}</span></div>)}
        </div>
      </div>
      <ListaDeVentas ventas={hoy.ventas} alAnular={null} />
    </>
  );
}

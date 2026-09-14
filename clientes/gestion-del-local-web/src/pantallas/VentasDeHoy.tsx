import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { pesos } from "../formato";

// Las ventas del día, con anulación. Se usan en Vender (hoja "Hoy") y en Negocio.
export type VentaDia = { id: string; fecha: string; medio_pago: string; total: string; estado: string; cliente: string | null; items: { descripcion: string; cantidad: string; precio_unitario: string }[] };
export type DatosHoy = { ventas: VentaDia[]; totales: Record<string, number>; total: number };
export const NOMBRE_MEDIO: Record<string, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
export const pesosCortos = (v: number | string) => "$" + Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function useVentasDeHoy(clave: unknown) {
  const [datos, setDatos] = useState<DatosHoy | null>(null);
  const cargar = useCallback(() => api<DatosHoy>("/ventas").then(setDatos).catch(() => setDatos(null)), []);
  useEffect(() => { void cargar(); }, [cargar, clave]);
  async function anular(v: VentaDia) {
    const motivo = window.prompt(`¿Anular la venta de ${pesos(v.total)}? Motivo (opcional):`);
    if (motivo === null) return;
    await api(`/ventas/${v.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }).catch(() => undefined);
    await cargar();
  }
  return { datos, cargar, anular };
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Cada venta con sus productos (uno por renglón), el medio de pago y "Anular".
export function ListaDeVentas({ ventas, alAnular }: { ventas: VentaDia[]; alAnular: (v: VentaDia) => void }) {
  if (ventas.length === 0) return <div className="aviso-suave">Todavía no hay ventas hoy.</div>;
  return (
    <div className="lista" data-testid="ventas-de-hoy">
      {ventas.map((v) => {
        const anulada = v.estado === "anulada";
        return (
          <div key={v.id} className={`fila ${anulada ? "apagada" : ""}`} data-testid="venta-dia">
            <span className="nombre" style={{ textDecoration: anulada ? "line-through" : undefined }}>
              {v.items.map((i, n) => <span key={n} style={{ display: "block" }}>{Number(i.cantidad)} × {i.descripcion}</span>)}
            </span>
            <span className="derecha">
              <strong className="importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesos(v.total)}</strong>
              {anulada ? <small>anulada</small> : <button type="button" className="enlace" onClick={() => alAnular(v)}>Anular</button>}
            </span>
            <span className="detalle">{hora(v.fecha)} · {NOMBRE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</span>
          </div>
        );
      })}
    </div>
  );
}

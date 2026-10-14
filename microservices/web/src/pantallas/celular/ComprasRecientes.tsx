import { useEffect, useState } from "react";
import { usePuede } from "../permisos";
import { VerComprobante } from "../FotoDeFactura";
import { anularCompra, nombreDelComprobante, useComprasRecientes, type CompraFila } from "../../negocio/compras";
import { fecha, pesos } from "../../formato";
import { Toast, Lista } from "./componentes/base";


// Compras recientes: el papel que ya no se tira. Van en Cómo va el negocio (decisión 67). Cada compra se
// abre para ver sus renglones y se puede anular.
export function ComprasRecientes({ soloVer = false }: { soloVer?: boolean } = {}) {
  const anula = usePuede()("deposito.ingresos");
  const filas = useComprasRecientes().datos ?? [];
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [mensaje, setMensaje] = useState<string | null>(null);
  if (filas.length === 0) return soloVer ? <div className="aviso-suave">Todavía no hay compras registradas.</div> : null;
  const nombreComprobante = nombreDelComprobante;
  async function anular(c: CompraFila) {
    const motivo = window.prompt(`¿Anular la compra de ${pesos(c.total)} a ${c.proveedor}? Motivo (opcional):`);
    if (motivo === null) return;
    await anularCompra(c.id, motivo).catch((e: Error) => setMensaje(e.message));
  }
  return (
    <>
      <h2 className="seccion"><span>Compras recientes</span></h2>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <Lista data-testid="compras-recientes">
        {filas.map((c) => {
          const anulada = c.estado === "anulada";
          const abierta = abiertas.has(c.id);
          return (
            <div key={c.id} data-testid="compra-reciente">
              <button type="button" className={`fila ${anulada ? "apagada" : ""}`} onClick={() => setAbiertas((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} aria-expanded={abierta}>
                <span className="nombre">{c.proveedor}</span>
                <strong className="derecha importe" style={{ textDecoration: anulada ? "line-through" : undefined }}>{pesos(c.total)}</strong>
                <span className="detalle">{fecha(c.fecha)} · {nombreComprobante(c)} · {c.renglones} renglones{anulada ? " · anulada" : ""}</span>
              </button>
              {abierta && (
                <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {c.foto && <div style={{ display: "flex", alignItems: "center", gap: 12 }}><VerComprobante ruta={c.foto} /><small>Tocá la foto para leer el número o cualquier otro dato del comprobante.</small></div>}
                  <div className="movimientos">
                    {c.items.map((i, n) => <div key={n}><span>{Number(i.cantidad)} ×</span><span>{i.descripcion}</span><strong className="importe" style={{ fontSize: 16 }}>{pesos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></div>)}
                  </div>
                  {!anulada && anula && <button type="button" className="boton texto" onClick={() => anular(c)}>Anular esta compra</button>}
                </div>
              )}
            </div>
          );
        })}
      </Lista>
    </>
  );
}

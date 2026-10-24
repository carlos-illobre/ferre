import { useState } from "react";
import { conUnidad } from "../../unidades";
import { usePuede } from "../permisos";
import { VerComprobante } from "../FotoDeFactura";
import { anularCompra, faltanDe, gastoPorDia, letrasDeLaSemana, nombreDelComprobante, useComprasRecientes, useGastosDeLaSemana, usePedidosPorLlegar, type CompraFila } from "../../negocio/compras";
import { fecha, pesos, pesosCortos } from "../../formato";
import { irA } from "../../rutas";
import { Hoja, Toast } from "./componentes/base";
import { IconoDeDeposito } from "../IconoDeDeposito";
import { TEXTOS } from "../textos";
import "./compras.css";

// Compras en el celular, como la v2 («Resumen», decisión 148), en el orden del pulgar: arriba lo
// gastado en la semana (con «Ver los gastos»; tocarlo muestra lo comprado a cada proveedor) y lo
// que se les debe; en el medio los pedidos por llegar, cada uno con su «Llegó»; abajo las compras
// recientes (con «Ver las compras»), que se abren para ver sus renglones y se anulan. Van en Cómo
// va el negocio (decisión 67). Fija al pulgar, «Sacale foto a la factura» lleva al ingreso.
const t = TEXTOS.compras;

// `soloVer` quedó de la versión anterior: la pantalla de ahora es la misma para todos.
export function ComprasRecientes(_: { soloVer?: boolean } = {}) {
  const puede = usePuede();
  const veGastos = puede("negocio.gastos");
  const veCompras = puede("deposito.compras");
  const anula = puede("deposito.ingresos");
  const encarga = puede("deposito.pedidos");
  const gastos = useGastosDeLaSemana(veGastos).datos;
  const filas = useComprasRecientes(veCompras).datos;
  const { porLlegar } = usePedidosPorLlegar(encarga || anula);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [todas, setTodas] = useState(false);
  const [porProveedor, setPorProveedor] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const dias = gastoPorDia(gastos, filas);
  const mayor = Math.max(1, ...(dias ?? []).map((d) => d.total));

  async function anular(c: CompraFila) {
    const motivo = window.prompt(`¿Anular la compra de ${pesos(c.total)} a ${c.proveedor}? Motivo (opcional):`);
    if (motivo === null) return;
    await anularCompra(c.id, motivo).catch((e: Error) => setMensaje(e.message));
  }
  const visibles = todas ? (filas ?? []) : (filas ?? []).slice(0, 5);

  return (
    <div className="cm">
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <div className="cm-resumenes">
        {veGastos && (
          <button type="button" className="cm-res" onClick={() => setPorProveedor(true)} disabled={!gastos} data-testid="numero-gastos">
            <span className="cm-et">{t.estaSemana.corto}</span>
            <span className="cm-va" data-testid="gastos-semana">{gastos ? pesosCortos(gastos.total) : "—"}</span>
            <span className="cm-barras" aria-hidden="true">
              {letrasDeLaSemana(gastos).map((_, i) => <i key={i} className={i === 6 ? "hoy" : ""} style={{ height: dias ? Math.max(4, (dias[i]!.total / mayor) * 26) : 4 }} />)}
            </span>
          </button>
        )}
        <div className="cm-res error" data-testid="se-les-debe">
          <span className="cm-et">{t.seLesDebe.corto}</span>
          <span className="cm-va">—</span>
          <span className="cm-sub">{t.todaviaNo.corto}</span>
        </div>
      </div>

      {(encarga || anula) && (
        <section className="cm-seccion" data-testid="por-llegar">
          <h2 className="cm-titulo"><span>{t.porLlegar.corto}</span>{encarga && <button type="button" className="cm-enlace" onClick={() => irA("deposito/pedidos")}>{t.pedidos.corto} ({porLlegar ? porLlegar.length : "—"})</button>}</h2>
          {porLlegar?.length === 0 && <div className="aviso-suave">{t.nadaPorLlegar.corto}</div>}
          {porLlegar?.map((p) => (
            <div key={p.id} className="cm-tarjeta">
              <span className="cm-ico"><IconoDeDeposito nombre="truck" /></span>
              <span className="cm-texto"><b>{p.proveedor}</b><span className={p.estado === "recibido_parcial" ? "cm-a-medias" : ""}>{p.estado === "recibido_parcial" ? `Llegó a medias · ${faltanDe(p) === 1 ? "falta 1" : `faltan ${faltanDe(p)}`}` : `Enviado${p.enviado_en ? ` el ${fecha(p.enviado_en).slice(0, 5)}` : ""} · ${p.items.length} ${p.items.length === 1 ? "renglón" : "renglones"}`}</span></span>
              {anula && <button type="button" className="cm-llego" onClick={() => irA(`deposito/ingreso?pedido=${p.id}`)} data-testid="llego">{t.llego.corto}</button>}
            </div>
          ))}
        </section>
      )}

      {veCompras && (
        <section className="cm-seccion" data-testid="compras-recientes">
          <h2 className="cm-titulo"><span>{t.comprasRecientes.corto}</span>{(filas?.length ?? 0) > 5 && <button type="button" className="cm-enlace" onClick={() => setTodas((x) => !x)}>{todas ? "Ver menos" : t.verTodas.corto}</button>}</h2>
          {filas?.length === 0 && <div className="aviso-suave">Todavía no hay compras registradas.</div>}
          {visibles.map((c) => {
            const anulada = c.estado === "anulada";
            const abierta = abiertas.has(c.id);
            return (
              <div key={c.id} className={`cm-tarjeta cm-compra ${anulada ? "anulada" : ""}`} data-testid="compra-reciente">
                <div className="cm-fila">
                  <span className="cm-mini">{c.foto ? <VerComprobante ruta={c.foto} /> : <IconoDeDeposito nombre="notebook-pen" />}</span>
                  <button type="button" className="cm-abrir" onClick={() => setAbiertas((s) => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n; })} aria-expanded={abierta}>
                    <span className="cm-texto"><b>{c.proveedor}</b><span className={anulada ? "cm-anulada" : ""}>{fecha(c.fecha).slice(0, 5)} · {nombreDelComprobante(c)}{anulada ? " · anulada" : ""}</span></span>
                    <b className={`cm-importe ${anulada ? "tachado" : ""}`}>{pesosCortos(c.total)}</b>
                  </button>
                </div>
                {abierta && (
                  <div className="cm-detalle">
                    <ul className="cm-items">
                      {c.items.map((i, n) => <li key={n}><span>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}</span><b>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</b></li>)}
                    </ul>
                    {!anulada && anula && <button type="button" className="boton texto" onClick={() => void anular(c)}>Anular esta compra</button>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {anula && (
        <div className="cm-foto">
          <button type="button" className="cm-foto-boton" onClick={() => irA("deposito/ingreso")} data-testid="sacale-foto">
            <IconoDeDeposito nombre="camera" tam={26} /><span><b>{t.sacaleFoto.corto}</b><small>{t.sacaleFotoDetalle.corto}</small></span>
          </button>
          <button type="button" className="cm-escanear" onClick={() => irA("deposito/ingreso")} aria-label="Registrar la compra escaneando"><IconoDeDeposito nombre="scan-barcode" tam={26} /></button>
        </div>
      )}

      {porProveedor && gastos && (
        <Hoja titulo={`${t.estaSemana.corto}: ${pesosCortos(gastos.total)}`} alCerrar={() => setPorProveedor(false)} testId="gastos-por-proveedor">
          {gastos.por_proveedor.length === 0 ? <div className="aviso-suave">En la semana no se registraron compras.</div> : (
            <ul className="cm-items">
              {gastos.por_proveedor.map((g) => <li key={g.proveedor}><span>{g.proveedor} · {g.compras} {Number(g.compras) === 1 ? "compra" : "compras"}</span><b>{pesos(g.total)}</b></li>)}
            </ul>
          )}
        </Hoja>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { subtotalDeRenglon } from "@ferre/calculo-de-precios";
import { api } from "../../api";
import { fecha as fechaLarga } from "../../formato";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Hoja, Icono, Indicador, Pagina, Pastilla, Toast, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/ventas.css";

// Las ventas de un día, como en el cuaderno: cada venta con sus productos, uno por renglón.
export type VentaDia = { id: string; fecha: string; medio_pago: string; total: string; estado: string; cliente: string | null; items: { descripcion: string; cantidad: string; precio_unitario: string }[] };
export type DatosDelDia = { dia?: string; ventas: VentaDia[]; totales: Record<string, number>; total: number };
export const NOMBRE_MEDIO: Record<string, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
const ICONO_MEDIO = { efectivo: "plata", mercado_pago: "celular", tarjeta: "caja", cuenta_corriente: "usuarios" } as const;
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

// `clave` vuelve a pedir las ventas cuando cambia (después de cobrar, por ejemplo).
export function useVentasDelDia(dia: string | null, clave?: unknown) {
  const [datos, setDatos] = useState<DatosDelDia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => api<DatosDelDia>(`/ventas${dia ? `?dia=${dia}` : ""}`)
    .then((d) => { setDatos(d); setError(null); })
    .catch((e: { estado?: number; message: string }) => setError(e.estado ? e.message : "Sin conexión: las ventas del día se ven cuando vuelva internet. Las que cobraste siguen guardadas en este dispositivo.")), [dia]);
  useEffect(() => { void cargar(); }, [cargar, clave]);
  return { datos, error, cargar };
}

export function VentasDeHoy() {
  const [dia, setDia] = useState(hoyLocal);
  const esHoy = dia === hoyLocal();
  const { datos, error, cargar } = useVentasDelDia(esHoy ? null : dia);
  const [porAnular, setPorAnular] = useState<VentaDia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const esCelular = useEsCelular();
  const plegar = (id: string) => setPlegadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const confirmadas = datos?.ventas.filter((v) => v.estado === "confirmada") ?? [];
  const titulo = esHoy ? "Ventas de hoy" : `Ventas del ${fechaLarga(dia)}`;

  return (
    <Pagina titulo={titulo} testId="ventas-de-hoy"
      acciones={
        <div className="fila envuelve">
          <label className="ventas-dia"><span className="solo-lectores">Día que se muestra</span>
            <input type="date" className="entrada" value={dia} max={hoyLocal()} onChange={(e) => e.target.value && setDia(e.target.value)} data-testid="dia" />
          </label>
          {!esHoy && <Boton icono="deshacer" onClick={() => setDia(hoyLocal())}>Volver a hoy</Boton>}
        </div>
      }>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={() => void cargar()}>Reintentar</Boton>}>{error}</Aviso>

      {datos && (
        <div className="indicadores">
          <Indicador rotulo={esHoy ? "Vendido hoy" : "Vendido ese día"} valor={pesosCortos(datos.total)} detalle={`${confirmadas.length} ${confirmadas.length === 1 ? "venta" : "ventas"}`} icono="ganancia" color="ambar" testId="total-del-dia" />
          {Object.keys(NOMBRE_MEDIO).map((m) => (
            <Indicador key={m} rotulo={NOMBRE_MEDIO[m]!} valor={pesosCortos(datos.totales[m] ?? 0)} icono={ICONO_MEDIO[m as keyof typeof ICONO_MEDIO]} />
          ))}
        </div>
      )}
      {!datos && !error && <div className="esqueleto ventas-esqueleto" aria-busy="true" aria-label="Buscando las ventas del día" />}

      {datos && datos.ventas.length === 0 && (
        <Vacio icono="ventas" titulo={esHoy ? "Todavía no hay ventas hoy" : "Ese día no hubo ventas"}
          accion={esHoy ? <Boton variante="principal" icono="vender" onClick={() => irA("vender")}>Ir a vender</Boton> : undefined}>
          {esHoy ? "Cada venta que cobres aparece acá, con sus productos y cómo se pagó." : "Elegí otro día o volvé a hoy."}
        </Vacio>
      )}

      {datos && datos.ventas.length > 0 && (esCelular ? (
        <ul className="lista" data-testid="lista-de-ventas">
          {datos.ventas.map((v) => {
            const anulada = v.estado === "anulada";
            return (
              <li key={v.id} className={`ventas-tarjeta ${anulada ? "anulada" : ""}`} data-testid="venta-dia">
                <div className="fila">
                  <span className="detalle crece">{hora(v.fecha)} · {NOMBRE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</span>
                  {anulada && <Pastilla tipo="mal">anulada</Pastilla>}
                  <strong className="importe chico tachable">{pesosCortos(v.total)}</strong>
                </div>
                <ul className="ventas-renglones">
                  {v.items.map((i, n) => <li key={n} className="tachable"><span>{numero(Number(i.cantidad))} × {i.descripcion}</span><span className="detalle">{pesosCortos(i.precio_unitario)} c/u</span></li>)}
                </ul>
                {!anulada && <Boton tam="chico" variante="peligro" onClick={() => setPorAnular(v)}>Anular</Boton>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="tabla-marco">
          <table className="tabla" data-testid="lista-de-ventas">
            <thead><tr><th className="angosta">Hora</th><th>Productos</th><th className="num">Precio c/u</th><th>Cómo pagó</th><th className="num">Total</th><th className="angosta"><span className="solo-lectores">Acciones</span></th></tr></thead>
            {datos.ventas.map((v) => {
              const anulada = v.estado === "anulada";
              const varios = v.items.length > 1;
              const plegada = plegadas.has(v.id);
              const uno = v.items[0];
              return (
                <tbody key={v.id} data-testid="venta-dia">
                  <tr className={anulada ? "atenuada" : ""}>
                    <td className="angosta">{hora(v.fecha)}</td>
                    <td>
                      {varios ? (
                        <button type="button" className="ventas-pliegue" onClick={() => plegar(v.id)} aria-expanded={!plegada}>
                          <span className={`flecha ${plegada ? "" : "abierta"}`} aria-hidden="true"><Icono nombre="derecha" tam={14} grosor={2.6} /></span>
                          <span className="nombre">{v.items.length} productos</span>
                          {plegada && <span className="detalle corta">{v.items.map((i) => i.descripcion).join(", ")}</span>}
                        </button>
                      ) : <span className="nombre tachable">{numero(Number(uno?.cantidad ?? 0))} × {uno?.descripcion ?? ""}</span>}
                    </td>
                    <td className="num">{varios ? "" : pesosCortos(uno?.precio_unitario)}</td>
                    <td>{NOMBRE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</td>
                    <td className="num"><span className="importe chico tachable">{pesosCortos(v.total)}</span></td>
                    <td className="angosta">{anulada ? <Pastilla tipo="mal">anulada</Pastilla> : <Boton tam="chico" variante="peligro" onClick={() => setPorAnular(v)}>Anular</Boton>}</td>
                  </tr>
                  {varios && !plegada && v.items.map((i, n) => (
                    <tr key={n} className={`hija ${anulada ? "atenuada" : ""}`}>
                      <td />
                      <td className="tachable">{numero(Number(i.cantidad))} × {i.descripcion}</td>
                      <td className="num">{pesosCortos(i.precio_unitario)}</td>
                      <td />
                      <td className="num tachable">{pesosCortos(subtotalDeRenglon({ precioUnitario: Number(i.precio_unitario), cantidad: Number(i.cantidad) }).valor)}</td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      ))}

      {porAnular && <AnularVenta venta={porAnular} alCerrar={() => setPorAnular(null)} alAnular={async () => { setPorAnular(null); setMensaje(`Venta de ${pesosCortos(porAnular.total)} anulada. El stock volvió.`); await cargar(); }} />}
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
    </Pagina>
  );
}

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar.
function AnularVenta({ venta, alCerrar, alAnular }: { venta: VentaDia; alCerrar: () => void; alAnular: () => Promise<void> }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  async function anular() {
    setOcupado(true); setError(null);
    try { await api(`/ventas/${venta.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }); await alAnular(); }
    catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva."); setOcupado(false); }
  }
  return (
    <Hoja titulo={`Anular la venta de ${pesosCortos(venta.total)}`} alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar}>No anular</Boton><Boton variante="peligro" disabled={ocupado} onClick={anular} data-testid="confirmar-anular">{ocupado ? "Anulando…" : "Anular la venta"}</Boton></>}>
      <p>La venta de las {hora(venta.fecha)} queda marcada como anulada y sus productos vuelven al stock. No se puede deshacer.</p>
      <form className="campo" onSubmit={(e) => { e.preventDefault(); void anular(); }}>
        <label htmlFor="motivo-anular" className="rotulo">Motivo, si querés dejarlo anotado</label>
        <input id="motivo-anular" className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: se cobró dos veces" autoComplete="off" data-testid="motivo-anular" />
      </form>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}

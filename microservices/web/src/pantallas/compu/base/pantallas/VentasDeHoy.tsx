import { useState } from "react";
import { usePuede } from "../../../permisos";
import { NOMBRE_DE_MEDIO } from "../../../../negocio/ventas/venta";
import { fueSinConexion, hoyLocal, MOTIVOS_DE_ANULACION, motivoDeAnulacion, SIN_MOTIVO, useAnularVenta, useVentasDelDia, type VentaDelDia } from "../../../../negocio/ventas/ventas-del-dia";
import { fecha as fechaLarga } from "../../../../formato";
import { useEsCelular } from "../vista";
import { irA } from "../rutas";
import { Aviso, Boton, Hoja, Icono, Pagina, Pastilla, Toast, Vacio, hora, numero, pesosCortos } from "../ui";
import "../estilos/ventas.css";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { IconoDeMedio } from "../../../IconoDeMedio";

// Las ventas de un día, como en el cuaderno: cada venta con sus productos, uno por renglón.

// Dos procesos, dos pestañas de Vender (decisión 72): «Hoy» muestra lo vendido en el día, sin
// nada para tocar; «Anular» es para buscar una venta y anularla, de hoy o, con el permiso, de otro día.
export function VentasDeHoy({ modo }: { modo: "hoy" | "anular" }) {
  const puedeEsto = usePuede();
  const [dia, setDia] = useState(hoyLocal);
  const otroDia = modo === "anular" && puedeEsto("ventas.anular_cualquiera");
  const esHoy = dia === hoyLocal();
  // Las de hoy, con «Anular ventas del día»; las de otro día, solo con «de cualquier día».
  const anula = modo === "anular" && (esHoy ? puedeEsto("ventas.anular", "ventas.anular_cualquiera") : puedeEsto("ventas.anular_cualquiera"));
  const { datos, error: fallo, recargar } = useVentasDelDia(dia);
  const error = fallo && (fueSinConexion(fallo) ? "Sin conexión: las ventas del día se ven cuando vuelva internet. Las que cobraste siguen guardadas en este dispositivo." : fallo.message);
  const [porAnular, setPorAnular] = useState<VentaDelDia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [plegadas, setPlegadas] = useState<Set<string>>(new Set());
  const esCelular = useEsCelular();
  const plegar = (id: string) => setPlegadas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const titulo = modo === "anular" ? (esHoy ? "Anular una venta de hoy" : `Anular una venta del ${fechaLarga(dia)}`) : "Ventas de hoy";

  return (
    <Pagina titulo={titulo} testId={modo === "anular" ? "anular-ventas" : "ventas-de-hoy"}
      bajada={modo === "anular" ? "La venta anulada queda marcada y sus productos vuelven al stock. No se puede deshacer." : undefined}
      acciones={otroDia && <AlLadoDeLasPestanas>
        <div className="fila envuelve">
          <label className="ventas-dia"><span className="solo-lectores">Día que se muestra</span>
            <input type="date" className="entrada" value={dia} max={hoyLocal()} onChange={(e) => e.target.value && setDia(e.target.value)} data-testid="dia" />
          </label>
          {!esHoy && <Boton icono="deshacer" onClick={() => setDia(hoyLocal())}>Volver a hoy</Boton>}
        </div>
      </AlLadoDeLasPestanas>
      }>
      <Aviso tipo="error" accion={<Boton tam="chico" onClick={recargar}>Reintentar</Boton>}>{error}</Aviso>

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
                  <span className="detalle crece">{hora(v.fecha)} · {NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}{v.cliente ? ` · ${v.cliente}` : ""}</span>
                  {anulada && <Pastilla tipo="mal">anulada</Pastilla>}
                  <strong className="importe chico tachable">{pesosCortos(v.total)}</strong>
                </div>
                <ul className="ventas-renglones">
                  {v.items.map((i, n) => <li key={n} className="tachable"><span>{numero(Number(i.cantidad))} × {i.descripcion}</span><span className="detalle">{pesosCortos(i.precio_unitario)} c/u</span></li>)}
                </ul>
                {!anulada && anula && <Boton tam="chico" variante="peligro" onClick={() => setPorAnular(v)}>Anular</Boton>}
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
                    <td><span className="ventas-medio"><IconoDeMedio medio={v.medio_pago} tam={16} />{NOMBRE_DE_MEDIO[v.medio_pago] ?? v.medio_pago}</span>{v.cliente ? ` · ${v.cliente}` : ""}</td>
                    <td className="num"><span className="importe chico tachable">{pesosCortos(v.total)}</span></td>
                    <td className="angosta">{anulada ? <Pastilla tipo="mal">anulada</Pastilla> : anula && <Boton tam="chico" variante="peligro" onClick={() => setPorAnular(v)}>Anular</Boton>}</td>
                  </tr>
                  {varios && !plegada && v.items.map((i, n) => (
                    <tr key={n} className={`hija ${anulada ? "atenuada" : ""}`}>
                      <td />
                      <td className="tachable">{numero(Number(i.cantidad))} × {i.descripcion}</td>
                      <td className="num">{pesosCortos(i.precio_unitario)}</td>
                      <td />
                      <td className="num tachable">{pesosCortos(i.subtotal)}</td>
                      <td />
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      ))}

      {porAnular && <AnularVenta venta={porAnular} alCerrar={() => setPorAnular(null)} alAnular={() => { setPorAnular(null); setMensaje(`Venta de ${pesosCortos(porAnular.total)} anulada. El stock volvió.`); }} />}
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
    </Pagina>
  );
}

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar.
function AnularVenta({ venta, alCerrar, alAnular }: { venta: VentaDelDia; alCerrar: () => void; alAnular: () => void }) {
  // El motivo, de una lista que empieza en «Sin motivo», y un comentario (decisión 110).
  const [elegido, setElegido] = useState<string>(SIN_MOTIVO);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { anular: anularVenta, anulando: ocupado } = useAnularVenta();
  async function anular() {
    setError(null);
    try { await anularVenta(venta, motivoDeAnulacion(elegido, comentario)); alAnular(); }
    catch (e) { setError(fueSinConexion(e) ? "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva." : `${(e as Error).message}.`); }
  }
  return (
    <Hoja titulo={`Anular la venta de ${pesosCortos(venta.total)}`} alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar}>No anular</Boton><Boton variante="peligro" disabled={ocupado} onClick={anular} data-testid="confirmar-anular">{ocupado ? "Anulando…" : "Anular la venta"}</Boton></>}>
      <p>La venta de las {hora(venta.fecha)} queda marcada como anulada y sus productos vuelven al stock. No se puede deshacer.</p>
      <form className="campo" onSubmit={(e) => { e.preventDefault(); void anular(); }}>
        <label htmlFor="motivo-anular" className="rotulo">Motivo de la anulación</label>
        <select id="motivo-anular" className="entrada" value={elegido} onChange={(e) => setElegido(e.target.value)} data-testid="motivo-anular">
          {[SIN_MOTIVO, ...MOTIVOS_DE_ANULACION].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label htmlFor="comentario-anular" className="rotulo">Comentario (opcional)</label>
        <input id="comentario-anular" className="entrada" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Ej.: la mecha vino fallada" autoComplete="off" data-testid="comentario-anular" />
      </form>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}

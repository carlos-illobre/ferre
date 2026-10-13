import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { usePuede } from "../permisos";
import { api } from "../../api";
import { fecha, pesos } from "../../formato";
import { Aviso, Boton, Hoja, Icono, Pastilla, Plegable, numero as cifra, pesosCortos } from "./base/ui";
import { useEsCelular } from "./base/vista";
import { mensajeDe, plural, useEnLinea } from "./base/pantallas/deposito-comun";
import "./base/estilos/compras.css";
import { VerComprobante } from "../FotoDeFactura";

type CompraFila = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; foto: string | null; total: string; estado: string; proveedor: string; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[] };

// Las compras recientes van en Cómo va el negocio (decisión 67): sirven para mirar qué se
// compró, no para recibir mercadería. Quien registra ingresos las anula desde acá.
export function ComprasRecientes() {
  const enLinea = useEnLinea();
  const esCelular = useEsCelular();
  const [version, setVersion] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <div className="compras-historia sola">
      <Aviso tipo="ok" testId="compra-anulada">{mensaje}</Aviso>
      <Lista version={version} enLinea={enLinea} esCelular={esCelular} alAnular={(texto) => { setMensaje(texto); setVersion((v) => v + 1); }} />
    </div>
  );
}

const nombreComprobante = (c: CompraFila) => (c.comprobante_tipo === "sin_comprobante" ? "Sin comprobante" : `${c.comprobante_tipo === "factura" ? "Factura" : "Remito"}${c.comprobante_numero ? ` ${c.comprobante_numero}` : ""}`);

// Las últimas compras. Cada una se despliega para ver sus renglones y se puede anular; anular
// no se deshace, por eso pide confirmación con el motivo ahí mismo.
function Lista({ version, enLinea, esCelular, alAnular }: { version: number; enLinea: boolean; esCelular: boolean; alAnular: (mensaje: string) => void }) {
  const anula = usePuede()("deposito.ingresos");
  const [filas, setFilas] = useState<CompraFila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [anulando, setAnulando] = useState<CompraFila | null>(null);
  const cargar = useCallback(() => api<CompraFila[]>("/compras").then((f) => { setFilas(f); setError(null); })
    .catch((e) => setError(mensajeDe(e, "Sin conexión: las compras recientes se ven cuando vuelve internet."))), []);
  useEffect(() => { void cargar(); }, [cargar, version]);
  useEffect(() => { if (enLinea && error) void cargar(); }, [enLinea, error, cargar]);
  const alternar = (id: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Flechas recorren las compras; Supr anula la que tiene el foco.
  function teclas(e: KeyboardEvent<HTMLButtonElement>, c: CompraFila) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const todos = [...(e.currentTarget.closest("table")?.querySelectorAll<HTMLButtonElement>("[data-abre-compra]") ?? [])];
      const destino = todos[todos.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
      if (destino) { e.preventDefault(); destino.focus(); }
    } else if (e.key === "Delete" && c.estado !== "anulada") { e.preventDefault(); setAnulando(c); }
  }

  return (
    <Plegable titulo="Compras recientes" extra={filas?.length ? plural(filas.length, "compra", "compras") : undefined} testId="compras-recientes" relleno={false}>
      <div className="compras-recientes">
        <Aviso tipo="alerta" accion={<Boton tam="chico" icono="repetir" onClick={() => void cargar()}>Reintentar</Boton>}>{error}</Aviso>
        {filas === null && !error && <div className="compras-cargando" aria-busy="true"><span className="solo-lectores">Trayendo las compras…</span><div className="esqueleto" /><div className="esqueleto" /><div className="esqueleto" /></div>}
        {filas?.length === 0 && <p className="detalle compras-sin-compras">No hay compras registradas. La primera aparece acá cuando registres un ingreso de mercadería.</p>}
        {filas && filas.length > 0 && (esCelular ? (
          <ul className="compras-lista">
            {filas.map((c) => {
              const anulada = c.estado === "anulada";
              const abierta = abiertas.has(c.id);
              return (
                <li key={c.id} className={anulada ? "anulada" : ""} data-testid="compra-reciente">
                  <button type="button" className="renglon" onClick={() => alternar(c.id)} aria-expanded={abierta}>
                    <span className="nombre">{c.proveedor}</span>
                    <span className="importe chico tachable">{pesosCortos(c.total)}</span>
                    <span className="detalle compras-linea">
                      <span className={`compras-flecha ${abierta ? "abierta" : ""}`} aria-hidden="true"><Icono nombre="derecha" tam={14} grosor={2.6} /></span>
                      <span className="crece">{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}{anulada && <> <Pastilla tipo="mal">Anulada</Pastilla></>}</span>
                    </span>
                  </button>
                  {abierta && (
                    <div className="compras-abierta">
                      <ul className="compras-items">
                        {c.items.map((i, n) => (
                          <li key={n}><span>{cifra(Number(i.cantidad))} × {i.descripcion}<span className="detalle"> · {pesos(i.costo_unitario)} c/u</span></span><strong>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></li>
                        ))}
                      </ul>
                      {!anulada && anula && <Boton variante="peligro" icono="basura" onClick={() => setAnulando(c)} data-testid="anular">Anular esta compra</Boton>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <table className="tabla compras-tabla-recientes">
              <thead><tr><th><span className="solo-lectores">Ver renglones</span></th><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th className="num">Renglones</th><th className="num">Total</th><th><span className="solo-lectores">Anular</span></th></tr></thead>
              {filas.map((c) => {
                const anulada = c.estado === "anulada";
                const abierta = abiertas.has(c.id);
                return (
                  <tbody key={c.id} data-testid="compra-reciente">
                    <tr className={`elegible ${anulada ? "atenuada" : ""}`} onClick={() => alternar(c.id)}>
                      <td className="angosta">
                        <button type="button" className={`compras-flecha ${abierta ? "abierta" : ""}`} data-abre-compra onClick={(e) => { e.stopPropagation(); alternar(c.id); }} onKeyDown={(e) => teclas(e, c)} aria-expanded={abierta}
                          aria-label={`${abierta ? "Plegar" : "Ver"} los renglones de la compra a ${c.proveedor} del ${fecha(c.fecha)}`} aria-keyshortcuts={anulada ? undefined : "Delete"}>
                          <Icono nombre="derecha" tam={14} grosor={2.6} />
                        </button>
                      </td>
                      <td>{fecha(c.fecha)}</td>
                      <td className="nombre">{c.proveedor}</td>
                      <td className="compras-sin-corte">{nombreComprobante(c)}{c.foto ? <> <VerComprobante ruta={c.foto} texto="Ver foto" /></> : c.comprobante_tipo !== "sin_comprobante" && !c.comprobante_numero ? <span className="detalle"> · sin foto</span> : null}</td>
                      <td className="num">{c.renglones}</td>
                      <td className="num"><span className="importe chico tachable">{pesosCortos(c.total)}</span></td>
                      <td className="angosta">{anulada ? <Pastilla tipo="mal">Anulada</Pastilla> : anula && <Boton tam="chico" variante="peligro" onClick={(e) => { e.stopPropagation(); setAnulando(c); }} data-testid="anular">Anular</Boton>}</td>
                    </tr>
                    {abierta && c.items.map((i, n) => (
                      <tr key={n} className="hija">
                        <td />
                        <td colSpan={3}>{cifra(Number(i.cantidad))} × {i.descripcion}</td>
                        <td className="num detalle">{pesos(i.costo_unitario)} c/u</td>
                        <td className="num">{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
            <p className="detalle compras-ayuda-teclas">Con el foco en una compra: flechas para recorrer, Enter muestra sus renglones, Supr la anula.</p>
          </>
        ))}
      </div>
      {anulando && <AnularCompra compra={anulando} enLinea={enLinea} alCerrar={() => setAnulando(null)} alAnular={() => { const c = anulando; setAnulando(null); alAnular(`Compra a ${c.proveedor} por ${pesosCortos(c.total)} anulada: el stock que había sumado se descontó.`); }} />}
    </Plegable>
  );
}

function AnularCompra({ compra: c, enLinea, alCerrar, alAnular }: { compra: CompraFila; enLinea: boolean; alCerrar: () => void; alAnular: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function anular() {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try {
      await api(`/compras/${c.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) });
      alAnular();
    } catch (e) {
      setError(mensajeDe(e, "No se anuló: se cortó la conexión. Probá de nuevo cuando vuelva internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo="¿Anular esta compra?" alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar} disabled={ocupado}>No anular</Boton><Boton variante="peligro" icono="basura" onClick={() => void anular()} disabled={ocupado || !enLinea} data-testid="anular-confirmar">{ocupado ? "Anulando…" : "Anular la compra"}</Boton></>}>
      <div className="compras-anular-que">
        <strong>{c.proveedor}</strong><span className="importe">{pesosCortos(c.total)}</span>
        <span className="detalle">{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}</span>
      </div>
      <p>El stock que sumó esta compra se descuenta, con un ajuste por cada renglón, y deja de contar en los gastos de la semana de Cómo va el negocio. El costo que dejó el comprobante no cambia. <strong>No se puede deshacer.</strong></p>
      <label className="campo"><span>Motivo (opcional)</span><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Se cargó dos veces…" maxLength={200} autoFocus data-testid="motivo-anular" /></label>
      <Aviso tipo="alerta">{!enLinea ? "Sin conexión: anular una compra necesita internet." : null}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}


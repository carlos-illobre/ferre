import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import { conUnidad } from "../../unidades";
import { usePuede } from "../permisos";
import { anularCompra, esDeLaSemana, letrasDeLaSemana, faltanDe, gastoPorDia, useComprasRecientes, useGastosDeLaSemana, usePedidosPorLlegar, type CompraFila, type Gastos } from "../../negocio/compras";
import { useTeclasGlobales } from "../../plataforma/teclado/teclas";
import { fecha, pesos } from "../../formato";
import { Aviso, Boton, Explicado, Hoja, pesosCortos } from "./base/ui";
import { irA } from "./base/rutas";
import { mensajeDe, plural, useEnLinea } from "./base/pantallas/deposito-comun";
import { AlLadoDeLasPestanas } from "../AlLadoDeLasPestanas";
import { IconoDeDeposito } from "../IconoDeDeposito";
import { TEXTOS } from "../textos";
import "./base/estilos/compras.css";
import "./base/estilos/compras-v2.css";
import { VerComprobante } from "../FotoDeFactura";

// Compras, como la v2 («El escritorio de compras», decisión 148). Van en Cómo va el negocio
// (decisión 67): sirven para mirar qué se compró, no para recibir mercadería. Arriba lo gastado en
// la semana con sus barras por día (con «Ver los gastos»), los pedidos por llegar y lo que se les
// debe; debajo las compras recientes (con «Ver las compras»), que se abren para ver sus renglones
// y se anulan con «Registrar ingresos»; a la derecha la foto de la factura, lo que está por llegar
// y lo que vence primero. Teclas: flechas recorren las compras, Enter abre, Supr anula; Alt N
// registra una compra y Alt P arma un pedido.
type Filtro = "semana" | "anuladas" | null;
const t = TEXTOS.compras;

export function ComprasRecientes() {
  const puede = usePuede();
  const veGastos = puede("negocio.gastos");
  const veCompras = puede("deposito.compras");
  const registra = puede("deposito.ingresos");
  const encarga = puede("deposito.pedidos");
  const enLinea = useEnLinea();
  const gastos = useGastosDeLaSemana();
  const compras = useComprasRecientes();
  const { porLlegar } = usePedidosPorLlegar(encarga || registra);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector("dialog[open]") || !e.altKey) return;
    if (e.code === "KeyN" && registra) { e.preventDefault(); irA("ingreso"); }
    else if (e.code === "KeyP" && encarga) { e.preventDefault(); irA("pedidos"); }
  }, [registra, encarga]);
  useTeclasGlobales(teclas);

  return (
    <div className="cv">
      <AlLadoDeLasPestanas>
        <div className="cv-acciones">
          {encarga && <Boton tam="chico" onClick={() => irA("pedidos")} data-testid="armar-pedido"><IconoDeDeposito nombre="send" tam={16} />{t.armarPedido.largo} <kbd className="tecla">Alt P</kbd></Boton>}
          {registra && <Boton tam="chico" variante="principal" className="cv-registrar" onClick={() => irA("ingreso")} data-testid="registrar-compra"><IconoDeDeposito nombre="camera" tam={16} />{t.registrarCompra.largo} <kbd className="tecla">Alt N</kbd></Boton>}
        </div>
      </AlLadoDeLasPestanas>
      <Aviso tipo="ok" testId="compra-anulada">{mensaje}</Aviso>

      <div className="cv-resumenes">
        {veGastos && <EstaSemana gastos={gastos.datos} compras={compras.datos} error={gastos.error ? mensajeDe(gastos.error, "Se ve cuando vuelva internet") : null} />}
        <div className="cv-resumen" data-testid="pedidos-por-llegar">
          <span className="cv-ico"><IconoDeDeposito nombre="truck" /></span>
          <span><span className="cv-et">{t.pedidosPorLlegar.largo}</span><span className="cv-va">{porLlegar ? porLlegar.length : "—"}</span>
            <span className="cv-sub">{porLlegar ? plural(porLlegar.filter((p) => p.estado === "recibido_parcial").length, "llegó a medias", "llegaron a medias") : "—"}</span></span>
        </div>
        <div className="cv-resumen" data-testid="se-les-debe">
          <span className="cv-ico"><IconoDeDeposito nombre="landmark" /></span>
          <span><span className="cv-et">{t.seLesDebe.largo}</span><span className="cv-va">—</span><span className="cv-sub">{t.todaviaNo.corto}</span></span>
        </div>
        <div className="cv-resumen error" data-testid="vencido">
          <span className="cv-ico"><IconoDeDeposito nombre="triangle-alert" /></span>
          <span><span className="cv-et">{t.vencido.largo}</span><span className="cv-va">—</span><span className="cv-sub">{t.todaviaNo.corto}</span></span>
        </div>
      </div>

      <div className="cv-cuerpo">
        {veCompras ? <Recientes compras={compras} gastos={gastos.datos} enLinea={enLinea} alAnular={setMensaje} /> : <div />}
        <aside className="cv-costado">
          <section className="cv-tarjeta cv-foto" aria-labelledby="cv-foto-titulo">
            <div className="cv-foto-arriba">
              <span className="cv-qr" aria-hidden="true"><IconoDeDeposito nombre="qr-code" tam={40} grosor={1.5} /></span>
              <div><h2 id="cv-foto-titulo">{t.sacaleFoto.largo}</h2><p className="detalle">{t.sacaleFotoDetalle.largo}</p></div>
            </div>
            <div className="cv-foto-botones">
              <Boton tam="chico" disabled={!registra} onClick={() => irA("ingreso")}><IconoDeDeposito nombre="image" tam={16} />{t.elegirArchivo.largo}</Boton>
              <Boton tam="chico" disabled={!registra} onClick={() => irA("ingreso")}><IconoDeDeposito nombre="keyboard" tam={16} />{t.cargarAMano.largo}</Boton>
            </div>
          </section>
          <section className="cv-tarjeta" aria-labelledby="cv-llegar" data-testid="por-llegar">
            <h2 id="cv-llegar" className="cv-tarjeta-titulo"><IconoDeDeposito nombre="truck" tam={18} />{t.porLlegar.largo}</h2>
            {porLlegar === null ? <p className="detalle">—</p> : porLlegar.length === 0 ? <p className="detalle">{t.nadaPorLlegar.largo}</p> : (
              <ul className="cv-renglones">
                {porLlegar.slice(0, 3).map((p) => (
                  <li key={p.id}>
                    <span className="cv-ico-chico"><IconoDeDeposito nombre="clipboard-list" tam={18} /></span>
                    <span className="cv-texto"><b>{p.proveedor}</b><span className={p.estado === "recibido_parcial" ? "cv-a-medias" : ""}>{p.estado === "recibido_parcial" ? `Llegó a medias · ${faltanDe(p) === 1 ? "falta 1" : `faltan ${faltanDe(p)}`}` : `Enviado${p.enviado_en ? ` el ${fecha(p.enviado_en).slice(0, 5)}` : ""} · ${plural(p.items.length, "renglón", "renglones")}`}</span></span>
                    {registra && <Boton tam="chico" className="cv-llego" onClick={() => irA(`ingreso?pedido=${p.id}`)} data-testid="llego">{t.llego.largo}</Boton>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="cv-tarjeta" aria-labelledby="cv-vence" data-testid="vence-primero">
            <h2 id="cv-vence" className="cv-tarjeta-titulo"><IconoDeDeposito nombre="landmark" tam={18} />{t.vencePrimero.largo}</h2>
            <p className="detalle">— {t.todaviaNo.largo}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

// Lo gastado en la semana, con su cuenta por proveedor y sus barras por día.
function EstaSemana({ gastos, compras, error }: { gastos: Gastos | null; compras: CompraFila[] | null; error: string | null }) {
  const dias = gastoPorDia(gastos, compras);
  const mayor = Math.max(1, ...(dias ?? []).map((d) => d.total));
  const cuantas = gastos ? gastos.por_proveedor.reduce((s, p) => s + Number(p.compras), 0) : 0;
  const anuladas = (compras ?? []).filter((c) => c.estado === "anulada" && esDeLaSemana(c, gastos)).length;
  const hasta = gastos ? new Date(new Date(`${gastos.desde}T00:00:00`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10) : null;
  const periodo = gastos ? `del ${fecha(gastos.desde).slice(0, 5)} al ${fecha(hasta).slice(0, 5)}` : "";
  const pasos = gastos ? [...(gastos.por_proveedor.length ? gastos.por_proveedor.map((p) => `${p.proveedor}, ${plural(Number(p.compras), "compra", "compras")}: ${pesos(p.total)}`) : ["En la semana no se registraron compras"]), `Gastos de la semana (${periodo}): ${pesos(gastos.total)}`] : [];
  return (
    <div className="cv-resumen cv-semana" data-testid="indicador-gastos">
      <span><span className="cv-et">{t.estaSemana.largo}</span>
        <span className="cv-va">{gastos ? <Explicado valor={pesosCortos(gastos.total)} etiqueta="Gastos de la semana" titulo="De dónde salen los gastos de la semana" pasos={pasos} /> : "—"}</span>
        <span className="cv-sub" data-testid="gastos-semana">{error ?? (gastos ? `${plural(cuantas, "compra", "compras")}${anuladas ? ` · ${plural(anuladas, "anulada", "anuladas")}` : ""}` : "Trayendo el dato…")}</span></span>
      <span className="cv-barras" aria-hidden="true">
        {letrasDeLaSemana(gastos).map((letra, i) => (
          <span key={i} className={`cv-barra ${i === 6 ? "hoy" : ""}`}><i style={{ height: dias ? Math.max(4, (dias[i]!.total / mayor) * 34) : 4 }} /><small>{letra}</small></span>
        ))}
      </span>
    </div>
  );
}

const nombreComprobante = (c: CompraFila) => (c.comprobante_tipo === "sin_comprobante" ? "Sin comprobante" : `${c.comprobante_tipo === "factura" ? "Factura" : "Remito"}${c.comprobante_numero ? ` ${c.comprobante_numero}` : ""}`);

// Las últimas compras, con la miniatura de su comprobante. Cada una se abre para ver sus renglones
// y se puede anular; anular no se deshace, por eso pide confirmación con el motivo ahí mismo.
function Recientes({ compras, gastos, enLinea, alAnular }: { compras: ReturnType<typeof useComprasRecientes>; gastos: Gastos | null; enLinea: boolean; alAnular: (mensaje: string) => void }) {
  const anula = usePuede()("deposito.ingresos");
  const filas = compras.datos;
  const error = compras.error ? mensajeDe(compras.error, "Sin conexión: las compras recientes se ven cuando vuelve internet.") : null;
  const deLaSemana = useMemo(() => (filas ?? []).filter((c) => esDeLaSemana(c, gastos)), [filas, gastos]);
  const anuladas = useMemo(() => (filas ?? []).filter((c) => c.estado === "anulada"), [filas]);
  const [filtro, setFiltro] = useState<Filtro | "inicio">("inicio");
  // De entrada, las de la semana; si en la semana no hubo ninguna, todas.
  const actual: Filtro = filtro === "inicio" ? (deLaSemana.length ? "semana" : null) : filtro;
  const visibles = actual === "semana" ? deLaSemana : actual === "anuladas" ? anuladas : (filas ?? []);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [anulando, setAnulando] = useState<CompraFila | null>(null);
  const alternar = (id: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const elegir = (f: Filtro) => setFiltro(actual === f ? null : f);

  // Flechas recorren las compras; Supr anula la que tiene el foco.
  function teclas(e: KeyboardEvent<HTMLButtonElement>, c: CompraFila) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const todos = [...(e.currentTarget.closest("ul")?.querySelectorAll<HTMLButtonElement>("[data-abre-compra]") ?? [])];
      const destino = todos[todos.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
      if (destino) { e.preventDefault(); destino.focus(); }
    } else if (e.key === "Delete" && c.estado !== "anulada" && anula) { e.preventDefault(); setAnulando(c); }
  }

  return (
    <section className="cv-recientes" aria-labelledby="cv-recientes" data-testid="compras-recientes">
      <div className="cv-recientes-cab">
        <h2 id="cv-recientes">{t.comprasRecientes.largo}</h2>
        <div className="cv-chips" role="group" aria-label="Qué compras mostrar">
          <button type="button" className={`cv-chip ${actual === "semana" ? "elegido" : ""}`} aria-pressed={actual === "semana"} onClick={() => elegir("semana")}>{t.estaSemana.largo} ({deLaSemana.length})</button>
          <button type="button" className="cv-chip" disabled title={t.todaviaNo.largo}>{t.sinPagar.largo} (—)</button>
          <button type="button" className={`cv-chip ${actual === "anuladas" ? "elegido" : ""}`} aria-pressed={actual === "anuladas"} onClick={() => elegir("anuladas")}>{t.anuladas.largo} ({anuladas.length})</button>
        </div>
      </div>
      <Aviso tipo="alerta" accion={<Boton tam="chico" icono="repetir" onClick={compras.recargar}>Reintentar</Boton>}>{error}</Aviso>
      {filas === null && !error && <div className="compras-cargando" aria-busy="true"><span className="solo-lectores">Trayendo las compras…</span><div className="esqueleto" /><div className="esqueleto" /><div className="esqueleto" /></div>}
      {filas?.length === 0 && <p className="detalle">No hay compras registradas. La primera aparece acá cuando registres un ingreso de mercadería.</p>}
      {filas && filas.length > 0 && visibles.length === 0 && <p className="detalle">Ninguna compra con este filtro.</p>}
      {visibles.length > 0 && (
        <ul className="cv-lista">
          {visibles.map((c) => {
            const anulada = c.estado === "anulada";
            const abierta = abiertas.has(c.id);
            return (
              <li key={c.id} className={`cv-compra ${anulada ? "anulada" : ""} ${abierta ? "abierta" : ""}`} data-testid="compra-reciente">
                <div className="cv-fila">
                  <span className="cv-mini">{c.foto ? <VerComprobante ruta={c.foto} /> : <IconoDeDeposito nombre="notebook-pen" />}</span>
                  <button type="button" className="cv-abrir" data-abre-compra onClick={() => alternar(c.id)} onKeyDown={(e) => teclas(e, c)} aria-expanded={abierta}
                    aria-label={`${abierta ? "Plegar" : "Ver"} los renglones de la compra a ${c.proveedor} del ${fecha(c.fecha)}`} aria-keyshortcuts={anulada ? undefined : "Delete"}>
                    <span className="cv-texto"><b>{c.proveedor}</b><span>{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}</span></span>
                    <span className="cv-importe"><b className={anulada ? "tachado" : ""}>{pesosCortos(c.total)}</b><small>{anulada ? t.noSuma.largo : t.sinIva.largo}</small></span>
                    <span className="cv-estado">{anulada && <span className="cv-pastilla error"><IconoDeDeposito nombre="ban" tam={16} />{t.anulada.largo}</span>}</span>
                    <IconoDeDeposito nombre="chevron-right" className="cv-flecha" />
                  </button>
                </div>
                {abierta && (
                  <div className="cv-detalle">
                    <ul className="cv-items">
                      {c.items.map((i, n) => (
                        <li key={n}><span>{conUnidad(i.cantidad, i.unidad)} {i.descripcion}<span className="detalle"> · {pesos(i.costo_unitario)} c/u</span></span><strong>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></li>
                      ))}
                    </ul>
                    {!anulada && anula && <Boton tam="chico" variante="peligro" icono="basura" onClick={() => setAnulando(c)} data-testid="anular">Anular esta compra</Boton>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {anulando && <AnularCompra compra={anulando} enLinea={enLinea} alCerrar={() => setAnulando(null)} alAnular={() => { const c = anulando; setAnulando(null); alAnular(`Compra a ${c.proveedor} por ${pesosCortos(c.total)} anulada: el stock que había sumado se descontó.`); }} />}
    </section>
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
      await anularCompra(c.id, motivo);
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

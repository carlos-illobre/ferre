import { useCallback, useEffect, useState, type FormEvent } from "react";
import { guardar, leerTodo } from "../../almacen";
import { api, ErrorApi } from "../../api";
import { alCambiarLaCola, enviarOEncolar, pendientes, type Cambio } from "../../cola";
import { useConexion } from "../conexion";
import { dia as diaEnPalabras, hora, MEDIOS_DE_PAGO, numero, pesos } from "../formato";
import { Aviso, avisar, Boton, Campo, Cargando, clases, Confirmar, ErrorDeCarga, Icono, Pagina, Pastilla, Tarjeta, Vacio } from "../piezas";
import { cambiarParametro, ir, useParametro } from "../rutas";
import "../estilos/ventas.css";

// Las ventas de un día, como en el cuaderno: cada venta con sus productos, uno por renglón.
// Con internet salen del servidor; sin internet, de lo que este dispositivo tiene guardado
// (lo último que se vio y las ventas cobradas acá en los últimos 7 días).

type ItemDeVenta = { descripcion: string; cantidad: string | number; precio_unitario: string | number };
export type VentaDelDia = { id: string; fecha: string; medio_pago: string; total: string | number; estado: string; cliente: string | null; items: ItemDeVenta[] };
type DatosDelDia = { dia?: string; ventas: VentaDelDia[] };
/** La copia que «Vender» deja en el dispositivo al cobrar. `anulada` la suma esta pantalla. */
type VentaGuardada = { id: string; fecha: string; total: number; medio_pago: string; items: ItemDeVenta[]; anulada?: boolean };
type VentaEnPantalla = VentaDelDia & { porEnviar: boolean; anulacionPorEnviar: boolean };

const TIPO_DE_ANULACION = "venta.anulacion";

/** El día de un momento como lo escribe `<input type="date">`: "2026-10-10". */
function claveDe(momento: Date): string {
  return `${momento.getFullYear()}-${String(momento.getMonth() + 1).padStart(2, "0")}-${String(momento.getDate()).padStart(2, "0")}`;
}

/** "Viernes 9 de octubre". */
function diaConNombre(clave: string): string {
  const texto = new Date(`${clave}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const esDia = (texto: string | null): texto is string => texto !== null && /^\d{4}-\d{2}-\d{2}$/.test(texto);

/** Lo que espera en la cola: ventas cobradas sin conexión y anulaciones que todavía no salieron. */
function leerCola(cola: Cambio[]) {
  const ventas = new Set<string>();
  const anulaciones = new Set<string>();
  for (const c of cola) {
    if (c.tipo === "venta") ventas.add((c.cuerpo as { id: string }).id);
    else if (c.tipo === TIPO_DE_ANULACION) anulaciones.add(c.ruta.split("/")[2] ?? "");
  }
  return { ventas, anulaciones };
}

// ---------------------------------------------------------------- Pantalla

export function VentasDelDia() {
  const { enLinea, porEnviar } = useConexion();
  const hoy = claveDe(new Date());
  const pedido = useParametro("dia");
  const diaElegido = esDia(pedido) && pedido <= hoy ? pedido : hoy;
  const esHoy = diaElegido === hoy;

  const [delServidor, setDelServidor] = useState<{ dia: string; ventas: VentaDelDia[] } | null>(null);
  const [guardadas, setGuardadas] = useState<VentaGuardada[]>([]);
  const [cola, setCola] = useState<Cambio[]>([]);
  const [error, setError] = useState<string | null>(null);
  /** El servidor no respondió aunque el dispositivo diga que hay internet. */
  const [sinRespuesta, setSinRespuesta] = useState(false);
  const [intento, setIntento] = useState(0);
  const [porAnular, setPorAnular] = useState<VentaEnPantalla | null>(null);

  const leerDelDispositivo = useCallback(() => {
    leerTodo<VentaGuardada>("ventas").then(setGuardadas).catch(() => undefined);
    pendientes().then(setCola).catch(() => undefined);
  }, []);
  useEffect(() => { leerDelDispositivo(); return alCambiarLaCola(leerDelDispositivo); }, [leerDelDispositivo]);

  // Se vuelven a pedir al cambiar de día, al volver internet y cuando termina de salir lo pendiente.
  const todoEnviado = porEnviar === 0;
  useEffect(() => {
    if (!enLinea) return;
    let vigente = true;
    setError(null);
    api<DatosDelDia>(`/ventas${esHoy ? "" : `?dia=${diaElegido}`}`)
      .then((d) => { if (vigente) { setDelServidor({ dia: diaElegido, ventas: d.ventas }); setSinRespuesta(false); } })
      .catch((e: unknown) => {
        if (!vigente) return;
        if (e instanceof ErrorApi) setError(e.message);
        else setSinRespuesta(true);
      });
    return () => { vigente = false; };
  }, [diaElegido, esHoy, enLinea, todoEnviado, intento]);

  const sinRed = !enLinea || sinRespuesta;
  const vistas = delServidor?.dia === diaElegido ? delServidor.ventas : null;
  const enCola = leerCola(cola);
  const anuladasAca = new Set(guardadas.filter((g) => g.anulada).map((g) => g.id));

  // Lo del servidor más lo cobrado acá que el servidor todavía no tiene.
  const deAca: VentaDelDia[] = guardadas
    .filter((g) => claveDe(new Date(g.fecha)) === diaElegido && !vistas?.some((v) => v.id === g.id) && (vistas === null || enCola.ventas.has(g.id)))
    .map((g) => ({ id: g.id, fecha: g.fecha, medio_pago: g.medio_pago, total: g.total, estado: "confirmada", cliente: null, items: g.items }));
  const ventas: VentaEnPantalla[] | null = vistas === null && !sinRed ? null : [...deAca, ...(vistas ?? [])]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((v) => {
      const anulacionPorEnviar = v.estado !== "anulada" && enCola.anulaciones.has(v.id);
      const anulada = v.estado === "anulada" || anulacionPorEnviar || (sinRed && anuladasAca.has(v.id));
      return { ...v, estado: anulada ? "anulada" : v.estado, anulacionPorEnviar, porEnviar: enCola.ventas.has(v.id) };
    });

  const confirmadas = (ventas ?? []).filter((v) => v.estado !== "anulada");
  const total = confirmadas.reduce((suma, v) => suma + Number(v.total), 0);
  const porMedio = (medio: string) => confirmadas.filter((v) => v.medio_pago === medio).reduce((suma, v) => suma + Number(v.total), 0);

  function alAnular(venta: VentaEnPantalla, encolada: boolean) {
    setPorAnular(null);
    setDelServidor((d) => d && { ...d, ventas: d.ventas.map((v) => (v.id === venta.id && !encolada ? { ...v, estado: "anulada" } : v)) });
    // La copia del dispositivo también queda anulada: es la que se ve sin conexión.
    const copia = guardadas.find((g) => g.id === venta.id);
    if (copia) guardar("ventas", { ...copia, anulada: true }).then(leerDelDispositivo).catch(() => undefined);
    else leerDelDispositivo();
    if (encolada) avisar(`Venta de ${pesos(venta.total)} anulada en este dispositivo`, { tipo: "alerta", detalle: "Se envía sola cuando vuelva internet." });
    else avisar(`Venta de ${pesos(venta.total)} anulada`, { detalle: "La mercadería volvió al stock." });
  }

  const elegirDia = (clave: string) => cambiarParametro("dia", clave === hoy ? null : clave);

  return (
    <Pagina titulo="Ventas del día" testId="ventas-de-hoy">
      <div className="ventas__dia">
        <h2 data-testid="dia-en-palabras">{esHoy ? `Hoy, ${diaEnPalabras(new Date())}` : diaConNombre(diaElegido)}</h2>
        <div className="ventas__dia-acciones">
          {!esHoy && <Boton tam="chico" icono="deshacer" onClick={() => elegirDia(hoy)} data-testid="volver-a-hoy">Volver a hoy</Boton>}
          <label className="ventas__fecha">
            <Icono nombre="calendario" tam={20} />
            <span>Ver otro día</span>
            <input type="date" value={diaElegido} max={hoy} onChange={(e) => { if (e.target.value) elegirDia(e.target.value); }} data-testid="dia" />
          </label>
        </div>
      </div>

      {sinRed && !error && (
        <Aviso tipo="alerta" testId="aviso-sin-conexion" accion={enLinea ? { texto: "Reintentar", alTocar: () => setIntento((n) => n + 1) } : undefined}>
          Se ven las ventas guardadas en este dispositivo: pueden no estar todas. Si anulás una, queda anulada acá y se envía sola cuando vuelva internet.
        </Aviso>
      )}

      {error && (
        <ErrorDeCarga titulo="No se pudieron traer las ventas" alReintentar={() => setIntento((n) => n + 1)}>
          {error}. Probá de nuevo. Las ventas que cobraste siguen guardadas.
        </ErrorDeCarga>
      )}
      {!error && ventas === null && <Cargando texto="Buscando las ventas…" />}

      {!error && ventas !== null && (
        <>
          {ventas.length > 0 && (
            <Tarjeta variante="verde" className="ventas__total">
              <div className="ventas__vendido">
                <p>{esHoy ? "Vendido hoy" : "Vendido ese día"}</p>
                <strong className="cifra" data-testid="total-del-dia">{pesos(total)}</strong>
                <span>{confirmadas.length === 1 ? "1 venta" : `${confirmadas.length} ventas`}</span>
              </div>
              <dl className="ventas__medios">
                {MEDIOS_DE_PAGO.map((m) => (
                  <div key={m.clave} className={`ventas__medio ventas__medio--${m.clave.replace("_", "-")}`} data-testid={`total-${m.clave}`}>
                    <dt>{m.nombre}</dt>
                    <dd className="cifra">{pesos(porMedio(m.clave))}</dd>
                  </div>
                ))}
              </dl>
            </Tarjeta>
          )}

          {ventas.length === 0 && (sinRed && !esHoy ? (
            <Vacio icono="sin-conexion" titulo="Ese día no está guardado en este dispositivo" testId="sin-ventas">Se va a ver cuando vuelva internet.</Vacio>
          ) : sinRed ? (
            <Vacio icono="ventas" titulo="No hay ventas de hoy guardadas en este dispositivo" testId="sin-ventas">Las que se cobraron en otro dispositivo se van a ver cuando vuelva internet.</Vacio>
          ) : esHoy ? (
            <Vacio icono="ventas" titulo="Todavía no hay ventas hoy" principal={{ texto: "Ir a vender", icono: "vender", alTocar: () => ir("vender") }} testId="sin-ventas">Cada venta que cobres aparece acá, con sus productos y cómo se pagó.</Vacio>
          ) : (
            <Vacio icono="ventas" titulo="Ese día no hubo ventas" testId="sin-ventas">Elegí otro día o volvé a hoy.</Vacio>
          ))}

          {ventas.length > 0 && (
            <ul className="ventas__lista" data-testid="lista-de-ventas">
              {ventas.map((v) => <UnaVenta key={v.id} venta={v} alAnular={() => setPorAnular(v)} />)}
            </ul>
          )}
        </>
      )}

      <AnularVenta venta={porAnular} alCerrar={() => setPorAnular(null)} alAnular={alAnular} alRechazar={() => setIntento((n) => n + 1)} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Una venta

/** "2 × Cinta aisladora negra 20 m". */
const lineaDe = (i: ItemDeVenta) => `${numero(i.cantidad)} × ${i.descripcion}`;

function UnaVenta({ venta: v, alAnular }: { venta: VentaEnPantalla; alAnular: () => void }) {
  const medio = MEDIOS_DE_PAGO.find((m) => m.clave === v.medio_pago);
  const anulada = v.estado === "anulada";
  return (
    <li className={clases("ventas__venta", anulada && "ventas__venta--anulada")} data-testid="venta-dia">
      <time className="ventas__hora cifra" dateTime={v.fecha}>{hora(v.fecha)}</time>
      <div className="ventas__que">
        <ul className="ventas__productos">
          {v.items.map((i, n) => <li key={n}>{lineaDe(i)}</li>)}
        </ul>
        <p className="ventas__pago">
          {v.cliente && medio ? `${medio.frase} de ${v.cliente}` : medio?.frase ?? v.medio_pago}
          {v.porEnviar && !anulada && <Pastilla tipo="alerta" icono="sin-conexion" testId="por-enviar">Por enviar</Pastilla>}
        </p>
      </div>
      <strong className="ventas__importe cifra">{pesos(v.total)}</strong>
      <div className="ventas__accion">
        {anulada
          ? <Pastilla tipo="error" icono={v.anulacionPorEnviar ? "sin-conexion" : undefined} testId="anulada">{v.anulacionPorEnviar ? "Anulada · por enviar" : "Anulada"}</Pastilla>
          : <Boton tam="chico" aria-label={`Anular la venta de las ${hora(v.fecha)}, de ${pesos(v.total)}`} onClick={alAnular} data-testid="anular">Anular</Boton>}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- Anular

type PropsDeAnular = {
  venta: VentaEnPantalla | null;
  alCerrar: () => void;
  alAnular: (venta: VentaEnPantalla, encolada: boolean) => void;
  /** El servidor no la dejó anular (ya estaba anulada): hay que volver a pedir las ventas. */
  alRechazar: () => void;
};

// Anular no se puede deshacer: es de las pocas acciones que piden confirmar. Sin conexión
// queda en la cola y sale sola, detrás de la venta si esa tampoco salió.
function AnularVenta({ venta, alCerrar, alAnular, alRechazar }: PropsDeAnular) {
  const [motivo, setMotivo] = useState("");
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = venta?.id;
  useEffect(() => { setMotivo(""); setRechazo(null); setOcupado(false); }, [id]);

  async function anular(e?: FormEvent) {
    e?.preventDefault();
    if (!venta || ocupado) return;
    setOcupado(true);
    setRechazo(null);
    try {
      const { encolado } = await enviarOEncolar(TIPO_DE_ANULACION, "POST", `/ventas/${venta.id}/anular`, { motivo: motivo.trim() });
      alAnular(venta, encolado);
    } catch (error) {
      if (!(error instanceof ErrorApi)) throw error;
      setRechazo(error.message);
      alRechazar();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Confirmar
      abierta={venta !== null}
      titulo={`¿Anular la venta de ${pesos(venta?.total ?? 0)}?`}
      confirmar={ocupado ? "Anulando…" : "Sí, anular"}
      cancelar="No anular"
      ocupado={ocupado}
      alCancelar={alCerrar}
      alConfirmar={() => void anular()}
      testId="hoja-anular"
    >
      {venta && (
        <>
          <p>La venta de las {hora(venta.fecha)} queda marcada como anulada y la mercadería vuelve al stock. No se puede deshacer.</p>
          <ul className="ventas__productos ventas__productos--en-hoja">
            {venta.items.map((i, n) => <li key={n}>{lineaDe(i)}</li>)}
          </ul>
          <form onSubmit={(e) => void anular(e)} noValidate>
            <Campo etiqueta="Motivo, si querés dejarlo anotado" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: se cobró dos veces" data-testid="motivo-anular" />
          </form>
          {rechazo && <Aviso tipo="error" titulo="No se pudo anular" testId="error-anular">{rechazo}.</Aviso>}
        </>
      )}
    </Confirmar>
  );
}

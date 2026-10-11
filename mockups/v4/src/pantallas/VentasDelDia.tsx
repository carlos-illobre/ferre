import { useMemo, useState } from "react";
import { anularVenta, totalesDe, useAlmacen } from "../almacen";
import { cantidad, clienteDe, dia, hora, hoyA, MEDIOS_DE_PAGO, pesos, type MedioDePago, type RenglonVendido, type Venta } from "../datos";
import { useConexion } from "../estructura/conexion";
import { Aviso, avisar, Boton, Campo, Cargando, clases, Confirmar, ErrorDeCarga, Icono, Pagina, Pastilla, Tarjeta, Vacio, useEstadoDeMaqueta, type EstadoDeMaqueta } from "../piezas";
import { cambiarParametro, ir } from "../ruta";
import "../estilos/ventas.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "vacio", nombre: "Todavía sin ventas" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
  { clave: "cargando", nombre: "Buscando las ventas" },
  { clave: "error", nombre: "No se pudieron traer" },
];

// ---------------------------------------------------------------- Días

/** El día de un momento como lo escribe `<input type="date">`: "2026-10-10". */
function claveDe(momento: Date): string {
  return `${momento.getFullYear()}-${String(momento.getMonth() + 1).padStart(2, "0")}-${String(momento.getDate()).padStart(2, "0")}`;
}

function momentoDe(clave: string): Date {
  return new Date(`${clave}T12:00:00`);
}

function diasAtras(clave: string): number {
  return Math.round((momentoDe(claveDe(new Date())).getTime() - momentoDe(clave).getTime()) / 86400000);
}

/** "Viernes 9 de octubre". */
function diaConNombre(clave: string): string {
  const texto = momentoDe(clave).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Ventas de ejemplo para los otros días: salen del día elegido, así cada día muestra siempre lo mismo.
type Molde = { hora: string; medio: MedioDePago; clienteId: string | null; total: number; renglones: RenglonVendido[] };

const MOLDES: Molde[] = [
  { hora: "18:12", medio: "efectivo", clienteId: null, total: 6000, renglones: [{ nombre: "Cinta aisladora negra 20 m", cantidad: 3, unidad: "unidad", subtotal: 6000 }] },
  { hora: "16:48", medio: "mercado-pago", clienteId: null, total: 53000, renglones: [{ nombre: "Llave francesa 10 pulgadas", cantidad: 1, unidad: "unidad", subtotal: 41000 }, { nombre: "Mecha 8 mm widia", cantidad: 1, unidad: "unidad", subtotal: 12000 }] },
  { hora: "15:20", medio: "cuenta-corriente", clienteId: "martinez", total: 40000, renglones: [{ nombre: "Clavo punta París 2 pulgadas", cantidad: 4, unidad: "kilo", subtotal: 40000 }] },
  { hora: "12:05", medio: "tarjeta", clienteId: null, total: 223000, renglones: [{ nombre: "Taladro inalámbrico 18 V con dos baterías", cantidad: 1, unidad: "unidad", subtotal: 223000 }] },
  { hora: "10:41", medio: "efectivo", clienteId: null, total: 8000, renglones: [{ nombre: "Mecha 6 mm madera", cantidad: 2, unidad: "unidad", subtotal: 8000 }] },
  { hora: "09:14", medio: "efectivo", clienteId: null, total: 12000, renglones: [{ nombre: "Cable unipolar 2,5 mm", cantidad: 12, unidad: "metro", subtotal: 12000 }] },
];

function ventasDeOtroDia(clave: string): Venta[] {
  const atras = diasAtras(clave);
  const momento = momentoDe(clave);
  if (atras <= 0 || momento.getDay() === 0) return []; // los domingos no se abre
  const semilla = momento.getDate() + momento.getMonth() * 31;
  const cuantas = 3 + (semilla % 3);
  return MOLDES.filter((_, i) => (i + semilla) % MOLDES.length < cuantas).map((m, i) => ({
    id: `otro-${clave}-${i}`, cuando: hoyA(m.hora, atras), usuarioId: "carlos", medio: m.medio, clienteId: m.clienteId, total: m.total,
    renglones: m.renglones, anulada: false, motivo: "", porEnviar: false,
  }));
}

// ---------------------------------------------------------------- Pantalla

export default function VentasDelDia() {
  const estado = useEstadoDeMaqueta();
  const { enLinea } = useConexion();
  const deHoy = useAlmacen((a) => a.ventas);

  const hoy = claveDe(new Date());
  const [diaElegido, setDiaElegido] = useState(hoy);
  const esHoy = diaElegido === hoy;
  /** Las anuladas de otros días viven acá: el almacén solo guarda las ventas de hoy. */
  const [anuladasDeAntes, setAnuladasDeAntes] = useState<Record<string, string>>({});
  const [porAnular, setPorAnular] = useState<Venta | null>(null);
  const [motivo, setMotivo] = useState("");

  const deOtroDia = useMemo(() => ventasDeOtroDia(diaElegido), [diaElegido]);
  const ventas =
    estado === "vacio" && esHoy ? []
    : esHoy ? deHoy
    : deOtroDia.map((v) => (v.id in anuladasDeAntes ? { ...v, anulada: true, motivo: anuladasDeAntes[v.id] ?? "" } : v));
  const totales = totalesDe(ventas);

  const seVe = estado !== "cargando" && estado !== "error" && (esHoy || enLinea);

  function anular() {
    if (!porAnular) return;
    if (esHoy) anularVenta(porAnular.id, motivo.trim(), { sinConexion: !enLinea });
    else setAnuladasDeAntes((antes) => ({ ...antes, [porAnular.id]: motivo.trim() }));
    if (enLinea) avisar(`Venta de ${pesos(porAnular.total)} anulada`, { detalle: "La mercadería volvió al stock." });
    else avisar(`Venta de ${pesos(porAnular.total)} anulada en este dispositivo`, { tipo: "alerta", detalle: "Se envía sola cuando vuelva internet." });
    setPorAnular(null);
  }

  return (
    <Pagina titulo="Ventas del día" estados={ESTADOS}>
      <div className="ventas__dia">
        <h2>{esHoy ? `Hoy, ${dia(new Date())}` : diaConNombre(diaElegido)}</h2>
        <div className="ventas__dia-acciones">
          {!esHoy && <Boton tam="chico" icono="deshacer" onClick={() => setDiaElegido(hoy)}>Volver a hoy</Boton>}
          <label className="ventas__fecha">
            <Icono nombre="calendario" tam={20} />
            <span>Ver otro día</span>
            <input type="date" value={diaElegido} max={hoy} onChange={(e) => { if (e.target.value) setDiaElegido(e.target.value); }} />
          </label>
        </div>
      </div>

      {!enLinea && (
        <Aviso tipo="alerta">
          Se ven las ventas guardadas en este dispositivo. Si anulás una, queda anulada acá y se envía sola cuando vuelva internet.
        </Aviso>
      )}

      {estado === "cargando" && <Cargando texto="Buscando las ventas…" />}
      {estado === "error" && (
        <ErrorDeCarga titulo="No se pudieron traer las ventas" alReintentar={() => cambiarParametro("estado", null)}>
          Revisá la conexión y probá de nuevo. Las ventas que cobraste siguen guardadas.
        </ErrorDeCarga>
      )}

      {!esHoy && !enLinea && (
        <Vacio icono="sin-conexion" titulo="Ese día no está guardado en este dispositivo">Se va a ver cuando vuelva internet.</Vacio>
      )}

      {seVe && (
        <>
          {ventas.length > 0 && <Tarjeta variante="verde" className="ventas__total">
            <div className="ventas__vendido">
              <p>{esHoy ? "Vendido hoy" : "Vendido ese día"}</p>
              <strong className="cifra">{pesos(totales.total)}</strong>
              <span>{totales.ventas === 1 ? "1 venta" : `${totales.ventas} ventas`}</span>
            </div>
            <dl className="ventas__medios">
              {MEDIOS_DE_PAGO.map((m) => (
                <div key={m.clave} className={`ventas__medio ventas__medio--${m.clave}`}>
                  <dt>{m.nombre}</dt>
                  <dd className="cifra">{pesos(totales.porMedio[m.clave])}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>}

          {ventas.length === 0 && (esHoy ? (
            <Vacio icono="ventas" titulo="Todavía no hay ventas hoy" principal={{ texto: "Ir a vender", icono: "vender", alTocar: () => ir("vender") }}>Cada venta que cobres aparece acá, con sus productos y cómo se pagó.</Vacio>
          ) : (
            <Vacio icono="ventas" titulo="Ese día no hubo ventas">Elegí otro día o volvé a hoy.</Vacio>
          ))}

          {ventas.length > 0 && (
            <ul className="ventas__lista">
              {ventas.map((v) => <UnaVenta key={v.id} venta={v} sePuedeAnular={esHoy || enLinea} alAnular={() => { setMotivo(""); setPorAnular(v); }} />)}
            </ul>
          )}
        </>
      )}

      <Confirmar
        abierta={porAnular !== null}
        titulo={`¿Anular la venta de ${pesos(porAnular?.total ?? 0)}?`}
        confirmar="Sí, anular"
        cancelar="No anular"
        alCancelar={() => setPorAnular(null)}
        alConfirmar={anular}
      >
        {porAnular && (
          <>
            <p>La venta de las {hora(porAnular.cuando)} queda marcada como anulada y la mercadería vuelve al stock. No se puede deshacer.</p>
            <ul className="ventas__productos ventas__productos--en-hoja">
              {porAnular.renglones.map((r) => <li key={r.nombre}>{lineaDe(r)}</li>)}
            </ul>
            <Campo etiqueta="Motivo, si querés dejarlo anotado" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: se cobró dos veces" />
          </>
        )}
      </Confirmar>
    </Pagina>
  );
}

// ---------------------------------------------------------------- Una venta

/** "2 × Cinta aisladora negra 20 m" · "2,5 kilos de Clavo punta París 2 pulgadas". */
function lineaDe(r: RenglonVendido): string {
  return r.unidad === "unidad" ? `${cantidad(r.cantidad).replace(/ .*/, "")} × ${r.nombre}` : `${cantidad(r.cantidad, r.unidad)} de ${r.nombre}`;
}

function UnaVenta({ venta: v, sePuedeAnular, alAnular }: { venta: Venta; sePuedeAnular: boolean; alAnular: () => void }) {
  const medio = MEDIOS_DE_PAGO.find((m) => m.clave === v.medio);
  const cliente = clienteDe(v.clienteId);
  return (
    <li className={clases("ventas__venta", v.anulada && "ventas__venta--anulada")}>
      <time className="ventas__hora cifra" dateTime={v.cuando.toISOString()}>{hora(v.cuando)}</time>
      <div className="ventas__que">
        <ul className="ventas__productos">
          {v.renglones.map((r) => <li key={r.nombre}>{lineaDe(r)}</li>)}
        </ul>
        <p className="ventas__pago">
          {cliente ? `${medio?.frase} de ${cliente.nombre}` : medio?.frase}
          {v.porEnviar && !v.anulada && <Pastilla tipo="alerta" icono="sin-conexion">Por enviar</Pastilla>}
        </p>
        {v.anulada && v.motivo !== "" && <p className="ventas__pago">Motivo: {v.motivo}</p>}
      </div>
      <strong className="ventas__importe cifra">{pesos(v.total)}</strong>
      <div className="ventas__accion">
        {v.anulada
          ? <Pastilla tipo="error" icono={v.anulacionPorEnviar ? "sin-conexion" : undefined}>{v.anulacionPorEnviar ? "Anulada · por enviar" : "Anulada"}</Pastilla>
          : <Boton tam="chico" disabled={!sePuedeAnular} aria-label={`Anular la venta de las ${hora(v.cuando)}, de ${pesos(v.total)}`} onClick={alAnular}>Anular</Boton>}
      </div>
    </li>
  );
}

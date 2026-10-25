import { useEffect, useRef, useState } from "react";
import { sinTicketsQueVer, useTicketNuevo, useTickets, type Pendiente, type Ticket } from "../../../negocio/tickets";
import { describirDispositivo } from "../../../plataforma/dispositivo";
import { TEXTOS } from "../../textos";
import { VERSION } from "../../../plataforma/ambiente";
import { Icono } from "../../../ui/iconos";
import { DetalleDelTicketCelu } from "./DetalleDelTicketCelu";
import { EscribirTicketCelu } from "./EscribirTicketCelu";
import { FilaDeTicketCelu } from "./FilaDeTicketCelu";
import "../../mas-v2.css";
import css from "./Tickets.module.css";

// Mejoras y errores (RF-80) en el celular, como la v2 del director de arte (variante 1, «El
// buzón»; specs/008, decisión 148). Arriba la tarjeta para escribir: idea o error (la idea elegida
// al abrir), el texto, la cámara y la galería y las fotos con su «×»; abajo los tickets, abiertos o
// resueltos, que se abren para verlos enteros, marcarlos resueltos o reabrirlos; y «Enviar» fijo
// bajo el pulgar. Sin conexión, lo tuyo queda «por enviar» y sale solo.
const t = TEXTOS.ticketsV2;
type Viendo = "abierto" | "resuelto";

export function TicketsCelu() {
  const s = useTickets();
  const n = useTicketNuevo(describirDispositivo, VERSION);
  const [viendo, setViendo] = useState<Viendo>("abierto");
  const [abierto, setAbierto] = useState<Ticket | Pendiente | null>(null);
  const caja = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { caja.current?.focus({ preventScroll: true }); }, []);

  return (
    <main id="contenido" className="mv2 tkvc" data-testid="tickets" tabIndex={-1}>
      <h1>{t.titulo.corto}</h1>
      <EscribirTicketCelu nuevo={n} caja={caja} />
      {n.aviso && <p className="mv-aviso logro" role="status" data-testid="mensaje">{n.aviso}</p>}
      <CabezaDeLaLista tickets={s.tickets} viendo={viendo} alVer={setViendo} />
      <Lista s={s} viendo={viendo} alAbrir={setAbierto} />
      <div className={css.barra}>
        <button type="button" className="mv-btn accion grande" disabled={n.enviando} onClick={() => void n.enviar()} data-testid="enviar"><Icono nombre="enviar" />{n.enviando ? "Enviando…" : `${t.enviar.corto} ${n.tipo === "error" ? t.error.corto : t.idea.corto}`}</button>
      </div>
      {abierto && <DetalleDelTicketCelu ticket={abierto} alCerrar={() => setAbierto(null)} alCambiar={async () => { await s.cargar(); setAbierto(null); }} />}
    </main>
  );
}

function Lista({ s, viendo, alAbrir }: { s: ReturnType<typeof useTickets>; viendo: Viendo; alAbrir: (x: Ticket | Pendiente) => void }) {
  const lista = s.tickets ?? [];
  const delEstado = lista.filter((x) => x.estado === viendo);
  return (
    <>
      {s.pendientes.map((p) => <FilaDeTicketCelu key={p.id} ticket={p} alAbrir={() => alAbrir(p)} />)}
      <Avisos s={s} />
      {s.tickets && delEstado.length === 0 && <p className={css.vacio}>{sinTicketsQueVer(viendo, lista.length > 0, "arriba")}</p>}
      {delEstado.length > 0 && <div className={css.lista} data-testid="lista-de-tickets">{delEstado.map((x) => <FilaDeTicketCelu key={x.id} ticket={x} alAbrir={() => alAbrir(x)} />)}</div>}
    </>
  );
}

function Avisos({ s }: { s: ReturnType<typeof useTickets> }) {
  if (!s.error) return s.tickets ? null : <p className="mv-cargando" aria-busy="true">Buscando los tickets…</p>;
  return <div className="mv-aviso pino"><Icono nombre="sin-senal" /><span>{s.error.startsWith("Sin conexión") ? t.enviadosAlVolver.corto : s.error} <button type="button" className="mv-btn chico" onClick={() => void s.cargar()}>{t.reintentar.corto}</button></span></div>;
}

function CabezaDeLaLista({ tickets, viendo, alVer }: { tickets: Ticket[] | null; viendo: Viendo; alVer: (v: Viendo) => void }) {
  const abiertos = (tickets ?? []).filter((x) => x.estado === "abierto").length;
  const cuenta = (n: number) => (tickets ? ` ${n}` : "");
  return (
    <div className={css.sec}>
      <h2 className="mv-seccion">{t.tickets.corto}</h2>
      <div className={css.segmentos} role="group" aria-label="Cuáles ver">
        <button type="button" aria-pressed={viendo === "abierto"} className={viendo === "abierto" ? "elegido" : ""} onClick={() => alVer("abierto")}>{t.abiertos.corto}{cuenta(abiertos)}</button>
        <button type="button" aria-pressed={viendo === "resuelto"} className={viendo === "resuelto" ? "elegido" : ""} onClick={() => alVer("resuelto")}>{t.resueltos.corto}{cuenta((tickets ?? []).length - abiertos)}</button>
      </div>
    </div>
  );
}

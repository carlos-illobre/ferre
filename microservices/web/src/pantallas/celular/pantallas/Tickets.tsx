import { useEffect, useRef, useState } from "react";
import { api } from "../../../datos/conexion";
import { cuandoCorto } from "../../../negocio/apartados";
import { describirDispositivo } from "../../compu/base/dispositivo";
import { MAXIMO_DE_FOTOS, crearTicket, diasAbierto, DIAS_DE_ESPERA, useTickets, type Pendiente, type Ticket } from "../../tickets";
import { FotoGrande, Miniatura } from "../../Tickets";
import { IconoDeLaV2 } from "../../IconoDeLaV2";
import { TEXTOS } from "../../textos";
import { Hoja } from "../componentes/base";
import type { ResolucionDeTicket } from "@servidor/tickets";
import "../../mas-v2.css";
import "./tickets-v2.css";

// Mejoras y errores (RF-80) en el celular, como la v2 del director de arte (variante 1, «El
// buzón»; specs/008, decisión 148). Arriba la tarjeta para escribir: idea o error (la idea elegida
// al abrir), el texto, la cámara y la galería y las fotos con su «×»; abajo los tickets, abiertos o
// resueltos, que se abren para verlos enteros, marcarlos resueltos o reabrirlos; y «Enviar» fijo
// bajo el pulgar. Sin conexión, lo tuyo queda «por enviar» y sale solo.
const t = TEXTOS.ticketsV2;

export function TicketsCelu() {
  const { tickets, pendientes, error, cargar } = useTickets();
  const [tipo, setTipo] = useState<Ticket["tipo"]>("mejora");
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [falta, setFalta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [viendo, setViendo] = useState<"abierto" | "resuelto">("abierto");
  const [abierto, setAbierto] = useState<Ticket | Pendiente | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const caja = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { caja.current?.focus({ preventScroll: true }); }, []);

  function agregarFotos(nuevas: File[]) {
    const imagenes = nuevas.filter((f) => f.type.startsWith("image/"));
    if (!imagenes.length) return;
    setFotos((actuales) => {
      const todas = [...actuales, ...imagenes];
      setFalta(todas.length > MAXIMO_DE_FOTOS ? `Son hasta ${MAXIMO_DE_FOTOS} fotos por ticket: quedaron las primeras ${MAXIMO_DE_FOTOS}.` : null);
      return todas.slice(0, MAXIMO_DE_FOTOS);
    });
  }
  async function enviar() {
    if (texto.trim().length < 3) { setFalta("Contá qué pasó o qué te gustaría, aunque sea en una línea."); return; }
    setEnviando(true); setFalta(null);
    try {
      await crearTicket({ tipo, descripcion: texto.trim(), dispositivo: describirDispositivo(), version: import.meta.env.VITE_VERSION ?? "local" }, fotos);
      setTexto(""); setFotos([]);
      setAviso(navigator.onLine ? "Ticket enviado. Gracias por avisar." : "Quedó guardado en este dispositivo: se envía solo cuando vuelva internet.");
    } catch { setFalta("No se pudo guardar el ticket en este dispositivo. Probá de nuevo."); }
    finally { setEnviando(false); }
  }
  useEffect(() => { if (!aviso) return; const x = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(x); }, [aviso]);

  const lista = tickets ?? [];
  const abiertos = lista.filter((x) => x.estado === "abierto").length;
  const delEstado = lista.filter((x) => x.estado === viendo);
  const lleno = fotos.length >= MAXIMO_DE_FOTOS;

  return (
    <main id="contenido" className="mv2 tkvc" data-testid="tickets" tabIndex={-1}>
      <h1>{t.titulo.corto}</h1>
      <section className="mv-tarjeta-2 tkvc-escribir" aria-label="Ticket nuevo" onPaste={(e) => agregarFotos(Array.from(e.clipboardData.files))}>
        <div className="tkvc-eleccion" role="radiogroup" aria-label="Qué querés contar">
          {(["mejora", "error"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={tipo === v} className={tipo === v ? "elegida" : ""} onClick={() => setTipo(v)} data-testid={`tipo-${v}`}>
              <IconoDeLaV2 nombre={v === "error" ? "bicho" : "lamparita"} />{v === "error" ? t.encontreUnError.corto : t.tengoUnaIdea.corto}
            </button>
          ))}
        </div>
        <textarea ref={caja} className="tkvc-caja" value={texto} onChange={(e) => { setTexto(e.target.value); if (falta) setFalta(null); }} maxLength={5000}
          aria-label={tipo === "error" ? "¿Qué pasó? ¿Qué estabas haciendo?" : "¿Qué te gustaría que tenga o que cambie?"}
          placeholder={tipo === "error" ? "Ej.: al cobrar la pantalla quedó en blanco" : "Ej.: ver el stock al buscar un producto"}
          aria-invalid={falta !== null && texto.trim().length < 3} data-testid="descripcion" />
        <div className="tkvc-fotos">
          <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} data-testid="camara-foto" />
          <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={(e) => { agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} data-testid="archivo-foto" />
          <button type="button" className="tkvc-tomar cam" aria-label={t.sacarFoto.corto} disabled={lleno} onClick={() => camara.current?.click()} data-testid="agregar-foto"><IconoDeLaV2 nombre="camara" tam={24} /></button>
          <button type="button" className="tkvc-tomar gal" aria-label={t.elegirDeLaGaleria.corto} disabled={lleno} onClick={() => galeria.current?.click()} data-testid="elegir-de-la-galeria"><IconoDeLaV2 nombre="imagen-mas" tam={24} /></button>
          {fotos.map((f, i) => (
            <span key={`${f.name}-${f.size}-${i}`} className="tkvc-mini">
              <Miniatura origen={f} />
              <button type="button" className="quitar" aria-label={`Quitar la foto ${i + 1}`} onClick={() => { setFotos(fotos.filter((_, n) => n !== i)); setFalta(null); }}><IconoDeLaV2 nombre="cruz" tam={14} /></button>
            </span>
          ))}
          <span className="cuantas">{fotos.length}/{MAXIMO_DE_FOTOS}</span>
        </div>
        {falta && <p className="mv-aviso error" role="alert">{falta}</p>}
      </section>
      {aviso && <p className="mv-aviso logro" role="status" data-testid="mensaje">{aviso}</p>}

      <div className="tkvc-sec">
        <h2 className="mv-seccion">{t.tickets.corto}</h2>
        <div className="tkvc-segmentos" role="group" aria-label="Cuáles ver">
          <button type="button" aria-pressed={viendo === "abierto"} className={viendo === "abierto" ? "elegido" : ""} onClick={() => setViendo("abierto")}>{t.abiertos.corto}{tickets ? ` ${abiertos}` : ""}</button>
          <button type="button" aria-pressed={viendo === "resuelto"} className={viendo === "resuelto" ? "elegido" : ""} onClick={() => setViendo("resuelto")}>{t.resueltos.corto}{tickets ? ` ${lista.length - abiertos}` : ""}</button>
        </div>
      </div>
      {pendientes.map((p) => <Fila key={p.id} ticket={p} alAbrir={() => setAbierto(p)} />)}
      {error && <div className="mv-aviso pino"><IconoDeLaV2 nombre="sin-senal" /><span>{error.startsWith("Sin conexión") ? t.enviadosAlVolver.corto : error} <button type="button" className="mv-btn chico" onClick={() => void cargar()}>{t.reintentar.corto}</button></span></div>}
      {!tickets && !error && <p className="mv-cargando" aria-busy="true">Buscando los tickets…</p>}
      {tickets && delEstado.length === 0 && <p className="tkvc-vacio">{viendo === "abierto" ? (lista.length ? "No queda ningún ticket abierto." : "Todavía no hay tickets. El primero lo escribís arriba.") : "Todavía no se resolvió ninguno."}</p>}
      {delEstado.length > 0 && <div className="tkvc-lista" data-testid="lista-de-tickets">{delEstado.map((x) => <Fila key={x.id} ticket={x} alAbrir={() => setAbierto(x)} />)}</div>}

      <div className="tkvc-barra">
        <button type="button" className="mv-btn accion grande" disabled={enviando} onClick={() => void enviar()} data-testid="enviar"><IconoDeLaV2 nombre="enviar" />{enviando ? "Enviando…" : `${t.enviar.corto} ${tipo === "error" ? t.error.corto : t.idea.corto}`}</button>
      </div>
      {abierto && <Detalle ticket={abierto} alCerrar={() => setAbierto(null)} alCambiar={async () => { await cargar(); setAbierto(null); }} />}
    </main>
  );
}

function Fila({ ticket: x, alAbrir }: { ticket: Ticket | Pendiente; alAbrir: () => void }) {
  const enviado = "estado" in x;
  const dias = enviado && x.estado === "abierto" ? diasAbierto(x) : 0;
  return (
    <button type="button" className={`tkvc-tk ${enviado ? "" : "porenviar"}`} onClick={alAbrir} data-testid="ticket">
      <span className={`tkv-tipo ${x.tipo}`}><IconoDeLaV2 nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
      {/* El tipo se ve en el ícono; quien no ve la pantalla lo oye. */}
      <span className="solo-lectores">{x.tipo === "error" ? "Error" : "Mejora"}. </span>
      <span className="tx"><span className="texto">{x.descripcion}</span>
        <span className={`quien ${enviado ? "" : "urgente"}`}>{enviado ? [x.usuario, cuandoCorto(x.creado_en)].join(" · ") : t.porEnviar.corto}</span></span>
      {!enviado ? <IconoDeLaV2 nombre="nube-subir" className="nube" /> : dias >= DIAS_DE_ESPERA ? <span className="mv-pastilla urgente">{dias} días</span> : x.fotos.length > 0 ? <span className="tkvc-mini chica"><Miniatura origen={x.fotos[0]!} /></span> : <span />}
    </button>
  );
}

function Detalle({ ticket: x, alCerrar, alCambiar }: { ticket: Ticket | Pendiente; alCerrar: () => void; alCambiar: () => Promise<void> }) {
  const enviado = "estado" in x;
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grande, setGrande] = useState<string | Blob | null>(null);
  async function pedir(accion: "resolver" | "reabrir") {
    setError(null);
    try { await api(`/tickets/${x.id}/${accion}`, { method: "POST", body: JSON.stringify((accion === "resolver" ? { nota } : {}) satisfies ResolucionDeTicket) }); await alCambiar(); }
    catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: probá de nuevo cuando vuelva internet."); }
  }
  return (
    <Hoja titulo={x.tipo === "error" ? t.encontreUnError.corto : t.tengoUnaIdea.corto} alCerrar={alCerrar} testId="ticket-abierto" clase="mv2 tkvc-hoja">
      <div className="tkvc-det-cab"><span className={`tkv-tipo ${x.tipo}`}><IconoDeLaV2 nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
        <div><p className="texto">{x.descripcion}</p><p className="mv-detalle">{enviado ? [x.usuario, cuandoCorto(x.creado_en), x.dispositivo].filter(Boolean).join(" · ") : t.porEnviar.corto}</p></div></div>
      {x.fotos.length > 0 && <div className="tkvc-tira">{x.fotos.map((f, i) => <button key={i} type="button" className="tkvc-mini grande" aria-label={`Ver la foto ${i + 1} en grande`} onClick={() => setGrande(f)}><Miniatura origen={f} /></button>)}</div>}
      {error && <p className="mv-aviso error" role="alert">{error}</p>}
      {!enviado ? <div className="mv-aviso urgente"><IconoDeLaV2 nombre="nube-subir" tam={16} /><span>{t.todaviaNoSalio.corto}</span></div>
        : x.estado === "resuelto" ? <>
          <div className="mv-aviso logro"><IconoDeLaV2 nombre="tilde-circulo" tam={16} /><span><b>{x.resuelto_por ?? "Alguien"} lo resolvió</b>{x.resuelto_en ? ` ${cuandoCorto(x.resuelto_en)}` : ""}{x.nota ? `: ${x.nota}` : ""}</span></div>
          <button type="button" className="mv-btn grande tkvc-ancho" onClick={() => void pedir("reabrir")} data-testid="reabrir"><IconoDeLaV2 nombre="repetir" />{t.reabrir.corto}</button>
        </> : <form className="tkvc-resolver" onSubmit={(e) => { e.preventDefault(); void pedir("resolver"); }}>
          <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={2000} placeholder={t.notaParaQuienAviso.corto} aria-label={t.notaParaQuienAviso.corto} data-testid="nota" />
          <button type="submit" className="mv-btn accion grande tkvc-ancho" data-testid="confirmar-resuelto"><IconoDeLaV2 nombre="tilde" />{t.marcarResuelto.largo}</button>
        </form>}
      {grande && <FotoGrande origen={grande} alCerrar={() => setGrande(null)} />}
    </Hoja>
  );
}

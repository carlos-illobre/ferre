import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { MAXIMO_DE_FOTOS, crearTicket, useFoto, useTickets, type Pendiente, type Ticket } from "./tickets";
import "./tickets.css";

// Mejoras y errores (RF-80): quien usa la app cuenta lo que encontró o lo que se le ocurrió,
// con fotos o capturas de pantalla. La misma pantalla en el celular y en la computadora.
const TIPOS = [
  { valor: "error", nombre: "Encontré un error", ayuda: "Algo no anda o anda mal" },
  { valor: "mejora", nombre: "Tengo una idea", ayuda: "Algo que falta o que se puede mejorar" },
] as const;
const describirDispositivo = () => {
  const ua = navigator.userAgent;
  return `${/Android|iPhone|iPad/.test(ua) ? "celular" : "computadora"} · ${/Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "navegador"}`;
};
const cuando = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });

export function Tickets() {
  const { tickets, pendientes, error, cargar } = useTickets();
  const [tipo, setTipo] = useState<Ticket["tipo"]>("error");
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [falta, setFalta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [viendo, setViendo] = useState<"abierto" | "resuelto">("abierto");
  const archivo = useRef<HTMLInputElement>(null);

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
  // El aviso de enviado se va solo.
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  const delEstado = (tickets ?? []).filter((t) => t.estado === viendo);
  const abiertos = (tickets ?? []).filter((t) => t.estado === "abierto").length;
  const resueltos = (tickets ?? []).length - abiertos;

  return (
    <main id="contenido" className="tk" data-testid="tickets" tabIndex={-1}>
      <h1>Mejoras y errores</h1>
      <p className="tk-bajada">Si algo no anda o se te ocurre cómo mejorar la app, contalo acá. Podés sumar fotos o capturas de pantalla.</p>

      <section className="tk-tarjeta" aria-label="Ticket nuevo"
        onPaste={(e) => agregarFotos(Array.from(e.clipboardData.files))}>
        <div className="tk-tipos" role="radiogroup" aria-label="Qué querés contar">
          {TIPOS.map((t) => (
            <button key={t.valor} type="button" role="radio" aria-checked={tipo === t.valor} onClick={() => setTipo(t.valor)} data-testid={`tipo-${t.valor}`}>
              <strong>{t.nombre}</strong><span>{t.ayuda}</span>
            </button>
          ))}
        </div>
        <label className="tk-campo">
          <span>{tipo === "error" ? "¿Qué pasó? ¿Qué estabas haciendo?" : "¿Qué te gustaría que tenga o que cambie?"}</span>
          <textarea value={texto} onChange={(e) => { setTexto(e.target.value); if (falta) setFalta(null); }} rows={4} maxLength={5000}
            placeholder={tipo === "error" ? "Ej.: al cobrar con tarjeta la pantalla quedó en blanco" : "Ej.: estaría bueno ver el stock al buscar un producto"}
            aria-invalid={falta !== null && texto.trim().length < 3} aria-describedby={falta ? "tk-falta" : undefined} data-testid="descripcion" />
        </label>
        {fotos.length > 0 && (
          <ul className="tk-fotos" aria-label="Fotos del ticket">
            {fotos.map((f, i) => (
              <li key={`${f.name}-${f.size}-${i}`}>
                <Miniatura origen={f} />
                <button type="button" className="tk-quitar" aria-label={`Quitar la foto ${i + 1}`} onClick={() => { setFotos(fotos.filter((_, n) => n !== i)); setFalta(null); }}>×</button>
              </li>
            ))}
          </ul>
        )}
        {falta && <p className="tk-falta" id="tk-falta" role="alert">{falta}</p>}
        <div className="tk-acciones">
          <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(e) => { agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} data-testid="archivo-foto" />
          <button type="button" className="tk-boton" disabled={fotos.length >= MAXIMO_DE_FOTOS} onClick={() => archivo.current?.click()} data-testid="agregar-foto">
            <Clip />{fotos.length ? `Agregar otra foto (${fotos.length} de ${MAXIMO_DE_FOTOS})` : "Agregar foto o captura"}
          </button>
          <button type="button" className="tk-boton principal" disabled={enviando} onClick={() => void enviar()} data-testid="enviar">{enviando ? "Enviando…" : "Enviar"}</button>
        </div>
        <p className="tk-detalle tk-solo-compu">En la computadora también podés pegar una captura con Ctrl + V.</p>
      </section>
      {aviso && <p className="tk-aviso" role="status" data-testid="mensaje">{aviso}</p>}

      {pendientes.length > 0 && (
        <section aria-labelledby="tk-por-enviar">
          <h2 id="tk-por-enviar">Por enviar</h2>
          <p className="tk-detalle">Están guardados en este dispositivo y salen solos cuando vuelve internet.</p>
          <ul className="tk-lista">{pendientes.map((p) => <li key={p.id}><Fila ticket={p} /></li>)}</ul>
        </section>
      )}

      <section aria-labelledby="tk-enviados">
        <div className="tk-cabeza">
          <h2 id="tk-enviados">Tickets</h2>
          <div className="tk-filtro" role="group" aria-label="Cuáles ver">
            <button type="button" aria-pressed={viendo === "abierto"} onClick={() => setViendo("abierto")}>Abiertos{tickets ? ` (${abiertos})` : ""}</button>
            <button type="button" aria-pressed={viendo === "resuelto"} onClick={() => setViendo("resuelto")}>Resueltos{tickets ? ` (${resueltos})` : ""}</button>
          </div>
        </div>
        {error && <p className="tk-falta" role="alert">{error} <button type="button" className="tk-boton chico" onClick={() => void cargar()}>Reintentar</button></p>}
        {!tickets && !error && <p className="tk-detalle" aria-busy="true">Buscando los tickets…</p>}
        {tickets && delEstado.length === 0 && (
          <p className="tk-vacio">{viendo === "abierto" ? (tickets.length ? "No queda ningún ticket abierto." : "Todavía no hay tickets. El primero lo escribís arriba.") : "Todavía no se resolvió ninguno."}</p>
        )}
        {delEstado.length > 0 && <ul className="tk-lista" data-testid="lista-de-tickets">{delEstado.map((t) => <li key={t.id}><Fila ticket={t} alCambiar={cargar} /></li>)}</ul>}
      </section>
    </main>
  );
}

function Fila({ ticket: t, alCambiar }: { ticket: Ticket | Pendiente; alCambiar?: () => Promise<void> }) {
  const enviado = "estado" in t;
  const [resolviendo, setResolviendo] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [grande, setGrande] = useState<string | Blob | null>(null);
  async function pedir(accion: "resolver" | "reabrir") {
    setError(null);
    try { await api(`/tickets/${t.id}/${accion}`, { method: "POST", body: JSON.stringify(accion === "resolver" ? { nota } : {}) }); setResolviendo(false); setNota(""); await alCambiar?.(); }
    catch (e) { const err = e as { estado?: number; message: string }; setError(err.estado ? `${err.message}.` : "Sin conexión: probá de nuevo cuando vuelva internet."); }
  }
  return (
    <article className={`tk-ticket ${enviado && t.estado === "resuelto" ? "resuelto" : ""}`} data-testid="ticket">
      <header>
        <span className={`tk-pastilla ${t.tipo}`}>{t.tipo === "error" ? "Error" : "Idea"}</span>
        <span className="tk-detalle">{enviado ? `${t.usuario} · ` : ""}{cuando(t.creado_en)}{t.dispositivo ? ` · ${t.dispositivo}` : ""}</span>
        {!enviado && <span className="tk-pastilla pendiente">Por enviar</span>}
      </header>
      <p className="tk-texto">{t.descripcion}</p>
      {t.fotos.length > 0 && (
        <ul className="tk-fotos">
          {t.fotos.map((f, i) => <li key={i}><button type="button" className="tk-ver" aria-label={`Ver la foto ${i + 1} en grande`} onClick={() => setGrande(f)}><Miniatura origen={f} /></button></li>)}
        </ul>
      )}
      {enviado && t.estado === "resuelto" && (
        <p className="tk-resuelto">Resuelto{t.resuelto_por ? ` por ${t.resuelto_por}` : ""}{t.resuelto_en ? ` el ${cuando(t.resuelto_en)}` : ""}{t.nota ? `: ${t.nota}` : "."}</p>
      )}
      {error && <p className="tk-falta" role="alert">{error}</p>}
      {enviado && (resolviendo ? (
        <form className="tk-resolver" onSubmit={(e) => { e.preventDefault(); void pedir("resolver"); }}>
          <label className="tk-campo"><span>Qué se hizo (opcional)</span>
            <input value={nota} onChange={(e) => setNota(e.target.value)} autoFocus maxLength={2000} placeholder="Ej.: corregido en la versión de hoy" data-testid="nota" />
          </label>
          <div className="tk-acciones"><button type="button" className="tk-boton" onClick={() => setResolviendo(false)}>Cancelar</button><button type="submit" className="tk-boton oscuro" data-testid="confirmar-resuelto">Marcar resuelto</button></div>
        </form>
      ) : t.estado === "abierto"
        ? <button type="button" className="tk-boton chico" onClick={() => setResolviendo(true)} data-testid="resolver">Marcar resuelto</button>
        : <button type="button" className="tk-boton chico" onClick={() => void pedir("reabrir")} data-testid="reabrir">Reabrir</button>)}
      {grande && <FotoGrande origen={grande} alCerrar={() => setGrande(null)} />}
    </article>
  );
}

function Miniatura({ origen }: { origen: string | Blob }) {
  const url = useFoto(origen);
  return url ? <img src={url} alt="" /> : <span className="tk-cargando-foto" aria-hidden="true" />;
}

function FotoGrande({ origen, alCerrar }: { origen: string | Blob; alCerrar: () => void }) {
  const url = useFoto(origen);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && typeof d.showModal === "function" && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className="tk-grande" aria-label="Foto del ticket" onCancel={(e) => { e.preventDefault(); alCerrar(); }} onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      {url ? <img src={url} alt="Foto del ticket" /> : <p>Abriendo la foto…</p>}
      <button type="button" className="tk-boton" autoFocus onClick={alCerrar}>Cerrar</button>
    </dialog>
  );
}

const Clip = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4ZM12 16.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Z" /></svg>
);

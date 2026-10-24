import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../../datos/conexion";
import { cuandoCorto } from "../../../../negocio/apartados";
import { useSesion } from "../../../../datos/sesion";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { describirDispositivo } from "../dispositivo";
import { iniciales } from "../../../../negocio/apartados";
import { MAXIMO_DE_FOTOS, crearTicket, diasAbierto, DIAS_DE_ESPERA, resumenDeTickets, useTickets, type Pendiente, type Ticket } from "../../../tickets";
import { FotoGrande, Miniatura } from "../../../Tickets";
import { PedirFotoAlCelular, hayQueUsarElCelular } from "../../../PedirFoto";
import { IconoDeLaV2 } from "../../../IconoDeLaV2";
import { TEXTOS } from "../../../textos";
import { Hoja } from "../ui";
import type { ResolucionDeTicket } from "@servidor/tickets";
import "../../../mas-v2.css";
import "../estilos/tickets-v2.css";

// Mejoras y errores (RF-80) en la computadora, como la v2 del director de arte (variante 1, «El
// buzón»; specs/008, decisión 148). A la izquierda se escribe: idea o error (la idea elegida al
// abrir), el texto, las fotos o capturas (Ctrl V pega, Alt F elige archivos, o con el celular) y lo
// que va solo; Ctrl Enter envía. A la derecha se sigue: los números, abiertos o resueltos, idea o
// error, y cada ticket, que se abre para verlo entero, marcarlo resuelto o reabrirlo.
const t = TEXTOS.ticketsV2;
type Filtro = "todos" | "mejora" | "error";

export function Tickets() {
  const { tickets, pendientes, error, cargar } = useTickets();
  const { sesion } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario.nombre : null;
  const [tipo, setTipo] = useState<Ticket["tipo"]>("mejora");
  const [texto, setTexto] = useState("");
  const [fotos, setFotos] = useState<File[]>([]);
  const [falta, setFalta] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [viendo, setViendo] = useState<"abierto" | "resuelto">("abierto");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [abierto, setAbierto] = useState<Ticket | Pendiente | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  // Al abrir, el cursor ya está en la caja de texto: así se nota que ahí se escribe.
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
  // «Pegar»: la captura que haya en el portapapeles; si el navegador no deja leerlo, Ctrl V.
  async function pegar() {
    try {
      const items = await navigator.clipboard.read();
      const archivos: File[] = [];
      for (const item of items) for (const tipoDeImagen of item.types.filter((x) => x.startsWith("image/"))) archivos.push(new File([await item.getType(tipoDeImagen)], "captura.png", { type: tipoDeImagen }));
      if (archivos.length) agregarFotos(archivos); else setFalta(t.nadaParaPegar.largo);
    } catch { setFalta(t.pegaConCtrlV.largo); }
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

  const teclas = useCallback((e: KeyboardEvent) => {
    if (abierto || pidiendo) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar(); }
    else if (e.altKey && !e.ctrlKey && e.key.toLowerCase() === "f") { e.preventDefault(); archivo.current?.click(); }
  }, [abierto, pidiendo, texto, tipo, fotos]); // eslint-disable-line react-hooks/exhaustive-deps
  useTeclasGlobales(teclas, caja.current);

  const lista = tickets ?? [];
  const r = resumenDeTickets(lista);
  const delEstado = lista.filter((x) => x.estado === viendo);
  const visibles = delEstado.filter((x) => filtro === "todos" || x.tipo === filtro);
  const resueltos = lista.length - r.abiertos;
  const maxBarra = Math.max(1, ...r.semanas.flatMap((s) => [s.creados, s.resueltos]));
  const tipoTexto = tipo === "error" ? t.error : t.idea;

  return (
    <main id="contenido" className="pagina mv2 tkv" data-testid="tickets" tabIndex={-1}>
      <header className="tkv-cabeza">
        <div><div className="tkv-migas">{TEXTOS.ticketsV2.mas.largo} <IconoDeLaV2 nombre="derecha" tam={16} /></div><h1>{t.titulo.largo}</h1></div>
        <span className="mv-detalle">{t.loVenTodos.largo}</span>
      </header>
      <div className="tkv-cols">
        <section className="mv-tarjeta-2 tkv-escribir" aria-label="Ticket nuevo" onPaste={(e) => agregarFotos(Array.from(e.clipboardData.files))}>
          <div className="tkv-eleccion" role="radiogroup" aria-label="Qué querés contar">
            {(["mejora", "error"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={tipo === v} className={tipo === v ? "elegida" : ""} onClick={() => setTipo(v)} data-testid={`tipo-${v}`}>
                <IconoDeLaV2 nombre={v === "error" ? "bicho" : "lamparita"} tam={24} />
                <span>{v === "error" ? t.encontreUnError.largo : t.tengoUnaIdea.largo}<small>{v === "error" ? t.algoQueNoAnda.largo : t.algoQueFalta.largo}</small></span>
              </button>
            ))}
          </div>
          <textarea ref={caja} className="tkv-caja" value={texto} onChange={(e) => { setTexto(e.target.value); if (falta) setFalta(null); }} maxLength={5000}
            aria-label={tipo === "error" ? "¿Qué pasó? ¿Qué estabas haciendo?" : "¿Qué te gustaría que tenga o que cambie?"}
            placeholder={tipo === "error" ? "Ej.: al cobrar con tarjeta la pantalla quedó en blanco" : "Ej.: estaría bueno ver el stock al buscar un producto"}
            aria-invalid={falta !== null && texto.trim().length < 3} aria-describedby={falta ? "tkv-falta" : undefined} data-testid="descripcion" />
          <div>
            <div className="tkv-fotos-cab"><span className="mv-etiqueta">{t.fotosOCapturas.largo}</span><span className="mv-detalle">{fotos.length} de {MAXIMO_DE_FOTOS} · Ctrl V pega</span></div>
            <ul className="tkv-minis" aria-label="Fotos del ticket">
              {fotos.map((f, i) => (
                <li key={`${f.name}-${f.size}-${i}`} className="tkv-mini">
                  <Miniatura origen={f} />
                  <button type="button" className="quitar" aria-label={`Quitar la foto ${i + 1}`} onClick={() => { setFotos(fotos.filter((_, n) => n !== i)); setFalta(null); }}><IconoDeLaV2 nombre="cruz" tam={14} /></button>
                </li>
              ))}
              {fotos.length < MAXIMO_DE_FOTOS && <li><button type="button" className="tkv-agregar" onClick={() => void pegar()} data-testid="pegar-foto"><IconoDeLaV2 nombre="pegar" />{t.pegar.largo}</button></li>}
            </ul>
          </div>
          <div className="tkv-via">
            <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(e) => { agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} data-testid="archivo-foto" />
            <button type="button" className="mv-btn chico" disabled={fotos.length >= MAXIMO_DE_FOTOS} onClick={() => archivo.current?.click()} aria-keyshortcuts="Alt+F" data-testid="agregar-foto"><IconoDeLaV2 nombre="clip" tam={16} />{t.elegirArchivos.largo} <span className="mv-kbd">Alt F</span></button>
            {hayQueUsarElCelular() && <button type="button" className="mv-btn chico" disabled={pidiendo || fotos.length >= MAXIMO_DE_FOTOS} onClick={() => setPidiendo(true)} data-testid="foto-con-celular"><IconoDeLaV2 nombre="celular" tam={16} />{t.sacarConElCelular.largo}</button>}
          </div>
          {pidiendo && <PedirFotoAlCelular para="una foto para el ticket" alCancelar={() => setPidiendo(false)} alRecibir={(f) => { setPidiendo(false); agregarFotos([f]); }} />}
          <div>
            <div className="mv-etiqueta tkv-va-con-titulo">{t.vaCon.largo}</div>
            <div className="tkv-va-con">
              {usuario && <span className="mv-pastilla contorno"><span className="tkv-av">{iniciales(usuario).slice(0, 1)}</span>{usuario}</span>}
              <span className="mv-pastilla contorno"><IconoDeLaV2 nombre="pantalla" tam={16} />{describirDispositivo()}</span>
              <span className="mv-pastilla contorno">{t.version.largo} {import.meta.env.VITE_VERSION ?? "local"}</span>
            </div>
          </div>
          {falta && <p className="mv-aviso error" id="tkv-falta" role="alert">{falta}</p>}
          {aviso && <p className="mv-aviso logro" role="status" data-testid="mensaje">{aviso}</p>}
          <button type="button" className="mv-btn accion grande tkv-enviar" disabled={enviando} onClick={() => void enviar()} aria-keyshortcuts="Control+Enter" data-testid="enviar">
            <IconoDeLaV2 nombre="enviar" />{enviando ? "Enviando…" : `${t.enviar.largo} ${tipoTexto.largo}`} <span className="mv-kbd">Ctrl Enter</span>
          </button>
        </section>

        <section className="tkv-seguir" aria-label="Tickets">
          <div className="tkv-resumenes">
            <div className="mv-resumen"><span className="ico"><IconoDeLaV2 nombre="bandeja" /></span><div><div className="et">{t.abiertos.largo}</div><div className="va">{tickets ? r.abiertos : "—"}</div></div>
              <div className="tkv-barras" title={t.creadosYResueltos.largo} aria-hidden="true">{r.semanas.map((s, i) => <span key={i}><b style={{ height: `${(s.creados / maxBarra) * 100}%` }} /><b className="r" style={{ height: `${(s.resueltos / maxBarra) * 100}%` }} /></span>)}</div>
            </div>
            <div className="mv-resumen urgente"><span className="ico"><IconoDeLaV2 nombre="reloj-de-arena" /></span><div><div className="et">{t.esperan.largo}</div><div className="va">{tickets ? r.esperan : "—"}</div></div></div>
            <div className="mv-resumen logro"><span className="ico"><IconoDeLaV2 nombre="tilde-circulo" /></span><div><div className="et">{t.resueltosEn.largo} {r.mes}</div><div className="va">{tickets ? r.resueltosDelMes : "—"}</div></div></div>
          </div>
          <div className="tkv-filtros">
            <div className="tkv-segmentos" role="group" aria-label="Cuáles ver">
              <button type="button" aria-pressed={viendo === "abierto"} className={viendo === "abierto" ? "elegido" : ""} onClick={() => setViendo("abierto")}>{t.abiertos.largo}{tickets ? ` ${r.abiertos}` : ""}</button>
              <button type="button" aria-pressed={viendo === "resuelto"} className={viendo === "resuelto" ? "elegido" : ""} onClick={() => setViendo("resuelto")}>{t.resueltos.largo}{tickets ? ` ${resueltos}` : ""}</button>
            </div>
            <span className="tkv-esp" />
            <div className="tkv-chips" role="group" aria-label="Ideas o errores">
              <button type="button" className={filtro === "todos" ? "elegido" : ""} aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>{t.todos.largo}</button>
              <button type="button" className={filtro === "mejora" ? "elegido" : ""} aria-pressed={filtro === "mejora"} onClick={() => setFiltro("mejora")}><IconoDeLaV2 nombre="lamparita" tam={16} />{t.ideas.largo} {delEstado.filter((x) => x.tipo === "mejora").length}</button>
              <button type="button" className={filtro === "error" ? "elegido" : ""} aria-pressed={filtro === "error"} onClick={() => setFiltro("error")}><IconoDeLaV2 nombre="bicho" tam={16} />{t.errores.largo} {delEstado.filter((x) => x.tipo === "error").length}</button>
            </div>
          </div>
          <div className="tkv-lista">
            {pendientes.map((p) => <Fila key={p.id} ticket={p} alAbrir={() => setAbierto(p)} />)}
            {error && <p className="mv-aviso error" role="alert">{error} <button type="button" className="mv-btn chico" onClick={() => void cargar()}>{t.reintentar.largo}</button></p>}
            {!tickets && !error && <p className="mv-cargando" aria-busy="true">Buscando los tickets…</p>}
            {tickets && visibles.length === 0 && <p className="tkv-vacio">{viendo === "abierto" ? (lista.length ? "No queda ningún ticket abierto." : "Todavía no hay tickets. El primero lo escribís acá al lado.") : "Todavía no se resolvió ninguno."}</p>}
            {visibles.length > 0 && <div data-testid="lista-de-tickets">{visibles.map((x) => <Fila key={x.id} ticket={x} alAbrir={() => setAbierto(x)} />)}</div>}
          </div>
        </section>
      </div>
      {abierto && <Detalle ticket={abierto} alCerrar={() => setAbierto(null)} alCambiar={async () => { await cargar(); setAbierto(null); }} />}
    </main>
  );
}

function Fila({ ticket: x, alAbrir }: { ticket: Ticket | Pendiente; alAbrir: () => void }) {
  const enviado = "estado" in x;
  const dias = enviado && x.estado === "abierto" ? diasAbierto(x) : 0;
  return (
    <button type="button" className={`tkv-tk ${enviado ? "" : "porenviar"}`} onClick={alAbrir} data-testid="ticket">
      <span className={`tkv-tipo ${x.tipo}`}><IconoDeLaV2 nombre={x.tipo === "error" ? "bicho" : "lamparita"} /></span>
      {/* El tipo se ve en el ícono; quien no ve la pantalla lo oye. */}
      <span className="solo-lectores">{x.tipo === "error" ? "Error" : "Mejora"}. </span>
      <span className="tx"><span className="texto">{x.descripcion}</span>
        <span className={`quien ${enviado ? "" : "urgente"}`}>{enviado ? [x.usuario, cuandoCorto(x.creado_en), x.dispositivo].filter(Boolean).join(" · ") : t.porEnviar.largo}</span></span>
      <span className="lado">
        {x.fotos.length > 0 && <span className="tkv-apilado">{x.fotos.slice(0, x.fotos.length > 2 ? 2 : 2).map((f, i) => <span key={i} className="tkv-mini chica"><Miniatura origen={f} /></span>)}{x.fotos.length > 2 && <span className="tkv-mini chica mas">+{x.fotos.length - 2}</span>}</span>}
        {dias >= DIAS_DE_ESPERA && <span className="mv-pastilla urgente"><IconoDeLaV2 nombre="reloj-de-arena" tam={16} />{dias} días</span>}
        {enviado && x.estado === "resuelto" && <span className="mv-pastilla logro">{t.resuelto.largo}</span>}
        {!enviado && <IconoDeLaV2 nombre="nube-subir" />}
      </span>
      <IconoDeLaV2 nombre="derecha" tam={16} className="chev" />
    </button>
  );
}

// El ticket abierto: el texto entero, quién, cuándo y dónde, las fotos y, si se mandó, marcarlo
// resuelto con una nota o reabrirlo.
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
    <Hoja ancha testId="ticket-abierto" alCerrar={alCerrar} titulo={x.descripcion}
      foto={<span className={`tkv-tipo grande ${x.tipo}`}><IconoDeLaV2 nombre={x.tipo === "error" ? "bicho" : "lamparita"} tam={24} /></span>}
      bajoTitulo={<span className="mv-detalle">{enviado ? [x.usuario, cuandoCorto(x.creado_en), x.dispositivo, x.version ? `versión ${x.version}` : null].filter(Boolean).join(" · ") : t.porEnviar.largo}</span>}
      pie={!enviado ? <div className="mv-aviso urgente tkv-pie-aviso"><IconoDeLaV2 nombre="nube-subir" tam={16} /><span>{t.todaviaNoSalio.largo}</span></div>
        : x.estado === "resuelto" ? <><div className="mv-aviso logro tkv-pie-aviso"><IconoDeLaV2 nombre="tilde-circulo" tam={16} /><span><b>{x.resuelto_por ?? "Alguien"} lo resolvió</b>{x.resuelto_en ? ` ${cuandoCorto(x.resuelto_en)}` : ""}{x.nota ? `: ${x.nota}` : ""}</span></div><button type="button" className="mv-btn" onClick={() => void pedir("reabrir")} data-testid="reabrir"><IconoDeLaV2 nombre="repetir" tam={16} />{t.reabrir.largo}</button></>
        : <form className="tkv-resolver" onSubmit={(e) => { e.preventDefault(); void pedir("resolver"); }}>
            <input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={2000} placeholder={t.notaParaQuienAviso.largo} aria-label={t.notaParaQuienAviso.largo} data-testid="nota" />
            <button type="submit" className="mv-btn accion" data-testid="confirmar-resuelto"><IconoDeLaV2 nombre="tilde" tam={16} />{t.marcarResuelto.largo}</button>
          </form>}>
      <div className="mv2 tkv-detalle">
        {x.fotos.length > 0 && <ul className="tkv-minis grandes">{x.fotos.map((f, i) => <li key={i}><button type="button" className="tkv-mini" aria-label={`Ver la foto ${i + 1} en grande`} onClick={() => setGrande(f)}><Miniatura origen={f} /></button></li>)}</ul>}
        {enviado && x.estado === "abierto" && <p className="mv-detalle">{diasAbierto(x) === 0 ? t.abiertoHoy.largo : `${t.abiertoHace.largo} ${diasAbierto(x) === 1 ? "1 día" : `${diasAbierto(x)} días`}.`}</p>}
        {error && <p className="mv-aviso error" role="alert">{error}</p>}
      </div>
      {grande && <FotoGrande origen={grande} alCerrar={() => setGrande(null)} />}
    </Hoja>
  );
}

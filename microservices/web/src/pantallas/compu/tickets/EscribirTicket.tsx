import type { RefObject } from "react";
import { MAXIMO_DE_FOTOS, type TicketNuevo } from "../../../negocio/tickets";
import { iniciales } from "../../../negocio/apartados";
import { useUsuarioActual } from "../../../negocio/usuarios";
import { describirDispositivo } from "../../../plataforma/dispositivo";
import { Miniatura } from "../../comun/tickets/Fotos";
import { PedirFotoAlCelular, hayQueUsarElCelular } from "../../PedirFoto";
import { TEXTOS } from "../../textos";
import { VERSION } from "../../../plataforma/ambiente";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;
type Props = { nuevo: TicketNuevo; caja: RefObject<HTMLTextAreaElement>; archivo: RefObject<HTMLInputElement>; pidiendo: boolean; alPedir: (si: boolean) => void };

// «Pegar»: la captura que haya en el portapapeles; si el navegador no deja leerlo, Ctrl V.
async function pegar(n: TicketNuevo) {
  try {
    const archivos: File[] = [];
    for (const item of await navigator.clipboard.read()) for (const tipo of item.types.filter((x) => x.startsWith("image/"))) archivos.push(new File([await item.getType(tipo)], "captura.png", { type: tipo }));
    if (archivos.length) n.agregarFotos(archivos); else n.setFalta(t.nadaParaPegar.largo);
  } catch { n.setFalta(t.pegaConCtrlV.largo); }
}

// A la izquierda se escribe: idea o error, el texto, las fotos, lo que va solo y «Enviar».
export function EscribirTicket({ nuevo: n, caja, archivo, pidiendo, alPedir }: Props) {
  return (
    <section className={`mv-tarjeta-2 ${css.escribir}`} aria-label="Ticket nuevo" onPaste={(e) => n.agregarFotos(Array.from(e.clipboardData.files))}>
      <Eleccion n={n} />
      <textarea ref={caja} className={css.caja} value={n.texto} onChange={(e) => n.escribir(e.target.value)} maxLength={5000}
        aria-label={n.tipo === "error" ? "¿Qué pasó? ¿Qué estabas haciendo?" : "¿Qué te gustaría que tenga o que cambie?"}
        placeholder={n.tipo === "error" ? "Ej.: al cobrar con tarjeta la pantalla quedó en blanco" : "Ej.: estaría bueno ver el stock al buscar un producto"}
        aria-invalid={n.corto} aria-describedby={n.falta ? "tkv-falta" : undefined} data-testid="descripcion" />
      <Fotos n={n} />
      <OtrasVias n={n} archivo={archivo} pidiendo={pidiendo} alPedir={alPedir} />
      <VaCon />
      {n.falta && <p className="mv-aviso error" id="tkv-falta" role="alert">{n.falta}</p>}
      {n.aviso && <p className="mv-aviso logro" role="status" data-testid="mensaje">{n.aviso}</p>}
      <button type="button" className={`mv-btn accion grande ${css.enviar}`} disabled={n.enviando} onClick={() => void n.enviar()} aria-keyshortcuts="Control+Enter" data-testid="enviar">
        <Icono nombre="enviar" />{n.enviando ? "Enviando…" : `${t.enviar.largo} ${(n.tipo === "error" ? t.error : t.idea).largo}`} <span className="mv-kbd">Ctrl Enter</span>
      </button>
    </section>
  );
}

// Elegir archivos (Alt F) o, si hace falta, sacar la foto con el celular.
function OtrasVias({ n, archivo, pidiendo, alPedir }: Omit<Props, "nuevo" | "caja"> & { n: TicketNuevo }) {
  return (
    <>
      <div className={css.via}>
        <input ref={archivo} type="file" accept="image/*" multiple hidden onChange={(e) => { n.agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; }} data-testid="archivo-foto" />
        <button type="button" className="mv-btn chico" disabled={n.lleno} onClick={() => archivo.current?.click()} aria-keyshortcuts="Alt+F" data-testid="agregar-foto"><Icono nombre="clip" tam={16} />{t.elegirArchivos.largo} <span className="mv-kbd">Alt F</span></button>
        {hayQueUsarElCelular() && <button type="button" className="mv-btn chico" disabled={pidiendo || n.lleno} onClick={() => alPedir(true)} data-testid="foto-con-celular"><Icono nombre="celular" tam={16} />{t.sacarConElCelular.largo}</button>}
      </div>
      {pidiendo && <PedirFotoAlCelular para="una foto para el ticket" alCancelar={() => alPedir(false)} alRecibir={(f) => { alPedir(false); n.agregarFotos([f]); }} />}
    </>
  );
}

function Eleccion({ n }: { n: TicketNuevo }) {
  return (
    <div className={css.eleccion} role="radiogroup" aria-label="Qué querés contar">
      {(["mejora", "error"] as const).map((v) => (
        <button key={v} type="button" role="radio" aria-checked={n.tipo === v} className={n.tipo === v ? "elegida" : ""} onClick={() => n.setTipo(v)} data-testid={`tipo-${v}`}>
          <Icono nombre={v === "error" ? "bicho" : "lamparita"} tam={24} />
          <span>{v === "error" ? t.encontreUnError.largo : t.tengoUnaIdea.largo}<small>{v === "error" ? t.algoQueNoAnda.largo : t.algoQueFalta.largo}</small></span>
        </button>
      ))}
    </div>
  );
}

function Fotos({ n }: { n: TicketNuevo }) {
  return (
    <div>
      <div className={css.fotosCab}><span className="mv-etiqueta">{t.fotosOCapturas.largo}</span><span className="mv-detalle">{n.fotos.length} de {MAXIMO_DE_FOTOS} · Ctrl V pega</span></div>
      <ul className={css.minis} aria-label="Fotos del ticket">
        {n.fotos.map((f, i) => (
          <li key={`${f.name}-${f.size}-${i}`} className={css.mini}>
            <Miniatura origen={f} />
            <button type="button" className="quitar" aria-label={`Quitar la foto ${i + 1}`} onClick={() => n.quitarFoto(i)}><Icono nombre="cruz" tam={14} /></button>
          </li>
        ))}
        {!n.lleno && <li><button type="button" className={css.agregar} onClick={() => void pegar(n)} data-testid="pegar-foto"><Icono nombre="pegar" />{t.pegar.largo}</button></li>}
      </ul>
    </div>
  );
}

// Lo que va solo con el ticket: quién, el dispositivo y la versión.
function VaCon() {
  const usuario = useUsuarioActual()?.nombre ?? null;
  return (
    <div>
      <div className={`mv-etiqueta ${css.vaConTitulo}`}>{t.vaCon.largo}</div>
      <div className={css.vaCon}>
        {usuario && <span className="mv-pastilla contorno"><span className={css.av}>{iniciales(usuario).slice(0, 1)}</span>{usuario}</span>}
        <span className="mv-pastilla contorno"><Icono nombre="pantalla" tam={16} />{describirDispositivo()}</span>
        <span className="mv-pastilla contorno">{t.version.largo} {VERSION}</span>
      </div>
    </div>
  );
}

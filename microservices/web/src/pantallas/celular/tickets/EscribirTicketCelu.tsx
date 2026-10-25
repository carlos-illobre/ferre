import { useRef, type RefObject } from "react";
import { MAXIMO_DE_FOTOS, type TicketNuevo } from "../../../negocio/tickets";
import { Miniatura } from "../../comun/tickets/Fotos";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Tickets.module.css";

const t = TEXTOS.ticketsV2;

// La tarjeta para escribir: idea o error, el texto, la cámara y la galería y las fotos con su «×».
export function EscribirTicketCelu({ nuevo: n, caja }: { nuevo: TicketNuevo; caja: RefObject<HTMLTextAreaElement> }) {
  return (
    <section className={`mv-tarjeta-2 ${css.escribir}`} aria-label="Ticket nuevo" onPaste={(e) => n.agregarFotos(Array.from(e.clipboardData.files))}>
      <div className={css.eleccion} role="radiogroup" aria-label="Qué querés contar">
        {(["mejora", "error"] as const).map((v) => (
          <button key={v} type="button" role="radio" aria-checked={n.tipo === v} className={n.tipo === v ? "elegida" : ""} onClick={() => n.setTipo(v)} data-testid={`tipo-${v}`}>
            <Icono nombre={v === "error" ? "bicho" : "lamparita"} />{v === "error" ? t.encontreUnError.corto : t.tengoUnaIdea.corto}
          </button>
        ))}
      </div>
      <textarea ref={caja} className={css.caja} value={n.texto} onChange={(e) => n.escribir(e.target.value)} maxLength={5000}
        aria-label={n.tipo === "error" ? "¿Qué pasó? ¿Qué estabas haciendo?" : "¿Qué te gustaría que tenga o que cambie?"}
        placeholder={n.tipo === "error" ? "Ej.: al cobrar la pantalla quedó en blanco" : "Ej.: ver el stock al buscar un producto"}
        aria-invalid={n.corto} data-testid="descripcion" />
      <Fotos n={n} />
      {n.falta && <p className="mv-aviso error" role="alert">{n.falta}</p>}
    </section>
  );
}

function Fotos({ n }: { n: TicketNuevo }) {
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const elegidas = (e: React.ChangeEvent<HTMLInputElement>) => { n.agregarFotos(Array.from(e.target.files ?? [])); e.target.value = ""; };
  return (
    <div className={css.fotos}>
      <input ref={camara} type="file" accept="image/*" capture="environment" hidden onChange={elegidas} data-testid="camara-foto" />
      <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={elegidas} data-testid="archivo-foto" />
      <button type="button" className={`${css.tomar} cam`} aria-label={t.sacarFoto.corto} disabled={n.lleno} onClick={() => camara.current?.click()} data-testid="agregar-foto"><Icono nombre="camara" tam={24} /></button>
      <button type="button" className={`${css.tomar} gal`} aria-label={t.elegirDeLaGaleria.corto} disabled={n.lleno} onClick={() => galeria.current?.click()} data-testid="elegir-de-la-galeria"><Icono nombre="imagen-mas" tam={24} /></button>
      {n.fotos.map((f, i) => (
        <span key={`${f.name}-${f.size}-${i}`} className={css.mini}>
          <Miniatura origen={f} />
          <button type="button" className="quitar" aria-label={`Quitar la foto ${i + 1}`} onClick={() => n.quitarFoto(i)}><Icono nombre="cruz" tam={14} /></button>
        </span>
      ))}
      <span className="cuantas">{n.fotos.length}/{MAXIMO_DE_FOTOS}</span>
    </div>
  );
}

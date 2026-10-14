import { useEffect, useId, useRef, type ReactNode } from "react";
import { useVolverCierra } from "../navegacion/volver";
import "./piezas.css";

// Las piezas de interfaz de cualquier pantalla: botón, hoja (ventana sobre lo que se está
// haciendo), aviso en el lugar y aviso flotante. Se acomodan al ancho: en un celular la hoja
// sube desde abajo, en una computadora es una ventana centrada. Los colores y las medidas los
// pone la aplicación con las variables `--pz-*` (ver `piezas.css`). No dependen de nada de la
// aplicación: se pueden copiar a otro proyecto.

const TRAZOS = {
  cerrar: "M18 6 6 18M6 6l12 12",
  ok: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.5l2.7 2.7L16 9.5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 16.5h.01",
  error: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16h.01",
  alerta: "M12 9v4.5M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z",
};
function Trazo({ nombre, tam = 20 }: { nombre: keyof typeof TRAZOS; tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

// `variante`: principal (la acción de la pantalla), marino (una acción que ordena), peligro
// (lo que no se deshace) o texto (un enlace con forma de botón). `icono` va antes del texto.
export type VarianteDeBoton = "principal" | "marino" | "peligro" | "sobre-marino" | "texto";
export type PropiedadesDeBoton = {
  children?: ReactNode; variante?: VarianteDeBoton; tam?: "chico" | "grande"; icono?: ReactNode; ancho?: boolean; tecla?: string; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
export function Boton({ children, variante, tam, icono, ancho, tecla, className, ...resto }: PropiedadesDeBoton) {
  const soloIcono = icono && (children === undefined || children === null);
  const clases = ["boton", variante, tam, ancho && "ancho", soloIcono && "solo-icono", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={clases} aria-keyshortcuts={tecla} {...resto}>
      {icono}
      {children}
      {tecla && <span className="tecla solo-compu" aria-hidden="true">{tecla}</span>}
    </button>
  );
}

// Abre un <dialog> como modal al montarse y avisa al cerrarse (Escape incluido). El navegador
// encierra el foco y lo devuelve al cerrar.
export function useDialogo(alCerrar: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const cerrar = useRef(alCerrar);
  cerrar.current = alCerrar;
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const anterior = document.activeElement as HTMLElement | null;
    if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    const alCancelar = (e: Event) => { e.preventDefault(); cerrar.current(); };
    d.addEventListener("cancel", alCancelar);
    return () => { d.removeEventListener("cancel", alCancelar); if (typeof d.close === "function" && d.open) d.close(); anterior?.focus?.(); };
  }, []);
  return ref;
}

// Con varias hojas apiladas (una ficha y, encima, una explicación), Escape cierra la de arriba.
const hojasAbiertas: (() => void)[] = [];
function useEscapeCierraLaDeArriba(alCerrar: () => void) {
  useEffect(() => {
    hojasAbiertas.push(alCerrar);
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || hojasAbiertas[hojasAbiertas.length - 1] !== alCerrar) return;
      e.preventDefault(); e.stopPropagation(); alCerrar();
    };
    window.addEventListener("keydown", tecla, true);
    return () => { window.removeEventListener("keydown", tecla, true); const i = hojasAbiertas.lastIndexOf(alCerrar); if (i >= 0) hojasAbiertas.splice(i, 1); };
  }, [alCerrar]);
}

// Ventana sobre lo que se está haciendo. Cierra con la cruz, con Escape, tocando afuera o con el
// botón de volver del celular. `extra` va al lado del título; `pie`, abajo (las acciones).
export function Hoja({ titulo, alCerrar, children, pie, extra, ancha, testId }: { titulo?: ReactNode; alCerrar: () => void; children: ReactNode; pie?: ReactNode; extra?: ReactNode; ancha?: boolean; testId?: string }) {
  const ref = useDialogo(alCerrar);
  useVolverCierra(alCerrar);
  useEscapeCierraLaDeArriba(alCerrar);
  const idTitulo = useId();
  return (
    <dialog ref={ref} className={`hoja ${ancha ? "ancha" : ""}`} aria-labelledby={titulo !== undefined ? idTitulo : undefined} aria-label={titulo === undefined ? "Detalle" : undefined} data-testid={testId}
      onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="hoja-cabeza">
        {titulo !== undefined && <h2 id={idTitulo}>{titulo}</h2>}
        {extra}
        <Boton icono={<Trazo nombre="cerrar" />} aria-label="Cerrar" onClick={alCerrar} />
      </div>
      <div className="hoja-cuerpo">
        {children}
        {pie && <div className="hoja-pie">{pie}</div>}
      </div>
    </dialog>
  );
}

// Aviso flotante: confirma lo que salió bien.
export function Toast({ texto, alCerrar, testId = "mensaje" }: { texto: string | null; alCerrar: () => void; testId?: string }) {
  if (!texto) return null;
  return (
    <div className="toast" role="status" data-testid={testId}>
      <Trazo nombre="ok" />
      <span>{texto}</span>
      <button type="button" onClick={alCerrar} aria-label="Cerrar aviso"><Trazo nombre="cerrar" tam={18} /></button>
    </div>
  );
}

// Aviso en el lugar. «error» y «alerta» se anuncian; desaparece cuando quien lo muestra deja de
// pasarle texto (al corregirse la causa). `accion` va a la derecha («Reintentar», «Cerrar»).
export function Aviso({ tipo = "info", children, accion, testId }: { tipo?: "info" | "error" | "alerta" | "ok"; children: ReactNode; accion?: ReactNode; testId?: string }) {
  if (children === null || children === undefined || children === false || children === "") return null;
  return (
    <div className={`aviso ${tipo}`} role={tipo === "error" ? "alert" : "status"} data-testid={testId}>
      <Trazo nombre={tipo} />
      <div>{children}</div>
      {accion}
    </div>
  );
}

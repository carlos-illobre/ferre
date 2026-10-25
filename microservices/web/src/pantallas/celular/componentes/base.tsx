import { useVolverCierra } from "../../../plataforma/navegacion/volver";
import { Children, useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";

// Piezas del sistema visual (docs/sistema-visual.md, rediseño de mockups/Ferre iOS.html): íconos de
// trazo, hoja que sube desde abajo, avisos, segmentos, buscador, contador de cantidad,
// pantalla de éxito. Mismas piezas en el celular y en la computadora.

// Los íconos son uno solo para toda la aplicación (ADR-028).
export { Icono, type NombreDeIcono };

// Hoja: en el celular sube desde abajo; en la computadora es una ventana centrada. Cierra
// tocando el fondo, con Escape o con el botón que le pase el contenido.
const hojasAbiertas: (() => void)[] = [];
// Mientras haya alguna hoja abierta, la pantalla de atrás no se desplaza (001, «Lo de atrás queda
// quieto»): la página entera se traba y queda donde estaba. Se cuenta para las hojas apiladas.
let trabas = 0;
function useTrabarLoDeAtras() {
  useEffect(() => {
    if (trabas++ === 0) document.documentElement.classList.add("con-hoja");
    return () => { if (--trabas === 0) document.documentElement.classList.remove("con-hoja"); };
  }, []);
}
export function Hoja({ titulo, extra, alCerrar, children, testId, clase }: { titulo?: ReactNode; extra?: ReactNode; alCerrar: () => void; children: ReactNode; testId?: string; clase?: string }) {
  // El botón de volver del celular cierra la hoja y deja la pantalla de abajo como estaba.
  useVolverCierra(alCerrar);
  useTrabarLoDeAtras();
  useEffect(() => {
    // Con varias hojas apiladas (la ficha y, encima, una explicación), Escape cierra la de arriba.
    hojasAbiertas.push(alCerrar);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && hojasAbiertas[hojasAbiertas.length - 1] === alCerrar) { e.stopPropagation(); alCerrar(); } };
    window.addEventListener("keydown", tecla, true);
    return () => { window.removeEventListener("keydown", tecla, true); const i = hojasAbiertas.lastIndexOf(alCerrar); if (i >= 0) hojasAbiertas.splice(i, 1); };
  }, [alCerrar]);
  return (
    <div className="hoja-fondo" onClick={alCerrar} role="presentation">
      <div className={`hoja ${clase ?? ""}`} role="dialog" aria-label={typeof titulo === "string" ? titulo : undefined} onClick={(e) => e.stopPropagation()} data-testid={testId}>
        <div className="manija" aria-hidden="true" />
        {/* Con título, la «×» para cerrar arriba a la derecha, como la v2 (decisión 143). */}
        {titulo !== undefined && <div className="titulo-hoja"><span>{titulo}</span>{extra}<button type="button" className="hoja-cerrar" onClick={alCerrar} aria-label="Cerrar" data-testid="cerrar-hoja"><Icono nombre="cerrar" tam={20} grosor={2.4} /></button></div>}
        {children}
      </div>
    </div>
  );
}

// Un aviso breve; con `accion`, un botón para deshacer lo que se acaba de hacer.
export function Toast({ texto, alCerrar, testId = "mensaje", accion }: { texto: ReactNode; alCerrar: () => void; testId?: string; accion?: { texto: string; alTocar: () => void } }) {
  if (!texto) return null;
  return (
    <div className="toast" role="status" data-testid={testId}>
      <span>{texto}</span>
      {accion && <button type="button" className="toast-accion" onClick={accion.alTocar}>{accion.texto}</button>}
      <button type="button" onClick={alCerrar} aria-label="Cerrar aviso">×</button>
    </div>
  );
}

export function AvisoError({ texto, alCerrar }: { texto: string | null | undefined; alCerrar?: () => void }) {
  if (!texto) return null;
  return (
    <div className="aviso-error" role="alert">
      <span>{texto}</span>
      {alCerrar && <button type="button" onClick={alCerrar}>Cerrar</button>}
    </div>
  );
}

export function Segmentos<T extends string>({ opciones, actual, alElegir, chico }: { opciones: { valor: T; nombre: string }[]; actual: T; alElegir: (v: T) => void; chico?: boolean }) {
  return (
    <div className={`segmentos ${chico ? "chico" : ""}`} role="tablist">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="tab" aria-selected={o.valor === actual} className={o.valor === actual ? "activo" : ""} onClick={() => alElegir(o.valor)}>{o.nombre}</button>
      ))}
    </div>
  );
}

// Caja de búsqueda con lupa, "×" para borrar y, si hay cámara, el botón de escanear.
// `extra`: un botón más al lado del lector (los filtros del Catálogo, 015).
export function Buscador({ valor, alCambiar, placeholder, alEscanear, chico, autoFoco, disabled, onKeyDown, cajaRef, testId = "busqueda", extra }: {
  valor: string; alCambiar: (v: string) => void; placeholder: string; alEscanear?: () => void; chico?: boolean; autoFoco?: boolean; disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; cajaRef?: React.RefObject<HTMLInputElement>; testId?: string; extra?: ReactNode;
}) {
  return (
    <div className={`buscador ${chico ? "chico" : ""}`}>
      <div className="caja">
        <Icono nombre="buscar" tam={chico ? 18 : 20} grosor={2.2} className="lupa" />
        <input ref={cajaRef} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} autoFocus={autoFoco} autoComplete="off" disabled={disabled} onKeyDown={onKeyDown} data-testid={testId} />
        {valor && <button type="button" className="limpiar" aria-label="Borrar" onClick={() => alCambiar("")}>×</button>}
      </div>
      {alEscanear && <button type="button" className="escanear" aria-label="Escanear" onClick={alEscanear} data-testid="escanear"><Icono nombre="escanear" tam={22} /></button>}
      {extra}
    </div>
  );
}

// Cantidad con − y +: enteros por unidad, de a 0,5 a granel (hasta un decimal). Con `alQuitar`,
// «−» en el mínimo quita el renglón en lugar de quedarse quieto (Vender en el celular, decisión 119).
export function Contador({ valor, entera, alCambiar, min = entera ? 1 : 0.1, children, testId = "cantidad", alQuitar }: { valor: number; entera: boolean; alCambiar: (v: number) => void; min?: number; children?: ReactNode; testId?: string; alQuitar?: () => void }) {
  const paso = entera ? 1 : 0.5;
  const redondear = (v: number) => (entera ? Math.floor(v) : Math.round(v * 10) / 10);
  const quita = alQuitar && valor - paso < min - 1e-9;
  return (
    <div className="contador">
      <button type="button" aria-label={quita ? "Quitar" : "Menos"} onClick={() => (quita ? alQuitar() : alCambiar(Math.max(min, redondear(valor - paso))))}>−</button>
      <input inputMode="decimal" value={valor === 0 ? "" : String(valor).replace(".", ",")} onFocus={(e) => e.target.select()}
        onChange={(e) => { const v = Number(e.target.value.replace(",", ".")); alCambiar(!Number.isFinite(v) || v <= 0 ? 0 : redondear(v)); }}
        onBlur={() => { if (valor === 0) alCambiar(min); }} data-testid={testId} />
      <button type="button" aria-label="Más" onClick={() => alCambiar(redondear(valor + paso))}>+</button>
      {children}
    </div>
  );
}

export function Exito({ que, importe, medio, detalle, boton, alCerrar }: { que: string; importe: string; medio: string; detalle: string; boton: string; alCerrar: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="exito" role="dialog" aria-label={que} data-testid="exito">
      <div className="tilde"><Icono nombre="tilde" tam={44} grosor={3} /></div>
      <div className="que">{que}</div>
      <div className="importe">{importe}</div>
      <div className="medio">{medio}</div>
      <div className="detalle">{detalle}</div>
      <button ref={ref} type="button" className="boton" onClick={alCerrar} data-testid="cerrar-exito">{boton}</button>
    </div>
  );
}

export function Pasos({ pasos }: { pasos: string[] }) {
  return (
    <ol className="pasos">
      {pasos.map((p, i) => <li key={i}><span className="n">{i + 1}</span><span>{p}</span></li>)}
    </ol>
  );
}

export function Miniatura({ url }: { url?: string | null }) {
  return <span className="miniatura">{url ? <img src={url} alt="" /> : null}</span>;
}

// Un listado (decisión: HTML semántico, docs/sistema-visual.md): una lista `ul` con un `li` por
// renglón, para que un lector de pantalla diga que es una lista y cuántos tiene. Se ve igual
// que antes: el renglón sigue siendo el botón o la fila de adentro.
export function Lista({ children, className, ...resto }: HTMLAttributes<HTMLUListElement> & { "data-testid"?: string }) {
  return (
    <ul className={`lista ${className ?? ""}`.trim()} {...resto}>
      {Children.map(children, (renglon) => (renglon === null || renglon === undefined || renglon === false || renglon === "" ? null : <li>{renglon}</li>))}
    </ul>
  );
}

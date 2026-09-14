import { useEffect, useRef, type ReactNode } from "react";

// Piezas del sistema visual (docs/ux.md, rediseño de mockups/Ferre iOS.html): íconos de
// trazo, hoja que sube desde abajo, avisos, segmentos, buscador, contador de cantidad,
// pantalla de éxito. Mismas piezas en el celular y en la computadora.

const TRAZOS: Record<string, string> = {
  vender: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0",
  catalogo: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  deposito: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16ZM3.3 7l8.7 5 8.7-5M12 22V12",
  negocio: "M3 3v18h18M7 15l4-5 4 3 5-7",
  buscar: "M11 11m-7.5 0a7.5 7.5 0 1 0 15 0a7.5 7.5 0 1 0-15 0M20.5 20.5l-4.2-4.2",
  escanear: "M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2M7 9v6M11 9v6M14 9v6M17 9v6",
  cerrar: "M18 6 6 18M6 6l12 12",
  tilde: "m5 12 5 5L20 7",
  derecha: "m9 6 6 6-6 6",
  izquierda: "m15 6-6 6 6 6",
  abajo: "m6 9 6 6 6-6",
  arriba: "m6 15 6-6 6 6",
  subir: "M12 3v12M7 8l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  camara: "M4 7h3l2-3h6l2 3h3v12H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  huella: "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M2 12a10 10 0 0 1 18-6M2 16h.01M21.8 16c.2-2 .131-5.354 0-6M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2M8.65 22c.21-.66.45-1.32.57-2M9 6.8a6 6 0 0 1 9 5.2v2",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
};
export function Icono({ nombre, tam = 20, grosor = 2, className }: { nombre: keyof typeof TRAZOS | string; tam?: number; grosor?: number; className?: string }) {
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre] ?? ""} />
    </svg>
  );
}

// Hoja: en el celular sube desde abajo; en la computadora es una ventana centrada. Cierra
// tocando el fondo, con Escape o con el botón que le pase el contenido.
const hojasAbiertas: (() => void)[] = [];
export function Hoja({ titulo, extra, alCerrar, children, testId }: { titulo?: ReactNode; extra?: ReactNode; alCerrar: () => void; children: ReactNode; testId?: string }) {
  useEffect(() => {
    // Con varias hojas apiladas (la ficha y, encima, una explicación), Escape cierra la de arriba.
    hojasAbiertas.push(alCerrar);
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape" && hojasAbiertas[hojasAbiertas.length - 1] === alCerrar) { e.stopPropagation(); alCerrar(); } };
    window.addEventListener("keydown", tecla, true);
    return () => { window.removeEventListener("keydown", tecla, true); const i = hojasAbiertas.lastIndexOf(alCerrar); if (i >= 0) hojasAbiertas.splice(i, 1); };
  }, [alCerrar]);
  return (
    <div className="hoja-fondo" onClick={alCerrar} role="presentation">
      <div className="hoja" role="dialog" aria-label={typeof titulo === "string" ? titulo : undefined} onClick={(e) => e.stopPropagation()} data-testid={testId}>
        <div className="manija" aria-hidden="true" />
        {titulo !== undefined && <div className="titulo-hoja"><span>{titulo}</span>{extra}</div>}
        {children}
      </div>
    </div>
  );
}

export function Toast({ texto, alCerrar, testId = "mensaje" }: { texto: string | null; alCerrar: () => void; testId?: string }) {
  if (!texto) return null;
  return (
    <div className="toast" role="status" data-testid={testId}>
      <span>{texto}</span>
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
export function Buscador({ valor, alCambiar, placeholder, alEscanear, chico, autoFoco, disabled, onKeyDown, cajaRef, testId = "busqueda" }: {
  valor: string; alCambiar: (v: string) => void; placeholder: string; alEscanear?: () => void; chico?: boolean; autoFoco?: boolean; disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; cajaRef?: React.RefObject<HTMLInputElement>; testId?: string;
}) {
  return (
    <div className={`buscador ${chico ? "chico" : ""}`}>
      <div className="caja">
        <Icono nombre="buscar" tam={chico ? 18 : 20} grosor={2.2} className="lupa" />
        <input ref={cajaRef} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} autoFocus={autoFoco} autoComplete="off" disabled={disabled} onKeyDown={onKeyDown} data-testid={testId} />
        {valor && <button type="button" className="limpiar" aria-label="Borrar" onClick={() => alCambiar("")}>×</button>}
      </div>
      {alEscanear && <button type="button" className="escanear" aria-label="Escanear" onClick={alEscanear} data-testid="escanear"><Icono nombre="escanear" tam={22} /></button>}
    </div>
  );
}

// Cantidad con − y +: enteros por unidad, de a 0,5 a granel (hasta un decimal).
export function Contador({ valor, entera, alCambiar, min = entera ? 1 : 0.1, children, testId = "cantidad" }: { valor: number; entera: boolean; alCambiar: (v: number) => void; min?: number; children?: ReactNode; testId?: string }) {
  const paso = entera ? 1 : 0.5;
  const redondear = (v: number) => (entera ? Math.floor(v) : Math.round(v * 10) / 10);
  return (
    <div className="contador">
      <button type="button" aria-label="Menos" onClick={() => alCambiar(Math.max(min, redondear(valor - paso)))}>−</button>
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

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { leerMeta } from "../almacen";
import { alCambiarLaCola, enviarPendientes, pendientes } from "../cola";
import { urlDeFoto } from "../api";
import { MARGENES } from "@ferre/calculo-de-precios";
import { UNIDADES, type Unidad } from "../unidades";

// Piezas de Ferrebress v2. Todas las pantallas arman con estas y con las clases de
// estilos/base.css; ninguna inventa su botón ni su ventana.

const TRAZOS = {
  vender: "M4 5h2l2.2 10.2a1 1 0 0 0 1 .8h8.3a1 1 0 0 0 1-.76L20 8H7M10 20.5h.01M17.5 20.5h.01",
  ventas: "M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h6",
  productos: "M4 4h6.5v6.5H4zM13.500 4H20v6.5h-6.5zM4 13.500h6.5V20H4zM13.500 13.500H20V20h-6.5z",
  listas: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5M9 13h6M9 17h6",
  duplicados: "M9.500 14.500 14.500 9.500M10.500 6.500l1-1a4.240 4.240 0 0 1 6 6l-1 1M13.500 17.500l-1 1a4.240 4.240 0 0 1-6-6l1-1",
  stock: "M21 8.200a2 2 0 0 0-1-1.730l-7-4a2 2 0 0 0-2 0l-7 4a2 2 0 0 0-1 1.730v7.600a2 2 0 0 0 1 1.730l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.730ZM3.300 7.200 12 12.200l8.700-5M12 22V12.200",
  compras: "M3 7h11v9H3zM14 10h4l3 3v3h-7M7.500 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3ZM17.500 19a1.500 1.500 0 1 0 0-3 1.500 1.500 0 0 0 0 3Z",
  contar: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6v4H9zM9 13l2 2 4-4",
  resumen: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  usuarios: "M16 20v-1.500a3.500 3.500 0 0 0-3.500-3.500h-5A3.500 3.500 0 0 0 4 18.500V20M10 11a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7ZM20 20v-1.500a3.500 3.500 0 0 0-2.500-3.350M15.500 4.150a3.500 3.500 0 0 1 0 6.700",
  actividad: "M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z",
  catalogo: "M4 4h6.5v6.5H4zM13.500 4H20v6.5h-6.5zM4 13.500h6.5V20H4zM13.500 13.500H20V20h-6.5z",
  deposito: "M21 8.200a2 2 0 0 0-1-1.730l-7-4a2 2 0 0 0-2 0l-7 4a2 2 0 0 0-1 1.730v7.600a2 2 0 0 0 1 1.730l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.730ZM3.300 7.200 12 12.200l8.700-5M12 22V12.200",
  negocio: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  buscar: "M11 18.500a7.500 7.500 0 1 0 0-15 7.500 7.500 0 0 0 0 15ZM20.500 20.500l-4.200-4.200",
  escanear: "M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2M7 9v6M11 9v6M14 9v6M17 9v6",
  cerrar: "M18 6 6 18M6 6l12 12",
  tilde: "m5 12.500 4.500 4.500L19 7.500",
  derecha: "m9 6 6 6-6 6",
  izquierda: "m15 6-6 6 6 6",
  abajo: "m6 9 6 6 6-6",
  arriba: "m6 15 6-6 6 6",
  subir: "M12 16V4M7 9l5-5 5 5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  bajar: "M12 4v12M7 11l5 5 5-5M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  camara: "M4 8h3l2-3h6l2 3h3v11H4ZM12 16.500a3.500 3.500 0 1 0 0-7 3.500 3.500 0 0 0 0 7Z",
  huella: "M12 10a2 2 0 0 0-2 2c0 1.020-.100 2.510-.260 4M14 13.120c0 2.380 0 6.380-1 8.880M17.290 21.020c.120-.600.430-2.300.500-3.020M2 12a10 10 0 0 1 18-6M2 16h.010M21.800 16c.200-2 .131-5.354 0-6M5 19.500C5.500 18 6 15 6 12a6 6 0 0 1 .340-2M8.650 22c.210-.660.450-1.320.570-2M9 6.800a6 6 0 0 1 9 5.200v2",
  salir: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  mas: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  celular: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM11 18h2",
  alerta: "M12 9v4.500M12 17h.010M10.300 4 2.700 17.500A2 2 0 0 0 4.400 20.500h15.200a2 2 0 0 0 1.700-3L13.700 4a2 2 0 0 0-3.400 0Z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.700.300-1 .800-1 1.500M12 16.500h.010",
  error: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16h.010",
  ok: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8 12.500l2.700 2.700L16 9.500",
  plata: "M12 3v18M16.500 7.500C16 6 14.500 5 12 5 9.500 5 7.500 6.300 7.500 8.300c0 4.400 9 2.200 9 7 0 2.200-2 3.700-4.500 3.700s-4.300-1-5-3",
  ganancia: "m3 17 6-6 4 4 8-8M15 7h6v6",
  caja: "M3 7h18v12H3zM3 11h18M7 15h3",
  deshacer: "M4 9h10a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4",
  editar: "M4 20h4L19 9l-4-4L4 16ZM13.500 6.500l4 4",
  basura: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  archivo: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8ZM14 3v5h5",
  proveedor: "M3 21V9l9-6 9 6v12M9 21v-7h6v7",
  reloj: "M12 7v5l3 2M21 12a9 9 0 1 1-9-9 9 9 0 0 1 9 9Z",
  estrella: "m12 3 2.700 5.800 6.300.700-4.700 4.300 1.300 6.200L12 16.900 6.400 20l1.300-6.200L3 9.500l6.300-.700Z",
  google: "M21 12.200c0-.700-.060-1.300-.180-1.900H12v3.700h5a4.300 4.300 0 0 1-1.900 2.800v2.300h3A9 9 0 0 0 21 12.200ZM12 21a8.800 8.800 0 0 0 6.100-2.200l-3-2.300A5.500 5.500 0 0 1 6.900 13.600H3.800V16A9 9 0 0 0 12 21Z",
  filtro: "M4 5h16l-6 7.500V19l-4-2v-4.500Z",
  repetir: "M4 12a8 8 0 0 1 13.700-5.700L20 8.500M20 4v4.500h-4.500M20 12a8 8 0 0 1-13.700 5.700L4 15.500M4 20v-4.500h4.500",
} as const;
export type NombreDeIcono = keyof typeof TRAZOS;

export function Icono({ nombre, tam = 20, grosor = 2 }: { nombre: NombreDeIcono; tam?: number; grosor?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={TRAZOS[nombre]} />
    </svg>
  );
}

// La marca: una tuerca ámbar con la F calada, y el nombre en Archivo ancha.
export function Marca({ tam = 30, soloSimbolo }: { tam?: number; soloSimbolo?: boolean }) {
  return (
    <span className="marca">
      <svg width={tam} height={tam} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path d="M24 2 43.050 13v22L24 46 4.950 35V13Z" fill="var(--ambar)" />
        <path d="M17.500 13h15.500v5.500h-9.500v4.500h8v5.500h-8V35h-6Z" fill="var(--marino)" />
      </svg>
      {!soloSimbolo && <span>Ferrebress</span>}
    </span>
  );
}

type VarianteBoton = "principal" | "marino" | "peligro" | "sobre-marino";
export function Boton({ children, variante, tam, icono, ancho, tecla, className, ...resto }: {
  children?: ReactNode; variante?: VarianteBoton; tam?: "chico" | "grande"; icono?: NombreDeIcono; ancho?: boolean; tecla?: string; className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const soloIcono = icono && (children === undefined || children === null);
  const clases = ["boton", variante, tam, ancho && "ancho", soloIcono && "solo-icono", className].filter(Boolean).join(" ");
  return (
    <button type="button" className={clases} aria-keyshortcuts={tecla} {...resto}>
      {icono && <Icono nombre={icono} tam={tam === "chico" ? 16 : 20} />}
      {children}
      {tecla && <span className="tecla solo-compu" aria-hidden="true">{tecla}</span>}
    </button>
  );
}

// Encabezado y cuerpo de una pantalla. `acciones` va a la derecha del título.
export function Pagina({ titulo, bajada, acciones, children, className, testId }: { titulo: string; bajada?: ReactNode; acciones?: ReactNode; children: ReactNode; className?: string; testId?: string }) {
  return (
    <main id="contenido" className={`pagina ${className ?? ""}`} data-testid={testId} tabIndex={-1}>
      <header className="pagina-cabeza">
        <h1>{titulo}</h1>
        {acciones}
        {bajada && <p className="bajada">{bajada}</p>}
      </header>
      {children}
    </main>
  );
}

// Ventana sobre lo que se está haciendo. Usa <dialog>: el navegador encierra el foco, lo
// devuelve al cerrar y cierra con Escape. En el celular sube desde abajo.
export function Hoja({ titulo, alCerrar, children, pie, ancha, testId }: { titulo: ReactNode; alCerrar: () => void; children: ReactNode; pie?: ReactNode; ancha?: boolean; testId?: string }) {
  const ref = useDialogo(alCerrar);
  const idTitulo = useId();
  return (
    <dialog ref={ref} className={`hoja ${ancha ? "ancha" : ""}`} aria-labelledby={idTitulo} data-testid={testId}
      onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="hoja-cabeza">
        <h2 id={idTitulo}>{titulo}</h2>
        <Boton icono="cerrar" aria-label="Cerrar" onClick={alCerrar} />
      </div>
      <div className="hoja-cuerpo">
        {children}
        {pie && <div className="hoja-pie">{pie}</div>}
      </div>
    </dialog>
  );
}

// Abre el <dialog> como modal al montarse y avisa al cerrarse (Escape incluido).
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

export function Toast({ texto, alCerrar, testId = "mensaje" }: { texto: string | null; alCerrar: () => void; testId?: string }) {
  if (!texto) return null;
  return (
    <div className="toast" role="status" data-testid={testId}>
      <Icono nombre="ok" />
      <span>{texto}</span>
      <button type="button" onClick={alCerrar} aria-label="Cerrar aviso"><Icono nombre="cerrar" tam={18} /></button>
    </div>
  );
}

// Aviso en el lugar. "error" y "alerta" se anuncian; desaparece cuando quien lo muestra
// deja de pasarle texto (al corregirse la causa).
export function Aviso({ tipo = "info", children, accion, testId }: { tipo?: "info" | "error" | "alerta" | "ok"; children: ReactNode; accion?: ReactNode; testId?: string }) {
  if (children === null || children === undefined || children === false || children === "") return null;
  return (
    <div className={`aviso ${tipo}`} role={tipo === "error" ? "alert" : "status"} data-testid={testId}>
      <Icono nombre={tipo === "ok" ? "ok" : tipo === "info" ? "info" : tipo === "error" ? "error" : "alerta"} />
      <div>{children}</div>
      {accion}
    </div>
  );
}

export function Vacio({ icono, titulo, children, accion }: { icono: NombreDeIcono; titulo: string; children?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="vacio">
      <div className="icono"><Icono nombre={icono} tam={30} grosor={1.8} /></div>
      <strong>{titulo}</strong>
      {children && <p>{children}</p>}
      {accion}
    </div>
  );
}

export function Buscador({ valor, alCambiar, placeholder, etiqueta, alEscanear, autoFoco, disabled, onKeyDown, cajaRef, testId = "busqueda", controla, activo }: {
  valor: string; alCambiar: (v: string) => void; placeholder: string; etiqueta?: string; alEscanear?: () => void; autoFoco?: boolean; disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; cajaRef?: React.RefObject<HTMLInputElement>; testId?: string;
  controla?: string; activo?: string; // id de la lista de resultados y del resultado marcado
}) {
  return (
    <div className="buscador" role="search">
      <div className="buscador-caja">
        <Icono nombre="buscar" tam={22} grosor={2.2} />
        <input ref={cajaRef} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={etiqueta ?? placeholder}
          autoFocus={autoFoco} autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" disabled={disabled} onKeyDown={onKeyDown} data-testid={testId}
          {...(controla ? { role: "combobox", "aria-controls": controla, "aria-expanded": Boolean(activo), "aria-activedescendant": activo, "aria-autocomplete": "list" as const } : {})} />
        {valor && <button type="button" className="borrar" aria-label="Borrar la búsqueda" onClick={() => { alCambiar(""); cajaRef?.current?.focus(); }}><Icono nombre="cerrar" tam={18} /></button>}
      </div>
      {alEscanear && <Boton icono="escanear" variante="marino" aria-label="Escanear el código de barras" onClick={alEscanear} data-testid="escanear" />}
    </div>
  );
}

export function Segmentos<T extends string>({ opciones, actual, alElegir, etiqueta }: { opciones: { valor: T; nombre: string }[]; actual: T; alElegir: (v: T) => void; etiqueta: string }) {
  return (
    <div className="segmentos" role="group" aria-label={etiqueta}>
      {opciones.map((o) => <button key={o.valor} type="button" aria-pressed={o.valor === actual} onClick={() => alElegir(o.valor)}>{o.nombre}</button>)}
    </div>
  );
}

// Los cinco márgenes de un toque. Es un grupo de opciones: Tab entra una vez y las flechas
// izquierda y derecha pasan de un margen a otro y lo eligen.
export function Margenes({ elegido, alElegir, disabled, etiqueta = "Margen", atajos, compacto }: { elegido: number | null; alElegir: (m: number) => void; disabled?: boolean; etiqueta?: string; atajos?: boolean; compacto?: boolean }) {
  const conFoco = MARGENES.includes(elegido as never) ? elegido : MARGENES[0];
  function flechas(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); e.stopPropagation();
    const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button"));
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    const destino = botones[(i + (e.key === "ArrowRight" ? 1 : -1) + botones.length) % botones.length];
    destino?.focus(); destino?.click();
  }
  return (
    <div className={`margenes ${compacto ? "compacto" : ""}`} role="radiogroup" aria-label={etiqueta} onKeyDown={flechas}>
      {MARGENES.map((m, i) => (
        <button key={m} type="button" role="radio" aria-checked={elegido === m} tabIndex={m === conFoco ? 0 : -1} disabled={disabled} title={atajos ? `Mayúsculas + ${i + 1}` : undefined}
          onClick={(e) => { e.stopPropagation(); alElegir(m); }} data-testid={`margen-${m}`}>{m}{compacto ? "" : " "}%</button>
      ))}
    </div>
  );
}

// Cantidad: enteros por unidad, hasta un decimal por kilo, metro o litro. Sin cero a la izquierda.
export function Contador({ valor, entera, alCambiar, min = entera ? 1 : 0.1, unidad, alCambiarUnidad, etiqueta = "Cantidad", testId = "cantidad", sinBotones }: {
  valor: number; entera: boolean; alCambiar: (v: number) => void; min?: number; unidad?: Unidad; alCambiarUnidad?: (u: Unidad) => void; etiqueta?: string; testId?: string; sinBotones?: boolean;
}) {
  const paso = entera ? 1 : 0.5;
  const redondear = (v: number) => (entera ? Math.floor(v) : Math.round(v * 10) / 10);
  // Mientras se tipea se muestra lo tipeado («2,» camino a «2,5»); el valor sale ya ajustado.
  const [texto, setTexto] = useState<string | null>(null);
  const mostrado = texto ?? (valor === 0 ? "" : String(valor).replace(".", ","));
  return (
    <div className="contador">
      {!sinBotones && <button type="button" aria-label="Uno menos" onClick={() => { setTexto(null); alCambiar(Math.max(min, redondear(valor - paso))); }}><Icono nombre="menos" tam={18} grosor={2.4} /></button>}
      <input inputMode={entera ? "numeric" : "decimal"} aria-label={etiqueta} value={mostrado} onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const limpio = e.target.value.replace(/[^\d.,]/g, "").replace(/([.,]\d).*$/, "$1");
          const v = Number(limpio.replace(",", "."));
          const ajustado = !Number.isFinite(v) || v <= 0 ? 0 : redondear(v);
          setTexto(entera ? (ajustado === 0 ? "" : String(ajustado)) : limpio);
          alCambiar(ajustado);
        }}
        onBlur={() => { setTexto(null); if (valor === 0) alCambiar(min); }} data-testid={testId} />
      {!sinBotones && <button type="button" aria-label="Uno más" onClick={() => { setTexto(null); alCambiar(redondear(valor + paso)); }}><Icono nombre="mas" tam={18} grosor={2.4} /></button>}
      {unidad && alCambiarUnidad && (
        <select value={unidad} onChange={(e) => alCambiarUnidad(e.target.value as Unidad)} aria-label="Unidad: por unidad, kilo, metro o litro" data-testid="unidad">
          {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
        </select>
      )}
    </div>
  );
}

// Todo número calculado se toca y dice de dónde sale. La señal es el «?» en un círculo.
export function Explicado({ valor, pasos, etiqueta, className, titulo }: { valor: ReactNode; pasos: string[]; etiqueta?: string; className?: string; titulo?: string }) {
  const [abierta, setAbierta] = useState(false);
  const texto = typeof valor === "string" ? valor : (etiqueta ?? "este número");
  if (!pasos.length) return <span className={className}>{valor}</span>;
  return (
    <>
      <button type="button" className={`explicado ${className ?? ""}`} aria-label={`${etiqueta ?? texto}. Ver de dónde sale`} aria-haspopup="dialog"
        onClick={(e) => { e.stopPropagation(); setAbierta(true); }} data-testid="explicacion">
        <span>{valor}</span><span className="signo" aria-hidden="true">?</span>
      </button>
      {abierta && (
        <Hoja titulo={titulo ?? `De dónde sale ${texto}`} alCerrar={() => setAbierta(false)} testId="hoja-explicacion"
          pie={<Boton variante="marino" onClick={() => setAbierta(false)}>Entendido</Boton>}>
          <ol className="pasos">{pasos.map((p, i) => <li key={i}><span>{p}</span></li>)}</ol>
        </Hoja>
      )}
    </>
  );
}

export function Pastilla({ tipo, children, sinPunto }: { tipo?: "ok" | "alerta" | "mal" | "azul"; children: ReactNode; sinPunto?: boolean }) {
  return <span className={`pastilla ${tipo ?? ""} ${sinPunto ? "sin-punto" : ""}`}>{children}</span>;
}

export function Indicador({ rotulo, valor, detalle, icono, color, testId }: { rotulo: string; valor: ReactNode; detalle?: ReactNode; icono: NombreDeIcono; color?: "ambar" | "verde" | "rojo"; testId?: string }) {
  return (
    <div className={`indicador ${color ?? ""}`} data-testid={testId}>
      <span className="rotulo">{rotulo}</span>
      <span className="icono"><Icono nombre={icono} /></span>
      <span className="importe">{valor}</span>
      {detalle && <span className="detalle">{detalle}</span>}
    </div>
  );
}

// Panel que se pliega y se despliega con animación. Arranca abierto: se ve que tiene contenido.
export function Plegable({ titulo, extra, abiertoAlInicio = true, children, testId, relleno = true }: { titulo: ReactNode; extra?: ReactNode; abiertoAlInicio?: boolean; children: ReactNode; testId?: string; relleno?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  const id = useId();
  return (
    <section className={`plegable ${abierto ? "abierto" : ""}`} data-testid={testId}>
      <h2 style={{ font: "inherit" }}>
        <button type="button" className="plegable-titulo" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-controls={id}>
          <span className="flecha" aria-hidden="true"><Icono nombre="derecha" tam={16} grosor={2.6} /></span>
          <span>{titulo}</span>
          {extra && <span className="extra">{extra}</span>}
        </button>
      </h2>
      <div className="plegable-cuerpo" id={id}>
        <div className="plegable-interior"><div className={relleno ? "plegable-relleno" : ""}>{children}</div></div>
      </div>
    </section>
  );
}

export function Progreso({ texto, fraccion }: { texto: string; fraccion?: number }) {
  const definido = fraccion !== undefined;
  return (
    <div className={`progreso ${definido ? "" : "indefinido"}`} role="status" data-testid="progreso">
      <span>{texto}</span>
      <div className="riel" role="progressbar" aria-label={texto} aria-valuemin={0} aria-valuemax={100} aria-valuenow={definido ? Math.round(fraccion * 100) : undefined}>
        <i style={definido ? { transform: `scaleX(${Math.max(0.02, Math.min(1, fraccion))})` } : undefined} />
      </div>
    </div>
  );
}

// Éxito a pantalla completa: el importe grande, cómo se pagó y un solo botón para seguir.
export function Exito({ que, importe, medio, detalle, boton, alCerrar }: { que: string; importe: string; medio: string; detalle: string; boton: string; alCerrar: () => void }) {
  const ref = useDialogo(alCerrar);
  return (
    <dialog ref={ref} className="exito" aria-label={que} data-testid="exito">
      <div className="tilde"><Icono nombre="tilde" tam={48} grosor={3} /></div>
      <h2>{que}</h2>
      <div className="importe">{importe}</div>
      <div className="medio">{medio}</div>
      <p className="detalle">{detalle}</p>
      <Boton variante="principal" tam="grande" autoFocus onClick={alCerrar} data-testid="cerrar-exito" tecla="Enter">{boton}</Boton>
    </dialog>
  );
}

// Foto chica del producto; al tocarla se amplía con una transición y desde ahí se saca otra.
export function FotoProducto({ id, url: urlCruda, descripcion, alSubir }: { id: string; url: string | null; descripcion: string; alSubir?: (archivo: File) => Promise<void> }) {
  const [abierta, setAbierta] = useState(false);
  const url = urlDeFoto(urlCruda);
  const nombre = `foto-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  function cambiar(valor: boolean) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => void };
    if (doc.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(() => setAbierta(valor));
    else setAbierta(valor);
  }
  return (
    <>
      <button type="button" className="foto-chica" onClick={(e) => { e.stopPropagation(); cambiar(true); }} aria-label={url ? `Ver la foto de ${descripcion}` : `${descripcion} no tiene foto. Agregar una`} data-testid="foto-chica">
        {url ? <img src={url} alt="" loading="lazy" style={abierta ? undefined : { viewTransitionName: nombre }} /> : <Icono nombre="camara" tam={20} grosor={1.6} />}
      </button>
      {abierta && <FotoGrande url={url} nombre={nombre} descripcion={descripcion} alSubir={alSubir} alCerrar={() => cambiar(false)} />}
    </>
  );
}

function FotoGrande({ url, nombre, descripcion, alSubir, alCerrar }: { url: string | null; nombre: string; descripcion: string; alSubir?: (archivo: File) => Promise<void>; alCerrar: () => void }) {
  const ref = useDialogo(alCerrar);
  const archivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !alSubir) return;
    setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { setError(`No se pudo subir la foto: ${(err as Error).message}. Probá de nuevo.`); }
    finally { setSubiendo(false); }
  }
  return (
    <dialog ref={ref} className="foto-grande" aria-label={`Foto de ${descripcion}`} onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }} data-testid="foto-grande">
      <figure>
        {url ? <img src={url} alt={descripcion} style={{ viewTransitionName: nombre }} /> : <div className="sin-foto" style={{ viewTransitionName: nombre }}><Icono nombre="camara" tam={72} grosor={1.2} /></div>}
        <figcaption>
          <span>{descripcion}{!url && <><br /><small>Este producto todavía no tiene foto.</small></>}</span>
          <Aviso tipo="error">{error}</Aviso>
          <div className="hoja-pie">
            {alSubir && (
              <>
                <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto" />
                <Boton variante="principal" icono="camara" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-foto">{subiendo ? "Subiendo la foto…" : url ? "Sacar otra foto" : "Sacar foto"}</Boton>
              </>
            )}
            <Boton onClick={alCerrar}>Cerrar</Boton>
          </div>
        </figcaption>
      </figure>
    </dialog>
  );
}

// Un punto y pocas palabras: sin conexión y cuántos cambios esperan, o hace cuánto se sincronizó.
export function EstadoDeConexion({ testId = "conexion" }: { testId?: string }) {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [cantidad, setCantidad] = useState(0);
  const [masViejo, setMasViejo] = useState<string | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<string | null>(null);
  const [, setTic] = useState(0);

  useEffect(() => {
    const refrescar = async () => {
      const lista = await pendientes().catch(() => []);
      setCantidad(lista.length);
      setMasViejo(lista[0]?.creado_en ?? null);
      setUltimoEnvio((await leerMeta<string>("ultimo_envio").catch(() => undefined)) ?? null);
    };
    void refrescar();
    const quitar = alCambiarLaCola(refrescar);
    const alConectar = () => { setEnLinea(true); enviarPendientes().catch(() => undefined); };
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    // Reintento periódico: el evento "online" no siempre llega tras un microcorte.
    const cada = setInterval(() => { setTic((t) => t + 1); if (navigator.onLine) enviarPendientes().catch(() => undefined); }, 60_000);
    return () => { quitar(); window.removeEventListener("online", alConectar); window.removeEventListener("offline", alDesconectar); clearInterval(cada); };
  }, []);

  const viejo = masViejo !== null && Date.now() - new Date(masViejo).getTime() > 3600_000;
  const clase = !enLinea ? "sin-conexion" : cantidad > 0 ? (viejo ? "atrasado" : "pendiente") : "ok";
  const porEnviar = `${cantidad} ${cantidad === 1 ? "cambio" : "cambios"} por enviar`;
  const texto = !enLinea
    ? `Sin conexión${cantidad ? `: ${porEnviar}` : ""}`
    : cantidad > 0
      ? `${porEnviar}${viejo ? " hace más de una hora" : ""}`
      : ultimoEnvio ? `Sincronizado ${haceCuanto(ultimoEnvio)}` : "Conectado";
  return <span className={`conexion ${clase}`} role="status" data-testid={testId}><i aria-hidden="true" />{texto}</span>;
}

export function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}

// Importes de pantalla: sin centavos ($3.000). Con centavos solo en explicaciones y costos.
export function pesosCortos(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return `$${Math.round(Number(valor)).toLocaleString("es-AR")}`;
}
export const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
export const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

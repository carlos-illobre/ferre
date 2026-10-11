import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { useRuta } from "../rutas";
import { Boton } from "./basicas";
import { Icono, type NombreDeIcono } from "./Icono";

// ---------------------------------------------------------------- Aviso (en el lugar)

type TipoDeAviso = "error" | "alerta" | "info" | "bien";

const ICONO_DE_AVISO: Record<TipoDeAviso, NombreDeIcono> = { error: "error", alerta: "alerta", info: "informacion", bien: "tilde" };

type PropsDeAviso = {
  tipo?: TipoDeAviso;
  /** Qué pasa, en negrita. */
  titulo?: string;
  /** Qué hay que hacer. */
  children?: ReactNode;
  /** Un botón a la derecha (por ejemplo «Deshacer»). */
  accion?: { texto: string; alTocar: () => void };
  testId?: string;
};

/** Mensaje en el lugar donde pasó: error, alerta, información o «salió bien». */
export function Aviso({ tipo = "info", titulo, children, accion, testId }: PropsDeAviso) {
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === "error" || tipo === "alerta" ? "alert" : "status"} data-testid={testId}>
      <span className="aviso__icono"><Icono nombre={ICONO_DE_AVISO[tipo]} tam={20} grosor={2.2} /></span>
      <div className="aviso__texto">
        {titulo && <strong>{titulo}</strong>}
        {children && <span>{children}</span>}
      </div>
      {accion && <button type="button" className="aviso__accion" onClick={accion.alTocar}>{accion.texto}</button>}
    </div>
  );
}

// ---------------------------------------------------------------- AvisoFlotante (el toast de Figma)

export type DatosDeAvisoFlotante = {
  texto: string;
  detalle?: string;
  tipo?: "bien" | "alerta";
  /** Una acción, por ejemplo «Deshacer». Al tocarla el aviso se cierra. */
  accion?: { texto: string; alTocar: () => void };
};

type PropsDeAvisoFlotante = DatosDeAvisoFlotante & { alCerrar: () => void };

/** La tarjeta verde oscura de Figma que aparece arriba a la derecha (`data-testid="mensaje"`). Para usarla, llamá a `avisar()`. */
export function AvisoFlotante({ texto, detalle, tipo = "bien", accion, alCerrar }: PropsDeAvisoFlotante) {
  return (
    <div className={`flotante flotante--${tipo}`} role="status" data-testid="mensaje">
      <span className="flotante__icono"><Icono nombre={tipo === "bien" ? "tilde" : "alerta"} tam={18} grosor={2.4} /></span>
      <div className="flotante__texto">
        <strong>{texto}</strong>
        {detalle && <span>{detalle}</span>}
      </div>
      {accion && <button type="button" className="flotante__accion" onClick={() => { accion.alTocar(); alCerrar(); }}>{accion.texto}</button>}
      <button type="button" className="flotante__cerrar" aria-label="Cerrar el aviso" onClick={alCerrar}><Icono nombre="cerrar" tam={20} /></button>
    </div>
  );
}

/** En qué pantalla estamos ("vender"), leído de la dirección en el momento. */
function pantallaActual(): string {
  return window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "";
}

let avisoActual: (DatosDeAvisoFlotante & { id: number; donde: string }) | null = null;
let numeroDeAviso = 0;
const oyentesDeAviso = new Set<() => void>();
/** Cuánto queda a la vista un aviso flotante (y cuánto hay para tocar «Deshacer»). */
export const DURACION_DEL_AVISO = 6000;

function ponerAviso(nuevo: typeof avisoActual) {
  avisoActual = nuevo;
  for (const oyente of oyentesDeAviso) oyente();
}

/**
 * Muestra un aviso flotante desde cualquier lado: `avisar("Venta anulada")` o
 * `avisar("Anotado como «No llevó»", { accion: { texto: "Deshacer", alTocar } })`. Se va solo, y
 * también al cambiar de pantalla (si vas a otra con `ir()`, llamá a `avisar` después).
 */
export function avisar(texto: string, opciones: Omit<DatosDeAvisoFlotante, "texto"> = {}): void {
  numeroDeAviso += 1;
  ponerAviso({ texto, ...opciones, id: numeroDeAviso, donde: pantallaActual() });
}

/** Cierra el aviso flotante que esté a la vista. */
export function cerrarAviso(): void {
  ponerAviso(null);
}

/** Donde se dibujan los avisos de `avisar()`. Ya está puesto en `App.tsx`: no hace falta usarlo. */
export function AvisosFlotantes() {
  const aviso = useSyncExternalStore((oyente) => { oyentesDeAviso.add(oyente); return () => { oyentesDeAviso.delete(oyente); }; }, () => avisoActual);
  useEffect(() => {
    if (!aviso) return;
    const reloj = window.setTimeout(() => { if (avisoActual?.id === aviso.id) ponerAviso(null); }, DURACION_DEL_AVISO);
    return () => window.clearTimeout(reloj);
  }, [aviso]);
  // Un aviso es de la pantalla donde salió: no sobrevive al cambio de pantalla.
  const { camino } = useRuta();
  const deOtraPantalla = aviso !== null && aviso.donde !== camino;
  useEffect(() => { if (deOtraPantalla) ponerAviso(null); }, [deOtraPantalla]);
  if (!aviso || deOtraPantalla) return null;
  return <AvisoFlotante key={aviso.id} {...aviso} alCerrar={cerrarAviso} />;
}

// ---------------------------------------------------------------- Vacio

type PropsDeVacio = {
  icono: NombreDeIcono;
  titulo: string;
  /** Una sola línea que diga qué hacer. */
  children?: ReactNode;
  /** Un botón (secundario) si hay algo para hacer. */
  accion?: { texto: string; alTocar: () => void; icono?: NombreDeIcono };
  /** La acción de la pantalla (naranja), cuando el vacío ES la pantalla: «Ir a vender». Una sola por pantalla. */
  principal?: { texto: string; alTocar: () => void; icono?: NombreDeIcono };
  testId?: string;
};

export function Vacio({ icono, titulo, children, accion, principal, testId }: PropsDeVacio) {
  return (
    <div className="vacio" data-testid={testId}>
      <span className="vacio__icono"><Icono nombre={icono} tam={30} /></span>
      <p className="vacio__titulo">{titulo}</p>
      {children && <p className="vacio__detalle">{children}</p>}
      {principal && <Boton variante="principal" tam="grande" icono={principal.icono} onClick={principal.alTocar}>{principal.texto}</Boton>}
      {accion && <Boton icono={accion.icono} onClick={accion.alTocar}>{accion.texto}</Boton>}
    </div>
  );
}

// ---------------------------------------------------------------- Cargando

type PropsDeCargando = {
  /** Qué se está cargando: «Bajando el catálogo…». */
  texto: string;
  /** Una línea más, si ayuda. */
  detalle?: string;
  /** De 0 a 100. Si se pasa, se ve la barra de avance; si no, el círculo que gira. */
  avance?: number;
  /** Por defecto `progreso`. */
  testId?: string;
};

export function Cargando({ texto, detalle, avance, testId = "progreso" }: PropsDeCargando) {
  return (
    <div className="cargando" role="status" data-testid={testId}>
      {avance === undefined ? <span className="cargando__giro" aria-hidden="true" /> : (
        <div className="cargando__barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(avance)} aria-label={texto}>
          <span style={{ width: `${Math.max(0, Math.min(100, avance))}%` }} />
        </div>
      )}
      <p className="cargando__texto">{texto}{avance !== undefined && ` ${Math.round(avance)} %`}</p>
      {detalle && <p className="cargando__detalle">{detalle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- ErrorDeCarga

type PropsDeErrorDeCarga = {
  /** Qué pasó. Por defecto «No se pudo cargar». */
  titulo?: string;
  /** Qué hacer: «Revisá la conexión y probá de nuevo.» */
  children?: ReactNode;
  alReintentar: () => void;
  /** Por defecto `error-de-carga`; el botón lleva `reintentar`. */
  testId?: string;
};

export function ErrorDeCarga({ titulo = "No se pudo cargar", children = "Revisá la conexión y probá de nuevo.", alReintentar, testId = "error-de-carga" }: PropsDeErrorDeCarga) {
  return (
    <div className="vacio vacio--error" role="alert" data-testid={testId}>
      <span className="vacio__icono"><Icono nombre="alerta" tam={30} /></span>
      <p className="vacio__titulo">{titulo}</p>
      <p className="vacio__detalle">{children}</p>
      <Boton icono="deshacer" onClick={alReintentar} data-testid="reintentar">Reintentar</Boton>
    </div>
  );
}

// ---------------------------------------------------------------- Exito

type PropsDeExito = {
  /** «Venta registrada». */
  titulo: string;
  /** El importe ya formateado: `pesos(12000)`. */
  importe?: string;
  /** Una línea: «Pagó en efectivo». */
  detalle?: ReactNode;
  /** `pendiente` cuando se guardó sin conexión: ícono amarillo en vez del tilde verde. */
  tipo?: "bien" | "pendiente";
  /** Texto del único botón: «Nueva venta». */
  boton: string;
  alSeguir: () => void;
  /** Algo más debajo del detalle (un `Aviso`, por ejemplo). */
  children?: ReactNode;
};

/** Pantalla completa de «listo»: título, importe grande, detalle y un solo botón (`data-testid="exito"` y `cerrar-exito`). */
export function Exito({ titulo, importe, detalle, tipo = "bien", boton, alSeguir, children }: PropsDeExito) {
  return (
    <div className={`exito exito--${tipo}`} role="status" data-testid="exito">
      <span className="exito__icono"><Icono nombre={tipo === "bien" ? "tilde" : "sin-conexion"} tam={38} grosor={2.4} /></span>
      <h2 className="exito__titulo">{titulo}</h2>
      {importe && <p className="exito__importe">{importe}</p>}
      {detalle && <p className="exito__detalle">{detalle}</p>}
      {children}
      <Boton variante="principal" tam="grande" autoFocus onClick={alSeguir} data-testid="cerrar-exito">{boton}</Boton>
    </div>
  );
}

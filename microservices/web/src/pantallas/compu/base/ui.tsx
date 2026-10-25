import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useVeCostos } from "../../Costos";
import { Isotipo, Logotipo } from "../../Logotipo";
import { PedirFotoAlCelular, hayQueUsarElCelular } from "../../PedirFoto";
import { leerMeta } from "../../../datos/almacenamiento";
import { alCambiarLaCola, enviarPendientes, pendientes } from "../../../datos/almacenamiento";
import { urlDeFoto } from "../../../datos/conexion";
import { MARGENES } from "../../../negocio/precios/vista-previa";
import { UNIDADES, type Unidad } from "../../../negocio/catalogo";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";

// Piezas de Ferrebress v2. Todas las pantallas arman con estas y con las clases de
// estilos/base.css; ninguna inventa su botón ni su ventana.

// Los íconos son uno solo para toda la aplicación (ADR-028).
export { Icono, type NombreDeIcono };

// La marca: una tuerca ámbar con la F calada, y el nombre en Archivo ancha.
export function Marca({ tam = 30, soloSimbolo }: { tam?: number; soloSimbolo?: boolean }) {
  // La marca es el logotipo: el isotipo hace de F en la palabra (decisión 48). Siempre va sobre el verde oscuro.
  return <span className="marca" style={{ fontSize: Math.round(tam * 0.85) }}>{soloSimbolo ? <Isotipo lado={tam} /> : <Logotipo />}</span>;
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
// `foto`, `sobreTitulo` y `bajoTitulo` arman un encabezado más rico (la ficha del producto, specs/016):
// la foto a la izquierda y, alrededor del título, una etiqueta y un renglón de detalle.
export function Hoja({ titulo, alCerrar, children, pie, ancha, testId, alTeclear, foto, sobreTitulo, bajoTitulo }: { titulo: ReactNode; alCerrar: () => void; children: ReactNode; pie?: ReactNode; ancha?: boolean; testId?: string; alTeclear?: (e: React.KeyboardEvent<HTMLDialogElement>) => void; foto?: ReactNode; sobreTitulo?: ReactNode; bajoTitulo?: ReactNode }) {
  const ref = useDialogo(alCerrar);
  const idTitulo = useId();
  return (
    <dialog ref={ref} className={`hoja ${ancha ? "ancha" : ""}`} aria-labelledby={idTitulo} data-testid={testId} onKeyDown={alTeclear}
      onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className={`hoja-cabeza ${foto ? "con-foto" : ""}`}>
        {foto}
        {sobreTitulo || bajoTitulo ? <div className="hoja-titulos">{sobreTitulo}<h2 id={idTitulo}>{titulo}</h2>{bajoTitulo}</div> : <h2 id={idTitulo}>{titulo}</h2>}
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

// `extra`: un botón más al lado del buscador (los filtros del Catálogo, 015).
export function Buscador({ valor, alCambiar, placeholder, etiqueta, alEscanear, autoFoco, disabled, onKeyDown, cajaRef, testId = "busqueda", controla, activo, extra }: {
  valor: string; alCambiar: (v: string) => void; placeholder: string; etiqueta?: string; alEscanear?: () => void; autoFoco?: boolean; disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void; cajaRef?: React.RefObject<HTMLInputElement>; testId?: string;
  controla?: string; activo?: string; // id de la lista de resultados y del resultado marcado
  extra?: React.ReactNode;
}) {
  const propia = useRef<HTMLInputElement>(null);
  const caja = cajaRef ?? propia;
  // Como autoFocus, pero también al habilitarse (la caja espera deshabilitada a que baje el
  // catálogo) y sin quitarle el foco a lo que la persona eligió con el teclado (el menú, una
  // pestaña): la caja puede aparecer o habilitarse tarde, cuando llegan los datos (decisión 82).
  useLayoutEffect(() => {
    const foco = document.activeElement;
    if (autoFoco && !disabled && !(foco instanceof HTMLElement && foco !== document.body && foco.matches(":focus-visible"))) caja.current?.focus();
    // Solo al aparecer y al habilitarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);
  return (
    <div className="buscador" role="search">
      <div className="buscador-caja">
        <Icono nombre="buscar" tam={22} grosor={2.2} />
        <input ref={caja} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={etiqueta ?? placeholder}
          autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" disabled={disabled} onKeyDown={onKeyDown} data-testid={testId}
          {...(controla ? { role: "combobox", "aria-controls": controla, "aria-expanded": Boolean(activo), "aria-activedescendant": activo, "aria-autocomplete": "list" as const } : {})} />
        {valor && <button type="button" className="borrar" aria-label="Borrar la búsqueda" onClick={() => { alCambiar(""); caja.current?.focus(); }}><Icono nombre="cerrar" tam={18} /></button>}
      </div>
      {alEscanear && <Boton icono="escanear" variante="marino" aria-label="Escanear el código de barras" onClick={alEscanear} data-testid="escanear" />}
      {extra}
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
// Con `flechasDeAfuera`, las flechas no eligen: las maneja quien lo contiene, y se elige con Enter.
export function Margenes({ elegido, alElegir, disabled, etiqueta = "Margen", atajos, compacto, flechasDeAfuera, sinSigno }: { elegido: number | null; alElegir: (m: number) => void; disabled?: boolean; etiqueta?: string; atajos?: boolean; compacto?: boolean; flechasDeAfuera?: boolean; sinSigno?: boolean }) {
  const conFoco = MARGENES.includes(elegido as never) ? elegido : MARGENES[0];
  function flechas(e: React.KeyboardEvent<HTMLDivElement>) {
    if (flechasDeAfuera || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
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
          onClick={(e) => { e.stopPropagation(); alElegir(m); }} aria-label={sinSigno ? `${m} %` : undefined} data-testid={`margen-${m}`}>{m}{sinSigno ? "" : `${compacto ? "" : " "}%`}</button>
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
        // Flecha arriba y abajo suman y restan, como los botones.
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault(); e.stopPropagation(); setTexto(null);
          alCambiar(e.key === "ArrowUp" ? redondear(valor + paso) : Math.max(min, redondear(valor - paso)));
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
// `conCosto`: los pasos dejan ver el costo; quien no tiene «Ver costos» ve el número sin explicación.
export function Explicado({ valor, pasos, etiqueta, className, titulo, conCosto }: { valor: ReactNode; pasos: string[]; etiqueta?: string; className?: string; titulo?: string; conCosto?: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const veCostos = useVeCostos();
  const texto = typeof valor === "string" ? valor : (etiqueta ?? "este número");
  if (!pasos.length || (conCosto && !veCostos)) return <span className={className}>{valor}</span>;
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
  const [pidiendo, setPidiendo] = useState(false);
  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    await recibir(f);
  }
  async function recibir(f: File | undefined) {
    if (!f || !alSubir) return;
    setPidiendo(false); setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { setError(`No se pudo subir la foto: ${(err as Error).message}. Probá de nuevo.`); }
    finally { setSubiendo(false); }
  }
  return (
    <dialog ref={ref} className={`foto-grande${pidiendo ? " pidiendo" : ""}`} aria-label={`Foto de ${descripcion}`} onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }} data-testid="foto-grande">
      <figure>
        {url ? <img src={url} alt={descripcion} style={{ viewTransitionName: nombre }} /> : <div className="sin-foto" style={{ viewTransitionName: nombre }}><Icono nombre="camara" tam={72} grosor={1.2} /></div>}
        <figcaption>
          <span>{descripcion}{!url && <><br /><small>Este producto todavía no tiene foto.</small></>}</span>
          <Aviso tipo="error">{error}</Aviso>
          {pidiendo && <PedirFotoAlCelular para={`la foto de ${descripcion}`} alCancelar={() => setPidiendo(false)} alRecibir={recibir} />}
          <div className="hoja-pie">
            {alSubir && !pidiendo && (
              <>
                <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto" />
                {/* La computadora no tiene cámara: la foto la saca el celular, con un código QR. */}
                {hayQueUsarElCelular() && <Boton variante="principal" icono="celular" disabled={subiendo} onClick={() => { setError(null); setPidiendo(true); }} data-testid="foto-con-celular">{subiendo ? "Subiendo la foto…" : "Sacar la foto con el celular"}</Boton>}
                <Boton variante={hayQueUsarElCelular() ? undefined : "principal"} icono="camara" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="sacar-foto">{hayQueUsarElCelular() ? "Elegir un archivo" : subiendo ? "Subiendo la foto…" : url ? "Sacar otra foto" : "Sacar foto"}</Boton>
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
      : ultimoEnvio ? `Sincronizado ${haceCuanto(ultimoEnvio)}` : "En línea · todo enviado";
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

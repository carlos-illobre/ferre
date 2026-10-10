import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../../api";
import { fecha, pesos, porcentaje } from "../../formato";
import { irA } from "../rutas";
import { Aviso, Boton, Explicado, Hoja, Icono, Indicador, Pagina, Pastilla, Plegable, Progreso, Toast, Vacio, numero } from "../ui";
import { useEsCelular } from "../vista";
import "../estilos/listas.css";

type Proveedor = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null; activo: boolean };
type Salteada = { fila: number; motivo: string; contenido: string[] };
type Resumen = { leidas: number; salteadas: number; ofertas?: number; nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number; salteadas_detalle?: Salteada[] };
type ListaFila = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: Resumen; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };
type Cargada = { id: string; proveedor: string; fecha_lista: string; resumen: Resumen; avisos: string[]; salteadas: Salteada[] };
type Fila = { codigo_proveedor: string; descripcion: string; marca: string | null; costo_neto: string; costo_anterior: string | null; explicacion: string[] };
type Avance = { procesadas: number; total: number | null; etapa?: string };
type Resultado = { titulo: string; detalle: string };

const SIN_CONEXION = "Sin conexión con el servidor. Cargar una lista necesita internet.";
const DIAS_LISTA_VIEJA = 45;
const TANDA = 200;
const mensajeDe = (e: unknown) => (e instanceof ErrorApi ? e.message : SIN_CONEXION);
const diasDesde = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000));
const haceDias = (d: number) => (d === 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d} días`);
const cuando = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const porciento = (fraccion: string) => `${numero(Number(fraccion) * 100)} %`;

function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", si); window.removeEventListener("offline", no); };
  }, []);
  return enLinea;
}

// Cargar una lista de precios (RF-01): entregar el archivo → revisar el resumen y la vista
// previa → aplicar o descartar. Nada se guarda hasta «Aplicar». Los proveedores van a la
// vista y antes que el lugar donde se entrega el archivo: primero se mira cuál está viejo.
export function Listas() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [historial, setHistorial] = useState<ListaFila[]>([]);
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([api<Proveedor[]>("/proveedores"), api<ListaFila[]>("/listas")]);
      setProveedores(p);
      setHistorial(h);
      setError(null);
    } catch (e) {
      setError(mensajeDe(e));
    }
  }, []);
  useEffect(() => { void recargar(); }, [recargar]);
  // Al volver la conexión se recupera sola: el aviso desaparece cuando se corrige la causa.
  useEffect(() => { if (enLinea && error) void recargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entrar a revisar y volver con el resultado cambian toda la pantalla: se empieza desde arriba.
  const idCargada = cargada?.id;
  useEffect(() => { window.scrollTo(0, 0); document.getElementById("contenido")?.focus({ preventScroll: true }); }, [idCargada, resultado]);

  if (cargada) {
    return (
      <Revision cargada={cargada} esCelular={esCelular}
        alVolver={() => { setCargada(null); void recargar(); }}
        alDescartar={() => { setCargada(null); setToast("Lista descartada. No se guardó ningún precio."); void recargar(); }}
        alAplicar={(r) => { setCargada(null); setResultado(r); void recargar(); }} />
    );
  }

  const activos = (proveedores ?? []).filter((p) => p.activo);
  const pendientes = historial.filter((l) => l.estado === "pendiente");
  const abrirPendiente = (l: ListaFila) => { setResultado(null); setCargada({ id: l.id, proveedor: l.proveedor, fecha_lista: l.fecha_lista, resumen: l.resumen, avisos: l.avisos, salteadas: l.resumen.salteadas_detalle ?? [] }); };
  // El historial viene de la más nueva a la más vieja: la primera aplicada de cada proveedor es la vigente.
  const ultima = new Map<string, ListaFila>();
  for (const l of historial) if (l.estado === "aplicada" && !ultima.has(l.proveedor_id)) ultima.set(l.proveedor_id, l);

  return (
    <Pagina titulo="Listas de precios" bajada="Cargá la planilla de un proveedor para actualizar los costos. Antes de guardar vas a ver qué cambia.">
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={() => void recargar()}>Reintentar</Boton>}>{error}</Aviso>
      <Toast texto={toast} alCerrar={() => setToast(null)} />

      {resultado && (
        <section className="listas-resultado" role="status" data-testid="resultado">
          <span className="listas-resultado-tilde" aria-hidden="true"><Icono nombre="tilde" tam={28} grosor={3} /></span>
          <div className="listas-resultado-texto">
            <h2>{resultado.titulo}</h2>
            <p>{resultado.detalle}</p>
          </div>
          <div className="listas-resultado-botones">
            <Boton icono="productos" onClick={() => irA("productos")}>Ver los productos</Boton>
            <Boton variante="marino" onClick={() => setResultado(null)}>Entendido</Boton>
          </div>
        </section>
      )}

      {pendientes.length > 0 && (
        <section className="listas-seccion" aria-labelledby="listas-pendientes">
          <h2 id="listas-pendientes" className="seccion-titulo">{pendientes.length === 1 ? "Una lista espera tu revisión" : `${pendientes.length} listas esperan tu revisión`}</h2>
          <ul className="listas-pendientes">
            {pendientes.map((l) => (
              <li key={l.id} className="listas-pendiente" data-testid="lista-pendiente">
                <span className="listas-pendiente-icono" aria-hidden="true"><Icono nombre="listas" tam={22} /></span>
                <div className="listas-pendiente-texto">
                  <strong>{l.proveedor} · lista del {fecha(l.fecha_lista)}</strong>
                  <span className="detalle">
                    {numero(l.resumen.leidas)} productos · {numero(l.resumen.modificados)} cambian de precio{l.resumen.modificados > 0 ? ` (${porcentaje(l.resumen.variacion_promedio)} en promedio)` : ""} · {numero(l.resumen.nuevos)} nuevos. Todavía no se guardó nada.
                  </span>
                </div>
                <Boton variante="marino" onClick={() => abrirPendiente(l)} aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`}>Revisar y aplicar</Boton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="listas-seccion" aria-labelledby="listas-proveedores">
        <div className="listas-seccion-cabeza">
          <h2 id="listas-proveedores" className="seccion-titulo">Proveedores</h2>
          {activos.length > 0 && <Boton tam={esCelular ? undefined : "chico"} icono="mas" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">Agregar proveedor</Boton>}
        </div>
        {proveedores === null ? (
          error ? null : <div className="esqueleto listas-esqueleto" aria-label="Cargando los proveedores" role="status" />
        ) : activos.length === 0 ? (
          <div className="tarjeta">
            <Vacio icono="proveedor" titulo="Todavía no hay proveedores"
              accion={<Boton variante="marino" icono="mas" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">Agregar el primer proveedor</Boton>}>
              El primer paso es agregar al proveedor, con sus descuentos y si sus precios traen IVA. Después cargás su planilla acá abajo.
            </Vacio>
          </div>
        ) : esCelular ? (
          <ul className="lista" data-testid="estado-proveedores">
            {activos.map((p) => {
              const l = ultima.get(p.id);
              return (
                <li key={p.id} className="renglon" aria-label={p.nombre}>
                  <span className="nombre">{p.nombre}</span>
                  <EstadoDeLista lista={l} />
                  <span className="detalle">{l ? `Última lista del ${fecha(l.fecha_lista)} (${haceDias(diasDesde(l.fecha_lista))}) · ${numero(l.resumen.leidas)} productos` : "Nunca se cargó una lista"}</span>
                  <span className="detalle">{comoSeCalcula(p)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="tabla-marco">
            <table className="tabla" data-testid="estado-proveedores">
              <thead><tr><th scope="col">Proveedor</th><th scope="col">Última lista aplicada</th><th scope="col" /><th scope="col" className="num">Productos</th><th scope="col">Cómo se calcula su costo</th><th scope="col">Lector</th></tr></thead>
              <tbody>
                {activos.map((p) => {
                  const l = ultima.get(p.id);
                  return (
                    <tr key={p.id}>
                      <td className="nombre">{p.nombre}</td>
                      <td>{l ? <>{fecha(l.fecha_lista)} <span className="detalle">· {haceDias(diasDesde(l.fecha_lista))}</span></> : <span className="detalle">Nunca se cargó una lista</span>}</td>
                      <td className="angosta"><EstadoDeLista lista={l} /></td>
                      <td className="num">{l ? numero(l.resumen.leidas) : "—"}</td>
                      <td className="detalle">{comoSeCalcula(p)}</td>
                      <td>{p.lector ? <code>{p.lector}</code> : <span className="detalle">Se elige al cargar</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="listas-seccion" aria-labelledby="listas-cargar">
        <h2 id="listas-cargar" className="seccion-titulo">Cargar una lista</h2>
        <ZonaDeCarga proveedores={activos} enLinea={enLinea} alCargar={(c) => { setResultado(null); setCargada(c); }} />
      </section>

      <section className="listas-seccion" aria-labelledby="listas-historial">
        <h2 id="listas-historial" className="seccion-titulo">Últimas cargas</h2>
        {historial.length === 0 ? (
          proveedores !== null && <p className="listas-nada">Todavía no se cargó ninguna lista. Cuando cargues la primera, acá queda anotado qué cambió.</p>
        ) : esCelular ? (
          <ul className="lista" data-testid="historial">
            {historial.slice(0, 20).map((l) => (
              <li key={l.id} className="renglon">
                <span className="nombre">{l.proveedor} · lista del {fecha(l.fecha_lista)}</span>
                <EstadoDeCarga estado={l.estado} />
                <span className="detalle">{cuando(l.creado_en)} · {queCambio(l)}</span>
                <span className="detalle listas-archivo">{l.archivo_nombre}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tabla-marco">
            <table className="tabla" data-testid="historial">
              <thead><tr><th scope="col">Cuándo</th><th scope="col">Proveedor</th><th scope="col">Lista del</th><th scope="col">Archivo</th><th scope="col">Resultado</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {historial.slice(0, 20).map((l) => (
                  <tr key={l.id}>
                    <td className="angosta">{cuando(l.creado_en)}</td>
                    <td className="nombre">{l.proveedor}</td>
                    <td>{fecha(l.fecha_lista)}</td>
                    <td className="detalle listas-archivo">{l.archivo_nombre}</td>
                    <td>{queCambio(l)}</td>
                    <td className="angosta"><EstadoDeCarga estado={l.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {altaAbierta && <AltaDeProveedor enLinea={enLinea} alCerrar={() => setAltaAbierta(false)} alCambiar={async (nombre) => { await recargar(); setAltaAbierta(false); setToast(`Proveedor ${nombre} agregado.`); }} />}
    </Pagina>
  );
}

function comoSeCalcula(p: Proveedor): string {
  const partes = [p.precios_incluyen_iva ? "Precios con IVA" : "Precios sin IVA"];
  if (Number(p.descuento_general)) partes.push(`${porciento(p.descuento_general)} de descuento`);
  if (Number(p.descuento_contado)) partes.push(`${porciento(p.descuento_contado)} por contado`);
  return partes.join(" · ");
}

function queCambio(l: ListaFila): string {
  return l.estado === "aplicada" ? `${numero(l.resumen.nuevos)} nuevos, ${numero(l.resumen.modificados)} cambiados` : `${numero(l.resumen.leidas)} leídos`;
}

function EstadoDeLista({ lista }: { lista: ListaFila | undefined }) {
  if (!lista) return <Pastilla tipo="alerta">Sin lista</Pastilla>;
  return diasDesde(lista.fecha_lista) > DIAS_LISTA_VIEJA ? <Pastilla tipo="mal">Lista vieja</Pastilla> : <Pastilla tipo="ok">Al día</Pastilla>;
}

function EstadoDeCarga({ estado }: { estado: string }) {
  if (estado === "aplicada") return <Pastilla tipo="ok">Aplicada</Pastilla>;
  if (estado === "pendiente") return <Pastilla tipo="alerta">Sin revisar</Pastilla>;
  if (estado === "aplicando") return <Pastilla tipo="azul">Aplicándose</Pastilla>;
  if (estado === "descartada") return <Pastilla>Descartada</Pastilla>;
  return <Pastilla>{estado}</Pastilla>;
}

function ZonaDeCarga({ proveedores, enLinea, alCargar }: { proveedores: Proveedor[]; enLinea: boolean; alCargar: (c: Cargada) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"esperando" | "leyendo" | "falta-proveedor" | "falta-fecha">("esperando");
  const [error, setError] = useState<{ archivo: string; motivo: string } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [proveedorId, setProveedorId] = useState("");
  const [falta, setFalta] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const fechaElegida = useRef<HTMLInputElement>(null);
  const idAyuda = useId();
  const idFalta = useId();

  async function enviar(f: File, extra: Record<string, string> = {}) {
    setEstado("leyendo");
    setError(null);
    const cuerpo = new FormData();
    cuerpo.set("archivo", f, f.name);
    for (const [k, v] of Object.entries(extra)) cuerpo.set(k, v);
    try {
      const r = await api<Cargada>("/listas", { method: "POST", body: cuerpo });
      cancelar();
      alCargar(r);
    } catch (e) {
      const mensaje = mensajeDe(e);
      // El servidor avisa con texto qué le falta; el archivo queda elegido para no pedirlo de nuevo.
      if (mensaje.includes("de qué proveedor")) setEstado("falta-proveedor");
      else if (mensaje.includes("fecha")) setEstado("falta-fecha");
      else { cancelar(); setError({ archivo: f.name, motivo: mensaje }); }
    }
  }
  function cancelar() { setArchivo(null); setEstado("esperando"); setProveedorId(""); setFalta(false); }
  function elegir(f: File | undefined) {
    if (!f || estado !== "esperando" || !enLinea) return;
    setArchivo(f);
    void enviar(f);
  }
  function soltar(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }
  function leerConProveedor(e: FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    if (!proveedorId) { setFalta(true); return; }
    void enviar(archivo, { proveedor_id: proveedorId });
  }
  function leerConFecha(e: FormEvent) {
    e.preventDefault();
    const f = fechaElegida.current?.value;
    if (!archivo) return;
    if (!f) { setFalta(true); return; }
    void enviar(archivo, { fecha_lista: f, ...(proveedorId ? { proveedor_id: proveedorId } : {}) });
  }

  return (
    <div className={`listas-zona ${arrastrando ? "arrastrando" : ""} ${estado === "esperando" ? "" : "ocupada"}`} data-testid="zona-de-carga"
      onDragOver={(e) => { e.preventDefault(); if (estado === "esperando" && enLinea) setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
      {estado === "esperando" && (
        <>
          <span className="listas-zona-icono" aria-hidden="true"><Icono nombre="subir" tam={26} /></span>
          <div className="listas-zona-texto">
            <strong><span className="solo-compu">{arrastrando ? "Soltala acá" : "Arrastrá acá la planilla del proveedor, o elegila"}</span><span className="solo-celu">Elegí la planilla del proveedor</span></strong>
            <p id={idAyuda} className="detalle">Excel (.xlsx o .xls) de hasta 30 MB. Se reconoce sola de qué proveedor es. Nada se guarda hasta que la revises y toques «Aplicar».</p>
          </div>
          <Boton variante="principal" tam="grande" icono="archivo" disabled={!enLinea} aria-describedby={idAyuda} onClick={() => entrada.current?.click()} data-testid="elegir-archivo">Elegir archivo</Boton>
        </>
      )}
      {estado === "leyendo" && <div className="listas-zona-ancho"><Progreso texto={`Leyendo ${archivo?.name ?? "la planilla"} y comparando con los costos de hoy…`} /></div>}
      {estado === "falta-proveedor" && archivo && (
        <form className="listas-zona-pregunta" onSubmit={leerConProveedor} noValidate>
          <span className="listas-zona-icono alerta" aria-hidden="true"><Icono nombre="alerta" tam={26} /></span>
          <div className="listas-zona-texto">
            <strong>No reconocí de qué proveedor es {archivo.name}</strong>
            <p className="detalle">Elegilo y la leo de nuevo. No hace falta volver a elegir el archivo.</p>
          </div>
          <div className="listas-zona-campos">
            <label className="campo">
              <span>Proveedor de esta lista</span>
              <select className="selector" value={proveedorId} autoFocus aria-invalid={falta && !proveedorId} aria-describedby={falta && !proveedorId ? idFalta : undefined}
                onChange={(e) => { setProveedorId(e.target.value); setFalta(false); }} data-testid="elegir-proveedor">
                <option value="" disabled>Elegí el proveedor</option>
                {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </label>
            <Boton type="submit" variante="principal">Leer la lista</Boton>
            <Boton onClick={cancelar}>Cancelar</Boton>
          </div>
          {falta && !proveedorId && <p id={idFalta} className="listas-falta">Elegí de qué proveedor es la lista.</p>}
        </form>
      )}
      {estado === "falta-fecha" && archivo && (
        <form className="listas-zona-pregunta" onSubmit={leerConFecha} noValidate>
          <span className="listas-zona-icono alerta" aria-hidden="true"><Icono nombre="reloj" tam={26} /></span>
          <div className="listas-zona-texto">
            <strong>La planilla {archivo.name} no dice su fecha</strong>
            <p className="detalle">Indicá de qué fecha es la lista: con eso se sabe cuál es la más nueva de cada proveedor.</p>
          </div>
          <div className="listas-zona-campos">
            <label className="campo">
              <span>Fecha de la lista</span>
              <input ref={fechaElegida} className="entrada" type="date" autoFocus defaultValue={new Date().toISOString().slice(0, 10)} aria-invalid={falta} aria-describedby={falta ? idFalta : undefined} onChange={() => setFalta(false)} data-testid="elegir-fecha" />
            </label>
            <Boton type="submit" variante="principal">Leer la lista</Boton>
            <Boton onClick={cancelar}>Cancelar</Boton>
          </div>
          {falta && <p id={idFalta} className="listas-falta">Escribí la fecha de la lista.</p>}
        </form>
      )}
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
      {estado === "esperando" && !enLinea && <div className="listas-zona-ancho"><Aviso tipo="alerta">Sin conexión. Cargar una lista necesita internet; lo demás sigue funcionando.</Aviso></div>}
      {estado === "esperando" && error && (
        <div className="listas-zona-ancho">
          <Aviso tipo="error" testId="error-de-carga"><strong>No se cargó {error.archivo}.</strong> {error.motivo}</Aviso>
        </div>
      )}
    </div>
  );
}

function Revision({ cargada, esCelular, alVolver, alDescartar, alAplicar }: { cargada: Cargada; esCelular: boolean; alVolver: () => void; alDescartar: () => void; alAplicar: (r: Resultado) => void }) {
  const [filas, setFilas] = useState<Fila[] | null>(null);
  const [total, setTotal] = useState(0);
  const [errorDeFilas, setErrorDeFilas] = useState<string | null>(null);
  const [trayendo, setTrayendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState<Avance | null>(null);
  const vivo = useRef(true);
  const r = cargada.resumen;

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  const traer = useCallback(async (desde: number) => {
    setTrayendo(true);
    try {
      const x = await api<{ total: number; filas: Fila[] }>(`/listas/${cargada.id}/filas${desde ? `?desde=${desde}` : ""}`);
      if (!vivo.current) return;
      setFilas((antes) => (desde && antes ? [...antes, ...x.filas] : x.filas));
      setTotal(x.total);
      setErrorDeFilas(null);
    } catch (e) {
      if (vivo.current) setErrorDeFilas(mensajeDe(e));
    } finally {
      if (vivo.current) setTrayendo(false);
    }
  }, [cargada.id]);
  useEffect(() => { void traer(0); }, [traer]);

  // Aplicar corre en el servidor en segundo plano; acá se consulta el avance cada segundo.
  async function aplicar() {
    setOcupado(true); setError(null);
    try {
      await api(`/listas/${cargada.id}/aplicar`, { method: "POST" });
      setProgreso({ procesadas: 0, total: r.leidas });
      while (vivo.current) {
        await new Promise((listo) => setTimeout(listo, 800));
        const l = await api<{ estado: string; resumen: Resumen & { progreso?: Avance; error?: string } }>(`/listas/${cargada.id}`);
        if (l.estado === "aplicada") {
          const x = l.resumen;
          alAplicar({
            titulo: `Listo: ${numero(x.nuevos + x.modificados)} precios actualizados`,
            detalle: `Lista de ${cargada.proveedor} del ${fecha(cargada.fecha_lista)} aplicada: ${numero(x.nuevos)} productos nuevos, ${numero(x.modificados)} con precio nuevo y ${numero(x.sin_cambio)} sin cambio.`,
          });
          return;
        }
        if (l.estado !== "aplicando") { setError(l.resumen.error ?? "La aplicación se interrumpió y no se terminó de guardar. La lista sigue acá: volvé a tocar «Aplicar»."); break; }
        if (l.resumen.progreso) setProgreso({ procesadas: l.resumen.progreso.procesadas, total: l.resumen.progreso.total ?? r.leidas, etapa: l.resumen.progreso.etapa });
      }
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      if (vivo.current) { setOcupado(false); setProgreso(null); }
    }
  }
  async function descartar() {
    setOcupado(true); setError(null);
    try { await api(`/listas/${cargada.id}/descartar`, { method: "POST" }); alDescartar(); }
    catch (e) { setError(mensajeDe(e)); setOcupado(false); }
  }

  const buscandoDuplicados = progreso?.etapa === "duplicados";
  const totalAGuardar = progreso?.total ?? r.leidas;
  // Los precios llenan hasta el 90 %; lo que queda es la búsqueda de duplicados, que no avisa su avance.
  const fraccion = progreso ? (buscandoDuplicados ? 0.95 : (totalAGuardar ? progreso.procesadas / totalAGuardar : 0) * 0.9) : 0;

  return (
    <Pagina titulo={`${cargada.proveedor} · lista del ${fecha(cargada.fecha_lista)}`} testId="revision"
      bajada="Revisá qué cambia. Nada se guarda hasta que toques «Aplicar»; si algo no cierra, descartala."
      acciones={<Boton icono="izquierda" disabled={ocupado} onClick={alVolver} data-testid="volver">Volver</Boton>}>
      {cargada.avisos.map((a, i) => <Aviso key={i} tipo="alerta">{a}</Aviso>)}

      <div className="indicadores listas-indicadores" data-testid="resumen">
        <Indicador rotulo="Productos leídos" valor={numero(r.leidas)} icono="archivo" />
        <div className={r.nuevos > 0 ? "listas-marca verde" : "listas-marca"}><Indicador rotulo="Nuevos" valor={numero(r.nuevos)} icono="mas" color="verde" /></div>
        <div className={r.modificados > 0 ? "listas-marca ambar" : "listas-marca"}>
          <Indicador rotulo="Cambian de precio" valor={numero(r.modificados)} icono="ganancia" color="ambar" detalle={r.modificados > 0 ? `${porcentaje(r.variacion_promedio)} en promedio` : undefined} />
        </div>
        <Indicador rotulo="Sin cambio" valor={numero(r.sin_cambio)} icono="tilde" />
        <Indicador rotulo="Ya no aparecen" valor={numero(r.dados_de_baja)} icono="menos" color={r.dados_de_baja > 0 ? "rojo" : undefined} />
        <Indicador rotulo="Filas salteadas" valor={numero(r.salteadas)} icono="alerta" color={r.salteadas > 0 ? "rojo" : undefined} />
      </div>

      {progreso ? (
        <section className="tarjeta relleno listas-aplicando" aria-label="Aplicando la lista">
          <ol className="listas-etapas">
            <li className={buscandoDuplicados ? "hecha" : "en-curso"}><span aria-hidden="true">{buscandoDuplicados ? <Icono nombre="tilde" tam={14} grosor={3} /> : "1"}</span>Guardar los precios</li>
            <li className={buscandoDuplicados ? "en-curso" : ""}><span aria-hidden="true">2</span>Buscar duplicados con otros proveedores</li>
          </ol>
          <Progreso fraccion={fraccion}
            texto={buscandoDuplicados ? "Precios guardados. Buscando duplicados con otros proveedores…" : `Guardando precios… ${numero(progreso.procesadas)} de ${numero(totalAGuardar)}`} />
          <p className="detalle">Tarda un rato. Podés dejar esta pantalla abierta; cuando termina te avisa.</p>
        </section>
      ) : (
        <div className="listas-acciones">
          <Boton variante="principal" tam="grande" onClick={aplicar} disabled={ocupado} data-testid="aplicar">Aplicar {numero(r.leidas)} precios</Boton>
          <Boton tam="grande" onClick={descartar} disabled={ocupado} data-testid="descartar">Descartar</Boton>
        </div>
      )}
      <Aviso tipo="error">{error}</Aviso>

      {cargada.salteadas.length > 0 && (
        <Plegable titulo="Filas salteadas" extra={`${numero(cargada.salteadas.length)} sin cargar`} relleno={false} testId="salteadas">
          <ul className="listas-salteadas">
            {cargada.salteadas.map((s) => (
              <li key={s.fila}>
                <span className="listas-salteada-fila">Fila {numero(s.fila)}</span>
                <span><strong>{s.motivo}</strong>{s.contenido.some(Boolean) && <span className="detalle"> · {s.contenido.filter(Boolean).join(" | ")}</span>}</span>
              </li>
            ))}
          </ul>
        </Plegable>
      )}

      <section className="listas-seccion" aria-labelledby="listas-previa">
        <div className="listas-seccion-cabeza">
          <h2 id="listas-previa" className="seccion-titulo">Vista previa</h2>
          {filas && <span className="detalle">Los que cambian de precio van primero{total > filas.length ? ` · ${numero(filas.length)} de ${numero(total)}` : ""}</span>}
        </div>
        <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={() => void traer(filas?.length ?? 0)}>Reintentar</Boton>}>{errorDeFilas && `No se pudo traer la vista previa. ${errorDeFilas}`}</Aviso>
        {filas === null ? (errorDeFilas ? null : <div className="esqueleto listas-esqueleto" role="status" aria-label="Cargando la vista previa" />)
          : esCelular ? <PreviaEnTarjetas filas={filas} /> : <PreviaEnTabla filas={filas} />}
        {filas && total > filas.length && <Boton className="listas-mas" disabled={trayendo} onClick={() => void traer(filas.length)} data-testid="mas-filas">{trayendo ? "Trayendo más…" : `Mostrar ${numero(Math.min(TANDA, total - filas.length))} más`}</Boton>}
      </section>
    </Pagina>
  );
}

function variacion(f: Fila): number | null {
  const antes = Number(f.costo_anterior);
  return f.costo_anterior !== null && antes > 0 ? ((Number(f.costo_neto) - antes) / antes) * 100 : null;
}

function Cambio({ fila }: { fila: Fila }) {
  const cambio = variacion(fila);
  if (fila.costo_anterior === null) return <Pastilla tipo="ok" sinPunto>Nuevo</Pastilla>;
  if (cambio === null || cambio === 0) return <span className="detalle">Sin cambio</span>;
  const diferencia = Number(fila.costo_neto) - Number(fila.costo_anterior);
  return (
    <span className={`listas-cambio ${cambio > 0 ? "sube" : "baja"}`}>
      <Icono nombre={cambio > 0 ? "arriba" : "abajo"} tam={16} grosor={2.6} />
      <Explicado valor={porcentaje(cambio)} etiqueta={`${cambio > 0 ? "Sube" : "Baja"} ${porcentaje(cambio)}`} titulo={`De dónde sale ${porcentaje(cambio)}`}
        pasos={[`Costo hasta ahora: ${pesos(fila.costo_anterior)}`, `Costo nuevo: ${pesos(fila.costo_neto)}`, `${diferencia > 0 ? "Sube" : "Baja"} ${pesos(Math.abs(diferencia))}, que sobre el costo de hasta ahora es ${porcentaje(cambio)}`]} />
    </span>
  );
}

function PreviaEnTabla({ filas }: { filas: Fila[] }) {
  const [activa, setActiva] = useState(0);
  // La vista previa se recorre con las flechas: una sola fila toma el foco al entrar con Tab.
  function mover(e: KeyboardEvent<HTMLTableRowElement>, i: number) {
    if (e.target !== e.currentTarget) return;
    const destino = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? filas.length - 1 : null;
    if (destino === null || destino < 0 || destino >= filas.length) return;
    e.preventDefault();
    setActiva(destino);
    (e.currentTarget.parentElement?.children[destino] as HTMLElement | undefined)?.focus();
  }
  return (
    <div className="tabla-marco">
      <table className="tabla listas-previa" data-testid="vista-previa">
        <thead><tr><th scope="col">Código</th><th scope="col">Descripción</th><th scope="col">Marca</th><th scope="col" className="num">Costo hasta ahora</th><th scope="col" className="num">Costo nuevo</th><th scope="col" className="num">Cambio</th></tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={f.codigo_proveedor} tabIndex={i === activa ? 0 : -1} onKeyDown={(e) => mover(e, i)} onFocus={() => setActiva(i)}>
              <td className="angosta"><code>{f.codigo_proveedor}</code></td>
              <td className="nombre">{f.descripcion}</td>
              <td>{f.marca ?? <span className="detalle">—</span>}</td>
              <td className="num">{f.costo_anterior === null ? <span className="detalle">—</span> : pesos(f.costo_anterior)}</td>
              <td className="num"><Explicado valor={pesos(f.costo_neto)} pasos={f.explicacion} className="listas-costo" titulo={`De dónde sale el costo de ${f.descripcion}`} /></td>
              <td className="num"><Cambio fila={f} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PreviaEnTarjetas({ filas }: { filas: Fila[] }) {
  return (
    <ul className="lista" data-testid="vista-previa">
      {filas.map((f) => (
        <li key={f.codigo_proveedor} className="renglon listas-previa-renglon" aria-label={`${f.codigo_proveedor} ${f.descripcion}`}>
          <span className="nombre">{f.descripcion}</span>
          <Explicado valor={pesos(f.costo_neto)} pasos={f.explicacion} className="importe chico" titulo={`De dónde sale el costo de ${f.descripcion}`} />
          <span className="detalle"><code>{f.codigo_proveedor}</code>{f.marca ? ` · ${f.marca}` : ""}{f.costo_anterior !== null ? ` · antes ${pesos(f.costo_anterior)}` : ""}</span>
          <span className="listas-previa-cambio"><Cambio fila={f} /></span>
        </li>
      ))}
    </ul>
  );
}

function AltaDeProveedor({ enLinea, alCerrar, alCambiar }: { enLinea: boolean; alCerrar: () => void; alCambiar: (nombre: string) => Promise<void> }) {
  const [lectores, setLectores] = useState<string[]>([]);
  const [error, setError] = useState<{ campo: "nombre" | "general" | "contado" | null; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const idError = useId();
  useEffect(() => { api<string[]>("/listas/lectores").then(setLectores).catch(() => setLectores([])); }, []);

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const nombre = String(d.get("nombre") ?? "").trim();
    const general = Number(String(d.get("general") || 0).replace(",", "."));
    const contado = Number(String(d.get("contado") || 0).replace(",", "."));
    const fuera = (v: number) => !Number.isFinite(v) || v < 0 || v > 100;
    if (!nombre) return setError({ campo: "nombre", texto: "Escribí el nombre del proveedor." });
    if (fuera(general)) return setError({ campo: "general", texto: "El descuento general va de 0 a 100 %." });
    if (fuera(contado)) return setError({ campo: "contado", texto: "El descuento por contado va de 0 a 100 %." });
    setGuardando(true);
    try {
      await api("/proveedores", {
        method: "POST",
        body: JSON.stringify({ nombre, lector: d.get("lector") || null, precios_incluyen_iva: d.get("iva") === "on", descuento_general: general / 100, descuento_contado: contado / 100 }),
      });
      setError(null);
      await alCambiar(nombre);
    } catch (err) {
      const repetido = err instanceof ErrorApi && err.estado === 409;
      setError({ campo: repetido ? "nombre" : null, texto: repetido ? "Ya hay un proveedor con ese nombre. Escribí otro." : err instanceof ErrorApi ? err.message : "Sin conexión con el servidor. Agregar un proveedor necesita internet." });
      setGuardando(false);
    }
  }
  const ligar = (campo: "nombre" | "general" | "contado") => ({ "aria-invalid": error?.campo === campo, "aria-describedby": error?.campo === campo ? idError : undefined, onChange: () => { if (error?.campo === campo) setError(null); } });

  return (
    <Hoja titulo="Agregar un proveedor" alCerrar={alCerrar} testId="panel-proveedores">
      <form onSubmit={alta} className="pila" noValidate>
        <label className="campo">
          <span>Nombre</span>
          <input className="entrada" name="nombre" autoFocus autoComplete="off" placeholder="Como figura en su planilla" {...ligar("nombre")} />
        </label>
        <label className="campo">
          <span>Cómo se lee su planilla</span>
          <select className="selector" name="lector" defaultValue="">
            <option value="">Se elige a mano al cargar</option>
            {lectores.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="listas-casilla">
          <input type="checkbox" name="iva" />
          <span>Los precios de su lista ya incluyen IVA</span>
        </label>
        <div className="listas-dos">
          <label className="campo">
            <span>Descuento general (%)</span>
            <input className="entrada numero" name="general" inputMode="decimal" defaultValue="0" onFocus={(e) => e.target.select()} {...ligar("general")} />
          </label>
          <label className="campo">
            <span>Descuento por contado (%)</span>
            <input className="entrada numero" name="contado" inputMode="decimal" defaultValue="0" onFocus={(e) => e.target.select()} {...ligar("contado")} />
          </label>
        </div>
        <p className="detalle">Vale para las listas que cargues de acá en adelante.</p>
        {error && <div id={idError}><Aviso tipo="error">{error.texto}</Aviso></div>}
        {!enLinea && <Aviso tipo="alerta">Sin conexión. Agregar un proveedor necesita internet.</Aviso>}
        <div className="hoja-pie">
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton type="submit" variante="principal" disabled={guardando || !enLinea}>{guardando ? "Agregando…" : "Agregar proveedor"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}

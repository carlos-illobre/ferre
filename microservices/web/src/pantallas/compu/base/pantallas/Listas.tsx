import { useCallback, useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";
import { TEXTOS } from "../../../textos";
import { ErrorApi } from "../../../../datos/conexion";
import { aplicarLista, buscarProveedores, cargarLista, descartarLista, descuentosDe, fraccionAplicada, pendientes, retomar, situacionDelProveedor, ultimaAplicada, useFilasDeLista, useLectores, useListas, variacion, type Avance, type Cargada, type Fila, type ListaFila, type Proveedor } from "../../../../negocio/catalogo/listas";
import { altaDeProveedor, faltaEnProveedor } from "../../../../negocio/proveedores";
import { fecha, pesos, porcentaje } from "../../../../formato";
import { irA } from "../rutas";
import { Aviso, Boton, Explicado, Hoja, Icono, Pagina, Progreso, Toast, Vacio, numero } from "../ui";
import "../estilos/listas.css";

type Resultado = { titulo: string; detalle: string };

const SIN_CONEXION = "Sin conexión con el servidor. Cargar una lista necesita internet.";

const TANDA = 200;
const mensajeDe = (e: unknown) => (e instanceof ErrorApi ? e.message : SIN_CONEXION);
const diaYMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const horaDe = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
// «hoy 08:12», «ayer 18:40», «el 14/10»: cuándo se subió una lista.
function subida(iso: string): string {
  const d = new Date(iso);
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  return dias === 0 ? `hoy ${horaDe(iso)}` : dias === 1 ? `ayer ${horaDe(iso)}` : `el ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
// Una subida de más del 15 % se marca en ámbar, como en la v2.
const SUBA_GRANDE = 15;

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

// Cargar una lista de precios (RF-01), como la v2 (decisión 148, «La bandeja y la revisión»): a la
// izquierda cargar, lo que espera revisión, las últimas cargas y los proveedores; a la derecha, la
// revisión de la lista elegida, con su resumen, la tabla y «Aplicar». Nada se guarda hasta «Aplicar».
// Teclado: Alt S elige el archivo, 1 a 9 abren la pendiente de ese número, ↑ ↓ recorren la tabla,
// Espacio pliega la explicación, Alt D descarta, Ctrl Enter aplica y «/» busca un proveedor.
export function Listas() {
  const enLinea = useEnLinea();
  const { proveedores, historial, error: fallo, recargar } = useListas();
  const error = fallo && mensajeDe(fallo);
  // Lo que se acaba de subir; si no, la pendiente elegida (la primera, si no se eligió ninguna).
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [buscado, setBuscado] = useState<string | null>(null);
  const elegirArchivo = useRef<() => void>(() => undefined);
  const cajaProveedor = useRef<HTMLInputElement>(null);
  const t = TEXTOS.listas;

  // Al volver la conexión se recupera sola: el aviso desaparece cuando se corrige la causa.
  useEffect(() => { if (enLinea && error) void recargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  const activos = (proveedores ?? []).filter((p) => p.activo);
  const sinAplicar = pendientes(historial);
  const ultimas = historial.filter((l) => l.estado !== "pendiente").slice(0, 3);
  const ultima = ultimaAplicada(historial);
  const pendienteElegida = sinAplicar.find((l) => l.id === elegidaId) ?? sinAplicar[0] ?? null;
  const enRevision = cargada ?? (pendienteElegida ? retomar(pendienteElegida) : null);
  const deLaRevision = enRevision ? historial.find((l) => l.id === enRevision.id) : undefined;
  const abrir = (l: ListaFila) => { setResultado(null); setCargada(null); setElegidaId(l.id); };
  // Los de lista vieja primero: son los que hay que pedir.
  const ordenados = [...activos].sort((a, b) => Number(situacionDelProveedor(ultima.get(b.id)).estado === "vieja") - Number(situacionDelProveedor(ultima.get(a.id)).estado === "vieja"));
  const aLaVista = buscado === null ? ordenados : buscarProveedores(ordenados, buscado);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.altKey && e.code === "KeyS") { e.preventDefault(); elegirArchivo.current(); return; }
    if (e.key === "/" && !e.ctrlKey && !e.altKey) { e.preventDefault(); setBuscado((b) => b ?? ""); requestAnimationFrame(() => cajaProveedor.current?.focus()); return; }
    if (!e.ctrlKey && !e.altKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) {
      const l = sinAplicar[Number(e.code.slice(5)) - 1];
      if (l) { e.preventDefault(); abrir(l); }
    }
  }, [sinAplicar]); // eslint-disable-line react-hooks/exhaustive-deps
  useTeclasGlobales(teclas);

  return (
    <Pagina titulo="Listas de precios" testId="listas" className="listas-v2"
      acciones={<AlLadoDeLasPestanas>
        <div className="fila lv-arriba">
          {activos.length > 0 && <Boton icono="edificio" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">{t.agregarProveedor.largo}</Boton>}
          <Boton icono="subir" disabled={!enLinea} onClick={() => elegirArchivo.current()} data-atajo="s" data-testid="subir-lista">{t.subirLista.largo}<kbd className="tecla solo-compu" aria-hidden="true">Alt S</kbd></Boton>
        </div>
      </AlLadoDeLasPestanas>}>
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={() => void recargar()}>Reintentar</Boton>}>{error}</Aviso>
      <Toast texto={toast} alCerrar={() => setToast(null)} />

      <div className="lv">
        <div className="lv-izq">
          <ZonaDeCarga proveedores={activos} enLinea={enLinea} elegir={elegirArchivo} alCargar={(c) => { setResultado(null); setCargada(c); }} />

          {sinAplicar.length > 0 && (
            <section aria-labelledby="lv-revisar">
              <h2 id="lv-revisar" className="lv-cab"><b>{t.paraRevisar.largo}</b><span className="lv-cuenta ambar">{sinAplicar.length}</span></h2>
              <ul className="lv-filas">
                {sinAplicar.map((l, i) => (
                  <li key={l.id}>
                    <button type="button" className={`lv-fila ${!cargada && !resultado && l.id === pendienteElegida?.id ? "elegida" : ""}`} onClick={() => abrir(l)} data-testid="lista-pendiente"
                      aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`} aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}>
                      <span className="lv-ic"><Icono nombre="excel" /></span>
                      <span className="lv-texto"><b>{l.proveedor}</b><span>{diaYMes(l.fecha_lista)} · subida {subida(l.creado_en)}</span></span>
                      {i < 9 && <kbd className="tecla" aria-hidden="true">{i + 1}</kbd>}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* El orden lo pidió Carlos: primero cargar, después las últimas tres cargas y al final los proveedores. */}
          <section aria-labelledby="lv-ultimas">
            <h2 id="lv-ultimas" className="lv-cab"><b>{t.ultimasCargas.largo}</b></h2>
            {ultimas.length === 0 ? (
              proveedores !== null && <p className="lv-nada">Todavía no se cargó ninguna lista. Cuando cargues la primera, acá queda anotado qué cambió.</p>
            ) : (
              <ul className="lv-filas" data-testid="historial">
                {ultimas.map((l) => (
                  <li key={l.id} className="lv-fila" title={l.archivo_nombre}>
                    <span className="lv-ic"><Icono nombre={l.estado === "descartada" ? "archivo" : "excel"} /></span>
                    <span className="lv-texto"><b>{l.proveedor}</b><span>{diaYMes(l.fecha_lista)} · {queCambio(l)}</span></span>
                    <EstadoDeCarga estado={l.estado} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lv-prov" aria-labelledby="lv-proveedores">
            <h2 id="lv-proveedores" className="lv-cab">
              <b>{t.proveedores.largo}</b>{activos.length > 0 && <span className="lv-cuenta">{activos.length}</span>}
              {activos.length > 0 && <button type="button" className="lv-mas" onClick={() => { setBuscado((b) => (b === null ? "" : null)); requestAnimationFrame(() => cajaProveedor.current?.focus()); }} aria-keyshortcuts="/" aria-expanded={buscado !== null}>{t.buscar.largo} <kbd className="tecla" aria-hidden="true">/</kbd></button>}
            </h2>
            {buscado !== null && (
              <label className="lv-buscar">
                <Icono nombre="buscar" tam={18} />
                <input ref={cajaProveedor} type="search" value={buscado} onChange={(e) => setBuscado(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setBuscado(null); } }}
                  placeholder={t.buscarProveedor.largo} aria-label={t.buscarProveedor.largo} autoComplete="off" data-testid="buscar-proveedor" />
              </label>
            )}
            {proveedores === null ? (
              error ? null : <div className="esqueleto listas-esqueleto" aria-label="Cargando los proveedores" role="status" />
            ) : activos.length === 0 ? (
              <Vacio icono="proveedor" titulo="Todavía no hay proveedores"
                accion={<Boton variante="marino" icono="mas" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">Agregar el primer proveedor</Boton>}>
                El primer paso es agregar al proveedor, con sus descuentos y si sus precios traen IVA. Después cargás su planilla.
              </Vacio>
            ) : aLaVista.length === 0 ? <p className="lv-nada">Ningún proveedor con «{buscado}».</p> : (
              <ul className="lv-proveedores" data-testid="estado-proveedores">
                {aLaVista.map((p) => {
                  const l = ultima.get(p.id);
                  const { estado, dias } = situacionDelProveedor(l);
                  return (
                    <li key={p.id} className="lv-proveedor" aria-label={p.nombre}>
                      <span className={`lv-punto ${estado === "vieja" || estado === "sin lista" ? "vieja" : ""}`} aria-hidden="true" />
                      <b>{p.nombre}</b>
                      <span className={`lv-pastilla ${estado === "vieja" ? "ambar" : estado === "sin lista" ? "" : "verde"}`}>
                        {estado === "vieja" ? `Vieja · ${dias} días` : estado === "sin lista" ? "Sin lista" : estado === "al día" ? "Al día" : "Vigente"}
                      </span>
                      <span className="lv-como">{comoSeCalcula(p)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {resultado ? (
          <section className="lv-der lv-resultado" role="status" data-testid="resultado">
            <span className="lv-resultado-tilde" aria-hidden="true"><Icono nombre="tilde" tam={28} grosor={3} /></span>
            <h2>{resultado.titulo}</h2>
            <p>{resultado.detalle}</p>
            <div className="fila">
              <Boton icono="productos" onClick={() => irA("productos")}>Ver los productos</Boton>
              <Boton variante="marino" onClick={() => setResultado(null)}>Entendido</Boton>
            </div>
          </section>
        ) : enRevision ? (
          <Revision key={enRevision.id} cargada={enRevision} origen={deLaRevision ? `${deLaRevision.archivo_nombre} · subida ${subida(deLaRevision.creado_en)}` : "Recién subida"}
            alDescartar={() => { setCargada(null); setElegidaId(null); setToast("Lista descartada. No se guardó ningún precio."); void recargar(); }}
            alAplicar={(r) => { setCargada(null); setElegidaId(null); setResultado(r); void recargar(); }} />
        ) : (
          <section className="lv-der lv-vacia">
            <Vacio icono="listas" titulo={t.sinListasParaRevisar.largo}
              accion={<Boton variante="principal" icono="subir" disabled={!enLinea} onClick={() => elegirArchivo.current()}>{t.subirLista.largo}</Boton>}>
              {t.queHacer.largo}
            </Vacio>
          </section>
        )}
      </div>

      {altaAbierta && <AltaDeProveedor enLinea={enLinea} alCerrar={() => setAltaAbierta(false)} alCambiar={async (nombre) => { await recargar(); setAltaAbierta(false); setToast(`Proveedor ${nombre} agregado.`); }} />}
    </Pagina>
  );
}

// Cómo se calcula el costo de un proveedor: si sus precios traen IVA, sus descuentos y su lector.
function comoSeCalcula(p: Proveedor): string {
  return [p.precios_incluyen_iva ? "Con IVA" : "Sin IVA", ...descuentosDe(p), p.lector ? `lector ${p.lector}` : "lector a mano"].join(" · ");
}

function queCambio(l: ListaFila): string {
  return l.estado === "aplicada" ? `${numero(l.resumen.modificados)} cambiados` : `${numero(l.resumen.leidas)} leídos`;
}

function EstadoDeCarga({ estado }: { estado: string }) {
  if (estado === "aplicada") return <span className="lv-pastilla verde">Aplicada</span>;
  if (estado === "pendiente") return <span className="lv-pastilla ambar">Sin revisar</span>;
  if (estado === "aplicando") return <span className="lv-pastilla ambar">Aplicándose</span>;
  if (estado === "descartada") return <span className="lv-pastilla">Descartada</span>;
  return <span className="lv-pastilla">{estado}</span>;
}

// Donde se entrega el archivo: la zona punteada de la v2. Se suelta encima o se elige (Alt S).
function ZonaDeCarga({ proveedores, enLinea, elegir: abrirSelector, alCargar }: { proveedores: Proveedor[]; enLinea: boolean; elegir: React.MutableRefObject<() => void>; alCargar: (c: Cargada) => void }) {
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
  const t = TEXTOS.listas;
  useEffect(() => { abrirSelector.current = () => { if (estado === "esperando" && enLinea) entrada.current?.click(); }; }, [abrirSelector, estado, enLinea]);

  async function enviar(f: File, extra: Record<string, string> = {}) {
    setEstado("leyendo");
    setError(null);
    try {
      const r = await cargarLista(f, extra);
      // Si le falta saber de qué proveedor o de qué fecha es, el archivo queda elegido para no pedirlo de nuevo.
      if ("falta" in r) { setEstado(r.falta === "proveedor" ? "falta-proveedor" : "falta-fecha"); return; }
      cancelar();
      alCargar(r.cargada);
    } catch (e) {
      cancelar(); setError({ archivo: f.name, motivo: mensajeDe(e) });
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
    <div className="lv-zona-lugar">
      <div className={`lv-zona ${arrastrando ? "arrastrando" : ""} ${estado === "esperando" ? "" : "ocupada"}`} data-testid="zona-de-carga"
        onDragOver={(e) => { e.preventDefault(); if (estado === "esperando" && enLinea) setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
        {estado === "leyendo" ? <Progreso texto={`Leyendo ${archivo?.name ?? "la planilla"}…`} /> : (
          <button type="button" className="lv-zona-boton" disabled={!enLinea || estado !== "esperando"} aria-describedby={idAyuda} onClick={() => entrada.current?.click()} data-testid="elegir-archivo">
            <span className="lv-zona-ic" aria-hidden="true"><Icono nombre="subir-archivo" /></span>
            <span className="lv-texto">
              <b>{arrastrando ? "Soltala acá" : t.cargarUnaLista.largo}</b>
              <span id={idAyuda}>{t.soltaElExcel.largo} <kbd className="tecla" aria-hidden="true">Alt S</kbd></span>
            </span>
          </button>
        )}
      </div>
      {estado === "falta-proveedor" && archivo && (
        <form className="lv-pregunta" onSubmit={leerConProveedor} noValidate>
          <strong><Icono nombre="alerta" tam={18} />No reconocí de qué proveedor es {archivo.name}</strong>
          <p className="detalle">Elegilo y la leo de nuevo. No hace falta volver a elegir el archivo.</p>
          <label className="campo">
            <span>Proveedor de esta lista</span>
            <select className="selector" value={proveedorId} autoFocus aria-invalid={falta && !proveedorId} aria-describedby={falta && !proveedorId ? idFalta : undefined}
              onChange={(e) => { setProveedorId(e.target.value); setFalta(false); }} data-testid="elegir-proveedor">
              <option value="" disabled>Elegí el proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
          {falta && !proveedorId && <p id={idFalta} className="listas-falta">Elegí de qué proveedor es la lista.</p>}
          <div className="fila"><Boton type="submit" variante="principal">Leer la lista</Boton><Boton onClick={cancelar}>Cancelar</Boton></div>
        </form>
      )}
      {estado === "falta-fecha" && archivo && (
        <form className="lv-pregunta" onSubmit={leerConFecha} noValidate>
          <strong><Icono nombre="reloj" tam={18} />La planilla {archivo.name} no dice su fecha</strong>
          <p className="detalle">Indicá de qué fecha es la lista: con eso se sabe cuál es la más nueva de cada proveedor.</p>
          <label className="campo">
            <span>Fecha de la lista</span>
            <input ref={fechaElegida} className="entrada" type="date" autoFocus defaultValue={new Date().toISOString().slice(0, 10)} aria-invalid={falta} aria-describedby={falta ? idFalta : undefined} onChange={() => setFalta(false)} data-testid="elegir-fecha" />
          </label>
          {falta && <p id={idFalta} className="listas-falta">Escribí la fecha de la lista.</p>}
          <div className="fila"><Boton type="submit" variante="principal">Leer la lista</Boton><Boton onClick={cancelar}>Cancelar</Boton></div>
        </form>
      )}
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
      {estado === "esperando" && !enLinea && <Aviso tipo="alerta">Sin conexión. Cargar una lista necesita internet; lo demás sigue funcionando.</Aviso>}
      {estado === "esperando" && error && <Aviso tipo="error" testId="error-de-carga"><strong>No se cargó {error.archivo}.</strong> {error.motivo}</Aviso>}
    </div>
  );
}

type Filtro = "cambian" | "salteadas";

function Revision({ cargada, origen, alDescartar, alAplicar }: { cargada: Cargada; origen: string; alDescartar: () => void; alAplicar: (r: Resultado) => void }) {
  const { filas, total, error: falloDeFilas, trayendo, traerMas } = useFilasDeLista(cargada.id);
  const errorDeFilas = falloDeFilas && mensajeDe(falloDeFilas);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [progreso, setProgreso] = useState<Avance | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("cambian");
  const vivo = useRef(true);
  const r = cargada.resumen;
  const t = TEXTOS.listas;
  const cambian = r.nuevos + r.modificados;

  useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);

  // Aplicar corre en el servidor en segundo plano; acá se consulta el avance cada segundo.
  async function aplicar() {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try {
      const fin = await aplicarLista(cargada, setProgreso, () => vivo.current);
      if ("aplicada" in fin) {
        const x = fin.aplicada;
        alAplicar({
          titulo: `Listo: ${numero(x.nuevos + x.modificados)} precios actualizados`,
          detalle: `Lista de ${cargada.proveedor} del ${fecha(cargada.fecha_lista)} aplicada: ${numero(x.nuevos)} productos nuevos, ${numero(x.modificados)} con precio nuevo y ${numero(x.sin_cambio)} sin cambio.`,
        });
        return;
      }
      if ("interrumpida" in fin) setError(fin.interrumpida ?? "La aplicación se interrumpió y no se terminó de guardar. La lista sigue acá: volvé a tocar «Aplicar».");
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      if (vivo.current) { setOcupado(false); setProgreso(null); }
    }
  }
  async function descartar() {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try { await descartarLista(cargada.id); alDescartar(); }
    catch (e) { setError(mensajeDe(e)); setOcupado(false); }
  }

  const alTeclear = useRef<(e: globalThis.KeyboardEvent) => void>(() => undefined);
  alTeclear.current = (e) => {
    if (document.querySelector("dialog[open]")) return;
    if (e.altKey && e.code === "KeyD") { e.preventDefault(); void descartar(); }
    else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); void aplicar(); }
  };
  const teclas = useCallback((e: globalThis.KeyboardEvent) => alTeclear.current(e), []);
  useTeclasGlobales(teclas);

  const buscandoDuplicados = progreso?.etapa === "duplicados";
  const totalAGuardar = progreso?.total ?? r.leidas;
  const fraccion = fraccionAplicada(progreso, r.leidas);
  // Los filtros que el sistema todavía no sabe hacer quedan a la vista y apagados (021, E02).
  const chips: { valor: Filtro | null; nombre: string; cuenta: string }[] = [
    { valor: "cambian", nombre: "Cambian", cuenta: numero(r.modificados) },
    { valor: null, nombre: `Subas de más de ${SUBA_GRANDE} %`, cuenta: "—" },
    { valor: null, nombre: "Nuevos", cuenta: numero(r.nuevos) },
    { valor: null, nombre: "Ya no están", cuenta: numero(r.dados_de_baja) },
    { valor: "salteadas", nombre: "Salteadas", cuenta: numero(r.salteadas) },
  ];

  return (
    <section className="lv-der lv-rev" aria-labelledby="lv-rev-titulo" data-testid="revision">
      <header className="lv-rev-cab">
        <span className="lv-doc" aria-hidden="true"><Icono nombre="excel" tam={24} /></span>
        <div className="lv-texto">
          <h2 id="lv-rev-titulo">{cargada.proveedor} · lista del {fecha(cargada.fecha_lista)}</h2>
          <span>{origen}</span>
        </div>
      </header>

      <div className="lv-numeros" data-testid="resumen">
        <div><span>Leídos</span><b>{numero(r.leidas)}</b></div>
        <div className="cambian"><span>Cambian</span><b>{numero(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b></div>
        <div><span>Nuevos</span><b>{numero(r.nuevos)}</b></div>
        <div><span>Sin cambio</span><b>{numero(r.sin_cambio)}</b></div>
        <div><span>Ya no están</span><b>{numero(r.dados_de_baja)}</b></div>
        <div className={r.salteadas > 0 ? "saltea" : ""}><span>Salteadas</span><b>{numero(r.salteadas)}</b></div>
      </div>

      {cargada.avisos.map((a, i) => <div key={i} className="lv-aviso" role="status"><Icono nombre="alerta" tam={18} /><span>{a}</span></div>)}

      <div className="lv-filtros" role="tablist" aria-label="Qué filas ver">
        {chips.map((c) => (
          <button key={c.nombre} type="button" role="tab" className="lv-chip" aria-selected={c.valor === filtro} disabled={c.valor === null}
            title={c.valor === null ? "Todavía no se puede filtrar por esto" : undefined} onClick={() => c.valor && setFiltro(c.valor)}>
            {c.nombre} <b>{c.cuenta}</b>
          </button>
        ))}
      </div>

      {filtro === "salteadas" ? (
        <div className="lv-tabla" data-testid="salteadas">
          {cargada.salteadas.length === 0 ? <p className="lv-nada">No se salteó ninguna fila.</p> : (
            <ul className="lv-salteadas">
              {cargada.salteadas.map((s) => (
                <li key={s.fila}><span className="lv-salteada-fila">Fila {numero(s.fila)}</span><span><strong>{s.motivo}</strong>{s.contenido.some(Boolean) && <span className="detalle"> · {s.contenido.filter(Boolean).join(" | ")}</span>}</span></li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={traerMas}>Reintentar</Boton>}>{errorDeFilas && `No se pudo traer la vista previa. ${errorDeFilas}`}</Aviso>
          {filas === null ? (errorDeFilas ? null : <div className="esqueleto lv-tabla" role="status" aria-label="Cargando la vista previa" />)
            : <Previa filas={filas} mas={total > filas.length ? <Boton tam="chico" className="lv-mas-filas" disabled={trayendo} onClick={traerMas} data-testid="mas-filas">{trayendo ? "Trayendo más…" : `Mostrar ${numero(Math.min(TANDA, total - filas.length))} más de ${numero(total)}`}</Boton> : null} />}
        </>
      )}

      <Aviso tipo="error">{error}</Aviso>
      {progreso ? (
        <div className="lv-aplicando" aria-label="Aplicando la lista">
          <Progreso fraccion={fraccion}
            texto={buscandoDuplicados ? "Precios guardados. Buscando duplicados con otros proveedores…" : `Guardando precios… ${numero(progreso.procesadas)} de ${numero(totalAGuardar)}`} />
          <span className="detalle">Tarda un rato. Podés dejar esta pantalla abierta; cuando termina te avisa.</span>
        </div>
      ) : (
        <footer className="lv-pie">
          <button type="button" className="lv-descartar" onClick={() => void descartar()} disabled={ocupado} aria-keyshortcuts="Alt+D" data-testid="descartar">{t.descartar.largo} <kbd className="tecla" aria-hidden="true">Alt D</kbd></button>
          <span className="lv-nota"><Icono nombre="candado" tam={16} />{t.nadaCambiaHastaAplicar.largo}</span>
          <span className="lv-nota tenue" aria-hidden="true"><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd><kbd className="tecla">Espacio</kbd></span>
          <button type="button" className="lv-aplicar" onClick={() => void aplicar()} disabled={ocupado} aria-keyshortcuts="Control+Enter" data-testid="aplicar">
            Aplicar · cambian {numero(cambian)} precios <kbd className="tecla" aria-hidden="true">Ctrl Enter</kbd>
          </button>
        </footer>
      )}
    </section>
  );
}

function Cambio({ fila }: { fila: Fila }) {
  const cambio = variacion(fila);
  if (fila.costo_anterior === null) return <span className="lv-var nuevo">Nuevo</span>;
  if (cambio === null || cambio === 0) return <span className="lv-var">0 %</span>;
  const diferencia = Number(fila.costo_neto) - Number(fila.costo_anterior);
  return (
    <span className={`lv-var ${cambio > SUBA_GRANDE ? "grande" : cambio < 0 ? "baja" : ""}`}>
      <Explicado valor={porcentaje(cambio)} etiqueta={`${cambio > 0 ? "Sube" : "Baja"} ${porcentaje(cambio)}`} titulo={`De dónde sale ${porcentaje(cambio)}`}
        pasos={[`Costo hasta ahora: ${pesos(fila.costo_anterior)}`, `Costo nuevo: ${pesos(fila.costo_neto)}`, `${diferencia > 0 ? "Sube" : "Baja"} ${pesos(Math.abs(diferencia))}, que sobre el costo de hasta ahora es ${porcentaje(cambio)}`]} />
    </span>
  );
}

// La tabla de la revisión. Se recorre con ↑ ↓; la fila con foco muestra debajo, en pasos, de
// dónde sale su costo (Espacio la pliega).
function Previa({ filas, mas }: { filas: Fila[]; mas: React.ReactNode }) {
  const [activa, setActiva] = useState(0);
  const [explicada, setExplicada] = useState(true);
  function mover(e: KeyboardEvent<HTMLTableRowElement>, i: number) {
    if (e.target !== e.currentTarget) return;
    if (e.key === " ") { e.preventDefault(); setExplicada((x) => !x); return; }
    const destino = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? filas.length - 1 : null;
    if (destino === null || destino < 0 || destino >= filas.length) return;
    e.preventDefault();
    setActiva(destino);
    (e.currentTarget.closest("tbody")?.querySelector(`tr[data-fila="${destino}"]`) as HTMLElement | null)?.focus();
  }
  return (
    <div className="lv-tabla">
      <table className="lv-previa" data-testid="vista-previa" data-flechas-propias>
        <colgroup><col className="c-foto" /><col /><col className="c-antes" /><col className="c-nuevo" /><col className="c-cambio" /><col className="c-estante" /></colgroup>
        <thead><tr><th scope="col"><span className="solo-lectores">Foto</span></th><th scope="col">Producto</th><th scope="col" className="num">Costo antes</th><th scope="col" className="num">Costo nuevo</th><th scope="col" className="num">Cambio</th><th scope="col" className="num">{TEXTOS.listas.precioEnEstanteria.largo}</th></tr></thead>
        <tbody>
          {filas.map((f, i) => (
            <FilaDePrevia key={f.codigo_proveedor} fila={f} i={i} foco={i === activa} explicada={explicada && i === activa}
              alTeclear={(e) => mover(e, i)} alEnfocar={() => setActiva(i)} />
          ))}
        </tbody>
      </table>
      {mas}
    </div>
  );
}

function FilaDePrevia({ fila: f, i, foco, explicada, alTeclear, alEnfocar }: { fila: Fila; i: number; foco: boolean; explicada: boolean; alTeclear: (e: KeyboardEvent<HTMLTableRowElement>) => void; alEnfocar: () => void }) {
  return (
    <>
      <tr data-fila={i} className={foco ? "foco" : ""} tabIndex={foco ? 0 : -1} onKeyDown={alTeclear} onFocus={alEnfocar} onClick={alEnfocar}>
        <td className="lv-foto-celda"><span className="lv-foto" aria-hidden="true"><Icono nombre="productos" tam={16} /></span></td>
        <td><span className="lv-n">{f.descripcion}</span><span className="lv-d">{[f.marca, f.codigo_proveedor].filter(Boolean).join(" · ")}</span></td>
        <td className="num lv-antes">{f.costo_anterior === null ? "—" : pesos(f.costo_anterior)}</td>
        <td className="num"><Explicado valor={pesos(f.costo_neto)} pasos={f.explicacion} className="lv-nuevo" titulo={`De dónde sale el costo de ${f.descripcion}`} /></td>
        <td className="num"><Cambio fila={f} /></td>
        <td className="num lv-estante" title="Todavía no se calcula acá">—</td>
      </tr>
      {explicada && f.explicacion.length > 0 && (
        <tr className="lv-explica" aria-label={`De dónde sale el costo de ${f.descripcion}`}>
          <td colSpan={6}>
            <span className="lv-pasos">
              {f.explicacion.map((p, k) => (
                <span key={k} className="lv-paso-lugar">
                  {k > 0 && <Icono nombre="derecha" tam={14} />}
                  <span className={`lv-paso ${k === f.explicacion.length - 1 ? "fin" : ""}`}>{p}</span>
                </span>
              ))}
            </span>
          </td>
        </tr>
      )}
    </>
  );
}

function AltaDeProveedor({ enLinea, alCerrar, alCambiar }: { enLinea: boolean; alCerrar: () => void; alCambiar: (nombre: string) => Promise<void> }) {
  const lectores = useLectores();
  const [error, setError] = useState<{ campo: "nombre" | "general" | "contado" | null; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const idError = useId();

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const datos = { nombre: String(d.get("nombre") ?? ""), lector: String(d.get("lector") ?? "") || null, preciosIncluyenIva: d.get("iva") === "on", descuentoGeneral: String(d.get("general") ?? ""), descuentoContado: String(d.get("contado") ?? "") };
    const nombre = datos.nombre.trim();
    const falta = faltaEnProveedor(datos);
    if (falta) return setError(falta);
    setGuardando(true);
    try {
      await altaDeProveedor(datos);
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

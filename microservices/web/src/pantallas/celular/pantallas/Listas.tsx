import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { usePuede } from "../../permisos";
import { ErrorApi } from "../../../api";
import { aplicarLista, buscarProveedores, cargarLista, descartarLista, descuentosDe, fraccionAplicada, pendientes, retomar, situacionDelProveedor, ultimaAplicada, useFilasDeLista, useLectores, useListas, type Avance, type Cargada, type ListaFila, type Proveedor } from "../../../negocio/catalogo/listas";
import { altaDeProveedor, faltaEnProveedor } from "../../../negocio/proveedores";
import { Explicacion } from "../componentes/Explicacion";
import { AvisoError, Hoja, Icono, Toast, Lista } from "../componentes/base";
import { fecha, pesos, porcentaje } from "../../../formato";

const miles = (n: number | string) => Number(n).toLocaleString("es-AR");
const mayuscula = (t: string) => t[0]!.toUpperCase() + t.slice(1);
const diaYMes = (iso: string) => { const d = new Date(iso); return `${d.getDate()}/${d.getMonth() + 1}`; };

// El estado de una carga, como pastilla: aplicada (verde, con tilde), pendiente o aplicándose
// (amarilla, con reloj) o descartada (gris).
function EstadoDeCarga({ estado }: { estado: ListaFila["estado"] }) {
  if (estado === "aplicada") return <span className="lp-estado ok"><Icono nombre="tilde" tam={14} grosor={3} />Aplicada</span>;
  if (estado === "pendiente" || estado === "aplicando") return <span className="lp-estado pend"><Icono nombre="reloj" tam={14} />{estado === "aplicando" ? "Aplicándose…" : "Pendiente"}</span>;
  return <span className="lp-estado gris">{mayuscula(estado)}</span>;
}

// Cargar una lista de precios (issue #12): elegir el archivo → revisar el resumen y la
// vista previa en una hoja → aplicar o descartar. Nada se guarda hasta "Aplicar".
export function Listas() {
  const esDueno = usePuede()("catalogo.listas");
  const { proveedores: traidos, historial, error: fallo, recargar } = useListas();
  const proveedores = traidos ?? [];
  const [cargada, setCargada] = useState<Cargada | null>(null);
  // El aviso se puede cerrar; vuelve si el próximo pedido falla de nuevo.
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = !fallo || fallo === cerrado ? null : fallo instanceof ErrorApi ? fallo.message : "Sin conexión con el servidor. Cargar una lista necesita internet.";
  const [resultado, setResultado] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [buscado, setBuscado] = useState("");

  const sinAplicar = pendientes(historial);
  const abrirPendiente = (l: ListaFila) => setCargada(retomar(l));
  const ultima = ultimaAplicada(historial);

  return (
    <>
      <AvisoError texto={error} alCerrar={() => setCerrado(fallo)} />
      <Toast texto={resultado} alCerrar={() => setResultado(null)} testId="resultado" />
      <div className="dos-columnas">
      <div className="columna">
      {sinAplicar.map((l) => (
        <button key={l.id} type="button" className="tarjeta oscura lp-pendiente" onClick={() => abrirPendiente(l)} data-testid="lista-pendiente">
          <span className="seccion">Lista pendiente de revisar</span>
          <span className="lp-titulo">{l.proveedor}<small>Lista del {fecha(l.fecha_lista)}</small></span>
          <span className="boton coral">Revisar y aplicar</span>
          <span className="lp-numeros">
            <span><b>{miles(l.resumen.leidas)}</b> productos</span>
            <span><b>{miles(l.resumen.modificados)}</b> cambian{l.resumen.modificados > 0 ? ` (${porcentaje(l.resumen.variacion_promedio)})` : ""}</span>
            <span><b>{miles(l.resumen.nuevos)}</b> nuevos</span>
          </span>
        </button>
      ))}
      <ZonaDeCarga proveedores={proveedores} alCargar={setCargada} />
      {/* El orden lo pidió Carlos: primero cargar, después las últimas tres cargas y al final los proveedores. */}
      {historial.length > 0 && (
        <>
          <h2 className="seccion">Últimas cargas</h2>
          <Lista data-testid="historial" className="lp-lista">
            {historial.slice(0, 3).map((l) => (
              <div key={l.id} className="lp-fila">
                <span className="lp-icono excel"><Icono nombre="excel" tam={22} /></span>
                <span className="lp-datos">
                  <span className="lp-cabeza"><b>{l.proveedor}</b><EstadoDeCarga estado={l.estado} /></span>
                  <span className="lp-que">Lista del {fecha(l.fecha_lista)} <em>· subida {diaYMes(l.creado_en)}</em></span>
                  <span className="lp-meta"><span className="lp-archivo"><Icono nombre="archivo" tam={16} /><i>{l.archivo_nombre}</i></span></span>
                  <span className="lp-meta">
                    {l.estado === "aplicada"
                      ? <><span><b className="mas">+{miles(l.resumen.nuevos)}</b> nuevos</span><span><b>{miles(l.resumen.modificados)}</b> cambiados</span></>
                      : <span><b>{miles(l.resumen.leidas)}</b> leídos</span>}
                  </span>
                </span>
              </div>
            ))}
          </Lista>
        </>
      )}
      </div>
      <div className="columna">
      <h2 className="seccion"><span>Proveedores</span>{esDueno && <button type="button" className="enlace" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">+ Agregar</button>}</h2>
      {proveedores.length === 0 ? <div className="aviso-suave">Todavía no hay proveedores cargados.</div> : (
        <>
          <label className="lp-buscar">
            <Icono nombre="buscar" tam={22} />
            <input type="search" value={buscado} onChange={(e) => setBuscado(e.target.value)} placeholder="Buscar proveedor" aria-label="Buscar proveedor" autoComplete="off" data-testid="buscar-proveedor" />
          </label>
          <Lista data-testid="estado-proveedores" className="lp-lista">
            {buscarProveedores(proveedores.filter((p) => p.activo), buscado).map((p) => {
              const l = ultima.get(p.id);
              const { estado, dias } = situacionDelProveedor(l);
              const descuentos = descuentosDe(p);
              return (
                <div key={p.id} className="lp-fila" role="row" aria-label={p.nombre}>
                  <span className="lp-icono"><Icono nombre="proveedor" tam={22} /></span>
                  <span className="lp-datos">
                    <span className="lp-cabeza"><b>{p.nombre}</b><span className={`lp-estado ${estado === "vieja" ? "vieja" : estado === "sin lista" ? "gris" : "ok"}`}>{mayuscula(estado)}</span></span>
                    <span className="lp-que">{l ? <>Lista del {fecha(l.fecha_lista)} <em>· hace {dias} {dias === 1 ? "día" : "días"}</em></> : <em>Nunca se cargó una lista</em>}</span>
                    {(l || p.lector || descuentos.length > 0) && (
                      <span className="lp-meta">
                        {l && <span><Icono nombre="caja" tam={16} /><b>{miles(l.resumen.leidas)}</b> productos</span>}
                        {p.lector && <span><Icono nombre="lector" tam={16} />{p.lector}</span>}
                        {descuentos.length > 0 && <span><Icono nombre="porcentaje" tam={16} />{descuentos.join(" · ")}</span>}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </Lista>
        </>
      )}
      </div>
      </div>
      {cargada && <Revision cargada={cargada} alTerminar={(mensaje) => { setCargada(null); setResultado(mensaje ?? null); void recargar(); }} />}
      {altaAbierta && <AltaDeProveedor alCerrar={() => setAltaAbierta(false)} alCambiar={async () => { await recargar(); setAltaAbierta(false); }} />}
    </>
  );
}

function ZonaDeCarga({ proveedores, alCargar }: { proveedores: Proveedor[]; alCargar: (c: Cargada) => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"esperando" | "leyendo" | "falta-proveedor" | "falta-fecha">("esperando");
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const proveedorElegido = useRef<HTMLSelectElement>(null);
  const fechaElegida = useRef<HTMLInputElement>(null);

  async function enviar(f: File, extra: Record<string, string> = {}) {
    setEstado("leyendo");
    setError(null);
    try {
      const r = await cargarLista(f, extra);
      if ("falta" in r) { setEstado(r.falta === "proveedor" ? "falta-proveedor" : "falta-fecha"); return; }
      setArchivo(null);
      setEstado("esperando");
      alCargar(r.cargada);
    } catch (e) {
      setEstado("esperando"); setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Cargar una lista necesita internet.");
    }
  }
  function elegir(f: File | undefined) { if (!f) return; setArchivo(f); void enviar(f); }
  function soltar(e: DragEvent<HTMLElement>) { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }

  return (
    <>
      <div className={`lp-cargar ${arrastrando ? "arrastrando" : ""}`} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar} data-testid="zona-de-carga">
        <span className="lp-icono"><Icono nombre="subirArchivo" tam={22} /></span>
        <span className="lp-datos">
          <b>{estado === "leyendo" ? `Leyendo ${archivo?.name}…` : "Cargar una lista"}</b>
          <small>Excel del proveedor (.xlsx)</small>
        </span>
        <button type="button" className="boton tinta lp-subir" disabled={estado !== "esperando"} onClick={() => entrada.current?.click()} data-testid="subir-lista">
          <Icono nombre="subir" tam={18} />Subir lista
        </button>
      </div>
      {estado === "falta-proveedor" && archivo && (
        <div className="tarjeta">
          <span>No reconocí de qué proveedor es <strong>{archivo.name}</strong>. ¿De cuál es?</span>
          <select ref={proveedorElegido} defaultValue="" className="campo grande" style={{ width: "100%" }} data-testid="elegir-proveedor">
            <option value="" disabled>Elegir proveedor</option>
            {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <div className="acciones dos">
            <button type="button" className="boton tinta" onClick={() => proveedorElegido.current?.value && enviar(archivo, { proveedor_id: proveedorElegido.current.value })}>Leer</button>
            <button type="button" className="boton" onClick={() => { setArchivo(null); setEstado("esperando"); }}>Cancelar</button>
          </div>
        </div>
      )}
      {estado === "falta-fecha" && archivo && (
        <div className="tarjeta">
          <span>La planilla no dice su fecha. ¿De qué fecha es la lista?</span>
          <input ref={fechaElegida} type="date" className="campo grande" defaultValue={new Date().toISOString().slice(0, 10)} />
          <div className="acciones dos">
            <button type="button" className="boton tinta" onClick={() => fechaElegida.current?.value && enviar(archivo, { fecha_lista: fechaElegida.current.value, ...(proveedorElegido.current?.value ? { proveedor_id: proveedorElegido.current.value } : {}) })}>Leer</button>
            <button type="button" className="boton" onClick={() => { setArchivo(null); setEstado("esperando"); }}>Cancelar</button>
          </div>
        </div>
      )}
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => elegir(e.target.files?.[0])} />
    </>
  );
}

function Revision({ cargada, alTerminar }: { cargada: Cargada; alTerminar: (mensaje?: string) => void }) {
  const { filas: traidas, total, error: falloDeFilas } = useFilasDeLista(cargada.id);
  const filas = traidas ?? [];
  const [aviso, setError] = useState<string | null>(null);
  const error = aviso ?? (falloDeFilas ? falloDeFilas.message : null);
  const [ocupado, setOcupado] = useState(false);
  const [verSalteadas, setVerSalteadas] = useState(false);
  const r = cargada.resumen;

  const [progreso, setProgreso] = useState<Avance | null>(null);

  // Aplicar corre en el servidor en segundo plano; acá se consulta el avance cada segundo.
  async function aplicar() {
    setOcupado(true); setError(null);
    try {
      const fin = await aplicarLista(cargada, setProgreso);
      if ("aplicada" in fin) {
        const x = fin.aplicada;
        alTerminar(`Lista de ${cargada.proveedor} del ${fecha(cargada.fecha_lista)} aplicada: ${x.nuevos + x.modificados} precios actualizados (${x.nuevos} productos nuevos, ${x.modificados} con precio nuevo, ${x.sin_cambio} sin cambio).`);
        return;
      }
      if ("interrumpida" in fin) setError(fin.interrumpida ?? "La aplicación se interrumpió. Volvé a intentar.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false); setProgreso(null);
    }
  }
  async function descartar() {
    setOcupado(true);
    try { await descartarLista(cargada.id); alTerminar("Lista descartada. No se guardó ningún precio."); }
    catch (e) { setError((e as Error).message); setOcupado(false); }
  }
  const porcentajeProgreso = Math.round(fraccionAplicada(progreso, r.leidas) * 100);

  return (
    <Hoja alCerrar={() => !ocupado && alTerminar()} testId="revision">
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="seccion" style={{ padding: 0 }}>Lista de precios</span>
        <span className="titulo-hoja" role="heading" aria-level={2}>{cargada.proveedor} · {fecha(cargada.fecha_lista)}</span>
      </div>
      {cargada.avisos.map((a, i) => <div key={i} className="aviso-suave">{a}</div>)}
      <div className="numeros-lista" data-testid="resumen">
        <div><span className="importe">{r.leidas}</span><small>Productos leídos</small></div>
        <div className={r.nuevos > 0 ? "tinta" : ""}><span className="importe">{r.nuevos}</span><small>Nuevos</small></div>
        <div className={r.modificados > 0 ? "coral" : ""}><span className="importe">{r.modificados}</span><small>Cambian de precio{r.modificados > 0 ? ` (${porcentaje(r.variacion_promedio)})` : ""}</small></div>
        <div><span className="importe">{r.sin_cambio}</span><small>Sin cambio</small></div>
        <div><span className="importe">{r.dados_de_baja}</span><small>Ya no aparecen</small></div>
        <div><span className="importe">{r.salteadas}</span><small>Filas salteadas</small></div>
      </div>
      {cargada.salteadas.length > 0 && (
        <>
          <button type="button" className="enlace" onClick={() => setVerSalteadas((v) => !v)}>{verSalteadas ? "Ocultar" : "Ver"} las filas salteadas</button>
          {verSalteadas && <Lista>{cargada.salteadas.map((s) => <div key={s.fila} className="fila"><span className="nombre">Fila {s.fila}: {s.motivo}</span><span /><span className="detalle">{s.contenido.join(" | ")}</span></div>)}</Lista>}
        </>
      )}
      {progreso ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentajeProgreso}>
          <div className={`barra-progreso ${progreso.etapa === "duplicados" ? "indeterminada" : ""}`}><div style={{ width: `${porcentajeProgreso}%` }} /></div>
          <small>{progreso.etapa === "duplicados" ? "Precios guardados. Buscando duplicados con otros proveedores…" : `Guardando precios… ${progreso.procesadas.toLocaleString("es-AR")} de ${(progreso.total ?? r.leidas).toLocaleString("es-AR")}`}</small>
        </div>
      ) : (
        <div className="acciones auto-1fr">
          <button type="button" className="boton blanco" onClick={descartar} disabled={ocupado}>Descartar</button>
          <button type="button" className="boton coral principal centrado" onClick={aplicar} disabled={ocupado} data-testid="aplicar">Aplicar {r.leidas} precios</button>
        </div>
      )}
      <AvisoError texto={error} />
      <h2 className="seccion">Vista previa · cambios primero{total > filas.length ? ` · primeras ${filas.length} de ${total}` : ""}</h2>
      <Lista data-testid="vista-previa">
        {filas.map((f) => {
          const cambio = f.costo_anterior !== null && Number(f.costo_anterior) > 0 ? ((Number(f.costo_neto) - Number(f.costo_anterior)) / Number(f.costo_anterior)) * 100 : null;
          return (
            <div key={f.codigo_proveedor} className="fila" role="row" aria-label={`${f.codigo_proveedor} ${f.descripcion}`}>
              <span className="nombre">{f.descripcion}</span>
              <span className="derecha">
                <Explicacion valor={pesos(f.costo_neto)} pasos={f.explicacion} className="importe" />
                <small style={{ color: cambio && cambio > 0 ? "var(--coral-texto)" : undefined, fontWeight: 600 }}>{f.costo_anterior === null ? "nuevo" : cambio === null || cambio === 0 ? "sin cambio" : porcentaje(cambio)}</small>
              </span>
              <span className="detalle"><code>{f.codigo_proveedor}</code>{f.marca ? ` · ${f.marca}` : ""}{f.costo_anterior !== null ? ` · antes ${pesos(f.costo_anterior)}` : ""}</span>
            </div>
          );
        })}
      </Lista>
    </Hoja>
  );
}

function AltaDeProveedor({ alCerrar, alCambiar }: { alCerrar: () => void; alCambiar: () => Promise<void> }) {
  const lectores = useLectores();
  const [error, setError] = useState<string | null>(null);

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const datos = { nombre: String(d.get("nombre") ?? ""), lector: String(d.get("lector") ?? "") || null, preciosIncluyenIva: d.get("iva") === "on", descuentoGeneral: String(d.get("general") ?? ""), descuentoContado: String(d.get("contado") ?? "") };
    const falta = faltaEnProveedor(datos);
    if (falta) { setError(falta.texto); return; }
    try {
      await altaDeProveedor(datos);
      setError(null);
      await alCambiar();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <Hoja titulo="Agregar un proveedor" alCerrar={alCerrar} testId="panel-proveedores">
      <form onSubmit={alta} className="formulario">
        <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Nombre del proveedor" required /></label>
        <label className="renglon"><span>Lector</span><select name="lector" defaultValue=""><option value="">elegir a mano al cargar</option>{lectores.map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
        <label className="renglon"><span>Precios con IVA</span><input type="checkbox" name="iva" style={{ width: 22, height: 22, flex: "none" }} /></label>
        <label className="renglon"><span>Dto. general %</span><input name="general" type="number" min="0" max="100" step="0.5" defaultValue="0" /></label>
        <label className="renglon"><span>Dto. contado %</span><input name="contado" type="number" min="0" max="100" step="0.5" defaultValue="0" /></label>
        <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Agregar</button></div>
      </form>
      <AvisoError texto={error} />
    </Hoja>
  );
}

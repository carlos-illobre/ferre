import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { usePuede } from "../../permisos";
import { ErrorApi } from "../../../datos/conexion";
import { aplicarLista, buscarProveedores, cargarLista, descartarLista, descuentosDe, fraccionAplicada, pendientes, retomar, situacionDelProveedor, ultimaAplicada, useFilasDeLista, useLectores, useListas, type Avance, type Cargada, type ListaFila, type Proveedor } from "../../../negocio/catalogo/listas";
import { altaDeProveedor, faltaEnProveedor } from "../../../negocio/proveedores";
import { Explicacion } from "../componentes/Explicacion";
import { AvisoError, Hoja, Icono, Toast, Lista } from "../componentes/base";
import { fecha, pesos, porcentaje } from "../../../formato";
import { TEXTOS } from "../../textos";
import "./listas.css";

const miles = (n: number | string) => Number(n).toLocaleString("es-AR");
const mayuscula = (t: string) => t[0]!.toUpperCase() + t.slice(1);
const diaYMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
// «hoy 08:12», «ayer 18:40» o «el 14/10»: cuándo se subió una lista.
function subida(iso: string): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  return dias === 0 ? `hoy ${hora}` : dias === 1 ? `ayer ${hora}` : `el ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// El estado de una carga, como pastilla: aplicada (verde, con tilde), pendiente o aplicándose
// (amarilla, con reloj) o descartada (gris).
function EstadoDeCarga({ estado }: { estado: ListaFila["estado"] }) {
  if (estado === "aplicada") return <span className="cl-pastilla verde"><Icono nombre="tilde" tam={14} grosor={3} />Aplicada</span>;
  if (estado === "pendiente" || estado === "aplicando") return <span className="cl-pastilla ambar"><Icono nombre="reloj" tam={14} />{estado === "aplicando" ? "Aplicándose…" : "Pendiente"}</span>;
  return <span className="cl-pastilla">{mayuscula(estado)}</span>;
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
  const [buscando, setBuscando] = useState(false);

  const sinAplicar = pendientes(historial);
  const abrirPendiente = (l: ListaFila) => setCargada(retomar(l));
  const ultima = ultimaAplicada(historial);
  const ultimas = historial.filter((l) => l.estado !== "pendiente").slice(0, 3);
  const [primera, ...resto] = sinAplicar;
  const activos = proveedores.filter((p) => p.activo);
  const t = TEXTOS.listas;

  return (
    <>
      <AvisoError texto={error} alCerrar={() => setCerrado(fallo)} />
      <Toast texto={resultado} alCerrar={() => setResultado(null)} testId="resultado" />
      <div className="dos-columnas">
      <div className="columna">
      {primera && <Pendiente l={primera} alAbrir={() => abrirPendiente(primera)} />}
      {resto.length > 0 && (
        <button type="button" className="cl-mas-pend" onClick={() => abrirPendiente(resto[0]!)} data-testid="lista-pendiente">
          <Icono nombre="bandeja" tam={18} /><span>Y <b>{resto.length} más</b>: {resto.map((l) => l.proveedor).join(", ")}</span><Icono nombre="derecha" tam={18} />
        </button>
      )}
      <ZonaDeCarga proveedores={proveedores} alCargar={setCargada} />
      {/* El orden lo pidió Carlos: primero cargar, después las últimas tres cargas y al final los proveedores. */}
      {ultimas.length > 0 && (
        <>
          <h2 className="cl-sec"><b>{t.ultimasCargas.corto}</b></h2>
          <ul className="cl-grupo" data-testid="historial">
            {ultimas.map((l) => (
              <li key={l.id} className="cl-row" aria-label={`${l.proveedor}, lista del ${fecha(l.fecha_lista)}, ${l.archivo_nombre}`}>
                <span className="cl-ic"><Icono nombre={l.estado === "descartada" ? "archivo" : "excel"} tam={20} /></span>
                <span className="cl-n">{l.proveedor}</span>
                <EstadoDeCarga estado={l.estado} />
                <span className="cl-d">Lista del {diaYMes(l.fecha_lista)} · {l.estado === "aplicada" ? <><b>{miles(l.resumen.modificados)}</b> cambiados{l.resumen.nuevos > 0 && <> · <b>{miles(l.resumen.nuevos)}</b> nuevos</>}</> : <><b>{miles(l.resumen.leidas)}</b> leídos</>}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
      <div className="columna">
      <h2 className="cl-sec">
        <b>{t.proveedores.corto}</b>{activos.length > 0 && <span className="cl-cuenta">{activos.length}</span>}
        {activos.length > 0 && <button type="button" className="cl-lupa" onClick={() => setBuscando((b) => !b)} aria-label={t.buscarProveedor.corto} aria-expanded={buscando}><Icono nombre="buscar" tam={20} /></button>}
        {esDueno && <button type="button" className="enlace cl-agregar" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">+ Agregar</button>}
      </h2>
      {activos.length === 0 ? <div className="aviso-suave">Todavía no hay proveedores cargados.</div> : (
        <>
          {buscando && (
            <label className="lp-buscar">
              <Icono nombre="buscar" tam={22} />
              <input type="search" value={buscado} onChange={(e) => setBuscado(e.target.value)} placeholder={t.buscarProveedor.corto} aria-label={t.buscarProveedor.corto} autoComplete="off" autoFocus data-testid="buscar-proveedor" />
            </label>
          )}
          <ul className="cl-grupo" data-testid="estado-proveedores">
            {buscarProveedores(activos, buscado).map((p) => {
              const l = ultima.get(p.id);
              const { estado, dias } = situacionDelProveedor(l);
              const descuentos = descuentosDe(p);
              return (
                <li key={p.id} className="cl-row" role="row" aria-label={p.nombre}>
                  <span className="cl-ic"><Icono nombre="proveedor" tam={20} /></span>
                  <span className="cl-n">{p.nombre}</span>
                  <span className={`cl-pastilla ${estado === "vieja" ? "ambar" : estado === "sin lista" ? "" : "verde"}`}>{mayuscula(estado)}</span>
                  <span className="cl-d">{l ? <>Lista del {diaYMes(l.fecha_lista)} · hace <b>{dias} {dias === 1 ? "día" : "días"}</b></> : "Nunca se cargó una lista"}</span>
                  {(l || p.lector || descuentos.length > 0) && (
                    <span className="cl-d">{[l ? `${miles(l.resumen.leidas)} productos` : null, p.lector, descuentos.join(" · ") || null].filter(Boolean).join(" · ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      </div>
      </div>
      {cargada && <Revision cargada={cargada} alTerminar={(mensaje) => { setCargada(null); setResultado(mensaje ?? null); void recargar(); }} />}
      {altaAbierta && <AltaDeProveedor alCerrar={() => setAltaAbierta(false)} alCambiar={async () => { await recargar(); setAltaAbierta(false); }} />}
    </>
  );
}

// La lista que espera revisión, como la tarjeta principal de la v2: tres cifras, la franja de
// proporción y «Revisar y aplicar» a todo el ancho.
function Pendiente({ l, alAbrir }: { l: ListaFila; alAbrir: () => void }) {
  const r = l.resumen;
  const parte = (n: number) => `${r.leidas ? Math.max(n > 0 ? 1 : 0, (n / r.leidas) * 100) : 0}%`;
  return (
    <div className="cl-pend" data-testid="lista-pendiente">
      <div className="cl-pend-arr">
        <span className="cl-pend-ic"><Icono nombre="excel" tam={24} /></span>
        <span className="cl-pend-texto">
          <span className="cl-pend-et">{TEXTOS.listas.paraRevisar.corto}</span>
          <span className="cl-pend-nom">{l.proveedor}</span>
          <span className="cl-pend-d">Lista del {fecha(l.fecha_lista)} · subida {subida(l.creado_en)}</span>
        </span>
      </div>
      <div className="cl-cifras">
        <div className="cl-cifra verde"><b>{miles(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b><span>cambian</span></div>
        <div className="cl-cifra"><b>{miles(r.nuevos)}</b><span>nuevos</span></div>
        <div className="cl-cifra"><b>{miles(r.dados_de_baja)}</b><span>no están</span></div>
      </div>
      <div className="cl-franja" aria-hidden="true"><i style={{ width: parte(r.modificados), background: "var(--p-verde)" }} /><i style={{ width: parte(r.nuevos), background: "var(--p-naranja)" }} /><i style={{ flex: 1 }} /></div>
      <button type="button" className="cl-revisar" onClick={alAbrir} aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`}>{TEXTOS.listas.revisarYAplicar.corto}<Icono nombre="flecha" tam={22} /></button>
    </div>
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
      <div className={`cl-cargar ${arrastrando ? "arrastrando" : ""}`} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar} data-testid="zona-de-carga">
        <span className="cl-cargar-ic"><Icono nombre="subirArchivo" tam={22} /></span>
        <span className="cl-cargar-texto">
          <b>{estado === "leyendo" ? `Leyendo ${archivo?.name}…` : TEXTOS.listas.cargarUnaLista.corto}</b>
          <small>{TEXTOS.listas.soltaElExcel.corto}</small>
        </span>
        <button type="button" className="cl-subir" disabled={estado !== "esperando"} onClick={() => entrada.current?.click()} data-testid="subir-lista">{TEXTOS.listas.subirLista.corto}</button>
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
      <div className="cl-numeros" data-testid="resumen">
        <div><b>{miles(r.leidas)}</b><span>leídos</span></div>
        <div className="verde"><b>{miles(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b><span>cambian</span></div>
        <div><b>{miles(r.nuevos)}</b><span>nuevos</span></div>
        <div><b>{miles(r.sin_cambio)}</b><span>sin cambio</span></div>
        <div><b>{miles(r.dados_de_baja)}</b><span>no están</span></div>
        <div className={r.salteadas > 0 ? "ambar" : ""}><b>{miles(r.salteadas)}</b><span>salteadas</span></div>
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
          <button type="button" className="boton coral principal centrado" onClick={aplicar} disabled={ocupado} data-testid="aplicar">Aplicar · cambian {miles(r.nuevos + r.modificados)} precios</button>
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

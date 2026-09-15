import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, ErrorApi } from "../api";
import { Explicacion } from "../componentes/Explicacion";
import { AvisoError, Hoja, Icono, Toast } from "../componentes/base";
import { fecha, pesos, porcentaje } from "../formato";
import { administra, useSesion } from "../sesion";

type Proveedor = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null; activo: boolean };
type ListaFila = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: Resumen; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };
type Resumen = { leidas: number; salteadas: number; ofertas?: number; nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number; salteadas_detalle?: { fila: number; motivo: string; contenido: string[] }[] };
type Cargada = { id: string; proveedor: string; fecha_lista: string; resumen: Resumen; avisos: string[]; salteadas: { fila: number; motivo: string; contenido: string[] }[] };
type Fila = { codigo_proveedor: string; descripcion: string; marca: string | null; costo_neto: string; costo_anterior: string | null; explicacion: string[] };

// Cargar una lista de precios (issue #12): elegir el archivo → revisar el resumen y la
// vista previa en una hoja → aplicar o descartar. Nada se guarda hasta "Aplicar".
export function Listas() {
  const { sesion } = useSesion();
  const esDueno = sesion.estado === "con-sesion" && administra(sesion.usuario);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [historial, setHistorial] = useState<ListaFila[]>([]);
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);

  const recargar = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([api<Proveedor[]>("/proveedores"), api<ListaFila[]>("/listas")]);
      setProveedores(p);
      setHistorial(h);
      setError(null);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Cargar una lista necesita internet.");
    }
  }, []);
  useEffect(() => { void recargar(); }, [recargar]);

  const pendientes = historial.filter((l) => l.estado === "pendiente");
  const abrirPendiente = (l: ListaFila) => setCargada({ id: l.id, proveedor: l.proveedor, fecha_lista: l.fecha_lista, resumen: l.resumen, avisos: l.avisos, salteadas: l.resumen.salteadas_detalle ?? [] });
  const ultima = new Map<string, ListaFila>();
  for (const l of historial) if (l.estado === "aplicada" && !ultima.has(l.proveedor_id)) ultima.set(l.proveedor_id, l);

  return (
    <>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <Toast texto={resultado} alCerrar={() => setResultado(null)} testId="resultado" />
      <div className="dos-columnas">
      <div className="columna">
      {pendientes.map((l) => (
        <button key={l.id} type="button" className="tarjeta oscura" style={{ textAlign: "left", gap: 8 }} onClick={() => abrirPendiente(l)} data-testid="lista-pendiente">
          <span className="seccion" style={{ padding: 0, color: "var(--coral-claro)" }}>Lista pendiente de revisar</span>
          <span style={{ fontSize: 19, fontWeight: 600 }}>{l.proveedor} · lista del {fecha(l.fecha_lista)}</span>
          <small>{l.resumen.leidas} productos · {l.resumen.modificados} cambian de precio{l.resumen.modificados > 0 ? ` (${porcentaje(l.resumen.variacion_promedio)} en promedio)` : ""} · {l.resumen.nuevos} nuevos</small>
          <span className="boton coral" style={{ alignSelf: "flex-start", height: 36, fontSize: 14 }}>Revisar y aplicar</span>
        </button>
      ))}
      <ZonaDeCarga proveedores={proveedores} alCargar={setCargada} />
      <div className="seccion"><span>Proveedores</span>{esDueno && <button type="button" className="enlace" onClick={() => setAltaAbierta(true)} data-testid="agregar-proveedor">+ Agregar</button>}</div>
      {proveedores.length === 0 ? <div className="aviso-suave">Todavía no hay proveedores cargados.</div> : (
        <div className="lista" data-testid="estado-proveedores">
          {proveedores.filter((p) => p.activo).map((p) => {
            const l = ultima.get(p.id);
            const dias = l ? Math.floor((Date.now() - new Date(l.fecha_lista).getTime()) / 86400000) : null;
            const vieja = dias !== null && dias > 45;
            return (
              <div key={p.id} className="fila" role="row" aria-label={p.nombre}>
                <span className="nombre">{p.nombre}</span>
                <span className="boton chico derecha" style={vieja ? { background: "var(--coral-tinte)", color: "var(--coral-texto)" } : { color: "var(--gris)" }}>{l ? (dias === 0 ? "al día" : vieja ? "vieja" : "vigente") : "sin lista"}</span>
                <span className="detalle">{l ? `última lista del ${fecha(l.fecha_lista)} (hace ${dias} días) · ${l.resumen.leidas} productos` : "nunca se cargó una lista"}{p.lector ? ` · lector ${p.lector}` : ""}{Number(p.descuento_general) || Number(p.descuento_contado) ? ` · dto. ${Number(p.descuento_general) * 100} % / ${Number(p.descuento_contado) * 100} % contado` : ""}</span>
              </div>
            );
          })}
        </div>
      )}
      </div>
      <div className="columna">
      {historial.length > 0 && (
        <>
          <div className="seccion">Últimas cargas</div>
          <div className="lista" data-testid="historial">
            {historial.slice(0, 20).map((l) => (
              <div key={l.id} className="fila">
                <span className="nombre">{l.proveedor} · lista del {fecha(l.fecha_lista)}</span>
                <small className="derecha">{l.estado === "aplicando" ? "aplicándose…" : l.estado}</small>
                <span className="detalle">{new Date(l.creado_en).toLocaleString("es-AR")} · {l.archivo_nombre} · {l.estado === "aplicada" ? `${l.resumen.nuevos} nuevos, ${l.resumen.modificados} cambiados` : `${l.resumen.leidas} leídos`}</span>
              </div>
            ))}
          </div>
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
    const cuerpo = new FormData();
    cuerpo.set("archivo", f, f.name);
    for (const [k, v] of Object.entries(extra)) cuerpo.set(k, v);
    try {
      const r = await api<Cargada>("/listas", { method: "POST", body: cuerpo });
      setArchivo(null);
      setEstado("esperando");
      alCargar(r);
    } catch (e) {
      const mensaje = e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Cargar una lista necesita internet.";
      if (mensaje.includes("de qué proveedor")) setEstado("falta-proveedor");
      else if (mensaje.includes("fecha")) setEstado("falta-fecha");
      else { setEstado("esperando"); setError(mensaje); }
    }
  }
  function elegir(f: File | undefined) { if (!f) return; setArchivo(f); void enviar(f); }
  function soltar(e: DragEvent<HTMLElement>) { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files[0]); }

  return (
    <>
      <button type="button" className={`zona-de-carga ${arrastrando ? "arrastrando" : ""}`} onClick={() => estado === "esperando" && entrada.current?.click()} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar} data-testid="zona-de-carga">
        <span className="icono"><Icono nombre="subir" tam={22} /></span>
        <span className="textos">
          <span>{estado === "leyendo" ? `Leyendo ${archivo?.name}…` : "Cargar una lista nueva"}</span>
          <small>Excel del proveedor (.xlsx). En la computadora también se puede arrastrar acá. Nada se guarda hasta aplicar.</small>
        </span>
      </button>
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
  const [filas, setFilas] = useState<Fila[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [verSalteadas, setVerSalteadas] = useState(false);
  const r = cargada.resumen;

  useEffect(() => {
    api<{ total: number; filas: Fila[] }>(`/listas/${cargada.id}/filas`).then((x) => { setFilas(x.filas); setTotal(x.total); }).catch((e: Error) => setError(e.message));
  }, [cargada.id]);

  const [progreso, setProgreso] = useState<{ procesadas: number; total: number | null; etapa?: string } | null>(null);

  // Aplicar corre en el servidor en segundo plano; acá se consulta el avance cada segundo.
  async function aplicar() {
    setOcupado(true); setError(null);
    try {
      await api(`/listas/${cargada.id}/aplicar`, { method: "POST" });
      setProgreso({ procesadas: 0, total: cargada.resumen.leidas });
      for (;;) {
        await new Promise((res) => setTimeout(res, 800));
        const l = await api<{ estado: string; resumen: Resumen & { progreso?: { procesadas: number; total: number | null; etapa?: string }; error?: string } }>(`/listas/${cargada.id}`);
        if (l.estado === "aplicada") {
          const x = l.resumen;
          alTerminar(`Lista de ${cargada.proveedor} del ${fecha(cargada.fecha_lista)} aplicada: ${x.nuevos + x.modificados} precios actualizados (${x.nuevos} productos nuevos, ${x.modificados} con precio nuevo, ${x.sin_cambio} sin cambio).`);
          return;
        }
        if (l.estado !== "aplicando") { setError(l.resumen.error ?? "La aplicación se interrumpió. Volvé a intentar."); break; }
        if (l.resumen.progreso) setProgreso({ procesadas: l.resumen.progreso.procesadas, total: l.resumen.progreso.total ?? cargada.resumen.leidas, etapa: l.resumen.progreso.etapa });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false); setProgreso(null);
    }
  }
  async function descartar() {
    setOcupado(true);
    try { await api(`/listas/${cargada.id}/descartar`, { method: "POST" }); alTerminar("Lista descartada. No se guardó ningún precio."); }
    catch (e) { setError((e as Error).message); setOcupado(false); }
  }
  const porcentajeProgreso = progreso ? (progreso.etapa === "duplicados" ? 95 : Math.round((progreso.total ? progreso.procesadas / progreso.total : 0.05) * 90)) : 0;

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
          {verSalteadas && <div className="lista">{cargada.salteadas.map((s) => <div key={s.fila} className="fila"><span className="nombre">Fila {s.fila}: {s.motivo}</span><span /><span className="detalle">{s.contenido.join(" | ")}</span></div>)}</div>}
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
      <div className="seccion">Vista previa · cambios primero{total > filas.length ? ` · primeras ${filas.length} de ${total}` : ""}</div>
      <div className="lista" data-testid="vista-previa">
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
      </div>
    </Hoja>
  );
}

function AltaDeProveedor({ alCerrar, alCambiar }: { alCerrar: () => void; alCambiar: () => Promise<void> }) {
  const [lectores, setLectores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<string[]>("/listas/lectores").then(setLectores).catch(() => setLectores([])); }, []);

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    try {
      await api("/proveedores", {
        method: "POST",
        body: JSON.stringify({
          nombre: d.get("nombre"), lector: d.get("lector") || null, precios_incluyen_iva: d.get("iva") === "on",
          descuento_general: Number(d.get("general") || 0) / 100, descuento_contado: Number(d.get("contado") || 0) / 100,
        }),
      });
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

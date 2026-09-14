import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, ErrorApi } from "../api";
import { Explicacion } from "../componentes/Explicacion";
import { Desplegable } from "../componentes/Desplegable";
import { fecha, pesos, porcentaje } from "../formato";
import { administra, useSesion } from "../sesion";

type Proveedor = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: string; descuento_contado: string; lector: string | null; activo: boolean };
type ListaFila = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: Resumen; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };
type Resumen = { leidas: number; salteadas: number; ofertas?: number; nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number; salteadas_detalle?: { fila: number; motivo: string; contenido: string[] }[] };
type Cargada = { id: string; proveedor: string; fecha_lista: string; resumen: Resumen; avisos: string[]; salteadas: { fila: number; motivo: string; contenido: string[] }[] };
type Fila = { codigo_proveedor: string; descripcion: string; marca: string | null; costo_neto: string; costo_anterior: string | null; explicacion: string[] };

// Cargar una lista de precios (issue #12): soltar el archivo → revisar el resumen y la
// vista previa → aplicar o descartar. Nada se guarda hasta "Aplicar". Una vez por semana,
// en menos de un minuto.
export function Listas() {
  const { sesion } = useSesion();
  const esDueno = sesion.estado === "con-sesion" && administra(sesion.usuario);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [historial, setHistorial] = useState<ListaFila[]>([]);
  const [cargada, setCargada] = useState<Cargada | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <section className="listas">
      <h1>Listas de precios</h1>
      {error && <p className="error" role="alert">{error}</p>}

      {cargada ? (
        <Revision cargada={cargada} alTerminar={() => { setCargada(null); void recargar(); }} />
      ) : (
        <>
          {pendientes.length > 0 && (
            <p className="aviso">
              Hay {pendientes.length === 1 ? "una lista pendiente" : `${pendientes.length} listas pendientes`} de revisar:{" "}
              {pendientes.map((l) => (
                <button key={l.id} className="enlace" onClick={() => setCargada({ id: l.id, proveedor: l.proveedor, fecha_lista: l.fecha_lista, resumen: l.resumen, avisos: l.avisos, salteadas: l.resumen.salteadas_detalle ?? [] })}>
                  {l.proveedor} {fecha(l.fecha_lista)}
                </button>
              ))}
            </p>
          )}
          {esDueno && <AltaDeProveedor proveedores={proveedores} alCambiar={recargar} />}
          <ZonaDeCarga proveedores={proveedores} alCargar={setCargada} />
          <EstadoDeProveedores proveedores={proveedores} historial={historial} />
          <Historial historial={historial} />
        </>
      )}
    </section>
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

  function elegir(f: File | undefined) {
    if (!f) return;
    setArchivo(f);
    void enviar(f);
  }

  function soltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    elegir(e.dataTransfer.files[0]);
  }

  return (
    <div className={`zona-de-carga ${arrastrando ? "arrastrando" : ""}`} onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={soltar}>
      {estado === "esperando" && (
        <>
          <p className="leyenda">Arrastrá acá la lista del proveedor, o tocá para elegirla</p>
          <button className="grande" onClick={() => entrada.current?.click()}>Elegir archivo</button>
        </>
      )}
      {estado === "leyendo" && <p className="leyendo">Leyendo {archivo?.name}…</p>}
      {estado === "falta-proveedor" && archivo && (
        <div className="en-linea">
          <span>No reconocí de qué proveedor es <strong>{archivo.name}</strong>. ¿De cuál es?</span>
          <select ref={proveedorElegido} defaultValue="">
            <option value="" disabled>Elegir proveedor</option>
            {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <button onClick={() => proveedorElegido.current?.value && enviar(archivo, { proveedor_id: proveedorElegido.current.value })}>Leer</button>
          <button className="secundario" onClick={() => { setArchivo(null); setEstado("esperando"); }}>Cancelar</button>
        </div>
      )}
      {estado === "falta-fecha" && archivo && (
        <div className="en-linea">
          <span>La planilla no dice su fecha. ¿De qué fecha es la lista?</span>
          <input ref={fechaElegida} type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <button onClick={() => fechaElegida.current?.value && enviar(archivo, { fecha_lista: fechaElegida.current.value, ...(proveedorElegido.current?.value ? { proveedor_id: proveedorElegido.current.value } : {}) })}>Leer</button>
          <button className="secundario" onClick={() => { setArchivo(null); setEstado("esperando"); }}>Cancelar</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <input ref={entrada} type="file" accept=".xlsx,.xls" hidden data-testid="archivo" onChange={(e) => elegir(e.target.files?.[0])} />
    </div>
  );
}

function Revision({ cargada, alTerminar }: { cargada: Cargada; alTerminar: () => void }) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [total, setTotal] = useState(0);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const r = cargada.resumen;

  useEffect(() => {
    api<{ total: number; filas: Fila[] }>(`/listas/${cargada.id}/filas`).then((x) => { setFilas(x.filas); setTotal(x.total); }).catch((e: Error) => setError(e.message));
  }, [cargada.id]);

  const [progreso, setProgreso] = useState<{ procesadas: number; total: number | null } | null>(null);

  // Aplicar corre en el servidor en segundo plano; acá se consulta el avance cada segundo.
  async function aplicar() {
    setOcupado(true); setError(null);
    try {
      await api(`/listas/${cargada.id}/aplicar`, { method: "POST" });
      setProgreso({ procesadas: 0, total: cargada.resumen.leidas });
      for (;;) {
        await new Promise((r) => setTimeout(r, 800));
        const l = await api<{ estado: string; resumen: Resumen & { progreso?: { procesadas: number; total: number | null }; error?: string } }>(`/listas/${cargada.id}`);
        if (l.estado === "aplicada") {
          const x = l.resumen;
          setResultado(`Listo: ${x.nuevos + x.modificados} precios actualizados (${x.nuevos} productos nuevos, ${x.modificados} con precio nuevo, ${x.sin_cambio} sin cambio).`);
          break;
        }
        if (l.estado !== "aplicando") { setError(l.resumen.error ?? "La aplicación se interrumpió. Volvé a intentar."); break; }
        if (l.resumen.progreso) setProgreso({ procesadas: l.resumen.progreso.procesadas, total: l.resumen.progreso.total ?? cargada.resumen.leidas });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setOcupado(false); setProgreso(null);
    }
  }
  async function descartar() {
    setOcupado(true);
    try { await api(`/listas/${cargada.id}/descartar`, { method: "POST" }); alTerminar(); }
    catch (e) { setError((e as Error).message); setOcupado(false); }
  }

  if (resultado) {
    return (
      <div className="tarjeta resultado-final">
        <div className="tilde" aria-hidden="true">✓</div>
        <p role="status" data-testid="resultado">{resultado}</p>
        <button className="grande" onClick={alTerminar}>Cargar otra lista</button>
      </div>
    );
  }

  return (
    <div className="tarjeta">
      <h2>{cargada.proveedor} · lista del {fecha(cargada.fecha_lista)}</h2>
      {cargada.avisos.map((a, i) => <p key={i} className="aviso">{a}</p>)}
      <dl className="numeros" data-testid="resumen">
        <div><dt>Productos leídos</dt><dd>{r.leidas}</dd></div>
        <div className={r.nuevos > 0 ? "destacado-verde" : ""}><dt>Nuevos</dt><dd>{r.nuevos}</dd></div>
        <div className={r.modificados > 0 ? "destacado-amarillo" : ""}><dt>Cambian de precio</dt><dd>{r.modificados}{r.modificados > 0 && <small> ({porcentaje(r.variacion_promedio)} en promedio)</small>}</dd></div>
        <div><dt>Sin cambio</dt><dd>{r.sin_cambio}</dd></div>
        <div className={r.dados_de_baja > 0 ? "destacado-rojo" : ""}><dt>Ya no aparecen</dt><dd>{r.dados_de_baja}</dd></div>
        <div className={r.salteadas > 0 ? "destacado-rojo" : ""}><dt>Filas salteadas</dt><dd>{r.salteadas}</dd></div>
      </dl>
      {cargada.salteadas.length > 0 && (
        <details>
          <summary>Ver las filas salteadas</summary>
          <ul>{cargada.salteadas.map((s) => <li key={s.fila}>Fila {s.fila}: {s.motivo}{s.contenido.length ? ` (${s.contenido.join(" | ")})` : ""}</li>)}</ul>
        </details>
      )}
      {progreso ? (
        <div className="progreso" data-testid="progreso" role="progressbar" aria-valuemin={0} aria-valuemax={progreso.total ?? 100} aria-valuenow={progreso.procesadas}>
          <div className="progreso-barra"><div className="progreso-relleno" style={{ width: `${progreso.total ? Math.round((progreso.procesadas / progreso.total) * 100) : 5}%` }} /></div>
          <span>Aplicando… {progreso.procesadas.toLocaleString("es-AR")} de {(progreso.total ?? r.leidas).toLocaleString("es-AR")} precios</span>
        </div>
      ) : (
        <div className="acciones">
          <button className="grande" onClick={aplicar} disabled={ocupado} data-testid="aplicar">Aplicar {r.leidas} precios</button>
          <button className="secundario" onClick={descartar} disabled={ocupado}>Descartar</button>
        </div>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <h3>Vista previa {total > filas.length ? `(primeras ${filas.length} de ${total}; los cambios de precio van primero)` : ""}</h3>
      <div className="tabla-scroll">
        <table>
          <thead><tr><th>Código</th><th>Descripción</th><th>Marca</th><th>Costo hasta ahora</th><th>Costo nuevo</th><th>Cambio</th></tr></thead>
          <tbody>
            {filas.map((f) => {
              const cambio = f.costo_anterior !== null && Number(f.costo_anterior) > 0 ? ((Number(f.costo_neto) - Number(f.costo_anterior)) / Number(f.costo_anterior)) * 100 : null;
              return (
                <tr key={f.codigo_proveedor} className={f.costo_anterior === null ? "nuevo" : cambio ? "cambia" : ""}>
                  <td><code>{f.codigo_proveedor}</code></td>
                  <td>{f.descripcion}</td>
                  <td>{f.marca ?? ""}</td>
                  <td>{f.costo_anterior === null ? <em>nuevo</em> : pesos(f.costo_anterior)}</td>
                  <td><Explicacion valor={pesos(f.costo_neto)} pasos={f.explicacion} /></td>
                  <td className={cambio && cambio > 0 ? "sube" : cambio && cambio < 0 ? "baja" : ""}>{cambio === null || cambio === 0 ? "" : porcentaje(cambio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EstadoDeProveedores({ proveedores, historial }: { proveedores: Proveedor[]; historial: ListaFila[] }) {
  const ultima = new Map<string, ListaFila>();
  for (const l of historial) if (l.estado === "aplicada" && !ultima.has(l.proveedor_id)) ultima.set(l.proveedor_id, l);
  if (proveedores.length === 0) return <p>Todavía no hay proveedores cargados.</p>;
  return (
    <article>
      <h2>Proveedores</h2>
      <table data-testid="estado-proveedores">
        <thead><tr><th>Proveedor</th><th>Última lista aplicada</th><th>Productos</th></tr></thead>
        <tbody>
          {proveedores.filter((p) => p.activo).map((p) => {
            const l = ultima.get(p.id);
            const dias = l ? Math.floor((Date.now() - new Date(l.fecha_lista).getTime()) / 86400000) : null;
            return (
              <tr key={p.id} className={dias !== null && dias > 45 ? "vieja" : ""}>
                <td>{p.nombre}</td>
                <td>{l ? `${fecha(l.fecha_lista)} (hace ${dias} días)` : <em>nunca</em>}</td>
                <td>{l ? l.resumen.leidas : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </article>
  );
}

function AltaDeProveedor({ proveedores, alCambiar }: { proveedores: Proveedor[]; alCambiar: () => Promise<void> }) {
  const [lectores, setLectores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { api<string[]>("/listas/lectores").then(setLectores).catch(() => setLectores([])); }, []);

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    try {
      await api("/proveedores", {
        method: "POST",
        body: JSON.stringify({
          nombre: d.get("nombre"),
          lector: d.get("lector") || null,
          precios_incluyen_iva: d.get("iva") === "on",
          descuento_general: Number(d.get("general") || 0) / 100,
          descuento_contado: Number(d.get("contado") || 0) / 100,
        }),
      });
      form.reset();
      setError(null);
      await alCambiar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Desplegable titulo="Proveedores: agregar o revisar" testId="panel-proveedores">
      <table>
        <thead><tr><th>Proveedor</th><th>Lector</th><th>Precios con IVA</th><th>Dto. general</th><th>Dto. contado</th></tr></thead>
        <tbody>
          {proveedores.map((p) => (
            <tr key={p.id}><td>{p.nombre}</td><td>{p.lector ?? <em>a mano</em>}</td><td>{p.precios_incluyen_iva ? "sí" : "no"}</td><td>{Number(p.descuento_general) * 100} %</td><td>{Number(p.descuento_contado) * 100} %</td></tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={alta} className="en-linea">
        <input name="nombre" placeholder="Nombre del proveedor" required />
        <select name="lector" defaultValue="">
          <option value="">Lector: elegir a mano al cargar</option>
          {lectores.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <label><input type="checkbox" name="iva" /> precios con IVA</label>
        <label>dto. general <input name="general" type="number" min="0" max="100" step="0.5" defaultValue="0" style={{ width: "4.5rem" }} /> %</label>
        <label>dto. contado <input name="contado" type="number" min="0" max="100" step="0.5" defaultValue="0" style={{ width: "4.5rem" }} /> %</label>
        <button type="submit">Agregar</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </Desplegable>
  );
}

function Historial({ historial }: { historial: ListaFila[] }) {
  if (historial.length === 0) return null;
  return (
    <article>
      <h2>Últimas cargas</h2>
      <table>
        <thead><tr><th>Cuándo</th><th>Proveedor</th><th>Lista del</th><th>Archivo</th><th>Estado</th><th>Resultado</th></tr></thead>
        <tbody>
          {historial.slice(0, 20).map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.creado_en).toLocaleString("es-AR")}</td>
              <td>{l.proveedor}</td>
              <td>{fecha(l.fecha_lista)}</td>
              <td>{l.archivo_nombre}</td>
              <td>{l.estado === "aplicando" ? "aplicándose…" : l.estado}</td>
              <td>{l.estado === "aplicada" ? `${l.resumen.nuevos} nuevos, ${l.resumen.modificados} cambiados` : `${l.resumen.leidas} leídos`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

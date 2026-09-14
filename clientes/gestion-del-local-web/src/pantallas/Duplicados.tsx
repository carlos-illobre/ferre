import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useCatalogo } from "../catalogo";
import { fecha, pesos } from "../formato";
import { Desplegable } from "../componentes/Desplegable";

// Un mismo artículo en varios proveedores (issue #29): el dueño ve las sugerencias lado a
// lado y decide "es el mismo" o "son distintos". También puede unir dos a mano.
type Resumen = { id: string; descripcion: string; marca: string | null; codigo_barras: string | null; proveedor: string | null; costo_neto: string | null; fecha_lista: string | null };
type Sugerencia = { id: string; motivo: string; creado_en: string; a: Resumen; b: Resumen };

export function Duplicados() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => api<Sugerencia[]>("/equivalencias").then(setSugerencias).catch((e: Error) => setError(e.message)), []);
  useEffect(() => { void cargar(); }, [cargar]);

  async function buscar() {
    try { const r = await api<{ nuevas: number }>("/equivalencias/buscar", { method: "POST" }); setMensaje(`${r.nuevas} sugerencia(s) nueva(s).`); await cargar(); }
    catch (e) { setError((e as Error).message); }
  }
  async function resolver(s: Sugerencia, accion: "unir" | "rechazar", conservar: "a" | "b" = "a") {
    try {
      await api(`/equivalencias/${s.id}/${accion}`, { method: "POST", body: JSON.stringify({ conservar }) });
      setSugerencias((l) => l.filter((x) => x.id !== s.id));
      setMensaje(accion === "unir" ? `Unidos: "${(conservar === "a" ? s.a : s.b).descripcion}" ahora tiene ${s.a.proveedor} y ${s.b.proveedor}.` : "Marcados como distintos.");
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <section className="duplicados">
      <h1>Duplicados entre proveedores</h1>
      <p className="ayuda">El mismo artículo aparece en varias listas. Unirlo deja un solo producto con todos sus proveedores y el precio se calcula sobre el más barato. Las ventas, el stock y los precios se conservan.</p>
      <div className="en-linea"><button className="secundario" onClick={buscar} data-testid="buscar-duplicados">Buscar duplicados en todo el catálogo</button></div>
      {mensaje && <p className="exito" role="status" data-testid="mensaje">{mensaje}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {sugerencias.length === 0 ? <p>No hay sugerencias pendientes.</p> : (
        <ul className="sugerencias-duplicados" data-testid="sugerencias-duplicados">
          {sugerencias.map((s) => (
            <li key={s.id} className="tarjeta" data-testid="sugerencia">
              <small>{s.motivo === "codigo_barras" ? "Mismo código de barras" : "Misma descripción"}</small>
              <div className="lado-a-lado">
                {(["a", "b"] as const).map((lado) => {
                  const p = s[lado];
                  return (
                    <div key={lado} className="candidato">
                      <strong>{p.descripcion}</strong>
                      <small>{[p.marca, p.codigo_barras].filter(Boolean).join(" · ")}</small>
                      <span>{p.proveedor ?? "sin proveedor"} · {p.costo_neto ? pesos(p.costo_neto) : "sin costo"} · {p.fecha_lista ? `lista del ${fecha(p.fecha_lista)}` : ""}</span>
                      <button className="enlace chico" onClick={() => resolver(s, "unir", lado)}>Es el mismo: conservar este nombre</button>
                    </div>
                  );
                })}
              </div>
              <div className="acciones">
                <button className="grande" onClick={() => resolver(s, "unir", "a")} data-testid="unir">Es el mismo</button>
                <button className="secundario" onClick={() => resolver(s, "rechazar")}>Son distintos</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <UnionManual alUnir={cargar} />
      <Unidos version={mensaje} />
    </section>
  );
}

function UnionManual({ alUnir }: { alUnir: () => Promise<void> }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [q1, setQ1] = useState(""); const [q2, setQ2] = useState("");
  const [id1, setId1] = useState(""); const [id2, setId2] = useState("");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const r1 = useMemo(() => (q1.trim() ? buscarProductos(q1, 6) : []), [buscarProductos, q1]);
  const r2 = useMemo(() => (q2.trim() ? buscarProductos(q2, 6) : []), [buscarProductos, q2]);
  const nombre = (id: string) => catalogo?.find((p) => p.id === id)?.descripcion ?? "";
  async function unir() {
    try { await api("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: id1, absorber_id: id2 }) }); setMensaje(`Unidos: "${nombre(id1)}" absorbió a "${nombre(id2)}".`); setId1(""); setId2(""); setQ1(""); setQ2(""); await alUnir(); }
    catch (e) { setMensaje((e as Error).message); }
  }
  return (
    <Desplegable titulo="Unir dos productos a mano" testId="union-manual">
      <div className="lado-a-lado">
        {[{ q: q1, setQ: setQ1, r: r1, id: id1, setId: setId1, titulo: "Conservar" }, { q: q2, setQ: setQ2, r: r2, id: id2, setId: setId2, titulo: "Absorber (queda dentro del otro)" }].map((c) => (
          <div key={c.titulo} className="candidato">
            <strong>{c.titulo}</strong>
            {c.id ? <span>{nombre(c.id)} <button className="enlace chico" onClick={() => c.setId("")}>cambiar</button></span> : (
              <>
                <input value={c.q} onChange={(e) => c.setQ(e.target.value)} placeholder="Buscar producto" />
                <ul className="lista-simple">{c.r.map((p) => <li key={p.id}><button className="enlace" onClick={() => { c.setId(p.id); c.setQ(""); }}>{p.descripcion} <small>{p.proveedor ?? ""}</small></button></li>)}</ul>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="acciones"><button className="grande" disabled={!id1 || !id2 || id1 === id2} onClick={unir}>Unir</button>{mensaje && <span className="ayuda">{mensaje}</span>}</div>
    </Desplegable>
  );
}

// Lo ya unido, para poder separarlo si fue un error. El absorbido no aparece en las
// búsquedas (quedó dentro del otro), así que este es el único lugar donde se lo ve.
type Union = { absorbido_id: string; absorbido: string; conservado_id: string; conservado: string; unido_en: string; proveedores: string | null };
function Unidos({ version }: { version: string | null }) {
  const [uniones, setUniones] = useState<Union[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const cargar = useCallback(() => api<Union[]>("/equivalencias/unidos").then(setUniones).catch(() => setUniones([])), []);
  useEffect(() => { void cargar(); }, [cargar, version]);
  async function separar(u: Union) {
    if (!window.confirm(`¿Separar "${u.absorbido}" de "${u.conservado}"? Cada uno vuelve a tener sus precios, ventas y stock.`)) return;
    try { await api("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: u.absorbido_id }) }); setMensaje(`Separados: "${u.absorbido}" vuelve a ser un producto aparte.`); await cargar(); }
    catch (e) { setMensaje((e as Error).message); }
  }
  return (
    <Desplegable titulo={`Unidos (${uniones.length}): se pueden separar`} testId="unidos">
      {mensaje && <p className="exito" role="status" data-testid="mensaje-separar">{mensaje}</p>}
      {uniones.length === 0 ? <p className="ayuda">Todavía no se unió ningún producto.</p> : (
        <table>
          <thead><tr><th>Producto que quedó</th><th>Absorbió a</th><th>Proveedores</th><th>Cuándo</th><th /></tr></thead>
          <tbody>
            {uniones.map((u) => (
              <tr key={u.absorbido_id} data-testid="union">
                <td><strong>{u.conservado}</strong></td><td>{u.absorbido}</td><td>{u.proveedores ?? ""}</td><td>{fecha(u.unido_en.slice(0, 10))}</td>
                <td><button className="boton peligro" onClick={() => separar(u)}>Separar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Desplegable>
  );
}

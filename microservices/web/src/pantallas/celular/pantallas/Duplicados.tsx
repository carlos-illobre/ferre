import { useMemo, useState } from "react";
import { buscarDuplicados, resolverSugerencia, separar as separarProductos, unir as unirProductos, useDuplicados, type Resumen, type Sugerencia, type Union } from "../../../negocio/catalogo/duplicados";
import { useCatalogo } from "../../../catalogo";
import { fecha, pesos } from "../../../formato";
import { AvisoError, Buscador, Hoja, Toast } from "../componentes/base";

// Un mismo artículo en varios proveedores (issue #29): quien administra ve las sugerencias
// lado a lado y decide "es el mismo" o "son distintos". También une dos a mano y separa.
const detalle = (p: Resumen) => [p.marca, p.proveedor ?? "sin proveedor", p.costo_neto ? pesos(p.costo_neto) : "sin costo", p.fecha_lista ? `lista del ${fecha(p.fecha_lista)}` : null].filter(Boolean).join(" · ");

export function Duplicados() {
  const { sugerencias: traidas, uniones, error: fallo } = useDuplicados();
  const sugerencias = traidas ?? [];
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (fallo && fallo !== cerrado ? fallo.message : null);
  const [aMano, setAMano] = useState(false);

  async function buscar() {
    try { const nuevas = await buscarDuplicados(); setMensaje(nuevas ? `${nuevas} sugerencia(s) nueva(s).` : "Sin sugerencias nuevas."); }
    catch (e) { setError((e as Error).message); }
  }
  async function resolver(s: Sugerencia, accion: "unir" | "rechazar", conservar: "a" | "b" = "a") {
    try {
      await resolverSugerencia(s, accion, conservar);
      setMensaje(accion === "unir" ? `Unidos: "${(conservar === "a" ? s.a : s.b).descripcion}" ahora tiene ${s.a.proveedor} y ${s.b.proveedor}.` : "Marcados como distintos.");
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <>
      <p className="subtitulo">El mismo artículo en varias listas. Al unirlos queda un producto con todos sus proveedores y el precio sale del más barato. Las ventas, el stock y los precios se conservan.</p>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />
      {sugerencias.length === 0 && <div className="aviso-suave">No hay sugerencias pendientes.</div>}
      {sugerencias.length > 0 && <div className="tarjetas">
      {sugerencias.map((s) => (
        <div key={s.id} className="tarjeta" data-testid="sugerencia">
          <span className="seccion" style={{ padding: 0 }}>{s.motivo === "codigo_barras" ? "Mismo código de barras" : "Misma descripción"}</span>
          <div className="cuadricula-2">
            {(["a", "b"] as const).map((lado) => (
              <button key={lado} type="button" className="candidato" onClick={() => resolver(s, "unir", lado)}>
                <strong>{s[lado].descripcion}</strong>
                <small>{detalle(s[lado])}</small>
                <span className="accion">Es el mismo: conservar este nombre</span>
              </button>
            ))}
          </div>
          <div className="cuadricula-2">
            <button type="button" className="boton marino" onClick={() => resolver(s, "unir", "a")} data-testid="unir">Es el mismo</button>
            <button type="button" className="boton" onClick={() => resolver(s, "rechazar")}>Son distintos</button>
          </div>
        </div>
      ))}
      </div>}
      <button type="button" className="boton marino grande ancho" onClick={buscar} data-testid="buscar-duplicados">Buscar duplicados en todo el catálogo</button>
      <button type="button" className="boton texto" onClick={() => setAMano(true)} data-testid="unir-a-mano">Unir dos productos a mano</button>
      {aMano && <UnionManual alCerrar={() => setAMano(false)} alUnir={async (m) => { setMensaje(m); setAMano(false); }} />}
      <Unidos uniones={uniones ?? []} />
    </>
  );
}

function UnionManual({ alCerrar, alUnir }: { alCerrar: () => void; alUnir: (mensaje: string) => Promise<void> }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [q1, setQ1] = useState(""); const [q2, setQ2] = useState("");
  const [id1, setId1] = useState(""); const [id2, setId2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const r1 = useMemo(() => (q1.trim() ? buscarProductos(q1, 6) : []), [buscarProductos, q1]);
  const r2 = useMemo(() => (q2.trim() ? buscarProductos(q2, 6) : []), [buscarProductos, q2]);
  const nombre = (id: string) => catalogo?.find((p) => p.id === id)?.descripcion ?? "";
  async function unir() {
    try { await unirProductos(id1, id2); await alUnir(`Unidos: "${nombre(id1)}" absorbió a "${nombre(id2)}".`); }
    catch (e) { setError((e as Error).message); }
  }
  return (
    <Hoja titulo="Unir dos productos a mano" alCerrar={alCerrar} testId="union-manual">
      <AvisoError texto={error} />
      {[{ q: q1, setQ: setQ1, r: r1, id: id1, setId: setId1, titulo: "Conservar", testId: "conservar" }, { q: q2, setQ: setQ2, r: r2, id: id2, setId: setId2, titulo: "Absorber (queda dentro del otro)", testId: "absorber" }].map((c) => (
        <div key={c.titulo} className="tarjeta">
          <strong>{c.titulo}</strong>
          {c.id ? <div className="fila-otro"><span>{nombre(c.id)}</span><button type="button" className="enlace" onClick={() => c.setId("")}>cambiar</button></div> : (
            <>
              <Buscador chico valor={c.q} alCambiar={c.setQ} placeholder="Buscar producto" testId={`buscar-${c.testId}`} />
              {c.r.length > 0 && <div className="lista">{c.r.map((p) => <button key={p.id} type="button" className="fila" onClick={() => { c.setId(p.id); c.setQ(""); }}><span className="nombre">{p.descripcion}</span><span /><span className="detalle">{p.proveedor ?? ""}</span></button>)}</div>}
            </>
          )}
        </div>
      ))}
      <button type="button" className="boton marino" disabled={!id1 || !id2 || id1 === id2} onClick={unir}>Unir</button>
    </Hoja>
  );
}

// Lo ya unido, para poder separarlo si fue un error. El absorbido no aparece en las
// búsquedas (quedó dentro del otro), así que este es el único lugar donde se lo ve.
function Unidos({ uniones }: { uniones: Union[] }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  async function separar(u: Union) {
    if (!window.confirm(`¿Separar "${u.absorbido}" de "${u.conservado}"? Cada uno vuelve a tener sus precios, ventas y stock.`)) return;
    try { await separarProductos(u.absorbido_id); setMensaje(`Separados: "${u.absorbido}" vuelve a ser un producto aparte.`); }
    catch (e) { setMensaje((e as Error).message); }
  }
  return (
    <>
      <div className="seccion" data-testid="unidos">Unidos · se pueden separar</div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-separar" />
      {uniones.length === 0 ? <div className="aviso-suave">Todavía no se unió ningún producto.</div> : (
        <div className="lista">
          {uniones.map((u) => (
            <div key={u.absorbido_id} className="fila" data-testid="union">
              <span className="nombre">{u.conservado}</span>
              <button type="button" className="boton chico derecha" onClick={() => separar(u)}>Separar</button>
              <span className="detalle">absorbió a “{u.absorbido}” el {fecha(u.unido_en.slice(0, 10))}{u.proveedores ? ` · ${u.proveedores}` : ""}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

import { useMemo, useState, type ReactNode } from "react";
import { buscarDuplicados, buscarUniones, resolverSugerencia, separar as separarProductos, unir as unirProductos, useDuplicados, type Resumen, type Sugerencia, type Union } from "../../../negocio/catalogo/duplicados";
import { useCatalogo } from "../../../catalogo";
import { fecha, pesos } from "../../../formato";
import { AvisoError, Buscador, Hoja, Icono, Toast, Lista } from "../componentes/base";
import { FotoProducto } from "../componentes/Foto";

// Un mismo artículo en varios proveedores (issue #29): quien administra ve las sugerencias
// lado a lado y decide "es el mismo" o "son distintos". También une dos a mano y separa.
// Cada candidato de una sugerencia: la marca, el proveedor, el costo y la fecha de la lista,
// cada dato con su ícono (002-T005).
function Candidato({ p }: { p: Resumen }) {
  return (
    <>
      <strong>{p.descripcion}</strong>
      {p.marca && <span className="dp-dato"><Icono nombre="marca" tam={16} />{p.marca}</span>}
      <span className="dp-dato"><Icono nombre="proveedor" tam={16} />{p.proveedor ?? "Sin proveedor"}</span>
      <span className="dp-dato dp-costo">{p.costo_neto ? pesos(p.costo_neto) : "Sin costo"}</span>
      {p.fecha_lista && <span className="dp-dato"><Icono nombre="calendario" tam={16} />{fecha(p.fecha_lista)}</span>}
    </>
  );
}

export function Duplicados() {
  const { sugerencias: traidas, uniones, error: fallo } = useDuplicados();
  const sugerencias = traidas ?? [];
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (fallo && fallo !== cerrado ? fallo.message : null);
  const [aMano, setAMano] = useState(false);
  // «Separar» y «Ver todo» abren la lista de todos los productos unidos, con su buscador.
  const [todas, setTodas] = useState(false);

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
      <div className="dp-nota">
        <span className="dp-circulo"><Icono nombre="enlace" tam={18} /></span>
        <span><b>Unificá productos duplicados</b><small>El mismo artículo puede estar en varias listas. Al unirlos queda uno solo, con todos sus proveedores y el precio del más barato.</small></span>
      </div>
      <div className="dp-acciones">
        <span><button type="button" className="dp-accion fuerte" onClick={buscar} data-testid="buscar-duplicados"><span className="dp-circulo"><Icono nombre="buscar" tam={15} /></span>Buscar</button><small>Duplicados en todo el catálogo</small></span>
        <span><button type="button" className="dp-accion" onClick={() => setAMano(true)} data-testid="unir-a-mano"><span className="dp-circulo naranja"><Icono nombre="enlace" tam={15} /></span>Unir</button><small>Dos productos, elegidos a mano</small></span>
        <span><button type="button" className="dp-accion" onClick={() => setTodas(true)} data-testid="separar-uno"><span className="dp-circulo"><Icono nombre="separar" tam={15} /></span>Separar</button><small>Deshacer una unión</small></span>
      </div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />
      {sugerencias.length === 0 && (
        <div className="dp-vacio">
          <span className="dp-circulo"><Icono nombre="reloj" tam={20} /></span>
          <span><b>No hay sugerencias pendientes</b><small>Tocá «Buscar» para revisar el catálogo.</small></span>
        </div>
      )}
      {sugerencias.length > 0 && <div className="tarjetas">
      {sugerencias.map((s) => (
        <div key={s.id} className="dp-sugerencia" data-testid="sugerencia">
          <span className="dp-motivo"><Icono nombre={s.motivo === "codigo_barras" ? "codigoDeBarras" : "lector"} tam={16} />{s.motivo === "codigo_barras" ? "Mismo código de barras" : "Misma descripción"}</span>
          <div className="dp-candidatos">
            {(["a", "b"] as const).map((lado) => (
              <button key={lado} type="button" className="dp-candidato" onClick={() => resolver(s, "unir", lado)} aria-label={`Es el mismo: conservar «${s[lado].descripcion}»`}>
                <Candidato p={s[lado]} />
                <em>Conservar este</em>
              </button>
            ))}
          </div>
          <div className="dp-botones">
            <button type="button" className="boton tinta" onClick={() => resolver(s, "unir", "a")} data-testid="unir">Es el mismo</button>
            <button type="button" className="boton" onClick={() => resolver(s, "rechazar")}>Son distintos</button>
          </div>
        </div>
      ))}
      </div>}
      {aMano && <UnionManual alCerrar={() => setAMano(false)} alUnir={async (m) => { setMensaje(m); setAMano(false); }} />}
      <Unidos uniones={uniones ?? []} todas={todas} alVerTodas={setTodas} />
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
              {c.r.length > 0 && <Lista>{c.r.map((p) => <button key={p.id} type="button" className="fila" onClick={() => { c.setId(p.id); c.setQ(""); }}><span className="nombre">{p.descripcion}</span><span /><span className="detalle">{p.proveedor ?? ""}</span></button>)}</Lista>}
            </>
          )}
        </div>
      ))}
      <button type="button" className="boton tinta" disabled={!id1 || !id2 || id1 === id2} onClick={unir}>Unir</button>
    </Hoja>
  );
}

// Lo ya unido, para poder separarlo si fue un error. El absorbido no aparece en las
// búsquedas (quedó dentro del otro), así que este es el único lugar donde se lo ve. Se ven las
// tres últimas uniones; «Ver todo» y «Separar» abren todas, con un buscador (002-T005).
const A_LA_VISTA = 3;
function Unidos({ uniones, todas, alVerTodas }: { uniones: Union[]; todas: boolean; alVerTodas: (abierta: boolean) => void }) {
  const [mensaje, setMensaje] = useState<ReactNode>(null);
  // La última separación, para deshacerla desde el aviso.
  const [separada, setSeparada] = useState<Union | null>(null);
  const [buscado, setBuscado] = useState("");
  // Separar no pide confirmar: se deshace uniéndolos de nuevo, desde el mismo aviso (como en la computadora).
  async function separar(u: Union) {
    try { await separarProductos(u.absorbido_id); setSeparada(u); setMensaje(<>Separados: <b>«{u.absorbido}»</b> vuelve a ser un producto aparte, con sus precios, ventas y stock.</>); }
    catch (e) { setSeparada(null); setMensaje((e as Error).message); }
  }
  async function deshacer(u: Union) {
    setSeparada(null);
    try { await unirProductos(u.conservado_id, u.absorbido_id); setMensaje("Separación deshecha: vuelven a ser un solo producto."); }
    catch (e) { setMensaje((e as Error).message); }
  }
  const lista = (cuales: Union[]) => (
    <Lista className="dp-lista">
      {cuales.map((u) => <UnionHecha key={u.absorbido_id} u={u} alSeparar={() => void separar(u)} />)}
    </Lista>
  );
  return (
    <>
      <h2 className="seccion dp-titulo" data-testid="unidos"><span>Productos unidos {uniones.length > 0 && <span className="dp-cuenta">{uniones.length}</span>}</span></h2>
      <p className="dp-bajada">Cada uno junta varios productos. Se pueden separar si hace falta.</p>
      <Toast texto={mensaje} alCerrar={() => { setMensaje(null); setSeparada(null); }} testId="mensaje-separar" accion={separada ? { texto: "Deshacer", alTocar: () => void deshacer(separada) } : undefined} />
      {uniones.length === 0 ? <div className="aviso-suave">Todavía no se unió ningún producto.</div> : (
        <div className="dp-unidos">
          {lista(uniones.slice(0, A_LA_VISTA))}
          {uniones.length > A_LA_VISTA && (
            <button type="button" className="dp-ver-todo" onClick={() => alVerTodas(true)} data-testid="ver-todas-las-uniones">
              <Icono nombre="lista" tam={20} />Ver todo ({uniones.length})<Icono nombre="derecha" tam={20} />
            </button>
          )}
        </div>
      )}
      {todas && (
        <Hoja titulo="Productos unidos" alCerrar={() => { alVerTodas(false); setBuscado(""); }} testId="todas-las-uniones">
          <Buscador chico valor={buscado} alCambiar={setBuscado} placeholder="Buscar un producto unido" testId="buscar-union" />
          {buscarUniones(uniones, buscado).length === 0 ? <div className="aviso-suave">{uniones.length ? "Ningún producto unido coincide con la búsqueda." : "Todavía no se unió ningún producto."}</div> : lista(buscarUniones(uniones, buscado))}
        </Hoja>
      )}
    </>
  );
}

// Una unión: la foto, el nombre con «Separar» a su derecha y, debajo, la marca, a cuál unió,
// los proveedores y cuándo.
function UnionHecha({ u, alSeparar }: { u: Union; alSeparar: () => void }) {
  return (
    <div className="dp-union" data-testid="union">
      <span className="dp-foto">{u.foto_url ? <FotoProducto id={u.conservado_id} url={u.foto_url} descripcion={u.conservado} /> : <Icono nombre="imagen" tam={22} />}</span>
      <span className="dp-datos">
        <span className="dp-cabeza"><b>{u.conservado}</b><button type="button" className="dp-separar" onClick={alSeparar} aria-label={`Separar «${u.absorbido}» de «${u.conservado}»`}><Icono nombre="separar" tam={15} />Separar</button></span>
        {u.marca && <small><Icono nombre="marca" tam={15} /><i>{u.marca}</i></small>}
        <small><Icono nombre="enlace" tam={15} /><i>Unió «{u.absorbido}»</i></small>
        {u.proveedores && <small><Icono nombre="proveedor" tam={15} /><i>{u.proveedores}</i></small>}
        <small><Icono nombre="calendario" tam={15} /><i>Unido el {fecha(u.unido_en.slice(0, 10))}</i></small>
      </span>
    </div>
  );
}

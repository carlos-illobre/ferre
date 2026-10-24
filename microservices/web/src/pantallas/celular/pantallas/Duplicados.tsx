import { useMemo, useState, type ReactNode } from "react";
import { buscarDuplicados, buscarUniones, resolverSugerencia, separar as separarProductos, unir as unirProductos, useDuplicados, type Resumen, type Sugerencia, type Union } from "../../../negocio/catalogo/duplicados";
import { useCatalogo } from "../../../negocio/catalogo";
import { fecha, pesos } from "../../../formato";
import { AvisoError, Buscador, Hoja, Icono, Toast, Lista } from "../componentes/base";
import { TEXTOS } from "../../textos";
import "./duplicados.css";
import { FotoProducto } from "../componentes/Foto";

// Un mismo artículo en varios proveedores (issue #29): quien administra ve las sugerencias
// lado a lado y decide "es el mismo" o "son distintos". También une dos a mano y separa. Como
// la v2 (decisión 148, «Renovada»): una sugerencia por vez, tocar un producto lo elige para
// conservar, y «Es el mismo» / «Son distintos» van en la barra fija de abajo, bajo el pulgar.
const plano = (t: string | null) => (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const diaYMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

// Un lado de la sugerencia: la foto, el nombre, la marca, el proveedor y la fecha de la lista con
// su ícono, el costo y si se conserva. Lo que difiere del que se conserva va en ámbar.
function Lado({ p, otro, conserva, barato, alElegir }: { p: Resumen; otro: Resumen; conserva: boolean; barato: boolean; alElegir: () => void }) {
  const t = TEXTOS.duplicados;
  // Lo distinto se marca del lado que no se conserva, como en la computadora.
  const marca = (valor: string | null, del: string | null) => (!conserva && plano(valor) !== plano(del) ? <span className="cd-difiere">{valor ?? "—"}</span> : valor);
  return (
    <button type="button" role="radio" aria-checked={conserva} className={`cd-lado ${conserva ? "si" : ""}`} onClick={alElegir}
      aria-label={`${conserva ? "Se conserva" : "Conservar"} «${p.descripcion}»`}>
      <span className="cd-foto" aria-hidden="true"><Icono nombre="imagen" tam={22} /></span>
      <span className="cd-n">{marca(p.descripcion, otro.descripcion)}</span>
      <span className="cd-dato"><Icono nombre="marca" tam={16} />{marca(p.marca, otro.marca) ?? "Sin marca"}</span>
      <span className="cd-dato"><Icono nombre="camion" tam={16} /><span className="cd-elipsis">{p.proveedor ?? "Sin proveedor"}</span></span>
      <span className="cd-dato"><Icono nombre="calendario" tam={16} />{p.fecha_lista ? marca(fecha(p.fecha_lista), otro.fecha_lista ? fecha(otro.fecha_lista) : null) : "—"}</span>
      <span className="cd-costo">{p.costo_neto ? pesos(p.costo_neto) : "Sin costo"}{barato && <span className="cd-barato"><Icono nombre="tilde" tam={14} grosor={3} />{t.elMasBarato.corto}</span>}</span>
      <span className={`cd-cons ${conserva ? "si" : ""}`}><span className="cd-radio" aria-hidden="true" />{conserva ? t.seConserva.corto : t.conservarEste.corto}</span>
    </button>
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
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [conservar, setConservar] = useState<Record<string, "a" | "b">>({});
  const [ocupado, setOcupado] = useState(false);
  const t = TEXTOS.duplicados;

  const posicion = Math.max(0, sugerencias.findIndex((s) => s.id === elegidaId));
  const s = sugerencias[posicion] ?? null;

  async function buscar() {
    try { const nuevas = await buscarDuplicados(); setMensaje(nuevas ? `${nuevas} sugerencia(s) nueva(s).` : "Sin sugerencias nuevas."); }
    catch (e) { setError((e as Error).message); }
  }
  async function resolver(accion: "unir" | "rechazar") {
    if (!s || ocupado) return;
    const lado = conservar[s.id] ?? "a";
    const siguiente = sugerencias[posicion + 1] ?? sugerencias[posicion - 1] ?? null;
    setOcupado(true);
    try {
      await resolverSugerencia(s, accion, lado);
      setElegidaId(siguiente?.id ?? null);
      setMensaje(accion === "unir" ? `Unidos: "${s[lado].descripcion}" ahora tiene ${s.a.proveedor} y ${s.b.proveedor}.` : "Marcados como distintos.");
    } catch (e) { setError((e as Error).message); } finally { setOcupado(false); }
  }
  const costos = s ? [Number(s.a.costo_neto), Number(s.b.costo_neto)] : [];
  const masBarato = s && s.a.costo_neto && s.b.costo_neto && costos[0] !== costos[1] ? (costos[0]! < costos[1]! ? "a" : "b") : null;

  return (
    <>
      <div className="cd-nota">
        <Icono nombre="unir" tam={18} />
        <span>{t.nota.corto} <b>{t.notaFuerte.corto}</b>{t.notaFin.corto}</span>
      </div>
      <div className="cd-tres">
        <div><button type="button" className="cd-boton oscuro" onClick={buscar} data-testid="buscar-duplicados"><Icono nombre="buscar" tam={18} />{t.buscarEnTodo.corto}</button><span>Todo el catálogo</span></div>
        <div><button type="button" className="cd-boton" onClick={() => setAMano(true)} data-testid="unir-a-mano"><Icono nombre="unir" tam={18} />{t.unirAMano.corto}</button><span>Dos, a mano</span></div>
        <div><button type="button" className="cd-boton" onClick={() => setTodas(true)} data-testid="separar-uno"><Icono nombre="dividir" tam={18} />{t.unidosYSeparar.corto}</button><span>Una unión</span></div>
      </div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(fallo); }} />

      <h2 className="cd-sec">
        <b>{t.porRevisar.corto}</b><span className="cd-cuenta ambar">{sugerencias.length}</span>
        {sugerencias.length > 1 && <button type="button" className="cd-siguiente" onClick={() => setElegidaId(sugerencias[(posicion + 1) % sugerencias.length]!.id)} aria-label={`La siguiente: ${posicion + 1} de ${sugerencias.length}`}>{posicion + 1} de {sugerencias.length} ›</button>}
      </h2>
      {!s ? (
        <div className="dp-vacio">
          <span className="dp-circulo"><Icono nombre="reloj" tam={20} /></span>
          <span><b>No hay sugerencias pendientes</b><small>Tocá «Buscar» para revisar el catálogo.</small></span>
        </div>
      ) : (
        <div className="cd-sug" data-testid="sugerencia">
          <span className={`cd-motivo ${s.motivo === "codigo_barras" ? "codigo" : ""}`}><Icono nombre={s.motivo === "codigo_barras" ? "codigoDeBarras" : "lector"} tam={16} />{s.motivo === "codigo_barras" ? t.mismoCodigo.corto : t.descripcionParecida.corto}</span>
          <div className="cd-par" role="radiogroup" aria-label="Qué producto se conserva si son el mismo">
            <Lado p={s.a} otro={s.b} conserva={(conservar[s.id] ?? "a") === "a"} barato={masBarato === "a"} alElegir={() => setConservar((c) => ({ ...c, [s.id]: "a" }))} />
            <Lado p={s.b} otro={s.a} conserva={conservar[s.id] === "b"} barato={masBarato === "b"} alElegir={() => setConservar((c) => ({ ...c, [s.id]: "b" }))} />
            <span className="cd-igual" aria-hidden="true">=</span>
          </div>
        </div>
      )}
      {aMano && <UnionManual alCerrar={() => setAMano(false)} alUnir={async (m) => { setMensaje(m); setAMano(false); }} />}
      <Unidos uniones={uniones ?? []} todas={todas} alVerTodas={setTodas} />
      {s && (
        <>
          <div className="cd-hueco" aria-hidden="true" />
          <div className="cd-barra">
            <button type="button" className="cd-mismo" disabled={ocupado} onClick={() => void resolver("unir")} data-testid="unir"><Icono nombre="unir" tam={22} />{t.esElMismo.corto}</button>
            <button type="button" className="cd-distintos" disabled={ocupado} onClick={() => void resolver("rechazar")} data-testid="rechazar"><Icono nombre="cerrar" tam={22} />{t.sonDistintos.corto}</button>
          </div>
        </>
      )}
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
    <ul className="cd-unidas">
      {cuales.map((u) => <li key={u.absorbido_id}><UnionHecha u={u} alSeparar={() => void separar(u)} /></li>)}
    </ul>
  );
  return (
    <>
      <h2 className="cd-sec" data-testid="unidos">
        <b>{TEXTOS.duplicados.productosUnidos.corto}</b>{uniones.length > 0 && <span className="cd-cuenta verde">{uniones.length}</span>}
        {uniones.length > 0 && <button type="button" className="cd-ver" onClick={() => alVerTodas(true)} data-testid="ver-todas-las-uniones">{TEXTOS.duplicados.verTodo.corto}</button>}
      </h2>
      <Toast texto={mensaje} alCerrar={() => { setMensaje(null); setSeparada(null); }} testId="mensaje-separar" accion={separada ? { texto: "Deshacer", alTocar: () => void deshacer(separada) } : undefined} />
      {uniones.length === 0 ? <div className="aviso-suave">Todavía no se unió ningún producto.</div> : (
        <div>
          {lista(uniones.slice(0, A_LA_VISTA))}
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

// Una unión, como la v2: la foto, el nombre con «Separar» a su derecha y, debajo, la marca, los
// proveedores y cuándo, y a cuál unió.
function UnionHecha({ u, alSeparar }: { u: Union; alSeparar: () => void }) {
  return (
    <div className="cd-unida" data-testid="union">
      <span className="cd-foto chica">{u.foto_url ? <FotoProducto id={u.conservado_id} url={u.foto_url} descripcion={u.conservado} /> : <Icono nombre="imagen" tam={20} />}</span>
      <b className="cd-unida-n">{u.conservado}</b>
      <button type="button" className="cd-separar" onClick={alSeparar} aria-label={`Separar «${u.absorbido}» de «${u.conservado}»`}><Icono nombre="dividir" tam={16} />{TEXTOS.duplicados.separar.corto}</button>
      <span className="cd-unida-d">{[u.marca, u.proveedores, diaYMes(u.unido_en.slice(0, 10))].filter(Boolean).join(" · ")}</span>
      <span className="cd-unida-d">Unió «{u.absorbido}»</span>
    </div>
  );
}

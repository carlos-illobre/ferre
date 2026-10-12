import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useCatalogo } from "../catalogo";
import type { Producto } from "./celular/pantallas/Productos";
import { Escaner, hayCamara } from "./celular/componentes/Escaner";
import { usePuede } from "./permisos";
import "./pedidos.css";

// Pedidos a proveedores (RF-55, decisión 52). La misma pantalla en el celular y en la
// computadora (maqueta B, aprobada el 2026-10-11): la lista de pedidos; el pedido, que es
// solo sus renglones; y «Revisar y mandar», una hoja con el mensaje tal como lo recibe el
// proveedor. Se manda como texto, por WhatsApp o copiándolo. Lo que el proveedor recibe no
// lleva costos: el estimado lo ve solo quien arma el pedido.
type ItemDelPedido = { producto_id: string; descripcion: string; marca: string | null; unidad: string; codigo_proveedor: string | null; cantidad: string; costo_estimado: string | null; recibido: string };
export type Pedido = {
  id: string; estado: "borrador" | "enviado" | "recibido_parcial" | "recibido" | "cancelado" | "cerrado_incompleto";
  proveedor_id: string; proveedor: string; whatsapp: string | null; creado_en: string; enviado_en: string | null; cerrado_en: string | null;
  enviado_por: string | null; cerrado_por: string | null; items: ItemDelPedido[];
};
type Proveedor = { id: string; nombre: string; activo: boolean; whatsapp: string | null };
type Renglon = { producto_id: string; descripcion: string; marca: string | null; unidad: string; codigo: string | null; cantidad: number; costo: number | null };
type Borrador = { id: string; proveedorId: string; renglones: Renglon[] };

export const ESTADOS: Record<Pedido["estado"], string> = { borrador: "Borrador", enviado: "Enviado", recibido_parcial: "Recibido parcial", recibido: "Recibido", cancelado: "Cancelado", cerrado_incompleto: "Cerrado incompleto" };
const pesos = (n: number) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
const mensajeDe = (e: unknown, quehacer: string) => ((e as { estado?: number }).estado ? `${(e as Error).message}.` : `Sin conexión: ${quehacer} necesita internet.`);
const granel = (unidad: string) => unidad !== "unidad";
export const cantidadConUnidad = (cantidad: number, unidad: string) => `${String(cantidad).replace(".", ",")}${granel(unidad) ? ` ${unidad === "l" ? "L" : unidad}` : ""}`;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

// El mensaje que recibe el proveedor: el negocio, la fecha y, por renglón, cantidad,
// descripción y su código. Sin costos ni total (decisión 52).
export function textoDelPedido(renglones: { descripcion: string; codigo: string | null; cantidad: number; unidad: string }[], fecha = new Date()): string {
  const lineas = renglones.map((r) => `${cantidadConUnidad(r.cantidad, r.unidad)} × ${r.descripcion}${r.codigo ? ` (${r.codigo})` : ""}`);
  return `Ferrebress · pedido del ${fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}\n\n${lineas.join("\n")}\n\n${plural(renglones.length, "renglón", "renglones")}. Gracias.`;
}

// Lo que ese proveedor cobra por el producto y con qué código lo conoce, según su última lista.
function segunProveedor(p: Producto, proveedor: Proveedor): { codigo: string | null; costo: number | null } {
  const suyo = p.proveedores?.find((x) => x.proveedor_id === proveedor.id);
  if (suyo) return { codigo: suyo.codigo_proveedor, costo: Number(suyo.costo_neto) };
  if (p.proveedor === proveedor.nombre) return { codigo: p.codigo_proveedor, costo: p.costo_neto === null ? null : Number(p.costo_neto) };
  return { codigo: null, costo: null };
}
const aRenglones = (p: Pedido): Renglon[] => p.items.map((i) => ({ producto_id: i.producto_id, descripcion: i.descripcion, marca: i.marca, unidad: i.unidad, codigo: i.codigo_proveedor, cantidad: Number(i.cantidad), costo: i.costo_estimado === null ? null : Number(i.costo_estimado) }));
const totalDe = (renglones: { cantidad: number; costo: number | null }[]) => renglones.reduce((s, r) => s + r.cantidad * (r.costo ?? 0), 0);

export function Pedidos({ celular = false, alIngresar }: { celular?: boolean; alIngresar: (pedidoId: string) => void }) {
  const puedeEsto = usePuede();
  const encarga = puedeEsto("deposito.pedidos");
  const ingresa = puedeEsto("deposito.ingresos");
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<Borrador | null>(null);
  const [eligiendo, setEligiendo] = useState(false);

  const cargar = useCallback(async () => {
    try { setPedidos(await api<Pedido[]>("/pedidos")); setError(null); }
    catch (e) { setError(mensajeDe(e, "ver los pedidos")); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (encarga) api<Proveedor[]>("/proveedores").then((l) => setProveedores(l.filter((p) => p.activo))).catch(() => undefined); }, [encarga]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);

  const abierto = abiertoId ? (pedidos ?? []).find((p) => p.id === abiertoId) ?? null : null;
  const volver = (mensaje?: string) => { setAbiertoId(null); setNuevo(null); if (mensaje) setAviso(mensaje); void cargar(); };

  if (nuevo || abierto?.estado === "borrador") {
    const borrador = nuevo ?? { id: abierto!.id, proveedorId: abierto!.proveedor_id, renglones: aRenglones(abierto!) };
    const proveedor = proveedores.find((p) => p.id === borrador.proveedorId) ?? (abierto ? { id: abierto.proveedor_id, nombre: abierto.proveedor, activo: true, whatsapp: abierto.whatsapp } : null);
    if (proveedor) return <ArmarPedido key={borrador.id} inicial={borrador} proveedor={proveedor} celular={celular} alVolver={volver} />;
  }
  if (abierto) return <PedidoMandado pedido={abierto} encarga={encarga} ingresa={ingresa} alVolver={volver} alIngresar={alIngresar} />;

  const porLlegar = (pedidos ?? []).filter((p) => p.estado === "enviado" || p.estado === "recibido_parcial");
  const sinMandar = (pedidos ?? []).filter((p) => p.estado === "borrador");
  const cerrados = (pedidos ?? []).filter((p) => p.estado === "recibido" || p.estado === "cancelado" || p.estado === "cerrado_incompleto");
  const tarjeta = (p: Pedido) => {
    const faltan = p.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).length;
    const detalle = [p.enviado_en ? dia(p.enviado_en) : `armado el ${dia(p.creado_en)}`, plural(p.items.length, "renglón", "renglones"),
      p.estado === "recibido_parcial" || p.estado === "cerrado_incompleto" ? `${faltan === 1 ? "falta" : "faltan"} ${faltan}` : null,
      p.estado === "cancelado" && p.cerrado_por ? `lo canceló ${p.cerrado_por}` : p.estado === "enviado" && p.enviado_por ? `lo mandó ${p.enviado_por}` : null].filter(Boolean).join(" · ");
    return (
      <li key={p.id} className="pd-pedido" data-testid="pedido">
        <button type="button" className="pd-abrir" onClick={() => setAbiertoId(p.id)} aria-label={`Abrir el pedido a ${p.proveedor}, ${ESTADOS[p.estado]}`}>
          <span className="pd-quien"><strong>{p.proveedor}</strong><span className="pd-detalle">{detalle}</span></span>
          <span className="pd-cuanto"><strong className="pd-importe">{pesos(totalDe(aRenglones(p)))}</strong><span className={`pd-estado ${p.estado}`}>{ESTADOS[p.estado]}</span></span>
        </button>
        {ingresa && (p.estado === "enviado" || p.estado === "recibido_parcial") && (
          <button type="button" className="pd-boton fuerte" onClick={() => alIngresar(p.id)} data-testid="llego-la-mercaderia">{p.estado === "enviado" ? "Llegó la mercadería" : "Llegó el resto"}</button>
        )}
      </li>
    );
  };

  return (
    <section className="pd" data-testid="pedidos">
      <header className="pd-cabeza">
        <div className="pd-crece"><h1>Pedidos a proveedores</h1><p className="pd-bajada">Lo que se encargó y todavía no llegó, primero.</p></div>
        {encarga && <button type="button" className="pd-boton principal" onClick={() => setEligiendo(true)} data-testid="pedido-nuevo">+ Pedido nuevo</button>}
      </header>
      {aviso && <p className="pd-aviso" role="status" data-testid="mensaje-pedidos">{aviso}</p>}
      {error && <p className="pd-error" role="alert">{error} <button type="button" className="pd-boton chico" onClick={() => void cargar()}>Reintentar</button></p>}
      {!pedidos && !error && <p className="pd-bajada">Buscando los pedidos…</p>}
      {pedidos && pedidos.length === 0 && <p className="pd-vacio" data-testid="sin-pedidos">{encarga ? "Todavía no hay pedidos. Con «Pedido nuevo» elegís el proveedor y agregás lo que hay que pedirle." : "No hay pedidos esperando mercadería."}</p>}
      {porLlegar.length > 0 && <><h2>Por llegar</h2><ul className="pd-lista" data-testid="por-llegar">{porLlegar.map(tarjeta)}</ul></>}
      {sinMandar.length > 0 && <><h2>Sin mandar</h2><ul className="pd-lista" data-testid="sin-mandar">{sinMandar.map(tarjeta)}</ul></>}
      {cerrados.length > 0 && <><h2>Cerrados</h2><ul className="pd-lista" data-testid="cerrados">{cerrados.map(tarjeta)}</ul></>}
      {eligiendo && (
        <Hoja titulo="¿A qué proveedor le vas a pedir?" alCerrar={() => setEligiendo(false)} testId="elegir-proveedor">
          {proveedores.length === 0 && <p className="pd-bajada">No hay proveedores cargados. Se dan de alta en Catálogo → Listas.</p>}
          <ul className="pd-opciones">
            {proveedores.map((p) => <li key={p.id}><button type="button" className="pd-boton ancho" onClick={() => { setEligiendo(false); setNuevo({ id: crypto.randomUUID(), proveedorId: p.id, renglones: [] }); }} data-testid="proveedor-opcion">{p.nombre}</button></li>)}
          </ul>
        </Hoja>
      )}
    </section>
  );
}

function Hoja({ titulo, alCerrar, testId, children }: { titulo: string; alCerrar: () => void; testId: string; children: React.ReactNode }) {
  useEffect(() => { const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") alCerrar(); }; window.addEventListener("keydown", tecla); return () => window.removeEventListener("keydown", tecla); }, [alCerrar]);
  return (
    <div className="pd-velo" onMouseDown={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      <div className="pd-hoja" role="dialog" aria-modal="true" aria-label={titulo} data-testid={testId}>
        <div className="pd-fila"><h2 className="pd-crece">{titulo}</h2><button type="button" className="pd-boton chico" onClick={alCerrar} aria-label="Cerrar">✕</button></div>
        {children}
      </div>
    </div>
  );
}

// Armar el pedido: buscar, agregar, cambiar cantidades, quitar. Se guarda solo como borrador.
function ArmarPedido({ inicial, proveedor, celular, alVolver }: { inicial: Borrador; proveedor: Proveedor; celular: boolean; alVolver: (mensaje?: string) => void }) {
  const { catalogo, buscarProductos } = useCatalogo();
  const [renglones, setRenglones] = useState<Renglon[]>(inicial.renglones);
  const [consulta, setConsulta] = useState("");
  const [guardado, setGuardado] = useState<"si" | "guardando" | "no">("si");
  const [error, setError] = useState<string | null>(null);
  const [mandando, setMandando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const caja = useRef<HTMLInputElement>(null);
  const existe = useRef(inicial.renglones.length > 0);

  const guardar = useCallback(async (lista: Renglon[]) => {
    setGuardado("guardando");
    try {
      await api(`/pedidos/${inicial.id}`, { method: "PUT", body: JSON.stringify({ proveedor_id: proveedor.id, items: lista.map((r) => ({ producto_id: r.producto_id, cantidad: r.cantidad })) }) });
      existe.current = true; setGuardado("si"); setError(null); return true;
    } catch (e) { setGuardado("no"); setError(mensajeDe(e, "guardar el pedido")); return false; }
  }, [inicial.id, proveedor.id]);
  // Cada cambio se guarda solo, un momento después de dejar de tocar.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    const t = setTimeout(() => void guardar(renglones), 500);
    return () => clearTimeout(t);
  }, [renglones, guardar]);

  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16) as Producto[];
    const suyos = todos.filter((p) => segunProveedor(p, proveedor).costo !== null);
    return [...suyos, ...todos.filter((p) => !suyos.includes(p))].slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);

  const agregar = useCallback((p: Producto) => {
    setRenglones((l) => l.some((r) => r.producto_id === p.id)
      ? l.map((r) => (r.producto_id === p.id ? { ...r, cantidad: r.cantidad + 1 } : r))
      : [...l, { producto_id: p.id, descripcion: p.descripcion, marca: p.marca, unidad: p.unidad, cantidad: 1, ...segunProveedor(p, proveedor) }]);
    setConsulta(""); caja.current?.focus();
  }, [proveedor]);
  const cambiar = (id: string, cantidad: number) => setRenglones((l) => l.map((r) => (r.producto_id === id ? { ...r, cantidad } : r)));
  const alEscanear = useCallback((codigo: string) => {
    setEscaneando(false);
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) agregar(p as Producto); else { setConsulta(codigo); setError(`Ningún producto tiene el código ${codigo}.`); }
  }, [catalogo, agregar]);

  async function borrar() {
    if (existe.current) { try { await api(`/pedidos/${inicial.id}`, { method: "DELETE" }); } catch (e) { setError(mensajeDe(e, "borrar el borrador")); return; } }
    alVolver(`Borrador del pedido a ${proveedor.nombre} borrado.`);
  }
  async function abrirMandar() {
    if (renglones.length === 0) { setError("Agregá al menos un producto antes de mandar el pedido."); return; }
    if (await guardar(renglones)) setMandando(true);
  }
  const total = totalDe(renglones);

  return (
    <section className="pd" data-testid="armar-pedido">
      <div><button type="button" className="pd-boton chico" onClick={() => alVolver()} data-testid="volver-a-pedidos">‹ Volver a los pedidos</button></div>
      <header className="pd-cabeza">
        <div className="pd-crece"><h1>Pedido a {proveedor.nombre}</h1>
          <p className="pd-bajada" data-testid="estado-del-borrador">Borrador · {guardado === "guardando" ? "guardando…" : guardado === "no" ? "sin guardar" : "se guarda solo mientras lo armás."}</p></div>
        <button type="button" className="pd-boton peligro" onClick={() => void borrar()} data-testid="borrar-borrador">Borrar el borrador</button>
        <button type="button" className="pd-boton principal" onClick={() => void abrirMandar()} data-testid="revisar-y-mandar">Revisar y mandar</button>
      </header>
      {error && <p className="pd-error" role="alert">{error}</p>}
      <div className="pd-buscar">
        <input ref={caja} type="search" value={consulta} onChange={(e) => { setConsulta(e.target.value); setError(null); }} placeholder={catalogo ? (celular && hayCamara() ? "Buscá lo que hay que pedir, o escanealo" : "Buscá lo que hay que pedir") : "Bajando el catálogo…"} disabled={!catalogo}
          autoFocus={!celular} autoComplete="off" aria-label="Buscar un producto para agregar al pedido" data-testid="buscar-para-pedir"
          onKeyDown={(e) => { if (e.key === "Enter" && resultados[0]) { e.preventDefault(); agregar(resultados[0]); } else if (e.key === "Escape") setConsulta(""); }} />
        {celular && hayCamara() && <button type="button" className="pd-boton" onClick={() => setEscaneando(true)} aria-label="Escanear" data-testid="escanear-para-pedir">Escanear</button>}
      </div>
      {escaneando && <Escaner alDetectar={alEscanear} alCerrar={() => setEscaneando(false)} />}
      {consulta.trim() && (
        <ul className="pd-resultados" data-testid="resultados-para-pedir">
          {resultados.length === 0 && <li className="pd-bajada pd-relleno">Ningún producto coincide con «{consulta}».</li>}
          {resultados.map((p, i) => {
            const s = segunProveedor(p, proveedor);
            return (
              <li key={p.id}><button type="button" className={`pd-resultado ${i === 0 ? "primero" : ""}`} onClick={() => agregar(p)} data-testid="resultado-para-pedir">
                <span className="pd-quien"><strong>{p.descripcion}</strong><span className="pd-detalle">{[p.marca, s.codigo].filter(Boolean).join(" · ") || "sin marca"}</span></span>
                <span className="pd-detalle">{s.costo === null ? `no figura en la lista de ${proveedor.nombre}` : `${pesos(s.costo)} c/u`}</span>
              </button></li>
            );
          })}
        </ul>
      )}
      {renglones.length === 0
        ? <p className="pd-vacio" data-testid="pedido-vacio">El pedido está vacío. Buscá cada producto y tocalo (o Enter) para agregarlo.</p>
        : (
          <div className="pd-tarjeta">
            <ul className="pd-renglones">
              {renglones.map((r) => (
                <li key={r.producto_id} className="pd-renglon" data-testid="renglon-pedido">
                  <span className="pd-quien"><strong>{r.descripcion}</strong><span className="pd-detalle">{[r.marca, r.codigo, r.costo === null ? "sin costo de lista" : `${pesos(r.costo)} c/u`].filter(Boolean).join(" · ")}</span></span>
                  <Cantidad valor={r.cantidad} unidad={r.unidad} nombre={r.descripcion} alCambiar={(c) => cambiar(r.producto_id, c)} />
                  <strong className="pd-importe pd-estimado">{r.costo === null ? "—" : pesos(r.cantidad * r.costo)}</strong>
                  <button type="button" className="pd-quitar" onClick={() => setRenglones((l) => l.filter((x) => x.producto_id !== r.producto_id))} aria-label={`Quitar ${r.descripcion} del pedido`} data-testid="quitar-renglon">✕</button>
                </li>
              ))}
            </ul>
            <div className="pd-pie"><span className="pd-detalle">{plural(renglones.length, "renglón", "renglones")} · el costo sale de la última lista de {proveedor.nombre}</span>
              <span>Total estimado <strong className="pd-importe pd-total" data-testid="total-estimado">{pesos(total)}</strong></span></div>
          </div>
        )}
      {mandando && <MandarPedido id={inicial.id} proveedor={proveedor} renglones={renglones} total={total} alCerrar={() => setMandando(false)} alMandar={() => alVolver(`Pedido enviado a ${proveedor.nombre}.`)} />}
    </section>
  );
}

function Cantidad({ valor, unidad, nombre, alCambiar }: { valor: number; unidad: string; nombre: string; alCambiar: (c: number) => void }) {
  const paso = granel(unidad) ? 0.5 : 1;
  const [texto, setTexto] = useState(String(valor).replace(".", ","));
  useEffect(() => { setTexto(String(valor).replace(".", ",")); }, [valor]);
  const fijar = (crudo: string) => {
    const n = Number(crudo.replace(",", "."));
    const limpio = granel(unidad) ? Math.round(n * 10) / 10 : Math.floor(n);
    if (limpio > 0) alCambiar(limpio); else setTexto(String(valor).replace(".", ","));
  };
  return (
    <span className="pd-cantidad">
      <button type="button" onClick={() => alCambiar(Math.max(paso, Math.round((valor - paso) * 10) / 10))} aria-label={`Una menos de ${nombre}`}>−</button>
      <input inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={(e) => fijar(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
        aria-label={`Cantidad de ${nombre}${granel(unidad) ? `, en ${unidad}` : ""}`} data-testid="cantidad-pedido" />
      {granel(unidad) && <span className="pd-unidad">{unidad === "l" ? "L" : unidad}</span>}
      <button type="button" onClick={() => alCambiar(Math.round((valor + paso) * 10) / 10)} aria-label={`Una más de ${nombre}`}>+</button>
    </span>
  );
}

// «Revisar y mandar»: el mensaje tal como lo recibe el proveedor. WhatsApp lo abre ya escrito
// y deja el pedido enviado; copiarlo lo deja para mandar por otro lado y se marca a mano.
function MandarPedido({ id, proveedor, renglones, total, alCerrar, alMandar }: { id: string; proveedor: Proveedor; renglones: Renglon[]; total: number; alCerrar: () => void; alMandar: () => void }) {
  const texto = useMemo(() => textoDelPedido(renglones), [renglones]);
  const [numero, setNumero] = useState(proveedor.whatsapp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function marcar(whatsapp?: string) {
    setOcupado(true); setError(null);
    try { await api(`/pedidos/${id}/enviar`, { method: "POST", body: JSON.stringify(whatsapp ? { whatsapp } : {}) }); alMandar(); }
    catch (e) { setError(mensajeDe(e, "mandar el pedido")); setOcupado(false); }
  }
  function porWhatsApp() {
    const limpio = numero.replace(/\D/g, "");
    if (limpio.length < 8) { setError("Poné el WhatsApp del proveedor con código de país y de área, solo números: 5491155550101."); return; }
    window.open(`https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
    void marcar(limpio === (proveedor.whatsapp ?? "") ? undefined : limpio);
  }
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setError(null); }
    catch { setError("No se pudo copiar solo: seleccioná el texto del mensaje y copialo a mano."); setCopiado(true); }
  }
  return (
    <Hoja titulo={`Mandar el pedido a ${proveedor.nombre}`} alCerrar={alCerrar} testId="hoja-mandar">
      <pre className="pd-mensaje" data-testid="mensaje-pedido">{texto}</pre>
      <p className="pd-detalle">Sin costos: el proveedor cotiza a su precio. Total estimado para vos: <strong>{pesos(total)}</strong>.</p>
      <label className="pd-campo">
        <span>WhatsApp de {proveedor.nombre}{proveedor.whatsapp ? "" : " · se guarda para la próxima"}</span>
        <input inputMode="tel" value={numero} onChange={(e) => { setNumero(e.target.value); setError(null); }} placeholder="5491155550101" autoComplete="off" data-testid="whatsapp-proveedor" />
      </label>
      {error && <p className="pd-error" role="alert">{error}</p>}
      <div className="pd-fila">
        <button type="button" className="pd-boton wa pd-crece" disabled={ocupado} onClick={porWhatsApp} data-testid="mandar-whatsapp">Mandar por WhatsApp</button>
        <button type="button" className="pd-boton pd-crece" disabled={ocupado} onClick={() => void copiar()} data-testid="copiar-texto">Copiar el texto</button>
      </div>
      {copiado && <button type="button" className="pd-boton fuerte ancho" disabled={ocupado} onClick={() => void marcar()} data-testid="marcar-enviado">Ya lo mandé: marcarlo como enviado</button>}
      <p className="pd-detalle">{copiado ? "Texto copiado. Pegalo donde se lo mandes al proveedor y después marcalo como enviado." : "Al mandarlo queda «Enviado», con tu nombre y la fecha."}</p>
    </Hoja>
  );
}

// Un pedido que ya se mandó: qué se pidió, qué llegó y qué falta.
function PedidoMandado({ pedido: p, encarga, ingresa, alVolver, alIngresar }: { pedido: Pedido; encarga: boolean; ingresa: boolean; alVolver: (mensaje?: string) => void; alIngresar: (id: string) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const espera = p.estado === "enviado" || p.estado === "recibido_parcial";
  const renglones = aRenglones(p);
  async function cerrar(accion: "cancelar" | "cerrar", mensaje: string) {
    try { await api(`/pedidos/${p.id}/${accion}`, { method: "POST", body: "{}" }); alVolver(mensaje); }
    catch (e) { setError(mensajeDe(e, accion === "cancelar" ? "cancelar el pedido" : "cerrar el pedido")); }
  }
  const quien = [p.enviado_en ? `Mandado el ${dia(p.enviado_en)}${p.enviado_por ? ` por ${p.enviado_por}` : ""}` : null,
    p.cerrado_en && p.estado !== "recibido" ? `${p.estado === "cancelado" ? "cancelado" : "cerrado"} el ${dia(p.cerrado_en)}${p.cerrado_por ? ` por ${p.cerrado_por}` : ""}` : null].filter(Boolean).join(" · ");
  return (
    <section className="pd" data-testid="pedido-abierto">
      <div><button type="button" className="pd-boton chico" onClick={() => alVolver()} data-testid="volver-a-pedidos">‹ Volver a los pedidos</button></div>
      <header className="pd-cabeza">
        <div className="pd-crece"><h1>Pedido a {p.proveedor}</h1><p className="pd-bajada"><span className={`pd-estado ${p.estado}`} data-testid="estado-pedido">{ESTADOS[p.estado]}</span> {quien}</p></div>
        {ingresa && espera && <button type="button" className="pd-boton fuerte" onClick={() => alIngresar(p.id)} data-testid="llego-la-mercaderia">{p.estado === "enviado" ? "Llegó la mercadería" : "Llegó el resto"}</button>}
      </header>
      {error && <p className="pd-error" role="alert">{error}</p>}
      <div className="pd-tarjeta">
        <ul className="pd-renglones">
          {p.items.map((i) => {
            const pedido = Number(i.cantidad), llego = Number(i.recibido), resta = Math.max(0, Math.round((pedido - llego) * 1000) / 1000);
            return (
              <li key={i.producto_id} className="pd-renglon mandado" data-testid="renglon-pedido">
                <span className="pd-quien"><strong>{i.descripcion}</strong><span className="pd-detalle">{[i.marca, i.codigo_proveedor].filter(Boolean).join(" · ")}</span></span>
                <span className="pd-cuentas">
                  <span>Pedido <strong>{cantidadConUnidad(pedido, i.unidad)}</strong></span>
                  {p.estado !== "enviado" && p.estado !== "cancelado" && <span>Llegó <strong>{cantidadConUnidad(llego, i.unidad)}</strong></span>}
                  {resta > 0 && p.estado !== "enviado" && p.estado !== "cancelado" && <span className="pd-resta">Falta <strong>{cantidadConUnidad(resta, i.unidad)}</strong></span>}
                </span>
              </li>
            );
          })}
        </ul>
        {encarga && <div className="pd-pie"><span className="pd-detalle">{plural(p.items.length, "renglón", "renglones")}</span><span>Total estimado <strong className="pd-importe pd-total">{pesos(totalDe(renglones))}</strong></span></div>}
      </div>
      {encarga && (
        <div className="pd-fila">
          <button type="button" className="pd-boton" onClick={() => { void navigator.clipboard?.writeText(textoDelPedido(renglones, new Date(p.enviado_en ?? p.creado_en))).then(() => setCopiado(true)).catch(() => setError("No se pudo copiar el texto.")); }} data-testid="copiar-texto">{copiado ? "Texto copiado" : "Copiar el texto del pedido"}</button>
          {p.estado === "enviado" && <button type="button" className="pd-boton peligro" onClick={() => void cerrar("cancelar", `Pedido a ${p.proveedor} cancelado.`)} data-testid="cancelar-pedido">Cancelar el pedido</button>}
          {p.estado === "recibido_parcial" && <button type="button" className="pd-boton peligro" onClick={() => void cerrar("cerrar", `Pedido a ${p.proveedor} cerrado incompleto.`)} data-testid="cerrar-pedido">El resto no va a llegar: cerrarlo</button>}
        </div>
      )}
    </section>
  );
}

// ---------- El ingreso de mercadería desde un pedido (RF-50) ----------
// El pedido que se está ingresando viaja en la dirección (…?pedido=<id>). Lo leen los dos
// ingresos, el del celular y el de la computadora, para precargar el proveedor y lo que falta llegar.
const pedidoDeLaDireccion = () => new URLSearchParams(location.hash.split("?")[1] ?? "").get("pedido");
export function usePedidoAIngresar(): { pedido: Pedido | null; error: string | null } {
  const [id, setId] = useState(pedidoDeLaDireccion);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const alCambiar = () => setId(pedidoDeLaDireccion()); window.addEventListener("hashchange", alCambiar); return () => window.removeEventListener("hashchange", alCambiar); }, []);
  useEffect(() => {
    if (!id) { setPedido(null); setError(null); return; }
    let vigente = true;
    api<Pedido>(`/pedidos/${id}`).then((p) => { if (vigente) { setPedido(p.estado === "enviado" || p.estado === "recibido_parcial" ? p : null); setError(p.estado === "enviado" || p.estado === "recibido_parcial" ? null : "Ese pedido ya no espera mercadería."); } })
      .catch((e) => { if (vigente) setError(mensajeDe(e, "traer el pedido")); });
    return () => { vigente = false; };
  }, [id]);
  return { pedido, error };
}

// Lo que falta llegar de un pedido, como renglones del ingreso: la cantidad que resta y el
// costo de la lista, para que quien recibe corrija solo lo que llegó distinto.
export function renglonesDelPedido(pedido: Pedido, catalogo: Producto[]) {
  return pedido.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).map((i) => {
    const producto = catalogo.find((p) => p.id === i.producto_id) ?? null;
    const costo = i.costo_estimado === null ? null : Number(i.costo_estimado);
    return { clave: crypto.randomUUID(), producto, descripcion: i.descripcion, cantidad: Math.round((Number(i.cantidad) - Number(i.recibido)) * 1000) / 1000, costo, costoTexto: costo === null ? "" : String(costo).replace(".", ","), costoLista: costo };
  });
}

export function AvisoDePedido({ pedido, error }: { pedido: Pedido | null; error: string | null }) {
  if (error) return <p className="pd-error" role="alert">{error}</p>;
  if (!pedido) return null;
  return <p className="pd-aviso" role="status" data-testid="ingreso-de-pedido">Mercadería del pedido a {pedido.proveedor}{pedido.enviado_en ? ` del ${dia(pedido.enviado_en)}` : ""}. Está cargado lo que falta llegar: corregí lo que haya llegado distinto y quitá lo que no vino.</p>;
}

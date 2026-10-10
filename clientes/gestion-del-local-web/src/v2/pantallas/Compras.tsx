import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { api } from "../../api";
import { useCatalogo } from "../../catalogo";
import { fecha, pesos, porcentaje } from "../../formato";
import { cantidadValida, enteras, unidadDe, type Unidad } from "../../unidades";
import { Escaner, hayCamara } from "../../componentes/Escaner";
import { Aviso, Boton, Contador, Exito, Explicado, Hoja, Icono, Pagina, Pastilla, Plegable, Progreso, Segmentos, Toast, Vacio, numero as cifra, pesosCortos } from "../ui";
import { useEsCelular } from "../vista";
import { BuscadorDeProducto, detalleDe, mensajeDe, plural, useEnLinea, type Producto } from "./deposito-comun";
import "../estilos/compras.css";

// Ingreso de mercadería: proveedor y comprobante, renglones con la búsqueda de siempre, y
// registrar. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.
// Abajo, las compras recientes (se despliegan y se anulan) y los gastos de la semana.
type Proveedor = { id: string; nombre: string; activo: boolean };
type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };
type Comprobante = "factura" | "remito" | "sin_comprobante";
type CompraFila = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; total: string; estado: string; proveedor: string; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[] };
type Semana = { desde: string; por_proveedor: { proveedor: string; total: string; compras: string }[]; total: number };
type Borrador = { proveedorId: string; comprobante: Comprobante; numero: string; fechaCompra: string; renglones: Renglon[] };

const COMPROBANTES: { valor: Comprobante; nombre: string }[] = [{ valor: "factura", nombre: "Factura" }, { valor: "remito", nombre: "Remito" }, { valor: "sin_comprobante", nombre: "Sin comprobante" }];
const CLAVE_BORRADOR = "ferre.v2.ingreso";
// La fecha del día según el reloj del local, no la de Greenwich (a la noche ya es mañana).
const hoy = () => new Date().toLocaleDateString("sv-SE");

// Un ingreso a medio cargar sobrevive a una recarga o a un corte: queda en el dispositivo
// hasta que se registra o se descarta.
function leerBorrador(): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) ?? "null") as Borrador | null;
    return b && Array.isArray(b.renglones) && b.renglones.length > 0 ? b : null;
  } catch { return null; }
}

const diferencia = (r: Renglon) => (r.costo !== null && r.costoLista !== null && r.costoLista > 0 ? ((r.costo - r.costoLista) / r.costoLista) * 100 : null);
const incompleto = (r: Renglon) => r.costo === null || !r.descripcion.trim() || r.cantidad <= 0;

export function Compras() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const { catalogo, error: errorCatalogo, buscarProductos } = useCatalogo();
  const [borrador] = useState(leerBorrador);
  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [proveedorId, setProveedorId] = useState(borrador?.proveedorId ?? "");
  const [comprobante, setComprobante] = useState<Comprobante>(borrador?.comprobante ?? "factura");
  const [numero, setNumero] = useState(borrador?.numero ?? "");
  const [fechaCompra, setFechaCompra] = useState(borrador?.fechaCompra ?? hoy());
  const [consulta, setConsulta] = useState("");
  const [renglones, setRenglones] = useState<Renglon[]>(borrador?.renglones ?? []);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [version, setVersion] = useState(0);
  const [eligiendoProveedor, setEligiendoProveedor] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);
  const [descartado, setDescartado] = useState<Renglon[] | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [exito, setExito] = useState<{ total: number; proveedor: string; detalle: string } | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const zona = useRef<HTMLDivElement>(null);
  const focoPedido = useRef<string | null>(null);
  const lista = useRef(renglones);
  lista.current = renglones;
  const id = useId();

  useEffect(() => { api<Proveedor[]>("/proveedores").then((p) => setProveedores(p.filter((x) => x.activo))).catch(() => setProveedores([])); }, []);
  const proveedor = proveedores?.find((p) => p.id === proveedorId) ?? null;

  useEffect(() => {
    try {
      if (renglones.length) localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ proveedorId, comprobante, numero, fechaCompra, renglones } satisfies Borrador));
      else localStorage.removeItem(CLAVE_BORRADOR);
    } catch { /* sin lugar o sin permiso: se sigue sin borrador */ }
  }, [proveedorId, comprobante, numero, fechaCompra, renglones]);
  // Lo que respondió el servidor deja de valer en cuanto se toca lo cargado.
  useEffect(() => { setError(null); }, [proveedorId, comprobante, numero, fechaCompra, renglones]);

  // Primero los productos del proveedor elegido; después el resto.
  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, 16);
    return proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)].slice(0, 8) : todos.slice(0, 8);
  }, [buscarProductos, consulta, proveedor]);

  const agregar = useCallback((p: Producto | null, libre?: string) => {
    const ya = p ? lista.current.find((r) => r.producto?.id === p.id) : undefined;
    const clave = ya?.clave ?? crypto.randomUUID();
    const costoLista = p && p.costo_neto !== null ? Number(p.costo_neto) : null;
    setRenglones((l) => ya
      ? l.map((r) => (r.clave === clave ? { ...r, cantidad: r.cantidad + 1 } : r))
      : [...l, { clave, producto: p, descripcion: p?.descripcion ?? libre ?? "", cantidad: 1, costo: costoLista, costoTexto: costoLista === null ? "" : String(costoLista).replace(".", ","), costoLista }]);
    setConsulta(""); setErrorCodigo(null); setDescartado(null);
    focoPedido.current = clave;
    return ya ? ya.cantidad + 1 : 1;
  }, []);
  const cambiar = (clave: string, c: Partial<Renglon>) => setRenglones((l) => l.map((r) => (r.clave === clave ? { ...r, ...c } : r)));
  const quitar = (clave: string) => { setRenglones((l) => l.filter((r) => r.clave !== clave)); caja.current?.focus(); };

  // Después de agregar: en la computadora el foco pasa solo a la cantidad; en el celular
  // alcanza con dejar el renglón a la vista (abrir el teclado taparía la lista).
  useEffect(() => {
    const clave = focoPedido.current;
    if (!clave) return;
    focoPedido.current = null;
    const fila = zona.current?.querySelector<HTMLElement>(`[data-clave="${clave}"]`);
    if (esCelular) fila?.scrollIntoView({ block: "nearest" });
    else fila?.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
  }, [renglones, esCelular]);

  // Enter termina el renglón: de la cantidad al costo si falta, y si no de vuelta al buscador.
  function teclasDeRenglon(e: KeyboardEvent<HTMLElement>, r: Renglon) {
    if (e.key !== "Enter") return;
    const campo = (e.target as HTMLElement).dataset.testid;
    if (campo !== "cantidad" && campo !== "costo" && campo !== "descripcion-nueva") return;
    e.preventDefault();
    const fila = e.currentTarget;
    if (campo === "descripcion-nueva") fila.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
    else if (campo === "cantidad" && r.costo === null) fila.querySelector<HTMLInputElement>("[data-testid='costo']")?.focus();
    else caja.current?.focus();
  }

  // Escanear agrega el renglón y deja la cámara lista para el siguiente.
  const alDetectar = useCallback((codigo: string) => {
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) { const n = agregar(p); setUltimoEscaneado(`Agregado: ${p.descripcion}${n > 1 ? ` (van ${n})` : ""}. Escaneá el siguiente.`); }
    else { setEscaneando(false); setUltimoEscaneado(null); setErrorCodigo(`El código ${codigo} no está en el catálogo. Buscá el producto por su nombre; si no existe, lo agregás como producto nuevo.`); caja.current?.focus(); }
  }, [catalogo, agregar]);

  const total = renglones.reduce((s, r) => s + (r.costo ?? 0) * r.cantidad, 0);
  const incompletos = renglones.filter(incompleto).length;
  // Lo que falta para poder registrar. Se calcula de lo cargado: al corregirlo, desaparece.
  const faltaProveedor = intento && !proveedorId;
  const problema = !intento ? null
    : !proveedorId ? "Falta elegir el proveedor."
    : incompletos ? `${incompletos === 1 ? "Hay un renglón sin" : `Hay ${incompletos} renglones sin`} costo o sin descripción: están marcados, completalos para registrar.`
    : null;

  async function registrar() {
    if (ocupado || !enLinea) return;
    setIntento(true);
    if (!proveedorId) { if (esCelular) setEligiendoProveedor(true); else selector.current?.focus(); return; }
    if (renglones.length === 0) return;
    if (incompletos) { zona.current?.querySelector<HTMLElement>("[aria-invalid='true'], .falta input")?.focus(); return; }
    setOcupado(true); setError(null);
    try {
      const r = await api<{ total: number; productos_nuevos: number; costos_actualizados: number }>("/compras", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(), proveedor_id: proveedorId, fecha: fechaCompra, comprobante_tipo: comprobante, comprobante_numero: comprobante === "sin_comprobante" ? null : numero.trim() || null,
          items: renglones.map((x) => ({ producto_id: x.producto?.id ?? null, descripcion: x.descripcion.trim(), cantidad: x.cantidad, costo_unitario: x.costo })),
        }),
      });
      const n = renglones.length;
      setExito({
        total: r.total, proveedor: proveedor?.nombre ?? "",
        detalle: `${plural(n, "renglón sumado", "renglones sumados")} al stock · ${plural(r.costos_actualizados, "costo actualizado", "costos actualizados")} según el comprobante${r.productos_nuevos ? ` · ${plural(r.productos_nuevos, "producto nuevo", "productos nuevos")}` : ""}.`,
      });
      setRenglones([]); setNumero(""); setIntento(false); setDescartado(null); setVersion((v) => v + 1);
    } catch (e) {
      setError(mensajeDe(e, "No se registró: se cortó la conexión y registrar un ingreso necesita internet. Lo cargado sigue acá; probá de nuevo cuando vuelva."));
    } finally {
      setOcupado(false);
    }
  }

  function descartar() { setDescartado(renglones); setRenglones([]); setIntento(false); caja.current?.focus(); }

  const pasosDelTotal = [
    ...renglones.slice(0, 12).map((r) => `${r.descripcion || "Producto nuevo"}: ${cifra(r.cantidad)} × ${r.costo === null ? "sin costo" : pesos(r.costo)} = ${pesos((r.costo ?? 0) * r.cantidad)}`),
    ...(renglones.length > 12 ? [`…y ${renglones.length - 12} renglones más.`] : []),
    `Total sin IVA: ${pesos(total)}`,
  ];

  const campoCantidad = (r: Renglon) => {
    const unidad = unidadDe(r.producto);
    return (
      <span className="compras-cantidad">
        {enteras(unidad)
          ? <Contador valor={r.cantidad} entera sinBotones={!esCelular} alCambiar={(v) => cambiar(r.clave, { cantidad: Math.floor(v) })} etiqueta={`Cantidad de ${r.descripcion || "producto nuevo"}`} />
          : <CantidadAGranel valor={r.cantidad} unidad={unidad} conBotones={esCelular} alCambiar={(v) => cambiar(r.clave, { cantidad: v })} etiqueta={`Cantidad de ${r.descripcion}, en ${unidad}`} />}
        {!enteras(unidad) && <span className="detalle">{unidad}</span>}
      </span>
    );
  };
  const campoCosto = (r: Renglon) => (
    <label className={`con-prefijo compras-costo ${r.costo === null ? "falta" : ""}`}>
      <span aria-hidden="true">$</span>
      <input inputMode="decimal" placeholder="costo" value={r.costoTexto} aria-label={`Costo unitario sin IVA de ${r.descripcion || "producto nuevo"}`} aria-invalid={intento && r.costo === null ? true : undefined} onFocus={(e) => e.target.select()}
        onChange={(e) => { const t = e.target.value.replace(/[^\d,.]/g, ""); const v = Number(t.replace(",", ".")); cambiar(r.clave, { costoTexto: t, costo: t === "" || !Number.isFinite(v) ? null : v }); }} data-testid="costo" />
    </label>
  );
  const segunLista = (r: Renglon) => {
    const dif = diferencia(r);
    if (r.costoLista === null) return <span className="detalle">{r.producto ? "sin costo de lista" : "no tiene lista"}</span>;
    if (dif === null || Math.abs(dif) < 0.05) return <span className="detalle">{dif === null ? `lista ${pesos(r.costoLista)}` : `igual que la lista (${pesos(r.costoLista)})`}</span>;
    return (
      <span className="compras-segun-lista">
        <span className="detalle">lista {pesos(r.costoLista)}</span>
        <Explicado className={`deposito-dif ${dif > 0 ? "falta" : "sobra"}`} valor={`${porcentaje(dif)} ${dif > 0 ? "subió" : "bajó"}`} titulo="Diferencia contra la lista" pasos={[
          `Costo según la lista${r.producto?.proveedor ? ` de ${r.producto.proveedor}` : ""}: ${pesos(r.costoLista)}`,
          `Costo del comprobante: ${pesos(r.costo)}`,
          `${pesos(r.costo)} contra ${pesos(r.costoLista)}: ${dif > 0 ? "subió" : "bajó"} ${porcentaje(Math.abs(dif)).replace("+", "")}. Al registrar, el costo del comprobante pasa a ser el vigente.`,
        ]} />
      </span>
    );
  };
  const nombreDe = (r: Renglon) => r.producto
    ? <><span className="nombre">{r.descripcion}</span><span className="detalle compras-bajo-nombre">{detalleDe(r.producto) || "Sin marca ni proveedor"}</span></>
    : (
      <span className="compras-nuevo">
        <Pastilla tipo="azul" sinPunto>Producto nuevo</Pastilla>
        <input className="entrada" value={r.descripcion} placeholder="Descripción del producto nuevo" aria-label="Descripción del producto nuevo" aria-invalid={!r.descripcion.trim()} onChange={(e) => cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />
      </span>
    );
  const botonQuitar = (r: Renglon) => <Boton tam={esCelular ? undefined : "chico"} icono="cerrar" aria-label={`Quitar ${r.descripcion || "el producto nuevo"}`} onClick={() => quitar(r.clave)} data-testid="quitar" />;

  return (
    <Pagina titulo="Compras" testId="pantalla-compras" className={renglones.length ? "deposito-con-pie" : ""} bajada="Acá se carga la mercadería que llega. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.">
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea ? "Sin conexión: registrar un ingreso necesita internet. Podés seguir cargando; lo cargado queda guardado en este dispositivo hasta que vuelva." : null}</Aviso>
      <Aviso tipo="error">{errorCatalogo}</Aviso>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />

      <section className="compras-ingreso" aria-labelledby={`${id}-titulo`}>
        <h2 id={`${id}-titulo`} className="seccion-titulo">Ingreso de mercadería</h2>
        <div className="compras-datos">
          <div className="campo compras-proveedor">
            <label htmlFor={`${id}-proveedor`}>Proveedor</label>
            {esCelular ? (
              <button type="button" id={`${id}-proveedor`} className={`selector compras-elegir ${proveedor ? "" : "sin-elegir"}`} onClick={() => setEligiendoProveedor(true)} aria-haspopup="dialog" aria-invalid={faltaProveedor || undefined} aria-describedby={faltaProveedor ? `${id}-falta-proveedor` : undefined} data-testid="proveedor">
                <span className="corta">{proveedor ? proveedor.nombre : "Elegí el proveedor"}</span><Icono nombre="abajo" tam={18} />
              </button>
            ) : (
              <select ref={selector} id={`${id}-proveedor`} className="selector" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} autoFocus={!proveedorId} aria-invalid={faltaProveedor || undefined} aria-describedby={faltaProveedor ? `${id}-falta-proveedor` : undefined} data-testid="proveedor">
                <option value="">{proveedores === null ? "Trayendo los proveedores…" : "Elegí el proveedor"}</option>
                {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
            {faltaProveedor && <p className="compras-falta" id={`${id}-falta-proveedor`} role="alert">Elegí de qué proveedor llegó.</p>}
          </div>
          <div className="campo" data-testid="comprobante">
            <span id={`${id}-comprobante`}>Comprobante</span>
            <Segmentos opciones={COMPROBANTES} actual={comprobante} alElegir={setComprobante} etiqueta="Comprobante" />
          </div>
          {comprobante !== "sin_comprobante" && (
            <label className="campo compras-numero"><span>Número</span><input className="entrada" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0001-00012345" inputMode="numeric" autoComplete="off" data-testid="numero" /></label>
          )}
          <label className="campo compras-fecha"><span>Fecha</span><input className="entrada" type="date" value={fechaCompra} max={hoy()} onChange={(e) => setFechaCompra(e.target.value || hoy())} data-testid="fecha" /></label>
        </div>

        <BuscadorDeProducto consulta={consulta} alCambiar={(v) => { setConsulta(v); setErrorCodigo(null); }} resultados={resultados} alElegir={(p) => agregar(p)} alCrear={(d) => agregar(null, d)} cajaRef={caja}
          placeholder={!catalogo ? "Bajando el catálogo…" : esCelular ? "Producto que llegó" : "Escribí el producto que llegó"} disabled={!catalogo} alEscanear={esCelular && hayCamara() ? () => { setUltimoEscaneado(null); setEscaneando(true); } : undefined}
          aLaDerecha={(p) => <span className="importe chico">{p.costo_neto === null ? "sin costo" : pesos(p.costo_neto)}</span>} />
        {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo de productos…" />}
        <Aviso tipo="error" testId="codigo-desconocido">{errorCodigo}</Aviso>
        {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} ultimo={ultimoEscaneado} />}

        <Aviso tipo="info" accion={<Boton tam="chico" icono="deshacer" onClick={() => { if (descartado) setRenglones(descartado); setDescartado(null); }} data-testid="deshacer-descarte">Deshacer</Boton>}>
          {descartado && renglones.length === 0 ? `Descartaste el ingreso (${plural(descartado.length, "renglón", "renglones")}).` : null}
        </Aviso>

        <div ref={zona}>
          {renglones.length === 0 ? (
            <Vacio icono="compras" titulo={proveedor ? "Buscá el primer producto que llegó" : "Elegí el proveedor y buscá el primer producto"}>
              El costo viene de la última lista del proveedor: en el caso común solo ponés la cantidad. Si el comprobante dice otro costo, escribilo y pasa a ser el vigente.
            </Vacio>
          ) : esCelular ? (
            <ul className="compras-tarjetas" data-testid="renglones">
              {renglones.map((r) => (
                <li key={r.clave} className={`tarjeta compras-tarjeta ${incompleto(r) ? "incompleto" : ""}`} data-clave={r.clave} data-testid="renglon" onKeyDown={(e) => teclasDeRenglon(e, r)}>
                  <div className="compras-tarjeta-cabeza"><div className="crece">{nombreDe(r)}</div>{botonQuitar(r)}</div>
                  <div className="compras-tarjeta-campos">
                    <div className="campo"><span>Cantidad</span>{campoCantidad(r)}</div>
                    <div className="campo"><span>Costo sin IVA</span>{campoCosto(r)}</div>
                  </div>
                  <div className="compras-tarjeta-pie">
                    {r.costo === null ? <span className="falta-texto">Falta el costo</span> : segunLista(r)}
                    <span className="importe chico">{r.costo === null ? "" : pesosCortos(r.costo * r.cantidad)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="tabla-marco">
              <table className="tabla compras-tabla" data-testid="renglones">
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario sin IVA</th><th>Según la lista</th><th className="num">Subtotal</th><th><span className="solo-lectores">Quitar</span></th></tr></thead>
                <tbody>
                  {renglones.map((r) => (
                    <tr key={r.clave} className={incompleto(r) ? "incompleto" : ""} data-clave={r.clave} data-testid="renglon" onKeyDown={(e) => teclasDeRenglon(e, r)}>
                      <td>{nombreDe(r)}</td>
                      <td className="angosta">{campoCantidad(r)}</td>
                      <td className="angosta">{campoCosto(r)}{r.costo === null && <span className="falta-texto compras-bajo-nombre">Falta el costo</span>}</td>
                      <td>{segunLista(r)}</td>
                      <td className="num"><span className="importe chico">{r.costo === null ? "—" : pesosCortos(r.costo * r.cantidad)}</span></td>
                      <td className="angosta">{botonQuitar(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {renglones.length > 0 && <p className="detalle solo-compu">Enter en la cantidad vuelve al buscador. El costo viene de la última lista: si el comprobante dice otro, escribilo y pasa a ser el vigente.</p>}
        {renglones.length > 0 && <div className="solo-celu"><Boton variante="peligro" icono="basura" onClick={descartar} data-testid="descartar-celular">Descartar el ingreso</Boton></div>}
      </section>

      {renglones.length > 0 && (
        <div className="deposito-pie compras-pie">
          <div className="compras-total">
            <span className="rotulo">Total sin IVA<span className="solo-compu"> · {plural(renglones.length, "renglón", "renglones")}</span></span>
            <span className="importe" data-testid="total"><Explicado valor={pesosCortos(total)} titulo="De dónde sale el total" pasos={pasosDelTotal} /></span>
          </div>
          <div className="compras-pie-aviso" aria-live="polite">
            {(problema ?? error) && <span className="compras-falta" role="alert" data-testid="error-ingreso">{problema ?? error}</span>}
          </div>
          <Boton className="solo-compu" onClick={descartar} disabled={ocupado} data-testid="descartar">Descartar</Boton>
          <Boton variante="principal" tam="grande" onClick={() => void registrar()} disabled={ocupado || !enLinea} data-testid={esCelular ? "registrar" : "confirmar"}>
            {ocupado ? "Registrando…" : "Registrar ingreso"}
          </Boton>
        </div>
      )}

      <div className="compras-historia">
        <ComprasRecientes version={version} enLinea={enLinea} esCelular={esCelular} alAnular={(texto) => { setMensaje(texto); setVersion((v) => v + 1); }} />
        <GastosDeLaSemana version={version} />
      </div>

      {eligiendoProveedor && (
        <ElegirProveedor proveedores={proveedores} elegido={proveedorId} alElegir={(idElegido) => { setProveedorId(idElegido); setEligiendoProveedor(false); }} alCerrar={() => setEligiendoProveedor(false)} />
      )}
      {exito && <Exito que="Ingreso registrado" importe={pesosCortos(exito.total)} medio={exito.proveedor} detalle={exito.detalle} boton="Listo" alCerrar={() => { setExito(null); caja.current?.focus(); }} />}
    </Pagina>
  );
}

// Cantidad a granel (kilo, metro, litro): hasta un decimal, con coma. Guarda lo tipeado
// para que la coma no desaparezca mientras se escribe «2,5».
function CantidadAGranel({ valor, unidad, alCambiar, conBotones, etiqueta }: { valor: number; unidad: Unidad; alCambiar: (v: number) => void; conBotones: boolean; etiqueta: string }) {
  const escrito = (v: number) => (v === 0 ? "" : String(v).replace(".", ","));
  const [texto, setTexto] = useState(escrito(valor));
  useEffect(() => { setTexto((t) => (cantidadValida(t, unidad) === valor ? t : escrito(valor))); }, [valor, unidad]);
  const redondo = (v: number) => Math.round(v * 10) / 10;
  return (
    <div className="contador">
      {conBotones && <button type="button" aria-label="Medio menos" onClick={() => alCambiar(Math.max(0.1, redondo(valor - 0.5)))}><Icono nombre="menos" tam={18} grosor={2.4} /></button>}
      <input inputMode="decimal" aria-label={etiqueta} value={texto} onFocus={(e) => e.target.select()}
        onChange={(e) => { const t = e.target.value.replace(/[^\d,.]/g, ""); setTexto(t); alCambiar(cantidadValida(t, unidad)); }}
        onBlur={() => { if (valor === 0) alCambiar(1); else setTexto(escrito(valor)); }} data-testid="cantidad" />
      {conBotones && <button type="button" aria-label="Medio más" onClick={() => alCambiar(redondo(valor + 0.5))}><Icono nombre="mas" tam={18} grosor={2.4} /></button>}
    </div>
  );
}

function ElegirProveedor({ proveedores, elegido, alElegir, alCerrar }: { proveedores: Proveedor[] | null; elegido: string; alElegir: (id: string) => void; alCerrar: () => void }) {
  const [filtro, setFiltro] = useState("");
  const visibles = (proveedores ?? []).filter((p) => p.nombre.toLocaleLowerCase("es").includes(filtro.trim().toLocaleLowerCase("es")));
  return (
    <Hoja titulo="¿De qué proveedor llegó?" alCerrar={alCerrar} testId="hoja-proveedores">
      {(proveedores?.length ?? 0) > 8 && <input className="entrada" type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Escribí parte del nombre" aria-label="Buscar proveedor" />}
      {proveedores === null && <Progreso texto="Trayendo los proveedores…" />}
      {proveedores?.length === 0 && <Aviso tipo="alerta">No se pudieron traer los proveedores. Revisá la conexión, cerrá esta ventana y volvé a abrirla.</Aviso>}
      {visibles.length > 0 && (
        <ul className="lista">
          {visibles.map((p) => (
            <li key={p.id}>
              <button type="button" className={`renglon ${p.id === elegido ? "elegido" : ""}`} aria-pressed={p.id === elegido} onClick={() => alElegir(p.id)} data-testid="opcion-proveedor">
                <span className="nombre">{p.nombre}</span>{p.id === elegido && <Icono nombre="tilde" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {proveedores && proveedores.length > 0 && visibles.length === 0 && <p className="detalle">Ningún proveedor con «{filtro.trim()}».</p>}
    </Hoja>
  );
}

const nombreComprobante = (c: CompraFila) => (c.comprobante_tipo === "sin_comprobante" ? "Sin comprobante" : `${c.comprobante_tipo === "factura" ? "Factura" : "Remito"} ${c.comprobante_numero ?? "sin número"}`);

// Las últimas compras. Cada una se despliega para ver sus renglones y se puede anular; anular
// no se deshace, por eso pide confirmación con el motivo ahí mismo.
function ComprasRecientes({ version, enLinea, esCelular, alAnular }: { version: number; enLinea: boolean; esCelular: boolean; alAnular: (mensaje: string) => void }) {
  const [filas, setFilas] = useState<CompraFila[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [anulando, setAnulando] = useState<CompraFila | null>(null);
  const cargar = useCallback(() => api<CompraFila[]>("/compras").then((f) => { setFilas(f); setError(null); })
    .catch((e) => setError(mensajeDe(e, "Sin conexión: las compras recientes se ven cuando vuelve internet."))), []);
  useEffect(() => { void cargar(); }, [cargar, version]);
  useEffect(() => { if (enLinea && error) void cargar(); }, [enLinea, error, cargar]);
  const alternar = (id: string) => setAbiertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  // Flechas recorren las compras; Supr anula la que tiene el foco.
  function teclas(e: KeyboardEvent<HTMLButtonElement>, c: CompraFila) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const todos = [...(e.currentTarget.closest("table")?.querySelectorAll<HTMLButtonElement>("[data-abre-compra]") ?? [])];
      const destino = todos[todos.indexOf(e.currentTarget) + (e.key === "ArrowDown" ? 1 : -1)];
      if (destino) { e.preventDefault(); destino.focus(); }
    } else if (e.key === "Delete" && c.estado !== "anulada") { e.preventDefault(); setAnulando(c); }
  }

  return (
    <Plegable titulo="Compras recientes" extra={filas?.length ? plural(filas.length, "compra", "compras") : undefined} testId="compras-recientes" relleno={false}>
      <div className="compras-recientes">
        <Aviso tipo="alerta" accion={<Boton tam="chico" icono="repetir" onClick={() => void cargar()}>Reintentar</Boton>}>{error}</Aviso>
        {filas === null && !error && <div className="compras-cargando" aria-busy="true"><span className="solo-lectores">Trayendo las compras…</span><div className="esqueleto" /><div className="esqueleto" /><div className="esqueleto" /></div>}
        {filas?.length === 0 && <p className="detalle compras-sin-compras">No hay compras registradas. La primera aparece acá cuando registres un ingreso de mercadería.</p>}
        {filas && filas.length > 0 && (esCelular ? (
          <ul className="compras-lista">
            {filas.map((c) => {
              const anulada = c.estado === "anulada";
              const abierta = abiertas.has(c.id);
              return (
                <li key={c.id} className={anulada ? "anulada" : ""} data-testid="compra-reciente">
                  <button type="button" className="renglon" onClick={() => alternar(c.id)} aria-expanded={abierta}>
                    <span className="nombre">{c.proveedor}</span>
                    <span className="importe chico tachable">{pesosCortos(c.total)}</span>
                    <span className="detalle compras-linea">
                      <span className={`compras-flecha ${abierta ? "abierta" : ""}`} aria-hidden="true"><Icono nombre="derecha" tam={14} grosor={2.6} /></span>
                      <span className="crece">{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}{anulada && <> <Pastilla tipo="mal">Anulada</Pastilla></>}</span>
                    </span>
                  </button>
                  {abierta && (
                    <div className="compras-abierta">
                      <ul className="compras-items">
                        {c.items.map((i, n) => (
                          <li key={n}><span>{cifra(Number(i.cantidad))} × {i.descripcion}<span className="detalle"> · {pesos(i.costo_unitario)} c/u</span></span><strong>{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</strong></li>
                        ))}
                      </ul>
                      {!anulada && <Boton variante="peligro" icono="basura" onClick={() => setAnulando(c)} data-testid="anular">Anular esta compra</Boton>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <>
            <table className="tabla compras-tabla-recientes">
              <thead><tr><th><span className="solo-lectores">Ver renglones</span></th><th>Fecha</th><th>Proveedor</th><th>Comprobante</th><th className="num">Renglones</th><th className="num">Total</th><th><span className="solo-lectores">Anular</span></th></tr></thead>
              {filas.map((c) => {
                const anulada = c.estado === "anulada";
                const abierta = abiertas.has(c.id);
                return (
                  <tbody key={c.id} data-testid="compra-reciente">
                    <tr className={`elegible ${anulada ? "atenuada" : ""}`} onClick={() => alternar(c.id)}>
                      <td className="angosta">
                        <button type="button" className={`compras-flecha ${abierta ? "abierta" : ""}`} data-abre-compra onClick={(e) => { e.stopPropagation(); alternar(c.id); }} onKeyDown={(e) => teclas(e, c)} aria-expanded={abierta}
                          aria-label={`${abierta ? "Plegar" : "Ver"} los renglones de la compra a ${c.proveedor} del ${fecha(c.fecha)}`} aria-keyshortcuts={anulada ? undefined : "Delete"}>
                          <Icono nombre="derecha" tam={14} grosor={2.6} />
                        </button>
                      </td>
                      <td>{fecha(c.fecha)}</td>
                      <td className="nombre">{c.proveedor}</td>
                      <td className="compras-sin-corte">{nombreComprobante(c)}</td>
                      <td className="num">{c.renglones}</td>
                      <td className="num"><span className="importe chico tachable">{pesosCortos(c.total)}</span></td>
                      <td className="angosta">{anulada ? <Pastilla tipo="mal">Anulada</Pastilla> : <Boton tam="chico" variante="peligro" onClick={(e) => { e.stopPropagation(); setAnulando(c); }} data-testid="anular">Anular</Boton>}</td>
                    </tr>
                    {abierta && c.items.map((i, n) => (
                      <tr key={n} className="hija">
                        <td />
                        <td colSpan={3}>{cifra(Number(i.cantidad))} × {i.descripcion}</td>
                        <td className="num detalle">{pesos(i.costo_unitario)} c/u</td>
                        <td className="num">{pesosCortos(Number(i.cantidad) * Number(i.costo_unitario))}</td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
            <p className="detalle compras-ayuda-teclas">Con el foco en una compra: flechas para recorrer, Enter muestra sus renglones, Supr la anula.</p>
          </>
        ))}
      </div>
      {anulando && <AnularCompra compra={anulando} enLinea={enLinea} alCerrar={() => setAnulando(null)} alAnular={() => { const c = anulando; setAnulando(null); alAnular(`Compra a ${c.proveedor} por ${pesosCortos(c.total)} anulada: el stock que había sumado se descontó.`); }} />}
    </Plegable>
  );
}

function AnularCompra({ compra: c, enLinea, alCerrar, alAnular }: { compra: CompraFila; enLinea: boolean; alCerrar: () => void; alAnular: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function anular() {
    if (ocupado) return;
    setOcupado(true); setError(null);
    try {
      await api(`/compras/${c.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) });
      alAnular();
    } catch (e) {
      setError(mensajeDe(e, "No se anuló: se cortó la conexión. Probá de nuevo cuando vuelva internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo="¿Anular esta compra?" alCerrar={alCerrar} testId="hoja-anular"
      pie={<><Boton onClick={alCerrar} disabled={ocupado}>No anular</Boton><Boton variante="peligro" icono="basura" onClick={() => void anular()} disabled={ocupado || !enLinea} data-testid="anular-confirmar">{ocupado ? "Anulando…" : "Anular la compra"}</Boton></>}>
      <div className="compras-anular-que">
        <strong>{c.proveedor}</strong><span className="importe">{pesosCortos(c.total)}</span>
        <span className="detalle">{fecha(c.fecha)} · {nombreComprobante(c)} · {plural(Number(c.renglones), "renglón", "renglones")}</span>
      </div>
      <p>El stock que sumó esta compra se descuenta, con un ajuste por cada renglón, y deja de contar en los gastos de la semana. El costo que dejó el comprobante no cambia. <strong>No se puede deshacer.</strong></p>
      <label className="campo"><span>Motivo (opcional)</span><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Se cargó dos veces…" maxLength={200} autoFocus data-testid="motivo-anular" /></label>
      <Aviso tipo="alerta">{!enLinea ? "Sin conexión: anular una compra necesita internet." : null}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
    </Hoja>
  );
}

function GastosDeLaSemana({ version }: { version: number }) {
  const [datos, setDatos] = useState<Semana | null>(null);
  const [falla, setFalla] = useState(false);
  useEffect(() => { api<Semana>("/compras/semana").then((d) => { setDatos(d); setFalla(false); }).catch(() => setFalla(true)); }, [version]);
  const mayor = Math.max(1, ...(datos?.por_proveedor ?? []).map((p) => Number(p.total)));
  return (
    <Plegable titulo="Gastos de la semana" testId="gastos-semana">
      {datos === null && !falla && <div className="compras-cargando" aria-busy="true"><span className="solo-lectores">Trayendo los gastos…</span><div className="esqueleto" /><div className="esqueleto" /></div>}
      {datos === null && falla && <p className="detalle">Sin conexión: los gastos de la semana se ven cuando vuelve internet.</p>}
      {datos && (
        <div className="compras-gastos">
          <div className="compras-gastos-total">
            <span className="importe total">
              {datos.por_proveedor.length ? <Explicado valor={pesosCortos(datos.total)} titulo="De dónde salen los gastos de la semana" pasos={[`Compras registradas desde el ${fecha(datos.desde)}, sin las anuladas.`, ...datos.por_proveedor.map((p) => `${p.proveedor}: ${pesos(p.total)} en ${plural(Number(p.compras), "compra", "compras")}`), `Total: ${pesos(datos.total)}`]} /> : pesosCortos(0)}
            </span>
            <span className="detalle">Desde el {fecha(datos.desde)}, al costo sin IVA</span>
          </div>
          {datos.por_proveedor.length === 0 ? <p className="detalle">Esta semana no se registró ninguna compra.</p> : (
            <ul className="compras-gastos-lista">
              {datos.por_proveedor.map((p) => (
                <li key={p.proveedor}>
                  <span className="nombre">{p.proveedor}</span>
                  <span className="importe chico">{pesosCortos(p.total)}</span>
                  <span className="compras-riel" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.01, Number(p.total) / mayor)})` }} /></span>
                  <span className="detalle">{plural(Number(p.compras), "compra", "compras")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Plegable>
  );
}

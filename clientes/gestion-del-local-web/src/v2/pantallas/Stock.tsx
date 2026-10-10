import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../../api";
import { leerTodo } from "../../almacen";
import { enviarOEncolar } from "../../cola";
import { useCatalogo, type StockFila } from "../../catalogo";
import { fecha, pesos } from "../../formato";
import { cantidadValida, enteras, unidadDe } from "../../unidades";
import { irA } from "../rutas";
import { Aviso, Boton, Buscador, Explicado, Hoja, Icono, Indicador, Pagina, Pastilla, Plegable, Progreso, Segmentos, Toast, Vacio, numero, pesosCortos } from "../ui";
import { useEsCelular } from "../vista";
import { conSigno, detalleDe, mensajeDe, nombreUnidad, plural, useEnLinea, type Producto } from "./deposito-comun";
import "../estilos/stock.css";

// Stock actual y plata invertida. Cada número se explica: el stock, con sus movimientos; el
// valor, como stock × costo vigente. Corregir pide cuántas hay y por qué, y no confirma: el
// ajuste queda a la vista entre los movimientos.
type PorProveedor = Record<string, { unidades: number; valor: number; productos: number }>;
type Datos = { productos: StockFila[]; valor_total: number; por_proveedor: PorProveedor };
type Movimiento = { id: string; tipo: string; cantidad: string; referencia_tipo: string | null; fecha: string; nota: string | null };
type Filtro = "todos" | "con" | "sin";
type Columna = "producto" | "stock" | "valor" | "ultimo";
type Orden = { columna: Columna; sube: boolean };
type Abierto = { id: string; corregir: boolean };

const FILTROS: { valor: Filtro; nombre: string }[] = [{ valor: "todos", nombre: "Todos" }, { valor: "con", nombre: "Con stock" }, { valor: "sin", nombre: "En cero o negativo" }];
const MOTIVOS = ["Conté la estantería", "Rotura", "Se usó en el local", "Estaba mal cargado"];
const TOPE = 100;

// Lo guardado en el dispositivo trae las filas pero no los totales: se rearman acá.
function armar(filas: StockFila[]): Datos {
  const por_proveedor: PorProveedor = {};
  for (const f of filas) {
    const g = (por_proveedor[f.proveedor ?? "Sin proveedor"] ??= { unidades: 0, valor: 0, productos: 0 });
    g.unidades += Math.max(0, Number(f.stock)); g.valor += Number(f.valor); g.productos += 1;
  }
  return { productos: filas, valor_total: filas.reduce((s, f) => s + Number(f.valor), 0), por_proveedor };
}

export function Stock() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const { catalogo, error: errorCatalogo, buscarProductos } = useCatalogo();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [delDispositivo, setDelDispositivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [orden, setOrden] = useState<Orden | null>(null);
  const [marcada, setMarcada] = useState(0);
  const [abierto, setAbierto] = useState<Abierto | null>(null);
  // Correcciones guardadas sin conexión: se ven en la fila hasta que el servidor las confirma.
  const [porEnviar, setPorEnviar] = useState<Map<string, number>>(new Map());
  const caja = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/stock"));
      setDelDispositivo(false); setError(null); setPorEnviar(new Map());
    } catch (e) {
      if (e instanceof ErrorApi) { setError(`No se pudo traer el stock: ${e.message}`); return; }
      const guardado = await leerTodo<StockFila>("stock").catch(() => [] as StockFila[]);
      if (guardado.length) { setDatos((d) => d ?? armar(guardado)); setDelDispositivo(true); setError(null); }
      else setError("Sin conexión con el servidor y sin stock guardado en este dispositivo. Revisá internet y tocá «Reintentar».");
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (enLinea && delDispositivo) void cargar(); }, [enLinea, delDispositivo, cargar]);

  const porId = useMemo(() => new Map((datos?.productos ?? []).map((s) => [s.id, s])), [datos]);
  const cantidadDe = useCallback((id: string) => porEnviar.get(id) ?? Number(porId.get(id)?.stock ?? 0), [porEnviar, porId]);

  const cuenta = useMemo(() => {
    const filas = datos?.productos ?? [];
    const con = filas.filter((f) => Number(f.stock) > 0).length;
    const negativos = filas.filter((f) => Number(f.stock) < 0).length;
    return { total: filas.length, con, negativos, enCero: filas.length - con - negativos, sinCosto: filas.filter((f) => Number(f.stock) > 0 && f.costo_neto === null).length };
  }, [datos]);

  const { filas, hayMas } = useMemo(() => {
    if (!catalogo) return { filas: [] as Producto[], hayMas: false };
    const valorDe = (p: Producto) => Number(porId.get(p.id)?.valor ?? 0);
    let base = consulta.trim() ? buscarProductos(consulta, TOPE) : catalogo.filter((p) => porId.has(p.id)).sort((a, b) => valorDe(b) - valorDe(a));
    if (filtro === "con") base = base.filter((p) => cantidadDe(p.id) > 0);
    if (filtro === "sin") base = base.filter((p) => cantidadDe(p.id) <= 0);
    if (orden) {
      const clave = (p: Producto): string | number => orden.columna === "producto" ? p.descripcion.toLocaleLowerCase("es") : orden.columna === "stock" ? cantidadDe(p.id) : orden.columna === "valor" ? valorDe(p) : (porId.get(p.id)?.ultimo_movimiento ?? "");
      base = [...base].sort((a, b) => { const x = clave(a), y = clave(b); return (x < y ? -1 : x > y ? 1 : 0) * (orden.sube ? 1 : -1); });
    }
    return { filas: base.slice(0, TOPE), hayMas: base.length > TOPE };
  }, [catalogo, consulta, buscarProductos, porId, filtro, orden, cantidadDe]);
  useEffect(() => { setMarcada(0); }, [consulta, filtro, orden]);

  const porProveedor = useMemo(() => Object.entries(datos?.por_proveedor ?? {}).sort((a, b) => b[1].valor - a[1].valor), [datos]);
  const mayor = Math.max(1, porProveedor[0]?.[1].valor ?? 1);

  function teclas(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcada((i) => Math.min(i + 1, filas.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcada((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && filas[marcada]) { e.preventDefault(); setAbierto({ id: filas[marcada]!.id, corregir: false }); }
    else if (e.key === "Escape" && consulta) { e.preventDefault(); setConsulta(""); }
  }
  useEffect(() => { document.querySelector(".stock-tabla tr[aria-selected='true']")?.scrollIntoView({ block: "nearest" }); }, [marcada]);

  async function corregido(p: Producto, habia: number, hay: number, encolado: boolean) {
    setAbierto(null);
    const dif = hay - habia;
    if (encolado) { setPorEnviar((m) => new Map(m).set(p.id, hay)); setMensaje(`${p.descripcion}: quedó en ${numero(hay)}. Guardado en este dispositivo, se manda al volver internet.`); return; }
    setMensaje(dif === 0 ? `${p.descripcion}: sin diferencia, el stock ya decía ${numero(hay)}.` : `${p.descripcion}: había ${numero(habia)}, hay ${numero(hay)} (${conSigno(dif)}).`);
    await cargar();
  }

  const ordenar = (columna: Columna) => setOrden((o) => (o?.columna === columna ? (o.sube === (columna === "producto") ? { columna, sube: !o.sube } : null) : { columna, sube: columna === "producto" }));
  const cabeza = (columna: Columna, nombre: string, num?: boolean) => {
    const activa = orden?.columna === columna;
    return (
      <th className={num ? "num" : undefined} aria-sort={activa ? (orden.sube ? "ascending" : "descending") : undefined}>
        <button type="button" className="stock-orden" onClick={() => ordenar(columna)} title={`Ordenar por ${nombre.toLowerCase()}`}>
          {nombre}<Icono nombre={activa && orden.sube ? "arriba" : "abajo"} tam={14} grosor={activa ? 3 : 1.6} />
        </button>
      </th>
    );
  };

  const productoAbierto = abierto ? (catalogo?.find((p) => p.id === abierto.id) ?? null) : null;
  const sinNada = datos !== null && datos.productos.length === 0 && !consulta.trim();
  const esperando = (datos === null || catalogo === null) && !error && !errorCatalogo;

  return (
    <Pagina titulo="Stock" testId="pantalla-stock" bajada="El stock de cada producto es la suma de sus compras, ventas, ajustes y conteos. Lo que todavía no se cargó figura en cero.">
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={() => void cargar()}>Reintentar</Boton>}>{error}</Aviso>
      <Aviso tipo="error">{!error ? errorCatalogo : null}</Aviso>
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea || delDispositivo ? "Sin conexión: ves el último stock que bajó este dispositivo. Si corregís un stock queda guardado acá y se manda solo al volver internet." : null}</Aviso>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />

      {esperando && <Progreso texto={datos === null ? "Trayendo el stock…" : "Bajando el catálogo de productos…"} />}

      {datos && !sinNada && (
        <div className="indicadores stock-indicadores" data-testid="valorizacion">
          <Indicador icono="plata" color="ambar" rotulo="Plata invertida en stock" testId="plata-invertida"
            valor={<Explicado valor={pesosCortos(datos.valor_total)} titulo="De dónde sale la plata invertida" pasos={[
              "De cada producto: lo que hay en stock × su costo vigente, sin IVA.",
              ...porProveedor.slice(0, 6).map(([nombre, v]) => `${nombre}: ${pesos(v.valor)} en ${plural(v.productos, "producto", "productos")}`),
              ...(porProveedor.length > 6 ? [`Otros ${porProveedor.length - 6} proveedores: ${pesos(porProveedor.slice(6).reduce((s, [, v]) => s + v.valor, 0))}`] : []),
              ...(cuenta.sinCosto ? [`${plural(cuenta.sinCosto, "producto con stock no tiene costo y no suma", "productos con stock no tienen costo y no suman")}.`] : []),
              `Total: ${pesos(datos.valor_total)}`,
            ]} />}
            detalle="Al costo vigente, sin IVA" />
          <Indicador icono="stock" color="verde" rotulo="Productos con stock" testId="con-stock"
            valor={<Explicado valor={numero(cuenta.con)} etiqueta={`${cuenta.con} productos con stock`} titulo="Productos con stock" pasos={[`${plural(cuenta.total, "producto tiene", "productos tienen")} algún movimiento de stock.`, `${plural(cuenta.enCero + cuenta.negativos, "está", "están")} en cero o en negativo.`, `Con stock: ${numero(cuenta.con)}`]} />}
            detalle={`De ${plural(cuenta.total, "producto", "productos")} con movimientos`} />
          <Indicador icono="alerta" color={cuenta.negativos ? "rojo" : undefined} rotulo="En cero o negativo" testId="sin-stock"
            valor={<Explicado valor={numero(cuenta.enCero + cuenta.negativos)} etiqueta={`${cuenta.enCero + cuenta.negativos} productos en cero o negativo`} titulo="En cero o negativo" pasos={[`En cero: ${numero(cuenta.enCero)}`, `En negativo (se vendió más de lo que figuraba): ${numero(cuenta.negativos)}`, `En cero o negativo: ${numero(cuenta.enCero + cuenta.negativos)}`]} />}
            detalle={`${numero(cuenta.enCero)} en cero · ${numero(cuenta.negativos)} en negativo`} />
        </div>
      )}

      {sinNada && (
        <Vacio icono="stock" titulo="Todavía no hay stock cargado" accion={
          <div className="stock-primeros-pasos">
            <Boton variante="principal" icono="compras" onClick={() => irA("compras")}>Registrar un ingreso</Boton>
            <Boton icono="contar" onClick={() => irA("contar")}>Contar un sector</Boton>
          </div>
        }>El stock arranca en cero. Se carga registrando la mercadería que llega o contando lo que ya hay en cada estantería.</Vacio>
      )}

      {datos && !sinNada && porProveedor.length > 0 && (
        <Plegable titulo="Plata invertida por proveedor" extra={esCelular ? undefined : plural(porProveedor.length, "proveedor", "proveedores")} testId="por-proveedor">
          <ul className="stock-proveedores">
            {porProveedor.map(([nombre, v]) => (
              <li key={nombre}>
                <span className="nombre">{nombre}</span>
                <span className="importe chico">{pesosCortos(v.valor)}</span>
                <span className="stock-riel" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.01, v.valor / mayor)})` }} /></span>
                <span className="detalle">{plural(v.productos, "producto", "productos")} · {plural(v.unidades, "unidad", "unidades")}</span>
              </li>
            ))}
          </ul>
        </Plegable>
      )}

      {datos && !sinNada && (
        <>
          <div className="stock-herramientas">
            <Buscador valor={consulta} alCambiar={setConsulta} placeholder={!catalogo ? "Bajando el catálogo…" : esCelular ? "Buscar un producto" : "Buscar un producto para ver o corregir su stock"} etiqueta="Buscar un producto" disabled={!catalogo} onKeyDown={teclas} cajaRef={caja} autoFoco={!esCelular} />
            <div className="stock-filtro"><Segmentos opciones={FILTROS} actual={filtro} alElegir={setFiltro} etiqueta="Qué productos mostrar" /></div>
          </div>

          {catalogo && filas.length === 0 && (
            <Vacio icono="buscar" titulo={consulta.trim() ? `Nada con «${consulta.trim()}»` : filtro === "sin" ? "Ningún producto en cero o negativo" : "Ningún producto con stock"}
              accion={(consulta.trim() || filtro !== "todos") ? <Boton onClick={() => { setConsulta(""); setFiltro("todos"); caja.current?.focus(); }}>Ver todos</Boton> : undefined}>
              {consulta.trim() ? "Probá con otra palabra, con la marca o con el código del proveedor." : "Con este filtro no queda ningún producto."}
            </Vacio>
          )}

          {filas.length > 0 && (esCelular ? (
            <ul className="lista" data-testid="tabla-stock">
              {filas.map((p) => {
                const fila = porId.get(p.id) ?? null;
                const n = cantidadDe(p.id);
                return (
                  <li key={p.id} data-testid="fila-stock">
                    <button type="button" className="renglon" onClick={() => setAbierto({ id: p.id, corregir: false })} data-testid="stock" aria-haspopup="dialog">
                      <span className="nombre">{p.descripcion}</span>
                      <span className={`importe ${n < 0 ? "stock-negativo" : ""}`}>{n < 0 ? "−" : ""}{numero(Math.abs(n))} <small>{nombreUnidad(p.unidad)}</small></span>
                      <span className="detalle stock-pie-renglon">
                        <span className="corta">{detalleDe(p) || "Sin proveedor"}</span>
                        <span>{porEnviar.has(p.id) ? <Pastilla tipo="alerta">Se manda al volver internet</Pastilla> : fila?.costo_neto ? `vale ${pesosCortos(fila.valor)}` : fila ? "sin costo" : "sin movimientos"}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="tabla-marco">
              <table className="tabla stock-tabla" data-testid="tabla-stock">
                <thead>
                  <tr>
                    {cabeza("producto", "Producto")}<th>Proveedor</th>{cabeza("stock", "Stock", true)}<th className="num">Costo sin IVA</th>{cabeza("valor", "Valor", true)}{cabeza("ultimo", "Último movimiento")}<th><span className="solo-lectores">Corregir</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((p, i) => {
                    const fila = porId.get(p.id) ?? null;
                    const n = cantidadDe(p.id);
                    const unidad = nombreUnidad(p.unidad);
                    return (
                      <tr key={p.id} data-testid="fila-stock" aria-selected={i === marcada && consulta.trim() !== ""}>
                        <td><span className="nombre">{p.descripcion}</span><span className="detalle stock-bajo-nombre">{[p.marca, p.codigo_proveedor].filter(Boolean).join(" · ")}</span></td>
                        <td>{fila?.proveedor ?? p.proveedor ?? "—"}</td>
                        <td className="num">
                          <button type="button" className={`explicado stock-numero ${n < 0 ? "stock-negativo" : ""}`} onClick={() => setAbierto({ id: p.id, corregir: false })} aria-haspopup="dialog" aria-label={`${numero(n)} ${unidad}. Ver los movimientos de ${p.descripcion}`} data-testid="stock">
                            <span>{n < 0 ? "−" : ""}{numero(Math.abs(n))} {unidad}</span><span className="signo" aria-hidden="true">?</span>
                          </button>
                          {porEnviar.has(p.id) && <div><Pastilla tipo="alerta">Se manda al volver internet</Pastilla></div>}
                        </td>
                        <td className="num">{fila?.costo_neto ? pesos(fila.costo_neto) : <span className="detalle">sin costo</span>}</td>
                        <td className="num">{fila?.costo_neto ? <Explicado className="stock-valor" valor={pesosCortos(fila.valor)} titulo={`Cuánto vale el stock de ${p.descripcion}`} pasos={pasosDelValor(p, fila, n)} /> : "—"}</td>
                        <td>{fila?.ultimo_movimiento ? fecha(fila.ultimo_movimiento) : <span className="detalle">sin movimientos</span>}</td>
                        <td className="angosta"><Boton tam="chico" icono="editar" onClick={() => setAbierto({ id: p.id, corregir: true })} aria-label={`Corregir el stock de ${p.descripcion}`}>Corregir</Boton></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {hayMas && <p className="detalle">Se muestran {TOPE} productos. Escribí en el buscador para llegar a los demás.</p>}
        </>
      )}

      {abierto && productoAbierto && (
        <DetalleDeStock producto={productoAbierto} fila={porId.get(productoAbierto.id) ?? null} cantidad={cantidadDe(productoAbierto.id)} corregirDeEntrada={abierto.corregir} porEnviar={porEnviar.has(productoAbierto.id)}
          alCerrar={() => { setAbierto(null); }} alCorregir={(habia, hay, encolado) => void corregido(productoAbierto, habia, hay, encolado)} />
      )}
    </Pagina>
  );
}

function pasosDelValor(p: Producto, fila: StockFila, cantidad: number): string[] {
  const unidad = nombreUnidad(p.unidad);
  return [
    `Stock: ${numero(cantidad)} ${unidad} (la suma de sus movimientos).`,
    `Costo vigente sin IVA: ${pesos(fila.costo_neto)}${fila.proveedor ? `, de la lista de ${fila.proveedor}` : ""}.`,
    cantidad < 0 ? "Con stock negativo no hay plata invertida: vale $0." : `${numero(cantidad)} × ${pesos(fila.costo_neto)} = ${pesos(fila.valor)}`,
  ];
}

const nombreTipo = (m: Movimiento) => (m.tipo === "venta" ? "Venta" : m.tipo === "compra" ? "Compra" : m.referencia_tipo === "conteo" ? "Conteo" : "Ajuste");

// El detalle de un producto: lo que hay, lo que vale, cada movimiento que lo explica y la
// corrección a mano. Se abre sobre la lista, sin perder dónde se estaba.
function DetalleDeStock({ producto: p, fila, cantidad, corregirDeEntrada, porEnviar, alCerrar, alCorregir }: {
  producto: Producto; fila: StockFila | null; cantidad: number; corregirDeEntrada: boolean; porEnviar: boolean; alCerrar: () => void; alCorregir: (habia: number, hay: number, encolado: boolean) => void;
}) {
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [errorMovimientos, setErrorMovimientos] = useState<string | null>(null);
  const [corrigiendo, setCorrigiendo] = useState(corregirDeEntrada);
  const [real, setReal] = useState(String(cantidad).replace(".", ","));
  const [motivo, setMotivo] = useState("");
  const [falta, setFalta] = useState<{ real?: string; motivo?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const id = useId();
  const unidad = unidadDe(p);
  const rotulo = nombreUnidad(p.unidad);

  useEffect(() => {
    let vigente = true;
    api<Movimiento[]>(`/stock/${p.id}/movimientos`).then((m) => { if (vigente) setMovimientos(m); })
      .catch((e) => { if (vigente) setErrorMovimientos(mensajeDe(e, "Sin conexión: los movimientos se ven cuando vuelve internet. Corregir el stock se puede igual.")); });
    return () => { vigente = false; };
  }, [p.id]);

  const texto = real.trim().replace(",", ".");
  const n = texto === "" ? NaN : Number(texto);
  const valida = Number.isFinite(n) && n >= 0;
  const hay = valida ? (n === 0 ? 0 : cantidadValida(texto, unidad)) : NaN;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    const faltas = { real: valida ? undefined : "Escribí cuántas hay: un número, cero o más.", motivo: motivo.trim() ? undefined : "Elegí un motivo o escribilo: sin motivo no se guarda." };
    setFalta(faltas);
    if (faltas.real || faltas.motivo) return;
    setGuardando(true); setError(null);
    try {
      const { encolado } = await enviarOEncolar("stock.ajuste", "POST", `/stock/${p.id}/ajustes`, { cantidad_real: hay, motivo: motivo.trim() });
      alCorregir(cantidad, hay, encolado);
    } catch (err) {
      setError(`No se guardó la corrección: ${(err as Error).message}`);
      setGuardando(false);
    }
  }

  const suma = movimientos?.reduce((s, m) => s + Number(m.cantidad), 0) ?? 0;

  return (
    <Hoja ancha titulo={p.descripcion} alCerrar={alCerrar} testId="detalle-stock">
      <p className="detalle stock-quien">{[p.marca, fila?.proveedor ?? p.proveedor, p.codigo_proveedor].filter(Boolean).join(" · ") || "Sin marca ni proveedor"}</p>
      <dl className="stock-resumen">
        <div><dt>Stock</dt><dd className={`importe ${cantidad < 0 ? "stock-negativo" : ""}`}>{cantidad < 0 ? "−" : ""}{numero(Math.abs(cantidad))} <small>{rotulo}</small></dd>{porEnviar && <dd><Pastilla tipo="alerta">Se manda al volver internet</Pastilla></dd>}</div>
        <div><dt>Costo</dt><dd className="importe">{fila?.costo_neto ? <Explicado valor={pesos(fila.costo_neto)} titulo="De dónde sale el costo" pasos={p.explicacion_costo ?? []} /> : <span className="stock-sin-dato">sin costo</span>}</dd></div>
        <div><dt>Valor</dt><dd className="importe">{fila?.costo_neto ? <Explicado valor={pesosCortos(fila.valor)} titulo="Cuánto vale este stock" pasos={pasosDelValor(p, fila, cantidad)} /> : "—"}</dd></div>
      </dl>

      {corrigiendo ? (
        <form className="stock-correccion" onSubmit={guardar} noValidate data-testid="correccion">
          <h3>Corregir el stock</h3>
          <label className="campo stock-cuantas" htmlFor={`${id}-real`}>
            <span>¿Cuántas hay?</span>
            <span className="stock-cuantas-caja">
              <input id={`${id}-real`} className="entrada numero" inputMode={enteras(unidad) ? "numeric" : "decimal"} autoFocus autoComplete="off" value={real} onFocus={(e) => e.target.select()}
                onChange={(e) => { setReal(e.target.value.replace(enteras(unidad) ? /[^\d]/g : /[^\d,.]/g, "")); setFalta((f) => ({ ...f, real: undefined })); }}
                aria-invalid={Boolean(falta.real)} aria-describedby={falta.real ? `${id}-falta-real` : `${id}-cuenta`} data-testid="cantidad-real" />
              <span className="detalle">{rotulo}</span>
            </span>
          </label>
          {falta.real && <p className="stock-falta" id={`${id}-falta-real`} role="alert">{falta.real}</p>}
          <p className="detalle" id={`${id}-cuenta`}>
            {!valida ? `El sistema dice ${numero(cantidad)}.` : hay === cantidad ? `El sistema ya dice ${numero(cantidad)}: no se registra ningún ajuste.` : `Había ${numero(cantidad)}, hay ${numero(hay)}: se registra un ajuste de ${conSigno(hay - cantidad)}.`}
          </p>

          <div className="campo">
            <span id={`${id}-motivos`}>Motivo</span>
            <div className="stock-motivos" role="group" aria-labelledby={`${id}-motivos`}>
              {MOTIVOS.map((m) => <Boton key={m} tam="chico" aria-pressed={motivo === m} className={motivo === m ? "stock-motivo-elegido" : undefined} onClick={() => { setMotivo(m); setFalta((f) => ({ ...f, motivo: undefined })); }}>{m}</Boton>)}
            </div>
            <input className="entrada" value={motivo} onChange={(e) => { setMotivo(e.target.value); setFalta((f) => ({ ...f, motivo: undefined })); }} placeholder="O escribí otro motivo" aria-label="Motivo de la corrección" maxLength={200}
              aria-invalid={Boolean(falta.motivo)} aria-describedby={falta.motivo ? `${id}-falta-motivo` : undefined} data-testid="motivo" />
            {falta.motivo && <p className="stock-falta" id={`${id}-falta-motivo`} role="alert">{falta.motivo}</p>}
          </div>

          <Aviso tipo="error">{error}</Aviso>
          <div className="hoja-pie">
            <Boton onClick={() => (corregirDeEntrada ? alCerrar() : setCorrigiendo(false))} disabled={guardando}>Cancelar</Boton>
            <Boton type="submit" variante="principal" disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar la corrección"}</Boton>
          </div>
        </form>
      ) : (
        <div><Boton icono="editar" onClick={() => setCorrigiendo(true)} data-testid="corregir">Corregir el stock</Boton></div>
      )}

      <section className="stock-movimientos" aria-labelledby={`${id}-mov`}>
        <h3 id={`${id}-mov`}>Movimientos</h3>
        <Aviso tipo="alerta">{errorMovimientos}</Aviso>
        {movimientos === null && !errorMovimientos && <Progreso texto="Buscando los movimientos…" />}
        {movimientos?.length === 0 && <p className="detalle">Este producto todavía no tiene movimientos: su stock es cero. Se carga con un ingreso de mercadería, un conteo o corrigiéndolo acá.</p>}
        {movimientos && movimientos.length > 0 && (
          <>
            <ul className="stock-lista-mov" data-testid="movimientos">
              {movimientos.map((m) => {
                const c = Number(m.cantidad);
                return (
                  <li key={m.id}>
                    <span className="detalle">{fecha(m.fecha)}</span>
                    <span><strong>{nombreTipo(m)}</strong>{m.nota && <span className="detalle"> · {m.nota}</span>}</span>
                    <span className={`deposito-dif ${c < 0 ? "" : "sobra"}`}>{conSigno(c)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="stock-suma"><span>{movimientos.length >= 200 ? "Los últimos 200 movimientos suman" : `La suma de ${plural(movimientos.length, "movimiento", "movimientos")}`}</span><strong>{conSigno(suma).replace("+", "")} {rotulo}</strong></p>
          </>
        )}
      </section>
    </Hoja>
  );
}

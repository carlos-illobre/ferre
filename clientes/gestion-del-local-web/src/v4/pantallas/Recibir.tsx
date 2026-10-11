import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../../api";
import { useCatalogo } from "../../catalogo";
import { useConexion } from "../conexion";
import { cantidad, nombreDeUnidad, numero, pesos, pesosConCentavos, porUnidad, vaConDecimal } from "../formato";
import {
  Aviso, avisar, BarraDeAccion, Boton, Buscador, Campo, Cantidad, Cargando, clases, Confirmar, Escaner, Exito, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla,
  Renglon, Segmentos, Tarjeta, Vacio,
} from "../piezas";
import { ir, useEsCelular } from "../rutas";
import { esCodigo, leerCosto, mensajeDe, plural, productoPorCodigo, queDia, type Producto } from "./deposito-comun";
import "../estilos/recibir.css";

// Ingreso de mercadería: de quién llegó, con qué comprobante y qué llegó. Suma stock y, si el
// comprobante trae otro costo que la lista, ese pasa a ser el vigente. Al costado, las compras
// recientes (se abren y se anulan) y lo gastado en la semana.
type Proveedor = { id: string; nombre: string; activo: boolean };
type Comprobante = "factura" | "remito" | "sin_comprobante";
/** Un renglón del ingreso. El costo se guarda como se escribe; `leerCosto` lo pasa a número. */
type Linea = { clave: string; /** `null` cuando es un «Producto nuevo». */ producto: Producto | null; descripcion: string; cantidad: number; costo: string };
type Borrador = { proveedorId: string | null; comprobante: Comprobante; numero: string; fecha: string; lineas: Linea[] };
type Compra = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; total: string; estado: string; proveedor: string; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[] };
type Semana = { desde: string; por_proveedor: { proveedor: string; total: string; compras: string }[]; total: number };
type Hecha = { total: number; proveedor: string; productos: number; actualizados: number; nuevos: number };

const COMPROBANTES: { clave: Comprobante; nombre: string }[] = [
  { clave: "factura", nombre: "Factura" },
  { clave: "remito", nombre: "Remito" },
  { clave: "sin_comprobante", nombre: "Sin comprobante" },
];
const CLAVE_DEL_BORRADOR = "ferre.v4.ingreso";
const MAXIMO_DE_RESULTADOS = 8;
const COMPRAS_A_LA_VISTA = 8;

// La fecha del día según el reloj del local, no la de Greenwich (a la noche ya es mañana).
const hoy = () => new Date().toLocaleDateString("sv-SE");
const costoATexto = (valor: number | null) => (valor === null ? "" : pesosConCentavos(valor).slice(1));
const unidadDe = (l: Linea) => l.producto?.unidad ?? "unidad";
const comprobanteDe = (c: Compra) => (c.comprobante_tipo === "sin_comprobante" ? "Sin comprobante" : `${c.comprobante_tipo === "factura" ? "Factura" : "Remito"} ${c.comprobante_numero ?? "sin número"}`);

/** El costo con el que viene un producto: el de la lista de ese proveedor o, si no lo vende, el vigente. */
function costoDeLista(producto: Producto | null, proveedorId: string | null): number | null {
  if (!producto) return null;
  const suyo = producto.proveedores?.find((x) => x.proveedor_id === proveedorId)?.costo_neto ?? producto.costo_neto;
  return suyo === null || suyo === undefined ? null : Number(suyo);
}

// Un ingreso a medio cargar sobrevive a una recarga o a un corte: queda en el dispositivo
// hasta que se registra o se le sacan todos los renglones.
function leerBorrador(): Borrador | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_DEL_BORRADOR) ?? "null") as Borrador | null;
    return b && Array.isArray(b.lineas) && b.lineas.length > 0 ? b : null;
  } catch { return null; }
}

// ---------------------------------------------------------------- Pantalla

export function Recibir() {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const { catalogo, error: errorDelCatalogo, buscarProductos } = useCatalogo();
  const [borrador] = useState(leerBorrador);

  const [proveedores, setProveedores] = useState<Proveedor[] | null>(null);
  const [errorDeProveedores, setErrorDeProveedores] = useState<string | null>(null);
  const [proveedorId, setProveedorId] = useState<string | null>(borrador?.proveedorId ?? null);
  const [comprobante, setComprobante] = useState<Comprobante>(borrador?.comprobante ?? "factura");
  const [numeroDeComprobante, setNumeroDeComprobante] = useState(borrador?.numero ?? "");
  const [fecha, setFecha] = useState(borrador?.fecha ?? hoy());
  const [lineas, setLineas] = useState<Linea[]>(borrador?.lineas ?? []);
  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [recien, setRecien] = useState<string | null>(null);
  const [codigoSuelto, setCodigoSuelto] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [hecha, setHecha] = useState<Hecha | null>(null);
  const [hoja, setHoja] = useState<"nuevo" | "escaner" | null>(null);
  const [version, setVersion] = useState(0);
  const buscador = useRef<HTMLInputElement>(null);
  const idResultados = useId();

  const cargarProveedores = useCallback(() => api<Proveedor[]>("/proveedores")
    .then((p) => { setProveedores(p.filter((x) => x.activo)); setErrorDeProveedores(null); })
    .catch((e) => setErrorDeProveedores(mensajeDe(e, "Revisá la conexión y probá de nuevo."))), []);
  useEffect(() => { void cargarProveedores(); }, [cargarProveedores]);
  useEffect(() => { if (enLinea && errorDeProveedores) void cargarProveedores(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      if (lineas.length) localStorage.setItem(CLAVE_DEL_BORRADOR, JSON.stringify({ proveedorId, comprobante, numero: numeroDeComprobante, fecha, lineas } satisfies Borrador));
      else localStorage.removeItem(CLAVE_DEL_BORRADOR);
    } catch { /* sin lugar o sin permiso: se sigue sin borrador */ }
  }, [proveedorId, comprobante, numeroDeComprobante, fecha, lineas]);
  // Lo que respondió el servidor deja de valer en cuanto se toca lo cargado.
  useEffect(() => { setRechazo(null); }, [proveedorId, comprobante, numeroDeComprobante, fecha, lineas]);

  // Al agregar un renglón, el foco va al dato que sigue: el costo si falta, si no la cantidad.
  useEffect(() => {
    if (!recien) return;
    const renglon = document.querySelector<HTMLElement>(`[data-linea="${recien}"]`);
    renglon?.scrollIntoView?.({ block: "nearest" });
    if (!esCelular) renglon?.querySelector<HTMLInputElement>(renglon.dataset.falta ? ".campo__entrada" : ".cantidad__numero")?.focus();
    const reloj = window.setTimeout(() => setRecien(null), 1200);
    return () => window.clearTimeout(reloj);
  }, [recien, esCelular]);

  const proveedor = proveedores?.find((p) => p.id === proveedorId) ?? null;
  // Primero los productos del proveedor elegido; después el resto.
  const resultados = useMemo(() => {
    if (!consulta.trim()) return [];
    const todos = buscarProductos(consulta, MAXIMO_DE_RESULTADOS * 2);
    return (proveedor ? [...todos.filter((p) => p.proveedor === proveedor.nombre), ...todos.filter((p) => p.proveedor !== proveedor.nombre)] : todos).slice(0, MAXIMO_DE_RESULTADOS);
  }, [buscarProductos, consulta, proveedor]);
  const sinCosto = lineas.filter((l) => leerCosto(l.costo) === null).length;
  const total = Math.round(lineas.reduce((suma, l) => suma + l.cantidad * (leerCosto(l.costo) ?? 0), 0));

  const falta =
    !proveedor ? { titulo: "Elegí de quién llegó", detalle: "Tocá el proveedor, arriba de todo." }
    : sinCosto > 0 ? { titulo: sinCosto === 1 ? "Falta el costo de un producto" : `Falta el costo de ${sinCosto} productos`, detalle: "Escribilo en el renglón marcado." }
    : null;
  const queFalta = falta?.titulo ?? null;
  useEffect(() => { if (!queFalta) setIntento(false); }, [queFalta]);

  // ---- Agregar

  function agregar(producto: Producto) {
    const existente = lineas.find((l) => l.producto?.id === producto.id);
    if (existente) {
      setLineas(lineas.map((l) => (l.clave === existente.clave ? { ...l, cantidad: l.cantidad + 1 } : l)));
      setRecien(existente.clave);
    } else {
      const clave = crypto.randomUUID();
      setLineas([...lineas, { clave, producto, descripcion: producto.descripcion, cantidad: 1, costo: costoATexto(costoDeLista(producto, proveedorId)) }]);
      setRecien(clave);
    }
    setConsulta(""); setMarcado(0); setCodigoSuelto(null);
  }

  function agregarNuevo(descripcion: string) {
    const clave = crypto.randomUUID();
    setLineas([...lineas, { clave, producto: null, descripcion, cantidad: 1, costo: "" }]);
    setRecien(clave);
    setConsulta(""); setCodigoSuelto(null);
  }

  function leerCodigo(codigo: string) {
    const producto = productoPorCodigo(catalogo, codigo);
    if (producto) { agregar(producto); return; }
    setCodigoSuelto(codigo.trim());
    setConsulta("");
    buscador.current?.focus();
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    else if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const elegido = resultados[Math.min(marcado, resultados.length - 1)];
      if (elegido) agregar(elegido);
      else if (esCodigo(consulta)) leerCodigo(consulta);
      else if (consulta.trim()) setHoja("nuevo");
    }
  }

  function cambiarLinea(clave: string, cambios: Partial<Linea>) {
    setLineas((antes) => antes.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));
  }

  // ---- Registrar

  async function registrar() {
    if (ocupado || !enLinea) return;
    if (falta || !proveedor) {
      setIntento(true);
      if (proveedor) document.querySelector("[data-falta]")?.scrollIntoView?.({ block: "center" });
      else window.scrollTo(0, 0);
      return;
    }
    setOcupado(true); setRechazo(null);
    try {
      const r = await api<{ total: number; productos_nuevos?: number; costos_actualizados?: number }>("/compras", {
        method: "POST",
        body: JSON.stringify({
          id: crypto.randomUUID(), proveedor_id: proveedor.id, fecha, comprobante_tipo: comprobante,
          comprobante_numero: comprobante === "sin_comprobante" ? null : numeroDeComprobante.trim() || null,
          items: lineas.map((l) => ({ producto_id: l.producto?.id ?? null, descripcion: l.descripcion.trim(), cantidad: l.cantidad, costo_unitario: leerCosto(l.costo) })),
        }),
      });
      setHecha({ total: r.total, proveedor: proveedor.nombre, productos: lineas.length, actualizados: r.costos_actualizados ?? 0, nuevos: r.productos_nuevos ?? 0 });
      setLineas([]); setProveedorId(null); setComprobante("factura"); setNumeroDeComprobante(""); setFecha(hoy()); setIntento(false);
      setVersion((v) => v + 1);
      window.scrollTo(0, 0);
    } catch (e) {
      setRechazo(mensajeDe(e, "Lo que cargaste sigue acá. Revisá la conexión y tocá «Registrar ingreso» de nuevo."));
    } finally {
      setOcupado(false);
    }
  }

  // ---- Pantalla de éxito

  if (hecha) {
    const partes = [
      hecha.actualizados > 0 ? plural(hecha.actualizados, "costo actualizado", "costos actualizados") : null,
      hecha.nuevos > 0 ? plural(hecha.nuevos, "producto nuevo", "productos nuevos") : null,
    ].filter(Boolean).join(" y ");
    return (
      <Pagina titulo="Recibir mercadería" testId="pantalla-compras">
        <Exito
          titulo="Ingreso registrado"
          importe={pesos(hecha.total)}
          detalle={<>{hecha.proveedor} · {plural(hecha.productos, "producto", "productos")}{partes && <><br />{partes}</>}</>}
          boton="Recibir otra"
          alSeguir={() => setHecha(null)}
        />
      </Pagina>
    );
  }

  const buscando = consulta.trim() !== "";

  return (
    <Pagina titulo="Recibir mercadería" testId="pantalla-compras">
      <div className="recibir">
        <section className="recibir__formulario" aria-label="Lo que llegó">
          <div className="recibir__parte">
            <h2>¿De quién llegó?</h2>
            {proveedores === null && !errorDeProveedores && <Cargando texto="Cargando los proveedores…" />}
            {proveedores === null && errorDeProveedores && <Aviso tipo="error" titulo="No se pudieron cargar los proveedores" accion={{ texto: "Reintentar", alTocar: () => void cargarProveedores() }} testId="error-proveedores">{errorDeProveedores}</Aviso>}
            {proveedores?.length === 0 && <Aviso tipo="info" titulo="Todavía no hay proveedores" accion={{ texto: "Ir a listas de precios", alTocar: () => ir("listas") }} testId="sin-proveedores">Se cargan al subir la primera lista de precios.</Aviso>}
            {proveedores && proveedores.length > 0 && (
              <div className="recibir__proveedores" role="group" aria-label="Proveedor" data-testid="proveedor">
                {proveedores.map((p) => (
                  <button key={p.id} type="button" aria-pressed={proveedorId === p.id} className={clases("recibir__proveedor", proveedorId === p.id && "recibir__proveedor--elegido")} onClick={() => setProveedorId(p.id)} data-testid="opcion-proveedor">
                    <Iniciales nombre={p.nombre} tono="negro" forma="cuadrada" />
                    <strong>{p.nombre}</strong>
                    {proveedorId === p.id && <Icono nombre="tilde" tam={18} grosor={2.4} />}
                  </button>
                ))}
              </div>
            )}

            <div className={clases("recibir__comprobante", comprobante !== "sin_comprobante" && "recibir__comprobante--con-datos")}>
              <Segmentos etiqueta="Comprobante" opciones={COMPROBANTES} elegido={comprobante} alElegir={setComprobante} testId="comprobante" />
              {comprobante !== "sin_comprobante" && (
                <>
                  <Campo etiqueta="Número (opcional)" inputMode="numeric" autoComplete="off" value={numeroDeComprobante} onChange={(e) => setNumeroDeComprobante(e.target.value)} placeholder="0001-00001234" data-testid="numero" />
                  <Campo etiqueta="Fecha" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value || hoy())} data-testid="fecha" />
                </>
              )}
            </div>
          </div>

          <div className="recibir__parte recibir__parte--productos">
            <h2>¿Qué llegó?</h2>
            {!catalogo && !errorDelCatalogo && <Cargando texto="Bajando el catálogo…" />}
            {!catalogo && errorDelCatalogo && <Aviso tipo="error" titulo="No se pudo bajar el catálogo" testId="error-catalogo">{errorDelCatalogo}</Aviso>}
            {catalogo && (
              <Buscador
                ref={buscador}
                valor={consulta}
                alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
                alTeclear={teclear}
                alEscanear={esCelular ? () => setHoja("escaner") : undefined}
                etiqueta="Buscar el producto que llegó para agregarlo"
                placeholder={esCelular ? "Buscá o escaneá el producto" : "Escribí el nombre del producto o el código"}
                controla={idResultados}
                activo={resultados.length > 0 ? `${idResultados}-${Math.min(marcado, resultados.length - 1)}` : undefined}
              />
            )}

            {codigoSuelto && (
              <Aviso tipo="alerta" titulo={`El código ${codigoSuelto} no está en el catálogo`} accion={{ texto: "Cargarlo como nuevo", alTocar: () => setHoja("nuevo") }} testId="codigo-desconocido">
                Buscalo por el nombre o cargalo como producto nuevo.
              </Aviso>
            )}

            {buscando ? (
              <div className="recibir__resultados" id={idResultados} role="listbox" aria-label="Productos encontrados" data-testid="sugerencias">
                {resultados.map((p, i) => {
                  const costo = costoDeLista(p, proveedorId);
                  return (
                    <button key={p.id} type="button" role="option" id={`${idResultados}-${i}`} aria-selected={i === marcado} className={clases("recibir__resultado", i === marcado && "recibir__resultado--marcado")} onClick={() => agregar(p)} onMouseEnter={() => setMarcado(i)} data-testid="sugerencia">
                      <span className="recibir__resultado-texto"><strong>{p.descripcion}</strong><span>{p.marca ?? p.proveedor ?? ""}</span></span>
                      {costo !== null && <span className="recibir__resultado-costo"><span>Costo</span><strong className="cifra">{pesosConCentavos(costo)}</strong></span>}
                      <span className="recibir__sumar" aria-hidden="true"><Icono nombre="mas" tam={20} /></span>
                    </button>
                  );
                })}
                {resultados.length === 0 && (
                  <div className="recibir__sin-resultados">
                    <p>No hay productos con «{consulta.trim()}».</p>
                    <Boton icono="mas" onClick={() => setHoja("nuevo")} data-testid="agregar-nuevo">Cargarlo como producto nuevo</Boton>
                  </div>
                )}
              </div>
            ) : catalogo && (
              <Boton variante="texto" tam="chico" icono="mas" className="recibir__nuevo" onClick={() => setHoja("nuevo")} data-testid="producto-nuevo">{esCelular ? "Cargar un producto nuevo" : "Cargar un producto que no está en el catálogo"}</Boton>
            )}

            {lineas.length === 0 ? (
              <Vacio icono="recibir" titulo="Todavía no cargaste nada" testId="ingreso-vacio">
                {proveedor ? "Buscá el primer producto que llegó y poné cuánto vino." : "Elegí de quién llegó y buscá el primer producto."}
              </Vacio>
            ) : (
              <ul className="recibir__lineas" data-testid="renglones">
                {lineas.map((l) => (
                  <LineaDelIngreso
                    key={l.clave}
                    linea={l}
                    deLista={costoDeLista(l.producto, proveedorId)}
                    recien={recien === l.clave}
                    alCambiar={(cambios) => cambiarLinea(l.clave, cambios)}
                    alQuitar={() => setLineas(lineas.filter((x) => x.clave !== l.clave))}
                    alTerminar={() => buscador.current?.focus()}
                  />
                ))}
              </ul>
            )}
          </div>

          {lineas.length > 0 && (
            <BarraDeAccion className="recibir__registrar">
              {rechazo && <Aviso tipo="error" titulo="No se pudo registrar el ingreso" testId="error-ingreso">{rechazo}</Aviso>}
              {!rechazo && intento && falta && <Aviso tipo="alerta" titulo={falta.titulo} testId="error-ingreso">{falta.detalle}</Aviso>}
              {!enLinea && <p className="recibir__sin-conexion" data-testid="sin-conexion"><Icono nombre="sin-conexion" tam={18} />Sin conexión: registrar el ingreso necesita internet. Lo que cargaste queda guardado en este dispositivo.</p>}
              <p className="recibir__total">
                <span>Total · {plural(lineas.length, "producto", "productos")}</span>
                <strong className="cifra" data-testid="total">{pesos(total)}</strong>
              </p>
              <Boton variante="principal" tam="grande" iconoFinal="flecha" disabled={ocupado || !enLinea} onClick={() => void registrar()} data-testid="registrar">{ocupado ? "Registrando…" : "Registrar ingreso"}</Boton>
            </BarraDeAccion>
          )}
        </section>

        <ComprasRecientes version={version} catalogo={catalogo} />
      </div>

      <ProductoNuevo abierta={hoja === "nuevo"} sugerido={buscando && resultados.length === 0 ? consulta.trim() : ""} alCerrar={() => setHoja(null)} alAgregar={agregarNuevo} />
      <Escaner abierto={hoja === "escaner"} alCerrar={() => setHoja(null)} alLeer={leerCodigo} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Renglón del ingreso

type PropsDeLinea = {
  linea: Linea;
  /** El costo que figura en la lista, para decir si subió o bajó. */
  deLista: number | null;
  recien: boolean;
  alCambiar: (cambios: Partial<Linea>) => void;
  alQuitar: () => void;
  /** Enter en la cantidad o en el costo: se terminó el renglón. */
  alTerminar: () => void;
};

function LineaDelIngreso({ linea, deLista, recien, alCambiar, alQuitar, alTerminar }: PropsDeLinea) {
  const costo = leerCosto(linea.costo);
  const unidad = unidadDe(linea);
  const conDecimal = vaConDecimal(unidad);
  const diferencia = costo !== null && deLista ? ((costo - deLista) / deLista) * 100 : 0;
  const cambio = Math.abs(diferencia) < 0.05 ? null : diferencia > 0 ? "subio" : "bajo";

  return (
    <li
      className={clases("recibir__linea", costo === null && "recibir__linea--falta", recien && "recibir__linea--recien")}
      data-linea={linea.clave}
      data-falta={costo === null || undefined}
      data-testid="renglon"
      onKeyDown={(e) => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); e.target.blur(); alTerminar(); } }}
    >
      <div className="recibir__nombre">
        <strong>{linea.descripcion}</strong>
        <span className="recibir__notas">
          {linea.producto === null && <Pastilla tipo="info">Producto nuevo</Pastilla>}
          {costo === null && <Pastilla tipo="alerta" icono="alerta" testId="falta-el-costo">Falta el costo</Pastilla>}
          {cambio === "subio" && <Pastilla tipo="alerta" icono="flecha-arriba" testId="cambio-de-costo">Subió {numero(Math.abs(diferencia))} %</Pastilla>}
          {cambio === "bajo" && <Pastilla tipo="bien" icono="flecha-abajo" testId="cambio-de-costo">Bajó {numero(Math.abs(diferencia))} %</Pastilla>}
          {deLista !== null && <span>En la lista: {pesosConCentavos(deLista)}</span>}
        </span>
      </div>

      <div className="recibir__cuanto">
        <span className="recibir__rotulo" aria-hidden="true">Cantidad{conDecimal && ` en ${nombreDeUnidad(unidad, 2)}`}</span>
        <Cantidad valor={linea.cantidad} decimal={conDecimal} etiqueta={`Cantidad de ${linea.descripcion}`} alCambiar={(valor) => alCambiar({ cantidad: valor })} />
      </div>

      <Campo
        className="recibir__costo"
        etiqueta={`Costo ${porUnidad(unidad)}`}
        prefijo="$"
        inputMode="decimal"
        placeholder="0,00"
        value={linea.costo}
        onChange={(e) => alCambiar({ costo: e.target.value.replace(/[^\d.,]/g, "") })}
        onBlur={() => { if (costo !== null) alCambiar({ costo: costoATexto(costo) }); }}
        aria-label={`Costo ${porUnidad(unidad)} de ${linea.descripcion}`}
        data-testid="costo"
      />

      <span className="recibir__subtotal cifra" data-testid="subtotal">{costo === null ? "" : pesos(linea.cantidad * costo)}</span>
      <Boton variante="texto" tam="chico" icono="basura" className="recibir__quitar" aria-label={`Quitar ${linea.descripcion}`} onClick={alQuitar} data-testid="quitar" />
    </li>
  );
}

// ---------------------------------------------------------------- Hoja: producto nuevo

function ProductoNuevo({ abierta, sugerido, alCerrar, alAgregar }: { abierta: boolean; sugerido: string; alCerrar: () => void; alAgregar: (descripcion: string) => void }) {
  const [que, setQue] = useState("");
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setQue(sugerido); setRevisado(false); } }, [abierta, sugerido]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (que.trim() === "") return;
    alAgregar(que.trim());
    alCerrar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Producto nuevo" testId="hoja-producto-nuevo">
      <form className="recibir__nuevo-producto" onSubmit={enviar} noValidate>
        <Campo etiqueta="¿Qué es?" value={que} onChange={(e) => setQue(e.target.value)} placeholder="Por ejemplo: disco de corte 115 mm" maxLength={200} error={revisado && que.trim() === "" ? "Escribí qué producto es." : null} autoFocus data-testid="descripcion-nueva" />
        <p className="detalle">Queda en productos después de registrar el ingreso. La cantidad y el costo se ponen en el renglón.</p>
        <Boton type="submit" variante="principal" tam="grande" ancho data-testid="agregar-al-ingreso">Agregar al ingreso</Boton>
      </form>
    </Hoja>
  );
}

// ---------------------------------------------------------------- Al costado: la semana y las compras recientes

function ComprasRecientes({ version, catalogo }: { version: number; catalogo: Producto[] | null }) {
  const { enLinea } = useConexion();
  const [compras, setCompras] = useState<Compra[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semana, setSemana] = useState<Semana | null>(null);
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [errorAlAnular, setErrorAlAnular] = useState<string | null>(null);

  const cargar = useCallback(() => {
    api<Semana>("/compras/semana").then(setSemana).catch(() => undefined);
    return api<Compra[]>("/compras").then((c) => { setCompras(c); setError(null); }).catch((e) => setError(mensajeDe(e, "Se ven cuando vuelva internet.")));
  }, []);
  useEffect(() => { void cargar(); }, [cargar, version]);
  useEffect(() => { if (enLinea && error) void cargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  const compraAbierta = compras?.find((c) => c.id === abierta);
  const compraPorAnular = compras?.find((c) => c.id === porAnular);
  const comprasDeLaSemana = semana?.por_proveedor.reduce((suma, p) => suma + Number(p.compras), 0) ?? 0;
  // La compra no trae la unidad de cada renglón: se toma la del producto del catálogo.
  const unidadDelItem = (descripcion: string) => catalogo?.find((p) => p.descripcion === descripcion)?.unidad ?? "unidad";

  async function anular(c: Compra) {
    if (anulando) return;
    setAnulando(true); setErrorAlAnular(null);
    try {
      await api(`/compras/${c.id}/anular`, { method: "POST", body: JSON.stringify({ motivo: "" }) });
      setPorAnular(null);
      avisar("Compra anulada", { detalle: "Lo que había sumado ya se descontó del stock." });
      await cargar();
    } catch (e) {
      setErrorAlAnular(e instanceof ErrorApi ? e.message : "Se cortó la conexión. Probá de nuevo cuando vuelva internet.");
    } finally {
      setAnulando(false);
    }
  }

  return (
    <aside className="recibir__recientes">
      {semana && (
        <Tarjeta variante="verde" className="recibir__semana" data-testid="gastos-semana">
          <p>Compras de esta semana</p>
          <strong className="cifra">{pesos(semana.total)}</strong>
          <span>{plural(comprasDeLaSemana, "compra", "compras")}</span>
        </Tarjeta>
      )}

      <h2>Compras recientes</h2>
      {compras === null && !error && <Cargando texto="Cargando las compras…" />}
      {compras === null && error && <Aviso tipo="alerta" titulo="No se pudieron traer las compras" accion={{ texto: "Reintentar", alTocar: () => void cargar() }} testId="error-compras">{error}</Aviso>}
      {compras?.length === 0 && <p className="detalle">Todavía no hay compras registradas.</p>}
      {compras && compras.length > 0 && (
        <Lista data-testid="compras-recientes">
          {(todas ? compras : compras.slice(0, COMPRAS_A_LA_VISTA)).map((c) => (
            <Renglon
              key={c.id}
              apagado={c.estado === "anulada"}
              inicio={<Iniciales nombre={c.proveedor} tono="marca" forma="cuadrada" />}
              titulo={c.proveedor}
              detalle={queDia(c.fecha)}
              fin={c.estado === "anulada" ? <Pastilla tipo="error">Anulada</Pastilla> : <span className="cifra">{pesos(c.total)}</span>}
              alTocar={() => setAbierta(c.id)}
              testId="compra-reciente"
            />
          ))}
        </Lista>
      )}
      {compras && compras.length > COMPRAS_A_LA_VISTA && !todas && <Boton variante="texto" tam="chico" onClick={() => setTodas(true)}>Ver las {compras.length} compras</Boton>}

      <Hoja
        abierta={compraAbierta !== undefined}
        alCerrar={() => setAbierta(null)}
        titulo={`Compra a ${compraAbierta?.proveedor ?? ""}`}
        pie={compraAbierta && compraAbierta.estado !== "anulada" ? <Boton disabled={!enLinea} onClick={() => { setErrorAlAnular(null); setPorAnular(compraAbierta.id); setAbierta(null); }} data-testid="anular">Anular esta compra</Boton> : undefined}
        testId="hoja-compra"
      >
        {compraAbierta && (
          <>
            <p className="recibir__datos">
              {compraAbierta.estado === "anulada" && <Pastilla tipo="error">Anulada</Pastilla>}
              <span>{queDia(compraAbierta.fecha)}</span>
              <span>{comprobanteDe(compraAbierta)}</span>
            </p>
            <ul className="recibir__comprado">
              {compraAbierta.items.map((i, n) => {
                const unidad = unidadDelItem(i.descripcion);
                return (
                  <li key={n}>
                    <span><strong>{i.descripcion}</strong><span>{cantidad(i.cantidad, unidad)} · {pesosConCentavos(i.costo_unitario)} {porUnidad(unidad)}</span></span>
                    <strong className="cifra">{pesos(Number(i.cantidad) * Number(i.costo_unitario))}</strong>
                  </li>
                );
              })}
            </ul>
            <p className="recibir__total-comprado"><span>Total</span><strong className="cifra">{pesos(compraAbierta.total)}</strong></p>
            {compraAbierta.estado !== "anulada" && !enLinea && <p className="detalle">Para anular una compra hace falta conexión.</p>}
          </>
        )}
      </Hoja>

      <Confirmar
        abierta={compraPorAnular !== undefined}
        titulo={compraPorAnular ? `¿Anular la compra a ${compraPorAnular.proveedor} de ${pesos(compraPorAnular.total)}?` : ""}
        confirmar={anulando ? "Anulando…" : "Sí, anular"}
        ocupado={anulando || !enLinea}
        alCancelar={() => setPorAnular(null)}
        alConfirmar={() => { if (compraPorAnular) void anular(compraPorAnular); }}
        testId="hoja-anular"
      >
        <p>No se puede deshacer. Lo que sumó esta compra se descuenta del stock.</p>
        {!enLinea && <Aviso tipo="alerta" titulo="Sin conexión">Para anular una compra hace falta conexión.</Aviso>}
        {errorAlAnular && <Aviso tipo="error" titulo="No se pudo anular la compra" testId="error-anular">{errorAlAnular}</Aviso>}
      </Confirmar>
    </aside>
  );
}

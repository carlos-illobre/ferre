import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { anularCompra, cambiarAlmacen, nuevoId, registrarCompra, useAlmacen } from "../almacen";
import {
  buscarProductos, cantidad, CODIGO_DESCONOCIDO, numero, pesos, pesosConCentavos, porUnidad, proveedorDe, totalDeCompra, usuarioDe, vaConDecimal,
  type Producto, type Unidad,
} from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Aviso, avisar, BarraDeAccion, Boton, Buscador, Campo, Cantidad, clases, Confirmar, Escaner, Exito, Hoja, Icono, Iniciales, Lista, Pagina, Pastilla,
  Renglon, Segmentos, Tarjeta, Vacio, useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, useEsCelular } from "../ruta";
import "../estilos/recibir.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Con mercadería cargada" },
  { clave: "vacio", nombre: "Recién abierta, sin nada" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
  { clave: "error", nombre: "No se pudo registrar" },
];

// ---------------------------------------------------------------- Lo que se va cargando

type Comprobante = "factura" | "remito" | "sin";

const COMPROBANTES: { clave: Comprobante; nombre: string }[] = [
  { clave: "factura", nombre: "Factura" },
  { clave: "remito", nombre: "Remito" },
  { clave: "sin", nombre: "Sin comprobante" },
];

const UNIDADES: { clave: Unidad; nombre: string }[] = [
  { clave: "unidad", nombre: "Unidad" },
  { clave: "kilo", nombre: "Kilo" },
  { clave: "metro", nombre: "Metro" },
  { clave: "litro", nombre: "Litro" },
];

/** Un renglón del ingreso. El costo se guarda como se escribe; `leerCosto` lo pasa a número. */
type Linea = {
  id: string;
  /** `null` cuando es un «Producto nuevo» (no está en el catálogo). */
  productoId: string | null;
  nombre: string;
  unidad: Unidad;
  cantidad: number;
  costo: string;
};

/** "1.722,00" → 1722; "5200" → 5200; vacío o cero → `null`. */
function leerCosto(texto: string): number | null {
  let limpio = texto.replace(/[^\d.,]/g, "");
  if (limpio.includes(",")) limpio = limpio.replace(/\./g, "").replace(",", ".");
  else if (!/^\d+\.\d{1,2}$/.test(limpio)) limpio = limpio.replace(/\./g, "");
  const valor = Number(limpio);
  return limpio !== "" && Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) / 100 : null;
}

function costoATexto(valor: number | null): string {
  return valor === null ? "" : pesosConCentavos(valor).slice(1);
}

/** El costo con el que viene un producto: el de la lista de ese proveedor o, si no lo vende, el vigente. */
function costoDeLista(producto: Producto | undefined, proveedorId: string | null): number | null {
  if (!producto) return null;
  return producto.proveedores.find((x) => x.proveedorId === proveedorId)?.costo ?? producto.costo;
}


const LINEAS_DE_EJEMPLO: Linea[] = [
  { id: "ej-1", productoId: "mecha-6-madera", nombre: "Mecha 6 mm madera", unidad: "unidad", cantidad: 10, costo: "1.722,00" },
  { id: "ej-2", productoId: "clavo-paris-2", nombre: "Clavo punta París 2 pulgadas", unidad: "kilo", cantidad: 12.5, costo: "5.200,00" },
  { id: "ej-3", productoId: null, nombre: "Disco de corte 115 mm", unidad: "unidad", cantidad: 5, costo: "" },
];

/** El comprobante de cada compra. El almacén común no lo guarda: vive acá mientras dura la maqueta. */
const comprobanteDe = new Map<string, string>([
  ["c-3", "Factura 0003-00012847"],
  ["c-2", "Remito 0001-00004410"],
  ["c-1", "Sin comprobante"],
]);

function hoyParaElCampo(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Hecha = { total: number; proveedor: string; productos: number; actualizados: number; nuevos: number; sinConexion: boolean };

// ---------------------------------------------------------------- Pantalla

export default function Recibir() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const proveedores = useAlmacen((a) => a.proveedores);
  const productos = useAlmacen((a) => a.productos);
  const compras = useAlmacen((a) => a.compras);

  const [proveedorId, setProveedorId] = useState<string | null>(null);
  const [comprobante, setComprobante] = useState<Comprobante>("factura");
  const [numeroDeComprobante, setNumeroDeComprobante] = useState("");
  const [fecha, setFecha] = useState(hoyParaElCampo);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [recien, setRecien] = useState<string | null>(null);
  const [codigoSuelto, setCodigoSuelto] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);
  const [hecha, setHecha] = useState<Hecha | null>(null);
  const [hoja, setHoja] = useState<"nuevo" | "escaner" | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [porAnular, setPorAnular] = useState<string | null>(null);
  const buscador = useRef<HTMLInputElement>(null);
  const idResultados = useId();
  const saltear = useRef(false);

  useEffect(() => {
    // Al registrar desde el estado «error» la dirección vuelve a «normal»: ahí no hay que recargar el ejemplo.
    if (saltear.current) { saltear.current = false; return; }
    setHecha(null);
    setIntento(false);
    setCodigoSuelto(null);
    setConsulta("");
    if (estado === "vacio") {
      setLineas([]); setProveedorId(null); setComprobante("factura"); setNumeroDeComprobante("");
    } else {
      setLineas(estado === "error" ? LINEAS_DE_EJEMPLO.map((l) => (l.costo === "" ? { ...l, costo: "1.150,00" } : l)) : LINEAS_DE_EJEMPLO);
      setProveedorId("comodo"); setComprobante("factura"); setNumeroDeComprobante("0003-00012851");
    }
  }, [estado]);

  // Al agregar un renglón, el foco va al dato que sigue: el costo si falta, si no la cantidad.
  useEffect(() => {
    if (!recien) return;
    const renglon = document.querySelector<HTMLElement>(`[data-linea="${recien}"]`);
    renglon?.scrollIntoView({ block: "nearest" });
    if (!esCelular) renglon?.querySelector<HTMLInputElement>(renglon.dataset.falta ? ".campo__entrada" : ".cantidad__numero")?.focus();
    const reloj = window.setTimeout(() => setRecien(null), 1200);
    return () => window.clearTimeout(reloj);
  }, [recien, esCelular]);

  const proveedor = proveedores.find((p) => p.id === proveedorId);
  const resultados = buscarProductos(productos, consulta);
  const sinCosto = lineas.filter((l) => leerCosto(l.costo) === null).length;
  const total = Math.round(lineas.reduce((suma, l) => suma + l.cantidad * (leerCosto(l.costo) ?? 0), 0));

  const falta =
    !proveedor ? { titulo: "Elegí de quién llegó", detalle: "Tocá el proveedor, arriba de todo." }
    : sinCosto > 0 ? { titulo: sinCosto === 1 ? "Falta el costo de un producto" : `Falta el costo de ${sinCosto} productos`, detalle: "Escribilo en el renglón marcado." }
    : null;
  useEffect(() => { if (!falta) setIntento(false); }, [falta]);

  // ---- Agregar

  function agregar(producto: Producto) {
    const existente = lineas.find((l) => l.productoId === producto.id);
    if (existente) {
      setLineas(lineas.map((l) => (l.id === existente.id ? { ...l, cantidad: l.cantidad + 1 } : l)));
      setRecien(existente.id);
    } else {
      const id = nuevoId("l");
      setLineas([...lineas, { id, productoId: producto.id, nombre: producto.nombre, unidad: producto.unidad, cantidad: 1, costo: costoATexto(costoDeLista(producto, proveedorId)) }]);
      setRecien(id);
    }
    setConsulta("");
    setMarcado(0);
    setCodigoSuelto(null);
  }

  function agregarNuevo(nombre: string, unidad: Unidad) {
    const id = nuevoId("l");
    setLineas([...lineas, { id, productoId: null, nombre, unidad, cantidad: 1, costo: "" }]);
    setRecien(id);
    setConsulta("");
    setCodigoSuelto(null);
  }

  function leerCodigo(codigo: string) {
    const producto = productos.find((p) => p.codigoDeBarras === codigo);
    if (producto) { agregar(producto); return; }
    setCodigoSuelto(codigo);
    setConsulta("");
    buscador.current?.focus();
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    if (e.key === "Enter") {
      e.preventDefault();
      const elegido = resultados[Math.min(marcado, resultados.length - 1)];
      if (elegido) agregar(elegido);
      else if (/^\d{8,14}$/.test(consulta.trim())) leerCodigo(consulta.trim());
    }
  }

  function cambiarLinea(id: string, cambios: Partial<Linea>) {
    setLineas((antes) => antes.map((l) => (l.id === id ? { ...l, ...cambios } : l)));
  }

  // ---- Registrar

  function registrar() {
    if (falta || !proveedor) {
      setIntento(true);
      if (proveedor) document.querySelector("[data-falta]")?.scrollIntoView({ block: "center" });
      else window.scrollTo(0, 0);
      return;
    }
    // Los productos nuevos entran al catálogo, sin margen (quedan «sin precio» hasta elegirlo).
    const nuevos: Producto[] = [];
    let actualizados = 0;
    const renglones = lineas.map((l) => {
      const costo = leerCosto(l.costo) ?? 0;
      if (l.productoId) {
        const deLista = costoDeLista(productos.find((p) => p.id === l.productoId), proveedor.id);
        if (deLista !== costo) actualizados += 1;
        return { productoId: l.productoId, cantidad: l.cantidad, costo };
      }
      const producto: Producto = {
        id: nuevoId("p"), nombre: l.nombre, marca: "Sin marca", unidad: l.unidad, costo, margen: null,
        proveedores: [{ proveedorId: proveedor.id, codigo: "", costo }], codigoDeBarras: null, stock: 0, sectorId: "", tono: "negro",
      };
      nuevos.push(producto);
      return { productoId: producto.id, cantidad: l.cantidad, costo };
    });
    if (nuevos.length > 0) cambiarAlmacen((a) => ({ ...a, productos: [...a.productos, ...nuevos] }));
    const compra = registrarCompra(proveedor.id, renglones);
    comprobanteDe.set(compra.id, comprobante === "sin" ? "Sin comprobante" : `${comprobante === "factura" ? "Factura" : "Remito"} ${numeroDeComprobante.trim()}`.trim());
    if (!enLinea) cambiarAlmacen((a) => ({ ...a, porEnviar: a.porEnviar + 1 }));
    setHecha({ total: totalDeCompra(compra), proveedor: proveedor.nombre, productos: renglones.length, actualizados, nuevos: nuevos.length, sinConexion: !enLinea });
    setLineas([]); setProveedorId(null); setComprobante("factura"); setNumeroDeComprobante(""); setFecha(hoyParaElCampo());
    if (estado === "error") { saltear.current = true; cambiarParametro("estado", null); }
    window.scrollTo(0, 0);
  }

  // ---- Pantalla de éxito

  if (hecha) {
    const partes = [
      hecha.actualizados === 1 ? "1 costo actualizado" : hecha.actualizados > 1 ? `${hecha.actualizados} costos actualizados` : null,
      hecha.nuevos === 1 ? "1 producto nuevo" : hecha.nuevos > 1 ? `${hecha.nuevos} productos nuevos` : null,
    ].filter(Boolean).join(" y ");
    const detalle = (
      <>
        {hecha.proveedor} · {hecha.productos === 1 ? "1 producto" : `${hecha.productos} productos`}
        {partes && <><br />{partes}</>}
        {hecha.sinConexion && <><br />Se envía solo cuando vuelva internet.</>}
      </>
    );
    return (
      <Pagina titulo="Recibir mercadería" estados={ESTADOS}>
        <Exito tipo={hecha.sinConexion ? "pendiente" : "bien"} titulo={hecha.sinConexion ? "Ingreso guardado en este dispositivo" : "Ingreso registrado"} importe={pesos(hecha.total)} detalle={detalle} boton="Recibir otra" alSeguir={() => setHecha(null)} />
      </Pagina>
    );
  }

  // ---- Compras recientes

  const vigentes = compras.filter((c) => !c.anulada);
  const gastado = vigentes.reduce((suma, c) => suma + totalDeCompra(c), 0);
  const compraAbierta = compras.find((c) => c.id === abierta);
  const compraPorAnular = compras.find((c) => c.id === porAnular);

  return (
    <Pagina titulo="Recibir mercadería" estados={ESTADOS}>
      <div className="recibir">
        <section className="recibir__formulario" aria-label="Lo que llegó">
          <div className="recibir__parte">
            <h2>¿De quién llegó?</h2>
            <div className="recibir__proveedores" role="group" aria-label="Proveedor">
              {proveedores.map((p) => (
                <button key={p.id} type="button" aria-pressed={proveedorId === p.id} className={clases("recibir__proveedor", proveedorId === p.id && "recibir__proveedor--elegido")} onClick={() => setProveedorId(p.id)}>
                  <Iniciales nombre={p.nombre} tono="negro" forma="cuadrada" />
                  <strong>{p.nombre}</strong>
                  {proveedorId === p.id && <Icono nombre="tilde" tam={18} grosor={2.4} />}
                </button>
              ))}
            </div>

            <div className={clases("recibir__comprobante", comprobante !== "sin" && "recibir__comprobante--con-datos")}>
              <Segmentos etiqueta="Comprobante" opciones={COMPROBANTES} elegido={comprobante} alElegir={setComprobante} />
              {comprobante !== "sin" && (
                <>
                  <Campo etiqueta="Número (opcional)" inputMode="numeric" value={numeroDeComprobante} onChange={(e) => setNumeroDeComprobante(e.target.value)} placeholder="0001-00001234" />
                  <Campo etiqueta="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </>
              )}
            </div>
          </div>

          <div className="recibir__parte recibir__parte--productos">
            <h2>¿Qué llegó?</h2>
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

            {codigoSuelto && (
              <Aviso tipo="alerta" titulo={`El código ${codigoSuelto} no está en el catálogo`} accion={{ texto: "Cargarlo como nuevo", alTocar: () => setHoja("nuevo") }}>
                Buscalo por el nombre o cargalo como producto nuevo.
              </Aviso>
            )}

            {consulta.trim() !== "" ? (
              <div className="recibir__resultados" id={idResultados} role="listbox" aria-label="Productos encontrados">
                {resultados.map((p, i) => {
                  const costo = costoDeLista(p, proveedorId);
                  return (
                    <button key={p.id} type="button" role="option" id={`${idResultados}-${i}`} aria-selected={i === marcado} className={clases("recibir__resultado", i === marcado && "recibir__resultado--marcado")} onClick={() => agregar(p)} onMouseEnter={() => setMarcado(i)}>
                      <span className="recibir__resultado-texto"><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                      {costo !== null && <span className="recibir__resultado-costo"><span>Costo</span><strong className="cifra">{pesosConCentavos(costo)}</strong></span>}
                      <span className="recibir__sumar" aria-hidden="true"><Icono nombre="mas" tam={20} /></span>
                    </button>
                  );
                })}
                {resultados.length === 0 && (
                  <div className="recibir__sin-resultados">
                    <p>No hay productos con «{consulta.trim()}».</p>
                    <Boton icono="mas" onClick={() => setHoja("nuevo")}>Cargarlo como producto nuevo</Boton>
                  </div>
                )}
              </div>
            ) : (
              <Boton variante="texto" tam="chico" icono="mas" className="recibir__nuevo" onClick={() => setHoja("nuevo")}>{esCelular ? "Cargar un producto nuevo" : "Cargar un producto que no está en el catálogo"}</Boton>
            )}

            {lineas.length === 0 ? (
              <Vacio icono="recibir" titulo="Todavía no cargaste nada">
                {proveedor ? "Buscá el primer producto que llegó y poné cuánto vino." : "Elegí de quién llegó y buscá el primer producto."}
              </Vacio>
            ) : (
              <ul className="recibir__lineas">
                {lineas.map((l) => (
                  <LineaDelIngreso
                    key={l.id}
                    linea={l}
                    deLista={costoDeLista(productos.find((p) => p.id === l.productoId), proveedorId)}
                    recien={recien === l.id}
                    alCambiar={(cambios) => cambiarLinea(l.id, cambios)}
                    alQuitar={() => setLineas(lineas.filter((x) => x.id !== l.id))}
                    alTerminar={() => buscador.current?.focus()}
                  />
                ))}
              </ul>
            )}
          </div>

          {lineas.length > 0 && (
            <BarraDeAccion className="recibir__registrar">
              {estado === "error" && <Aviso tipo="error" titulo="No se pudo registrar el ingreso">Lo que cargaste sigue acá. Revisá la conexión y tocá «Registrar ingreso» de nuevo.</Aviso>}
              {intento && falta && <Aviso tipo="alerta" titulo={falta.titulo}>{falta.detalle}</Aviso>}
              {!enLinea && <p className="recibir__sin-conexion"><Icono nombre="sin-conexion" tam={18} />Sin conexión: el ingreso se guarda en este dispositivo y se envía solo.</p>}
              <p className="recibir__total">
                <span>Total · {lineas.length === 1 ? "1 producto" : `${lineas.length} productos`}</span>
                <strong className="cifra">{pesos(total)}</strong>
              </p>
              <Boton variante="principal" tam="grande" iconoFinal="flecha" onClick={registrar}>Registrar ingreso</Boton>
            </BarraDeAccion>
          )}
        </section>

        <aside className="recibir__recientes">
          <Tarjeta variante="verde" className="recibir__semana">
            <p>Compras de esta semana</p>
            <strong className="cifra">{pesos(gastado)}</strong>
            <span>{vigentes.length === 1 ? "1 compra" : `${vigentes.length} compras`}</span>
          </Tarjeta>

          <h2>Compras recientes</h2>
          {compras.length === 0 ? (
            <p className="detalle">Todavía no hay compras registradas.</p>
          ) : (
            <Lista>
              {compras.map((c) => (
                <Renglon
                  key={c.id}
                  apagado={c.anulada}
                  inicio={<Iniciales nombre={proveedorDe(c.proveedorId)?.nombre ?? "?"} tono="marca" forma="cuadrada" />}
                  titulo={proveedorDe(c.proveedorId)?.nombre}
                  detalle={c.cuando}
                  fin={c.anulada ? <Pastilla tipo="error">Anulada</Pastilla> : <span className="cifra">{pesos(totalDeCompra(c))}</span>}
                  alTocar={() => setAbierta(c.id)}
                />
              ))}
            </Lista>
          )}
        </aside>
      </div>

      <ProductoNuevo abierta={hoja === "nuevo"} sugerido={resultados.length === 0 ? consulta.trim() : ""} alCerrar={() => setHoja(null)} alAgregar={agregarNuevo} />
      <Escaner
        abierto={hoja === "escaner"}
        alCerrar={() => setHoja(null)}
        alLeer={leerCodigo}
        ejemplos={[{ codigo: "7790001000022", nombre: "Mecha 8 mm widia" }, { codigo: CODIGO_DESCONOCIDO, nombre: "Un código que no está en el catálogo" }]}
      />

      <Hoja
        abierta={compraAbierta !== undefined}
        alCerrar={() => setAbierta(null)}
        titulo={`Compra a ${proveedorDe(compraAbierta?.proveedorId ?? "")?.nombre ?? ""}`}
        pie={compraAbierta && !compraAbierta.anulada ? <Boton disabled={!enLinea} onClick={() => { setPorAnular(compraAbierta.id); setAbierta(null); }}>Anular esta compra</Boton> : undefined}
      >
        {compraAbierta && (
          <>
            <p className="recibir__datos">
              {compraAbierta.anulada && <Pastilla tipo="error">Anulada</Pastilla>}
              <span>{compraAbierta.cuando} · la cargó {usuarioDe(compraAbierta.usuarioId)?.nombre}</span>
              <span>{comprobanteDe.get(compraAbierta.id) ?? "Sin comprobante"}</span>
            </p>
            <ul className="recibir__comprado">
              {compraAbierta.renglones.map((r) => {
                const producto = productos.find((p) => p.id === r.productoId);
                return (
                  <li key={r.productoId}>
                    <span><strong>{producto?.nombre ?? "Producto"}</strong><span>{cantidad(r.cantidad, producto?.unidad)} · {pesosConCentavos(r.costo)} {porUnidad(producto?.unidad ?? "unidad")}</span></span>
                    <strong className="cifra">{pesos(r.cantidad * r.costo)}</strong>
                  </li>
                );
              })}
            </ul>
            <p className="recibir__total-comprado"><span>Total</span><strong className="cifra">{pesos(totalDeCompra(compraAbierta))}</strong></p>
            {!compraAbierta.anulada && !enLinea && <p className="detalle">Para anular una compra hace falta conexión.</p>}
          </>
        )}
      </Hoja>

      <Confirmar
        abierta={compraPorAnular !== undefined}
        titulo={compraPorAnular ? `¿Anular la compra a ${proveedorDe(compraPorAnular.proveedorId)?.nombre} de ${pesos(totalDeCompra(compraPorAnular))}?` : ""}
        confirmar="Sí, anular"
        alCancelar={() => setPorAnular(null)}
        alConfirmar={() => {
          if (compraPorAnular) { anularCompra(compraPorAnular.id); avisar("Compra anulada", { detalle: "Lo que había sumado ya se descontó del stock." }); }
          setPorAnular(null);
        }}
      >
        <p>No se puede deshacer. Lo que sumó esta compra se descuenta del stock.</p>
      </Confirmar>
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
  const conDecimal = vaConDecimal(linea.unidad);
  const diferencia = costo !== null && deLista ? ((costo - deLista) / deLista) * 100 : 0;
  const cambio = Math.abs(diferencia) < 0.05 ? null : diferencia > 0 ? "subio" : "bajo";

  return (
    <li
      className={clases("recibir__linea", costo === null && "recibir__linea--falta", recien && "recibir__linea--recien")}
      data-linea={linea.id}
      data-falta={costo === null || undefined}
      onKeyDown={(e) => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); e.target.blur(); alTerminar(); } }}
    >
      <div className="recibir__nombre">
        <strong>{linea.nombre}</strong>
        <span className="recibir__notas">
          {linea.productoId === null && <Pastilla tipo="info">Producto nuevo</Pastilla>}
          {costo === null && <Pastilla tipo="alerta" icono="alerta">Falta el costo</Pastilla>}
          {cambio === "subio" && <Pastilla tipo="alerta" icono="flecha-arriba">Subió {numero(Math.abs(diferencia))} %</Pastilla>}
          {cambio === "bajo" && <Pastilla tipo="bien" icono="flecha-abajo">Bajó {numero(Math.abs(diferencia))} %</Pastilla>}
          {deLista !== null && <span>En la lista: {pesosConCentavos(deLista)}</span>}
        </span>
      </div>

      <div className="recibir__cuanto">
        <span className="recibir__rotulo" aria-hidden="true">Cantidad{conDecimal && ` en ${cantidad(2, linea.unidad).slice(2)}`}</span>
        <Cantidad valor={linea.cantidad} decimal={conDecimal} etiqueta={`Cantidad de ${linea.nombre}`} alCambiar={(valor) => alCambiar({ cantidad: valor })} />
      </div>

      <Campo
        className="recibir__costo"
        etiqueta={`Costo ${porUnidad(linea.unidad)}`}
        prefijo="$"
        inputMode="decimal"
        placeholder="0,00"
        value={linea.costo}
        onChange={(e) => alCambiar({ costo: e.target.value.replace(/[^\d.,]/g, "") })}
        onBlur={() => { if (costo !== null) alCambiar({ costo: costoATexto(costo) }); }}
        aria-label={`Costo ${porUnidad(linea.unidad)} de ${linea.nombre}`}
      />

      <span className="recibir__subtotal cifra">{costo === null ? "" : pesos(linea.cantidad * costo)}</span>
      <Boton variante="texto" tam="chico" icono="basura" className="recibir__quitar" aria-label={`Quitar ${linea.nombre}`} onClick={alQuitar} />
    </li>
  );
}

// ---------------------------------------------------------------- Hoja: producto nuevo

function ProductoNuevo({ abierta, sugerido, alCerrar, alAgregar }: { abierta: boolean; sugerido: string; alCerrar: () => void; alAgregar: (nombre: string, unidad: Unidad) => void }) {
  const [que, setQue] = useState("");
  const [unidad, setUnidad] = useState<Unidad>("unidad");
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setQue(sugerido); setUnidad("unidad"); setRevisado(false); } }, [abierta, sugerido]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (que.trim() === "") return;
    alAgregar(que.trim(), unidad);
    alCerrar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Producto nuevo">
      <form className="recibir__nuevo-producto" onSubmit={enviar} noValidate>
        <Campo etiqueta="¿Qué es?" value={que} onChange={(e) => setQue(e.target.value)} placeholder="Por ejemplo: disco de corte 115 mm" error={revisado && que.trim() === "" ? "Escribí qué producto es." : null} autoFocus />
        <div>
          <p className="recibir__pregunta">¿Cómo se compra?</p>
          <Segmentos etiqueta="Cómo se compra" opciones={UNIDADES} elegido={unidad} alElegir={setUnidad} />
        </div>
        <p className="detalle">Queda en productos después de registrar el ingreso. La cantidad y el costo se ponen en el renglón.</p>
        <Boton type="submit" variante="principal" tam="grande" ancho>Agregar al ingreso</Boton>
      </form>
    </Hoja>
  );
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { leerTodo } from "../../almacen";
import { api, ErrorApi } from "../../api";
import { useCatalogo, type StockFila } from "../../catalogo";
import { enviarOEncolar } from "../../cola";
import { useConexion } from "../conexion";
import { cantidad, numero, pesos, vaConDecimal } from "../formato";
import {
  Aviso, avisar, Boton, Buscador, Campo, Cantidad, Cargando, clases, ErrorDeCarga, Hoja, Lista, Pagina, Pastilla, Renglon, Segmentos, Tarjeta, TituloDeSeccion, Vacio,
} from "../piezas";
import { cambiarParametro, ir, useParametro } from "../rutas";
import { cuando, mensajeDe, plural, queDia, type Producto } from "./deposito-comun";
import "../estilos/stock.css";

// Cuánto hay de cada producto y la plata que eso representa. El stock de un producto es la
// suma de sus movimientos: tocarlo los muestra. Corregir pide cuántas hay y por qué; no pide
// confirmar porque el ajuste queda a la vista entre los movimientos.
type Datos = { productos: StockFila[]; valor_total: number };
type Movimiento = { id: string; tipo: string; cantidad: string; referencia_tipo: string | null; fecha: string; nota: string | null };
type Filtro = "todos" | "sin-stock";

const MOTIVOS = ["Conté la estantería", "Rotura", "Se perdió", "Error de carga"];
const TOPE = 100;
const MOVIMIENTOS_A_LA_VISTA = 6;

/** La cantidad con su unidad; cero y negativo van marcados (con palabra y signo, no solo con color). */
function CuantoHay({ hay, unidad }: { hay: number; unidad: string }) {
  const texto = cantidad(hay, unidad);
  if (hay < 0) return <Pastilla tipo="error">{texto}</Pastilla>;
  if (hay === 0) return <Pastilla tipo="alerta">En cero</Pastilla>;
  return <span className="stock__cuanto">{texto}</span>;
}

export function Stock() {
  const { enLinea } = useConexion();
  const { catalogo, error: errorDelCatalogo, buscarProductos } = useCatalogo();
  const pedido = useParametro("producto");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [delDispositivo, setDelDispositivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consulta, setConsulta] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [elegidoId, setElegidoId] = useState<string | null>(pedido);
  const [corrigiendo, setCorrigiendo] = useState(false);
  // Correcciones guardadas sin conexión: se ven en la lista hasta que el servidor las confirma.
  const [porEnviar, setPorEnviar] = useState<Map<string, number>>(new Map());

  const cargar = useCallback(async () => {
    try {
      setDatos(await api<Datos>("/stock"));
      setDelDispositivo(false); setError(null); setPorEnviar(new Map());
    } catch (e) {
      if (e instanceof ErrorApi) { setError(e.message); return; }
      // Sin conexión: el último stock que bajó este dispositivo (trae las filas, no el total).
      const guardado = await leerTodo<StockFila>("stock").catch(() => [] as StockFila[]);
      if (guardado.length) { setDatos((d) => d ?? { productos: guardado, valor_total: guardado.reduce((s, f) => s + Number(f.valor), 0) }); setDelDispositivo(true); setError(null); }
      else setError("Revisá la conexión y probá de nuevo.");
    }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (enLinea && delDispositivo) void cargar(); }, [enLinea, delDispositivo, cargar]);
  useEffect(() => { if (pedido) { setElegidoId(pedido); setCorrigiendo(false); } }, [pedido]);

  const porId = useMemo(() => new Map((datos?.productos ?? []).map((f) => [f.id, f])), [datos]);
  const cuantoHay = useCallback((id: string) => porEnviar.get(id) ?? Number(porId.get(id)?.stock ?? 0), [porEnviar, porId]);

  const { lista, total } = useMemo(() => {
    if (!catalogo) return { lista: [] as Producto[], total: 0 };
    const valorDe = (p: Producto) => Number(porId.get(p.id)?.valor ?? 0);
    // Sin buscar, lo que alguna vez se movió, primero lo que más plata tiene puesta. Buscando, todo el catálogo.
    let base = consulta.trim() ? buscarProductos(consulta, TOPE) : catalogo.filter((p) => porId.has(p.id)).sort((a, b) => valorDe(b) - valorDe(a));
    if (filtro === "sin-stock") base = base.filter((p) => cuantoHay(p.id) <= 0);
    return { lista: base.slice(0, TOPE), total: base.length };
  }, [catalogo, consulta, buscarProductos, porId, filtro, cuantoHay]);

  function cerrar() {
    setElegidoId(null); setCorrigiendo(false);
    if (pedido) cambiarParametro("producto", null);
  }

  function corregido(p: Producto, habia: number, hay: number, motivo: string, encolado: boolean) {
    cerrar();
    if (encolado) setPorEnviar((m) => new Map(m).set(p.id, hay)); else void cargar();
    avisar(`${p.descripcion}: había ${numero(habia)}, hay ${numero(hay)}`, { detalle: encolado ? "Guardado en este dispositivo. Se envía cuando vuelva internet." : `Cantidad corregida. Motivo: ${motivo.toLowerCase()}.` });
  }

  if (error || errorDelCatalogo || !datos || !catalogo) {
    const falla = error ?? (!catalogo ? errorDelCatalogo : null);
    return (
      <Pagina titulo="Stock" testId="pantalla-stock">
        {falla
          ? <ErrorDeCarga titulo="No se pudo cargar el stock" alReintentar={() => { setError(null); void cargar(); }}>{falla}</ErrorDeCarga>
          : <Cargando texto={datos ? "Bajando el catálogo…" : "Cargando el stock…"} />}
      </Pagina>
    );
  }

  if (datos.productos.length === 0) {
    return (
      <Pagina titulo="Stock" testId="pantalla-stock">
        <Vacio icono="stock" titulo="Todavía no hay stock cargado" accion={{ texto: "Recibir mercadería", icono: "recibir", alTocar: () => ir("recibir") }} testId="sin-stock-cargado">
          El stock arranca en cero. Se carga cuando recibís mercadería o cuando contás una estantería.
        </Vacio>
      </Pagina>
    );
  }

  const enCero = datos.productos.filter((f) => cuantoHay(f.id) === 0).length;
  const enNegativo = datos.productos.filter((f) => cuantoHay(f.id) < 0).length;
  const elegido = catalogo.find((p) => p.id === elegidoId);

  return (
    <Pagina titulo="Stock" testId="pantalla-stock">
      <div className="stock__cifras" data-testid="valorizacion">
        <Tarjeta><p className="detalle">Plata invertida</p><strong className="cifra" data-testid="plata-invertida">{pesos(datos.valor_total)}</strong><span className="detalle">Al costo, sin IVA</span></Tarjeta>
        <Tarjeta><p className="detalle">En cero</p><strong className="cifra" data-testid="en-cero">{numero(enCero)}</strong><span className="detalle">{enCero === 1 ? "producto" : "productos"}</span></Tarjeta>
        <Tarjeta><p className="detalle">En negativo</p><strong className={clases("cifra", enNegativo > 0 && "stock__negativo")} data-testid="en-negativo">{numero(enNegativo)}</strong><span className="detalle">{enNegativo === 1 ? "producto" : "productos"}</span></Tarjeta>
      </div>

      <div className="stock__buscar">
        <Buscador valor={consulta} alCambiar={setConsulta} etiqueta="Buscar un producto" placeholder="Buscá un producto" />
        <Segmentos
          etiqueta="Qué productos mostrar"
          opciones={[{ clave: "todos", nombre: "Todos" }, { clave: "sin-stock", nombre: "En cero o negativo" }]}
          elegido={filtro}
          alElegir={setFiltro}
          testId="filtro"
        />
      </div>

      <TituloDeSeccion titulo={filtro === "todos" ? "Todos los productos" : "En cero o en negativo"}>{plural(total, "producto", "productos")}</TituloDeSeccion>

      {lista.length === 0 ? (
        <Vacio icono="buscar" titulo={consulta.trim() ? `No hay productos con «${consulta.trim()}»` : "No hay productos en cero ni en negativo"} accion={{ texto: "Ver todos", alTocar: () => { setConsulta(""); setFiltro("todos"); } }} testId="sin-resultados" />
      ) : (
        <Lista data-testid="tabla-stock">
          {lista.map((p) => (
            <Renglon key={p.id} titulo={p.descripcion} detalle={p.marca ?? p.proveedor ?? undefined} fin={<CuantoHay hay={cuantoHay(p.id)} unidad={p.unidad} />} alTocar={() => { setCorrigiendo(false); setElegidoId(p.id); }} testId="stock" />
          ))}
        </Lista>
      )}
      {total > TOPE && <p className="detalle stock__tope">Se muestran {TOPE} productos. Escribí en el buscador para llegar a los demás.</p>}

      <Hoja
        abierta={elegido !== undefined && !corrigiendo}
        alCerrar={cerrar}
        titulo={elegido?.descripcion ?? ""}
        pie={<Boton icono="editar" onClick={() => setCorrigiendo(true)} data-testid="corregir">Corregir cantidad</Boton>}
        testId="detalle-stock"
      >
        {elegido && !corrigiendo && <Detalle producto={elegido} hay={cuantoHay(elegido.id)} porEnviar={porEnviar.has(elegido.id)} />}
      </Hoja>

      {/* Se monta al abrirse: así la cantidad arranca en lo que figura. */}
      {elegido && corrigiendo && <Corregir producto={elegido} hay={cuantoHay(elegido.id)} alVolver={() => setCorrigiendo(false)} alGuardar={(hay, motivo, encolado) => corregido(elegido, cuantoHay(elegido.id), hay, motivo, encolado)} />}
    </Pagina>
  );
}

// ---------------------------------------------------------------- Hoja: el producto

const nombreDelMovimiento = (m: Movimiento) => (m.tipo === "venta" ? "Venta" : m.tipo === "compra" ? "Compra" : m.referencia_tipo === "conteo" ? "Conteo" : "Corrección");

function Detalle({ producto, hay, porEnviar }: { producto: Producto; hay: number; porEnviar: boolean }) {
  const [movimientos, setMovimientos] = useState<Movimiento[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    setMovimientos(null); setError(null);
    api<Movimiento[]>(`/stock/${producto.id}/movimientos`)
      .then((m) => { if (vigente) setMovimientos(m); })
      .catch((e) => { if (vigente) setError(mensajeDe(e, "Se ven cuando vuelva internet. Corregir la cantidad se puede igual.")); });
    return () => { vigente = false; };
  }, [producto.id]);

  return (
    <>
      <div className="stock__hay">
        <p className="detalle">Hay ahora</p>
        <strong className={clases("cifra", hay < 0 && "stock__negativo")} data-testid="hay-ahora">{cantidad(hay, producto.unidad)}</strong>
        {hay < 0 && <span className="detalle">Se vendió más de lo que figuraba. Contalo y corregí la cantidad.</span>}
        {porEnviar && <span className="detalle">Corregido en este dispositivo. Se envía cuando vuelva internet.</span>}
      </div>
      <div>
        <h3 className="stock__subtitulo">Últimos movimientos</h3>
        {error && <Aviso tipo="alerta" titulo="No se pudieron traer los movimientos" testId="error-movimientos">{error}</Aviso>}
        {!error && movimientos === null && <Cargando texto="Buscando los movimientos…" />}
        {movimientos?.length === 0 && <p className="detalle">Todavía no tiene movimientos.</p>}
        {movimientos && movimientos.length > 0 && (
          <ul className="stock__movimientos" data-testid="movimientos">
            {movimientos.slice(0, MOVIMIENTOS_A_LA_VISTA).map((m) => {
              const cambio = Number(m.cantidad);
              return (
                <li key={m.id}>
                  <span><strong>{nombreDelMovimiento(m)}</strong><span>{m.tipo === "compra" ? queDia(m.fecha) : cuando(m.fecha)}{m.nota && ` · ${m.nota}`}</span></span>
                  <strong className={clases("cifra", cambio > 0 ? "stock__positivo" : "stock__resta")}>{cambio > 0 ? "+" : "−"}{numero(Math.abs(cambio))}</strong>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Hoja: corregir la cantidad

type PropsDeCorregir = { producto: Producto; hay: number; alVolver: () => void; alGuardar: (hay: number, motivo: string, encolado: boolean) => void };

function Corregir({ producto, hay, alVolver, alGuardar }: PropsDeCorregir) {
  const [cuantas, setCuantas] = useState(() => Math.max(0, hay));
  const [motivo, setMotivo] = useState<string | null>(null);
  const [otro, setOtro] = useState("");
  const [revisado, setRevisado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [rechazo, setRechazo] = useState<string | null>(null);

  const porQue = otro.trim() || motivo;
  const sinCambio = cuantas === hay;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (!porQue || sinCambio || guardando) return;
    setGuardando(true); setRechazo(null);
    try {
      const { encolado } = await enviarOEncolar("stock.ajuste", "POST", `/stock/${producto.id}/ajustes`, { cantidad_real: cuantas, motivo: porQue });
      alGuardar(cuantas, porQue, encolado);
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      setRechazo(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Hoja abierta alCerrar={alVolver} titulo="Corregir cantidad" testId="hoja-corregir">
      <form className="stock__corregir" onSubmit={(e) => void guardar(e)} noValidate data-testid="correccion">
        <p className="stock__de-que"><strong>{producto.descripcion}</strong><span>Figuran {cantidad(hay, producto.unidad)}</span></p>

        <div className="stock__cuantas">
          <p className="stock__pregunta">¿Cuántas hay?</p>
          <Cantidad tam="grande" valor={cuantas} minimo={0} decimal={vaConDecimal(producto.unidad)} alCambiar={setCuantas} etiqueta={`Cuántas hay de ${producto.descripcion}`} testId="cantidad-real" />
          {revisado && sinCambio && <p className="stock__error" role="alert" data-testid="error-cantidad">Es la misma cantidad que ya figura. Cambiala o cerrá sin guardar.</p>}
        </div>

        <div>
          <p className="stock__pregunta">¿Por qué?</p>
          <Segmentos forma="grilla" etiqueta="Motivo de la corrección" opciones={MOTIVOS.map((m) => ({ clave: m, nombre: m }))} elegido={otro.trim() ? null : motivo} alElegir={(m) => { setMotivo(m); setOtro(""); }} testId="motivo-opcion" />
          <Campo className="stock__otro" etiqueta="U otro motivo" value={otro} onChange={(e) => setOtro(e.target.value)} placeholder="Escribilo acá" maxLength={200} error={revisado && !porQue ? "Elegí un motivo o escribilo: sin motivo no se guarda." : null} data-testid="motivo" />
        </div>

        {rechazo && <Aviso tipo="error" titulo="No se guardó la corrección" testId="error-correccion">{rechazo}</Aviso>}
        <Boton type="submit" variante="principal" tam="grande" ancho disabled={guardando} data-testid="guardar-ajuste">{guardando ? "Guardando…" : "Guardar"}</Boton>
      </form>
    </Hoja>
  );
}

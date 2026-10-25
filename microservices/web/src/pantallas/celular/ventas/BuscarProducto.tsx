import { precioDelProducto, urlDeFoto, abreviarUnidad, type Producto } from "../../../negocio/catalogo";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { AvisoError, Buscador, Hoja, Icono } from "../componentes/base";
import type { EstadoDeVender } from "./useVender";
import css from "./BuscarProducto.module.css";

// La búsqueda, como la hoja de la v2 (decisión 140): la caja con «Cancelar»; vacía, lo último que
// se vendió; escribiendo, cuántos y cada producto en una tarjeta con su foto, marca, stock y
// precio, y al final «Agregar «…»» como ítem libre. Tocar uno lo suma y cierra la hoja.
export function BuscarProducto({ v }: { v: EstadoDeVender }) {
  const { busqueda, catalogo, venta } = v;
  const texto = busqueda.consulta.trim();
  const lista = texto ? busqueda.resultados : v.ultimos;
  return (
    <Hoja alCerrar={v.cerrarBusqueda} testId="hoja-buscar" clase={css.hoja}>
      <div className={css.cab}>
        <Buscador valor={busqueda.consulta} alCambiar={busqueda.setConsulta} placeholder="Producto, código o marca" acciones={v.enLaCaja} cajaRef={v.caja} autoFoco />
        <button type="button" className={css.cancelar} onClick={v.cerrarBusqueda} data-testid="cancelar-busqueda">Cancelar</button>
      </div>
      <AvisoError texto={catalogo.error} />
      <Rotulo texto={texto} encontrados={busqueda.resultados.length} buscando={catalogo.buscandoEnElServidor} ultimos={v.ultimos.length} />
      <ul className={css.lista} role="listbox" aria-label="Productos" data-testid="sugerencias">
        {lista.map((p, i) => <Resultado key={p.id} producto={p} marcado={Boolean(texto) && i === busqueda.elegido} stock={catalogo.stock.get(p.id)} alElegir={() => venta.elegirSugerencia(p)} />)}
        {texto && !catalogo.buscandoEnElServidor && <AgregarLibre texto={texto} alAgregar={() => venta.agregar(null, texto)} />}
      </ul>
    </Hoja>
  );
}

// Cuántos encontró, que lo está buscando, que no está o, sin escribir, lo último que se vendió.
function Rotulo({ texto, encontrados, buscando, ultimos }: { texto: string; encontrados: number; buscando: boolean; ultimos: number }) {
  const deLaBusqueda = encontrados ? `${encontrados} ${encontrados === 1 ? "producto" : "productos"}` : buscando ? "Buscando…" : "No está en el catálogo";
  const rotulo = texto ? deLaBusqueda : ultimos ? "Lo último que se vendió" : "";
  return rotulo ? <p className={css.rotulo} data-testid="busqueda-rotulo">{rotulo}</p> : null;
}

const num = (n: number) => n.toLocaleString("es-AR");

function Resultado({ producto: p, marcado, stock, alElegir }: { producto: Producto; marcado: boolean; stock: number | undefined; alElegir: () => void }) {
  const precio = precioDelProducto(p).valor;
  return (
    <li role="option" aria-selected={marcado}>
      <button type="button" className={`${css.r} ${marcado ? css.elegida : ""}`} onClick={alElegir}>
        <Miniatura url={p.foto_url} />
        <span className={css.texto}>
          <b>{nombreDeProducto(p.descripcion)}</b>
          <small>{p.marca}{p.marca && stock !== undefined ? " · " : ""}<StockDelResultado stock={stock} unidad={p.unidad ?? "unidad"} /></small>
        </span>
        <strong className={`importe ${precio === null ? css.sin : ""}`}>{precio === null ? "Sin precio" : pesosCortos(precio)}</strong>
      </button>
    </li>
  );
}

function Miniatura({ url }: { url: string | null | undefined }) {
  const foto = urlDeFoto(url);
  return <span className="miniatura">{foto ? <img src={foto} alt="" /> : <Icono nombre="caja" tam={22} />}</span>;
}

function StockDelResultado({ stock, unidad }: { stock: number | undefined; unidad: string }) {
  if (stock === undefined) return null;
  return <span className={stock > 0 ? css.hay : css.noHay}>{stock > 0 ? `${num(stock)} ${abreviarUnidad(unidad)}` : "sin stock"}</span>;
}

function AgregarLibre({ texto, alAgregar }: { texto: string; alAgregar: () => void }) {
  return (
    <li>
      <button type="button" className={css.r} onClick={alAgregar} data-testid="agregar-libre">
        <span className="miniatura"><Icono nombre="caja" tam={22} /></span>
        <span className={css.texto}><b>Agregar «{texto}»</b><small>Como ítem libre, con precio a mano</small></span>
        <Icono nombre="mas" tam={20} />
      </button>
    </li>
  );
}

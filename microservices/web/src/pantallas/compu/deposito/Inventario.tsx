import { Aviso, Boton, Pagina, Progreso, Toast } from "../base/ui";
import { AccionesDeInventario } from "./AccionesDeInventario";
import { CuentaDelProducto } from "./CuentaDelProducto";
import { InventarioVacio } from "./InventarioVacio";
import { ListaDeStock } from "./ListaDeStock";
import { ResumenDelStock } from "./ResumenDelStock";
import { useInventario, type Inventario } from "./useInventario";
import { useAccionesDeInventario } from "./useAccionesDeInventario";
import css from "./Inventario.module.css";

// Stock, como la v2 («Lista y cuenta del producto», decisión 148): arriba los números del depósito,
// a la izquierda la búsqueda, los filtros y los productos, y a la derecha, fijo, el elegido con su
// stock, los movimientos que lo explican (con lo que queda después de cada uno) y la corrección.
// El dinero invertido, solo con «Ver el dinero invertido» (decisión 96). Corregir pide cuántas hay y
// por qué, y no confirma: el ajuste queda a la vista entre los movimientos.
const SIN_CONEXION = "Sin conexión: ves el último stock que bajó este dispositivo. Si corregís un stock queda guardado acá y se manda solo al volver internet.";

export function Inventario() {
  const x = useInventario();
  const enLaCaja = useAccionesDeInventario(x);
  return (
    <Pagina titulo="Inventario" testId="pantalla-stock" className="stock-v2" acciones={<AccionesDeInventario pidePedidos={x.pidePedidos} />}>
      <AvisosDelInventario x={x} />
      {x.esperando && <Progreso texto="Trayendo el stock…" />}
      {x.conDatos && <ResumenDelStock x={x} datos={x.datos!} />}
      {x.sinNada && <InventarioVacio />}
      {x.conDatos && <div className={css.cuerpo}><ListaDeStock x={x} enLaCaja={enLaCaja} /><ElElegido x={x} /></div>}
    </Pagina>
  );
}

function AvisosDelInventario({ x }: { x: Inventario }) {
  return (
    <>
      <Aviso tipo="error" accion={<Boton tam="chico" icono="repetir" onClick={x.cargar}>Reintentar</Boton>}>{x.error}</Aviso>
      <Aviso tipo="error">{!x.error ? x.errorCatalogo : null}</Aviso>
      <Aviso tipo="alerta" testId="sin-conexion">{!x.enLinea || x.delDispositivo ? SIN_CONEXION : null}</Aviso>
      <Toast texto={x.mensaje} alCerrar={() => x.setMensaje(null)} />
    </>
  );
}

// A la derecha, la cuenta del elegido (con lo último que se sabe de él).
function ElElegido({ x }: { x: Inventario }) {
  const e = x.elegido;
  if (!e) return <aside className={`${css.panel} ${css.sinElegido} detalle`}>Elegí un producto para ver su stock, sus movimientos y corregirlo.</aside>;
  return (
    <CuentaDelProducto key={e.id} panelRef={x.panel} producto={x.catalogo.find((p) => p.id === e.id) ?? e} fila={x.porId.get(e.id) ?? null} cantidad={x.cantidadDe(e.id)} porEnviar={x.porEnviar.has(e.id)}
      alCorregir={(habia, hay, encolado) => x.corregido(e, habia, hay, encolado)} alTerminar={() => x.caja.current?.focus()} />
  );
}

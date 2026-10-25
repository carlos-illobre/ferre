import { TEXTOS } from "../../textos";
import { Aviso, Boton, Buscador, Vacio } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { FiltrosDeStock } from "./FiltrosDeStock";
import { FilasDeStock } from "./FilasDeStock";
import type { Inventario } from "./useInventario";
import css from "./Inventario.module.css";

// A la izquierda: la búsqueda (con el lector del celular vinculado), los filtros y los productos.
const t = TEXTOS.stock;

export function ListaDeStock({ x }: { x: Inventario }) {
  return (
    <div className={css.izq}>
      <Buscador valor={x.consulta} alCambiar={x.setConsulta} placeholder={t.buscar.largo} etiqueta="Buscar un producto" cajaRef={x.caja} autoFoco
        extra={<>
          {!x.consulta && <kbd className={`tecla ${css.barra}`}>/</kbd>}
          {x.emparejado && <Boton variante="marino" className={css.celular} onClick={x.pedirLector} data-testid="pedir-lector"><Icono nombre="scan-barcode" />{t.conElCelular.largo}</Boton>}
        </>} />
      <LectorPedido pedido={x.lectorPedido} />
      <FiltrosDeStock x={x} />
      {x.filas.length === 0 && !x.buscandoEnElServidor && <SinFilas x={x} />}
      {x.filas.length > 0 && <FilasDeStock x={x} />}
    </div>
  );
}

function SinFilas({ x }: { x: Inventario }) {
  const buscado = x.consulta.trim();
  const verTodos = () => { x.setConsulta(""); x.setFiltro("todos"); x.caja.current?.focus(); };
  return (
    <Vacio icono="buscar" titulo={buscado ? `Nada con «${buscado}»` : "Ningún producto con este filtro"}
      accion={(buscado || x.filtro !== "todos") ? <Boton onClick={verTodos}>Ver todos</Boton> : undefined}>
      {buscado ? "Probá con otra palabra, con la marca o con el código del proveedor." : "Con este filtro no queda ningún producto."}
    </Vacio>
  );
}

// Si el aviso al celular llegó, qué hacer en él; si no, que no se pudo.
function LectorPedido({ pedido }: { pedido: boolean | null }) {
  if (pedido === null) return null;
  return <Aviso tipo={pedido ? "info" : "alerta"}>{pedido ? "Abrí Ferrebress en el celular y tocá «Abrir el lector»." : "No se pudo avisar al celular."}</Aviso>;
}

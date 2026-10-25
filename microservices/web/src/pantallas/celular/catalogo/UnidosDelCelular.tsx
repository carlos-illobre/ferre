import { useState, type ReactNode } from "react";
import { buscarUniones, separarProductos, unirProductos, type Union } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Buscador, Hoja, Toast } from "../componentes/base";
import { UnionHecha } from "./UnionHecha";
import css from "./Duplicados.module.css";

// Lo ya unido, para poder separarlo si fue un error. El absorbido no aparece en las
// búsquedas (quedó dentro del otro), así que este es el único lugar donde se lo ve. Se ven las
// tres últimas uniones; «Ver todo» y «Separar» abren todas, con un buscador (002-T005).
const A_LA_VISTA = 3;
type Props = { uniones: Union[]; todas: boolean; alVerTodas: (abierta: boolean) => void };

export function UnidosDelCelular({ uniones, todas, alVerTodas }: Props) {
  const { mensaje, separada, separar, deshacer, cerrar } = useSepararConDeshacer();
  const [buscado, setBuscado] = useState("");
  const lista = (cuales: Union[]) => (
    <ul className={css.unidas}>
      {cuales.map((u) => <li key={u.absorbido_id}><UnionHecha u={u} alSeparar={() => void separar(u)} /></li>)}
    </ul>
  );
  const vistas = buscarUniones(uniones, buscado);
  return (
    <>
      <h2 className={css.sec} data-testid="unidos">
        <b>{TEXTOS.duplicados.productosUnidos.corto}</b>{uniones.length > 0 && <span className={`${css.cuenta} verde`}>{uniones.length}</span>}
        {uniones.length > 0 && <button type="button" className={css.ver} onClick={() => alVerTodas(true)} data-testid="ver-todas-las-uniones">{TEXTOS.duplicados.verTodo.corto}</button>}
      </h2>
      <Toast texto={mensaje} alCerrar={cerrar} testId="mensaje-separar" accion={separada ? { texto: "Deshacer", alTocar: () => void deshacer(separada) } : undefined} />
      {uniones.length === 0 ? <div className="aviso-suave">Todavía no se unió ningún producto.</div> : <div>{lista(uniones.slice(0, A_LA_VISTA))}</div>}
      {todas && (
        <Hoja titulo="Productos unidos" alCerrar={() => { alVerTodas(false); setBuscado(""); }} testId="todas-las-uniones">
          <Buscador chico valor={buscado} alCambiar={setBuscado} placeholder="Buscar un producto unido" testId="buscar-union" />
          {vistas.length === 0 ? <div className="aviso-suave">{uniones.length ? "Ningún producto unido coincide con la búsqueda." : "Todavía no se unió ningún producto."}</div> : lista(vistas)}
        </Hoja>
      )}
    </>
  );
}

// Separar no pide confirmar: se deshace uniéndolos de nuevo, desde el mismo aviso (como en la computadora).
function useSepararConDeshacer() {
  const [mensaje, setMensaje] = useState<ReactNode>(null);
  // La última separación, para deshacerla desde el aviso.
  const [separada, setSeparada] = useState<Union | null>(null);
  async function separar(u: Union) {
    try { await separarProductos(u.absorbido_id); setSeparada(u); setMensaje(<>Separados: <b>«{u.absorbido}»</b> vuelve a ser un producto aparte, con sus precios, ventas y stock.</>); }
    catch (e) { setSeparada(null); setMensaje((e as Error).message); }
  }
  async function deshacer(u: Union) {
    setSeparada(null);
    try { await unirProductos(u.conservado_id, u.absorbido_id); setMensaje("Separación deshecha: vuelven a ser un solo producto."); }
    catch (e) { setMensaje((e as Error).message); }
  }
  const cerrar = () => { setMensaje(null); setSeparada(null); };
  return { mensaje, separada, separar, deshacer, cerrar };
}

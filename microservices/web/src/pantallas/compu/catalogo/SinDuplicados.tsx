import { TEXTOS } from "../../textos";
import { Boton, Vacio } from "../base/ui";
import css from "./Duplicados.module.css";

// Sin sugerencias por revisar: cómo aparecen y el botón para buscar en todo el catálogo.
export function SinDuplicados({ cargadas, quieto, alBuscar }: { cargadas: boolean; quieto: boolean; alBuscar: () => void }) {
  return (
    <section className={`${css.comparar} ${css.vacia}`}>
      {cargadas && (
        <Vacio icono="duplicados" titulo="No hay duplicados por revisar"
          accion={<Boton variante="principal" icono="buscar" disabled={quieto} onClick={alBuscar}>{TEXTOS.duplicados.buscarEnTodo.largo}</Boton>}>
          Cuando aplicás una lista, los productos nuevos se comparan solos con los de los otros proveedores. Si querés repasar todo el catálogo, buscá en todo el catálogo.
        </Vacio>
      )}
    </section>
  );
}

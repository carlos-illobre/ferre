import { quienTieneElCodigo } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Icono, Pagina } from "../base/ui";
import { AvisosDeProductos } from "./AvisosDeProductos";
import { BuscadorDeProductos } from "./BuscadorDeProductos";
import { CabezaDeProductos } from "./CabezaDeProductos";
import { FichaAlLado } from "./FichaAlLado";
import { ListaDeProductos } from "./ListaDeProductos";
import { useProductos } from "./useProductos";
import { useTeclasDeProductos } from "./useTeclasDeProductos";
import css from "./Productos.module.css";

// Productos en la computadora, como la v2 («Lista y ficha lado a lado», decisión 145): la lista a la
// izquierda y la ficha del elegido siempre abierta a la derecha.
export function Productos() {
  const x = useProductos();
  useTeclasDeProductos(x);
  const p = x.delaFicha;
  return (
    <Pagina titulo="Productos" testId="productos" className="productos productos-v2" acciones={<CabezaDeProductos emparejado={Boolean(x.emparejado)} puedeCargarListas={x.puede("catalogo.listas")} />}>
      <div className="pv">
        <div className={css.lista}>
          <BuscadorDeProductos x={x} />
          <AvisosDeProductos x={x} />
          <ListaDeProductos x={x} />
        </div>
        {p ? <FichaAlLado ref={x.ficha} producto={p} quienLoTiene={(codigo) => quienTieneElCodigo(codigo, p.id)} alCambiar={(c) => x.actualizar(p.id, c)}
          alAgregar={x.puedeVender ? () => x.agregar(p) : undefined} alListo={() => x.caja.current?.focus()} alCargarCodigo={x.setCargandoCodigo}
          calculoAbierto={x.calculoAbierto} alPlegarCalculo={x.plegarCalculo} />
          : <div className={`${css.sinFicha} detalle`}>{TEXTOS.catalogo.elegiUnProducto.largo}</div>}
      </div>
      {x.agregado && <div className="aviso-agregado" role="status" data-testid="agregado"><Icono nombre="tilde" tam={20} grosor={2.6} />{x.agregado}</div>}
    </Pagina>
  );
}

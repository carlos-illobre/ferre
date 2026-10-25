import { irA } from "../base/rutas";
import { Boton, Icono } from "../base/ui";
import type { Resultado } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// Lo que pasó al aplicar la lista, con «Ver los productos».
export function ResultadoDeLista({ resultado, alCerrar }: { resultado: Resultado; alCerrar: () => void }) {
  return (
    <section className={`${css.der} ${css.resultado}`} role="status" data-testid="resultado">
      <span className={css.resultadoTilde} aria-hidden="true"><Icono nombre="tilde" tam={28} grosor={3} /></span>
      <h2>{resultado.titulo}</h2>
      <p>{resultado.detalle}</p>
      <div className="fila">
        <Boton icono="productos" onClick={() => irA("productos")}>Ver los productos</Boton>
        <Boton variante="marino" onClick={alCerrar}>Entendido</Boton>
      </div>
    </section>
  );
}

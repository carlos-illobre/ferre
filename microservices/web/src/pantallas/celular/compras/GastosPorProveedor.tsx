import type { Gastos } from "../../../negocio/compras";
import { pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Hoja } from "../componentes/base";
import css from "./Compras.module.css";

// Lo gastado en la semana, proveedor por proveedor.
export function GastosPorProveedor({ gastos, alCerrar }: { gastos: Gastos | null; alCerrar: () => void }) {
  if (!gastos) return null;
  return (
    <Hoja titulo={`${TEXTOS.compras.estaSemana.corto}: ${pesosCortos(gastos.total)}`} alCerrar={alCerrar} testId="gastos-por-proveedor">
      {gastos.por_proveedor.length === 0 ? <div className="aviso-suave">En la semana no se registraron compras.</div> : (
        <ul className={css.items}>
          {gastos.por_proveedor.map((g) => <li key={g.proveedor}><span>{g.proveedor} · {g.compras} {Number(g.compras) === 1 ? "compra" : "compras"}</span><b>{pesos(g.total)}</b></li>)}
        </ul>
      )}
    </Hoja>
  );
}

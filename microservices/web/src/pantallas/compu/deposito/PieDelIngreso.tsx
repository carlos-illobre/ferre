import { conUnidad, unidadDe } from "../../../negocio/catalogo";
import type { Renglon } from "../../../negocio/deposito";
import { pesos, pesosCortos } from "../../../negocio/formato";
import { Boton, Explicado } from "../base/ui";
import { plural } from "./deposito-comun";
import type { IngresoDeLaCompu } from "./useIngresoDeLaCompu";
import css from "./Deposito.module.css";

// Al pie: el total sin IVA (con de dónde sale), lo que falta para registrar, «Descartar» y «Registrar ingreso».
function pasosDelTotal(renglones: Renglon[], total: number) {
  return [
    ...renglones.slice(0, 12).map((r) => `${r.descripcion || "Producto nuevo"}: ${conUnidad(r.cantidad, unidadDe(r.producto))} × ${r.costo === null ? "sin costo" : pesos(r.costo)} = ${pesos((r.costo ?? 0) * r.cantidad)}`),
    ...(renglones.length > 12 ? [`…y ${renglones.length - 12} renglones más.`] : []),
    `Total sin IVA: ${pesos(total)}`,
  ];
}

export function PieDelIngreso({ x }: { x: IngresoDeLaCompu }) {
  const { renglones, total, ocupado, error } = x.ingreso;
  const aviso = x.problema ?? error;
  return (
    <div className={`${css.pie} compras-pie`}>
      <div className="compras-total">
        <span className="rotulo">Total sin IVA<span className="solo-compu"> · {plural(renglones.length, "renglón", "renglones")}</span></span>
        <span className="importe" data-testid="total"><Explicado valor={pesosCortos(total)} titulo="De dónde sale el total" pasos={pasosDelTotal(renglones, total)} /></span>
      </div>
      <div className="compras-pie-aviso" aria-live="polite">
        {aviso && <span className="compras-falta" role="alert" data-testid="error-ingreso">{aviso}</span>}
      </div>
      <Boton className="solo-compu" onClick={x.descartar} disabled={ocupado} data-testid="descartar">Descartar</Boton>
      <Boton variante="principal" tam="grande" onClick={() => void x.registrar()} disabled={ocupado || !x.enLinea} data-testid="confirmar">
        {ocupado ? "Registrando…" : "Registrar ingreso"}
      </Boton>
    </div>
  );
}

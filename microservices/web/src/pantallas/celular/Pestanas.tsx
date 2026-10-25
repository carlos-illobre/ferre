import { Icono, type NombreDeIcono } from "../../ui";

// Las pestañas de adentro de una parte (Catálogo, Depósito), con la elegida en blanco como en la v2
// (decisión 140). Dos van sin ícono, como en la v2; tres o más, apiladas, con su ícono para
// reconocerlas sin leer.
// `cuenta`: cuántos hay pendientes en esa pestaña, a la derecha de su nombre (Para revisar, 014).
export function Pestanas<T extends string>({ opciones, actual, alElegir }: { opciones: { valor: T; nombre: string; icono: NombreDeIcono; cuenta?: number }[]; actual: T; alElegir: (v: T) => void }) {
  return (
    <div className={`segmentos ${opciones.length > 2 ? "con-icono" : "sin-icono"}`} role="tablist">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="tab" aria-selected={o.valor === actual} className={o.valor === actual ? "activo" : ""} onClick={() => alElegir(o.valor)}>
          {opciones.length > 2 && <Icono nombre={o.icono} tam={18} grosor={o.valor === actual ? 2.3 : 2} />}{o.nombre}
          {Boolean(o.cuenta) && <span className="cuenta-pestana" data-testid={`cuenta-${o.valor}`} aria-label={`${o.cuenta} pendientes`}>{o.cuenta}</span>}
        </button>
      ))}
    </div>
  );
}

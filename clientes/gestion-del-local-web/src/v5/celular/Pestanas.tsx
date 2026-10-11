import { Icono, type NombreDeIcono } from "../../v2/ui";

// Las pestañas de adentro de una parte (Catálogo, Depósito), cada una con su ícono para
// reconocerla sin leer. Usa los estilos de los segmentos de la versión 1.
export function Pestanas<T extends string>({ opciones, actual, alElegir }: { opciones: { valor: T; nombre: string; icono: NombreDeIcono }[]; actual: T; alElegir: (v: T) => void }) {
  return (
    <div className="segmentos con-icono" role="tablist">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="tab" aria-selected={o.valor === actual} className={o.valor === actual ? "activo" : ""} onClick={() => alElegir(o.valor)}>
          <Icono nombre={o.icono} tam={18} grosor={o.valor === actual ? 2.3 : 2} />{o.nombre}
        </button>
      ))}
    </div>
  );
}

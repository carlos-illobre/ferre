// Varias opciones en una tira, una elegida (por ejemplo, el tipo de comprobante). `chico`, la
// versión angosta del celular para un renglón.
export function Segmentos<T extends string>({ opciones, actual, alElegir, etiqueta, chico }: { opciones: { valor: T; nombre: string }[]; actual: T; alElegir: (v: T) => void; etiqueta?: string; chico?: boolean }) {
  return (
    <div className={`segmentos ${chico ? "chico" : ""}`} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" aria-pressed={o.valor === actual} className={o.valor === actual ? "activo" : ""} onClick={() => alElegir(o.valor)}>{o.nombre}</button>
      ))}
    </div>
  );
}

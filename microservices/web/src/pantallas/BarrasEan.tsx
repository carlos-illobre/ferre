import { barrasEan13, esGuarda } from "../plataforma/imagenes/ean13";

// Las barras de un código EAN-13, dibujadas al lado del número (la v2 de la ficha, decisión 145).
// Un código de otro largo no se dibuja.
export function BarrasEan({ codigo, className }: { codigo: string; className?: string }) {
  const bits = barrasEan13(codigo);
  if (!bits) return null;
  return (
    <svg className={className} viewBox="0 0 95 100" preserveAspectRatio="none" aria-hidden="true" focusable="false" data-testid="barras">
      {[...bits].map((b, i) => (b === "1" ? <rect key={i} x={i} y={0} width={1} height={esGuarda(i) ? 100 : 90} /> : null))}
    </svg>
  );
}

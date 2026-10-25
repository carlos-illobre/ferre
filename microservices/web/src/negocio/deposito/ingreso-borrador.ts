import { useEffect } from "react";
import { leerRecordado, recordar } from "../../datos/almacenamiento";
import type { Comprobante, Renglon } from "./tipos-del-ingreso";

// Lo cargado en un ingreso, guardado en el dispositivo hasta registrarlo o descartarlo.
export type Borrador = { proveedorId: string; comprobante: Comprobante; foto: string | null; fechaCompra: string; renglones: Renglon[] };
export function leerBorrador(clave: string | undefined): Borrador | null {
  if (!clave) return null;
  try {
    const b = JSON.parse(leerRecordado(clave) ?? "null") as Borrador | null;
    return b && Array.isArray(b.renglones) && b.renglones.length > 0 ? b : null;
  } catch { return null; }
}


// Lo guarda en cada cambio; sin renglones, lo borra.
export function useGuardarBorrador(clave: string | undefined, b: Borrador): void {
  const { proveedorId, comprobante, foto, fechaCompra, renglones } = b;
  useEffect(() => {
    if (!clave) return;
    recordar(clave, renglones.length ? JSON.stringify({ proveedorId, comprobante, foto, fechaCompra, renglones } satisfies Borrador) : null);
  }, [clave, proveedorId, comprobante, foto, fechaCompra, renglones]);
}

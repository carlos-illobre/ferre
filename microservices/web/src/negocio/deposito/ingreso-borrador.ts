import { useEffect } from "react";
import type { Comprobante, Renglon } from "./tipos-del-ingreso";

// Lo cargado en un ingreso, guardado en el dispositivo hasta registrarlo o descartarlo.
export type Borrador = { proveedorId: string; comprobante: Comprobante; foto: string | null; fechaCompra: string; renglones: Renglon[] };
export function leerBorrador(clave: string | undefined): Borrador | null {
  if (!clave) return null;
  try {
    const b = JSON.parse(localStorage.getItem(clave) ?? "null") as Borrador | null;
    return b && Array.isArray(b.renglones) && b.renglones.length > 0 ? b : null;
  } catch { return null; }
}


// Lo guarda en cada cambio; sin renglones, lo borra.
export function useGuardarBorrador(clave: string | undefined, b: Borrador): void {
  const { proveedorId, comprobante, foto, fechaCompra, renglones } = b;
  useEffect(() => {
    if (!clave) return;
    try {
      if (renglones.length) localStorage.setItem(clave, JSON.stringify({ proveedorId, comprobante, foto, fechaCompra, renglones } satisfies Borrador));
      else localStorage.removeItem(clave);
    } catch { /* sin lugar o sin permiso: se sigue sin borrador */ }
  }, [clave, proveedorId, comprobante, foto, fechaCompra, renglones]);
}

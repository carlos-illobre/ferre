import { useCallback, useState } from "react";
import type { Producto } from "../../../negocio/catalogo";
import { agregarALaVenta } from "../../../negocio/ventas";
import { useSeVaSolo } from "../../../plataforma/tiempo";
import { TEXTOS, texto } from "../../textos";

// Agregar a la venta desde el catálogo, en las dos interfaces: avisa unos segundos qué se agregó
// (corto en el celular, largo en la computadora).
export function useAgregarALaVenta(celular: boolean) {
  const [agregado, setAgregado] = useState<string | null>(null);
  useSeVaSolo(agregado, () => setAgregado(null), 3000);
  const agregar = useCallback((p: Producto) => { agregarALaVenta(p); setAgregado(`${texto(TEXTOS.catalogo.agregado, celular)}: ${p.descripcion}`); }, [celular]);
  return { agregado, setAgregado, agregar };
}

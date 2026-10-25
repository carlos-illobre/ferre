import { useEffect, useState } from "react";
import type { ResumenDelCatalogo } from "@servidor/productos";
import { api } from "../../datos/conexion";

// Cuántos productos hay y cuántos sin precio: los cuenta el servidor.
export function useResumenDelCatalogo(): ResumenDelCatalogo | null {
  const [resumen, setResumen] = useState<ResumenDelCatalogo | null>(null);
  useEffect(() => { api<ResumenDelCatalogo>("/productos/resumen").then(setResumen).catch(() => undefined); }, []);
  return resumen;
}

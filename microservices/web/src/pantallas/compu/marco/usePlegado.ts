import { useRecordado } from "../../../negocio/configuracion";

// El menú se achica a solo íconos, y recuerda cómo se dejó (decisión 122).
export function usePlegado() {
  const [como, guardar] = useRecordado("ferre.menu", ["abierto", "plegado"]);
  return { plegado: como === "plegado", plegar: () => guardar(como === "plegado" ? "abierto" : "plegado") };
}

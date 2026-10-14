import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { consultas } from "../consultas";

export type Proveedor = { id: string; nombre: string; activo: boolean };

// Los proveedores a los que se les compra hoy. `null` mientras se traen; si no se pudo, ninguno.
export function useProveedoresActivos(): Proveedor[] | null {
  const consulta = useQuery({ queryKey: ["proveedores"], queryFn: () => api<Proveedor[]>("/proveedores") }, consultas);
  if (consulta.data) return consulta.data.filter((p) => p.activo);
  return consulta.isError ? [] : null;
}

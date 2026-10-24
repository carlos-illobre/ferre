import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../datos/conexion";
import { consultas } from "../datos/conexion";
import type { Proveedor, ProveedorNuevo } from "@servidor/proveedores";

export type { Proveedor };

const CLAVE = ["proveedores"] as const;
export const proveedoresCambiaron = (): Promise<void> => consultas.invalidateQueries({ queryKey: CLAVE });

// Todos los proveedores, también los que ya no se usan. `null` mientras se traen.
export function useProveedores() {
  const consulta = useQuery({ queryKey: CLAVE, queryFn: () => api<Proveedor[]>("/proveedores") }, consultas);
  const { refetch } = consulta;
  const recargar = useCallback(async () => { await refetch({ cancelRefetch: false }); }, [refetch]);
  return { proveedores: consulta.data ?? null, error: consulta.error, recargar };
}

// Los proveedores a los que se les compra hoy. `null` mientras se traen; si no se pudo, ninguno.
export function useProveedoresActivos(): Proveedor[] | null {
  const { proveedores, error } = useProveedores();
  if (proveedores) return proveedores.filter((p) => p.activo);
  return error ? [] : null;
}

export type DatosDeProveedor = { nombre: string; lector: string | null; preciosIncluyenIva: boolean; descuentoGeneral: string; descuentoContado: string };
export type FaltaEnProveedor = { campo: "nombre" | "general" | "contado"; texto: string };

// Los descuentos se escriben en porcentaje, con coma o con punto; vacío es cero.
const porcentaje = (texto: string) => Number((texto.trim() || "0").replace(",", "."));

export function faltaEnProveedor(d: DatosDeProveedor): FaltaEnProveedor | null {
  const fuera = (v: number) => !Number.isFinite(v) || v < 0 || v > 100;
  if (!d.nombre.trim()) return { campo: "nombre", texto: "Escribí el nombre del proveedor." };
  if (fuera(porcentaje(d.descuentoGeneral))) return { campo: "general", texto: "El descuento general va de 0 a 100 %." };
  if (fuera(porcentaje(d.descuentoContado))) return { campo: "contado", texto: "El descuento por contado va de 0 a 100 %." };
  return null;
}

// Da de alta un proveedor; antes hay que validar con `faltaEnProveedor`. Si ya existe, el servidor contesta 409.
export async function altaDeProveedor(d: DatosDeProveedor): Promise<void> {
  await api("/proveedores", {
    method: "POST",
    body: JSON.stringify({ nombre: d.nombre.trim(), lector: d.lector || null, precios_incluyen_iva: d.preciosIncluyenIva, descuento_general: porcentaje(d.descuentoGeneral) / 100, descuento_contado: porcentaje(d.descuentoContado) / 100 } satisfies ProveedorNuevo),
  });
  await proveedoresCambiaron();
}

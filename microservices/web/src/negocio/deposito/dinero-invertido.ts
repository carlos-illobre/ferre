import { useEffect, useState } from "react";
import { api } from "../../datos/conexion";
import type { Stock } from "@servidor/stock";

// Dinero invertido en inventario (RF-53): lo que hay de cada producto por su costo vigente,
// sin IVA, en total y por proveedor; los proveedores de más a menos, sin los que no tienen nada.
type Datos = Pick<Stock, "valor_total" | "por_proveedor">;
export type InvertidoDelProveedor = { nombre: string; valor: number; productos: number; ancho: number };

function porProveedor(datos: Datos | null): InvertidoDelProveedor[] {
  const proveedores = Object.entries(datos?.por_proveedor ?? {}).filter(([, v]) => v.valor > 0).sort((a, b) => b[1].valor - a[1].valor);
  const mayor = Math.max(1, proveedores[0]?.[1].valor ?? 1);
  // El ancho de su barra: cuánto es al lado del que más tiene.
  return proveedores.map(([nombre, v]) => ({ nombre, valor: v.valor, productos: v.productos, ancho: Math.max(1, Math.round((v.valor / mayor) * 100)) }));
}

export function useDineroInvertido() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [falla, setFalla] = useState(false);
  useEffect(() => { api<Datos>("/stock").then(setDatos).catch(() => setFalla(true)); }, []);
  return { total: datos?.valor_total ?? null, proveedores: porProveedor(datos), falla };
}

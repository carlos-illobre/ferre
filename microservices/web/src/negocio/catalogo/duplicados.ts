import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../datos/conexion";
import { consultas } from "../../datos/conexion";
import type { BusquedaDeDuplicados, ProductoAUnir, ResolverSugerencia, Separar, Sugerencia, UnirAMano, Union } from "@servidor/equivalencias";

// Los duplicados, una sola vez para el celular y la computadora (RNF-60): el mismo artículo en
// varias listas. Unirlos deja un producto con todos sus proveedores; separarlos lo deshace.
export type Resumen = ProductoAUnir;
export type { Sugerencia, Union };
export type Lado = "a" | "b";

const SUGERENCIAS = ["equivalencias"] as const;
const UNIDOS = ["equivalencias", "unidos"] as const;
const todoCambio = () => consultas.invalidateQueries({ queryKey: SUGERENCIAS });

// Las sugerencias pendientes (`null` mientras llegan) y lo ya unido, que se puede separar.
export function useDuplicados() {
  const sugerencias = useQuery({ queryKey: SUGERENCIAS, queryFn: () => api<Sugerencia[]>("/equivalencias") }, consultas);
  const unidos = useQuery({ queryKey: UNIDOS, queryFn: () => api<Union[]>("/equivalencias/unidos") }, consultas);
  const { refetch: otraVezSugerencias } = sugerencias;
  const { refetch: otraVezUnidos } = unidos;
  const recargar = useCallback(() => { void otraVezSugerencias({ cancelRefetch: false }); void otraVezUnidos({ cancelRefetch: false }); }, [otraVezSugerencias, otraVezUnidos]);
  return { sugerencias: sugerencias.data ?? null, uniones: unidos.data ?? null, error: sugerencias.error ?? unidos.error, recargar };
}

// Busca en todo el catálogo; devuelve cuántas sugerencias nuevas aparecieron.
export async function buscarDuplicados(): Promise<number> {
  const { nuevas } = await api<BusquedaDeDuplicados>("/equivalencias/buscar", { method: "POST" });
  await todoCambio();
  return nuevas;
}

// «Es el mismo» (conservando el nombre del lado elegido) o «son distintos», que no se vuelve a sugerir.
// La sugerencia sale de la lista apenas el servidor lo acepta.
export async function resolverSugerencia(s: Sugerencia, accion: "unir" | "rechazar", conservar: Lado = "a"): Promise<{ queda: Resumen; sale: Resumen }> {
  await api(`/equivalencias/${s.id}/${accion}`, { method: "POST", body: JSON.stringify({ conservar } satisfies ResolverSugerencia) });
  consultas.setQueryData<Sugerencia[]>(SUGERENCIAS, (l) => l?.filter((x) => x.id !== s.id));
  if (accion === "unir") void consultas.invalidateQueries({ queryKey: UNIDOS });
  return { queda: s[conservar], sale: conservar === "a" ? s.b : s.a };
}

export async function unir(conservarId: string, absorberId: string): Promise<void> {
  await api("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: conservarId, absorber_id: absorberId } satisfies UnirAMano) });
  await todoCambio();
}

// Separar: el absorbido vuelve a ser un producto aparte, con sus precios, ventas y stock.
export async function separar(absorbidoId: string): Promise<void> {
  await api("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: absorbidoId } satisfies Separar) });
  await todoCambio();
}

// Buscar entre lo ya unido por el nombre de cualquiera de los dos productos, sin importar
// mayúsculas ni tildes.
const plano = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
export function buscarUniones(uniones: Union[], texto: string): Union[] {
  const buscado = plano(texto);
  return buscado ? uniones.filter((u) => plano(u.conservado).includes(buscado) || plano(u.absorbido).includes(buscado)) : uniones;
}

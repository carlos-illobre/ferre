import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api";
import { enviarOEncolar } from "../../cola";
import { consultas } from "../../consultas";
import type { Producto } from "../../producto";
import type { CierreDeConteo, Contado, Conteo, ConteoAbierto, ConteoCerrado, ConteoNuevo, RenglonContado, Sector, SectorCreado, SectorNuevo, SinContar } from "@servidor/conteos";
import { stockCambio } from "./inventario";

// El conteo de estanterías, una sola vez para el celular y la computadora (RNF-60): se abre un
// sector, se cuenta producto por producto (también sin conexión) y al cerrar las diferencias
// contra el stock del sistema se aplican como ajustes.
export type { Contado, Conteo, Sector, SinContar };
export type Cierre = ConteoCerrado;

const SECTORES = ["sectores"] as const;

// Primero lo que quedó a medias, después lo nunca contado, después lo más atrasado.
export const ordenarSectores = (sectores: Sector[]): Sector[] => [...sectores].sort((a, b) => {
  const peso = (s: Sector) => (s.conteo_abierto ? 0 : s.ultimo_conteo === null ? 1 : 2);
  return peso(a) - peso(b) || (a.ultimo_conteo ?? "").localeCompare(b.ultimo_conteo ?? "") || a.nombre.localeCompare(b.nombre, "es");
});

// Los sectores, con cuántos productos tienen y cuándo se contaron. `null` mientras no llegaron.
export function useSectores() {
  const consulta = useQuery({ queryKey: SECTORES, queryFn: () => api<Sector[]>("/sectores") }, consultas);
  const { refetch } = consulta;
  const recargar = useCallback(async () => { await refetch({ cancelRefetch: false }); }, [refetch]);
  return { sectores: consulta.data ?? null, error: consulta.error, recargar };
}

// Empezar a contar un sector, o retomar el conteo que quedó abierto. Necesita conexión.
export async function abrirConteo(sectorId: string): Promise<Conteo> {
  const { id } = await api<ConteoAbierto>("/conteos", { method: "POST", body: JSON.stringify({ sector_id: sectorId } satisfies ConteoNuevo) });
  return api<Conteo>(`/conteos/${id}`);
}

export async function crearSector(nombre: string): Promise<string> {
  const { id } = await api<SectorCreado>("/sectores", { method: "POST", body: JSON.stringify({ nombre: nombre.trim() } satisfies SectorNuevo) });
  await consultas.invalidateQueries({ queryKey: SECTORES });
  return id;
}

// El conteo abierto. `alActualizar` recibe el conteo cada vez que cambia (lo guarda la pantalla).
export function useConteo(conteo: Conteo, alActualizar: (c: Conteo) => void) {
  // Lo contado sin conexión: se ve igual, y el servidor lo recibe al reconectar.
  const [enElDispositivo, setEnElDispositivo] = useState<Set<string>>(new Set());
  const contadoPorId = useMemo(() => new Map(conteo.renglones.map((r) => [r.producto_id, r])), [conteo.renglones]);
  const conDiferencia = useMemo(() => conteo.renglones.filter((r) => Number(r.cantidad_contada) !== Number(r.stock_teorico)), [conteo.renglones]);

  const recargar = useCallback(async () => {
    try { alActualizar(await api<Conteo>(`/conteos/${conteo.id}`)); setEnElDispositivo(new Set()); } catch { /* sin conexión: queda lo que se ve */ }
  }, [conteo.id, alActualizar]);

  // Anota cuántas hay de un producto. Rechaza si no se pudo guardar ni en el servidor ni en el dispositivo.
  async function contar(producto: Producto, cantidad: number): Promise<{ encolado: boolean }> {
    const { encolado } = await enviarOEncolar("conteo.renglon", "PUT", `/conteos/${conteo.id}/renglones/${producto.id}`, { cantidad } satisfies RenglonContado);
    if (!encolado) { await recargar(); return { encolado }; }
    const habia = contadoPorId.get(producto.id)?.stock_teorico ?? conteo.sin_contar.find((s) => s.producto_id === producto.id)?.stock_teorico ?? "0";
    alActualizar({
      ...conteo,
      renglones: [{ producto_id: producto.id, cantidad_contada: String(cantidad), contado_en: new Date().toISOString(), descripcion: producto.descripcion, marca: producto.marca, stock_teorico: habia }, ...conteo.renglones.filter((r) => r.producto_id !== producto.id)],
      sin_contar: conteo.sin_contar.filter((s) => s.producto_id !== producto.id),
    });
    setEnElDispositivo((s) => new Set(s).add(producto.id));
    return { encolado };
  }

  // Saca un producto de lo contado: vuelve a quedar sin contar.
  async function quitar(producto: Producto): Promise<{ encolado: boolean }> {
    const { encolado } = await enviarOEncolar("conteo.renglon", "DELETE", `/conteos/${conteo.id}/renglones/${producto.id}`, null);
    if (encolado) alActualizar({ ...conteo, renglones: conteo.renglones.filter((r) => r.producto_id !== producto.id) }); else await recargar();
    return { encolado };
  }

  // Cierra el sector: aplica las diferencias como ajustes y, si se pide, pone en cero lo que no se contó. Necesita conexión.
  async function cerrar(faltantesEnCero: boolean): Promise<Cierre> {
    const cierre = await api<Cierre>(`/conteos/${conteo.id}/cerrar`, { method: "POST", body: JSON.stringify({ faltantes_en_cero: faltantesEnCero } satisfies CierreDeConteo) });
    void consultas.invalidateQueries({ queryKey: SECTORES });
    void stockCambio();
    return cierre;
  }

  return { contadoPorId, conDiferencia, enElDispositivo, recargar, contar, quitar, cerrar };
}

import { useEffect, useMemo, useState } from "react";
import { usePedidos, type Borrador } from "../../../negocio/deposito";
import { useEspejar } from "../../../negocio/espejo";
import { usePuede } from "../../permisos";

// Los pedidos, el abierto o el borrador nuevo, y el aviso de lo último que se hizo (siete segundos).
export function usePantallaDePedidos() {
  const puede = usePuede();
  const encarga = puede("deposito.pedidos");
  const { pedidos, proveedores, error, cargar } = usePedidos(encarga);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abiertoId, setAbiertoId] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<Borrador | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);
  // En espejo (decisión 60): los dos tienen abierto el mismo pedido, o la lista.
  useEspejar<{ id: string | null; proveedorId: string | null }>("pedido", useMemo(() => (nuevo ? { id: nuevo.id, proveedorId: nuevo.proveedorId } : { id: abiertoId, proveedorId: null }), [nuevo, abiertoId]), (v) => {
    if (v.id && v.proveedorId) { setAbiertoId(null); setNuevo((n) => (n?.id === v.id ? n : { id: v.id!, proveedorId: v.proveedorId!, renglones: [] })); }
    else { setNuevo(null); setAbiertoId(v.id); void cargar(); } // el otro abrió uno ya guardado, o volvió a la lista: puede haber cambiado
  });
  return {
    encarga, ingresa: puede("deposito.ingresos"), pedidos, proveedores, error, cargar, aviso, setAbiertoId, nuevo, eligiendo, setEligiendo,
    abierto: abiertoId ? (pedidos ?? []).find((p) => p.id === abiertoId) ?? null : null,
    volver: (mensaje?: string) => { setAbiertoId(null); setNuevo(null); if (mensaje) setAviso(mensaje); void cargar(); },
    empezar: (proveedorId: string) => { setEligiendo(false); setNuevo({ id: crypto.randomUUID(), proveedorId, renglones: [] }); },
  };
}
export type PantallaDePedidos = ReturnType<typeof usePantallaDePedidos>;

import { useState } from "react";

// Cambiar los roles de una persona, en su ficha (celular y computadora): se abre con los que tiene,
// no se guarda sin ninguno y, si el servidor no acepta, el error queda a la vista.
export function useCambioDeRoles(actuales: { id: string }[], alGuardar: (ids: string[]) => Promise<string | null>, faltaUnRol: string) {
  const [cambiando, setCambiando] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const abrir = () => { setElegidos(actuales.map((r) => r.id)); setError(null); setCambiando(true); };
  const elegir = (ids: string[]) => { setElegidos(ids); setError(null); };
  async function guardar() {
    if (elegidos.length === 0) { setError(faltaUnRol); return; }
    setGuardando(true); setError(null);
    const falla = await alGuardar(elegidos);
    setGuardando(false);
    if (falla) setError(falla); else setCambiando(false);
  }
  return { cambiando, elegidos, error, guardando, abrir, elegir, guardar, cancelar: () => setCambiando(false) };
}
export type CambioDeRoles = ReturnType<typeof useCambioDeRoles>;

import { useId, useState, type KeyboardEvent } from "react";
import { cuantosQuedan, filtrarUsuarios, sugerenciasDeUsuarios, type FiltroDeUsuarios } from "../negocio/usuarios";
import type { RolAsignable } from "./RolesDeUsuario";

// El buscador con sugerencias y la lista «Rol» de Más → Usuarios (decisión 98), el mismo en el
// celular y en la computadora: cada uno lo dibuja a su modo. La regla está en negocio/usuarios.
type Buscable = { id: string; nombre: string; email: string; roles?: { id: string; nombre: string }[] };

export function useFiltroDeUsuarios<U extends Buscable>(filas: U[], roles: RolAsignable[]) {
  const [texto, setTexto] = useState("");
  const [rol, setRol] = useState<string | null>(null);
  const [abiertas, setAbiertas] = useState(false);
  const [activa, setActiva] = useState(-1);
  const id = useId();
  const filtro: FiltroDeUsuarios = { texto, rol };
  const visibles = filtrarUsuarios(filas, filtro);
  const sugerencias = abiertas ? sugerenciasDeUsuarios(filas, texto) : [];
  const resumen = cuantosQuedan(visibles.length, filas.length, filtro, roles.find((r) => r.id === rol)?.nombre);

  const elegir = (u: U) => { setTexto(u.email); setAbiertas(false); setActiva(-1); };
  function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && sugerencias.length) { e.preventDefault(); e.stopPropagation(); setAbiertas(false); return; }
    if (!sugerencias.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiva((i) => (i + 1) % sugerencias.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiva((i) => (i <= 0 ? sugerencias.length : i) - 1); }
    else if (e.key === "Enter" && activa >= 0) { e.preventDefault(); elegir(sugerencias[activa]!); }
  }
  const listaId = `${id}-sugerencias`;
  return {
    texto, rol, visibles, sugerencias, activa, resumen, elegir, alTeclear,
    escribir: (t: string) => { setTexto(t); setAbiertas(true); setActiva(-1); },
    borrar: () => { setTexto(""); setAbiertas(false); setActiva(-1); },
    elegirRol: (r: string) => setRol(r || null),
    cerrar: () => { setAbiertas(false); setActiva(-1); },
    // Lo que el buscador necesita para que un lector de pantalla anuncie las sugerencias.
    combo: {
      role: "combobox" as const, "aria-expanded": sugerencias.length > 0, "aria-controls": listaId, "aria-autocomplete": "list" as const,
      "aria-activedescendant": activa >= 0 ? `${listaId}-${activa}` : undefined,
    },
    listaId,
    opcionId: (i: number) => `${listaId}-${i}`,
  };
}

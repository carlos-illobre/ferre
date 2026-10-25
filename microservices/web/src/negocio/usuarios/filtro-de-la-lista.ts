import { useId, useState, type KeyboardEvent } from "react";
import { cuantosQuedan, filtrarUsuarios, hayFiltros, ordenarUsuarios, sugerenciasDeUsuarios, type EstadoDeUsuario, type FiltroDeUsuarios, type OrdenDeUsuarios } from "./filtro";

// El buscador con sugerencias, «Filtros» (roles y estado) y «Ordenar» de Más → Usuarios
// (decisiones 98 y 102), los mismos en el celular y en la computadora: cada uno los dibuja a su
// modo. La regla está en negocio/usuarios.
type Buscable = { id: string; nombre: string; email: string; activo?: boolean; roles?: { id: string; nombre: string }[] };

export function useFiltroDeUsuarios<U extends Buscable>(filas: U[]) {
  const [texto, setTexto] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [estado, setEstado] = useState<EstadoDeUsuario>("todos");
  const [orden, setOrden] = useState<OrdenDeUsuarios>("correo");
  const [abiertas, setAbiertas] = useState(false);
  const [activa, setActiva] = useState(-1);
  const id = useId();
  const filtro: FiltroDeUsuarios = { texto, roles, estado };
  const visibles = ordenarUsuarios(filtrarUsuarios(filas, filtro), orden);
  const sugerencias = abiertas ? sugerenciasDeUsuarios(filas, texto) : [];
  const resumen = cuantosQuedan(visibles.length, filas.length, filtro);
  // Lo que quedaría con estos filtros, sin lo escrito: lo que dice «Ver N usuarios».
  const conLosFiltros = filtrarUsuarios(filas, { ...filtro, texto: "" }).length;

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
    texto, roles, estado, orden, visibles, sugerencias, activa, resumen, conLosFiltros, elegir, alTeclear,
    filtrado: hayFiltros(filtro),
    escribir: (t: string) => { setTexto(t); setAbiertas(true); setActiva(-1); },
    borrar: () => { setTexto(""); setAbiertas(false); setActiva(-1); },
    // Varios roles a la vez; «Todos» quita la elección.
    alternarRol: (rol: string) => setRoles((r) => (r.includes(rol) ? r.filter((x) => x !== rol) : [...r, rol])),
    todosLosRoles: () => setRoles([]),
    elegirEstado: setEstado,
    elegirOrden: setOrden,
    quitarFiltros: () => { setRoles([]); setEstado("todos"); },
    cerrar: () => { setAbiertas(false); setActiva(-1); },
    combo: comboDe(listaId, sugerencias.length > 0, activa),
    listaId,
    opcionId: (i: number) => `${listaId}-${i}`,
  };
}
// Lo que el buscador necesita para que un lector de pantalla anuncie las sugerencias.
const comboDe = (listaId: string, abierto: boolean, activa: number) => ({
  role: "combobox" as const, "aria-expanded": abierto, "aria-controls": listaId, "aria-autocomplete": "list" as const,
  "aria-activedescendant": activa >= 0 ? `${listaId}-${activa}` : undefined,
});
export type FiltroDeLaLista<U extends Buscable> = ReturnType<typeof useFiltroDeUsuarios<U>>;

import { useLayoutEffect, useRef, useState } from "react";
import type { RolAsignable } from "../../RolesDeUsuario";
import { Rol } from "./RolDeLaTarjeta";
import css from "./Usuarios.module.css";

// Los roles que entran en una línea, alineados con el correo, y «+N» con los que no entran. Se
// miden en una copia invisible con todos, cada vez que cambia el ancho.
const SEPARACION = 6;
const ANCHO_DEL_MAS = 44;
export function cuantosEntran(anchos: number[], disponible: number): number {
  const total = anchos.reduce((s, a, i) => s + a + (i ? SEPARACION : 0), 0);
  if (total <= disponible) return anchos.length;
  let usado = 0;
  for (let i = 0; i < anchos.length; i++) {
    usado += anchos[i]! + (i ? SEPARACION : 0);
    if (usado + SEPARACION + ANCHO_DEL_MAS > disponible) return i;
  }
  return anchos.length;
}
export function RolesEnUnaLinea({ roles, nombre }: { roles: RolAsignable[]; nombre: string }) {
  const linea = useRef<HTMLUListElement>(null);
  const medida = useRef<HTMLUListElement>(null);
  const [entran, setEntran] = useState(roles.length);
  useLayoutEffect(() => {
    const ul = linea.current, m = medida.current;
    if (!ul || !m) return;
    const medir = () => {
      const disponible = ul.clientWidth;
      setEntran(disponible ? cuantosEntran([...m.children].map((c) => (c as HTMLElement).offsetWidth), disponible) : roles.length);
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [roles]);
  if (!roles.length) return null;
  const quedan = roles.length - entran;
  return (
    <span className={css.lineaRoles}>
      <ul ref={linea} aria-label={`Roles de ${nombre}: ${roles.map((r) => r.nombre).join(", ")}`}>
        {roles.slice(0, entran).map((r) => <Rol key={r.id} r={r} />)}
        {quedan > 0 && <li className="mas" data-testid="mas-roles">+{quedan}</li>}
      </ul>
      <ul ref={medida} className={css.medida} aria-hidden="true">{roles.map((r) => <Rol key={r.id} r={r} />)}</ul>
    </span>
  );
}


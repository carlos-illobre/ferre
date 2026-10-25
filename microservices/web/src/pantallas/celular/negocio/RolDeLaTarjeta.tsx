import type { RolAsignable } from "../../RolesDeUsuario";
import { iconoDeRol as iconoV2 } from "../../iconos-de-negocio";
import { Icono } from "../../../ui/iconos";

// Como la v2 (decisión 148): el ícono de Lucide de cada rol, el mismo que en la computadora.
export const iconoDeRol = (nombre: string, tam = 16) => <Icono nombre={iconoV2(nombre)} tam={tam} />;
export const Rol = ({ r }: { r: RolAsignable }) => <li className={r.nombre === "Administrador" ? "admin" : ""}>{iconoDeRol(r.nombre)}{r.nombre}</li>;

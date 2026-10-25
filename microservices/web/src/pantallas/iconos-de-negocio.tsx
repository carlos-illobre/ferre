import type { NombreDeIcono } from "../ui/iconos";
import "./iniciales.css";


// El ícono de cada rol, como en la v2; un rol que armó el negocio lleva el escudo.
const ICONO_DE_ROL: Record<string, NombreDeIcono> = { Administrador: "shield-check", Recepción: "package", Comprador: "truck", Vendedor: "shopping-cart", Gerente: "chart-column" };
export const iconoDeRol = (nombre: string): NombreDeIcono => ICONO_DE_ROL[nombre] ?? "shield-check";

// Las iniciales de una persona en su círculo, con uno de los cinco tonos: siempre el mismo para el mismo correo.
export const inicialesDe = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
export const tonoDe = (clave: string) => 1 + ([...clave].reduce((s, c) => s + c.charCodeAt(0), 0) % 5);
export function Iniciales({ nombre, clave, tam = "", apagado, className = "" }: { nombre: string; clave: string; tam?: "" | "s" | "l"; apagado?: boolean; className?: string }) {
  return <span className={`iniciales ${tam} ${apagado ? "apagado" : `t${tonoDe(clave)}`} ${className}`} aria-hidden="true">{inicialesDe(nombre)}</span>;
}

import type { KeyboardEvent } from "react";
import { Icono, Pagina, type NombreDeIcono } from "./base/ui";
import type { Permiso } from "../permisos";
import { irA } from "./base/rutas";

// «Más» guarda las pantallas que se usan poco, para que el menú tenga solo lo de todos los días.
// Cada una dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
export const DE_MAS: { ruta: string; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  { ruta: "resumen", nombre: "Cómo va el negocio", detalle: "Lo vendido hoy, los gastos y las compras", icono: "resumen", pide: ["negocio.numeros", "deposito.compras"] },
  { ruta: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde qué dispositivos", icono: "usuarios" },
  { ruta: "actividad", nombre: "Quién hizo qué", detalle: "El registro de todo lo que pasó", icono: "actividad", pide: ["negocio.actividad"] },
  { ruta: "roles", nombre: "Roles", detalle: "Qué puede hacer cada rol", icono: "usuarios", pide: ["admin.roles"] },
  { ruta: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: ["negocio.anomalias"] },
  { ruta: "procesos", nombre: "Procesos", detalle: "Cómo se hace cada cosa en el negocio, dibujado paso a paso", icono: "procesos", pide: ["procesos.ver", "procesos.dibujar"] },
  { ruta: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
  { ruta: "configuracion", nombre: "Configuración", detalle: "Cómo se comporta la aplicación en esta computadora", icono: "ajustes" },
];

export function Mas({ atajoDe, opciones }: { atajoDe: (ruta: string) => string | null; opciones: typeof DE_MAS }) {
  // Las opciones se recorren con las flechas como si fueran pestañas (pedido de Carlos del
  // 2026-10-13): → y ↓ a la siguiente, ← y ↑ a la anterior; ← desde la primera vuelve al menú.
  function teclas(e: KeyboardEvent<HTMLUListElement>) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    const botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const destino = botones[i + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1)];
    e.preventDefault(); e.stopPropagation();
    if (destino) destino.focus();
    else if (e.key === "ArrowLeft") (document.querySelector<HTMLButtonElement>(".lateral nav button[aria-current='page']") ?? document.querySelector<HTMLButtonElement>(".lateral nav button"))?.focus();
  }
  return (
    <Pagina titulo="Más" testId="mas" bajada="Lo que se usa de vez en cuando.">
      <ul className="mas-grilla" onKeyDown={teclas}>
        {opciones.map((d) => (
          <li key={d.ruta}>
            <button type="button" className="tarjeta mas-tarjeta" onClick={() => irA(d.ruta)} data-testid={`mas-${d.ruta}`}>
              <span className="mas-icono"><Icono nombre={d.icono} tam={24} /></span>
              <span className="nombre">{d.nombre}</span>
              <span className="detalle">{d.detalle}</span>
              {atajoDe(d.ruta) && <span className="tecla" aria-hidden="true">Alt+{atajoDe(d.ruta)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}

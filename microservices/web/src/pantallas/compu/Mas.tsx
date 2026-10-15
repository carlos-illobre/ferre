import type { KeyboardEvent } from "react";
import { Icono, Pagina, type NombreDeIcono } from "./base/ui";
import type { Permiso } from "../permisos";
import { irA } from "./base/rutas";
import { NOMBRES, TEXTOS } from "../textos";
import { PIDE_EL_NEGOCIO } from "../pestanas-de-negocio";

// «Más» guarda las pantallas que se usan poco, para que el menú tenga solo lo de todos los días.
// Cada una dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
export const DE_MAS: { ruta: string; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  // Cómo va el negocio abre en la primera de sus secciones que la persona puede ver (decisión 89).
  { ruta: "resumen", nombre: NOMBRES.comoVaElNegocio, detalle: TEXTOS.negocio.queHayEnElNegocio.largo, icono: "resumen", pide: PIDE_EL_NEGOCIO },
  // Usuarios abre en la primera de sus pestañas que la persona puede ver (decisión 88).
  { ruta: "usuarios", nombre: NOMBRES.usuarios, detalle: TEXTOS.usuarios.queHayEnUsuarios.largo, icono: "usuarios" },
  { ruta: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: ["negocio.anomalias"] },
  { ruta: "procesos", nombre: "Procesos", detalle: "Cómo se hace cada cosa en el negocio, dibujado paso a paso", icono: "procesos", pide: ["procesos.ver", "procesos.dibujar"] },
  { ruta: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
  { ruta: "configuracion", nombre: "Configuración", detalle: "Cómo se comporta la aplicación en esta computadora", icono: "ajustes" },
];

// `destino`: adónde lleva la opción, si no es su propia ruta (Usuarios y Cómo va el negocio van a su primera pestaña).
export function Mas({ atajoDe, opciones }: { atajoDe: (ruta: string) => string | null; opciones: ((typeof DE_MAS)[number] & { destino?: string })[] }) {
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
            <button type="button" className="tarjeta mas-tarjeta" onClick={() => irA(d.destino ?? d.ruta)} data-testid={`mas-${d.ruta}`}>
              <span className="mas-icono"><Icono nombre={d.icono} tam={24} /></span>
              <span className="nombre">{d.nombre}</span>
              <span className="detalle">{d.detalle}</span>
              {atajoDe(d.destino ?? d.ruta) && <span className="tecla" aria-hidden="true">Alt+{atajoDe(d.destino ?? d.ruta)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}

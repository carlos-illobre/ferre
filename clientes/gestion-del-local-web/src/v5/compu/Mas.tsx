import { Icono, Pagina, type NombreDeIcono } from "../../v2/ui";
import { irA } from "../../v2/rutas";

// «Más» guarda las pantallas que se usan poco, para que el menú tenga solo lo de todos los días.
export const DE_MAS: { ruta: string; nombre: string; detalle: string; icono: NombreDeIcono }[] = [
  { ruta: "resumen", nombre: "Cómo va el negocio", detalle: "Lo vendido hoy y los gastos de la semana", icono: "resumen" },
  { ruta: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde qué dispositivos", icono: "usuarios" },
  { ruta: "actividad", nombre: "Quién hizo qué", detalle: "El registro de todo lo que pasó", icono: "actividad" },
];

export function Mas({ atajoDe }: { atajoDe: (ruta: string) => string | null }) {
  return (
    <Pagina titulo="Más" testId="mas" bajada="Lo que se usa de vez en cuando.">
      <ul className="mas-grilla">
        {DE_MAS.map((d) => (
          <li key={d.ruta}>
            <button type="button" className="tarjeta mas-tarjeta" onClick={() => irA(d.ruta)} data-testid={`mas-${d.ruta}`}>
              <span className="mas-icono"><Icono nombre={d.icono} tam={24} /></span>
              <span className="nombre">{d.nombre}</span>
              <span className="detalle">{d.detalle}</span>
              {atajoDe(d.ruta) && <span className="tecla" aria-hidden="true">Alt {atajoDe(d.ruta)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}

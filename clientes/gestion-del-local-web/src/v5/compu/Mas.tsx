import { Icono, Pagina, type NombreDeIcono } from "../../v2/ui";
import { irA } from "../../v2/rutas";

// «Más» guarda las pantallas que se usan poco, para que el menú tenga solo lo de todos los días.
export const DE_MAS: { ruta: string; nombre: string; detalle: string; icono: NombreDeIcono }[] = [
  { ruta: "listas", nombre: "Listas de precios", detalle: "Cargar la planilla de un proveedor y actualizar los costos", icono: "listas" },
  { ruta: "duplicados", nombre: "Duplicados", detalle: "Unir el mismo producto cuando llega de dos proveedores", icono: "duplicados" },
  { ruta: "contar", nombre: "Contar stock", detalle: "Contar una estantería y corregir las diferencias", icono: "contar" },
  { ruta: "resumen", nombre: "Cómo va el negocio", detalle: "Lo vendido hoy, las compras de la semana y lo que no llevaron", icono: "resumen" },
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

import { Atajo, Icono, Pagina, type NombreDeIcono } from "../base/ui";
import type { Permiso } from "../../../negocio/permisos";
import { irA } from "../base/rutas";
import { TEXTOS } from "../../textos";
import { PIDE_LAS_ANOMALIAS } from "../../pestanas-de-anomalias";

// «Más» guarda las pantallas que se usan poco, para que el menú tenga solo lo de todos los días.
// Cada una dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
export const DE_MAS: { ruta: string; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] }[] = [
  // Anomalías abre en la primera de sus pestañas que la persona puede ver: «Para revisar» o «Anotadas» (014).
  { ruta: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: PIDE_LAS_ANOMALIAS },
  { ruta: "procesos", nombre: "Procesos", detalle: "Cómo se hace cada cosa en el negocio, dibujado paso a paso", icono: "procesos", pide: ["procesos.ver", "procesos.dibujar"] },
  { ruta: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
  { ruta: "configuracion", nombre: "Configuración", detalle: TEXTOS.configuracion.queHay.largo, icono: "ajustes" },
  // Lo que vale para todos los dispositivos (specs/020).
  { ruta: "sistema", nombre: "Sistema", detalle: TEXTOS.sistema.queHay.largo, icono: "computadora", pide: ["admin.sistema"] },
];

// `destino`: adónde lleva la opción, si no es su propia ruta (Usuarios y Cómo va el negocio van a su primera pestaña).
export function Mas({ accionDe, opciones }: { accionDe: (ruta: string) => string | null; opciones: ((typeof DE_MAS)[number] & { destino?: string })[] }) {
  return (
    <Pagina titulo="Más" testId="mas" bajada="Lo que se usa de vez en cuando.">
      <ul className="mas-grilla" data-zona="mas">
        {opciones.map((d) => (
          <li key={d.ruta}>
            <button type="button" className="tarjeta mas-tarjeta" onClick={() => irA(d.destino ?? d.ruta)} data-testid={`mas-${d.ruta}`}>
              <span className="mas-icono"><Icono nombre={d.icono} tam={24} /></span>
              <span className="nombre">{d.nombre}</span>
              <span className="detalle">{d.detalle}</span>
              <Atajo accion={accionDe(d.destino ?? d.ruta) ?? ""} />
            </button>
          </li>
        ))}
      </ul>
    </Pagina>
  );
}

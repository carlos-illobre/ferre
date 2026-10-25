import type { Evento } from "../../../negocio/actividad";
import { type NombreDeIcono } from "../../../ui/iconos";

// Cada acción con su título, el ícono de su grupo y el color de su importancia (specs/027): rojo lo
// anulado, ámbar lo que el dueño revisa (los cambios de margen y de stock). El título lo manda el
// servicio que hizo la acción; un grupo que la web no conoce va con el ícono de siempre.
export type Que = { nombre: string; icono: NombreDeIcono; tono?: "error" | "urgente" };

const ICONOS: Record<string, NombreDeIcono> = {
  "Ventas": "shopping-cart", "Compras": "truck", "Productos": "package", "Listas de precios": "file-text",
  "Ajustes de stock": "package", "Conteos": "boxes", "Usuarios": "users", "Entradas y salidas de la app": "log-in",
  "Celulares con huella": "fingerprint", "Celulares vinculados": "smartphone", "Clientes": "user-plus",
  "Proveedores": "truck", "Ajustes del sistema": "pencil", "Mejoras y errores": "file-text", "Procesos": "file-text",
};
const TONOS = { normal: undefined, revisar: "urgente", anulacion: "error" } as const;

export function queFue(e: Evento): Que {
  return { nombre: e.titulo, icono: e.importancia === "anulacion" ? "ban" : ICONOS[e.grupo] ?? "file-text", tono: TONOS[e.importancia] };
}

// La línea de detalle que mandó el servicio, o nada.
export const detalleDe = (e: Evento): string => e.detalle ?? "";

// «Qué pasó»: los tipos de Comercial que se cuentan aparte (los demás van en «Otras»). Es del
// negocio del mostrador, no de Auditoría. `tipo` es el filtro de la API: compara el comienzo.
export const CATEGORIAS: { tipo: string; nombre: string; icono: NombreDeIcono; tono?: "error" | "urgente" }[] = [
  { tipo: "venta.registrada", nombre: "Ventas", icono: "shopping-cart" },
  { tipo: "sesion.iniciada", nombre: "Entradas", icono: "log-in" },
  { tipo: "producto.precio_elegido", nombre: "Precios y márgenes", icono: "percent", tono: "urgente" },
  { tipo: "stock.", nombre: "Ajustes de stock", icono: "package", tono: "urgente" },
  { tipo: "venta.anulada", nombre: "Ventas anuladas", icono: "ban", tono: "error" },
];

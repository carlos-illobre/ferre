// Los destinos de la app: los cinco principales (menú lateral y barra de pestañas) y los
// que cuelgan de «Más». El `camino` es la dirección: #/vender, #/stock, …
import type { NombreDeIcono } from "../piezas/Icono";
import { ir } from "../ruta";

export type Destino = {
  camino: string;
  nombre: string;
  /** Nombre corto para la barra de pestañas del celular. */
  corto?: string;
  icono: NombreDeIcono;
};

export type DestinoDeMas = Destino & { detalle: string };

export const PRINCIPALES: Destino[] = [
  { camino: "vender", nombre: "Vender", icono: "vender" },
  { camino: "ventas", nombre: "Ventas del día", corto: "Ventas", icono: "ventas" },
  { camino: "productos", nombre: "Productos", icono: "productos" },
  { camino: "recibir", nombre: "Recibir mercadería", corto: "Recibir", icono: "recibir" },
  { camino: "mas", nombre: "Más", icono: "menu" },
];

export const DE_MAS: DestinoDeMas[] = [
  { camino: "listas", nombre: "Listas de precios", detalle: "Actualizá los costos con la planilla del proveedor", icono: "listas" },
  { camino: "duplicados", nombre: "Duplicados", detalle: "Uní los productos que están cargados dos veces", icono: "duplicados" },
  { camino: "stock", nombre: "Stock", detalle: "Cuánto hay de cada producto y qué se movió", icono: "stock" },
  { camino: "contar", nombre: "Contar stock", detalle: "Contá una estantería con el celular", icono: "contar" },
  { camino: "negocio", nombre: "Cómo va el negocio", detalle: "Lo vendido, lo comprado y lo que no llevaron", icono: "negocio" },
  { camino: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde dónde", icono: "usuarios" },
  { camino: "actividad", nombre: "Quién hizo qué", detalle: "Todo lo que pasó, en orden", icono: "actividad" },
];

/** `true` si la pantalla cuelga de «Más» (entonces «Más» queda marcado y hay «Volver a Más»). */
export function esDeMas(camino: string): boolean {
  return DE_MAS.some((d) => d.camino === camino);
}

/** Qué destino principal queda marcado para una pantalla. */
export function principalDe(camino: string): string {
  return esDeMas(camino) ? "mas" : camino;
}

/** Lo que se puede hacer desde el usuario: lo comparten el menú lateral y el avatar del celular. */
export const ACCIONES_DE_USUARIO: { clave: string; nombre: string; icono: NombreDeIcono; alTocar: () => void }[] = [
  { clave: "usuarios", nombre: "Usuarios y sesiones", icono: "usuarios", alTocar: () => ir("usuarios") },
  { clave: "salir", nombre: "Salir", icono: "salir", alTocar: () => ir("entrar") },
];

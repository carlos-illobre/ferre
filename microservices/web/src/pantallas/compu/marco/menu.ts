import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO, type SeccionDeNegocio } from "../../pestanas-de-negocio";
import { PESTANAS_DE_ANOMALIAS } from "../../pestanas-de-anomalias";
import { PIDE_VENDER, PIDE_VENTAS_DEL_DIA, type Permiso } from "../../../negocio/permisos";
import type { NombreDeIcono } from "../base/ui";
import { NOMBRES as NOMBRES_DE_TEXTOS } from "../../textos";
import { DE_MAS } from "./Mas";

// El mismo menú que en el celular, en el mismo orden (primero lo que más se hace), y cada
// parte con sus pestañas adentro. «Más» es una pantalla con lo que se usa poco.
// Cada pantalla dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
export type Pestana = { ruta: string; nombre: string; icono: NombreDeIcono; pide?: Permiso[] };
export type Parte = { clave: string; nombre: string; icono: NombreDeIcono; pestanas: Pestana[] };
// Cómo va el negocio también es una opción de Más con pestañas, una por sección (decisión 95).
const RUTA_DE_SECCION: Record<SeccionDeNegocio, string> = { ventas: "resumen", compras: "gastos", inventario: "invertido" };
export const DE_NEGOCIO: Pestana[] = SECCIONES_DE_NEGOCIO.map((s) => ({ ruta: RUTA_DE_SECCION[s.valor], nombre: s.nombre, icono: s.icono, pide: s.pide }));
export const RUTAS_DE_NEGOCIO = new Set(DE_NEGOCIO.map((p) => p.ruta));
// Las opciones de Más con pestañas: sus pestañas no llevan atajo Alt y se recorren con las flechas.
// Anomalías también (014): «Para revisar» y «Anotadas».
export const DE_ANOMALIAS: Pestana[] = PESTANAS_DE_ANOMALIAS.map((p) => ({ ruta: p.valor, nombre: p.nombre, icono: p.icono, pide: p.pide }));
export const RUTAS_DE_ANOMALIAS = new Set(DE_ANOMALIAS.map((p) => p.ruta));
export const SIN_ATAJO = new Set([...RUTAS_DE_ANOMALIAS]);
// Negocio, como la v2 (decisión 148, 021-T007): una parte del menú con Resumen · Usuarios · Quién hizo
// qué. Las secciones de Resumen son segmentos de su pantalla; Roles, un botón dentro de Usuarios.
const DE_LA_PARTE_NEGOCIO: Pestana[] = [
  { ruta: "resumen", nombre: NOMBRES_DE_TEXTOS.resumen, icono: "resumen", pide: PIDE_EL_NEGOCIO },
  { ruta: "usuarios", nombre: NOMBRES_DE_TEXTOS.usuarios, icono: "usuarios", pide: ["admin.usuarios", "admin.roles"] },
  { ruta: "actividad", nombre: NOMBRES_DE_TEXTOS.quienHizoQue, icono: "actividad", pide: ["negocio.actividad"] },
];
// Pantallas sin pestaña propia: se ven con la pestaña de la que salen marcada (Compras abre el
// Ingreso y los Pedidos, como la v2; Resumen sus secciones; Usuarios los roles).
export const PESTANA_DE: Record<string, string> = { gastos: "resumen", invertido: "resumen", roles: "usuarios", ingreso: "compras", pedidos: "compras" };
export const MENU: Parte[] = [
  { clave: "vender", nombre: "Vender", icono: "vender", pestanas: [{ ruta: "vender", icono: "vender", nombre: "Vender", pide: [...PIDE_VENDER] }, { ruta: "hoy", icono: "ventas", nombre: "Ventas del día", pide: [...PIDE_VENTAS_DEL_DIA] }] },
  { clave: "catalogo", nombre: "Catálogo", icono: "menu-catalogo", pestanas: [{ ruta: "productos", icono: "productos", nombre: "Productos" }, { ruta: "listas", icono: "listas", nombre: "Listas", pide: ["catalogo.listas"] }, { ruta: "duplicados", icono: "duplicados", nombre: "Duplicados", pide: ["catalogo.duplicados"] }] },
  // Depósito como la v2 (decisión 148): Stock · Compras · Contar; Compras abre el Ingreso y los Pedidos.
  { clave: "deposito", nombre: "Depósito", icono: "deposito", pestanas: [{ ruta: "stock", icono: "stock", nombre: "Stock" }, { ruta: "compras", icono: "compras", nombre: "Compras", pide: ["negocio.gastos", "deposito.compras", "deposito.ingresos", "deposito.pedidos"] }, { ruta: "contar", icono: "contar", nombre: "Contar", pide: ["deposito.stock"] }] },
  { clave: "negocio", nombre: "Negocio", icono: "menu-negocio", pestanas: DE_LA_PARTE_NEGOCIO },
  // Anomalías es una opción de Más con pestañas: en el menú cuentan sus pestañas.
  { clave: "mas", nombre: "Más", icono: "ellipsis", pestanas: DE_MAS.flatMap((d) => (d.ruta === "anomalias" ? DE_ANOMALIAS : [{ ruta: d.ruta, nombre: d.nombre, icono: d.icono, pide: d.pide }])) },
];
// Pantallas que no están en el menú pero tienen dirección.
// «anular» era la pestaña de anular, que ahora está en «Ventas de hoy» (decisión 120): lleva ahí.
const FUERA_DEL_MENU: Pestana[] = [
  { ruta: "mas", nombre: "Más", icono: "mas" }, { ruta: "anular", nombre: "Ventas del día", icono: "ventas" },
  ...DE_NEGOCIO.filter((p) => p.ruta !== "resumen"), { ruta: "roles", nombre: NOMBRES_DE_TEXTOS.rolesYPermisos, icono: "roles", pide: ["admin.roles"] },
  { ruta: "ingreso", nombre: "Ingreso", icono: "compras", pide: ["deposito.ingresos"] }, { ruta: "pedidos", nombre: "Pedidos", icono: "listas", pide: ["deposito.pedidos", "deposito.ingresos"] },
];
export const TODAS = [...MENU.flatMap((m) => m.pestanas), ...FUERA_DEL_MENU];
export const NOMBRES = new Map<string, string>(TODAS.map((p) => [p.ruta, p.nombre]));
// Las partes con el nombre que comparten el celular y la computadora en espejo (decisión 60).
export const A_PARTE_COMUN: Record<string, string> = {
  productos: "catalogo", listas: "catalogo/listas", duplicados: "catalogo/duplicados", vender: "vender", hoy: "vender/hoy",
  pedidos: "deposito/pedidos", compras: "deposito/compras", ingreso: "deposito/ingreso", stock: "deposito/stock", contar: "deposito/contar",
  mas: "mas", resumen: "mas/negocio", gastos: "mas/gastos", invertido: "mas/invertido", usuarios: "mas/usuarios", roles: "mas/roles", actividad: "mas/actividad", anomalias: "mas/anomalias", "para-revisar": "mas/para-revisar", tickets: "mas/tickets", configuracion: "mas/configuracion", sistema: "mas/sistema", procesos: "mas/procesos",
};
export const DE_PARTE_COMUN: Record<string, string> = { ...Object.fromEntries(Object.entries(A_PARTE_COMUN).map(([ruta, parte]) => [parte, ruta])), "catalogo/productos": "productos", "vender/anular": "hoy" };
// Alt + número abre cada pantalla, en el orden en que se ven: 1 a 9 y 0.

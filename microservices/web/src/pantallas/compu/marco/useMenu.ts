import { useMemo } from "react";
import { PIDE_EL_NEGOCIO } from "../../pestanas-de-negocio";
import { puede, type Permiso } from "../../permisos";
import type { UsuarioDeLaSesion } from "../../../negocio/usuarios";
import { useParaRevisar } from "../../../negocio/apartados";
import { DE_ANOMALIAS, DE_NEGOCIO, MENU, NOMBRES, PESTANA_DE, RUTAS_DE_ANOMALIAS, RUTAS_DE_NEGOCIO, SIN_ATAJO, TODAS, type Pestana } from "./menu";
import { DE_MAS } from "./Mas";

type Usuario = UsuarioDeLaSesion | null;
const lasQuePuede = (usuario: Usuario, ps: Pestana[]) => ps.filter((p) => puede(usuario, ...(p.pide ?? [])));

// La pantalla abierta: sin dirección, o con una que no existe, lo primero del menú; «anular» lleva a Ventas del día.
export const pantallaDe = (nombre: string, sinDireccion: boolean) => (sinDireccion || !NOMBRES.has(nombre) ? "productos" : nombre === "anular" ? "hoy" : nombre);

// Sin ninguno de los permisos de Cómo va el negocio se nombran todos, como en el celular (012-E05).
function permisoQueFalta(usuario: Usuario, actual: string): Permiso[] | null {
  const pide = RUTAS_DE_NEGOCIO.has(actual) ? (puede(usuario, ...PIDE_EL_NEGOCIO) ? DE_NEGOCIO.find((p) => p.ruta === actual)?.pide : PIDE_EL_NEGOCIO) : TODAS.find((p) => p.ruta === actual)?.pide;
  return usuario && !puede(usuario, ...(pide ?? [])) ? pide! : null;
}

// El menú de esta persona: solo las partes y pantallas que sus roles le permiten. Los atajos
// se numeran sobre lo que ve. Las pestañas de Usuarios no llevan atajo (decisión 88): lo lleva
// solo la opción de Más, que abre la primera que se ve.
export function useMenu(usuario: Usuario, actual: string) {
  const menu = useMemo(() => MENU.map((m) => ({ ...m, pestanas: lasQuePuede(usuario, m.pestanas) })).filter((m) => m.pestanas.length > 0), [usuario]);
  const deNegocio = useMemo(() => lasQuePuede(usuario, DE_NEGOCIO), [usuario]);
  const deAnomalias = useMemo(() => lasQuePuede(usuario, DE_ANOMALIAS), [usuario]);
  // Lo que hay para revisar, para mostrar la cantidad en su pestaña (014).
  const paraRevisar = useParaRevisar(puede(usuario, "admin.usuarios")).datos?.apartados.length ?? 0;
  const conAtajo = useMemo(() => menu.flatMap((m) => m.pestanas.map((p) => p.ruta)).filter((r) => !SIN_ATAJO.has(r) || r === deAnomalias[0]?.ruta), [menu, deAnomalias]);
  // Adónde lleva cada pestaña: Resumen, a la primera sección que se ve (decisión 95).
  const destinoDe = (r: string) => (r === "resumen" ? deNegocio[0]?.ruta ?? "resumen" : r);
  // La acción que abre esa pantalla por su lugar en el menú (las diez primeras): «menu.1», «menu.2»…
  const accionDe = (r: string) => { const i = conAtajo.indexOf(r); return i < 0 || i >= 10 ? null : `menu.${i + 1}`; };
  return { menu, deAnomalias, paraRevisar, conAtajo, destinoDe, accionDe, ...dondeEsta(usuario, actual, menu, deAnomalias), falta: permisoQueFalta(usuario, actual) };
}

// La parte del menú de la pantalla abierta, sus pestañas (con una sola a la vista no se dibujan;
// en Más, solo Anomalías tiene) y el título de la parte, grande arriba de las pestañas (decisión 148).
function pestanasDe(parte: string, anomalias: boolean, menu: typeof MENU, deAnomalias: Pestana[]) {
  const deLaParte = anomalias ? deAnomalias : parte === "mas" ? null : (menu.find((m) => m.clave === parte)?.pestanas ?? null);
  return deLaParte && deLaParte.length > 1 ? deLaParte : null;
}
const tituloDe = (parte: string, anomalias: boolean) => (parte !== "mas" ? MENU.find((m) => m.clave === parte)!.nombre : anomalias ? "Anomalías" : null);

function dondeEsta(usuario: Usuario, actual: string, menu: typeof MENU, deAnomalias: Pestana[]) {
  const deLaPestana = PESTANA_DE[actual] ?? actual;
  const parte = MENU.find((m) => m.pestanas.some((p) => p.ruta === deLaPestana))?.clave ?? "mas";
  const anomalias = RUTAS_DE_ANOMALIAS.has(actual);
  const deMas = DE_MAS.filter((d) => puede(usuario, ...(d.pide ?? []))).map((d) => (d.ruta === "anomalias" ? { ...d, destino: deAnomalias[0]?.ruta ?? "anomalias" } : d));
  return { deLaPestana, parte, titulo: tituloDe(parte, anomalias), pestanas: pestanasDe(parte, anomalias, menu, deAnomalias), deMas };
}
export type MenuDeLaPersona = ReturnType<typeof useMenu>;

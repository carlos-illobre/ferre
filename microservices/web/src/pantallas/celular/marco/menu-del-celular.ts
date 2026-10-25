import type { Ruta } from "../../../rutas";
import type { UsuarioDeLaSesion } from "../../../negocio/usuarios";
import { puede, type Permiso } from "../../permisos";
import { PESTANAS_DE_USUARIOS } from "../../pestanas-de-usuarios";
import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO } from "../../pestanas-de-negocio";
import { PESTANAS_DE_ANOMALIAS } from "../../pestanas-de-anomalias";
import { SUB_DE_SECCION } from "../negocio/sub-de-seccion";
import { DE_MAS, PESTANAS, type OpcionDeMas, type ParteDeMas } from "./menu";

type Permitido = (pide?: Permiso[]) => boolean;

// Las pestañas de Usuarios (decisión 88), las secciones de Cómo va el negocio (decisión 95) y las
// pestañas de Anomalías (014: `mas/para-revisar` y `mas/anomalias`), cada una con su dirección.
function pestanasDeLaParte(ruta: Ruta) {
  const enMas = (valor: string) => ruta.nombre === "mas" && valor === ruta.sub;
  const subDeNegocio = ruta.nombre === "negocio" ? "negocio" : ruta.nombre === "mas" ? ruta.sub : null;
  return {
    deUsuarios: PESTANAS_DE_USUARIOS.find((p) => enMas(p.valor)) ?? null,
    deNegocio: SECCIONES_DE_NEGOCIO.find((s) => SUB_DE_SECCION[s.valor] === subDeNegocio) ?? null,
    deAnomalias: PESTANAS_DE_ANOMALIAS.find((p) => enMas(p.valor)) ?? null,
  };
}
type PestanasDeLaParte = ReturnType<typeof pestanasDeLaParte>;

// Cada parte con pestañas abre en la primera que la persona puede ver.
function primeras(permitido: Permitido) {
  const usuarios = PESTANAS_DE_USUARIOS.find((p) => permitido(p.pide))?.valor ?? "usuarios";
  const negocio = SUB_DE_SECCION[SECCIONES_DE_NEGOCIO.find((s) => permitido(s.pide))?.valor ?? "ventas"];
  const anomalias = PESTANAS_DE_ANOMALIAS.find((p) => permitido(p.pide))?.valor ?? "anomalias";
  return { usuarios, negocio, anomalias, laParteNegocio: permitido(PIDE_EL_NEGOCIO) ? negocio : usuarios };
}
export type Primeras = ReturnType<typeof primeras>;

const opcion = (parte: ParteDeMas) => DE_MAS.find((d) => d.parte === parte)!;
function opcionElegida({ deUsuarios, deNegocio, deAnomalias }: PestanasDeLaParte, sub: string | null): OpcionDeMas | null {
  if (deUsuarios) return opcion("usuarios");
  if (deNegocio) return opcion("negocio");
  if (deAnomalias) return opcion("anomalias");
  return DE_MAS.find((d) => d.parte === sub) ?? null;
}

// Lo que pide la pantalla a la que se llegó; si no se tiene, se dice en vez de mostrarla.
function loQueFalta(pestana: string, elegida: OpcionDeMas | null, partes: PestanasDeLaParte, permitido: Permitido): Permiso[] | null {
  const dePestana = PESTANAS.find((p) => p.ruta === pestana);
  if (!permitido(dePestana?.pide)) return dePestana!.pide!;
  if (pestana !== "mas") return null;
  const sinPermiso = [elegida, partes.deUsuarios, partes.deNegocio, partes.deAnomalias].find((x) => x && !permitido(x.pide));
  return sinPermiso ? (sinPermiso.pide as Permiso[]) : null;
}

// A dónde lleva cada opción de Más.
export const destinoDeMas = (d: OpcionDeMas, p: Primeras) => `mas/${d.parte === "usuarios" ? p.usuarios : d.parte === "negocio" ? p.negocio : d.parte === "anomalias" ? p.anomalias : d.parte}`;

// Sin dirección, la app abre en lo primero del menú. Las direcciones viejas de Negocio siguen andando.
function pestanaElegida(ruta: Ruta, sinDireccion: boolean) {
  const nombre = sinDireccion ? "catalogo" : ruta.nombre === "negocio" ? "mas" : ruta.nombre;
  return PESTANAS.find((p) => p.ruta === nombre && p.ruta !== "negocio")?.ruta ?? "catalogo";
}

// Qué pestaña del menú está elegida, qué parte de Más y qué le falta a la persona para verla.
export function menuDelCelular(usuario: UsuarioDeLaSesion, ruta: Ruta) {
  const permitido: Permitido = (pide) => puede(usuario, ...(pide ?? []));
  const sinDireccion = location.hash.replace(/^#\/?/, "") === "";
  const partes = pestanasDeLaParte(ruta);
  const elegida = opcionElegida(partes, ruta.sub);
  const pestana = pestanaElegida(ruta, sinDireccion);
  // Negocio: Cómo va el negocio, Usuarios (con Roles) y Quién hizo qué.
  const enNegocio = pestana === "mas" && Boolean(partes.deUsuarios || partes.deNegocio);
  return {
    ...partes, sinDireccion, pestana, enNegocio, sub: ruta.sub, parte: elegida?.parte ?? null, primeras: primeras(permitido),
    pestanas: PESTANAS.filter((p) => permitido(p.pide)),
    // En Más quedan las opciones que no pasaron a Negocio.
    deMas: DE_MAS.filter((d) => d.parte !== "negocio" && d.parte !== "usuarios" && permitido(d.pide)),
    falta: loQueFalta(pestana, elegida, partes, permitido),
    activa: (r: string) => (r === "negocio" ? enNegocio : r === pestana && !(r === "mas" && enNegocio)),
  };
}
export type MenuDelCelular = ReturnType<typeof menuDelCelular>;

import { PIDE_VENDER, PIDE_VENTAS_DEL_DIA, type Permiso } from "../../../negocio/permisos";
import type { NombreDeIcono } from "../../../ui";
import type { Parte } from "../negocio/Negocio";
import { PIDE_USUARIOS } from "../../pestanas-de-usuarios";
import { PIDE_EL_NEGOCIO } from "../../pestanas-de-negocio";
import { PIDE_LAS_ANOMALIAS } from "../../pestanas-de-anomalias";
import { NOMBRES, TEXTOS } from "../../textos";

export type RutaDelMenu = "catalogo" | "vender" | "deposito" | "negocio" | "mas";

// El mismo menú que en la computadora, en el mismo orden: primero lo que más se hace.
// Cada parte dice qué permiso pide (RF-72); sin `pide`, la ve cualquiera con sesión.
// Como la v2 (decisión 148): Vender · Catálogo · Depósito · Negocio · Más. Negocio no tiene dirección
// propia: sus pantallas siguen en mas/… (las direcciones de siempre) y se ven con Negocio marcado.
export const PESTANAS: { ruta: RutaDelMenu; nombre: string; pide?: Permiso[] }[] = [
  { ruta: "vender", nombre: "Vender", pide: [...PIDE_VENDER, ...PIDE_VENTAS_DEL_DIA] },
  { ruta: "catalogo", nombre: "Catálogo" },
  { ruta: "deposito", nombre: "Depósito" },
  { ruta: "negocio", nombre: NOMBRES.negocio, pide: [...PIDE_EL_NEGOCIO, ...PIDE_USUARIOS] },
  { ruta: "mas", nombre: "Más" },
];

export type ParteDeMas = Exclude<Parte, "actividad"> | "negocio" | "tickets" | "anomalias" | "configuracion" | "sistema" | "procesos";
export type OpcionDeMas = { parte: ParteDeMas; nombre: string; detalle: string; icono: NombreDeIcono; pide?: Permiso[] };

export const DE_MAS: OpcionDeMas[] = [
  // Cómo va el negocio abre en la primera de sus secciones que la persona puede ver (decisión 95).
  { parte: "negocio", nombre: NOMBRES.comoVaElNegocio, detalle: TEXTOS.negocio.queHayEnElNegocio.corto, icono: "resumen", pide: PIDE_EL_NEGOCIO },
  // Usuarios abre en la primera de sus pestañas que la persona puede ver (decisión 88).
  { parte: "usuarios", nombre: NOMBRES.usuarios, detalle: TEXTOS.usuarios.queHayEnUsuarios.corto, icono: "usuarios", pide: PIDE_USUARIOS },
  // Anomalías abre en la primera de sus pestañas que la persona puede ver: «Para revisar» o «Anotadas» (014).
  { parte: "anomalias", nombre: "Anomalías", detalle: "Cuando el sistema y la realidad no coinciden", icono: "alerta", pide: PIDE_LAS_ANOMALIAS },
  { parte: "procesos", nombre: "Procesos", detalle: "Cómo se hace cada cosa en el negocio, paso a paso", icono: "procesos", pide: ["procesos.ver", "procesos.dibujar"] },
  { parte: "tickets", nombre: "Mejoras y errores", detalle: "Avisar de un error o proponer una mejora, con fotos", icono: "editar" },
  { parte: "configuracion", nombre: "Configuración", detalle: TEXTOS.configuracion.queHay.corto, icono: "ajustes" },
  // Lo que vale para todos los dispositivos (specs/020).
  { parte: "sistema", nombre: "Sistema", detalle: TEXTOS.sistema.queHay.corto, icono: "computadora", pide: ["admin.sistema"] },
];

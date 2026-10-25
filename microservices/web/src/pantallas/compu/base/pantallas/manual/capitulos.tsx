import type { ReactNode } from "react";
import type { Dispositivo } from "./piezas";
import { CapituloEntrar, SECCIONES_DE_ENTRAR } from "./Entrar";
import { CapituloCatalogo, SECCIONES_DE_CATALOGO } from "./Catalogo";
import { CapituloCatalogoCelular, SECCIONES_DE_CATALOGO_CELULAR } from "./CatalogoCelular";

// Un capítulo por pantalla principal; los que faltan escribir dicen «pronto». Cada uno, para
// el dispositivo que se elige arriba del índice (decisión 109).
export type Seccion = { id: string; nombre: string; de?: Dispositivo };
export type Relacionado = { id: string; titulo: string; detalle: string; icono: string };
export type Capitulo = {
  nombre: string;
  // Para qué dispositivos está escrito; sin esto, dice «pronto» en los dos.
  escrito?: { [d in Dispositivo]?: { contenido: () => ReactNode; consejo: string; relacionados: Relacionado[] } };
  secciones?: readonly Seccion[];
  testId?: string;
};

const ICONOS = {
  problema: "M12 9v4M12 17h.01M10.3 4 2.7 17.5A2 2 0 0 0 4.4 20.5h15.2a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0Z",
  huella: "M12 11v3a6 6 0 0 1-1.2 3.6M8.5 9.5a4 4 0 0 1 7 2.5v1.5M6 13v-1a6 6 0 0 1 10.8-3.6M15.5 17.5c.3-1 .5-2 .5-3",
  google: "M21 12a9 9 0 1 1-2.6-6.4M12 12h9",
  celular: "M7 2.5h10a2.5 2.5 0 0 1 2.5 2.5v14a2.5 2.5 0 0 1-2.5 2.5H7A2.5 2.5 0 0 1 4.5 19V5A2.5 2.5 0 0 1 7 2.5ZM11 18.5h2",
  porcentaje: "M19 5 5 19M6.5 4a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM17.5 15a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
  carrito: "M3 4h2l2.4 11h10.2L20 7H6.2M9 20h.01M17 20h.01",
  barras: "M4 6v12M8 6v12M12 6v12M16 6v12M20 6v12",
};

export const CAPITULOS: Capitulo[] = [
  { nombre: "Entrar", secciones: SECCIONES_DE_ENTRAR, testId: "manual-entrar", escrito: {
    compu: {
      contenido: () => <CapituloEntrar dispositivo="compu" />,
      consejo: "Con Ferrebress abierto en el celular, entrás a la computadora en segundos: tocá «Vincular» y apuntá al código.",
      relacionados: [
        { id: "problemas", titulo: "Si algo no funciona", detalle: "Qué hacer si no podés entrar.", icono: ICONOS.problema },
        { id: "compu-google", titulo: "Entrar con tu cuenta de Google", detalle: "Si no tenés el celular a mano.", icono: ICONOS.google },
        { id: "compu-celular", titulo: "Entrar con el celular", detalle: "La forma más rápida en la computadora.", icono: ICONOS.celular },
      ],
    },
    celu: {
      contenido: () => <CapituloEntrar dispositivo="celu" />,
      consejo: "Después de la primera vez, entrás con la huella: un toque y el dedo.",
      relacionados: [
        { id: "problemas", titulo: "Si algo no funciona", detalle: "Qué hacer si no podés entrar.", icono: ICONOS.problema },
        { id: "celu-huella", titulo: "Entrar con la huella", detalle: "La forma más rápida en el celular.", icono: ICONOS.huella },
        { id: "celu-google", titulo: "Entrar con Google", detalle: "La primera vez en ese celular.", icono: ICONOS.google },
      ],
    },
  } },
  { nombre: "Catálogo", secciones: [...SECCIONES_DE_CATALOGO, ...SECCIONES_DE_CATALOGO_CELULAR], testId: "manual-catalogo", escrito: {
    compu: {
      contenido: () => <CapituloCatalogo />,
      consejo: "Para encontrar rápido un producto, escribí solo una parte: con «mecha 6» aparecen todas las mechas de 6 mm.",
      relacionados: [
        { id: "cat-margen", titulo: "Poner el margen", detalle: "Para que tenga precio de venta.", icono: ICONOS.porcentaje },
        { id: "cat-agregar", titulo: "Agregar a la venta", detalle: "Sin ir a Vender.", icono: ICONOS.carrito },
        { id: "cat-codigo", titulo: "Cargar el código de barras", detalle: "Para encontrarlo escaneándolo.", icono: ICONOS.barras },
      ],
    },
    celu: {
      contenido: () => <CapituloCatalogoCelular />,
      consejo: "Para buscar más rápido, escaneá el código de barras: tocá el botón de las barras, al lado del buscador.",
      relacionados: [
        { id: "cat-escanear", titulo: "Buscar escaneando", detalle: "Con la cámara, sin escribir.", icono: ICONOS.barras },
        { id: "cat-margen", titulo: "Poner el margen", detalle: "Para que tenga precio de venta.", icono: ICONOS.porcentaje },
        { id: "cat-agregar", titulo: "Agregar a la venta", detalle: "Sin ir a Vender.", icono: ICONOS.carrito },
      ],
    },
  } },
  { nombre: "Vender" },
  { nombre: "Cómo va el negocio" },
  { nombre: "Usuarios" },
  { nombre: "Anomalías" },
  { nombre: "Procesos" },
  { nombre: "Mejoras y errores" },
  { nombre: "Configuración" },
];

export const NOMBRE_DEL_DISPOSITIVO: Record<Dispositivo, string> = { compu: "Computadora", celu: "Celular" };
export const escritoPara = (c: Capitulo, d: Dispositivo) => Boolean(c.escrito?.[d]);
export const seccionesDe = (c: Capitulo, d: Dispositivo) => (c.secciones ?? []).filter((s) => !s.de || s.de === d);


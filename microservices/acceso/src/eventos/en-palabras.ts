import type { Importancia } from "auditoria-kit";

// Cada acción de Comercial dicha con palabras, como la lee el dueño en «Quién hizo qué» (specs/027):
// el título, el detalle de una línea, el grupo del filtro «qué» y si es para revisar (ámbar: los
// cambios de margen y de stock) o una anulación (rojo). Auditoría lo guarda tal cual: no conoce
// los tipos de Comercial.
type Contenido = Record<string, unknown>;
type Persona = (id: unknown) => string;
type Detalle = (c: Contenido, persona: Persona) => string;
export type EnPalabras = { titulo: string; detalle: string | null; grupo: string; importancia: Importancia };

// El grupo sale del comienzo del tipo: «venta.» va en Ventas.
const GRUPOS: Record<string, string> = {
  usuario: "Usuarios", rol: "Usuarios", apartado: "Usuarios", sesion: "Entradas y salidas de la app",
  credencial: "Celulares con huella", puesto: "Celulares vinculados", vinculo: "Celulares vinculados", sistema: "Ajustes del sistema",
};

type Que = { titulo: string; importancia?: Importancia };
const QUE: Record<string, Que> = {
  "usuario.creado": { titulo: "Usuario autorizado" },
  "usuario.modificado": { titulo: "Cambio en un usuario" },
  "rol.creado": { titulo: "Rol nuevo" },
  "rol.modificado": { titulo: "Cambio en un rol" },
  "rol.borrado": { titulo: "Rol borrado" },
  "apartado.aceptado": { titulo: "Cambio apartado aceptado" },
  "apartado.descartado": { titulo: "Cambio apartado descartado" },
  "sesion.iniciada": { titulo: "Entró" },
  "sesion.cerrada": { titulo: "Salió" },
  "sesion.revocada": { titulo: "Sesión cerrada a distancia" },
  "credencial.vinculada": { titulo: "Celular vinculado con huella" },
  "credencial.quitada": { titulo: "Celular con huella quitado" },
  "puesto.vinculado": { titulo: "Celular vinculado a la computadora" },
  "puesto.desvinculado": { titulo: "Celular desvinculado de la computadora" },
  "vinculo.dias_cambiados": { titulo: "Cambio en los días del vínculo" },
  "sistema.ajustes_cambiados": { titulo: "Cambio en los ajustes del sistema" },
};

// Algunas acciones se nombran por lo que tienen adentro: el margen, la cuenta corriente, desactivar.
const ESPECIALES: [(tipo: string, c: Contenido) => boolean, Que][] = [
  [(t, c) => t === "usuario.modificado" && (c.cambios as Contenido | undefined)?.activo === false, { titulo: "Usuario desactivado" }],
];

const MEDIOS: Record<string, string> = { efectivo: "Efectivo", mercado_pago: "Mercado Pago", tarjeta: "Tarjeta", cuenta_corriente: "Cuenta corriente" };
const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const texto = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? numero(v) : "");
const pesos = (v: unknown) => (typeof v === "number" || (typeof v === "string" && v !== "") ? "$" + Math.round(Number(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
const cuantos = (v: unknown, uno: string, muchos: string) => (typeof v === "number" ? `${numero(v)} ${v === 1 ? uno : muchos}` : "");
const juntar = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(" · ");
const si = (v: unknown, armar: (v: unknown) => string) => (v ? armar(v) : "");
// Un día (AAAA-MM-DD) como lo lee la gente: 25/10/2026.
const delDia = (v: unknown) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto(v));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : texto(v);
};

const motivo: Detalle = (c) => (c.motivo ? `Motivo: ${texto(c.motivo)}` : "Sin motivo anotado");
const nombre: Detalle = (c) => texto(c.nombre);

// Un cambio en un producto: el margen, la unidad, el código de barras, el proveedor o la foto.
const cambioEnUnProducto: Detalle = (c) => juntar(
  "margen_elegido" in c && (c.margen_elegido === null ? "Sin margen elegido" : `Margen del ${texto(c.margen_elegido)} %`),
  "unidad" in c && `Se vende por ${texto(c.unidad)}`,
  "codigo_barras" in c && (c.codigo_barras ? `Código de barras ${texto(c.codigo_barras)}` : "Sin código de barras"),
  "proveedor_preferido_id" in c && "Cambió el proveedor preferido",
  "foto_url" in c && "Cambió la foto",
);

const cambioEnUnUsuario: Detalle = (c, persona) => {
  const cambios = (c.cambios ?? {}) as Contenido;
  return juntar(cambios.activo === false && `Desactivó a ${persona(c.id)}`, cambios.activo === true && `Reactivó a ${persona(c.id)}`, Array.isArray(cambios.roles) && `Cambió los roles de ${persona(c.id)}`, typeof cambios.nombre === "string" && `Ahora se llama ${cambios.nombre}`);
};

// Qué ajuste, de cuánto a cuánto (specs/020).
const tiempo = (s: unknown) => (s === 0 ? "no recordarla" : typeof s === "number" ? (s < 60 ? `${s} s` : `${s / 60} min`) : "");
const cambioDeAjustes: Detalle = (c) => {
  const antes = (c.antes ?? {}) as Contenido, despues = (c.despues ?? {}) as Contenido;
  return juntar(
    "sesion_segundos" in despues && `Sesión recordada: de ${tiempo(antes.sesion_segundos)} a ${tiempo(despues.sesion_segundos)}`,
    "celular_segundos" in despues && `Pregunta del celular: de ${tiempo(antes.celular_segundos)} a ${tiempo(despues.celular_segundos)}`,
    "vinculo_dias" in despues && `Días del vínculo: de ${texto(antes.vinculo_dias)} a ${texto(despues.vinculo_dias)}`,
  );
};

const DETALLES: Record<string, Detalle> = {
  "usuario.creado": (c) => juntar(texto(c.email), Array.isArray(c.roles) ? `con ${c.roles.length} ${c.roles.length === 1 ? "rol" : "roles"}` : ""),
  "usuario.modificado": cambioEnUnUsuario,
  "apartado.aceptado": (c, persona) => `De ${persona(c.de)}`,
  "apartado.descartado": (c, persona) => `De ${persona(c.de)}`,
  "sesion.iniciada": (c) => juntar(c.medio === "huella" ? "Con la huella" : c.medio === "celular" ? "Con el celular" : "Con Google", texto(c.dispositivo)),
  "credencial.vinculada": (c) => texto(c.dispositivo),
  "vinculo.dias_cambiados": (c) => cuantos(c.dias, "día", "días"),
  "sistema.ajustes_cambiados": cambioDeAjustes,
  "rol.creado": nombre, "rol.borrado": nombre,
};

/** Las personas que nombra el detalle de un evento, además de quien lo hizo. */
export function personasDelDetalle(tipo: string, c: Contenido): string[] {
  if (tipo === "usuario.modificado") return typeof c.id === "string" ? [c.id] : [];
  if (tipo.startsWith("apartado.")) return typeof c.de === "string" ? [c.de] : [];
  return [];
}

export function enPalabras(tipo: string, c: Contenido, persona: Persona): EnPalabras {
  const que = ESPECIALES.find(([es]) => es(tipo, c))?.[1] ?? QUE[tipo] ?? { titulo: tipo.replace(/[._]/g, " ") };
  const detalle = DETALLES[tipo]?.(c, persona) ?? "";
  return {
    titulo: que.titulo,
    detalle: detalle || null,
    grupo: GRUPOS[tipo.split(".")[0]!] ?? "Otras",
    importancia: que.importancia ?? "normal",
  };
}

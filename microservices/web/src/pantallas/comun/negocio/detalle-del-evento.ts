import type { Evento } from "../../../negocio/actividad";
import type { UsuarioFila as Usuario } from "../../../negocio/usuarios";
import { fecha, pesosCortos } from "../../../formato";
import { nombreDeMedio } from "../../../negocio/ventas";

// El detalle de cada acción en una línea: qué se cambió, de cuánto a cuánto, sobre quién.
type Contenido = Record<string, unknown>;
type UsuarioFila = Pick<Usuario, "id" | "nombre" | "activo">;
type Detalle = (c: Contenido, persona: (id: unknown) => string) => string;

const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const texto = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? numero(v) : "");
const cuantos = (v: unknown, uno: string, muchos: string) => (typeof v === "number" ? `${numero(v)} ${v === 1 ? uno : muchos}` : "");
const juntar = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(" · ");
const si = (v: unknown, armar: (v: unknown) => string) => (v ? armar(v) : "");
const delDia = (v: unknown) => fecha(texto(v));

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
  "venta.registrada": (c) => juntar(pesosCortos(c.total as number), nombreDeMedio(texto(c.medio_pago)), cuantos(c.items, "producto", "productos")),
  "venta.anulada": motivo,
  "compra.anulada": motivo,
  "compra.registrada": (c) => juntar(texto(c.proveedor), pesosCortos(c.total as number), si(c.comprobante, (v) => `comprobante ${texto(v)}`), cuantos(c.items, "producto", "productos")),
  "producto.precio_elegido": cambioEnUnProducto,
  "stock.ajustado": (c) => juntar(`De ${texto(c.antes)} a ${texto(c.despues)}`, si(c.motivo, texto)),
  "lista.cargada": (c) => juntar(texto(c.proveedor), texto(c.archivo), si(c.fechaLista, (v) => `lista del ${delDia(v)}`)),
  "lista.aplicada": (c) => juntar(si(c.fechaLista, (v) => `Lista del ${delDia(v)}`), cuantos(c.actualizados, "precio actualizado", "precios actualizados"), cuantos(c.nuevos, "producto nuevo", "productos nuevos")),
  "conteo.cerrado": (c) => juntar(texto(c.sector), cuantos(c.contados, "producto contado", "productos contados"), cuantos(c.ajustados, "ajustado", "ajustados")),
  "usuario.creado": (c) => juntar(texto(c.email), Array.isArray(c.roles) ? `con ${c.roles.length} ${c.roles.length === 1 ? "rol" : "roles"}` : ""),
  "usuario.modificado": cambioEnUnUsuario,
  "sesion.iniciada": (c) => juntar(c.medio === "huella" ? "Con la huella" : "Con Google", texto(c.dispositivo)),
  "credencial.vinculada": (c) => texto(c.dispositivo),
  "sistema.ajustes_cambiados": cambioDeAjustes,
  "sector.creado": nombre, "cliente.creado": nombre, "proveedor.creado": nombre,
  "proceso.creado": nombre, "proceso.importado": nombre, "proceso.renombrado": nombre, "proceso.vigente": nombre,
};

export function detalleDe(e: Evento, usuarios: UsuarioFila[]): string {
  const persona = (id: unknown) => usuarios.find((u) => u.id === id)?.nombre ?? "un usuario";
  return DETALLES[e.tipo]?.(e.contenido, persona) ?? "";
}

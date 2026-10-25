import type { Evento } from "../negocio/actividad";
import type { UsuarioFila as Usuario } from "../negocio/usuarios";
import { fecha, hoyLocal, pesosCortos } from "../formato";
import { nombreDeMedio } from "../negocio/ventas/venta";
import { type NombreDeIcono } from "../ui/iconos";

// «Quién hizo qué» en palabras, igual en el celular y en la computadora (decisión 47; la v2,
// decisión 148): el nombre de cada acción con el ícono de su tipo (gris, salvo lo que el dueño
// revisa: rojo lo anulado, ámbar los cambios de margen y de stock), el detalle en una línea y
// cada dato con su nombre legible.
type Contenido = Record<string, unknown>;
type UsuarioFila = Pick<Usuario, "id" | "nombre" | "activo">;
export type Que = { nombre: string; icono: NombreDeIcono; tono?: "error" | "urgente" };

const QUE: Record<string, Que> = {
  "venta.registrada": { nombre: "Venta cobrada", icono: "shopping-cart" },
  "venta.anulada": { nombre: "Venta anulada", icono: "ban", tono: "error" },
  "venta.pagada": { nombre: "Cobro de cuenta corriente", icono: "banknote" },
  "compra.registrada": { nombre: "Compra recibida", icono: "truck" },
  "compra.anulada": { nombre: "Compra anulada", icono: "ban", tono: "error" },
  "producto.precio_elegido": { nombre: "Cambio en un producto", icono: "pencil" },
  "producto.foto": { nombre: "Foto de un producto", icono: "package" },
  "producto.unido": { nombre: "Productos unidos", icono: "package" },
  "producto.separado": { nombre: "Productos separados", icono: "package" },
  "equivalencia.rechazada": { nombre: "Duplicado descartado", icono: "package" },
  "lista.cargada": { nombre: "Lista cargada", icono: "file-text" },
  "lista.aplicada": { nombre: "Lista aplicada", icono: "file-text" },
  "lista.descartada": { nombre: "Lista descartada", icono: "file-text" },
  "stock.ajustado": { nombre: "Ajuste de stock", icono: "package", tono: "urgente" },
  "sector.creado": { nombre: "Sector nuevo", icono: "boxes" },
  "conteo.abierto": { nombre: "Conteo empezado", icono: "boxes" },
  "conteo.cerrado": { nombre: "Conteo cerrado", icono: "boxes" },
  "usuario.creado": { nombre: "Usuario autorizado", icono: "user-plus" },
  "usuario.modificado": { nombre: "Cambio en un usuario", icono: "users" },
  "sesion.iniciada": { nombre: "Entró", icono: "log-in" },
  "sesion.cerrada": { nombre: "Salió", icono: "log-out" },
  "sesion.revocada": { nombre: "Sesión cerrada a distancia", icono: "log-out" },
  "credencial.vinculada": { nombre: "Celular vinculado con huella", icono: "fingerprint" },
  "credencial.quitada": { nombre: "Celular con huella quitado", icono: "fingerprint" },
  "puesto.vinculado": { nombre: "Celular vinculado a la computadora", icono: "smartphone" },
  "sistema.ajustes_cambiados": { nombre: "Cambio en los ajustes del sistema", icono: "pencil" },
  "cliente.creado": { nombre: "Cliente nuevo", icono: "user-plus" },
  "proveedor.creado": { nombre: "Proveedor nuevo", icono: "truck" },
  "proveedor.modificado": { nombre: "Cambio en un proveedor", icono: "truck" },
  "proceso.creado": { nombre: "Proceso nuevo", icono: "file-text" },
  "proceso.importado": { nombre: "Proceso importado", icono: "file-text" },
  "proceso.renombrado": { nombre: "Proceso con otro nombre", icono: "file-text" },
  "proceso.vigente": { nombre: "Proceso vigente", icono: "file-text" },
  "proceso.borrador_cambiado": { nombre: "Cambio en el borrador de un proceso", icono: "file-text" },
  "proceso.borrador_descartado": { nombre: "Borrador de un proceso descartado", icono: "file-text" },
  "proceso.borrado": { nombre: "Proceso borrado", icono: "ban", tono: "error" },
};

// «Qué pasó»: los tipos que se cuentan aparte (los demás van en «Otras»). `tipo` es el filtro de la API.
export const CATEGORIAS: { tipo: string; nombre: string; icono: NombreDeIcono; tono?: "error" | "urgente" }[] = [
  { tipo: "venta.registrada", nombre: "Ventas", icono: "shopping-cart" },
  { tipo: "sesion.iniciada", nombre: "Entradas", icono: "log-in" },
  { tipo: "producto.precio_elegido", nombre: "Precios y márgenes", icono: "percent", tono: "urgente" },
  { tipo: "stock.", nombre: "Ajustes de stock", icono: "package", tono: "urgente" },
  { tipo: "venta.anulada", nombre: "Ventas anuladas", icono: "ban", tono: "error" },
];

// El período del registro: hoy, ayer, esta semana o los días que se elijan (sin días, todo).
export type Periodo = "hoy" | "ayer" | "semana" | "rango";
export const inicioDelDia = (d: string, corrimiento = 0) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + corrimiento); return x.toISOString(); };
const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const corrido = (iso: string, dias: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + dias); return dia(d); };

// Los días que cuenta cada período (el «hasta» incluye ese día). Esta semana empieza el lunes.
export function diasDelPeriodo(f: { periodo: Periodo; desde: string; hasta: string }, hoy = hoyLocal()): { desde: string; hasta: string } {
  if (f.periodo === "hoy") return { desde: hoy, hasta: hoy };
  if (f.periodo === "ayer") return { desde: corrido(hoy, -1), hasta: corrido(hoy, -1) };
  if (f.periodo === "semana") return { desde: corrido(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7)), hasta: hoy };
  return { desde: f.desde, hasta: f.hasta };
}

// La hora de la acción: sola si es de hoy; si no, con el día.
export function horaDe(iso: string): string {
  const d = new Date(iso);
  const h = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toDateString() === new Date().toDateString() ? h : `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} ${h}`;
}
export function haceCuantoFue(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

// El filtro de la API compara el comienzo del tipo: «venta.» trae todo lo de ventas.
export const TIPOS: { valor: string; nombre: string }[] = [
  { valor: "venta.", nombre: "Ventas" },
  { valor: "venta.anulada", nombre: "Venta anulada" },
  { valor: "compra.", nombre: "Compras" },
  { valor: "producto.precio_elegido", nombre: "Cambio de margen o de datos de un producto" },
  { valor: "producto.", nombre: "Productos (cambios, fotos y uniones)" },
  { valor: "lista.", nombre: "Listas de precios" },
  { valor: "stock.", nombre: "Ajustes de stock" },
  { valor: "conteo.", nombre: "Conteos" },
  { valor: "usuario.", nombre: "Usuarios" },
  { valor: "proceso.", nombre: "Procesos" },
  { valor: "sesion.", nombre: "Entradas y salidas de la app" },
  { valor: "credencial.", nombre: "Celulares con huella" },
  { valor: "cliente.", nombre: "Clientes" },
  { valor: "proveedor.", nombre: "Proveedores" },
  { valor: "sistema.", nombre: "Ajustes del sistema" },
];

const numero = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const texto = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? numero(v) : "");
const cuantos = (v: unknown, uno: string, muchos: string) => (typeof v === "number" ? `${numero(v)} ${v === 1 ? uno : muchos}` : "");
const juntar = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(" · ");

export function queFue(e: Evento): Que {
  const c = e.contenido;
  if (e.tipo === "producto.precio_elegido" && "margen_elegido" in c) return { nombre: "Cambio de margen", icono: "percent", tono: "urgente" };
  if (e.tipo === "venta.registrada" && c.medio_pago === "cuenta_corriente") return { nombre: "Venta en cuenta corriente", icono: "notebook-pen" };
  if (e.tipo === "usuario.modificado" && (c.cambios as Contenido | undefined)?.activo === false) return { nombre: "Usuario desactivado", icono: "user-x" };
  return QUE[e.tipo] ?? { nombre: e.tipo.replace(/[._]/g, " "), icono: "file-text" };
}

// El detalle en una línea: qué se cambió, de cuánto a cuánto, sobre quién.
export function detalleDe(e: Evento, usuarios: UsuarioFila[]): string {
  const c = e.contenido;
  const persona = (id: unknown) => usuarios.find((u) => u.id === id)?.nombre ?? "un usuario";
  switch (e.tipo) {
    case "venta.registrada": return juntar(pesosCortos(c.total as number), nombreDeMedio(texto(c.medio_pago)), cuantos(c.items, "producto", "productos"));
    case "venta.anulada": case "compra.anulada": return c.motivo ? `Motivo: ${texto(c.motivo)}` : "Sin motivo anotado";
    case "compra.registrada": return juntar(texto(c.proveedor), pesosCortos(c.total as number), c.comprobante ? `comprobante ${texto(c.comprobante)}` : "", cuantos(c.items, "producto", "productos"));
    case "producto.precio_elegido": return juntar("margen_elegido" in c && (c.margen_elegido === null ? "Sin margen elegido" : `Margen del ${texto(c.margen_elegido)} %`), "unidad" in c && `Se vende por ${texto(c.unidad)}`, "codigo_barras" in c && (c.codigo_barras ? `Código de barras ${texto(c.codigo_barras)}` : "Sin código de barras"), "proveedor_preferido_id" in c && "Cambió el proveedor preferido", "foto_url" in c && "Cambió la foto");
    case "stock.ajustado": return juntar(`De ${texto(c.antes)} a ${texto(c.despues)}`, c.motivo ? texto(c.motivo) : "");
    case "lista.cargada": return juntar(texto(c.proveedor), texto(c.archivo), c.fechaLista ? `lista del ${fecha(texto(c.fechaLista))}` : "");
    case "lista.aplicada": return juntar(c.fechaLista ? `Lista del ${fecha(texto(c.fechaLista))}` : "", cuantos(c.actualizados, "precio actualizado", "precios actualizados"), cuantos(c.nuevos, "producto nuevo", "productos nuevos"));
    case "conteo.cerrado": return juntar(texto(c.sector), cuantos(c.contados, "producto contado", "productos contados"), cuantos(c.ajustados, "ajustado", "ajustados"));
    case "usuario.creado": return juntar(texto(c.email), Array.isArray(c.roles) ? `con ${c.roles.length} ${c.roles.length === 1 ? "rol" : "roles"}` : "");
    case "usuario.modificado": {
      const cambios = (c.cambios ?? {}) as Contenido;
      return juntar(cambios.activo === false && `Desactivó a ${persona(c.id)}`, cambios.activo === true && `Reactivó a ${persona(c.id)}`, Array.isArray(cambios.roles) && `Cambió los roles de ${persona(c.id)}`, typeof cambios.nombre === "string" && `Ahora se llama ${cambios.nombre}`);
    }
    case "sesion.iniciada": return juntar(c.medio === "huella" ? "Con la huella" : "Con Google", texto(c.dispositivo));
    case "credencial.vinculada": return texto(c.dispositivo);
    case "sistema.ajustes_cambiados": {
      // Qué ajuste, de cuánto a cuánto (specs/020).
      const antes = (c.antes ?? {}) as Contenido, despues = (c.despues ?? {}) as Contenido;
      const tiempo = (s: unknown) => (s === 0 ? "no recordarla" : typeof s === "number" ? (s < 60 ? `${s} s` : `${s / 60} min`) : "");
      return juntar(
        "sesion_segundos" in despues && `Sesión recordada: de ${tiempo(antes.sesion_segundos)} a ${tiempo(despues.sesion_segundos)}`,
        "celular_segundos" in despues && `Pregunta del celular: de ${tiempo(antes.celular_segundos)} a ${tiempo(despues.celular_segundos)}`,
        "vinculo_dias" in despues && `Días del vínculo: de ${texto(antes.vinculo_dias)} a ${texto(despues.vinculo_dias)}`,
      );
    }
    case "sector.creado": case "cliente.creado": case "proveedor.creado": case "proceso.creado": case "proceso.importado": case "proceso.renombrado": case "proceso.vigente": return texto(c.nombre);
    default: return "";
  }
}

// Para el detalle completo: los nombres de los datos, legibles; los valores, como se guardaron.
const rotulo = (clave: string) => { const t = clave.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
export function aplanar(c: Contenido, prefijo = ""): [string, string][] {
  return Object.entries(c).flatMap(([k, v]): [string, string][] => {
    const nombre = prefijo ? `${prefijo}: ${rotulo(k).toLowerCase()}` : rotulo(k);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return aplanar(v as Contenido, nombre);
    return [[nombre, v === null || v === "" ? "—" : v === true ? "Sí" : v === false ? "No" : Array.isArray(v) ? v.join(", ") : String(v)]];
  });
}


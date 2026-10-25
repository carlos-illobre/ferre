import type { Evento } from "../../../negocio/actividad";
import { type NombreDeIcono } from "../../../ui/iconos";

// El nombre de cada acción con el ícono de su tipo (gris, salvo lo que el dueño revisa: rojo lo
// anulado, ámbar los cambios de margen y de stock).
type Contenido = Record<string, unknown>;
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

// Algunas acciones se nombran por lo que tienen adentro: el margen, la cuenta corriente, desactivar.
const ESPECIALES: [(e: Evento) => boolean, Que][] = [
  [(e) => e.tipo === "producto.precio_elegido" && "margen_elegido" in e.contenido, { nombre: "Cambio de margen", icono: "percent", tono: "urgente" }],
  [(e) => e.tipo === "venta.registrada" && e.contenido.medio_pago === "cuenta_corriente", { nombre: "Venta en cuenta corriente", icono: "notebook-pen" }],
  [(e) => e.tipo === "usuario.modificado" && (e.contenido.cambios as Contenido | undefined)?.activo === false, { nombre: "Usuario desactivado", icono: "user-x" }],
];

export function queFue(e: Evento): Que {
  return ESPECIALES.find(([es]) => es(e))?.[1] ?? QUE[e.tipo] ?? { nombre: e.tipo.replace(/[._]/g, " "), icono: "file-text" };
}

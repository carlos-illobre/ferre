import { borrarToken, leerToken, urlApi } from "../datos/conexion";
import { guardaEnElDispositivo } from "../datos/almacenamiento";

// Procesos (RF-90 a RF-95) es un módulo aparte que se lleva a otros proyectos (ADR-019). Acá
// Ferrebress le da lo que necesita: cómo pedir al servidor, sus pantallas y dónde guardar.

// Las pantallas de Ferrebress que se pueden nombrar en un paso, en el orden del menú.
export const PANTALLAS_DE_FERREBRESS = [
  "Catálogo → Productos", "Catálogo → Listas", "Catálogo → Duplicados",
  "Vender", "Vender → Cobrar", "Vender → Ventas del día", "Vender → Anular",
  "Depósito → Pedidos", "Depósito → Ingreso", "Depósito → Inventario", "Depósito → Estanterías",
  "Más → Cómo va el negocio", "Más → Usuarios", "Más → Usuarios → Quién hizo qué", "Más → Anomalías", "Más → Mejoras y errores",
];

// Dónde guarda el módulo lo suyo: en este dispositivo, si se guarda (RF-84); si no, en ningún lado.
export const dondeGuardarProcesos = () => (guardaEnElDispositivo() ? localStorage : null);

function cabecerasDe(init: RequestInit, token: string | null): Headers {
  const cabeceras = new Headers(init.headers);
  cabeceras.set("Content-Type", "application/json");
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  return cabeceras;
}

const mensajeDe = (datos: unknown, estado: number) => (datos && typeof datos === "object" && "error" in datos ? String((datos as { error: unknown }).error) : `Error ${estado}`);

// Como el cliente de siempre, pero sin perder el cuerpo de un error: un 409 trae cómo quedó el
// proceso (011-E41). Sin conexión, el error tiene estado 0.
export async function pedirAProcesos(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const token = leerToken();
  const respuesta = await fetch(urlApi(ruta), { ...init, headers: cabecerasDe(init, token) }).catch(() => { throw Object.assign(new Error("Sin conexión"), { estado: 0 }); });
  if (respuesta.status === 401 && token) {
    borrarToken();
    window.dispatchEvent(new Event("sesion-cerrada"));
  }
  const datos = respuesta.status === 204 ? undefined : await respuesta.json().catch(() => undefined);
  if (!respuesta.ok) throw Object.assign(new Error(mensajeDe(datos, respuesta.status)), { estado: respuesta.status, datos });
  return datos;
}

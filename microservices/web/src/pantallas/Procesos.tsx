import { lazy, Suspense } from "react";
import { borrarToken, leerToken, urlApi } from "../api";
import { guardaEnElDispositivo } from "../guardado";
import { irA } from "../rutas";
import { usePuede } from "./permisos";

// Procesos (RF-90 a RF-95) es un módulo aparte que se lleva a otros proyectos (ADR-019). Acá
// Ferrebress le da lo que necesita: cómo pedir al servidor, qué puede quien lo usa, sus
// pantallas y dónde guardar. El módulo, con bpmn-js adentro, se baja solo al entrar.
const Modulo = lazy(async () => {
  const [m] = await Promise.all([import("procesos-web"), import("procesos-web/estilos.css")]);
  return { default: m.Procesos };
});

// Las pantallas de Ferrebress que se pueden nombrar en un paso, en el orden del menú.
export const PANTALLAS_DE_FERREBRESS = [
  "Catálogo → Productos", "Catálogo → Listas", "Catálogo → Duplicados",
  "Vender", "Vender → Cobrar", "Vender → Ventas de hoy", "Vender → Anular",
  "Depósito → Pedidos", "Depósito → Ingreso", "Depósito → Inventario", "Depósito → Estanterías",
  "Más → Cómo va el negocio", "Más → Usuarios y sesiones", "Más → Quién hizo qué", "Más → Anomalías", "Más → Mejoras y errores",
];

// Como el cliente de siempre, pero sin perder el cuerpo de un error: un 409 trae cómo quedó el
// proceso (011-E41). Sin conexión, el error tiene estado 0.
export async function pedirAProcesos(ruta: string, init: RequestInit = {}): Promise<unknown> {
  const cabeceras = new Headers(init.headers);
  cabeceras.set("Content-Type", "application/json");
  const token = leerToken();
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  let respuesta: Response;
  try {
    respuesta = await fetch(urlApi(ruta), { ...init, headers: cabeceras });
  } catch {
    throw Object.assign(new Error("Sin conexión"), { estado: 0 });
  }
  if (respuesta.status === 401 && token) {
    borrarToken();
    window.dispatchEvent(new Event("sesion-cerrada"));
  }
  const datos = respuesta.status === 204 ? undefined : await respuesta.json().catch(() => undefined);
  if (!respuesta.ok) {
    const mensaje = datos && typeof datos === "object" && "error" in datos ? String((datos as { error: unknown }).error) : `Error ${respuesta.status}`;
    throw Object.assign(new Error(mensaje), { estado: respuesta.status, datos });
  }
  return datos;
}

export function PantallaDeProcesos({ interfaz }: { interfaz: "compu" | "celu" }) {
  const puede = usePuede();
  return (
    <Suspense fallback={<p className="detalle" role="status" style={{ padding: 16 }}>Abriendo Procesos…</p>}>
      <Modulo
        interfaz={interfaz}
        pedir={pedirAProcesos}
        puede={{ ver: puede("procesos.ver", "procesos.dibujar"), dibujar: puede("procesos.dibujar") }}
        pantallas={PANTALLAS_DE_FERREBRESS}
        guardarLocal={guardaEnElDispositivo() ? localStorage : null}
        alVolver={() => irA("mas")}
      />
    </Suspense>
  );
}

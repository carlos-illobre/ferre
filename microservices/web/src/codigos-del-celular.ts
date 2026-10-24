import { alCambiarElVinculo, alMensajeDelOtro, arrancarEnlace, estadoDelVinculo, mandarAlOtro } from "./enlace";
import { puestoLocal, puestoRemoto } from "./puesto";

// El celular como lector de la computadora emparejada (RF-08, decisión 59): los códigos y el
// pedido de que haga de lector, por el enlace entre los dos (specs/023).

// La computadora le pide a su celular emparejado que haga de lector (decisión 59). Si el celular
// no está abierto, le llega al abrirlo (specs/023).
export async function pedirLector(): Promise<boolean> {
  return Boolean(puestoLocal() && mandarAlOtro({ tipo: "pedir-lector" }));
}

// El celular manda un código a la computadora vinculada, por el enlace entre los dos (specs/023).
// «llego»: la computadora lo recibió; «espera»: no está abierta y le llega al abrirla (E32);
// «no»: este celular no está vinculado.
export async function enviarCodigoAlPuesto(codigo: string): Promise<"llego" | "espera" | "no"> {
  const envio = puestoRemoto() ? mandarAlOtro({ tipo: "codigo", codigo }) : null;
  if (!envio) return "no";
  // Solo con la computadora cerrada se dice que espera; si se está conectando, se espera a que llegue.
  if (estadoDelVinculo()?.conexion === "solo") return "espera";
  await envio;
  return "llego";
}

// La computadora escucha los códigos que manda su celular. Lo que el celular mandó con la
// computadora cerrada llega al conectarse. `alCambiarEstado` dice si sigue habiendo vínculo.
export function escucharPuesto(_puestoId: string, alRecibir: (codigo: string) => void, alCambiarEstado?: (conectado: boolean) => void): () => void {
  arrancarEnlace();
  const dejarDeEscuchar = alMensajeDelOtro((m) => { if (m.tipo === "codigo" && typeof m.codigo === "string" && m.codigo.trim()) alRecibir(m.codigo.trim()); });
  const dejarDeMirar = alCambiarElVinculo(() => alCambiarEstado?.(estadoDelVinculo() !== null));
  return () => { dejarDeEscuchar(); dejarDeMirar(); };
}

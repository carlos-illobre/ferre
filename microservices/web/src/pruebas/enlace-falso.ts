import type { MensajeDelEnlace } from "../datos/vinculo";

// Un enlace con el otro dispositivo, de mentira: guarda lo que se manda y deja hacer llegar
// mensajes del otro lado. Se usa con `vi.mock("../datos/vinculo", () => enlaceFalso.modulo)`.
export function crearEnlaceFalso() {
  const mandados: MensajeDelEnlace[] = [];
  const oyentes = new Set<(m: MensajeDelEnlace) => void>();
  const oyentesDeEstado = new Set<() => void>();
  let otroEsta = true;
  let vinculado = true;
  let lado: "computadora" | "celular" = "computadora";
  let extra: Record<string, unknown> = {};
  let probadas = 0;
  // El estado se arma de nuevo solo cuando algo cambia, como el de verdad (useSyncExternalStore lo pide así).
  let estado: unknown = null;
  let firma = "";
  const estadoActual = () => {
    const nuevo = vinculado ? { conexion: otroEsta ? "directa" : "solo", lado, sala: "p1", motivo: null, probadaEn: null, desde: 0, demoraMs: null, ...extra } : null;
    if (JSON.stringify(nuevo) !== firma) { firma = JSON.stringify(nuevo); estado = nuevo; }
    return estado;
  };
  return {
    mandados, oyentes,
    // Que llegue un mensaje del otro lado.
    llega: (m: MensajeDelEnlace) => oyentes.forEach((o) => o(m)),
    ponerOtroEsta: (v: boolean) => { otroEsta = v; oyentesDeEstado.forEach((o) => o()); },
    ponerVinculado: (v: boolean) => { vinculado = v; oyentesDeEstado.forEach((o) => o()); },
    ponerLado: (l: "computadora" | "celular") => { lado = l; },
    // Cambiar a mano lo que dice el estado (la conexión, el motivo, la demora).
    ponerEstado: (e: Record<string, unknown>) => { extra = e; oyentesDeEstado.forEach((o) => o()); },
    probadas: () => probadas,
    olvidar: () => { mandados.length = 0; oyentes.clear(); oyentesDeEstado.clear(); otroEsta = true; vinculado = true; lado = "computadora"; extra = {}; probadas = 0; },
    modulo: {
      arrancarEnlace: () => {},
      mandarAlOtro: (m: MensajeDelEnlace) => { if (!vinculado) return null; mandados.push(m); return Promise.resolve(); },
      alMensajeDelOtro: (o: (m: MensajeDelEnlace) => void) => { oyentes.add(o); return () => { oyentes.delete(o); }; },
      alCambiarElVinculo: (o: () => void) => { oyentesDeEstado.add(o); return () => { oyentesDeEstado.delete(o); }; },
      elOtroEsta: () => otroEsta,
      estadoDelVinculo: estadoActual,
      probarDirecta: () => { probadas += 1; },
    },
  };
}

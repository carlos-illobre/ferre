import { crearACuestas, crearCanales } from "conexion-entre-dispositivos/servidor";
import { config } from "../config.js";

// Los avisos sin consultas de Ferrebress (ADR-030): los canales, uno por dispositivo que espera
// algo, y lo que va a cuestas en cada respuesta. Quién puede escuchar cada tema lo decide
// `reglas.ts`; acá, los temas y cuándo dejan de valer.
export const aCuestas = crearACuestas();
// La versión del servidor: cuando cambia, la aplicación busca la suya (decisión 157).
aCuestas.agregar("version", () => config.version);
export const canales = crearCanales({ aCuestas: aCuestas.valores });

// Los temas: la entrada con código QR, el código para vincular el celular, el vínculo entre los
// dos y la sesión del dispositivo.
export const TEMA = {
  entrada: (id: string) => `entrada:${id}`,
  puesto: (id: string) => `puesto:${id}`,
  vinculo: (id: string) => `vinculo:${id}`,
  sesion: (id: string) => `sesion:${id}`,
};

// Se soltaron vínculos: sus temas dejan de valer (023-E26).
export const cerrarVinculos = (ids: string[]) => ids.forEach((id) => canales.cerrarTema(TEMA.vinculo(id)));
// Se cerraron sesiones (a distancia, al desactivar): se les avisa por su tema y se cierran sus
// canales (025-E32). Al salir no se avisa (quien salió ya lo sabe): solo se cierran.
export const cerrarSesiones = (ids: string[]) => ids.forEach((id) => { canales.cerrarTema(TEMA.sesion(id)); canales.cerrarGrupo(id); });
export const cerrarCanalesDe = (sesionId: string) => canales.cerrarGrupo(sesionId);

// Al vencer el vínculo se cierra su tema, aunque los dos sigan abiertos (023-E26). Un solo reloj
// por vínculo; un reloj no espera más de unos 24 días, así que al llegar ahí se vuelve a poner.
const MAXIMO_DEL_RELOJ_MS = 2_147_483_647;
const vencimientos = new Map<string, ReturnType<typeof setTimeout>>();
export function cerrarAlVencer(puestoId: string, expiraEn: Date) {
  clearTimeout(vencimientos.get(puestoId));
  const faltan = expiraEn.getTime() - Date.now();
  const reloj = setTimeout(() => {
    vencimientos.delete(puestoId);
    if (faltan > MAXIMO_DEL_RELOJ_MS) cerrarAlVencer(puestoId, expiraEn);
    else cerrarVinculos([puestoId]);
  }, Math.min(Math.max(faltan, 0), MAXIMO_DEL_RELOJ_MS));
  reloj.unref?.();
  vencimientos.set(puestoId, reloj);
}

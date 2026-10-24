import { crearCentral } from "conexion-entre-dispositivos/servidor";

// La central de la conexión entre el celular y la computadora (ADR-027): una sala por vínculo
// (`puesto`). Presenta a los dos y pasa los mensajes cuando no pueden hablarse directo, sin
// guardarlos. Quién puede usar cada sala lo decide la ruta; acá, cuándo una sala deja de valer.
export const central = crearCentral();
export const cerrarSalas = (ids: string[]) => ids.forEach((id) => central.cerrar(id));

// Al vencer el vínculo se cierra su sala, aunque los dos sigan abiertos (023-E26). Un solo reloj
// por sala; un reloj no espera más de unos 24 días, así que al llegar ahí se vuelve a poner.
const MAXIMO_DEL_RELOJ_MS = 2_147_483_647;
const vencimientos = new Map<string, ReturnType<typeof setTimeout>>();
export function cerrarAlVencer(sala: string, expiraEn: Date) {
  clearTimeout(vencimientos.get(sala));
  const faltan = expiraEn.getTime() - Date.now();
  const reloj = setTimeout(() => {
    vencimientos.delete(sala);
    if (faltan > MAXIMO_DEL_RELOJ_MS) cerrarAlVencer(sala, expiraEn);
    else central.cerrar(sala);
  }, Math.min(Math.max(faltan, 0), MAXIMO_DEL_RELOJ_MS));
  reloj.unref?.();
  vencimientos.set(sala, reloj);
}

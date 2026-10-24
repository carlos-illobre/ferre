import * as datos from "../persistencia/acceso.js";
import { leer } from "../persistencia/sistema.js";
import type { Ejecutor } from "../persistencia/transaccion.js";

// El emparejamiento entre un celular y una computadora (decisión 58). Es un `puesto`: la
// sesión de la computadora y la del celular, unidas por un tiempo. Con eso el celular le
// manda lo que escanea y recibe los pedidos de foto, sin leer códigos. Nace de dos maneras:
// al dejar entrar a la computadora con el celular (RF-76), o leyendo el código que la
// computadora muestra en Vender. Una computadora tiene un celular emparejado a la vez, y un
// celular una computadora: el emparejamiento nuevo reemplaza al anterior de cualquiera de los dos.
//
// El vínculo es de los dos dispositivos y del usuario, no de la sesión (decisión 73): cada
// `puesto` guarda de qué usuario es y el identificador de cada dispositivo. Al salir queda
// dormido; cuando el mismo usuario vuelve a entrar en ese dispositivo, el puesto pasa a
// apuntar a su sesión nueva. Dura los días configurados y se corta solo al desvincular.
export const DIAS_EMPAREJADO = 30; // los de arranque; el negocio los cambia desde Más

export async function diasDeVinculo(db?: Ejecutor): Promise<number> {
  const dias = Number((await leer(["vinculo.dias"], db).catch(() => new Map<string, string>())).get("vinculo.dias"));
  return Number.isInteger(dias) && dias >= 1 && dias <= 365 ? dias : DIAS_EMPAREJADO;
}

// El identificador que cada navegador guarda para sí. Se anota en su sesión.
export const dispositivoValido = (id: unknown): id is string => typeof id === "string" && /^[\w-]{8,64}$/.test(id);
export async function anotarDispositivo(db: Ejecutor, sesionId: string, dispositivoId: unknown) {
  if (!dispositivoValido(dispositivoId)) return;
  await datos.anotarDispositivo(db, sesionId, dispositivoId);
}

// El usuario volvió a entrar en un dispositivo que tenía vinculado: su vínculo dormido pasa a esta sesión.
export async function adoptarVinculos(db: Ejecutor, sesionId: string, usuarioId: string, dispositivoId: unknown) {
  if (!dispositivoValido(dispositivoId)) return;
  await datos.adoptarVinculos(db, sesionId, usuarioId, dispositivoId);
}

export const sellarVinculo = datos.sellarVinculo;
// Los vínculos vigentes de un usuario: al desactivarlo se cierran sus salas.
export const vinculosDelUsuario = datos.vinculosDelUsuario;
// Un administrador cerró a distancia la sesión de un dispositivo: sus vínculos se cortan.
// Devuelve cuáles, para cerrar sus salas (ADR-027).
export const cortarVinculosDe = datos.cortarVinculosDe;
// Deja sin efecto los emparejamientos anteriores de esa computadora o de ese celular. Devuelve
// cuáles, para cerrar sus salas (ADR-027).
export const soltarAnteriores = (db: Ejecutor, compuSesionId: string, celularSesionId: string, salvo: string | null = null) => datos.soltarAnteriores(db, compuSesionId, celularSesionId, salvo);

// Vincular de nuevo (o entrar a la computadora con el celular) reemplaza al vínculo anterior:
// así se renueva el plazo.
export async function emparejar(db: Ejecutor, compuSesionId: string, celularSesionId: string, nombre: string | null): Promise<{ id: string; expira_en: string; soltados: string[] }> {
  const soltados = await soltarAnteriores(db, compuSesionId, celularSesionId);
  const dias = await diasDeVinculo(db);
  const puesto = await datos.puestoVinculado(db, { compuSesionId, celularSesionId, nombre, dias });
  await sellarVinculo(db, puesto.id);
  return { id: puesto.id, expira_en: puesto.expira_en ?? new Date(Date.now() + dias * 86400000).toISOString(), soltados };
}

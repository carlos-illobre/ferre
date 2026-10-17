import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
  type AuthenticationResponseJSON, type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { config } from "../config.js";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import { crearSesion, generarToken, revocarSesion, usuarioConPermisos, type SesionActiva } from "./sesiones.js";
import { adoptarVinculos, anotarDispositivo, computadorasDe, cortarVinculosDe, diasDeVinculo, emparejar, sellarVinculo, soltarAnteriores } from "./vinculo.js";
import type { CodigoAprobado, CodigoDeEntrada, EstadoDelCodigo, SesionAbierta, SesionNueva } from "../contratos/sesiones.js";
import type { Enviable } from "../enviable.js";
import type { CodigoEscaneado, DiasDelVinculo, EstadoDelPuesto, PuestoParaVincular, Vinculado, VinculosDeLaSesion } from "../contratos/puestos.js";
import type { CelularDeOtro, Credencial as CredencialDelContrato, DesafioDeHuella, HuellaVinculada, SesionConHuella } from "../contratos/credenciales.js";

// Acceso, en sus reglas (ADR-018): entrar (con Google, con la huella o con el celular), las
// sesiones abiertas y el vínculo entre un celular y una computadora (decisiones 57, 58 y 73).
export type Resultado<T = unknown> = { ok: true; cuerpo?: T; estado?: 200 | 201 } | { ok: false; estado: 400 | 401 | 403 | 404 | 410; error: string };
const mal = (estado: 400 | 401 | 403 | 404 | 410, error: string) => ({ ok: false as const, estado, error });
const bien = <T>(cuerpo?: T, estado?: 200 | 201) => ({ ok: true as const, cuerpo, estado });

export const dispositivoDe = (userAgent: string | undefined, dado?: string): string => (dado?.trim() || userAgent || "desconocido").slice(0, 120);

// ---------- Entrar con Google ----------
// Si el correo que verificó Google está autorizado y activo, se abre una sesión.
export async function entrarConGoogle(email: string, dispositivo: string): Promise<Resultado<SesionNueva>> {
  const id = await datos.usuarioActivoPorCorreo(email);
  const usuario = id ? await usuarioConPermisos(pool, id) : null;
  if (!usuario) return mal(403, `${email} no está autorizado. Pedile a quien administra los usuarios que te dé de alta.`);
  const sesion = await crearSesion(pool, usuario.id, dispositivo);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo, medio: "google" } });
  return bien({ token: sesion.token, usuario }, 201);
}

// ---------- Entrar a la computadora con el celular (RF-76, decisión 57) ----------
// La computadora pide un código y lo muestra como QR. Quien lo lee con el celular y tiene una
// sesión, lo aprueba; la computadora retira entonces su propia sesión, con ese mismo usuario.
// El código vence a los 5 minutos y sirve una sola vez.
export const VIGENCIA_DEL_CODIGO_S = 300;
const SIN_CODIGO = "Ese código venció o ya se usó. Leé el que la computadora muestra ahora.";

export async function pedirCodigoDeEntrada(dispositivo: string): Promise<CodigoDeEntrada> {
  const id = randomUUID();
  const codigo = generarToken(); // va en el QR
  const clave = generarToken(); // queda en la computadora: con ella retira la sesión
  await datos.nuevaVinculacion(id, codigo, clave, dispositivo, VIGENCIA_DEL_CODIGO_S);
  return { id, codigo, clave, expiraEnSegundos: VIGENCIA_DEL_CODIGO_S };
}

export async function aprobarCodigoDeEntrada(sesion: SesionActiva, codigo: string, dispositivoId: unknown): Promise<Resultado<CodigoAprobado>> {
  await anotarDispositivo(pool, sesion.id, dispositivoId);
  const aprobada = await datos.aprobarVinculacion(codigo, sesion.usuario.id, sesion.id);
  return aprobada ? bien({ dispositivo: aprobada.dispositivo }) : mal(410, SIN_CODIGO);
}

// La computadora pregunta cómo va su código. Si fue aprobado, retira la sesión: una sola vez.
// El celular que la dejó entrar queda emparejado con esta computadora (decisión 58).
export async function estadoDelCodigo(id: string, clave: string, dispositivoId: unknown): Promise<Resultado<EstadoDelCodigo>> {
  const aprobada = await datos.retirarVinculacion(id, clave);
  if (!aprobada) return bien({ estado: (await datos.vinculacionVigente(id, clave)) ? "pendiente" : "vencida" });
  const usuario = await usuarioConPermisos(pool, aprobada.aprobada_por);
  if (!usuario) return bien({ estado: "vencida" });
  const sesion = await crearSesion(pool, usuario.id, aprobada.dispositivo);
  await datos.anotarSesionDeVinculacion(id, sesion.id);
  await anotarDispositivo(pool, sesion.id, dispositivoId);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: usuario.id, contenido: { sesionId: sesion.id, dispositivo: aprobada.dispositivo, medio: "celular" } });
  const puesto = aprobada.celular_sesion_id ? await emparejar(pool, sesion.id, aprobada.celular_sesion_id, aprobada.dispositivo).catch(() => null) : null;
  if (puesto) await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: usuario.id, contenido: { puestoId: puesto.id, medio: "entrada" } });
  return bien({ estado: "aprobada", token: sesion.token, usuario, puesto });
}

// ---------- Sesiones ----------
export async function salir(sesion: SesionActiva) {
  await revocarSesion(pool, sesion.id);
  await registrarEvento(pool, { tipo: "sesion.cerrada", usuarioId: sesion.usuario.id, contenido: { sesionId: sesion.id } });
}
// La de quien pregunta no va: se cierra con «Salir» (decisión 99).
export const sesionesAbiertas = (salvo: string): Promise<Enviable<SesionAbierta>[]> => datos.sesionesAbiertas(salvo);
// Cerrar a distancia la sesión de un dispositivo corta también su vínculo (decisión 73).
export async function cerrarSesion(sesionId: string, actorId: string) {
  await revocarSesion(pool, sesionId);
  await cortarVinculosDe(pool, sesionId);
  await registrarEvento(pool, { tipo: "sesion.revocada", usuarioId: actorId, contenido: { sesionId } });
}

// ---------- Huellas (passkeys, ADR-011 enmienda) ----------
// El usuario, ya entrado, vincula su celular; desde entonces ese celular entra con la huella.
// La clave privada vive en el teléfono; acá solo la pública. Atado al dominio del cliente web.
const rpID = () => new URL(config.origenWeb).hostname;
const NOMBRE_APP = "ferre";
// Los desafíos esperan en memoria unos minutos (un solo proceso, ADR-001).
const DESAFIO_MINUTOS = 5;
const desafios = new Map<string, { desafio: string; usuarioId: string | null; vence: number }>();
function guardarDesafio(desafio: string, usuarioId: string | null): string {
  const ahora = Date.now();
  for (const [k, v] of desafios) if (v.vence < ahora) desafios.delete(k);
  const id = randomUUID();
  desafios.set(id, { desafio, usuarioId, vence: ahora + DESAFIO_MINUTOS * 60_000 });
  return id;
}
function retirarDesafio(id: string | undefined): { desafio: string; usuarioId: string | null } | null {
  if (!id) return null;
  const d = desafios.get(id);
  desafios.delete(id);
  return d && d.vence > Date.now() ? d : null;
}

export async function opcionesParaVincularHuella(usuario: SesionActiva["usuario"]): Promise<DesafioDeHuella> {
  const vigentes = await datos.credencialesVigentesDe(usuario.id);
  const opciones = await generateRegistrationOptions({
    rpName: NOMBRE_APP, rpID: rpID(), userName: usuario.email, userDisplayName: usuario.nombre, attestationType: "none",
    excludeCredentials: vigentes.map((r) => ({ id: r.id, transports: r.transportes as never })),
    // Clave descubrible con verificación del usuario: entra con la huella sin decir quién es.
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  return { desafioId: guardarDesafio(opciones.challenge, usuario.id), opciones };
}

export async function vincularHuella(usuarioId: string, desafioId: string | undefined, respuesta: RegistrationResponseJSON | undefined, dispositivoDado: string | undefined, userAgent: string | undefined): Promise<Resultado<HuellaVinculada>> {
  const pendiente = retirarDesafio(desafioId);
  if (!pendiente || pendiente.usuarioId !== usuarioId || !respuesta) return mal(400, "El pedido venció: probá vincular de nuevo");
  let verificacion;
  try {
    verificacion = await verifyRegistrationResponse({ response: respuesta, expectedChallenge: pendiente.desafio, expectedOrigin: config.origenWeb, expectedRPID: rpID(), requireUserVerification: true });
  } catch (e) {
    return mal(400, `El celular no pudo crear la clave: ${(e as Error).message}`);
  }
  if (!verificacion.verified || !verificacion.registrationInfo) return mal(400, "No se pudo verificar la clave del celular");
  const { credential, credentialDeviceType } = verificacion.registrationInfo;
  const dispositivo = (dispositivoDado?.trim() || userAgent || "celular").slice(0, 120);
  await datos.guardarCredencial({ id: credential.id, usuarioId, clavePublica: Buffer.from(credential.publicKey), contador: credential.counter, transportes: credential.transports ?? [], dispositivo });
  await registrarEvento(pool, { tipo: "credencial.vinculada", usuarioId, contenido: { id: credential.id, dispositivo, tipo: credentialDeviceType } });
  return bien({ id: credential.id, dispositivo }, 201);
}

export const celularesDe = (usuarioId: string): Promise<Enviable<CredencialDelContrato>[]> => datos.celularesDe(usuarioId);
export const celularesDeOtros = (usuarioId: string): Promise<Enviable<CelularDeOtro>[]> => datos.celularesDeOtros(usuarioId);

// Quitar un celular: el propio, o cualquiera si administra usuarios (decisión 100).
export async function quitarCelular(id: string, actorId: string, administra: boolean) {
  if (!(await datos.quitarCredencial(id, actorId, administra))) return mal(404, "No existe ese celular vinculado");
  await registrarEvento(pool, { tipo: "credencial.quitada", usuarioId: actorId, contenido: { id } });
  return bien();
}

export async function opcionesParaEntrarConHuella(): Promise<DesafioDeHuella> {
  const opciones = await generateAuthenticationOptions({ rpID: rpID(), userVerification: "required", allowCredentials: [] });
  return { desafioId: guardarDesafio(opciones.challenge, null), opciones };
}

export async function entrarConHuella(desafioId: string | undefined, respuesta: AuthenticationResponseJSON | undefined, dispositivoDado: string | undefined): Promise<Resultado<SesionConHuella>> {
  const pendiente = retirarDesafio(desafioId);
  if (!pendiente || !respuesta) return mal(400, "El pedido venció: probá de nuevo");
  const cred = await datos.credencialConUsuario(respuesta.id);
  if (!cred) return mal(401, "Este celular no está vinculado a ninguna cuenta. Entrá con Google y vinculalo desde Administración.");
  if (!cred.activo) return mal(403, "Tu usuario está desactivado");
  let verificacion;
  try {
    verificacion = await verifyAuthenticationResponse({
      response: respuesta, expectedChallenge: pendiente.desafio, expectedOrigin: config.origenWeb, expectedRPID: rpID(), requireUserVerification: true,
      credential: { id: cred.id, publicKey: new Uint8Array(cred.clave_publica), counter: Number(cred.contador), transports: cred.transportes as never },
    });
  } catch (e) {
    return mal(401, `La huella no se pudo verificar: ${(e as Error).message}`);
  }
  if (!verificacion.verified) return mal(401, "La huella no se pudo verificar");
  await datos.usarCredencial(cred.id, verificacion.authenticationInfo.newCounter);
  const dispositivo = (dispositivoDado?.trim() || cred.dispositivo || "celular").slice(0, 120);
  const sesion = await crearSesion(pool, cred.usuario_id, dispositivo);
  await registrarEvento(pool, { tipo: "sesion.iniciada", usuarioId: cred.usuario_id, contenido: { sesionId: sesion.id, dispositivo, medio: "huella", credencial: cred.id } });
  return bien({ token: sesion.token, usuario: await usuarioConPermisos(pool, cred.usuario_id) }, 201);
}

// ---------- Vínculo celular–computadora (decisiones 58 y 73) ----------
const MINUTOS_QR = 5;

// La computadora pide un código para que el celular la lea en Vender.
export async function codigoParaVincular(sesionId: string, nombre: string | undefined): Promise<PuestoParaVincular> {
  const id = randomUUID();
  const codigo = generarToken();
  await datos.nuevoPuesto(id, sesionId, codigo, nombre?.trim() || null, MINUTOS_QR);
  return { id, codigo, expiraEnSegundos: MINUTOS_QR * 60 };
}

// El celular lee el código y se vincula. Solo se emparejan dos sesiones del mismo usuario
// (decisión 60): en espejo los dos hacen lo mismo.
export async function vincular(sesion: SesionActiva, codigo: string, dispositivoId: unknown): Promise<Resultado<Vinculado>> {
  const duenio = await datos.duenioDelCodigo(codigo);
  if (duenio && duenio !== sesion.usuario.id) return mal(403, "Esa computadora tiene la sesión de otra persona. El celular se empareja solo con una computadora donde entraste vos.");
  await anotarDispositivo(pool, sesion.id, dispositivoId);
  const dias = await diasDeVinculo(pool);
  const puesto = await datos.vincularPorCodigo(codigo, sesion.id, dias);
  if (!puesto) return mal(404, "El código venció o ya se usó. Generá otro en la computadora.");
  await soltarAnteriores(pool, puesto.sesion_id, sesion.id, puesto.id);
  await sellarVinculo(pool, puesto.id);
  await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: sesion.usuario.id, contenido: { puestoId: puesto.id, medio: "codigo" } });
  return bien({ id: puesto.id, nombre: puesto.nombre, expira_en: puesto.expira_en, dias });
}

// Con quién está vinculada esta sesión, como computadora y como celular. Si el dispositivo
// tenía un vínculo dormido de este usuario, se reactiva acá.
export async function vinculosDe(sesion: SesionActiva, dispositivo: string | undefined): Promise<VinculosDeLaSesion> {
  await anotarDispositivo(pool, sesion.id, dispositivo);
  await adoptarVinculos(pool, sesion.id, sesion.usuario.id, dispositivo);
  const filas = await datos.vinculosDeLaSesion(sesion.id);
  const de = (compu: boolean) => { const p = filas.find((r) => (r.sesion_id === sesion.id) === compu); return p ? { id: p.id, nombre: p.nombre, expira_en: p.expira_en } : null; };
  return { comoComputadora: de(true), comoCelular: de(false) };
}

export const diasDelVinculo = () => diasDeVinculo(pool);
// Los días ya llegan validados (entre 1 y 365: `esquemas.ts`).
export async function cambiarDiasDelVinculo(dias: number, actorId: string): Promise<Resultado<DiasDelVinculo>> {
  await datos.guardarDiasDeVinculo(dias);
  await registrarEvento(pool, { tipo: "vinculo.dias_cambiados", usuarioId: actorId, contenido: { dias } });
  return bien({ dias });
}

export const computadorasDelCelular = (sesionId: string) => computadorasDe(pool, sesionId);
export const esComputadoraVinculada = datos.esComputadoraVinculada;
export const ladoEnElPuesto = datos.ladoEnElPuesto;

export async function soltar(puestoId: string, sesion: SesionActiva): Promise<boolean> {
  if (!(await datos.soltarPuesto(puestoId, sesion.id))) return false;
  await registrarEvento(pool, { tipo: "puesto.desvinculado", usuarioId: sesion.usuario.id, contenido: { puestoId } });
  return true;
}

export async function mandarCodigo(puestoId: string, sesionId: string, codigo: string): Promise<Resultado<CodigoEscaneado>> {
  if (!(await datos.esCelularDelPuesto(puestoId, sesionId))) return mal(403, "Este celular no está vinculado a esa computadora, o la vinculación venció");
  return bien(await datos.guardarCodigo(puestoId, codigo), 201);
}
export const codigoRecibido = datos.codigoRecibido;

export async function estadoDelPuesto(puestoId: string, sesionId: string): Promise<EstadoDelPuesto | null> {
  const p = await datos.puestoDe(puestoId, sesionId);
  return p ? { ...p, vigente: new Date(p.expira_en).getTime() > Date.now() } : null;
}

// Lo pendiente para la computadora que abre el flujo de códigos. Con `soloNuevos`, quiere solo
// lo que se escanee de acá en más: lo que había quedado sin entregar se da por entregado.
export const SEGUNDOS_PENDIENTE = 120; // un código que la computadora no recibió a tiempo ya no sirve
export async function abrirFlujoDeCodigos(puestoId: string, sesionId: string, soloNuevos: boolean) {
  if (!(await datos.esComputadoraDelPuesto(puestoId, sesionId))) return null;
  if (soloNuevos) await datos.darPorEntregados(puestoId);
  return { pendientes: () => (soloNuevos ? Promise.resolve([]) : datos.codigosPendientes(puestoId, SEGUNDOS_PENDIENTE)) };
}

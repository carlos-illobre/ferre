import { z } from "zod";

// Lo que llega sobre el acceso: las sesiones, el vínculo con la computadora y los pedidos de
// foto (decisión 89). Solo Zod: el contrato toma de acá la forma de lo que manda el front, así
// que este archivo no importa nada del servidor.

// POST /pedidos-de-foto: para qué es la foto, que se le muestra a quien la saca (hasta 120 letras).
export const pedidoDeFotoNuevo = z.object({ para: z.string("Para qué es la foto va como texto").optional().transform((p) => p?.trim().slice(0, 120)) });

// ---------- Sesiones: entrar con Google y entrar a la computadora con el celular ----------
// Una descripción del dispositivo («Chrome en Windows»); si no viene, se usa el del navegador.
const dispositivo = z.string("El dispositivo es un texto").optional();
// El identificador que guarda cada dispositivo; si no sirve, no se anota (lo decide la regla).
const dispositivoId = z.unknown().optional();

// POST /sesiones/google: la credencial que dio Google al elegir la cuenta.
export const entradaConGoogle = z.object({ credencial: z.string("Falta la credencial de Google").min(1, "Falta la credencial de Google"), dispositivo }, "Falta la credencial de Google");

// POST /sesiones/vinculaciones: la computadora pide un código para mostrar como QR.
export const pedidoDeCodigo = z.object({ dispositivo });

// POST /sesiones/vinculaciones/aprobar: el celular, con sesión, aprueba el código que leyó.
export const aprobacionDeCodigo = z.object({ codigo: z.string("Falta el código").min(1, "Falta el código"), dispositivo_id: dispositivoId }, "Falta el código");

// POST /sesiones/vinculaciones/:id/estado: la computadora pregunta por su código, con su clave.
export const consultaDeCodigo = z.object({ clave: z.string("Falta la clave").min(1, "Falta la clave"), dispositivo_id: dispositivoId }, "Falta la clave");

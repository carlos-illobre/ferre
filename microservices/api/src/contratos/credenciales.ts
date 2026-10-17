// Lo que el servidor responde sobre las huellas (passkeys): vincular un celular, entrar con la
// huella y los celulares de cada uno. Solo tipos: el cliente web los toma al compilar (ADR-018),
// así que acá no va código ni nombres de tablas. Lo que manda el front sale de la validación del
// servidor (decisión 89).
import type { z } from "zod";
import type { entradaConHuella, huellaNueva } from "../acceso/esquemas.js";
import type { UsuarioDeLaSesion } from "./sesiones.js";

// POST /credenciales/registro/opciones y /credenciales/login/opciones: el desafío y las
// opciones para el navegador, en el formato estándar de las passkeys (WebAuthn).
export type DesafioDeHuella = { desafioId: string; opciones: unknown };

// POST /credenciales/registro: responde el celular vinculado.
export type HuellaNueva = z.input<typeof huellaNueva>;
export type HuellaVinculada = { id: string; dispositivo: string };

// POST /credenciales/login: abre una sesión.
export type EntradaConHuella = z.input<typeof entradaConHuella>;
export type SesionConHuella = { token: string; usuario: UsuarioDeLaSesion | null };

// GET /credenciales: los celulares con huella de quien pregunta.
export type Credencial = { id: string; dispositivo: string | null; creada_en: string; ultimo_uso_en: string | null };

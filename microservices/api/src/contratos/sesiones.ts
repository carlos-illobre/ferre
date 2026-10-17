// Lo que el servidor responde sobre las sesiones: entrar con Google, entrar a la computadora con
// el celular, la sesión actual y las de todos. Solo tipos: el cliente web los toma al compilar
// (ADR-018), así que acá no va código ni nombres de tablas. Lo que manda el front sale de la
// validación del servidor (decisión 89).
import type { z } from "zod";
import type { aprobacionDeCodigo, consultaDeCodigo, entradaConGoogle, pedidoDeCodigo } from "../acceso/esquemas.js";

// Quien entró: `roles` son los nombres de sus roles; `permisos`, la unión de lo que permiten.
export type UsuarioDeLaSesion = { id: string; email: string; nombre: string; roles: string[]; permisos: string[] };

// POST /sesiones/google: abre una sesión si el correo está autorizado y activo.
export type EntradaConGoogle = z.input<typeof entradaConGoogle>;
// GET /sesiones/google/cliente: el identificador de esta aplicación en Google, el mismo con el que
// el servidor verifica las credenciales. Es público: Google lo muestra en su ventana.
export type ClienteDeGoogle = { clienteId: string };
export type SesionNueva = { token: string; usuario: UsuarioDeLaSesion };

// POST /sesiones/vinculaciones: el código que la computadora muestra como QR (vence a los 5
// minutos) y la clave con la que después retira su sesión.
export type PedidoDeCodigo = z.input<typeof pedidoDeCodigo>;
export type CodigoDeEntrada = { id: string; codigo: string; clave: string; expiraEnSegundos: number };

// POST /sesiones/vinculaciones/aprobar: el celular aprueba; responde qué computadora era.
export type AprobacionDeCodigo = z.input<typeof aprobacionDeCodigo>;
export type CodigoAprobado = { dispositivo: string | null };

// POST /sesiones/vinculaciones/:id/estado: cómo va el código. Aprobado, trae la sesión (una sola
// vez) y, si el celular que lo aprobó quedó emparejado, el vínculo.
export type ConsultaDeCodigo = z.input<typeof consultaDeCodigo>;
export type EstadoDelCodigo =
  | { estado: "pendiente" | "vencida" }
  | { estado: "aprobada"; token: string; usuario: UsuarioDeLaSesion; puesto: { id: string; expira_en: string } | null };

// GET /sesiones/actual
export type SesionActual = { id: string; usuario: UsuarioDeLaSesion };

// GET /sesiones: las abiertas de todos, de la más usada a la menos, salvo la de quien pregunta
// (esa se cierra con «Salir»: decisión 99). Cada una dice de quién es.
export type SesionAbierta = { id: string; usuario_id: string; dispositivo: string; creada_en: string; ultimo_uso_en: string; expira_en: string; email: string; nombre: string };

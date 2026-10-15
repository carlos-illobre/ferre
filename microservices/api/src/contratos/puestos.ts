// Lo que el servidor responde sobre el vínculo entre la computadora y el celular (los
// «puestos») y el espejo. Solo tipos: el cliente web los toma al compilar (ADR-018), así que acá
// no va código ni nombres de tablas. Lo que manda el front sale de la validación del servidor
// (decisión 89).
import type { z } from "zod";
import type { cambioEnEspejo, codigoEscaneado, diasDelVinculo, puestoNuevo, vinculacion } from "../acceso/esquemas.js";
import type { FotoQueEspera } from "./pedidos-de-foto.js";

// POST /puestos: el código que la computadora muestra como QR.
export type PuestoNuevo = z.input<typeof puestoNuevo>;
export type PuestoParaVincular = { id: string; codigo: string; expiraEnSegundos: number };

// POST /puestos/:codigo/vincular: el celular queda vinculado por tantos días.
export type Vinculacion = z.input<typeof vinculacion>;
export type Vinculado = { id: string; nombre: string | null; expira_en: string; dias: number };

// GET /puestos/mio?dispositivo=…: con quién está vinculada esta sesión, de cada lado.
export type VinculoDeLaSesion = { id: string; nombre: string | null; expira_en: string };
export type VinculosDeLaSesion = { comoComputadora: VinculoDeLaSesion | null; comoCelular: VinculoDeLaSesion | null };

// GET y PUT /puestos/configuracion
export type DiasDelVinculo = z.input<typeof diasDelVinculo>;

// GET /puestos/avisos: lo que la computadora emparejada espera de este celular.
export type AvisosParaElCelular = { lector: boolean; fotos: FotoQueEspera[] };

// POST /puestos/:id/espejo
export type CambioEnEspejo = z.input<typeof cambioEnEspejo>;

// POST /puestos/:id/codigos (responde su id) y el flujo GET /puestos/:id/eventos, que los manda.
export type CodigoEscaneadoEntrada = z.input<typeof codigoEscaneado>;
export type CodigoEscaneado = { id: string; codigo: string; creado_en: string };
export type CodigoMandado = { id: string };

// GET /puestos/:id
export type EstadoDelPuesto = { id: string; nombre: string | null; vinculado_en: string | null; expira_en: string; vigente: boolean };

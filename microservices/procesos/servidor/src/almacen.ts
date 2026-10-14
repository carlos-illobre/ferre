import type { EstadoDeVersion } from "./contrato.js";

// Lo que la regla necesita de los datos. Hay dos: Postgres (datos.ts), para el servicio, y la
// memoria (memoria.ts), para las pruebas y para probar el módulo sin base.

export type Autor = { id: string; nombre: string };

export type FilaDeVersion = {
  id: string;
  estado: EstadoDeVersion;
  bpmn: string;
  pasos: number;
  hechaPor: string;
  creada: Date;
  actualizada: Date;
};

export type FilaDeProceso = { id: string; nombre: string; revision: number; actualizado: Date };

export type ProcesoGuardado = FilaDeProceso & { vigente: FilaDeVersion | null; borrador: FilaDeVersion | null };

export type NuevaVersion = { bpmn: string; pasos: number; autor: Autor };

export interface Almacen {
  listar(): Promise<ProcesoGuardado[]>;
  leer(id: string): Promise<ProcesoGuardado | null>;
  /** El identificador del proceso con ese nombre, sin importar mayúsculas. */
  conNombre(nombre: string): Promise<string | null>;
  crear(nombre: string, borrador: NuevaVersion): Promise<string>;
  renombrar(id: string, nombre: string): Promise<boolean>;
  borrar(id: string): Promise<boolean>;
  /**
   * Cambia el borrador (o lo crea) solo si el proceso sigue en `revision`; si no, no hace nada
   * y devuelve null. Lo mismo para descartar y marcar vigente: todo cambio sube la revisión.
   */
  guardarBorrador(id: string, revision: number, version: NuevaVersion): Promise<number | null>;
  descartarBorrador(id: string, revision: number): Promise<number | null>;
  /** El borrador pasa a vigente y el vigente, a anterior. */
  marcarVigente(id: string, revision: number): Promise<number | null>;
  historial(id: string): Promise<FilaDeVersion[]>;
}

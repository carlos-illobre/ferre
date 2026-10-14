// La forma de lo que el servicio responde. Solo tipos: el paquete de pantallas los importa y al
// compilar desaparecen. Es lo único que el front sabe del servidor.

export type EstadoDeVersion = "borrador" | "vigente" | "anterior";

/** Un proceso en la lista: con solo «ver», únicamente los que tienen vigente y sin borrador. */
export type ProcesoEnLista = {
  id: string;
  nombre: string;
  vigente: boolean;
  borrador: boolean;
  /** Los pasos del borrador si quien pide puede dibujar y hay uno; si no, los del vigente. */
  pasos: number;
  actualizado: string;
};

export type Version = {
  id: string;
  estado: EstadoDeVersion;
  bpmn: string;
  pasos: number;
  hechaPor: string;
  creada: string;
  actualizada: string;
};

export type VersionEnHistorial = Omit<Version, "bpmn">;

export type Proceso = {
  id: string;
  nombre: string;
  /** Sube con cada cambio del borrador o del vigente: quien guarda dice sobre cuál dibujó. */
  revision: number;
  vigente: Version | null;
  /** Solo para quien puede dibujar. */
  borrador: Version | null;
};

/** Lo que devuelve un 409 al guardar sobre una revisión vieja: el proceso como está ahora. */
export type Conflicto = { error: string; proceso: Proceso };

export type ErrorDelServicio = { error: string };

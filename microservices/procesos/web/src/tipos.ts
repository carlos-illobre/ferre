// Lo que la aplicación le da al módulo (README, «A las pantallas»).

/** Pide al servidor de la aplicación (que reenvía a Procesos). Devuelve el JSON, o tira un ErrorDePedido. */
export type Pedir = (ruta: string, init?: RequestInit) => Promise<unknown>;

/** Lo que tira `pedir` cuando algo sale mal. `estado` 0 es sin conexión. */
export type ErrorDePedido = Error & { estado: number; datos?: unknown };

export type Puede = { ver: boolean; dibujar: boolean };

/** Dónde guardar lo último que se abrió, para mirarlo sin conexión (E42). Sin esto, no se guarda nada. */
export type GuardarLocal = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type PropsDeProcesos = {
  interfaz: "compu" | "celu";
  pedir: Pedir;
  puede: Puede;
  /** Las pantallas de la aplicación que se pueden nombrar en un paso («Vender → Cobrar»). */
  pantallas: string[];
  guardarLocal?: GuardarLocal | null;
  /** Dónde está Procesos en la aplicación, para la miga de arriba («Más › Procesos»). */
  donde?: string[];
};

export const esErrorDePedido = (e: unknown): e is ErrorDePedido => e instanceof Error && typeof (e as ErrorDePedido).estado === "number";

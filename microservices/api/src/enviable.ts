// Lo que el servidor puede devolver para cumplir un contrato de `contratos/`. Los contratos
// dicen cómo llega el dato al cliente, en JSON; una fecha de la base (Date) llega como texto
// ISO, así que donde el contrato dice texto el servidor también puede poner una fecha.
export type Enviable<C> = C extends string
  ? C | Date
  : C extends readonly (infer U)[]
    ? Enviable<U>[]
    : C extends object
      ? { [K in keyof C]: Enviable<C[K]> }
      : C;

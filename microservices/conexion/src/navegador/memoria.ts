import type { Motivo } from "../comun/mensajes.js";

// Recordar, por sala, que la conexión directa no se pudo: el motivo y cuándo se probó. Con eso no
// se vuelve a probar sola (decisión 152); solo «Probar conexión directa» lo olvida.
export type SinDirectaAnotada = { motivo: Motivo; en: number };

// Dónde se guarda: algo con la forma de `localStorage` (la aplicación decide cuál).
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function crearMemoria(almacen: Almacen, clave: string) {
  return {
    leer(): SinDirectaAnotada | null {
      try {
        return JSON.parse(almacen.getItem(clave) ?? "null") as SinDirectaAnotada | null;
      } catch {
        return null;
      }
    },
    anotar: (v: SinDirectaAnotada) => almacen.setItem(clave, JSON.stringify(v)),
    olvidar: () => almacen.removeItem(clave),
  };
}

export type Memoria = ReturnType<typeof crearMemoria>;

// Un almacén que vive mientras la página está abierta, para quien no pasa uno.
export function almacenEnMemoria(): Almacen {
  const datos = new Map<string, string>();
  return {
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

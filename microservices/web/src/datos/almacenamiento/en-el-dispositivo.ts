// Lo que se recuerda en este aparato con una clave: algo que la persona dejó así (el menú plegado,
// el panel oculto), un borrador o una marca de una sola vez. `enLaPestana`: solo mientras la
// pestaña esté abierta. Si el navegador no deja guardar, no pasa nada: se sigue sin recordarlo.
const almacen = (enLaPestana = false): Storage | null => {
  try { return enLaPestana ? sessionStorage : localStorage; } catch { return null; }
};

export function leerRecordado(clave: string, enLaPestana = false): string | null {
  try { return almacen(enLaPestana)?.getItem(clave) ?? null; } catch { return null; }
}

// `null` lo olvida.
export function recordar(clave: string, valor: string | null, enLaPestana = false): void {
  try {
    if (valor === null) almacen(enLaPestana)?.removeItem(clave);
    else almacen(enLaPestana)?.setItem(clave, valor);
  } catch { /* sin lugar o sin permiso */ }
}

// El almacén de este aparato, para un módulo que guarda lo suyo (Procesos), si se puede.
export const almacenDelDispositivo = (): Storage | null => almacen();

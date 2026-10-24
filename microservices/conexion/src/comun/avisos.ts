// Avisos: el patrón observer de todo el módulo. Quien escucha recibe cada valor que se avisa, y
// deja de recibirlos llamando a la función que le devolvió `escuchar`.
export type Avisos<T> = {
  escuchar(oyente: (valor: T) => void): () => void;
  avisar(valor: T): void;
};

export function crearAvisos<T>(): Avisos<T> {
  const oyentes = new Set<(valor: T) => void>();
  return {
    escuchar(oyente) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
    // Se recorre una copia: un oyente puede darse de baja mientras se le avisa.
    avisar(valor) {
      for (const oyente of [...oyentes]) oyente(valor);
    },
  };
}

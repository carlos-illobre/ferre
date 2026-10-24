// Esperar un rato antes de hacer algo; devuelve cómo cancelarlo. Se reemplaza en las pruebas.
export type Esperar = (ms: number, hacer: () => void) => () => void;

export const esperarReal: Esperar = (ms, hacer) => {
  const reloj = setTimeout(hacer, ms);
  return () => clearTimeout(reloj);
};

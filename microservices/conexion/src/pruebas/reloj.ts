// Un reloj de mentira para el latido: guarda lo que hay que repetir y lo dispara a mano.
export function relojDePrueba() {
  const repetir = new Set<() => void>();
  return {
    cadaTanto: (_ms: number, hacer: () => void) => { repetir.add(hacer); return () => repetir.delete(hacer); },
    latir: () => repetir.forEach((h) => h()),
    cuantos: () => repetir.size,
  };
}

// Una página de prueba que se puede ocultar y volver a mostrar a mano.
export function vistaDePrueba() {
  let visible = true;
  const oyentes = new Set<() => void>();
  return {
    visible: () => visible,
    alCambiar: (o: () => void) => { oyentes.add(o); return () => { oyentes.delete(o); }; },
    poner(v: boolean) { visible = v; oyentes.forEach((o) => o()); },
  };
}

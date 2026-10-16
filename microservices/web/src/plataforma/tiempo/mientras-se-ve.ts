// Repite una acción cada tanto, pero solo mientras la página está a la vista: oculta (otra app
// adelante, la pantalla apagada, la ventana minimizada) no gasta nada. Al volver a la vista
// hace la acción en el momento y empieza a contar de nuevo. `cadaMs` se lee cada vez que
// arranca la cuenta; si da `null`, no repite (pero al volver a la vista igual la hace una vez).
// `reiniciar` vuelve a contar desde cero con el tiempo de ese momento, sin hacer la acción.
export function repetirMientrasSeVe(accion: () => void, cadaMs: () => number | null): { dejar: () => void; reiniciar: () => void } {
  let reloj: ReturnType<typeof setInterval> | null = null;
  const parar = () => { if (reloj !== null) { clearInterval(reloj); reloj = null; } };
  const arrancar = () => {
    parar();
    const ms = cadaMs();
    if (ms !== null && document.visibilityState === "visible") reloj = setInterval(accion, ms);
  };
  const alCambiar = () => {
    if (document.visibilityState === "visible") { accion(); arrancar(); }
    else parar();
  };
  document.addEventListener("visibilitychange", alCambiar);
  arrancar();
  return { dejar: () => { parar(); document.removeEventListener("visibilitychange", alCambiar); }, reiniciar: arrancar };
}

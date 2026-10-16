// Repite una acción cada tanto, pero solo mientras la página está a la vista: oculta (otra app
// adelante, la pantalla apagada, la ventana minimizada) no gasta nada. Al volver a la vista
// hace la acción en el momento y empieza a contar de nuevo. `cadaMs` se lee cada vez que
// arranca la cuenta, así un cambio de tiempo vale desde la próxima vuelta.
export function repetirMientrasSeVe(accion: () => void, cadaMs: () => number): () => void {
  let reloj: ReturnType<typeof setInterval> | null = null;
  const parar = () => { if (reloj !== null) { clearInterval(reloj); reloj = null; } };
  const arrancar = () => { parar(); reloj = setInterval(accion, cadaMs()); };
  const alCambiar = () => {
    if (document.visibilityState === "visible") { accion(); arrancar(); }
    else parar();
  };
  document.addEventListener("visibilitychange", alCambiar);
  if (document.visibilityState === "visible") arrancar();
  return () => { parar(); document.removeEventListener("visibilitychange", alCambiar); };
}

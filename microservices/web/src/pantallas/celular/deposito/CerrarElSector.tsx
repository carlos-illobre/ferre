import type { ConteoDelCelular } from "./useConteoDelCelular";

// «Cerrar el sector»: cada diferencia se aplica al stock como ajuste explicado; si quedó algo sin
// contar, se elige si va a cero o queda como está.
export function CerrarElSector({ x }: { x: ConteoDelCelular }) {
  const { conteo } = x;
  const faltan = conteo.sin_contar.length;
  if (!x.cerrando) return conteo.renglones.length > 0 ? <button type="button" className="boton tinta principal centrado" onClick={() => x.setCerrando(true)} data-testid="cerrar">Cerrar {conteo.sector}</button> : null;
  return (
    <div className="tarjeta" data-testid="confirmar-cierre">
      <p>Cada diferencia se aplica al stock como ajuste explicado.{faltan > 0 ? ` Hay ${faltan} ${faltan === 1 ? "producto" : "productos"} del sector que no contaste.` : ""}</p>
      {faltan > 0 && <button type="button" className="boton coral" onClick={() => x.cerrar(true)}>Cerrar y poner en cero los no contados</button>}
      <button type="button" className="boton tinta" onClick={() => x.cerrar(false)} data-testid="cerrar-confirmar">{faltan > 0 ? "Cerrar y dejar los no contados como están" : "Sí, cerrar"}</button>
      <button type="button" className="boton texto gris" onClick={() => x.setCerrando(false)}>Volver</button>
    </div>
  );
}

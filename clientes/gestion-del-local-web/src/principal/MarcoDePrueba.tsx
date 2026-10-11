import "./marco-de-prueba.css";

// Ambiente de prueba: un marco alrededor de toda la pantalla, que aparece y desaparece, y un
// cartel fijo arriba. Tiene que ser imposible confundirlo con producción, para que nadie
// cargue acá una venta de verdad (decisión 33). No tapa ni recibe clics.
export function MarcoDePrueba() {
  return (
    <div className="marco-de-prueba" data-testid="ambiente">
      <span className="marco-de-prueba-borde" aria-hidden="true" />
      <strong className="marco-de-prueba-cartel">Ambiente de prueba<span> · nada de esto es real</span></strong>
    </div>
  );
}

// Todo número calculado explica de dónde sale (issue #47): el valor se ve, y al lado un
// botón que despliega los pasos en castellano. Mismo componente en todas las pantallas.
export function Explicacion({ valor, pasos, etiqueta }: { valor: string; pasos: string[]; etiqueta?: string }) {
  return (
    <details className="explicacion">
      <summary title="Ver de dónde sale">
        <span>{valor}</span> <small aria-label={etiqueta ?? "de dónde sale"}>ⓘ</small>
      </summary>
      <ol>
        {pasos.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ol>
    </details>
  );
}

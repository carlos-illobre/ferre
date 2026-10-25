// Una barra de avance: llena hasta `fraccion` o, sin ella, en movimiento.
export function Progreso({ texto, fraccion }: { texto: string; fraccion?: number }) {
  const definido = fraccion !== undefined;
  return (
    <div className={`progreso ${definido ? "" : "indefinido"}`} role="status" data-testid="progreso">
      <span>{texto}</span>
      <div className="riel" role="progressbar" aria-label={texto} aria-valuemin={0} aria-valuemax={100} aria-valuenow={definido ? Math.round(fraccion * 100) : undefined}>
        <i style={definido ? { transform: `scaleX(${Math.max(0.02, Math.min(1, fraccion))})` } : undefined} />
      </div>
    </div>
  );
}

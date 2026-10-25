import css from "./TeclasDeVender.module.css";

// Las teclas que no están en ningún botón, con el aspecto de la v2.
export function TeclasDeVender() {
  return (
    <p className={`${css.teclas} detalle`} data-testid="teclas">
      <span><kbd className="tecla">Enter</kbd> agrega</span><span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> eligen el renglón</span>
      <span><kbd className="tecla">+</kbd><kbd className="tecla">−</kbd> cantidad</span><span><kbd className="tecla">Supr</kbd> quita</span><span><kbd className="tecla">F1</kbd> panel</span>
    </p>
  );
}

// El pie de la entrada del celular: la onda de la marca, sin texto.
export function PieConOnda() {
  return (
    <footer className="en-pie" aria-hidden="true">
      <svg className="en-onda" viewBox="0 0 390 150" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 4 C 110 46, 250 84, 390 92 L 390 150 L 0 150 Z" fill="var(--p-naranja)" />
        <path d="M0 26 C 110 62, 250 90, 390 96 L 390 150 L 0 150 Z" fill="var(--p-verde)" />
      </svg>
    </footer>
  );
}

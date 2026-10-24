import { useEffect, useRef } from "react";
import { useFoto } from "./tickets";
import "./tickets.css";

// Las fotos de Mejoras y errores (RF-80), las mismas en el celular y en la computadora: la chica y,
// al tocarla, la grande. Cada interfaz tiene su pantalla, como la v2 (021).
export function Miniatura({ origen }: { origen: string | Blob }) {
  const url = useFoto(origen);
  return url ? <img src={url} alt="" /> : <span className="tk-cargando-foto" aria-hidden="true" />;
}

export function FotoGrande({ origen, alCerrar }: { origen: string | Blob; alCerrar: () => void }) {
  const url = useFoto(origen);
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (d && typeof d.showModal === "function" && !d.open) d.showModal(); }, []);
  return (
    <dialog ref={ref} className="tk-grande" aria-label="Foto del ticket" onCancel={(e) => { e.preventDefault(); alCerrar(); }} onClick={(e) => { if (e.target === e.currentTarget) alCerrar(); }}>
      {url ? <img src={url} alt="Foto del ticket" /> : <p>Abriendo la foto…</p>}
      <button type="button" className="tk-boton" autoFocus onClick={alCerrar}>Cerrar</button>
    </dialog>
  );
}

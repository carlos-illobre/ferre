import type { ReactNode } from "react";
import { Icono } from "./iconos";

// El aviso que sale abajo y se cierra solo o con la «×»: lo que se hizo, y a veces qué hacer
// después (por ejemplo «Deshacer»). El mismo en el celular y en la computadora; cada interfaz le
// da su forma con su hoja de estilos (ADR-028).
export function Toast({ texto, alCerrar, testId = "mensaje", accion }: { texto: ReactNode; alCerrar: () => void; testId?: string; accion?: { texto: string; alTocar: () => void } }) {
  if (!texto) return null;
  return (
    <div className="toast" role="status" data-testid={testId}>
      <Icono nombre="ok" className="toast-icono" />
      <span>{texto}</span>
      {accion && <button type="button" className="toast-accion" onClick={accion.alTocar}>{accion.texto}</button>}
      <button type="button" onClick={alCerrar} aria-label="Cerrar aviso"><Icono nombre="cerrar" tam={18} /></button>
    </div>
  );
}

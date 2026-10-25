import type { ReactNode } from "react";
import { Icono } from "./iconos";

const ICONO_DEL_AVISO = { ok: "ok", info: "info", error: "error", alerta: "alerta" } as const;

// Aviso en el lugar. "error" y "alerta" se anuncian; desaparece cuando quien lo muestra
// deja de pasarle texto (al corregirse la causa).
export function Aviso({ tipo = "info", children, accion, testId }: { tipo?: "info" | "error" | "alerta" | "ok"; children: ReactNode; accion?: ReactNode; testId?: string }) {
  if (children === null || children === undefined || children === false || children === "") return null;
  return (
    <div className={`aviso ${tipo}`} role={tipo === "error" ? "alert" : "status"} data-testid={testId}>
      <Icono nombre={ICONO_DEL_AVISO[tipo]} />
      <div>{children}</div>
      {accion}
    </div>
  );
}

// El aviso de error del celular: el texto y, si se puede, «Cerrar».
export function AvisoError({ texto, alCerrar }: { texto: string | null | undefined; alCerrar?: () => void }) {
  if (!texto) return null;
  return (
    <div className="aviso-error" role="alert">
      <span>{texto}</span>
      {alCerrar && <button type="button" onClick={alCerrar}>Cerrar</button>}
    </div>
  );
}

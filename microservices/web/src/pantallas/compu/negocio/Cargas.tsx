import type { ReactNode } from "react";
import type { Carga } from "./negocio-comun";
import { Aviso, Boton } from "../base/ui";

// Cómo se ve cada bloque de Cómo va el negocio mientras trae sus datos, o si no pudo.
export const textoDeEspera = (c: Carga<unknown>, enLinea: boolean) => (c.error ? (enLinea ? "No se pudo cargar" : "Se ve cuando vuelva internet") : "Trayendo el dato…");

// El lugar del número: mientras carga no muestra $0, y si falló lo dice sin moverse de lugar.
export function Numero({ carga, children }: { carga: Carga<unknown>; children: ReactNode }) {
  if (carga.datos) return <>{children}</>;
  if (carga.error) return <span className="resumen-sin-dato" aria-label="Sin dato">—</span>;
  return <span className="esqueleto resumen-esqueleto" role="status" aria-label="Cargando" />;
}

export function ErrorDeBloque({ carga }: { carga: Carga<unknown> }) {
  return <Aviso tipo="error" accion={<Boton tam="chico" onClick={carga.recargar}>Reintentar</Boton>}>{carga.error}</Aviso>;
}

export function Esqueleto({ renglones }: { renglones: number }) {
  return <div className="negocio-esqueleto" role="status" aria-label="Cargando">{Array.from({ length: renglones }, (_, i) => <span key={i} className="esqueleto" />)}</div>;
}

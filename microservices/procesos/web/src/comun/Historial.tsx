import { useEffect, useState } from "react";
import type { Version, VersionEnHistorial } from "procesos-servidor/contrato";
import { Dialogo } from "./Dialogo";
import { Lienzo } from "../editor/Lienzo";
import type { Procesos } from "../estado";

// El historial de un proceso (E23): cada versión con su fecha y quién la hizo. Una anterior se ve
// sin poder cambiarla y se puede copiar al borrador para volver a ella.

const fecha = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function Historial({ procesos, puedeCopiar, alCerrar }: { procesos: Procesos; puedeCopiar: boolean; alCerrar: () => void }) {
  const [versiones, setVersiones] = useState<VersionEnHistorial[] | null>(null);
  const [vista, setVista] = useState<Version | null>(null);
  const historial = procesos.historial;
  useEffect(() => { void historial().then(setVersiones); }, [historial]);

  return (
    <Dialogo titulo={vista ? `Versión del ${fecha(vista.actualizada)}` : "Historial"} alCerrar={alCerrar} testId="procesos-historial">
      {vista ? (
        <>
          <div className="procesos-historial-dibujo"><Lienzo xml={vista.bpmn} soloLectura /></div>
          <div className="procesos-botones">
            <button type="button" className="procesos-boton" onClick={() => setVista(null)}>Volver al historial</button>
            {puedeCopiar && procesos.abierto && (
              <button type="button" className="procesos-boton principal" data-testid="procesos-copiar-al-borrador"
                onClick={() => { procesos.guardarBorrador(procesos.abierto!.id, vista.bpmn); alCerrar(); }}>Copiar al borrador</button>
            )}
          </div>
        </>
      ) : versiones === null ? <p className="procesos-ayuda" role="status">Buscando las versiones…</p>
        : versiones.length === 0 ? <p className="procesos-ayuda">Todavía no hay versiones vigentes: este proceso está en borrador.</p>
        : (
          <ul className="procesos-versiones">
            {versiones.map((v) => (
              <li key={v.id}>
                <button type="button" onClick={async () => { const completa = await procesos.version(v.id); if (completa) setVista(completa); }} data-testid={`procesos-version-${v.id}`}>
                  <b>{v.estado === "vigente" ? "Vigente" : "Anterior"}</b>
                  <span>{fecha(v.actualizada)} · {v.hechaPor} · {v.pasos} {v.pasos === 1 ? "paso" : "pasos"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </Dialogo>
  );
}

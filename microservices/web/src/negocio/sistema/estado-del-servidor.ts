import { useEffect, useState } from "react";
import { urlApi } from "../../datos/conexion";

// Si la app responde: se pregunta sin sesión, así que sirve también cuando algo anda mal.
// `bien` es null mientras se consulta.
export function useEstadoDelServidor() {
  const [estado, setEstado] = useState<{ texto: string; bien: boolean | null }>({ texto: "Consultando el servidor…", bien: null });
  useEffect(() => {
    let vigente = true;
    fetch(urlApi("/health"))
      .then((r) => r.json() as Promise<{ ok: boolean; db: string }>)
      .then((s) => { if (vigente) setEstado({ texto: `Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`, bien: s.ok && s.db === "ok" }); })
      .catch(() => { if (vigente) setEstado({ texto: "Sin conexión con el servidor.", bien: false }); });
    return () => { vigente = false; };
  }, []);
  return estado;
}

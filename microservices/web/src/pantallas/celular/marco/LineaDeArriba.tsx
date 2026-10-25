import { useEffect, useState } from "react";
import { useCatalogo } from "../../../negocio/catalogo";
import { alAvisoDelEspejo } from "../../../espejo";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";

// Buscando en el servidor (RF-85): mientras una consulta está en curso, se dice arriba.
function BuscandoEnElServidor() {
  const { buscandoEnElServidor } = useCatalogo();
  return buscandoEnElServidor ? <span className="estado-chico pendiente" role="status" data-testid="buscando-en-el-servidor"><i aria-hidden="true" />Buscando en el servidor…</span> : null;
}

// Lo que terminó en la computadora («venta cobrada») se dice acá un momento.
function AvisoDeLaCompu() {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => alAvisoDelEspejo(setAviso), []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 7000); return () => clearTimeout(t); }, [aviso]);
  return aviso ? <span className="aviso-de-la-compu" role="status" data-testid="espejo-aviso">{aviso}</span> : null;
}

// La línea de arriba (decisión 76): cómo está la conexión, siempre a la vista, y lo que
// termina en la computadora, un momento. El estado del vínculo lo dice el color del botón.
export function LineaDeArriba() {
  return <div className="linea-de-arriba"><EstadoDeConexion testId="conexion-celular" /><BuscandoEnElServidor /><AvisoDeLaCompu /></div>;
}

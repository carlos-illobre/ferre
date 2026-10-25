import { useEstadoDelServidor } from "../../../negocio/sistema";
import { esAmbienteDePrueba, VERSION } from "../../../plataforma/ambiente";
import { Pastilla } from "../base/ui";

// Si la app responde: se pregunta sin sesión, así que sirve también cuando algo anda mal.
export function EstadoDelServidor() {
  const estado = useEstadoDelServidor();
  const prueba = esAmbienteDePrueba();
  const version = VERSION;
  const pastilla = <Pastilla tipo={estado.bien === null ? undefined : estado.bien ? "ok" : "mal"}><span data-testid="estado">{estado.texto}</span></Pastilla>;
  if (!prueba) return pastilla;
  return <span className="resumen-ambiente" data-testid="ambiente-negocio"><span className="detalle">Ambiente de prueba ·</span> {pastilla} <span className="detalle">· versión {version}</span></span>;
}

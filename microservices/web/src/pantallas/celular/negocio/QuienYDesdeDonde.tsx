import { esAmbienteDePrueba, VERSION } from "../../../plataforma/ambiente";
import { useSesionPropia } from "../../../negocio/usuarios";
import { useEstadoDelServidor } from "../../../negocio/sistema";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";

// Quién entró, la conexión y el servidor: van al pie de cualquier sección.
export function QuienYDesdeDonde() {
  const { usuario, salir } = useSesionPropia();
  const estado = useEstadoDelServidor();
  const servidor = estado.bien === null ? null : estado.texto;
  return (
    <>
      {usuario && <UsuarioActual nombre={usuario.nombre} roles={usuario.roles} salir={salir} />}
      {esAmbienteDePrueba() && <div className="aviso-suave" data-testid="ambiente-negocio">Ambiente de prueba · {servidor ?? "…"} · versión {VERSION}</div>}
      {!esAmbienteDePrueba() && servidor && <small style={{ padding: "0 4px" }} data-testid="estado">{servidor}</small>}
    </>
  );
}

function UsuarioActual({ nombre, roles, salir }: { nombre: string; roles?: string[]; salir: () => void }) {
  return (
    <div className="tarjeta usuario-actual">
      <div className="avatar">{nombre.charAt(0).toUpperCase()}</div>
      <div className="textos">
        <strong data-testid="usuario-negocio">{nombre}</strong>
        <small>{(roles ?? []).join(", ") || "sin roles"} · <EstadoDeConexion testId="conexion-negocio" /></small>
      </div>
      <button type="button" className="boton chico solo-celular" style={{ height: 34, fontSize: 13, borderRadius: 10 }} onClick={salir}>Salir</button>
    </div>
  );
}

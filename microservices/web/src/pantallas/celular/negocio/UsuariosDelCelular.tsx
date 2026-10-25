import type { FormEvent } from "react";
import { autorizar as autorizarPersona, faltaEnAlta } from "../../../negocio/usuarios";
import { ElegirRoles } from "../../RolesDeUsuario";
import { AutorizarOtro } from "./AutorizarOtro";
import { TarjetaDeUsuario } from "./TarjetaDeUsuario";
import { FiltroDeUsuarios } from "./FiltroDeUsuarios";
import { AvisoError, Hoja } from "../componentes/base";
import { useUsuariosDelCelular, type EstadoDeUsuarios } from "./useUsuariosDelCelular";
import css from "./Usuarios.module.css";

// Más → Usuarios en el celular: «Autorizar otro correo de Google», el filtro y una tarjeta por persona.
export function UsuariosDelCelular() {
  const x = useUsuariosDelCelular();
  return (
    <>
      <AutorizarOtro alTocar={() => x.setAlta(true)} />
      <FiltroDeUsuarios filtro={x.filtro} roles={x.disponibles} filas={x.filas} />
      <AvisoError texto={x.error} alCerrar={x.cerrarError} />
      <div className={css.utLista} data-testid="usuarios">
        {x.filtro.visibles.map((u) => (
          <TarjetaDeUsuario key={u.id} persona={u} orden={x.filas.indexOf(u)} esVos={u.id === x.yo} disponibles={x.disponibles} alCambiarRoles={(ids) => x.cambiar(u.id, { roles: ids })}
            alActivar={() => void x.activar(u)} acceso={x.accesoDeLaTarjeta(u)} />
        ))}
      </div>
      {x.alta && <AltaDelCelular x={x} />}
    </>
  );
}

// La hoja para autorizar a alguien: los roles elegidos quedan si se cierra sin autorizar.
function AltaDelCelular({ x }: { x: EstadoDeUsuarios }) {
  const { disponibles, error, setError, rolesDelNuevo: roles, setRolesDelNuevo: setRoles } = x;
  const alCerrar = () => x.setAlta(false);
  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const persona = { nombre: String(datos.get("nombre") ?? ""), email: String(datos.get("email") ?? ""), roles };
    const falta = faltaEnAlta(persona, "Elegí al menos un rol para la persona.");
    if (falta) { setError(falta.nombre ?? falta.email ?? falta.roles ?? null); return; }
    try {
      await autorizarPersona(persona);
      setError(null); x.setAlta(false); setRoles([]);
    } catch (err) { setError((err as Error).message); }
  }
  return (
    <Hoja titulo="Autorizar a alguien" alCerrar={alCerrar} testId="hoja-autorizar">
      <form onSubmit={autorizar} className="formulario" data-testid="alta-usuario">
        <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Nombre" required /></label>
        <label className="renglon"><span>Correo de Google</span><input name="email" type="email" placeholder="correo@gmail.com" required /></label>
        <div style={{ padding: "10px 16px" }}><ElegirRoles disponibles={disponibles} elegidos={roles} alCambiar={setRoles} /></div>
        <AvisoError texto={error} />
        <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Autorizar</button></div>
      </form>
    </Hoja>
  );
}

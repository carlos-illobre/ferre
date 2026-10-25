import { useId, useRef, useState, type FormEvent } from "react";
import { TEXTOS } from "../../textos";
import { Aviso, Boton } from "../base/ui";
import { autorizar as autorizarPersona, errorAlAutorizar, faltaEnAlta } from "../../../negocio/usuarios";
import { ElegirRoles, type RolAsignable } from "../../RolesDeUsuario";

type Errores = { nombre?: string; email?: string; roles?: string; general?: string };

// Autorizar es agregar el correo de Google de la persona: no hay contraseña que crear.
function useAlta(alAutorizar: (u: { nombre: string }) => void) {
  const [datos, setDatos] = useState({ nombre: "", email: "", roles: [] as string[] });
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);
  const cajaNombre = useRef<HTMLInputElement>(null);
  const id = useId();
  const cambiar = (campo: "nombre" | "email" | "roles", valor: string | string[]) => { setDatos((d) => ({ ...d, [campo]: valor })); setErrores((x) => ({ ...x, [campo]: undefined })); };

  // Lleva el cursor al primer campo que falta.
  function falta(faltas: Errores): boolean {
    if (faltas.nombre) cajaNombre.current?.focus();
    else if (faltas.email) document.getElementById(`${id}-email`)?.focus();
    return Boolean(faltas.nombre || faltas.email || faltas.roles);
  }
  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const faltas: Errores = faltaEnAlta(datos, TEXTOS.usuarios.faltaUnRol.largo) ?? {};
    setErrores(faltas);
    if (falta(faltas)) return;
    setGuardando(true);
    try {
      await autorizarPersona(datos);
      // El alta queda lista para cargar a otra persona.
      setDatos({ nombre: "", email: "", roles: [] }); setErrores({});
      cajaNombre.current?.focus();
      alAutorizar({ nombre: datos.nombre.trim() });
    } catch (err) {
      // Lo escrito no se pierde: el error va junto al campo que lo causó.
      setErrores(errorAlAutorizar(err));
    } finally { setGuardando(false); }
  }
  return { datos, errores, guardando, cajaNombre, id, cambiar, autorizar };
}

export function AltaDeUsuario({ disponibles, enLinea, alAutorizar }: { disponibles: RolAsignable[]; enLinea: boolean; alAutorizar: (u: { nombre: string }) => void }) {
  const a = useAlta(alAutorizar);
  const { datos, errores, id } = a;
  return (
    <form onSubmit={a.autorizar} className="usuarios-formulario" data-testid="alta-usuario" noValidate aria-labelledby={`${id}-titulo`}>
      <div className="usuarios-formulario-titulo">
        <h3 id={`${id}-titulo`}>Autorizar a alguien</h3>
        <p className="detalle">Con su correo de Google ya puede entrar. No hay contraseñas que crear.</p>
      </div>
      <label className="campo">
        <span>Nombre</span>
        <input ref={a.cajaNombre} className="entrada" name="nombre" value={datos.nombre} onChange={(e) => a.cambiar("nombre", e.target.value)} autoComplete="off"
          aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? `${id}-error-nombre` : undefined} />
        {errores.nombre && <small className="usuarios-error" id={`${id}-error-nombre`} role="alert">{errores.nombre}</small>}
      </label>
      <label className="campo">
        <span>Correo de Google</span>
        <input id={`${id}-email`} className="entrada" name="email" type="email" inputMode="email" placeholder="nombre@gmail.com" value={datos.email} onChange={(e) => a.cambiar("email", e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false}
          aria-invalid={Boolean(errores.email)} aria-describedby={errores.email ? `${id}-error-email` : undefined} />
        {errores.email && <small className="usuarios-error" id={`${id}-error-email`} role="alert">{errores.email}</small>}
      </label>
      <div className="campo usuarios-roles-del-alta">
        <ElegirRoles disponibles={disponibles} elegidos={datos.roles} alCambiar={(ids) => a.cambiar("roles", ids)} />
        {errores.roles && <small className="usuarios-error" role="alert">{errores.roles}</small>}
      </div>
      <Boton type="submit" variante="principal" icono="mas" disabled={a.guardando || !enLinea} className="usuarios-autorizar">{a.guardando ? "Autorizando…" : "Autorizar"}</Boton>
      <Aviso tipo="error">{errores.general}</Aviso>
    </form>
  );
}

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NOMBRES, TEXTOS } from "../textos";
import { DineroInvertido } from "../DineroInvertido";
import { ComprasRecientes } from "./ComprasRecientes";
import { urlApi } from "../../api";
import { accesoDe, autorizar as autorizarPersona, cambiarUsuario, cerrarSesion, faltaEnAlta, quitarCelularDeOtro, useCelularesDeOtros, useSesiones, useUsuarios, type CelularDeOtroFila, type SesionFila } from "../../negocio/usuarios";
import { useGastosDeLaSemana } from "../../negocio/compras";
import { Actividad } from "./Actividad";
import { fecha, pesos } from "../../formato";
import { useSesion } from "../../sesion";
import { usePuede } from "../permisos";
import { ElegirRoles, useRolesAsignables } from "../RolesDeUsuario";
import { AutorizarOtro, TarjetaDeUsuario } from "./TarjetaDeUsuario";
import { FiltroDeUsuarios } from "./FiltroDeUsuarios";
import { useFiltroDeUsuarios } from "../filtro-de-usuarios";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../credenciales";
import { AvisoError, Hoja, Icono, Toast, Lista } from "./componentes/base";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import { describirDispositivo } from "./pantallas/Login";
import { pesosCortos } from "../../formato";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../negocio/ventas/venta";
import { useVentasDelDia } from "../../negocio/ventas/ventas-del-dia";
import { esAmbienteDePrueba } from "../../ambiente";


// Usuarios y quién hizo qué: dos pestañas de Más → Usuarios (decisiones 88 y 100); la tercera,
// Roles, es su propia pantalla. Las sesiones y los celulares de cada persona van en su tarjeta; los
// propios, en Configuración. «Cómo va el negocio» tiene la suya (decisión 95). Las pestañas traen
// su encabezado (`cabeza`), con el título y las pestañas.
export type Parte = "usuarios" | "actividad";

export function Negocio({ parte, cabeza }: { parte: Parte; cabeza?: ReactNode }) {
  const puedeEsto = usePuede();
  return (
    <main className="contenido">
      <div className="encabezado">{cabeza ?? <h1 className="titulo">{NOMBRES.usuarios}</h1>}</div>
      <div className="dos-columnas">
      <div className="columna">
      {parte === "usuarios" && puedeEsto("admin.usuarios") && <Usuarios />}
      {parte === "actividad" && puedeEsto("negocio.actividad") && <Actividad />}
      </div>
      </div>
    </main>
  );
}

function Usuarios() {
  const { sesion } = useSesion();
  const yo = sesion.estado === "con-sesion" ? sesion.usuario.id : null;
  const disponibles = useRolesAsignables();
  const usuarios = useUsuarios();
  const filas = usuarios.datos ?? [];
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (usuarios.error && usuarios.error !== cerrado ? (usuarios.error as Error).message : null);
  const [alta, setAlta] = useState(false);
  const [rolesDelNuevo, setRolesDelNuevo] = useState<string[]>([]);
  const filtro = useFiltroDeUsuarios(filas);
  const sesiones = useSesiones();
  const celulares = useCelularesDeOtros();
  async function cerrarLaSesion(s: SesionFila) {
    if (!window.confirm(`¿Cerrar la sesión de ${s.nombre} en ${s.dispositivo}? Ese dispositivo vuelve a la entrada.`)) return;
    try { await cerrarSesion(s.id); } catch (err) { setError(`No se pudo cerrar: ${(err as Error).message}`); sesiones.recargar(); }
  }
  async function quitarElCelular(c: CelularDeOtroFila) {
    if (!window.confirm(`¿Quitar "${c.dispositivo ?? "ese celular"}"? Ya no va a poder entrar con la huella.`)) return;
    try { await quitarCelularDeOtro(c.id); } catch (err) { setError(`No se pudo quitar: ${(err as Error).message}`); celulares.recargar(); }
  }

  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const persona = { nombre: String(datos.get("nombre") ?? ""), email: String(datos.get("email") ?? ""), roles: rolesDelNuevo };
    const falta = faltaEnAlta(persona, "Elegí al menos un rol para la persona.");
    if (falta) { setError(falta.nombre ?? falta.email ?? falta.roles ?? null); return; }
    try {
      await autorizarPersona(persona);
      setError(null); setAlta(false); setRolesDelNuevo([]);
    } catch (err) { setError((err as Error).message); }
  }
  async function cambiar(id: string, cambios: { activo?: boolean; roles?: string[] }): Promise<string | null> {
    try { await cambiarUsuario(id, cambios); setError(null); return null; }
    catch (err) { return (err as Error).message; }
  }

  return (
    <>
      <AutorizarOtro alTocar={() => setAlta(true)} />
      <FiltroDeUsuarios filtro={filtro} roles={disponibles} filas={filas} />
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(usuarios.error); }} />
      <div className="ut-lista" data-testid="usuarios">
        {filtro.visibles.map((u) => (
          <TarjetaDeUsuario key={u.id} persona={u} orden={filas.indexOf(u)} esVos={u.id === yo} disponibles={disponibles} alCambiarRoles={(ids) => cambiar(u.id, { roles: ids })}
            alActivar={async () => { const falla = await cambiar(u.id, { activo: !u.activo }); if (falla) setError(falla); }}
            acceso={{ ...accesoDe(u.id, sesiones.datos, celulares.datos), alCerrarSesion: (s) => void cerrarLaSesion(s), alQuitarCelular: (c) => void quitarElCelular(c) }} />
        ))}
      </div>
      {alta && (
        <Hoja titulo="Autorizar a alguien" alCerrar={() => setAlta(false)} testId="hoja-autorizar">
          <form onSubmit={autorizar} className="formulario" data-testid="alta-usuario">
            <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Nombre" required /></label>
            <label className="renglon"><span>Correo de Google</span><input name="email" type="email" placeholder="correo@gmail.com" required /></label>
            <div style={{ padding: "10px 16px" }}><ElegirRoles disponibles={disponibles} elegidos={rolesDelNuevo} alCambiar={setRolesDelNuevo} /></div>
            <AvisoError texto={error} />
            <div className="acciones" style={{ padding: "12px 0" }}><button type="submit" className="boton tinta">Autorizar</button></div>
          </form>
        </Hoja>
      )}
    </>
  );
}


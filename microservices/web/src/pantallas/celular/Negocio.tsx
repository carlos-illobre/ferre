import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NOMBRES, TEXTOS } from "../textos";
import { DineroInvertido } from "../DineroInvertido";
import { ComprasRecientes } from "./ComprasRecientes";
import { Vinculo } from "../Vinculo";
import { urlApi } from "../../api";
import { autorizar as autorizarPersona, cambiarUsuario, cerrarSesion, faltaEnAlta, useSesiones, useUsuarios, type SesionFila } from "../../negocio/usuarios";
import { useGastosDeLaSemana } from "../../negocio/compras";
import { paginasDe, useActividad } from "../../negocio/actividad";
import { fecha, pesos } from "../../formato";
import { useSesion } from "../../sesion";
import { usePuede } from "../permisos";
import { ElegirRoles, RolesDeUsuario, useRolesAsignables, type RolAsignable } from "../RolesDeUsuario";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../../credenciales";
import { AvisoError, Hoja, Icono, Toast, Lista } from "./componentes/base";
import { EstadoDeConexion } from "./componentes/EstadoDeConexion";
import { describirDispositivo } from "./pantallas/Login";
import { pesosCortos } from "../../formato";
import { MEDIOS, NOMBRE_DE_MEDIO } from "../../negocio/ventas/venta";
import { useVentasDelDia } from "../../negocio/ventas/ventas-del-dia";
import { esAmbienteDePrueba } from "../../ambiente";


// Negocio: quién soy, ventas de hoy, gastos de la semana y, para quien administra, usuarios,
// celulares con huella, sesiones y quién hizo qué.
// Una misma pantalla, partida en «Cómo va el negocio» y tres pestañas de Más → Usuarios
// (decisión 88); la cuarta pestaña, Roles, es su propia pantalla. Las pestañas traen su
// encabezado (`cabeza`), con el título y las pestañas.
export type Parte = "negocio" | "usuarios" | "sesiones" | "actividad";

export function Negocio({ parte, cabeza }: { parte: Parte; cabeza?: ReactNode }) {
  const { sesion, salir } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const puedeEsto = usePuede();
  const { datos: hoy } = useVentasDelDia();
  const gastos = useGastosDeLaSemana().datos;
  const [servidor, setServidor] = useState<string | null>(null);
  useEffect(() => {
    fetch(urlApi("/health")).then((r) => r.json() as Promise<{ ok: boolean; db: string; version?: string }>).then((s) => setServidor(`Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`)).catch(() => setServidor("Sin conexión con el servidor."));
  }, []);
  const hoyTexto = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <main className="contenido">
      <div className="encabezado">{cabeza ?? <h1 className="titulo">{NOMBRES.comoVaElNegocio}</h1>}</div>
      <div className="dos-columnas">
      <div className="columna" hidden={parte !== "negocio"}>
      {usuario && (
        <div className="tarjeta usuario-actual">
          <div className="avatar">{usuario.nombre.charAt(0).toUpperCase()}</div>
          <div className="textos">
            <strong data-testid="usuario-negocio">{usuario.nombre}</strong>
            <small>{(usuario.roles ?? []).join(", ") || "sin roles"} · <EstadoDeConexion testId="conexion-negocio" /></small>
          </div>
          <button type="button" className="boton chico solo-celular" style={{ height: 34, fontSize: 13, borderRadius: 10 }} onClick={salir}>Salir</button>
        </div>
      )}
      {esAmbienteDePrueba() && <div className="aviso-suave" data-testid="ambiente-negocio">Ambiente de prueba · {servidor ?? "…"} · versión {import.meta.env.VITE_VERSION ?? "local"}</div>}
      {!esAmbienteDePrueba() && servidor && <small style={{ padding: "0 4px" }} data-testid="estado">{servidor}</small>}

      {hoy && (
        <div className="tarjeta oscura" data-testid="resumen-hoy">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><small>Ventas de hoy · {hoyTexto}</small><small>{hoy.ventas.filter((v) => v.estado === "confirmada").length} ventas</small></div>
          <span className="importe" style={{ fontSize: 44, lineHeight: 1 }}>{pesosCortos(hoy.total)}</span>
          <div className="totales-hoy">
            {MEDIOS.map((m) => <div key={m}><small>{NOMBRE_DE_MEDIO[m]}</small><span className="importe">{pesosCortos(hoy.totales[m] ?? 0)}</span></div>)}
          </div>
        </div>
      )}
      {!hoy && <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>}

      <DineroInvertido />

      {gastos && gastos.por_proveedor.length > 0 && (
        <>
          <h2 className="seccion" data-testid="gastos-semana"><span>Gastos de la semana</span><span className="importe" style={{ fontSize: 16 }}>{pesosCortos(gastos.total)}</span></h2>
          <Lista>
            {gastos.por_proveedor.map((g) => (
              <div key={g.proveedor} className="fila">
                <span className="nombre">{g.proveedor}</span>
                <strong className="derecha importe">{pesos(g.total)}</strong>
                <span className="detalle">{g.compras} {Number(g.compras) === 1 ? "compra" : "compras"} desde el {fecha(gastos.desde)}</span>
              </div>
            ))}
          </Lista>
        </>
      )}

      {puedeEsto("deposito.compras") && <ComprasRecientes />}

      </div>
      <div className="columna">
      {parte === "usuarios" && puedeEsto("admin.usuarios") && <Usuarios />}
      {parte === "sesiones" && puedeEsto("admin.sesiones") && <Sesiones />}
      {parte === "sesiones" && <Celulares />}
      {parte === "sesiones" && <Vinculo />}
      {parte === "actividad" && puedeEsto("negocio.actividad") && <Auditoria />}
      </div>
      </div>
    </main>
  );
}

function Usuarios() {
  const disponibles = useRolesAsignables();
  const usuarios = useUsuarios();
  const filas = usuarios.datos ?? [];
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (usuarios.error && usuarios.error !== cerrado ? (usuarios.error as Error).message : null);
  const [alta, setAlta] = useState(false);
  const [rolesDelNuevo, setRolesDelNuevo] = useState<string[]>([]);

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
      <h2 className="seccion">{NOMBRES.usuariosAutorizados}</h2>
      <small style={{ padding: "0 4px" }}>{TEXTOS.usuarios.queSonLosRoles.corto}</small>
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(usuarios.error); }} />
      <Lista data-testid="usuarios">
        {filas.map((u) => (
          <div key={u.id} className={`usuario-con-roles ${u.activo ? "" : "apagada"}`} data-testid="usuario-fila">
            <div className="fila">
              <span className="nombre">{u.nombre}</span>
              <span className="derecha"><button type="button" className="boton chico texto" onClick={async () => { const falla = await cambiar(u.id, { activo: !u.activo }); if (falla) setError(falla); }}>{u.activo ? "Desactivar" : "Reactivar"}</button></span>
              <span className="detalle">{u.email}{u.activo ? "" : " · desactivado"}</span>
            </div>
            <RolesDeUsuario disponibles={disponibles} actuales={u.roles ?? []} nombre={u.nombre} alGuardar={(ids) => cambiar(u.id, { roles: ids })} />
          </div>
        ))}
        <button type="button" className="fila" onClick={() => setAlta(true)} data-testid="autorizar"><span className="nombre" style={{ color: "var(--coral-texto)" }}>+ Autorizar otro correo de Google</span></button>
      </Lista>
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

// Mis celulares vinculados: desde acá se vincula este dispositivo con la huella, y se
// quita uno perdido. Cada usuario ve los suyos.
function Celulares() {
  const [filas, setFilas] = useState<Credencial[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => listarCredenciales().then(setFilas).catch(() => undefined);
  useEffect(() => { void cargar(); window.addEventListener(EVENTO_CREDENCIALES, cargar); return () => window.removeEventListener(EVENTO_CREDENCIALES, cargar); }, []);
  async function vincular() {
    setError(null); setMensaje(null);
    const nombre = window.prompt("¿Cómo llamamos a este celular?", describirDispositivo().slice(0, 40));
    if (nombre === null) return;
    try { const c = await vincularEsteDispositivo(nombre); setMensaje(`Listo: "${c.dispositivo}" entra con la huella desde ahora.`); await cargar(); }
    catch (e) { setError((e as Error).name === "NotAllowedError" ? "No se pudo leer la huella. Probá de nuevo." : (e as Error).message); }
  }
  async function quitar(c: Credencial) {
    if (!window.confirm(`¿Quitar "${c.dispositivo ?? "este celular"}"? Ya no va a poder entrar con la huella.`)) return;
    try { await quitarCredencial(c.id); await cargar(); } catch (e) { setError((e as Error).message); }
  }
  return (
    <div data-testid="celulares" style={{ display: "contents" }}>
      <h2 className="seccion">Mis celulares con huella</h2>
      <small style={{ padding: "0 4px" }}>Vinculá el celular una vez y desde entonces entra con la huella, sin Google. Si lo perdés, quitalo de acá.</small>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-celular" />
      <Lista>
        {filas.map((c) => (
          <div key={c.id} className="fila" data-testid="celular">
            <span className="nombre">{c.dispositivo ?? "celular"}</span>
            <button type="button" className="boton chico texto derecha" onClick={() => quitar(c)}>Quitar</button>
            <span className="detalle">vinculado el {fecha(c.creada_en.slice(0, 10))} · último uso {c.ultimo_uso_en ? fecha(c.ultimo_uso_en.slice(0, 10)) : "todavía no"}</span>
          </div>
        ))}
        {hayHuella() ? (
          <button type="button" className="fila" onClick={vincular} data-testid="vincular-celular"><span className="nombre" style={{ color: "var(--coral-texto)", display: "flex", gap: 8, alignItems: "center" }}><Icono nombre="huella" tam={18} />Vincular este celular con mi huella</span></button>
        ) : <div className="fila"><small>Este dispositivo no tiene lector de huella o desbloqueo compatible: vinculá desde el celular.</small></div>}
      </Lista>
    </div>
  );
}

function Sesiones() {
  const { sesion, salir } = useSesion();
  const propiaId = sesion.estado === "con-sesion" ? sesion.sesionId : null;
  const sesiones = useSesiones();
  const filas = sesiones.datos ?? [];
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (sesiones.error && sesiones.error !== cerrado ? (sesiones.error as Error).message : null);

  async function cerrar(s: SesionFila) {
    // La propia es "Salir": se sale de forma explícita, sin esperar a que otra llamada falle.
    if (s.id === propiaId) { await salir(); return; }
    try { await cerrarSesion(s.id); }
    catch (e) { setError(`No se pudo cerrar: ${(e as Error).message}`); sesiones.recargar(); }
  }
  return (
    <>
      <h2 className="seccion">Sesiones abiertas</h2>
      <AvisoError texto={error} alCerrar={() => { setError(null); setCerrado(sesiones.error); }} />
      <Lista data-testid="sesiones">
        {filas.map((s) => {
          const propia = s.id === propiaId;
          return (
            <div key={s.id} className={`fila ${propia ? "propia" : ""}`} data-testid="sesion" role="row" aria-label={`${s.nombre} ${s.dispositivo}${propia ? " esta sesión" : ""}`}>
              <span className="nombre">{s.nombre}{propia ? <small> · esta sesión</small> : null}</span>
              <button type="button" className={`boton chico derecha ${propia ? "coral" : ""}`} onClick={() => cerrar(s)} title={propia ? "Cierra esta sesión: volvés al login" : "Cierra la sesión en ese dispositivo"}>Cerrar</button>
              <span className="detalle">{s.dispositivo} · {new Date(s.ultimo_uso_en).toLocaleString("es-AR")}</span>
            </div>
          );
        })}
      </Lista>
    </>
  );
}

function Auditoria() {
  const [pagina, setPagina] = useState(1);
  const { datos } = useActividad({ pagina });
  const paginas = paginasDe(datos);
  const resumen = (contenido: Record<string, unknown>) => { const t = JSON.stringify(contenido); return t.length > 120 ? `${t.slice(0, 120)}…` : t; };
  return (
    <div data-testid="auditoria" style={{ display: "contents" }}>
      <h2 className="seccion">Quién hizo qué</h2>
      <Lista>
        {(datos?.eventos ?? []).map((e) => (
          <div key={e.id} className="fila">
            <span className="nombre"><strong>{e.nombre ?? "sistema"}</strong> · {e.tipo}</span>
            <small className="derecha">{new Date(e.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
            <span className="detalle"><code title={JSON.stringify(e.contenido)}>{resumen(e.contenido)}</code></span>
          </div>
        ))}
      </Lista>
      {datos && (
        <div className="paginado" data-testid="paginado">
          <button type="button" className="boton chico" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anteriores</button>
          <span>Página {datos.pagina} de {paginas} · {datos.total} acciones</span>
          <button type="button" className="boton chico" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguientes →</button>
        </div>
      )}
    </div>
  );
}

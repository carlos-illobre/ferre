import { useEffect, useState, type FormEvent } from "react";
import { api, urlApi } from "../api";
import { fecha, pesos } from "../formato";
import { administra, useSesion } from "../sesion";
import { EVENTO_CREDENCIALES, hayHuella, listarCredenciales, quitarCredencial, vincularEsteDispositivo, type Credencial } from "../credenciales";
import { AvisoError, Hoja, Icono, Toast } from "../componentes/base";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";
import { describirDispositivo } from "./Login";
import { ListaDeVentas, NOMBRE_MEDIO, pesosCortos, useVentasDeHoy } from "./VentasDeHoy";
import { esAmbienteDePrueba } from "../ambiente";

type UsuarioFila = { id: string; email: string; nombre: string; rol: string; activo: boolean };
type SesionFila = { id: string; dispositivo: string; ultimo_uso_en: string; email: string; nombre: string };
type EventoFila = { id: string; tipo: string; fecha: string; email: string | null; nombre: string | null; contenido: Record<string, unknown> };
type Gastos = { desde: string; por_proveedor: { proveedor: string; compras: string; total: string }[]; total: number };

// Negocio: quién soy, ventas de hoy, gastos de la semana y, para quien administra, usuarios,
// celulares con huella, sesiones y quién hizo qué.
export function Negocio() {
  const { sesion, salir } = useSesion();
  const usuario = sesion.estado === "con-sesion" ? sesion.usuario : null;
  const esDueno = administra(usuario);
  const { datos: hoy, anular } = useVentasDeHoy(null);
  const [gastos, setGastos] = useState<Gastos | null>(null);
  const [servidor, setServidor] = useState<string | null>(null);
  useEffect(() => {
    api<Gastos>("/compras/semana").then(setGastos).catch(() => undefined);
    fetch(urlApi("/health")).then((r) => r.json() as Promise<{ ok: boolean; db: string; version?: string }>).then((s) => setServidor(`Servidor ${s.ok ? "ok" : "con problemas"} · base ${s.db}`)).catch(() => setServidor("Sin conexión con el servidor."));
  }, []);
  const hoyTexto = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <main className="contenido">
      <div className="encabezado"><h1 className="titulo">Negocio</h1></div>
      {usuario && (
        <div className="tarjeta usuario-actual">
          <div className="avatar">{usuario.nombre.charAt(0).toUpperCase()}</div>
          <div className="textos">
            <strong data-testid="usuario-negocio">{usuario.nombre}</strong>
            <small>{usuario.rol} · <EstadoDeConexion /></small>
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
            {Object.keys(NOMBRE_MEDIO).map((m) => <div key={m}><small>{NOMBRE_MEDIO[m]}</small><span className="importe">{pesosCortos(hoy.totales[m] ?? 0)}</span></div>)}
          </div>
        </div>
      )}
      <div className="seccion">Detalle de hoy</div>
      {hoy ? <ListaDeVentas ventas={hoy.ventas} alAnular={anular} /> : <div className="aviso-suave">Sin conexión: las ventas de hoy se ven cuando vuelva internet.</div>}

      {gastos && gastos.por_proveedor.length > 0 && (
        <>
          <div className="seccion" data-testid="gastos-semana"><span>Gastos de la semana</span><span className="importe" style={{ fontSize: 16 }}>{pesosCortos(gastos.total)}</span></div>
          <div className="lista">
            {gastos.por_proveedor.map((g) => (
              <div key={g.proveedor} className="fila">
                <span className="nombre">{g.proveedor}</span>
                <strong className="derecha importe">{pesos(g.total)}</strong>
                <span className="detalle">{g.compras} {Number(g.compras) === 1 ? "compra" : "compras"} desde el {fecha(gastos.desde)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {esDueno && <Usuarios />}
      <Celulares />
      {esDueno && <Sesiones />}
      {esDueno && <Auditoria />}
    </main>
  );
}

function Usuarios() {
  const { sesion } = useSesion();
  const rolActor = sesion.estado === "con-sesion" ? sesion.usuario.rol : "mostrador";
  const esAdmin = rolActor === "admin"; // no toca dueños ni da ese rol
  const [filas, setFilas] = useState<UsuarioFila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [alta, setAlta] = useState(false);
  const cargar = () => api<UsuarioFila[]>("/usuarios").then(setFilas).catch((e: Error) => setError(e.message));
  useEffect(() => { void cargar(); }, []);

  async function autorizar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify({ email: datos.get("email"), nombre: datos.get("nombre"), rol: datos.get("rol") }) });
      setError(null); setAlta(false);
      await cargar();
    } catch (err) { setError((err as Error).message); }
  }
  async function cambiar(id: string, cambios: Partial<UsuarioFila>) {
    try { await api(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(cambios) }); setError(null); await cargar(); }
    catch (err) { setError((err as Error).message); }
  }

  return (
    <>
      <div className="seccion">Quién puede entrar</div>
      <small style={{ padding: "0 4px" }}>mostrador: vende, compra, cuenta y carga listas · admin: además administra usuarios, proveedores, duplicados y sesiones, pero no toca dueños · dueño: todo</small>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <div className="lista" data-testid="usuarios">
        {filas.map((u) => {
          const protegido = esAdmin && u.rol === "dueño";
          return (
            <div key={u.id} className={`fila ${u.activo ? "" : "apagada"}`} data-testid="usuario-fila">
              <span className="nombre">{u.nombre}</span>
              <span className="derecha" style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <select className="boton chico" style={{ appearance: "none", WebkitAppearance: "none" }} value={u.rol} disabled={protegido} onChange={(e) => cambiar(u.id, { rol: e.target.value })} aria-label={`Rol de ${u.nombre}`}>
                  <option value="mostrador">mostrador</option>
                  <option value="admin">admin</option>
                  {(!esAdmin || u.rol === "dueño") && <option value="dueño">dueño</option>}
                </select>
                {protegido ? <small>solo el dueño</small> : <button type="button" className="boton chico texto" style={{ color: u.activo ? "var(--coral-texto)" : "var(--tinta)" }} onClick={() => cambiar(u.id, { activo: !u.activo })}>{u.activo ? "Desactivar" : "Reactivar"}</button>}
              </span>
              <span className="detalle">{u.email}{u.activo ? "" : " · desactivado"}</span>
            </div>
          );
        })}
        <button type="button" className="fila" onClick={() => setAlta(true)} data-testid="autorizar"><span className="nombre" style={{ color: "var(--coral-texto)" }}>+ Autorizar otro correo de Google</span></button>
      </div>
      {alta && (
        <Hoja titulo="Autorizar a alguien" alCerrar={() => setAlta(false)} testId="hoja-autorizar">
          <form onSubmit={autorizar} className="formulario" data-testid="alta-usuario">
            <label className="renglon"><span>Nombre</span><input name="nombre" placeholder="Nombre" required /></label>
            <label className="renglon"><span>Correo de Google</span><input name="email" type="email" placeholder="correo@gmail.com" required /></label>
            <label className="renglon"><span>Rol</span><select name="rol" defaultValue="mostrador"><option value="mostrador">mostrador</option><option value="admin">admin</option>{!esAdmin && <option value="dueño">dueño</option>}</select></label>
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
      <div className="seccion">Mis celulares con huella</div>
      <small style={{ padding: "0 4px" }}>Vinculá el celular una vez y desde entonces entra con la huella, sin Google. Si lo perdés, quitalo de acá.</small>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-celular" />
      <div className="lista">
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
      </div>
    </div>
  );
}

function Sesiones() {
  const { sesion, salir } = useSesion();
  const propiaId = sesion.estado === "con-sesion" ? sesion.sesionId : null;
  const [filas, setFilas] = useState<SesionFila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => api<SesionFila[]>("/sesiones").then((f) => { setFilas(f); setError(null); }).catch((e: Error) => setError(e.message));
  useEffect(() => { void cargar(); }, []);

  async function cerrar(s: SesionFila) {
    // La propia es "Salir": se sale de forma explícita, sin esperar a que otra llamada falle.
    if (s.id === propiaId) { await salir(); return; }
    try { await api(`/sesiones/${s.id}`, { method: "DELETE" }); }
    catch (e) { setError(`No se pudo cerrar: ${(e as Error).message}`); }
    await cargar();
  }
  return (
    <>
      <div className="seccion">Sesiones abiertas</div>
      <AvisoError texto={error} alCerrar={() => setError(null)} />
      <div className="lista" data-testid="sesiones">
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
      </div>
    </>
  );
}

function Auditoria() {
  const [datos, setDatos] = useState<{ eventos: EventoFila[]; total: number; pagina: number; por_pagina: number } | null>(null);
  const [pagina, setPagina] = useState(1);
  useEffect(() => { api<{ eventos: EventoFila[]; total: number; pagina: number; por_pagina: number }>(`/auditoria?pagina=${pagina}`).then(setDatos).catch(() => undefined); }, [pagina]);
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;
  const resumen = (contenido: Record<string, unknown>) => { const t = JSON.stringify(contenido); return t.length > 120 ? `${t.slice(0, 120)}…` : t; };
  return (
    <div data-testid="auditoria" style={{ display: "contents" }}>
      <div className="seccion">Quién hizo qué</div>
      <div className="lista">
        {(datos?.eventos ?? []).map((e) => (
          <div key={e.id} className="fila">
            <span className="nombre"><strong>{e.nombre ?? "sistema"}</strong> · {e.tipo}</span>
            <small className="derecha">{new Date(e.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>
            <span className="detalle"><code title={JSON.stringify(e.contenido)}>{resumen(e.contenido)}</code></span>
          </div>
        ))}
      </div>
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

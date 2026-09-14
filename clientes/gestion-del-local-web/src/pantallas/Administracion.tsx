import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useSesion } from "../sesion";

type UsuarioFila = { id: string; email: string; nombre: string; rol: string; activo: boolean };
type SesionFila = { id: string; dispositivo: string; ultimo_uso_en: string; email: string; nombre: string };
type EventoFila = { id: string; tipo: string; fecha: string; email: string | null; nombre: string | null; contenido: Record<string, unknown> };

// Pantalla del dueño: quién puede entrar, qué sesiones están abiertas, y quién hizo qué.
export function Administracion() {
  return (
    <section>
      <Usuarios />
      <Sesiones />
      <Auditoria />
    </section>
  );
}

function Usuarios() {
  const { sesion } = useSesion();
  const rolActor = sesion.estado === "con-sesion" ? sesion.usuario.rol : "mostrador";
  const esAdmin = rolActor === "admin"; // no toca dueños ni da ese rol
  const [filas, setFilas] = useState<UsuarioFila[]>([]);
  const [error, setError] = useState<string | null>(null);
  const cargar = () => api<UsuarioFila[]>("/usuarios").then(setFilas).catch((e: Error) => setError(e.message));
  useEffect(() => { void cargar(); }, []);

  async function alta(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    try {
      await api("/usuarios", { method: "POST", body: JSON.stringify({ email: datos.get("email"), nombre: datos.get("nombre"), rol: datos.get("rol") }) });
      formulario.reset();
      setError(null);
      await cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function cambiar(id: string, cambios: Partial<UsuarioFila>) {
    try { await api(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(cambios) }); setError(null); await cargar(); }
    catch (err) { setError((err as Error).message); }
  }

  return (
    <article>
      <h2>Usuarios autorizados</h2>
      <p className="ayuda">mostrador: vende, compra, cuenta y carga listas · admin: además administra usuarios, proveedores, duplicados y sesiones, pero no toca dueños · dueño: todo</p>
      <table>
        <thead><tr><th>Nombre</th><th>Correo de Google</th><th>Rol</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {filas.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td><td>{u.email}</td>
              <td>
                <select value={u.rol} disabled={esAdmin && u.rol === "dueño"} onChange={(e) => cambiar(u.id, { rol: e.target.value })}>
                  <option value="mostrador">mostrador</option>
                  <option value="admin">admin</option>
                  {(!esAdmin || u.rol === "dueño") && <option value="dueño">dueño</option>}
                </select>
              </td>
              <td>{u.activo ? "activo" : "desactivado"}</td>
              <td>{esAdmin && u.rol === "dueño" ? <small>solo el dueño</small> : <button className={`boton ${u.activo ? "peligro" : "primario"}`} onClick={() => cambiar(u.id, { activo: !u.activo })}>{u.activo ? "Desactivar" : "Reactivar"}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form onSubmit={alta} className="en-linea">
        <input name="nombre" placeholder="Nombre" required />
        <input name="email" type="email" placeholder="correo@gmail.com" required />
        <select name="rol" defaultValue="mostrador"><option value="mostrador">mostrador</option><option value="admin">admin</option>{!esAdmin && <option value="dueño">dueño</option>}</select>
        <button type="submit" className="boton primario">Autorizar</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </article>
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
    <article>
      <h2>Sesiones abiertas</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <table data-testid="sesiones">
        <thead><tr><th>Quién</th><th>Dispositivo</th><th>Último uso</th><th /></tr></thead>
        <tbody>
          {filas.map((s) => (
            <tr key={s.id} className={s.id === propiaId ? "propia" : ""}>
              <td>{s.nombre}{s.id === propiaId ? <small> · esta sesión</small> : null}</td><td>{s.dispositivo}</td><td>{new Date(s.ultimo_uso_en).toLocaleString("es-AR")}</td>
              <td><button className={`boton ${s.id === propiaId ? "peligro" : "primario"}`} onClick={() => cerrar(s)} title={s.id === propiaId ? "Cierra esta sesión: volvés al login" : "Cierra la sesión en ese dispositivo"}>Cerrar</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Auditoria() {
  const [datos, setDatos] = useState<{ eventos: EventoFila[]; total: number; pagina: number; por_pagina: number } | null>(null);
  const [pagina, setPagina] = useState(1);
  useEffect(() => { api<{ eventos: EventoFila[]; total: number; pagina: number; por_pagina: number }>(`/auditoria?pagina=${pagina}`).then(setDatos).catch(() => undefined); }, [pagina]);
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;
  const resumen = (contenido: Record<string, unknown>) => { const t = JSON.stringify(contenido); return t.length > 120 ? `${t.slice(0, 120)}…` : t; };
  return (
    <article data-testid="auditoria">
      <h2>Quién hizo qué</h2>
      <table>
        <thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th></tr></thead>
        <tbody>
          {(datos?.eventos ?? []).map((e) => (
            <tr key={e.id}>
              <td>{new Date(e.fecha).toLocaleString("es-AR")}</td>
              <td>{e.nombre ?? "sistema"}</td>
              <td>{e.tipo}</td>
              <td><code title={JSON.stringify(e.contenido)}>{resumen(e.contenido)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      {datos && (
        <div className="paginado" data-testid="paginado">
          <button className="boton primario" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anteriores</button>
          <span>Página {datos.pagina} de {paginas} · {datos.total} acciones</span>
          <button className="boton primario" disabled={pagina >= paginas} onClick={() => setPagina((p) => p + 1)}>Siguientes →</button>
        </div>
      )}
    </article>
  );
}

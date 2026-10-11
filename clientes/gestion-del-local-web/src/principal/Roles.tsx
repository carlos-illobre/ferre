import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import "./roles.css";

// Roles (RF-75): cada rol es un nombre y un grupo de permisos. Los permisos son fijos y los
// trae el servidor, cada uno con su explicación. La misma pantalla en el celular y en la
// computadora. Asignar un rol a una persona se hace en Usuarios y sesiones.
type PermisoDelSistema = { clave: string; parte: string; nombre: string; detalle: string };
type Rol = { id: string; nombre: string; descripcion: string | null; permisos: string[]; usuarios: number };
type Borrador = { id: string | null; nombre: string; permisos: Set<string> };
const mensajeDe = (e: unknown, quehacer: string) => ((e as { estado?: number }).estado ? `${(e as Error).message}.` : `Sin conexión: ${quehacer} necesita internet.`);

export function Roles() {
  const [roles, setRoles] = useState<Rol[] | null>(null);
  const [permisos, setPermisos] = useState<PermisoDelSistema[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [falta, setFalta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([api<Rol[]>("/roles"), api<PermisoDelSistema[]>("/permisos")]);
      setRoles(r); setPermisos(p); setError(null);
    } catch (e) { setError(mensajeDe(e, "ver los roles")); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  const partes = [...new Set(permisos.map((p) => p.parte))];
  const nombreDe = (clave: string) => permisos.find((p) => p.clave === clave)?.nombre ?? clave;

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!borrador) return;
    if (!borrador.nombre.trim()) { setFalta("Poné el nombre del rol."); return; }
    if (borrador.permisos.size === 0) { setFalta("Elegí al menos un permiso para el rol."); return; }
    setGuardando(true); setFalta(null);
    const cuerpo = JSON.stringify({ nombre: borrador.nombre.trim(), permisos: [...borrador.permisos] });
    try {
      if (borrador.id) await api(`/roles/${borrador.id}`, { method: "PATCH", body: cuerpo });
      else await api("/roles", { method: "POST", body: cuerpo });
      setAviso(borrador.id ? `Rol «${borrador.nombre.trim()}» guardado. Vale desde ahora para quienes lo tienen.` : `Rol «${borrador.nombre.trim()}» creado. Ya se puede asignar en Usuarios y sesiones.`);
      setBorrador(null); await cargar();
    } catch (e2) { setFalta(mensajeDe(e2, "guardar un rol")); }
    finally { setGuardando(false); }
  }
  async function borrar(r: Rol) {
    setError(null);
    try { await api(`/roles/${r.id}`, { method: "DELETE" }); setAviso(`Rol «${r.nombre}» borrado.`); setBorrador(null); await cargar(); }
    catch (e) { setError(mensajeDe(e, "borrar un rol")); }
  }
  const alternar = (clave: string) => setBorrador((b) => { if (!b) return b; const p = new Set(b.permisos); if (p.has(clave)) p.delete(clave); else p.add(clave); return { ...b, permisos: p }; });

  return (
    <main id="contenido" className="rl" data-testid="roles" tabIndex={-1}>
      <h1>Roles</h1>
      <p className="rl-bajada">Un rol es un grupo de permisos con un nombre. Armá los que necesite el negocio y después asignáselos a cada persona en Usuarios y sesiones; una persona puede tener más de uno.</p>
      {error && <p className="rl-error" role="alert">{error} <button type="button" className="rl-boton" onClick={() => void cargar()}>Reintentar</button></p>}
      {aviso && <p className="rl-aviso" role="status" data-testid="mensaje-roles">{aviso}</p>}

      {borrador ? (
        <form className="rl-tarjeta" onSubmit={guardar} data-testid="rol-en-edicion" noValidate>
          <h2>{borrador.id ? "Cambiar el rol" : "Rol nuevo"}</h2>
          <label className="rl-campo"><span>Nombre del rol</span>
            <input value={borrador.nombre} maxLength={40} autoComplete="off" onChange={(e) => { setBorrador({ ...borrador, nombre: e.target.value }); setFalta(null); }} placeholder="Ej.: Encargado" data-testid="nombre-rol" />
          </label>
          {partes.map((parte) => (
            <fieldset key={parte} className="rl-parte">
              <legend>{parte}</legend>
              {permisos.filter((p) => p.parte === parte).map((p) => (
                <label key={p.clave} className="rl-permiso">
                  <input type="checkbox" checked={borrador.permisos.has(p.clave)} onChange={() => { alternar(p.clave); setFalta(null); }} data-testid={`permiso-${p.clave}`} />
                  <span><strong>{p.nombre}</strong><small>{p.detalle}</small></span>
                </label>
              ))}
            </fieldset>
          ))}
          {falta && <p className="rl-error" role="alert">{falta}</p>}
          <div className="rl-acciones">
            <button type="button" className="rl-boton" onClick={() => { setBorrador(null); setFalta(null); }}>Cancelar</button>
            <button type="submit" className="rl-boton fuerte" disabled={guardando} data-testid="guardar-rol">{guardando ? "Guardando…" : "Guardar el rol"}</button>
          </div>
        </form>
      ) : (
        <button type="button" className="rl-boton fuerte rl-nuevo" disabled={!roles} onClick={() => setBorrador({ id: null, nombre: "", permisos: new Set() })} data-testid="rol-nuevo">Rol nuevo</button>
      )}

      {!roles && !error && <p className="rl-bajada" aria-busy="true">Buscando los roles…</p>}
      {roles && (
        <ul className="rl-lista" data-testid="lista-de-roles">
          {roles.map((r) => (
            <li key={r.id} className="rl-tarjeta" data-testid="rol">
              <header>
                <h2>{r.nombre}</h2>
                <span className="rl-cuantos">{r.usuarios === 0 ? "Nadie lo tiene" : r.usuarios === 1 ? "Lo tiene 1 persona" : `Lo tienen ${r.usuarios} personas`}</span>
              </header>
              {r.descripcion && <p className="rl-bajada">{r.descripcion}</p>}
              <ul className="rl-permisos-del-rol">{r.permisos.map((p) => <li key={p}>{nombreDe(p)}</li>)}</ul>
              <div className="rl-acciones">
                <button type="button" className="rl-boton" onClick={() => { setBorrador({ id: r.id, nombre: r.nombre, permisos: new Set(r.permisos) }); setFalta(null); window.scrollTo(0, 0); }} data-testid="cambiar-rol">Cambiar</button>
                {r.usuarios === 0
                  ? <button type="button" className="rl-boton peligro" onClick={() => void borrar(r)} data-testid="borrar-rol">Borrar</button>
                  : <small className="rl-bajada">Para borrarlo, primero sacáselo a quien lo tiene.</small>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

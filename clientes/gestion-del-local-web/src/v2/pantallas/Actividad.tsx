import { useEffect, useState } from "react";
import { api } from "../../api";
import { fecha } from "../../formato";
import { NOMBRE_MEDIO } from "../../pantallas/VentasDeHoy";
import { useEsCelular } from "../vista";
import { Aviso, Boton, Hoja, Icono, Pagina, Pastilla, Progreso, Vacio, numero, pesosCortos } from "../ui";
import { diaYHora, fechaCompleta, nombreDeRol, textoDeError, useEnLinea } from "./negocio-comun";
import "../estilos/negocio.css";

type Contenido = Record<string, unknown>;
type Evento = { id: string; tipo: string; fecha: string; email: string | null; nombre: string | null; contenido: Contenido };
type PaginaDeEventos = { eventos: Evento[]; total: number; pagina: number; por_pagina: number };
type UsuarioFila = { id: string; nombre: string; activo: boolean };
type Filtros = { usuario: string; tipo: string; desde: string; hasta: string };
type Color = "ok" | "alerta" | "mal" | "azul" | undefined;

const SIN_FILTROS: Filtros = { usuario: "", tipo: "", desde: "", hasta: "" };

// Lo que el registro guarda con nombres técnicos, dicho con palabras del mostrador.
const QUE: Record<string, { nombre: string; color?: Color }> = {
  "venta.registrada": { nombre: "Venta", color: "ok" },
  "venta.anulada": { nombre: "Venta anulada", color: "mal" },
  "venta.pagada": { nombre: "Cobro de cuenta corriente", color: "ok" },
  "compra.registrada": { nombre: "Compra", color: "azul" },
  "compra.anulada": { nombre: "Compra anulada", color: "mal" },
  "producto.precio_elegido": { nombre: "Cambio en un producto", color: "alerta" },
  "producto.foto": { nombre: "Foto de un producto" },
  "producto.unido": { nombre: "Productos unidos", color: "alerta" },
  "producto.separado": { nombre: "Productos separados", color: "alerta" },
  "equivalencia.rechazada": { nombre: "Duplicado descartado" },
  "lista.cargada": { nombre: "Lista de precios cargada", color: "azul" },
  "lista.aplicada": { nombre: "Lista de precios aplicada", color: "alerta" },
  "lista.descartada": { nombre: "Lista de precios descartada" },
  "stock.ajustado": { nombre: "Ajuste de stock", color: "alerta" },
  "sector.creado": { nombre: "Sector nuevo" },
  "conteo.abierto": { nombre: "Conteo empezado" },
  "conteo.cerrado": { nombre: "Conteo cerrado", color: "azul" },
  "usuario.creado": { nombre: "Usuario autorizado", color: "azul" },
  "usuario.modificado": { nombre: "Cambio en un usuario", color: "alerta" },
  "sesion.iniciada": { nombre: "Entró a la app" },
  "sesion.cerrada": { nombre: "Salió de la app" },
  "sesion.revocada": { nombre: "Sesión cerrada a distancia", color: "alerta" },
  "credencial.vinculada": { nombre: "Celular vinculado con huella" },
  "credencial.quitada": { nombre: "Celular con huella quitado" },
  "puesto.vinculado": { nombre: "Celular vinculado a la computadora" },
  "cliente.creado": { nombre: "Cliente nuevo" },
  "proveedor.creado": { nombre: "Proveedor nuevo" },
  "proveedor.modificado": { nombre: "Cambio en un proveedor" },
};

// El filtro de la API compara el comienzo del tipo: «venta.» trae todo lo de ventas.
const TIPOS: { valor: string; nombre: string }[] = [
  { valor: "venta.", nombre: "Ventas" },
  { valor: "venta.anulada", nombre: "Venta anulada" },
  { valor: "compra.", nombre: "Compras" },
  { valor: "producto.precio_elegido", nombre: "Cambio de margen o de datos de un producto" },
  { valor: "producto.", nombre: "Productos (cambios, fotos y uniones)" },
  { valor: "lista.", nombre: "Listas de precios" },
  { valor: "stock.", nombre: "Ajustes de stock" },
  { valor: "conteo.", nombre: "Conteos" },
  { valor: "usuario.", nombre: "Usuarios" },
  { valor: "sesion.", nombre: "Entradas y salidas de la app" },
  { valor: "credencial.", nombre: "Celulares con huella" },
  { valor: "cliente.", nombre: "Clientes" },
  { valor: "proveedor.", nombre: "Proveedores" },
];

const texto = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? numero(v) : "");
const cuantos = (v: unknown, uno: string, muchos: string) => (typeof v === "number" ? `${numero(v)} ${v === 1 ? uno : muchos}` : "");
const juntar = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(" · ");

function queFue(e: Evento): { nombre: string; color?: Color } {
  if (e.tipo === "producto.precio_elegido" && "margen_elegido" in e.contenido) return { nombre: "Cambio de margen", color: "alerta" };
  return QUE[e.tipo] ?? { nombre: e.tipo.replace(/[._]/g, " ") };
}

// El detalle en una línea: qué se cambió, de cuánto a cuánto, sobre quién.
function detalleDe(e: Evento, usuarios: UsuarioFila[]): string {
  const c = e.contenido;
  const persona = (id: unknown) => usuarios.find((u) => u.id === id)?.nombre ?? "un usuario";
  switch (e.tipo) {
    case "venta.registrada": return juntar(pesosCortos(c.total as number), NOMBRE_MEDIO[String(c.medio_pago)] ?? texto(c.medio_pago), cuantos(c.items, "producto", "productos"));
    case "venta.anulada": case "compra.anulada": return c.motivo ? `Motivo: ${texto(c.motivo)}` : "Sin motivo anotado";
    case "compra.registrada": return juntar(texto(c.proveedor), pesosCortos(c.total as number), c.comprobante ? `comprobante ${texto(c.comprobante)}` : "", cuantos(c.items, "producto", "productos"));
    case "producto.precio_elegido": return juntar("margen_elegido" in c && (c.margen_elegido === null ? "Sin margen elegido" : `Margen del ${texto(c.margen_elegido)} %`), "unidad" in c && `Se vende por ${texto(c.unidad)}`, "codigo_barras" in c && (c.codigo_barras ? `Código de barras ${texto(c.codigo_barras)}` : "Sin código de barras"), "proveedor_preferido_id" in c && "Cambió el proveedor preferido", "foto_url" in c && "Cambió la foto");
    case "stock.ajustado": return juntar(`De ${texto(c.antes)} a ${texto(c.despues)}`, c.motivo ? texto(c.motivo) : "");
    case "lista.cargada": return juntar(texto(c.proveedor), texto(c.archivo), c.fechaLista ? `lista del ${fecha(texto(c.fechaLista))}` : "");
    case "lista.aplicada": return juntar(c.fechaLista ? `Lista del ${fecha(texto(c.fechaLista))}` : "", cuantos(c.actualizados, "precio actualizado", "precios actualizados"), cuantos(c.nuevos, "producto nuevo", "productos nuevos"));
    case "conteo.cerrado": return juntar(texto(c.sector), cuantos(c.contados, "producto contado", "productos contados"), cuantos(c.ajustados, "ajustado", "ajustados"));
    case "usuario.creado": return juntar(texto(c.email), c.rol ? `como ${nombreDeRol(String(c.rol))}` : "");
    case "usuario.modificado": {
      const cambios = (c.cambios ?? {}) as Contenido;
      return juntar(cambios.activo === false && `Desactivó a ${persona(c.id)}`, cambios.activo === true && `Reactivó a ${persona(c.id)}`, typeof cambios.rol === "string" && `${persona(c.id)} pasó a ser ${nombreDeRol(cambios.rol)}`, typeof cambios.nombre === "string" && `Ahora se llama ${cambios.nombre}`);
    }
    case "sesion.iniciada": return juntar(c.medio === "huella" ? "Con la huella" : "Con Google", texto(c.dispositivo));
    case "credencial.vinculada": return texto(c.dispositivo);
    case "sector.creado": case "cliente.creado": case "proveedor.creado": return texto(c.nombre);
    default: return "";
  }
}

// Para el detalle completo: los nombres de los datos, legibles; los valores, como se guardaron.
const rotulo = (clave: string) => { const t = clave.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
function aplanar(c: Contenido, prefijo = ""): [string, string][] {
  return Object.entries(c).flatMap(([k, v]): [string, string][] => {
    const nombre = prefijo ? `${prefijo}: ${rotulo(k).toLowerCase()}` : rotulo(k);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return aplanar(v as Contenido, nombre);
    return [[nombre, v === null || v === "" ? "—" : v === true ? "Sí" : v === false ? "No" : Array.isArray(v) ? v.join(", ") : String(v)]];
  });
}

const inicioDelDia = (dia: string, corrimiento = 0) => { const d = new Date(`${dia}T00:00:00`); d.setDate(d.getDate() + corrimiento); return d.toISOString(); };

// «Quién hizo qué»: el registro de acciones, de a 10, de la más reciente a la más vieja.
// Es de solo lectura.
export function Actividad() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const [filtros, setFiltros] = useState<Filtros>(SIN_FILTROS);
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] = useState<PaginaDeEventos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [usuarios, setUsuarios] = useState<UsuarioFila[]>([]);
  const [abierto, setAbierto] = useState<Evento | null>(null);

  useEffect(() => { api<UsuarioFila[]>("/usuarios").then(setUsuarios).catch(() => undefined); }, []);
  useEffect(() => {
    let vigente = true;
    const consulta = new URLSearchParams({ pagina: String(pagina) });
    if (filtros.usuario) consulta.set("usuario", filtros.usuario);
    if (filtros.tipo) consulta.set("tipo", filtros.tipo);
    if (filtros.desde) consulta.set("desde", inicioDelDia(filtros.desde));
    if (filtros.hasta) consulta.set("hasta", inicioDelDia(filtros.hasta, 1)); // el «hasta» de la pantalla incluye ese día
    setCargando(true);
    api<PaginaDeEventos>(`/auditoria?${consulta}`)
      .then((d) => { if (vigente) { setDatos(d); setError(null); } })
      .catch((e: unknown) => { if (vigente) setError(textoDeError(e, "No se pudo traer el registro")); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtros, pagina, intento]);
  useEffect(() => {
    const alVolver = () => setIntento((n) => n + 1);
    window.addEventListener("online", alVolver);
    return () => window.removeEventListener("online", alVolver);
  }, []);

  // Cambiar un filtro lleva a la página 1; avanzar y retroceder los conserva.
  const filtrar = (cambio: Partial<Filtros>) => { setFiltros((f) => ({ ...f, ...cambio })); setPagina(1); };
  const conFiltros = Object.values(filtros).some(Boolean);
  const paginas = datos ? Math.max(1, Math.ceil(datos.total / datos.por_pagina)) : 1;
  const eventos = datos?.eventos ?? [];
  const fechasAlReves = Boolean(filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);

  return (
    <Pagina titulo="Quién hizo qué" testId="actividad" className="actividad" bajada="Cada venta, compra, cambio de precio o de usuario queda anotado con quién lo hizo y cuándo. No se puede editar ni borrar.">
      {!enLinea && <Aviso tipo="alerta" testId="actividad-sin-conexion">Sin conexión: el registro necesita internet. Se actualiza solo cuando vuelva.</Aviso>}

      <form className="tarjeta actividad-filtros" role="search" aria-label="Filtros del registro" onSubmit={(e) => e.preventDefault()} data-testid="filtros">
        <label className="campo">
          <span>Quién</span>
          <select className="selector" value={filtros.usuario} onChange={(e) => filtrar({ usuario: e.target.value })} data-testid="filtro-usuario">
            <option value="">Todos</option>
            {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (desactivado)"}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Qué</span>
          <select className="selector" value={filtros.tipo} onChange={(e) => filtrar({ tipo: e.target.value })} data-testid="filtro-tipo">
            <option value="">Todas las acciones</option>
            {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.nombre}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Desde el día</span>
          <input className="entrada" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => filtrar({ desde: e.target.value })} aria-invalid={fechasAlReves} aria-describedby={fechasAlReves ? "actividad-fechas" : undefined} data-testid="filtro-desde" />
        </label>
        <label className="campo">
          <span>Hasta el día</span>
          <input className="entrada" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => filtrar({ hasta: e.target.value })} aria-invalid={fechasAlReves} aria-describedby={fechasAlReves ? "actividad-fechas" : undefined} data-testid="filtro-hasta" />
        </label>
        <Boton icono="cerrar" disabled={!conFiltros} onClick={() => { setFiltros(SIN_FILTROS); setPagina(1); }} data-testid="quitar-filtros">Quitar filtros</Boton>
        {fechasAlReves && <small className="actividad-fechas" id="actividad-fechas" role="alert">El «desde» es posterior al «hasta»: así no hay días para mostrar.</small>}
      </form>

      <div className="actividad-cuenta" role="status" aria-live="polite" data-testid="cuenta">
        {datos
          ? <span><strong>{datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</strong>{conFiltros ? " con esos filtros" : " registradas"}{datos.total > 0 && ` · página ${datos.pagina} de ${paginas}`}</span>
          : !error && <span>Trayendo el registro…</span>}
        {cargando && datos && <span className="detalle">Trayendo la página…</span>}
      </div>

      <Aviso tipo="error" accion={<Boton tam="chico" onClick={() => setIntento((n) => n + 1)}>Reintentar</Boton>}>{error}</Aviso>
      {!datos && !error && <Progreso texto="Trayendo las últimas acciones…" />}

      {datos && datos.total === 0 && (
        <div className="tarjeta">
          {conFiltros
            ? <Vacio icono="filtro" titulo="No hay acciones con esos filtros" accion={<Boton onClick={() => { setFiltros(SIN_FILTROS); setPagina(1); }}>Quitar filtros</Boton>}>Probá con otro día, otra persona u otro tipo de acción.</Vacio>
            : <Vacio icono="actividad" titulo="Todavía no hay acciones registradas">Apenas alguien venda, compre o cambie un precio, queda anotado acá.</Vacio>}
        </div>
      )}

      {eventos.length > 0 && (
        <div data-testid="auditoria" className={cargando ? "actividad-cargando" : ""} aria-busy={cargando}>
          {esCelular ? (
            <ul className="lista">
              {eventos.map((e) => {
                const que = queFue(e);
                return (
                  <li key={e.id} data-testid="evento">
                    <button type="button" className="renglon actividad-renglon" onClick={() => setAbierto(e)} aria-haspopup="dialog">
                      <span className="actividad-que"><Pastilla tipo={que.color}>{que.nombre}</Pastilla></span>
                      <span className="detalle actividad-cuando">{diaYHora(e.fecha)}</span>
                      <span className="actividad-linea"><strong>{e.nombre ?? "El sistema"}</strong>{detalleDe(e, usuarios) && <> · {detalleDe(e, usuarios)}</>}</span>
                      <span className="actividad-flecha" aria-hidden="true"><Icono nombre="derecha" tam={18} /></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="tabla-marco">
              <table className="tabla">
                <thead><tr><th scope="col" className="angosta">Cuándo</th><th scope="col">Quién</th><th scope="col">Qué</th><th scope="col">Detalle</th><th scope="col" className="angosta"><span className="solo-lectores">Ver todo</span></th></tr></thead>
                <tbody>
                  {eventos.map((e) => {
                    const que = queFue(e);
                    const detalle = detalleDe(e, usuarios);
                    return (
                      <tr key={e.id} data-testid="evento">
                        <td className="angosta" title={fechaCompleta(e.fecha)}>{diaYHora(e.fecha)}</td>
                        <td className="nombre actividad-quien" title={e.email ?? undefined}>{e.nombre ?? <span className="detalle">El sistema</span>}</td>
                        <td className="angosta"><Pastilla tipo={que.color}>{que.nombre}</Pastilla></td>
                        <td className="actividad-detalle" title={detalle || undefined}>{detalle || <span className="detalle">—</span>}</td>
                        <td className="angosta"><Boton tam="chico" onClick={() => setAbierto(e)} aria-label={`Ver todo sobre ${que.nombre.toLowerCase()}, ${diaYHora(e.fecha)}`} aria-haspopup="dialog">Ver todo</Boton></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {datos && datos.total > 0 && (
        <nav className="actividad-paginado" data-testid="paginado" aria-label="Páginas del registro">
          <Boton icono="izquierda" disabled={pagina <= 1 || cargando} onClick={() => setPagina((p) => p - 1)} data-testid="anteriores">Anteriores</Boton>
          <span>Página {datos.pagina} de {paginas} · {datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</span>
          <Boton disabled={pagina >= paginas || cargando} onClick={() => setPagina((p) => p + 1)} data-testid="siguientes" className="actividad-siguientes">Siguientes<Icono nombre="derecha" /></Boton>
        </nav>
      )}

      {abierto && (
        <Hoja titulo={queFue(abierto).nombre} alCerrar={() => setAbierto(null)} testId="hoja-evento" pie={<Boton variante="marino" onClick={() => setAbierto(null)}>Entendido</Boton>}>
          {detalleDe(abierto, usuarios) && <p className="actividad-resumen">{detalleDe(abierto, usuarios)}</p>}
          <dl className="actividad-datos">
            <div><dt>Cuándo</dt><dd>{fechaCompleta(abierto.fecha)}</dd></div>
            <div><dt>Quién</dt><dd>{abierto.nombre ? <>{abierto.nombre} <span className="detalle">({abierto.email})</span></> : "El sistema"}</dd></div>
            {aplanar(abierto.contenido).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </Hoja>
      )}
    </Pagina>
  );
}

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { api } from "../../api";
import { enviarOEncolar } from "../../cola";
import { useCatalogo } from "../../catalogo";
import { fecha } from "../../formato";
import { enteras, unidadDe } from "../../unidades";
import { Escaner, hayCamara } from "../../componentes/Escaner";
import { irA } from "../rutas";
import { Aviso, Boton, Explicado, Hoja, Icono, Pagina, Pastilla, Plegable, Progreso, Toast, Vacio, numero } from "../ui";
import { useEsCelular } from "../vista";
import { BuscadorDeProducto, conSigno, detalleDe, mensajeDe, nombreUnidad, plural, useEnLinea, type Producto } from "./deposito-comun";
import "../estilos/contar.css";

// Conteo por sector, caminando el local con el celular en una mano: elegir el sector, buscar
// o escanear, cuántas hay, siguiente. El sector queda abierto hasta cerrarlo (si se
// interrumpe, se retoma); al cerrar, cada diferencia contra el sistema pasa a ser un ajuste.
type Sector = { id: string; nombre: string; productos: string; ultimo_conteo: string | null; conteo_abierto: string | null };
type Renglon = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
type SinContar = { producto_id: string; descripcion: string; marca: string | null; stock_teorico: string };
type Conteo = { id: string; estado: string; sector_id: string; sector: string; renglones: Renglon[]; sin_contar: SinContar[] };
type Cierre = { ajustados: number; puestos_en_cero: number; contados: number };

const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const cuando = (s: Sector) => (s.ultimo_conteo === null ? "Nunca contado" : diasDesde(s.ultimo_conteo) === 0 ? "Contado hoy" : diasDesde(s.ultimo_conteo) === 1 ? "Contado ayer" : `Contado hace ${diasDesde(s.ultimo_conteo)} días`);
const claseDif = (dif: number) => (dif === 0 ? "igual" : dif < 0 ? "falta" : "sobra");

export function Contar() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const [sectores, setSectores] = useState<Sector[] | null>(null);
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);

  const cargarSectores = useCallback(() => api<Sector[]>("/sectores").then((s) => { setSectores(s); setError(null); })
    .catch((e) => setError(mensajeDe(e, "Sin conexión: no se pudieron traer los sectores. Revisá internet y tocá «Reintentar»."))), []);
  useEffect(() => { void cargarSectores(); }, [cargarSectores]);
  useEffect(() => { if (enLinea && sectores === null) void cargarSectores(); }, [enLinea, sectores, cargarSectores]);

  async function abrir(sectorId: string) {
    if (abriendo) return;
    setAbriendo(sectorId);
    try {
      const { id } = await api<{ id: string }>("/conteos", { method: "POST", body: JSON.stringify({ sector_id: sectorId }) });
      setConteo(await api<Conteo>(`/conteos/${id}`));
      setError(null);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo abrir el conteo: empezar o retomar un sector necesita internet. Una vez abierto, se cuenta sin conexión."));
    } finally { setAbriendo(null); }
  }

  // Primero lo que quedó a medias, después lo nunca contado, después lo más atrasado.
  const ordenados = useMemo(() => [...(sectores ?? [])].sort((a, b) => {
    const peso = (s: Sector) => (s.conteo_abierto ? 0 : s.ultimo_conteo === null ? 1 : 2);
    return peso(a) - peso(b) || (a.ultimo_conteo ?? "").localeCompare(b.ultimo_conteo ?? "") || a.nombre.localeCompare(b.nombre, "es");
  }), [sectores]);

  if (conteo) return <ConteoDeSector conteo={conteo} alActualizar={setConteo} alSalir={() => { setConteo(null); void cargarSectores(); }} />;

  const estado = (s: Sector) => (s.conteo_abierto ? <Pastilla tipo="alerta">Conteo en curso</Pastilla> : s.ultimo_conteo === null ? <Pastilla tipo="azul">Nunca contado</Pastilla> : <Pastilla tipo="ok">Contado</Pastilla>);
  const accion = (s: Sector) => (
    <Boton variante={s.conteo_abierto ? "marino" : undefined} tam={esCelular ? undefined : "chico"} ancho={esCelular} disabled={!enLinea || abriendo !== null} onClick={() => void abrir(s.id)} data-testid="abrir-sector"
      aria-label={`${s.conteo_abierto ? "Retomar el conteo de" : "Contar"} ${s.nombre}`}>
      {abriendo === s.id ? "Abriendo…" : s.conteo_abierto ? "Retomar el conteo" : "Contar"}
    </Boton>
  );
  const enCurso = ordenados.filter((s) => s.conteo_abierto).length;

  return (
    <Pagina titulo="Contar" testId="pantalla-contar" bajada="Se cuenta de a un sector: una estantería, una pared, el mostrador. Al cerrarlo, las diferencias contra el sistema se ajustan solas."
      acciones={sectores && sectores.length > 0 ? <Boton icono="mas" onClick={() => setNuevo(true)} disabled={!enLinea} data-testid="sector-nuevo">Sector nuevo</Boton> : undefined}>
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea ? "Sin conexión: empezar o retomar un sector, y crear uno nuevo, necesitan internet. Un conteo que ya está abierto en esta pantalla se sigue contando igual." : null}</Aviso>
      <Aviso tipo="error" accion={sectores === null ? <Boton tam="chico" icono="repetir" onClick={() => void cargarSectores()}>Reintentar</Boton> : undefined}>{error}</Aviso>
      {sectores === null && !error && <Progreso texto="Trayendo los sectores…" />}

      {sectores?.length === 0 && (
        <Vacio icono="contar" titulo="Todavía no hay sectores" accion={<Boton variante="principal" icono="mas" onClick={() => setNuevo(true)} disabled={!enLinea} data-testid="sector-nuevo">Crear el primer sector</Boton>}>
          Un sector es un lugar del local que se cuenta de una vez: una estantería, una pared de herramientas, el mostrador. Ponele nombre al primero y empezá a contar.
        </Vacio>
      )}

      {sectores && sectores.length > 0 && (
        <>
          {enCurso > 0 && <p className="contar-en-curso"><Icono nombre="reloj" tam={18} />{enCurso === 1 ? "Hay un conteo sin cerrar: se retoma donde quedó." : `Hay ${enCurso} conteos sin cerrar: se retoman donde quedaron.`}</p>}
          {esCelular ? (
            <ul className="contar-sectores" data-testid="sectores">
              {ordenados.map((s) => (
                <li key={s.id} className={`tarjeta contar-sector ${s.conteo_abierto ? "en-curso" : ""}`} data-testid="sector">
                  <div className="contar-sector-cabeza"><h2>{s.nombre}</h2>{estado(s)}</div>
                  <p className="detalle">{plural(Number(s.productos), "producto", "productos")}{s.ultimo_conteo ? ` · ${cuando(s).toLowerCase()}` : ""}</p>
                  {accion(s)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="tabla-marco">
              <table className="tabla contar-tabla-sectores" data-testid="sectores">
                <thead><tr><th>Sector</th><th className="num">Productos</th><th>Último conteo</th><th>Estado</th><th><span className="solo-lectores">Contar</span></th></tr></thead>
                <tbody>
                  {ordenados.map((s) => (
                    <tr key={s.id} data-testid="sector">
                      <td className="nombre">{s.nombre}</td>
                      <td className="num">{numero(Number(s.productos))}</td>
                      <td>{s.ultimo_conteo ? <>{cuando(s)} <span className="detalle">· {fecha(s.ultimo_conteo)}</span></> : <span className="detalle">Nunca</span>}</td>
                      <td>{estado(s)}</td>
                      <td className="angosta contar-celda-accion">{accion(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {nuevo && <SectorNuevo alCerrar={() => setNuevo(false)} alCrear={async (idNuevo) => { setNuevo(false); await cargarSectores(); await abrir(idNuevo); }} />}
    </Pagina>
  );
}

function SectorNuevo({ alCerrar, alCrear }: { alCerrar: () => void; alCrear: (id: string) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const id = useId();
  async function crear(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    if (!nombre.trim()) { setError("Escribí el nombre del sector."); return; }
    setOcupado(true);
    try {
      const r = await api<{ id: string }>("/sectores", { method: "POST", body: JSON.stringify({ nombre: nombre.trim() }) });
      await alCrear(r.id);
    } catch (err) {
      setError(mensajeDe(err, "No se creó: se cortó la conexión. Crear un sector necesita internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo="Sector nuevo" alCerrar={alCerrar} testId="hoja-sector-nuevo">
      <form className="pila" onSubmit={crear} noValidate>
        <label className="campo" htmlFor={`${id}-nombre`}><span>Nombre del sector</span>
          <input id={`${id}-nombre`} name="nombre" className="entrada" value={nombre} onChange={(e) => { setNombre(e.target.value); setError(null); }} placeholder="Estantería 1, Pared de herramientas…" autoFocus autoComplete="off" maxLength={80}
            aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} data-testid="nombre-sector" />
        </label>
        {error && <p className="contar-falta" id={`${id}-error`} role="alert">{error}</p>}
        <div className="hoja-pie">
          <Boton onClick={alCerrar} disabled={ocupado}>Cancelar</Boton>
          <Boton type="submit" variante="principal" disabled={ocupado} data-testid="crear-sector">{ocupado ? "Creando…" : "Crear y empezar a contar"}</Boton>
        </div>
      </form>
    </Hoja>
  );
}

function ConteoDeSector({ conteo, alActualizar, alSalir }: { conteo: Conteo; alActualizar: (c: Conteo) => void; alSalir: () => void }) {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  const { catalogo, error: errorCatalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [resultado, setResultado] = useState<{ cierre: Cierre; ajustes: Renglon[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Contados sin conexión: se ven en la lista, marcados, hasta que el servidor los recibe.
  const [enElDispositivo, setEnElDispositivo] = useState<Set<string>>(new Set());
  const caja = useRef<HTMLInputElement>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);
  const id = useId();

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);
  const contadoPorId = useMemo(() => new Map(conteo.renglones.map((r) => [r.producto_id, r])), [conteo.renglones]);
  const conDiferencia = conteo.renglones.filter((r) => Number(r.cantidad_contada) !== Number(r.stock_teorico));

  // En la computadora el foco va y vuelve solo: buscador, cantidad, buscador. En el celular
  // solo se abre el teclado para la cantidad: después de «Siguiente» se puede escanear.
  useEffect(() => {
    if (producto) { cajaCantidad.current?.focus(); cajaCantidad.current?.select(); }
    else if (!esCelular) caja.current?.focus();
  }, [producto, catalogo, esCelular]);

  const recargar = useCallback(async () => {
    try { alActualizar(await api<Conteo>(`/conteos/${conteo.id}`)); setEnElDispositivo(new Set()); } catch { /* sin conexión: queda lo que se ve */ }
  }, [conteo.id, alActualizar]);
  useEffect(() => { if (enLinea && enElDispositivo.size) void recargar(); }, [enLinea, enElDispositivo.size, recargar]);

  const elegir = useCallback((p: Producto) => {
    const previo = contadoPorId.get(p.id);
    setProducto(p); setCantidad(previo ? String(Number(previo.cantidad_contada)).replace(".", ",") : ""); setConsulta(""); setError(null); setErrorCantidad(null);
  }, [contadoPorId]);
  const elegirPorId = (productoId: string, descripcion: string) => {
    const p = catalogo?.find((x) => x.id === productoId);
    if (p) elegir(p); else setError(`«${descripcion}» no está en el catálogo de este dispositivo. Buscalo por su nombre cuando termine de bajar.`);
  };
  const alDetectar = useCallback((codigo: string) => {
    setEscaneando(false);
    const p = (catalogo ?? []).find((x) => x.codigo_barras === codigo || x.codigo_proveedor === codigo);
    if (p) elegir(p); else setError(`El código ${codigo} no está en el catálogo. Buscá el producto por su nombre.`);
  }, [catalogo, elegir]);

  const unidad = unidadDe(producto);
  const leida = (() => { const t = cantidad.trim().replace(",", "."); const n = t === "" ? NaN : Number(t); return Number.isFinite(n) && n >= 0 ? (enteras(unidad) ? Math.floor(n) : Math.round(n * 10) / 10) : NaN; })();
  const mover = (paso: number) => { setCantidad(String(Math.max(0, Math.round(((Number.isNaN(leida) ? 0 : leida) + paso) * 10) / 10)).replace(".", ",")); setErrorCantidad(null); cajaCantidad.current?.focus(); };

  async function guardar(e?: FormEvent) {
    e?.preventDefault();
    if (!producto || guardando) return;
    if (Number.isNaN(leida)) { setErrorCantidad("Escribí cuántas hay: un número, cero o más."); cajaCantidad.current?.focus(); return; }
    setGuardando(true);
    try {
      const { encolado } = await enviarOEncolar("conteo.renglon", "PUT", `/conteos/${conteo.id}/renglones/${producto.id}`, { cantidad: leida });
      setError(null); setProducto(null); setCantidad("");
      if (encolado) {
        // Sin conexión: se muestra lo contado igual; el servidor lo recibe al reconectar.
        const habia = contadoPorId.get(producto.id)?.stock_teorico ?? conteo.sin_contar.find((s) => s.producto_id === producto.id)?.stock_teorico ?? "0";
        alActualizar({
          ...conteo,
          renglones: [{ producto_id: producto.id, cantidad_contada: String(leida), contado_en: new Date().toISOString(), descripcion: producto.descripcion, marca: producto.marca, stock_teorico: habia }, ...conteo.renglones.filter((r) => r.producto_id !== producto.id)],
          sin_contar: conteo.sin_contar.filter((s) => s.producto_id !== producto.id),
        });
        setEnElDispositivo((s) => new Set(s).add(producto.id));
      } else await recargar();
    } catch (err) {
      setError(`No se guardó ${producto.descripcion}: ${(err as Error).message}`);
    } finally { setGuardando(false); }
  }

  async function quitar() {
    if (!producto || guardando) return;
    setGuardando(true);
    try {
      const { encolado } = await enviarOEncolar("conteo.renglon", "DELETE", `/conteos/${conteo.id}/renglones/${producto.id}`, null);
      setMensaje(`${producto.descripcion} salió de lo contado.`);
      setProducto(null); setCantidad(""); setError(null);
      if (encolado) alActualizar({ ...conteo, renglones: conteo.renglones.filter((r) => r.producto_id !== producto.id) }); else await recargar();
    } catch (err) {
      setError(`No se quitó ${producto.descripcion}: ${(err as Error).message}`);
    } finally { setGuardando(false); }
  }

  if (resultado) {
    const { cierre, ajustes } = resultado;
    return (
      <Pagina titulo={conteo.sector} testId="pantalla-contar" className="contar-conteo">
        <section className="tarjeta contar-resultado">
          <div className="contar-tilde"><Icono nombre="tilde" tam={34} grosor={3} /></div>
          <h2>{conteo.sector}: conteo cerrado</h2>
          <p role="status" data-testid="resultado-conteo">{plural(cierre.contados, "producto contado", "productos contados")}, {cierre.ajustados} con diferencia ajustada{cierre.puestos_en_cero ? `, ${plural(cierre.puestos_en_cero, "puesto", "puestos")} en cero` : ""}.</p>
          <div className="contar-resultado-botones">
            <Boton variante="principal" tam="grande" autoFocus onClick={alSalir} data-testid="otro-sector">Contar otro sector</Boton>
            <Boton icono="stock" onClick={() => irA("stock")}>Ver el stock</Boton>
          </div>
        </section>
        {ajustes.length > 0 ? (
          <section className="contar-ajustes" aria-labelledby={`${id}-ajustes`}>
            <h2 id={`${id}-ajustes`} className="seccion-titulo">Ajustes que se aplicaron al stock</h2>
            <ul className="lista" data-testid="ajustes">
              {ajustes.map((r) => {
                const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
                return (
                  <li key={r.producto_id} className="renglon">
                    <span className="nombre">{r.descripcion}</span>
                    <span className={`deposito-dif ${claseDif(dif)}`}>{conSigno(dif)}</span>
                    <span className="detalle">Había {numero(Number(r.stock_teorico))}, hay {numero(Number(r.cantidad_contada))}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : <p className="detalle">Todo lo contado coincidía con el sistema: no hizo falta ningún ajuste.</p>}
      </Pagina>
    );
  }

  const previo = producto ? contadoPorId.get(producto.id) : undefined;
  const botonCerrar = (
    <Boton variante="marino" tam={esCelular ? "grande" : undefined} ancho={esCelular} icono="tilde" disabled={conteo.renglones.length === 0} onClick={() => setCerrando(true)} data-testid="cerrar">Cerrar {conteo.sector}</Boton>
  );

  return (
    <Pagina titulo={conteo.sector} testId="pantalla-contar" className={`contar-conteo ${esCelular && !producto ? "deposito-con-pie" : ""}`}
      acciones={<><Boton icono="izquierda" onClick={alSalir} data-testid="volver">Volver</Boton>{!esCelular && botonCerrar}</>}
      bajada={<span className="contar-avance" data-testid="avance"><Pastilla tipo="ok">{plural(conteo.renglones.length, "contado", "contados")}</Pastilla><Pastilla>{conteo.sin_contar.length} sin contar</Pastilla>{conDiferencia.length > 0 && <Pastilla tipo="alerta">{conDiferencia.length} con diferencia</Pastilla>}</span>}>
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea ? "Sin conexión: seguí contando. Lo contado queda guardado en este dispositivo y se manda solo al volver internet; cerrar el sector necesita conexión." : null}</Aviso>
      <Aviso tipo="error">{errorCatalogo}</Aviso>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />

      <div className="contar-cuerpo">
        <div className="contar-puesto">
          {producto ? (
            <form className="tarjeta contar-contando" onSubmit={guardar} noValidate data-testid="contando" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setProducto(null); } }}>
              <div>
                <h2>{producto.descripcion}</h2>
                <p className="detalle">{[producto.marca, producto.codigo_proveedor].filter(Boolean).join(" · ") || detalleDe(producto) || "Sin marca"}</p>
              </div>
              {previo && <p className="contar-previo" data-testid="ya-contado"><Icono nombre="info" tam={18} />Ya lo contaste: pusiste {numero(Number(previo.cantidad_contada))}. Lo que pongas ahora lo reemplaza.</p>}
              <label className="contar-cuantas" htmlFor={`${id}-cantidad`}>¿Cuántas hay?{!enteras(unidad) && <span className="detalle"> En {nombreUnidad(unidad)}, con un decimal.</span>}</label>
              <div className="contar-numero">
                <button type="button" aria-label="Una menos" onClick={() => mover(-1)}><Icono nombre="menos" tam={22} grosor={2.4} /></button>
                <input ref={cajaCantidad} id={`${id}-cantidad`} inputMode={enteras(unidad) ? "numeric" : "decimal"} enterKeyHint="next" autoComplete="off" placeholder="0" value={cantidad}
                  onChange={(e) => { setCantidad(e.target.value.replace(enteras(unidad) ? /[^\d]/g : /[^\d,.]/g, "")); setErrorCantidad(null); }}
                  aria-invalid={Boolean(errorCantidad)} aria-describedby={errorCantidad ? `${id}-falta` : undefined} data-testid="cantidad" />
                <button type="button" aria-label="Una más" onClick={() => mover(1)}><Icono nombre="mas" tam={22} grosor={2.4} /></button>
              </div>
              {errorCantidad && <p className="contar-falta" id={`${id}-falta`} role="alert">{errorCantidad}</p>}
              <Aviso tipo="error">{error}</Aviso>
              <div className="contar-contando-botones">
                <Boton onClick={() => setProducto(null)} disabled={guardando}>Cancelar</Boton>
                <Boton type="submit" variante="principal" tam="grande" disabled={guardando} tecla="Enter" data-testid="siguiente">{guardando ? "Guardando…" : "Siguiente"}</Boton>
              </div>
              {previo && <div><Boton variante="peligro" tam="chico" icono="basura" onClick={() => void quitar()} disabled={guardando} data-testid="quitar-contado">Quitar de lo contado</Boton></div>}
            </form>
          ) : (
            <>
              <BuscadorDeProducto consulta={consulta} alCambiar={(v) => { setConsulta(v); setError(null); }} resultados={resultados} alElegir={elegir} cajaRef={caja}
                placeholder={!catalogo ? "Bajando el catálogo…" : esCelular ? (hayCamara() ? "Buscá o escaneá" : "Buscá el producto") : hayCamara() ? "Buscá o escaneá el producto" : "Buscá el producto"} disabled={!catalogo} alEscanear={hayCamara() ? () => setEscaneando(true) : undefined}
                aLaDerecha={(p) => (contadoPorId.has(p.id) ? <Pastilla tipo="ok">Ya contado: {numero(Number(contadoPorId.get(p.id)!.cantidad_contada))}</Pastilla> : null)} />
              {!catalogo && !errorCatalogo && <Progreso texto="Bajando el catálogo de productos…" />}
              <Aviso tipo="error" testId="error-conteo">{error}</Aviso>
              <p className="detalle solo-compu">Flechas y Enter para elegir; después la cantidad y Enter otra vez. Escape limpia.</p>
              {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} />}
            </>
          )}
        </div>

        <div className="contar-listas">
          <section aria-labelledby={`${id}-contados`} className="pila">
            <h2 id={`${id}-contados`} className="seccion-titulo">Contados <span className="detalle">· {conteo.renglones.length}</span></h2>
            {conteo.renglones.length === 0 ? (
              <Vacio icono="contar" titulo="Buscá o escaneá el primer producto">Empezá por una punta de la estantería y andá de a un producto: lo buscás, ponés cuántas hay y pasás al siguiente.</Vacio>
            ) : esCelular ? (
              <ul className="lista" data-testid="contados">
                {conteo.renglones.map((r) => {
                  const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
                  return (
                    <li key={r.producto_id}>
                      <button type="button" className="renglon" onClick={() => elegirPorId(r.producto_id, r.descripcion)} aria-label={`${r.descripcion}: hay ${numero(Number(r.cantidad_contada))}. Corregir`}>
                        <span className="nombre">{r.descripcion}</span>
                        <span className="contar-contado"><span className="importe">{numero(Number(r.cantidad_contada))}</span><span className={`deposito-dif ${claseDif(dif)}`}>{conSigno(dif)}</span></span>
                        <span className="detalle">{dif === 0 ? `Coincide con el sistema${r.marca ? ` · ${r.marca}` : ""}` : `Había ${numero(Number(r.stock_teorico))}, hay ${numero(Number(r.cantidad_contada))}${r.marca ? ` · ${r.marca}` : ""}`}{enElDispositivo.has(r.producto_id) && <> <Pastilla tipo="alerta">Se manda al volver internet</Pastilla></>}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="tabla-marco">
                <table className="tabla contar-tabla" data-testid="contados">
                  <thead><tr><th>Producto</th><th className="num">Hay</th><th className="num">Había</th><th className="num">Diferencia</th><th><span className="solo-lectores">Corregir</span></th></tr></thead>
                  <tbody>
                    {conteo.renglones.map((r) => {
                      const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
                      return (
                        <tr key={r.producto_id} data-testid="contado">
                          <td><span className="nombre">{r.descripcion}</span>{r.marca && <span className="detalle"> · {r.marca}</span>}{enElDispositivo.has(r.producto_id) && <div><Pastilla tipo="alerta">Se manda al volver internet</Pastilla></div>}</td>
                          <td className="num"><span className="importe chico">{numero(Number(r.cantidad_contada))}</span></td>
                          <td className="num">{numero(Number(r.stock_teorico))}</td>
                          <td className="num">{dif === 0 ? <span className="deposito-dif igual" title="Coincide con el sistema">=</span> : (
                            <Explicado className={`deposito-dif ${claseDif(dif)}`} valor={conSigno(dif)} titulo={`Diferencia de ${r.descripcion}`} pasos={[`Según el sistema había ${numero(Number(r.stock_teorico))}.`, `Contaste ${numero(Number(r.cantidad_contada))}.`, `Diferencia: ${conSigno(dif)}. Al cerrar el sector se aplica al stock como un ajuste.`]} />
                          )}</td>
                          <td className="angosta"><Boton tam="chico" icono="editar" onClick={() => elegirPorId(r.producto_id, r.descripcion)} aria-label={`Corregir lo contado de ${r.descripcion}`}>Corregir</Boton></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {conteo.sin_contar.length > 0 && (
            <Plegable titulo="Sin contar todavía" extra={String(conteo.sin_contar.length)} testId="sin-contar" relleno={false}>
              <ul className="contar-sin-contar">
                {conteo.sin_contar.map((p) => (
                  <li key={p.producto_id}>
                    <button type="button" className="renglon" onClick={() => elegirPorId(p.producto_id, p.descripcion)} aria-label={`Contar ${p.descripcion}`}>
                      <span className="nombre">{p.descripcion}</span>
                      <span className="contar-tocar">Contar<Icono nombre="derecha" tam={16} grosor={2.4} /></span>
                      <span className="detalle">{[p.marca, `el sistema dice ${numero(Number(p.stock_teorico))}`].filter(Boolean).join(" · ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Plegable>
          )}
        </div>
      </div>

      {esCelular && !producto && <div className="deposito-pie contar-pie">{botonCerrar}</div>}

      {cerrando && (
        <CerrarSector conteo={conteo} conDiferencia={conDiferencia.length} enLinea={enLinea} pendientes={enElDispositivo.size} alCerrar={() => setCerrando(false)}
          alCerrado={(cierre) => { setCerrando(false); setResultado({ cierre, ajustes: conDiferencia }); }} />
      )}
    </Pagina>
  );
}

// Cerrar no se deshace: antes muestra qué se contó, qué tiene diferencia y qué quedó sin
// contar, y las dos salidas se leen completas.
function CerrarSector({ conteo, conDiferencia, enLinea, pendientes, alCerrar, alCerrado }: { conteo: Conteo; conDiferencia: number; enLinea: boolean; pendientes: number; alCerrar: () => void; alCerrado: (c: Cierre) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltan = conteo.sin_contar.length;
  const bloqueado = ocupado || !enLinea || pendientes > 0;
  async function cerrar(faltantesEnCero: boolean) {
    if (bloqueado) return;
    setOcupado(true); setError(null);
    try {
      alCerrado(await api<Cierre>(`/conteos/${conteo.id}/cerrar`, { method: "POST", body: JSON.stringify({ faltantes_en_cero: faltantesEnCero }) }));
    } catch (e) {
      setError(mensajeDe(e, "No se cerró: se cortó la conexión. Lo contado sigue guardado; probá de nuevo cuando vuelva internet."));
      setOcupado(false);
    }
  }
  return (
    <Hoja titulo={`¿Cerrar ${conteo.sector}?`} alCerrar={alCerrar} testId="confirmar-cierre">
      <dl className="contar-cierre-numeros">
        <div><dt>Contados</dt><dd className="importe">{conteo.renglones.length}</dd></div>
        <div><dt>Con diferencia</dt><dd className="importe">{conDiferencia}</dd></div>
        <div><dt>Sin contar</dt><dd className="importe">{faltan}</dd></div>
      </dl>
      <p>Cada diferencia se aplica al stock como un ajuste que queda explicado en los movimientos del producto. <strong>Cerrar no se puede deshacer.</strong></p>
      {faltan > 0 && <p>{faltan === 1 ? "Hay un producto del sector que no contaste." : `Hay ${faltan} productos del sector que no contaste.`} Elegí qué pasa con {faltan === 1 ? "él" : "ellos"}: si no {faltan === 1 ? "está" : "están"} más en la estantería, van a cero.</p>}
      <Aviso tipo="alerta">{!enLinea ? "Sin conexión: cerrar el sector necesita internet. Lo contado queda guardado." : pendientes > 0 ? `Todavía hay ${plural(pendientes, "producto contado que no llegó", "productos contados que no llegaron")} al servidor. Esperá un momento y volvé a intentar.` : null}</Aviso>
      <Aviso tipo="error">{error}</Aviso>
      <div className="contar-cierre-botones">
        {faltan > 0 && <Boton variante="peligro" disabled={bloqueado} onClick={() => void cerrar(true)} data-testid="cerrar-en-cero">Cerrar y poner en cero los no contados</Boton>}
        <Boton variante="marino" disabled={bloqueado} onClick={() => void cerrar(false)} data-testid="cerrar-confirmar">{ocupado ? "Cerrando…" : faltan > 0 ? "Cerrar y dejar los no contados como están" : `Cerrar ${conteo.sector}`}</Boton>
        <Boton onClick={alCerrar} disabled={ocupado}>Seguir contando</Boton>
      </div>
    </Hoja>
  );
}

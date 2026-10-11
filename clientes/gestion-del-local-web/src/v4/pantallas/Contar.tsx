import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ErrorApi } from "../../api";
import { useCatalogo } from "../../catalogo";
import { enviarOEncolar, enviarPendientes } from "../../cola";
import { useConexion } from "../conexion";
import { cantidad, nombreDeUnidad, numero, vaConDecimal } from "../formato";
import {
  Aviso, avisar, Boton, Buscador, Campo, Cantidad, Cargando, clases, Confirmar, ErrorDeCarga, Escaner, Exito, Hoja, Icono, Pagina, Pastilla, Tarjeta, TituloDeSeccion, Vacio,
} from "../piezas";
import { useEsCelular } from "../rutas";
import { esCodigo, mensajeDe, plural, productoPorCodigo, queDia, type Producto } from "./deposito-comun";
import "../estilos/contar.css";

// Conteo por sector, caminando el local con el celular: elegir el sector, buscar o escanear,
// cuántas hay, siguiente. El sector queda abierto hasta cerrarlo (si se interrumpe, se
// retoma); al cerrar, cada diferencia contra el sistema pasa a ser un ajuste de stock.
type Sector = { id: string; nombre: string; productos: string; ultimo_conteo: string | null; conteo_abierto: string | null };
type Renglon = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
type SinContar = { producto_id: string; descripcion: string; marca: string | null; stock_teorico: string };
type Conteo = { id: string; estado: string; sector_id: string; sector: string; renglones: Renglon[]; sin_contar: SinContar[] };
type Cierre = { contados: number; ajustados: number };
type Cerrado = { sector: string; contados: number; ajustes: number };

const MAXIMO_DE_RESULTADOS = 6;

/** "Contado hoy", "Contado hace 3 días", "Contado el 9 de octubre". */
function contadoCuando(momento: string): string {
  const dia = queDia(momento);
  return /^\d/.test(dia) ? `Contado el ${dia}` : `Contado ${dia.toLowerCase()}`;
}

// El conteo abierto dura aunque se pase por otra pantalla: sin conexión no se podría volver a
// abrir, y lo contado en este dispositivo todavía no está en el servidor.
let enCurso: { conteo: Conteo; enElDispositivo: Set<string> } | null = null;

/** Para las pruebas: ningún conteo abierto en la pantalla. */
export function reiniciarConteo() {
  enCurso = null;
}

// ---------------------------------------------------------------- Pantalla: los sectores

export function Contar() {
  const { enLinea } = useConexion();
  const [sectores, setSectores] = useState<Sector[] | null>(null);
  const [conteo, setConteoLocal] = useState<Conteo | null>(() => enCurso?.conteo ?? null);
  const [error, setError] = useState<string | null>(null);
  const [errorAlAbrir, setErrorAlAbrir] = useState<string | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [cerrado, setCerrado] = useState<Cerrado | null>(null);

  function setConteo(c: Conteo | null) {
    enCurso = c ? { conteo: c, enElDispositivo: enCurso?.conteo.id === c.id ? enCurso.enElDispositivo : new Set() } : null;
    setConteoLocal(c);
  }

  const cargar = useCallback(() => api<Sector[]>("/sectores").then((s) => { setSectores(s); setError(null); })
    .catch((e) => setError(mensajeDe(e, "Revisá la conexión y probá de nuevo."))), []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (enLinea && error) void cargar(); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  async function abrir(sectorId: string) {
    if (abriendo) return;
    setAbriendo(sectorId); setErrorAlAbrir(null);
    try {
      const { id } = await api<{ id: string }>("/conteos", { method: "POST", body: JSON.stringify({ sector_id: sectorId }) });
      setConteo(await api<Conteo>(`/conteos/${id}`));
      window.scrollTo(0, 0);
    } catch (e) {
      setErrorAlAbrir(mensajeDe(e, "Empezar o retomar un sector necesita internet. Una vez abierto, se sigue contando sin conexión."));
    } finally {
      setAbriendo(null);
    }
  }

  // Primero lo que quedó a medias, después lo nunca contado, después lo más atrasado.
  const ordenados = useMemo(() => [...(sectores ?? [])].sort((a, b) => {
    const peso = (s: Sector) => (s.conteo_abierto ? 0 : s.ultimo_conteo === null ? 1 : 2);
    return peso(a) - peso(b) || (a.ultimo_conteo ?? "").localeCompare(b.ultimo_conteo ?? "") || a.nombre.localeCompare(b.nombre, "es");
  }), [sectores]);

  if (cerrado) {
    return (
      <Pagina titulo="Contar stock" ancho="angosto" volver={false} testId="pantalla-contar">
        <Exito
          titulo={cerrado.ajustes === 0 ? "Conteo cerrado: todo coincide" : `Conteo cerrado: ${plural(cerrado.ajustes, "ajuste", "ajustes")}`}
          detalle={<span data-testid="resultado-conteo">{cerrado.sector} · {plural(cerrado.contados, "producto contado", "productos contados")}</span>}
          boton="Contar otro sector"
          alSeguir={() => { setCerrado(null); void cargar(); }}
        />
      </Pagina>
    );
  }

  if (conteo) {
    return (
      <ConteoDeSector
        conteo={conteo}
        alActualizar={setConteo}
        alVolver={() => { setConteo(null); void cargar(); }}
        alCerrar={(hecho) => { setConteo(null); setCerrado(hecho); window.scrollTo(0, 0); }}
      />
    );
  }

  const aMedias = ordenados.find((s) => s.conteo_abierto);

  return (
    <Pagina titulo="Contar stock" testId="pantalla-contar">
      {sectores === null && !error && <Cargando texto="Cargando los sectores…" />}
      {sectores === null && error && <ErrorDeCarga titulo="No se pudieron cargar los sectores" alReintentar={() => { setError(null); void cargar(); }}>{error}</ErrorDeCarga>}

      {sectores && sectores.length > 0 && (
        <>
          <TituloDeSeccion titulo="¿Dónde vas a contar?" detalle="Se cuenta de a un sector. Podés dejarlo a medias y seguir después.">
            <Boton tam="chico" icono="mas" disabled={!enLinea} onClick={() => setNuevo(true)} data-testid="sector-nuevo">Nuevo sector</Boton>
          </TituloDeSeccion>
          {!enLinea && <Aviso tipo="alerta" titulo="Sin conexión" testId="sin-conexion">Empezar o retomar un sector, y crear uno nuevo, necesitan internet.</Aviso>}
          {errorAlAbrir && <Aviso tipo="error" titulo="No se pudo abrir el conteo" testId="error-conteo">{errorAlAbrir}</Aviso>}
          <div className="contar__sectores" data-testid="sectores">
            {ordenados.map((s) => {
              const estado = s.conteo_abierto ? "a-medias" : s.ultimo_conteo === null ? "sin-empezar" : "cerrado";
              const accion = estado === "a-medias" ? "Retomar" : estado === "cerrado" ? "Contar de nuevo" : "Empezar";
              return (
                <Tarjeta key={s.id} como="article" className={clases("contar__sector", estado === "a-medias" && "contar__sector--a-medias")} data-testid="sector">
                  <h3>{s.nombre}</h3>
                  {estado === "a-medias" && <Pastilla tipo="alerta">Conteo a medias</Pastilla>}
                  {estado === "sin-empezar" && <Pastilla>Nunca contado</Pastilla>}
                  {estado === "cerrado" && <Pastilla tipo="bien" icono="tilde">Contado</Pastilla>}
                  <p className="detalle">
                    {estado === "a-medias" ? "Se retoma donde quedó" : s.ultimo_conteo ? contadoCuando(s.ultimo_conteo) : "Sin empezar"}
                  </p>
                  <Boton variante={s.id === aMedias?.id ? "principal" : "secundario"} ancho iconoFinal="flecha" disabled={!enLinea || abriendo !== null} onClick={() => void abrir(s.id)} aria-label={`${accion} ${s.nombre}`} data-testid="abrir-sector">
                    {abriendo === s.id ? "Abriendo…" : accion}
                  </Boton>
                </Tarjeta>
              );
            })}
          </div>
        </>
      )}

      {sectores?.length === 0 && (
        <>
          <Vacio icono="contar" titulo="Todavía no hay sectores" accion={enLinea ? { texto: "Crear el primer sector", icono: "mas", alTocar: () => setNuevo(true) } : undefined} testId="sin-sectores">
            Un sector es un lugar del local: una estantería, una pared, el mostrador. Se cuenta de a uno.
          </Vacio>
          {!enLinea && <Aviso tipo="alerta" titulo="Sin conexión" testId="sin-conexion">Crear un sector necesita internet.</Aviso>}
          {errorAlAbrir && <Aviso tipo="error" titulo="No se pudo abrir el conteo" testId="error-conteo">{errorAlAbrir}</Aviso>}
        </>
      )}

      {nuevo && <NuevoSector existentes={(sectores ?? []).map((s) => s.nombre)} alCerrar={() => setNuevo(false)} alCrear={async (id) => { setNuevo(false); await abrir(id); void cargar(); }} />}
    </Pagina>
  );
}

// ---------------------------------------------------------------- Hoja: nuevo sector

function NuevoSector({ existentes, alCerrar, alCrear }: { existentes: string[]; alCerrar: () => void; alCrear: (id: string) => Promise<void> }) {
  const [nombre, setNombre] = useState("");
  const [revisado, setRevisado] = useState(false);
  const [rechazo, setRechazo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const limpio = nombre.trim();
  const error = limpio === "" ? "Escribí el nombre del sector." : existentes.some((e) => e.toLowerCase() === limpio.toLowerCase()) ? "Ya hay un sector con ese nombre. Poné otro." : rechazo;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (error || ocupado) return;
    setOcupado(true);
    try {
      const { id } = await api<{ id: string }>("/sectores", { method: "POST", body: JSON.stringify({ nombre: limpio }) });
      await alCrear(id);
    } catch (err) {
      setRechazo(mensajeDe(err, "No se creó: se cortó la conexión. Crear un sector necesita internet."));
      setOcupado(false);
    }
  }

  return (
    <Hoja abierta alCerrar={alCerrar} titulo="Nuevo sector" testId="hoja-sector-nuevo">
      <form className="contar__nuevo" onSubmit={(e) => void enviar(e)} noValidate>
        <Campo etiqueta="¿Cómo se llama?" value={nombre} onChange={(e) => { setNombre(e.target.value); setRechazo(null); }} placeholder="Por ejemplo: Pared del fondo" maxLength={80} error={revisado ? error : null} autoFocus data-testid="nombre-sector" />
        <Boton type="submit" variante="principal" tam="grande" ancho disabled={ocupado} data-testid="crear-sector">{ocupado ? "Creando…" : "Crear y empezar a contar"}</Boton>
      </form>
    </Hoja>
  );
}

// ---------------------------------------------------------------- El conteo de un sector

type PropsDeConteo = { conteo: Conteo; alActualizar: (c: Conteo) => void; alVolver: () => void; alCerrar: (hecho: Cerrado) => void };

function ConteoDeSector({ conteo, alActualizar, alVolver, alCerrar }: PropsDeConteo) {
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const { catalogo, stock, error: errorDelCatalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [elegido, setElegido] = useState<Producto | null>(null);
  const [cuantas, setCuantas] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<{ titulo: string; detalle: string } | null>(null);
  const [escaner, setEscaner] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [cierre, setCierre] = useState<{ ocupado: boolean; error: string | null }>({ ocupado: false, error: null });
  // Contados sin conexión: se ven en la lista, marcados, hasta que el servidor los recibe.
  const [enElDispositivo, setEnElDispositivoLocal] = useState<Set<string>>(() => enCurso?.enElDispositivo ?? new Set());
  const buscador = useRef<HTMLInputElement>(null);
  const idResultados = useId();

  function setEnElDispositivo(s: Set<string>) {
    if (enCurso) enCurso.enElDispositivo = s;
    setEnElDispositivoLocal(s);
  }

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, MAXIMO_DE_RESULTADOS) : []), [buscarProductos, consulta]);
  const contadoPorId = useMemo(() => new Map(conteo.renglones.map((r) => [r.producto_id, r])), [conteo.renglones]);
  const conDiferencia = conteo.renglones.filter((r) => Number(r.cantidad_contada) !== Number(r.stock_teorico));
  const faltan = conteo.sin_contar.filter((p) => p.producto_id !== elegido?.id);
  const unidadDe = (productoId: string) => catalogo?.find((p) => p.id === productoId)?.unidad;

  const recargar = useCallback(async () => {
    try { alActualizar(await api<Conteo>(`/conteos/${conteo.id}`)); setEnElDispositivo(new Set()); } catch { /* sin conexión: queda lo que se ve */ }
  }, [conteo.id, alActualizar]);
  // Al volver internet la cola manda lo contado acá; después se trae cómo quedó en el servidor.
  useEffect(() => { if (enLinea && enElDispositivo.size) void enviarPendientes().catch(() => 0).then(recargar); }, [enLinea]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Lo que dice el sistema que hay de un producto. */
  function segunElSistema(productoId: string): number {
    const sabido = contadoPorId.get(productoId)?.stock_teorico ?? conteo.sin_contar.find((s) => s.producto_id === productoId)?.stock_teorico;
    return sabido !== undefined ? Number(sabido) : stock.get(productoId) ?? 0;
  }

  function elegir(p: Producto) {
    const antes = contadoPorId.get(p.id);
    setElegido(p);
    // El número arranca en lo que dice el sistema: si coincide, alcanza con «Siguiente».
    setCuantas(antes ? Number(antes.cantidad_contada) : Math.max(0, segunElSistema(p.id)));
    setConsulta(""); setMarcado(0); setAviso(null);
    window.scrollTo(0, 0);
  }

  function elegirPorId(productoId: string, descripcion: string) {
    const p = catalogo?.find((x) => x.id === productoId);
    if (p) elegir(p);
    else setAviso({ titulo: `«${descripcion}» no está en el catálogo de este dispositivo`, detalle: "Buscalo por el nombre cuando termine de bajar." });
  }

  function leerCodigo(codigo: string) {
    const p = productoPorCodigo(catalogo, codigo);
    if (p) elegir(p);
    else { setAviso({ titulo: `El código ${codigo.trim()} no está en el catálogo`, detalle: "Buscá el producto por el nombre." }); setConsulta(""); }
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    else if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const primero = resultados[Math.min(marcado, resultados.length - 1)];
      if (primero) elegir(primero);
      else if (esCodigo(consulta)) leerCodigo(consulta);
    }
  }

  async function siguiente() {
    if (!elegido || guardando) return;
    setGuardando(true);
    try {
      const { encolado } = await enviarOEncolar("conteo.renglon", "PUT", `/conteos/${conteo.id}/renglones/${elegido.id}`, { cantidad: cuantas });
      setAviso(null);
      if (encolado) {
        // Sin conexión: se muestra lo contado igual; el servidor lo recibe al reconectar.
        const renglon: Renglon = { producto_id: elegido.id, cantidad_contada: String(cuantas), contado_en: new Date().toISOString(), descripcion: elegido.descripcion, marca: elegido.marca, stock_teorico: String(segunElSistema(elegido.id)) };
        alActualizar({ ...conteo, renglones: [renglon, ...conteo.renglones.filter((r) => r.producto_id !== elegido.id)], sin_contar: conteo.sin_contar.filter((s) => s.producto_id !== elegido.id) });
        setEnElDispositivo(new Set(enElDispositivo).add(elegido.id));
      } else await recargar();
      setElegido(null);
      if (!esCelular) window.setTimeout(() => buscador.current?.focus(), 0);
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      setAviso({ titulo: `No se guardó ${elegido.descripcion}`, detalle: err.message });
    } finally {
      setGuardando(false);
    }
  }

  async function quitar(r: Renglon) {
    if (guardando) return;
    setGuardando(true);
    try {
      const { encolado } = await enviarOEncolar("conteo.renglon", "DELETE", `/conteos/${conteo.id}/renglones/${r.producto_id}`, null);
      if (encolado) {
        const vuelve: SinContar = { producto_id: r.producto_id, descripcion: r.descripcion, marca: r.marca, stock_teorico: r.stock_teorico };
        alActualizar({ ...conteo, renglones: conteo.renglones.filter((x) => x.producto_id !== r.producto_id), sin_contar: [vuelve, ...conteo.sin_contar] });
      } else await recargar();
      avisar(`${r.descripcion} salió de lo contado`);
    } catch (err) {
      if (!(err instanceof ErrorApi)) throw err;
      setAviso({ titulo: `No se quitó ${r.descripcion}`, detalle: err.message });
    } finally {
      setGuardando(false);
    }
  }

  // Lo no contado queda como está: se cierra sin poner nada en cero.
  async function cerrar() {
    if (cierre.ocupado) return;
    setCierre({ ocupado: true, error: null });
    try {
      const hecho = await api<Cierre>(`/conteos/${conteo.id}/cerrar`, { method: "POST", body: JSON.stringify({ faltantes_en_cero: false }) });
      alCerrar({ sector: conteo.sector, contados: hecho.contados, ajustes: hecho.ajustados });
    } catch (e) {
      setCierre({ ocupado: false, error: mensajeDe(e, "Se cortó la conexión. Lo contado sigue guardado: probá de nuevo cuando vuelva internet.") });
    }
  }

  const yaContado = elegido ? contadoPorId.get(elegido.id) : undefined;
  const buscando = consulta.trim() !== "";
  const noSePuedeCerrar = !enLinea ? "Cerrar el conteo necesita internet. Lo contado queda guardado en este dispositivo." : enElDispositivo.size > 0 ? `Todavía ${enElDispositivo.size === 1 ? "hay 1 producto contado que no llegó" : `hay ${enElDispositivo.size} productos contados que no llegaron`} al servidor. Esperá un momento y probá de nuevo.` : null;

  return (
    <Pagina titulo={conteo.sector} ancho="angosto" volver={{ texto: "Volver", alTocar: alVolver }} testId="pantalla-contar">
      <div className="contar__conteo">
        {elegido ? (
          <form className="contar__producto" onSubmit={(e) => { e.preventDefault(); void siguiente(); }} data-testid="contando">
            <Boton variante="texto" tam="chico" icono="cerrar" className="contar__otro" onClick={() => { setElegido(null); setAviso(null); }}>Contar otro</Boton>
            <h2>{elegido.descripcion}</h2>
            <p className="detalle">{[elegido.marca, vaConDecimal(elegido.unidad) && `se cuenta por ${nombreDeUnidad(elegido.unidad)}`].filter(Boolean).join(" · ")}</p>
            {yaContado && <Aviso tipo="info" titulo={`Ya lo contaste: pusiste ${numero(yaContado.cantidad_contada)}`} testId="ya-contado">Si seguís, queda la cantidad nueva.</Aviso>}
            <p className="contar__pregunta">¿Cuántas hay?</p>
            <Cantidad key={elegido.id} tam="grande" valor={cuantas} minimo={0} decimal={vaConDecimal(elegido.unidad)} alCambiar={setCuantas} etiqueta={`Cuántas hay de ${elegido.descripcion}`} />
            {aviso && <Aviso tipo="error" titulo={aviso.titulo} testId="error-conteo">{aviso.detalle}</Aviso>}
            <Boton type="submit" variante="principal" tam="grande" ancho iconoFinal="flecha" disabled={guardando} data-testid="siguiente">{guardando ? "Guardando…" : "Siguiente"}</Boton>
          </form>
        ) : (
          <div className="contar__buscar">
            {!catalogo && !errorDelCatalogo && <Cargando texto="Bajando el catálogo…" />}
            {!catalogo && errorDelCatalogo && <Aviso tipo="error" titulo="No se pudo bajar el catálogo">{errorDelCatalogo}</Aviso>}
            {catalogo && (
              <Buscador
                ref={buscador}
                valor={consulta}
                alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
                alTeclear={teclear}
                alEscanear={esCelular ? () => setEscaner(true) : undefined}
                etiqueta="Buscar el producto que vas a contar"
                placeholder={esCelular ? "Buscá o escaneá un producto" : "Escribí el nombre del producto o el código"}
                controla={idResultados}
                activo={resultados.length > 0 ? `${idResultados}-${Math.min(marcado, resultados.length - 1)}` : undefined}
                autoFocus={!esCelular}
              />
            )}
            {aviso && <Aviso tipo="alerta" titulo={aviso.titulo} accion={{ texto: "Entendido", alTocar: () => setAviso(null) }} testId="error-conteo">{aviso.detalle}</Aviso>}

            {buscando && (
              <div className="contar__resultados" id={idResultados} role="listbox" aria-label="Productos encontrados" data-testid="sugerencias">
                {resultados.map((p, i) => (
                  <button key={p.id} type="button" role="option" id={`${idResultados}-${i}`} aria-selected={i === marcado} className={clases("contar__resultado", i === marcado && "contar__resultado--marcado")} onClick={() => elegir(p)} onMouseEnter={() => setMarcado(i)} data-testid="sugerencia">
                    <span><strong>{p.descripcion}</strong><span>{p.marca ?? p.proveedor ?? ""}</span></span>
                    {contadoPorId.has(p.id) && <Pastilla tipo="bien" icono="tilde">Contado</Pastilla>}
                    <Icono nombre="flecha" tam={18} />
                  </button>
                ))}
                {resultados.length === 0 && <p className="contar__sin-resultados">No hay productos con «{consulta.trim()}». Probá con otra palabra.</p>}
              </div>
            )}

            {!buscando && catalogo && conteo.renglones.length === 0 && faltan.length === 0 && (
              <Vacio icono="contar" titulo="Buscá o escaneá el primer producto" testId="conteo-vacio">Poné cuántas hay y tocá «Siguiente». Así con cada producto del sector.</Vacio>
            )}

            {!buscando && faltan.length > 0 && (
              <section className="contar__lista" aria-label="Falta contar">
                <h3>Falta contar en {conteo.sector}</h3>
                <div className="contar__resultados" data-testid="sin-contar">
                  {faltan.map((p) => (
                    <button key={p.producto_id} type="button" className="contar__resultado" onClick={() => elegirPorId(p.producto_id, p.descripcion)}>
                      <span><strong>{p.descripcion}</strong><span>{p.marca ?? ""}</span></span>
                      <Icono nombre="flecha" tam={18} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {conteo.renglones.length > 0 && (
          <section className="contar__lista" aria-label="Ya contados">
            <h3 data-testid="avance">Ya contaste {plural(conteo.renglones.length, "producto", "productos")}</h3>
            <ul className="contar__contados" data-testid="contados">
              {conteo.renglones.map((r) => {
                const hay = Number(r.cantidad_contada);
                const habia = Number(r.stock_teorico);
                return (
                  <li key={r.producto_id} data-testid="contado">
                    <span className="contar__contado-texto">
                      <strong>{r.descripcion}</strong>
                      <span className={clases(hay !== habia && "contar__diferencia")}>{hay === habia ? "Coincide" : `Había ${numero(habia)}, hay ${numero(hay)}`}{enElDispositivo.has(r.producto_id) && " · guardado en el dispositivo"}</span>
                    </span>
                    <strong className="cifra contar__cuanto">{numero(hay)}</strong>
                    <Boton variante="texto" tam="chico" icono="basura" className="contar__quitar" disabled={guardando} aria-label={`Quitar ${r.descripcion} de lo contado`} onClick={() => void quitar(r)} data-testid="quitar-contado" />
                  </li>
                );
              })}
            </ul>
            <Boton ancho onClick={() => { setCierre({ ocupado: false, error: null }); setCerrando(true); }} data-testid="cerrar">Cerrar el conteo</Boton>
          </section>
        )}
      </div>

      <Escaner abierto={escaner} alCerrar={() => setEscaner(false)} alLeer={leerCodigo} />

      <Confirmar abierta={cerrando} titulo={`¿Cerrar el conteo de ${conteo.sector}?`} confirmar={cierre.ocupado ? "Cerrando…" : "Sí, cerrar"} ocupado={cierre.ocupado || noSePuedeCerrar !== null} alCancelar={() => setCerrando(false)} alConfirmar={() => void cerrar()} testId="confirmar-cierre">
        {conDiferencia.length === 0 ? (
          <p>Contaste {plural(conteo.renglones.length, "producto", "productos")} y todo coincide. No se cambia ninguna cantidad.</p>
        ) : (
          <>
            <p>Contaste {plural(conteo.renglones.length, "producto", "productos")}. Al cerrar, el stock de {conDiferencia.length === 1 ? "este" : "estos"} queda como lo contaste:</p>
            <ul className="contar__diferencias" data-testid="diferencias">
              {conDiferencia.map((r) => <li key={r.producto_id}><strong>{r.descripcion}</strong><span>había {numero(r.stock_teorico)}, hay {cantidad(r.cantidad_contada, unidadDe(r.producto_id))}</span></li>)}
            </ul>
          </>
        )}
        <p>{faltan.length > 0 ? `${plural(faltan.length, "producto que no contaste queda", "productos que no contaste quedan")} como ${faltan.length === 1 ? "está" : "están"}. ` : ""}No se puede deshacer.</p>
        {noSePuedeCerrar && <Aviso tipo="alerta" titulo={enLinea ? "Falta enviar lo contado" : "Sin conexión"} testId="cierre-bloqueado">{noSePuedeCerrar}</Aviso>}
        {cierre.error && <Aviso tipo="error" titulo="No se pudo cerrar el conteo" testId="error-cierre">{cierre.error}</Aviso>}
      </Confirmar>
    </Pagina>
  );
}

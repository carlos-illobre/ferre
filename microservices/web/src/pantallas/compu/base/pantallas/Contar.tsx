import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import { abrirConteo, crearSector, ordenarSectores, useConteo, useSectores, type Cierre, type Contado, type Conteo, type Sector } from "../../../../negocio/deposito/conteo";
import { cantidadContada } from "../../../../negocio/deposito/inventario";
import { productoEnMemoria, traerPorCodigo, traerPorIds, useCatalogo } from "../../../../catalogo";
import { escucharPuesto, EVENTO_EMPAREJAMIENTO, pedirLector, puestoLocal } from "../../../../puesto";
import { useTeclasGlobales } from "../../../../plataforma/teclado/teclas";
import { urlDeFoto } from "../../../../api";
import { fecha } from "../../../../formato";
import { abreviarUnidad, conUnidad, enteras, unidadDe } from "../../../../unidades";
import { irA } from "../rutas";
import { Aviso, Boton, Explicado, Hoja, Icono, Pagina, Progreso, Toast, Vacio, numero } from "../ui";
import { BuscadorDeProducto, conSigno, mensajeDe, nombreUnidad, plural, useEnLinea, type Producto } from "./deposito-comun";
import { IconoDeDeposito, type IconoDeDepositoNombre } from "../../../IconoDeDeposito";
import { TEXTOS } from "../../../textos";
import "../estilos/contar.css";
import { AlLadoDeLasPestanas } from "../../../AlLadoDeLasPestanas";

// Contar, como la v2 («Sectores y conteo», decisión 148): arriba cuánto del stock está cargado y
// qué falta contar; a la izquierda los sectores con su estado (en curso, nunca contado, la fecha
// del último conteo); a la derecha el sector elegido. Si tiene un conteo abierto, se cuenta ahí
// mismo: buscar o escanear, «¿Cuántas hay?», Enter y el siguiente, con los contados (y su
// diferencia) al lado de los que faltan. El sector queda abierto hasta cerrarlo; al cerrar, cada
// diferencia contra el sistema pasa a ser un ajuste. Empezar a contar un sector se pide con su
// botón: elegirlo en la lista no abre un conteo. Teclas: Alt C cierra el sector, Alt E le pide
// el lector al celular vinculado.
type Renglon = Contado;
const t = TEXTOS.contar;

const diasDesde = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const cuandoCorto = (iso: string) => (diasDesde(iso) === 0 ? "hoy" : diasDesde(iso) === 1 ? "ayer" : fecha(iso).slice(0, 5));
const claseDif = (dif: number) => (dif === 0 ? "igual" : dif < 0 ? "falta" : "sobra");
const estadoDe = (s: Sector): { clase: string; icono: IconoDeDepositoNombre; texto: string } =>
  s.conteo_abierto ? { clase: "en-curso", icono: "hash", texto: t.enCurso.largo } : s.ultimo_conteo === null ? { clase: "nunca", icono: "circle-dashed", texto: t.nuncaContado.largo } : { clase: "contado", icono: "check", texto: `Contado el ${fecha(s.ultimo_conteo).slice(0, 5)}` };

export function Contar() {
  const enLinea = useEnLinea();
  const { sectores, error: falloDeSectores, recargar: cargarSectores } = useSectores();
  const [elegidoId, setElegidoId] = useState<string | null>(null);
  const [conteo, setConteo] = useState<Conteo | null>(null);
  const [errorAlAbrir, setError] = useState<string | null>(null);
  const error = errorAlAbrir ?? (falloDeSectores && sectores === null ? mensajeDe(falloDeSectores, "Sin conexión: no se pudieron traer los sectores. Revisá internet y tocá «Reintentar».") : null);
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);

  useEffect(() => { if (enLinea && sectores === null) void cargarSectores(); }, [enLinea, sectores, cargarSectores]);

  const ordenados = useMemo(() => ordenarSectores(sectores ?? []), [sectores]);
  // De entrada, el primero de la lista (los que tienen un conteo en curso van primero).
  const elegido = ordenados.find((s) => s.id === elegidoId) ?? ordenados[0] ?? null;

  const abrir = useCallback(async (sectorId: string) => {
    setAbriendo(sectorId);
    try {
      setConteo(await abrirConteo(sectorId));
      setError(null);
    } catch (e) {
      setError(mensajeDe(e, "No se pudo abrir el conteo: empezar o retomar un sector necesita internet. Una vez abierto, se cuenta sin conexión."));
    } finally { setAbriendo(null); }
  }, []);
  // Un sector con el conteo en curso se retoma solo al elegirlo: no cambia nada, solo lo trae.
  useEffect(() => {
    if (!elegido) return;
    if (conteo?.sector_id === elegido.id) return;
    setConteo(null);
    if (elegido.conteo_abierto && enLinea) void abrir(elegido.id);
  }, [elegido, conteo?.sector_id, enLinea, abrir]);

  const total = ordenados.length;
  const contados = ordenados.filter((s) => s.ultimo_conteo !== null).length;
  const nunca = ordenados.filter((s) => s.ultimo_conteo === null && !s.conteo_abierto).length;
  const enCurso = ordenados.filter((s) => s.conteo_abierto).length;

  return (
    <Pagina titulo="Contar" testId="pantalla-contar" className="contar-v2">
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
          <div className="ct-resumenes">
            <div className="ct-resumen" data-testid="stock-cargado">
              <span className="ct-ico"><IconoDeDeposito nombre="layers-3" /></span>
              <span className="ct-res-texto"><span className="ct-et">{t.stockCargado.largo}</span><span className="ct-va">{contados} <small>de {plural(total, "sector", "sectores")}</small></span>
                <span className="ct-riel"><i style={{ width: `${total ? (contados / total) * 100 : 0}%` }} /></span></span>
            </div>
            <div className="ct-resumen urgente" data-testid="nunca-contados">
              <span className="ct-ico"><IconoDeDeposito nombre="circle-dashed" /></span>
              <span className="ct-res-texto"><span className="ct-et">{t.nuncaContados.largo}</span><span className="ct-va">{nunca} <small>{nunca === 1 ? "sector" : "sectores"}</small></span></span>
            </div>
            <div className="ct-resumen" data-testid="conteos-en-curso">
              <span className="ct-ico accion"><IconoDeDeposito nombre="pause" /></span>
              <span className="ct-res-texto"><span className="ct-et">{t.conteosEnCurso.largo}</span><span className="ct-va">{enCurso}</span></span>
            </div>
            <div className="ct-resumen" data-testid="hoy-toca">
              <span className="ct-ico"><IconoDeDeposito nombre="calendar-check" /></span>
              <span className="ct-res-texto"><span className="ct-et">{t.hoyToca.largo}</span><span className="ct-va">— <small>productos</small></span>
                <span className="ct-riel" /></span>
            </div>
          </div>

          <div className="ct-cuerpo">
            <section className="ct-sectores" aria-labelledby="ct-sectores">
              <div className="ct-sectores-cab">
                <h2 id="ct-sectores">{t.sectores.largo} <span className="ct-cuenta">{total}</span></h2>
                <Boton tam="chico" icono="mas" onClick={() => setNuevo(true)} disabled={!enLinea} data-testid="sector-nuevo">{t.nuevo.largo}</Boton>
              </div>
              <ul className="ct-lista" data-testid="sectores">
                {ordenados.map((s) => {
                  const e = estadoDe(s);
                  const abierto = conteo?.sector_id === s.id ? conteo : null;
                  return (
                    <li key={s.id}>
                      <button type="button" className={`ct-sector ${s.id === elegido?.id ? "elegido" : ""}`} aria-current={s.id === elegido?.id} onClick={() => setElegidoId(s.id)} data-testid="sector"
                        aria-label={`${s.nombre}: ${e.texto}`}>
                        <span className={`ct-sector-ico ${e.clase}`}><IconoDeDeposito nombre={e.icono} /></span>
                        <span className="ct-sector-texto"><b>{s.nombre}</b><span><em className={e.clase}>{e.texto}</em> · {abierto ? `${abierto.renglones.length} de ${abierto.renglones.length + abierto.sin_contar.length}` : numero(Number(s.productos))}</span></span>
                        <span className="ct-sector-cuando">{abierto?.abierto_en ? cuandoCorto(abierto.abierto_en) : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="ct-panel" aria-label={elegido?.nombre}>
              {elegido && conteo?.sector_id === elegido.id
                ? <ConteoDeSector key={conteo.id} conteo={conteo} alActualizar={setConteo} alCerrado={() => void cargarSectores()} alOtro={() => { setConteo(null); setElegidoId(ordenados.find((s) => s.id !== elegido.id && !s.conteo_abierto)?.id ?? null); }} />
                : elegido && (
                  <div className="ct-sin-abrir">
                    <h2>{elegido.nombre}</h2>
                    <p className="detalle">{plural(Number(elegido.productos), "producto", "productos")} · {elegido.ultimo_conteo ? `contado por última vez el ${fecha(elegido.ultimo_conteo)}` : "nunca se contó"}</p>
                    {abriendo === elegido.id ? <Progreso texto="Abriendo el conteo…" /> : (
                      <Boton variante="principal" tam="grande" icono="contar" disabled={!enLinea || abriendo !== null} onClick={() => void abrir(elegido.id)} data-testid="abrir-sector" aria-label={`${elegido.conteo_abierto ? "Retomar el conteo de" : "Contar"} ${elegido.nombre}`}>
                        {elegido.conteo_abierto ? "Retomar el conteo" : "Empezar a contar"}
                      </Boton>
                    )}
                    <p className="detalle">Se cuenta de a un producto: lo buscás o lo escaneás, ponés cuántas hay y pasás al siguiente. Al cerrar el sector, las diferencias contra el sistema se ajustan solas.</p>
                  </div>
                )}
            </section>
          </div>
        </>
      )}

      {nuevo && <SectorNuevo alCerrar={() => setNuevo(false)} alCrear={async (idNuevo) => { setNuevo(false); await cargarSectores(); setElegidoId(idNuevo); await abrir(idNuevo); }} />}
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
      await alCrear(await crearSector(nombre));
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

// El conteo abierto del sector elegido, a la derecha de la lista.
function ConteoDeSector({ conteo, alActualizar, alCerrado, alOtro }: { conteo: Conteo; alActualizar: (c: Conteo) => void; alCerrado: () => void; alOtro: () => void }) {
  const enLinea = useEnLinea();
  const { error: errorCatalogo, buscarProductos } = useCatalogo();
  const [consulta, setConsulta] = useState("");
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cantidad, setCantidad] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [resultado, setResultado] = useState<{ cierre: Cierre; ajustes: Renglon[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCantidad, setErrorCantidad] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  // Contados sin conexión: se ven en la lista, marcados, hasta que el servidor los recibe.
  const { contadoPorId, conDiferencia, enElDispositivo, recargar, contar, quitar: quitarDeLoContado, cerrar } = useConteo(conteo, alActualizar);
  const caja = useRef<HTMLInputElement>(null);
  const cajaCantidad = useRef<HTMLInputElement>(null);
  const id = useId();

  const resultados = useMemo(() => (consulta.trim() ? buscarProductos(consulta, 6) : []), [buscarProductos, consulta]);

  // El foco va y vuelve solo: buscador, cantidad, buscador.
  useEffect(() => {
    if (producto) { cajaCantidad.current?.focus(); cajaCantidad.current?.select(); }
    else caja.current?.focus();
  }, [producto]);

  useEffect(() => { if (enLinea && enElDispositivo.size) void recargar(); }, [enLinea, enElDispositivo.size, recargar]);

  const elegir = useCallback((p: Producto) => {
    const previo = contadoPorId.get(p.id);
    setProducto(p); setCantidad(previo ? String(Number(previo.cantidad_contada)).replace(".", ",") : ""); setConsulta(""); setError(null); setErrorCantidad(null);
  }, [contadoPorId]);
  // El producto se pide al servidor si este dispositivo todavía no lo trajo (specs/018).
  const elegirPorId = (productoId: string, descripcion: string) => {
    void traerPorIds([productoId]).then(() => {
      const p = productoEnMemoria(productoId);
      if (p) elegir(p); else setError(`No se pudo traer «${descripcion}»: hace falta internet.`);
    });
  };
  const alDetectar = useCallback((codigo: string) => {
    void traerPorCodigo(codigo).then((p) => {
      if (p) elegir(p); else setError(`El código ${codigo} no está en el catálogo. Buscá el producto por su nombre.`);
    }).catch((e: Error) => setError(e.message));
  }, [elegir]);

  // Lo que lee el celular vinculado elige el producto (decisión 59).
  const [emparejado, setEmparejado] = useState(() => puestoLocal()?.id ?? null);
  useEffect(() => { const mirar = () => setEmparejado(puestoLocal()?.id ?? null); window.addEventListener(EVENTO_EMPAREJAMIENTO, mirar); return () => window.removeEventListener(EVENTO_EMPAREJAMIENTO, mirar); }, []);
  const lector = useRef(alDetectar);
  useEffect(() => { lector.current = alDetectar; }, [alDetectar]);
  useEffect(() => { if (!emparejado || resultado) return; return escucharPuesto(emparejado, (codigo) => lector.current(codigo), undefined, true); }, [emparejado, resultado]);
  const [lectorPedido, setLectorPedido] = useState<boolean | null>(null);
  const pedirAlCelular = useCallback(() => { void pedirLector().then(setLectorPedido); }, []);

  const teclas = useCallback((e: globalThis.KeyboardEvent) => {
    if (document.querySelector("dialog[open]") || !e.altKey || resultado) return;
    if (e.code === "KeyC" && conteo.renglones.length > 0) { e.preventDefault(); setCerrando(true); }
    else if (e.code === "KeyE" && emparejado) { e.preventDefault(); pedirAlCelular(); }
  }, [conteo.renglones.length, emparejado, pedirAlCelular, resultado]);
  useTeclasGlobales(teclas);

  const unidad = unidadDe(producto);
  const leida = producto ? cantidadContada(cantidad, producto) : NaN;

  async function guardar(e?: FormEvent) {
    e?.preventDefault();
    if (!producto || guardando) return;
    if (Number.isNaN(leida)) { setErrorCantidad("Escribí cuántas hay: un número, cero o más."); cajaCantidad.current?.focus(); return; }
    setGuardando(true);
    try {
      await contar(producto, leida);
      setError(null); setProducto(null); setCantidad("");
    } catch (err) {
      setError(`No se guardó ${producto.descripcion}: ${(err as Error).message}`);
    } finally { setGuardando(false); }
  }

  async function quitar() {
    if (!producto || guardando) return;
    setGuardando(true);
    try {
      await quitarDeLoContado(producto);
      setMensaje(`${producto.descripcion} salió de lo contado.`);
      setProducto(null); setCantidad(""); setError(null);
    } catch (err) {
      setError(`No se quitó ${producto.descripcion}: ${(err as Error).message}`);
    } finally { setGuardando(false); }
  }

  if (resultado) {
    const { cierre, ajustes } = resultado;
    return (
      <div className="ct-conteo">
        <section className="contar-resultado">
          <div className="contar-tilde"><Icono nombre="tilde" tam={34} grosor={3} /></div>
          <h2>{conteo.sector}: conteo cerrado</h2>
          <p role="status" data-testid="resultado-conteo">{plural(cierre.contados, "producto contado", "productos contados")}, {cierre.ajustados} con diferencia ajustada{cierre.puestos_en_cero ? `, ${plural(cierre.puestos_en_cero, "puesto", "puestos")} en cero` : ""}.</p>
          <div className="contar-resultado-botones">
            <Boton variante="principal" tam="grande" autoFocus onClick={alOtro} data-testid="otro-sector">Contar otro sector</Boton>
            <Boton icono="stock" onClick={() => irA("stock")}>Ver el stock</Boton>
          </div>
        </section>
        {ajustes.length > 0 ? (
          <section className="contar-ajustes" aria-labelledby={`${id}-ajustes`}>
            <h3 id={`${id}-ajustes`} className="ct-col-titulo">Ajustes que se aplicaron al stock</h3>
            <ul className="ct-renglones" data-testid="ajustes">
              {ajustes.map((r) => {
                const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
                return (
                  <li key={r.producto_id} className="ct-renglon">
                    <FotoChica id={r.producto_id} />
                    <span className="ct-r-texto"><b>{r.descripcion}</b><span>Había {conUnidad(r.stock_teorico, r.unidad)}, hay {conUnidad(r.cantidad_contada, r.unidad)}</span></span>
                    <span className={`ct-dif ${claseDif(dif)}`}><b>{conSigno(dif)}</b><small>{abreviarUnidad(r.unidad || "unidad")}</small></span>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : <p className="detalle">Todo lo contado coincidía con el sistema: no hizo falta ningún ajuste.</p>}
      </div>
    );
  }

  const previo = producto ? contadoPorId.get(producto.id) : undefined;
  const totalDelSector = conteo.renglones.length + conteo.sin_contar.length;

  return (
    <div className="ct-conteo" data-testid="conteo">
      <AlLadoDeLasPestanas>
        <div className="ct-acciones">
          {emparejado && <Boton tam="chico" onClick={pedirAlCelular} data-testid="pedir-lector"><IconoDeDeposito nombre="scan-barcode" tam={16} />{t.escanearConElCelular.largo} <kbd className="tecla">Alt E</kbd></Boton>}
          <Boton tam="chico" variante="principal" className="ct-cerrar" disabled={conteo.renglones.length === 0} onClick={() => setCerrando(true)} data-testid="cerrar"><IconoDeDeposito nombre="square-check-big" tam={16} />{t.cerrarElSector.largo} <kbd className="tecla">Alt C</kbd></Boton>
        </div>
      </AlLadoDeLasPestanas>
      <div className="ct-cab">
        <div><h2>{conteo.sector}</h2><p className="detalle">{conteo.abierto_en ? `Abierto el ${fecha(conteo.abierto_en)} · ` : ""}lo seguís desde acá o desde el celular</p></div>
        <div className="ct-avance" data-testid="avance">
          <span><span>{t.contados.largo}</span><b>{conteo.renglones.length} <small>de {totalDelSector}</small></b></span>
          <span className="ct-riel oscuro"><i style={{ width: `${totalDelSector ? (conteo.renglones.length / totalDelSector) * 100 : 0}%` }} /></span>
          {conDiferencia.length > 0 && <span className="ct-con-dif">{plural(conDiferencia.length, "con diferencia", "con diferencia")}</span>}
        </div>
      </div>
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea ? "Sin conexión: seguí contando. Lo contado queda guardado en este dispositivo y se manda solo al volver internet; cerrar el sector necesita conexión." : null}</Aviso>
      <Aviso tipo="error">{errorCatalogo}</Aviso>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      {lectorPedido !== null && <Aviso tipo={lectorPedido ? "info" : "alerta"}>{lectorPedido ? "Abrí Ferrebress en el celular y tocá «Abrir el lector»." : "No se pudo avisar al celular."}</Aviso>}

      <div className="ct-buscar">
        <BuscadorDeProducto consulta={consulta} alCambiar={(v) => { setConsulta(v); setError(null); }} resultados={resultados} alElegir={elegir} cajaRef={caja}
          placeholder={t.buscar.largo}
          aLaDerecha={(p) => (contadoPorId.has(p.id) ? <span className="ct-pastilla">Ya contado: {conUnidad(contadoPorId.get(p.id)!.cantidad_contada, p.unidad)}</span> : null)} />
        {!consulta && <span className="ct-ayuda detalle" aria-hidden="true">{t.ayudaBuscar.largo}</span>}
      </div>
      <Aviso tipo="error" testId="error-conteo">{error}</Aviso>

      {producto && (
        <form className="ct-contando" onSubmit={guardar} noValidate data-testid="contando" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setProducto(null); } }}>
          <FotoChica id={producto.id} grande />
          <div className="ct-contando-texto">
            <b>{producto.descripcion}</b>
            <span className="detalle">{[producto.marca, producto.codigo_proveedor && `Cód. ${producto.codigo_proveedor}`].filter(Boolean).join(" · ") || "Sin marca"}</span>
            {previo && <span className="ct-previo" data-testid="ya-contado"><IconoDeDeposito nombre="history" tam={16} />Antes {conUnidad(previo.cantidad_contada, previo.unidad)}: lo que pongas lo reemplaza</span>}
          </div>
          <label className="ct-cuantas" htmlFor={`${id}-cantidad`}>
            <span>¿Cuántas hay?</span>
            <input ref={cajaCantidad} id={`${id}-cantidad`} inputMode={enteras(unidad) ? "numeric" : "decimal"} enterKeyHint="next" autoComplete="off" placeholder="0" value={cantidad}
              onChange={(e) => { setCantidad(e.target.value.replace(enteras(unidad) ? /[^\d]/g : /[^\d,.]/g, "")); setErrorCantidad(null); }}
              aria-invalid={Boolean(errorCantidad)} aria-describedby={errorCantidad ? `${id}-falta` : undefined} data-testid="cantidad" />
            <small>{nombreUnidad(unidad)}</small>
          </label>
          <Boton type="submit" variante="marino" className="ct-siguiente" disabled={guardando} data-testid="siguiente">{guardando ? "Guardando…" : "Siguiente"} <kbd className="tecla">Enter</kbd></Boton>
          <div className="ct-contando-pie">
            {errorCantidad && <p className="contar-falta" id={`${id}-falta`} role="alert">{errorCantidad}</p>}
            {!enteras(unidad) && <span className="detalle">En {nombreUnidad(unidad)}, con un decimal.</span>}
            <Boton tam="chico" onClick={() => setProducto(null)} disabled={guardando}>Cancelar <kbd className="tecla">Esc</kbd></Boton>
            {previo && <Boton variante="peligro" tam="chico" icono="basura" onClick={() => void quitar()} disabled={guardando} data-testid="quitar-contado">Quitar de lo contado</Boton>}
          </div>
        </form>
      )}

      <div className="ct-columnas">
        <section aria-labelledby={`${id}-contados`}>
          <div className="ct-col-cab"><h3 id={`${id}-contados`} className="ct-col-titulo">{t.contados.largo} <span className="ct-cuenta">{conteo.renglones.length}</span></h3><span className="detalle">el último arriba</span></div>
          {conteo.renglones.length === 0 ? (
            <Vacio icono="contar" titulo="Buscá o escaneá el primer producto">Empezá por una punta de la estantería y andá de a un producto.</Vacio>
          ) : (
            <ul className="ct-renglones" data-testid="contados">
              {conteo.renglones.map((r) => {
                const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
                return (
                  <li key={r.producto_id} data-testid="contado" className={`ct-renglon ${producto?.id === r.producto_id ? "elegido" : ""}`}>
                    <button type="button" className="ct-r-boton" onClick={() => elegirPorId(r.producto_id, r.descripcion)} aria-label={`${r.descripcion}: hay ${conUnidad(r.cantidad_contada, r.unidad)}. Corregir`}>
                      <FotoChica id={r.producto_id} />
                      <span className="ct-r-texto"><b>{r.descripcion}</b><span>Contaste {conUnidad(r.cantidad_contada, r.unidad)} · había {numero(Number(r.stock_teorico))}{enElDispositivo.has(r.producto_id) && " · se manda al volver internet"}</span></span>
                    </button>
                      {dif === 0 ? <span className="ct-dif igual" title="Coincide con el sistema"><b>=</b><small>igual</small></span> : (
                        <span className={`ct-dif ${claseDif(dif)}`}>
                          <Explicado valor={conSigno(dif)} titulo={`Diferencia de ${r.descripcion}`} pasos={[`Según el sistema había ${conUnidad(r.stock_teorico, r.unidad)}.`, `Contaste ${conUnidad(r.cantidad_contada, r.unidad)}.`, `Diferencia: ${conSigno(dif)}. Al cerrar el sector se aplica al stock como un ajuste.`]} />
                          <small>{Number.isInteger(dif) ? "ajusta" : abreviarUnidad(r.unidad || "unidad")}</small>
                        </span>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section aria-labelledby={`${id}-sin-contar`} data-testid="sin-contar">
          <div className="ct-col-cab"><h3 id={`${id}-sin-contar`} className="ct-col-titulo">{t.sinContar.largo} <span className="ct-cuenta urgente">{conteo.sin_contar.length}</span></h3><span className="detalle">tocá uno para contarlo</span></div>
          {conteo.sin_contar.length === 0 ? <p className="detalle">Ya contaste todo el sector.</p> : (
            <ul className="ct-renglones">
              {conteo.sin_contar.map((p) => (
                <li key={p.producto_id}>
                  <button type="button" className="ct-renglon" onClick={() => elegirPorId(p.producto_id, p.descripcion)} aria-label={`Contar ${p.descripcion}`}>
                    <FotoChica id={p.producto_id} />
                    <span className="ct-r-texto"><b>{p.descripcion}</b><span>{[p.marca, `el sistema dice ${conUnidad(p.stock_teorico, p.unidad)}`].filter(Boolean).join(" · ")}</span></span>
                    <IconoDeDeposito nombre="chevron-right" className="ct-flecha" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {cerrando && (
        <CerrarSector conteo={conteo} cerrarConteo={cerrar} conDiferencia={conDiferencia.length} enLinea={enLinea} pendientes={enElDispositivo.size} alCerrar={() => setCerrando(false)}
          alCerrado={(cierre) => { setCerrando(false); setResultado({ cierre, ajustes: conDiferencia }); alCerrado(); }} />
      )}
    </div>
  );
}

// La foto del producto si este dispositivo la tiene; si no, el ícono de la v2.
function FotoChica({ id, grande }: { id: string; grande?: boolean }) {
  const url = urlDeFoto(productoEnMemoria(id)?.foto_url ?? null);
  return <span className={`ct-foto ${grande ? "grande" : ""}`}>{url ? <img src={url} alt="" loading="lazy" /> : <IconoDeDeposito nombre="hash" tam={grande ? 22 : 18} />}</span>;
}

// Cerrar no se deshace: antes muestra qué se contó, qué tiene diferencia y qué quedó sin
// contar, y las dos salidas se leen completas.
function CerrarSector({ conteo, cerrarConteo, conDiferencia, enLinea, pendientes, alCerrar, alCerrado }: { conteo: Conteo; cerrarConteo: (faltantesEnCero: boolean) => Promise<Cierre>; conDiferencia: number; enLinea: boolean; pendientes: number; alCerrar: () => void; alCerrado: (c: Cierre) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltan = conteo.sin_contar.length;
  const bloqueado = ocupado || !enLinea || pendientes > 0;
  async function cerrar(faltantesEnCero: boolean) {
    if (bloqueado) return;
    setOcupado(true); setError(null);
    try {
      alCerrado(await cerrarConteo(faltantesEnCero));
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

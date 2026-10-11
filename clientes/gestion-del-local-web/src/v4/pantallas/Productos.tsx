import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { precioDeVenta } from "@ferre/calculo-de-precios";
import { descargar, ErrorApi, subirFoto } from "../../api";
import { useCatalogo } from "../../catalogo";
import type { Producto } from "../../pantallas/Productos";
import { useConexion } from "../conexion";
import { fecha, MARGENES, pesos, pesosConCentavos, porUnidad, vaConDecimal } from "../formato";
import { Aviso, Boton, Buscador, Campo, Cargando, clases, ErrorDeCarga, Explicado, FotoDeProducto, Hoja, Icono, Margenes, Pagina, Pastilla, Vacio } from "../piezas";
import { cambiarParametro, ir, useEsCelular, useParametro } from "../rutas";
import "../estilos/productos.css";

// Productos: un buscador sobre el catálogo guardado en el dispositivo (al instante, también
// sin internet) y una lista con lo justo. Todo lo demás está en la ficha, que se abre al tocar.

type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url">> & { proveedor_preferido_id?: string };
type Actualizar = (id: string, cambios: Cambios) => Promise<{ encolado: boolean }>;

/** De a cuántos se muestran: el catálogo tiene miles y se traen más al llegar al final. */
const TANDA = 30;
/** Cuánto se espera después de la última tecla de «otro porcentaje» para guardarlo. */
const ESPERA_DE_OTRO = 700;

function precioDe(p: Producto, margen: number | null = p.margen_elegido) {
  if (p.costo_neto === null || margen === null) return null;
  return precioDeVenta({ costoNeto: Number(p.costo_neto), margen, iva: p.iva === null ? 0.21 : Number(p.iva) });
}

const esDeLosCinco = (margen: number | null) => margen !== null && (MARGENES as readonly number[]).includes(margen);

// ---------------------------------------------------------------- Pantalla

export function Productos() {
  // «Reintentar» vuelve a montar la pantalla: el catálogo se pide de nuevo.
  const [intento, setIntento] = useState(0);
  return <Catalogo key={intento} alReintentar={() => setIntento((n) => n + 1)} />;
}

function Catalogo({ alReintentar }: { alReintentar: () => void }) {
  const { catalogo, error, buscarProductos, actualizarProducto } = useCatalogo();
  const { enLinea } = useConexion();
  const esCelular = useEsCelular();
  const abiertoId = useParametro("producto");

  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [limite, setLimite] = useState(TANDA);
  const buscador = useRef<HTMLInputElement>(null);
  const centinela = useRef<HTMLDivElement>(null);
  const idLista = useId();

  const buscando = consulta.trim() !== "";
  const lista = useMemo(() => (buscando ? buscarProductos(consulta, limite) : (catalogo ?? []).slice(0, limite)), [buscando, buscarProductos, consulta, limite, catalogo]);
  const hayMas = lista.length === limite;
  const elMarcado = Math.min(marcado, lista.length - 1);
  const abierto = (abiertoId && catalogo?.find((p) => p.id === abiertoId)) || null;

  // Al llegar al final de los que están a la vista se trae otra tanda.
  useEffect(() => {
    const el = centinela.current;
    if (!el || !hayMas) return;
    const observador = new IntersectionObserver((entradas) => { if (entradas.some((e) => e.isIntersecting)) setLimite((l) => l + TANDA); }, { rootMargin: "300px" });
    observador.observe(el);
    return () => observador.disconnect();
  }, [hayMas, lista.length]);

  // El marcado con las flechas queda siempre a la vista.
  useEffect(() => {
    if (!esCelular) document.getElementById(`${idLista}-${elMarcado}`)?.scrollIntoView?.({ block: "nearest" });
  }, [elMarcado, esCelular, idLista]);

  function escribir(texto: string) {
    setConsulta(texto);
    setMarcado(0);
    setLimite(TANDA);
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado(Math.min(elMarcado + 1, lista.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado(Math.max(elMarcado - 1, 0)); }
    if (e.key === "Escape" && consulta !== "") { e.preventDefault(); escribir(""); }
    if (e.key === "Enter") {
      e.preventDefault();
      const elegido = lista[elMarcado];
      if (elegido) cambiarParametro("producto", elegido.id);
    }
  }

  return (
    <Pagina titulo="Productos" testId="productos">
      <div className="productos">
        {!catalogo && !error && <Cargando texto="Bajando el catálogo…" detalle="Es solo la primera vez. Después se busca al instante, también sin internet." />}
        {!catalogo && error && <ErrorDeCarga titulo="No se pudo bajar el catálogo" alReintentar={alReintentar}>{error}</ErrorDeCarga>}

        {catalogo && catalogo.length === 0 && (
          <Vacio icono="productos" titulo="Todavía no hay productos" principal={{ texto: "Cargar una lista de precios", icono: "listas", alTocar: () => ir("listas") }} testId="sin-productos">Los productos entran solos al cargar la lista de precios de un proveedor.</Vacio>
        )}

        {catalogo && catalogo.length > 0 && (
          <>
            <Buscador
              ref={buscador}
              valor={consulta}
              alCambiar={escribir}
              alTeclear={teclear}
              etiqueta="Buscar un producto"
              placeholder={esCelular ? "Buscá por nombre, marca o código" : "Escribí el nombre del producto, la marca o el código"}
              controla={idLista}
              activo={lista.length > 0 ? `${idLista}-${elMarcado}` : undefined}
              autoFocus={!esCelular}
            />

            {error && <Aviso tipo="alerta" titulo="No se pudo actualizar el catálogo" testId="error-catalogo">{error}. Se usa el que está guardado en este dispositivo.</Aviso>}

            {lista.length === 0 && (
              <Vacio icono="buscar" titulo={`No hay productos con «${consulta.trim()}»`} accion={{ texto: "Borrar lo escrito", alTocar: () => { escribir(""); buscador.current?.focus(); } }} testId="sin-resultados">
                Probá con menos palabras, con la marca o con el código del proveedor.
              </Vacio>
            )}

            {lista.length > 0 && (
              <div className="productos__lista" id={idLista} role="listbox" aria-label="Productos" data-testid="resultados">
                {lista.map((p, i) => {
                  const precio = precioDe(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      id={`${idLista}-${i}`}
                      aria-selected={!esCelular && i === elMarcado}
                      className={clases("productos__renglon", !precio && "productos__renglon--sin-precio", !esCelular && i === elMarcado && "productos__renglon--marcado")}
                      onClick={() => { setMarcado(i); cambiarParametro("producto", p.id); }}
                      data-testid="producto"
                    >
                      <FotoDeProducto producto={p} />
                      <span className="productos__nombre"><strong>{p.descripcion}</strong><span>{p.marca}</span></span>
                      {precio ? (
                        <span className="productos__precio"><strong className="cifra">{pesos(precio.valor)}</strong>{vaConDecimal(p.unidad) && <span>{porUnidad(p.unidad)}</span>}</span>
                      ) : (
                        <span className="productos__precio"><Pastilla tipo="alerta" icono="alerta" testId="sin-precio">Sin precio todavía</Pastilla></span>
                      )}
                      <Icono nombre="flecha" tam={18} className="productos__flecha" />
                    </button>
                  );
                })}
              </div>
            )}
            {hayMas && <div ref={centinela} className="productos__teclas" data-testid="cargar-mas">Trayendo más productos…</div>}

            {lista.length > 0 && !esCelular && <p className="productos__teclas" data-testid="teclas">Las flechas cambian el marcado · Enter abre el producto</p>}
          </>
        )}
      </div>

      <Ficha
        producto={abierto}
        enLinea={enLinea}
        actualizar={actualizarProducto}
        alCerrar={() => { cambiarParametro("producto", null); if (!esCelular) buscador.current?.focus(); }}
      />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Ficha del producto

type PropsDeFicha = { producto: Producto | null; enLinea: boolean; actualizar: Actualizar; alCerrar: () => void };

function Ficha({ producto, ...resto }: PropsDeFicha) {
  if (!producto) return <Hoja abierta={false} alCerrar={resto.alCerrar} titulo="Producto">{null}</Hoja>;
  return <FichaAbierta key={producto.id} producto={producto} {...resto} />;
}

type Proveedor = NonNullable<Producto["proveedores"]>[number];

function FichaAbierta({ producto: p, enLinea, actualizar, alCerrar }: PropsDeFicha & { producto: Producto }) {
  // «Otro porcentaje» muestra el del producto si no es uno de los cinco.
  const [otro, setOtro] = useState(() => (p.margen_elegido !== null && !esDeLosCinco(p.margen_elegido) ? String(p.margen_elegido) : ""));
  /** El porcentaje escrito que todavía no se guardó: el precio ya lo muestra. */
  const [porGuardar, setPorGuardar] = useState<number | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fotoGrande, setFotoGrande] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [fotoGuardada, setFotoGuardada] = useState(false);
  const archivo = useRef<HTMLInputElement>(null);
  // Al abrirse, la hoja le da el foco a su primer campo. Acá ese campo es «Otro porcentaje» y
  // en el celular abriría el teclado en cada ficha: se habilita recién después de abrir.
  const [abierta, setAbierta] = useState(false);
  useEffect(() => { setAbierta(true); }, []);

  const margen = porGuardar ?? p.margen_elegido;
  const precio = precioDe(p, margen);
  const costo = p.costo_neto === null ? null : Number(p.costo_neto);
  const tieneFoto = Boolean(p.foto_url);

  // Del más barato al más caro. Un producto viejo en el dispositivo puede no traer la lista entera.
  const deQuien: Proveedor[] = p.proveedores?.length
    ? [...p.proveedores].sort((a, b) => Number(a.costo_neto) - Number(b.costo_neto))
    : p.proveedor && p.costo_neto !== null ? [{ proveedor_id: "", proveedor: p.proveedor, costo_neto: p.costo_neto, fecha_lista: p.fecha_lista ?? "", codigo_proveedor: p.codigo_proveedor ?? "" }] : [];
  const varios = deQuien.length > 1;

  function guardar(cambios: Cambios, texto: string) {
    setError(null);
    setGuardado(texto);
    actualizar(p.id, cambios)
      .then(({ encolado }) => { if (encolado) setGuardado(`${texto}. Se envía cuando vuelva internet.`); })
      .catch((e: unknown) => { setGuardado(null); setError(`No se pudo guardar el cambio: ${e instanceof Error ? e.message : "error"}. Probá de nuevo.`); });
  }

  // ---- Margen

  const reloj = useRef<number | null>(null);
  const pendiente = useRef<number | null>(null);
  function guardarOtro() {
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = null;
    const valor = pendiente.current;
    pendiente.current = null;
    if (valor === null) return;
    setPorGuardar(null);
    if (valor !== p.margen_elegido) guardar({ margen_elegido: valor }, `Guardado: margen de ${valor} %`);
  }
  // Si se cierra la ficha con un porcentaje a medio guardar, se guarda igual.
  const alSalir = useRef(guardarOtro);
  alSalir.current = guardarOtro;
  useEffect(() => () => alSalir.current(), []);

  function elegirMargen(valor: number) {
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = null; pendiente.current = null;
    setPorGuardar(null);
    setOtro("");
    guardar({ margen_elegido: valor }, `Guardado: margen de ${valor} %`);
  }

  function escribirOtro(texto: string) {
    const limpio = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4);
    setOtro(limpio);
    if (reloj.current !== null) window.clearTimeout(reloj.current);
    reloj.current = null;
    if (limpio === "") { pendiente.current = null; setPorGuardar(null); return; }
    pendiente.current = Number(limpio);
    setPorGuardar(Number(limpio));
    reloj.current = window.setTimeout(guardarOtro, ESPERA_DE_OTRO);
  }

  // ---- Proveedor, planilla y foto

  function usar(de: Proveedor) {
    guardar({ proveedor_preferido_id: de.proveedor_id }, `Guardado: se usa el costo de ${de.proveedor}`);
  }

  function bajarPlanilla() {
    setError(null);
    descargar(`/listas/${p.lista_importada_id}/archivo`, `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`)
      .catch((e: unknown) => setError(e instanceof ErrorApi ? `No se pudo bajar la planilla: ${e.message}.` : "Para bajar la planilla hace falta internet. Probá de nuevo cuando vuelva."));
  }

  async function alElegirFoto(e: ChangeEvent<HTMLInputElement>) {
    const elegida = e.target.files?.[0];
    e.target.value = "";
    if (!elegida) return;
    setSubiendo(true); setError(null); setFotoGuardada(false);
    try {
      const foto_url = await subirFoto(p.id, elegida);
      await actualizar(p.id, { foto_url });
      setFotoGuardada(true);
    } catch (err) {
      setError(err instanceof ErrorApi ? `No se pudo guardar la foto: ${err.message}.` : "Para guardar la foto hace falta internet. Probá de nuevo cuando vuelva.");
    } finally {
      setSubiendo(false);
    }
  }
  const sacarFoto = () => archivo.current?.click();

  const foto = <FotoDeProducto producto={p} tam="mediana" />;
  const textoDeFoto = subiendo ? "Guardando la foto…" : tieneFoto ? "Sacar otra foto" : "Sacar una foto";

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={p.descripcion} testId="ficha-producto" pie={<>
      {/* Fuera del cuerpo de la hoja: no es un campo al que tenga que ir el foco al abrir. */}
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void alElegirFoto(e)} data-testid="archivo-foto" />
      <Boton onClick={alCerrar} data-testid="listo">Listo</Boton>
    </>}>
      <div className="productos__ficha">
        <p className="productos__marca">{[p.marca, p.codigo_proveedor && `código ${p.codigo_proveedor}`].filter(Boolean).join(" · ") || "Sin marca ni código"}</p>

        {error && <Aviso tipo="error" testId="error-ficha">{error}</Aviso>}

        {/* ---- Precio y margen ---- */}
        <section className="productos__precio-de-venta" aria-label="Precio de venta">
          <h3>Precio de venta</h3>
          {precio ? (
            <>
              <div className="productos__grande" data-testid="precio">
                <Explicado className="cifra" valor={pesos(precio.valor)} pasos={precio.pasos} titulo={p.descripcion} />
                {vaConDecimal(p.unidad) && <span>{porUnidad(p.unidad)}</span>}
              </div>
              <p className="detalle">Tocá el precio para ver de dónde sale.</p>
            </>
          ) : costo === null ? (
            <Aviso tipo="alerta" titulo="Sin costo todavía" testId="sin-costo">Ningún proveedor lo trae en su lista. Cuando cargues una lista que lo tenga, se le puede poner precio.</Aviso>
          ) : (
            <Aviso tipo="alerta" titulo="Sin precio todavía" testId="sin-precio">Elegí el margen y queda con precio.</Aviso>
          )}

          {costo !== null && (
            <div className="productos__margen">
              <h4>Margen</h4>
              <Margenes etiqueta={`Margen de ${p.descripcion}`} elegido={esDeLosCinco(margen) ? margen : null} alElegir={elegirMargen} />
              <Campo
                className={clases("productos__otro", margen !== null && !esDeLosCinco(margen) && "productos__otro--elegido")}
                etiqueta="Otro porcentaje"
                sufijo="%"
                inputMode="numeric"
                value={otro}
                disabled={!abierta}
                onChange={(e) => escribirOtro(e.target.value)}
                onBlur={guardarOtro}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); guardarOtro(); } }}
                data-testid="otro-margen"
              />
              <p className="productos__guardado" role="status" data-testid="guardado">
                {guardado ? <><Icono nombre="tilde" tam={18} grosor={2.4} />{guardado}</> : "Lo que elijas cambia el precio en el momento y queda guardado."}
              </p>
            </div>
          )}
        </section>

        {/* ---- Costo ---- */}
        {costo !== null && (
          <div className="productos__costo" data-testid="costo">
            <span><strong>Costo</strong><span>Sin IVA{p.proveedor ? `, según la lista de ${p.proveedor}` : ""}</span></span>
            <Explicado className="cifra" valor={pesosConCentavos(costo)} pasos={p.explicacion_costo.length ? p.explicacion_costo : [`Costo ${pesosConCentavos(costo)} según la lista del proveedor`]} titulo={`Costo de ${p.descripcion}`} />
          </div>
        )}

        {/* ---- Quién lo vende ---- */}
        {deQuien.length > 0 && (
          <section aria-labelledby="productos-quien">
            <h3 id="productos-quien">Quién lo vende</h3>
            <ul className="productos__proveedores" data-testid="otros-proveedores">
              {deQuien.map((de, i) => {
                const usado = de.proveedor === p.proveedor;
                return (
                  <li key={de.proveedor_id || de.proveedor} className={clases("productos__proveedor", usado && varios && "productos__proveedor--en-uso")} data-testid="proveedor-de-producto">
                    <span className="productos__proveedor-texto">
                      <strong>{de.proveedor}</strong>
                      {de.fecha_lista && <span>Lista del {fecha(de.fecha_lista)}</span>}
                      {varios && i === 0 && <Pastilla tipo="bien" testId="mas-barato">El más barato</Pastilla>}
                    </span>
                    <strong className="cifra productos__proveedor-costo">{pesosConCentavos(de.costo_neto)}</strong>
                    {varios && (usado
                      ? <span className="productos__en-uso" data-testid="en-uso"><Icono nombre="tilde" tam={18} grosor={2.4} />En uso</span>
                      : <Boton tam="chico" disabled={!enLinea} aria-label={`Usar el costo de ${de.proveedor}`} onClick={() => usar(de)} data-testid="usar-este">Usar este</Boton>)}
                  </li>
                );
              })}
            </ul>
            {varios && !enLinea && <p className="detalle productos__nota">Para cambiar de proveedor hace falta internet.</p>}
            {p.lista_importada_id && p.fecha_lista && (
              <Boton variante="texto" tam="chico" icono="bajar" className="productos__planilla" onClick={bajarPlanilla} data-testid="bajar-lista">
                Bajar la planilla de la lista del {fecha(p.fecha_lista)}
              </Boton>
            )}
          </section>
        )}

        {/* ---- Foto ---- */}
        <section aria-labelledby="productos-foto">
          <h3 id="productos-foto">Foto</h3>
          <div className="productos__foto-fila">
            {tieneFoto
              ? <button type="button" className="productos__foto-boton" aria-label="Ver la foto más grande" onClick={() => setFotoGrande(true)} data-testid="ver-foto">{foto}</button>
              : foto}
            <div>
              <p className="detalle">{!enLinea ? "Para guardar una foto hace falta internet." : tieneFoto ? "Tocá la foto para verla más grande." : "Todavía no tiene foto. Ayuda a reconocerlo en el mostrador."}</p>
              <Boton tam="chico" icono="camara" disabled={subiendo || !enLinea} onClick={sacarFoto} data-testid="sacar-foto">{textoDeFoto}</Boton>
              {fotoGuardada && <p className="productos__guardado" role="status" data-testid="foto-guardada"><Icono nombre="tilde" tam={18} grosor={2.4} />Foto guardada</p>}
            </div>
          </div>
        </section>
      </div>

      <Hoja abierta={fotoGrande} alCerrar={() => setFotoGrande(false)} titulo={`Foto de ${p.descripcion}`} testId="hoja-foto" pie={<>
        <Boton icono="camara" disabled={subiendo || !enLinea} onClick={() => { setFotoGrande(false); sacarFoto(); }}>Sacar otra foto</Boton>
        <Boton onClick={() => setFotoGrande(false)}>Cerrar</Boton>
      </>}>
        <FotoDeProducto producto={p} tam="grande" />
      </Hoja>
    </Hoja>
  );
}

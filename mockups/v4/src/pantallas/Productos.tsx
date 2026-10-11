import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cambiarProducto, proveedorActual, useAlmacen } from "../almacen";
import { buscarProductos, IVA, MARGENES, pesos, pesosConCentavos, porUnidad, precioDe, proveedorDe, type CostoDeProveedor, type Producto } from "../datos";
import {
  Aviso, avisar, Boton, Buscador, Campo, Cargando, clases, ErrorDeCarga, Explicado, Hoja, Icono, Margenes, Pagina, Pastilla, Vacio,
  useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, ir, useEsCelular, useParametro } from "../ruta";
import "../estilos/productos.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "vacio", nombre: "Catálogo vacío" },
  { clave: "cargando", nombre: "Bajando el catálogo" },
  { clave: "error", nombre: "No se pudo bajar el catálogo" },
];

// ---------------------------------------------------------------- Datos que le faltan a lo compartido

/** De cuándo es la última lista de un proveedor y cómo vienen sus precios: sale del almacén (lo cambia Listas). */
function listaDe(proveedorId: string): { diasAtras: number; conIva: boolean; descuento: number } {
  const proveedor = proveedorActual(proveedorId);
  return { diasAtras: proveedor?.diasDeLaLista ?? 1, conIva: proveedor?.conIva ?? false, descuento: proveedor?.descuento ?? 0 };
}

const CON_FOTO_AL_EMPEZAR = ["mecha-6-madera", "taladro-18v", "llave-francesa-10"];

/** "25/09/2026". */
function fechaDeLista(proveedorId: string): string {
  const momento = new Date();
  momento.setDate(momento.getDate() - listaDe(proveedorId).diasAtras);
  return momento.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Los pasos del costo: del precio de la planilla al costo sin IVA y con el descuento del proveedor. */
function pasosDelCosto(de: CostoDeProveedor): string[] {
  const nombre = proveedorDe(de.proveedorId)?.nombre ?? "el proveedor";
  const como = listaDe(de.proveedorId);
  const sinIva = de.costo / (1 - como.descuento / 100);
  const enLaLista = como.conIva ? sinIva * (1 + IVA / 100) : sinIva;
  const pasos = [`Precio en la lista de ${nombre} del ${fechaDeLista(de.proveedorId)}: ${pesosConCentavos(enLaLista)}`];
  if (como.conIva) pasos.push(`Sin el IVA de ${IVA} %, que la lista trae incluido: ${pesosConCentavos(sinIva)}`);
  if (como.descuento > 0) pasos.push(`Con el descuento de ${como.descuento} % que hace ${nombre}: ${pesosConCentavos(de.costo)}`);
  if (pasos.length === 1) pasos.push(`${nombre} manda los precios sin IVA y sin descuento: el costo es ese.`);
  return pasos;
}

// ---------------------------------------------------------------- Pantalla

export default function Productos() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const todos = useAlmacen((a) => a.productos);
  const abiertoId = useParametro("producto");

  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [conFoto, setConFoto] = useState<string[]>(CON_FOTO_AL_EMPEZAR);
  const buscador = useRef<HTMLInputElement>(null);
  const idLista = useId();

  const productos = estado === "vacio" ? [] : todos;
  const buscando = consulta.trim() !== "";
  const lista = buscando ? buscarProductos(productos, consulta) : productos;
  const elMarcado = Math.min(marcado, lista.length - 1);
  const abierto = todos.find((p) => p.id === abiertoId) ?? null;
  const listo = estado !== "cargando" && estado !== "error";

  // El marcado con las flechas queda siempre a la vista.
  useEffect(() => {
    if (!esCelular) document.getElementById(`${idLista}-${elMarcado}`)?.scrollIntoView({ block: "nearest" });
  }, [elMarcado, esCelular, idLista]);

  function abrir(producto: Producto) {
    cambiarParametro("producto", producto.id);
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado(Math.min(elMarcado + 1, lista.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado(Math.max(elMarcado - 1, 0)); }
    if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); setMarcado(0); }
    if (e.key === "Enter") {
      e.preventDefault();
      const elegido = lista[elMarcado];
      if (elegido) abrir(elegido);
    }
  }

  return (
    <Pagina titulo="Productos" estados={ESTADOS}>
      <div className="productos">
        {estado === "cargando" && <Cargando texto="Bajando el catálogo…" avance={62} detalle="Es solo la primera vez. Después se busca al instante, también sin internet." />}
        {estado === "error" && (
          <ErrorDeCarga titulo="No se pudo bajar el catálogo" alReintentar={() => cambiarParametro("estado", null)}>
            Revisá la conexión y probá de nuevo. Sin el catálogo no se puede buscar.
          </ErrorDeCarga>
        )}

        {listo && productos.length === 0 && (
          <Vacio icono="productos" titulo="Todavía no hay productos" principal={{ texto: "Cargar una lista de precios", icono: "listas", alTocar: () => ir("listas") }}>Los productos entran solos al cargar la lista de precios de un proveedor.</Vacio>
        )}

        {listo && productos.length > 0 && (
          <>
            <Buscador
              ref={buscador}
              valor={consulta}
              alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
              alTeclear={teclear}
              etiqueta="Buscar un producto"
              placeholder={esCelular ? "Buscá por nombre, marca o código" : "Escribí el nombre del producto, la marca o el código"}
              controla={idLista}
              activo={lista.length > 0 ? `${idLista}-${elMarcado}` : undefined}
              autoFocus={!esCelular}
            />

            {lista.length === 0 && (
              <Vacio icono="buscar" titulo={`No hay productos con «${consulta.trim()}»`} accion={{ texto: "Borrar lo escrito", alTocar: () => { setConsulta(""); buscador.current?.focus(); } }}>
                Probá con menos palabras, con la marca o con el código del proveedor.
              </Vacio>
            )}

            {lista.length > 0 && (
              <div className="productos__lista" id={idLista} role="listbox" aria-label="Productos">
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
                      onClick={() => { setMarcado(i); abrir(p); }}
                    >
                      <span className="productos__nombre"><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                      {precio ? (
                        <span className="productos__precio"><strong className="cifra">{pesos(precio.valor)}</strong>{p.unidad !== "unidad" && <span>{porUnidad(p.unidad)}</span>}</span>
                      ) : (
                        <span className="productos__precio"><Pastilla tipo="alerta" icono="alerta">Sin precio todavía</Pastilla></span>
                      )}
                      <Icono nombre="flecha" tam={18} className="productos__flecha" />
                    </button>
                  );
                })}
              </div>
            )}

            {lista.length > 0 && !esCelular && <p className="productos__teclas">Las flechas cambian el marcado · Enter abre el producto</p>}
          </>
        )}
      </div>

      <Ficha
        producto={abierto}
        tieneFoto={abierto !== null && conFoto.includes(abierto.id)}
        alSacarFoto={() => { if (abierto) setConFoto((antes) => [...new Set([...antes, abierto.id])]); }}
        alCerrar={() => { cambiarParametro("producto", null); if (!esCelular) buscador.current?.focus(); }}
      />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Ficha del producto

type PropsDeFicha = { producto: Producto | null; tieneFoto: boolean; alSacarFoto: () => void; alCerrar: () => void };

function Ficha({ producto: p, tieneFoto, alSacarFoto, alCerrar }: PropsDeFicha) {
  const [otro, setOtro] = useState("");
  const [guardado, setGuardado] = useState<string | null>(null);
  const [fotoGrande, setFotoGrande] = useState(false);
  const id = p?.id;

  // Al abrir otro producto, «otro porcentaje» muestra el suyo si no es uno de los cinco.
  useEffect(() => {
    const margen = p?.margen ?? null;
    setOtro(margen !== null && !(MARGENES as readonly number[]).includes(margen) ? String(margen) : "");
    setGuardado(null);
    setFotoGrande(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!p) return <Hoja abierta={false} alCerrar={alCerrar} titulo="Producto">{null}</Hoja>;

  const precio = precioDe(p);
  const deQuien = [...p.proveedores].sort((a, b) => a.costo - b.costo);
  const enUso = p.proveedores[0];
  const masBarato = deQuien[0];
  const esDeLosCinco = p.margen !== null && (MARGENES as readonly number[]).includes(p.margen);

  function elegirMargen(margen: number, esOtro: boolean) {
    if (!p) return;
    cambiarProducto(p.id, { margen });
    if (!esOtro) setOtro("");
    setGuardado(`Guardado: margen de ${margen} %`);
  }

  function escribirOtro(texto: string) {
    const limpio = texto.replace(/\D/g, "").replace(/^0+/, "").slice(0, 4);
    setOtro(limpio);
    if (limpio !== "") elegirMargen(Number(limpio), true);
  }

  function usar(de: CostoDeProveedor) {
    if (!p) return;
    cambiarProducto(p.id, { costo: de.costo, proveedores: [de, ...p.proveedores.filter((x) => x.proveedorId !== de.proveedorId)] });
    setGuardado(`Guardado: se usa el costo de ${proveedorDe(de.proveedorId)?.nombre}`);
  }

  function sacarFoto() {
    alSacarFoto();
    avisar("Foto guardada", { detalle: "Maqueta: en la app se abre la cámara del celular." });
  }

  const foto = (
    <span className={clases("productos__foto", `figura--${p.tono}`, !tieneFoto && "productos__foto--sin")}>
      <Icono nombre={tieneFoto ? "productos" : "camara"} tam={tieneFoto ? 40 : 30} />
    </span>
  );

  return (
    <Hoja abierta alCerrar={alCerrar} titulo={p.nombre} pie={<Boton onClick={alCerrar}>Listo</Boton>}>
      <div className="productos__ficha">
        <p className="productos__marca">{[p.marca, enUso && `código ${enUso.codigo}`].filter(Boolean).join(" · ")}</p>

        {/* ---- Precio y margen ---- */}
        <section className="productos__precio-de-venta" aria-label="Precio de venta">
          <h3>Precio de venta</h3>
          {precio ? (
            <>
              <div className="productos__grande">
                <Explicado className="cifra" valor={pesos(precio.valor)} pasos={precio.pasos} titulo={p.nombre} />
                {p.unidad !== "unidad" && <span>{porUnidad(p.unidad)}</span>}
              </div>
              <p className="detalle">Tocá el precio para ver de dónde sale.</p>
            </>
          ) : p.costo === null ? (
            <Aviso tipo="alerta" titulo="Sin costo todavía">Ningún proveedor lo trae en su lista. Cuando cargues una lista que lo tenga, se le puede poner precio.</Aviso>
          ) : (
            <Aviso tipo="alerta" titulo="Sin precio todavía">Elegí el margen y queda con precio.</Aviso>
          )}

          {p.costo !== null && (
            <div className="productos__margen">
              <h4>Margen</h4>
              <Margenes etiqueta={`Margen de ${p.nombre}`} elegido={esDeLosCinco ? p.margen : null} alElegir={(m) => elegirMargen(m, false)} />
              <Campo
                className={clases("productos__otro", !esDeLosCinco && p.margen !== null && "productos__otro--elegido")}
                etiqueta="Otro porcentaje"
                sufijo="%"
                inputMode="numeric"
                value={otro}
                onChange={(e) => escribirOtro(e.target.value)}
              />
              <p className="productos__guardado" role="status">
                {guardado ? <><Icono nombre="tilde" tam={18} grosor={2.4} />{guardado}</> : "Lo que elijas cambia el precio en el momento y queda guardado."}
              </p>
            </div>
          )}
        </section>

        {/* ---- Costo ---- */}
        {p.costo !== null && enUso && (
          <div className="productos__costo">
            <span><strong>Costo</strong><span>Sin IVA, según la lista de {proveedorDe(enUso.proveedorId)?.nombre}</span></span>
            <Explicado className="cifra" valor={pesosConCentavos(p.costo)} pasos={pasosDelCosto(enUso)} titulo={`Costo de ${p.nombre}`} />
          </div>
        )}

        {/* ---- Quién lo vende ---- */}
        {deQuien.length > 0 && (
          <section aria-labelledby="productos-quien">
            <h3 id="productos-quien">Quién lo vende</h3>
            <ul className="productos__proveedores">
              {deQuien.map((de) => {
                const usado = de.proveedorId === enUso?.proveedorId;
                const nombre = proveedorDe(de.proveedorId)?.nombre ?? de.proveedorId;
                return (
                  <li key={de.proveedorId} className={clases("productos__proveedor", usado && deQuien.length > 1 && "productos__proveedor--en-uso")}>
                    <span className="productos__proveedor-texto">
                      <strong>{nombre}</strong>
                      <span>Lista del {fechaDeLista(de.proveedorId)}</span>
                      {deQuien.length > 1 && de === masBarato && <Pastilla tipo="bien">El más barato</Pastilla>}
                    </span>
                    <strong className="cifra productos__proveedor-costo">{pesosConCentavos(de.costo)}</strong>
                    {deQuien.length > 1 && (usado
                      ? <span className="productos__en-uso"><Icono nombre="tilde" tam={18} grosor={2.4} />En uso</span>
                      : <Boton tam="chico" aria-label={`Usar el costo de ${nombre}`} onClick={() => usar(de)}>Usar este</Boton>)}
                  </li>
                );
              })}
            </ul>
            {enUso && (
              <Boton variante="texto" tam="chico" icono="bajar" className="productos__planilla" onClick={() => avisar("Planilla bajada", { detalle: `Maqueta: en la app se baja el Excel de ${proveedorDe(enUso.proveedorId)?.nombre}.` })}>
                Bajar la planilla de la lista del {fechaDeLista(enUso.proveedorId)}
              </Boton>
            )}
          </section>
        )}

        {/* ---- Foto ---- */}
        <section aria-labelledby="productos-foto">
          <h3 id="productos-foto">Foto</h3>
          <div className="productos__foto-fila">
            {tieneFoto
              ? <button type="button" className="productos__foto-boton" aria-label="Ver la foto más grande" onClick={() => setFotoGrande(true)}>{foto}</button>
              : foto}
            <div>
              <p className="detalle">{tieneFoto ? "Tocá la foto para verla más grande." : "Todavía no tiene foto. Ayuda a reconocerlo en el mostrador."}</p>
              <Boton tam="chico" icono="camara" onClick={sacarFoto}>{tieneFoto ? "Sacar otra foto" : "Sacar una foto"}</Boton>
            </div>
          </div>
        </section>
      </div>

      <Hoja abierta={fotoGrande} alCerrar={() => setFotoGrande(false)} titulo={`Foto de ${p.nombre}`} pie={<>
        <Boton icono="camara" onClick={() => { setFotoGrande(false); sacarFoto(); }}>Sacar otra foto</Boton>
        <Boton onClick={() => setFotoGrande(false)}>Cerrar</Boton>
      </>}>
        <span className={clases("productos__foto productos__foto--grande", `figura--${p.tono}`)}><Icono nombre="productos" tam={120} grosor={1.2} /></span>
        <p className="detalle">Maqueta: acá va la foto de verdad.</p>
      </Hoja>
    </Hoja>
  );
}

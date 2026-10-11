import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  agregarAVenta, agregarLibreAVenta, anotarNoLlevo, cambiarProducto, cambiarRenglon, cobrarVenta, cuentaDeRenglon, deshacerNoLlevo,
  elegirCliente, elegirMedio, ponerVenta, quitarRenglon, totalDeVenta, useAlmacen, VENTA_VACIA,
  type RenglonDeVenta, type VentaEnCurso,
} from "../almacen";
import {
  buscarPorNombre, buscarProductos, cantidad, clienteDe, CODIGO_DESCONOCIDO, MAS_VENDIDOS, MEDIOS_DE_PAGO, pesos, porUnidad, precioDe, vaConDecimal,
  type MedioDePago, type Producto, type Venta,
} from "../datos";
import { useConexion } from "../estructura/conexion";
import {
  Aviso, avisar, BarraDeAccion, Boton, Buscador, Campo, Cantidad, Cargando, clases, ErrorDeCarga, Escaner, Exito, Explicado, Figura, Hoja, Icono, Iniciales,
  leerPesos, Lista, Margenes, Pagina, Pastilla, QrDeMaqueta, Renglon, Segmentos, Vacio, useEstadoDeMaqueta, type EstadoDeMaqueta,
} from "../piezas";
import { cambiarParametro, useEsCelular } from "../ruta";
import "../estilos/vender.css";

// ---------------------------------------------------------------- Estados de maqueta

const ESTADOS: EstadoDeMaqueta[] = [
  { clave: "normal", nombre: "Normal" },
  { clave: "con-productos", nombre: "Venta con productos" },
  { clave: "sin-precio", nombre: "Con un producto sin precio" },
  { clave: "codigo-desconocido", nombre: "Código que no está en el catálogo" },
  { clave: "cobrada", nombre: "Venta registrada" },
  { clave: "sin-conexion", nombre: "Sin conexión" },
  { clave: "cobrada-sin-conexion", nombre: "Venta registrada sin conexión" },
  { clave: "cargando", nombre: "Bajando el catálogo" },
  { clave: "error", nombre: "No se pudo bajar el catálogo" },
];

const VENTA_DE_EJEMPLO: VentaEnCurso = {
  medio: null,
  clienteId: null,
  renglones: [
    { id: "ej-1", productoId: "mecha-6-madera", nombre: "Mecha 6 mm madera", unidad: "unidad", cantidad: 2, precioAMano: null },
    { id: "ej-2", productoId: "clavo-paris-2", nombre: "Clavo punta París 2 pulgadas", unidad: "kilo", cantidad: 2.5, precioAMano: null },
    { id: "ej-3", productoId: "cinta-aisladora", nombre: "Cinta aisladora negra 20 m", unidad: "unidad", cantidad: 1, precioAMano: null },
  ],
};

const VENTA_SIN_PRECIO: VentaEnCurso = {
  medio: "efectivo",
  clienteId: null,
  renglones: [
    { id: "ej-1", productoId: "mecha-6-madera", nombre: "Mecha 6 mm madera", unidad: "unidad", cantidad: 1, precioAMano: null },
    { id: "ej-4", productoId: "mecha-6-hormigon", nombre: "Mecha 6 mm para hormigón", unidad: "unidad", cantidad: 1, precioAMano: null },
  ],
};

const COBRADA_DE_EJEMPLO: Venta = {
  id: "ej-v", cuando: new Date(), usuarioId: "carlos", medio: "efectivo", clienteId: null, total: 35000, anulada: false, motivo: "", porEnviar: false, renglones: [],
};

/** Cada estado de maqueta deja el almacén como hace falta para verlo. */
function prepararEstado(estado: string) {
  if (estado === "con-productos" || estado === "sin-conexion" || estado === "codigo-desconocido") ponerVenta(VENTA_DE_EJEMPLO);
  if (estado === "sin-precio") {
    cambiarProducto("mecha-6-hormigon", { margen: null });
    ponerVenta(VENTA_SIN_PRECIO);
  }
}

// ---------------------------------------------------------------- Pantalla

export default function Vender() {
  const estado = useEstadoDeMaqueta();
  const esCelular = useEsCelular();
  const { enLinea } = useConexion();
  const productos = useAlmacen((a) => a.productos);
  const venta = useAlmacen((a) => a.venta);

  const [consulta, setConsulta] = useState("");
  const [marcado, setMarcado] = useState(0);
  const [recien, setRecien] = useState<string | null>(null);
  const [codigoSuelto, setCodigoSuelto] = useState<string | null>(null);
  const [intentoCobrar, setIntentoCobrar] = useState(false);
  const [cobrada, setCobrada] = useState<Venta | null>(null);
  const [hoja, setHoja] = useState<"cliente" | "libre" | "escaner" | "celular" | null>(null);
  const [celularVinculado, setCelularVinculado] = useState(false);
  /** Renglones que entraron sin precio: siguen mostrando los márgenes aunque ya se haya elegido uno. */
  const [conMargenALaVista, setConMargenALaVista] = useState<string[]>([]);
  const buscador = useRef<HTMLInputElement>(null);
  const idResultados = useId();

  useEffect(() => {
    prepararEstado(estado);
    setCodigoSuelto(estado === "codigo-desconocido" ? CODIGO_DESCONOCIDO : null);
    setCobrada(estado === "cobrada" || estado === "cobrada-sin-conexion" ? COBRADA_DE_EJEMPLO : null);
  }, [estado]);

  const cuentas = venta.renglones.map((r) => cuentaDeRenglon(r, productos));
  const idsSinPrecio = venta.renglones.filter((_, i) => cuentas[i]?.sinPrecio).map((r) => r.id).join(",");
  useEffect(() => {
    if (idsSinPrecio) setConMargenALaVista((antes) => [...new Set([...antes, ...idsSinPrecio.split(",")])]);
  }, [idsSinPrecio]);

  const total = totalDeVenta(venta, productos);
  const cliente = clienteDe(venta.clienteId);
  const resultados = buscarProductos(productos, consulta);
  const haySinPrecio = cuentas.some((c) => c.sinPrecio);

  // Lo que falta para poder cobrar. El aviso aparece al tocar «Cobrar» y se va solo al corregir.
  const falta =
    haySinPrecio ? { titulo: "Hay productos sin precio", detalle: "Elegí el margen en el renglón marcado." }
    : venta.medio === null ? { titulo: "Elegí cómo paga", detalle: null }
    : venta.medio === "cuenta-corriente" && !cliente ? { titulo: "Cuenta corriente: elegí el cliente", detalle: null }
    : null;
  useEffect(() => { if (!falta) setIntentoCobrar(false); }, [falta]);
  // Si al cobrar falta un precio, se lleva la vista al renglón marcado.
  useEffect(() => {
    if (intentoCobrar && haySinPrecio) document.querySelector("[data-sin-precio]")?.scrollIntoView({ block: "center" });
  }, [intentoCobrar, haySinPrecio]);

  // ---- Agregar

  function agregar(producto: Producto) {
    const id = agregarAVenta(producto.id);
    if (codigoSuelto) {
      cambiarProducto(producto.id, { codigoDeBarras: codigoSuelto });
      avisar(`Código asociado a ${producto.nombre}`, { detalle: "La próxima vez se agrega al escanearlo." });
      setCodigoSuelto(null);
      if (estado === "codigo-desconocido") cambiarParametro("estado", "con-productos");
    }
    setRecien(id);
    setConsulta("");
    setMarcado(0);
    buscador.current?.focus();
  }

  function leerCodigo(codigo: string) {
    const producto = productos.find((p) => p.codigoDeBarras === codigo);
    if (producto) { agregar(producto); return; }
    setCodigoSuelto(codigo);
    setConsulta("");
    buscador.current?.focus();
  }

  function teclear(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, resultados.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    if (e.key === "Escape" && consulta !== "") { e.preventDefault(); setConsulta(""); }
    if (e.key === "Enter") {
      e.preventDefault();
      const elegido = resultados[Math.min(marcado, resultados.length - 1)];
      if (elegido) agregar(elegido);
      // Un lector de códigos «escribe» los números y aprieta Enter.
      else if (/^\d{8,14}$/.test(consulta.trim())) leerCodigo(consulta.trim());
    }
  }

  // ---- Cobrar

  function elegirComoPaga(medio: MedioDePago) {
    elegirMedio(medio);
    if (medio === "cuenta-corriente" && !cliente) setHoja("cliente");
  }

  function cobrar() {
    if (falta) {
      setIntentoCobrar(true);
      return;
    }
    const hecha = cobrarVenta({ sinConexion: !enLinea });
    if (hecha) { setCobrada(hecha); setConMargenALaVista([]); window.scrollTo(0, 0); }
  }

  function noLlevo() {
    const anterior = anotarNoLlevo();
    avisar("Anotado como «No llevó»", { accion: { texto: "Deshacer", alTocar: () => deshacerNoLlevo(anterior) } });
    buscador.current?.focus();
  }

  function nuevaVenta() {
    setCobrada(null);
    if (estado === "cobrada") cambiarParametro("estado", null);
    if (estado === "cobrada-sin-conexion") cambiarParametro("estado", "sin-conexion");
    if (estado.startsWith("cobrada")) ponerVenta(VENTA_VACIA);
  }

  // ---- Pantalla de éxito

  if (cobrada) {
    const medio = MEDIOS_DE_PAGO.find((m) => m.clave === cobrada.medio);
    const deQuien = clienteDe(cobrada.clienteId);
    const comoPago = deQuien ? `${medio?.frase} de ${deQuien.nombre}` : medio?.frase;
    const sinConexion = cobrada.porEnviar || !enLinea;
    return (
      <Pagina titulo="Nueva venta" ancho="completo" estados={ESTADOS}>
        {sinConexion ? (
          <Exito tipo="pendiente" titulo="Venta guardada sin conexión" importe={pesos(cobrada.total)} detalle={`${comoPago}. Se envía sola cuando vuelva internet.`} boton="Nueva venta" alSeguir={nuevaVenta} />
        ) : (
          <Exito titulo="Venta registrada" importe={pesos(cobrada.total)} detalle={comoPago} boton="Nueva venta" alSeguir={nuevaVenta} />
        )}
      </Pagina>
    );
  }

  // ---- Venta

  const catalogoListo = estado !== "cargando" && estado !== "error";
  const hayRenglones = venta.renglones.length > 0;

  return (
    <Pagina titulo="Nueva venta" ancho="completo" estados={ESTADOS}>
      <div className="vender">
        <section className="vender__buscar" aria-label="Agregar productos">
          {estado === "cargando" && <Cargando texto="Bajando el catálogo…" avance={62} detalle="Es solo la primera vez. Después se busca al instante, también sin internet." />}
          {estado === "error" && <ErrorDeCarga titulo="No se pudo bajar el catálogo" alReintentar={() => cambiarParametro("estado", null)}>Revisá la conexión y probá de nuevo. Sin el catálogo no se puede buscar.</ErrorDeCarga>}

          {catalogoListo && (
            <>
              <Buscador
                ref={buscador}
                valor={consulta}
                alCambiar={(texto) => { setConsulta(texto); setMarcado(0); }}
                alTeclear={teclear}
                alEscanear={() => setHoja(esCelular ? "escaner" : "celular")}
                etiqueta="Buscar un producto para agregarlo a la venta"
                placeholder={esCelular ? "Buscá por nombre o código" : "Escribí el nombre del producto o el código"}
                controla={idResultados}
                activo={resultados.length > 0 ? `${idResultados}-${Math.min(marcado, resultados.length - 1)}` : undefined}
                autoFocus={!esCelular}
              />

              {codigoSuelto && (
                <Aviso tipo="alerta" titulo={`El código ${codigoSuelto} no está en el catálogo`} accion={{ texto: "Descartar", alTocar: () => { setCodigoSuelto(null); if (estado === "codigo-desconocido") cambiarParametro("estado", "con-productos"); } }}>
                  Buscá el producto para asociarlo: la próxima vez se agrega solo.
                </Aviso>
              )}

              {consulta.trim() !== "" && (
                <div className="vender__resultados" id={idResultados} role="listbox" aria-label="Productos encontrados">
                  {resultados.map((p, i) => {
                    const precio = precioDe(p);
                    return (
                      <button key={p.id} type="button" role="option" id={`${idResultados}-${i}`} aria-selected={i === marcado} className={clases("vender__resultado", i === marcado && "vender__resultado--marcado")} onClick={() => agregar(p)} onMouseEnter={() => setMarcado(i)}>
                        <span className="vender__resultado-texto"><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                        {precio ? <span className="vender__resultado-precio"><strong className="cifra">{pesos(precio.valor)}</strong>{p.unidad !== "unidad" && <span>{porUnidad(p.unidad)}</span>}</span> : <Pastilla tipo="alerta">Sin precio</Pastilla>}
                        <span className="vender__sumar" aria-hidden="true"><Icono nombre="mas" tam={20} /></span>
                      </button>
                    );
                  })}
                  {resultados.length === 0 && (
                    <div className="vender__sin-resultados">
                      <p>No hay productos con «{consulta.trim()}».</p>
                      <Boton icono="mas" onClick={() => setHoja("libre")}>Agregarlo igual, con el precio a mano</Boton>
                    </div>
                  )}
                  {resultados.length > 0 && !esCelular && <p className="vender__teclas">Enter agrega el marcado · las flechas cambian cuál</p>}
                </div>
              )}

              {consulta.trim() === "" && (
                <div className="vender__atajos">
                  <div className="vender__mas-vendidos">
                    <h2>Lo que más se vende</h2>
                    <div className="vender__tarjetas">
                      {MAS_VENDIDOS.map((id) => productos.find((p) => p.id === id)).filter((p): p is Producto => Boolean(p)).map((p) => {
                        const precio = precioDe(p);
                        return (
                          <button key={p.id} type="button" className="vender__tarjeta" onClick={() => agregar(p)} aria-label={`Agregar ${p.nombre}`}>
                            <Figura icono="productos" tono={p.tono} tam="grande" />
                            <span className="vender__tarjeta-texto"><strong>{p.nombre}</strong><span>{p.marca}</span></span>
                            {precio && <strong className="cifra vender__tarjeta-precio">{pesos(precio.valor)}</strong>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="vender__otros">
                    <Boton variante="texto" tam="chico" icono="mas" onClick={() => setHoja("libre")}>Agregar algo que no está en productos</Boton>
                    {!esCelular && (celularVinculado
                      ? <span className="vender__vinculado"><Pastilla tipo="bien" icono="celular">Celular vinculado</Pastilla><Boton tam="chico" onClick={() => setCelularVinculado(false)}>Desvincular</Boton></span>
                      : <Boton icono="celular" onClick={() => setHoja("celular")}>Escanear con el celular</Boton>)}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="vender__venta" aria-label="Esta venta">
          <header className="vender__cabeza">
            <h2>Esta venta</h2>
            {hayRenglones && <Pastilla>{venta.renglones.length === 1 ? "1 producto" : `${venta.renglones.length} productos`}</Pastilla>}
            {hayRenglones && <Boton tam="chico" className="vender__no-llevo" onClick={noLlevo}>No llevó</Boton>}
          </header>

          {!hayRenglones && catalogoListo && (
            <Vacio icono="vender" titulo="Todavía no hay nada en la venta">
              {esCelular ? "Escribí el nombre del producto o escaneá el código." : "Escribí el nombre del producto o escaneá el código con el celular."}
            </Vacio>
          )}

          {hayRenglones && (
            <>
              <ul className="vender__renglones">
                {venta.renglones.map((r, i) => (
                  <RenglonDeLaVenta
                    key={r.id}
                    renglon={r}
                    producto={productos.find((p) => p.id === r.productoId)}
                    productos={productos}
                    recien={recien === r.id}
                    conMargenes={conMargenALaVista.includes(r.id) || Boolean(cuentas[i]?.sinPrecio)}
                  />
                ))}
              </ul>

              <div className="vender__pago">
                <Segmentos forma="grilla" etiqueta="Cómo paga" opciones={MEDIOS_DE_PAGO} elegido={venta.medio} alElegir={elegirComoPaga} />
                {venta.medio === "cuenta-corriente" && (cliente ? (
                  <div className="vender__cliente">
                    <Iniciales nombre={cliente.nombre} tono="verde" forma="cuadrada" />
                    <span><strong>{cliente.nombre}</strong><span>{cliente.debe > 0 ? `Debe ${pesos(cliente.debe)}` : "Al día"}</span></span>
                    <Boton tam="chico" onClick={() => setHoja("cliente")}>Cambiar</Boton>
                  </div>
                ) : (
                  <Boton icono="usuario" ancho onClick={() => setHoja("cliente")}>Elegir el cliente</Boton>
                ))}
              </div>

              <BarraDeAccion className="vender__cobro">
                {intentoCobrar && falta && <Aviso tipo="alerta" titulo={falta.titulo}>{falta.detalle}</Aviso>}
                <p className="vender__total"><span>Total</span><strong className="cifra">{pesos(total)}</strong></p>
                <Boton variante="principal" tam="grande" iconoFinal="flecha" className="vender__cobrar" onClick={cobrar}>
                  Cobrar<span className="vender__cobrar-importe"> {pesos(total)}</span>
                </Boton>
              </BarraDeAccion>
            </>
          )}
        </section>
      </div>

      <ElegirCliente abierta={hoja === "cliente"} alCerrar={() => setHoja(null)} />
      <AlgoQueNoEsta abierta={hoja === "libre"} sugerido={resultados.length === 0 ? consulta.trim() : ""} alCerrar={() => setHoja(null)} alAgregar={(id) => { setRecien(id); setConsulta(""); }} />
      <Escaner
        abierto={hoja === "escaner"}
        alCerrar={() => setHoja(null)}
        alLeer={leerCodigo}
        ejemplos={[{ codigo: "7790001000015", nombre: "Mecha 6 mm madera" }, { codigo: CODIGO_DESCONOCIDO, nombre: "Un código que no está en el catálogo" }]}
      />
      <EscanearConElCelular abierta={hoja === "celular"} alCerrar={() => setHoja(null)} alVincular={() => { setCelularVinculado(true); setHoja(null); avisar("Celular vinculado", { detalle: "Lo que escanees con el celular aparece en esta venta." }); }} />
    </Pagina>
  );
}

// ---------------------------------------------------------------- Renglón de la venta

type PropsDeRenglon = {
  renglon: RenglonDeVenta;
  producto: Producto | undefined;
  productos: Producto[];
  /** Recién agregado: se destaca un instante. */
  recien: boolean;
  /** Muestra los cinco márgenes y el precio a mano (el producto entró sin precio). */
  conMargenes: boolean;
};

function RenglonDeLaVenta({ renglon, producto, productos, recien, conMargenes }: PropsDeRenglon) {
  const cuenta = cuentaDeRenglon(renglon, productos);
  const conDecimal = vaConDecimal(renglon.unidad);
  const detalle = cuenta.unitario === null ? null : !producto ? "No está en productos · precio a mano" : `${pesos(cuenta.unitario)} ${porUnidad(renglon.unidad)}`;

  return (
    <li className={clases("vender__renglon", cuenta.sinPrecio && "vender__renglon--sin-precio", recien && "vender__renglon--recien")} data-sin-precio={cuenta.sinPrecio || undefined}>
      <div className="vender__renglon-nombre">
        <strong>{renglon.nombre}</strong>
        {cuenta.sinPrecio ? <Pastilla tipo="alerta" icono="alerta">Sin precio</Pastilla> : <span>{detalle}</span>}
      </div>
      <div className="vender__renglon-cuenta">
        <Cantidad valor={renglon.cantidad} decimal={conDecimal} etiqueta={`Cantidad de ${renglon.nombre}`} alCambiar={(valor) => cambiarRenglon(renglon.id, { cantidad: valor })} />
        {conDecimal && <span className="vender__unidad">{cantidad(renglon.cantidad, renglon.unidad).replace(/^[\d.,]+ /, "")}</span>}
        {cuenta.subtotal !== null && <Explicado className="cifra vender__subtotal" valor={pesos(cuenta.subtotal)} pasos={cuenta.pasos} titulo={renglon.nombre} />}
        <Boton variante="texto" tam="chico" icono="basura" className="vender__quitar" aria-label={`Quitar ${renglon.nombre} de la venta`} onClick={() => quitarRenglon(renglon.id)} />
      </div>

      {conMargenes && producto && (
        <div className="vender__precio">
          <p>{cuenta.sinPrecio ? "Elegí el margen:" : "Margen elegido:"}</p>
          <Margenes
            etiqueta={`Margen de ${renglon.nombre}`}
            elegido={renglon.precioAMano === null ? producto.margen : null}
            alElegir={(margen) => { cambiarProducto(producto.id, { margen }); cambiarRenglon(renglon.id, { precioAMano: null }); }}
          />
          <Campo
            className="vender__a-mano"
            etiqueta="O el precio a mano, solo para esta venta"
            prefijo="$"
            inputMode="numeric"
            value={renglon.precioAMano === null ? "" : pesos(renglon.precioAMano).slice(1)}
            onChange={(e) => cambiarRenglon(renglon.id, { precioAMano: leerPesos(e.target.value) })}
          />
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------- Hojas

function ElegirCliente({ abierta, alCerrar }: { abierta: boolean; alCerrar: () => void }) {
  const clientes = useAlmacen((a) => a.clientes);
  const [consulta, setConsulta] = useState("");
  useEffect(() => { if (abierta) setConsulta(""); }, [abierta]);
  const encontrados = buscarPorNombre(clientes, consulta);
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="¿A la cuenta de quién?">
      <Buscador valor={consulta} alCambiar={setConsulta} etiqueta="Buscar cliente por nombre" placeholder="Escribí el nombre del cliente" autoFocus />
      {encontrados.length > 0 ? (
        <Lista>
          {encontrados.map((c) => (
            <Renglon
              key={c.id}
              inicio={<Iniciales nombre={c.nombre} tono="verde" forma="cuadrada" />}
              titulo={c.nombre}
              detalle={c.debe > 0 ? `Debe ${pesos(c.debe)}` : "Al día"}
              alTocar={() => { elegirCliente(c.id); alCerrar(); }}
            />
          ))}
        </Lista>
      ) : (
        <Aviso tipo="info" titulo={`No hay clientes con «${consulta.trim()}»`}>Probá con otra parte del nombre.</Aviso>
      )}
    </Hoja>
  );
}

function AlgoQueNoEsta({ abierta, sugerido, alCerrar, alAgregar }: { abierta: boolean; sugerido: string; alCerrar: () => void; alAgregar: (id: string) => void }) {
  const [que, setQue] = useState("");
  const [cuanto, setCuanto] = useState<number | null>(null);
  const [revisado, setRevisado] = useState(false);
  useEffect(() => { if (abierta) { setQue(sugerido); setCuanto(null); setRevisado(false); } }, [abierta, sugerido]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    setRevisado(true);
    if (que.trim() === "" || !cuanto) return;
    alAgregar(agregarLibreAVenta(que.trim(), cuanto));
    alCerrar();
  }

  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Algo que no está en productos">
      <form className="vender__libre" onSubmit={enviar} noValidate>
        <Campo etiqueta="¿Qué es?" value={que} onChange={(e) => setQue(e.target.value)} placeholder="Por ejemplo: corte de chapa" error={revisado && que.trim() === "" ? "Escribí qué se lleva." : null} autoFocus={sugerido === ""} />
        <Campo etiqueta="¿A cuánto?" prefijo="$" inputMode="numeric" value={cuanto === null ? "" : pesos(cuanto).slice(1)} onChange={(e) => setCuanto(leerPesos(e.target.value))} placeholder="Por ejemplo 5.000" error={revisado && !cuanto ? "Poné el precio." : null} autoFocus={sugerido !== ""} />
        <Boton type="submit" variante="principal" tam="grande" ancho>Agregar a la venta</Boton>
      </form>
    </Hoja>
  );
}

function EscanearConElCelular({ abierta, alCerrar, alVincular }: { abierta: boolean; alCerrar: () => void; alVincular: () => void }) {
  return (
    <Hoja abierta={abierta} alCerrar={alCerrar} titulo="Escanear con el celular">
      <div className="vender__vincular">
        <QrDeMaqueta lado={190} etiqueta="Código para vincular el celular" />
        <ol>
          <li><span>Abrí la cámara del celular y apuntá a este código.</span></li>
          <li><span>Tocá el enlace que aparece.</span></li>
          <li><span>Listo: lo que escanees con el celular aparece en esta venta.</span></li>
        </ol>
      </div>
      <p className="detalle">El código vence en 5 minutos. No hace falta instalar nada en el celular.</p>
      <div className="escaner__maqueta">
        <p>Maqueta: simular</p>
        <button type="button" onClick={alVincular}>El celular leyó el código</button>
      </div>
    </Hoja>
  );
}

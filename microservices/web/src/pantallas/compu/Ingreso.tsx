import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { detalleDelRegistro, diferenciaConLaLista, incompleto, useIngreso, type Proveedor, type Renglon } from "../../negocio/deposito/ingreso";
import { AvisoDePedido, usePedidoAIngresar } from "../Pedidos";
import { irA } from "./base/rutas";
import { usePuede } from "../permisos";
import { COMPROBANTES } from "../textos";
import { FotoDeProducto } from "./FotoDeProducto";
import { hoyLocal, pesos, porcentaje } from "../../formato";
import { abreviarUnidad, cantidadValida, conUnidad, enteras, unidadDe, type Unidad } from "../../unidades";
import { Escaner, hayCamara } from "../../plataforma/camara/Escaner";
import { Aviso, Boton, Contador, Exito, Explicado, Hoja, Icono, Pagina, Pastilla, Plegable, Progreso, Segmentos, Toast, Vacio, numero as cifra, pesosCortos } from "./base/ui";
import { useEsCelular } from "./base/vista";
import { BuscadorDeProducto, detalleDe, plural, useEnLinea, type Producto } from "./base/pantallas/deposito-comun";
import "./base/estilos/compras.css";
import { FotoDeFactura, VerComprobante } from "../FotoDeFactura";

// Ingreso de mercadería: proveedor y comprobante, renglones con la búsqueda de siempre, y
// registrar. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.
// Abajo, las compras recientes (se despliegan y se anulan). Los gastos de la semana están
// en Cómo va el negocio (decisión 34).
const CLAVE_BORRADOR = "ferre.v2.ingreso";
const costoATexto = (costo: number) => String(costo).replace(".", ",");

export function Ingreso() {
  const esCelular = useEsCelular();
  const enLinea = useEnLinea();
  // Si se viene de un pedido (RF-55), el ingreso arranca con su proveedor y con lo que falta llegar.
  const { pedido, error: errorPedido } = usePedidoAIngresar();
  const ingreso = useIngreso({
    lado: "computadora", costoATexto, pedido, borrador: CLAVE_BORRADOR,
    textoSinConexion: "No se registró: se cortó la conexión y registrar un ingreso necesita internet. Lo cargado sigue acá; probá de nuevo cuando vuelva.",
  });
  const { catalogo, errorCatalogo, proveedores, proveedor, proveedorId, setProveedorId, comprobante, setComprobante, foto, setFoto, fechaCompra, setFechaCompra, consulta, setConsulta, resultados, renglones, cambiar, cambiarCosto, cambiarFoto, total, incompletos, error, ocupado } = ingreso;
  const [intento, setIntento] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [eligiendoProveedor, setEligiendoProveedor] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoEscaneado, setUltimoEscaneado] = useState<string | null>(null);
  const [descartado, setDescartado] = useState<Renglon[] | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [exito, setExito] = useState<{ total: number; proveedor: string; detalle: string } | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const selector = useRef<HTMLSelectElement>(null);
  const zona = useRef<HTMLDivElement>(null);
  const focoPedido = useRef<string | null>(null);
  const id = useId();

  const agregar = useCallback((p: Producto | null, libre?: string) => {
    const { clave, cantidad } = ingreso.agregar(p, libre);
    setErrorCodigo(null); setDescartado(null);
    focoPedido.current = clave;
    return cantidad;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingreso.agregar]);
  const quitar = (clave: string) => { ingreso.quitar(clave); caja.current?.focus(); };

  // Después de agregar: en la computadora el foco pasa solo a la cantidad; en el celular
  // alcanza con dejar el renglón a la vista (abrir el teclado taparía la lista).
  useEffect(() => {
    const clave = focoPedido.current;
    if (!clave) return;
    focoPedido.current = null;
    const fila = zona.current?.querySelector<HTMLElement>(`[data-clave="${clave}"]`);
    if (esCelular) fila?.scrollIntoView({ block: "nearest" });
    else fila?.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
  }, [renglones, esCelular]);

  // Enter termina el renglón: de la cantidad al costo si falta, y si no de vuelta al buscador.
  function teclasDeRenglon(e: KeyboardEvent<HTMLElement>, r: Renglon) {
    if (e.key !== "Enter") return;
    const campo = (e.target as HTMLElement).dataset.testid;
    if (campo !== "cantidad" && campo !== "costo" && campo !== "descripcion-nueva") return;
    e.preventDefault();
    const fila = e.currentTarget;
    if (campo === "descripcion-nueva") fila.querySelector<HTMLInputElement>("[data-testid='cantidad']")?.focus();
    else if (campo === "cantidad" && r.costo === null) fila.querySelector<HTMLInputElement>("[data-testid='costo']")?.focus();
    else caja.current?.focus();
  }

  // Escanear agrega el renglón y deja la cámara lista para el siguiente.
  const alDetectar = useCallback((codigo: string) => {
    const noEsta = (texto: string) => { setEscaneando(false); setUltimoEscaneado(null); setErrorCodigo(texto); caja.current?.focus(); };
    ingreso.agregarPorCodigo(codigo).then((agregado) => {
      if (agregado) { setErrorCodigo(null); setDescartado(null); focoPedido.current = agregado.clave; setUltimoEscaneado(`Agregado: ${agregado.producto.descripcion}${agregado.cantidad > 1 ? ` (van ${agregado.cantidad})` : ""}. Escaneá el siguiente.`); }
      else noEsta(`El código ${codigo} no está en el catálogo. Buscá el producto por su nombre; si no existe, lo agregás como producto nuevo.`);
    }).catch((e: Error) => noEsta(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingreso.agregarPorCodigo]);

  // Lo que falta para poder registrar. Se calcula de lo cargado: al corregirlo, desaparece.
  const faltaProveedor = intento && !proveedorId;
  const problema = !intento ? null
    : !proveedorId ? "Falta elegir el proveedor."
    : incompletos ? `${incompletos === 1 ? "Hay un renglón sin" : `Hay ${incompletos} renglones sin`} costo o sin descripción: están marcados, completalos para registrar.`
    : null;

  async function registrar() {
    if (ocupado || !enLinea) return;
    setIntento(true);
    if (ingreso.falta === "proveedor") { if (esCelular) setEligiendoProveedor(true); else selector.current?.focus(); return; }
    if (ingreso.falta === "productos") return;
    if (ingreso.falta === "renglones") { zona.current?.querySelector<HTMLElement>("[aria-invalid='true'], .falta input")?.focus(); return; }
    const registro = await ingreso.registrar();
    if (!registro) return;
    setExito({ total: registro.total, proveedor: registro.proveedor, detalle: detalleDelRegistro(registro) });
    setIntento(false); setDescartado(null);
    if (registro.dePedido) irA("compras");
  }

  function descartar() { setDescartado(ingreso.descartar()); setIntento(false); caja.current?.focus(); }

  const pasosDelTotal = [
    ...renglones.slice(0, 12).map((r) => `${r.descripcion || "Producto nuevo"}: ${conUnidad(r.cantidad, unidadDe(r.producto))} × ${r.costo === null ? "sin costo" : pesos(r.costo)} = ${pesos((r.costo ?? 0) * r.cantidad)}`),
    ...(renglones.length > 12 ? [`…y ${renglones.length - 12} renglones más.`] : []),
    `Total sin IVA: ${pesos(total)}`,
  ];

  const campoCantidad = (r: Renglon) => {
    const unidad = unidadDe(r.producto);
    return (
      <span className="compras-cantidad">
        {enteras(unidad)
          ? <Contador valor={r.cantidad} entera sinBotones={!esCelular} alCambiar={(v) => cambiar(r.clave, { cantidad: Math.floor(v) })} etiqueta={`Cantidad de ${r.descripcion || "producto nuevo"}`} />
          : <CantidadAGranel valor={r.cantidad} unidad={unidad} conBotones={esCelular} alCambiar={(v) => cambiar(r.clave, { cantidad: v })} etiqueta={`Cantidad de ${r.descripcion}, en ${unidad}`} />}
        <span className="detalle" data-testid="unidad-ingreso">{abreviarUnidad(unidad)}</span>
      </span>
    );
  };
  const campoCosto = (r: Renglon) => (
    <label className={`con-prefijo compras-costo ${r.costo === null ? "falta" : ""}`}>
      <span aria-hidden="true">$</span>
      <input inputMode="decimal" placeholder="costo" value={r.costoTexto} aria-label={`Costo unitario sin IVA de ${r.descripcion || "producto nuevo"}`} aria-invalid={intento && r.costo === null ? true : undefined} onFocus={(e) => e.target.select()}
        onChange={(e) => cambiarCosto(r.clave, e.target.value)} data-testid="costo" />
    </label>
  );
  const segunLista = (r: Renglon) => {
    const dif = diferenciaConLaLista(r);
    if (r.costoLista === null) return <span className="detalle">{r.producto ? "sin costo de lista" : "no tiene lista"}</span>;
    if (dif === null || Math.abs(dif) < 0.05) return <span className="detalle">{dif === null ? `lista ${pesos(r.costoLista)}` : `igual que la lista (${pesos(r.costoLista)})`}</span>;
    return (
      <span className="compras-segun-lista">
        <span className="detalle">lista {pesos(r.costoLista)}</span>
        <Explicado className={`deposito-dif ${dif > 0 ? "falta" : "sobra"}`} valor={`${porcentaje(dif)} ${dif > 0 ? "subió" : "bajó"}`} titulo="Diferencia contra la lista" pasos={[
          `Costo según la lista${r.producto?.proveedor ? ` de ${r.producto.proveedor}` : ""}: ${pesos(r.costoLista)}`,
          `Costo del comprobante: ${pesos(r.costo)}`,
          `${pesos(r.costo)} contra ${pesos(r.costoLista)}: ${dif > 0 ? "subió" : "bajó"} ${porcentaje(Math.abs(dif)).replace("+", "")}. Al registrar, el costo del comprobante pasa a ser el vigente.`,
        ]} />
      </span>
    );
  };
  const nombreDe = (r: Renglon) => r.producto
    ? <span className="con-foto-de-producto"><FotoDeProducto producto={r.producto} alCambiar={(f) => cambiarFoto(r, f)} /><span><span className="nombre">{r.descripcion}</span><span className="detalle compras-bajo-nombre">{detalleDe(r.producto) || "Sin marca ni proveedor"}</span></span></span>
    : (
      <span className="compras-nuevo">
        <Pastilla tipo="azul" sinPunto>Producto nuevo</Pastilla>
        <input className="entrada" value={r.descripcion} placeholder="Descripción del producto nuevo" aria-label="Descripción del producto nuevo" aria-invalid={!r.descripcion.trim()} onChange={(e) => cambiar(r.clave, { descripcion: e.target.value })} data-testid="descripcion-nueva" />
      </span>
    );
  const botonQuitar = (r: Renglon) => <Boton tam={esCelular ? undefined : "chico"} icono="basura" variante="peligro" title="Quitar del ingreso" aria-label={`Quitar ${r.descripcion || "el producto nuevo"}`} onClick={() => quitar(r.clave)} data-testid="quitar" />;

  return (
    <Pagina titulo="Compras" testId="pantalla-compras" className={renglones.length ? "deposito-con-pie" : ""} bajada="Acá se carga la mercadería que llega. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.">
      <Aviso tipo="alerta" testId="sin-conexion">{!enLinea ? "Sin conexión: registrar un ingreso necesita internet. Podés seguir cargando; lo cargado queda guardado en este dispositivo hasta que vuelva." : null}</Aviso>
      <Aviso tipo="error">{errorCatalogo}</Aviso>
      <AvisoDePedido pedido={pedido} error={errorPedido} />
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />

      <section className="compras-ingreso" aria-labelledby={`${id}-titulo`}>
        <h2 id={`${id}-titulo`} className="seccion-titulo">Ingreso de mercadería</h2>
        <div className="compras-datos">
          <div className="campo compras-proveedor">
            <label htmlFor={`${id}-proveedor`}>Proveedor</label>
            {esCelular ? (
              <button type="button" id={`${id}-proveedor`} className={`selector compras-elegir ${proveedor ? "" : "sin-elegir"}`} onClick={() => setEligiendoProveedor(true)} aria-haspopup="dialog" aria-invalid={faltaProveedor || undefined} aria-describedby={faltaProveedor ? `${id}-falta-proveedor` : undefined} data-testid="proveedor">
                <span className="corta">{proveedor ? proveedor.nombre : "Elegí el proveedor"}</span><Icono nombre="abajo" tam={18} />
              </button>
            ) : (
              <select ref={selector} id={`${id}-proveedor`} className="selector" value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} autoFocus={!proveedorId} aria-invalid={faltaProveedor || undefined} aria-describedby={faltaProveedor ? `${id}-falta-proveedor` : undefined} data-testid="proveedor">
                <option value="">{proveedores === null ? "Trayendo los proveedores…" : "Elegí el proveedor"}</option>
                {(proveedores ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            )}
            {faltaProveedor && <p className="compras-falta" id={`${id}-falta-proveedor`} role="alert">Elegí de qué proveedor llegó.</p>}
          </div>
          <div className="campo" data-testid="comprobante">
            <span id={`${id}-comprobante`}>Comprobante</span>
            <Segmentos opciones={COMPROBANTES} actual={comprobante} alElegir={setComprobante} etiqueta="Comprobante" />
          </div>
          {comprobante !== "sin_comprobante" && (
            <div className="campo compras-foto"><span>{comprobante === "remito" ? "Foto del remito" : "Foto de la factura"}</span><FotoDeFactura foto={foto} alCambiar={setFoto} conCelular={!esCelular} nombre={comprobante === "remito" ? "remito" : "factura"} /></div>
          )}
          <label className="campo compras-fecha"><span>Fecha</span><input className="entrada" type="date" value={fechaCompra} max={hoyLocal()} onChange={(e) => setFechaCompra(e.target.value || hoyLocal())} data-testid="fecha" /></label>
        </div>

        <BuscadorDeProducto primero={proveedor?.id} consulta={consulta} alCambiar={(v) => { setConsulta(v); setErrorCodigo(null); }} resultados={resultados} alElegir={(p) => agregar(p)} alCrear={(d) => agregar(null, d)} cajaRef={caja}
          placeholder={esCelular ? "Producto que llegó" : "Escribí el producto que llegó"} alEscanear={esCelular && hayCamara() ? () => { setUltimoEscaneado(null); setEscaneando(true); } : undefined}
          aLaDerecha={(p) => <span className="importe chico">{p.costo_neto === null ? "sin costo" : pesos(p.costo_neto)}</span>} />
        <Aviso tipo="error" testId="codigo-desconocido">{errorCodigo}</Aviso>
        {escaneando && <Escaner alDetectar={alDetectar} alCerrar={() => setEscaneando(false)} ultimo={ultimoEscaneado} />}

        <Aviso tipo="info" accion={<Boton tam="chico" icono="deshacer" onClick={() => { if (descartado) ingreso.reponer(descartado); setDescartado(null); }} data-testid="deshacer-descarte">Deshacer</Boton>}>
          {descartado && renglones.length === 0 ? `Descartaste el ingreso (${plural(descartado.length, "renglón", "renglones")}).` : null}
        </Aviso>

        <div ref={zona}>
          {renglones.length === 0 ? (
            <Vacio icono="compras" titulo={proveedor ? "Buscá el primer producto que llegó" : "Elegí el proveedor y buscá el primer producto"}>
              El costo viene de la última lista del proveedor: en el caso común solo ponés la cantidad. Si el comprobante dice otro costo, escribilo y pasa a ser el vigente.
            </Vacio>
          ) : esCelular ? (
            <ul className="compras-tarjetas" data-testid="renglones">
              {renglones.map((r) => (
                <li key={r.clave} className={`tarjeta compras-tarjeta ${incompleto(r) ? "incompleto" : ""}`} data-clave={r.clave} data-testid="renglon" onKeyDown={(e) => teclasDeRenglon(e, r)}>
                  <div className="compras-tarjeta-cabeza"><div className="crece">{nombreDe(r)}</div>{botonQuitar(r)}</div>
                  <div className="compras-tarjeta-campos">
                    <div className="campo"><span>Cantidad</span>{campoCantidad(r)}</div>
                    <div className="campo"><span>Costo sin IVA</span>{campoCosto(r)}</div>
                  </div>
                  <div className="compras-tarjeta-pie">
                    {r.costo === null ? <span className="falta-texto">Falta el costo</span> : segunLista(r)}
                    <span className="importe chico">{r.costo === null ? "" : pesosCortos(r.costo * r.cantidad)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="tabla-marco">
              <table className="tabla compras-tabla" data-testid="renglones">
                <thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario sin IVA</th><th>Según la lista</th><th className="num">Subtotal</th><th><span className="solo-lectores">Quitar</span></th></tr></thead>
                <tbody>
                  {renglones.map((r) => (
                    <tr key={r.clave} className={incompleto(r) ? "incompleto" : ""} data-clave={r.clave} data-testid="renglon" onKeyDown={(e) => teclasDeRenglon(e, r)}>
                      <td>{nombreDe(r)}</td>
                      <td className="angosta">{campoCantidad(r)}</td>
                      <td className="angosta">{campoCosto(r)}{r.costo === null && <span className="falta-texto compras-bajo-nombre">Falta el costo</span>}</td>
                      <td>{segunLista(r)}</td>
                      <td className="num"><span className="importe chico">{r.costo === null ? "—" : pesosCortos(r.costo * r.cantidad)}</span></td>
                      <td className="angosta">{botonQuitar(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {renglones.length > 0 && <p className="detalle solo-compu">Enter en la cantidad vuelve al buscador. El costo viene de la última lista: si el comprobante dice otro, escribilo y pasa a ser el vigente.</p>}
        {renglones.length > 0 && <div className="solo-celu"><Boton variante="peligro" icono="basura" onClick={descartar} data-testid="descartar-celular">Descartar el ingreso</Boton></div>}
      </section>

      {renglones.length > 0 && (
        <div className="deposito-pie compras-pie">
          <div className="compras-total">
            <span className="rotulo">Total sin IVA<span className="solo-compu"> · {plural(renglones.length, "renglón", "renglones")}</span></span>
            <span className="importe" data-testid="total"><Explicado valor={pesosCortos(total)} titulo="De dónde sale el total" pasos={pasosDelTotal} /></span>
          </div>
          <div className="compras-pie-aviso" aria-live="polite">
            {(problema ?? error) && <span className="compras-falta" role="alert" data-testid="error-ingreso">{problema ?? error}</span>}
          </div>
          <Boton className="solo-compu" onClick={descartar} disabled={ocupado} data-testid="descartar">Descartar</Boton>
          <Boton variante="principal" tam="grande" onClick={() => void registrar()} disabled={ocupado || !enLinea} data-testid={esCelular ? "registrar" : "confirmar"}>
            {ocupado ? "Registrando…" : "Registrar ingreso"}
          </Boton>
        </div>
      )}

      {eligiendoProveedor && (
        <ElegirProveedor proveedores={proveedores} elegido={proveedorId} alElegir={(idElegido) => { setProveedorId(idElegido); setEligiendoProveedor(false); }} alCerrar={() => setEligiendoProveedor(false)} />
      )}
      {exito && <Exito que="Ingreso registrado" importe={pesosCortos(exito.total)} medio={exito.proveedor} detalle={exito.detalle} boton="Listo" alCerrar={() => { setExito(null); caja.current?.focus(); }} />}
    </Pagina>
  );
}

// Cantidad a granel (kilo, metro, litro): hasta un decimal, con coma. Guarda lo tipeado
// para que la coma no desaparezca mientras se escribe «2,5».
function CantidadAGranel({ valor, unidad, alCambiar, conBotones, etiqueta }: { valor: number; unidad: Unidad; alCambiar: (v: number) => void; conBotones: boolean; etiqueta: string }) {
  const escrito = (v: number) => (v === 0 ? "" : String(v).replace(".", ","));
  const [texto, setTexto] = useState(escrito(valor));
  useEffect(() => { setTexto((t) => (cantidadValida(t, unidad) === valor ? t : escrito(valor))); }, [valor, unidad]);
  const redondo = (v: number) => Math.round(v * 10) / 10;
  return (
    <div className="contador">
      {conBotones && <button type="button" aria-label="Medio menos" onClick={() => alCambiar(Math.max(0.1, redondo(valor - 0.5)))}><Icono nombre="menos" tam={18} grosor={2.4} /></button>}
      <input inputMode="decimal" aria-label={etiqueta} value={texto} onFocus={(e) => e.target.select()}
        onChange={(e) => { const t = e.target.value.replace(/[^\d,.]/g, ""); setTexto(t); alCambiar(cantidadValida(t, unidad)); }}
        onKeyDown={(e) => {
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault(); e.stopPropagation();
          alCambiar(e.key === "ArrowUp" ? redondo(valor + 0.5) : Math.max(0.1, redondo(valor - 0.5)));
        }}
        onBlur={() => { if (valor === 0) alCambiar(1); else setTexto(escrito(valor)); }} data-testid="cantidad" />
      {conBotones && <button type="button" aria-label="Medio más" onClick={() => alCambiar(redondo(valor + 0.5))}><Icono nombre="mas" tam={18} grosor={2.4} /></button>}
    </div>
  );
}

function ElegirProveedor({ proveedores, elegido, alElegir, alCerrar }: { proveedores: Proveedor[] | null; elegido: string; alElegir: (id: string) => void; alCerrar: () => void }) {
  const [filtro, setFiltro] = useState("");
  const visibles = (proveedores ?? []).filter((p) => p.nombre.toLocaleLowerCase("es").includes(filtro.trim().toLocaleLowerCase("es")));
  return (
    <Hoja titulo="¿De qué proveedor llegó?" alCerrar={alCerrar} testId="hoja-proveedores">
      {(proveedores?.length ?? 0) > 8 && <input className="entrada" type="search" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Escribí parte del nombre" aria-label="Buscar proveedor" />}
      {proveedores === null && <Progreso texto="Trayendo los proveedores…" />}
      {proveedores?.length === 0 && <Aviso tipo="alerta">No se pudieron traer los proveedores. Revisá la conexión, cerrá esta ventana y volvé a abrirla.</Aviso>}
      {visibles.length > 0 && (
        <ul className="lista">
          {visibles.map((p) => (
            <li key={p.id}>
              <button type="button" className={`renglon ${p.id === elegido ? "elegido" : ""}`} aria-pressed={p.id === elegido} onClick={() => alElegir(p.id)} data-testid="opcion-proveedor">
                <span className="nombre">{p.nombre}</span>{p.id === elegido && <Icono nombre="tilde" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      {proveedores && proveedores.length > 0 && visibles.length === 0 && <p className="detalle">Ningún proveedor con «{filtro.trim()}».</p>}
    </Hoja>
  );
}

import { useEffect, useRef, useState } from "react";
import { useVeCostos } from "../../../Costos";
import { CodigoDeBarras } from "../../../CodigoDeBarras";
import { usePuede } from "../../../permisos";
import { Boton, FotoProducto, Hoja, Icono, Margenes, Toast } from "../ui";
import { useCatalogo } from "../../../../catalogo";
import { descargar, subirFoto } from "../../../../api";
import { fecha, pesos, pesosCortos } from "../../../../formato";
import type { Producto } from "../../../celular/pantallas/Productos";
import { margenAMano, otroMargen, precioDelProducto } from "../../../../negocio/catalogo/precio";
import { stockDe } from "../../../../negocio/catalogo/stock-y-filtros";
import { cuentaDelPrecio, useOrigenDeLista } from "../../../../negocio/catalogo/ficha";
import { agregarALaVenta } from "../../../../negocio/ventas/venta-en-curso";
import { MARGENES } from "../../../../negocio/precios/vista-previa";
import { TEXTOS } from "../../../textos";
import "../estilos/ficha.css";

type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };
const t = TEXTOS.ficha;

// La ficha del producto en la computadora (specs/016, la maqueta A en dos columnas): arriba la
// foto, el stock y el nombre; a la izquierda el código, el proveedor y el archivo de origen; a la
// derecha el precio con «Así se calcula»; abajo las teclas, «Listo» y «Agregar a la venta».
// Teclado: ← → recorren los márgenes y Enter elige; ↑ ↓ las partes de la ficha; Mayús + 1 a 5
// fijan el margen; «+» agrega a la venta; Esc cierra.
export function FichaProducto({ producto: p, alCerrar, alCambiar, quienLoTiene }: { producto: Producto; alCerrar: () => void; quienLoTiene: (codigo: string) => Producto | undefined; alCambiar: (c: Cambios) => void }) {
  const { stock } = useCatalogo();
  const puede = usePuede();
  const veCostos = useVeCostos();
  const fijaMargen = puede("catalogo.margenes");
  const puedeVender = puede("ventas.registrar");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const hay = stockDe(p, stock);
  const agregar = () => { agregarALaVenta(p); setMensaje(`${TEXTOS.catalogo.agregado.largo}: ${p.descripcion}`); };

  function teclas(e: React.KeyboardEvent<HTMLDialogElement>) {
    const enCaja = (e.target as HTMLElement).tagName === "INPUT"; // en «Otro margen» las teclas escriben
    if (e.key === "+" && !e.ctrlKey && !e.metaKey && !e.altKey && puedeVender && !enCaja) { e.preventDefault(); agregar(); return; }
    if (e.shiftKey && /^Digit[1-5]$/.test(e.code) && fijaMargen && p.costo_neto !== null && !enCaja) { e.preventDefault(); alCambiar({ margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! }); return; }
    teclasDeLaFicha(e);
  }

  return (
    <Hoja ancha titulo={p.descripcion} alCerrar={alCerrar} testId="ficha-producto" alTeclear={teclas}
      foto={<FotoDeLaFicha producto={p} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} />}
      sobreTitulo={<span className={`etiqueta-stock ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.largo}` : hay.texto}</span>}
      bajoTitulo={<span className="detalle">{[p.marca, p.codigo_proveedor ? `Código ${p.codigo_proveedor}` : null].filter(Boolean).join(" · ") || "Sin marca ni código"}</span>}
      pie={<div className="ficha-pie">
        <span className="ficha-teclas detalle">
          {fijaMargen && <span><kbd className="tecla">Mayús</kbd> + <kbd className="tecla">1</kbd> a <kbd className="tecla">5</kbd> margen</span>}
          {puedeVender && <span><kbd className="tecla">+</kbd> {t.teclaAgregar.largo}</span>}
          <span><kbd className="tecla">Esc</kbd> cierra</span>
        </span>
        <Boton onClick={alCerrar} data-ficha-vertical="" data-testid="ficha-listo">{t.listo.largo}</Boton>
        {puedeVender && <Boton variante="marino" icono="carrito" onClick={agregar} data-ficha-vertical="" data-testid="ficha-agregar">{TEXTOS.catalogo.agregarALaVenta.largo}</Boton>}
      </div>}>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
      <div className="ficha-columnas">
        <div className="ficha-columna">
          <CodigoDeBarras producto={p} alGuardar={(codigo) => alCambiar({ codigo_barras: codigo })} quienLoTiene={quienLoTiene} />
          {veCostos && <TarjetaProveedor producto={p} alUsar={(id) => alCambiar({ proveedor_preferido_id: id })} />}
          {veCostos && <TarjetaArchivo producto={p} alError={setMensaje} />}
        </div>
        <div className="ficha-columna">
          <TarjetaPrecio producto={p} fijaMargen={fijaMargen} veCostos={veCostos} alCambiar={alCambiar} />
        </div>
      </div>
    </Hoja>
  );
}

function FotoDeLaFicha({ producto: p, alSubir }: { producto: Producto; alSubir: (archivo: File) => Promise<void> }) {
  const archivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSubiendo(true);
    try { await alSubir(f); } finally { setSubiendo(false); }
  }
  return (
    <div className={`ficha-foto ${p.foto_url ? "" : "sin"}`}>
      <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={alSubir} />
      <input ref={archivo} type="file" accept="image/*" hidden onChange={elegida} data-testid="archivo-foto-ficha" />
      <button type="button" className="ficha-cambiar-foto" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="cambiar-foto">
        <Icono nombre="camara" tam={16} />{subiendo ? "Subiendo…" : p.foto_url ? t.cambiarFoto.largo : t.sacarFoto.largo}
      </button>
    </div>
  );
}

function TarjetaProveedor({ producto: p, alUsar }: { producto: Producto; alUsar: (proveedorId: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const todos = p.proveedores ?? [];
  if (!p.proveedor) return null;
  const masBarato = todos[0]?.proveedor_id;
  const enUso = todos.find((v) => v.proveedor === p.proveedor);
  const otros = todos.filter((v) => v !== enUso);
  const elMasBarato = enUso ? enUso.proveedor_id === masBarato : todos.length <= 1;
  return (
    <section className="ficha-tarjeta" aria-labelledby="ficha-proveedor">
      <h3 id="ficha-proveedor" className="ficha-tarjeta-titulo">{t.proveedor.largo}</h3>
      <button type="button" className="ficha-proveedor" onClick={() => setAbierta((a) => !a)} disabled={otros.length === 0} aria-expanded={otros.length ? abierta : undefined}
        title={otros.length ? (abierta ? t.esconderProveedores.largo : t.verProveedores.largo) : undefined} data-ficha-vertical="" data-testid="proveedor-en-uso">
        <span className="ficha-inicial" aria-hidden="true">{p.proveedor.trim().charAt(0).toUpperCase()}</span>
        <span className="ficha-proveedor-texto">
          <span className="ficha-proveedor-nombre">{p.proveedor}{elMasBarato && <span className="ficha-estrella" title={t.masBarato.largo} data-testid="mas-barato">★</span>}<span className="ficha-chip">{t.principal.largo}</span></span>
          {p.fecha_lista && <span className="detalle">{t.ultimaLista.largo}: {fecha(p.fecha_lista)}</span>}
          <span className="ficha-costo"><span>{t.costoDeCompra.largo}</span><strong>{pesos(p.costo_neto)}</strong></span>
        </span>
        {otros.length > 0 && <span className={`ficha-flecha ${abierta ? "abierta" : ""}`} aria-hidden="true"><Icono nombre="derecha" tam={20} /></span>}
      </button>
      {abierta && (
        <ul className="ficha-otros" data-testid="otros-proveedores">
          {otros.map((v) => (
            <li key={v.proveedor_id}>
              <span className="ficha-proveedor-texto">
                <span className="ficha-proveedor-nombre">{v.proveedor}{v.proveedor_id === masBarato && <span className="ficha-estrella" title={t.masBarato.largo}>★</span>}</span>
                <span className="detalle">{t.ultimaLista.largo}: {fecha(v.fecha_lista)}</span>
              </span>
              <strong>{pesos(v.costo_neto)}</strong>
              <Boton tam="chico" onClick={() => alUsar(v.proveedor_id)} data-ficha-vertical="" data-testid="proveedor-de-producto">{t.usar.largo}</Boton>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TarjetaPrecio({ producto: p, fijaMargen, veCostos, alCambiar }: { producto: Producto; fijaMargen: boolean; veCostos: boolean; alCambiar: (c: Cambios) => void }) {
  const { costo, calculo } = precioDelProducto(p);
  const manual = margenAMano(p);
  return (
    <section className="ficha-tarjeta" aria-labelledby="ficha-precio">
      <h3 id="ficha-precio" className="ficha-tarjeta-titulo">{t.precioYMargen.largo}</h3>
      <div className="ficha-precio-fila">
        <span className="detalle">{t.precioDeVenta.largo}</span>
        {calculo ? <strong className="ficha-precio" data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong>
          : <span className="ficha-sin-precio" data-testid="sin-precio">{costo === null ? "sin costo" : "elegí un margen"}</span>}
      </div>
      {fijaMargen && <>
        <Margenes flechasDeAfuera elegido={p.margen_elegido} disabled={costo === null} etiqueta="Margen" alElegir={(m) => alCambiar({ margen_elegido: m })} />
        <div className="ficha-otro">
          <label className="detalle" htmlFor="ficha-otro-margen">{t.otroMargen.largo}{manual !== null ? `: hoy ${manual} % a mano` : ""}</label>
          <OtroMargen producto={p} manual={manual} alCambiar={alCambiar} />
        </div>
      </>}
      {veCostos && <AsiSeCalcula producto={p} />}
    </section>
  );
}

function OtroMargen({ producto: p, manual, alCambiar }: { producto: Producto; manual: number | null; alCambiar: (c: Cambios) => void }) {
  const [texto, setTexto] = useState(manual === null ? "" : String(manual));
  useEffect(() => { setTexto(manual === null ? "" : String(manual)); }, [manual]);
  const guardar = () => { const v = otroMargen(texto); if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); else if (!texto) setTexto(manual === null ? "" : String(manual)); };
  return (
    <label className={`con-prefijo productos-otro ${manual !== null ? "activo" : ""}`}>
      <input id="ficha-otro-margen" inputMode="numeric" placeholder="ej. 120" value={texto} disabled={p.costo_neto === null} data-testid="otro-margen"
        onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); guardar(); } else if (e.key === "Escape") { e.stopPropagation(); setTexto(manual === null ? "" : String(manual)); (e.target as HTMLInputElement).blur(); } }}
        onBlur={guardar} />
      <span aria-hidden="true">%</span>
    </label>
  );
}

function AsiSeCalcula({ producto: p }: { producto: Producto }) {
  const [abierto, setAbierto] = useState(false);
  const c = cuentaDelPrecio(p);
  return (
    <div className="ficha-calculo" data-testid="asi-se-calcula">
      <button type="button" className="ficha-calculo-cabeza" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} data-ficha-vertical="" data-testid="abrir-calculo">
        <Icono nombre="calculadora" tam={20} /><span>{t.asiSeCalcula.largo}</span><Icono nombre={abierto ? "arriba" : "abajo"} tam={20} />
      </button>
      {abierto && (c.falta !== null ? <p className="ficha-calculo-falta" data-testid="cuenta">{c.falta === "costo" ? t.faltaCosto.largo : t.faltaMargen.largo}</p> : (
        <div className="ficha-cuenta" data-testid="cuenta">
          <span>{t.costoDeCompra.largo}{p.proveedor ? ` (${p.proveedor})` : ""}</span><b>{pesos(c.costo)}</b>
          {p.explicacion_costo.length > 0 && <small className="ficha-cuenta-detalle">{p.explicacion_costo.join(" · ")}</small>}
          <span>+ {t.margen.largo} {c.margen} %</span><b>{pesos(c.margenPesos)}</b>
          <span>+ {t.iva.largo} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.ivaPesos)}</b>
          <span className="total">= {t.conIva.largo}</span><b className="total">{pesos(c.conIva)}</b>
          <span className="cobra">{t.seCobra.largo}</span><b className="cobra" data-testid="se-cobra">{pesosCortos(c.cobra)}</b>
          <p>{t.redondeo.largo}</p>
        </div>
      ))}
    </div>
  );
}

function TarjetaArchivo({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  const origen = useOrigenDeLista(p.lista_importada_id, true);
  if (!p.lista_importada_id || origen?.estado === "no-esta") return null;
  const o = origen?.estado === "listo" ? origen.origen : null;
  return (
    <section className="ficha-tarjeta" aria-labelledby="ficha-archivo" data-testid="archivo-de-origen">
      <h3 id="ficha-archivo" className="ficha-tarjeta-titulo">{t.archivo.largo}</h3>
      <div className="ficha-archivo">
        <span className="ficha-archivo-icono" aria-hidden="true"><Icono nombre="archivo" tam={22} /></span>
        <span className="ficha-proveedor-texto">
          {o && <b className="ficha-archivo-nombre">{o.archivo_nombre}</b>}
          <span className="detalle">{[o?.proveedor ?? p.proveedor, fecha(o?.fecha_lista ?? p.fecha_lista), o ? `${o.productos.toLocaleString("es-AR")} productos` : null].filter(Boolean).join(" · ")}</span>
          {origen?.estado === "sin-conexion" && <span className="detalle">{t.sinConexionArchivo.largo}</span>}
        </span>
        <Boton tam="chico" icono="bajar" data-ficha-vertical="" data-testid="bajar-lista"
          onClick={() => descargar(`/listas/${p.lista_importada_id}/archivo`, o?.archivo_nombre ?? `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}.`))}>
          {t.descargar.largo}
        </Boton>
      </div>
    </section>
  );
}

// Teclado en la ficha: ← → recorren los márgenes sin elegir (Enter elige el que tiene el
// foco); ↑ ↓ recorren las partes de la ficha (Enter usa la que tiene el foco); ↑ desde la
// primera vuelve a los márgenes. En una caja de texto, ← → mueven el cursor.
function teclasDeLaFicha(e: React.KeyboardEvent<HTMLDialogElement>) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  const ficha = e.currentTarget;
  const foco = document.activeElement as HTMLElement | null;
  const margenes = [...ficha.querySelectorAll<HTMLButtonElement>(".margenes button:not([disabled])")];
  const alMargen = () => (margenes.find((b) => b.getAttribute("aria-checked") === "true") ?? margenes[0])?.focus();
  if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
    if (margenes.length === 0 || foco?.tagName === "INPUT" || foco?.tagName === "TEXTAREA") return;
    e.preventDefault();
    const i = margenes.indexOf(foco as HTMLButtonElement);
    if (i < 0) alMargen();
    else margenes[(i + (e.key === "ArrowRight" ? 1 : -1) + margenes.length) % margenes.length]!.focus();
  } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
    if (foco?.tagName === "TEXTAREA") return;
    e.preventDefault();
    const lugares = [...ficha.querySelectorAll<HTMLElement>("[data-ficha-vertical]:not([disabled])")];
    const i = lugares.indexOf(foco as HTMLElement);
    if (e.key === "ArrowDown") lugares[i < 0 ? 0 : Math.min(i + 1, lugares.length - 1)]?.focus();
    else if (i > 0) lugares[i - 1]!.focus();
    else alMargen();
  }
}

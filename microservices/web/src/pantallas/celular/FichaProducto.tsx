import { useEffect, useRef, useState } from "react";
import { useVeCostos } from "../Costos";
import { CodigoDeBarras } from "../CodigoDeBarras";
import { usePuede } from "../permisos";
import { MARGENES } from "../../negocio/precios/vista-previa";
import { Hoja, Icono, Toast } from "./componentes/base";
import { FotoProducto } from "./componentes/Foto";
import { useCatalogo } from "../../catalogo";
import { descargar, subirFoto } from "../../api";
import { fecha, pesos, pesosCortos } from "../../formato";
import type { Producto } from "./pantallas/Productos";
import { margenAMano, otroMargen, precioDelProducto } from "../../negocio/catalogo/precio";
import { stockDe } from "../../negocio/catalogo/stock-y-filtros";
import { cuentaDelPrecio, useOrigenDeLista } from "../../negocio/catalogo/ficha";
import { agregarALaVenta } from "../../negocio/ventas/venta-en-curso";
import { cuantosProductos, TEXTOS } from "../textos";
import "./ficha.css";

type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };
const t = TEXTOS.ficha;

// La ficha del producto en el celular (specs/016, maqueta A): la foto, el stock y el nombre
// arriba; después una tarjeta por tema (código, proveedor, precio con «Así se calcula», archivo
// de origen) y, fijos abajo, «Listo» y «Agregar a la venta».
export function FichaProducto({ producto: p, alCerrar, alCambiar, quienLoTiene }: { producto: Producto; alCerrar: () => void; quienLoTiene: (codigo: string) => Promise<Producto | undefined>; alCambiar: (c: Cambios) => void }) {
  const { stock } = useCatalogo();
  const puede = usePuede();
  const veCostos = useVeCostos();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const hay = stockDe(p, stock);
  const subir = async (archivo: File) => alCambiar({ foto_url: await subirFoto(p.id, archivo) });

  return (
    <Hoja alCerrar={alCerrar} testId="ficha-producto">
      <div className="ficha-cabeza">
        <FotoDeLaFicha producto={p} alSubir={subir} />
        <div className="ficha-titulo">
          <span className={`etiqueta-stock ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.corto}` : hay.texto}</span>
          <h2 className="ficha-nombre">{p.descripcion}</h2>
          <small>{[p.marca, p.codigo_proveedor ? `Código ${p.codigo_proveedor}` : null].filter(Boolean).join(" · ") || t.sinMarca.corto}</small>
        </div>
      </div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
      <CodigoDeBarras producto={p} celular alGuardar={(codigo) => alCambiar({ codigo_barras: codigo })} quienLoTiene={quienLoTiene} />
      {veCostos && <TarjetaProveedor producto={p} alUsar={(id) => alCambiar({ proveedor_preferido_id: id })} />}
      <TarjetaPrecio producto={p} fijaMargen={puede("catalogo.margenes")} veCostos={veCostos} alCambiar={alCambiar} />
      {veCostos && <TarjetaArchivo producto={p} alError={setMensaje} />}
      <div className="ficha-pie">
        <button type="button" className="boton" onClick={alCerrar} data-testid="ficha-listo">{t.listo.corto}</button>
        {puede("ventas.registrar") && (
          <button type="button" className="boton tinta" onClick={() => { agregarALaVenta(p); setMensaje(`${TEXTOS.catalogo.agregado.corto}: ${p.descripcion}`); }} data-testid="ficha-agregar">
            <Icono nombre="carrito" tam={20} />{TEXTOS.catalogo.agregarALaVenta.corto}
          </button>
        )}
      </div>
    </Hoja>
  );
}

// La foto grande (tocarla la amplía, como siempre) con «Cambiar foto» encima; sin foto, un lugar
// neutro con «Sacar foto».
function FotoDeLaFicha({ producto: p, alSubir }: { producto: Producto; alSubir: (archivo: File) => Promise<void> }) {
  const archivo = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function elegida(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSubiendo(true); setError(null);
    try { await alSubir(f); } catch (err) { setError(`${t.noSubio.corto}: ${(err as Error).message}`); } finally { setSubiendo(false); }
  }
  return (
    <div className={`ficha-foto ${p.foto_url ? "" : "sin"}`}>
      <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={alSubir} />
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto-ficha" />
      <button type="button" className="ficha-cambiar-foto" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="cambiar-foto">
        <Icono nombre="camara" tam={16} />{subiendo ? t.subiendo.corto : p.foto_url ? t.cambiarFoto.corto : t.sacarFoto.corto}
      </button>
      {error && <p className="ficha-foto-error" role="alert">{error}</p>}
    </div>
  );
}

// El proveedor en uso primero (RF-113); la flecha despliega los demás, para elegir de cuál sale el costo.
function TarjetaProveedor({ producto: p, alUsar }: { producto: Producto; alUsar: (proveedorId: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const todos = p.proveedores ?? [];
  if (!p.proveedor) return null;
  const masBarato = todos[0]?.proveedor_id;
  const enUso = todos.find((v) => v.proveedor_id === p.proveedor_id);
  const otros = todos.filter((v) => v !== enUso);
  const elMasBarato = enUso ? enUso.proveedor_id === masBarato : todos.length <= 1;
  return (
    <section className="tarjeta ficha-tarjeta" aria-labelledby="ficha-proveedor">
      <h3 id="ficha-proveedor" className="ficha-tarjeta-titulo">{t.proveedor.corto}</h3>
      <button type="button" className="ficha-proveedor" onClick={() => setAbierta((a) => !a)} disabled={otros.length === 0} aria-expanded={otros.length ? abierta : undefined}
        aria-label={otros.length ? (abierta ? t.esconderProveedores.corto : t.verProveedores.corto) : undefined} data-testid="proveedor-en-uso">
        <span className="ficha-inicial" aria-hidden="true">{p.proveedor.trim().charAt(0).toUpperCase()}</span>
        <span className="ficha-proveedor-texto">
          <span className="ficha-proveedor-nombre">{p.proveedor}{elMasBarato && <span className="ficha-estrella" title={t.masBarato.corto} data-testid="mas-barato">★</span>}<span className="ficha-chip">{t.principal.corto}</span></span>
          {p.fecha_lista && <span className="ficha-detalle">{t.ultimaLista.corto}: {fecha(p.fecha_lista)}</span>}
          <span className="ficha-costo"><span>{t.costoDeCompra.corto}</span><strong>{pesos(p.costo_neto)}</strong></span>
        </span>
        {otros.length > 0 && <span className={`ficha-flecha ${abierta ? "abierta" : ""}`} aria-hidden="true"><Icono nombre="derecha" tam={22} /></span>}
      </button>
      {abierta && (
        <ul className="ficha-otros" data-testid="otros-proveedores">
          {otros.map((v) => (
            <li key={v.proveedor_id}>
              <span className="ficha-proveedor-texto">
                <span className="ficha-proveedor-nombre">{v.proveedor}{v.proveedor_id === masBarato && <span className="ficha-estrella" title={t.masBarato.corto}>★</span>}</span>
                <span className="ficha-detalle">{t.ultimaLista.corto}: {fecha(v.fecha_lista)}</span>
              </span>
              <strong>{pesos(v.costo_neto)}</strong>
              <button type="button" className="boton chico" onClick={() => alUsar(v.proveedor_id)} data-testid="proveedor-de-producto">{t.usar.corto}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// El precio, los márgenes y «Así se calcula» plegado (RF-114).
function TarjetaPrecio({ producto: p, fijaMargen, veCostos, alCambiar }: { producto: Producto; fijaMargen: boolean; veCostos: boolean; alCambiar: (c: Cambios) => void }) {
  const { costo, calculo } = precioDelProducto(p);
  const manual = margenAMano(p);
  const [otro, setOtro] = useState(manual === null ? "" : String(manual));
  useEffect(() => { setOtro(manual === null ? "" : String(manual)); }, [manual]);
  return (
    <section className="tarjeta ficha-tarjeta" aria-labelledby="ficha-precio">
      <h3 id="ficha-precio" className="ficha-tarjeta-titulo">{t.precioYMargen.corto}</h3>
      <div className="ficha-precio-fila">
        <span className="ficha-detalle">{t.precioDeVenta.corto}</span>
        {calculo ? <strong className="ficha-precio" data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong>
          : <span className="ficha-sin-precio" data-testid="sin-precio">{costo === null ? t.sinCosto.corto : fijaMargen ? t.eligeMargen.corto : t.sinMargen.corto}</span>}
      </div>
      {fijaMargen && <>
        <div className="cuadricula-5" role="radiogroup" aria-label="margen">
          {MARGENES.map((m, i) => (
            <button key={m} type="button" className={`boton ${p.margen_elegido === m ? "activo" : ""}`} title={`Shift+${i + 1}`} disabled={costo === null} onClick={() => alCambiar({ margen_elegido: m })}>{m} %</button>
          ))}
        </div>
        <div className="fila-otro">
          <span>{t.otroMargen.corto}{manual !== null ? ` · ${manual} % ${t.aMano.corto}` : ""}</span>
          <label className="campo"><input inputMode="numeric" placeholder="ej. 120" value={otro} disabled={costo === null} data-testid="otro-margen"
            onChange={(e) => setOtro(e.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(e) => { if (e.key === "Enter") { const v = otroMargen(otro); if (v !== null) alCambiar({ margen_elegido: v }); } }}
            onBlur={() => { const v = otroMargen(otro); if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); }} /><span>%</span></label>
        </div>
      </>}
      {veCostos && <AsiSeCalcula producto={p} />}
    </section>
  );
}

export function AsiSeCalcula({ producto: p }: { producto: Producto }) {
  const [abierto, setAbierto] = useState(false);
  const c = cuentaDelPrecio(p);
  return (
    <div className="ficha-calculo" data-testid="asi-se-calcula">
      <button type="button" className="ficha-calculo-cabeza" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} data-testid="abrir-calculo">
        <Icono nombre="calculadora" tam={20} /><span>{t.asiSeCalcula.corto}</span><Icono nombre={abierto ? "arriba" : "abajo"} tam={20} />
      </button>
      {abierto && (c.falta !== null ? <p className="ficha-calculo-falta" data-testid="cuenta">{c.falta === "costo" ? t.faltaCosto.corto : t.faltaMargen.corto}</p> : (
        <div className="ficha-cuenta" data-testid="cuenta">
          <span>{t.costoDeCompra.corto}{p.proveedor ? ` (${p.proveedor})` : ""}</span><b>{pesos(c.costo)}</b>
          {p.explicacion_costo.length > 0 && <small className="ficha-cuenta-detalle">{p.explicacion_costo.join(" · ")}</small>}
          <span>+ {t.margen.corto} {c.margen} %</span><b>{pesos(c.margenPesos)}</b>
          <span>+ {t.iva.corto} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.ivaPesos)}</b>
          <span className="total">= {t.conIva.corto}</span><b className="total">{pesos(c.conIva)}</b>
          <span className="cobra">{t.seCobra.corto}</span><b className="cobra" data-testid="se-cobra">{pesosCortos(c.cobra)}</b>
          <p>{t.redondeo.corto}</p>
        </div>
      ))}
    </div>
  );
}

// El archivo de origen del costo (RF-115): nombre, proveedor, fecha y cuántos productos, y bajarlo.
function TarjetaArchivo({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  const origen = useOrigenDeLista(p.lista_importada_id, true);
  if (!p.lista_importada_id || origen?.estado === "no-esta") return null;
  const o = origen?.estado === "listo" ? origen.origen : null;
  return (
    <section className="tarjeta ficha-tarjeta" aria-labelledby="ficha-archivo" data-testid="archivo-de-origen">
      <h3 id="ficha-archivo" className="ficha-tarjeta-titulo">{t.archivo.corto}</h3>
      <div className="ficha-archivo">
        <span className="ficha-archivo-icono" aria-hidden="true"><Icono nombre="excel" tam={22} /></span>
        <span className="ficha-proveedor-texto">
          {o && <b className="ficha-archivo-nombre">{o.archivo_nombre}</b>}
          <span className="ficha-detalle">{[o?.proveedor ?? p.proveedor, fecha(o?.fecha_lista ?? p.fecha_lista), o ? cuantosProductos(o.productos) : null].filter(Boolean).join(" · ")}</span>
        </span>
      </div>
      {origen?.estado === "sin-conexion" && <p className="ficha-detalle">{t.sinConexionArchivo.corto}</p>}
      <button type="button" className="boton ficha-descargar" data-testid="bajar-lista"
        onClick={() => descargar(`/listas/${p.lista_importada_id}/archivo`, o?.archivo_nombre ?? `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}`))}>
        <Icono nombre="bajar" tam={18} />{t.descargar.corto}
      </button>
    </section>
  );
}

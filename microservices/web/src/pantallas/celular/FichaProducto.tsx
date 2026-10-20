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
import { cuentaDelPrecio, diferenciaDeCosto, useOrigenDeLista } from "../../negocio/catalogo/ficha";
import { agregarALaVenta } from "../../negocio/ventas/venta-en-curso";
import { cuantosProductos, TEXTOS } from "../textos";
import "./ficha.css";

type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };
const t = TEXTOS.ficha;

// La ficha del producto en el celular, como la v2 («Lista y ficha», decisión 145): a pantalla
// entera, con «‹ Productos» para volver y el menú de abajo a la vista. La foto grande con el
// stock; el nombre; el precio sin bajar, con su margen y «Así se calcula», que despliega los
// márgenes y la cuenta; el código de barras; el proveedor en uso (con los demás a un toque); el
// archivo de origen; y, fijos abajo, «Listo» y «Agregar a la venta».
export function FichaProducto({ producto: p, alCerrar, alCambiar, quienLoTiene }: { producto: Producto; alCerrar: () => void; quienLoTiene: (codigo: string) => Promise<Producto | undefined>; alCambiar: (c: Cambios) => void }) {
  const { stock } = useCatalogo();
  const puede = usePuede();
  const veCostos = useVeCostos();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const hay = stockDe(p, stock);
  const subir = async (archivo: File) => alCambiar({ foto_url: await subirFoto(p.id, archivo) });

  return (
    <Hoja alCerrar={alCerrar} testId="ficha-producto" clase="hoja-pantalla">
      <div className="fp-arriba">
        <button type="button" className="fp-volver" onClick={alCerrar} data-testid="ficha-volver"><Icono nombre="izquierda" tam={24} grosor={2.2} />{t.volver.corto}</button>
      </div>
      <FotoDeLaFicha producto={p} alSubir={subir} stock={<span className={`fp-stock ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.corto}` : hay.texto}</span>} />
      <div className="ficha-titulo">
        <h2 className="ficha-nombre">{p.descripcion}</h2>
        <small>{[p.marca, p.codigo_proveedor ? `Cód. ${p.codigo_proveedor}` : null].filter(Boolean).join(" · ") || t.sinMarca.corto}</small>
      </div>
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
      <TarjetaPrecio producto={p} fijaMargen={puede("catalogo.margenes")} veCostos={veCostos} alCambiar={alCambiar} />
      <CodigoDeBarras producto={p} celular alGuardar={(codigo) => alCambiar({ codigo_barras: codigo })} quienLoTiene={quienLoTiene} />
      {veCostos && <TarjetaProveedor producto={p} alUsar={(id) => alCambiar({ proveedor_preferido_id: id })} />}
      {veCostos && <TarjetaArchivo producto={p} alError={setMensaje} />}
      <div className="ficha-pie">
        <button type="button" className="boton" onClick={alCerrar} data-testid="ficha-listo">{t.listo.corto}</button>
        {puede("ventas.registrar") && (
          <button type="button" className="boton coral" onClick={() => { agregarALaVenta(p); setMensaje(`${TEXTOS.catalogo.agregado.corto}: ${p.descripcion}`); }} data-testid="ficha-agregar">
            <Icono nombre="carrito" tam={20} />{TEXTOS.catalogo.agregarALaVenta.corto}
          </button>
        )}
      </div>
    </Hoja>
  );
}

// La foto grande (tocarla la amplía, como siempre) con «Cambiar foto» encima; sin foto, un lugar
// neutro con «Sacar foto».
function FotoDeLaFicha({ producto: p, alSubir, stock }: { producto: Producto; alSubir: (archivo: File) => Promise<void>; stock: React.ReactNode }) {
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
    <div className={`ficha-foto fp-hero ${p.foto_url ? "" : "sin"}`}>
      {stock}
      <FotoProducto id={p.id} url={p.foto_url ?? null} descripcion={p.descripcion} alSubir={alSubir} />
      <input ref={archivo} type="file" accept="image/*" capture="environment" hidden onChange={elegida} data-testid="archivo-foto-ficha" />
      <button type="button" className="ficha-cambiar-foto" disabled={subiendo} onClick={() => archivo.current?.click()} data-testid="cambiar-foto">
        <Icono nombre="camara" tam={16} />{subiendo ? t.subiendo.corto : p.foto_url ? t.cambiarFoto.corto : t.sacarFoto.corto}
      </button>
      {error && <p className="ficha-foto-error" role="alert">{error}</p>}
    </div>
  );
}

// El proveedor en uso (RF-113), como la v2: su inicial en verde, la estrella si es el más barato,
// «Proveedor principal · fecha» y su costo; «+N más» despliega los demás, con «Usar».
function TarjetaProveedor({ producto: p, alUsar }: { producto: Producto; alUsar: (proveedorId: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const todos = p.proveedores ?? [];
  if (!p.proveedor) return null;
  const masBarato = todos[0]?.proveedor_id;
  const enUso = todos.find((v) => v.proveedor_id === p.proveedor_id) ?? todos.find((v) => v.proveedor === p.proveedor);
  const otros = todos.filter((v) => v !== enUso);
  const elMasBarato = enUso ? enUso.proveedor_id === masBarato : todos.length <= 1;
  const costoEnUso = p.costo_neto === null ? null : Number(p.costo_neto);
  const estrella = <span className="ficha-estrella" title={t.masBarato.corto} data-testid="mas-barato"><Icono nombre="estrella" tam={16} /><span className="solo-lectores">{t.masBarato.corto}</span></span>;
  return (
    <section className="tarjeta ficha-tarjeta" aria-label={t.proveedor.corto}>
      <div className="fp-prov" data-testid="proveedor-en-uso">
        <span className="ficha-inicial" aria-hidden="true">{p.proveedor.trim().charAt(0).toUpperCase()}</span>
        <span className="ficha-proveedor-texto">
          <span className="ficha-proveedor-nombre">{p.proveedor}{elMasBarato && estrella}</span>
          <span className="ficha-detalle">{[t.principal.corto, p.fecha_lista ? fecha(p.fecha_lista).slice(0, 5) : null].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="fp-prov-der">
          <strong>{pesos(p.costo_neto)}</strong>
          {otros.length > 0 && (
            <button type="button" className="fp-mas" onClick={() => setAbierta((a) => !a)} aria-expanded={abierta} aria-label={abierta ? t.esconderProveedores.corto : t.verProveedores.corto} data-testid="ver-proveedores">
              {abierta ? t.menos.corto : `+${otros.length} ${t.mas.corto}`}<Icono nombre={abierta ? "arriba" : "abajo"} tam={16} />
            </button>
          )}
        </span>
      </div>
      {abierta && (
        <ul className="ficha-otros" data-testid="otros-proveedores">
          {otros.map((v) => (
            <li key={v.proveedor_id}>
              <span className="ficha-inicial otro" aria-hidden="true">{v.proveedor.trim().charAt(0).toUpperCase()}</span>
              <span className="ficha-proveedor-texto">
                <span className="ficha-proveedor-nombre">{v.proveedor}{v.proveedor_id === masBarato && estrella}</span>
                <span className="ficha-detalle">{[`${t.lista.corto} ${fecha(v.fecha_lista).slice(0, 5)}`, pesos(v.costo_neto), diferenciaDeCosto(v.costo_neto ?? 0, costoEnUso)].filter(Boolean).join(" · ")}</span>
              </span>
              <button type="button" className="boton chico" onClick={() => alUsar(v.proveedor_id)} aria-label={`Usar el costo de ${v.proveedor}`} data-testid="proveedor-de-producto">{t.usar.corto}</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// El precio de venta grande, sin bajar (la v2), con el margen y «Así se calcula» (RF-114), que
// despliega debajo los márgenes (300 a 25 y «Otro», el porcentaje a mano) y la cuenta.
function TarjetaPrecio({ producto: p, fijaMargen, veCostos, alCambiar }: { producto: Producto; fijaMargen: boolean; veCostos: boolean; alCambiar: (c: Cambios) => void }) {
  const { costo, calculo } = precioDelProducto(p);
  const manual = margenAMano(p);
  const [abierto, setAbierto] = useState(false);
  const [escribiendo, setEscribiendo] = useState(false);
  const [otro, setOtro] = useState("");
  const guardarOtro = () => { const v = otroMargen(otro); if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); setEscribiendo(false); };
  const c = cuentaDelPrecio(p);
  const margenTexto = p.margen_elegido === null ? (costo === null ? t.sinCosto.corto : fijaMargen ? t.eligeMargen.corto : t.sinMargen.corto) : `${t.margen.corto.toLowerCase()} ${p.margen_elegido} %${manual !== null ? ` ${t.aMano.corto}` : ""}`;
  return (
    <>
      <section className="fp-precio" aria-label={t.precioDeVenta.corto}>
        <div>
          <span className="ficha-detalle">{t.precioDeVenta.corto}</span>
          {calculo ? <strong className="ficha-precio" data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong>
            : <span className="ficha-sin-precio" data-testid="sin-precio">{costo === null ? t.sinCosto.corto : fijaMargen ? t.eligeMargen.corto : t.sinMargen.corto}</span>}
        </div>
        {veCostos || fijaMargen ? (
          <button type="button" className="fp-margen" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} data-testid="abrir-calculo">
            <b className={p.margen_elegido === null ? "falta" : ""}>{margenTexto}</b>
            <span>{veCostos ? t.asiSeCalcula.corto : t.margen.corto}<Icono nombre={abierto ? "arriba" : "abajo"} tam={16} /></span>
          </button>
        ) : <span className="fp-margen"><b className={p.margen_elegido === null ? "falta" : ""}>{margenTexto}</b></span>}
      </section>
      {/* Sin permiso de ver costos no hay cuenta (016-E21): solo los márgenes. */}
      {abierto && (veCostos || fijaMargen) && (
        <section className="tarjeta ficha-tarjeta fp-calculo" data-testid={veCostos ? "asi-se-calcula" : "margenes"}>
          <h3 className="ficha-tarjeta-titulo">{veCostos ? t.asiSeCalcula.corto : t.margen.corto}{veCostos && fijaMargen && <span className="ficha-detalle">{t.margen.corto.toLowerCase()}</span>}</h3>
          {fijaMargen && (
            <div className="fp-segmentos" role="group" aria-label="margen" data-testid="segmentos-de-margen">
              {MARGENES.map((m, i) => (
                <button key={m} type="button" aria-pressed={p.margen_elegido === m} aria-label={`${m} %`} className={p.margen_elegido === m ? "activo" : ""} title={`Shift+${i + 1}`} disabled={costo === null} onClick={() => alCambiar({ margen_elegido: m })}>{m}</button>
              ))}
              {escribiendo ? (
                <label className="fp-otro-caja"><input autoFocus inputMode="numeric" placeholder="ej. 120" aria-label={t.otroMargen.corto} value={otro} data-testid="otro-margen"
                  onChange={(e) => setOtro(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                  onKeyDown={(e) => { if (e.key === "Enter") guardarOtro(); else if (e.key === "Escape") { e.stopPropagation(); setEscribiendo(false); } }}
                  onBlur={guardarOtro} /><span aria-hidden="true">%</span></label>
              ) : (
                <button type="button" className={manual !== null ? "activo" : ""} aria-pressed={manual !== null} disabled={costo === null} onClick={() => { setOtro(manual === null ? "" : String(manual)); setEscribiendo(true); }}
                  aria-label={manual !== null ? `${t.otroMargen.corto}: ${manual} % ${t.aMano.corto}` : t.otroMargen.corto} data-testid="margen-otro">{manual !== null ? `${manual} %` : t.otro.corto}</button>
              )}
            </div>
          )}
          {!veCostos ? null : c.falta !== null ? <p className="ficha-calculo-falta" data-testid="cuenta">{c.falta === "costo" ? t.faltaCosto.corto : t.faltaMargen.corto}</p> : (
            <div className="ficha-cuenta" data-testid="cuenta">
              <span>{t.costoDeCompra.corto}</span><b>{pesos(c.costo)}</b>
              {p.explicacion_costo.length > 0 && <small className="ficha-cuenta-detalle">{p.explicacion_costo.join(" · ")}</small>}
              <span>+ {c.margen} % {t.deMargen.corto}</span><b>{pesos(c.costo + c.margenPesos)}</b>
              <span>+ {t.iva.corto} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.conIva)}</b>
              <div className="cobra"><span>{t.seCobraRedondeado.corto}</span><b data-testid="se-cobra">{pesosCortos(c.cobra)}</b></div>
            </div>
          )}
        </section>
      )}
    </>
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

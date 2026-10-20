import { forwardRef, useEffect, useState } from "react";
import { useVeCostos } from "../../../Costos";
import { CodigoDeBarras } from "../../../CodigoDeBarras";
import { usePuede } from "../../../permisos";
import { Boton, Icono, Margenes, Toast } from "../ui";
import { useCatalogo } from "../../../../catalogo";
import { descargar, subirFoto } from "../../../../api";
import { fecha, pesos, pesosCortos } from "../../../../formato";
import type { Producto } from "../../../celular/pantallas/Productos";
import { margenAMano, otroMargen, precioDelProducto } from "../../../../negocio/catalogo/precio";
import { stockDe } from "../../../../negocio/catalogo/stock-y-filtros";
import { cuentaDelPrecio, diferenciaDeCosto, useOrigenDeLista } from "../../../../negocio/catalogo/ficha";
import { cuantosProductos, TEXTOS } from "../../../textos";
import { FotoDeLaFicha, teclasDeLaFicha } from "./FichaProducto";
import "../estilos/ficha-al-lado.css";

type Cambios = Partial<Pick<Producto, "margen_elegido" | "foto_url" | "codigo_barras">> & { proveedor_preferido_id?: string };
const t = TEXTOS.ficha;

// La ficha del producto elegido, siempre abierta a la derecha de la lista (la v2, «Lista y ficha
// lado a lado», decisión 145): arriba la foto, el stock, el nombre, el precio y los márgenes; el
// código de barras; los proveedores al lado de «Así se calcula»; el archivo de origen; y al pie
// las teclas, «Listo» y «Agregar a la venta». Con el foco adentro, ← → recorren los márgenes y
// ↑ ↓ las partes de la ficha (002, 2026-10-15); Mayús + 1 a 5 y «+» los maneja la pantalla.
export const FichaAlLado = forwardRef<HTMLElement, {
  producto: Producto; alCambiar: (c: Cambios) => void; quienLoTiene: (codigo: string) => Promise<Producto | undefined>;
  alAgregar?: () => void; alListo: () => void; alCargarCodigo: (abierto: boolean) => void; calculoAbierto: boolean; alPlegarCalculo: () => void;
}>(function FichaAlLado({ producto: p, alCambiar, quienLoTiene, alAgregar, alListo, alCargarCodigo, calculoAbierto, alPlegarCalculo }, ref) {
  const { stock } = useCatalogo();
  const puede = usePuede();
  const veCostos = useVeCostos();
  const fijaMargen = puede("catalogo.margenes");
  const [mensaje, setMensaje] = useState<string | null>(null);
  const hay = stockDe(p, stock);
  const { costo, calculo } = precioDelProducto(p);
  useEffect(() => { setMensaje(null); }, [p.id]);

  return (
    <article className="fal" ref={ref} aria-label={`Ficha de ${p.descripcion}`} data-testid="ficha-producto" onKeyDown={teclasDeLaFicha}>
      <div className="fal-cuerpo">
        <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
        <div className="fal-cabeza">
          <FotoDeLaFicha producto={p} alSubir={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} alError={setMensaje} />
          <div className="fal-titulos">
            <span className={`fal-stock ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.largo}` : hay.texto}</span>
            <h2 className="fal-nombre">{p.descripcion}</h2>
            <p className="fal-detalle">{[p.marca, p.codigo_proveedor ? `Cód. ${p.codigo_proveedor}` : null].filter(Boolean).join(" · ") || t.sinMarca.largo}</p>
            <div className="fal-precio-fila">
              <div className="fal-precio-caja">
                <span className="fal-etiqueta">{t.precioDeVenta.largo}</span>
                {calculo ? <strong className="fal-precio" data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong>
                  : <span className="fal-sin-precio" data-testid="sin-precio">{costo === null ? t.sinCosto.largo : fijaMargen ? t.eligeMargen.largo : t.sinMargen.largo}</span>}
              </div>
              {fijaMargen ? <MargenEnSegmentos producto={p} alCambiar={alCambiar} />
                : <span className="fal-detalle" data-testid="margen-fijo">{p.margen_elegido === null ? t.sinMargen.largo : `${p.margen_elegido} %`}</span>}
            </div>
          </div>
        </div>

        <CodigoDeBarras producto={p} alGuardar={(codigo) => alCambiar({ codigo_barras: codigo })} quienLoTiene={quienLoTiene} alCargar={alCargarCodigo} />

        {veCostos && (
          <div className="fal-dos">
            <BloqueProveedores producto={p} alUsar={(id) => alCambiar({ proveedor_preferido_id: id })} />
            <BloqueCalculo producto={p} abierto={calculoAbierto} alPlegar={alPlegarCalculo} />
          </div>
        )}
        {veCostos && <BloqueArchivo producto={p} alError={setMensaje} />}
      </div>
      <div className="fal-pie">
        <span className="fal-teclas">
          <span><kbd className="tecla">Esc</kbd> {t.vuelveABuscar.largo}</span>
          <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> {t.otroProducto.largo}</span>
        </span>
        <Boton className="fal-listo" onClick={alListo} data-ficha-vertical="" data-testid="ficha-listo">{t.listo.largo}</Boton>
        {alAgregar && <Boton variante="principal" icono="carrito" tecla="+" onClick={alAgregar} data-ficha-vertical="" data-testid="ficha-agregar">{TEXTOS.catalogo.agregarALaVenta.largo}</Boton>}
      </div>
    </article>
  );
});

// Los cinco márgenes y «Otro» en una sola tira, como los segmentos de la v2. «Otro» abre la caja
// del porcentaje a mano; con un margen a mano, «Otro» lo muestra y queda marcado.
function MargenEnSegmentos({ producto: p, alCambiar }: { producto: Producto; alCambiar: (c: Cambios) => void }) {
  const manual = margenAMano(p);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");
  useEffect(() => { setEscribiendo(false); }, [p.id]);
  const sinCosto = p.costo_neto === null;
  function guardar() {
    const v = otroMargen(texto);
    if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v });
    setEscribiendo(false);
  }
  return (
    <div className="fal-margen">
      <Margenes flechasDeAfuera sinSigno elegido={p.margen_elegido} disabled={sinCosto} etiqueta="Margen" atajos alElegir={(m) => alCambiar({ margen_elegido: m })} />
      {escribiendo ? (
        <label className="fal-otro-caja">
          <input autoFocus inputMode="numeric" placeholder="ej. 120" aria-label={`${t.otroMargen.largo} para ${p.descripcion}, en porcentaje`} value={texto} data-testid="otro-margen"
            onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); guardar(); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setEscribiendo(false); } }}
            onBlur={guardar} />
          <span aria-hidden="true">%</span>
        </label>
      ) : (
        <button type="button" className="fal-otro" aria-pressed={manual !== null} disabled={sinCosto} onClick={() => { setTexto(manual === null ? "" : String(manual)); setEscribiendo(true); }}
          title={t.otroMargen.largo} aria-label={manual !== null ? `${t.otroMargen.largo}: ${manual} % ${t.aMano.largo}` : t.otroMargen.largo} data-testid="margen-otro">
          {manual !== null ? `${manual} %` : t.otro.largo}
        </button>
      )}
    </div>
  );
}

// Todos los proveedores a la vista (RF-06, RF-113): el en uso con su inicial en verde y «en uso»;
// la estrella en el más barato; «Usar» en los demás, con la fecha de su lista y cuánto más caros son.
function BloqueProveedores({ producto: p, alUsar }: { producto: Producto; alUsar: (proveedorId: string) => void }) {
  const todos = p.proveedores ?? [];
  if (!p.proveedor) return <section className="fal-bloque"><h3>{t.proveedores.largo}</h3><p className="fal-detalle">{t.sinCosto.largo}</p></section>;
  const masBarato = todos[0]?.proveedor_id;
  const enUso = todos.find((v) => v.proveedor_id === p.proveedor_id) ?? todos.find((v) => v.proveedor === p.proveedor);
  const otros = todos.filter((v) => v !== enUso);
  const costoEnUso = p.costo_neto === null ? null : Number(p.costo_neto);
  const estrella = <span className="fal-estrella" title={t.masBarato.largo} data-testid="mas-barato"><Icono nombre="estrella" tam={15} /><span className="solo-lectores">{t.masBarato.largo}</span></span>;
  return (
    <section className="fal-bloque" aria-labelledby="fal-proveedores">
      <h3 id="fal-proveedores">{t.proveedores.largo}<span className="fal-der">{Math.max(todos.length, 1)} · {t.elCostoSaleDe.largo}</span></h3>
      <ul className="fal-provs" data-testid="otros-proveedores">
        <li className="fal-prov" data-testid="proveedor-en-uso">
          <span className="fal-ini uso" aria-hidden="true">{p.proveedor.trim().charAt(0).toUpperCase()}</span>
          <span className="fal-prov-texto">
            <span className="fal-prov-nombre">{p.proveedor}{(enUso ? enUso.proveedor_id === masBarato : todos.length <= 1) && estrella}</span>
            <span className="fal-detalle">{[t.principalCorto.largo, p.fecha_lista ? `${t.lista.largo.toLowerCase()} ${fechaCorta(p.fecha_lista)}` : null].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="fal-prov-costo"><b>{pesos(p.costo_neto)}</b><small>{t.enUso.largo}</small></span>
        </li>
        {otros.map((v) => (
          <li key={v.proveedor_id} className="fal-prov">
            <span className="fal-ini" aria-hidden="true">{v.proveedor.trim().charAt(0).toUpperCase()}</span>
            <span className="fal-prov-texto">
              <span className="fal-prov-nombre">{v.proveedor}{v.proveedor_id === masBarato && estrella}</span>
              <span className="fal-detalle">{[`${t.lista.largo} ${fechaCorta(v.fecha_lista)}`, pesos(v.costo_neto), diferenciaDeCosto(v.costo_neto ?? 0, costoEnUso)].filter(Boolean).join(" · ")}</span>
            </span>
            <Boton tam="chico" className="fal-usar" aria-label={`Usar el costo de ${v.proveedor}`} onClick={() => alUsar(v.proveedor_id)} data-ficha-vertical="" data-testid="proveedor-de-producto">{t.usar.largo}</Boton>
          </li>
        ))}
      </ul>
    </section>
  );
}

// «Así se calcula» (RF-114), abierto: el costo, más el margen, más el IVA, y lo que se cobra
// redondeado a $1.000. F1 (o tocar el título) lo pliega. Sin costo o sin margen, qué falta.
function BloqueCalculo({ producto: p, abierto, alPlegar }: { producto: Producto; abierto: boolean; alPlegar: () => void }) {
  const c = cuentaDelPrecio(p);
  return (
    <section className="fal-bloque fal-calculo" data-testid="asi-se-calcula">
      <h3><button type="button" className="fal-plegar" onClick={alPlegar} aria-expanded={abierto} aria-keyshortcuts="F1" data-ficha-vertical="" data-testid="abrir-calculo">
        {t.asiSeCalcula.largo}<span className="fal-der"><Icono nombre={abierto ? "arriba" : "abajo"} tam={16} /><kbd className="tecla">F1</kbd></span>
      </button></h3>
      {c.falta !== null ? <p className="fal-detalle" data-testid="cuenta-del-precio">{c.falta === "costo" ? t.faltaCosto.largo : t.faltaMargen.largo}</p> : (
        <div className="fal-cuenta" data-testid="cuenta-del-precio">
          {abierto && <>
            <span>{t.costoDeCompra.largo}</span><b>{pesos(c.costo)}</b>
            {p.explicacion_costo.length > 0 && <small className="fal-cuenta-detalle">{p.explicacion_costo.join(" · ")}</small>}
            <span>+ {c.margen} % {t.deMargen.largo}</span><b>{pesos(c.costo + c.margenPesos)}</b>
            <span>+ {t.iva.largo} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.conIva)}</b>
          </>}
          <div className="cobra"><span>{t.seCobraRedondeado.largo}</span><b data-testid="se-cobra">{pesosCortos(c.cobra)}</b></div>
        </div>
      )}
    </section>
  );
}

// El archivo de origen del costo (RF-115), en una fila con descargar.
function BloqueArchivo({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  const origen = useOrigenDeLista(p.lista_importada_id, true);
  if (!p.lista_importada_id || origen?.estado === "no-esta") return null;
  const o = origen?.estado === "listo" ? origen.origen : null;
  return (
    <section className="fal-bloque fal-archivo" aria-label={t.archivo.largo} data-testid="archivo-de-origen">
      <span className="fal-xls" aria-hidden="true"><Icono nombre="excel" tam={20} /></span>
      <span className="fal-prov-texto">
        <b className="fal-archivo-nombre">{o?.archivo_nombre ?? t.archivo.largo}</b>
        <span className="fal-detalle">{[o?.proveedor ?? p.proveedor, fecha(o?.fecha_lista ?? p.fecha_lista), o ? cuantosProductos(o.productos) : null].filter(Boolean).join(" · ")}</span>
        {origen?.estado === "sin-conexion" && <span className="fal-detalle">{t.sinConexionArchivo.largo}</span>}
      </span>
      <Boton tam="chico" icono="bajar" aria-label={t.descargar.largo} title={t.descargar.largo} data-ficha-vertical="" data-testid="bajar-lista"
        onClick={() => descargar(`/listas/${p.lista_importada_id}/archivo`, o?.archivo_nombre ?? `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}.`))} />
    </section>
  );
}

// «06/10»: el día y el mes de una lista, como en la v2.
const fechaCorta = (f: string | null | undefined) => (f ? fecha(f).slice(0, 5) : "");

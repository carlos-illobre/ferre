import { descargar, useOrigenDeLista, type Producto } from "../../../negocio/catalogo";
import { fecha } from "../../../negocio/formato";
import { cuantosProductos, TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";

// El archivo de origen del costo (RF-115): nombre, proveedor, fecha y cuántos productos, y bajarlo.
const t = TEXTOS.ficha;
type Origen = { archivo_nombre: string; proveedor: string; fecha_lista: string; productos: number } | null;
const detalle = (p: Producto, o: Origen) => [o?.proveedor ?? p.proveedor, fecha(o?.fecha_lista ?? p.fecha_lista), o ? cuantosProductos(o.productos) : null].filter(Boolean).join(" · ");
const nombreDelArchivo = (p: Producto, o: Origen) => o?.archivo_nombre ?? `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`;

export function TarjetaArchivo({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  const origen = useOrigenDeLista(p.lista_importada_id, true);
  if (!p.lista_importada_id || origen?.estado === "no-esta") return null;
  return <Archivo producto={p} origen={origen?.estado === "listo" ? origen.origen : null} sinConexion={origen?.estado === "sin-conexion"} alError={alError} />;
}

function Archivo({ producto: p, origen: o, sinConexion, alError }: { producto: Producto; origen: Origen; sinConexion: boolean; alError: (m: string) => void }) {
  const bajar = () => descargar(`/listas/${p.lista_importada_id}/archivo`, nombreDelArchivo(p, o)).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}`));
  return (
    <section className="tarjeta ficha-tarjeta" aria-labelledby="ficha-archivo" data-testid="archivo-de-origen">
      <h3 id="ficha-archivo" className="ficha-tarjeta-titulo">{t.archivo.corto}</h3>
      <div className="ficha-archivo">
        <span className="ficha-archivo-icono" aria-hidden="true"><Icono nombre="excel" tam={22} /></span>
        <span className="ficha-proveedor-texto">
          {o && <b className="ficha-archivo-nombre">{o.archivo_nombre}</b>}
          <span className="ficha-detalle">{detalle(p, o)}</span>
        </span>
      </div>
      {sinConexion && <p className="ficha-detalle">{t.sinConexionArchivo.corto}</p>}
      <button type="button" className="boton ficha-descargar" data-testid="bajar-lista" onClick={() => void bajar()}>
        <Icono nombre="bajar" tam={18} />{t.descargar.corto}
      </button>
    </section>
  );
}

import { descargar, useOrigenDeLista, type Producto } from "../../../negocio/catalogo";
import { fecha } from "../../../negocio/formato";
import { cuantosProductos, TEXTOS } from "../../textos";
import { Boton, Icono } from "../base/ui";
import css from "./FichaAlLado.module.css";

// El archivo de origen del costo (RF-115), en una fila con descargar.
const t = TEXTOS.ficha;
type Origen = { archivo_nombre: string; proveedor: string; fecha_lista: string; productos: number } | null;
const detalle = (p: Producto, o: Origen) => [o?.proveedor ?? p.proveedor, fecha(o?.fecha_lista ?? p.fecha_lista), o ? cuantosProductos(o.productos) : null].filter(Boolean).join(" · ");
const nombreDelArchivo = (p: Producto, o: Origen) => o?.archivo_nombre ?? `lista ${p.proveedor ?? ""} ${p.fecha_lista ?? ""}.xlsx`;

export function BloqueArchivo({ producto: p, alError }: { producto: Producto; alError: (m: string) => void }) {
  const origen = useOrigenDeLista(p.lista_importada_id, true);
  if (!p.lista_importada_id || origen?.estado === "no-esta") return null;
  return <Archivo producto={p} origen={origen?.estado === "listo" ? origen.origen : null} sinConexion={origen?.estado === "sin-conexion"} alError={alError} />;
}

function Archivo({ producto: p, origen: o, sinConexion, alError }: { producto: Producto; origen: Origen; sinConexion: boolean; alError: (m: string) => void }) {
  const bajar = () => descargar(`/listas/${p.lista_importada_id}/archivo`, nombreDelArchivo(p, o)).catch((err: Error) => alError(`No se pudo bajar la lista: ${err.message}.`));
  return (
    <section className={`${css.bloque} ${css.archivo}`} aria-label={t.archivo.largo} data-testid="archivo-de-origen">
      <span className={css.xls} aria-hidden="true"><Icono nombre="excel" tam={20} /></span>
      <span className={css.provTexto}>
        <b className={css.archivoNombre}>{o?.archivo_nombre ?? t.archivo.largo}</b>
        <span className={css.detalle}>{detalle(p, o)}</span>
        {sinConexion && <span className={css.detalle}>{t.sinConexionArchivo.largo}</span>}
      </span>
      <Boton tam="chico" icono="bajar" aria-label={t.descargar.largo} title={t.descargar.largo} data-ficha-vertical="" data-testid="bajar-lista" onClick={() => void bajar()} />
    </section>
  );
}

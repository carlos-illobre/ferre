import { forwardRef, useEffect, useState } from "react";
import { subirFoto, type Producto } from "../../../negocio/catalogo";
import { useVeCostos } from "../../Costos";
import { CodigoDeBarras } from "../../CodigoDeBarras";
import { TEXTOS } from "../../textos";
import { Boton, Toast } from "../base/ui";
import { BloqueArchivo } from "./BloqueArchivo";
import { BloqueCalculo } from "./BloqueCalculo";
import { BloqueProveedores } from "./BloqueProveedores";
import { CabezaDeLaFicha } from "./CabezaDeLaFicha";
import { teclasDeLaFicha } from "./teclas-de-la-ficha";
import type { Cambios } from "./tipos";
import "./ficha.css";
import css from "./FichaAlLado.module.css";

// La ficha del producto elegido, siempre abierta a la derecha de la lista (la v2, «Lista y ficha
// lado a lado», decisión 145): arriba la foto, el stock, el nombre, el precio y los márgenes; el
// código de barras; los proveedores al lado de «Así se calcula»; el archivo de origen; y al pie
// las teclas, «Listo» y «Agregar a la venta». Con el foco adentro, ← → recorren los márgenes y
// ↑ ↓ las partes de la ficha (002, 2026-10-15); Mayús + 1 a 5 y «+» los maneja la pantalla.
const t = TEXTOS.ficha;
type Props = {
  producto: Producto; alCambiar: (c: Cambios) => void; quienLoTiene: (codigo: string) => Promise<Producto | undefined>;
  alAgregar?: () => void; alListo: () => void; alCargarCodigo: (abierto: boolean) => void; calculoAbierto: boolean; alPlegarCalculo: () => void;
};

export const FichaAlLado = forwardRef<HTMLElement, Props>(function FichaAlLado(f, ref) {
  const { producto: p, alCambiar } = f;
  const veCostos = useVeCostos();
  const [mensaje, setMensaje] = useState<string | null>(null);
  useEffect(() => { setMensaje(null); }, [p.id]);
  return (
    <article className="fal" ref={ref} aria-label={`Ficha de ${p.descripcion}`} data-testid="ficha-producto" onKeyDown={teclasDeLaFicha}>
      <div className={css.cuerpo}>
        <Toast texto={mensaje} alCerrar={() => setMensaje(null)} testId="mensaje-ficha" />
        <CabezaDeLaFicha producto={p} alCambiar={alCambiar} alSubirFoto={async (archivo) => alCambiar({ foto_url: await subirFoto(p.id, archivo) })} alError={setMensaje} />
        <CodigoDeBarras producto={p} alGuardar={(codigo) => alCambiar({ codigo_barras: codigo })} quienLoTiene={f.quienLoTiene} alCargar={f.alCargarCodigo} />
        {veCostos && (
          <div className={css.dos}>
            <BloqueProveedores producto={p} alUsar={(id) => alCambiar({ proveedor_preferido_id: id })} />
            <BloqueCalculo producto={p} abierto={f.calculoAbierto} alPlegar={f.alPlegarCalculo} />
          </div>
        )}
        {veCostos && <BloqueArchivo producto={p} alError={setMensaje} />}
      </div>
      <div className={css.pie}>
        <span className={css.teclas}>
          <span><kbd className="tecla">Esc</kbd> {t.vuelveABuscar.largo}</span>
          <span><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> {t.otroProducto.largo}</span>
        </span>
        <Boton className={css.listo} onClick={f.alListo} data-ficha-vertical="" data-testid="ficha-listo">{t.listo.largo}</Boton>
        {f.alAgregar && <Boton variante="principal" icono="carrito" accion="productos.agregar" onClick={f.alAgregar} data-ficha-vertical="" data-testid="ficha-agregar">{TEXTOS.catalogo.agregarALaVenta.largo}</Boton>}
      </div>
    </article>
  );
});

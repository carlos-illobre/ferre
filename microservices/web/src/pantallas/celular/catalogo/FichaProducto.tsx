import { useState } from "react";
import { useVeCostos } from "../../Costos";
import { CodigoDeBarras } from "../../CodigoDeBarras";
import { usePuede } from "../../../negocio/usuarios";
import { stockDe, subirFoto, useCatalogo, type Producto } from "../../../negocio/catalogo";
import { agregarALaVenta } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Hoja, Icono, Toast } from "../componentes/base";
import { FotoDeLaFicha } from "./FotoDeLaFicha";
import { TarjetaArchivo } from "./TarjetaArchivo";
import { TarjetaPrecio } from "./TarjetaPrecio";
import { TarjetaProveedor } from "./TarjetaProveedor";
import type { Cambios } from "./useProductosDelCelular";
import css from "./Ficha.module.css";

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
      <div className={css.arriba}>
        <button type="button" className={css.volver} onClick={alCerrar} data-testid="ficha-volver"><Icono nombre="izquierda" tam={24} grosor={2.2} />{t.volver.corto}</button>
      </div>
      <FotoDeLaFicha producto={p} alSubir={subir} stock={<span className={`${css.stock} ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.corto}` : hay.texto}</span>} />
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


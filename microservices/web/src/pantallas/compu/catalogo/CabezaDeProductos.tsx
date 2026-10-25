import { useResumenDelCatalogo } from "../../../negocio/catalogo";
import { numero } from "../../../negocio/formato";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { cuantosProductos, TEXTOS } from "../../textos";
import { irA } from "../base/rutas";
import { Boton, Icono, Pastilla } from "../base/ui";
import { VincularParaEscanear } from "../ventas/VincularParaEscanear";

// Al lado de las pestañas: cuántos productos hay y cuántos sin precio (los cuenta el servidor),
// escanear con el celular emparejado y cargar una lista.
const t = TEXTOS.catalogo;

export function CabezaDeProductos({ emparejado, puedeCargarListas }: { emparejado: boolean; puedeCargarListas: boolean }) {
  const resumen = useResumenDelCatalogo();
  return (
    <AlLadoDeLasPestanas>
      <div className="fila envuelve productos-arriba">
        {resumen && resumen.productos > 0 && <Pastilla sinPunto>{cuantosProductos(resumen.productos)}</Pastilla>}
        {resumen && resumen.sin_margen > 0 && <span className="pastilla-sin-precio" data-testid="cuantos-sin-precio"><Icono nombre="alerta" tam={15} />{numero(resumen.sin_margen)} {t.sinPrecio.largo}</span>}
        {emparejado && <VincularParaEscanear vinculado alVincular={() => undefined} comoV2={{}} />}
        {puedeCargarListas && <Boton icono="subir" onClick={() => irA("listas")} data-testid="cargar-lista">{t.cargarLista.largo}</Boton>}
      </div>
    </AlLadoDeLasPestanas>
  );
}

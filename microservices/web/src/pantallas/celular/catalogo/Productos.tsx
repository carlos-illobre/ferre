import { stockDe } from "../../../negocio/catalogo";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { useEtiqueta } from "../../../plataforma/comandos";
import { AvisoError, Buscador, Icono, Lista, Toast } from "../componentes/base";
import { TEXTOS } from "../../textos";
import { AvisosDeProductos, SinResultados } from "./AvisosDeProductos";
import { LaFicha } from "./LaFicha";
import { FilaProducto } from "./FilaProducto";
import { HojaDeFiltros } from "./HojaDeFiltros";
import { MasProductos } from "./MasProductos";
import { useProductosDelCelular, type ProductosDelCelular } from "./useProductosDelCelular";
import { useAccionesDeProductos } from "./useAccionesDeProductos";
import "./catalogo.css";

// La búsqueda le pregunta al servidor y trae de a 50 (specs/018); cada producto abre su ficha en una hoja, donde
// está el margen (botones o tipeado), los proveedores, la foto y la lista de origen.
export function Productos() {
  const x = useProductosDelCelular();
  useAccionesDeProductos(x);
  return (
    <>
      <Buscador chico valor={x.consulta} alCambiar={x.setConsulta} placeholder={TEXTOS.catalogo.buscar.corto} cajaRef={x.caja} alEscanear={hayCamara() ? () => x.setEscaneando(true) : undefined} extra={<BotonDeFiltros x={x} />} />
      <AvisosDeProductos x={x} />
      {x.escaneando && <Escaner alDetectar={x.alEscanear} alCerrar={() => x.setEscaneando(false)} />}
      <AyudaDelTeclado fijaMargen={x.fijaMargen} />
      <AvisoError texto={x.errorAlaVista} alCerrar={x.cerrarError} />
      <SinResultados x={x} />
      <LosProductos x={x} />
      <MasProductos lista={x.lista} />
      {x.agregado && <div className="aviso-agregado"><Toast texto={x.agregado} alCerrar={() => x.setAgregado(null)} testId="agregado" /></div>}
      {x.viendoFiltros && <HojaDeFiltros filtros={x.filtros} marcas={x.marcas} cuantos={x.lista.total} alCambiar={x.setFiltros} alCerrar={() => x.setViendoFiltros(false)} />}
      {x.abierto && <LaFicha x={x} producto={x.abierto} />}
    </>
  );
}

// Cómo se usa con un teclado conectado, si el teclado lo dice.
function AyudaDelTeclado({ fijaMargen }: { fijaMargen: boolean }) {
  const partes = [useEtiqueta("productos.ayuda.elegir"), useEtiqueta("productos.ayuda.margen"), useEtiqueta("productos.ayuda.limpiar")];
  const ayuda = partes.filter((p, i) => p && (i !== 1 || fijaMargen)).join(" · ");
  return ayuda ? <small className="solo-escritorio">{ayuda}</small> : null;
}

function BotonDeFiltros({ x }: { x: ProductosDelCelular }) {
  const t = TEXTOS.catalogo;
  return (
    <button type="button" className="boton-filtros" aria-label={x.conFiltros ? `${t.filtros.corto}: ${x.cuantosFiltros}` : t.filtros.corto} onClick={() => x.setViendoFiltros(true)} data-testid="filtros">
      <Icono nombre="filtros" tam={22} />{x.conFiltros && <b data-testid="cuantos-filtros">{x.cuantosFiltros}</b>}
    </button>
  );
}

function LosProductos({ x }: { x: ProductosDelCelular }) {
  const resultados = x.lista.productos;
  if (resultados.length === 0) return null;
  return (
    <Lista data-testid="resultados" className="productos-para-vender">
      {resultados.map((p, i) => <FilaProducto key={p.id} producto={p} stock={stockDe(p, x.stock)} elegida={i === x.elegido} alAbrir={() => { x.setElegido(i); x.setAbiertoId(p.id); }} alAgregar={x.puedeVender ? () => x.agregar(p) : undefined} />)}
    </Lista>
  );
}

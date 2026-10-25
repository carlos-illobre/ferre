import type { ReactNode } from "react";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import { EstadoDeConexion } from "../componentes/EstadoDeConexion";
import { VincularCelular } from "../componentes/VincularCelular";
import { AbrirLaBusqueda } from "./AbrirLaBusqueda";
import type { EstadoDeVender } from "./useVender";
import { useEmparejadoConLaCompu } from "../../../negocio/ventas";
import css from "./CabezaDeVender.module.css";

// Arriba: el título (y, emparejado con una computadora, «En espejo»), el estado de la conexión
// debajo, como la v2 (decisión 140), las pestañas y la búsqueda, o la cámara abierta.
export function CabezaDeVender({ v, pestanas }: { v: EstadoDeVender; pestanas: ReactNode }) {
  const emparejado = useEmparejadoConLaCompu();
  const { camara } = v;
  return (
    <div className="encabezado">
      <div className={css.titulo}>
        <h1 className="titulo">Vender</h1>
        {emparejado && <button type="button" className={css.espejo} onClick={() => v.setHoja("espejo")} data-testid="en-espejo"><Icono nombre="dispositivos" tam={18} />{TEXTOS.vender.enEspejo.corto}</button>}
      </div>
      <EstadoDeConexion testId="conexion-vender" />
      {pestanas}
      {camara.escaneando
        ? <Escaner className={css.camara} seguido alDetectar={camara.alDetectar} alCerrar={camara.cerrar} ultimo={camara.ultimo} />
        : <AbrirLaBusqueda alAbrir={() => v.setBuscando(true)} alEscanear={hayCamara() ? camara.abrir : undefined} />}
      {(!hayCamara() || window.innerWidth > 900) && <div className="solo-escritorio"><VincularCelular vinculado={v.celular.vinculado} alVincular={v.celular.alVincular} /></div>}
    </div>
  );
}

import { sumaDeConfirmadas } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Hoja, Icono } from "../componentes/base";
import type { VentasDelDiaCelular } from "./useVentasDelDia";
import { VentasCortas } from "./VentasCortas";
import css from "./VentasDelDia.module.css";

// Buscar una venta, en un panel desde abajo como la v2 (decisión 141): por un producto, el importe o
// el cliente; cuántas de cuántas y cuánto suman. Sin resultados, lo dice y ofrece borrar.
const t = TEXTOS.hoy;

export function BuscarVenta({ d }: { d: VentasDelDiaCelular }) {
  const { texto, setTexto, halladas, todas } = d;
  return (
    <Hoja titulo={t.buscarUnaVenta.corto} alCerrar={d.cerrarBusqueda} testId="hoja-buscar-venta">
      <div className={css.buscarFila}>
        <label className={css.buscarCaja}><Icono nombre="buscar" tam={20} />
          <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus placeholder={t.buscarVenta.corto} aria-label={t.buscarVenta.corto} data-testid="buscar-venta" />
          {texto && <button type="button" aria-label="Borrar" onClick={() => setTexto("")}><Icono nombre="cerrar" tam={16} grosor={2.6} /></button>}
        </label>
        <button type="button" className={`enlace ${css.listo}`} onClick={d.cerrarBusqueda} data-testid="salir-de-buscar">Listo</button>
      </div>
      <div className={css.cuantas} data-testid="cuantas-halladas">
        {texto.trim() ? <><span>{halladas.length} de {todas.length} {todas.length === 1 ? t.venta.corto : t.ventas.corto}</span>{halladas.length > 0 && <span>suman {pesosCortos(sumaDeConfirmadas(halladas))}</span>}</>
          : <span>{t.queSeBusca.corto}</span>}
      </div>
      {texto.trim() && (halladas.length === 0 ? <SinResultados texto={texto.trim()} alBorrar={() => setTexto("")} /> : <VentasCortas ventas={halladas} buscado={texto} alAbrir={(v) => d.setAbierta(v.id)} sinVentas="" />)}
    </Hoja>
  );
}

function SinResultados({ texto, alBorrar }: { texto: string; alBorrar: () => void }) {
  return (
    <div className={css.sinResultados} data-testid="sin-resultados">
      <span className={css.sinIcono}><Icono nombre="buscar" tam={26} /></span>
      <b>Ninguna venta con «{texto}»</b>
      <small>{t.probaConOtra.corto}</small>
      <button type="button" className={css.boton} onClick={alBorrar}><Icono nombre="cerrar" tam={16} />Borrar la búsqueda</button>
    </div>
  );
}

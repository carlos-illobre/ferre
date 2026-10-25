import { Aviso, Boton, Exito, Pagina, Toast } from "../base/ui";
import { AvisoDePedido } from "../../comun/deposito/Pedidos";
import { BuscadorDeProducto } from "./BuscadorDeProducto";
import { DatosDelIngreso } from "./DatosDelIngreso";
import { PieDelIngreso } from "./PieDelIngreso";
import { RenglonesDelIngreso } from "./RenglonesDelIngreso";
import { plural } from "./deposito-comun";
import { useIngresoDeLaCompu, type IngresoDeLaCompu } from "./useIngresoDeLaCompu";
import { pesos, pesosCortos } from "../../../negocio/formato";
import "../base/estilos/compras.css";
import css from "./Deposito.module.css";

// Ingreso de mercadería: proveedor y comprobante, renglones con la búsqueda de siempre, y
// registrar. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.
// Los gastos de la semana están en Cómo va el negocio (decisión 34).
const SIN_CONEXION = "Sin conexión: registrar un ingreso necesita internet. Podés seguir cargando; lo cargado queda guardado en este dispositivo hasta que vuelva.";

export function Ingreso() {
  const x = useIngresoDeLaCompu();
  const { renglones } = x.ingreso;
  return (
    <Pagina titulo="Compras" testId="pantalla-compras" className={renglones.length ? css.conPie : ""} bajada="Acá se carga la mercadería que llega. Suma stock y, si el comprobante trae otro costo, ese pasa a ser el vigente.">
      <Aviso tipo="alerta" testId="sin-conexion">{!x.enLinea ? SIN_CONEXION : null}</Aviso>
      <Aviso tipo="error">{x.ingreso.errorCatalogo}</Aviso>
      <AvisoDePedido pedido={x.pedido} error={x.errorPedido} />
      <Toast texto={x.mensaje} alCerrar={() => x.setMensaje(null)} />
      <section className="compras-ingreso" aria-labelledby={`${x.id}-titulo`}>
        <h2 id={`${x.id}-titulo`} className="seccion-titulo">Ingreso de mercadería</h2>
        <DatosDelIngreso x={x} />
        <BuscarLoQueLlego x={x} />
        <Aviso tipo="error" testId="codigo-desconocido">{x.errorCodigo}</Aviso>
        <Descartado x={x} />
        <div ref={x.zona}><RenglonesDelIngreso x={x} /></div>
        {renglones.length > 0 && <p className="detalle solo-compu">Enter en la cantidad vuelve al buscador. El costo viene de la última lista: si el comprobante dice otro, escribilo y pasa a ser el vigente.</p>}
      </section>
      {renglones.length > 0 && <PieDelIngreso x={x} />}
      {x.exito && <Exito que="Ingreso registrado" importe={pesosCortos(x.exito.total)} medio={x.exito.proveedor} detalle={x.exito.detalle} boton="Listo" alCerrar={() => { x.setExito(null); x.caja.current?.focus(); }} />}
    </Pagina>
  );
}

function BuscarLoQueLlego({ x }: { x: IngresoDeLaCompu }) {
  const i = x.ingreso;
  return (
    <BuscadorDeProducto primero={i.proveedor?.id} consulta={i.consulta} alCambiar={(v) => { i.setConsulta(v); x.setErrorCodigo(null); }} resultados={i.resultados} alElegir={(p) => x.agregar(p)} alCrear={(d) => x.agregar(null, d)} cajaRef={x.caja}
      placeholder="Escribí el producto que llegó"
      aLaDerecha={(p) => <span className="importe chico">{p.costo_neto === null ? "sin costo" : pesos(p.costo_neto)}</span>} />
  );
}

// Descartar el ingreso se deshace desde el aviso.
function Descartado({ x }: { x: IngresoDeLaCompu }) {
  const reponer = () => { if (x.descartado) x.ingreso.reponer(x.descartado); x.setDescartado(null); };
  return (
    <Aviso tipo="info" accion={<Boton tam="chico" icono="deshacer" onClick={reponer} data-testid="deshacer-descarte">Deshacer</Boton>}>
      {x.descartado && x.ingreso.renglones.length === 0 ? `Descartaste el ingreso (${plural(x.descartado.length, "renglón", "renglones")}).` : null}
    </Aviso>
  );
}

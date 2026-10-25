import { pesosCortos } from "../../../negocio/formato";
import { Escaner, hayCamara } from "../../../plataforma/camara";
import { AvisoDePedido } from "../../comun/deposito/Pedidos";
import { AvisoError, Buscador, Exito, Hoja, Lista } from "../componentes/base";
import { DatosDelIngreso } from "./DatosDelIngreso";
import { RenglonDelIngreso } from "./RenglonDelIngreso";
import { SugerenciasDelIngreso } from "./SugerenciasDelIngreso";
import { useIngresoDelCelular, type IngresoDelCelular } from "./useIngresoDelCelular";

// Ingreso de mercadería (issue #30): proveedor y comprobante → renglones con la búsqueda
// de siempre → registrar. Suma stock y, si la factura trae otro costo, ese pasa a ser el
// vigente. Reemplaza el papel semanal de gastos.
export function Ingreso() {
  const x = useIngresoDelCelular();
  const i = x.ingreso;
  return (
    <>
      <AvisoError texto={x.error ?? i.errorCatalogo} alCerrar={() => x.setError(null)} />
      <AvisoDePedido pedido={x.pedido} error={x.errorPedido} />
      <div className="lateral">
        <div className="columna al-costado"><DatosDelIngreso x={x} /></div>
        <div className="columna">
          <Buscador chico valor={i.consulta} alCambiar={i.setConsulta} placeholder={"Producto que llegó"} onKeyDown={x.teclas} cajaRef={x.caja} alEscanear={hayCamara() ? () => x.setEscaneando(true) : undefined} />
          {x.escaneando && <Escaner alDetectar={x.alDetectar} alCerrar={() => x.setEscaneando(false)} />}
          {i.consulta.trim() && <SugerenciasDelIngreso x={x} />}
          {i.renglones.map((r) => <RenglonDelIngreso key={r.clave} x={x} r={r} />)}
          {i.renglones.length > 0 && (
            <button type="button" className="boton coral principal" onClick={x.confirmar} disabled={i.ocupado} data-testid="registrar">
              <span>Registrar ingreso</span><span className="importe" data-testid="total">{pesosCortos(i.total)}</span>
            </button>
          )}
        </div>
      </div>
      {x.hoja === "proveedores" && <HojaDeProveedores x={x} />}
      {x.exito && <Exito que="Ingreso registrado" importe={pesosCortos(x.exito.total)} medio={x.exito.proveedor} detalle={x.exito.detalle} boton="Listo" alCerrar={() => x.setExito(null)} />}
    </>
  );
}

function HojaDeProveedores({ x }: { x: IngresoDelCelular }) {
  const i = x.ingreso;
  return (
    <Hoja titulo="¿De qué proveedor llegó?" alCerrar={() => x.setHoja(null)} testId="hoja-proveedores">
      <Lista>
        {(i.proveedores ?? []).map((p) => <button key={p.id} type="button" className={`fila ${i.proveedorId === p.id ? "elegida" : ""}`} onClick={() => { i.setProveedorId(p.id); x.setHoja(null); }} data-testid="opcion-proveedor"><span className="nombre">{p.nombre}</span></button>)}
      </Lista>
    </Hoja>
  );
}

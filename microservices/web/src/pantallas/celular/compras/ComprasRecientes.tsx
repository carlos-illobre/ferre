import { useState } from "react";
import { useComprasRecientes, useGastosDeLaSemana, usePedidosPorLlegar } from "../../../negocio/compras";
import { usePuede } from "../../permisos";
import { Toast } from "../componentes/base";
import { ComprasDelCelular } from "./ComprasDelCelular";
import { FotoDeLaFactura } from "./FotoDeLaFactura";
import { GastosPorProveedor } from "./GastosPorProveedor";
import { PorLlegar } from "./PorLlegar";
import { ResumenesDeCompras } from "./ResumenesDeCompras";

// Compras en el celular, como la v2 («Resumen», decisión 148), en el orden del pulgar: arriba lo
// gastado en la semana (con «Ver los gastos»; tocarlo muestra lo comprado a cada proveedor) y lo
// que se les debe; en el medio los pedidos por llegar, cada uno con su «Llegó»; abajo las compras
// recientes (con «Ver las compras»), que se abren para ver sus renglones y se anulan. Van en Cómo
// va el negocio (decisión 67). Fija al pulgar, «Sacale foto a la factura» lleva al ingreso.
// `soloVer` quedó de la versión anterior: la pantalla de ahora es la misma para todos.
export function ComprasRecientes(_: { soloVer?: boolean } = {}) {
  const puede = usePuede();
  const anula = puede("deposito.ingresos");
  const encarga = puede("deposito.pedidos");
  const gastos = useGastosDeLaSemana(puede("negocio.gastos")).datos;
  const filas = useComprasRecientes(puede("deposito.compras")).datos;
  const { porLlegar } = usePedidosPorLlegar(encarga || anula);
  const [porProveedor, setPorProveedor] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <div className="cm">
      <Toast texto={mensaje} alCerrar={() => setMensaje(null)} />
      <ResumenesDeCompras veGastos={puede("negocio.gastos")} gastos={gastos} filas={filas} alVerPorProveedor={() => setPorProveedor(true)} />
      {(encarga || anula) && <PorLlegar porLlegar={porLlegar} encarga={encarga} anula={anula} />}
      {puede("deposito.compras") && <ComprasDelCelular filas={filas} anula={anula} alError={setMensaje} />}
      {anula && <FotoDeLaFactura />}
      {porProveedor && <GastosPorProveedor gastos={gastos} alCerrar={() => setPorProveedor(false)} />}
    </div>
  );
}

import { useState } from "react";
import { useComprasRecientes, useGastosDeLaSemana, usePedidosPorLlegar } from "../../../negocio/compras";
import { useComandos } from "../../../plataforma/comandos";
import { useEnLinea } from "../../../plataforma/sin-conexion";
import { usePuede } from "../../permisos";
import { Aviso, hayUnaVentanaAbierta } from "../base/ui";
import { irA } from "../base/rutas";
import { AccionesDeCompras } from "./AccionesDeCompras";
import { CostadoDeCompras } from "./CostadoDeCompras";
import { Recientes } from "./Recientes";
import { ResumenesDeCompras } from "./ResumenesDeCompras";
import "../base/estilos/compras.css";
import css from "./Compras.module.css";

// Compras, como la v2 («El escritorio de compras», decisión 148). Van en Cómo va el negocio
// (decisión 67): sirven para mirar qué se compró, no para recibir mercadería. Arriba lo gastado en
// la semana con sus barras por día (con «Ver los gastos»), los pedidos por llegar y lo que se les
// debe; debajo las compras recientes (con «Ver las compras»), que se abren para ver sus renglones
// y se anulan con «Registrar ingresos»; a la derecha la foto de la factura, lo que está por llegar
// y lo que vence primero. Ofrece registrar una compra y armar un pedido.
export function ComprasRecientes() {
  const puede = usePuede();
  const registra = puede("deposito.ingresos");
  const encarga = puede("deposito.pedidos");
  const enLinea = useEnLinea();
  const gastos = useGastosDeLaSemana(puede("negocio.gastos"));
  const compras = useComprasRecientes(puede("deposito.compras"));
  const { porLlegar } = usePedidosPorLlegar(encarga || registra);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const libre = (puede: boolean, hacer: () => void) => () => (!puede || hayUnaVentanaAbierta() ? false : hacer());
  useComandos({ "compras.registrar": libre(registra, () => irA("ingreso")), "compras.pedido": libre(encarga, () => irA("pedidos")) });
  return (
    <div className="cv">
      <AccionesDeCompras encarga={encarga} registra={registra} />
      <Aviso tipo="ok" testId="compra-anulada">{mensaje}</Aviso>
      <ResumenesDeCompras veGastos={puede("negocio.gastos")} gastos={gastos} compras={compras.datos} porLlegar={porLlegar} />
      <div className={css.cuerpo}>
        {puede("deposito.compras") ? <Recientes compras={compras} gastos={gastos.datos} enLinea={enLinea} alAnular={setMensaje} /> : <div />}
        <CostadoDeCompras registra={registra} porLlegar={porLlegar} />
      </div>
    </div>
  );
}

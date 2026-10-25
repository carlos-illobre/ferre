import { aRenglones, type Borrador, type Pedido, type ProveedorDelPedido } from "../../../negocio/deposito";
import { ArmarPedido } from "./ArmarPedido";
import { ListaDePedidos } from "./ListaDePedidos";
import { PedidoMandado } from "./PedidoMandado";
import { usePantallaDePedidos } from "./usePantallaDePedidos";

// Pedidos a proveedores (RF-55, decisión 52). La misma pantalla en el celular y en la
// computadora (maqueta B, aprobada el 2026-10-11): la lista de pedidos; el pedido, que es
// solo sus renglones; y «Revisar y mandar», una hoja con el mensaje tal como lo recibe el
// proveedor. Se manda como texto, por WhatsApp o copiándolo. Lo que el proveedor recibe no
// lleva costos: el estimado lo ve solo quien arma el pedido.
export { textoDelPedido, type Pedido } from "../../../negocio/deposito";
export { AvisoDePedido } from "./AvisoDePedido";

export function Pedidos({ celular = false, alIngresar }: { celular?: boolean; alIngresar: (pedidoId: string) => void }) {
  const x = usePantallaDePedidos();
  const { abierto, nuevo } = x;
  if (nuevo || abierto?.estado === "borrador") {
    const borrador: Borrador = nuevo ?? { id: abierto!.id, proveedorId: abierto!.proveedor_id, renglones: aRenglones(abierto!) };
    const proveedor = proveedorDelBorrador(borrador, x.proveedores, abierto);
    if (proveedor) return <ArmarPedido key={borrador.id} inicial={borrador} proveedor={proveedor} celular={celular} alVolver={x.volver} />;
  }
  if (abierto) return <PedidoMandado pedido={abierto} encarga={x.encarga} ingresa={x.ingresa} alVolver={x.volver} alIngresar={alIngresar} />;
  return <ListaDePedidos x={x} alIngresar={alIngresar} />;
}

const proveedorDelBorrador = (b: Borrador, proveedores: ProveedorDelPedido[], abierto: Pedido | null): ProveedorDelPedido | null =>
  proveedores.find((p) => p.id === b.proveedorId) ?? (abierto ? { id: abierto.proveedor_id, nombre: abierto.proveedor, activo: true, whatsapp: abierto.whatsapp } : null);

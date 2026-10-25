import { igual, type Texto } from "./base";

// Compras como la v2 (decisión 148).
export const compras = {
  armarPedido: igual("Armar pedido"),
  registrarCompra: igual("Registrar compra"),
  estaSemana: igual("Esta semana"),
  pedidosPorLlegar: igual("Pedidos por llegar"),
  seLesDebe: igual("Se les debe"),
  vencido: igual("Vencido"),
  comprasRecientes: { largo: "Compras recientes", corto: "Recientes" },
  sinPagar: igual("Sin pagar"),
  anuladas: igual("Anuladas"),
  anulada: igual("Anulada"),
  noSuma: igual("no suma"),
  sinIva: igual("sin IVA"),
  sacaleFoto: { largo: "Sacale una foto a la factura", corto: "Sacale foto a la factura" },
  sacaleFotoDetalle: { largo: "Desde el ingreso, apuntá el celular al código: la foto aparece sola.", corto: "Se carga desde el ingreso" },
  elegirArchivo: igual("Elegir archivo"),
  cargarAMano: igual("Cargar a mano"),
  porLlegar: igual("Por llegar"),
  nadaPorLlegar: igual("No hay pedidos por llegar."),
  llego: igual("Llegó"),
  pedidos: igual("Pedidos"),
  verTodas: igual("Ver todas"),
  vencePrimero: igual("Vence primero"),
  todaviaNo: { largo: "Todavía no se anota lo que se les debe a los proveedores.", corto: "Todavía no se anota" },
} satisfies Record<string, Texto>;

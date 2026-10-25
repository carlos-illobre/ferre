import { igual, type Texto } from "./base";

// Cómo va el negocio como la v2 (021, decisión 148): los rótulos del tablero, los mismos en las dos
// interfaces. Lo que todavía no se calcula dice «—» y, al lado, por qué (E02).
export const tablero = {
  resultado: igual("Resultado"),
  vendido: { largo: "Vendido", corto: "Vendido hoy" },
  ganancia: igual("Ganancia"),
  ventas: igual("Ventas"),
  ticket: igual("Ticket promedio"),
  caja: { largo: "Cierre de caja", corto: "Caja" },
  porHora: igual("Vendido por hora"),
  comoPagaron: igual("Cómo pagaron"),
  loMasVendido: igual("Lo más vendido hoy"),
  noLlevaron: igual("No llevaron"),
  actualizado: igual("Actualizado"),
  sinGanancia: { largo: "Todavía no se calcula la ganancia del día", corto: "Todavía no se calcula" },
  sinLoMasVendido: { largo: "Lo más vendido todavía no se calcula", corto: "Todavía no se calcula" },
  sinCaja: { largo: "El cierre de caja todavía no se registra", corto: "Todavía no se registra" },
  sinPeriodo: igual("Semana y Mes todavía no se calculan"),
  sinResultado: igual("El resultado del mes todavía no se calcula"),
} satisfies Record<string, Texto>;

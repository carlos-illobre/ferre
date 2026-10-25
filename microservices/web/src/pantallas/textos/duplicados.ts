import { igual, type Texto } from "./base";

// Duplicados como la v2 (decisión 148).
export const duplicados = {
  nota: igual("El mismo artículo puede estar en varias listas."),
  notaFuerte: igual("Al unirlos queda uno solo"),
  notaFin: igual(", con todos sus proveedores y el precio del más barato."),
  buscarEnTodo: { largo: "Buscar en todo el catálogo", corto: "Buscar" },
  unirAMano: { largo: "Unir a mano", corto: "Unir" },
  unidosYSeparar: { largo: "Unidos y separar", corto: "Separar" },
  porRevisar: igual("Por revisar"),
  esElMismoArticulo: igual("¿Es el mismo artículo?"),
  esElMismo: igual("Es el mismo"),
  sonDistintos: igual("Son distintos"),
  saltar: igual("Saltar"),
  mismoCodigo: { largo: "Mismo código de barras", corto: "Mismo código de barras" },
  descripcionParecida: igual("Descripción parecida"),
  conservarEste: { largo: "Conservar este", corto: "Conservar" },
  seConserva: igual("Se conserva"),
  elMasBarato: { largo: "El más barato", corto: "barato" },
  productosUnidos: igual("Productos unidos"),
  verTodo: igual("Ver todo"),
  separar: igual("Separar"),
  loQueCambia: igual("= lo que cambia"),
} satisfies Record<string, Texto>;

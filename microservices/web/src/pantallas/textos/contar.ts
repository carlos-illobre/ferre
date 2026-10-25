import { igual, type Texto } from "./base";

// Depósito → Contar como la v2 (decisión 148).
export const contar = {
  stockCargado: igual("Stock cargado"),
  nuncaContados: igual("Nunca contados"),
  conteosEnCurso: igual("Conteos en curso"),
  hoyToca: igual("Hoy toca"),
  sectores: igual("Sectores"),
  nuevo: igual("Nuevo"),
  enCurso: igual("En curso"),
  nuncaContado: igual("Nunca contado"),
  contados: igual("Contados"),
  sinContar: igual("Sin contar"),
  escanearConElCelular: igual("Escanear con el celular"),
  cerrarElSector: igual("Cerrar el sector"),
  buscar: { largo: "Buscá o escaneá el producto", corto: "Buscá o escaneá" },
  ayudaBuscar: igual("Enter cuenta y vuelve acá · lector o celular también"),
  seguiDondeQuedaste: igual("Seguí donde quedaste"),
  seguirContando: igual("Seguir contando"),
  hoyTocaContar: igual("Hoy toca contar"),
  verCuales: igual("Ver cuáles"),
} satisfies Record<string, Texto>;

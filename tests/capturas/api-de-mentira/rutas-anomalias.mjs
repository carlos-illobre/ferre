// Datos de mentira para Más > Anomalías (RF-59).
const hace = (min) => new Date(Date.now() - min * 60000).toISOString();
const anomalias = [
  { id: "an-1", tipo: "venta_sin_stock", cantidad: "3", detalle: "Se vendieron 3 y el sistema tenía 0 en stock: faltaban 3", creado_en: hace(25), producto: "Destornillador Phillips PH2", unidad: "unidad", usuario: "Marta" },
  { id: "an-2", tipo: "venta_sin_stock", cantidad: "1.5", detalle: "Se vendieron 4 y el sistema tenía 2.5 en stock: faltaban 1.5", creado_en: hace(1500), producto: "Thinner sello de oro", unidad: "l", usuario: "Nicolás" },
  { id: "an-3", tipo: "venta_sin_stock", cantidad: "1", detalle: "Se vendió 1 y el sistema tenía 0 en stock: faltaba 1", creado_en: hace(4400), producto: "Taladro inalámbrico 18 V", unidad: "unidad", usuario: "Carlos" },
];
export default { "GET /anomalias": () => ({ pagina: 1, hay_mas: false, anomalias }) };

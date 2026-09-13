// Paquete compartido entre la API y la PWA. Acá va a vivir el cálculo de costo neto,
// margen y precio de venta, que devuelve siempre el resultado junto con su explicación
// (issue #47). Se comparte para que el precio calculado sin conexión sea idéntico al del
// servidor (ADR-001). Todavía sin lógica de negocio: la define el issue #11 y el #13.
export const VERSION_CALCULO_DE_PRECIOS = "0.1.0";

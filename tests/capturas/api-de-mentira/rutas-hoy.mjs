import { ventas } from "./rutas-00-base.mjs";

// «Hoy» renovada (specs/017): como el servidor, cada renglón de una venta trae su subtotal
// (precio × cantidad, redondeado para arriba a $1.000).
ventas.forEach((v) => v.items.forEach((i) => { i.subtotal ??= Math.ceil((Number(i.precio_unitario) * Number(i.cantidad)) / 1000 - 1e-9) * 1000; }));
export default {};

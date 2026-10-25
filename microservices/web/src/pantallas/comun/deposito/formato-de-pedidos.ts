// Cómo se escriben los importes y las fechas en los pedidos: pesos enteros y la fecha completa.
export const pesos = (n: number) => "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
export const dia = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

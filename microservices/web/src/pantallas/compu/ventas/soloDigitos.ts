// Lo que se escribe en una caja de precio, como número entero; vacía, sin precio.
export const soloDigitos = (v: string): number | null => (v === "" ? null : Number(v.replace(/[^\d]/g, "")) || null);

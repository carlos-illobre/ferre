export function fecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  const d = new Date(valor.length === 10 ? `${valor}T00:00:00` : valor);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// El día de hoy según el reloj del dispositivo (AAAA-MM-DD), no el de Greenwich: a la noche ya es mañana.
export const hoyLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// La hora del reloj, de 24: 09:14.
export const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// Hace cuánto, en pocas letras: «recién», «hace 5 min», «hace 3 h», «hace 2 días».
export function haceCuantoCorto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}

// Cómo se dicen las fechas de las listas, igual en el celular y en la computadora.
export const diaYMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const horaDe = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

// «hoy 08:12», «ayer 18:40», «el 14/10»: cuándo se subió una lista.
export function subida(iso: string): string {
  const d = new Date(iso);
  const dias = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) / 86400000);
  if (dias === 0) return `hoy ${horaDe(iso)}`;
  if (dias === 1) return `ayer ${horaDe(iso)}`;
  return `el ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

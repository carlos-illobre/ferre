// Las fechas y horas de lo apartado, cortas como en la v2: «jue 15/10», «hoy 09:14», «hace 4 días».
export const dosCifras = (n: number) => String(n).padStart(2, "0");
export const diaYHora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)} a las ${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
export const hora = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
export const mismoDia = (a: string, b: string) => new Date(a).toDateString() === new Date(b).toDateString();
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const diaCorto = (iso: string) => { const d = new Date(iso); return `${DIAS[d.getDay()]} ${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)}`; };
export const horaCorta = hora;
// «hoy 09:14», «ayer 18:40» o «jue 15/10 18:40».
export function cuandoCorto(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  const ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1);
  const dia = d.toDateString() === ahora.toDateString() ? "hoy" : d.toDateString() === ayer.toDateString() ? "ayer" : diaCorto(iso);
  return `${dia} ${hora(iso)}`;
}
// «hace 4 días», «hace 3 horas», «recién».
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const minutos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60_000));
  if (minutos < 2) return "recién";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return horas === 1 ? "hace 1 hora" : `hace ${horas} horas`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "hace 1 día" : `hace ${dias} días`;
}
export const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
export const primerNombre = (nombre: string) => nombre.split(/\s+/)[0] ?? nombre;

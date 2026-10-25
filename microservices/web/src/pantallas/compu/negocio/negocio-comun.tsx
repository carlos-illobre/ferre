// Lo que comparten la entrada y las pantallas de Negocio: saber si hay conexión, traer
// datos con sus tres estados (cargando, error, listo) y decir los errores en castellano.
export { useEnLinea } from "../../../plataforma/sin-conexion";
export { comoCarga, esFallaDeRed, textoDeError, type Carga } from "../../../negocio/del-servidor";

// Día y hora como se dicen en el mostrador: «hoy 10:40», «ayer 18:05», «03/10 09:12».
export function diaYHora(iso: string): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const hoy = new Date();
  const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  if (dias === 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", ...(d.getFullYear() === hoy.getFullYear() ? {} : { year: "numeric" }) })} ${hora}`;
}

export const fechaCompleta = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Los roles de la API con los nombres que se usan en el negocio.

// Ícono que falta en lo compartido: una computadora, para distinguirla del celular.
export function IconoCompu({ tam = 20 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 5h16v11H4zM2 20h20M9 16v4M15 16v4" />
    </svg>
  );
}
export const horaCorta = (d: Date) => d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

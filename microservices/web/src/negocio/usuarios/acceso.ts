import { fecha } from "../formato";
import type { CelularDeOtroFila, SesionFila } from "./usuarios";

// Sus sesiones y sus celulares con huella (decisión 100), en la tarjeta del celular: cada sesión va
// en su renglón aunque dos aparatos se llamen igual (decisión 153); la huella se junta con la
// primera sesión de su mismo nombre, y la que no tiene sesión va sola.
export type RenglonDeAcceso = { clave: string; n: string; s?: SesionFila; c?: CelularDeOtroFila };
export function renglonesDelAcceso(sesiones: SesionFila[], celulares: CelularDeOtroFila[]): RenglonDeAcceso[] {
  const libres = [...celulares];
  const renglones: RenglonDeAcceso[] = sesiones.map((s) => {
    const i = libres.findIndex((x) => (x.dispositivo ?? "Celular") === s.dispositivo);
    const c = i < 0 ? undefined : libres.splice(i, 1)[0];
    return { clave: s.id, n: s.dispositivo, s, c };
  });
  for (const c of libres) renglones.push({ clave: c.id, n: c.dispositivo ?? "Celular", c });
  return renglones;
}

export const esUnCelular = ({ n, c }: RenglonDeAcceso) => Boolean(c) || /celular|android|iphone|samsung|moto/i.test(n);

// Cuándo se usó una sesión: «Usándolo ahora», «Hace 5 min», «Hace 2 h» o la fecha.
export function cuandoSeUso(iso: string | null, ahora = Date.now()): string {
  if (!iso) return "Todavía no se usó";
  const min = Math.round((ahora - new Date(iso).getTime()) / 60_000);
  if (min < 2) return "Usándolo ahora";
  if (min < 60) return `Hace ${min} min`;
  return min < 1440 ? `Hace ${Math.round(min / 60)} h` : `Usado el ${fecha(iso.slice(0, 10))}`;
}

// El celular con huella: cuándo se usó por última vez o, si nunca, cuándo se vinculó.
export const usoDelCelular = (c: CelularDeOtroFila) => (c.ultimo_uso_en ? `Último uso ${fecha(c.ultimo_uso_en.slice(0, 10))}` : `Vinculado el ${fecha(c.creada_en.slice(0, 10))}`);

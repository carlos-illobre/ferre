// La forma de lo que un dispositivo le manda al otro. Todo viaja como texto JSON con un campo `t`
// que dice qué es; `leer` descarta lo que no tiene exactamente esa forma (E28).

// Por qué no se pudo la conexión directa: el navegador no la tiene, o la red no la deja.
export type Motivo = "navegador" | "red";

// El saludo, al abrirse un camino: mi época (`e`), desde qué número tengo pendiente (`desde`), y
// hasta qué número (`rh`) recibí de la época del otro que conozco (`re`, vacía si ninguna).
export type Saludo = { t: "hola"; e: string; desde: number; re: string; rh: number };
// Un dato, o una parte de uno: `s` dice que sigue otra parte.
export type Dato = { t: "dato"; e: string; n: number; d: string; s: boolean };
// La confirmación: recibí de tu época `e` hasta el número `h`.
export type Confirmacion = { t: "ok"; e: string; h: number };
// Lo que arma la conexión directa: la oferta, la respuesta y los candidatos.
export type Senal = { t: "senal"; d: object };
export type SinDirecta = { t: "sin-directa"; motivo: Motivo };
export type Probar = { t: "probar" };
export type Mensaje = Saludo | Dato | Confirmacion | Senal | SinDirecta | Probar;

// El tipo de cada campo, por clase de mensaje.
const FORMAS: Record<Mensaje["t"], Record<string, string>> = {
  hola: { e: "string", desde: "number", re: "string", rh: "number" },
  dato: { e: "string", n: "number", d: "string", s: "boolean" },
  ok: { e: "string", h: "number" },
  senal: { d: "object" },
  "sin-directa": { motivo: "string" },
  probar: {},
};

export function leer(texto: string): Mensaje | null {
  try {
    const m = JSON.parse(texto) as Record<string, unknown>;
    const forma = Object.hasOwn(FORMAS, String(m.t)) ? FORMAS[m.t as Mensaje["t"]] : null;
    const valido = forma !== null && Object.entries(forma).every(([campo, tipo]) => typeof m[campo] === tipo && m[campo] !== null);
    return valido ? (m as Mensaje) : null;
  } catch {
    return null;
  }
}

export const escribir = (m: Mensaje): string => JSON.stringify(m);

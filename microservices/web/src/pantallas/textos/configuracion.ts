import type { Texto } from "./base";

export const configuracion = {
  // Más → Configuración: las preferencias del dispositivo y lo propio (decisión 99).
  queHay: { largo: "Cómo se comporta la aplicación en esta computadora, y tus celulares con huella y tu vínculo", corto: "Este celular, tus huellas y tu vínculo" },
} satisfies Record<string, Texto>;

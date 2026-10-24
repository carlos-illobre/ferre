// El ambiente y la versión los pone quien construye la aplicación (la CI, tests/e2e.sh con el .env),
// sin valores por omisión (022-E19, E20). Producción se ve como siempre; cualquier otro ambiente se
// distingue a simple vista: la barra titila de azul a rojo y dice "Ambiente de prueba".
export const AMBIENTE = import.meta.env.VITE_AMBIENTE;
export const VERSION = import.meta.env.VITE_VERSION;
export const esAmbienteDePrueba = (ambiente: string = AMBIENTE): boolean => ambiente !== "produccion";

// Lo que cada ambiente guarda en el dispositivo va aparte (022-E21): la sesión, lo emparejado, la
// cola y lo bajado de pruebas no se mezclan con los de producción, que se abren en el mismo origen.
export const deEsteAmbiente = (clave: string): string => `${clave}.${AMBIENTE}`;

// Producción se ve como siempre; cualquier otro ambiente (pruebas, local) se distingue a
// simple vista: la barra titila de azul a rojo y dice "Ambiente de prueba". La versión la
// pone el CI al construir ("produccion <sha>" o "pruebas <sha>"); sin versión es local.
export function esAmbienteDePrueba(version: string | undefined = import.meta.env.VITE_VERSION): boolean {
  return !(version ?? "").startsWith("produccion");
}

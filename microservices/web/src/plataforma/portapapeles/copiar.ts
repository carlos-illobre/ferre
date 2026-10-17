// Copiar un texto para pegarlo en otra aplicación. Dice si se pudo: algunos navegadores no lo
// dejan (sin https, o sin permiso), y entonces la pantalla deja el texto seleccionado.
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

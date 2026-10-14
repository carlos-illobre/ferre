// Achica una foto antes de subirla: pesa muchas veces menos y en pantalla se ve igual. Si el
// navegador no puede (raro), devuelve la original.
export async function reducirImagen(archivo: File, lado = 800): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, lado / Math.max(imagen.width, imagen.height));
    if (escala === 1 && archivo.type === "image/jpeg") return archivo;
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d")!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    return await new Promise<Blob>((r, j) => lienzo.toBlob((b) => (b ? r(b) : j(new Error("No se pudo achicar la foto"))), "image/jpeg", 0.85));
  } catch {
    return archivo;
  }
}

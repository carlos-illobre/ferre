// Exportar (E32 a E34): el BPMN tal como se guarda y una imagen PNG armada en el navegador desde
// el dibujo, con el nombre, el estado y la fecha arriba, legible al imprimirla en A4.

export function descargarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Un nombre de archivo sin caracteres que los sistemas no aceptan. */
export const nombreDeArchivo = (nombre: string, extension: string) => `${nombre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "proceso"}.${extension}`;

export function exportarBpmn(xml: string, nombre: string) {
  descargarArchivo(new Blob([xml], { type: "application/xml" }), nombreDeArchivo(nombre, "bpmn"));
}

const ALTO_DEL_TITULO = 90;

export async function exportarPng(svg: string, nombre: string, estado: string, fecha = new Date()) {
  const imagen = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((listo, fallo) => {
      imagen.onload = () => listo();
      imagen.onerror = () => fallo(new Error("No se pudo armar la imagen"));
      imagen.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
  // Al doble de tamaño, para que se lea al imprimir.
  const escala = 2;
  const ancho = Math.max(imagen.width, 600) + 40;
  const alto = imagen.height + ALTO_DEL_TITULO + 20;
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho * escala;
  lienzo.height = alto * escala;
  const c = lienzo.getContext("2d")!;
  c.scale(escala, escala);
  c.fillStyle = "#ffffff";
  c.fillRect(0, 0, ancho, alto);
  c.fillStyle = "#18201e";
  c.font = "700 26px system-ui, sans-serif";
  c.fillText(nombre, 20, 40);
  c.font = "16px system-ui, sans-serif";
  c.fillText(`${estado} · ${fecha.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`, 20, 68);
  c.drawImage(imagen, 20, ALTO_DEL_TITULO);
  const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, "image/png"));
  if (!blob) throw new Error("No se pudo armar la imagen");
  descargarArchivo(blob, nombreDeArchivo(nombre, "png"));
}

/** Lee un archivo elegido para importar; el servicio valida que sea BPMN (E36). */
export async function leerArchivo(archivo: File): Promise<{ nombre: string; texto: string } | { error: string }> {
  if (archivo.size > 5 * 1024 * 1024) return { error: "Pesa más de 5 MB" };
  // FileReader anda en todos los navegadores, también en los viejos que no tienen File.text().
  const texto = await new Promise<string>((listo, fallo) => {
    const lector = new FileReader();
    lector.onload = () => listo(String(lector.result ?? ""));
    lector.onerror = () => fallo(new Error("No se pudo leer el archivo"));
    lector.readAsText(archivo);
  });
  return { nombre: archivo.name.replace(/\.(bpmn|xml|bpmn2)$/i, "").trim() || "Proceso importado", texto };
}
